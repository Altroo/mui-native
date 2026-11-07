// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  inspectDividerReport,
  summarizeDivider,
  dividerStates,
  dividerPictures,
} from './android-divider-report.mjs';
import { prepareDividerSource } from './android-divider-source.mjs';
import { run } from './android-popper.mjs';
const rect = (x, y, width, height) => ({ x, y, width, height });
// Synthetic parser fixtures only. These values never certify platform geometry.
function fixture(profile = 'normal') {
  const fontScale = profile === 'normal' ? 1 : 2;
  return {
    navigation: [
      {
        control: 'catalog-tab-Wrappers',
        destination: 'root-layout-divider',
        attempts: 1,
        success: true,
      },
      {
        control: 'root-layout-divider',
        destination: 'divider-contract-receipt',
        attempts: 1,
        success: true,
      },
    ],
    schemaVersion: 1,
    scenario: 'divider-v1',
    driver: 'native Instrumentation and UiAutomation',
    paintMethod: 'retained-view-draw-excluding-native-text',
    status: 'passed',
    fontProfile: profile,
    artifactDirectory: 'cache/mui-divider-123',
    initialCount: 0,
    initialCounterText: '0',
    device: { sdk: 37, model: 'synthetic-parser-data', fontScale, density: 3 },
    stages: [...dividerStates],
    screenshots: [...dividerPictures],
    states: dividerStates.map((name, index) => {
      const metadata = {
        schemaVersion: 1,
        state: index,
        input: { name },
        fontScale,
        count: 1,
        request: index + 1,
        receipts: {},
        refs: {},
        touch: { count: 1, target: 303, pageX: 120, pageY: 200, timestamp: 1234 },
      };
      const roots = ['plain', 'label', 'paint', 'custom'].map((key, i) => {
        const frame = rect(10, 100 + i * 80, 280, i === 0 ? 72 : 64);
        const vertical = index === 3 || index === 4,
          inset = index === 1 || index === 8,
          middle = index === 2 || index === 4 || index === 9;
        const bounds =
          key === 'plain'
            ? vertical
              ? rect(149.5, frame.y + (middle ? 8 : 0), 1, frame.height - (middle ? 16 : 0))
              : rect(
                  frame.x + (inset ? 72 : middle ? 16 : 0),
                  frame.y + 35.5,
                  frame.width - (inset ? 72 : middle ? 32 : 0),
                  1,
                )
            : rect(10, frame.y + 10, 280, 44);
        metadata.receipts[key] = {
          window: { ...bounds },
          request: metadata.request,
          state: index,
          generation: 1,
        };
        metadata.refs[key] = { attached: 1, cleaned: 0, generation: 1, sameRoot: true };
        const hidden = key === 'paint' && index !== 10;
        const root = {
          key,
          nativeId: 100 + i,
          bounds,
          frame,
          direction: [8, 9].includes(index) ? 'rtl' : 'ltr',
          paint: { inkPixels: hidden ? 0 : 12, sampledPixels: 120, maxAlpha: hidden ? 0 : 31 },
        };
        if (key === 'plain') root.borderColor = [7, 8, 9].includes(index) ? 0x1fffffff : 0x1f000000;
        if (key === 'label')
          root.label = rect(
            bounds.x + ([5, 9].includes(index) ? 20 : [6, 8].includes(index) ? 216 : 118),
            bounds.y,
            44,
            44,
          );
        return root;
      });
      return {
        name,
        metadata,
        roots,
        counterText: '1',
        counterColor: [7, 8, 9].includes(index) ? 0xffffffff : 0xde000000,
        counterTextClass: 'com.facebook.react.views.text.PreparedLayoutTextView',
        counterFontPx: 42 * fontScale,
        expectedCounterFontPx: 42 * fontScale,
      };
    }),
  };
}
const output = (r) =>
  'INSTRUMENTATION_RESULT: dividerReport=' + JSON.stringify(r) + '\nINSTRUMENTATION_CODE: -1\n';
test('parser accepts complete synthetic normal/enlarged protocols, each requiring the requested actual OS profile', () => {
  for (const fontProfile of ['normal', 'enlarged'])
    assert.deepEqual(
      summarizeDivider(output(fixture(fontProfile)), { fontProfile }),
      fixture(fontProfile),
    );
  assert.throws(() => summarizeDivider(output(fixture())));
  assert.throws(() => summarizeDivider(output(fixture()), { fontProfile: 'enlarged' }));
});
test('native completion fails closed for malformed, coerced, stale, partial and contradictory evidence', () => {
  const mutations = [
    (r) => delete r.navigation,
    (r) => (r.navigation[0].attempts = 4),
    (r) => (r.navigation[0].attempts = '1'),
    (r) => (r.navigation[0].success = false),
    (r) => (r.navigation[0].destination = 'wrong-route'),
    (r) => r.states.pop(),
    (r) => r.stages.pop(),
    (r) => r.screenshots.pop(),
    (r) => (r.status = 'failed'),
    (r) => (r.error = 'native assertion'),
    (r) => (r.artifactDirectory = '../../private'),
    (r) => (r.artifactDirectory = ['cache/mui-divider-123']),
    (r) => (r.screenshots = ['../private']),
    (r) => r.screenshots.push(r.screenshots[0]),
    (r) => (r.device.fontScale = 2),
    (r) => (r.device.density = '3'),
    (r) => (r.device.sdk = 28),
    (r) => (r.states[0] = null),
    (r) => (r.states[0].metadata = []),
    (r) => (r.states[1].metadata.request = 1),
    (r) => (r.states[0].metadata.receipts.plain.request = 0),
    (r) => (r.states[0].metadata.receipts.plain.state = 1),
    (r) => (r.states[0].metadata.receipts.plain.generation = 2),
    (r) => (r.states[0].metadata.receipts.plain.window.x += 10),
    (r) => (r.states[0].metadata.refs.plain.sameRoot = false),
    (r) => (r.states[0].metadata.refs.plain.cleaned = 1),
    (r) => (r.states[0].metadata.refs.plain = []),
    (r) => (r.states[0].metadata.count = 0),
    (r) => (r.states[0].metadata.touch = null),
    (r) => (r.states[0].metadata.touch.target = '303'),
    (r) => (r.states[0].metadata.touch.timestamp = null),
    (r) => r.states[0].roots.pop(),
    (r) => r.states[1].roots[0].nativeId++,
    (r) => (r.states[0].roots[1].nativeId = r.states[0].roots[0].nativeId),
    (r) => (r.states[0].roots[0].bounds.width = null),
    (r) => (r.states[0].roots[0].direction = 'rtl'),
    (r) => (r.states[0].roots[2].paint.inkPixels = 1),
    (r) => (r.states[10].roots[2].paint.inkPixels = 0),
    (r) => (r.states[0].roots[0].paint.sampledPixels = 0),
    (r) => (r.states[0].roots[0].paint.maxAlpha = 0),
    (r) => (r.states[0].roots[0].paint.inkPixels = 121),
    (r) => (r.states[1].roots[0].bounds.x = 10),
    (r) => (r.states[3].roots[0].bounds.height = 56),
    (r) => (r.states[7].roots[0].borderColor = r.states[0].roots[0].borderColor),
    (r) => (r.states[5].roots[1].label.x = 226),
    (r) => (r.states[0].counterFontPx = 14),
    (r) => (r.states[7].counterColor = 0xff000000),
    (r) => (r.states[0].counterColor = 0xffffffff),
    (r) => delete r.states[0].counterColor,
    (r) => (r.states[0].counterTextClass = 'invented.Text'),
    (r) => (r.paintMethod = 'derived-from-js-style'),
    (r) => (r.initialCount = 1),
    (r) => (r.initialCounterText = '1'),
    (r) => r.states[1].metadata.touch.target++,
  ];
  for (const [index, mutate] of mutations.entries()) {
    const r = fixture();
    mutate(r);
    assert.throws(
      () => summarizeDivider(output(r), { fontProfile: 'normal' }),
      'mutation ' + index,
    );
  }
  for (const raw of [
    '',
    output(fixture()) + output(fixture()),
    output(fixture()).replace('-1', '0'),
    output(fixture()) + 'INSTRUMENTATION_ABORTED: stopped\n',
  ])
    assert.throws(() => summarizeDivider(raw, { fontProfile: 'normal' }));
});
const thicknessAxes = [
  ['horizontal', 0, 'height'],
  ['vertical', 3, 'width'],
  ['vertical-flex', 4, 'width'],
];
function thickness(report, index, axis, dp) {
  report.states[index].roots[0].bounds[axis] = dp;
  report.states[index].metadata.receipts.plain.window[axis] = dp;
}
function densityFixture(density) {
  const report = fixture();
  report.device.density = density;
  // Only synthetic protocol data. Real View dimensions are pixel-quantized.
  for (const [index] of dividerStates.entries())
    thickness(
      report,
      index,
      index === 3 || index === 4 ? 'width' : 'height',
      Math.max(1, Math.round(density)) / density,
    );
  return report;
}
for (const [name, index, axis] of thicknessAxes)
  test('rejects doubled nominal 1dp separator with matching measured ref: ' + name, () => {
    const report = fixture();
    thickness(report, index, axis, 2);
    assert.throws(
      () => summarizeDivider(output(report), { fontProfile: 'normal' }),
      /source variant/,
    );
  });
test('thin-line evidence accepts only legitimate integer-pixel rounding at recorded densities', () => {
  for (const density of [0.5, 0.75, 1, 1.5, 2, 2.625, 3, 4])
    for (const pixels of new Set(
      [Math.floor(density), Math.ceil(density)].filter((value) => value > 0),
    ))
      for (const [, index, axis] of thicknessAxes) {
        const report = densityFixture(density);
        thickness(report, index, axis, pixels / density);
        assert.equal(summarizeDivider(output(report), { fontProfile: 'normal' }).status, 'passed');
      }
  // At density .5 the real 1px View is 2dp: this is legitimate rounding,
  // whereas another physical pixel must fail even on that low-density device.
});
test('an extra physical pixel is not absorbed by geometry tolerance at any tested density', () => {
  for (const density of [0.5, 0.75, 1, 1.5, 2, 2.625, 3, 4])
    for (const [, index, axis] of thicknessAxes) {
      const report = densityFixture(density);
      thickness(report, index, axis, (Math.ceil(density) + 1) / density);
      assert.throws(
        () => summarizeDivider(output(report), { fontProfile: 'normal' }),
        /source variant/,
      );
    }
});
test('fractional-pixel fabrication fails while tiny native float-to-dp noise remains valid', () => {
  for (const [, index, axis] of thicknessAxes) {
    const rounded = densityFixture(2.625);
    thickness(rounded, index, axis, (3 + 5e-7) / 2.625);
    assert.equal(summarizeDivider(output(rounded), { fontProfile: 'normal' }).status, 'passed');
    for (const pixels of [2.5, 3.001]) {
      const report = densityFixture(2.625);
      thickness(report, index, axis, pixels / 2.625);
      assert.throws(
        () => summarizeDivider(output(report), { fontProfile: 'normal' }),
        /source variant/,
      );
    }
  }
  for (const density of [Number.MIN_VALUE, Number.MAX_VALUE]) {
    const report = fixture();
    report.device.density = density;
    assert.throws(() => summarizeDivider(output(report), { fontProfile: 'normal' }));
  }
});
test('tight thickness checks leave existing native position and measured-ref tolerance unchanged', () => {
  const report = fixture();
  report.states[0].roots[0].bounds.x += 1;
  assert.equal(summarizeDivider(output(report), { fontProfile: 'normal' }).status, 'passed');
});
test('failed runs retain only safe artifacts for diagnostics', () => {
  const failed = {
    ...fixture(),
    status: 'failed',
    error: 'native failure',
    stages: [],
    states: [],
    screenshots: ['failure.png'],
  };
  assert.deepEqual(inspectDividerReport(output(failed)), failed);
  assert.throws(() => summarizeDivider(output(failed), { fontProfile: 'normal' }));
});
test('source preparation is repeatable and preserves contributor-owned changes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-divider-prepare-'));
  try {
    const path = await prepareDividerSource(directory);
    await prepareDividerSource(directory);
    const source = await readFile(path, 'utf8');
    await writeFile(path, source + '\n// contributor change\n');
    await assert.rejects(prepareDividerSource(directory), /Preserve edits/);
    assert.equal(await readFile(path, 'utf8'), source + '\n// contributor change\n');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('shared runner forwards an explicit Divider profile and preserves catalog-only restoration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-divider-run-')),
    calls = [];
  try {
    const execute = async (_file, args) => {
      calls.push(args);
      if (args.includes('get-state')) return 'device';
      if (args.includes('instrument')) return output(fixture());
      if (args.includes('exec-out')) return Buffer.from('synthetic-image');
      if (args.includes('start')) return 'Starting';
      throw Error('Unexpected adb call ' + args.join(' '));
    };
    const options = {
      adb: 'adb',
      serial: 'chosen-device',
      output: directory,
      scenario: 'divider',
      fontProfile: 'normal',
    };
    assert.deepEqual(await run(options, execute), fixture());
    assert.ok(
      calls.some((args) => args.join(' ').includes('-e scenario divider -e fontProfile normal')),
    );
    assert.ok(calls.every((args) => args[0] === '-s' && args[1] === 'chosen-device'));
    assert.equal(calls.filter((args) => args.includes('start')).length, 1);
    assert.equal(calls.filter((args) => args.includes('force-stop')).length, 0);
    await assert.rejects(run({ ...options, fontProfile: undefined }, execute), /explicit normal/);
    await assert.rejects(run({ ...options, scenario: 'popper' }, execute), /explicit normal/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
