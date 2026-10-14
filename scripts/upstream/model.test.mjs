import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPackage, mergeReport } from './model.mjs';
import { packages } from './config.mjs';
const config = packages[0];
const state = {
  baseline: { version: '9.5.0' },
  observedVersions: ['9.5.0'],
  portedAndVerified: '9.4.0',
  releasedSupport: '9.3.0',
};
function registry(versions) {
  return {
    name: config.name,
    'dist-tags': { latest: versions.at(-1) },
    versions: Object.fromEntries(
      versions.map((version) => [
        version,
        { version, license: 'MIT', dist: { integrity: 'sha512-test' } },
      ]),
    ),
    time: Object.fromEntries(versions.map((v) => [v, '2026-10-14T00:00:00Z'])),
  };
}
test('all missed releases remain visible, sorted and deduplicated', () => {
  const r = registry(['9.5.0', '9.7.0', '9.6.0']);
  r['dist-tags'].latest = '9.7.0';
  const result = detectPackage(config, r, state);
  assert.deepEqual(
    result.changes.map((c) => c.version),
    ['9.6.0', '9.7.0'],
  );
  assert.deepEqual(detectPackage(config, r, result.next).changes, []);
});
test('candidate detection never promotes verified or released support', () => {
  const result = detectPackage(config, registry(['9.5.0', '9.6.0']), state);
  assert.equal(result.next.portedAndVerified, '9.4.0');
  assert.equal(result.next.releasedSupport, '9.3.0');
  assert.equal(state.latestDetected, undefined);
});
test('stable and preview are separated and new majors require migration', () => {
  const r = registry(['9.5.0', '9.6.0-alpha.1', '10.0.0']);
  assert.deepEqual(
    detectPackage(config, r, state).changes.map((c) => c.classification),
    ['major-migration'],
  );
  assert.equal(detectPackage({ ...config, channel: 'preview' }, r, state).changes.length, 2);
});
test('license changes block candidate preparation and paid packages are rejected', () => {
  const r = registry(['9.5.0', '9.6.0']);
  r.versions['9.6.0'].license = 'Commercial';
  assert.equal(detectPackage(config, r, state).changes[0].blocked, true);
  assert.throws(
    () => detectPackage({ ...config, name: '@mui/x-data-grid-premium' }, r, state),
    /allowlist/,
  );
});
test('inconsistent npm responses fail without state mutation', () => {
  const r = registry(['9.5.0']);
  r['dist-tags'].latest = '9.6.0';
  assert.throws(() => detectPackage(config, r, state), /Inconsistent/);
  assert.equal(state.observedVersions.length, 1);
});
test('last success changes only after all results have been collected', () => {
  const initial = { packages: { [config.name]: state }, lastSuccessfulCheck: null };
  const result = detectPackage(config, registry(['9.5.0']), state);
  assert.equal(mergeReport(initial, [[config.name, result]], 'today').lastSuccessfulCheck, 'today');
  assert.equal(initial.lastSuccessfulCheck, null);
});
test('new maintenance publications below the baseline major are not skipped', () => {
  const r = registry(['8.29.5', '9.5.0']);
  r.time['8.29.5'] = '2026-10-15T00:00:00Z';
  const previous = {
    ...state,
    baseline: { version: '9.5.0', publishedAt: '2026-10-14T00:00:00Z' },
  };
  assert.deepEqual(
    detectPackage(config, r, previous).changes.map((c) => c.version),
    ['8.29.5'],
  );
});
