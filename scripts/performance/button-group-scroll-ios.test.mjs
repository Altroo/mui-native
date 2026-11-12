// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  scrollCases,
  summarizeButtonGroupScrolling,
  readButtonGroupScrollExports,
} from './button-group-scroll-ios.mjs';

// Synthetic parser inputs follow the observed SDK schema. They are not native
// measurements and never supply fabricated hitch samples for a success claim.
function fixture() {
  const source = 'a'.repeat(64),
    executable = 'b'.repeat(64),
    bundle = 'c'.repeat(64),
    driver = 'd'.repeat(64);
  const build = {
    exitCode: 0,
    sourceUnchangedDuringBuild: true,
    sourceId: source,
    appExecutableSHA256: executable,
    bundleSHA256: bundle,
    swiftDriverSha256: driver,
    command: [
      'xcodebuild',
      '-configuration',
      'Release',
      'SWIFT_OPTIMIZATION_LEVEL=-O',
      'GCC_OPTIMIZATION_LEVEL=s',
    ],
  };
  const run = {
    exitCode: 0,
    installedArtifactVerified: true,
    installedArtifactVerifiedAfterTest: true,
    originalSessionRestored: true,
    sourceId: source,
    nativeAppExecutableSHA256: executable,
    bundleSHA256: bundle,
    swiftDriverSha256: driver,
    nativeConfiguration: 'Release',
    command: [
      'xcodebuild',
      '-xctestrun',
      'prepared.xctestrun',
      '-destination',
      'id=synthetic-device',
      '-parallel-testing-enabled',
      'NO',
      '-maximum-concurrent-test-simulator-destinations',
      '1',
      ...Object.keys(scrollCases).map(
        (name) => `-only-testing:LayoutRootPerformanceUITests/LayoutRootPerformanceUITests/${name}`,
      ),
      'test-without-building',
    ],
  };
  const device = {
    deviceId: 'synthetic-device',
    modelName: 'Synthetic model',
    platform: 'iOS Simulator',
    osVersion: '27.0',
    architecture: 'arm64',
  };
  const summary = {
    result: 'Passed',
    passedTests: 4,
    totalTestCount: 4,
    failedTests: 0,
    skippedTests: 0,
    expectedFailures: 0,
    devicesAndConfigurations: [{ device }],
  };
  const metrics = [],
    attachments = [];
  for (const [name, [mode, direction]] of Object.entries(scrollCases)) {
    const testIdentifier = `LayoutRootPerformanceUITests/${name}()`;
    metrics.push({
      testIdentifier,
      testRuns: [
        {
          device,
          metrics: [
            {
              identifier:
                'com.apple.dt.XCTMetric_OSSignpost-Scroll_DraggingAndDeceleration.duration',
              displayName: 'Duration (Scroll_DraggingAndDeceleration)',
              unitOfMeasurement: 's',
              measurements: [2.2, 2.3, 2.4],
            },
          ],
        },
      ],
    });
    for (const [i, phase] of ['warmup-discarded', 'sample-1', 'sample-2', 'sample-3'].entries()) {
      const beforeY = direction === 'toward-end' ? 400 : -20,
        afterY = direction === 'toward-end' ? -20 : 400;
      attachments.push({
        testIdentifier,
        deviceId: device.deviceId,
        report: {
          protocol: 'button-group-scrolling-v1',
          mode,
          direction,
          phase,
          preflight: {
            expectedSourceId: source,
            nativeAppExecutableSHA256: executable,
            nativeConfiguration: 'Release',
          },
          receipt: {
            schemaVersion: 1,
            workload: 'layout-root-v1',
            family: 'button-group',
            mode,
            operation: 'update',
            updateEpoch: 0,
            sourceId: source,
            ready: true,
            dev: false,
            hermes: true,
            row: false,
            error: false,
            alternateStyle: false,
            alternateTheme: false,
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
            cohortId: `layout-root-cohort-${i + 3}-${mode}-button-group-update-100`,
          },
          firstRowBefore: { x: 0, y: beforeY, width: 346, height: 48 },
          firstRowAfter: { x: 0, y: afterY, width: 346, height: 48 },
          viewportBefore: { x: 0, y: 400, width: 346, height: 340 },
          viewportAfter: { x: 0, y: 400, width: 346, height: 340 },
          travel: 420,
        },
      });
    }
  }
  return { run, build, summary, metrics, attachments };
}

test('duration-only native data verifies behavior while keeping performance incomplete', () => {
  const result = summarizeButtonGroupScrolling(fixture());
  assert.equal(result.status, 'native-scroll-behavior-verified');
  assert.equal(Object.keys(result.cases).length, 4);
  assert.equal(result.performance.gate, 'incomplete');
  assert.equal(result.performance.hitchTelemetry, 'missing');
  assert.throws(
    () => summarizeButtonGroupScrolling(fixture(), { requireHitches: true }),
    /telemetry is absent/,
  );
  assert.equal(JSON.stringify(result).includes('synthetic-device'), false);
});
for (const [name, mutate] of [
  ['missing case', (v) => v.metrics.pop()],
  [
    'skipped case',
    (v) => {
      v.summary.skippedTests = 1;
    },
  ],
  [
    'wrong artifact',
    (v) => {
      v.run.bundleSHA256 = 'e'.repeat(64);
    },
  ],
  [
    'unrestored session',
    (v) => {
      v.run.originalSessionRestored = false;
    },
  ],
  [
    'unoptimized native command',
    (v) => {
      v.build.command.pop();
    },
  ],
  [
    'another metric device',
    (v) => {
      v.metrics[0].testRuns[0].device = { deviceId: 'other' };
    },
  ],
  [
    'missing SDK duration',
    (v) => {
      v.metrics[0].testRuns[0].metrics = [];
    },
  ],
  [
    'zero duration',
    (v) => {
      v.metrics[0].testRuns[0].metrics[0].measurements[0] = 0;
    },
  ],
  [
    'wrong sample count',
    (v) => {
      v.metrics[0].testRuns[0].metrics[0].measurements.push(2);
    },
  ],
  [
    'reused phase',
    (v) => {
      v.attachments[1].report.phase = 'warmup-discarded';
    },
  ],
  [
    'reused cohort',
    (v) => {
      v.attachments[1].report.receipt.cohortId = v.attachments[0].report.receipt.cohortId;
    },
  ],
  [
    'overridden optimization flags',
    (v) => {
      v.build.command.push('SWIFT_OPTIMIZATION_LEVEL=-Onone');
    },
  ],
  [
    'wrong command destination',
    (v) => {
      v.run.command[v.run.command.indexOf('-destination') + 1] = 'id=other';
    },
  ],
  [
    'parallel native run',
    (v) => {
      v.run.command[v.run.command.indexOf('-parallel-testing-enabled') + 1] = 'YES';
    },
  ],
  [
    'missing native selectors',
    (v) => {
      v.run.command = v.run.command.filter((a) => !a.startsWith('-only-testing:'));
    },
  ],
  [
    'private-path cohort',
    (v) => {
      v.attachments[0].report.receipt.cohortId = '/Users/private/path';
    },
  ],
  [
    'wrong-mode cohort',
    (v) => {
      v.attachments[0].report.receipt.cohortId = 'layout-root-cohort-3-mui-button-group-update-100';
    },
  ],
  [
    'out-of-order cohorts',
    (v) => {
      v.attachments[1].report.receipt.cohortId = 'layout-root-cohort-99-rn-button-group-update-100';
    },
  ],
  [
    'stale source',
    (v) => {
      v.attachments[0].report.preflight.expectedSourceId = 'e'.repeat(64);
    },
  ],
  [
    'inactive roots',
    (v) => {
      v.attachments[0].report.receipt.activeRoots = 99;
    },
  ],
  [
    'accidental action activation',
    (v) => {
      v.attachments[0].report.receipt.untouchedActionCount = 198;
    },
  ],
  [
    'too little native movement',
    (v) => {
      v.attachments[0].report.firstRowAfter.y = 399;
      v.attachments[0].report.travel = 1;
    },
  ],
  [
    'outer catalog moved',
    (v) => {
      v.attachments[0].report.viewportAfter.y += 40;
    },
  ],
  [
    'wrong scroll direction',
    (v) => {
      v.attachments[0].report.firstRowAfter.y = 820;
    },
  ],
  [
    'nonfinite native frame',
    (v) => {
      v.attachments[0].report.firstRowAfter.y = NaN;
    },
  ],
])
  test(`rejects ${name}`, () => {
    const value = fixture();
    mutate(value);
    assert.throws(() => summarizeButtonGroupScrolling(value));
  });

test('loader rejects attachment traversal before reading outside the export', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-scroll-reader-'));
  try {
    await mkdir(join(directory, 'attachments'));
    const value = fixture();
    for (const [name, data] of Object.entries({
      'run.json': value.run,
      'build.json': value.build,
      'summary.json': value.summary,
      'metrics-raw.json': value.metrics,
      'attachments/manifest.json': [
        {
          testIdentifier: value.metrics[0].testIdentifier,
          attachments: [
            {
              suggestedHumanReadableName: 'button-group-scroll-test.json',
              exportedFileName: '../outside.json',
              isAssociatedWithFailure: false,
            },
          ],
        },
      ],
    }))
      await writeFile(join(directory, name), JSON.stringify(data));
    await assert.rejects(
      readButtonGroupScrollExports(directory, join(directory, 'build.json')),
      /attachment path/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
