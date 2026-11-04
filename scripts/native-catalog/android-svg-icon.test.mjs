// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { summarizeSvgIcon, svgIconStages, svgIconPictures } from './android-svg-icon-report.mjs';
import { prepareSvgIconSource } from './android-svg-icon-source.mjs';
import { inspectSvgIconReport } from './android-svg-icon-report.mjs';
import { run } from './android-popper.mjs';
const complete = {
  schemaVersion: 1,
  scenario: 'svg-icon-v1',
  driver: 'native Instrumentation and UiAutomation',
  status: 'passed',
  artifactDirectory: 'cache/mui-svg-icon-123',
  device: { sdk: 37, model: 'test-device' },
  stages: svgIconStages,
  screenshots: svgIconPictures,
  samples: [
    ...[
      ['small', 20],
      ['medium', 24],
      ['large', 35],
    ].map(([size, value]) => ({ name: 'svg-size-' + size, width: value, height: value })),
    { name: 'svg-paint-probe', width: 48, height: 48 },
    { name: 'svg-group-probe-paint', argb: 'ff2e7d32' },
    { name: 'svg-paint-probe-paint', argb: 'ff0274d7' },
    { name: 'svg-paint-probe-paint', argb: 'ffd32f2f' },
    { name: 'svg-text-small', width: 120, height: 50 },
    { name: 'svg-text-large', width: 120, height: 50 },
    { name: 'font-ink', smallWidth: 12, smallHeight: 9, largeWidth: 30, largeHeight: 24 },
  ],
};
const output = (report) =>
  'INSTRUMENTATION_RESULT: svgIconReport=' +
  JSON.stringify(report) +
  '\nINSTRUMENTATION_CODE: -1\n';
test('native SvgIcon receipt rejects missing, failed, duplicate, partial and inconsistent evidence', () => {
  assert.deepEqual(summarizeSvgIcon(output(complete)), complete);
  for (const raw of [
    '',
    output(complete) + output(complete),
    output(complete).replace('-1', '0'),
    output({ ...complete, status: 'failed' }),
    output({ ...complete, artifactDirectory: '../../private' }),
    output({ ...complete, stages: svgIconStages.slice(1) }),
    output({ ...complete, screenshots: [] }),
    output({ ...complete, samples: complete.samples.slice(1) }),
    output({
      ...complete,
      samples: complete.samples.map((s, i) => (i === 1 ? { ...s, width: 10 } : s)),
    }),
    output({
      ...complete,
      samples: complete.samples.map((s, i) => (i === 0 ? { ...s, width: 0 } : s)),
    }),
    output(complete) + 'INSTRUMENTATION_FAILED: stopped\n',
  ])
    assert.throws(() => summarizeSvgIcon(raw));
});
test('SvgIcon native-source preparation preserves manual edits and is repeatable', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-svg-icon-prepare-'));
  try {
    await mkdir(directory, { recursive: true });
    const file = await prepareSvgIconSource(directory);
    await prepareSvgIconSource(directory);
    const source = await readFile(file, 'utf8');
    await writeFile(file, source + '\n// contributor change\n');
    await assert.rejects(prepareSvgIconSource(directory), /Preserve edits/);
    assert.equal(await readFile(file, 'utf8'), source + '\n// contributor change\n');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('SvgIcon failures retain safe diagnostic metadata but never pass completion', () => {
  const failed = {
    ...complete,
    status: 'failed',
    error: 'Native assertion',
    stages: [],
    screenshots: ['failure.png'],
    samples: [],
  };
  assert.deepEqual(inspectSvgIconReport(output(failed)), failed);
  assert.throws(() => summarizeSvgIcon(output(failed)));
  assert.throws(() => inspectSvgIconReport(output({ ...failed, screenshots: ['../private'] })));
  assert.throws(() =>
    inspectSvgIconReport(output({ ...failed, artifactDirectory: ['cache/mui-svg-icon-123'] })),
  );
  assert.throws(() =>
    summarizeSvgIcon(
      output({
        ...complete,
        samples: complete.samples.map((sample, index) =>
          index === 0 ? { ...sample, width: 0, height: 1 } : sample,
        ),
      }),
    ),
  );
});
test('shared runner selects SvgIcon, collects its safe artifacts and restores only the catalog', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-svg-icon-run-')),
    calls = [];
  try {
    const execute = async (_file, args) => {
      calls.push(args);
      if (args.includes('get-state')) return 'device';
      if (args.includes('instrument')) return output(complete);
      if (args.includes('exec-out')) return Buffer.from('native-image');
      if (args.includes('start')) return 'Starting';
      throw Error('Unexpected adb call ' + args.join(' '));
    };
    assert.deepEqual(
      await run(
        { adb: 'adb', serial: 'chosen-device', output: directory, scenario: 'svg-icon' },
        execute,
      ),
      complete,
    );
    assert.ok(calls.some((args) => args.join(' ').includes('-e scenario svg-icon')));
    assert.ok(calls.every((args) => args[0] === '-s' && args[1] === 'chosen-device'));
    assert.equal(calls.filter((args) => args.includes('start')).length, 1);
    assert.deepEqual(
      JSON.parse(await readFile(join(directory, 'report.json'), { encoding: 'utf8' })),
      complete,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
