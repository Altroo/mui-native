// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { monitoredPackages as packages } from './config.mjs';
import { detect } from './detect.mjs';
import { publishReport } from './publish-report.mjs';
import { simulatePublication } from './simulate.mjs';
import { hash, simulatedGitHub } from './testing/github.mjs';
import { trackingBranch, trackingPath, trackingFromState } from './tracking.mjs';

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
      reuse: {
        schemaVersion: 1,
        entries: [
          {
            localFile: 'packages/system/src/theme.ts',
            reference: {
              name: '@mui/material',
              sourceFiles: { 'styles/createPalette.js': hash('old palette') },
            },
          },
        ],
      },
      fetchArtifact: async (pkg, { sourceFiles }) => ({
        sourceFiles: Object.fromEntries(sourceFiles.map((file) => [file, hash('new palette')])),
        license: pkg.name === '@mui/x-chat' ? null : 'MIT fixture',
        apiFiles: [{ path: 'index.d.ts', sha256: hash('new api') }],
      }),
    });
    assert.deepEqual(state, before);
    assert.equal(report.changes.length, 2);
    assert.deepEqual(
      report.changes.find((change) => change.name === '@mui/material').adaptedSourceChanges,
      [
        {
          path: 'styles/createPalette.js',
          sha256: hash('new palette'),
          status: 'changed',
          localFiles: ['packages/system/src/theme.ts'],
        },
      ],
    );
    assert.equal(report.advisories.length, 1);
    assert.equal(report.changes.find((change) => change.name === '@mui/x-chat').blocked, true);
    assert.equal(requests.filter((url) => url.includes('/compare/')).length, 2);
    return { report, state };
  } finally {
    globalThis.fetch = original;
    await rm(directory, { recursive: true, force: true });
  }
}

const telemetryPut = (call) =>
  call.method === 'PUT' && call.path.endsWith('/contents/' + trackingPath);
function setMain(remote, state) {
  const content = JSON.stringify(state);
  remote.branches.get('main').set('upstream/state.json', {
    content: Buffer.from(content).toString('base64'),
    sha: hash(content),
  });
}
function setTracking(remote, value) {
  const content = JSON.stringify(value, null, 2) + '\n';
  remote.branches
    .get(trackingBranch)
    .set(trackingPath, { content: Buffer.from(content).toString('base64'), sha: hash(content) });
}
function refreshReport(report, remote) {
  return {
    ...structuredClone(report),
    baseStateHash: hash(JSON.stringify(remote.state())),
    baseDetectionHash: hash(JSON.stringify(remote.effectiveState())),
    baseTrackingSha: remote.branches.get(trackingBranch)?.get(trackingPath)?.sha ?? null,
    baseTracking: remote.tracking(),
  };
}
async function publication(action) {
  const { report, state } = await fixture();
  const remote = simulatedGitHub(state);
  const original = globalThis.fetch;
  globalThis.fetch = remote.fetch;
  const publish = (value = report) =>
    publishReport({
      report: structuredClone(value),
      repository: remote.repository,
      token: 'simulation-token',
    });
  try {
    await action({ report, state, remote, publish });
  } finally {
    globalThis.fetch = original;
  }
}

test('protected-main publication simulates detection-only branch persistence and deduplication', async () => {
  const { report, state } = await fixture();
  const summary = await simulatePublication(report, state);
  assert.deepEqual(summary, { issues: 4, drafts: 0, dispatches: 0, networkWrites: 0 });
});

test('automatic drafts fail closed before any network operation', async () => {
  await publication(async ({ report, remote }) => {
    await assert.rejects(
      publishReport({
        report,
        repository: remote.repository,
        token: 'simulation-token',
        prepareDrafts: true,
      }),
      /Automatic draft preparation is disabled/,
    );
    assert.equal(remote.calls.length, 0);
  });
});

test('partial, stale, commercial and reviewed-state-changing reports cannot write', async () => {
  const { report, state } = await fixture();
  const modified = structuredClone(report);
  modified.nextState.packages['@mui/material'].portedAndVerified = '1.0.1';
  const cases = [
    [{ ...report, complete: false }, /Partial reports/],
    [{ ...report, baseStateHash: 'stale' }, /Baseline changed/],
    [{ ...report, baseTrackingSha: 'stale' }, /Detection telemetry changed/],
    [{ ...report, baseDetectionHash: 'stale' }, /Detection telemetry changed/],
    [
      { ...report, changes: [{ ...report.changes[0], name: '@mui/x-data-grid-premium' }] },
      /allowlist/,
    ],
    [modified, /changes reviewed support/],
  ];
  for (const [value, pattern] of cases) {
    const remote = simulatedGitHub(state),
      original = globalThis.fetch;
    globalThis.fetch = remote.fetch;
    try {
      await assert.rejects(
        publishReport({ report: value, repository: remote.repository, token: 'simulation-token' }),
        pattern,
      );
      assert(remote.calls.every((c) => c.method === 'GET'));
      assert.deepEqual(remote.state(), state);
      assert.equal(remote.tracking(), null);
    } finally {
      globalThis.fetch = original;
    }
  }
});

test('failed issue preparation never advances the telemetry cursor and retries deduplicate', async () => {
  await publication(async ({ state, remote, publish }) => {
    remote.failNext((c) => c.method === 'POST' && c.path.endsWith('/issues'));
    await assert.rejects(publish(), /HTTP 403/);
    assert.equal(remote.tracking(), null);
    assert.deepEqual(remote.state(), state);
    await publish();
    assert.equal(remote.issues.length, 4);
    assert.deepEqual(remote.state(), state);
  });
});

for (const committed of [false, true])
  test('transient conditional PUT recovery committed=' + committed, async () => {
    await publication(async ({ state, remote, publish }) => {
      remote.failNext(telemetryPut, 500, { committed });
      await publish();
      assert.equal(remote.calls.filter(telemetryPut).length, committed ? 1 : 2);
      assert.equal(remote.issues.length, 4);
      assert.deepEqual(remote.state(), state);
      assert.equal(remote.effectiveState().packages['@mui/material'].latestDetected, '1.0.1');
      const file = remote.tracking();
      assert.deepEqual(Object.keys(file).sort(), [
        'lastSuccessfulCheck',
        'packages',
        'schemaVersion',
      ]);
      assert.deepEqual(Object.keys(file.packages['@mui/material']).sort(), [
        'latestDetected',
        'observedVersions',
      ]);
    });
  });

test('nonretryable telemetry permissions fail immediately without retry or main fallback', async () => {
  await publication(async ({ state, remote, publish }) => {
    remote.failNext(telemetryPut, 403);
    await assert.rejects(publish(), /HTTP 403/);
    assert.equal(remote.calls.filter(telemetryPut).length, 1);
    assert(telemetryPut(remote.calls.at(-1)));
    assert.equal(remote.tracking(), null);
    assert.deepEqual(remote.state(), state);
  });
});

test('transient retry budget is bounded and a later fresh retry does not duplicate issues', async () => {
  await publication(async ({ state, remote, publish }) => {
    for (let i = 0; i < 3; i++) remote.failNext(telemetryPut, 500);
    await assert.rejects(publish(), /HTTP 500/);
    assert.equal(remote.calls.filter(telemetryPut).length, 3);
    assert.equal(remote.tracking(), null);
    await publish();
    assert.equal(remote.issues.length, 4);
    assert.deepEqual(remote.state(), state);
  });
});

test('a concurrent telemetry write after an ambiguous failure is never overwritten', async () => {
  await publication(async ({ report, state, remote, publish }) => {
    await publish();
    const next = refreshReport(report, remote);
    next.checkedAt = '2026-11-03T12:00:00Z';
    next.nextState.lastSuccessfulCheck = next.checkedAt;
    remote.failNext(telemetryPut, 500);
    let failed = false,
      changed = false;
    globalThis.fetch = async (input, options) => {
      if (
        options?.method === 'PUT' &&
        new URL(input).pathname.endsWith('/contents/' + trackingPath)
      )
        failed = true;
      else if (
        failed &&
        !changed &&
        new URL(input).pathname.endsWith('/contents/' + trackingPath)
      ) {
        const value = remote.tracking();
        value.packages['@mui/material'].latestDetected = '1.0.2';
        setTracking(remote, value);
        changed = true;
      }
      return remote.fetch(input, options);
    };
    const count = remote.calls.filter(telemetryPut).length;
    await assert.rejects(publish(next), /changed after a failed write/);
    assert.equal(remote.calls.filter(telemetryPut).length, count + 1);
    assert.equal(remote.tracking().packages['@mui/material'].latestDetected, '1.0.2');
    assert.deepEqual(remote.state(), state);
  });
});

test('main reviewed support changed during issue preparation prevents cursor advancement', async () => {
  await publication(async ({ state, remote, publish }) => {
    let changed = false;
    globalThis.fetch = async (input, options) => {
      if (!changed && options?.method === 'POST' && new URL(input).pathname.endsWith('/issues')) {
        const value = remote.state();
        value.packages['@mui/material'].portedAndVerified = 'human-reviewed';
        setMain(remote, value);
        changed = true;
      }
      return remote.fetch(input, options);
    };
    await assert.rejects(publish(), /State changed while preparing updates/);
    assert.equal(remote.tracking(), null);
    assert.equal(remote.calls.filter(telemetryPut).length, 0);
    assert.equal(remote.state().packages['@mui/material'].portedAndVerified, 'human-reviewed');
    assert.equal(state.packages['@mui/material'].portedAndVerified, null);
  });
});

test('an ambiguous committed branch creation is read back without resetting the branch', async () => {
  await publication(async ({ remote, publish }) => {
    remote.failNext((c) => c.method === 'POST' && c.path.endsWith('/git/refs'), 500, {
      committed: true,
    });
    await publish();
    assert.equal(
      remote.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/git/refs')).length,
      1,
    );
    assert(remote.tracking());
  });
});

test('supporting Utils releases are monitored without native candidates or support promotion', async () => {
  await publication(async ({ report, state, remote, publish }) => {
    const utility = {
      ...report.changes.find((c) => c.name === '@mui/material'),
      name: '@mui/utils',
    };
    report.changes.push(utility);
    report.nextState.packages['@mui/utils'].latestDetected = utility.version;
    report.nextState.packages['@mui/utils'].observedVersions.push(utility.version);
    await publish(report);
    assert(remote.issues.some((i) => i.body.includes('@mui/utils@1.0.1')));
    assert.equal(remote.effectiveState().packages['@mui/utils'].latestDetected, '1.0.1');
    assert.deepEqual(remote.state(), state);
    assert.equal(remote.pulls.length, 0);
    assert.equal(remote.dispatches.length, 0);
  });
});

test('detector fingerprints and dry-run publication include an existing telemetry cursor', async () => {
  const { report, state } = await fixture();
  const telemetry = trackingFromState(state);
  const remote = simulatedGitHub(state, { telemetry });
  const value = refreshReport(report, remote);
  const summary = await simulatePublication(value, state);
  assert.equal(summary.issues, 4);
  assert.equal(summary.drafts, 0);
});

test('a direct blob CAS conflict fails without overwriting another cursor', async () => {
  await publication(async ({ report, state, remote, publish }) => {
    await publish();
    const next = refreshReport(report, remote);
    next.checkedAt = '2026-11-03T12:00:00Z';
    next.nextState.lastSuccessfulCheck = next.checkedAt;
    let changed = false;
    globalThis.fetch = async (input, options) => {
      if (
        !changed &&
        options?.method === 'PUT' &&
        new URL(input).pathname.endsWith('/contents/' + trackingPath)
      ) {
        const value = remote.tracking();
        value.lastSuccessfulCheck = '2026-11-04T12:00:00Z';
        setTracking(remote, value);
        changed = true;
      }
      return remote.fetch(input, options);
    };
    const count = remote.calls.filter(telemetryPut).length;
    await assert.rejects(publish(next), (e) => e.status === 409);
    assert.equal(remote.calls.filter(telemetryPut).length, count + 1);
    assert.equal(remote.tracking().lastSuccessfulCheck, '2026-11-04T12:00:00Z');
    assert.deepEqual(remote.state(), state);
  });
});

test('an unavailable failed-write read-back prevents a blind retry', async () => {
  await publication(async ({ remote, publish }) => {
    remote.failNext(telemetryPut, 500);
    remote.failNext((c) => c.method === 'GET' && c.path.endsWith('/contents/' + trackingPath), 500);
    await assert.rejects(publish(), (e) => e.status === 500);
    assert.equal(remote.calls.filter(telemetryPut).length, 1);
    assert.equal(remote.tracking(), null);
  });
});

test('nonempty main-reviewed candidates and support remain authoritative in the dashboard', async () => {
  const { report, state } = await fixture();
  const item = state.packages['@mui/material'];
  Object.assign(item, {
    candidate: { version: '1.0.1', pullRequest: 'https://github.com/example/reviewed' },
    portedAndVerified: '0.9.0',
    releasedSupport: '0.8.0',
  });
  Object.assign(report.nextState.packages['@mui/material'], {
    candidate: structuredClone(item.candidate),
    portedAndVerified: item.portedAndVerified,
    releasedSupport: item.releasedSupport,
  });
  report.baseStateHash = hash(JSON.stringify(state));
  report.baseDetectionHash = report.baseStateHash;
  const remote = simulatedGitHub(state),
    original = globalThis.fetch;
  globalThis.fetch = remote.fetch;
  try {
    await publishReport({ report, repository: remote.repository, token: 'simulation-token' });
    assert.deepEqual(remote.state(), state);
    assert(
      remote.issues
        .find((i) => i.body.includes('<!-- upstream-dashboard -->'))
        .body.includes('| @mui/material | 1.0.1 | 1.0.1 | 0.9.0 | 0.8.0 |'),
    );
    assert.deepEqual(Object.keys(remote.tracking().packages['@mui/material']).sort(), [
      'latestDetected',
      'observedVersions',
    ]);
  } finally {
    globalThis.fetch = original;
  }
});
