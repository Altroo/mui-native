import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { reusedFiles, compareReusedFiles, replaceUniqueLocalFileEntries } from './reuse.mjs';
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

// Exercise the actual monitor registration, not a hand-built reuse fixture.
test('Divider source changes identify the maintained native implementation and public contracts', async () => {
  const reuse = JSON.parse(
    await readFile(new URL('../../upstream/reuse.json', import.meta.url), 'utf8'),
  );
  const divider = JSON.parse(
    await readFile(new URL('../../upstream/divider.json', import.meta.url), 'utf8'),
  );
  const cases = [
    ['@mui/material', 'Divider/Divider.js', 'packages/material/src/divider.tsx'],
    ['@mui/material', 'Divider/Divider.d.ts', 'packages/material/src/dividerTypes.ts'],
    ['@mui/material', 'Divider/Divider.d.mts', 'packages/material/src/dividerTypes.ts'],
    ['@mui/material', 'Divider/dividerClasses.js', 'packages/material/src/dividerClasses.ts'],
    ['@mui/material', 'Divider/index.js', 'packages/material/src/Divider/index.ts'],
    ['@mui/material', 'styles/createThemeNoVars.js', 'packages/material/src/styles/createTheme.ts'],
    ['@mui/material', 'styles/components.d.ts', 'packages/material/src/styles/props.ts'],
    ['@mui/utils', 'composeClasses/composeClasses.js', 'packages/material/src/divider.tsx'],
    ['@mui/system', 'createStyled/createStyled.js', 'packages/material/src/divider.tsx'],
  ];
  for (const [name, path, localFile] of cases) {
    const files = reusedFiles(reuse, name);
    const source = files.find((file) => file.path === path);
    assert.ok(source, `Missing monitor registration: ${name}/${path}`);
    const reference = divider.references.find((item) => item.name === name);
    assert.equal(
      source.sha256,
      reference.sourceFiles[path],
      'Monitor must retain the reviewed source hash',
    );
    assert.ok(source.localFiles.includes(localFile), `Missing affected native file: ${localFile}`);
    const artifact = Object.fromEntries(files.map((file) => [file.path, file.sha256]));
    assert.deepEqual(compareReusedFiles(files, artifact), []);
    artifact[path] = '0'.repeat(64);
    const changes = compareReusedFiles(files, artifact);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].path, path);
    assert.equal(changes[0].status, 'changed');
    assert.ok(changes[0].localFiles.includes(localFile));
    delete artifact[path];
    assert.equal(compareReusedFiles(files, artifact)[0].status, 'removed');
  }
});

test('reference updates preserve interleaved family records and are idempotent without mutation', () => {
  const ownedA = Object.freeze({ ...entry, localFile: 'paper-a' }),
    ownedB = Object.freeze({ ...entry, localFile: 'paper-b' });
  const foreignA = Object.freeze({ ...entry, localFile: 'box' }),
    foreignB = Object.freeze({ ...entry, localFile: 'card' });
  const input = Object.freeze([foreignA, ownedA, foreignB, ownedB]);
  const a = Object.freeze({ ...ownedA, adaptations: ['current'] }),
    b = Object.freeze({ ...ownedB, adaptations: ['current'] });
  const output = replaceUniqueLocalFileEntries(input, [a, b]);
  assert.deepEqual(output, [foreignA, a, foreignB, b]);
  assert.equal(output[0], foreignA);
  assert.equal(output[2], foreignB);
  assert.deepEqual(input, [foreignA, ownedA, foreignB, ownedB]);
  assert.deepEqual(replaceUniqueLocalFileEntries(output, [a, b]), output);
});
test('changed, missing and duplicate owned records still stale strict reference checks', () => {
  const a = { ...entry, localFile: 'paper-a' },
    b = { ...entry, localFile: 'paper-b' };
  const changed = {
    ...a,
    reference: { ...a.reference, sourceFiles: { 'styles/createPalette.js': 'b'.repeat(64) } },
  };
  assert.notDeepEqual(replaceUniqueLocalFileEntries([a, b], [changed, b]), [a, b]);
  assert.deepEqual(replaceUniqueLocalFileEntries([a], [a, b]), [a, b]);
  assert.throws(() => replaceUniqueLocalFileEntries([a, a, b], [a, b]), /Ambiguous duplicate/);
  assert.throws(() => replaceUniqueLocalFileEntries([a], [a, a]), /unique upstream\/local file/);
});

test('a local file attributed to another upstream remains intact and ambiguous owned origins reject', () => {
  const material = Object.freeze({ ...entry, localFile: 'paper' });
  const utils = Object.freeze({
    ...entry,
    localFile: 'paper',
    reference: { ...entry.reference, name: '@mui/utils' },
  });
  const changed = { ...material, adaptations: ['current'] };
  const input = Object.freeze([material, utils]);
  const output = replaceUniqueLocalFileEntries(input, [changed]);
  assert.deepEqual(output, [changed, utils]);
  assert.equal(output[1], utils);
  assert.deepEqual(input, [material, utils]);
  const conflicting = {
    ...material,
    reference: { ...material.reference, sourceFiles: { 'another.js': 'b'.repeat(64) } },
  };
  assert.throws(
    () => replaceUniqueLocalFileEntries([material, conflicting, utils], [changed]),
    /Ambiguous duplicate/,
  );
  assert.deepEqual(replaceUniqueLocalFileEntries([material, utils], [changed, utils]), [
    changed,
    utils,
  ]);
});
