// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogIosSourceManifest } from './source-ios.mjs';

const hostName = 'AltrooMuiNativeHost';
const settings = {
  CONFIGURATION: 'Release',
  SWIFT_OPTIMIZATION_LEVEL: '-O',
  GCC_OPTIMIZATION_LEVEL: 's',
};
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'mui-ios-source-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const workspace = join(directory, 'workspace'),
    iosProject = join(directory, 'generated-ios');
  const nativeHost = join(directory, 'compiled-native-host');
  const write = async (base, path, value) => {
    await mkdir(dirname(join(base, path)), { recursive: true });
    await writeFile(join(base, path), value);
  };
  const git = (args) =>
    execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {
      cwd: workspace,
      stdio: 'pipe',
    });
  for (const [path, value] of Object.entries({
    'package.json': '{"name":"fixture","private":true}',
    'pnpm-lock.yaml': 'lockfileVersion: 9',
    'pnpm-workspace.yaml': 'packages: [packages/*]',
    'babel.config.cjs': 'module.exports = {};',
    'tsconfig.json': '{"compilerOptions":{"strict":true}}',
    '.gitignore': '.cache/\nnode_modules/\n',
    'apps/native-catalog/index.js': 'import "./App";',
    'apps/native-catalog/App.tsx': 'export default function App() {}',
    'apps/native-catalog/metro.config.cjs': 'module.exports = {};',
    'apps/native-benchmark/App.tsx': 'export default function Benchmark() {}',
    'packages/system/src/theme.ts': 'export const theme = {};',
    'packages/native-host/ios/WorkspaceCopy.mm': '// not the installed host copy',
  }))
    await write(workspace, path, value);
  const lock = `PODS:\n  - ${hostName} (1.0.0)\nEXTERNAL SOURCES:\n  ${hostName}:\n    :path: ${JSON.stringify(relative(iosProject, nativeHost))}\nSPEC CHECKSUMS:\n  ${hostName}: fixture\n`;
  for (const [path, value] of Object.entries({
    Podfile: "target 'Catalog' do\nend\n",
    'Podfile.lock': lock,
    'Podfile.properties.json': '{"expo.jsEngine":"hermes"}',
    'Catalog/AppDelegate.swift': 'import UIKit',
    'Catalog/Images.xcassets/Contents.json': '{"info":{"version":1}}',
    'Catalog.xcodeproj/project.pbxproj': '// Generated catalog project',
    'Catalog.xcodeproj/xcshareddata/xcschemes/Catalog.xcscheme': '<Scheme/>',
    'Pods/Manifest.lock': lock,
    'Pods/Pods.xcodeproj/project.pbxproj': '// Installed Pods project',
    [`Pods/Local Podspecs/${hostName}.podspec.json`]: JSON.stringify({
      name: hostName,
      source_files: ['ios/**/*.{h,m,mm,cpp}', 'common/cpp/**/*.{h,cpp}'],
    }),
    [`Pods/Target Support Files/${hostName}/${hostName}.release.xcconfig`]:
      'GCC_PREPROCESSOR_DEFINITIONS = RELEASE',
  }))
    await write(iosProject, path, value);
  for (const [path, value] of Object.entries({
    'package.json': '{"name":"@altroo/mui-native-host","version":"1.0.0"}',
    [`${hostName}.podspec`]: '// Installed local pod source definition',
    'react-native.config.js': 'module.exports = {};',
    'native-input-baseline.json': '{}',
    'ios/ActualHost.mm': '// actual compiled Objective-C++',
    'common/cpp/ActualHost.h': '// actual compiled common header',
    'scripts/verify-native-input.cjs': '// actual peer verification input',
    'src/NativeHostNativeComponent.ts': '// actual codegen input',
  }))
    await write(nativeHost, path, value);
  git(['init']);
  git(['add', '.']);
  git([
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'fixture',
  ]);
  const options = {
    nativeHost,
    entryFile: 'apps/native-catalog/index.js',
    projectRoot: 'apps/native-catalog',
    buildSettings: settings,
  };
  return {
    directory,
    workspace,
    iosProject,
    nativeHost,
    options,
    write,
    manifest: (overrides = {}) =>
      catalogIosSourceManifest(workspace, iosProject, { ...options, ...overrides }),
  };
}

test('deterministic current inputs include untracked sources and actual native app/host/settings mutations', async (t) => {
  const f = await fixture(t);
  let previous = await f.manifest();
  assert.deepEqual(await f.manifest(), previous);
  assert.match(previous.sourceId, /^[a-f0-9]{64}$/);
  assert(previous.files.length > 20);
  assert(
    previous.files.every(
      (file) => /^[a-f0-9]{64}$/.test(file.sha256) && !file.path.startsWith('/'),
    ),
  );
  const baseCommit = previous.baseCommit;
  for (const [base, path] of [
    [f.workspace, 'packages/system/src/untracked space-é.ts'],
    [f.workspace, 'apps/native-catalog/metro.config.cjs'],
    [f.workspace, 'apps/native-benchmark/App.tsx'],
    [f.workspace, 'pnpm-lock.yaml'],
    [f.workspace, 'tsconfig.json'],
    [f.iosProject, 'Catalog/AppDelegate.swift'],
    [f.iosProject, 'Catalog/Images.xcassets/Contents.json'],
    [f.iosProject, 'Catalog.xcodeproj/project.pbxproj'],
    [f.iosProject, 'Pods/Pods.xcodeproj/project.pbxproj'],
    [f.iosProject, `Pods/Target Support Files/${hostName}/${hostName}.release.xcconfig`],
    [f.nativeHost, 'ios/ActualHost.mm'],
    [f.nativeHost, 'common/cpp/ActualHost.h'],
    [f.nativeHost, 'src/NativeHostNativeComponent.ts'],
  ]) {
    await f.write(base, path, 'changed ' + path);
    const changed = await f.manifest();
    assert.notEqual(changed.sourceId, previous.sourceId, path);
    assert.equal(changed.baseCommit, baseCommit);
    previous = changed;
  }
  assert.equal(previous.local.nativeHost, await realpath(f.nativeHost));
  assert(
    previous.files.some(
      (file) => file.scope === 'native-host' && file.path === 'ios/ActualHost.mm',
    ),
  );
  assert(
    !previous.files.some(
      (file) => file.scope === 'native-host' && file.path.includes('WorkspaceCopy'),
    ),
  );
  assert.deepEqual(previous.preflight, {
    ...settings,
    ENTRY_FILE: 'apps/native-catalog/index.js',
    PROJECT_ROOT: 'apps/native-catalog',
  });
});

test('generated outputs, environment/source-ID carriers and credential files do not enter the manifest', async (t) => {
  const f = await fixture(t);
  const before = await f.manifest();
  for (const path of [
    'build/AppDelegate.swift',
    'DerivedData/output.o',
    'Catalog/main.jsbundle',
    'Catalog.xcodeproj/xcuserdata/user/settings.xcuserstate',
    'Pods/unrelated/build/output.swift',
    '.xcode.env.local',
    '.xcode.env',
    '.env',
    'build.log',
    'Catalog/main.jsbundle.map',
    'Catalog/private.p12',
    'Catalog/private.key',
  ])
    await f.write(f.iosProject, path, 'not an input ' + before.sourceId);
  await f.write(f.workspace, '.cache/source.json', JSON.stringify(before));
  await f.write(f.nativeHost, 'ios/build/output.mm', '// generated output');
  await symlink(join(f.directory, 'missing-secret-file'), join(f.iosProject, '.env.private'));
  assert.deepEqual(await f.manifest(), before);
});

test('Podfile.lock resolves the installed host, with explicit host equality and route identity', async (t) => {
  const f = await fixture(t);
  const automatic = await f.manifest({ nativeHost: undefined });
  assert.equal(automatic.sourceId, (await f.manifest()).sourceId);
  await assert.rejects(f.manifest({ nativeHost: f.workspace }), /differs from the installed/);
  await f.write(f.workspace, 'apps/native-catalog/other-entry.js', '// another entry');
  const original = await f.manifest();
  assert.notEqual(
    (await f.manifest({ entryFile: 'apps/native-catalog/other-entry.js' })).sourceId,
    original.sourceId,
  );
});

test('missing or invalid required inputs never yield a partial successful fingerprint', async (t) => {
  for (const [name, mutate, message] of [
    ['workspace lock', (f) => rm(join(f.workspace, 'pnpm-lock.yaml')), /ENOENT/],
    [
      'installed lock mismatch',
      (f) => f.write(f.iosProject, 'Pods/Manifest.lock', 'different install'),
      /does not match/,
    ],
    [
      'missing local host route',
      async (f) => {
        await f.write(f.iosProject, 'Podfile.lock', 'PODS: []');
        await f.write(f.iosProject, 'Pods/Manifest.lock', 'PODS: []');
      },
      /EXTERNAL SOURCES/,
    ],
    [
      'invalid project properties',
      (f) => f.write(f.iosProject, 'Podfile.properties.json', 'invalid json'),
      /JSON/,
    ],
    [
      'missing native app',
      (f) => rm(join(f.iosProject, 'Catalog/AppDelegate.swift')),
      /Missing generated native app/,
    ],
    [
      'empty Xcode project',
      (f) => f.write(f.iosProject, 'Catalog.xcodeproj/project.pbxproj', ''),
      /Empty catalog/,
    ],
    [
      'empty installed Pods project',
      (f) => f.write(f.iosProject, 'Pods/Pods.xcodeproj/project.pbxproj', ''),
      /Empty installed/,
    ],
    [
      'invalid properties shape',
      (f) => f.write(f.iosProject, 'Podfile.properties.json', 'null'),
      /must be an object/,
    ],
    [
      'missing compiled common source',
      (f) => rm(join(f.nativeHost, 'common'), { recursive: true }),
      /ENOENT/,
    ],
    [
      'missing Release target settings',
      (f) =>
        rm(
          join(f.iosProject, `Pods/Target Support Files/${hostName}/${hostName}.release.xcconfig`),
        ),
      /Missing installed/,
    ],
    [
      'unsupported podspec source roots',
      (f) =>
        f.write(
          f.iosProject,
          `Pods/Local Podspecs/${hostName}.podspec.json`,
          JSON.stringify({ name: hostName, source_files: ['somewhere-else/**/*'] }),
        ),
      /Unsupported installed/,
    ],
  ])
    await t.test(name, async (subtest) => {
      const f = await fixture(subtest);
      await mutate(f);
      await assert.rejects(f.manifest(), message);
    });
});

test('unsafe input links and invalid build routing/settings are refused', async (t) => {
  const f = await fixture(t);
  await assert.rejects(catalogIosSourceManifest(f.workspace, f.iosProject), /required/);
  for (const buildSettings of [
    {},
    { ...settings, CONFIGURATION: 'Debug' },
    { ...settings, SWIFT_OPTIMIZATION_LEVEL: '-Onone' },
    { ...settings, GCC_OPTIMIZATION_LEVEL: '0' },
    { ...settings, unrelated: 'not retained' },
    Object.assign(Object.create(settings), { first: 1, second: 2, third: 3 }),
  ])
    await assert.rejects(f.manifest({ buildSettings }), /buildSettings/);
  await assert.rejects(f.manifest({ projectRoot: f.directory }), /PROJECT_ROOT/);
  await assert.rejects(f.manifest({ entryFile: 'package.json' }), /ENTRY_FILE/);
  await symlink(join(f.nativeHost, 'ios/ActualHost.mm'), join(f.nativeHost, 'ios/linked.mm'));
  await assert.rejects(f.manifest(), /symlinks\/special files/);
});

test('entry and catalog-root symlinks cannot escape the fingerprinted workspace', async (t) => {
  const f = await fixture(t);
  await f.write(f.directory, 'outside.js', '// outside source');
  await symlink(
    join(f.directory, 'outside.js'),
    join(f.workspace, 'apps/native-catalog/escape.js'),
  );
  await assert.rejects(f.manifest({ entryFile: 'apps/native-catalog/escape.js' }), /ENTRY_FILE/);
  await rm(join(f.workspace, 'apps/native-catalog/escape.js'));
  const outside = join(f.directory, 'outside-catalog');
  await rename(join(f.workspace, 'apps/native-catalog'), outside);
  await symlink(outside, join(f.workspace, 'apps/native-catalog'));
  await assert.rejects(f.manifest(), /PROJECT_ROOT/);
});

test('native-host traversal roots cannot be redirected through directory symlinks', async (t) => {
  for (const directory of ['ios', 'common', 'src', 'scripts'])
    await t.test(directory, async (subtest) => {
      const f = await fixture(subtest);
      const outside = join(f.directory, 'outside-' + directory);
      await rename(join(f.nativeHost, directory), outside);
      await symlink(outside, join(f.nativeHost, directory));
      await assert.rejects(f.manifest(), /symlink/);
    });
});

test('explicit installed-Pod reads and target traversal reject linked ancestors', async (t) => {
  for (const directory of [
    'Pods',
    'Pods/Local Podspecs',
    'Pods/Pods.xcodeproj',
    `Pods/Target Support Files/${hostName}`,
  ])
    await t.test(directory, async (subtest) => {
      const f = await fixture(subtest);
      const outside = join(f.directory, 'outside-pod-input');
      await rename(join(f.iosProject, directory), outside);
      await symlink(outside, join(f.iosProject, directory));
      await assert.rejects(f.manifest(), /symlink/);
    });
});

test('explicit external project and native-host root aliases retain the same canonical identity', async (t) => {
  const f = await fixture(t);
  const baseline = await f.manifest();
  const projectAlias = join(f.directory, 'project-alias'),
    hostAlias = join(f.directory, 'host-alias');
  await symlink(f.iosProject, projectAlias);
  await symlink(f.nativeHost, hostAlias);
  const aliased = await catalogIosSourceManifest(f.workspace, projectAlias, {
    ...f.options,
    nativeHost: hostAlias,
  });
  assert.deepEqual(aliased, baseline);
});

test('the maintained file list supports catalogs larger than the default child-process buffer', async (t) => {
  const f = await fixture(t);
  const directory = join('packages', 'a'.repeat(180), 'b'.repeat(180));
  await mkdir(join(f.workspace, directory), { recursive: true });
  for (let index = 0; index < 2000; index++)
    await writeFile(join(f.workspace, directory, index + '-' + 'c'.repeat(190) + '.ts'), '// icon');
  const result = await f.manifest();
  assert.equal(
    result.files.filter((file) => file.scope === 'workspace' && file.path.startsWith(directory))
      .length,
    2000,
  );
  assert.match(result.sourceId, /^[a-f0-9]{64}$/);
});

test('CLI actually executes through a symlink and rejects incomplete or unknown options', async (t) => {
  const f = await fixture(t);
  const script = join(f.directory, 'linked-source-ios.mjs');
  await symlink(fileURLToPath(new URL('./source-ios.mjs', import.meta.url)), script);
  const input = join(f.directory, 'build-settings.json');
  await writeFile(input, JSON.stringify(settings));
  const args = [
    script,
    '--workspace',
    f.workspace,
    '--project',
    f.iosProject,
    '--native-host',
    f.nativeHost,
    '--entry-file',
    'apps/native-catalog/index.js',
    '--project-root',
    'apps/native-catalog',
    '--build-settings',
    input,
  ];
  const output = execFileSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(JSON.parse(output).sourceId, (await f.manifest()).sourceId);
  for (const command of [[script], [...args, '--unknown', 'value']]) {
    const result = spawnSync(process.execPath, command, { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert(result.stderr.length > 0);
  }
  assert.equal(await readFile(input, 'utf8'), JSON.stringify(settings));
});
