// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const stages = ['quarter', 'three-quarter', 'custom-range', 'rtl', 'dark', 'paused', 'restored'];
const kinds = ['buffer', 'determinate', 'indeterminate', 'query'];
const pictures = stages.flatMap((stage) => [
  'linear-progress-' + stage + '.png',
  ...(['quarter', 'paused'].includes(stage)
    ? [0, 1, 2, 3].map((i) => `linear-progress-${stage}-paint-${i}.png`)
    : []),
]);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function requireEvidence(value, message) {
  if (!value) throw Error('LinearProgress native evidence: ' + message);
}
/** Bound artifact extraction to one owned cache directory and known filenames. */
export function inspectLinearProgress(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: linearProgressReport=([^\r\n]+)\r?$/gm),
  ];
  requireEvidence(matches.length === 1, 'exactly one report');
  const report = JSON.parse(matches[0][1]);
  requireEvidence(
    report?.schemaVersion === 1 &&
      report.scenario === 'linear-progress-v1' &&
      report.driver === 'native Instrumentation and UiAutomation' &&
      ['passed', 'failed'].includes(report.status) &&
      /^cache\/mui-linear-progress-\d+$/.test(report.artifactDirectory) &&
      Array.isArray(report.screenshots) &&
      new Set(report.screenshots).size === report.screenshots.length &&
      report.screenshots.every((file) => [...pictures, 'failure.png'].includes(file)),
    'safe schema and owned screenshots',
  );
  return report;
}
function crops(value, density) {
  requireEvidence(
    value?.frames &&
      value.pixelFrames &&
      equal(Object.keys(value.frames).sort(), kinds) &&
      equal(Object.keys(value.pixelFrames).sort(), kinds),
    'all four actual variant crops',
  );
  for (const kind of kinds) {
    const f = value.frames[kind],
      p = value.pixelFrames[kind];
    requireEvidence(
      f &&
        ['x', 'y', 'width', 'height'].every((k) => Number.isFinite(f[k])) &&
        f.x >= 0 &&
        f.y >= 0 &&
        f.width > 200 &&
        Math.abs(f.height - 24) <= 1.5 &&
        Array.isArray(p) &&
        p.length === 4 &&
        p.every(Number.isFinite) &&
        p[0] >= 0 &&
        p[1] >= 0 &&
        Math.abs(p[2] - f.width * density) <= 1.5 &&
        Math.abs(p[3] - f.height * density) <= 1.5,
      'native crop geometry and pixel density',
    );
  }
}
function bufferCanvas(tree, density, width) {
  const named = (node, name, depth = 0) => {
    if (!node || depth > 4) return undefined;
    if (node.class === name) return node;
    return node.children?.map((child) => named(child, name, depth + 1)).find(Boolean);
  };
  const layer = tree?.children?.[0],
    svg = named(layer, 'SvgView'),
    rect = named(layer, 'RectView');
  const valid = (node) =>
    node &&
    Number.isFinite(node.width) &&
    node.width > 0 &&
    Number.isFinite(node.height) &&
    node.height > 0 &&
    Number.isFinite(node.alpha) &&
    node.alpha >= 0 &&
    node.alpha <= 1 &&
    Number.isFinite(node.translationX) &&
    node.visible === true;
  requireEvidence(
    [tree, layer, svg, rect].every(valid),
    'complete actual native buffer drawing inputs',
  );
  requireEvidence(
    Math.abs(tree.width - width * density) <= 1.5 &&
      Math.abs(tree.height - 4 * density) <= 1.5 &&
      Math.abs(layer.width - (width + 200) * density) <= 1.5 &&
      Math.abs(layer.height - tree.height) <= 1.5,
    'native buffer host geometry',
  );
  requireEvidence(
    Math.abs(svg.width - layer.width) <= 1 &&
      Math.abs(svg.height - layer.height) <= 1 &&
      Math.abs(rect.width - svg.width) <= 1 &&
      Math.abs(rect.height - svg.height) <= 1,
    'native SVG rectangle follows the resized canvas',
  );
  return layer;
}
/** Require real native transforms and ranges; accepting a receipt alone cannot certify paint. */
export function summarizeLinearProgress(output, { fontProfile = 'normal' } = {}) {
  const report = inspectLinearProgress(output);
  requireEvidence(
    equal(
      [...output.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\r?$/gm)].map((m) => m[1]),
      ['-1'],
    ) &&
      !/^INSTRUMENTATION_(?:FAILED|ABORTED):/m.test(output) &&
      report.status === 'passed',
    report.error ?? 'successful instrumentation',
  );
  const scale = report.device?.fontScale,
    density = report.device?.density;
  requireEvidence(
    ['normal', 'enlarged'].includes(fontProfile) &&
      report.fontProfile === fontProfile &&
      Number.isInteger(report.device?.sdk) &&
      report.device.sdk >= 29 &&
      Number.isFinite(density) &&
      density > 0 &&
      Number.isFinite(scale) &&
      (fontProfile === 'normal' ? scale === 1 : scale >= 1.6),
    'requested actual OS text size',
  );
  requireEvidence(
    equal(report.stages, stages) &&
      equal(report.screenshots, pictures) &&
      Array.isArray(report.states) &&
      equal(
        report.states.map((s) => s.name),
        stages,
      ),
    'ordered stages, captures and states',
  );
  for (const [index, state] of report.states.entries()) {
    const percent = index === 0 || index === 6 ? 25 : 75,
      customRange = index >= 2 && index <= 5,
      rtl = index >= 3 && index <= 5,
      dark = index >= 4 && index <= 5,
      paused = index === 5;
    const min = customRange ? 20 : 0,
      max = customRange ? 80 : 100,
      now = customRange ? 65 : percent,
      buffer = customRange ? 71 : 85;
    const meta = state.metadata,
      f = state.frame;
    requireEvidence(
      meta &&
        meta.percent === percent &&
        meta.customRange === customRange &&
        meta.rtl === rtl &&
        meta.dark === dark &&
        meta.paused === paused &&
        meta.min === min &&
        meta.max === max &&
        meta.value === now &&
        meta.valueBuffer === buffer &&
        meta.refs?.attached === 1 &&
        meta.refs?.cleaned === 0 &&
        Math.abs(meta.fontScale - scale) < 0.01,
      'known control state and retained native ref',
    );
    requireEvidence(
      Number.isInteger(state.rootTag) &&
        state.rootTag > 0 &&
        state.rootTag === report.states[0].rootTag &&
        f &&
        ['x', 'y', 'width', 'height'].every((k) => Number.isFinite(f[k])) &&
        f.width > 200 &&
        Math.abs(f.height - 4) <= 1.5,
      'stable native progress track',
    );
    const measured = meta.receipts?.progress?.window;
    requireEvidence(
      measured &&
        Math.abs(measured.width - f.width) <= 1.5 &&
        Math.abs(measured.height - f.height) <= 1.5,
      'public ref identifies the actual track',
    );
    requireEvidence(
      equal(state.range, [min, max, now]) &&
        Number.isFinite(state.translation) &&
        Math.abs(state.translation - (percent / 100 - 1) * f.width * (rtl ? -1 : 1)) < 0.5,
      'actual native accessibility and settled bar translation',
    );
    crops(state, density);
    bufferCanvas(state.bufferNative, density, f.width);
    if (index === 0 || index === 5) {
      requireEvidence(
        Array.isArray(state.paint) && state.paint.length === 4,
        'four current motion frames',
      );
      for (const [i, paint] of state.paint.entries()) {
        requireEvidence(
          paint.screenshot === `linear-progress-${state.name}-paint-${i}.png`,
          'ordered motion screenshots',
        );
        crops(paint, density);
        const layer = bufferCanvas(paint.bufferNative, density, f.width);
        if (paused)
          requireEvidence(
            Math.abs(layer.alpha - 1) < 0.01 && Math.abs(layer.translationX) < 0.01,
            'paused native buffer drawing inputs',
          );
      }
    } else requireEvidence(state.paint === undefined, 'no unexpected paint records');
  }
  return {
    status: 'passed',
    fontProfile,
    states: report.states.length,
    screenshots: report.screenshots.length,
    note: 'Native interaction, geometry and accessibility ranges passed. Review actual PNG paint separately.',
  };
}
