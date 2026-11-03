// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepare as prepareCatalog } from './android-popper.mjs';
export const autocompleteStages = [
  'scene-ready',
  'search-filter',
  'touch-select',
  'clear',
  'keyboard-highlight',
  'keyboard-select',
  'multiple-remove',
  'multiple-select',
  'grouped-options',
  'free-solo',
  'select-on-focus',
  'disabled-option',
  'disabled-control',
  'readonly-control',
  'loading',
  'dialog-selection',
  'fullscreen-dialog-selection',
];
export const autocompletePictures = [
  'filtered.png',
  'multiple.png',
  'grouped.png',
  'dialog.png',
  'fullscreen-dialog.png',
];
/** Prepare only the existing generated test project; never open or replace a device. */
export async function prepareAutocomplete(project) {
  const prepared = await prepareCatalog(project);
  return { ...prepared, scenario: 'autocomplete' };
}
/** A successful adb process alone does not establish successful native assertions. */
export function summarizeAutocomplete(output) {
  const reports = [...output.matchAll(/^INSTRUMENTATION_RESULT: autocompleteReport=(.*)\r?$/gm)];
  if (
    reports.length !== 1 ||
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length !== 1 ||
    !/^INSTRUMENTATION_CODE: -1\r?$/m.test(output) ||
    /^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output)
  )
    throw Error('Incomplete or failed Autocomplete instrumentation');
  const report = JSON.parse(reports[0][1]);
  if (
    report.schemaVersion !== 1 ||
    report.status !== 'passed' ||
    report.error != null ||
    report.driver !== 'native Instrumentation and UiAutomation' ||
    JSON.stringify(report.stages) !== JSON.stringify(autocompleteStages) ||
    JSON.stringify(report.screenshots) !== JSON.stringify(autocompletePictures) ||
    !/^cache\/mui-autocomplete-\d+$/.test(report.artifactDirectory) ||
    !Number.isInteger(report.device?.sdk) ||
    report.device.sdk < 29 ||
    typeof report.device?.model !== 'string' ||
    !report.device.model ||
    typeof report.device?.os !== 'string' ||
    !report.device.os ||
    !Array.isArray(report.touches) ||
    report.touches.length < 10 ||
    !report.touches.every(
      (touch) =>
        (typeof touch.id === 'string' && touch.id.startsWith('autocomplete-')) ||
        touch.id === 'catalog-tab-Autocomplete',
    )
  )
    throw Error('Missing Autocomplete scenario evidence');
  if (
    !report.touches.every(
      (touch) =>
        Number.isFinite(touch.x) && Number.isFinite(touch.y) && touch.x >= 0 && touch.y >= 0,
    )
  )
    throw Error('Invalid native touch coordinates');
  const bursts = report.freeSoloBursts;
  if (
    !Array.isArray(bursts) ||
    bursts.length !== 8 ||
    !bursts.every(
      (burst, index) =>
        burst?.index === index &&
        burst.status === 'passed' &&
        burst.error == null &&
        burst.nativeText === 'New city' &&
        burst.editorStable === true &&
        (!Object.hasOwn(burst, 'traceTruncated') || burst.traceTruncated === false) &&
        Array.isArray(burst.changes) &&
        burst.changes.length >= 2 &&
        burst.changes.length <= 256 &&
        burst.changes.every(
          (row) =>
            Array.isArray(row) &&
            row.length === 7 &&
            ['before', 'change'].includes(row[0]) &&
            typeof row[1] === 'string' &&
            row.slice(2, 5).every((value) => Number.isInteger(value) && value >= 0) &&
            row.slice(5).every((value) => Number.isInteger(value) && value >= -1),
        ) &&
        burst.changes.at(-1)[0] === 'change' &&
        burst.changes.at(-1)[1] === 'New city',
    )
  )
    throw Error('Missing, failed or incomplete free-solo burst evidence');
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [action, argument] = process.argv.slice(2);
  if (action === 'prepare' && typeof argument === 'string' && argument)
    console.log(JSON.stringify(await prepareAutocomplete(resolve(argument))));
  else if (action === 'summarize' && typeof argument === 'string' && argument)
    console.log(
      JSON.stringify(
        summarizeAutocomplete(await readFile(argument, { encoding: 'utf8' })),
        null,
        2,
      ),
    );
  else throw Error('Usage: android-autocomplete.mjs prepare PROJECT | summarize RAW_LOG');
}
