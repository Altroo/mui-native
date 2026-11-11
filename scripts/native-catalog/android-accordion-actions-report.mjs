// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const expected = [
  ['standard', false, false, false, 8, 0],
  ['roomy', false, true, false, 16, 1],
  ['rtl', false, true, true, 16, 1],
  ['no-gap', true, true, true, 0, 1],
  ['restored', false, false, false, 8, 1],
];
const stages = expected.map(([name]) => name);
const pictures = ['accordion-actions-rtl.png', 'accordion-actions-restored.png'];
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function requireEvidence(valid, message) {
  if (!valid) throw Error(`AccordionActions native layout evidence: ${message}`);
}

/** Accept only the scenario's owned diagnostics, including after a native failure. */
export function inspectAccordionActionsLayout(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: accordionActionsLayoutReport=([^\r\n]+)\r?$/gm),
  ];
  requireEvidence(matches.length === 1, 'exactly one report');
  const report = JSON.parse(matches[0][1]);
  requireEvidence(
    report?.schemaVersion === 1 &&
      report.scenario === 'accordion-actions-layout-v1' &&
      report.driver === 'native Instrumentation and UiAutomation' &&
      ['passed', 'failed'].includes(report.status) &&
      typeof report.artifactDirectory === 'string' &&
      /^cache\/mui-accordion-actions-layout-\d+$/.test(report.artifactDirectory) &&
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
  const x = centerX(child);
  const y = centerY(child);
  return (
    x >= parent.x && x < parent.x + parent.width && y >= parent.y && y < parent.y + parent.height
  );
}

/** Confirm the actual retained root, native geometry and real touch result. */
export function summarizeAccordionActionsLayout(output, { fontProfile = 'normal' } = {}) {
  const report = inspectAccordionActionsLayout(output);
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
    'all five stages and both screenshots',
  );
  const tag = report.states[0]?.rootTag;
  requireEvidence(Number.isSafeInteger(tag) && tag > 0, 'actual retained native root tag');
  for (const [index, sample] of report.states.entries()) {
    const [name, disabled, roomy, rtl, gap, count] = expected[index];
    const state = sample?.metadata;
    requireEvidence(
      sample?.name === name &&
        sample.rootTag === tag &&
        state?.disableSpacing === disabled &&
        state.roomy === roomy &&
        state.rtl === rtl &&
        Number.isFinite(state.fontScale) &&
        Math.abs(state.fontScale - fontScale) < 0.01 &&
        state.refs?.attached === 1 &&
        state.refs.cleaned === 0 &&
        sample.saveLabel === `Saved notes ${count}`,
      `committed controls, retained root and touch state in ${name}`,
    );
    const relation = sample.physical;
    const ancestors = [relation?.keepAncestors, relation?.saveAncestors];
    requireEvidence(
      Number.isSafeInteger(relation?.parentId) &&
        ancestors.every(Array.isArray) &&
        (relation.mode === 'descendants'
          ? ancestors.every((path) => path.includes(tag))
          : relation.mode === 'flattened-siblings' &&
            relation.keepParentId === relation.parentId &&
            relation.saveParentId === relation.parentId &&
            ancestors.every((path) => path[0] === relation.parentId && !path.includes(tag))),
      `actual native descendants or immediate flattened siblings in ${name}`,
    );
    const { row, keep, save } = sample;
    requireEvidence(
      [row, keep, save].every(rect) &&
        inside(keep, row) &&
        inside(save, row) &&
        Math.abs(centerY(keep) - centerY(save)) <= 1 &&
        (rtl ? centerX(keep) > centerX(save) : centerX(keep) < centerX(save)),
      `real action order inside one native row in ${name}`,
    );
    const measured = rtl ? keep.x - save.x - save.width : save.x - keep.x - keep.width;
    requireEvidence(
      Number.isFinite(sample.gap) &&
        Math.abs(sample.gap - measured) <= 0.01 &&
        Math.abs(measured - gap) <= 1,
      `actual native gap in ${name}`,
    );
  }
  return report;
}
