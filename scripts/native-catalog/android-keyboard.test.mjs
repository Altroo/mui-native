// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareKeyboard, summarizeKeyboard, keyboardStages } from './android-keyboard.mjs';

test('keyboard preparation preserves foreign runners and generated-source edits', async () => {
  const project = await mkdtemp(join(tmpdir(), 'mui-keyboard-prepare-'));
  try {
    await mkdir(join(project, 'app'), { recursive: true });
    const gradlePath = join(project, 'app/build.gradle');
    await writeFile(gradlePath, "applicationId 'other.app'");
    await assert.rejects(prepareKeyboard(project), /catalog/);
    const foreign =
      "applicationId 'dev.altroo.muinative.catalog'\ntestInstrumentationRunner 'existing.Runner'\n";
    await writeFile(gradlePath, foreign);
    await assert.rejects(prepareKeyboard(project), /Preserve the existing instrumentation runner/);
    assert.equal(await readFile(gradlePath, { encoding: 'utf8' }), foreign);
    await writeFile(gradlePath, "applicationId 'dev.altroo.muinative.catalog'\n");
    await prepareKeyboard(project);
    const gradle = await readFile(gradlePath, { encoding: 'utf8' });
    await prepareKeyboard(project);
    assert.equal(await readFile(gradlePath, { encoding: 'utf8' }), gradle);
    const source = join(
      project,
      'app/src/androidTest/java/dev/altroo/muinative/catalog/test/KeyboardScenario.java',
    );
    await writeFile(source, '// contributor edit');
    await assert.rejects(prepareKeyboard(project), /Preserve edits/);
    assert.equal(await readFile(source, { encoding: 'utf8' }), '// contributor edit');
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});

test('native keyboard completion requires every unique phase/target scenario and safe artifact paths', () => {
  const report = {
    schemaVersion: 1,
    status: 'passed',
    driver: 'Instrumentation.sendKeySync',
    device: { model: 'synthetic', sdk: 37, os: '17' },
    artifactDirectory: 'cache/mui-keyboard-123',
    stages: keyboardStages,
    screenshots: [
      'inline-commands.png',
      'nested-owner.png',
      'portal-editor.png',
      'dialog-editor.png',
    ],
  };
  const encode = (value) =>
    'INSTRUMENTATION_RESULT: keyboardReport=' +
    JSON.stringify(value) +
    '\nINSTRUMENTATION_CODE: -1\n';
  assert.deepEqual(summarizeKeyboard(encode(report)), report);
  for (const mutate of [
    (r) => (r.status = 'failed'),
    (r) => r.stages.pop(),
    (r) => (r.stages[3] = r.stages[2]),
    (r) => r.screenshots.pop(),
    (r) => (r.artifactDirectory = '../foreign'),
    (r) => delete r.device,
  ]) {
    const copy = structuredClone(report);
    mutate(copy);
    assert.throws(() => summarizeKeyboard(encode(copy)));
  }
  const valid = encode(report);
  for (const output of [
    valid + valid,
    valid.replace('CODE: -1', 'CODE: 0'),
    valid + 'INSTRUMENTATION_FAILED: stopped\n',
  ])
    assert.throws(() => summarizeKeyboard(output));
});
