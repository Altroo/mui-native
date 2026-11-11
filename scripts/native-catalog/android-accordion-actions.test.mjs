// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inspectAccordionActionsLayout,
  summarizeAccordionActionsLayout,
} from './android-accordion-actions-report.mjs';

const stageValues = [
  ['standard', false, false, false, 8, 0],
  ['roomy', false, true, false, 16, 1],
  ['rtl', false, true, true, 16, 1],
  ['no-gap', true, true, true, 0, 1],
  ['restored', false, false, false, 8, 1],
];
const frame = (x) => ({ x, y: 12, width: 104, height: 44 });
function sample(fontProfile = 'normal') {
  const fontScale = fontProfile === 'normal' ? 1 : 2;
  return {
    schemaVersion: 1,
    scenario: 'accordion-actions-layout-v1',
    driver: 'native Instrumentation and UiAutomation',
    artifactDirectory: 'cache/mui-accordion-actions-layout-123',
    fontProfile,
    device: { sdk: 37, fontScale },
    status: 'passed',
    stages: stageValues.map(([name]) => name),
    screenshots: ['accordion-actions-rtl.png', 'accordion-actions-restored.png'],
    states: stageValues.map(([name, disableSpacing, roomy, rtl, gap, count]) => ({
      name,
      metadata: { disableSpacing, roomy, rtl, fontScale, refs: { attached: 1, cleaned: 0 } },
      rootTag: 182,
      physical: {
        mode: rtl ? 'flattened-siblings' : 'descendants',
        parentId: 120,
        keepParentId: rtl ? 120 : 182,
        saveParentId: rtl ? 120 : 182,
        keepAncestors: rtl ? [120] : [182, 120],
        saveAncestors: rtl ? [120] : [182, 120],
      },
      gap,
      row: { x: 0, y: 4, width: 308, height: 60 },
      keep: frame(rtl ? 112 + gap : 8),
      save: frame(rtl ? 8 : 112 + gap),
      saveLabel: `Saved notes ${count}`,
    })),
  };
}
const output = (report, code = -1) =>
  `INSTRUMENTATION_RESULT: accordionActionsLayoutReport=${JSON.stringify(report)}\nINSTRUMENTATION_CODE: ${code}\n`;

test('rejects contradictory native frames, dead ref and stale tap state', () => {
  assert.deepEqual(summarizeAccordionActionsLayout(output(sample())), sample());
  for (const mutate of [
    (report) => (report.states[2].keep.x -= 20),
    (report) => (report.states[3].gap = 8),
    (report) => (report.states[1].save.y += 5),
    (report) => (report.states[4].saveLabel = 'Saved notes 0'),
    (report) => (report.states[4].metadata.refs.cleaned = 1),
    (report) => (report.states[4].rootTag = 200),
    (report) => (report.states[2].physical.keepParentId = 130),
    (report) => (report.states[0].physical.saveAncestors = [120]),
  ]) {
    const report = sample();
    mutate(report);
    assert.throws(() => summarizeAccordionActionsLayout(output(report)), /native layout evidence/);
  }
});
test('extracts safe failed diagnostics but rejects unsafe paths and exit codes', () => {
  const report = { ...sample(), status: 'failed', screenshots: ['failure.png'] };
  assert.deepEqual(inspectAccordionActionsLayout(output(report, 0)), report);
  assert.throws(() => summarizeAccordionActionsLayout(output(report, 0)), /instrumentation/);
  assert.throws(() => summarizeAccordionActionsLayout(output(sample(), 0)), /instrumentation/);
  assert.throws(
    () => inspectAccordionActionsLayout(output({ ...report, screenshots: ['../failure.png'] }, 0)),
    /safe diagnostics/,
  );
});

test('requires the observed OS text profile rather than relabeling a normal run', () => {
  const enlarged = sample('enlarged');
  assert.deepEqual(
    summarizeAccordionActionsLayout(output(enlarged), { fontProfile: 'enlarged' }),
    enlarged,
  );
  assert.throws(
    () => summarizeAccordionActionsLayout(output(sample()), { fontProfile: 'enlarged' }),
    /OS text size/,
  );
  const previousNormal = sample();
  delete previousNormal.fontProfile;
  assert.deepEqual(summarizeAccordionActionsLayout(output(previousNormal)), previousNormal);
  enlarged.states[1].metadata.fontScale = '2';
  assert.throws(
    () => summarizeAccordionActionsLayout(output(enlarged), { fontProfile: 'enlarged' }),
    /committed controls/,
  );
  enlarged.states[1].metadata.fontScale = 2;
  enlarged.device.fontScale = 1;
  assert.throws(
    () => summarizeAccordionActionsLayout(output(enlarged), { fontProfile: 'enlarged' }),
    /OS text size/,
  );
});
