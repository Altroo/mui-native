// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import Module from 'node:module';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
test('Portal native adaptation retains its locked source and license provenance', async () => {
  const record = JSON.parse(await readFile('upstream/native-rendering.json', 'utf8'));
  const manifest = JSON.parse(await readFile('node_modules/react-native/package.json', 'utf8'));
  assert.equal(manifest.name, record.package.name);
  assert.equal(manifest.version, record.package.version);
  assert.equal(manifest.license, 'MIT');
  assert.equal(
    digest(await readFile('node_modules/react-native/LICENSE')),
    record.package.licenseSha256,
  );
  assert.equal(
    digest(await readFile('upstream/licenses/react-native-0.88.1.txt')),
    record.package.licenseSha256,
  );
  for (const [file, hash] of Object.entries(record.package.sourceFiles))
    assert.equal(digest(await readFile('node_modules/react-native/' + file)), hash, file);
  for (const file of record.localFiles) await access(file);
});

// QuartzCore is platform code. Linux CI skips this test; macOS checks execute
// the same native predicate compiled into the iOS host, without opening a device.
test(
  'UIKit observations accept native planar scale and reject unsafe transforms',
  {
    skip: process.platform !== 'darwin',
  },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mui-planar-transform-'));
    try {
      const binary = join(directory, 'planar-transform');
      execFileSync(
        'xcrun',
        [
          'clang++',
          '-std=c++20',
          '-Wall',
          '-Wextra',
          '-Werror',
          '-framework',
          'QuartzCore',
          '-framework',
          'Foundation',
          'tests/native/portal-planar-transform.mm',
          '-o',
          binary,
        ],
        { stdio: 'pipe' },
      );
      execFileSync(binary, [], { stdio: 'pipe' });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test('Android System font registration precedes all registered lazy view managers', async () => {
  const source = await readFile(
    'packages/native-host/android/src/main/java/com/altroo/muinativehost/AltrooMuiNativeHostPackage.kt',
    { encoding: 'utf8' },
  );
  const initializer = source.indexOf('  init {');
  const managers = source.indexOf('  override fun createViewManagers');
  assert(
    initializer >= 0 && initializer < managers,
    'Register fonts in the package constructor, before lazy view managers',
  );
  const bootstrap = source.slice(initializer, managers);
  assert.match(bootstrap, /ReactFontManager\.getInstance\(\)/);
  assert.match(
    bootstrap,
    /SystemFontRegistration\.ensure\(fontManager, \{ fontManager\.customFontFamilies \}\)/,
  );
  assert.match(
    bootstrap,
    /fontManager\.addCustomFont\(SystemFontRegistration\.FAMILY, Typeface\.DEFAULT\)/,
  );
  assert.doesNotMatch(source, /createNativeModules|getModule|NativeModule|TurboModule/);
  assert.deepEqual(
    [...source.matchAll(/\b(Altroo\w+Manager)\(\)/g)].map((match) => match[1]),
    [
      'AltrooMUITextInputManager',
      'AltrooMUIInteractiveViewManager',
      'AltrooMUINativePickerManager',
      'AltrooMUIPortalHostManager',
      'AltrooMUIPortalCanvasManager',
      'AltrooMUIStructuralViewManager',
    ],
  );
});

test('Android System registration is synchronous, idempotent, serializes library constructors and preserves app-owned families', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-system-font-registration-'));
  try {
    execFileSync(
      'javac',
      [
        '--release',
        '17',
        '-Xlint:all',
        '-Werror',
        '-d',
        directory,
        'packages/native-host/android/src/main/java/com/altroo/muinativehost/SystemFontRegistration.java',
        'packages/native-host/android/src/test/java/com/altroo/muinativehost/SystemFontRegistrationTest.java',
      ],
      { stdio: 'pipe', timeout: 20000 },
    );
    const output = execFileSync(
      'java',
      ['-cp', directory, 'com.altroo.muinativehost.SystemFontRegistrationTest'],
      { encoding: 'utf8', timeout: 10000 },
    );
    assert.match(
      output,
      /System font registration JVM policy: \d+ assertions passed; no Android UI or Typeface emulation executed/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the private Android font alias agrees across native registration and CSS normalization', async () => {
  const java = await readFile(
    'packages/native-host/android/src/main/java/com/altroo/muinativehost/SystemFontRegistration.java',
    { encoding: 'utf8' },
  );
  const css = await readFile('packages/system/src/nativeText.ts', { encoding: 'utf8' });
  const alias = java.match(/FAMILY = "([^"]+)"/)?.[1];
  assert(alias?.startsWith('__AltrooMUI'));
  assert.notEqual(alias, 'System');
  assert.equal(css.match(/const androidDefaultFontFamily = '([^']+)'/)?.[1], alias);
});

test('System pure context/helper imports remain independent of the native font bootstrap and renderer', async () => {
  const entries = [
    'packages/system/src/DefaultPropsProvider/index.ts',
    'packages/system/src/RtlProvider/index.tsx',
    'packages/system/src/createBreakpoints/index.ts',
  ];
  for (const entry of entries) {
    const { outputFiles, metafile } = await build({
      entryPoints: [entry],
      bundle: true,
      treeShaking: false,
      packages: 'external',
      platform: 'node',
      format: 'cjs',
      write: false,
      metafile: true,
      logLevel: 'silent',
    });
    for (const input of Object.values(metafile.inputs))
      for (const imported of input.imports)
        assert(
          !/^(?:react-native(?:\/|$)|@altroo\/mui-native(?:-host)?(?:\/|$))/.test(imported.path),
          entry + ' imported a renderer or Material: ' + imported.path,
        );
    const filename = join(process.cwd(), 'scripts', 'system-font-pure-import-check.cjs');
    const module = new Module(filename);
    module.filename = filename;
    module.paths = Module._nodeModulePaths(process.cwd());
    const load = Module._load;
    Module._load = function (request, parent, main) {
      assert(
        !/^(?:react-native(?:\/|$)|@altroo\/mui-native(?:-host)?(?:\/|$))/.test(request),
        'Pure System import initialized a renderer: ' + request,
      );
      return load.call(this, request, parent, main);
    };
    try {
      module._compile(outputFiles[0].text, filename);
      assert(Object.keys(module.exports).length > 0);
    } finally {
      Module._load = load;
    }
  }
});
