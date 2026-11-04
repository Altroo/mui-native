// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
export const svgIconStages = [
  'scene-ready',
  'native-sizes',
  'inherited-paint',
  'native-click',
  'palette-update',
  'native-ref',
  'native-font',
];
export const svgIconPictures = ['initial.png', 'error.png', 'fonts.png'];
const geometry = [
  ['svg-size-small', 20, 20],
  ['svg-size-medium', 24, 24],
  ['svg-size-large', 35, 35],
  ['svg-paint-probe', 48, 48],
];
const paints = [
  ['svg-group-probe-paint', 'ff2e7d32'],
  ['svg-paint-probe-paint', 'ff0274d7'],
  ['svg-paint-probe-paint', 'ffd32f2f'],
];
/** Failure artifacts are collectible only from a safe, scenario-owned cache directory. */
export function inspectSvgIconReport(output) {
  const matches = [...output.matchAll(/^INSTRUMENTATION_RESULT: svgIconReport=([^\r\n]+)\r?$/gm)];
  if (matches.length !== 1) throw Error('No unambiguous SvgIcon instrumentation report');
  const report = JSON.parse(matches[0][1]);
  if (
    report?.schemaVersion !== 1 ||
    report.scenario !== 'svg-icon-v1' ||
    report.driver !== 'native Instrumentation and UiAutomation' ||
    typeof report.artifactDirectory !== 'string' ||
    !/^cache\/mui-svg-icon-\d+$/.test(report.artifactDirectory) ||
    !Number.isInteger(report.device?.sdk) ||
    report.device.sdk < 29 ||
    typeof report.device?.model !== 'string' ||
    !report.device.model ||
    !Array.isArray(report.screenshots) ||
    new Set(report.screenshots).size !== report.screenshots.length ||
    !report.screenshots.every((file) => [...svgIconPictures, 'failure.png'].includes(file))
  )
    throw Error('Unsafe or incomplete SvgIcon diagnostic metadata');
  return report;
}
/** A pass requires actual native geometry and pixels, not only a success flag. */
export function summarizeSvgIcon(output) {
  if (
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length !== 1 ||
    !/^INSTRUMENTATION_CODE: -1\r?$/m.test(output) ||
    /^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output)
  )
    throw Error('Missing or failed SvgIcon instrumentation');
  const report = inspectSvgIconReport(output);
  if (
    report.status !== 'passed' ||
    report.error != null ||
    JSON.stringify(report.stages) !== JSON.stringify(svgIconStages) ||
    JSON.stringify(report.screenshots) !== JSON.stringify(svgIconPictures) ||
    !Array.isArray(report.samples) ||
    report.samples.length !== 10
  )
    throw Error('Incomplete native SvgIcon evidence');
  const dimensions = [...geometry, ['svg-text-small', 120, 50], ['svg-text-large', 120, 50]];
  for (const [index, [name, width, height]] of dimensions.entries()) {
    const sample = report.samples[index < 4 ? index : index + 3];
    if (
      sample?.name !== name ||
      !Number.isFinite(sample.width) ||
      !Number.isFinite(sample.height) ||
      Math.abs(sample.width - width) >= 0.6 ||
      Math.abs(sample.height - height) >= 0.6
    )
      throw Error('Inconsistent native SVG bounds: ' + name);
  }
  for (const [index, [name, argb]] of paints.entries())
    if (report.samples[index + 4]?.name !== name || report.samples[index + 4]?.argb !== argb)
      throw Error('Inconsistent native SVG paint');
  const ink = report.samples[9];
  if (
    ink?.name !== 'font-ink' ||
    !['smallWidth', 'smallHeight', 'largeWidth', 'largeHeight'].every(
      (key) => Number.isInteger(ink[key]) && ink[key] > 0,
    ) ||
    ink.largeWidth <= ink.smallWidth * 1.6 ||
    ink.largeHeight <= ink.smallHeight * 1.6
  )
    throw Error('Missing native font raster evidence');
  return report;
}
