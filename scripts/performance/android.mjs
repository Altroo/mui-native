// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { root } from './source.mjs';

export const benchmarkPackage = 'dev.altroo.muinative.benchmark';
export const benchmarkRunner = benchmarkPackage + '.test.PopperBenchmark';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/** Add tests only to the generated benchmark app, preserving foreign configuration/edits. */
export async function prepare(project) {
  const gradlePath = join(project, 'app/build.gradle');
  let gradle = await readFile(gradlePath, { encoding: 'utf8' });
  if (!gradle.includes("applicationId '" + benchmarkPackage + "'"))
    throw Error('Expected the generated benchmark app, not the catalog');
  const block = `// MUI release benchmark instrumentation\nandroid {\n  testBuildType 'release'\n  defaultConfig { testInstrumentationRunner '${benchmarkRunner}' }\n}\ntasks.matching { it.name == 'createBundleReleaseJsAndAssets' }.configureEach {\n  inputs.property('muiBenchmarkSourceId', System.getenv('EXPO_PUBLIC_MUI_BENCHMARK_SOURCE_ID') ?: 'unidentified')\n}\n`;
  if (
    gradle.includes(block) &&
    ((gradle.match(/testInstrumentationRunner/g) ?? []).length !== 1 ||
      (gradle.match(/testBuildType/g) ?? []).length !== 1)
  )
    throw Error('Preserve conflicting instrumentation configuration');
  if (!gradle.includes(block)) {
    if (
      /testInstrumentationRunner|testBuildType|MUI release benchmark instrumentation/.test(gradle)
    )
      throw Error('Preserve existing instrumentation configuration');
    gradle += '\n' + block;
  }
  const source = await readFile(join(root, 'tests/native/performance/PopperBenchmark.java'), {
    encoding: 'utf8',
  });
  const target = join(
    project,
    'app/src/androidTest/java/dev/altroo/muinative/benchmark/test/PopperBenchmark.java',
  );
  const ownership = join(project, '.mui-release-benchmark.json');
  let previous;
  try {
    previous = await readFile(target, { encoding: 'utf8' });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (previous !== undefined && previous !== source) {
    let record;
    try {
      record = JSON.parse(await readFile(ownership, { encoding: 'utf8' }));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (record?.sourceSha256 !== sha256(previous))
      throw Error('Preserve edits to generated benchmark source');
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, source);
  await writeFile(gradlePath, gradle);
  await writeFile(ownership, JSON.stringify({ sourceSha256: sha256(source) }) + '\n');
  return { project, target, runner: benchmarkRunner };
}

export function distribution(samples) {
  if (!samples.length || samples.some((value) => !Number.isFinite(value) || value < 0))
    throw Error('Invalid metric samples');
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = (fraction) => sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
  return { count: sorted.length, p50: rank(0.5), p95: rank(0.95), worst: sorted.at(-1) };
}

function ensure(condition, message) {
  if (!condition) throw Error(message);
}
const nonnegative = (value) => Number.isFinite(value) && value >= 0;
const nonnegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;
const positive = (value) => Number.isFinite(value) && value > 0;
// Queue names can be duplicated. CPU deltas need a concrete, stable kernel task.
const nativeJsThread = (thread) =>
  typeof thread?.tid === 'string' &&
  /^[1-9]\d*$/.test(thread.tid) &&
  Number.isSafeInteger(Number(thread.tid)) &&
  ['mqt_v_js', 'mqt_js'].includes(thread.name) &&
  nonnegativeInteger(thread.ticks);

/** Refuse partial/wrong-build/lossy runs before producing comparative statistics. */
export function summarize(output, sourceId) {
  ensure(/^[a-f0-9]{64}$/.test(sourceId), 'Expected a source fingerprint');
  const matches = [...output.matchAll(/^INSTRUMENTATION_RESULT: report=(.*)\r?$/gm)];
  ensure(matches.length === 1, 'No unambiguous benchmark report');
  const report = JSON.parse(matches[0][1]);
  ensure(
    /^INSTRUMENTATION_CODE: -1\r?$/m.test(output) &&
      [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length === 1 &&
      !/^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output),
    'Instrumentation failed',
  );
  ensure(
    report.schemaVersion === 1 &&
      report.status === 'passed' &&
      report.package === benchmarkPackage &&
      report.identity?.schemaVersion === 1 &&
      report.identity.workload === 'popper-scroll-v1' &&
      report.identity.sourceId === sourceId &&
      report.identity.dev === false &&
      report.identity.hermes === true,
    'Wrong release, engine, source or workload',
  );
  ensure(
    ['model', 'hardware', 'fingerprint', 'os'].every(
      (key) => typeof report.device?.[key] === 'string' && report.device[key].trim().length > 0,
    ) &&
      Number.isSafeInteger(report.device.sdk) &&
      report.device.sdk >= 31 &&
      positive(report.device.density) &&
      positive(report.device.fontScale) &&
      positive(report.refreshRateHz),
    'Missing or invalid device metadata',
  );
  ensure(
    report.storage?.scope === 'whole benchmark app, both modes bundled' &&
      ['appBytes', 'dataBytes', 'cacheBytes'].every((key) =>
        nonnegativeInteger(report.storage[key]),
      ),
    'Missing or invalid whole-app storage metadata',
  );
  ensure(
    report.protocol?.inputDriver === 'UiAutomation.injectInputEvent' &&
      report.protocol.pointerType === 'finger' &&
      report.protocol.moveInjection === 'asynchronous' &&
      report.protocol.stationarySamples === 3 &&
      report.protocol.warmupTrialsPerMode === 1 &&
      report.protocol.measuredTrialsPerMode === 3 &&
      report.protocol.tapSamplesPerTrial === 20 &&
      report.protocol.scrollCyclesPerTrial === 3 &&
      report.protocol.dragDistanceDp === 64 &&
      report.protocol.dragDurationMs === 400 &&
      report.protocol.releaseHoldMs === 120 &&
      report.protocol.maxMoveLatenessMs === 40,
    'Unknown measurement protocol',
  );
  ensure(Array.isArray(report.trials) && report.trials.length === 8, 'Missing trials');
  const order = ['rn', 'mui', 'mui', 'rn', 'rn', 'mui', 'mui', 'rn'];
  report.trials.forEach((trial, index) => {
    ensure(
      trial.mode === order[index] &&
        trial.round === Math.floor(index / 2) &&
        trial.warmup === index < 2,
      'Wrong trial order/warmup',
    );
    ensure(trial.postEndSentinel === true, 'Missing post-measurement frame sentinel');
    // Requested distance alone does not prove native delivery or settling.
    ensure(
      Array.isArray(trial.gestures) &&
        trial.gestures.length === 6 &&
        trial.gestures.every(
          (gesture, index) =>
            gesture.distanceDp === (index % 2 === 0 ? -64 : 64) &&
            nonnegative(gesture.moveDurationMs) &&
            gesture.moveDurationMs >= 400 &&
            gesture.moveDurationMs <= 440 &&
            nonnegative(gesture.maxMoveLatenessMs) &&
            gesture.maxMoveLatenessMs <= 40 &&
            ['scrollBeforePx', 'scrollAtReleasePx', 'scrollAfterPx'].every((key) =>
              nonnegativeInteger(gesture[key]),
            ) &&
            Math.abs(gesture.scrollAfterPx - gesture.scrollBeforePx) >=
              24 * report.device.density &&
            Math.sign(gesture.scrollAfterPx - gesture.scrollBeforePx) ===
              -Math.sign(gesture.distanceDp) &&
            Math.abs(gesture.scrollAfterPx - gesture.scrollAtReleasePx) <=
              2 * report.device.density &&
            gesture.counterBefore === report.protocol.tapSamplesPerTrial &&
            gesture.counterAfter === report.protocol.tapSamplesPerTrial,
        ),
      'Invalid or excessively late native gestures',
    );
    ensure(
      trial.listenerReportDrops === 0,
      'Frame collector lost reports; preserve raw output and rerun after diagnosis',
    );
    ensure(
      nonnegative(trial.scrollDurationMs) &&
        trial.scrollDurationMs > 0 &&
        Array.isArray(trial.tapUpInjectionToCounterOnDrawMs) &&
        trial.tapUpInjectionToCounterOnDrawMs.length === 20 &&
        trial.tapUpInjectionToCounterOnDrawMs.every(nonnegative),
      'Invalid input or scroll samples',
    );
    ensure(
      Array.isArray(trial.frames) &&
        trial.frames.length >= 20 &&
        trial.frames.every(
          (frame) =>
            Array.isArray(frame) &&
            frame.length === 4 &&
            frame.every(Number.isSafeInteger) &&
            frame[0] >= 0 &&
            frame[0] <= trial.scrollDurationMs * 1e6 &&
            frame[1] >= 0 &&
            frame[2] > 0 &&
            [0, 1].includes(frame[3]),
        ),
      'Invalid frame samples',
    );
    ensure(
      nonnegative(trial.pssBeforeKb) &&
        trial.pssBeforeKb > 0 &&
        nonnegative(trial.pssAfterKb) &&
        trial.pssAfterKb > 0,
      'Invalid PSS samples',
    );
    for (const metric of ['processMs', 'uiThreadNs'])
      ensure(
        nonnegativeInteger(trial.cpuBefore?.[metric]) &&
          nonnegativeInteger(trial.cpuAfter?.[metric]) &&
          trial.cpuAfter[metric] >= trial.cpuBefore[metric],
        'Invalid CPU samples',
      );
  });
  function summarizeMode(mode) {
    const trials = report.trials.filter((trial) => trial.mode === mode && !trial.warmup);
    const frames = trials.flatMap((trial) => trial.frames.filter((frame) => frame[3] === 0));
    const jsCpu = trials.map((trial) => {
      const before = trial.cpuBefore,
        after = trial.cpuAfter;
      const first = before.jsThreads?.[0],
        last = after.jsThreads?.[0];
      if (
        before.jsThreads?.length !== 1 ||
        after.jsThreads?.length !== 1 ||
        !nativeJsThread(first) ||
        !nativeJsThread(last) ||
        first.tid !== last.tid ||
        first.name !== last.name ||
        !Number.isSafeInteger(before.clockTicksPerSecond) ||
        before.clockTicksPerSecond <= 0 ||
        before.clockTicksPerSecond !== after.clockTicksPerSecond ||
        last.ticks < first.ticks
      )
        return null;
      return ((last.ticks - first.ticks) * 1000) / before.clockTicksPerSecond;
    });
    return {
      trials: trials.length,
      gestureMoveDurationMs: distribution(
        trials.flatMap((trial) => trial.gestures.map((gesture) => gesture.moveDurationMs)),
      ),
      gestureMaxMoveLatenessMs: distribution(
        trials.flatMap((trial) => trial.gestures.map((gesture) => gesture.maxMoveLatenessMs)),
      ),
      tapUpInjectionToCounterOnDrawMs: distribution(
        trials.flatMap((trial) => trial.tapUpInjectionToCounterOnDrawMs),
      ),
      scrollFrameTotalMs: distribution(frames.map((frame) => frame[1] / 1e6)),
      frameDeadlineMisses: frames.filter((frame) => frame[1] >= frame[2]).length,
      nonFirstDrawFrames: frames.length,
      scrollDurationMs: distribution(trials.map((trial) => trial.scrollDurationMs)),
      instrumentedProcessCpuMs: distribution(
        trials.map((trial) => trial.cpuAfter.processMs - trial.cpuBefore.processMs),
      ),
      uiThreadCpuMs: distribution(
        trials.map((trial) => (trial.cpuAfter.uiThreadNs - trial.cpuBefore.uiThreadNs) / 1e6),
      ),
      jsThreadCpuMs: jsCpu.some((value) => value === null) ? null : distribution(jsCpu),
      settledPssKb: distribution(trials.map((trial) => trial.pssAfterKb)),
      pssSnapshotsKb: trials.map((trial) => ({
        before: trial.pssBeforeKb,
        after: trial.pssAfterKb,
      })),
    };
  }
  const results = {
    schemaVersion: 1,
    sourceId,
    device: report.device,
    refreshRateHz: report.refreshRateHz,
    modes: { rn: summarizeMode('rn'), mui: summarizeMode('mui') },
    reviewFlags: [],
  };
  for (const metric of ['tapUpInjectionToCounterOnDrawMs', 'scrollFrameTotalMs']) {
    const baseline = results.modes.rn[metric].p95,
      mui = results.modes.mui[metric].p95;
    if (mui > baseline * 1.1)
      results.reviewFlags.push({ metric, baselineP95: baseline, muiP95: mui });
  }
  results.storage = report.storage;
  results.limitations = [
    'Simple bottom-start placement only; both implementations and MUI theme are in the same binary.',
    'Input metric ends at the counter OnDraw callback before drawing, not display presentation.',
    'FrameMetrics TOTAL_DURATION versus DEADLINE counts deadline misses, not dropped display frames.',
    'In-process instrumentation and collector overhead remain in process CPU/PSS and UI thread samples.',
    'CPU covers the scroll phase including fixed correctness checks and settling pauses, not input samples.',
    'PSS before/after snapshots are neither peak memory nor evidence of a sustained-growth plateau.',
    'Unknown JS thread identity is null, never zero. Thread CPU has kernel tick resolution.',
    'An emulator run is exploratory and does not certify physical-device performance.',
  ];
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [action, argument, sourceId] = process.argv.slice(2);
  if (action === 'prepare' && typeof argument === 'string' && argument && !sourceId)
    console.log(JSON.stringify(await prepare(resolve(argument))));
  else if (
    action === 'summarize' &&
    typeof argument === 'string' &&
    argument &&
    typeof sourceId === 'string' &&
    sourceId
  )
    console.log(
      JSON.stringify(summarize(await readFile(argument, { encoding: 'utf8' }), sourceId), null, 2),
    );
  else throw Error('Usage: android.mjs prepare PROJECT | summarize RAW_LOG SOURCE_ID');
}
