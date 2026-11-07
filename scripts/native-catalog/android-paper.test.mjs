// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, writeFile, mkdir, mkdtemp, rm, chmod, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  paperInputs,
  paperStates,
  paperPictures,
  paperKeys,
  paperOverlayAlphas,
  paperNativeReset,
  readPaperReference,
  inspectPaperReport,
  summarizePaper,
  paperExpectedRgb,
} from './android-paper-report.mjs';
import { buildPaperReference, preparePaperSource } from './android-paper-source.mjs';
import { run, catalogPackage, component } from './android-popper.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const execute = promisify(execFile);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
// Independent expected 8-bit channels calculated from the pinned original SSR
// observations. Repeated channels are intentional quantization, not unique alpha proof.
const darkChannels = [
  18, 30, 34, 37, 40, 42, 44, 45, 46, 47, 48, 49, 50, 51, 52, 52, 53, 54, 54, 55, 55, 56, 56, 57,
  57,
];
const rgba = (r, g, b, alpha = 255) => ((alpha << 24) | (r << 16) | (g << 8) | b) >>> 0;
const output = (data, code = -1) =>
  'INSTRUMENTATION_RESULT: paperReport=' +
  JSON.stringify(data) +
  '\nINSTRUMENTATION_CODE: ' +
  code +
  '\n';
function complete(
  fontProfile = 'normal',
  density = 2.625,
  fontScale = fontProfile === 'normal' ? 1 : 2,
) {
  const source = readPaperReference();
  return {
    schemaVersion: 1,
    scenario: 'paper-v1',
    driver: 'native Instrumentation and UiAutomation',
    paintMethod: 'retained-view-draw-interior-samples',
    status: 'passed',
    artifactDirectory: 'cache/mui-paper-12345',
    fontProfile,
    reference: {
      materialVersion: source.materialVersion,
      fixtureSha256: source.fixtureSha256,
      overlayCases: source.overlayAlphas.length,
    },
    device: { sdk: 37, model: 'synthetic-parser-fixture', density, fontScale },
    initialCount: 0,
    initialCustomCount: 0,
    initialCounterText: '0',
    initialCustomLabel: 'Custom 0',
    initialCounterNativeId: 201,
    initialCustomTouchNativeId: 202,
    stages: [...paperStates],
    screenshots: [...paperPictures],
    navigation: [
      {
        control: 'catalog-tab-Wrappers',
        destination: 'root-layout-paper',
        attempts: 1,
        success: true,
      },
      {
        control: 'root-layout-paper',
        destination: 'paper-contract-receipt',
        attempts: 1,
        success: true,
      },
    ],
    states: paperInputs.map((input, index) => {
      const inset = (input.reset ? 0 : 16) + (input.variant === 'outlined' ? 1 : 0);
      const childHeight = Math.max(44, 14 * fontScale * 1.2 + 16);
      const height = Math.max(88, childHeight + inset * 2);
      const roots = paperKeys.map((key, keyIndex) => {
        const frame = { x: 12, y: 100 + keyIndex * (height + 64), width: 280, height: height + 48 };
        const bounds = { x: frame.x + 24, y: frame.y + 24, width: 232, height };
        const child = {
          x: bounds.x + inset,
          y: bounds.y + (height - childHeight) / 2,
          width: bounds.width - inset * 2,
          height: childHeight,
        };
        const widthPx = Math.round(bounds.width * density),
          heightPx = Math.round(height * density);
        const x = Math.round(8 * density),
          y = Math.round((input.reset ? 2 : 8) * density);
        const right = widthPx - 1 - x,
          bottom = heightPx - 1 - y;
        const color = input.reset
          ? rgba(36, 52, 71)
          : input.dark
            ? rgba(...Array(3).fill(darkChannels[input.elevation]))
            : 0xffffffff;
        return {
          key,
          nativeId: 101 + keyIndex,
          class: 'com.facebook.react.views.view.ReactViewGroup',
          direction: input.rtl ? 'rtl' : 'ltr',
          bounds,
          frame,
          child,
          borderWidthDp: input.variant === 'outlined' ? 1 : 0,
          borderColor: input.variant === 'outlined' ? 0x1f000000 : null,
          radiusDp: input.square || input.reset ? 0 : 4,
          paint: {
            method: 'retained-view-draw',
            widthPx,
            heightPx,
            excludedTextRects: [
              {
                left: Math.floor(widthPx / 2) - 3,
                top: Math.floor(heightPx / 2) - 3,
                right: Math.floor(widthPx / 2) + 3,
                bottom: Math.floor(heightPx / 2) + 3,
              },
            ],
            samples: [
              [x, y],
              [Math.floor((widthPx - 1) / 2), y],
              [right, y],
              [x, bottom],
              [right, bottom],
            ].map(([x, y]) => ({ x, y, argb: color })),
          },
        };
      });
      return {
        name: input.name,
        counterText: '1',
        customTouchLabel: 'Custom 1',
        counterTextClass: 'com.facebook.react.views.text.ReactTextView',
        counterNativeId: 201,
        customTouchNativeId: 202,
        counterColor: input.dark ? 0xffffffff : 0xde000000,
        counterFontPx: Math.ceil(14 * density * fontScale),
        expectedCounterFontPx: Math.ceil(14 * density * fontScale),
        roots,
        metadata: {
          schemaVersion: 1,
          state: index,
          input: structuredClone(input),
          sequenceLength: 33,
          fontScale,
          windowProfile: { width: 390, height: 844, scale: density },
          count: 1,
          customCount: 1,
          request: index + 1,
          refRevision: 2,
          touch: { count: 1, target: 303, pageX: 85, pageY: 240, timestamp: 1000 },
          authoredNativeReset: input.reset ? structuredClone(paperNativeReset) : null,
          refs: Object.fromEntries(
            paperKeys.map((key) => [
              key,
              { attached: 1, cleaned: 0, generation: 1, sameRoot: true },
            ]),
          ),
          receipts: Object.fromEntries(
            roots.map(({ key, bounds }) => [
              key,
              { window: { ...bounds }, request: index + 1, state: index, generation: 1 },
            ]),
          ),
        },
      };
    }),
  };
}
test('all 33 source states validate both requested OS profiles without a platform-pass claim', () => {
  for (const [profile, scale] of [
    ['normal', 1],
    ['enlarged', 1.3],
    ['enlarged', 2],
    ['enlarged', 5],
  ]) {
    const report = complete(profile, 2.625, scale);
    assert.deepEqual(summarizePaper(output(report), { fontProfile: profile }), report);
  }
});
// Update all independent geometry/raster receipts so the height regressions do
// not fail accidentally on a stale frame or an old bottom sample coordinate.
function setIntrinsicHeight(report, index, childHeight, heightOverride) {
  const state = report.states[index],
    input = paperInputs[index];
  const inset = (input.reset ? 0 : 16) + (input.variant === 'outlined' ? 1 : 0);
  let top = 100;
  for (const root of state.roots) {
    const height = heightOverride ?? Math.max(88, childHeight + inset * 2);
    root.frame.y = top;
    root.frame.height = height + 48;
    root.bounds.y = top + 24;
    root.bounds.height = height;
    root.child.height = childHeight;
    root.child.y = root.bounds.y + (height - childHeight) / 2;
    state.metadata.receipts[root.key].window = { ...root.bounds };
    const paint = root.paint;
    paint.heightPx = Math.round(height * report.device.density);
    const x = Math.round(8 * report.device.density);
    const y = Math.round((input.reset ? 2 : 8) * report.device.density);
    const positions = [
      [x, y],
      [Math.floor((paint.widthPx - 1) / 2), y],
      [paint.widthPx - 1 - x, y],
      [x, paint.heightPx - 1 - y],
      [paint.widthPx - 1 - x, paint.heightPx - 1 - y],
    ];
    paint.samples.forEach((sample, position) => {
      [sample.x, sample.y] = positions[position];
    });
    const center = Math.floor(paint.heightPx / 2);
    paint.excludedTextRects = [
      {
        left: Math.floor(paint.widthPx / 2) - 3,
        top: center - 3,
        right: Math.floor(paint.widthPx / 2) + 3,
        bottom: center + 3,
      },
    ];
    top += root.frame.height + 16;
  }
}
test('enlarged intrinsic child determines Paper height for padding, outline and native reset', () => {
  const report = complete('enlarged', 2.625, 2);
  for (const index of [0, 1, 31]) setIntrinsicHeight(report, index, 76);
  assert.equal(report.states[0].roots[0].bounds.height, 108);
  assert.equal(report.states[1].roots[0].bounds.height, 110);
  assert.equal(report.states[31].roots[0].bounds.height, 88);
  summarizePaper(output(report), { fontProfile: 'enlarged' });
});
test('enlarged intrinsic child cannot be clipped into an 88dp Paper', () => {
  const report = complete('enlarged', 2.625, 2);
  setIntrinsicHeight(report, 0, 76, 88);
  assert.throws(() => summarizePaper(output(report), { fontProfile: 'enlarged' }));
});
test('Paper cannot grow taller than its intrinsic child and source minimum', () => {
  for (const index of [0, 1, 31]) {
    const report = complete('enlarged', 2.625, 2),
      input = paperInputs[index];
    const inset = (input.reset ? 0 : 16) + (input.variant === 'outlined' ? 1 : 0);
    setIntrinsicHeight(report, index, 76, Math.max(88, 76 + 2 * inset) + 8);
    assert.throws(() => summarizePaper(output(report), { fontProfile: 'enlarged' }));
  }
});
test('source-derived colors match the 25 original SSR alpha samples and repeated 8-bit channels', async () => {
  const fixture = JSON.parse(
    await readFile(join(root, 'tests/fixtures/mui-paper-9.5.0.json'), 'utf8'),
  );
  assert.deepEqual(
    fixture.dark.map((value) => value.alpha),
    [...paperOverlayAlphas],
  );
  for (let elevation = 0; elevation < 25; elevation++)
    assert.deepEqual(
      paperExpectedRgb({ dark: true, reset: false, elevation }),
      Array(3).fill(darkChannels[elevation]),
    );
  assert.ok(new Set(darkChannels).size < darkChannels.length);
  assert.deepEqual(paperExpectedRgb({ dark: true, reset: true, elevation: 8 }), [36, 52, 71]);
});
test('RGB tolerance is per channel and accepts only the documented 3/255 native quantization', () => {
  for (const delta of [-3, 3]) {
    const report = complete(),
      sample = report.states[12].roots[0].paint.samples[0];
    sample.argb = rgba(46 + delta, 46, 46);
    summarizePaper(output(report), { fontProfile: 'normal' });
  }
});
test('actual integer pixel positions and bitmap/native size allow at most one physical pixel rounding', () => {
  for (const density of [0.5, 0.75, 1, 1.5, 2, 2.625, 3, 4]) {
    const report = complete('normal', density);
    const paint = report.states[0].roots[0].paint;
    paint.samples[0].x += 1;
    paint.widthPx += 1;
    summarizePaper(output(report), { fontProfile: 'normal' });
  }
});
test('a signed native text rectangle may edge-overflow while the sampled points remain text-free', () => {
  const report = complete();
  report.states[0].roots[0].paint.excludedTextRects = [{ left: -5, top: 30, right: 4, bottom: 40 }];
  summarizePaper(output(report), { fontProfile: 'normal' });
});
const negatives = [
  ['missing stage', (r) => r.stages.pop()],
  ['wrong ordered state', (r) => r.states.reverse()],
  ['missing native root', (r) => r.states[1].roots.pop()],
  [
    'duplicate native roots',
    (r) => (r.states[1].roots[1].nativeId = r.states[1].roots[0].nativeId),
  ],
  ['root replaced after first state', (r) => (r.states[2].roots[0].nativeId = 900)],
  ['counter text host replaced', (r) => r.states[2].counterNativeId++],
  ['custom touch Pressable replaced', (r) => r.states[2].customTouchNativeId++],
  [
    'initial native child IDs collide',
    (r) => (r.initialCustomTouchNativeId = r.initialCounterNativeId),
  ],
  [
    'wrong actual native root class',
    (r) => (r.states[0].roots[0].class = 'android.widget.TextView'),
  ],
  ['wrong local RTL direction', (r) => (r.states[30].roots[0].direction = 'ltr')],
  ['wrong source elevation at dark24', (r) => (r.states[28].metadata.input.elevation = 23)],
  ['wrong source square flag', (r) => (r.states[29].metadata.input.square = false)],
  ['extra authored computed color', (r) => (r.states[8].metadata.input.expectedColor = 'fake')],
  ['stale request number', (r) => (r.states[2].metadata.request = r.states[1].metadata.request)],
  ['fractional measurement request', (r) => (r.states[2].metadata.request = 2.5)],
  ['stale receipt request', (r) => r.states[2].metadata.receipts.stock.request--],
  ['stale receipt state', (r) => r.states[2].metadata.receipts.custom.state--],
  ['stale receipt generation', (r) => (r.states[2].metadata.receipts.custom.generation = 2)],
  ['stale measured native frame', (r) => (r.states[2].metadata.receipts.stock.window.x += 5)],
  ['cleaned public ref', (r) => (r.states[2].metadata.refs.stock.cleaned = 1)],
  ['reattached custom ref', (r) => (r.states[2].metadata.refs.custom.attached = 2)],
  ['ref identity lost', (r) => (r.states[2].metadata.refs.custom.sameRoot = false)],
  ['missing ref revision', (r) => (r.states[2].metadata.refRevision = 0)],
  ['window changed during capture', (r) => r.states[2].metadata.windowProfile.width++],
  ['window density lies', (r) => (r.states[2].metadata.windowProfile.scale = 1)],
  ['font receipt changed', (r) => (r.states[2].metadata.fontScale = 1.5)],
  ['actual OS font profile lies', (r) => (r.device.fontScale = 2)],
  ['custom click did not activate', (r) => (r.states[2].metadata.customCount = 0)],
  ['custom native label remains zero', (r) => (r.states[2].customTouchLabel = 'Custom 0')],
  ['stock native glyph remains zero', (r) => (r.states[2].counterText = '0')],
  ['event never bubbled', (r) => (r.states[2].metadata.touch.count = 0)],
  ['event target is coerced string', (r) => (r.states[2].metadata.touch.target = '303')],
  ['event changed after initial touch', (r) => r.states[2].metadata.touch.timestamp++],
  ['counter palette unreadable in dark mode', (r) => (r.states[4].counterColor = 0xde000000)],
  ['counter font is stale', (r) => (r.states[2].counterFontPx += 4)],
  ['missing frame padding', (r) => (r.states[2].roots[0].bounds.x -= 8)],
  ['native child padding reset did not apply', (r) => (r.states[31].roots[0].child.width -= 32)],
  ['native root is below min height', (r) => (r.states[2].roots[0].bounds.height = 40)],
  ['invisible touch target', (r) => (r.states[2].roots[0].child.height = 1)],
  ['missing outlined border property', (r) => (r.states[1].roots[0].borderWidthDp = 0)],
  ['wrong outlined native palette', (r) => (r.states[1].roots[0].borderColor = 0)],
  ['square retains rounded corners', (r) => (r.states[2].roots[0].radiusDp = 4)],
  ['reset retains rounded corners', (r) => (r.states[31].roots[0].radiusDp = 4)],
  ['fractional bitmap dimension', (r) => (r.states[2].roots[0].paint.widthPx += 0.5)],
  ['bitmap no longer matches native bounds', (r) => (r.states[2].roots[0].paint.widthPx += 2)],
  [
    'not a native View.draw observation',
    (r) => (r.states[2].roots[0].paint.method = 'computed-style'),
  ],
  ['missing raster sample', (r) => r.states[2].roots[0].paint.samples.pop()],
  [
    'duplicate sample point',
    (r) => (r.states[2].roots[0].paint.samples[1] = r.states[2].roots[0].paint.samples[0]),
  ],
  ['fractional sample coordinate', (r) => (r.states[2].roots[0].paint.samples[0].x += 0.5)],
  ['moved sample coordinate', (r) => (r.states[2].roots[0].paint.samples[0].x += 2)],
  ['sample outside bitmap', (r) => (r.states[2].roots[0].paint.samples[0].x = -1)],
  ['unsigned color required', (r) => (r.states[2].roots[0].paint.samples[0].argb = -1)],
  [
    'fractional native color',
    (r) => (r.states[2].roots[0].paint.samples[0].argb = 0xffffffff - 0.5),
  ],
  [
    'translucent surface',
    (r) => (r.states[12].roots[0].paint.samples[0].argb = rgba(46, 46, 46, 254)),
  ],
  [
    'color exceeds 3 per channel',
    (r) => (r.states[12].roots[0].paint.samples[0].argb = rgba(50, 46, 46)),
  ],
  [
    'all dark overlays missing',
    (r) =>
      r.states[28].roots[0].paint.samples.forEach((s) => {
        s.argb = rgba(18, 18, 18);
      }),
  ],
  [
    'native reset keeps dark overlay',
    (r) =>
      r.states[31].roots[0].paint.samples.forEach((s) => {
        s.argb = rgba(46, 46, 46);
      }),
  ],
  [
    'sample overlaps actual text',
    (r) => {
      const p = r.states[2].roots[0].paint,
        s = p.samples[0];
      p.excludedTextRects.push({ left: s.x, top: s.y, right: s.x + 1, bottom: s.y + 1 });
    },
  ],
  [
    'fractional text rectangle',
    (r) => (r.states[2].roots[0].paint.excludedTextRects[0].left += 0.5),
  ],
  [
    'empty text rectangle',
    (r) => {
      const b = r.states[2].roots[0].paint.excludedTextRects[0];
      b.right = b.left;
    },
  ],
  ['wrong original reference hash', (r) => (r.reference.fixtureSha256 = '0'.repeat(64))],
  ['wrong original material version', (r) => (r.reference.materialVersion = '9.4.0')],
  ['unbounded navigation', (r) => (r.navigation[0].attempts = 4)],
  ['wrong navigation route', (r) => (r.navigation[1].destination = 'divider-contract-receipt')],
  ['unsafe screenshot path', (r) => (r.screenshots[0] = '../outside.png')],
  ['missing representative screenshot', (r) => r.screenshots.pop()],
];
negatives.push([
  'native text rectangle exceeds actual signed int32 coordinates',
  (r) => {
    r.states[2].roots[0].paint.excludedTextRects[0].left = -0x80000001;
  },
]);
for (const [name, mutate] of negatives)
  test('rejects ' + name, () => {
    const report = complete();
    mutate(report);
    assert.throws(() => summarizePaper(output(report), { fontProfile: 'normal' }));
  });
test('completion rejects unknown, missing, repeated and failed instrumentation while diagnostics remain safe', () => {
  const report = complete(),
    text = output(report);
  for (const invalid of [
    text.replace('INSTRUMENTATION_CODE: -1', 'INSTRUMENTATION_CODE: 0'),
    text + 'INSTRUMENTATION_CODE: -1\n',
    text + 'INSTRUMENTATION_FAILED: stopped\n',
    text + 'INSTRUMENTATION_RESULT: shortMsg=crashed\n',
  ])
    assert.throws(() => summarizePaper(invalid, { fontProfile: 'normal' }));
  const failed = {
    ...report,
    status: 'failed',
    error: 'native sample differs',
    states: [],
    stages: [],
    screenshots: ['failure.png'],
  };
  assert.deepEqual(inspectPaperReport(output(failed, 0)), failed);
  assert.throws(() => summarizePaper(output(failed, 0), { fontProfile: 'normal' }));
  assert.throws(() => inspectPaperReport(text + text));
  assert.throws(() => inspectPaperReport('INSTRUMENTATION_RESULT: paperReport=null\n'));
  failed.artifactDirectory = 'cache/../elsewhere';
  assert.throws(() => inspectPaperReport(output(failed, 0)));
});
test('font profile is explicit and never inferred from an authored font-size change', () => {
  for (const profile of [undefined, 'large', 'enlarged'])
    assert.throws(() => summarizePaper(output(complete()), { fontProfile: profile }));
  assert.throws(() =>
    summarizePaper(output(complete('enlarged', 2.625, 1.2)), { fontProfile: 'enlarged' }),
  );
  assert.throws(() =>
    summarizePaper(output(complete('enlarged', 2.625, 5.1)), { fontProfile: 'enlarged' }),
  );
});
async function temp(t, prefix = 'mui-paper-node-') {
  const path = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}
const targetPaths = (project) => ({
  source: join(
    project,
    'app/src/androidTest/java/dev/altroo/muinative/catalog/test/PaperScenario.java',
  ),
  reference: join(project, 'app/src/androidTest/assets/mui-paper-reference.json'),
  ownership: join(project, '.mui-native-paper-instrumentation.json'),
});
test('preparation writes only the guarded Java source and reduced original reference asset', async (t) => {
  const project = await temp(t),
    result = await preparePaperSource(project),
    paths = targetPaths(project);
  assert.deepEqual(result, { source: paths.source, reference: paths.reference });
  assert.equal(
    await readFile(paths.source, 'utf8'),
    await readFile(join(root, 'tests/native/android/PaperScenario.java'), 'utf8'),
  );
  const asset = await readFile(paths.reference);
  assert.ok(asset.length < 2048, 'Do not copy the full upstream fixture into the test APK');
  assert.deepEqual(JSON.parse(asset), readPaperReference());
  const record = JSON.parse(await readFile(paths.ownership));
  assert.equal(record.sourceSha256, digest(await readFile(paths.source)));
  assert.equal(record.referenceSha256, digest(asset));
  await preparePaperSource(project);
});
test('preparation updates a previously owned source and preserves edited Java', async (t) => {
  const project = await temp(t);
  await preparePaperSource(project);
  const paths = targetPaths(project),
    record = JSON.parse(await readFile(paths.ownership));
  await writeFile(paths.source, '// former owned producer\n');
  record.sourceSha256 = digest(await readFile(paths.source));
  await writeFile(paths.ownership, JSON.stringify(record));
  await preparePaperSource(project);
  const original = await readFile(paths.source, 'utf8'),
    asset = await readFile(paths.reference);
  await writeFile(paths.source, original + '// user edit\n');
  await assert.rejects(preparePaperSource(project), /Preserve edits to generated Paper scenario/);
  assert.equal(await readFile(paths.source, 'utf8'), original + '// user edit\n');
  assert.deepEqual(await readFile(paths.reference), asset);
});
test('one edited asset prevents source and ownership updates before any write', async (t) => {
  const project = await temp(t);
  await preparePaperSource(project);
  const paths = targetPaths(project),
    record = JSON.parse(await readFile(paths.ownership));
  await writeFile(paths.source, '// former owned source\n');
  record.sourceSha256 = digest(await readFile(paths.source));
  await writeFile(paths.ownership, JSON.stringify(record));
  await writeFile(paths.reference, '{"manual":"asset"}\n');
  const before = await Promise.all(Object.values(paths).map((p) => readFile(p)));
  await assert.rejects(preparePaperSource(project), /Preserve edits to generated Paper reference/);
  const after = await Promise.all(Object.values(paths).map((p) => readFile(p)));
  assert.deepEqual(after, before);
});
test('malformed ownership journals fail before overwriting generated files', async (t) => {
  const project = await temp(t);
  await preparePaperSource(project);
  const paths = targetPaths(project),
    original = await readFile(paths.source);
  for (const invalid of ['[]', '{"schemaVersion":true}', '{']) {
    await writeFile(paths.ownership, invalid);
    await assert.rejects(preparePaperSource(project));
    assert.deepEqual(await readFile(paths.source), original);
  }
});
for (const kind of ['source', 'reference', 'ownership'])
  test(
    'preparation preserves manual ' + kind + ' symlinks before writing any output',
    async (t) => {
      const project = await temp(t);
      await preparePaperSource(project);
      const paths = targetPaths(project),
        outside = join(project, 'manual-' + kind);
      const original = await readFile(paths[kind]);
      await writeFile(outside, original);
      await rm(paths[kind]);
      await symlink(outside, paths[kind]);
      const before = await Promise.all(Object.values(paths).map((path) => readFile(path)));
      await assert.rejects(
        preparePaperSource(project),
        /Preserve non-regular generated Paper file/,
      );
      assert.deepEqual(
        await Promise.all(Object.values(paths).map((path) => readFile(path))),
        before,
      );
      assert.deepEqual(await readFile(outside), original);
    },
  );

test('adding unrelated original getter fixtures changes the dynamic verified hash without changing 25 alpha targets', async () => {
  const fixture = JSON.parse(
    await readFile(join(root, 'tests/fixtures/mui-paper-9.5.0.json'), 'utf8'),
  );
  const provenance = JSON.parse(await readFile(join(root, 'upstream/paper.json'), 'utf8'));
  const original = readPaperReference();
  fixture.additionalGetterSentinel = { reads: 2 };
  const bytes = JSON.stringify(fixture);
  provenance.fixture.sha256 = digest(bytes);
  const reduced = buildPaperReference(bytes, JSON.stringify(provenance));
  assert.notEqual(reduced.fixtureSha256, original.fixtureSha256);
  assert.deepEqual(reduced.overlayAlphas, original.overlayAlphas);
  for (const mutate of [
    (f) => f.dark.pop(),
    (f) => f.dark.reverse(),
    (f) => {
      f.dark[8].alpha = 0.12;
    },
    (f) => {
      f.dark[0].css = f.dark[0].css.replace('#121212', '#000000');
    },
    (f) => {
      f.dark[8].style = '--Paper-overlay:none';
    },
  ]) {
    const invalid = structuredClone(fixture);
    mutate(invalid);
    const invalidBytes = JSON.stringify(invalid);
    const record = structuredClone(provenance);
    record.fixture.sha256 = digest(invalidBytes);
    assert.throws(() => buildPaperReference(invalidBytes, JSON.stringify(record)));
  }
  provenance.references.find((value) => value.name === '@mui/material').version = '9.6.0';
  assert.throws(() => buildPaperReference(bytes, JSON.stringify(provenance)));
});
function adbMock(report, { failInstrument = false, failStop = false } = {}) {
  const calls = [];
  return {
    calls,
    execute: async (file, args) => {
      assert.equal(file, 'synthetic-adb');
      calls.push(args);
      const command = args.slice(2);
      if (command[0] === 'get-state') return Buffer.from('device\n');
      if (command[0] === 'shell' && command[1] === 'am' && command[2] === 'instrument') {
        if (failInstrument)
          throw Object.assign(Error('synthetic interrupted instrumentation'), {
            stdout: Buffer.from(output(report, 0)),
            stderr: Buffer.from('synthetic interruption'),
          });
        return Buffer.from(output(report));
      }
      if (command[0] === 'exec-out') return Buffer.from('synthetic-png-test-bytes');
      if (command[0] === 'shell' && command[1] === 'ps') return Buffer.from('NAME\n');
      if (command[0] === 'shell' && command[1] === 'am' && command[2] === 'force-stop') {
        if (failStop) throw Error('synthetic unconfirmed termination');
        return Buffer.from('');
      }
      if (command[0] === 'shell' && command[1] === 'am' && command[2] === 'start')
        return Buffer.from('Started');
      throw Error('Unexpected synthetic adb call: ' + JSON.stringify(args));
    },
  };
}
test('Paper runner forwards its explicit profile, pulls bounded artifacts and restores the catalog', async (t) => {
  const folder = await temp(t),
    data = complete(),
    mock = adbMock(data);
  assert.deepEqual(
    await run(
      {
        adb: 'synthetic-adb',
        serial: 'emulator-5554',
        output: folder,
        scenario: 'paper',
        fontProfile: 'normal',
      },
      mock.execute,
    ),
    data,
  );
  const command = mock.calls.find((args) => args.includes('instrument'));
  assert.ok(
    command.includes('paper') && command.includes('fontProfile') && command.includes('normal'),
  );
  assert.equal(command.at(-1), component);
  const pulls = mock.calls.filter((args) => args.includes('exec-out'));
  assert.equal(pulls.length, paperPictures.length);
  assert.ok(pulls.every((args) => args.includes(catalogPackage)));
  assert.ok(mock.calls.at(-1).includes(catalogPackage + '/.MainActivity'));
});
test('Paper runner preserves failed diagnostics and confirms termination before restoring', async (t) => {
  const folder = await temp(t),
    data = complete();
  Object.assign(data, {
    status: 'failed',
    error: 'actual raster differs',
    states: [],
    stages: [],
    screenshots: ['failure.png'],
  });
  const mock = adbMock(data, { failInstrument: true });
  await assert.rejects(
    run(
      {
        adb: 'synthetic-adb',
        serial: 'emulator-5554',
        output: folder,
        scenario: 'paper',
        fontProfile: 'normal',
      },
      mock.execute,
    ),
  );
  assert.equal(JSON.parse(await readFile(join(folder, 'report.json'))).status, 'failed');
  assert.equal(await readFile(join(folder, 'failure.png'), 'utf8'), 'synthetic-png-test-bytes');
  const stop = mock.calls.findIndex((args) => args.includes('force-stop'));
  const ps = mock.calls.findIndex((args) => args.includes('ps'));
  const start = mock.calls.findIndex((args) => args.includes('start'));
  assert.ok(stop >= 0 && ps > stop && start > ps);
});
test('unconfirmed termination prevents restoration and unsafe Paper diagnostics never pull arbitrary files', async (t) => {
  const folder = await temp(t),
    data = complete();
  data.artifactDirectory = 'cache/../outside';
  const mock = adbMock(data, { failStop: true });
  await assert.rejects(
    run(
      {
        adb: 'synthetic-adb',
        serial: 'emulator-5554',
        output: folder,
        scenario: 'paper',
        fontProfile: 'normal',
      },
      mock.execute,
    ),
    /termination unconfirmed/,
  );
  assert.ok(!mock.calls.some((args) => args.includes('exec-out') || args.includes('start')));
});
test('invalid Paper profiles, global RTL, inferred device and pre-abort fail before adb calls', async (t) => {
  const folder = await temp(t),
    mock = adbMock(complete());
  for (const options of [
    { fontProfile: undefined },
    { fontProfile: 'large' },
    { globalRTL: true },
    { serial: undefined },
  ])
    await assert.rejects(
      run(
        {
          adb: 'synthetic-adb',
          serial: 'emulator-5554',
          output: folder,
          scenario: 'paper',
          fontProfile: 'normal',
          ...options,
        },
        mock.execute,
      ),
    );
  const controller = new AbortController();
  controller.abort(Error('synthetic pre-abort'));
  await assert.rejects(
    run(
      {
        adb: 'synthetic-adb',
        serial: 'emulator-5554',
        output: folder,
        scenario: 'paper',
        fontProfile: 'normal',
        signal: controller.signal,
      },
      mock.execute,
    ),
  );
  assert.equal(mock.calls.length, 0);
});
test('real CLI prepare registers Paper and preserves existing Divider/reading/layout paths and edited assets', async (t) => {
  const project = await temp(t);
  await mkdir(join(project, 'app'), { recursive: true });
  await writeFile(
    join(project, 'app/build.gradle'),
    "android { defaultConfig { applicationId 'dev.altroo.muinative.catalog' } }\n",
  );
  const cli = join(root, 'scripts/native-catalog/android-popper.mjs');
  await execute(process.execPath, [cli, 'prepare', '--project', project]);
  const dispatcher = await readFile(
    join(
      project,
      'app/src/androidTest/java/dev/altroo/muinative/catalog/test/PopperInstrumentation.java',
    ),
    'utf8',
  );
  assert.match(dispatcher, /PaperScenario\.run\(this, dividerFontProfile\)/);
  assert.match(dispatcher, /DividerScenario\.run\(this, dividerFontProfile\)/);
  assert.match(dispatcher, /LayoutRootScenario\.run\(this\)/);
  assert.match(dispatcher, /button-group-reading/);
  const paths = targetPaths(project);
  await writeFile(paths.reference, '{"manual":"keep"}');
  await assert.rejects(
    execute(process.execPath, [cli, 'prepare', '--project', project]),
    /Preserve edits to generated Paper reference/,
  );
  assert.equal(await readFile(paths.reference, 'utf8'), '{"manual":"keep"}');
});
test('real CLI run routes Paper through a fake executable without contacting a device', async (t) => {
  const folder = await temp(t),
    raw = join(folder, 'raw.txt'),
    log = join(folder, 'calls.jsonl');
  const fake = join(folder, 'fake-adb.cjs'),
    result = join(folder, 'output');
  await writeFile(raw, output(complete()));
  await writeFile(
    fake,
    '#!/usr/bin/env node\n' +
      "const fs=require('node:fs');const args=process.argv.slice(2);" +
      'fs.appendFileSync(' +
      JSON.stringify(log) +
      ",JSON.stringify(args)+'\\n');" +
      "if(args.includes('get-state'))process.stdout.write('device\\n');" +
      "else if(args.includes('instrument'))process.stdout.write(fs.readFileSync(" +
      JSON.stringify(raw) +
      '));' +
      "else if(args.includes('exec-out'))process.stdout.write('synthetic-png');" +
      "else if(args.includes('start'))process.stdout.write('Started');" +
      'else process.exit(2);\n',
  );
  await chmod(fake, 0o755);
  const run = await execute(
    process.execPath,
    [
      join(root, 'scripts/native-catalog/android-popper.mjs'),
      'run',
      '--scenario',
      'paper',
      '--font-profile',
      'normal',
      '--serial',
      'emulator-5554',
      '--output',
      result,
      '--adb',
      fake,
    ],
    { maxBuffer: 4 * 1024 * 1024 },
  );
  assert.equal(JSON.parse(run.stdout).report.scenario, 'paper-v1');
  const calls = (await readFile(log, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.ok(
    calls.some(
      (args) => args.includes('instrument') && args.includes('paper') && args.includes('normal'),
    ),
  );
  assert.equal(JSON.parse(await readFile(join(result, 'report.json'))).states.length, 33);
});
