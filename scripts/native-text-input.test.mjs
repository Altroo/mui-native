import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, readFile, writeFile, rm, access, realpath } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const baseline = require('../packages/native-host/native-input-baseline.json');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

test('native editor provenance locks the peer sources and license', async () => {
  const record = JSON.parse(
    await readFile('upstream/native-text-input.json', { encoding: 'utf8' }),
  );
  assert.equal(record.package.version, baseline.reactNativeVersion);
  assert.equal(record.package.licenseSha256, baseline.files.LICENSE);
  for (const [file, expected] of Object.entries(baseline.files)) {
    assert.equal(digest(await readFile('node_modules/react-native/' + file)), expected, file);
    if (file !== 'LICENSE') assert.equal(record.package.sourceFiles[file], expected, file);
  }
  for (const file of record.localFiles) await access(file);
});

test('native build verifier resolves the installed peer and rejects source or version drift', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-editor-abi-'));
  try {
    const host = join(directory, 'host'),
      peer = join(directory, 'node_modules/react-native');
    await mkdir(join(host, 'scripts'), { recursive: true });
    await cp(
      'packages/native-host/scripts/verify-native-input.cjs',
      join(host, 'scripts/verify-native-input.cjs'),
    );
    await cp(
      'packages/native-host/native-input-baseline.json',
      join(host, 'native-input-baseline.json'),
    );
    for (const file of Object.keys(baseline.files)) {
      await mkdir(dirname(join(peer, file)), { recursive: true });
      await cp('node_modules/react-native/' + file, join(peer, file));
    }
    const manifest = join(peer, 'package.json');
    await writeFile(
      manifest,
      JSON.stringify({ name: 'react-native', version: baseline.reactNativeVersion }),
    );
    const run = (...args) =>
      spawnSync(process.execPath, [join(host, 'scripts/verify-native-input.cjs'), ...args], {
        encoding: 'utf8',
      });
    const valid = run('--root');
    assert.equal(valid.status, 0, valid.stderr);
    assert.equal(valid.stdout, await realpath(peer));
    assert.equal(run('--native-root', peer).status, 0);
    // Reproduce an app whose Java manager is linked but whose settings cache
    // predates the new Fabric descriptor. A normal build must reject that cache.
    const autolinking = join(directory, 'autolinking.json');
    const android = {
      libraryName: 'AltrooMuiNativeHostSpec',
      componentDescriptors: ['AltrooMUIInteractiveViewComponentDescriptor'],
    };
    const cache = {
      dependencies: {
        '@altroo/mui-native-host': { platforms: { android } },
        'unrelated-host': {
          platforms: {
            android: {
              libraryName: 'AltrooMuiNativeHostSpec',
              componentDescriptors: ['AltrooMUITextInputComponentDescriptor'],
            },
          },
        },
      },
    };
    await writeFile(autolinking, JSON.stringify(cache));
    const stale = run('--android-autolinking', autolinking);
    assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /missing its Fabric descriptor/);
    assert.match(stale.stderr, /Remove this generated cache and rebuild/);
    android.componentDescriptors.unshift('AltrooMUITextInputComponentDescriptor');
    await writeFile(autolinking, JSON.stringify(cache));
    assert.equal(run('--android-autolinking', autolinking).status, 0);
    for (const invalid of [
      null,
      { ...android, componentDescriptors: 'AltrooMUITextInputComponentDescriptor' },
    ]) {
      cache.dependencies['@altroo/mui-native-host'].platforms.android = invalid;
      await writeFile(autolinking, JSON.stringify(cache));
      const rejected = run('--android-autolinking', autolinking);
      assert.notEqual(rejected.status, 0);
      assert.match(rejected.stderr, /missing its Fabric descriptor/);
    }
    cache.dependencies = {
      alias: { name: '@altroo/mui-native-host', platforms: { android } },
      '@altroo/mui-native-host': { platforms: { android: null } },
    };
    await writeFile(autolinking, JSON.stringify(cache));
    assert.notEqual(run('--android-autolinking', autolinking).status, 0);
    delete cache.dependencies['@altroo/mui-native-host'];
    await writeFile(autolinking, JSON.stringify(cache));
    assert.equal(run('--android-autolinking', autolinking).status, 0);
    const alternate = join(directory, 'alternate-native-root');
    await cp(peer, alternate, { recursive: true });
    const divergent = run('--native-root', alternate);
    assert.notEqual(divergent.status, 0);
    assert.match(divergent.stderr, /different React Native roots/);
    const file = Object.keys(baseline.files)[0];
    await writeFile(join(peer, file), 'changed peer source');
    const modified = run();
    assert.notEqual(modified.status, 0);
    assert.match(modified.stderr, /peer source changed.*TextInput/);
    await cp('node_modules/react-native/' + file, join(peer, file));
    await writeFile(manifest, JSON.stringify({ name: 'react-native', version: '0.89.0' }));
    const upgraded = run();
    assert.notEqual(upgraded.status, 0);
    assert.match(upgraded.stderr, /no reviewed adapter.*0\.89\.0/);
    assert.match(upgraded.stderr, /Upgrade MUI Native/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('editor files transform under the native preset without suppressing application import warnings', () => {
  const babel = require('@babel/core');
  for (const file of ['nativeTextInputRuntime.js', 'nativeTextInputNativeComponent.js']) {
    const filename = resolve('packages/native-host/src', file);
    const output = babel.transformFileSync(filename, { envName: 'development' }).code;
    assert.doesNotMatch(output, /Deep imports from the 'react-native' package are deprecated/);
  }
  const ordinary = babel.transformSync(
    "import State from 'react-native/Libraries/Components/TextInput/TextInputState'; export {State};",
    {
      filename: resolve('apps/native-catalog/import-warning-probe.js'),
      envName: 'development',
    },
  ).code;
  assert.match(ordinary, /Deep imports from the 'react-native' package are deprecated/);
});

test('Expo catalog uses its own scoped vendor config and retains application warnings', () => {
  const babel = require('@babel/core');
  const configFile = resolve('apps/native-catalog/babel.config.cjs');
  assert.doesNotThrow(() => babel.loadPartialConfig({ configFile, envName: 'development' }));
  const appRequire = createRequire(resolve('apps/native-catalog/package.json'));
  const expoRequire = createRequire(appRequire.resolve('expo/package.json'));
  const transformer = expoRequire('@expo/metro-config/babel-transformer');
  assert.ok(transformer.getCacheKey({ projectRoot: resolve('apps/native-catalog') }));
  const transform = (source, filename) =>
    babel.transformSync(source, {
      filename: resolve(filename),
      configFile,
      envName: 'development',
      caller: { name: 'metro', platform: 'ios', isDev: true, bundler: 'metro' },
    }).code;
  const probe =
    "import State from 'react-native/Libraries/Components/TextInput/TextInputState'; export {State};";
  assert.doesNotMatch(
    transform(probe, 'packages/native-host/src/nativeTextInputRuntime.js'),
    /Deep imports from/,
  );
  assert.match(
    transform(probe, 'apps/native-catalog/import-warning-probe.js'),
    /Deep imports from/,
  );
});
