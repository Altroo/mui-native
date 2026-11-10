// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const groups = ['inherited', 'own-false', 'custom', 'styled'];
const stages = ['initial', 'updated', 'restored'];
const pictures = stages.map((name) => `group-tree-${name}.png`);
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const requireEvidence = (valid, message) => {
  if (!valid) throw Error(`FormGroup accessibility evidence: ${message}`);
};
const rectangle = (bounds) =>
  Array.isArray(bounds) &&
  bounds.length === 4 &&
  bounds.every(Number.isSafeInteger) &&
  bounds[2] > bounds[0] &&
  bounds[3] > bounds[1];

/** Safely route artifacts even when a native assertion failed. */
export function inspectFormGroupAccessibility(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: formGroupAccessibilityReport=([^\r\n]+)\r?$/gm),
  ];
  requireEvidence(matches.length === 1, 'exactly one report');
  const report = JSON.parse(matches[0][1]);
  requireEvidence(
    report?.schemaVersion === 1 &&
      report.scenario === 'form-group-accessibility-v1' &&
      report.driver === 'native Instrumentation and UiAutomation' &&
      ['passed', 'failed'].includes(report.status) &&
      typeof report.artifactDirectory === 'string' &&
      /^cache\/mui-form-group-accessibility-\d+$/.test(report.artifactDirectory) &&
      Array.isArray(report.screenshots) &&
      new Set(report.screenshots).size === report.screenshots.length &&
      report.screenshots.every((name) => [...pictures, 'failure.png'].includes(name)),
    'safe diagnostic paths and schema',
  );
  return report;
}

function leaf(node, id, role, label, clickAction) {
  requireEvidence(
    node?.id === id &&
      node.role === role &&
      node.label === label &&
      node.matches === 1 &&
      node.visibleToUser === true &&
      node.enabled === true &&
      node.clickAction === clickAction &&
      rectangle(node.bounds) &&
      rectangle(node.groupBounds),
    `actual role, label, visibility and actions for ${id}`,
  );
  const [l, t, r, b] = node.bounds,
    [gl, gt, gr, gb] = node.groupBounds;
  const x = (l + r) / 2,
    y = (t + b) / 2;
  requireEvidence(x >= gl && x < gr && y >= gt && y < gb, `native center inside group for ${id}`);
}

/** Validate the actual tree leaves and retained native roots across all three states. */
export function summarizeFormGroupAccessibility(output) {
  const report = inspectFormGroupAccessibility(output);
  const codes = [...output.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\r?$/gm)].map((m) => m[1]);
  requireEvidence(
    equal(codes, ['-1']) &&
      !/^INSTRUMENTATION_(?:FAILED|ABORTED):/m.test(output) &&
      report.status === 'passed',
    report.error ?? 'successful instrumentation',
  );
  requireEvidence(
    Number.isInteger(report.device?.sdk) &&
      report.device.sdk >= 29 &&
      report.device.fontScale === 1,
    'actual normal OS text size',
  );
  requireEvidence(
    equal(report.stages, stages) &&
      equal(report.screenshots, pictures) &&
      Array.isArray(report.states) &&
      report.states.length === stages.length,
    'complete stage and screenshot matrix',
  );
  const tags = new Map();
  for (const [index, state] of report.states.entries()) {
    requireEvidence(
      state?.name === stages[index] &&
        state.updated === (index === 1) &&
        Array.isArray(state.groups) &&
        state.groups.length === groups.length,
      'live catalog stage',
    );
    for (const [groupIndex, row] of state.groups.entries()) {
      const group = groups[groupIndex];
      requireEvidence(
        row?.group === group &&
          Number.isSafeInteger(row.rootTag) &&
          row.rootTag > 0 &&
          row.refs?.attached === 1 &&
          row.refs.cleaned === 0,
        'one retained native group root',
      );
      if (index === 0) tags.set(group, row.rootTag);
      else requireEvidence(tags.get(group) === row.rootTag, `stable native root for ${group}`);
      leaf(
        row.button,
        `form-group-contract-child-${group}`,
        'android.widget.Button',
        `Choice ${index === 0 ? 0 : 1}`,
        true,
      );
      leaf(
        row.text,
        `form-group-contract-text-${group}`,
        'android.widget.TextView',
        'Inherited text',
        false,
      );
    }
  }
  requireEvidence(new Set(tags.values()).size === groups.length, 'distinct native group roots');
  return report;
}
