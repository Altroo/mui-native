import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { publishReport } from './publish-report.mjs';
import { simulatedGitHub, hash } from './testing/github.mjs';

export async function simulatePublication(report, state, { prepareDrafts = false } = {}) {
  assert.equal(report.complete, true);
  assert.equal(report.baseStateHash, hash(JSON.stringify(state)));
  const remote = simulatedGitHub(state);
  const original = globalThis.fetch;
  const publish = (value) =>
    publishReport({
      report: structuredClone(value),
      repository: remote.repository,
      token: 'simulation-token',
      prepareDrafts,
    });
  globalThis.fetch = remote.fetch;
  try {
    await publish(report);
    if (!prepareDrafts) {
      assert.equal(remote.pulls.length, 0);
      assert.equal(remote.dispatches.length, 0);
      assert.equal(remote.branches.size, 1);
      assert.ok(remote.calls.every((call) => !/\/(pulls|git\/refs|actions)\b/.test(call.path)));
    }
    const first = remote.state();
    for (const [name, before] of Object.entries(state.packages)) {
      assert.deepEqual(first.packages[name].baseline, before.baseline);
      assert.equal(first.packages[name].portedAndVerified, before.portedAndVerified);
      assert.equal(first.packages[name].releasedSupport, before.releasedSupport);
    }
    const counts = { issues: remote.issues.length, drafts: remote.pulls.length };
    const next = {
      ...structuredClone(report),
      baseStateHash: hash(JSON.stringify(first)),
      nextState: first,
    };
    for (const [name, files] of remote.branches) {
      if (name !== 'main') files.set('human-work.txt', { content: 'preserve-me', sha: 'human' });
    }
    await publish(next);
    assert.equal(
      remote.issues.length,
      counts.issues,
      'Repeated releases must not duplicate issues',
    );
    assert.equal(remote.pulls.length, counts.drafts, 'Repeated releases must not duplicate drafts');
    for (const [name, files] of remote.branches) {
      if (name !== 'main') assert.equal(files.get('human-work.txt').content, 'preserve-me');
    }
    assert.ok(
      remote.issues.some(
        (issue) => issue.body.includes('<!-- upstream-dashboard -->') && issue.pinned,
      ),
    );
    if (report.baseStateHash !== hash(JSON.stringify(first)))
      await assert.rejects(publish(report), /Baseline changed/);
    return { ...counts, dispatches: remote.dispatches.length, networkWrites: 0 };
  } finally {
    globalThis.fetch = original;
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = JSON.parse(
    await readFile(process.argv[2] ?? 'artifacts/upstream/report.json', 'utf8'),
  );
  const state = JSON.parse(await readFile('upstream/state.json', 'utf8'));
  const result = await simulatePublication(report, state);
  console.log(
    JSON.stringify(
      { simulation: 'passed', detectedReleases: report.changes.length, ...result },
      null,
      2,
    ),
  );
}
