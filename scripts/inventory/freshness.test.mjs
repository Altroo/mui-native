import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, unlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  baselineProjection,
  collectInputs,
  sha256,
  verifyInventory,
  writeOutputs,
} from './freshness.mjs';

const configs = [{ name: '@mui/system', channel: 'stable' }];
const manifestPath = 'compatibility/inventory/manifest.json';
const reportPath = 'compatibility/inventory/system.json';
const json = (value) => JSON.stringify(value, null, 2) + '\n';
async function put(root, file, value) {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), value);
}
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mui-inventory-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const state = {
    packages: {
      '@mui/system': {
        baseline: {
          version: '1.0.0',
          license: 'MIT',
          licenseSha256: sha256('MIT fixture'),
          apiSnapshot: 'upstream/api/system.json',
        },
        latestDetected: '1.0.0',
      },
    },
  };
  const files = {
    'package.json': '{}',
    'pnpm-lock.yaml': 'fixture',
    '.nvmrc': '26',
    '.prettierrc.json': '{}',
    'packages/compat/supported.json': '{}',
    'packages/compat/package.json': '{}',
    'packages/system/package.json': json({
      exports: { '.': { 'react-native': './src/index.ts' } },
    }),
    'packages/system/src/index.ts': 'export const Native = true;',
    'scripts/inventory/generate.mjs': '// fixture',
    'scripts/upstream/config.mjs': '// scope',
    'upstream/api/system.json': '[]',
    'upstream/licenses/system.txt': 'MIT fixture',
    'upstream/state.json': json(state),
  };
  for (const [file, content] of Object.entries(files)) await put(root, file, content);
  const report = json({
    package: '@mui/system',
    support: 'unverified',
    rootExports: [{ name: 'Native', verified: false }],
    contracts: [{ members: [{ name: 'value', verified: false }] }],
  });
  const documentation = '# Coverage\n';
  const manifest = {
    schemaVersion: 1,
    status: 'declaration-inventory-not-parity',
    inputs: await collectInputs(root, configs),
    packages: [
      { package: '@mui/system', inventory: reportPath, verifiedParity: 0, sha256: sha256(report) },
    ],
    blocked: [],
    documentation: { path: 'docs/coverage.md', sha256: sha256(documentation) },
  };
  const outputs = new Map([
    [reportPath, report],
    ['docs/coverage.md', documentation],
    [manifestPath, json(manifest)],
  ]);
  await writeOutputs(outputs, { root });
  return { root, state, outputs, manifest, files };
}

test('offline verification accepts fresh reports and ignores ordinary detector changes', async (t) => {
  const { root, state } = await fixture(t);
  assert.equal(await verifyInventory(root, configs), 1);
  state.packages['@mui/system'].latestDetected = '2.0.0';
  state.packages['@mui/system'].candidate = { version: '2.0.0', pending: true };
  state.lastCheckedAt = 'tomorrow';
  await put(root, 'upstream/state.json', json(state));
  assert.equal(await verifyInventory(root, configs), 1);
  state.packages['@mui/system'].baseline.licenseReview = 'hold';
  await put(root, 'upstream/state.json', json(state));
  await assert.rejects(verifyInventory(root, configs), /inputs changed/);
  assert.throws(() => baselineProjection({ packages: {} }, configs), /Missing pinned/);
});

test('native source, package exports, mappings, generators, snapshots and tool locks invalidate freshness', async (t) => {
  const { root, files } = await fixture(t);
  for (const file of [
    'packages/system/src/index.ts',
    'packages/system/package.json',
    'packages/compat/supported.json',
    'scripts/inventory/generate.mjs',
    'scripts/upstream/config.mjs',
    'upstream/api/system.json',
    'pnpm-lock.yaml',
    'package.json',
  ]) {
    await put(root, file, files[file] + '\n');
    await assert.rejects(verifyInventory(root, configs), /inputs changed/, file);
    await put(root, file, files[file]);
  }
  await put(root, 'packages/system/src/added.ts', 'export type New = true;');
  await assert.rejects(verifyInventory(root, configs), /inputs changed/);
  await unlink(path.join(root, 'packages/system/src/added.ts'));
  await unlink(path.join(root, 'packages/system/src/index.ts'));
  await assert.rejects(verifyInventory(root, configs), /inputs changed/);
});

test('changed documentation, tampered output, missing records and orphan reports fail offline verification', async (t) => {
  const { root, outputs } = await fixture(t);
  await put(root, 'docs/coverage.md', '# Stale\n');
  await assert.rejects(verifyInventory(root, configs), /documentation changed/);
  await put(root, 'docs/coverage.md', outputs.get('docs/coverage.md'));
  await put(root, reportPath, outputs.get(reportPath) + ' ');
  await assert.rejects(verifyInventory(root, configs), /report changed/);
  await unlink(path.join(root, reportPath));
  await assert.rejects(verifyInventory(root, configs), /ENOENT/);
  await put(root, reportPath, outputs.get(reportPath));
  await put(root, 'compatibility/inventory/obsolete.json', '{}');
  await assert.rejects(verifyInventory(root, configs), /obsolete reports/);
});

test('a matching hash cannot turn syntactic matches into verified compatibility', async (t) => {
  const { root, manifest, outputs } = await fixture(t);
  const report = JSON.parse(outputs.get(reportPath));
  report.contracts[0].members[0].verified = true;
  const content = json(report);
  manifest.packages[0].sha256 = sha256(content);
  await put(root, reportPath, content);
  await put(root, manifestPath, json(manifest));
  await assert.rejects(verifyInventory(root, configs), /cannot verify compatibility/);
});

test('full regeneration removes reports recorded by the prior manifest when they leave scope', async (t) => {
  const { root, manifest, outputs } = await fixture(t);
  const orphan = 'compatibility/inventory/removed.json';
  manifest.packages.push({ package: '@mui/removed', inventory: orphan });
  await put(root, manifestPath, json(manifest));
  await put(root, orphan, '{}');
  await assert.rejects(writeOutputs(outputs, { root, check: true }), /obsolete reports/);
  assert.equal(await readFile(path.join(root, orphan), 'utf8'), '{}');
  await writeOutputs(outputs, { root });
  await assert.rejects(readFile(path.join(root, orphan)), /ENOENT/);
  assert.equal(await verifyInventory(root, configs), 1);
});

test('a newly blocked package loses its old report and the new manifest retains the block', async (t) => {
  const { root, state } = await fixture(t);
  state.packages['@mui/system'].baseline.licenseReview = 'hold';
  await put(root, 'upstream/state.json', json(state));
  const documentation = '# Blocked\n';
  const outputs = new Map([
    ['docs/coverage.md', documentation],
    [
      manifestPath,
      json({
        schemaVersion: 1,
        status: 'declaration-inventory-not-parity',
        inputs: await collectInputs(root, configs),
        packages: [],
        blocked: [{ name: '@mui/system', reason: 'hold' }],
        documentation: { path: 'docs/coverage.md', sha256: sha256(documentation) },
      }),
    ],
  ]);
  await writeOutputs(outputs, { root });
  await assert.rejects(readFile(path.join(root, reportPath)), /ENOENT/);
  assert.equal(await verifyInventory(root, configs), 0);
});

test('unknown reports fail before any write; full check mode never rewrites stale documentation', async (t) => {
  const { root, outputs } = await fixture(t);
  const original = await readFile(path.join(root, manifestPath), 'utf8');
  await put(root, 'compatibility/inventory/user-owned.json', '{}');
  outputs.set('docs/coverage.md', 'would change');
  await assert.rejects(writeOutputs(outputs, { root }), /Unrecognized inventory report/);
  assert.equal(await readFile(path.join(root, manifestPath), 'utf8'), original);
  assert.equal(await readFile(path.join(root, 'docs/coverage.md'), 'utf8'), '# Coverage\n');
  await unlink(path.join(root, 'compatibility/inventory/user-owned.json'));
  await assert.rejects(writeOutputs(outputs, { root, check: true }), /stale/);
  assert.equal(await readFile(path.join(root, 'docs/coverage.md'), 'utf8'), '# Coverage\n');
});

test('included license notices must be retained and match their reviewed baseline', async (t) => {
  const { root } = await fixture(t);
  await put(root, 'upstream/licenses/system.txt', 'changed notice');
  await assert.rejects(verifyInventory(root, configs), /Retained license snapshot mismatch/);
  await unlink(path.join(root, 'upstream/licenses/system.txt'));
  await assert.rejects(verifyInventory(root, configs), /ENOENT/);
});
