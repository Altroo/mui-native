// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  trackingFromState,
  withTracking,
  reviewedStateHash,
  validateTracking,
  readTracking,
} from './tracking.mjs';
const main = {
  schemaVersion: 1,
  createdAt: '2026-10-01T00:00:00Z',
  lastSuccessfulCheck: '2026-11-01T00:00:00Z',
  packages: {
    '@mui/material': {
      baseline: { version: '9.5.0', sourceCommit: 'immutable' },
      latestDetected: '9.5.0',
      observedVersions: ['9.5.0'],
      candidate: { version: '9.6.0', pullRequest: 'reviewed' },
      portedAndVerified: '9.4.0',
      releasedSupport: '9.3.0',
    },
  },
};
test('detection-only telemetry composes onto main without importing reviewed fields', () => {
  const before = structuredClone(main),
    telemetry = trackingFromState(main);
  telemetry.lastSuccessfulCheck = '2026-11-02T00:00:00Z';
  telemetry.packages['@mui/material'].latestDetected = '9.7.0';
  telemetry.packages['@mui/material'].observedVersions = ['9.6.0', '9.7.0'];
  const state = withTracking(main, telemetry);
  assert.equal(state.packages['@mui/material'].latestDetected, '9.7.0');
  assert.deepEqual(state.packages['@mui/material'].observedVersions, ['9.5.0', '9.6.0', '9.7.0']);
  assert.equal(state.lastSuccessfulCheck, telemetry.lastSuccessfulCheck);
  assert.equal(reviewedStateHash(state), reviewedStateHash(main));
  assert.deepEqual(main, before);
  assert.notEqual(state, main);
  assert.deepEqual(Object.keys(telemetry.packages['@mui/material']).sort(), [
    'latestDetected',
    'observedVersions',
  ]);
});
test('bootstrap retains legacy detection values and a newly added main package is not erased', () => {
  assert.deepEqual(withTracking(main, null), main);
  const telemetry = trackingFromState(main),
    updated = structuredClone(main);
  updated.packages['@mui/system'] = structuredClone(main.packages['@mui/material']);
  const state = withTracking(updated, telemetry);
  assert.deepEqual(state.packages['@mui/system'], updated.packages['@mui/system']);
});
test('unknown fields, reviewed properties, commercial packages and malformed telemetry are rejected', () => {
  const values = [];
  for (const key of ['baseline', 'candidate', 'portedAndVerified', 'releasedSupport']) {
    const value = trackingFromState(main);
    value.packages['@mui/material'][key] = 'forbidden';
    values.push(value);
  }
  values.push(
    { ...trackingFromState(main), baseline: 'forbidden' },
    { ...trackingFromState(main), schemaVersion: 2 },
    { ...trackingFromState(main), lastSuccessfulCheck: 'not a date' },
    { ...trackingFromState(main), packages: [] },
  );
  for (const mutation of [
    (item) => {
      item.latestDetected = null;
    },
    (item) => {
      item.observedVersions = ['not-a-version'];
    },
    (item) => {
      item.observedVersions = '9.5.0';
    },
  ]) {
    const value = trackingFromState(main);
    mutation(value.packages['@mui/material']);
    values.push(value);
  }
  for (const value of values)
    assert.throws(() => validateTracking(value, main), /Invalid upstream detection telemetry/);
  const paid = trackingFromState(main);
  paid.packages['@mui/x-data-grid-premium'] = paid.packages['@mui/material'];
  assert.throws(() => withTracking(main, paid), /allowlist/);
});
test('a changed reviewed contract changes the authority guard while detection cursors do not', () => {
  const next = structuredClone(main);
  next.packages['@mui/material'].releasedSupport = '9.4.0';
  assert.notEqual(reviewedStateHash(next), reviewedStateHash(main));
  next.packages['@mui/material'].releasedSupport = '9.3.0';
  next.packages['@mui/material'].observedVersions.push('9.6.0');
  assert.equal(reviewedStateHash(next), reviewedStateHash(main));
});
test('a missing telemetry file bootstraps only for404; permission and server failures remain failures', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({}, { status: 404 });
    assert.deepEqual(
      await readTracking({ repository: 'simulation/mui-native', token: 'simulation-token' }),
      { sha: null, content: null },
    );
    for (const status of [403, 500]) {
      globalThis.fetch = async () => Response.json({}, { status });
      await assert.rejects(
        readTracking({ repository: 'simulation/mui-native', token: 'simulation-token' }),
        (e) => e.status === status,
      );
    }
    globalThis.fetch = async () => Response.json({ sha: 'not-empty' });
    await assert.rejects(
      readTracking({ repository: 'simulation/mui-native', token: 'simulation-token' }),
      /Invalid upstream detection telemetry file/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
