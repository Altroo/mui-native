// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const expected = [
  ['standard', false, false, false, 8, 0, 0],
  ['roomy', false, true, false, 16, 1, 0],
  ['rtl', false, true, true, 16, 1, 0],
  ['no-gap', true, true, true, 0, 1, 0],
  ['restored', false, false, false, 8, 1, 0],
  ['sx-grow', false, false, false, 8, 1, 1],
  ['native-grow', false, false, false, 8, 1, 2],
  ['size-restored', false, false, false, 8, 1, 0],
];
const stages = expected.map(([name]) => name);
const pictures = [
  'dialog-actions-rtl.png',
  'dialog-actions-restored.png',
  'dialog-actions-sizing.png',
  'dialog-actions-size-restored.png',
];
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function requireEvidence(valid, message) {
  if (!valid) throw Error(`DialogActions native layout evidence: ${message}`);
}

/** Accept only the scenario's owned diagnostics, including after a native failure. */
export function inspectDialogActionsLayout(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: dialogActionsLayoutReport=([^\r\n]+)\r?$/gm),
  ];
  requireEvidence(matches.length === 1, 'exactly one report');
  const report = JSON.parse(matches[0][1]);
  requireEvidence(
    report?.schemaVersion === 1 &&
      report.scenario === 'dialog-actions-layout-v1' &&
      report.driver === 'native Instrumentation and UiAutomation' &&
      ['passed', 'failed'].includes(report.status) &&
      typeof report.artifactDirectory === 'string' &&
      /^cache\/mui-dialog-actions-layout-\d+$/.test(report.artifactDirectory) &&
      Array.isArray(report.screenshots) &&
      new Set(report.screenshots).size === report.screenshots.length &&
      report.screenshots.every((file) => [...pictures, 'failure.png'].includes(file)),
    'safe diagnostics and schema',
  );
  return report;
}

function rect(value) {
  return (
    value &&
    ['x', 'y', 'width', 'height'].every((axis) => Number.isFinite(value[axis])) &&
    value.width > 0 &&
    value.height > 0
  );
}

const centerX = (frame) => frame.x + frame.width / 2;
const centerY = (frame) => frame.y + frame.height / 2;
function inside(child, parent) {
  // Match the native collector: whole action frames, with DIP rounding tolerance.
  const tolerance = 1.5;
  return (
    child.x >= parent.x - tolerance &&
    child.y >= parent.y - tolerance &&
    child.x + child.width <= parent.x + parent.width + tolerance &&
    child.y + child.height <= parent.y + parent.height + tolerance
  );
}

/** Confirm the actual retained root, native geometry and real touch result. */
export function summarizeDialogActionsLayout(output, { fontProfile = 'normal' } = {}) {
  const report = inspectDialogActionsLayout(output);
  const codes = [...output.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\r?$/gm)].map((m) => m[1]);
  requireEvidence(
    equal(codes, ['-1']) &&
      !/^INSTRUMENTATION_(?:FAILED|ABORTED):/m.test(output) &&
      report.status === 'passed',
    report.error ?? 'successful instrumentation',
  );
  const fontScale = report.device?.fontScale;
  requireEvidence(
    ['normal', 'enlarged'].includes(fontProfile) &&
      (report.fontProfile ?? 'normal') === fontProfile &&
      Number.isInteger(report.device?.sdk) &&
      report.device.sdk >= 29 &&
      Number.isFinite(fontScale) &&
      (fontProfile === 'normal' ? fontScale === 1 : fontScale >= 1.6),
    'actual requested OS text size',
  );
  requireEvidence(
    equal(report.stages, stages) &&
      equal(report.screenshots, pictures) &&
      Array.isArray(report.states) &&
      report.states.length === expected.length,
    'all eight stages and four screenshots',
  );
  const tag = report.states[0]?.rootTag;
  requireEvidence(Number.isSafeInteger(tag) && tag > 0, 'actual retained native root tag');
  for (const [index, sample] of report.states.entries()) {
    const [name, disabled, roomy, rtl, gap, count, mode] = expected[index];
    const state = sample?.metadata;
    requireEvidence(
      sample?.name === name &&
        sample.rootTag === tag &&
        state?.disableSpacing === disabled &&
        state.roomy === roomy &&
        state.rtl === rtl &&
        state.growMode === mode &&
        Number.isFinite(state.fontScale) &&
        Math.abs(state.fontScale - fontScale) < 0.01 &&
        state.refs?.attached === 1 &&
        state.refs.cleaned === 0 &&
        sample.saveLabel === `Saved changes ${count}`,
      `committed controls, retained root and touch state in ${name}`,
    );
    const relation = sample.physical;
    const ancestors = [relation?.cancelAncestors, relation?.saveAncestors];
    requireEvidence(
      Number.isSafeInteger(relation?.parentId) &&
        ancestors.every(Array.isArray) &&
        (relation.mode === 'descendants'
          ? ancestors.every((path) => path.includes(tag))
          : relation.mode === 'flattened-siblings' &&
            relation.cancelParentId === relation.parentId &&
            relation.saveParentId === relation.parentId &&
            ancestors.every((path) => path[0] === relation.parentId && !path.includes(tag))),
      `actual native descendants or immediate flattened siblings in ${name}`,
    );
    const { row, cancel, save } = sample;
    requireEvidence(
      [row, cancel, save].every(rect) &&
        inside(cancel, row) &&
        inside(save, row) &&
        Math.abs(centerY(cancel) - centerY(save)) <= 1 &&
        Math.abs(centerY(cancel) - centerY(row)) <= 1 &&
        (rtl ? centerX(cancel) > centerX(save) : centerX(cancel) < centerX(save)),
      `real action order inside one native row in ${name}`,
    );
    const endInset = rtl ? save.x - row.x : row.x + row.width - save.x - save.width;
    requireEvidence(Math.abs(endInset - 8) <= 1, `actual native end alignment in ${name}`);
    const measured = rtl ? cancel.x - save.x - save.width : save.x - cancel.x - cancel.width;
    requireEvidence(
      Number.isFinite(sample.gap) &&
        Math.abs(sample.gap - measured) <= 0.01 &&
        Math.abs(measured - gap) <= 1,
      `actual native gap in ${name}`,
    );
  }
  const baseline = report.states[4].row.height;
  requireEvidence(
    report.states[5].row.height > baseline + 40 && report.states[6].row.height > baseline + 40,
    'both authored flex paths must grow the actual footer',
  );
  requireEvidence(
    Math.abs(report.states[7].row.height - baseline) <= 1.5,
    'actual footer height must restore',
  );
  return report;
}
