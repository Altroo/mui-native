// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const editor = require('./verify-native-input.cjs');
const baseline = require('../structural-observation-baseline.json');
function verifyStructuralInput(nativeRoot) {
  const root = editor.verifyNativeInput(nativeRoot);
  const actual = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
  if (actual !== baseline.reactNativeVersion)
    throw Error(
      'Structural observation requires a source-reviewed adapter for this RN version. Upgrade the adapter and rebuild.',
    );
  for (const [path, expected] of Object.entries(baseline.files)) {
    const actual = createHash('sha256')
      .update(readFileSync(join(root, path)))
      .digest('hex');
    if (actual !== expected)
      throw Error(
        'Structural observation peer source changed: react-native/' +
          path +
          '. Upgrade the reviewed adapter and rebuild; do not bypass this ABI check.',
      );
  }
  return root;
}
function verifyStructuralAutolinking(path) {
  editor.verifyAndroidAutolinking(path);
  const cache = JSON.parse(readFileSync(path, 'utf8'));
  const dependencies = cache.dependencies ?? {};
  const host =
    dependencies['@altroo/mui-native-host'] ??
    Object.values(dependencies).find((value) => value?.name === '@altroo/mui-native-host');
  if (host?.platforms?.android?.cxxModuleHeaderName !== 'AltrooStructuralObserver')
    throw Error(
      'Structural observation is missing its C++ provider in the generated Android autolinking cache. Regenerate the cache and rebuild; do not bypass this registration check.',
    );
}
module.exports = { verifyStructuralInput, verifyStructuralAutolinking };
if (require.main === module) {
  const args = process.argv.slice(2);
  const value = (name) => {
    const index = args.indexOf(name);
    if (index < 0) return undefined;
    if (!args[index + 1] || args[index + 1].startsWith('--'))
      throw Error(name + ' requires a path');
    return args[index + 1];
  };
  const root = verifyStructuralInput(value('--native-root'));
  const cache = value('--android-autolinking');
  if (cache) verifyStructuralAutolinking(cache);
  process.stdout.write(
    args.includes('--root') ? root : 'Native host structural peer sources verified.\n',
  );
}
