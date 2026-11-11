// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const stages = ['initial', 'updated', 'restored'];
const pictures = stages.map((name) => `avatar-tree-${name}.png`);
const owners = ['native', 'custom', 'portal'];
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function requireEvidence(valid, message) {
  if (!valid) throw Error(`ListItemAvatar accessibility evidence: ${message}`);
}

/** Keep diagnostic extraction available even when the native scenario fails. */
export function inspectAvatarAccessibility(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: avatarAccessibilityReport=([^\r\n]+)\r?$/gm),
  ];
  requireEvidence(matches.length === 1, 'exactly one report');
  const report = JSON.parse(matches[0][1]);
  requireEvidence(
    report?.schemaVersion === 1 &&
      report.scenario === 'list-item-avatar-accessibility-v1' &&
      report.driver === 'native Instrumentation and UiAutomation' &&
      ['passed', 'failed'].includes(report.status) &&
      typeof report.artifactDirectory === 'string' &&
      /^cache\/mui-list-item-avatar-accessibility-\d+$/.test(report.artifactDirectory) &&
      Array.isArray(report.screenshots) &&
      new Set(report.screenshots).size === report.screenshots.length &&
      report.screenshots.every((name) => [...pictures, 'failure.png'].includes(name)),
    'safe artifact paths and schema',
  );
  return report;
}

function rectangle(bounds) {
  return (
    Array.isArray(bounds) &&
    bounds.length === 4 &&
    bounds.every(Number.isSafeInteger) &&
    bounds[0] < bounds[2] &&
    bounds[1] < bounds[3]
  );
}

function leaf(node, role, label, click) {
  requireEvidence(
    node?.role === role &&
      node.label === label &&
      node.visibleToUser === true &&
      node.matches === 1 &&
      (!click ||
        (node.id === 'avatar-contract-child' &&
          node.enabled === true &&
          node.clickAction === true)) &&
      rectangle(node.bounds) &&
      rectangle(node.ownerBounds),
    `actual role, label, bounds and applicable action for ${label}`,
  );
  const [left, top, right, bottom] = node.bounds;
  const [ownerLeft, ownerTop, ownerRight, ownerBottom] = node.ownerBounds;
  const x = (left + right) / 2;
  const y = (top + bottom) / 2;
  requireEvidence(
    x >= ownerLeft && x < ownerRight && y >= ownerTop && y < ownerBottom,
    `native center inside the owner for ${label}`,
  );
}

/** Check distinct visible children and live native wrapper identity through all three states. */
export function summarizeAvatarAccessibility(output) {
  const report = inspectAvatarAccessibility(output);
  const codes = [...output.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\r?$/gm)].map((m) => m[1]);
  requireEvidence(
    equal(codes, ['-1']) &&
      !/^INSTRUMENTATION_(?:FAILED|ABORTED):/m.test(output) &&
      report.status === 'passed',
    report.error ?? 'successful instrumentation',
  );
  requireEvidence(
    Number.isSafeInteger(report.device?.sdk) &&
      report.device.sdk >= 29 &&
      report.device.fontScale === 1,
    'actual normal OS text size',
  );
  requireEvidence(
    report.includesNotImportantViews === false,
    'filtered native tree with the inclusive automation flag cleared',
  );
  requireEvidence(
    equal(report.stages, stages) &&
      equal(report.screenshots, pictures) &&
      Array.isArray(report.states) &&
      report.states.length === stages.length,
    'complete stage and screenshot matrix',
  );
  const initialTags = owners.map((owner) => report.states[0]?.tags?.[owner]);
  requireEvidence(
    initialTags.every((tag) => Number.isSafeInteger(tag) && tag > 0) &&
      new Set(initialTags).size === owners.length,
    'distinct native wrappers',
  );
  for (const [index, state] of report.states.entries()) {
    const updated = index === 1;
    requireEvidence(
      state?.name === stages[index] &&
        state.metadata?.top === updated &&
        state.metadata?.customStyle === updated &&
        state.metadata?.rtl === updated &&
        state.metadata?.fontScale === 1 &&
        state.distinctImages === true &&
        equal(
          owners.map((owner) => state.tags?.[owner]),
          initialTags,
        ),
      'live controls, distinct images and retained wrapper tags',
    );
    leaf(state.inline, 'android.widget.ImageView', 'Account owner', false);
    leaf(state.portal, 'android.widget.ImageView', 'Account owner', false);
    leaf(state.child, 'android.widget.Button', `Avatar child count ${index === 0 ? 0 : 1}`, true);
  }
  return report;
}
