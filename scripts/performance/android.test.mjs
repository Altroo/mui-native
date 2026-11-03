// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { benchmarkPackage, distribution, prepare, summarize } from './android.mjs';

const sourceId = 'a'.repeat(64);
function fixture() {
  return {
    schemaVersion: 1,
    status: 'passed',
    package: benchmarkPackage,
    identity: {
      schemaVersion: 1,
      workload: 'popper-scroll-v1',
      sourceId,
      dev: false,
      hermes: true,
    },
    device: {
      model: 'synthetic',
      hardware: 'synthetic',
      fingerprint: 'synthetic/build',
      sdk: 37,
      os: '17',
      density: 2.625,
      fontScale: 1,
    },
    refreshRateHz: 60,
    protocol: {
      inputDriver: 'UiAutomation.injectInputEvent',
      pointerType: 'finger',
      moveInjection: 'asynchronous',
      stationarySamples: 3,
      warmupTrialsPerMode: 1,
      measuredTrialsPerMode: 3,
      tapSamplesPerTrial: 20,
      scrollCyclesPerTrial: 3,
      dragDistanceDp: 64,
      dragDurationMs: 400,
      releaseHoldMs: 120,
      maxMoveLatenessMs: 40,
    },
    trials: ['rn', 'mui', 'mui', 'rn', 'rn', 'mui', 'mui', 'rn'].map((mode, index) => ({
      mode,
      round: Math.floor(index / 2),
      warmup: index < 2,
      listenerReportDrops: 0,
      postEndSentinel: true,
      gestures: Array.from({ length: 6 }, (_, index) => ({
        distanceDp: index % 2 === 0 ? -64 : 64,
        moveDurationMs: 400,
        maxMoveLatenessMs: 0,
        scrollBeforePx: index % 2 === 0 ? 0 : 140,
        scrollAtReleasePx: index % 2 === 0 ? 140 : 0,
        scrollAfterPx: index % 2 === 0 ? 140 : 0,
        counterBefore: 20,
        counterAfter: 20,
      })),
      tapUpInjectionToCounterOnDrawMs: Array(20).fill(index < 2 ? 999 : mode === 'mui' ? 12 : 10),
      scrollDurationMs: 3000,
      frames: Array.from({ length: 21 }, (_, frame) => [
        frame * 16666667,
        frame === 0 ? 1e9 : mode === 'mui' ? 2e7 : 1e7,
        16666667,
        frame === 0 ? 1 : 0,
      ]),
      cpuBefore: {
        processMs: 1,
        uiThreadNs: 100,
        jsThreads: [{ tid: '20', name: 'mqt_v_js', ticks: 1 }],
        clockTicksPerSecond: 100,
      },
      cpuAfter: {
        processMs: 21,
        uiThreadNs: 2000100,
        jsThreads: [{ tid: '20', name: 'mqt_v_js', ticks: 3 }],
        clockTicksPerSecond: 100,
      },
      pssBeforeKb: 120000,
      pssAfterKb: 121000,
    })),
    storage: {
      appBytes: 1000000,
      dataBytes: 200000,
      cacheBytes: 10000,
      scope: 'whole benchmark app, both modes bundled',
    },
  };
}
const encode = (report) =>
  'INSTRUMENTATION_RESULT: report=' + JSON.stringify(report) + '\nINSTRUMENTATION_CODE: -1\n';

test('empirical nearest-rank percentiles preserve outliers and reject missing/nonfinite samples', () => {
  assert.deepEqual(distribution([4, 1, 2, 100]), { count: 4, p50: 2, p95: 100, worst: 100 });
  for (const samples of [[], [NaN], [Infinity], [-1]]) assert.throws(() => distribution(samples));
});

test('comparison excludes warmup and first-draw frames and names deadline misses accurately', () => {
  const result = summarize(encode(fixture()), sourceId);
  assert.equal(result.modes.rn.tapUpInjectionToCounterOnDrawMs.count, 60);
  assert.equal(result.modes.rn.tapUpInjectionToCounterOnDrawMs.worst, 10);
  assert.equal(result.modes.mui.scrollFrameTotalMs.worst, 20);
  assert.equal(result.modes.rn.frameDeadlineMisses, 0);
  assert.equal(result.modes.mui.frameDeadlineMisses, 60);
  assert.equal(result.modes.mui.nonFirstDrawFrames, 60);
  assert.equal(result.modes.rn.jsThreadCpuMs.p50, 20);
  assert.deepEqual(
    result.reviewFlags.map((flag) => flag.metric),
    ['tapUpInjectionToCounterOnDrawMs', 'scrollFrameTotalMs'],
  );
});

test('unknown or replaced JS thread never becomes a misleading zero CPU result', () => {
  for (const replace of [
    [],
    [{ tid: 'new', name: 'mqt_v_js', ticks: 3 }],
    [{ tid: '20', name: 'mqt_v_js', ticks: -1 }],
  ]) {
    const report = fixture();
    report.trials[3].cpuAfter.jsThreads = replace;
    assert.equal(summarize(encode(report), sourceId).modes.rn.jsThreadCpuMs, null);
  }
});

test('missing, malformed or renamed JS identities remain unknown CPU samples', () => {
  for (const identity of [
    {},
    { tid: null },
    { tid: '' },
    { tid: '0' },
    { tid: 'not-a-tid' },
    { tid: '20', name: undefined },
    { tid: '20', name: 'unrelated-worker' },
  ]) {
    const report = fixture();
    for (const snapshot of ['cpuBefore', 'cpuAfter'])
      report.trials[3][snapshot].jsThreads[0] = {
        ...report.trials[3][snapshot].jsThreads[0],
        tid: undefined,
        ...identity,
      };
    assert.equal(summarize(encode(report), sourceId).modes.rn.jsThreadCpuMs, null);
  }
  const renamed = fixture();
  renamed.trials[3].cpuAfter.jsThreads[0].name = 'mqt_js';
  assert.equal(summarize(encode(renamed), sourceId).modes.rn.jsThreadCpuMs, null);
});

test('device, storage and observed gesture evidence must be complete and consistent', () => {
  for (const mutate of [
    (r) => {
      delete r.device;
    },
    (r) => {
      r.device.density = 0;
    },
    (r) => {
      r.device.sdk = 30;
    },
    (r) => {
      r.device.fingerprint = '';
    },
    (r) => {
      r.refreshRateHz = 0;
    },
    (r) => {
      delete r.storage;
    },
    (r) => {
      r.storage.cacheBytes = -1;
    },
    (r) => {
      r.storage.appBytes = '1000000';
    },
    (r) => {
      r.storage.scope = 'isolated library size';
    },
    (r) => {
      delete r.trials[0].gestures[0].scrollBeforePx;
    },
    (r) => {
      delete r.trials[0].gestures[0].scrollAtReleasePx;
    },
    (r) => {
      delete r.trials[0].gestures[0].scrollAfterPx;
    },
    (r) => {
      r.trials[0].gestures[0].scrollAfterPx = 0;
    },
    (r) => {
      r.trials[0].gestures[0].scrollAfterPx = 40;
    },
    (r) => {
      r.trials[0].gestures[0].scrollAtReleasePx = 0;
    },
    (r) => {
      r.trials[0].gestures[0].counterBefore = 0;
    },
    (r) => {
      r.trials[0].gestures[0].counterAfter = 19;
    },
    (r) => {
      delete r.trials[0].gestures[0].counterAfter;
    },
    (r) => {
      r.trials[0].cpuBefore.uiThreadNs = 1.5;
    },
  ]) {
    const report = fixture();
    mutate(report);
    assert.throws(() => summarize(encode(report), sourceId));
  }
});

test('failure, ambiguous output, wrong build/engine and incomplete trials cannot produce a comparison', () => {
  const valid = encode(fixture());
  for (const output of [
    valid + valid,
    valid.replace('CODE: -1', 'CODE: 0'),
    valid + 'INSTRUMENTATION_FAILED: stopped\n',
    valid + 'INSTRUMENTATION_RESULT: Error=crash\n',
  ])
    assert.throws(() => summarize(output, sourceId));
  for (const mutate of [
    (r) => {
      r.status = 'failed';
    },
    (r) => {
      r.identity.dev = true;
    },
    (r) => {
      r.identity.hermes = false;
    },
    (r) => {
      r.identity.sourceId = 'b'.repeat(64);
    },
    (r) => {
      r.package = 'dev.altroo.muinative.catalog';
    },
    (r) => {
      r.trials.pop();
    },
    (r) => {
      r.trials[2].warmup = true;
    },
    (r) => {
      r.trials[2].mode = 'rn';
    },
    (r) => {
      r.protocol.dragDistanceDp = 0;
    },
    (r) => {
      r.protocol.inputDriver = 'global asynchronous injection';
    },
    (r) => {
      r.protocol.pointerType = 'mouse';
    },
    (r) => {
      r.protocol.moveInjection = 'synchronous';
    },
    (r) => {
      r.protocol.stationarySamples = 1;
    },
  ]) {
    const report = fixture();
    mutate(report);
    assert.throws(() => summarize(encode(report), sourceId));
  }
});

test('collector loss and corrupt/missing samples fail closed even during warmup', () => {
  for (const mutate of [
    (r) => {
      r.trials[0].listenerReportDrops = 1;
    },
    (r) => {
      r.trials[0].postEndSentinel = false;
    },
    (r) => {
      r.trials[0].gestures[0].moveDurationMs = 480;
    },
    (r) => {
      r.trials[0].gestures[0].maxMoveLatenessMs = 41;
    },
    (r) => {
      r.trials[3].frames = [];
    },
    (r) => {
      r.trials[3].frames[0][2] = -1;
    },
    (r) => {
      r.trials[3].frames[0][0] = 9e15;
    },
    (r) => {
      r.trials[3].tapUpInjectionToCounterOnDrawMs.pop();
    },
    (r) => {
      r.trials[3].pssAfterKb = 0;
    },
    (r) => {
      r.trials[3].cpuAfter.processMs = 0;
    },
  ]) {
    const report = fixture();
    mutate(report);
    assert.throws(() => summarize(encode(report), sourceId));
  }
});

test('preparation targets only benchmark release tests and preserves manual edits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-release-prepare-'));
  try {
    await mkdir(join(directory, 'app'));
    const gradlePath = join(directory, 'app/build.gradle');
    await writeFile(
      gradlePath,
      "android { defaultConfig { applicationId 'dev.altroo.muinative.catalog' } }\n",
    );
    await assert.rejects(prepare(directory), /not the catalog/);
    await writeFile(
      gradlePath,
      "android { defaultConfig { applicationId '" + benchmarkPackage + "' } }\n",
    );
    const result = await prepare(directory);
    const original = await readFile(gradlePath, { encoding: 'utf8' });
    assert.match(original, /testBuildType 'release'/);
    await prepare(directory);
    assert.equal(await readFile(gradlePath, { encoding: 'utf8' }), original);
    await writeFile(result.target, '// local test change');
    await assert.rejects(prepare(directory), /Preserve edits/);
    assert.equal(await readFile(result.target, { encoding: 'utf8' }), '// local test change');
    await writeFile(
      gradlePath,
      "applicationId '" + benchmarkPackage + "'\ntestBuildType 'debug'\n",
    );
    await assert.rejects(prepare(directory), /Preserve existing/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
