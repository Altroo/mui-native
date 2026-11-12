// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const scrollCases = Object.freeze({
  testButtonGroupRNScrollTowardEnd: ['rn', 'toward-end'],
  testButtonGroupMUIScrollTowardEnd: ['mui', 'toward-end'],
  testButtonGroupRNScrollTowardStart: ['rn', 'toward-start'],
  testButtonGroupMUIScrollTowardStart: ['mui', 'toward-start'],
});
const durationID = 'com.apple.dt.XCTMetric_OSSignpost-Scroll_DraggingAndDeceleration.duration';
const phases = ['warmup-discarded', 'sample-1', 'sample-2', 'sample-3'];
const hash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const testName = (value) => value?.match(/^LayoutRootPerformanceUITests\/(\w+)\(\)$/)?.[1];
function option(command, name) {
  const indices = command.flatMap((value, i) => (value === name ? [i] : []));
  assert(
    indices.length === 1 && typeof command[indices[0] + 1] === 'string',
    `${name}: one recorded value required`,
  );
  return command[indices[0] + 1];
}
function serialCommand(command, deviceId) {
  assert(
    Array.isArray(command) &&
      command[0] === 'xcodebuild' &&
      command.at(-1) === 'test-without-building',
    'Recorded XCTest command required',
  );
  assert(
    option(command, '-destination') === `id=${deviceId}`,
    'Recorded destination differs from native exports',
  );
  assert(
    option(command, '-parallel-testing-enabled') === 'NO' &&
      option(command, '-maximum-concurrent-test-simulator-destinations') === '1',
    'Serial native execution required',
  );
  assert(
    !command.some(
      (a) =>
        a.startsWith('-skip-testing:') ||
        ['-retry-tests-on-failure', '-test-iterations', '-run-tests-until-failure'].includes(a),
    ),
    'Retries and partial selectors are not a single native matrix',
  );
  const selectors = command.filter((a) => a.startsWith('-only-testing:')).sort();
  assert.deepEqual(
    selectors,
    Object.keys(scrollCases)
      .map(
        (name) => `-only-testing:LayoutRootPerformanceUITests/LayoutRootPerformanceUITests/${name}`,
      )
      .sort(),
    'Recorded native selectors differ from the four-case matrix',
  );
}
function rect(value, label) {
  assert(
    value && ['x', 'y', 'width', 'height'].every((key) => finite(value[key])),
    `${label}: finite native rectangle required`,
  );
  assert(value.width > 0 && value.height > 0, `${label}: positive native extent required`);
  return value;
}
function close(a, b, label, tolerance = 1) {
  assert(Math.abs(a - b) <= tolerance, `${label}: native geometry changed`);
}
function samples(metric, positive) {
  assert(
    Array.isArray(metric.measurements) && metric.measurements.length === 3,
    'Exactly three SDK samples required',
  );
  assert(
    metric.measurements.every((v) => finite(v) && (positive ? v > 0 : v >= 0)),
    'Invalid SDK measurement',
  );
  return [...metric.measurements];
}
/** A passed XCTest and a scroll-duration value cannot establish frame smoothness.
 * Preserve that distinction even when the SDK silently omits a requested metric.
 */
export function summarizeButtonGroupScrolling(
  { run, build, summary, metrics, attachments },
  { requireHitches = false } = {},
) {
  assert(
    run.exitCode === 0 &&
      run.installedArtifactVerified === true &&
      run.installedArtifactVerifiedAfterTest === true &&
      run.originalSessionRestored === true,
    'Verified native run/restoration required',
  );
  assert(
    build.exitCode === 0 && build.sourceUnchangedDuringBuild === true,
    'Verified unchanged-source build required',
  );
  assert(hash(build.sourceId) && run.sourceId === build.sourceId, 'Source fingerprint mismatch');
  for (const key of ['swiftDriverSha256', 'bundleSHA256'])
    assert(hash(build[key]) && run[key] === build[key], `${key}: artifact mismatch`);
  assert(
    hash(build.appExecutableSHA256) && run.nativeAppExecutableSHA256 === build.appExecutableSHA256,
    'Installed executable mismatch',
  );
  assert(run.nativeConfiguration === 'Release', 'Release configuration required');
  assert(
    Array.isArray(build.command) &&
      build.command.every((v) => typeof v === 'string') &&
      option(build.command, '-configuration') === 'Release',
    'Actual Release configuration command required',
  );
  for (const flag of ['SWIFT_OPTIMIZATION_LEVEL=-O', 'GCC_OPTIMIZATION_LEVEL=s'])
    assert.deepEqual(
      build.command.filter((v) => v.startsWith(flag.split('=')[0] + '=')),
      [flag],
      'Actual Release optimization command required',
    );
  assert(
    summary.result === 'Passed' &&
      summary.passedTests === 4 &&
      summary.totalTestCount === 4 &&
      summary.failedTests === 0 &&
      summary.skippedTests === 0 &&
      summary.expectedFailures === 0,
    'Complete four-case native matrix required',
  );
  assert(
    Array.isArray(metrics) && metrics.length === 4,
    'Exactly four metric test records required',
  );
  assert(
    Array.isArray(attachments) && attachments.length === 16,
    'Four native phase receipts per case required',
  );
  const results = {},
    devices = new Set();
  for (const test of metrics) {
    const name = testName(test.testIdentifier),
      expected = scrollCases[name];
    assert(expected && !results[name], 'Unknown or duplicate metric case');
    const [mode, direction] = expected;
    assert(test.testRuns?.length === 1, 'One unretried native run per case required');
    const native = test.testRuns[0];
    assert(
      typeof native.device?.deviceId === 'string' && native.device.deviceId.length > 0,
      'Native device identity required',
    );
    devices.add(native.device.deviceId);
    assert(Array.isArray(native.metrics), 'Native SDK metrics required');
    const duration = native.metrics.filter((m) => m.identifier === durationID);
    assert(
      duration.length === 1 && duration[0].unitOfMeasurement === 's',
      'Native scrolling/deceleration duration required',
    );
    const durationSeconds = samples(duration[0], true);
    const hitchMetrics = native.metrics.filter(
      (m) => typeof m.identifier === 'string' && /hitch/i.test(m.identifier),
    );
    const hitches = hitchMetrics.map((m) => {
      assert(
        typeof m.displayName === 'string' &&
          typeof m.unitOfMeasurement === 'string' &&
          m.unitOfMeasurement.length > 0,
        'Named native hitch units required',
      );
      return {
        identifier: m.identifier,
        name: m.displayName,
        unit: m.unitOfMeasurement,
        values: samples(m, false),
      };
    });
    const records = attachments.filter((a) => testName(a.testIdentifier) === name);
    assert(records.length === 4, `${name}: four phase receipts required`);
    const seen = new Set(),
      cohorts = new Set(),
      observed = [];
    for (const { deviceId, report: r } of records) {
      assert(deviceId === native.device.deviceId, 'Attachment/metric device mismatch');
      assert(
        r.protocol === 'button-group-scrolling-v1' && r.mode === mode && r.direction === direction,
        'Native receipt configuration mismatch',
      );
      assert(phases.includes(r.phase) && !seen.has(r.phase), 'Missing or duplicate native phase');
      seen.add(r.phase);
      assert(
        r.preflight?.expectedSourceId === build.sourceId &&
          r.preflight.nativeAppExecutableSHA256 === build.appExecutableSHA256 &&
          r.preflight.nativeConfiguration === 'Release',
        'Native receipt preflight mismatch',
      );
      const value = r.receipt;
      assert(
        value?.schemaVersion === 1 &&
          value.workload === 'layout-root-v1' &&
          value.family === 'button-group' &&
          value.mode === mode &&
          value.operation === 'update' &&
          value.updateEpoch === 0 &&
          value.sourceId === build.sourceId,
        'Wrong workload receipt',
      );
      assert(
        value.ready === true && value.dev === false && value.hermes === true,
        'Ready production Hermes required',
      );
      for (const key of ['row', 'error', 'alternateStyle', 'alternateTheme'])
        assert(value[key] === false, 'The initial scrolling configuration changed');
      for (const [key, n] of Object.entries({
        rowCount: 100,
        mounts: 100,
        cleanups: 0,
        rootAttachments: 100,
        rootCleanups: 0,
        activeRows: 100,
        activeRoots: 100,
        completedRows: 100,
        rowEpochCommits: 100,
        rowUpdateCommits: 0,
        nativeActionCount: 200,
        untouchedActionCount: 199,
      }))
        assert(value[key] === n, `${key}: native lifecycle or action state differs`);
      const cohort =
        typeof value.cohortId === 'string' &&
        value.cohortId.match(/^layout-root-cohort-(\d+)-(rn|mui)-button-group-update-100$/);
      assert(
        cohort &&
          cohort[2] === mode &&
          Number.isSafeInteger(Number(cohort[1])) &&
          !cohorts.has(Number(cohort[1])),
        'Malformed, mismatched or reused native cohort',
      );
      cohorts.add(Number(cohort[1]));
      const before = rect(r.firstRowBefore, 'first row before'),
        after = rect(r.firstRowAfter, 'first row after');
      const vpBefore = rect(r.viewportBefore, 'viewport before'),
        vpAfter = rect(r.viewportAfter, 'viewport after');
      for (const key of ['x', 'y', 'width', 'height'])
        close(vpBefore[key], vpAfter[key], 'intended inner viewport');
      for (const key of ['x', 'width', 'height']) close(before[key], after[key], 'retained row');
      close(before.height, 48, 'initial row height');
      assert(
        before.y <= vpBefore.y + 1 && after.y <= vpAfter.y + 1,
        'A settled row cannot be beyond the content start',
      );
      if (direction === 'toward-end') close(before.y, vpBefore.y, 'fresh top-of-content row');
      const travel = (after.y - before.y) * (direction === 'toward-start' ? 1 : -1);
      assert(
        travel >= Math.max(44, vpBefore.height * 0.5),
        'Native scrolling moved too little or in the wrong direction',
      );
      assert(finite(r.travel), 'Native travel required');
      close(r.travel, travel, 'reported scroll travel', 0.000001);
      observed.push({
        phase: r.phase,
        cohortSample: Number(cohort[1]),
        travel,
        firstRowBefore: before,
        firstRowAfter: after,
        viewportBefore: vpBefore,
        viewportAfter: vpAfter,
      });
    }
    const ordered = phases.map((p) => observed.find((r) => r.phase === p));
    assert(
      ordered.every((r, i) => i === 0 || r.cohortSample > ordered[i - 1].cohortSample),
      'Native cohorts are not increasing in phase order',
    );
    results[name] = {
      mode,
      direction,
      durationSeconds,
      hitchMetrics: hitches,
      nativePhases: ordered,
    };
  }
  assert(devices.size === 1, 'Cross-device samples must not be combined');
  assert(summary.devicesAndConfigurations?.length === 1, 'One native summary device required');
  const device = summary.devicesAndConfigurations[0].device;
  assert(devices.has(device.deviceId), 'Summary/metric device mismatch');
  serialCommand(run.command, device.deviceId);
  for (const key of ['modelName', 'platform', 'osVersion', 'architecture'])
    assert(
      typeof device[key] === 'string' && device[key].length > 0,
      'Native environment description required',
    );
  const hitchesPresentInEveryCase = Object.values(results).every((r) => r.hitchMetrics.length > 0);
  if (requireHitches)
    assert(
      hitchesPresentInEveryCase,
      'Requested hitch telemetry is absent; duration is not a substitute',
    );
  return {
    schemaVersion: 1,
    protocol: 'button-group-scrolling-v1',
    status: 'native-scroll-behavior-verified',
    environment: {
      model: device.modelName,
      platform: device.platform,
      osVersion: device.osVersion,
      architecture: device.architecture,
    },
    sourceId: build.sourceId,
    nativeAppExecutableSHA256: build.appExecutableSHA256,
    bundleSHA256: build.bundleSHA256,
    swiftDriverSha256: build.swiftDriverSha256,
    nativeConfiguration: 'Release',
    rowCount: 100,
    nativeActionsPerCohort: 200,
    reportedSamplesPerCase: 3,
    discardedWarmupsPerCase: 1,
    performance: {
      gate: 'incomplete',
      hitchTelemetry: hitchesPresentInEveryCase ? 'present-uninterpreted' : 'missing',
      inputLatency: 'unmeasured',
      durationInterpretation:
        'Native gesture/deceleration interval, not a library speed or smoothness score',
    },
    cases: results,
  };
}

/** Read the SDK exports without copying arbitrary paths or private build fields
 * into the shareable result. Export metrics-raw.json with xcresulttool first.
 */
export async function readButtonGroupScrollExports(directory, buildFile) {
  const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
  const [run, summary, metrics, manifest, build] = await Promise.all([
    json(join(directory, 'run.json')),
    json(join(directory, 'summary.json')),
    json(join(directory, 'metrics-raw.json')),
    json(join(directory, 'attachments/manifest.json')),
    json(buildFile),
  ]);
  assert(Array.isArray(manifest), 'Native attachment manifest required');
  const attachments = [],
    files = new Set();
  for (const test of manifest) {
    for (const entry of test.attachments ?? []) {
      if (
        !entry.suggestedHumanReadableName?.startsWith('button-group-scroll-') ||
        !entry.exportedFileName?.endsWith('.json')
      )
        continue;
      const name = entry.exportedFileName;
      assert(
        name === basename(name) && !name.includes('\\') && !files.has(name),
        'Unsafe or duplicate native attachment path',
      );
      assert(
        entry.isAssociatedWithFailure === false,
        'Failed native attachment cannot establish behavior',
      );
      files.add(name);
      attachments.push({
        testIdentifier: test.testIdentifier,
        deviceId: entry.deviceId,
        report: await json(join(directory, 'attachments', name)),
      });
    }
  }
  return { run, build, summary, metrics, attachments };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = {},
      args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
      const key = args[i];
      if (key === '--require-hitches') {
        assert(!options[key], 'Duplicate option');
        options[key] = true;
      } else {
        assert(
          ['--run', '--build', '--output'].includes(key) &&
            !options[key] &&
            args[i + 1] &&
            !args[i + 1].startsWith('--'),
          'Expected --run DIR --build FILE [--output FILE] [--require-hitches]',
        );
        options[key] = args[++i];
      }
    }
    assert(options['--run'] && options['--build'], 'Provide --run DIR and --build FILE');
    const input = await readButtonGroupScrollExports(options['--run'], options['--build']);
    const result = summarizeButtonGroupScrolling(input, {
      requireHitches: Boolean(options['--require-hitches']),
    });
    const encoded = JSON.stringify(result, null, 2) + '\n';
    if (options['--output']) await writeFile(options['--output'], encoded);
    else process.stdout.write(encoded);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
