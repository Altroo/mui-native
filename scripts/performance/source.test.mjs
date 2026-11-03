// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { sourceManifest } from './source.mjs';

test('fingerprint tracks unpublished Babel/native build changes and excludes unrelated consumer edits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-benchmark-source-'));
  const write = async (path, value) => {
    await mkdir(dirname(join(directory, path)), { recursive: true });
    await writeFile(join(directory, path), value);
  };
  const git = (args) => execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
  try {
    git(['init']);
    await write('.gitignore', 'apps/*/android/\n');
    await write('babel.config.cjs', 'module.exports = {};\n');
    await write('apps/native-benchmark/App.tsx', 'export default function App() {}\n');
    await write('fixtures/native-consumer/consumer.tsx', '// unrelated user draft\n');
    const native = 'apps/native-benchmark/android/';
    for (const file of [
      'build.gradle',
      'settings.gradle',
      'gradle.properties',
      'gradle/wrapper/gradle-wrapper.properties',
      'app/build.gradle',
      'app/proguard-rules.pro',
      'app/src/main/AndroidManifest.xml',
      'app/src/androidTest/Test.java',
    ])
      await write(native + file, file);
    git(['add', '.']);
    git([
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-m',
      'fixture',
    ]);
    const first = await sourceManifest(directory);
    await write('fixtures/native-consumer/consumer.tsx', '// newer user draft\n');
    assert.equal((await sourceManifest(directory)).sourceId, first.sourceId);
    await write('babel.config.cjs', 'module.exports = { presets: [] };\n');
    const babel = await sourceManifest(directory);
    assert.notEqual(babel.sourceId, first.sourceId);
    assert.equal(babel.baseCommit, first.baseCommit);
    await write(native + 'app/build.gradle', 'debuggable false\n');
    const nativeChange = await sourceManifest(directory);
    assert.notEqual(nativeChange.sourceId, babel.sourceId);
    assert(nativeChange.files.some((file) => file.path === native + 'app/build.gradle'));
    assert(!nativeChange.files.some((file) => file.path.includes('fixtures/native-consumer')));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
