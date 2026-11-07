// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { publishReport } from './publish-report.mjs';
import { simulatedGitHub, hash } from './testing/github.mjs';
import { trackingBranch, trackingPath } from './tracking.mjs';

export async function simulatePublication(report, state, { prepareDrafts = false } = {}) {
  assert.equal(report.complete, true);
  assert.equal(report.baseStateHash, hash(JSON.stringify(state)));
  const remote = simulatedGitHub(state, {
    telemetry: report.baseTracking,
    telemetrySha: report.baseTrackingSha,
  });
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
    assert.deepEqual(remote.state(), state, 'Automation must never change main');
    assert.equal(remote.pulls.length, 0);
    assert.equal(remote.dispatches.length, 0);
    assert.equal(remote.branches.size, 2);
    assert.ok(remote.calls.every((call) => !/\/(pulls|actions)\b/.test(call.path)));
    assert.ok(
      remote.calls
        .filter((call) => call.method === 'PUT')
        .every(
          (call) =>
            call.body.branch === trackingBranch && call.path.endsWith('/contents/' + trackingPath),
        ),
    );
    const first = remote.effectiveState();
    const counts = { issues: remote.issues.length, drafts: 0 };
    const next = {
      ...structuredClone(report),
      baseDetectionHash: hash(JSON.stringify(first)),
      baseTrackingSha: remote.branches.get(trackingBranch).get(trackingPath).sha,
      baseTracking: remote.tracking(),
      nextState: first,
    };
    remote.branches
      .get(trackingBranch)
      .set('human-work.txt', { content: 'preserve-me', sha: 'human' });
    await publish(next);
    assert.equal(
      remote.issues.length,
      counts.issues,
      'Repeated releases must not duplicate issues',
    );
    assert.equal(remote.branches.get(trackingBranch).get('human-work.txt').content, 'preserve-me');
    assert.deepEqual(remote.state(), state);
    assert.ok(
      remote.issues.some(
        (issue) => issue.body.includes('<!-- upstream-dashboard -->') && issue.pinned,
      ),
    );
    if (report.baseTrackingSha !== next.baseTrackingSha)
      await assert.rejects(publish(report), /Detection telemetry changed/);
    return { ...counts, dispatches: 0, networkWrites: 0 };
  } finally {
    globalThis.fetch = original;
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = JSON.parse(
    await readFile(process.argv[2] ?? 'artifacts/upstream/report.json', 'utf8'),
  );
  const state = JSON.parse(await readFile('upstream/state.json', 'utf8'));
  console.log(
    JSON.stringify(
      {
        simulation: 'passed',
        detectedReleases: report.changes.length,
        ...(await simulatePublication(report, state)),
      },
      null,
      2,
    ),
  );
}
