// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepare as prepareCatalog } from './android-popper.mjs';
export const inputModes = ['native', 'field', 'autocomplete', 'uncontrolled'];
export const inputRounds = 8;
export const inputText = 'New city';

/** @param {string} output
 * Keep failure reports retrievable without accepting a successful adb exit as proof. */
export function inputIntegrityArtifact(output) {
  const paths = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: inputIntegrityDirectory=([^\r\n]+)\r?$/gm),
  ];
  if (paths.length !== 1 || !/^cache\/mui-input-integrity-\d+$/.test(paths[0][1]))
    throw Error('Missing or unsafe input-integrity artifact directory');
  return paths[0][1];
}

/** Every cold scene must retain both the native text and its React change receipt. */
export function summarizeInputIntegrity(output, report) {
  const directory = inputIntegrityArtifact(output);
  if (
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length !== 1 ||
    !/^INSTRUMENTATION_CODE: -1\r?$/m.test(output) ||
    /^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output) ||
    [...output.matchAll(/^INSTRUMENTATION_RESULT: inputIntegrityStatus=/gm)].length !== 1 ||
    !/^INSTRUMENTATION_RESULT: inputIntegrityStatus=passed\r?$/m.test(output) ||
    report.artifactDirectory !== directory ||
    report.schemaVersion !== 1 ||
    report.scenario !== 'input-integrity-v1' ||
    report.driver !== 'Instrumentation.sendStringSync' ||
    report.status !== 'passed' ||
    report.completed !== true ||
    report.error != null ||
    report.expectedText !== inputText ||
    !Number.isInteger(report.device?.sdk) ||
    report.device.sdk < 29 ||
    typeof report.device?.model !== 'string' ||
    !report.device.model ||
    typeof report.device?.os !== 'string' ||
    !report.device.os ||
    !Array.isArray(report.trials) ||
    report.trials.length !== inputRounds * inputModes.length
  )
    throw Error('Incomplete or failed input-integrity comparison');
  const tags = new Set();
  let generation = -1;
  for (const [index, trial] of report.trials.entries()) {
    const mode = inputModes[index % inputModes.length];
    if (
      trial?.mode !== mode ||
      trial.round !== Math.floor(index / inputModes.length) ||
      !Number.isInteger(trial.generation) ||
      trial.generation <= generation ||
      !Number.isInteger(trial.reactTag) ||
      trial.reactTag <= 0 ||
      tags.has(trial.reactTag) ||
      trial.finalReactTag !== trial.reactTag ||
      trial.sameEditor !== true ||
      trial.matched !== true ||
      trial.traceTruncated !== false ||
      trial.nativeText !== inputText ||
      trial.focus?.focused !== true ||
      trial.focus.windowFocused !== true ||
      trial.focus.attached !== true ||
      typeof trial.focus.imeActive !== 'boolean' ||
      trial.receipt?.mode !== mode ||
      trial.receipt.generation !== trial.generation ||
      trial.receipt.value !== inputText ||
      trial.receipt.reason !== 'input' ||
      !Number.isInteger(trial.receipt.count) ||
      trial.receipt.count <= 0 ||
      !Array.isArray(trial.changes) ||
      trial.changes.length < 2 ||
      trial.changes.length > 256 ||
      !trial.changes.every(
        (edit) =>
          edit &&
          ['before', 'change'].includes(edit.phase) &&
          typeof edit.text === 'string' &&
          ['start', 'before', 'after', 'time'].every(
            (key) => Number.isInteger(edit[key]) && edit[key] >= 0,
          ) &&
          ['selectionStart', 'selectionEnd'].every(
            (key) => Number.isInteger(edit[key]) && edit[key] >= -1,
          ) &&
          (edit.phase === 'before' ||
            (Array.isArray(edit.stack) &&
              edit.stack.length <= 12 &&
              edit.stack.every((frame) => typeof frame === 'string'))),
      ) ||
      !Number.isInteger(trial.typedChangeCount) ||
      trial.typedChangeCount < 2 ||
      trial.typedChangeCount > trial.changes.length ||
      trial.changes[trial.typedChangeCount - 1].phase !== 'change' ||
      trial.changes[trial.typedChangeCount - 1].text !== inputText
    )
      throw Error('Missing or inconsistent cold-editor evidence at trial ' + index);
    if (
      trial.filterAttached !== true ||
      trial.filterRemoved !== true ||
      trial.filtersTruncated !== false ||
      !Array.isArray(trial.replacements) ||
      trial.replacements.length < 1 ||
      trial.replacements.length > 256 ||
      !Number.isInteger(trial.typedReplacementCount) ||
      trial.typedReplacementCount < 1 ||
      trial.typedReplacementCount > trial.replacements.length ||
      !trial.replacements.every(
        (edit) =>
          edit &&
          typeof edit.source === 'string' &&
          typeof edit.destination === 'string' &&
          typeof edit.nativeBefore === 'string' &&
          ['start', 'end', 'time'].every((key) => Number.isInteger(edit[key]) && edit[key] >= 0) &&
          edit.start <= edit.end &&
          edit.end <= edit.destination.length &&
          Array.isArray(edit.stack) &&
          edit.stack.length <= 12 &&
          edit.stack.every((frame) => typeof frame === 'string'),
      ) ||
      (mode !== 'uncontrolled' &&
        (trial.authoredReplacement !== 'JS replacement' ||
          trial.authoredClear !== '' ||
          !trial.replacements
            .slice(trial.typedReplacementCount)
            .some((edit) => edit.source === 'JS replacement' && edit.nativeBefore === inputText) ||
          !trial.replacements
            .slice(trial.typedReplacementCount)
            .some((edit) => edit.source === '' && edit.nativeBefore === 'JS replacement')))
    )
      throw Error('Missing bounded replacement observation or positive control at trial ' + index);
    tags.add(trial.reactTag);
    generation = trial.generation;
  }
  const touches = [
    'catalog-tab-Inputs',
    ...report.trials.flatMap((trial) => [
      'typing-mode-' + trial.mode,
      'typing-editor',
      ...(trial.mode === 'uncontrolled' ? [] : ['typing-replace', 'typing-replace']),
    ]),
  ];
  if (
    !Array.isArray(report.touches) ||
    report.touches.length !== touches.length ||
    !report.touches.every(
      (touch, index) =>
        touch?.id === touches[index] &&
        ['x', 'y'].every((key) => Number.isFinite(touch[key]) && touch[key] >= 0),
    )
  )
    throw Error('Missing matched native touches');
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [action, argument, reportPath] = process.argv.slice(2);
  if (action === 'prepare' && typeof argument === 'string' && argument && !reportPath)
    console.log(
      JSON.stringify({ ...(await prepareCatalog(resolve(argument))), scenario: 'input-integrity' }),
    );
  else if (action === 'artifact' && typeof argument === 'string' && argument && !reportPath)
    console.log(inputIntegrityArtifact((await readFile(argument)).toString()));
  else if (
    action === 'summarize' &&
    typeof argument === 'string' &&
    argument &&
    typeof reportPath === 'string' &&
    reportPath
  )
    console.log(
      JSON.stringify(
        summarizeInputIntegrity(
          (await readFile(argument)).toString(),
          JSON.parse((await readFile(reportPath)).toString()),
        ),
        null,
        2,
      ),
    );
  else
    throw Error(
      'Usage: android-input-integrity.mjs prepare PROJECT | artifact RAW_LOG | summarize RAW_LOG REPORT_JSON',
    );
}
