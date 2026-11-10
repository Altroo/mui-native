// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import { readFile, writeFile, mkdir, readdir, realpath } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { prepareKeyboardSource } from './android-keyboard-source.mjs';
import { prepareAutocompleteSource } from './android-autocomplete-source.mjs';
import { prepareInputIntegritySource } from './android-input-integrity-source.mjs';
import { prepareCollapseSource } from './android-collapse-source.mjs';
import { prepareAccordionSource } from './android-accordion-source.mjs';
import { prepareButtonGroupSource } from './android-button-group-source.mjs';
import { inspectButtonGroupReport, summarizeButtonGroup } from './android-button-group-report.mjs';
import {
  inspectReadingReport,
  summarizeReadingReport,
} from './android-button-group-reading-report.mjs';
import { prepareDividerSource } from './android-divider-source.mjs';
import { preparePaperSource } from './android-paper-source.mjs';
import { prepareBoxSource } from './android-box-source.mjs';
import { prepareCardSource } from './android-card-source.mjs';
import { prepareStructureSource } from './android-structure-source.mjs';
import { inspectStructureReport, summarizeStructure } from './android-structure-report.mjs';
import { inspectCardReport, summarizeCard } from './android-card-report.mjs';
import { inspectBoxReport, summarizeBox } from './android-box-report.mjs';
import { inspectPaperReport, summarizePaper } from './android-paper-report.mjs';
import { inspectDividerReport, summarizeDivider } from './android-divider-report.mjs';
import { prepareLayoutRootSource } from './android-layout-root-source.mjs';
import { inspectLayoutRootReport, summarizeLayoutRoots } from './android-layout-root-report.mjs';
import {
  inspectFormGroupAccessibility,
  summarizeFormGroupAccessibility,
} from './android-form-group-accessibility-report.mjs';
import {
  inspectFormGroupEditor,
  summarizeFormGroupEditor,
} from './android-form-group-editor-report.mjs';
import {
  inspectFormGroupFocus,
  summarizeFormGroupFocus,
} from './android-form-group-focus-report.mjs';
import {
  inspectFormGroupKeyboard,
  summarizeFormGroupKeyboard,
} from './android-form-group-keyboard-report.mjs';
import {
  inspectFormGroupEvents,
  summarizeFormGroupEvents,
} from './android-form-group-events-report.mjs';
import {
  inspectTextAlignmentReport,
  summarizeTextAlignment,
} from './android-text-alignment-report.mjs';
import { prepareSvgIconSource } from './android-svg-icon-source.mjs';
import { inspectSvgIconReport, summarizeSvgIcon } from './android-svg-icon-report.mjs';
import { inspectAccordionReport, summarizeAccordion } from './android-accordion-report.mjs';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const catalogPackage = 'dev.altroo.muinative.catalog';
export const runner = catalogPackage + '.test.PopperInstrumentation';
export const component = catalogPackage + '.test/' + runner;

export async function prepare(project) {
  const gradlePath = join(project, 'app/build.gradle');
  let gradle = await readFile(gradlePath, { encoding: 'utf8' });
  if (!gradle.includes("applicationId '" + catalogPackage + "'"))
    throw Error('Expected the generated native catalog Android project');
  const marker = '// Native Popper catalog instrumentation';
  if (gradle.includes(marker) && !gradle.includes("testInstrumentationRunner '" + runner + "'"))
    throw Error('The generated runner configuration was modified');
  if (!gradle.includes(marker)) {
    if (gradle.includes('testInstrumentationRunner'))
      throw Error('Preserve the existing instrumentation runner');
    gradle += `\n${marker}\nandroid { defaultConfig { testInstrumentationRunner '${runner}' } }\n`;
  }
  const source = await readFile(join(root, 'tests/native/android/PopperInstrumentation.java'), {
    encoding: 'utf8',
  });
  const target = join(
    project,
    'app/src/androidTest/java/dev/altroo/muinative/catalog/test/PopperInstrumentation.java',
  );
  let previous;
  try {
    previous = await readFile(target, { encoding: 'utf8' });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const ownership = join(project, '.mui-native-popper-instrumentation.json');
  const digest = (value) => createHash('sha256').update(value).digest('hex');
  if (previous !== undefined && previous !== source) {
    let record;
    try {
      record = JSON.parse(await readFile(ownership, { encoding: 'utf8' }));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (record?.sourceSha256 !== digest(previous))
      throw Error('Preserve edits to the generated instrumentation source');
  }
  await prepareKeyboardSource(project);
  await prepareAutocompleteSource(project);
  await prepareInputIntegritySource(project);
  await prepareCollapseSource(project);
  await prepareAccordionSource(project);
  await prepareSvgIconSource(project);
  await prepareButtonGroupSource(project);
  await prepareLayoutRootSource(project);
  await prepareDividerSource(project);
  await preparePaperSource(project);
  await prepareBoxSource(project);
  await prepareCardSource(project);
  await prepareStructureSource(project);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, source);
  await writeFile(gradlePath, gradle);
  await writeFile(ownership, JSON.stringify({ sourceSha256: digest(source) }) + '\n');
  return { project, source: target, runner };
}

export const screenshotStages = [
  'window-popup',
  'inline-popup',
  'transformed-inline-popup',
  'bounded-transformed-popup',
  'reset-inline-popup',
  'transformed-window-popup',
  'reset-window-popup',
  'closed-popup',
  ...['window', 'inline'].flatMap((mode) => [
    'scrolled-' + mode + '-popup',
    'returned-' + mode + '-popup',
    'clipped-' + mode + '-anchor',
    'restored-' + mode + '-popup',
  ]),
  ...['window', 'inline'].flatMap((mode) => [
    'shared-' + mode + '-a',
    'shared-' + mode + '-b',
    'detached-shared-' + mode,
    'recovered-shared-' + mode,
    'returned-shared-' + mode,
    'shared-' + mode + '-closed',
  ]),
];
export const requiredMilestones = [
  ...screenshotStages,
  'react-physical-child-bridge',
  'react-manager-operations',
  'repeat-0-reset',
  'repeat-0-transformed',
  'repeat-1-reset',
  'repeat-1-transformed',
  'confirm-1',
  'confirm-2',
  'confirm-3',
  'confirm-4',
  ...[0, 1, 2].flatMap((cycle) => ['repeat-open-' + cycle, 'repeat-close-' + cycle]),
  ...['window', 'inline'].flatMap((mode) => [
    'shared-' + mode + '-read-1',
    'shared-' + mode + '-read-2',
  ]),
];

/** Decode safe artifact locations even when native assertions failed. */
export function inspectReport(output) {
  const reports = [...output.matchAll(/^INSTRUMENTATION_RESULT: report=(.*)\r?$/gm)];
  if (reports.length !== 1) throw Error('No unambiguous instrumentation report');
  const report = JSON.parse(reports[0][1]);
  if (
    !report ||
    typeof report !== 'object' ||
    report.schemaVersion !== 1 ||
    report.package !== catalogPackage ||
    report.scenario !== 'popper-native-anchor-lifecycle-v3' ||
    !['passed', 'failed'].includes(report.status) ||
    (!(report.directory === null && report.status === 'failed') &&
      (typeof report.directory !== 'string' ||
        !/^popper-checks\/run-\d+$/.test(report.directory))) ||
    !Array.isArray(report.steps) ||
    report.steps.some((value) => typeof value !== 'string') ||
    !Array.isArray(report.milestones) ||
    report.milestones.some((value) => typeof value !== 'string') ||
    !Array.isArray(report.screenshots) ||
    report.screenshots.some((file) => typeof file !== 'string' || !/^[a-z-]+\.png$/.test(file)) ||
    new Set(report.screenshots).size !== report.screenshots.length
  )
    throw Error('Incomplete or unsafe native artifact report');
  if (report.directory === null && report.screenshots.length)
    throw Error('Artifacts have no native directory');
  return report;
}

function assertCompleted(output, report) {
  const codes = [...output.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\r?$/gm)];
  if (
    codes.length !== 1 ||
    codes[0][1] !== '-1' ||
    /^INSTRUMENTATION_(FAILED|ABORTED|STATUS_CODE: -2)/m.test(output) ||
    /^INSTRUMENTATION_RESULT: (shortMsg|Error)=/m.test(output) ||
    report.status !== 'passed'
  )
    throw Error('Native Popper check failed: ' + (report.error ?? report.status));
  if (
    report.steps.length < 15 ||
    new Set(report.milestones).size !== report.milestones.length ||
    requiredMilestones.some((stage) => !report.milestones.includes(stage)) ||
    screenshotStages.some((stage) => !report.screenshots.includes(stage + '.png'))
  )
    throw Error('Missing required native geometry/touch milestones');
}

export function parseReport(output) {
  const report = inspectReport(output);
  assertCompleted(output, report);
  return report;
}

/**
 * Preserve command output on rejection so interrupted tests retain diagnostics.
 * @param {string} file
 * @param {string[]} args
 * @param {import('node:child_process').ExecFileOptionsWithBufferEncoding} options
 * @returns {Promise<Buffer>}
 */
function executeFile(file, args, options) {
  return new Promise((resolve, reject) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error) reject(Object.assign(error, { stdout, stderr }));
      else resolve(stdout);
    });
  });
}

/**
 * Run on one explicitly selected device and restore only the catalog.
 * @param {{adb: string, serial: string, output: string, signal?: AbortSignal, scenario?: 'popper' | 'accordion' | 'svg-icon' | 'button-group' | 'button-group-reading' | 'layout-roots' | 'form-group-events' | 'form-group-keyboard' | 'form-group-focus' | 'form-group-editor' | 'form-group-accessibility' | 'text-alignment' | 'divider' | 'paper' | 'box' | 'card' | 'structure' | 'structure-children', globalRTL?: boolean, fontProfile?: 'normal' | 'enlarged'}} options
 * @param {(file: string, args: string[], options: import('node:child_process').ExecFileOptionsWithBufferEncoding) => Promise<Uint8Array | string> | Uint8Array | string} [execute]
 */
export async function run(
  { adb, serial, output, signal, scenario = 'popper', globalRTL = false, fontProfile },
  execute = executeFile,
) {
  if (
    ![
      'popper',
      'accordion',
      'svg-icon',
      'button-group',
      'button-group-reading',
      'layout-roots',
      'form-group-events',
      'form-group-keyboard',
      'form-group-focus',
      'form-group-editor',
      'form-group-accessibility',
      'text-alignment',
      'divider',
      'paper',
      'box',
      'card',
      'structure',
      'structure-children',
    ].includes(scenario)
  )
    throw Error('Unknown catalog scenario');
  if (typeof globalRTL !== 'boolean' || (globalRTL && scenario !== 'button-group-reading'))
    throw Error('Global RTL profiles apply only to reading checks');
  if (
    ['divider', 'paper', 'box', 'card', 'layout-roots'].includes(scenario)
      ? !['normal', 'enlarged'].includes(fontProfile)
      : fontProfile !== undefined
  )
    throw Error(
      (scenario === 'layout-roots'
        ? 'Layout root'
        : scenario === 'card'
          ? 'Card'
          : scenario === 'box'
            ? 'Box'
            : scenario === 'paper'
              ? 'Paper'
              : 'Divider') + ' checks require an explicit normal/enlarged font profile',
    );
  if (typeof serial !== 'string' || !serial.trim())
    throw Error('Choose one explicit --serial; devices are never selected automatically');
  if (scenario === 'text-alignment' && serial !== 'emulator-5554')
    throw Error('Text alignment proof is restricted to the existing emulator-5554');
  signal?.throwIfAborted();
  /** @returns {Promise<Uint8Array | string>} */
  const call = async (args, instrument = false) =>
    await execute(adb, ['-s', serial, ...args], {
      timeout: instrument ? 180000 : 10000,
      maxBuffer: 20 * 1024 * 1024,
      encoding: 'buffer',
      signal: instrument ? signal : undefined,
    });
  if (String(await call(['get-state'])).trim() !== 'device')
    throw Error('The selected device is not ready');
  await mkdir(output, { recursive: true });
  if ((await readdir(output)).length)
    throw Error('Choose an empty output directory; preserve existing test evidence');
  let report, failure, text;
  try {
    try {
      text = String(
        await call(
          [
            'shell',
            'am',
            'instrument',
            '-w',
            '-r',
            ...(scenario === 'popper' ? [] : ['-e', 'scenario', scenario]),
            ...(['divider', 'paper', 'box', 'card', 'layout-roots'].includes(scenario)
              ? ['-e', 'fontProfile', fontProfile]
              : []),
            ...(scenario === 'button-group-reading' ? ['-e', 'globalRTL', String(globalRTL)] : []),
            component,
          ],
          true,
        ),
      );
    } catch (error) {
      failure = error;
      text = String(error.stdout ?? '');
      await writeFile(
        join(output, 'command-error.txt'),
        String(error) + '\n' + String(error.stderr ?? ''),
      );
    }
    await writeFile(join(output, 'instrumentation.txt'), text);
    report = ['structure', 'structure-children'].includes(scenario)
      ? inspectStructureReport(text, {
          watchMode: scenario === 'structure-children' ? 'children' : 'siblings',
        })
      : scenario === 'card'
        ? inspectCardReport(text)
        : scenario === 'box'
          ? inspectBoxReport(text)
          : scenario === 'paper'
            ? inspectPaperReport(text)
            : scenario === 'form-group-accessibility'
              ? inspectFormGroupAccessibility(text)
              : scenario === 'form-group-editor'
                ? inspectFormGroupEditor(text)
                : scenario === 'form-group-focus'
                  ? inspectFormGroupFocus(text)
                  : scenario === 'form-group-keyboard'
                    ? inspectFormGroupKeyboard(text)
                    : scenario === 'form-group-events'
                      ? inspectFormGroupEvents(text)
                      : scenario === 'text-alignment'
                        ? inspectTextAlignmentReport(text)
                        : scenario === 'divider'
                          ? inspectDividerReport(text)
                          : scenario === 'layout-roots'
                            ? inspectLayoutRootReport(text)
                            : scenario === 'accordion'
                              ? inspectAccordionReport(text)
                              : scenario === 'svg-icon'
                                ? inspectSvgIconReport(text)
                                : scenario === 'button-group-reading'
                                  ? inspectReadingReport(text)
                                  : scenario === 'button-group'
                                    ? inspectButtonGroupReport(text)
                                    : inspectReport(text);
    await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    for (const file of report.screenshots) {
      const bytes = await call([
        'exec-out',
        'run-as',
        catalogPackage,
        'cat',
        (scenario === 'popper' ? 'cache/' + report.directory : report.artifactDirectory) +
          '/' +
          file,
      ]);
      await writeFile(join(output, file), bytes);
    }
    signal?.throwIfAborted();
    if (['structure', 'structure-children'].includes(scenario))
      summarizeStructure(text, {
        watchMode: scenario === 'structure-children' ? 'children' : 'siblings',
      });
    else if (scenario === 'card') summarizeCard(text, { fontProfile });
    else if (scenario === 'box') summarizeBox(text, { fontProfile });
    else if (scenario === 'paper') summarizePaper(text, { fontProfile });
    else if (scenario === 'form-group-events') summarizeFormGroupEvents(text);
    else if (scenario === 'form-group-keyboard') summarizeFormGroupKeyboard(text);
    else if (scenario === 'form-group-editor') summarizeFormGroupEditor(text);
    else if (scenario === 'form-group-accessibility') summarizeFormGroupAccessibility(text);
    else if (scenario === 'form-group-focus') summarizeFormGroupFocus(text);
    else if (scenario === 'text-alignment') summarizeTextAlignment(text);
    else if (scenario === 'divider') summarizeDivider(text, { fontProfile });
    else if (scenario === 'layout-roots') summarizeLayoutRoots(text, { fontProfile });
    else if (scenario === 'accordion') summarizeAccordion(text);
    else if (scenario === 'svg-icon') summarizeSvgIcon(text);
    else if (scenario === 'button-group-reading') summarizeReadingReport(text, { globalRTL });
    else if (scenario === 'button-group') summarizeButtonGroup(text);
    else assertCompleted(text, report);
  } catch (error) {
    failure =
      failure && failure !== error
        ? new AggregateError([failure, error], 'Instrumentation and diagnostics failed')
        : error;
  }
  if (failure) {
    // Killing a timed-out adb client does not cancel on-device instrumentation.
    // Stop this target package and confirm all its processes ended before a
    // restore can place fresh controls under an old test's pending touches.
    let terminationError;
    let terminationFailed = false;
    try {
      await call(['shell', 'am', 'force-stop', catalogPackage]);
      let stopped = false;
      const deadline = Date.now() + 5000;
      do {
        const processes = String(await call(['shell', 'ps', '-A', '-o', 'NAME']))
          .split(/\r?\n/)
          .map((name) => name.trim());
        if (
          !processes.some(
            (name) => name === catalogPackage || name.startsWith(catalogPackage + ':'),
          )
        ) {
          stopped = true;
          break;
        }
        await delay(100);
      } while (Date.now() < deadline);
      if (!stopped) {
        terminationFailed = true;
        terminationError = Error('Catalog instrumentation is still active; restoration skipped');
      }
    } catch (error) {
      terminationFailed = true;
      terminationError = error;
    }
    if (terminationFailed) {
      throw new AggregateError(
        [failure, terminationError],
        'Test failed; termination unconfirmed and catalog restoration skipped',
        { cause: terminationError },
      );
    }
  }
  try {
    await call(['shell', 'am', 'start', '-n', catalogPackage + '/.MainActivity']);
  } catch (error) {
    failure = failure
      ? new AggregateError([failure, error], 'Test and catalog restoration failed')
      : error;
  }
  if (failure) throw failure;
  return report;
}

async function isMainEntry() {
  const entry = process.argv[1];
  if (typeof entry !== 'string' || !entry) return false;
  try {
    const [entryPath, modulePath] = await Promise.all([
      realpath(resolve(entry)),
      realpath(fileURLToPath(import.meta.url)),
    ]);
    return entryPath === modulePath;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
    throw error;
  }
}

if (await isMainEntry()) {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      project: { type: 'string' },
      serial: { type: 'string' },
      output: { type: 'string' },
      adb: { type: 'string' },
      scenario: { type: 'string' },
      'font-profile': { type: 'string' },
      'global-rtl': { type: 'boolean', default: false },
    },
  });
  if (positionals.length !== 1 || !['prepare', 'run'].includes(positionals[0]))
    throw Error('Use prepare --project PATH or run --serial DEVICE --output PATH');
  if (positionals[0] === 'prepare') {
    console.log(
      JSON.stringify(
        await prepare(resolve(values.project ?? join(root, 'apps/native-catalog/android'))),
        null,
        2,
      ),
    );
  } else {
    const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
    const adb =
      values.adb ??
      (sdk ? join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb') : 'adb');
    const output = resolve(
      values.output ??
        join(root, '.cache/native-popper-android', new Date().toISOString().replaceAll(':', '-')),
    );
    const controller = new AbortController();
    const abort = () => controller.abort(Error('Native catalog check interrupted'));
    process.on('SIGINT', abort);
    process.on('SIGTERM', abort);
    try {
      console.log(
        JSON.stringify(
          {
            output,
            report: await run({
              adb,
              serial: values.serial,
              output,
              signal: controller.signal,
              scenario: values.scenario,
              globalRTL: values['global-rtl'],
              fontProfile: values['font-profile'],
            }),
          },
          null,
          2,
        ),
      );
    } finally {
      process.removeListener('SIGINT', abort);
      process.removeListener('SIGTERM', abort);
    }
  }
}
