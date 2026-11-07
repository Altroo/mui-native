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
  cardInputs,
  cardKeys,
  cardStates,
  cardPictures,
  cardProbeInputs,
  inspectCardReport,
  summarizeCard,
} from './android-card-report.mjs';
import { prepareCardSource } from './android-card-source.mjs';
import { run, catalogPackage, component } from './android-popper.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..'),
  execute = promisify(execFile);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const color = (hex) => (0xff000000 + parseInt(hex.slice(1), 16)) >>> 0;
const output = (r, code = -1) =>
  'INSTRUMENTATION_RESULT: cardReport=' +
  JSON.stringify(r) +
  '\nINSTRUMENTATION_CODE: ' +
  code +
  '\n';
// Synthetic input fixtures. Native expected palette/geometry is literal rather
// than obtained from cardExpected or scene-computed styling.
const nativeProbes = [
  { key: 'theme', id: 'card-contract-probe-theme', rgb: [21, 101, 192], radius: 4, alpha: 0.7 },
  { key: 'owner', id: 'card-contract-probe-owner', rgb: [11, 93, 68], radius: 4, alpha: 1 },
  { key: 'as', id: 'card-contract-probe-as-alternate', rgb: [69, 39, 160], radius: 0, alpha: 1 },
];
const rgba = (rgb) => (0xff000000 + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]) >>> 0;
function paint(bounds, density, rgb, border = 0, textRects = []) {
  const widthPx = Math.round(bounds.width * density),
    heightPx = Math.round(bounds.height * density),
    offset = Math.round(4 * density);
  const xs = [
    offset,
    Math.floor((widthPx - 1) / 4),
    Math.floor((widthPx - 1) / 2),
    Math.floor((3 * (widthPx - 1)) / 4),
    widthPx - 1 - offset,
  ];
  const band = border * density,
    pure = Math.floor(band),
    fraction = band - pure;
  const blend = rgba(rgb.map((value) => Math.round(224 * fraction + value * (1 - fraction))));
  return {
    method: 'retained-view-draw',
    widthPx,
    heightPx,
    excludedTextRects: textRects,
    samples: xs.map((x) => ({ x, y: Math.round(4 * density), argb: rgba(rgb) })),
    edgeSamples: xs.map((x) => ({
      x,
      y: Math.round(density),
      argb: border && Math.round(density) < pure ? 0xffe0e0e0 : rgba(rgb),
    })),
    topBorderColumns: xs.slice(1, 4).map((x) => ({
      x,
      pixels: Array.from({ length: Math.ceil(4 * density) + 2 }, (_, y) =>
        y < pure ? 0xffe0e0e0 : y === pure && fraction > 1e-6 ? blend : rgba(rgb),
      ),
    })),
  };
}
function complete(fontProfile = 'normal', density = 2.625, nonlinear = false) {
  const fontScale = fontProfile === 'normal' ? 1 : 2,
    sizes = [1, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32];
  const actualSP = [
    5.25, 68.25, 73.5, 78.75, 89.25, 91.875, 94.5, 96.25, 98, 101.2, 104.39999389648438,
  ];
  const spToPx = Object.fromEntries(
    sizes.map((size, i) => [
      String(size),
      nonlinear ? (actualSP[i] * density) / 2.625 : size * density * fontScale,
    ]),
  );
  const initialRoots = cardKeys.map((key, i) => ({
    key,
    rootId: 100 + i,
    counterId: 200 + i,
    textId: 300 + i,
    counterText: key + ' 0',
  }));
  const initialProbes = nativeProbes.map((p, i) => ({
    key: p.key,
    rootId: 400 + i,
    testID: p.id,
    nativeID: p.id,
  }));
  const lease = () => ({ attached: 1, cleaned: 0, generation: 1, sameRoot: true });
  const receipt = (window, state) => ({
    window: { ...window },
    request: state + 1,
    state,
    generation: 1,
  });
  return {
    schemaVersion: 1,
    scenario: 'card-native-root-contract-v1',
    driver: 'native Instrumentation and UiAutomation',
    paintMethod: 'retained-view-draw-interior-samples',
    status: 'passed',
    fontProfile,
    artifactDirectory: 'cache/mui-card-12345',
    device: {
      package: catalogPackage,
      sdk: 37,
      model: 'synthetic-parser-fixture',
      density,
      fontScale,
      spToPx,
    },
    initial: { counts: { stock: 0, custom: 0 }, roots: initialRoots, probes: initialProbes },
    stages: [...cardStates],
    screenshots: [...cardPictures],
    navigation: [
      {
        control: 'catalog-tab-Wrappers',
        destination: 'root-layout-card',
        attempts: 1,
        success: true,
      },
      {
        control: 'root-layout-card',
        destination: 'card-contract-receipt',
        attempts: 1,
        success: true,
      },
    ],
    states: cardInputs.map((input, index) => {
      const metadata = {
        schemaVersion: 1,
        scenario: 'card-v1',
        sequenceLength: 13,
        state: index,
        input: { ...input },
        fontScale,
        windowProfile: { width: 393, height: 852, scale: density },
        counts: { stock: 1, custom: 1 },
        request: index + 1,
        refRevision: 7,
        touch: { count: 1, target: 12345, pageX: 80, pageY: 200, timestamp: 2000 },
        refs: {},
        textRefs: {},
        receipts: {},
        textReceipts: {},
        probeRefs: {},
        probeReceipts: {},
        authoredProbeInputs: structuredClone(cardProbeInputs),
      };
      const bg =
        index === 7
          ? [46, 46, 46]
          : index === 10
            ? [11, 93, 68]
            : index === 11
              ? [36, 52, 71]
              : [255, 255, 255];
      const fg = index === 11 ? '#f5f7fa' : [7, 10].includes(index) ? '#ffffff' : '#203247';
      const fontSize = index === 10 ? 18 : index === 11 ? 22 : 16,
        lineHeight = index === 10 ? 26 : index === 11 ? 30 : 24,
        border = index === 8 ? 1 : 0;
      const roots = cardKeys.map((key, k) => {
        const counterHeight = Math.max(44, (Math.ceil(spToPx['14']) * 1.2) / density + 16),
          copyHeight = Math.ceil(spToPx[String(lineHeight)]) / density;
        const height = Math.max(88, counterHeight + copyHeight + 32 + border * 2);
        const frame = { x: 10, y: 100 + k * 200, width: 280, height: height + 24 },
          bounds = { x: 22, y: frame.y + 12, width: 256, height };
        const counter = {
          x: bounds.x + 16 + border,
          y: bounds.y + 16 + border,
          width: bounds.width - 32 - border * 2,
          height: counterHeight,
        };
        const textBounds = {
          x: counter.x,
          y: counter.y + counter.height,
          width: counter.width,
          height: copyHeight,
        };
        metadata.refs[key] = lease();
        metadata.textRefs[key] = lease();
        metadata.receipts[key] = receipt(bounds, index);
        metadata.textReceipts[key] = receipt(textBounds, index);
        const exclusions = [
          {
            left: Math.round(80 * density),
            top: Math.round(24 * density),
            right: Math.round(160 * density),
            bottom: Math.round((counterHeight + 8) * density),
          },
          {
            left: Math.round((16 + border) * density),
            top: Math.round((16 + border + counterHeight) * density),
            right: Math.round((bounds.width - 16 - border) * density),
            bottom: Math.round((16 + border + counterHeight + copyHeight) * density),
          },
        ];
        return {
          ...initialRoots[k],
          counterText: key + ' 1',
          copyText: 'Copy',
          class: 'com.facebook.react.views.view.ReactViewGroup',
          direction: 'ltr',
          alpha: 1,
          effectiveAlpha: 1,
          shown: true,
          frame,
          bounds,
          counter,
          textBounds,
          counterTextClass: 'com.facebook.react.views.text.ReactTextView',
          textClass: 'com.facebook.react.views.text.PreparedLayoutTextView',
          counterFontPx: Math.ceil(spToPx['14']),
          counterColor: color(fg),
          textFontPx: Math.ceil(spToPx[String(fontSize)]),
          textLineHeightPx: Math.ceil(spToPx[String(lineHeight)]),
          textLetterSpacingEm: 0,
          textColor: color(fg),
          borderWidthDp: border,
          borderColor: border ? 0x1f000000 : null,
          radiusDp: index === 9 ? 0 : index === 11 ? 2 : 4,
          paint: paint(bounds, density, bg, border, exclusions),
        };
      });
      const probes = nativeProbes.map((p, k) => {
        const frame = { x: 10, y: 800 + k * 90, width: 280, height: 68 },
          bounds = { x: 22, y: frame.y + 12, width: 80, height: 44 };
        metadata.probeRefs[p.key] = lease();
        metadata.probeReceipts[p.key] = receipt(bounds, index);
        return {
          ...initialProbes[k],
          class: 'com.facebook.react.views.view.ReactViewGroup',
          direction: 'ltr',
          frame,
          bounds,
          alpha: p.alpha,
          effectiveAlpha: p.alpha,
          shown: true,
          borderWidthDp: 0,
          borderColor: null,
          radiusDp: p.radius,
          nativeChildCount: 0,
          originalHostPresent: false,
          paint: paint(bounds, density, p.rgb),
        };
      });
      return { name: input.name, metadata, roots, probes };
    }),
  };
}
const parse = (r, fontProfile = r.fontProfile) => summarizeCard(output(r), { fontProfile });
for (const density of [0.5, 0.75, 1, 1.5, 2, 2.625, 3, 4])
  for (const profile of ['normal', 'enlarged'])
    test('synthetic complete main/probes ' + profile + ' density' + density, () => {
      const r = complete(profile, density);
      assert.deepEqual(parse(r), r);
    });
test('native nonlinear SP map includes reset22/30 integer ceilings', () => {
  const r = complete('enlarged', 2.625, true);
  assert.deepEqual(parse(r), r);
});
const negatives = [
  ['wrong report identity', (r) => (r.scenario = 'box-native-root-contract-v1')],
  ['wrong package', (r) => (r.device.package = 'foreign.app')],
  ['missing22SP', (r) => delete r.device.spToPx['22']],
  ['missing30SP', (r) => delete r.device.spToPx['30']],
  ['wrong enlarged profile', (r) => (r.device.fontScale = 1.3)],
  ['unsafe artifacts', (r) => (r.artifactDirectory = 'cache/../outside')],
  ['unsafe screenshot', (r) => (r.screenshots[0] = '../outside.png')],
  ['failed report code-1', (r) => (r.status = 'failed')],
  ['missing state', (r) => r.states.pop()],
  ['wrong state flag', (r) => (r.states[1].metadata.input.raisedInput = 'absent')],
  ['stale explicit request', (r) => (r.states[2].metadata.request = 2)],
  ['replaced main native object', (r) => (r.states[2].roots[0].rootId = 999)],
  ['initial duplicate object', (r) => (r.initial.probes[0].rootId = r.initial.roots[0].rootId)],
  ['missing7th ref revision', (r) => (r.states[2].metadata.refRevision = 4)],
  ['stale main text lease', (r) => (r.states[2].metadata.textRefs.stock.generation = 2)],
  ['stale main receipt', (r) => (r.states[2].metadata.receipts.stock.request = 1)],
  ['wrong main counter', (r) => (r.states[2].metadata.counts.stock = 2)],
  ['lost first custom touch', (r) => (r.states[2].metadata.touch.timestamp += 1)],
  ['wrong main font by1', (r) => (r.states[2].roots[0].textFontPx -= 1)],
  ['wrong counter font by1', (r) => (r.states[2].roots[0].counterFontPx -= 1)],
  ['wrong main line by1', (r) => (r.states[2].roots[0].textLineHeightPx -= 1)],
  ['reset old font', (r) => (r.states[11].roots[0].textFontPx = Math.ceil(r.device.spToPx['18']))],
  ['reset old radius', (r) => (r.states[11].roots[0].radiusDp = 4)],
  ['outlined missing border', (r) => (r.states[8].roots[0].borderWidthDp = 0)],
  ['outlined wrong native ARGB', (r) => (r.states[8].roots[0].borderColor = 0xffe0e0e0)],
  ['main padding loss', (r) => (r.states[2].roots[0].counter.x -= 16)],
  [
    'extra intrinsic main height',
    (r) => {
      const s = r.states[2],
        v = s.roots[0];
      v.bounds.height += 20;
      v.frame.height += 20;
      v.paint.heightPx = Math.round(v.bounds.height * r.device.density);
      s.metadata.receipts.stock.window = { ...v.bounds };
    },
  ],
  ['main opacity leak', (r) => (r.states[2].roots[0].alpha = 0.2)],
  [
    'wrong main dark overlay',
    (r) => r.states[7].roots[0].paint.samples.forEach((p) => (p.argb = 0xff121212)),
  ],
  ['missing probes', (r) => r.states[2].probes.pop()],
  ['reordered probes', (r) => r.states[2].probes.reverse()],
  ['probe root replaced', (r) => (r.states[2].probes[0].rootId += 100)],
  ['missing initial probe', (r) => r.initial.probes.pop()],
  [
    'probe actual testID wrong',
    (r) => (r.states[2].probes[2].testID = 'card-contract-probe-as-original'),
  ],
  [
    'probe actual nativeID wrong',
    (r) => (r.states[2].probes[2].nativeID = 'card-contract-probe-as-original'),
  ],
  ['original as host remains', (r) => (r.states[2].probes[2].originalHostPresent = true)],
  ['as radius trap17', (r) => (r.states[2].probes[2].radiusDp = 17)],
  ['as opacity trap.2', (r) => (r.states[2].probes[2].alpha = 0.2)],
  [
    'as padding trap raises empty height',
    (r) => {
      const s = r.states[2],
        p = s.probes[2];
      p.bounds.height = 80;
      p.frame.height = 104;
      p.paint.heightPx = Math.round(80 * r.device.density);
      s.metadata.probeReceipts.as.window = { ...p.bounds };
    },
  ],
  ['theme opacity from provider', (r) => (r.states[2].probes[0].alpha = 0.2)],
  ['theme ancestor opacity wrong', (r) => (r.states[2].probes[0].effectiveAlpha = 0.14)],
  [
    'theme rawdraw mistaken for composited',
    (r) => r.states[2].probes[0].paint.samples.forEach((p) => (p.argb = rgba([91, 147, 211]))),
  ],
  [
    'theme wrongly uses explicit Paper red',
    (r) => r.states[2].probes[0].paint.samples.forEach((p) => (p.argb = 0xffb71c1c)),
  ],
  [
    'ownerState unmatched red',
    (r) => r.states[2].probes[1].paint.samples.forEach((p) => (p.argb = 0xffb71c1c)),
  ],
  [
    'wrong authored ownerState',
    (r) => (r.states[2].metadata.authoredProbeInputs.owner.marker = 'internally-built'),
  ],
  [
    'wrong source opacity intent',
    (r) => (r.states[2].metadata.authoredProbeInputs.theme.explicitOpacity = 0.2),
  ],
  ['probe ref reattached', (r) => (r.states[2].metadata.probeRefs.theme.attached = 2)],
  ['probe ref replaced', (r) => (r.states[2].metadata.probeRefs.theme.sameRoot = false)],
  ['probe receipt old request', (r) => (r.states[2].metadata.probeReceipts.owner.request = 1)],
  ['probe receipt old state', (r) => (r.states[2].metadata.probeReceipts.owner.state = 1)],
  [
    'probe receipt old generation',
    (r) => (r.states[2].metadata.probeReceipts.owner.generation = 2),
  ],
  ['missing probe measure', (r) => delete r.states[2].metadata.probeReceipts.as],
  [
    'empty probe unexpectedly has a native child',
    (r) => (r.states[2].probes[0].nativeChildCount = 1),
  ],
  [
    'probe hides text through exclusion',
    (r) =>
      (r.states[2].probes[0].paint.excludedTextRects = [{ left: 0, top: 0, right: 1, bottom: 1 }]),
  ],
  ['main lacks native text exclusions', (r) => (r.states[2].roots[0].paint.excludedTextRects = [])],
  ['probe hidden', (r) => (r.states[2].probes[0].shown = false)],
  ['fractional probe bitmap', (r) => (r.states[2].probes[0].paint.widthPx += 0.5)],
  [
    'probe border retained',
    (r) => (r.states[2].probes[0].paint.topBorderColumns[0].pixels[0] = 0xff000000),
  ],
  [
    'detached outlined band',
    (r) => (r.states[8].roots[0].paint.topBorderColumns[0].pixels[10] = 0xffe0e0e0),
  ],
  ['wrong native surface method', (r) => (r.states[2].probes[0].paint.method = 'JS-computed')],
];
for (const [name, change] of negatives)
  test('rejects ' + name, () => {
    const r = complete();
    change(r);
    assert.throws(() => parse(r));
  });
test('successful code cannot hide duplicated/failed instrumentation', () => {
  const r = complete();
  for (const text of [
    output(r, 0),
    output(r) + output(r),
    output(r) + 'INSTRUMENTATION_ABORTED: stop\n',
  ])
    assert.throws(() => summarizeCard(text, { fontProfile: 'normal' }));
  r.status = 'failed';
  assert.equal(inspectCardReport(output(r)).status, 'failed');
  assert.throws(() => parse(r));
});

const malformedCases = [
  ['negative native SDK', (r) => (r.device.sdk = -1)],
  ['unsafe artifact newline', (r) => (r.artifactDirectory = 'cache/mui-card-12\noutside')],
  ['density nonfinite', (r) => (r.device.density = null)],
  ['SP fractional order reversal', (r) => (r.device.spToPx['22'] = r.device.spToPx['20'])],
  ['wrong requested normal profile', (r) => (r.fontProfile = 'enlarged')],
  ['extra state stage', (r) => r.stages.push('unplanned')],
  ['extra failure screenshot in passed report', (r) => r.screenshots.push('failure.png')],
  ['wrong navigation destination', (r) => (r.navigation[1].destination = 'foreign-root')],
  ['unbounded navigation attempts', (r) => (r.navigation[0].attempts = 4)],
  ['window mutation', (r) => (r.states[4].metadata.windowProfile.width += 1)],
  ['main request fraction', (r) => (r.states[2].metadata.request = 3.5)],
  ['main negative event position', (r) => (r.states[2].metadata.touch.pageX = -1)],
  ['main invisible ancestor', (r) => (r.states[2].roots[0].effectiveAlpha = 0.2)],
  ['main hidden root', (r) => (r.states[2].roots[0].shown = false)],
  ['native identity fractional', (r) => (r.initial.probes[0].rootId = 0.5)],
  ['probe alpha string', (r) => (r.states[2].probes[0].alpha = '.7')],
  ['probe child count string', (r) => (r.states[2].probes[0].nativeChildCount = '0')],
  [
    'probe original-host false string',
    (r) => (r.states[2].probes[0].originalHostPresent = 'false'),
  ],
  ['probe shown truthy string', (r) => (r.states[2].probes[0].shown = 'true')],
  ['probe actual native ID omitted', (r) => delete r.states[2].probes[2].nativeID],
  [
    'probe initial wrong native ID',
    (r) => (r.initial.probes[2].nativeID = 'card-contract-probe-as-original'),
  ],
  ['probe native ID collision', (r) => (r.initial.probes[2].rootId = r.initial.probes[1].rootId)],
  ['probe stale measured frame', (r) => (r.states[2].metadata.probeReceipts.as.window.x += 20)],
  ['probe frame clips native root', (r) => (r.states[2].probes[0].frame.width = 80)],
  ['probe native RTL', (r) => (r.states[2].probes[0].direction = 'rtl')],
  ['probe unsupported native class', (r) => (r.states[2].probes[0].class = 'TextView')],
  ['probe native one-dp stale border getter', (r) => (r.states[2].probes[0].borderWidthDp = 1)],
  [
    'probe zero edge retains one-dp band',
    (r) => (r.states[2].probes[0].paint.edgeSamples[1].argb = 0xff000000),
  ],
  [
    'probe transparent local raster',
    (r) => (r.states[2].probes[0].paint.samples[1].argb = 0x001565c0),
  ],
  [
    'probe huge bitmap array',
    (r) => r.states[2].probes[0].paint.topBorderColumns[0].pixels.push(0xff1565c0),
  ],
  [
    'probe fractional raw raster color',
    (r) => (r.states[2].probes[0].paint.samples[1].argb += 0.5),
  ],
  ['probe sample wrong location', (r) => (r.states[2].probes[0].paint.samples[1].y += 8)],
  [
    'probe duplicate sample',
    (r) => (r.states[2].probes[0].paint.samples[1] = { ...r.states[2].probes[0].paint.samples[0] }),
  ],
  [
    'outlined no positive band',
    (r) => r.states[8].roots[0].paint.topBorderColumns[0].pixels.fill(0xffffffff),
  ],
  [
    'outlined one-pixel band',
    (r) =>
      (r.states[8].roots[0].paint.topBorderColumns[0].pixels =
        r.states[8].roots[0].paint.topBorderColumns[0].pixels.map((_, i) =>
          i === 0 ? 0xffe0e0e0 : 0xffffffff,
        )),
  ],
  [
    'outlined oversized band',
    (r) =>
      (r.states[8].roots[0].paint.topBorderColumns[0].pixels =
        r.states[8].roots[0].paint.topBorderColumns[0].pixels.map((_, i) =>
          i < 8 ? 0xffe0e0e0 : 0xffffffff,
        )),
  ],
  [
    'outlined two transition rows',
    (r) =>
      r.states[8].roots[0].paint.topBorderColumns[0].pixels.splice(2, 2, 0xffefefef, 0xffefefef),
  ],
  [
    'outlined nonconvex transition',
    (r) => (r.states[8].roots[0].paint.topBorderColumns[0].pixels[2] = 0xffff0000),
  ],
  [
    'outlined unsigned overflow pixel',
    (r) => (r.states[8].roots[0].paint.topBorderColumns[0].pixels[2] = 0x100000000),
  ],
];
for (const [name, change] of malformedCases)
  test('rejects malformed ' + name, () => {
    const r = complete();
    change(r);
    assert.throws(() => parse(r));
  });
test('actual native identities admit distinct signed int32 including zero', () => {
  const r = complete();
  r.initial.roots[0].rootId = 0;
  r.initial.probes[0].rootId = -1;
  for (const state of r.states) {
    state.roots[0].rootId = 0;
    state.probes[0].rootId = -1;
  }
  assert.deepEqual(parse(r), r);
});
for (const field of ['counterFontPx', 'textFontPx', 'textLineHeightPx'])
  test('rejects low-density one-pixel stale ' + field, () => {
    const r = complete('normal', 0.5);
    r.states[11].roots[0][field] -= 1;
    assert.throws(() => parse(r));
  });
test('native getter serialization noise stays distinct from layout rounding', () => {
  const r = complete();
  for (const state of r.states)
    for (const root of state.roots)
      for (const field of ['counterFontPx', 'textFontPx', 'textLineHeightPx']) root[field] += 1e-5;
  assert.deepEqual(parse(r), r);
});

function coherentCopyHostHeight(report, stateIndex, key, height) {
  const state = report.states[stateIndex],
    root = state.roots.find((root) => root.key === key);
  root.textBounds.height = height;
  root.bounds.height = Math.max(88, root.counter.height + height + 32 + root.borderWidthDp * 2);
  root.frame.height = root.bounds.height + 24;
  root.paint.heightPx = Math.round(root.bounds.height * report.device.density);
  state.metadata.receipts[key].window = { ...root.bounds };
  state.metadata.textReceipts[key].window = { ...root.textBounds };
  root.paint.excludedTextRects[1].bottom =
    root.paint.excludedTextRects[1].top + Math.round(height * report.device.density);
}
test('native Copy host height rejects coherent enlarged clipping despite correct current Layout getters', () => {
  const report = complete('enlarged', 2.625, true);
  assert.doesNotThrow(() => parse(report));
  coherentCopyHostHeight(report, 11, 'stock', 10);
  assert.throws(() => parse(report), /native one-line Copy host height/);
});
test('native Copy host height rejects coherent excess height despite correct current Layout getters', () => {
  const report = complete('enlarged', 2.625, true),
    root = report.states[11].roots[1];
  coherentCopyHostHeight(report, 11, 'custom', root.textBounds.height + 20);
  assert.throws(() => parse(report), /native one-line Copy host height/);
});
for (const density of [0.5, 0.75, 1, 1.5, 2, 2.625, 3, 4]) {
  for (const profile of ['normal', 'enlarged'])
    test(
      'native Copy host height permits physical floor/ceil serialization ' +
        profile +
        ' density' +
        density,
      () => {
        for (const round of [Math.floor, Math.ceil]) {
          const report = complete(profile, density),
            root = report.states[11].roots[0];
          coherentCopyHostHeight(
            report,
            11,
            'stock',
            round(root.textBounds.height * density) / density,
          );
          assert.doesNotThrow(() => parse(report));
        }
      },
    );
  test(
    'native Copy host height rejects two physical pixels of clipping at density' + density,
    () => {
      const report = complete('enlarged', density),
        root = report.states[11].roots[0];
      coherentCopyHostHeight(report, 11, 'stock', (root.textLineHeightPx - 2) / density);
      assert.throws(() => parse(report), /native one-line Copy host height/);
    },
  );
}

function ownFillOuterPixel(density, fillCoverage = 0.25) {
  const strokeAlpha = (31 / 255) * Math.min(1, density);
  const alpha = strokeAlpha + fillCoverage * (1 - strokeAlpha);
  const channel = Math.round((255 * fillCoverage * (1 - strokeAlpha)) / alpha);
  return ((Math.round(alpha * 255) << 24) + (channel << 16) + (channel << 8) + channel) >>> 0;
}
function partialOutlined(report) {
  const pixel = ownFillOuterPixel(report.device.density);
  for (const root of report.states[8].roots)
    for (const column of root.paint.topBorderColumns) column.pixels[0] = pixel;
  return report;
}
for (const density of [0.5, 0.75, 1, 1.5, 2, 2.625, 3, 4])
  for (const profile of ['normal', 'enlarged'])
    test('outlined partial own-fill first pixel ' + profile + ' density' + density, () => {
      assert.doesNotThrow(() => parse(partialOutlined(complete(profile, density))));
    });
test('outlined actual raw prefix preserves source alpha/RGB rather than inventing parent composition', () => {
  const report = complete();
  for (const root of report.states[8].roots)
    for (const column of root.paint.topBorderColumns)
      column.pixels.splice(0, 3, 0x57a4a4a4, 0xffe0e0e0, 0xffe8e8e8);
  assert.doesNotThrow(() => parse(report));
});
const outerNegatives = [
  [
    'wrong alpha without source RGB covariance',
    (r) => (r.states[8].roots[0].paint.topBorderColumns[0].pixels[0] = 0x78a4a4a4),
  ],
  [
    'opaque-parent RGB substituted for raw local RGB',
    (r) => (r.states[8].roots[0].paint.topBorderColumns[0].pixels[0] = 0x57e0e0e0),
  ],
  [
    'first raw pixel transparent',
    (r) => (r.states[8].roots[0].paint.topBorderColumns[0].pixels[0] = 0),
  ],
  [
    'alpha below source border',
    (r) => (r.states[8].roots[0].paint.topBorderColumns[0].pixels[0] = 0x10000000),
  ],
  [
    'source border only without own fill',
    (r) => (r.states[8].roots[0].paint.topBorderColumns[0].pixels[0] = 0x1f000000),
  ],
  [
    'wrong colored unpremultiplied channels',
    (r) => (r.states[8].roots[0].paint.topBorderColumns[0].pixels[0] = 0x57c89094),
  ],
  [
    'second nonopaque pixel',
    (r) => (r.states[8].roots[0].paint.topBorderColumns[0].pixels[1] = 0x57a4a4a4),
  ],
  [
    'detached nonopaque pixel after background',
    (r) => (r.states[8].roots[0].paint.topBorderColumns[0].pixels[5] = 0x57a4a4a4),
  ],
  [
    'missing full inner row',
    (r) => (r.states[8].roots[0].paint.topBorderColumns[0].pixels[1] = 0xffffffff),
  ],
  ['changed source native border alpha', (r) => (r.states[8].roots[0].borderColor = 0x3f000000)],
  [
    'stale partial border on zero reset',
    (r) => (r.states[11].roots[0].paint.topBorderColumns[0].pixels[0] = 0x57a4a4a4),
  ],
  [
    'partial raw probe background',
    (r) => (r.states[8].probes[0].paint.topBorderColumns[0].pixels[0] = 0x57a4a4a4),
  ],
  ['partial interior pixel', (r) => (r.states[8].roots[0].paint.samples[0].argb = 0x57a4a4a4)],
  ['partial edge sample', (r) => (r.states[8].roots[0].paint.edgeSamples[0].argb = 0x57a4a4a4)],
];
for (const [name, change] of outerNegatives)
  test('outlined partial own-fill rejects ' + name, () => {
    const report = partialOutlined(complete());
    change(report);
    assert.throws(() => parse(report));
  });
test('outlined partial own-fill keeps the independent Copy host clipping guard', () => {
  const report = partialOutlined(complete('enlarged', 2.625, true));
  coherentCopyHostHeight(report, 11, 'stock', 10);
  assert.throws(() => parse(report), /native one-line Copy host height/);
});

async function temp(t) {
  const p = await mkdtemp(join(tmpdir(), 'mui-card-node-'));
  t.after(() => rm(p, { recursive: true, force: true }));
  return p;
}
const targets = (p) => ({
  source: join(p, 'app/src/androidTest/java/dev/altroo/muinative/catalog/test/CardScenario.java'),
  journal: join(p, '.mui-native-card-instrumentation.json'),
});
test('preparation copies only guarded Java source and permits repeat/owned updates', async (t) => {
  const p = await temp(t),
    paths = targets(p),
    target = await prepareCardSource(p);
  assert.equal(target, paths.source);
  assert.equal(
    await readFile(target, 'utf8'),
    await readFile(join(root, 'tests/native/android/CardScenario.java'), 'utf8'),
  );
  const old = '// previous generated Card source\n';
  await writeFile(target, old);
  await writeFile(paths.journal, JSON.stringify({ schemaVersion: 1, sourceSha256: digest(old) }));
  await prepareCardSource(p);
  await prepareCardSource(p);
  assert.equal(
    JSON.parse(await readFile(paths.journal)).sourceSha256,
    digest(await readFile(target)),
  );
});
test('preparation preserves edited and unowned sources before any write', async (t) => {
  const p = await temp(t),
    paths = targets(p);
  await prepareCardSource(p);
  const before = await readFile(paths.journal);
  await writeFile(paths.source, '// manual edit\n');
  await assert.rejects(prepareCardSource(p), /Preserve edits/);
  assert.deepEqual(await readFile(paths.journal), before);
  assert.equal(await readFile(paths.source, 'utf8'), '// manual edit\n');
});
test('malformed ownership shapes fail closed without changing source', async (t) => {
  const p = await temp(t),
    paths = targets(p);
  await prepareCardSource(p);
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
    await assert.rejects(prepareCardSource(p));
    assert.deepEqual(await readFile(paths.source), source);
  }
});
for (const part of ['source', 'journal'])
  test('preparation preserves a manual ' + part + ' symlink', async (t) => {
    const p = await temp(t),
      paths = targets(p);
    await prepareCardSource(p);
    const outside = join(p, 'manual-' + part),
      bytes = await readFile(paths[part]);
    await writeFile(outside, bytes);
    await rm(paths[part]);
    await symlink(outside, paths[part]);
    await assert.rejects(prepareCardSource(p), /non-regular/);
    assert.deepEqual(await readFile(outside), bytes);
  });
test('preparation refuses a linked generated-source ancestor', async (t) => {
  const p = await temp(t),
    outside = await temp(t);
  await symlink(outside, join(p, 'app'));
  await assert.rejects(prepareCardSource(p), /non-directory/);
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
test('runner requires Card profile, pulls only finite artifacts and restores catalog', async (t) => {
  const p = await temp(t),
    r = complete(),
    mock = adbMock(r);
  assert.deepEqual(
    await run(
      {
        adb: 'synthetic-adb',
        serial: 'emulator-5554',
        output: p,
        scenario: 'card',
        fontProfile: 'normal',
      },
      mock.execute,
    ),
    r,
  );
  const c = mock.calls.find((v) => v.includes('instrument'));
  assert(c.includes('card') && c.includes('fontProfile') && c.includes('normal'));
  assert.equal(c.at(-1), component);
  assert.equal(mock.calls.filter((v) => v.includes('exec-out')).length, 13);
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
        scenario: 'card',
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
        scenario: 'card',
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
          scenario: 'card',
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
        scenario: 'card',
        fontProfile: 'normal',
        signal: controller.signal,
      },
      mock.execute,
    ),
  );
  assert.equal(mock.calls.length, 0);
});
test('real CLI prepare adds Card while retaining Paper/Divider/alignment and source-edit guards', async (t) => {
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
  for (const name of ['Card', 'Paper', 'Divider'])
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
    /Preserve edits to generated Card/,
  );
});

test('real CLI routes Card through a fake executable without a device', async (t) => {
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
      'card',
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
  assert.equal(JSON.parse(response.stdout).report.scenario, 'card-native-root-contract-v1');
  const calls = (await readFile(log, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert(
    calls.some(
      (args) => args.includes('instrument') && args.includes('card') && args.includes('normal'),
    ),
  );
  assert.equal(JSON.parse(await readFile(join(result, 'report.json'))).states.length, 13);
});
