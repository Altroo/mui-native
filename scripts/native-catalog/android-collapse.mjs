// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepare as prepareCatalog } from './android-popper.mjs';
export const collapseStages = [
  'scene-ready',
  'vertical-measured',
  'vertical-entering',
  'vertical-entered',
  'content-grown',
  'vertical-exited',
  'retained-edit',
  'slow-preview',
  'interrupted-exit',
  'horizontal-entering',
  'horizontal-entered',
  'horizontal-exited',
  'reduced-motion',
];
export const collapsePictures = ['closed.png', 'expanded.png', 'horizontal.png', 'reduced.png'];
const expectedSamples = [
  ['vertical-closed', 'vertical'],
  ['vertical-intermediate', 'vertical'],
  ['vertical-entered', 'vertical'],
  ['content-grown', 'vertical'],
  ['vertical-exit-intermediate', 'vertical'],
  ['horizontal-intermediate', 'horizontal'],
  ['horizontal-entered', 'horizontal'],
];
/** Native bounds and ordered interactions are required, independently of adb's exit status. */
export function summarizeCollapse(output) {
  const matches = [...output.matchAll(/^INSTRUMENTATION_RESULT: collapseReport=([^\r\n]+)\r?$/gm)];
  if (
    matches.length !== 1 ||
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length !== 1 ||
    !/^INSTRUMENTATION_CODE: -1\r?$/m.test(output) ||
    /^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output)
  )
    throw Error('Missing or failed Collapse instrumentation');
  const report = JSON.parse(matches[0][1]);
  if (
    report.schemaVersion !== 1 ||
    report.scenario !== 'collapse-v1' ||
    report.driver !== 'native Instrumentation and UiAutomation' ||
    report.status !== 'passed' ||
    report.error != null ||
    !/^cache\/mui-collapse-\d+$/.test(report.artifactDirectory) ||
    !Number.isInteger(report.device?.sdk) ||
    report.device.sdk < 29 ||
    typeof report.device?.model !== 'string' ||
    !report.device.model ||
    JSON.stringify(report.stages) !== JSON.stringify(collapseStages) ||
    JSON.stringify(report.screenshots) !== JSON.stringify(collapsePictures) ||
    !Array.isArray(report.samples) ||
    report.samples.length !== expectedSamples.length
  )
    throw Error('Incomplete native Collapse evidence');
  for (const [index, sample] of report.samples.entries()) {
    if (
      sample?.name !== expectedSamples[index][0] ||
      sample.axis !== expectedSamples[index][1] ||
      sample.overflow !==
        (sample.name.includes('intermediate') || sample.name === 'vertical-closed'
          ? 'hidden'
          : 'visible') ||
      !['actual', 'natural', 'cross'].every(
        (key) => Number.isInteger(sample[key]) && sample[key] >= 0,
      ) ||
      sample.natural <= 0 ||
      sample.cross <= 0 ||
      (sample.name === 'vertical-closed' && sample.actual !== 0) ||
      (sample.name.includes('intermediate') &&
        !(sample.actual > 0 && sample.actual < sample.natural - 2)) ||
      (!sample.name.includes('intermediate') &&
        sample.name !== 'vertical-closed' &&
        Math.abs(sample.actual - sample.natural) > 2)
    )
      throw Error('Missing or inconsistent native Collapse bounds at sample ' + index);
  }
  if (report.samples[3].actual <= report.samples[2].actual)
    throw Error('Expanded content did not grow');
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [action, argument, extra] = process.argv.slice(2);
  if (!argument || extra) throw Error('Use prepare PROJECT | summarize RAW_LOG');
  if (action === 'prepare')
    console.log(
      JSON.stringify({ ...(await prepareCatalog(resolve(argument))), scenario: 'collapse' }),
    );
  else if (action === 'summarize')
    console.log(JSON.stringify(summarizeCollapse(await readFile(argument, 'utf8')), null, 2));
  else throw Error('Use prepare PROJECT | summarize RAW_LOG');
}
