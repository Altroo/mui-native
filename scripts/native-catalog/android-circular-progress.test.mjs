// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectCircularProgress,
  summarizeCircularProgress,
} from './android-circular-progress-report.mjs';
const stages = ['quarter', 'three-quarter', 'custom-range', 'no-track', 'paused', 'restored'];
function fixture() {
  return {
    schemaVersion: 1,
    scenario: 'circular-progress-v1',
    driver: 'native Instrumentation and UiAutomation',
    status: 'passed',
    fontProfile: 'normal',
    artifactDirectory: 'cache/mui-circular-progress-123',
    device: { sdk: 37, fontScale: 1, density: 3 },
    stages,
    screenshots: stages.flatMap((name) => [
      'circular-progress-' + name + '.png',
      ...(['quarter', 'paused'].includes(name)
        ? [0, 1, 2, 3].map((index) => `circular-progress-${name}-paint-${index}.png`)
        : []),
    ]),
    states: stages.map((name, index) => {
      const [percent, paused, track, customRange] = [
        [25, false, true, false],
        [75, false, true, false],
        [75, false, true, true],
        [75, false, false, true],
        [75, true, false, true],
        [25, false, true, false],
      ][index];
      const min = customRange ? 20 : 0,
        max = customRange ? 80 : 100,
        value = min + ((max - min) * percent) / 100;
      const frame = { x: 0, y: 0, width: 64, height: 64 };
      const sample = () => ({
        frames: Object.fromEntries(
          ['loading', 'determinate', 'fixed'].map((kind, i) => [
            kind,
            { x: i * 100, y: 100, width: 80, height: 80 },
          ]),
        ),
        pixelFrames: Object.fromEntries(
          ['loading', 'determinate', 'fixed'].map((kind, i) => [kind, [i * 300, 300, 240, 240]]),
        ),
      });
      return {
        ...sample(),
        ...(['quarter', 'paused'].includes(name)
          ? {
              paint: [0, 1, 2, 3].map((index) => ({
                ...sample(),
                screenshot: `circular-progress-${name}-paint-${index}.png`,
              })),
            }
          : {}),
        name,
        rootTag: 42,
        arcDashOffset: percent === 25 ? 95.19 : 31.73,
        frame,
        range: [min, max, value],
        metadata: {
          percent,
          paused,
          track,
          customRange,
          min,
          max,
          value,
          fontScale: 1,
          refs: { attached: 1, cleaned: 0 },
          receipts: { progress: { window: frame } },
        },
      };
    }),
  };
}
const output = (report) =>
  'INSTRUMENTATION_RESULT: circularProgressReport=' +
  JSON.stringify(report) +
  '\nINSTRUMENTATION_CODE: -1\n';
test('native progress report requires retained roots, range values and all interaction stages', () => {
  assert.deepEqual(summarizeCircularProgress(output(fixture())), {
    scenario: 'circular-progress-v1',
    status: 'passed',
    states: 6,
    rootTag: 42,
    fontScale: 1,
  });
});
for (const [name, mutate] of [
  [
    'self-consistent but incorrect custom range',
    (r) => {
      r.states[2].range = [0, 100, 75];
      Object.assign(r.states[2].metadata, { min: 0, max: 100, value: 75 });
    },
  ],
  ['missing sample crops', (r) => delete r.states[0].frames],
  ['empty sample crops', (r) => (r.states[0].frames = {})],
  ['an unknown sample crop', (r) => (r.states[0].pixelFrames.unknown = [0, 0, 240, 240])],
  ['a missing paint array', (r) => delete r.states[0].paint],
  ['an empty paint array', (r) => (r.states[0].paint = [])],
  [
    'a stale paint filename',
    (r) => (r.states[0].paint[1].screenshot = 'circular-progress-paused-paint-1.png'),
  ],
  ['missing paint pixel crops', (r) => delete r.states[0].paint[1].pixelFrames],
  ['negative crop dimensions', (r) => (r.states[0].pixelFrames.loading[2] = -240)],
  ['a wrong density crop', (r) => (r.states[0].pixelFrames.loading[2] = 80)],
  ['unexpected paint captures', (r) => (r.states[1].paint = r.states[0].paint)],
  ['an unsettled native arc', (r) => (r.states[1].arcDashOffset = 75)],
  ['a changed native root', (r) => (r.states[2].rootTag = 99)],
  ['a stale accessibility value', (r) => (r.states[2].range[2] = 0)],
  ['a missing screenshot', (r) => r.screenshots.pop()],
  ['a missing state', (r) => r.states.pop()],
  ['a different measured host', (r) => (r.states[1].frame = { width: 40, height: 40 })],
  ['a failed native run', (r) => (r.status = 'failed')],
  ['a mismatched font profile', (r) => (r.device.fontScale = 2)],
  ['a repeated public ref lifecycle', (r) => (r.states[1].metadata.refs.attached = 2)],
])
  test('reject ' + name, () => {
    const report = fixture();
    mutate(report);
    assert.throws(() => summarizeCircularProgress(output(report)));
  });
for (const path of ['../outside', 'cache/mui-other-1', 'cache/mui-circular-progress-1/../outside'])
  test('reject unsafe artifact path ' + path, () => {
    const report = fixture();
    report.artifactDirectory = path;
    assert.throws(() => inspectCircularProgress(output(report)));
  });
test('reject unknown and repeated screenshot names', () => {
  for (const file of ['../../outside.png', 'circular-progress-quarter.png']) {
    const report = fixture();
    report.screenshots.push(file);
    assert.throws(() => inspectCircularProgress(output(report)));
  }
});
