// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveMuiImport, createNativeTsconfig } = require('./index.cjs');
const material = require('../material/package.json');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');
test('Box class-name facade has public native, type and build entrypoints', () => {
  for (const platform of ['ios', 'android'])
    assert.equal(
      resolveMuiImport('@mui/material/className', platform),
      '@altroo/mui-native/className',
    );
  assert.equal(resolveMuiImport('@mui/material/className', 'web'), '@mui/material/className');
  assert.equal(
    createNativeTsconfig().compilerOptions.paths['@mui/material/className'][0],
    './node_modules/@altroo/mui-native/dist/className/index.d.ts',
  );
  assert.deepEqual(material.exports['./className'], {
    types: './dist/className/index.d.ts',
    'react-native': './src/className/index.ts',
    default: './dist/className/index.js',
  });
  assert(existsSync(resolve(__dirname, '../material/src/className/index.ts')));
});

test('Box upstream delta monitoring includes the actual canonical className facade', async () => {
  const { reusedFiles, compareReusedFiles } = await import('../../scripts/upstream/reuse.mjs');
  const record = require('../../upstream/reuse.json');
  const files = reusedFiles(record, '@mui/material');
  const actual = Object.fromEntries(files.map(({ path, sha256 }) => [path, sha256]));
  actual['className/index.js'] = '0'.repeat(64);
  assert.deepEqual(compareReusedFiles(files, actual), [
    {
      path: 'className/index.js',
      sha256: '0'.repeat(64),
      status: 'changed',
      localFiles: ['packages/material/src/className/index.ts'],
    },
  ]);
});
test('Material Box.js changes identify its extracted native implementation and legacy owners', async () => {
  const { reusedFiles } = await import('../../scripts/upstream/reuse.mjs');
  const source = reusedFiles(require('../../upstream/reuse.json'), '@mui/material').find(
    ({ path }) => path === 'Box/Box.js',
  );
  assert(source);
  assert(source.localFiles.includes('packages/material/src/nativeBox.tsx'));
  assert(source.localFiles.includes('packages/material/src/layout.tsx'));
});
