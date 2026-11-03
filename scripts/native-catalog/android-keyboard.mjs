// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepare as prepareCatalog } from './android-popper.mjs';

export const keyboardComponent =
  'dev.altroo.muinative.catalog.test/dev.altroo.muinative.catalog.test.PopperInstrumentation';
export const keyboardStages = [
  'scene-ready',
  ...['ArrowDown', 'ArrowUp', 'PageUp', 'PageDown', 'Home', 'End', 'Tab', 'Escape'].map(
    (key) => 'inline-' + key,
  ),
  'callback-restoration',
  'unrelated-key-held',
  'native-editing',
  'close-during-down',
  'release-stays-outside',
  'focus-departure-return',
  'canceled-release',
  'native-composition-span',
  'closest-owner',
  'window-portal',
  'native-dialog',
  'dialog-release-stays-outside',
  'dialog-Escape-close',
];
const pictures = [
  'inline-commands.png',
  'nested-owner.png',
  'portal-editor.png',
  'dialog-editor.png',
];
/** Preserve other runners; the catalog runner selects this scenario explicitly. */
export async function prepareKeyboard(project) {
  await prepareCatalog(project);
  return { project, component: keyboardComponent, scenario: 'keyboard' };
}

/** adb's exit code alone cannot certify that native assertions completed. */
export function summarizeKeyboard(output) {
  const reports = [...output.matchAll(/^INSTRUMENTATION_RESULT: keyboardReport=(.*)\r?$/gm)];
  if (
    reports.length !== 1 ||
    !/^INSTRUMENTATION_CODE: -1\r?$/m.test(output) ||
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length !== 1 ||
    /^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output)
  )
    throw Error('Incomplete or failed keyboard instrumentation');
  const report = JSON.parse(reports[0][1]);
  if (
    report.schemaVersion !== 1 ||
    report.status !== 'passed' ||
    report.driver !== 'Instrumentation.sendKeySync' ||
    JSON.stringify(report.stages) !== JSON.stringify(keyboardStages) ||
    JSON.stringify(report.screenshots) !== JSON.stringify(pictures) ||
    !/^cache\/mui-keyboard-\d+$/.test(report.artifactDirectory) ||
    !Number.isInteger(report.device?.sdk) ||
    report.device.sdk < 29 ||
    typeof report.device.model !== 'string' ||
    !report.device.model ||
    typeof report.device.os !== 'string' ||
    !report.device.os
  )
    throw Error('Missing keyboard scenario evidence');
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [action, argument] = process.argv.slice(2);
  if (action === 'prepare' && typeof argument === 'string' && argument)
    console.log(JSON.stringify(await prepareKeyboard(resolve(argument))));
  else if (action === 'summarize' && typeof argument === 'string' && argument)
    console.log(
      JSON.stringify(summarizeKeyboard(await readFile(argument, { encoding: 'utf8' })), null, 2),
    );
  else throw Error('Usage: android-keyboard.mjs prepare PROJECT | summarize RAW_LOG');
}
