// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { resolveMuiImport, createNativeTsconfig } = require('./index.cjs');
const manifest = require('../material/package.json');
test('canonical original Avatar imports retain native routing and browser originals', () => {
  for (const suffix of ['', '/ListItemAvatar']) {
    const original = '@mui/material' + suffix;
    for (const platform of ['ios', 'android'])
      assert.equal(resolveMuiImport(original, platform), '@altroo/mui-native' + suffix);
    assert.equal(resolveMuiImport(original, 'web'), original);
  }
  for (const suffix of ['/unknown', '/listItemAvatarClasses']) {
    assert.throws(
      () => resolveMuiImport('@mui/material/ListItemAvatar' + suffix, 'ios'),
      /not implemented/,
    );
  }
});
test('canonical helper exports need no invented class-deep package API', () => {
  const key = './ListItemAvatar';
  assert(existsSync(resolve(__dirname, '../material', manifest.exports[key]['react-native'])));
  assert.equal(manifest.exports['./ListItemAvatar/listItemAvatarClasses'], undefined);
  assert.deepEqual(createNativeTsconfig().compilerOptions.paths['@mui/material/ListItemAvatar'], [
    './node_modules/@altroo/mui-native/dist/ListItemAvatar/index.d.ts',
  ]);
  assert.equal(
    createNativeTsconfig().compilerOptions.paths[
      '@mui/material/ListItemAvatar/listItemAvatarClasses'
    ],
    undefined,
  );
});
