// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, writeFile, mkdir, mkdtemp, cp, rm, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const host = fileURLToPath(new URL('..', import.meta.url));
const root = fileURLToPath(new URL('../../..', import.meta.url));
const editor = JSON.parse(await readFile(join(host, 'native-input-baseline.json'), 'utf8'));
const structure = JSON.parse(
  await readFile(join(host, 'structural-observation-baseline.json'), 'utf8'),
);
async function fixture(t) {
  // Node resolves module roots through real paths, including macOS /var aliases.
  const folder = await realpath(await mkdtemp(join(tmpdir(), 'mui-structural-abi-')));
  t.after(() => rm(folder, { recursive: true, force: true }));
  const nativeRoot = join(folder, 'node_modules/react-native'),
    copy = join(folder, 'host');
  await mkdir(join(copy, 'scripts'), { recursive: true });
  for (const path of [
    'scripts/verify-native-input.cjs',
    'scripts/verify-structural-input.cjs',
    'native-input-baseline.json',
    'structural-observation-baseline.json',
  ])
    await cp(join(host, path), join(copy, path));
  for (const path of new Set([...Object.keys(editor.files), ...Object.keys(structure.files)])) {
    await mkdir(join(nativeRoot, path, '..'), { recursive: true });
    await cp(join(root, 'node_modules/react-native', path), join(nativeRoot, path));
  }
  await writeFile(
    join(nativeRoot, 'package.json'),
    JSON.stringify({ name: 'react-native', version: structure.reactNativeVersion }),
  );
  const cache = join(folder, 'autolinking.json');
  await writeFile(
    cache,
    JSON.stringify({
      dependencies: {
        '@altroo/mui-native-host': {
          platforms: {
            android: {
              componentDescriptors: ['AltrooMUITextInputComponentDescriptor'],
              cxxModuleHeaderName: 'AltrooStructuralObserver',
            },
          },
        },
      },
    }),
  );
  const run = (...args) =>
    spawnSync(process.execPath, [join(copy, 'scripts/verify-structural-input.cjs'), ...args], {
      encoding: 'utf8',
    });
  return { folder, nativeRoot, copy, cache, run };
}
test('actual source guard preserves the editor baseline and adds the structural ABI', async (t) => {
  const f = await fixture(t),
    r = f.run('--native-root', f.nativeRoot, '--android-autolinking', f.cache, '--root');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, f.nativeRoot);
});
test('changed private Fabric hook source fails before native compilation', async (t) => {
  const f = await fixture(t),
    path = 'ReactCommon/react/renderer/uimanager/UIManagerCommitHook.h';
  await writeFile(
    join(f.nativeRoot, path),
    (await readFile(join(f.nativeRoot, path), 'utf8')) + '\n// changed peer\n',
  );
  const r = f.run();
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Structural observation peer source changed.*UIManagerCommitHook/);
});
test('wrong peer version still requires a reviewed upgrade', async (t) => {
  const f = await fixture(t);
  await writeFile(
    join(f.nativeRoot, 'package.json'),
    JSON.stringify({ name: 'react-native', version: '99.0.0' }),
  );
  const r = f.run();
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Upgrade.*reviewed adapter/s);
});
test('mismatched native and JS roots preserve the existing guard', async (t) => {
  const f = await fixture(t);
  await mkdir(join(f.folder, 'other'));
  const r = f.run('--native-root', join(f.folder, 'other'));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /different React Native roots/);
});
for (const provider of [null, undefined, 'OtherObserver', '']) {
  test('missing/wrong C++ autolinking provider rejects ' + provider, async (t) => {
    const f = await fixture(t),
      data = JSON.parse(await readFile(f.cache, 'utf8'));
    data.dependencies['@altroo/mui-native-host'].platforms.android.cxxModuleHeaderName = provider;
    await writeFile(f.cache, JSON.stringify(data));
    const r = f.run('--android-autolinking', f.cache);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /missing its C\+\+ provider/);
  });
}
test('adding C++ observation never bypasses the existing Fabric input descriptor guard', async (t) => {
  const f = await fixture(t),
    data = JSON.parse(await readFile(f.cache, 'utf8'));
  data.dependencies['@altroo/mui-native-host'].platforms.android.componentDescriptors = [];
  await writeFile(f.cache, JSON.stringify(data));
  const r = f.run('--android-autolinking', f.cache);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /missing its Fabric descriptor/);
});
for (const args of [['--native-root'], ['--native-root', '--root'], ['--android-autolinking']]) {
  test('missing command path fails closed ' + args.join(' '), async (t) => {
    const f = await fixture(t),
      r = f.run(...args);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /requires a path/);
  });
}

// The native host-element predicate depends on these trait/boundary contracts.
for (const path of [
  'ReactCommon/react/renderer/components/view/ViewShadowNode.cpp',
  'ReactCommon/react/renderer/components/view/ViewShadowNode.h',
  'ReactCommon/react/renderer/components/view/platform/cxx/react/renderer/components/view/HostPlatformViewTraitsInitializer.h',
  'ReactCommon/react/renderer/components/view/platform/android/react/renderer/components/view/HostPlatformViewTraitsInitializer.h',
  'ReactCommon/react/renderer/core/ShadowNodeTraits.h',
  'ReactCommon/react/renderer/components/text/TextShadowNode.h',
  'ReactCommon/react/renderer/components/virtualview/VirtualViewShadowNode.h',
  'ReactCommon/react/renderer/components/root/RootShadowNode.h',
  'ReactCommon/react/renderer/components/modal/ModalHostViewShadowNode.h',
  'ReactCommon/react/renderer/components/inputaccessory/InputAccessoryShadowNode.h',
]) {
  test('changed host-element boundary source rejects before compilation: ' + path, async (t) => {
    const f = await fixture(t);
    await writeFile(
      join(f.nativeRoot, path),
      (await readFile(join(f.nativeRoot, path), 'utf8')) + '\n// changed host boundary\n',
    );
    const r = f.run();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Structural observation peer source changed/);
    assert.ok(r.stderr.includes(path));
  });
}
