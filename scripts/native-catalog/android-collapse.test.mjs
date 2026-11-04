// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { summarizeCollapse, collapseStages, collapsePictures } from './android-collapse.mjs';
import { prepareCollapseSource } from './android-collapse-source.mjs';
const raw = (report) =>
  `INSTRUMENTATION_RESULT: collapseReport=${JSON.stringify(report)}\nINSTRUMENTATION_CODE: -1\n`;
function evidence() {
  return {
    schemaVersion: 1,
    scenario: 'collapse-v1',
    driver: 'native Instrumentation and UiAutomation',
    status: 'passed',
    artifactDirectory: 'cache/mui-collapse-123',
    device: { sdk: 37, model: 'emulator' },
    stages: [...collapseStages],
    screenshots: [...collapsePictures],
    samples: [
      {
        name: 'vertical-closed',
        axis: 'vertical',
        overflow: 'hidden',
        actual: 0,
        natural: 100,
        cross: 200,
      },
      {
        name: 'vertical-intermediate',
        axis: 'vertical',
        overflow: 'hidden',
        actual: 40,
        natural: 100,
        cross: 200,
      },
      {
        name: 'vertical-entered',
        axis: 'vertical',
        overflow: 'visible',
        actual: 100,
        natural: 100,
        cross: 200,
      },
      {
        name: 'content-grown',
        axis: 'vertical',
        overflow: 'visible',
        actual: 150,
        natural: 150,
        cross: 200,
      },
      {
        name: 'vertical-exit-intermediate',
        axis: 'vertical',
        overflow: 'hidden',
        actual: 70,
        natural: 150,
        cross: 200,
      },
      {
        name: 'horizontal-intermediate',
        axis: 'horizontal',
        overflow: 'hidden',
        actual: 40,
        natural: 180,
        cross: 64,
      },
      {
        name: 'horizontal-entered',
        axis: 'horizontal',
        overflow: 'visible',
        actual: 180,
        natural: 180,
        cross: 64,
      },
    ],
  };
}
test('Collapse evidence requires complete native stages, actual intermediate bounds and content growth', () => {
  assert.equal(summarizeCollapse(raw(evidence())).stages.length, 13);
  for (const mutate of [
    (r) => {
      r.status = 'failed';
    },
    (r) => {
      r.error = 'assertion';
    },
    (r) => {
      r.artifactDirectory = '../private';
    },
    (r) => {
      r.device.sdk = 0;
    },
    (r) => r.stages.pop(),
    (r) => r.stages.reverse(),
    (r) => r.screenshots.push('failure.png'),
    (r) => r.samples.pop(),
    (r) => {
      r.samples[0].actual = 1;
    },
    (r) => {
      r.samples[1].actual = r.samples[1].natural;
    },
    (r) => {
      r.samples[5].actual = 0;
    },
    (r) => {
      r.samples[2].actual = 40;
    },
    (r) => {
      r.samples[3].actual = r.samples[3].natural = 100;
    },
    (r) => {
      r.samples[6].axis = 'vertical';
    },
    (r) => {
      r.samples[6].cross = 0;
    },
    (r) => {
      r.samples[6].overflow = 'hidden';
    },
  ]) {
    const r = evidence();
    mutate(r);
    assert.throws(() => summarizeCollapse(raw(r)));
  }
  const output = raw(evidence());
  for (const bad of [
    output.replace('CODE: -1', 'CODE: 0'),
    output + output,
    output + 'INSTRUMENTATION_FAILED: crash\n',
    output.replace('collapseReport=', 'foreignReport='),
  ])
    assert.throws(() => summarizeCollapse(bad));
});
test('Collapse preparation is repeatable and protects manually edited generated source', async () => {
  const project = await mkdtemp(join(tmpdir(), 'mui-collapse-source-'));
  try {
    const target = await prepareCollapseSource(project);
    await prepareCollapseSource(project);
    const edited = (await readFile(target, 'utf8')) + '\n// contributor edit\n';
    await writeFile(target, edited);
    await assert.rejects(prepareCollapseSource(project), /Preserve edits/);
    assert.equal(await readFile(target, 'utf8'), edited);
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});
