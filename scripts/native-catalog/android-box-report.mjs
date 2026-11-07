// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Authored finite scene inputs, independent of JavaScript style/paint receipts.
// The native raster checks cover a top strip and top-border bands, not GPU paint.
export const boxKeys = Object.freeze(['stock', 'custom', 'styled']);
const initial = {
  name: 'default',
  rtl: false,
  ignoredConfig: false,
  explicitTheme: false,
  reset: false,
  divAlias: false,
};
export const boxInputs = Object.freeze(
  [
    initial,
    { ...initial, name: 'ignored-config', ignoredConfig: true },
    { ...initial, name: 'sx-array' },
    { ...initial, name: 'inline-final' },
    { ...initial, name: 'div-alias', divAlias: true },
    { ...initial, name: 'rtl-physical', rtl: true },
    { ...initial, name: 'text-inheritance' },
    { ...initial, name: 'ancestor-styled' },
    { ...initial, name: 'explicit-theme', explicitTheme: true },
    { ...initial, name: 'native-reset', reset: true },
    { ...initial, name: 'restored' },
  ].map(Object.freeze),
);
export const boxStates = Object.freeze(boxInputs.map(({ name }) => name));
export const boxPictures = Object.freeze(boxStates.map((name) => name + '.png'));
export const boxNativeReset = Object.freeze({
  padding: 0,
  margin: 0,
  borderWidth: 0,
  backgroundColor: '#243447',
  color: '#f5f7fa',
  fontSize: 16,
  lineHeight: 24,
});
/** Authored constants only. This function never reads app-computed style. */
export function boxExpected(index, key) {
  if (!Number.isInteger(index) || !boxInputs[index] || !boxKeys.includes(key))
    throw Error('Unknown authored Box state/root');
  const input = boxInputs[index];
  const value = {
    minHeight: 88,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    borderWidth: 0,
    borderColor: null,
    borderRadius: 0,
    background: '#ffffff',
    color: '#203247',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
    direction: input.rtl ? 'rtl' : 'ltr',
  };
  const padding = (amount) =>
    Object.assign(value, {
      paddingLeft: amount,
      paddingRight: amount,
      paddingTop: amount,
      paddingBottom: amount,
    });
  if (['sx-array', 'inline-final', 'native-reset'].includes(input.name)) {
    padding(16);
    Object.assign(value, { background: '#1565c0', color: '#ffffff', fontSize: 18, lineHeight: 26 });
  }
  if (input.name === 'inline-final') {
    padding(4);
    Object.assign(value, { background: '#243447', color: '#f5f7fa', fontSize: 20, lineHeight: 28 });
  }
  if (['div-alias', 'text-inheritance'].includes(input.name)) padding(8);
  if (input.rtl)
    Object.assign(value, { marginLeft: 12, marginRight: 4, paddingLeft: 24, paddingRight: 8 });
  if (input.name === 'text-inheritance')
    Object.assign(value, { color: '#7542a6', fontSize: 24, lineHeight: 32 });
  if (input.name === 'ancestor-styled') Object.assign(value, { paddingLeft: 20, color: '#6a1b9a' });
  if (key === 'custom' && input.explicitTheme)
    Object.assign(value, { background: '#27384a', color: '#f5f7fa' });
  if (key === 'styled')
    Object.assign(value, {
      borderWidth: 2,
      borderColor: '#546e7a',
      background: input.name === 'sx-array' ? '#0b5d44' : '#e8f0fa',
      letterSpacing: 1,
    });
  if (key === 'styled' && input.name === 'inline-final') value.background = '#243447';
  if (input.reset) {
    padding(0);
    Object.assign(value, {
      marginLeft: 0,
      marginRight: 0,
      borderWidth: 0,
      background: '#243447',
      color: '#f5f7fa',
      fontSize: 16,
      lineHeight: 24,
    });
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
  Object.values(r).every((v) => finite(v) && Math.abs(v) <= 100000) &&
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
  if (!condition) throw Error('Invalid native Box evidence: ' + description);
}
/** Parse even a failed report for diagnostics, but never grant completion here. */
export function inspectBoxReport(output) {
  const matches = [...output.matchAll(/^INSTRUMENTATION_RESULT: boxReport=([^\r\n]+)\r?$/gm)];
  ensure(matches.length === 1, 'one unambiguous instrumentation report');
  const value = JSON.parse(matches[0][1]);
  ensure(
    record(value) &&
      value.schemaVersion === 1 &&
      value.scenario === 'box-native-root-contract-v1' &&
      value.driver === 'native Instrumentation and UiAutomation' &&
      value.paintMethod === 'retained-view-draw-interior-samples' &&
      ['passed', 'failed'].includes(value.status),
    'report identity',
  );
  ensure(
    typeof value.artifactDirectory === 'string' &&
      /^cache\/mui-box-\d{1,20}$/.test(value.artifactDirectory),
    'safe artifact directory',
  );
  ensure(
    Array.isArray(value.screenshots) &&
      value.screenshots.length <= 12 &&
      new Set(value.screenshots).size === value.screenshots.length &&
      value.screenshots.every((name) => [...boxPictures, 'failure.png'].includes(name)),
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
      paint.excludedTextRects.length >= 2 &&
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
        column.pixels.every((p) => uint32(p) && p >>> 24 === 255),
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
        backgroundOnly = false;
      for (const pixel of column.pixels) {
        if (backgroundOnly) {
          ensure(rgbNear(pixel, background), 'native border must end in background');
        } else if (rgbNear(pixel, color)) {
          coverage++;
        } else if (rgbNear(pixel, background)) {
          backgroundOnly = true;
        } else {
          // RN's integer-centered odd-width stroke can end with one partial
          // pixel. Admit only a convex border/background blend, then background.
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
/** A passed terminal code is necessary, never sufficient, for all11 finite stages. */
export function summarizeBox(output, { fontProfile } = {}) {
  ensure(
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length === 1 &&
      /^INSTRUMENTATION_CODE: -1\r?$/m.test(output) &&
      !/^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output),
    'instrumentation completion',
  );
  const report = inspectBoxReport(output);
  ensure(
    report.status === 'passed' &&
      report.error == null &&
      same(report.stages, boxStates) &&
      same(report.screenshots, boxPictures),
    'complete stages/screenshots',
  );
  ensure(
    ['normal', 'enlarged'].includes(fontProfile) &&
      report.fontProfile === fontProfile &&
      near(report.device.fontScale, fontProfile === 'normal' ? 1 : 2, 0.01),
    'requested OS font profile',
  );
  const sp = report.device.spToPx,
    sizes = ['1', '14', '16', '18', '20', '24', '26', '28', '32'];
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
    ['catalog-tab-Wrappers', 'root-layout-box'],
    ['root-layout-box', 'box-contract-receipt'],
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
      same(report.initial.counts, { stock: 0, custom: 0, styled: 0 }) &&
      Array.isArray(report.initial.roots) &&
      report.initial.roots.length === 3 &&
      Array.isArray(report.states) &&
      report.states.length === 11,
    'initial zero state and complete roots/states',
  );
  const identities = new Map(),
    initialIds = new Set();
  report.initial.roots.forEach((root, i) => {
    ensure(
      record(root) && root.key === boxKeys[i] && root.counterText === boxKeys[i] + ' 0',
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
  let previousRequest = 0,
    firstTouch,
    firstWindow,
    firstFrameWidth;
  report.states.forEach((state, index) => {
    const metadata = state?.metadata,
      input = boxInputs[index];
    ensure(
      record(state) &&
        state.name === input.name &&
        record(metadata) &&
        metadata.schemaVersion === 1 &&
        metadata.scenario === 'box-v1' &&
        metadata.state === index &&
        metadata.sequenceLength === 11 &&
        same(metadata.input, input) &&
        near(metadata.fontScale, report.device.fontScale, 0.01) &&
        same(metadata.counts, { stock: 1, custom: 1, styled: 1 }) &&
        positive(metadata.request) &&
        metadata.request > previousRequest &&
        same(metadata.authoredNativeReset, input.reset ? boxNativeReset : null),
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
      metadata.refRevision === 6 &&
        ['refs', 'textRefs', 'receipts', 'textReceipts'].every((k) =>
          exact(metadata[k], boxKeys),
        ) &&
        Array.isArray(state.roots) &&
        state.roots.length === 3,
      'complete root/text lifecycle maps',
    );
    state.roots.forEach((root, rootIndex) => {
      const key = boxKeys[rootIndex],
        expected = boxExpected(index, key);
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
          (border === 0 || root.borderColor === argb(expected.borderColor)) &&
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
      checkPaint(root.paint, bounds, expected, report.device.density);
    });
  });
  return report;
}
