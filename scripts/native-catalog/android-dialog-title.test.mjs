// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectDialogTitleLayout,
  summarizeDialogTitleLayout,
} from './android-dialog-title-report.mjs';

const stages = [
  'standard',
  'modal-automatic',
  'after-cancel',
  'roomy',
  'reading',
  'identified-rtl',
  'modal-explicit',
  'after-save',
  'restored',
];
function evidence(scale = 1) {
  const controls = {
    standard: [false, false, false, false, 0],
    'after-cancel': [false, false, false, false, 0],
    roomy: [true, false, false, false, 0],
    reading: [true, true, false, false, 0],
    'identified-rtl': [true, true, true, true, 0],
    'after-save': [true, true, true, true, 1],
    restored: [false, false, false, false, 1],
  };
  const states = stages.map((name) => {
    if (name.startsWith('modal-'))
      return {
        name,
        titleIdentifier: 'dialog-title-modal-title',
        labeledByIdentifier: 'dialog-title-modal-title',
        sameLabelNode: true,
        heading: true,
        titleBounds: [30, 100, 300, 164],
        paperBounds: [20, 80, 320, 300],
      };
    const [roomy, reading, rtl, explicitId, saved] = controls[name];
    const height = (reading ? 24 : 28) * scale + (roomy ? 48 : 32);
    const frame = { x: 12, y: 200, width: 320, height };
    return {
      name,
      rootTag: 702,
      heading: true,
      frame,
      platformExpectedFontPx: (reading ? 16 : 20) * 2.625 * scale,
      basePaintPx: (reading ? 16 : 20) * 2.625 * scale,
      fontPx: (reading ? 16 : 20) * 2.625 * scale,
      expectedFontPx: (reading ? 16 : 20) * 2.625 * scale,
      backend: 'TextView',
      metadata: {
        roomy,
        reading,
        rtl,
        explicitId,
        saved,
        open: false,
        fontScale: scale,
        refs: { attached: 1, cleaned: 0 },
        receipts: { title: { window: { ...frame } } },
      },
    };
  });
  return {
    schemaVersion: 1,
    scenario: 'dialog-title-layout-v1',
    driver: 'native Instrumentation and UiAutomation',
    status: 'passed',
    artifactDirectory: 'cache/mui-dialog-title-layout-123',
    fontProfile: scale === 1 ? 'normal' : 'enlarged',
    device: { sdk: 37, fontScale: scale },
    stages: [...stages],
    states,
    screenshots: [
      'dialog-title-standard.png',
      'dialog-title-modal-automatic.png',
      'dialog-title-rtl.png',
      'dialog-title-modal-explicit.png',
      'dialog-title-restored.png',
    ],
  };
}
const output = (report, code = '-1') =>
  'INSTRUMENTATION_RESULT: dialogTitleLayoutReport=' +
  JSON.stringify(report) +
  '\nINSTRUMENTATION_CODE: ' +
  code +
  '\n';

test('accepts retained geometry and resolved modal labels at actual normal/enlarged text', () => {
  assert.equal(summarizeDialogTitleLayout(output(evidence())).states, 9);
  assert.equal(
    summarizeDialogTitleLayout(output(evidence(2)), { fontProfile: 'enlarged' }).fontScale,
    2,
  );
});

test('rejects stale frames, dead refs, missing native labels/headings and wrong fonts', () => {
  const changes = [
    (r) => {
      r.states[0].metadata.refs.cleaned = 1;
    },
    (r) => {
      r.states[3].rootTag += 1;
    },
    (r) => {
      r.states[3].frame.height -= 8;
      r.states[3].metadata.receipts.title.window.height -= 8;
    },
    (r) => {
      r.states[4].frame.height = r.states[3].frame.height;
      r.states[4].metadata.receipts.title.window.height = r.states[3].frame.height;
    },
    (r) => {
      r.states[1].sameLabelNode = false;
    },
    (r) => {
      r.states[6].labeledByIdentifier = 'unrelated-title';
    },
    (r) => {
      r.states[1].heading = false;
    },
    (r) => {
      r.states[6].titleBounds[2] = 400;
    },
    (r) => {
      r.states[0].fontPx += 10;
    },
    (r) => {
      r.states[7].metadata.saved = 0;
    },
    (r) => {
      r.states[8].metadata.receipts.title.window.width += 10;
    },
    (r) => {
      r.states[8].metadata.open = true;
    },
  ];
  for (const change of changes) {
    const report = evidence();
    change(report);
    assert.throws(() => summarizeDialogTitleLayout(output(report)), /DialogTitle native evidence/);
  }
});

test('keeps safe failure diagnostics and rejects wrong profiles, codes and paths', () => {
  const failed = evidence();
  failed.status = 'failed';
  failed.screenshots = ['failure.png'];
  failed.error = 'Native label missing';
  assert.equal(inspectDialogTitleLayout(output(failed)).error, failed.error);
  assert.throws(() => summarizeDialogTitleLayout(output(failed)), /Native label missing/);
  assert.throws(() => summarizeDialogTitleLayout(output(evidence(), '0')));
  assert.throws(() => summarizeDialogTitleLayout(output(evidence(2))));
  for (const change of [
    (r) => {
      r.artifactDirectory = 'cache/../../outside';
    },
    (r) => {
      r.screenshots.push('../other.png');
    },
    (r) => {
      r.stages.pop();
    },
  ]) {
    const report = evidence();
    change(report);
    assert.throws(() => summarizeDialogTitleLayout(output(report)));
  }
});
