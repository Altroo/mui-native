// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// This manifest is independent of the app's authored inputs. Fixtures exercising
// this parser are synthetic validation data, never platform pass evidence.
export const dividerStates = [
  'default',
  'inset',
  'middle',
  'vertical',
  'vertical-flex',
  'left',
  'right',
  'dark',
  'rtl-left',
  'rtl-right',
  'native-reset',
  'restored',
];
export const dividerPictures = [
  'default.png',
  'vertical-flex.png',
  'rtl-left.png',
  'native-reset.png',
  'restored.png',
];
const keys = ['plain', 'label', 'paint', 'custom'];
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = Number.isFinite;
const integer = (value) => Number.isSafeInteger(value) && value > 0;
const close = (a, b, epsilon = 1.5) => finite(a) && finite(b) && Math.abs(a - b) <= epsilon;
// Native View dimensions are integral physical pixels. A source 1dp line
// can round to either adjacent pixel count at fractional density/position.
// Keep this separate from layout/ref tolerances; allow only float-to-dp noise.
const thinLine = (dp, density) => {
  const pixels = dp * density,
    rounded = Math.round(pixels);
  return (
    finite(pixels) &&
    Number.isSafeInteger(rounded) &&
    rounded > 0 &&
    Math.abs(pixels - rounded) <= 1e-4 &&
    rounded >= Math.floor(density) &&
    rounded <= Math.ceil(density)
  );
};
const rect = (value) =>
  record(value) &&
  ['x', 'y', 'width', 'height'].every((key) => finite(value[key])) &&
  value.width > 0 &&
  value.height > 0;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function requireEvidence(condition, message) {
  if (!condition) throw Error('Invalid native Divider evidence: ' + message);
}
export function inspectDividerReport(output) {
  const matches = [...output.matchAll(/^INSTRUMENTATION_RESULT: dividerReport=([^\r\n]+)\r?$/gm)];
  if (matches.length !== 1) throw Error('No unambiguous Divider instrumentation report');
  const r = JSON.parse(matches[0][1]);
  requireEvidence(
    record(r) &&
      r.schemaVersion === 1 &&
      r.scenario === 'divider-v1' &&
      r.driver === 'native Instrumentation and UiAutomation' &&
      r.paintMethod === 'retained-view-draw-excluding-native-text' &&
      ['passed', 'failed'].includes(r.status),
    'report identity',
  );
  requireEvidence(
    typeof r.artifactDirectory === 'string' && /^cache\/mui-divider-\d+$/.test(r.artifactDirectory),
    'safe artifact directory',
  );
  requireEvidence(
    record(r.device) &&
      Number.isInteger(r.device.sdk) &&
      r.device.sdk >= 29 &&
      typeof r.device.model === 'string' &&
      r.device.model.length > 0 &&
      finite(r.device.density) &&
      r.device.density > 0 &&
      finite(r.device.fontScale) &&
      r.device.fontScale > 0 &&
      ['normal', 'enlarged'].includes(r.fontProfile),
    'actual device/profile',
  );
  requireEvidence(
    Array.isArray(r.screenshots) &&
      new Set(r.screenshots).size === r.screenshots.length &&
      r.screenshots.every((name) => [...dividerPictures, 'failure.png'].includes(name)),
    'safe screenshot names',
  );
  return r;
}
/** Completion requires real native samples, not app flags or the status scalar. */
export function summarizeDivider(output, { fontProfile } = {}) {
  requireEvidence(
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length === 1 &&
      /^INSTRUMENTATION_CODE: -1\r?$/m.test(output) &&
      !/^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output),
    'instrumentation completion',
  );
  const r = inspectDividerReport(output);
  requireEvidence(
    r.status === 'passed' &&
      r.error == null &&
      same(r.stages, dividerStates) &&
      same(r.screenshots, dividerPictures),
    'complete stages/pictures',
  );
  requireEvidence(
    ['normal', 'enlarged'].includes(fontProfile) &&
      r.fontProfile === fontProfile &&
      (fontProfile === 'normal'
        ? close(r.device.fontScale, 1, 0.01)
        : r.device.fontScale >= 1.3 && r.device.fontScale <= 5),
    'requested OS font profile',
  );
  const navigation = [
    ['catalog-tab-Wrappers', 'root-layout-divider'],
    ['root-layout-divider', 'divider-contract-receipt'],
  ];
  requireEvidence(
    Array.isArray(r.navigation) &&
      r.navigation.length === navigation.length &&
      navigation.every(([control, destination], index) => {
        const step = r.navigation[index];
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

  requireEvidence(
    Array.isArray(r.states) &&
      r.states.length === dividerStates.length &&
      r.initialCount === 0 &&
      r.initialCounterText === '0',
    'complete native states/initial count',
  );
  const hosts = new Map();
  let lastRequest = 0,
    lightColor,
    firstTouch;
  for (const [index, name] of dividerStates.entries()) {
    const state = r.states[index],
      metadata = state?.metadata;
    requireEvidence(
      record(state) &&
        state.name === name &&
        record(metadata) &&
        metadata.schemaVersion === 1 &&
        metadata.state === index &&
        metadata.input?.name === name &&
        close(metadata.fontScale, r.device.fontScale, 0.01) &&
        metadata.count === 1 &&
        integer(metadata.request) &&
        metadata.request > lastRequest,
      'fresh state ' + name,
    );
    lastRequest = metadata.request;
    requireEvidence(
      record(metadata.touch) &&
        metadata.touch.count === 1 &&
        integer(metadata.touch.target) &&
        ['pageX', 'pageY', 'timestamp'].every(
          (key) => finite(metadata.touch[key]) && metadata.touch[key] >= 0,
        ),
      'native custom-root event',
    );
    if (index === 0) firstTouch = metadata.touch;
    requireEvidence(same(metadata.touch, firstTouch), 'original native event retained');
    requireEvidence(
      state.counterText === '1' &&
        typeof state.counterTextClass === 'string' &&
        (state.counterTextClass === 'com.facebook.react.views.text.ReactTextView' ||
          state.counterTextClass === 'com.facebook.react.views.text.PreparedLayoutTextView') &&
        finite(state.counterFontPx) &&
        close(state.counterFontPx, state.expectedCounterFontPx, 1.1) &&
        finite(state.expectedCounterFontPx) &&
        state.expectedCounterFontPx > 0,
      'native counter glyphs',
    );
    requireEvidence(
      state.counterColor === ([7, 8, 9].includes(index) ? 0xffffffff : 0xde000000),
      'readable counter palette',
    );
    requireEvidence(
      Array.isArray(state.roots) && state.roots.length === keys.length,
      'complete roots',
    );
    const ids = new Set();
    for (const [i, key] of keys.entries()) {
      const root = state.roots[i],
        receipt = metadata.receipts?.[key],
        refs = metadata.refs?.[key];
      requireEvidence(
        record(root) &&
          root.key === key &&
          integer(root.nativeId) &&
          !ids.has(root.nativeId) &&
          rect(root.bounds) &&
          rect(root.frame),
        'native root ' + key,
      );
      ids.add(root.nativeId);
      requireEvidence(!hosts.has(key) || hosts.get(key) === root.nativeId, 'retained host ' + key);
      hosts.set(key, root.nativeId);
      requireEvidence(
        record(refs) &&
          refs.attached === 1 &&
          refs.cleaned === 0 &&
          refs.generation === 1 &&
          refs.sameRoot === true &&
          record(receipt) &&
          receipt.request === metadata.request &&
          receipt.state === index &&
          receipt.generation === refs.generation &&
          rect(receipt.window) &&
          ['x', 'y', 'width', 'height'].every((axis) =>
            close(receipt.window[axis], root.bounds[axis]),
          ),
        'fresh measured ref ' + key,
      );
      requireEvidence(
        root.direction === ([8, 9].includes(index) ? 'rtl' : 'ltr'),
        'actual local direction',
      );
      requireEvidence(
        record(root.paint) &&
          Number.isSafeInteger(root.paint.inkPixels) &&
          root.paint.inkPixels >= 0 &&
          Number.isSafeInteger(root.paint.sampledPixels) &&
          root.paint.sampledPixels > 0 &&
          root.paint.inkPixels <= root.paint.sampledPixels &&
          Number.isInteger(root.paint.maxAlpha) &&
          root.paint.maxAlpha >= 0 &&
          root.paint.maxAlpha <= 255 &&
          (root.paint.inkPixels === 0 ? root.paint.maxAlpha === 0 : root.paint.maxAlpha > 0),
        'actual retained-view raster',
      );
      requireEvidence(
        key === 'paint' && index !== 10 ? root.paint.inkPixels === 0 : root.paint.inkPixels > 0,
        'none/reset/native line paint',
      );
      if (key === 'plain') {
        const vertical = index === 3 || index === 4,
          inset = index === 1 || index === 8,
          middle = index === 2 || index === 4 || index === 9;
        requireEvidence(
          vertical
            ? thinLine(root.bounds.width, r.device.density) &&
                close(root.bounds.height, root.frame.height - (middle ? 16 : 0)) &&
                close(root.bounds.y, root.frame.y + (middle ? 8 : 0))
            : thinLine(root.bounds.height, r.device.density) &&
                close(root.bounds.width, root.frame.width - (inset ? 72 : middle ? 32 : 0)) &&
                close(root.bounds.x, root.frame.x + (inset ? 72 : middle ? 16 : 0)),
          'source variant/orientation/flex geometry',
        );
        requireEvidence(
          Number.isInteger(root.borderColor) &&
            root.borderColor >= 0 &&
            root.borderColor <= 0xffffffff,
          'actual native palette border',
        );
        if (index === 0) lightColor = root.borderColor;
        requireEvidence(
          [7, 8, 9].includes(index)
            ? root.borderColor !== lightColor
            : root.borderColor === lightColor,
          'live light/dark palette',
        );
      }
      if (key === 'label') {
        requireEvidence(
          rect(root.label) &&
            root.label.x >= root.bounds.x - 1.5 &&
            root.label.x + root.label.width <= root.bounds.x + root.bounds.width + 1.5,
          'actual label bounds',
        );
        const before = root.label.x - root.bounds.x,
          after = root.bounds.x + root.bounds.width - root.label.x - root.label.width;
        // Source left/right ratios concern DOM order. RN row direction reverses
        // their physical side under local RTL; test the actual native position.
        const side =
          index === 5 || index === 8 ? 'left' : index === 6 || index === 9 ? 'right' : 'center';
        requireEvidence(
          side === 'center'
            ? close(before, after, 2)
            : (side === 'left') !== [8, 9].includes(index)
              ? before < after
              : before > after,
          'physical label alignment',
        );
      }
    }
  }
  return r;
}
