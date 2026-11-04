import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { reusedFiles, compareReusedFiles } from './reuse.mjs';
const entry = {
  localFile: 'packages/system/src/theme.ts',
  reference: { name: '@mui/material', sourceFiles: { 'styles/createPalette.js': 'a'.repeat(64) } },
};
const record = { schemaVersion: 1, entries: [entry] };
test('adapted source comparison reports changed and removed files without conflating other packages', () => {
  const files = reusedFiles(record, '@mui/material');
  assert.deepEqual(reusedFiles(record, '@mui/system'), []);
  assert.deepEqual(compareReusedFiles(files, { 'styles/createPalette.js': 'a'.repeat(64) }), []);
  const changed = compareReusedFiles(files, { 'styles/createPalette.js': 'b'.repeat(64) });
  assert.equal(changed[0].status, 'changed');
  assert.deepEqual(changed[0].localFiles, [entry.localFile]);
  assert.equal(compareReusedFiles(files, {})[0].status, 'removed');
  assert.throws(() => compareReusedFiles(files), /Missing adapted-source/);
});
test('reuse metadata rejects unsafe paths, commercial packages and conflicting hashes', () => {
  assert.throws(
    () =>
      reusedFiles(
        {
          schemaVersion: 1,
          entries: [
            {
              ...entry,
              reference: { ...entry.reference, sourceFiles: { '../secret': 'a'.repeat(64) } },
            },
          ],
        },
        '@mui/material',
      ),
    /Invalid reused/,
  );
  assert.throws(
    () =>
      reusedFiles(
        {
          schemaVersion: 1,
          entries: [
            { ...entry, reference: { ...entry.reference, name: '@mui/x-data-grid-premium' } },
          ],
        },
        '@mui/material',
      ),
    /MIT Community allowlist/,
  );
  assert.throws(
    () =>
      reusedFiles(
        {
          schemaVersion: 1,
          entries: [
            entry,
            {
              ...entry,
              reference: {
                ...entry.reference,
                sourceFiles: { 'styles/createPalette.js': 'b'.repeat(64) },
              },
            },
          ],
        },
        '@mui/material',
      ),
    /Conflicting/,
  );
});

test('reuse metadata rejects hashes that only coerce to valid hexadecimal strings', () => {
  for (const sha256 of [['a'.repeat(64)], 12, null, {}, 'short', 'A'.repeat(64)]) {
    assert.throws(
      () =>
        reusedFiles(
          {
            schemaVersion: 1,
            entries: [
              {
                ...entry,
                reference: {
                  ...entry.reference,
                  sourceFiles: { 'styles/createPalette.js': sha256 },
                },
              },
            ],
          },
          '@mui/material',
        ),
      /Invalid reused source path or hash/,
    );
  }
});

test('artifact inspector hashes requested implementation files without extracting them', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-reuse-'));
  try {
    const archive = join(directory, 'fixture.tgz');
    execFileSync('python3', [
      '-c',
      'import io,sys,tarfile; t=tarfile.open(sys.argv[1], "w:gz"); b=b"reference implementation"; i=tarfile.TarInfo("package/styles/createPalette.js"); i.size=len(b); t.addfile(i,io.BytesIO(b)); t.close()',
      archive,
    ]);
    const artifact = JSON.parse(
      execFileSync(
        'python3',
        [
          'scripts/upstream/inspect-artifact.py',
          archive,
          JSON.stringify(['styles/createPalette.js', 'removed.js']),
        ],
        { encoding: 'utf8' },
      ),
    );
    assert.deepEqual(artifact.sourceFiles, {
      'styles/createPalette.js': createHash('sha256')
        .update('reference implementation')
        .digest('hex'),
    });
    assert.deepEqual(artifact.apiFiles, []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('supporting MIT references are monitored without becoming native compatibility targets', async () => {
  const { assertEligible, assertSourceEligible, monitoredPackages, packages } = await import(
    './config.mjs'
  );
  assertSourceEligible('@mui/utils');
  assert.ok(
    monitoredPackages.some((p) => p.name === '@mui/utils' && p.role === 'reference-dependency'),
  );
  assert.ok(!packages.some((p) => p.name === '@mui/utils'));
  assert.throws(() => assertEligible('@mui/utils'), /allowlist/);
  assert.throws(() => assertSourceEligible('@mui/x-data-grid-premium'), /allowlist/);
});
