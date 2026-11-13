// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
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
const pictures = [
  'dialog-title-standard.png',
  'dialog-title-modal-automatic.png',
  'dialog-title-rtl.png',
  'dialog-title-modal-explicit.png',
  'dialog-title-restored.png',
];
const expected = [
  ['standard', false, false, false, false, 0],
  ['after-cancel', false, false, false, false, 0],
  ['roomy', true, false, false, false, 0],
  ['reading', true, true, false, false, 0],
  ['identified-rtl', true, true, true, true, 0],
  ['after-save', true, true, true, true, 1],
  ['restored', false, false, false, false, 1],
];
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function requireEvidence(value, message) {
  if (!value) throw Error('DialogTitle native evidence: ' + message);
}
function frame(value) {
  return (
    value &&
    ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(value[key])) &&
    value.width > 0 &&
    value.height > 0
  );
}
function rect(value) {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every(Number.isFinite) &&
    value[2] > value[0] &&
    value[3] > value[1]
  );
}

/** Preserve only this scenario's bounded, owned diagnostic artifacts. */
export function inspectDialogTitleLayout(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: dialogTitleLayoutReport=([^\r\n]+)\r?$/gm),
  ];
  requireEvidence(matches.length === 1, 'exactly one report');
  const report = JSON.parse(matches[0][1]);
  requireEvidence(
    report?.schemaVersion === 1 &&
      report.scenario === 'dialog-title-layout-v1' &&
      report.driver === 'native Instrumentation and UiAutomation' &&
      ['passed', 'failed'].includes(report.status) &&
      typeof report.artifactDirectory === 'string' &&
      /^cache\/mui-dialog-title-layout-\d+$/.test(report.artifactDirectory) &&
      Array.isArray(report.screenshots) &&
      new Set(report.screenshots).size === report.screenshots.length &&
      report.screenshots.every((file) => [...pictures, 'failure.png'].includes(file)),
    'safe schema and owned screenshots',
  );
  return report;
}

/** Require measured native text, retained refs, actual modal labels and real taps. */
export function summarizeDialogTitleLayout(output, { fontProfile = 'normal' } = {}) {
  const report = inspectDialogTitleLayout(output);
  requireEvidence(
    equal(
      [...output.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\r?$/gm)].map((m) => m[1]),
      ['-1'],
    ) &&
      !/^INSTRUMENTATION_(?:FAILED|ABORTED):/m.test(output) &&
      report.status === 'passed',
    report.error ?? 'successful instrumentation',
  );
  const scale = report.device?.fontScale;
  requireEvidence(
    ['normal', 'enlarged'].includes(fontProfile) &&
      report.fontProfile === fontProfile &&
      Number.isInteger(report.device?.sdk) &&
      report.device.sdk >= 29 &&
      Number.isFinite(scale) &&
      (fontProfile === 'normal' ? scale === 1 : scale >= 1.6),
    'actual requested native font profile',
  );
  requireEvidence(
    equal(report.stages, stages) &&
      equal(report.screenshots, pictures) &&
      Array.isArray(report.states) &&
      equal(
        report.states.map((value) => value.name),
        stages,
      ),
    'complete ordered native states and screenshots',
  );
  const roots = report.states.filter((value) => value.metadata);
  requireEvidence(
    roots.length === expected.length &&
      Number.isSafeInteger(roots[0]?.rootTag) &&
      roots[0].rootTag > 0,
    'seven real retained Text states',
  );
  for (const [index, value] of roots.entries()) {
    const [name, roomy, reading, rtl, explicitId, saved] = expected[index];
    const meta = value.metadata;
    requireEvidence(
      value.name === name &&
        value.rootTag === roots[0].rootTag &&
        value.heading === true &&
        equal(
          [meta.roomy, meta.reading, meta.rtl, meta.explicitId, meta.saved],
          [roomy, reading, rtl, explicitId, saved],
        ) &&
        meta.open === false &&
        meta.refs?.attached === 1 &&
        meta.refs?.cleaned === 0 &&
        Math.abs(meta.fontScale - scale) < 0.01,
      'retained native Text and committed controls at ' + name,
    );
    const measured = meta.receipts?.title?.window;
    requireEvidence(
      frame(value.frame) &&
        frame(measured) &&
        Math.abs(value.frame.width - measured.width) <= 1.5 &&
        Math.abs(value.frame.height - measured.height) <= 1.5,
      'same-host public Text ref measurements at ' + name,
    );
    requireEvidence(
      Number.isFinite(value.platformExpectedFontPx) &&
        value.platformExpectedFontPx > 0 &&
        Number.isFinite(value.basePaintPx) &&
        value.basePaintPx > 0 &&
        Number.isFinite(value.fontPx) &&
        value.fontPx > 0 &&
        Number.isFinite(value.expectedFontPx) &&
        value.expectedFontPx > 0 &&
        Math.abs(value.fontPx - value.expectedFontPx) <= 1.5 &&
        typeof value.backend === 'string' &&
        value.backend.length > 0,
      'actual native typography at ' + name,
    );
  }
  const height = (name) => roots.find((value) => value.name === name).frame.height;
  requireEvidence(
    Math.abs(height('roomy') - height('standard') - 16) <= 1.5 &&
      height('reading') < height('roomy') - 2 &&
      height('identified-rtl') < height('roomy') - 2 &&
      height('after-save') < height('roomy') - 2 &&
      Math.abs(height('after-cancel') - height('standard')) <= 1.5 &&
      Math.abs(height('restored') - height('standard')) <= 1.5,
    'settled padding, typography and restored geometry',
  );
  for (const name of ['modal-automatic', 'modal-explicit']) {
    const value = report.states.find((state) => state.name === name);
    requireEvidence(
      value.titleIdentifier === 'dialog-title-modal-title' &&
        value.labeledByIdentifier === value.titleIdentifier &&
        value.sameLabelNode === true &&
        value.heading === true &&
        rect(value.titleBounds) &&
        rect(value.paperBounds) &&
        value.titleBounds[0] >= value.paperBounds[0] &&
        value.titleBounds[1] >= value.paperBounds[1] &&
        value.titleBounds[2] <= value.paperBounds[2] &&
        value.titleBounds[3] <= value.paperBounds[3],
      'resolved native title label and containment at ' + name,
    );
  }
  return {
    scenario: report.scenario,
    status: report.status,
    states: report.states.length,
    rootTag: roots[0].rootTag,
    fontScale: scale,
  };
}
