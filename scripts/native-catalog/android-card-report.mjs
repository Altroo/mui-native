// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Authored finite scene inputs, independent of JavaScript style/paint receipts.
// The native raster checks cover a top strip and top-border bands, not GPU paint.
export const cardKeys = Object.freeze(['stock', 'custom']);
export const cardProbeKeys = Object.freeze(['theme', 'owner', 'as']);
const initial = {
  name: 'default',
  raisedInput: 'absent',
  elevationInput: 'absent',
  paperDefault: false,
  cardDefault: false,
  dark: false,
  square: false,
  outlined: false,
  themeSx: false,
  nativeReset: false,
};
/** Readonly finite inputs used by the reader and generated source.
 * @type {ReadonlyArray<{
 *   readonly name: string,
 *   readonly raisedInput: string,
 *   readonly elevationInput: string,
 *   readonly paperDefault: boolean,
 *   readonly cardDefault: boolean,
 *   readonly dark: boolean,
 *   readonly square: boolean,
 *   readonly outlined: boolean,
 *   readonly themeSx: boolean,
 *   readonly nativeReset: boolean,
 * }>}
 */
export const cardInputs = Object.freeze(
  [
    initial,
    { ...initial, name: 'raised', raisedInput: 'true' },
    { ...initial, name: 'explicit-zero', raisedInput: 'true', elevationInput: 'zero' },
    { ...initial, name: 'explicit-three', raisedInput: 'true', elevationInput: 'three' },
    { ...initial, name: 'explicit-undefined', raisedInput: 'true', elevationInput: 'undefined' },
    {
      ...initial,
      name: 'paper-default',
      raisedInput: 'true',
      elevationInput: 'undefined',
      paperDefault: true,
    },
    {
      ...initial,
      name: 'card-default',
      elevationInput: 'undefined',
      paperDefault: true,
      cardDefault: true,
    },
    { ...initial, name: 'dark-raised', raisedInput: 'true', dark: true },
    { ...initial, name: 'outlined-raised', raisedInput: 'true', outlined: true },
    { ...initial, name: 'square', square: true },
    { ...initial, name: 'theme-sx', raisedInput: 'true', themeSx: true },
    {
      ...initial,
      name: 'native-reset',
      raisedInput: 'true',
      dark: true,
      themeSx: true,
      nativeReset: true,
    },
    { ...initial, name: 'restored' },
  ].map((input) => Object.freeze(input)),
);
export const cardStates = Object.freeze(cardInputs.map(({ name }) => name));
export const cardPictures = Object.freeze(cardStates.map((name) => name + '.png'));
// Authored probe inputs are intent, never a JavaScript native-paint observation.
function freezeAuthored(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeAuthored);
    Object.freeze(value);
  }
  return value;
}
export const cardProbeInputs = freezeAuthored({
  theme: {
    providerOpacity: 0.2,
    explicitOpacity: 0.7,
    paperProviderBackground: '#1565c0',
    unusedExplicitPaperBackground: '#b71c1c',
    elevation: 0,
  },
  owner: {
    marker: 'authored',
    matchedBackground: '#0b5d44',
    unmatchedBackground: '#b71c1c',
    elevation: 0,
  },
  as: {
    background: '#4527a0',
    elevation: 0,
    paperTrapStyle: { padding: 40, borderRadius: 17, opacity: 0.2 },
    originalHostID: 'card-contract-probe-as-original',
    alternateHostID: 'card-contract-probe-as-alternate',
  },
});
export const cardProbeOracles = freezeAuthored({
  theme: {
    testID: 'card-contract-probe-theme',
    nativeID: 'card-contract-probe-theme',
    frameID: 'card-contract-probe-theme-frame',
    width: 80,
    height: 44,
    padding: 0,
    borderWidth: 0,
    borderRadius: 4,
    alpha: 0.7,
    effectiveAlpha: 0.7,
    shown: true,
    localDrawInteriorRGB: [21, 101, 192],
    compositedInteriorRGB: [91, 147, 211],
    frameBackground: '#ffffff',
    textChildren: 0,
    sourceSemantics:
      'Explicit theme selects Card opacity.7; Paper retains provider blue rather than unused explicit Paper red.',
  },
  owner: {
    testID: 'card-contract-probe-owner',
    nativeID: 'card-contract-probe-owner',
    frameID: 'card-contract-probe-owner-frame',
    width: 80,
    height: 44,
    padding: 0,
    borderWidth: 0,
    borderRadius: 4,
    alpha: 1,
    effectiveAlpha: 1,
    shown: true,
    localDrawInteriorRGB: [11, 93, 68],
    compositedInteriorRGB: [11, 93, 68],
    frameBackground: '#ffffff',
    textChildren: 0,
    sourceSemantics:
      'Exact authored ownerState marker selects green; nested internally-built state would choose red.',
  },
  as: {
    testID: 'card-contract-probe-as-alternate',
    nativeID: 'card-contract-probe-as-alternate',
    frameID: 'card-contract-probe-as-frame',
    absentHostID: 'card-contract-probe-as-original',
    width: 80,
    height: 44,
    padding: 0,
    borderWidth: 0,
    borderRadius: 0,
    alpha: 1,
    effectiveAlpha: 1,
    shown: true,
    localDrawInteriorRGB: [69, 39, 160],
    compositedInteriorRGB: [69, 39, 160],
    frameBackground: '#ffffff',
    textChildren: 0,
    sourceSemantics:
      'Alternate actual host is selected; Paper native-style trap40/17/.2 must be absent. ID alone is insufficient bypass evidence.',
  },
});
/** Finite source-authored main inputs. Elevation/classes/shadow declarations
 * are verified by software references, not inferred from native white surfaces. */
export function cardExpected(index, key) {
  if (!Number.isInteger(index) || !cardInputs[index] || !cardKeys.includes(key))
    throw Error('Unknown authored Card state/root');
  const input = cardInputs[index];
  const value = {
    minHeight: 88,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: input.outlined ? 1 : 0,
    borderColor: input.outlined ? '#e0e0e0' : null,
    borderRadius: input.square ? 0 : 4,
    background: '#ffffff',
    color: '#203247',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
    direction: 'ltr',
    textChildren: 2,
  };
  if (input.dark) {
    value.background = '#2e2e2e';
    value.color = '#ffffff';
  }
  if (input.themeSx) {
    value.background = '#0b5d44';
    value.color = '#ffffff';
    value.fontSize = 18;
    value.lineHeight = 26;
  }
  if (input.nativeReset) {
    value.background = '#243447';
    value.color = '#f5f7fa';
    value.fontSize = 22;
    value.lineHeight = 30;
    value.borderRadius = 2;
  }
  return value;
}
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) =>
  record(value) && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
const positive = (value) => Number.isSafeInteger(value) && value > 0;
const nativeIdentity = (value) =>
  Number.isInteger(value) && value >= -0x80000000 && value <= 0x7fffffff;
const finite = Number.isFinite;
const uint32 = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff;
const near = (a, b, tolerance = 1.5) => finite(a) && finite(b) && Math.abs(a - b) <= tolerance;
const same = (a, b) =>
  a === b ||
  (Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((v, i) => same(v, b[i]))
    : record(a) &&
      record(b) &&
      exact(a, Object.keys(b)) &&
      Object.keys(a).every((k) => same(a[k], b[k])));
const rect = (r) =>
  exact(r, ['x', 'y', 'width', 'height']) &&
  Object.values(r).every((v) => typeof v === 'number' && finite(v) && Math.abs(v) <= 100000) &&
  r.width > 0 &&
  r.height > 0;
const argb = (hex) => (0xff000000 + parseInt(hex.slice(1), 16)) >>> 0;
const rgbNear = (actual, target) =>
  uint32(actual) &&
  actual >>> 24 === 255 &&
  [16, 8, 0].every(
    (shift) => Math.abs(((actual >>> shift) & 255) - ((target >>> shift) & 255)) <= 3,
  );
const textClasses = [
  'com.facebook.react.views.text.ReactTextView',
  'com.facebook.react.views.text.PreparedLayoutTextView',
];
function ensure(condition, description) {
  if (!condition) throw Error('Invalid native Card evidence: ' + description);
}
/** Parse even a failed report for diagnostics, but never grant completion here. */
export function inspectCardReport(output) {
  const matches = [...output.matchAll(/^INSTRUMENTATION_RESULT: cardReport=([^\r\n]+)\r?$/gm)];
  ensure(matches.length === 1, 'one unambiguous instrumentation report');
  const value = JSON.parse(matches[0][1]);
  ensure(
    record(value) &&
      value.schemaVersion === 1 &&
      value.scenario === 'card-native-root-contract-v1' &&
      value.driver === 'native Instrumentation and UiAutomation' &&
      value.paintMethod === 'retained-view-draw-interior-samples' &&
      ['passed', 'failed'].includes(value.status),
    'report identity',
  );
  ensure(
    typeof value.artifactDirectory === 'string' &&
      /^cache\/mui-card-\d{1,20}$/.test(value.artifactDirectory),
    'safe artifact directory',
  );
  ensure(
    Array.isArray(value.screenshots) &&
      value.screenshots.length <= 14 &&
      new Set(value.screenshots).size === value.screenshots.length &&
      value.screenshots.every((name) => [...cardPictures, 'failure.png'].includes(name)),
    'safe screenshot names',
  );
  const device = value.device;
  ensure(
    record(device) &&
      device.package === 'dev.altroo.muinative.catalog' &&
      Number.isInteger(device.sdk) &&
      device.sdk >= 29 &&
      device.sdk <= 100 &&
      finite(device.density) &&
      device.density > 0 &&
      device.density <= 16 &&
      finite(device.fontScale) &&
      device.fontScale > 0 &&
      device.fontScale <= 5 &&
      ['normal', 'enlarged'].includes(value.fontProfile),
    'actual device/profile',
  );
  return value;
}
function checkReceipt(ref, receipt, metadata, index, bounds, label) {
  ensure(
    exact(ref, ['attached', 'cleaned', 'generation', 'sameRoot']) &&
      ref.attached === 1 &&
      ref.cleaned === 0 &&
      ref.generation === 1 &&
      ref.sameRoot === true,
    'retained lifecycle ' + label,
  );
  ensure(
    exact(receipt, ['window', 'request', 'state', 'generation']) &&
      receipt.request === metadata.request &&
      receipt.state === index &&
      receipt.generation === 1 &&
      rect(receipt.window) &&
      ['x', 'y', 'width', 'height'].every((axis) => near(receipt.window[axis], bounds[axis])),
    'fresh measured native ref ' + label,
  );
}
function checkPaint(paint, bounds, expected, density) {
  ensure(
    record(paint) &&
      paint.method === 'retained-view-draw' &&
      positive(paint.widthPx) &&
      positive(paint.heightPx) &&
      paint.widthPx <= 32768 &&
      paint.heightPx <= 32768 &&
      Math.abs(paint.widthPx - bounds.width * density) <= 1 &&
      Math.abs(paint.heightPx - bounds.height * density) <= 1,
    'native raster dimensions',
  );
  ensure(
    Array.isArray(paint.excludedTextRects) &&
      (expected.textChildren === 0
        ? paint.excludedTextRects.length === 0
        : paint.excludedTextRects.length >= 2) &&
      paint.excludedTextRects.length <= 8,
    'actual native text exclusions',
  );
  for (const r of paint.excludedTextRects)
    ensure(
      exact(r, ['left', 'top', 'right', 'bottom']) &&
        Object.values(r).every(
          (v) => Number.isSafeInteger(v) && v >= -0x80000000 && v <= 0x7fffffff,
        ) &&
        r.right > r.left &&
        r.bottom > r.top,
      'integer actual text rectangle',
    );
  const width = paint.widthPx,
    inset = Math.round(4 * density);
  const xs = [
    inset,
    Math.floor((width - 1) / 4),
    Math.floor((width - 1) / 2),
    Math.floor((3 * (width - 1)) / 4),
    width - 1 - inset,
  ];
  const background = argb(expected.background);
  const checkSamples = (samples, y, checkColor) => {
    ensure(Array.isArray(samples) && samples.length === 5, 'five finite native raster samples');
    const points = new Set();
    samples.forEach((s, i) => {
      ensure(
        exact(s, ['x', 'y', 'argb']) &&
          Number.isSafeInteger(s.x) &&
          Number.isSafeInteger(s.y) &&
          s.x >= 0 &&
          s.x < width &&
          s.y >= 0 &&
          s.y < paint.heightPx &&
          Math.abs(s.x - xs[i]) <= 1 &&
          Math.abs(s.y - y) <= 1 &&
          uint32(s.argb) &&
          s.argb >>> 24 === 255,
        'native sample point/unsigned color',
      );
      ensure(!points.has(s.x + ',' + s.y), 'distinct native samples');
      points.add(s.x + ',' + s.y);
      ensure(
        !paint.excludedTextRects.some(
          (r) => s.x >= r.left && s.x < r.right && s.y >= r.top && s.y < r.bottom,
        ),
        'sample excludes actual native text',
      );
      if (checkColor) ensure(rgbNear(s.argb, background), 'authored native surface RGB');
    });
  };
  checkSamples(paint.samples, Math.round(4 * density), true);
  checkSamples(paint.edgeSamples, Math.round(density), expected.borderWidth === 0);
  const columns = paint.topBorderColumns,
    ys = Math.ceil(4 * density) + 2;
  ensure(Array.isArray(columns) && columns.length === 3, 'three finite native border bands');
  const columnXs = xs.slice(1, 4),
    coordinates = new Set();
  columns.forEach((column, index) => {
    ensure(
      exact(column, ['x', 'pixels']) &&
        Number.isSafeInteger(column.x) &&
        column.x >= 0 &&
        column.x < width &&
        Math.abs(column.x - columnXs[index]) <= 1 &&
        !coordinates.has(column.x) &&
        Array.isArray(column.pixels) &&
        column.pixels.length === ys &&
        column.pixels.every(
          (p, y) =>
            uint32(p) &&
            (p >>> 24 === 255 ||
              (y === 0 &&
                expected.borderWidth === 1 &&
                expected.borderColor === '#e0e0e0' &&
                expected.background === '#ffffff' &&
                p >>> 24 > 0)),
        ),
      'bounded native border-band pixels',
    );
    coordinates.add(column.x);
    for (let y = 0; y < ys; y++)
      ensure(
        !paint.excludedTextRects.some(
          (r) => column.x >= r.left && column.x < r.right && y >= r.top && y < r.bottom,
        ),
        'border band excludes native text',
      );
    if (expected.borderWidth === 0)
      ensure(
        column.pixels.every((p) => rgbNear(p, background)),
        'zero border has no stale top-band paint',
      );
    else {
      const color = argb(expected.borderColor);
      const borderRGB = [16, 8, 0].map((shift) => (color >>> shift) & 255);
      const backgroundRGB = [16, 8, 0].map((shift) => (background >>> shift) & 255);
      const delta = borderRGB.map((value, i) => value - backgroundRGB[i]);
      const denominator = delta.reduce((sum, value) => sum + value * value, 0);
      let coverage = 0,
        backgroundOnly = false,
        firstPixel = 0;
      const outer = column.pixels[0];
      if (outer >>> 24 !== 255) {
        // RN shrinks a rounded bordered fill by 0.8 physical pixels before
        // drawing the border. View.draw starts on transparent pixels, so the
        // first row can contain a partially covered own-white fill. Validate
        // black alpha31 SRC_OVER that fill, never an assumed parent composite.
        const alpha = (outer >>> 24) / 255,
          outerCoverage = Math.min(1, expected.borderWidth * density),
          sourceAlpha = (31 / 255) * outerCoverage,
          fillCoverage = (alpha - sourceAlpha) / (1 - sourceAlpha),
          white = (255 * fillCoverage * (1 - sourceAlpha)) / alpha;
        ensure(
          fillCoverage > 0 &&
            fillCoverage < 1 &&
            [16, 8, 0].every((shift) => Math.abs(((outer >>> shift) & 255) - white) <= 3),
          'first outlined pixel matches source border over partial own fill',
        );
        // At widths of two physical pixels or more, the second row must
        // independently retain the complete authored border color.
        ensure(
          expected.borderWidth * density < 2 || rgbNear(column.pixels[1], color),
          'outlined inner row retains full source border',
        );
        coverage = outerCoverage;
        firstPixel = 1;
      }
      for (const pixel of column.pixels.slice(firstPixel)) {
        if (backgroundOnly) {
          ensure(rgbNear(pixel, background), 'native border must end in background');
        } else if (rgbNear(pixel, color)) {
          coverage++;
        } else if (rgbNear(pixel, background)) {
          backgroundOnly = true;
        } else {
          // The finite inner edge can end with one antialiased pixel. Admit
          // only a convex border/background blend, then background.
          const actual = [16, 8, 0].map((shift) => (pixel >>> shift) & 255);
          const weight =
            actual.reduce((sum, value, i) => sum + (value - backgroundRGB[i]) * delta[i], 0) /
            denominator;
          ensure(
            denominator > 0 &&
              weight > 0 &&
              weight < 1 &&
              actual.every(
                (value, i) => Math.abs(value - (backgroundRGB[i] + weight * delta[i])) <= 3,
              ),
            'one antialiased border/background transition',
          );
          coverage += weight;
          backgroundOnly = true;
        }
      }
      ensure(
        coverage > 0 && Math.abs(coverage - expected.borderWidth * density) <= 1,
        'native top-border physical coverage',
      );
    }
  });
}
/** A passed terminal code is necessary, never sufficient, for all13 finite stages. */
export function summarizeCard(output, { fontProfile } = {}) {
  ensure(
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length === 1 &&
      /^INSTRUMENTATION_CODE: -1\r?$/m.test(output) &&
      !/^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output),
    'instrumentation completion',
  );
  const report = inspectCardReport(output);
  ensure(
    report.status === 'passed' &&
      report.error == null &&
      same(report.stages, cardStates) &&
      same(report.screenshots, cardPictures),
    'complete stages/screenshots',
  );
  ensure(
    ['normal', 'enlarged'].includes(fontProfile) &&
      report.fontProfile === fontProfile &&
      near(report.device.fontScale, fontProfile === 'normal' ? 1 : 2, 0.01),
    'requested OS font profile',
  );
  const sp = report.device.spToPx,
    sizes = ['1', '14', '16', '18', '20', '22', '24', '26', '28', '30', '32'];
  ensure(
    exact(sp, sizes) &&
      sizes.every(
        (size, i) =>
          finite(sp[size]) &&
          sp[size] > 0 &&
          sp[size] < 100000 &&
          (i === 0 || sp[size] > sp[sizes[i - 1]]),
      ),
    'native RN SP conversions',
  );
  const navigation = [
    ['catalog-tab-Wrappers', 'root-layout-card'],
    ['root-layout-card', 'card-contract-receipt'],
  ];
  ensure(
    Array.isArray(report.navigation) &&
      report.navigation.length === 2 &&
      navigation.every(([control, destination], i) => {
        const step = report.navigation[i];
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
    record(report.initial) &&
      same(report.initial.counts, { stock: 0, custom: 0 }) &&
      Array.isArray(report.initial.roots) &&
      report.initial.roots.length === 2 &&
      Array.isArray(report.states) &&
      report.states.length === 13,
    'initial zero state and complete roots/states',
  );
  const identities = new Map(),
    initialIds = new Set();
  report.initial.roots.forEach((root, i) => {
    ensure(
      record(root) && root.key === cardKeys[i] && root.counterText === cardKeys[i] + ' 0',
      'native initial zero child',
    );
    for (const field of ['rootId', 'counterId', 'textId']) {
      ensure(
        nativeIdentity(root[field]) && !initialIds.has(root[field]),
        'distinct initial native identities',
      );
      initialIds.add(root[field]);
      identities.set(root.key + ':' + field, root[field]);
    }
  });
  ensure(
    Array.isArray(report.initial.probes) && report.initial.probes.length === 3,
    'three initial permanent native probes',
  );
  report.initial.probes.forEach((probe, index) => {
    const key = cardProbeKeys[index],
      oracle = cardProbeOracles[key];
    ensure(
      record(probe) &&
        probe.key === key &&
        nativeIdentity(probe.rootId) &&
        !initialIds.has(probe.rootId) &&
        probe.testID === oracle.testID &&
        probe.nativeID === oracle.nativeID,
      'initial native probe identity',
    );
    initialIds.add(probe.rootId);
    identities.set('probe:' + key, probe.rootId);
  });
  let previousRequest = 0,
    firstTouch,
    firstWindow,
    firstFrameWidth;
  report.states.forEach((state, index) => {
    const metadata = state?.metadata,
      input = cardInputs[index];
    ensure(
      record(state) &&
        state.name === input.name &&
        record(metadata) &&
        metadata.schemaVersion === 1 &&
        metadata.scenario === 'card-v1' &&
        metadata.state === index &&
        metadata.sequenceLength === 13 &&
        same(metadata.input, input) &&
        near(metadata.fontScale, report.device.fontScale, 0.01) &&
        same(metadata.counts, { stock: 1, custom: 1 }) &&
        positive(metadata.request) &&
        metadata.request > previousRequest,
      'fresh authored state ' + input.name,
    );
    previousRequest = metadata.request;
    const window = metadata.windowProfile,
      touch = metadata.touch;
    ensure(
      exact(window, ['width', 'height', 'scale']) &&
        Object.values(window).every((v) => finite(v) && v > 0 && v <= 100000) &&
        near(window.scale, report.device.density, 0.01),
      'actual window profile',
    );
    firstWindow ??= window;
    ensure(same(firstWindow, window), 'stable native window profile');
    ensure(
      exact(touch, ['count', 'target', 'pageX', 'pageY', 'timestamp']) &&
        touch.count === 1 &&
        positive(touch.target) &&
        ['pageX', 'pageY', 'timestamp'].every((k) => finite(touch[k]) && touch[k] >= 0),
      'actual first custom native event',
    );
    firstTouch ??= touch;
    ensure(same(touch, firstTouch), 'retained first custom touch event');
    ensure(
      metadata.refRevision === 7 &&
        ['refs', 'textRefs', 'receipts', 'textReceipts'].every((k) =>
          exact(metadata[k], cardKeys),
        ) &&
        Array.isArray(state.roots) &&
        state.roots.length === 2,
      'complete root/text lifecycle maps',
    );
    state.roots.forEach((root, rootIndex) => {
      const key = cardKeys[rootIndex],
        expected = cardExpected(index, key);
      ensure(
        record(root) &&
          root.key === key &&
          root.class === 'com.facebook.react.views.view.ReactViewGroup' &&
          root.direction === expected.direction &&
          ['rootId', 'counterId', 'textId'].every(
            (field) =>
              nativeIdentity(root[field]) && root[field] === identities.get(key + ':' + field),
          ) &&
          [root.bounds, root.frame, root.counter, root.textBounds].every(rect),
        'retained native host and child identities/frames ' + key,
      );
      ensure(
        root.shown === true && near(root.alpha, 1, 1e-4) && near(root.effectiveAlpha, 1, 1e-4),
        'visible opaque actual root and ancestors',
      );
      checkReceipt(metadata.refs[key], metadata.receipts[key], metadata, index, root.bounds, key);
      checkReceipt(
        metadata.textRefs[key],
        metadata.textReceipts[key],
        metadata,
        index,
        root.textBounds,
        key + '-text',
      );
      const bounds = root.bounds,
        frame = root.frame,
        counter = root.counter,
        text = root.textBounds,
        border = expected.borderWidth;
      firstFrameWidth ??= frame.width;
      ensure(
        near(frame.width, firstFrameWidth) &&
          frame.width <= 280 + 1.5 &&
          frame.width <= window.width + 1.5 &&
          near(bounds.x, frame.x + 12 + expected.marginLeft) &&
          near(bounds.y, frame.y + 12 + expected.marginTop) &&
          near(bounds.width, frame.width - 24 - expected.marginLeft - expected.marginRight) &&
          near(frame.height, bounds.height + 24 + expected.marginTop + expected.marginBottom) &&
          near(
            bounds.height,
            Math.max(
              88,
              counter.height +
                text.height +
                expected.paddingTop +
                expected.paddingBottom +
                border * 2,
            ),
          ),
        'authored frame/intrinsic root geometry',
      );
      const left = bounds.x + expected.paddingLeft + border,
        right = bounds.x + bounds.width - expected.paddingRight - border;
      ensure(
        near(counter.x, left) &&
          near(counter.y, bounds.y + expected.paddingTop + border) &&
          near(counter.width, right - left) &&
          counter.width * report.device.density + 1e-4 >= Math.floor(44 * report.device.density) &&
          counter.height * report.device.density + 1e-4 >= Math.floor(44 * report.device.density) &&
          near(text.x, left) &&
          near(text.width, right - left) &&
          near(text.y, counter.y + counter.height) &&
          text.y + text.height <= bounds.y + bounds.height - expected.paddingBottom - border + 1.5,
        'actual authored padding/stack/minimum touch geometry',
      );
      ensure(
        near(root.borderWidthDp, border, 0.01) &&
          (root.borderColor === null || uint32(root.borderColor)) &&
          (border === 0 || root.borderColor === 0x1f000000) &&
          near(root.radiusDp, expected.borderRadius, 0.01),
        'native border/radius properties',
      );
      const fontPx = Math.ceil(sp[String(expected.fontSize)]);
      ensure(
        root.counterText === key + ' 1' &&
          root.copyText === 'Copy' &&
          textClasses.includes(root.counterTextClass) &&
          textClasses.includes(root.textClass) &&
          near(root.counterFontPx, Math.ceil(sp['14']), 1e-4) &&
          root.counterColor === argb(expected.color) &&
          near(root.textFontPx, fontPx, 1e-4) &&
          near(root.textLineHeightPx, Math.ceil(sp[String(expected.lineHeight)]), 1e-4) &&
          near(root.textLetterSpacingEm, expected.letterSpacing ? sp['1'] / fontPx : 0, 0.002) &&
          root.textColor === argb(expected.color),
        'native TextPaint metrics/colors and retained counter/copy',
      );
      // Correct Layout metrics alone do not prove the native host can display
      // the line. Compare its actual height in physical pixels, allowing only
      // native measurement rounding instead of the wider layout tolerance.
      ensure(
        Math.abs(text.height * report.device.density - root.textLineHeightPx) <= 1 + 1e-4,
        'native one-line Copy host height',
      );
      checkPaint(root.paint, bounds, expected, report.device.density);
    });
    ensure(
      same(metadata.authoredProbeInputs, cardProbeInputs) &&
        exact(metadata.probeRefs, cardProbeKeys) &&
        exact(metadata.probeReceipts, cardProbeKeys) &&
        Array.isArray(state.probes) &&
        state.probes.length === 3,
      'complete authored probe inputs and fresh probe maps',
    );
    state.probes.forEach((probe, index) => {
      const key = cardProbeKeys[index],
        oracle = cardProbeOracles[key],
        bounds = probe?.bounds,
        frame = probe?.frame,
        density = report.device.density;
      ensure(
        record(probe) &&
          probe.key === key &&
          probe.rootId === identities.get('probe:' + key) &&
          nativeIdentity(probe.rootId) &&
          probe.class === 'com.facebook.react.views.view.ReactViewGroup' &&
          probe.direction === 'ltr' &&
          probe.testID === oracle.testID &&
          probe.nativeID === oracle.nativeID &&
          probe.originalHostPresent === false &&
          probe.nativeChildCount === 0 &&
          rect(bounds) &&
          rect(frame),
        'actual retained empty probe host ' + key,
      );
      checkReceipt(
        metadata.probeRefs[key],
        metadata.probeReceipts[key],
        metadata,
        metadata.state,
        bounds,
        'probe-' + key,
      );
      ensure(
        probe.shown === true &&
          near(probe.alpha, oracle.alpha, 1e-4) &&
          near(probe.effectiveAlpha, oracle.effectiveAlpha, 1e-4),
        'actual probe opacity/visibility',
      );
      ensure(
        near(bounds.x, frame.x + 12) &&
          near(bounds.y, frame.y + 12) &&
          near(frame.height, bounds.height + 24) &&
          bounds.x + bounds.width <= frame.x + frame.width - 12 + 1.5 &&
          Math.abs(bounds.width - oracle.width) * density <= 1 + 1e-4 &&
          Math.abs(bounds.height - oracle.height) * density <= 1 + 1e-4 &&
          bounds.height * density + 1e-4 >= Math.floor(44 * density),
        'authored empty probe geometry',
      );
      ensure(
        near(probe.borderWidthDp, 0, 0.01) &&
          near(probe.radiusDp, oracle.borderRadius, 0.01) &&
          (probe.borderColor === null || uint32(probe.borderColor)),
        'native probe radius/border getters',
      );
      // View.draw is local paint. Theme opacity is checked independently above;
      // composited screenshot RGB belongs to the separate iOS observation.
      checkPaint(
        probe.paint,
        bounds,
        {
          background:
            '#' + oracle.localDrawInteriorRGB.map((v) => v.toString(16).padStart(2, '0')).join(''),
          borderWidth: 0,
          borderColor: null,
          textChildren: 0,
        },
        density,
      );
    });
  });
  return report;
}
