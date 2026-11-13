// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  inspectLinearProgress,
  summarizeLinearProgress,
} from './android-linear-progress-report.mjs';

function evidence() {
  const stages = ['quarter', 'three-quarter', 'custom-range', 'rtl', 'dark', 'paused', 'restored'];
  const screenshots = stages.flatMap((stage) => [
    'linear-progress-' + stage + '.png',
    ...(['quarter', 'paused'].includes(stage)
      ? [0, 1, 2, 3].map((i) => `linear-progress-${stage}-paint-${i}.png`)
      : []),
  ]);
  const canvas = () => ({
    class: 'ReactViewGroup',
    width: 560,
    height: 8,
    alpha: 1,
    translationX: 0,
    visible: true,
    children: [
      {
        class: 'ReactViewGroup',
        width: 960,
        height: 8,
        alpha: 1,
        translationX: 0,
        visible: true,
        children: [
          {
            class: 'SvgView',
            width: 960,
            height: 8,
            alpha: 1,
            translationX: 0,
            visible: true,
            children: [
              {
                class: 'RectView',
                width: 960,
                height: 8,
                alpha: 1,
                translationX: 0,
                visible: true,
              },
            ],
          },
        ],
      },
    ],
  });
  const crops = () => ({
    bufferNative: canvas(),
    frames: Object.fromEntries(
      ['indeterminate', 'determinate', 'buffer', 'query'].map((key, i) => [
        key,
        { x: 10, y: 100 + i * 48, width: 280, height: 24 },
      ]),
    ),
    pixelFrames: Object.fromEntries(
      ['indeterminate', 'determinate', 'buffer', 'query'].map((key, i) => [
        key,
        [20, 200 + i * 96, 560, 48],
      ]),
    ),
  });
  return {
    schemaVersion: 1,
    scenario: 'linear-progress-v1',
    driver: 'native Instrumentation and UiAutomation',
    status: 'passed',
    artifactDirectory: 'cache/mui-linear-progress-1234',
    fontProfile: 'normal',
    device: { sdk: 37, density: 2, fontScale: 1 },
    stages,
    screenshots,
    states: stages.map((name, i) => {
      const percent = i === 0 || i === 6 ? 25 : 75,
        customRange = i >= 2 && i <= 5,
        rtl = i >= 3 && i <= 5,
        dark = i >= 4 && i <= 5,
        paused = i === 5;
      const min = customRange ? 20 : 0,
        max = customRange ? 80 : 100,
        value = customRange ? 65 : percent,
        valueBuffer = customRange ? 71 : 85;
      return {
        name,
        metadata: {
          percent,
          customRange,
          rtl,
          dark,
          paused,
          min,
          max,
          value,
          valueBuffer,
          refs: { attached: 1, cleaned: 0 },
          fontScale: 1,
          receipts: { progress: { window: { x: 10, y: 160, width: 280, height: 4 } } },
        },
        rootTag: 42,
        frame: { x: 10, y: 160, width: 280, height: 4 },
        translation: (percent / 100 - 1) * 280 * (rtl ? -1 : 1),
        range: [min, max, value],
        ...crops(),
        ...(i === 0 || i === 5
          ? {
              paint: [0, 1, 2, 3].map((j) => ({
                ...crops(),
                screenshot: `linear-progress-${name}-paint-${j}.png`,
              })),
            }
          : {}),
      };
    }),
  };
}
const stdout = (r) =>
  'INSTRUMENTATION_RESULT: linearProgressReport=' +
  JSON.stringify(r) +
  '\nINSTRUMENTATION_CODE: -1\n';
test('accept a complete bounded report and current native crop metadata', () =>
  assert.deepEqual(summarizeLinearProgress(stdout(evidence())), {
    status: 'passed',
    fontProfile: 'normal',
    states: 7,
    screenshots: 15,
    note: 'Native interaction, geometry and accessibility ranges passed. Review actual PNG paint separately.',
  }));
for (const [name, mutate] of [
  ['missing native canvas', (r) => delete r.states[0].bufferNative],
  [
    'cached initial rectangle',
    (r) => (r.states[0].bufferNative.children[0].children[0].children[0].width = 400),
  ],
  ['cached initial canvas', (r) => (r.states[0].bufferNative.children[0].children[0].width = 400)],
  [
    'incorrect native drawing height',
    (r) => (r.states[0].bufferNative.children[0].children[0].children[0].height = 0),
  ],
  [
    'moving reduced buffer',
    (r) => (r.states[5].paint[0].bufferNative.children[0].translationX = -20),
  ],
  ['path traversal', (r) => (r.artifactDirectory = 'cache/../foreign')],
  ['foreign screenshot', (r) => (r.screenshots[0] = '../secret.png')],
  ['duplicate screenshot', (r) => (r.screenshots[1] = r.screenshots[0])],
  ['wrong scenario', (r) => (r.scenario = 'circular-progress-v1')],
  ['failed run', (r) => (r.status = 'failed')],
  ['missing stages', (r) => r.states.pop()],
  ['unknown stage', (r) => (r.states[0].name = 'fake')],
  ['wrong numeric range', (r) => (r.states[2].range = [0, 100, 75])],
  ['wrong control range', (r) => (r.states[2].metadata.value = 75)],
  ['detached ref', (r) => (r.states[0].metadata.refs.cleaned = 1)],
  ['root replacement', (r) => (r.states[1].rootTag = 43)],
  ['fake bar translation', (r) => (r.states[0].translation = 0)],
  ['incorrect RTL bar', (r) => (r.states[3].translation = -70)],
  ['wrong native height', (r) => (r.states[0].frame.height = 44)],
  ['different ref dimensions', (r) => (r.states[0].metadata.receipts.progress.window.width = 300)],
  ['wrong font scale', (r) => (r.device.fontScale = 2)],
  ['unknown crop', (r) => (r.states[0].frames.extra = { x: 0, y: 0, width: 280, height: 24 })],
  ['missing crop', (r) => delete r.states[0].frames.query],
  ['wrong pixel density', (r) => (r.states[0].pixelFrames.query[2] = 280)],
  ['negative crop origin', (r) => (r.states[0].pixelFrames.query[0] = -2)],
  ['missing motion sample', (r) => r.states[0].paint.pop()],
  ['stale motion crop', (r) => (r.states[0].paint[0].pixelFrames.query[3] = 1)],
  ['wrong motion filename', (r) => (r.states[0].paint[0].screenshot = 'failure.png')],
])
  test('reject ' + name, () => {
    const report = evidence();
    mutate(report);
    assert.throws(() => summarizeLinearProgress(stdout(report)));
  });
test('reject missing and duplicate reports or instrumentation failures', () => {
  const text = stdout(evidence());
  assert.throws(() => inspectLinearProgress(''));
  assert.throws(() => inspectLinearProgress(text + text));
  assert.throws(() => summarizeLinearProgress(text + 'INSTRUMENTATION_FAILED: failed\n'));
  assert.throws(() => summarizeLinearProgress(text.replace('CODE: -1', 'CODE: 0')));
});
