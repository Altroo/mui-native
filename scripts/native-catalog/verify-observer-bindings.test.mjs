// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Isolated source/generated fixtures, never a native build or binary proof.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  readdir,
  copyFile,
  symlink,
  rm,
} from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { expectedObserverBindings, verifyObserverBindings } from './verify-observer-bindings.mjs';
const root = fileURLToPath(new URL('../..', import.meta.url));
const host = join(root, 'packages/native-host');
const script = fileURLToPath(new URL('./verify-observer-bindings.mjs', import.meta.url));
async function fixture(t) {
  const projectRoot = await mkdtemp(join(tmpdir(), 'mui-generated-observer-'));
  t.after(() => rm(projectRoot, { recursive: true, force: true }));
  const fixtureHost = join(projectRoot, 'packages/native-host');
  const files = [
    'package.json',
    'native-input-baseline.json',
    'structural-observation-baseline.json',
    'scripts/verify-native-input.cjs',
    'scripts/verify-structural-input.cjs',
  ];
  for (const name of await readdir(join(host, 'src'))) {
    if (/^(Native.+|.+NativeComponent)\.tsx?$/.test(name)) files.push('src/' + name);
  }
  for (const file of files) {
    const target = join(fixtureHost, file);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(host, file), target);
  }
  await mkdir(join(projectRoot, 'node_modules'));
  await symlink(
    join(root, 'node_modules/react-native'),
    join(projectRoot, 'node_modules/react-native'),
    'dir',
  );
  const expected = expectedObserverBindings(projectRoot);
  const paths = {
    ios: join(
      projectRoot,
      'apps/native-catalog/ios/build/generated/ios/ReactCodegen',
      expected.fileName,
    ),
    android: join(
      fixtureHost,
      'android/build/generated/source/codegen/jni/react/renderer/components',
      expected.libraryName,
      expected.fileName,
    ),
  };
  for (const path of Object.values(paths)) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, expected.header);
  }
  return {
    projectRoot,
    expected,
    paths,
    spec: join(fixtureHost, 'src/NativeAltrooStructuralObserver.ts'),
  };
}
for (const platform of ['ios', 'android', 'both'])
  test('actual pinned generator header passes canonical ' + platform + ' paths', async (t) => {
    const f = await fixture(t),
      result = verifyObserverBindings({ projectRoot: f.projectRoot, platform });
    assert.equal(result.outputs.length, platform === 'both' ? 2 : 1);
    assert.equal(result.status, 'source-bindings-current');
    assert.equal(result.compiledOrInstalledBinaryProved, false);
    assert.deepEqual(result.requiredMethods, f.expected.methods);
  });
test('expected names and arities come from nonempty actual Spec schema', async (t) => {
  const f = await fixture(t);
  assert(f.expected.methods.length > 0);
  for (const method of f.expected.methods)
    assert(
      f.expected.header.includes(
        `methodMap_["${method.name}"] = MethodMetadata {.argCount = ${method.arity},`,
      ),
    );
});
for (const platform of ['ios', 'android'])
  test('missing actual ' + platform + ' header fails clearly', async (t) => {
    const f = await fixture(t);
    await rm(f.paths[platform]);
    assert.throws(
      () => verifyObserverBindings({ projectRoot: f.projectRoot, platform }),
      /missing\/unreadable actual.*Regenerate/,
    );
  });
for (const [name, mutate] of [
  [
    'existing method arity changed',
    (header, entry, method) =>
      header.replace(
        entry,
        entry.replace(`.argCount = ${method.arity}`, `.argCount = ${method.arity + 1}`),
      ),
  ],
  ['existing method omitted', (header, entry) => header.replace(entry, '')],
  [
    'method text only in comment cannot spoof missing table',
    (header, entry) => header.replace(entry, '// ' + entry),
  ],
  [
    'extra unreviewed table entry',
    (header) => header + '\nmethodMap_["notInSpec"] = MethodMetadata {.argCount = 0};\n',
  ],
  ['empty generated header', () => ''],
])
  test(name + ' rejects without writing actual output', async (t) => {
    const f = await fixture(t),
      method = f.expected.methods[0];
    const entry = `methodMap_["${method.name}"] = MethodMetadata {.argCount = ${method.arity}, .invoker = __${method.name}};`;
    assert.equal(f.expected.header.split(entry).length, 2);
    const changed = mutate(f.expected.header, entry, method);
    assert.notEqual(changed, f.expected.header);
    await writeFile(f.paths.ios, changed);
    assert.throws(
      () => verifyObserverBindings({ projectRoot: f.projectRoot, platform: 'ios' }),
      /stale or noncanonical actual ios/,
    );
    assert.equal(await readFile(f.paths.ios, 'utf8'), changed);
  });
test('fresh source arity change rejects the previously generated header', async (t) => {
  const f = await fixture(t),
    source = await readFile(f.spec, 'utf8');
  const old = 'getDiagnostics(): StructuralDiagnostics;';
  assert.equal(source.split(old).length, 2);
  await writeFile(
    f.spec,
    source.replace(old, 'getDiagnostics(extra: string): StructuralDiagnostics;'),
  );
  assert.throws(
    () => verifyObserverBindings({ projectRoot: f.projectRoot, platform: 'both' }),
    /stale or noncanonical/,
  );
});
test('a newly declared method is required without a maintained method-name list', async (t) => {
  const f = await fixture(t),
    source = await readFile(f.spec, 'utf8');
  const old = 'export interface Spec extends TurboModule {';
  assert.equal(source.split(old).length, 2);
  await writeFile(
    f.spec,
    source.replace(old, old + '\n  fixtureOnlyNewMethod(value: number): void;'),
  );
  assert(
    expectedObserverBindings(f.projectRoot).methods.some(
      (x) => x.name === 'fixtureOnlyNewMethod' && x.arity === 1,
    ),
  );
  assert.throws(
    () => verifyObserverBindings({ projectRoot: f.projectRoot, platform: 'ios' }),
    /stale or noncanonical/,
  );
});
test('a parseable Spec skipped by RN discovery fails closed', async (t) => {
  const f = await fixture(t),
    source = await readFile(f.spec, 'utf8');
  await writeFile(f.spec, source.replace('extends TurboModule', 'extends\n TurboModule'));
  assert.throws(
    () => verifyObserverBindings({ projectRoot: f.projectRoot, platform: 'ios' }),
    /combined library schema omitted/,
  );
});
test('malformed source cannot pass against a fresh-looking generated file', async (t) => {
  const f = await fixture(t);
  await writeFile(f.spec, 'export interface Spec extends TurboModule { broken(');
  assert.throws(() => verifyObserverBindings({ projectRoot: f.projectRoot, platform: 'ios' }));
});
test('unknown platform rejects before reading a source root', () => {
  assert.throws(
    () => verifyObserverBindings({ projectRoot: '/missing-project', platform: 'unknown' }),
    /platform must be/,
  );
});
test('CLI uses canonical build paths and rejects an arbitrary-header substitution', async (t) => {
  const f = await fixture(t),
    args = [script, '--project-root', f.projectRoot, '--platform', 'ios'];
  const pass = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(pass.status, 0, pass.stderr);
  assert.equal(JSON.parse(pass.stdout).compiledOrInstalledBinaryProved, false);
  await rm(f.paths.ios);
  const fail = spawnSync(process.execPath, [...args, '--header', f.paths.android], {
    encoding: 'utf8',
  });
  assert.equal(fail.status, 1);
  assert.match(fail.stderr, /unknown, repeated or missing command/);
  const missing = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /missing\/unreadable actual ios/);
});

test('platform-specific NativeModule source cannot be ignored by the preflight', async (t) => {
  const f = await fixture(t);
  const source =
    "import type {TurboModule} from 'react-native'; import {TurboModuleRegistry} from 'react-native'; export interface Spec extends TurboModule { ping(): string; } export default TurboModuleRegistry.get<Spec>('FixtureOnly');";
  await writeFile(join(dirname(f.spec), 'NativeFixtureOnly.ios.ts'), source);
  assert.throws(
    () => verifyObserverBindings({ projectRoot: f.projectRoot, platform: 'ios' }),
    /stale or noncanonical/,
  );
  assert.equal(
    verifyObserverBindings({ projectRoot: f.projectRoot, platform: 'android' }).status,
    'source-bindings-current',
  );
});

test('CLI invocation through a symlink still performs the failing preflight', async (t) => {
  const f = await fixture(t),
    entry = join(f.projectRoot, 'linked-preflight.mjs');
  await symlink(script, entry);
  await rm(f.paths.ios);
  const result = spawnSync(
    process.execPath,
    [entry, '--project-root', f.projectRoot, '--platform', 'ios'],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing\/unreadable actual ios/);
});

const entryModes = [
  ['canonical', [], false],
  ['symlink', [], true],
  ['canonical-preserve-main', ['--preserve-symlinks-main'], false],
  ['symlink-preserve-main', ['--preserve-symlinks-main'], true],
];
for (const [mode, flags, aliasEntry] of entryModes)
  for (const defaultProject of [false, true])
    for (const fresh of [false, true])
      test(`CLI ${mode} ${defaultProject ? 'module-default-root' : 'explicit-root'} ${fresh ? 'fresh' : 'stale'}`, async (t) => {
        const f = await fixture(t);
        const canonical = join(
          f.projectRoot,
          'scripts/native-catalog/verify-observer-bindings.mjs',
        );
        await mkdir(dirname(canonical), { recursive: true });
        await copyFile(script, canonical);
        const alias = join(f.projectRoot, 'aliases/moved-preflight.mjs');
        await mkdir(dirname(alias));
        await symlink(canonical, alias);
        if (!fresh) {
          const method = f.expected.methods[0];
          const entry = `methodMap_["${method.name}"] = MethodMetadata {.argCount = ${method.arity}, .invoker = __${method.name}};`;
          assert.equal(f.expected.header.split(entry).length, 2);
          await writeFile(f.paths.ios, f.expected.header.replace(entry, ''));
        }
        const args = [
          ...flags,
          aliasEntry ? alias : canonical,
          ...(defaultProject ? [] : ['--project-root', f.projectRoot]),
          '--platform',
          'ios',
        ];
        const result = spawnSync(process.execPath, args, { encoding: 'utf8', cwd: f.projectRoot });
        assert.equal(result.status, fresh ? 0 : 1, result.stderr);
        if (fresh) {
          const data = JSON.parse(result.stdout),
            { realpath } = await import('node:fs/promises');
          assert.equal(data.status, 'source-bindings-current');
          assert.equal(data.compiledOrInstalledBinaryProved, false);
          assert.equal(await realpath(data.specPath), await realpath(f.spec));
          assert.equal(await realpath(data.outputs[0].path), await realpath(f.paths.ios));
        } else {
          assert.equal(result.stdout, '');
          assert.match(result.stderr, /stale or noncanonical actual ios/);
        }
      });
