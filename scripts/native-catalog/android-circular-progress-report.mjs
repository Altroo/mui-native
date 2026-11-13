// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const stages = ['quarter', 'three-quarter', 'custom-range', 'no-track', 'paused', 'restored'];
const pictures = stages.flatMap((stage) => [
  'circular-progress-' + stage + '.png',
  ...(['quarter', 'paused'].includes(stage)
    ? [0, 1, 2, 3].map((index) => `circular-progress-${stage}-paint-${index}.png`)
    : []),
]);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function requireEvidence(value, message) {
  if (!value) throw Error('CircularProgress native evidence: ' + message);
}
const kinds = ['determinate', 'fixed', 'loading'];
function crops(value, density) {
  if (
    !value?.frames ||
    !value.pixelFrames ||
    !equal(Object.keys(value.frames).sort(), kinds) ||
    !equal(Object.keys(value.pixelFrames).sort(), kinds)
  )
    return false;
  return kinds.every((kind) => {
    const point = value.frames[kind],
      pixel = value.pixelFrames[kind];
    return (
      point &&
      ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(point[key])) &&
      Math.abs(point.width - 80) <= 1.5 &&
      Math.abs(point.height - 80) <= 1.5 &&
      Array.isArray(pixel) &&
      pixel.length === 4 &&
      pixel.every(Number.isFinite) &&
      pixel[0] >= 0 &&
      pixel[1] >= 0 &&
      Math.abs(pixel[2] - 80 * density) <= 1.5 &&
      Math.abs(pixel[3] - 80 * density) <= 1.5
    );
  });
}
/** Bound exported files to this scenario's owned cache directory and screenshots. */
export function inspectCircularProgress(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: circularProgressReport=([^\r\n]+)\r?$/gm),
  ];
  requireEvidence(matches.length === 1, 'exactly one report');
  const report = JSON.parse(matches[0][1]);
  requireEvidence(
    report?.schemaVersion === 1 &&
      report.scenario === 'circular-progress-v1' &&
      report.driver === 'native Instrumentation and UiAutomation' &&
      ['passed', 'failed'].includes(report.status) &&
      /^cache\/mui-circular-progress-\d+$/.test(report.artifactDirectory) &&
      Array.isArray(report.screenshots) &&
      new Set(report.screenshots).size === report.screenshots.length &&
      report.screenshots.every((file) => [...pictures, 'failure.png'].includes(file)),
    'safe schema and owned screenshots',
  );
  return report;
}
/** Verify actual native sizes, retained public refs and AccessibilityNodeInfo ranges. */
export function summarizeCircularProgress(output, { fontProfile = 'normal' } = {}) {
  const report = inspectCircularProgress(output);
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
      Number.isFinite(report.device?.density) &&
      report.device.density > 0 &&
      Number.isFinite(scale) &&
      (fontProfile === 'normal' ? scale === 1 : scale >= 1.6),
    'requested native OS font profile',
  );
  requireEvidence(
    equal(report.stages, stages) &&
      equal(report.screenshots, pictures) &&
      Array.isArray(report.states) &&
      equal(
        report.states.map((state) => state.name),
        stages,
      ),
    'all ordered states and screenshots',
  );
  const expected = [
    [25, false, true, false],
    [75, false, true, false],
    [75, false, true, true],
    [75, false, false, true],
    [75, true, false, true],
    [25, false, true, false],
  ];
  const root = report.states[0]?.rootTag;
  requireEvidence(Number.isSafeInteger(root) && root > 0, 'native root tag');
  for (const [index, state] of report.states.entries()) {
    const meta = state.metadata,
      measured = meta?.receipts?.progress?.window;
    requireEvidence(
      state.rootTag === root &&
        meta?.refs?.attached === 1 &&
        meta.refs.cleaned === 0 &&
        equal([meta.percent, meta.paused, meta.track, meta.customRange], expected[index]) &&
        Math.abs(meta.fontScale - scale) < 0.01,
      'committed state and retained root at ' + state.name,
    );
    requireEvidence(
      state.frame &&
        measured &&
        ['width', 'height'].every(
          (key) =>
            Number.isFinite(state.frame[key]) &&
            Math.abs(state.frame[key] - 64) <= 1.5 &&
            Math.abs(state.frame[key] - measured[key]) <= 1.5,
        ),
      'same-host measured geometry at ' + state.name,
    );
    const knownRange = expected[index][3] ? [20, 80, 65] : [0, 100, expected[index][0]];
    requireEvidence(
      equal([meta.min, meta.max, meta.value], knownRange) && equal(state.range, knownRange),
      'independently expected accessibility range at ' + state.name,
    );
    const expectedOffset = expected[index][0] === 25 ? 95.19 : 31.73;
    requireEvidence(
      Number.isFinite(state.arcDashOffset) && Math.abs(state.arcDashOffset - expectedOffset) < 0.02,
      'settled actual native arc offset at ' + state.name,
    );
    requireEvidence(
      crops(state, report.device.density),
      'complete current sample crops at ' + state.name,
    );
    if (['quarter', 'paused'].includes(state.name)) {
      requireEvidence(
        Array.isArray(state.paint) &&
          state.paint.length === 4 &&
          state.paint.every(
            (paint, index) =>
              paint.screenshot === `circular-progress-${state.name}-paint-${index}.png` &&
              crops(paint, report.device.density),
          ),
        'four complete named native paint observations at ' + state.name,
      );
    } else
      requireEvidence(state.paint === undefined, 'unexpected paint observations at ' + state.name);
  }
  return {
    scenario: report.scenario,
    status: report.status,
    states: report.states.length,
    rootTag: root,
    fontScale: scale,
  };
}
