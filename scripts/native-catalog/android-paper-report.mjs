// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Finite Material UI 9.5.0 SSR observations, independent of the catalog's style output.
// These color samples do not certify GPU shadows or uniquely recover an overlay alpha.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const paperOverlayAlphas = Object.freeze([
  0, 0.051, 0.069, 0.082, 0.092, 0.101, 0.108, 0.114, 0.119, 0.124, 0.128, 0.132, 0.135, 0.139,
  0.142, 0.145, 0.147, 0.15, 0.152, 0.155, 0.157, 0.159, 0.161, 0.163, 0.165,
]);
const initial = {
  name: 'default',
  elevation: 1,
  variant: 'elevation',
  square: false,
  dark: false,
  rtl: false,
  reset: false,
};
export const paperInputs = Object.freeze(
  [
    initial,
    { ...initial, name: 'outlined', variant: 'outlined' },
    { ...initial, name: 'square', square: true },
    { ...initial, name: 'light-zero', elevation: 0 },
    ...paperOverlayAlphas.map((_, elevation) => ({
      ...initial,
      name: 'dark-' + elevation,
      elevation,
      dark: true,
    })),
    { ...initial, name: 'dark-square', elevation: 8, square: true, dark: true },
    { ...initial, name: 'rtl-dark', elevation: 8, dark: true, rtl: true },
    { ...initial, name: 'native-reset', elevation: 8, dark: true, reset: true },
    { ...initial, name: 'restored' },
  ].map(Object.freeze),
);
export const paperStates = Object.freeze(paperInputs.map(({ name }) => name));
export const paperPictures = Object.freeze(
  [
    'default',
    'outlined',
    'square',
    'light-zero',
    'dark-0',
    'dark-1',
    'dark-8',
    'dark-16',
    'dark-24',
    'dark-square',
    'rtl-dark',
    'native-reset',
    'restored',
  ].map((name) => name + '.png'),
);
export const paperKeys = Object.freeze(['stock', 'custom']);
export const paperNativeReset = Object.freeze({
  padding: 0,
  borderRadius: 0,
  boxShadow: 'none',
  backgroundImage: Object.freeze([]),
  backgroundColor: '#243447',
});
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = Number.isFinite;
const positive = (value) => Number.isSafeInteger(value) && value > 0;
const uint32 = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff;
const close = (a, b, tolerance = 1.5) => finite(a) && finite(b) && Math.abs(a - b) <= tolerance;
const exactKeys = (value, keys) =>
  record(value) && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
const same = (a, b) => {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((value, index) => same(value, b[index]));
  return (
    record(a) &&
    record(b) &&
    exactKeys(a, Object.keys(b)) &&
    Object.keys(a).every((key) => same(a[key], b[key]))
  );
};
const rect = (value) =>
  exactKeys(value, ['x', 'y', 'width', 'height']) &&
  Object.values(value).every(finite) &&
  value.width > 0 &&
  value.height > 0;
function ensure(condition, message) {
  if (!condition) throw Error('Invalid native Paper evidence: ' + message);
}
/** Verify the current canonical source record while keeping the pixel oracle independent.
 * Adding original getter fixtures may change the full hash without changing these 25 alphas. */
export function paperReferenceFromFixture(fixtureBytes, provenanceBytes) {
  const provenance = JSON.parse(provenanceBytes),
    fixture = JSON.parse(fixtureBytes);
  const fixtureSha256 = createHash('sha256').update(fixtureBytes).digest('hex');
  const light = fixture.fixtures?.find((value) => value.name === 'default');
  ensure(
    provenance?.fixture?.sha256 === fixtureSha256 &&
      provenance.fixture.path === 'tests/fixtures/mui-paper-9.5.0.json' &&
      provenance.fixture.darkOverlayCases === 25 &&
      provenance.references?.some(
        (value) => value.name === '@mui/material' && value.version === '9.5.0',
      ) &&
      typeof light?.css === 'string' &&
      light.css.includes('background-color:#fff;') &&
      Array.isArray(fixture.dark) &&
      fixture.dark.length === 25 &&
      fixture.dark.every(
        (value, index) =>
          record(value) &&
          value.elevation === index &&
          typeof value.alpha === 'number' &&
          value.alpha === paperOverlayAlphas[index] &&
          typeof value.css === 'string' &&
          value.css.includes('background-color:#121212;') &&
          typeof value.style === 'string' &&
          value.style.includes(
            '--Paper-overlay:linear-gradient(rgba(255, 255, 255, ' +
              value.alpha +
              '), rgba(255, 255, 255, ' +
              value.alpha +
              '))',
          ),
      ),
    'pinned original overlay reference changed',
  );
  return {
    schemaVersion: 1,
    materialVersion: '9.5.0',
    fixtureSha256,
    overlayAlphas: [...paperOverlayAlphas],
    lightBackground: [255, 255, 255, 255],
    darkBackground: [18, 18, 18, 255],
    nativeResetBackground: [36, 52, 71, 255],
  };
}
export function readPaperReference() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  return paperReferenceFromFixture(
    readFileSync(join(root, 'tests/fixtures/mui-paper-9.5.0.json')),
    readFileSync(join(root, 'upstream/paper.json')),
  );
}
/** Source-derived sRGB channel targets. A bounded native raster observation, not a style receipt. */
export function paperExpectedRgb(input) {
  if (input.reset) return [36, 52, 71];
  if (!input.dark) return [255, 255, 255];
  const channel = Math.round(18 + 237 * paperOverlayAlphas[input.elevation]);
  return [channel, channel, channel];
}
export function inspectPaperReport(output) {
  const matches = [...output.matchAll(/^INSTRUMENTATION_RESULT: paperReport=([^\r\n]+)\r?$/gm)];
  if (matches.length !== 1) throw Error('No unambiguous Paper instrumentation report');
  const value = JSON.parse(matches[0][1]);
  ensure(
    record(value) &&
      value.schemaVersion === 1 &&
      value.scenario === 'paper-v1' &&
      value.driver === 'native Instrumentation and UiAutomation' &&
      value.paintMethod === 'retained-view-draw-interior-samples' &&
      ['passed', 'failed'].includes(value.status),
    'report identity',
  );
  ensure(
    typeof value.artifactDirectory === 'string' &&
      /^cache\/mui-paper-\d+$/.test(value.artifactDirectory),
    'safe artifact directory',
  );
  const device = value.device;
  ensure(
    record(device) &&
      Number.isSafeInteger(device.sdk) &&
      device.sdk >= 29 &&
      typeof device.model === 'string' &&
      device.model.length > 0 &&
      finite(device.density) &&
      device.density > 0 &&
      finite(device.fontScale) &&
      device.fontScale > 0 &&
      ['normal', 'enlarged'].includes(value.fontProfile),
    'actual device/profile',
  );
  ensure(
    Array.isArray(value.screenshots) &&
      new Set(value.screenshots).size === value.screenshots.length &&
      value.screenshots.every((name) => [...paperPictures, 'failure.png'].includes(name)),
    'safe screenshot names',
  );
  return value;
}
function checkPaint(paint, bounds, input, density) {
  ensure(
    record(paint) &&
      paint.method === 'retained-view-draw' &&
      positive(paint.widthPx) &&
      positive(paint.heightPx) &&
      Math.abs(paint.widthPx - bounds.width * density) <= 1 &&
      Math.abs(paint.heightPx - bounds.height * density) <= 1,
    'native raster dimensions',
  );
  ensure(
    Array.isArray(paint.excludedTextRects) && paint.excludedTextRects.length <= 8,
    'actual native text exclusions',
  );
  for (const box of paint.excludedTextRects)
    ensure(
      exactKeys(box, ['left', 'top', 'right', 'bottom']) &&
        Object.values(box).every(
          (value) => Number.isInteger(value) && value >= -0x80000000 && value <= 0x7fffffff,
        ) &&
        box.right > box.left &&
        box.bottom > box.top,
      'integer actual native text exclusion',
    );
  ensure(Array.isArray(paint.samples) && paint.samples.length === 5, 'five actual raster samples');
  const x = Math.round(8 * density),
    y = Math.round((input.reset ? 2 : 8) * density),
    right = paint.widthPx - 1 - x,
    bottom = paint.heightPx - 1 - y;
  const positions = [
    [x, y],
    [Math.floor((paint.widthPx - 1) / 2), y],
    [right, y],
    [x, bottom],
    [right, bottom],
  ];
  const coordinates = new Set(),
    expected = paperExpectedRgb(input);
  for (const [index, sample] of paint.samples.entries()) {
    ensure(
      exactKeys(sample, ['x', 'y', 'argb']) &&
        Number.isSafeInteger(sample.x) &&
        Number.isSafeInteger(sample.y) &&
        sample.x >= 0 &&
        sample.y >= 0 &&
        sample.x < paint.widthPx &&
        sample.y < paint.heightPx &&
        Math.abs(sample.x - positions[index][0]) <= 1 &&
        Math.abs(sample.y - positions[index][1]) <= 1 &&
        uint32(sample.argb),
      'integer native sample coordinates/color',
    );
    const coordinate = sample.x + ',' + sample.y;
    ensure(!coordinates.has(coordinate), 'distinct native raster samples');
    coordinates.add(coordinate);
    ensure(
      !paint.excludedTextRects.some(
        (box) =>
          sample.x >= box.left &&
          sample.x < box.right &&
          sample.y >= box.top &&
          sample.y < box.bottom,
      ),
      'sample must exclude actual text',
    );
    ensure(sample.argb >>> 24 === 255, 'opaque native Paper surface');
    const actual = [(sample.argb >>> 16) & 255, (sample.argb >>> 8) & 255, sample.argb & 255];
    // Allow only 3/255 per channel for native blend/alpha quantization.
    // Adjacent source elevations can share a rounded channel; do not infer exact alpha.
    ensure(
      actual.every((value, channel) => Math.abs(value - expected[channel]) <= 3),
      'source-derived native surface RGB',
    );
  }
}
/** Completion uses fresh native frames, retained identities and actual raster colors. */
export function summarizePaper(output, { fontProfile } = {}) {
  ensure(
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length === 1 &&
      /^INSTRUMENTATION_CODE: -1\r?$/m.test(output) &&
      !/^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output),
    'instrumentation completion',
  );
  const report = inspectPaperReport(output),
    source = readPaperReference();
  const reference = {
    materialVersion: source.materialVersion,
    fixtureSha256: source.fixtureSha256,
    overlayCases: source.overlayAlphas.length,
  };
  ensure(
    report.status === 'passed' &&
      report.error == null &&
      same(report.stages, paperStates) &&
      same(report.screenshots, paperPictures) &&
      same(report.reference, reference),
    'complete stages/pictures/source reference',
  );
  ensure(
    ['normal', 'enlarged'].includes(fontProfile) &&
      report.fontProfile === fontProfile &&
      (fontProfile === 'normal'
        ? close(report.device.fontScale, 1, 0.01)
        : report.device.fontScale >= 1.3 && report.device.fontScale <= 5),
    'requested OS font profile',
  );
  const navigation = [
    ['catalog-tab-Wrappers', 'root-layout-paper'],
    ['root-layout-paper', 'paper-contract-receipt'],
  ];
  ensure(
    Array.isArray(report.navigation) &&
      report.navigation.length === 2 &&
      navigation.every(([control, destination], index) => {
        const step = report.navigation[index];
        return (
          record(step) &&
          step.control === control &&
          step.destination === destination &&
          Number.isSafeInteger(step.attempts) &&
          step.attempts >= 0 &&
          step.attempts <= 3 &&
          step.success === true
        );
      }),
    'bounded committed catalog navigation',
  );
  ensure(
    Array.isArray(report.states) &&
      report.states.length === paperStates.length &&
      report.initialCount === 0 &&
      report.initialCustomCount === 0 &&
      report.initialCounterText === '0' &&
      report.initialCustomLabel === 'Custom 0' &&
      positive(report.initialCounterNativeId) &&
      positive(report.initialCustomTouchNativeId) &&
      report.initialCounterNativeId !== report.initialCustomTouchNativeId,
    'initial native zero state',
  );
  const nativeIds = new Map();
  let previousRequest = 0,
    firstTouch,
    firstWindow;
  for (const [index, expectedInput] of paperInputs.entries()) {
    const state = report.states[index],
      metadata = state?.metadata;
    ensure(
      record(state) &&
        state.name === expectedInput.name &&
        record(metadata) &&
        metadata.schemaVersion === 1 &&
        metadata.state === index &&
        metadata.sequenceLength === 33 &&
        same(metadata.input, expectedInput) &&
        close(metadata.fontScale, report.device.fontScale, 0.01) &&
        metadata.count === 1 &&
        metadata.customCount === 1 &&
        positive(metadata.request) &&
        metadata.request > previousRequest &&
        same(metadata.authoredNativeReset, expectedInput.reset ? paperNativeReset : null),
      'fresh authored state ' + expectedInput.name,
    );
    previousRequest = metadata.request;
    const window = metadata.windowProfile;
    ensure(
      exactKeys(window, ['width', 'height', 'scale']) &&
        Object.values(window).every((value) => finite(value) && value > 0) &&
        close(window.scale, report.device.density, 0.01),
      'actual window profile',
    );
    firstWindow ??= window;
    ensure(same(firstWindow, window), 'window profile changed during finite run');
    const touch = metadata.touch;
    ensure(
      exactKeys(touch, ['count', 'target', 'pageX', 'pageY', 'timestamp']) &&
        touch.count === 1 &&
        positive(touch.target) &&
        ['pageX', 'pageY', 'timestamp'].every((key) => finite(touch[key]) && touch[key] >= 0),
      'actual custom-root event',
    );
    firstTouch ??= touch;
    ensure(same(touch, firstTouch), 'original native custom event retained');
    ensure(
      state.counterText === '1' &&
        state.customTouchLabel === 'Custom 1' &&
        [
          'com.facebook.react.views.text.ReactTextView',
          'com.facebook.react.views.text.PreparedLayoutTextView',
        ].includes(state.counterTextClass) &&
        state.counterNativeId === report.initialCounterNativeId &&
        state.customTouchNativeId === report.initialCustomTouchNativeId &&
        finite(state.expectedCounterFontPx) &&
        state.expectedCounterFontPx > 0 &&
        close(state.counterFontPx, state.expectedCounterFontPx, 1.1) &&
        state.counterColor === (expectedInput.dark ? 0xffffffff : 0xde000000),
      'native retained child/font/palette',
    );
    ensure(
      exactKeys(metadata.refs, paperKeys) &&
        exactKeys(metadata.receipts, paperKeys) &&
        metadata.refRevision === 2 &&
        Array.isArray(state.roots) &&
        state.roots.length === 2,
      'complete root measurements/lifecycles',
    );
    const ids = new Set([state.counterNativeId, state.customTouchNativeId]);
    for (const [rootIndex, key] of paperKeys.entries()) {
      const root = state.roots[rootIndex],
        ref = metadata.refs[key],
        receipt = metadata.receipts[key];
      ensure(
        record(root) &&
          root.key === key &&
          positive(root.nativeId) &&
          !ids.has(root.nativeId) &&
          root.class === 'com.facebook.react.views.view.ReactViewGroup' &&
          root.direction === (expectedInput.rtl ? 'rtl' : 'ltr') &&
          rect(root.bounds) &&
          rect(root.frame) &&
          rect(root.child),
        'actual Paper root ' + key,
      );
      ids.add(root.nativeId);
      if (index === 0) nativeIds.set(key, root.nativeId);
      ensure(root.nativeId === nativeIds.get(key), 'retained native root ' + key);
      ensure(
        exactKeys(ref, ['attached', 'cleaned', 'generation', 'sameRoot']) &&
          ref.attached === 1 &&
          ref.cleaned === 0 &&
          ref.generation === 1 &&
          ref.sameRoot === true &&
          exactKeys(receipt, ['window', 'request', 'state', 'generation']) &&
          receipt.request === metadata.request &&
          receipt.state === index &&
          receipt.generation === 1 &&
          rect(receipt.window) &&
          ['x', 'y', 'width', 'height'].every((axis) =>
            close(receipt.window[axis], root.bounds[axis]),
          ),
        'fresh measured ref ' + key,
      );
      const bounds = root.bounds,
        frame = root.frame,
        child = root.child,
        border = expectedInput.variant === 'outlined' ? 1 : 0,
        padding = expectedInput.reset ? 0 : 16,
        inset = padding + border;
      ensure(
        close(bounds.x, frame.x + 24) &&
          close(bounds.y, frame.y + 24) &&
          close(bounds.width, frame.width - 48) &&
          close(frame.height, bounds.height + 48) &&
          frame.width <= 280 + 1.5 &&
          frame.width <= window.width + 1.5 &&
          // Preserve intrinsic growth at larger OS text sizes, and reject
          // surplus height that is not explained by this single child/insets.
          close(bounds.height, Math.max(88, child.height + inset * 2)),
        'source frame inset/intrinsic height geometry',
      );
      ensure(
        close(child.x, bounds.x + inset) &&
          close(child.width, bounds.width - inset * 2) &&
          child.width >= 44 - 1.5 &&
          child.height >= 44 - 1.5 &&
          child.y >= bounds.y + inset - 1.5 &&
          child.y + child.height <= bounds.y + bounds.height - inset + 1.5 &&
          close(child.y + child.height / 2, bounds.y + bounds.height / 2),
        'source padding/retained child geometry',
      );
      ensure(
        close(root.borderWidthDp, border, 0.01) &&
          (root.borderColor === null || uint32(root.borderColor)) &&
          (border === 0 || root.borderColor === 0x1f000000) &&
          close(root.radiusDp, expectedInput.square || expectedInput.reset ? 0 : 4, 0.01),
        'actual native border/radius properties',
      );
      checkPaint(root.paint, bounds, expectedInput, report.device.density);
    }
  }
  return report;
}
