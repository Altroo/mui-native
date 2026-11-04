/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
const { createHash } = require('node:crypto');
const { readFileSync, realpathSync } = require('node:fs');
const { dirname, join } = require('node:path');
const baseline = require('../native-input-baseline.json');
/** Verify actual peer sources, including private helpers, before native compilation. */
function verifyNativeInput(nativeRoot) {
  const manifest = require.resolve('react-native/package.json', { paths: [join(__dirname, '..')] });
  const root = dirname(manifest);
  if (nativeRoot && realpathSync(nativeRoot) !== realpathSync(root))
    throw new Error(
      'NativeTextInput native build and JavaScript resolve different React Native roots. Align the native project with the application peer, then rebuild.',
    );
  const actual = JSON.parse(readFileSync(manifest, { encoding: 'utf8' })).version;
  const guidance =
    'Upgrade MUI Native to a reviewed adapter for your React Native version, then rebuild. Do not patch or bypass the native editor ABI check.';
  if (actual !== baseline.reactNativeVersion)
    throw new Error(
      `NativeTextInput has no reviewed adapter for React Native ${actual}. ${guidance}`,
    );
  for (const [relative, expected] of Object.entries(baseline.files)) {
    const digest = createHash('sha256')
      .update(/** @type {Uint8Array} */ (readFileSync(join(root, relative))))
      .digest('hex');
    if (digest !== expected)
      throw new Error(`NativeTextInput peer source changed: react-native/${relative}. ${guidance}`);
  }
  return root;
}
/** Cached Java managers can exist without their Fabric descriptors. TextInput then
 * falls back to legacy interop, which cannot deliver its initial Fabric text state.
 * Inspect the same settings cache that generates the application's C++ registry. */
function verifyAndroidAutolinking(cachePath) {
  const cache = JSON.parse(readFileSync(cachePath, { encoding: 'utf8' }));
  const dependencies = cache.dependencies ?? {};
  const host =
    dependencies['@altroo/mui-native-host'] ??
    Object.values(dependencies).find(
      (dependency) => dependency?.name === '@altroo/mui-native-host',
    );
  const descriptors = host?.platforms?.android?.componentDescriptors;
  if (!Array.isArray(descriptors) || !descriptors.includes('AltrooMUITextInputComponentDescriptor'))
    throw new Error(
      `NativeTextInput is missing its Fabric descriptor in the generated Android autolinking cache: ${cachePath}. Remove this generated cache and rebuild the application. Do not bypass the registration check.`,
    );
}
module.exports = { verifyNativeInput, verifyAndroidAutolinking };
if (require.main === module) {
  const args = process.argv.slice(2);
  const nativeIndex = args.indexOf('--native-root');
  if (nativeIndex !== -1 && !args[nativeIndex + 1])
    throw new Error('--native-root requires the actual native React Native source directory.');
  const autolinkingIndex = args.indexOf('--android-autolinking');
  if (autolinkingIndex !== -1 && !args[autolinkingIndex + 1])
    throw new Error('--android-autolinking requires the generated application autolinking cache.');
  const root = verifyNativeInput(nativeIndex === -1 ? undefined : args[nativeIndex + 1]);
  if (autolinkingIndex !== -1) verifyAndroidAutolinking(args[autolinkingIndex + 1]);
  if (args.includes('--root')) process.stdout.write(root);
  else process.stdout.write('Native editor peer source baseline verified.\n');
}
