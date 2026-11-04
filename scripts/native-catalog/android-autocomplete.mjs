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
  'tag-start-focus',
  'tag-cycle',
  'tag-editor-middle',
  'tag-selected-range',
  'tag-delete-held',
  'tag-delete-release',
  'editor-backspace',
  'editor-final-backspace',
  'editor-backspace-unowned',
  'multiple-remove',
  'multiple-select',
  'grouped-options',
  'free-solo',
  'select-on-focus',
  'disabled-option',
  'disabled-control',
  'readonly-control',
  'loading',
  'dialog-child-escape',
  'dialog-selection',
  'dialog-default-escape',
  'fullscreen-dialog-child-escape',
  'fullscreen-dialog-selection',
  'fullscreen-dialog-default-escape',
  'software-requests',
];
export const autocompletePictures = [
  'filtered.png',
  'tag-focus.png',
  'editor-empty.png',
  'multiple.png',
  'grouped.png',
  'dialog-escape.png',
  'dialog.png',
  'fullscreen-dialog-escape.png',
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
  const release = report.tagEntryRelease;
  if (
    release?.focusChangedBeforeUp !== true ||
    release.callbackRestored !== true ||
    release.editorUps !== 0 ||
    release.chipUps !== 0
  )
    throw Error('Missing native focus-transfer release ownership evidence');
  const software = report.softwareRequests;
  const methods = [
    'surrounding',
    'codepoints',
    'key-unflagged',
    'key-soft',
    'key-system',
    'nested-batch',
    'commit',
    'composing',
    ...(report.device.sdk >= 33 ? ['commit-modern', 'composing-modern', 'region-modern'] : []),
    ...(report.device.sdk >= 34 ? ['replace-modern'] : []),
    'retired',
    'queued-retired',
    'covered-window',
  ];
  if (
    !Array.isArray(software) ||
    software.length !== methods.length ||
    !software.every(
      (row, index) =>
        row.method === methods[index] &&
        row.status === 'passed' &&
        (!row.method.endsWith('-modern') ||
          (row.downs === 0 &&
            typeof row.result === 'boolean' &&
            row.nativeText === (row.method === 'region-modern' ? 'x' : ''))) &&
        (row.method !== 'retired' ||
          (row.ordinaryTextEdited === true && row.downs === 0 && row.keyPresses === 1)) &&
        (row.method !== 'nested-batch' ||
          (row.requests === 2 && [0, 1].includes(row.committedValues))) &&
        (index >= 5 ||
          (row.downs === 1 &&
            typeof row.result === 'boolean' &&
            Number.isInteger(row.keyPresses) &&
            row.keyPresses === (row.method === 'codepoints' ? 0 : 1))),
    )
  )
    throw Error('Missing software editing request evidence');
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
