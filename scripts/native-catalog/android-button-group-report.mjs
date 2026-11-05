// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
export const buttonGroupStages = [
  'scene-ready',
  'horizontal-layout',
  'wrapped-action',
  'vertical-layout',
  'disabled-pointer',
  'loading-cycle',
  'dynamic-children',
  'theme-live',
  'theme-focus',
  'nested-live',
  'portal-window',
  'portal-inside',
  'portal-sibling',
  'portal-closed',
];
export const buttonGroupPictures = [
  'horizontal.png',
  'vertical.png',
  'compact.png',
  'themed-focus.png',
  'nested.png',
  'portal-window.png',
  'portal-inside.png',
  'portal-sibling.png',
];
/** Accept safe diagnostic locations even when the native assertion failed. */
export function inspectButtonGroupReport(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: buttonGroupReport=([^\r\n]+)\r?$/gm),
  ];
  if (matches.length !== 1) throw Error('No unambiguous ButtonGroup instrumentation report');
  const report = JSON.parse(matches[0][1]);
  if (
    report?.schemaVersion !== 2 ||
    report.scenario !== 'button-group-v2' ||
    report.driver !== 'native Instrumentation and UiAutomation' ||
    typeof report.artifactDirectory !== 'string' ||
    !/^cache\/mui-button-group-\d+$/.test(report.artifactDirectory) ||
    !Number.isInteger(report.device?.sdk) ||
    report.device.sdk < 29 ||
    typeof report.device?.model !== 'string' ||
    !report.device.model ||
    !Array.isArray(report.screenshots) ||
    new Set(report.screenshots).size !== report.screenshots.length ||
    !report.screenshots.every((file) => [...buttonGroupPictures, 'failure.png'].includes(file))
  )
    throw Error('Unsafe or incomplete ButtonGroup metadata');
  return report;
}
/** Check real native bounds, full-width endpoints, touch heights and adjacency. */
export function summarizeButtonGroup(output) {
  if (
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length !== 1 ||
    !/^INSTRUMENTATION_CODE: -1\r?$/m.test(output) ||
    /^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output)
  )
    throw Error('Missing or failed ButtonGroup instrumentation');
  const report = inspectButtonGroupReport(output);
  if (
    report.status !== 'passed' ||
    report.error != null ||
    JSON.stringify(report.stages) !== JSON.stringify(buttonGroupStages) ||
    JSON.stringify(report.screenshots) !== JSON.stringify(buttonGroupPictures) ||
    !Array.isArray(report.samples) ||
    report.samples.length !== 14
  )
    throw Error('Incomplete native ButtonGroup evidence');
  let offset = 0;
  for (const phase of ['horizontal', 'vertical', 'compact']) {
    const ids = [
      'document-content',
      'document-actions',
      'group-save',
      ...(phase === 'compact' ? [] : ['group-preview']),
      'group-send',
    ];
    const samples = report.samples.slice(offset, offset + ids.length);
    for (const [index, sample] of samples.entries()) {
      if (
        sample?.name !== phase + ':' + ids[index] ||
        !['x', 'y', 'width', 'height'].every((key) => Number.isFinite(sample[key])) ||
        sample.width <= 0 ||
        sample.height < 43.5
      )
        throw Error('Invalid native group bounds');
    }
    const [container, root, ...children] = samples;
    if (Math.abs(root.x - container.x) > 1.5 || Math.abs(root.width - container.width) > 1.5)
      throw Error('Full-width group must fill its actual parent');
    for (const [index, child] of children.entries()) {
      const vertical = phase === 'vertical';
      if (
        Math.abs(
          child.x -
            (vertical
              ? root.x
              : index === 0
                ? root.x
                : children[index - 1].x + children[index - 1].width - 1),
        ) > 1.5 ||
        Math.abs(
          child.y -
            (vertical && index > 0
              ? children[index - 1].y + children[index - 1].height - 1
              : root.y),
        ) > 1.5 ||
        (vertical && Math.abs(child.width - root.width) > 1.5)
      )
        throw Error('Inconsistent native grouped adjacency');
    }
    const last = children.at(-1);
    if (
      Math.abs(last.x + last.width - root.x - root.width) > 1.5 ||
      Math.abs(last.y + last.height - root.y - root.height) > 1.5
    )
      throw Error('Group endpoints must fill their measured root');
    offset += ids.length;
  }
  const closure = report.closure;
  if (
    !closure ||
    closure.nativeFocus !== true ||
    !Number.isFinite(closure.nestedCompact) ||
    !Number.isFinite(closure.nestedExpanded) ||
    Math.abs(closure.nestedCompact - 180) > 1.5 ||
    Math.abs(closure.nestedExpanded - 220) > 1.5 ||
    !Array.isArray(closure.portals) ||
    closure.portals.length !== 5
  )
    throw Error('Missing native closure focus/nested evidence');
  const expected = [
    ['window', 64, 16, false, false, 0],
    ['inside', 96, 18, true, false, 0],
    ['inside-updated', 108, 20, true, false, 1],
    ['sibling', 128, 22, false, true, 0],
    ['sibling-updated', 140, 24, false, true, 1],
  ];
  for (const [index, [phase, width, fontSize, inside, sibling, count]] of expected.entries()) {
    const sample = closure.portals[index];
    if (
      !sample ||
      sample.phase !== phase ||
      !Number.isFinite(sample.width) ||
      Math.abs(sample.width - width) > 1.5 ||
      !Number.isFinite(sample.fontSize) ||
      Math.abs(sample.fontSize - fontSize) > 0.5 ||
      sample.inside !== inside ||
      sample.sibling !== sibling ||
      sample.count !== count ||
      sample.context !== 'Defaults text/inherit/large · last' ||
      !Number.isInteger(sample.color) ||
      sample.color < 0 ||
      sample.color > 0xffffffff
    )
      throw Error('Invalid native Portal style/ownership evidence');
  }
  const colors = [0xff0d070b, 0xff9c27b0, 0xffbe185d, 0xff1565c0, 0xff0369a1];
  for (const [index, sample] of closure.portals.entries())
    if (sample.color !== colors[index])
      throw Error('Native text paint must follow the physical destination');
  return report;
}
