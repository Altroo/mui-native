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
  boxInputs,
  boxKeys,
  boxStates,
  boxPictures,
  boxNativeReset,
  inspectBoxReport,
  summarizeBox,
} from './android-box-report.mjs';
import { prepareBoxSource } from './android-box-source.mjs';
import { run, catalogPackage, component } from './android-popper.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const execute = promisify(execFile);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const color = (hex) => (0xff000000 + parseInt(hex.slice(1), 16)) >>> 0;
const output = (report, code = -1) =>
  'INSTRUMENTATION_RESULT: boxReport=' +
  JSON.stringify(report) +
  '\nINSTRUMENTATION_CODE: ' +
  code +
  '\n';
// This synthetic parser fixture uses authored inputs, not application observations.
// Literal rows are independent of the parser's boxExpected implementation.
const authored = [
  [0, 16, 24, '#ffffff', '#203247'],
  [0, 16, 24, '#ffffff', '#203247'],
  [16, 18, 26, '#1565c0', '#ffffff'],
  [4, 20, 28, '#243447', '#f5f7fa'],
  [8, 16, 24, '#ffffff', '#203247'],
  [0, 16, 24, '#ffffff', '#203247'],
  [8, 24, 32, '#ffffff', '#7542a6'],
  [0, 16, 24, '#ffffff', '#6a1b9a'],
  [0, 16, 24, '#ffffff', '#203247'],
  [0, 16, 24, '#243447', '#f5f7fa'],
  [0, 16, 24, '#ffffff', '#203247'],
];
function complete(fontProfile = 'normal', density = 2.625, nonlinear = false) {
  const fontScale = fontProfile === 'normal' ? 1 : 2;
  const sizes = [1, 14, 16, 18, 20, 24, 26, 28, 32];
  const factors = [2, 1.8, 1.7, 1.6, 1.55, 1.45, 1.4, 1.35, 1.3];
  const spToPx = Object.fromEntries(
    sizes.map((s, i) => [String(s), s * density * (nonlinear ? factors[i] : fontScale)]),
  );
  const initialRoots = boxKeys.map((key, i) => ({
    key,
    rootId: 100 + i,
    counterId: 200 + i,
    textId: 300 + i,
    counterText: key + ' 0',
  }));
  return {
    schemaVersion: 1,
    scenario: 'box-native-root-contract-v1',
    driver: 'native Instrumentation and UiAutomation',
    paintMethod: 'retained-view-draw-interior-samples',
    status: 'passed',
    fontProfile,
    artifactDirectory: 'cache/mui-box-12345',
    device: {
      package: catalogPackage,
      sdk: 37,
      model: 'synthetic-parser-fixture',
      density,
      fontScale,
      spToPx,
    },
    initial: { counts: { stock: 0, custom: 0, styled: 0 }, roots: initialRoots },
    stages: [...boxStates],
    screenshots: [...boxPictures],
    navigation: [
      {
        control: 'catalog-tab-Wrappers',
        destination: 'root-layout-box',
        attempts: 1,
        success: true,
      },
      {
        control: 'root-layout-box',
        destination: 'box-contract-receipt',
        attempts: 1,
        success: true,
      },
    ],
    states: boxInputs.map((input, index) => {
      const [padding, fontSize, lineHeight, background, foreground] = authored[index];
      const metadata = {
        schemaVersion: 1,
        scenario: 'box-v1',
        state: index,
        input: { ...input },
        sequenceLength: 11,
        fontScale,
        windowProfile: { width: 393, height: 852, scale: density },
        counts: { stock: 1, custom: 1, styled: 1 },
        request: index + 1,
        refRevision: 6,
        touch: { count: 1, target: 12345, pageX: 80, pageY: 200, timestamp: 2000 },
        refs: {},
        textRefs: {},
        receipts: {},
        textReceipts: {},
        authoredNativeReset: input.reset ? { ...boxNativeReset } : null,
      };
      const roots = boxKeys.map((key, k) => {
        const border = key === 'styled' && index !== 9 ? 2 : 0;
        const bg =
          key === 'styled' && ![3, 9].includes(index)
            ? index === 2
              ? '#0b5d44'
              : '#e8f0fa'
            : key === 'custom' && index === 8
              ? '#27384a'
              : background;
        const fg = key === 'custom' && index === 8 ? '#f5f7fa' : foreground;
        const leftPadding = index === 5 ? 24 : index === 7 ? 20 : padding;
        const rightPadding = index === 5 ? 8 : padding;
        const marginLeft = index === 5 ? 12 : 0,
          marginRight = index === 5 ? 4 : 0;
        const counterHeight = Math.max(44, (Math.ceil(spToPx['14']) * 1.2) / density + 16);
        const copyHeight = Math.ceil(spToPx[String(lineHeight)]) / density;
        const height = Math.max(88, counterHeight + copyHeight + padding * 2 + border * 2);
        const frame = { x: 10, y: 100 + k * 180, width: 280, height: height + 24 };
        const bounds = {
          x: frame.x + 12 + marginLeft,
          y: frame.y + 12,
          width: 256 - marginLeft - marginRight,
          height,
        };
        const counter = {
          x: bounds.x + leftPadding + border,
          y: bounds.y + padding + border,
          width: bounds.width - leftPadding - rightPadding - border * 2,
          height: counterHeight,
        };
        const textBounds = {
          x: counter.x,
          y: counter.y + counter.height,
          width: counter.width,
          height: copyHeight,
        };
        const ref = { attached: 1, cleaned: 0, generation: 1, sameRoot: true };
        metadata.refs[key] = { ...ref };
        metadata.textRefs[key] = { ...ref };
        metadata.receipts[key] = {
          window: { ...bounds },
          request: index + 1,
          state: index,
          generation: 1,
        };
        metadata.textReceipts[key] = {
          window: { ...textBounds },
          request: index + 1,
          state: index,
          generation: 1,
        };
        const widthPx = Math.round(bounds.width * density),
          heightPx = Math.round(height * density),
          inset = Math.round(4 * density);
        const xs = [
          inset,
          Math.floor((widthPx - 1) / 4),
          Math.floor((widthPx - 1) / 2),
          Math.floor((3 * (widthPx - 1)) / 4),
          widthPx - 1 - inset,
        ];
        const bandRows = Math.ceil(4 * density) + 2,
          bandWidth = Math.floor(border * density);
        const paint = {
          method: 'retained-view-draw',
          widthPx,
          heightPx,
          excludedTextRects: [
            {
              left: Math.round(widthPx / 3),
              top: Math.round((padding + border + 8) * density),
              right: Math.round((widthPx * 2) / 3),
              bottom: Math.round((padding + border + counterHeight - 8) * density),
            },
            {
              left: Math.round((textBounds.x - bounds.x) * density),
              top: Math.round((textBounds.y - bounds.y) * density),
              right: Math.round((textBounds.x - bounds.x + textBounds.width) * density),
              bottom: Math.round((textBounds.y - bounds.y + textBounds.height) * density),
            },
          ],
          samples: xs.map((x) => ({ x, y: Math.round(4 * density), argb: color(bg) })),
          edgeSamples: xs.map((x) => ({
            x,
            y: Math.round(density),
            argb: border && Math.round(density) < bandWidth ? color('#546e7a') : color(bg),
          })),
          topBorderColumns: xs.slice(1, 4).map((x) => ({
            x,
            pixels: Array.from({ length: bandRows }, (_, y) =>
              color(y < bandWidth ? '#546e7a' : bg),
            ),
          })),
        };
        return {
          ...initialRoots[k],
          alpha: 1,
          effectiveAlpha: 1,
          shown: true,
          counterText: key + ' 1',
          class: 'com.facebook.react.views.view.ReactViewGroup',
          direction: input.rtl ? 'rtl' : 'ltr',
          frame,
          bounds,
          counter,
          textBounds,
          copyText: 'Copy',
          counterTextClass: 'com.facebook.react.views.text.ReactTextView',
          textClass: 'com.facebook.react.views.text.PreparedLayoutTextView',
          counterFontPx: Math.ceil(spToPx['14']),
          counterColor: color(fg),
          textFontPx: Math.ceil(spToPx[String(fontSize)]),
          textLineHeightPx: Math.ceil(spToPx[String(lineHeight)]),
          textLetterSpacingEm:
            key === 'styled' ? spToPx['1'] / Math.ceil(spToPx[String(fontSize)]) : 0,
          textColor: color(fg),
          borderWidthDp: border,
          borderColor: key === 'styled' ? color('#546e7a') : null,
          radiusDp: 0,
          paint,
        };
      });
      return { name: input.name, metadata, roots };
    }),
  };
}
const parse = (r, fontProfile = r.fontProfile) => summarizeBox(output(r), { fontProfile });
const mutateBounds = (r, index, fn) => {
  const state = r.states[index],
    root = state.roots[0];
  fn(root);
  state.metadata.receipts.stock.window = { ...root.bounds };
};
for (const density of [0.5, 0.75, 1, 1.5, 2, 2.625, 3, 4])
  for (const profile of ['normal', 'enlarged'])
    test('finite synthetic ' + profile + ' geometry/raster at density ' + density, () => {
      const report = complete(profile, density);
      assert.deepEqual(parse(report), report);
    });
test('identity hashes use Java signed int32 and remain retained independently of React tags', () => {
  const r = complete();
  for (const [field, value] of [
    ['rootId', 0],
    ['counterId', -2147483648],
  ]) {
    r.initial.roots[0][field] = value;
    for (const state of r.states) state.roots[0][field] = value;
  }
  assert.deepEqual(parse(r), r);
});
test('nonlinear native SP conversion and integer font rounding are accepted', () => {
  const report = complete('enlarged', 2.625, true);
  assert.deepEqual(parse(report), report);
});
test('bounded 3/255 raster quantization and one physical pixel positions are accepted', () => {
  const r = complete();
  r.states[0].roots[0].paint.samples[0].argb = color('#fcfcfc');
  r.states[0].roots[0].paint.samples[0].x += 1;
  assert.deepEqual(parse(r), r);
});
const negatives = [
  ['wrong schema', (r) => (r.schemaVersion = 2)],
  ['wrong scenario', (r) => (r.scenario = 'paper-v1')],
  ['computed paint claim', (r) => (r.paintMethod = 'computed-style')],
  ['foreign package', (r) => (r.device.package = 'some.other.app')],
  ['API below native frame capture', (r) => (r.device.sdk = 28)],
  ['nonfinite density', (r) => (r.device.density = Infinity)],
  ['zero density', (r) => (r.device.density = 0)],
  ['oversized band density', (r) => (r.device.density = 17)],
  ['wrong OS profile', (r) => (r.device.fontScale = 1.3)],
  ['wrong requested profile', (r) => (r.fontProfile = 'enlarged')],
  ['missing SP conversion', (r) => delete r.device.spToPx['14']],
  ['nonfinite SP conversion', (r) => (r.device.spToPx['14'] = NaN)],
  ['unordered SP conversion', (r) => (r.device.spToPx['20'] = 1)],
  ['unsafe artifact parent', (r) => (r.artifactDirectory = 'cache/../mui-box-1')],
  ['absolute artifact path', (r) => (r.artifactDirectory = '/cache/mui-box-1')],
  ['foreign artifact prefix', (r) => (r.artifactDirectory = 'cache/mui-paper-1')],
  ['unsafe screenshot', (r) => (r.screenshots[0] = '../outside.png')],
  ['unknown screenshot', (r) => (r.screenshots[0] = 'other.png')],
  ['duplicate screenshot', (r) => (r.screenshots[1] = r.screenshots[0])],
  ['failed status with successful exit code', (r) => (r.status = 'failed')],
  ['error retained on passing status', (r) => (r.error = 'actual paint failed')],
  ['missing stage', (r) => r.stages.pop()],
  ['reordered stages', (r) => r.stages.reverse()],
  ['missing state', (r) => r.states.pop()],
  ['wrong initial count', (r) => (r.initial.counts.stock = 1)],
  ['wrong initial native child', (r) => (r.initial.roots[0].counterText = 'stock 1')],
  [
    'duplicate initial native object',
    (r) => (r.initial.roots[0].textId = r.initial.roots[0].rootId),
  ],
  ['missing root', (r) => r.states[1].roots.pop()],
  [
    'hash outside Java int32',
    (r) => {
      r.initial.roots[0].rootId = 2147483648;
      for (const state of r.states) state.roots[0].rootId = 2147483648;
    },
  ],
  ['fractional identity hash', (r) => (r.initial.roots[0].rootId = 100.5)],
  ['replaced native root', (r) => (r.states[1].roots[0].rootId += 1)],
  ['replaced counter', (r) => (r.states[1].roots[0].counterId += 1)],
  ['replaced Copy host', (r) => (r.states[1].roots[0].textId += 1)],
  ['foreign host class', (r) => (r.states[1].roots[0].class = 'android.widget.TextView')],
  ['ignored-config self opacity leak', (r) => (r.states[1].roots[0].alpha = 0.1)],
  ['ignored-config ancestor opacity leak', (r) => (r.states[1].roots[0].effectiveAlpha = 0.2)],
  ['native root hidden', (r) => (r.states[1].roots[0].shown = false)],
  ['wrong local RTL', (r) => (r.states[5].roots[0].direction = 'ltr')],
  ['wrong state receipt', (r) => (r.states[2].metadata.state = 1)],
  ['wrong authored input', (r) => (r.states[2].metadata.input.reset = true)],
  ['incorrect finite length', (r) => (r.states[2].metadata.sequenceLength = 10)],
  ['missing root ref', (r) => delete r.states[2].metadata.refs.stock],
  ['missing text receipt', (r) => delete r.states[2].metadata.textReceipts.stock],
  ['replaced ref generation', (r) => (r.states[2].metadata.refs.stock.generation = 2)],
  ['ref cleanup happened', (r) => (r.states[2].metadata.textRefs.stock.cleaned = 1)],
  ['stale measured root', (r) => (r.states[2].metadata.receipts.stock.request = 1)],
  ['stale measured Copy', (r) => (r.states[2].metadata.textReceipts.stock.state = 0)],
  ['stale explicit request', (r) => (r.states[2].metadata.request = r.states[1].metadata.request)],
  ['changed scene font', (r) => (r.states[2].metadata.fontScale = 1.1)],
  ['changed native window', (r) => (r.states[2].metadata.windowProfile.width += 1)],
  ['wrong native density receipt', (r) => (r.states[2].metadata.windowProfile.scale += 0.1)],
  ['missing native touch', (r) => (r.states[2].metadata.touch = null)],
  ['duplicated first touch count', (r) => (r.states[2].metadata.touch.count = 2)],
  ['later event replaces first', (r) => (r.states[2].metadata.touch.timestamp += 1)],
  ['nonfinite event', (r) => (r.states[2].metadata.touch.pageX = NaN)],
  ['counter increments twice', (r) => (r.states[2].metadata.counts.custom = 2)],
  ['wrong native counter glyph', (r) => (r.states[2].roots[0].counterText = 'stock 2')],
  ['wrong actual Copy text', (r) => (r.states[2].roots[0].copyText = 'Other')],
  ['wrong native Counter font', (r) => (r.states[2].roots[0].counterFontPx += 2)],
  ['wrong actual text font', (r) => (r.states[2].roots[0].textFontPx += 2)],
  ['wrong line height', (r) => (r.states[2].roots[0].textLineHeightPx += 2)],
  ['lost descendant letter spacing', (r) => (r.states[2].roots[2].textLetterSpacingEm = 0)],
  ['wrong inherited text color', (r) => (r.states[2].roots[0].textColor = 0xff000000)],
  ['wrong counter foreground', (r) => (r.states[2].roots[0].counterColor = 0xff000000)],
  ['lost physical padding', (r) => (r.states[5].roots[0].counter.x -= 16)],
  ['root width ignores margin', (r) => mutateBounds(r, 5, (v) => (v.bounds.width += 16))],
  [
    'oversized intrinsic root',
    (r) =>
      mutateBounds(r, 2, (v) => {
        v.bounds.height += 20;
        v.frame.height += 20;
        v.paint.heightPx = Math.round(v.bounds.height * r.device.density);
      }),
  ],
  [
    'clipped enlarged child',
    (r) =>
      mutateBounds(r, 2, (v) => {
        v.counter.height = 76;
        v.bounds.height = 88;
        v.frame.height = 112;
      }),
  ],
  ['touch target below min44', (r) => (r.states[0].roots[0].counter.height = 20)],
  [
    'sub44 touch target with otherwise consistent stack',
    (r) => {
      const s = r.states[0],
        v = s.roots[0];
      v.counter.height = 43;
      v.textBounds.y = v.counter.y + 43;
      s.metadata.textReceipts.stock.window = { ...v.textBounds };
      const e = v.paint.excludedTextRects[1];
      e.top = Math.round((v.textBounds.y - v.bounds.y) * r.device.density);
      e.bottom = Math.round((v.textBounds.y - v.bounds.y + v.textBounds.height) * r.device.density);
    },
  ],
  ['wrong border native width', (r) => (r.states[2].roots[2].borderWidthDp = 0)],
  ['wrong border native color', (r) => (r.states[2].roots[2].borderColor = 0xff000000)],
  ['native reset retains border', (r) => (r.states[9].roots[2].borderWidthDp = 2)],
  ['unexpected radius', (r) => (r.states[2].roots[2].radiusDp = 4)],
  ['fractional bitmap', (r) => (r.states[2].roots[0].paint.widthPx += 0.5)],
  ['bitmap differs from native width', (r) => (r.states[2].roots[0].paint.widthPx += 2)],
  ['oversized bitmap', (r) => (r.states[2].roots[0].paint.widthPx = 100000)],
  ['wrong raster method', (r) => (r.states[2].roots[0].paint.method = 'computed-style')],
  ['missing interior sample', (r) => r.states[2].roots[0].paint.samples.pop()],
  [
    'duplicate interior sample',
    (r) => (r.states[2].roots[0].paint.samples[1] = r.states[2].roots[0].paint.samples[0]),
  ],
  ['fractional point', (r) => (r.states[2].roots[0].paint.samples[0].x += 0.5)],
  ['point moved past tolerance', (r) => (r.states[2].roots[0].paint.samples[0].x += 2)],
  ['out of bitmap sample', (r) => (r.states[2].roots[0].paint.samples[0].y = -1)],
  ['signed ARGB', (r) => (r.states[2].roots[0].paint.samples[0].argb = -1)],
  ['translucent paint', (r) => (r.states[2].roots[0].paint.samples[0].argb = 0xfe1565c0)],
  ['surface 4/255 wrong', (r) => (r.states[2].roots[0].paint.samples[0].argb = color('#1965c0'))],
  [
    'sample overlaps text',
    (r) => {
      const p = r.states[2].roots[0].paint,
        s = p.samples[0];
      p.excludedTextRects.push({ left: s.x, top: s.y, right: s.x + 1, bottom: s.y + 1 });
    },
  ],
  ['missing actual text exclusions', (r) => (r.states[2].roots[0].paint.excludedTextRects = [])],
  [
    'fractional text rectangle',
    (r) => (r.states[2].roots[0].paint.excludedTextRects[0].left += 0.5),
  ],
  ['empty text rectangle', (r) => (r.states[2].roots[0].paint.excludedTextRects[0].right = 0)],
  ['missing native edge probe', (r) => r.states[9].roots[2].paint.edgeSamples.pop()],
  [
    'stale reset edge border paint',
    (r) => r.states[9].roots[2].paint.edgeSamples.forEach((p) => (p.argb = color('#546e7a'))),
  ],
  ['missing native border columns', (r) => r.states[2].roots[2].paint.topBorderColumns.pop()],
  [
    'one gray pixel fakes positive border',
    (r) =>
      r.states[2].roots[2].paint.topBorderColumns.forEach((c) => {
        c.pixels.fill(color('#0b5d44'));
        c.pixels[0] = color('#546e7a');
      }),
  ],
  [
    'stale reset band despite good interior',
    (r) => (r.states[9].roots[2].paint.topBorderColumns[1].pixels[0] = color('#546e7a')),
  ],
  [
    'missing positive border paint',
    (r) =>
      r.states[2].roots[2].paint.topBorderColumns.forEach((c) => c.pixels.fill(color('#0b5d44'))),
  ],
  [
    'excessively thick native border',
    (r) => r.states[2].roots[2].paint.topBorderColumns[0].pixels.fill(color('#546e7a')),
  ],
  [
    'unbounded border column',
    (r) => r.states[2].roots[2].paint.topBorderColumns[0].pixels.push(0xffffffff),
  ],
  ['fractional column x', (r) => (r.states[2].roots[2].paint.topBorderColumns[0].x += 0.5)],
  ['incomplete navigation', (r) => (r.navigation[1].success = false)],
  ['excess navigation attempts', (r) => (r.navigation[1].attempts = 4)],
];
for (const [name, mutate] of negatives)
  test('rejects ' + name, () => {
    const r = complete();
    mutate(r);
    assert.throws(() => parse(r));
  });
test('terminal success does not hide failed, duplicate or interrupted instrumentation', () => {
  const r = complete();
  for (const text of [
    output(r, 0),
    output(r) + 'INSTRUMENTATION_CODE: -1\n',
    output(r) + 'INSTRUMENTATION_ABORTED: stopped\n',
    output(r) + output(r),
  ])
    assert.throws(() => summarizeBox(text, { fontProfile: 'normal' }));
  r.status = 'failed';
  assert.throws(() => parse(r));
  assert.equal(inspectBoxReport(output(r)).status, 'failed');
});
async function temp(t) {
  const p = await mkdtemp(join(tmpdir(), 'mui-box-node-'));
  t.after(() => rm(p, { recursive: true, force: true }));
  return p;
}
const targets = (p) => ({
  source: join(p, 'app/src/androidTest/java/dev/altroo/muinative/catalog/test/BoxScenario.java'),
  journal: join(p, '.mui-native-box-instrumentation.json'),
});
test('preparation copies only guarded Java source and permits repeat/owned updates', async (t) => {
  const p = await temp(t),
    paths = targets(p),
    target = await prepareBoxSource(p);
  assert.equal(target, paths.source);
  assert.equal(
    await readFile(target, 'utf8'),
    await readFile(join(root, 'tests/native/android/BoxScenario.java'), 'utf8'),
  );
  const old = '// previous generated Box source\n';
  await writeFile(target, old);
  await writeFile(paths.journal, JSON.stringify({ schemaVersion: 1, sourceSha256: digest(old) }));
  await prepareBoxSource(p);
  await prepareBoxSource(p);
  assert.equal(
    JSON.parse(await readFile(paths.journal)).sourceSha256,
    digest(await readFile(target)),
  );
});
test('preparation preserves edited and unowned sources before any write', async (t) => {
  const p = await temp(t),
    paths = targets(p);
  await prepareBoxSource(p);
  const before = await readFile(paths.journal);
  await writeFile(paths.source, '// manual edit\n');
  await assert.rejects(prepareBoxSource(p), /Preserve edits/);
  assert.deepEqual(await readFile(paths.journal), before);
  assert.equal(await readFile(paths.source, 'utf8'), '// manual edit\n');
});
test('malformed ownership shapes fail closed without changing source', async (t) => {
  const p = await temp(t),
    paths = targets(p);
  await prepareBoxSource(p);
  const source = await readFile(paths.source);
  for (const journal of [
    '[]',
    'null',
    '{',
    '{"schemaVersion":1,"sourceSha256":12}',
    '{"schemaVersion":true,"sourceSha256":"' + 'a'.repeat(64) + '"}',
    '{"schemaVersion":1,"sourceSha256":"' + 'a'.repeat(64) + '","extra":1}',
  ]) {
    await writeFile(paths.journal, journal);
    await assert.rejects(prepareBoxSource(p));
    assert.deepEqual(await readFile(paths.source), source);
  }
});
for (const part of ['source', 'journal'])
  test('preparation preserves a manual ' + part + ' symlink', async (t) => {
    const p = await temp(t),
      paths = targets(p);
    await prepareBoxSource(p);
    const outside = join(p, 'manual-' + part),
      bytes = await readFile(paths[part]);
    await writeFile(outside, bytes);
    await rm(paths[part]);
    await symlink(outside, paths[part]);
    await assert.rejects(prepareBoxSource(p), /non-regular/);
    assert.deepEqual(await readFile(outside), bytes);
  });
test('preparation refuses a linked generated-source ancestor', async (t) => {
  const p = await temp(t),
    outside = await temp(t);
  await symlink(outside, join(p, 'app'));
  await assert.rejects(prepareBoxSource(p), /non-directory/);
});
function adbMock(report, { interrupted = false, stopFails = false } = {}) {
  const calls = [];
  return {
    calls,
    execute: async (file, args) => {
      assert.equal(file, 'synthetic-adb');
      calls.push(args);
      const c = args.slice(2);
      if (c[0] === 'get-state') return Buffer.from('device\n');
      if (c.includes('instrument')) {
        if (interrupted)
          throw Object.assign(Error('synthetic interruption'), {
            stdout: Buffer.from(output(report)),
            stderr: Buffer.from('interrupted'),
          });
        return Buffer.from(output(report));
      }
      if (c[0] === 'exec-out') return Buffer.from('synthetic-png');
      if (c.includes('force-stop')) {
        if (stopFails) throw Error('synthetic unconfirmed termination');
        return Buffer.from('');
      }
      if (c.includes('ps')) return Buffer.from('NAME\n');
      if (c.includes('start')) return Buffer.from('Started');
      throw Error('Unexpected synthetic command ' + JSON.stringify(args));
    },
  };
}
test('runner requires Box profile, pulls only finite artifacts and restores catalog', async (t) => {
  const p = await temp(t),
    r = complete(),
    mock = adbMock(r);
  assert.deepEqual(
    await run(
      {
        adb: 'synthetic-adb',
        serial: 'emulator-5554',
        output: p,
        scenario: 'box',
        fontProfile: 'normal',
      },
      mock.execute,
    ),
    r,
  );
  const c = mock.calls.find((v) => v.includes('instrument'));
  assert(c.includes('box') && c.includes('fontProfile') && c.includes('normal'));
  assert.equal(c.at(-1), component);
  assert.equal(mock.calls.filter((v) => v.includes('exec-out')).length, 11);
  assert(mock.calls.at(-1).includes(catalogPackage + '/.MainActivity'));
});
test('failed reports retain diagnostics even with code-1 and confirm termination before restore', async (t) => {
  const p = await temp(t),
    r = complete();
  Object.assign(r, {
    status: 'failed',
    error: 'actual paint mismatch',
    states: [],
    stages: [],
    screenshots: ['failure.png'],
  });
  const mock = adbMock(r, { interrupted: true });
  await assert.rejects(
    run(
      {
        adb: 'synthetic-adb',
        serial: 'emulator-5554',
        output: p,
        scenario: 'box',
        fontProfile: 'normal',
      },
      mock.execute,
    ),
  );
  assert.equal(JSON.parse(await readFile(join(p, 'report.json'))).status, 'failed');
  assert.equal(await readFile(join(p, 'failure.png'), 'utf8'), 'synthetic-png');
  const stop = mock.calls.findIndex((v) => v.includes('force-stop')),
    ps = mock.calls.findIndex((v) => v.includes('ps')),
    start = mock.calls.findIndex((v) => v.includes('start'));
  assert(stop >= 0 && ps > stop && start > ps);
});
test('unsafe artifacts never pull and unconfirmed termination prevents restore', async (t) => {
  const p = await temp(t),
    r = complete();
  r.artifactDirectory = 'cache/../outside';
  const mock = adbMock(r, { stopFails: true });
  await assert.rejects(
    run(
      {
        adb: 'synthetic-adb',
        serial: 'emulator-5554',
        output: p,
        scenario: 'box',
        fontProfile: 'normal',
      },
      mock.execute,
    ),
    /termination unconfirmed/,
  );
  assert(!mock.calls.some((v) => v.includes('exec-out') || v.includes('start')));
});
test('invalid profile/device/global-RTL/pre-abort make no adb call', async (t) => {
  const p = await temp(t),
    mock = adbMock(complete());
  for (const extra of [
    { fontProfile: undefined },
    { fontProfile: 'large' },
    { serial: undefined },
    { globalRTL: true },
  ])
    await assert.rejects(
      run(
        {
          adb: 'synthetic-adb',
          serial: 'emulator-5554',
          output: p,
          scenario: 'box',
          fontProfile: 'normal',
          ...extra,
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
        output: p,
        scenario: 'box',
        fontProfile: 'normal',
        signal: controller.signal,
      },
      mock.execute,
    ),
  );
  assert.equal(mock.calls.length, 0);
});
test('real CLI prepare adds Box while retaining Paper/Divider/alignment and source-edit guards', async (t) => {
  const p = await temp(t);
  await mkdir(join(p, 'app'));
  await writeFile(
    join(p, 'app/build.gradle'),
    "android { defaultConfig { applicationId 'dev.altroo.muinative.catalog' } }\n",
  );
  await execute(process.execPath, [
    join(root, 'scripts/native-catalog/android-popper.mjs'),
    'prepare',
    '--project',
    p,
  ]);
  const dispatcher = await readFile(
    join(
      p,
      'app/src/androidTest/java/dev/altroo/muinative/catalog/test/PopperInstrumentation.java',
    ),
    'utf8',
  );
  for (const name of ['Box', 'Paper', 'Divider'])
    assert.match(dispatcher, new RegExp(name + 'Scenario\\.run\\(this, dividerFontProfile\\)'));
  assert.match(dispatcher, /text-alignment/);
  assert.match(dispatcher, /LayoutRootScenario\.run/);
  const paths = targets(p);
  await writeFile(paths.source, '// preserve manual edit\n');
  await assert.rejects(
    execute(process.execPath, [
      join(root, 'scripts/native-catalog/android-popper.mjs'),
      'prepare',
      '--project',
      p,
    ]),
    /Preserve edits to generated Box/,
  );
});

test('real CLI routes Box through a fake executable without a device', async (t) => {
  const folder = await temp(t),
    raw = join(folder, 'report.txt'),
    log = join(folder, 'calls.jsonl'),
    fake = join(folder, 'fake-adb.cjs'),
    result = join(folder, 'output');
  await writeFile(raw, output(complete()));
  await writeFile(
    fake,
    '#!/usr/bin/env node\n' +
      "const fs=require('node:fs');const a=process.argv.slice(2);" +
      'fs.appendFileSync(' +
      JSON.stringify(log) +
      ",JSON.stringify(a)+'\\n');" +
      "if(a.includes('get-state'))process.stdout.write('device\\n');" +
      "else if(a.includes('instrument'))process.stdout.write(fs.readFileSync(" +
      JSON.stringify(raw) +
      '));' +
      "else if(a.includes('exec-out'))process.stdout.write('synthetic-png');" +
      "else if(a.includes('start'))process.stdout.write('Started');" +
      'else process.exit(2);\n',
  );
  await chmod(fake, 0o755);
  const response = await execute(
    process.execPath,
    [
      join(root, 'scripts/native-catalog/android-popper.mjs'),
      'run',
      '--scenario',
      'box',
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
  assert.equal(JSON.parse(response.stdout).report.scenario, 'box-native-root-contract-v1');
  const calls = (await readFile(log, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert(
    calls.some(
      (args) => args.includes('instrument') && args.includes('box') && args.includes('normal'),
    ),
  );
  assert.equal(JSON.parse(await readFile(join(result, 'report.json'))).states.length, 11);
});

test('ceil-integer native getters tolerate only serialization noise', () => {
  const r = complete();
  for (const field of ['textFontPx', 'counterFontPx', 'textLineHeightPx'])
    r.states[3].roots[0][field] += 1e-5;
  assert.deepEqual(parse(r), r);
});
for (const field of ['textFontPx', 'counterFontPx', 'textLineHeightPx'])
  for (const difference of [-1, 1])
    test('rejects one integer pixel error in ' + field + ' direction ' + difference, () => {
      const r = complete();
      r.states[3].roots[0][field] += difference;
      assert.throws(() => parse(r));
    });
test('low-density inline20/28 rejects the previous18/26 font and line getter', () => {
  const r = complete('normal', 0.5),
    v = r.states[3].roots[0];
  v.textFontPx = Math.ceil(r.device.spToPx['18']);
  v.textLineHeightPx = Math.ceil(r.device.spToPx['26']);
  v.textBounds.height = v.textLineHeightPx / r.device.density;
  r.states[3].metadata.textReceipts.stock.window = { ...v.textBounds };
  v.paint.excludedTextRects[1].bottom = Math.round(
    (v.textBounds.y - v.bounds.y + v.textBounds.height) * r.device.density,
  );
  assert.throws(() => parse(r));
});
function halfBand(r, index, pure, half, background) {
  for (const column of r.states[index].roots[2].paint.topBorderColumns) {
    column.pixels.fill(color(background));
    for (let i = 0; i < pure; i++) column.pixels[i] = color('#546e7a');
    column.pixels[pure] = color(half);
  }
}
for (const [index, half, background] of [
  [0, '#9eafba', '#e8f0fa'],
  [2, '#2f655f', '#0b5d44'],
  [3, '#3c5160', '#243447'],
])
  test('actual normal packet-shaped half antialias coverage at state ' + index, () => {
    const r = complete();
    halfBand(r, index, 4, half, background);
    assert.deepEqual(parse(r), r);
  });
test('low-density odd native stroke can have a partial pixel and no fully covered row', () => {
  const r = complete('normal', 0.5);
  halfBand(r, 0, 0, '#9eafba', '#e8f0fa');
  assert.deepEqual(parse(r), r);
});
for (const [name, change] of [
  ['wrong1dp paint band', (r) => halfBand(r, 0, 2, '#9eafba', '#e8f0fa')],
  ['wrong3dp paint band', (r) => halfBand(r, 0, 7, '#9eafba', '#e8f0fa')],
  ['arbitrary transition hue', (r) => halfBand(r, 0, 4, '#9e00ba', '#e8f0fa')],
  [
    'two antialiased transition rows',
    (r) => {
      halfBand(r, 0, 4, '#9eafba', '#e8f0fa');
      for (const c of r.states[0].roots[2].paint.topBorderColumns) c.pixels[5] = color('#9eafba');
    },
  ],
  [
    'detached paint after the end of the band',
    (r) => {
      halfBand(r, 0, 4, '#9eafba', '#e8f0fa');
      r.states[0].roots[2].paint.topBorderColumns[0].pixels[7] = color('#546e7a');
    },
  ],
  [
    'blend at retained reset border',
    (r) => {
      const c = r.states[9].roots[2].paint.topBorderColumns[0];
      c.pixels[0] = color('#3c5160');
    },
  ],
  [
    'background before detached border',
    (r) => {
      halfBand(r, 0, 4, '#9eafba', '#e8f0fa');
      r.states[0].roots[2].paint.topBorderColumns[0].pixels[0] = color('#e8f0fa');
    },
  ],
])
  test('rejects bounded antialias counterexample ' + name, () => {
    const r = complete();
    change(r);
    assert.throws(() => parse(r));
  });
