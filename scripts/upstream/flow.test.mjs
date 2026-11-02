import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { packages } from './config.mjs';
import { detect } from './detect.mjs';
import { publishReport } from './publish-report.mjs';
import { simulatePublication } from './simulate.mjs';
import { hash, simulatedGitHub } from './testing/github.mjs';

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'mui-upstream-'));
  const snapshot = join(directory, 'api.json');
  await writeFile(snapshot, '[]');
  const baselineVersion = (config) => (config.channel === 'preview' ? '1.0.0-alpha.1' : '1.0.0');
  const updated = { '@mui/material': '1.0.1', '@mui/x-chat': '1.0.0-alpha.2' };
  const state = {
    lastSuccessfulCheck: null,
    packages: Object.fromEntries(
      packages.map((config) => [
        config.name,
        {
          baseline: {
            version: baselineVersion(config),
            publishedAt: '2026-10-01',
            sourceCommit: '0'.repeat(40),
            licenseSha256: hash('MIT fixture'),
            apiSnapshot: snapshot,
            apiSnapshotSha256: hash('[]'),
            copiedFiles: [],
          },
          observedVersions: [baselineVersion(config)],
          candidate: null,
          portedAndVerified: null,
          releasedSupport: null,
        },
      ]),
    ),
  };
  const registry = (config) => {
    const baseline = baselineVersion(config);
    const latest = updated[config.name] ?? baseline;
    const versions = [...new Set([baseline, latest])];
    return {
      name: config.name,
      'dist-tags': { latest },
      versions: Object.fromEntries(
        versions.map((version) => [
          version,
          { name: config.name, version, license: 'MIT', dist: { integrity: 'sha512-fixture' } },
        ]),
      ),
      time: Object.fromEntries(
        versions.map((version) => [version, version === baseline ? '2026-10-01' : '2026-10-30']),
      ),
    };
  };
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, options) => {
    const url = new URL(input);
    requests.push(url.href);
    assert.equal(options.method ?? 'GET', 'GET', 'Detection must never write');
    if (url.hostname === 'registry.npmjs.org') {
      assert.equal(options.headers.get('accept'), 'application/json');
      const [scope, name, version] = decodeURIComponent(url.pathname.slice(1)).split('/');
      const config = packages.find((item) => item.name === `${scope}/${name}`);
      assert.ok(config);
      const metadata = registry(config);
      return Response.json(version ? metadata.versions[version] : metadata);
    }
    if (url.hostname === 'raw.githubusercontent.com')
      return Response.json({ name: '@mui/x-chat', version: updated['@mui/x-chat'] });
    assert.equal(url.origin, 'https://api.github.com');
    if (url.pathname.endsWith('/releases'))
      return Response.json([
        {
          tag_name: 'v1.0.1',
          published_at: '2026-10-30',
          body: 'Preview heading omitted',
          html_url: 'https://github.com/mui/mui-x/releases/tag/v1.0.1',
        },
      ]);
    if (url.pathname === '/advisories')
      return Response.json([
        {
          ghsa_id: 'GHSA-test',
          severity: 'high',
          html_url: 'https://github.com/advisories/GHSA-test',
        },
      ]);
    if (url.pathname.includes('/git/ref/tags/'))
      return Response.json({ object: { type: 'commit', sha: 'a'.repeat(40) } });
    if (url.pathname.includes('/compare/')) return Response.json({ files: [] });
    throw new Error(`Unexpected detection URL: ${url}`);
  };
  try {
    const before = structuredClone(state);
    const report = await detect({
      state,
      now: '2026-11-02T12:00:00Z',
      fetchArtifact: async (pkg) => ({
        license: pkg.name === '@mui/x-chat' ? null : 'MIT fixture',
        apiFiles: [{ path: 'index.d.ts', sha256: hash('new api') }],
      }),
    });
    assert.deepEqual(state, before);
    assert.equal(report.changes.length, 2);
    assert.equal(report.advisories.length, 1);
    assert.equal(report.changes.find((change) => change.name === '@mui/x-chat').blocked, true);
    assert.equal(requests.filter((url) => url.includes('/compare/')).length, 2);
    return { report, state };
  } finally {
    globalThis.fetch = original;
    await rm(directory, { recursive: true, force: true });
  }
}

test('full detection and publication simulate drafts, license holds, deduplication and preserved human edits', async () => {
  const { report, state } = await fixture();
  const summary = await simulatePublication(report, state, { prepareDrafts: true });
  assert.equal(summary.drafts, 1);
  assert.equal(summary.issues, 4);
  assert.equal(summary.dispatches, 2);
  assert.equal(summary.networkWrites, 0);
});
test('permission and dispatch failures preserve detection state and retries do not duplicate work', async () => {
  const { report, state } = await fixture();
  for (const suffix of ['/pulls', '/actions/workflows/ci.yml/dispatches']) {
    const remote = simulatedGitHub(state);
    remote.failNext((call) => call.method === 'POST' && call.path.endsWith(suffix));
    const original = globalThis.fetch;
    globalThis.fetch = remote.fetch;
    const publish = () =>
      publishReport({
        report: structuredClone(report),
        repository: remote.repository,
        token: 'simulation-token',
        prepareDrafts: true,
      });
    try {
      await assert.rejects(publish(), /HTTP 403/);
      assert.deepEqual(remote.state(), state);
      await publish();
      assert.equal(remote.pulls.length, 1);
      assert.equal(remote.issues.length, 4);
      assert.equal(remote.dispatches.length, 1);
      assert.equal(remote.state().packages['@mui/material'].candidate.version, '1.0.1');
      assert.equal(remote.state().packages['@mui/x-chat'].candidate, null);
    } finally {
      globalThis.fetch = original;
    }
  }
});
test('partial, stale and commercial-package reports cannot perform writes', async () => {
  const { report, state } = await fixture();
  for (const [value, error] of [
    [{ ...report, complete: false }, /Partial reports/],
    [{ ...report, baseStateHash: 'stale' }, /Baseline changed/],
    [
      { ...report, changes: [{ ...report.changes[0], name: '@mui/x-data-grid-premium' }] },
      /outside the MIT Community allowlist/,
    ],
  ]) {
    const remote = simulatedGitHub(state);
    const original = globalThis.fetch;
    globalThis.fetch = remote.fetch;
    try {
      await assert.rejects(
        publishReport({ report: value, repository: remote.repository, token: 'simulation-token' }),
        error,
      );
      assert.ok(remote.calls.every((call) => call.method === 'GET'));
      assert.deepEqual(remote.state(), state);
    } finally {
      globalThis.fetch = original;
    }
  }
});
test('a rejected state write can be retried after candidate side effects without losing support', async () => {
  const { report, state } = await fixture();
  const remote = simulatedGitHub(state);
  remote.failNext(
    (call) => call.method === 'PUT' && call.path.endsWith('/contents/upstream/state.json'),
    409,
  );
  const original = globalThis.fetch;
  globalThis.fetch = remote.fetch;
  const publish = () =>
    publishReport({
      report: structuredClone(report),
      repository: remote.repository,
      token: 'simulation-token',
      prepareDrafts: true,
    });
  try {
    await assert.rejects(publish(), /HTTP 409/);
    assert.deepEqual(remote.state(), state);
    await publish();
    assert.equal(remote.pulls.length, 1);
    assert.equal(remote.issues.length, 4);
    assert.equal(remote.state().packages['@mui/material'].portedAndVerified, null);
    assert.equal(remote.state().packages['@mui/material'].releasedSupport, null);
  } finally {
    globalThis.fetch = original;
  }
});

test('default issue-only operation never requests PR permissions or dispatches candidate CI', async () => {
  const { report, state } = await fixture();
  const summary = await simulatePublication(report, state);
  assert.equal(summary.issues, 4);
  assert.equal(summary.drafts, 0);
  assert.equal(summary.dispatches, 0);
  assert.equal(summary.networkWrites, 0);
});
