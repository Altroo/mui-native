// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inspectDialogActionsLayout,
  summarizeDialogActionsLayout,
} from './android-dialog-actions-report.mjs';

const stageValues = [
  ['standard', false, false, false, 8, 0, 0],
  ['roomy', false, true, false, 16, 1, 0],
  ['rtl', false, true, true, 16, 1, 0],
  ['no-gap', true, true, true, 0, 1, 0],
  ['restored', false, false, false, 8, 1, 0],
  ['sx-grow', false, false, false, 8, 1, 1],
  ['native-grow', false, false, false, 8, 1, 2],
  ['size-restored', false, false, false, 8, 1, 0],
];
const frame = (x, mode) => ({ x, y: mode ? 52 : 12, width: 104, height: 44 });
function sample(fontProfile = 'normal') {
  const fontScale = fontProfile === 'normal' ? 1 : 2;
  return {
    schemaVersion: 1,
    scenario: 'dialog-actions-layout-v1',
    driver: 'native Instrumentation and UiAutomation',
    artifactDirectory: 'cache/mui-dialog-actions-layout-123',
    fontProfile,
    device: { sdk: 37, fontScale },
    status: 'passed',
    stages: stageValues.map(([name]) => name),
    screenshots: [
      'dialog-actions-rtl.png',
      'dialog-actions-restored.png',
      'dialog-actions-sizing.png',
      'dialog-actions-size-restored.png',
    ],
    states: stageValues.map(([name, disableSpacing, roomy, rtl, gap, count, growMode]) => ({
      name,
      metadata: {
        disableSpacing,
        roomy,
        rtl,
        growMode,
        fontScale,
        refs: { attached: 1, cleaned: 0 },
      },
      rootTag: 182,
      physical: {
        mode: rtl ? 'flattened-siblings' : 'descendants',
        parentId: 120,
        cancelParentId: rtl ? 120 : 182,
        saveParentId: rtl ? 120 : 182,
        cancelAncestors: rtl ? [120] : [182, 120],
        saveAncestors: rtl ? [120] : [182, 120],
      },
      gap,
      row: { x: 0, y: 4, width: 308, height: growMode ? 140 : 60 },
      cancel: frame(rtl ? 112 + gap : 92 - gap, growMode),
      save: frame(rtl ? 8 : 196, growMode),
      saveLabel: `Saved changes ${count}`,
    })),
  };
}
const output = (report, code = -1) =>
  `INSTRUMENTATION_RESULT: dialogActionsLayoutReport=${JSON.stringify(report)}\nINSTRUMENTATION_CODE: ${code}\n`;

test('rejects contradictory native frames, dead ref and stale tap state', () => {
  assert.deepEqual(summarizeDialogActionsLayout(output(sample())), sample());
  for (const mutate of [
    (report) => (report.states[2].cancel.x -= 20),
    (report) => (report.states[0].row.x -= 4),
    (report) => (report.states[3].gap = 8),
    (report) => (report.states[0].save.width = 300),
    (report) => (report.states[5].row.height = 60),
    (report) => {
      report.states[5].cancel.y = 12;
      report.states[5].save.y = 12;
    },
    (report) => (report.states[6].row.height = 60),
    (report) => (report.states[7].row.height = 90),
    (report) => (report.states[5].metadata.growMode = 0),
    (report) => (report.states[1].save.y += 5),
    (report) => (report.states[4].saveLabel = 'Saved changes 0'),
    (report) => (report.states[4].metadata.refs.cleaned = 1),
    (report) => (report.states[4].rootTag = 200),
    (report) => (report.states[2].physical.cancelParentId = 130),
    (report) => (report.states[0].physical.saveAncestors = [120]),
  ]) {
    const report = sample();
    mutate(report);
    assert.throws(() => summarizeDialogActionsLayout(output(report)), /native layout evidence/);
  }
});
test('extracts safe failed diagnostics but rejects unsafe paths and exit codes', () => {
  const report = { ...sample(), status: 'failed', screenshots: ['failure.png'] };
  assert.deepEqual(inspectDialogActionsLayout(output(report, 0)), report);
  assert.throws(() => summarizeDialogActionsLayout(output(report, 0)), /instrumentation/);
  assert.throws(() => summarizeDialogActionsLayout(output(sample(), 0)), /instrumentation/);
  assert.throws(
    () => inspectDialogActionsLayout(output({ ...report, screenshots: ['../failure.png'] }, 0)),
    /safe diagnostics/,
  );
});

test('requires the observed OS text profile rather than relabeling a normal run', () => {
  const enlarged = sample('enlarged');
  assert.deepEqual(
    summarizeDialogActionsLayout(output(enlarged), { fontProfile: 'enlarged' }),
    enlarged,
  );
  assert.throws(
    () => summarizeDialogActionsLayout(output(sample()), { fontProfile: 'enlarged' }),
    /OS text size/,
  );
  const previousNormal = sample();
  delete previousNormal.fontProfile;
  assert.deepEqual(summarizeDialogActionsLayout(output(previousNormal)), previousNormal);
  enlarged.states[1].metadata.fontScale = '2';
  assert.throws(
    () => summarizeDialogActionsLayout(output(enlarged), { fontProfile: 'enlarged' }),
    /committed controls/,
  );
  enlarged.states[1].metadata.fontScale = 2;
  enlarged.device.fontScale = 1;
  assert.throws(
    () => summarizeDialogActionsLayout(output(enlarged), { fontProfile: 'enlarged' }),
    /OS text size/,
  );
});
