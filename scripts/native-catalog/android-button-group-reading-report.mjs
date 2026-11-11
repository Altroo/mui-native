// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
export const readingPhases = [
  'ltr-horizontal',
  'rtl-horizontal',
  'rtl-vertical',
  'ltr-vertical',
  'restored-horizontal',
  'scaling-live',
  'scaling-restored',
];
export const readingPictures = [
  'reading-navigation.png',
  'reading-ltr-horizontal.png',
  'reading-rtl-horizontal.png',
  'reading-rtl-vertical.png',
  'reading-ltr-vertical.png',
  'reading-restored.png',
  'reading-scaling-live.png',
  'reading-scaling-restored.png',
  'reading-text-portal.png',
];
const positive = (value) => Number.isFinite(value) && value > 0;
const close = (a, b, tolerance = 1.5) =>
  Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
const bounds = (value) =>
  value &&
  ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(value[key])) &&
  value.width > 0 &&
  value.height > 0;
function ensure(condition, message) {
  if (!condition) throw Error(message);
}
const inside = (child, parent) =>
  child.x >= parent.x - 1.5 &&
  child.y >= parent.y - 1.5 &&
  child.x + child.width <= parent.x + parent.width + 1.5 &&
  child.y + child.height <= parent.y + parent.height + 1.5;

/** Retain safe artifacts for failed runs, without treating them as acceptance. */
export function inspectReadingReport(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: buttonGroupReadingReport=([^\r\n]+)\r?$/gm),
  ];
  ensure(matches.length === 1, 'No unambiguous native reading report');
  const report = JSON.parse(matches[0][1]);
  ensure(
    report?.schemaVersion === 3 &&
      report.scenario === 'button-group-reading-v3' &&
      report.driver === 'native Instrumentation and UiAutomation' &&
      typeof report.artifactDirectory === 'string' &&
      /^cache\/mui-button-group-reading-\d+$/.test(report.artifactDirectory) &&
      typeof report.expectedGlobalRTL === 'boolean' &&
      Number.isInteger(report.device?.sdk) &&
      report.device.sdk >= 29 &&
      typeof report.device.model === 'string' &&
      report.device.model.length > 0 &&
      positive(report.device.fontScale) &&
      positive(report.device.density),
    'Unsafe or incomplete reading metadata',
  );
  ensure(
    Array.isArray(report.screenshots) &&
      new Set(report.screenshots).size === report.screenshots.length &&
      report.screenshots.every((name) => [...readingPictures, 'failure.png'].includes(name)),
    'Unsafe reading screenshots',
  );
  return report;
}

/** Assert real host direction, glyph scaling, native containment and joined edges. */
export function summarizeReadingReport(output, { globalRTL }) {
  ensure(typeof globalRTL === 'boolean', 'Select the expected global host direction');
  ensure(
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length === 1 &&
      /^INSTRUMENTATION_CODE: -1\r?$/m.test(output) &&
      !/^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output),
    'Missing or failed reading instrumentation',
  );
  const report = inspectReadingReport(output);
  ensure(
    report.status === 'passed' &&
      report.error == null &&
      report.expectedGlobalRTL === globalRTL &&
      JSON.stringify(report.screenshots) === JSON.stringify(readingPictures) &&
      Array.isArray(report.states) &&
      report.states.length === readingPhases.length,
    'Incomplete native reading evidence',
  );
  for (const [stateIndex, state] of report.states.entries()) {
    const rtl = stateIndex === 1 || stateIndex === 2;
    const vertical = stateIndex === 2 || stateIndex === 3;
    ensure(
      state?.phase === readingPhases[stateIndex] &&
        state.direction === (rtl ? 'rtl' : 'ltr') &&
        state.orientation === (vertical ? 'vertical' : 'horizontal') &&
        state.count === 1 &&
        bounds(state.root) &&
        bounds(state.container),
      'Invalid reading state or native bounds',
    );
    ensure(
      close(state.root.x, state.container.x) && close(state.root.width, state.container.width),
      'Reading group must fill its actual parent',
    );
    const metadata = state.metadata;
    ensure(
      metadata?.schemaVersion === 1 &&
        metadata.globalRTL === globalRTL &&
        typeof metadata.leftRightSwap === 'boolean' &&
        close(metadata.fontScale, report.device.fontScale, 0.02) &&
        metadata.direction === state.direction &&
        metadata.orientation === state.orientation,
      'Actual React Native profile must match the requested state',
    );
    ensure(
      Array.isArray(state.actions) && state.actions.length === 3,
      'Missing native reading actions',
    );
    for (const [index, action] of state.actions.entries()) {
      ensure(
        action.index === index &&
          bounds(action.bounds) &&
          action.bounds.height >= 43.5 &&
          bounds(action.label) &&
          inside(action.label, action.bounds),
        'Native label must fit inside its actual touch root',
      );
      ensure(
        positive(action.fontPx) &&
          positive(action.expectedFontPx) &&
          close(action.fontPx, action.expectedFontPx, 1.1),
        'Glyph font must match native SP conversion and its authored cap',
      );
      ensure(
        action.count === (index === 0 || stateIndex >= 5 ? 1 : 0),
        'Action state must survive native policy changes',
      );
      if (index === 1 && stateIndex !== 5)
        ensure(
          close(action.fontPx, Math.ceil(14 * report.device.density), 1.1),
          'Fixed root text must not enlarge with OS font settings',
        );
      if (index === 2 && stateIndex !== 5)
        ensure(
          action.fontPx <= Math.ceil(14 * report.device.density * 1.2) + 1.1,
          'Capped root text exceeds its public multiplier',
        );
      ensure(
        Number.isInteger(action.lineCount) &&
          action.lineCount > 0 &&
          Array.isArray(action.lines) &&
          action.lines.length === action.lineCount,
        'Missing actual native glyph lines',
      );
      for (const line of action.lines)
        ensure(
          ['left', 'right', 'width', 'top', 'bottom', 'ellipsis'].every((key) =>
            Number.isFinite(line[key]),
          ) &&
            line.ellipsis === 0 &&
            line.left >= -1.5 &&
            line.right >= line.left &&
            line.width >= 0 &&
            line.right <= action.label.width + 1.5 &&
            line.top >= -1.5 &&
            line.bottom > line.top &&
            line.bottom <= action.label.height + 1.5,
          'Native glyph lines must fit without ellipsis or clipping',
        );
      const receipt = metadata.metrics?.[String(index)];
      ensure(
        Array.isArray(receipt) &&
          receipt.length === action.lineCount &&
          receipt.every(
            (line, lineIndex) =>
              typeof line.text === 'string' &&
              ['x', 'y', 'width', 'height', 'capHeight'].every((key) =>
                Number.isFinite(line[key]),
              ) &&
              line.x >= -1.5 &&
              line.y >= -1.5 &&
              line.width >= 0 &&
              (!/\S/.test(line.text) || line.width > 0) &&
              line.height > 0 &&
              line.capHeight > 0 &&
              line.capHeight <= line.height + 1.5 &&
              line.x + line.width <= action.label.width + 1.5 &&
              line.y + line.height <= action.label.height + 1.5 &&
              close(line.x, action.lines[lineIndex].left) &&
              close(line.y, action.lines[lineIndex].top) &&
              close(line.width, action.lines[lineIndex].width) &&
              close(line.height, action.lines[lineIndex].bottom - action.lines[lineIndex].top),
          ),
        'Native onTextLayout glyphs must fit their current label',
      );
      // A previous count can retain valid numeric metrics after a native update.
      // Compare complete source characters, allowing layout-generated whitespace.
      ensure(
        receipt
          .map((line) => line.text)
          .join('')
          .replace(/\s+/g, '') === `${['Save', 'Review', 'Send'][index]}${action.count}`,
        'Native onTextLayout must contain the current complete action text',
      );
      const expectedCorners = vertical
        ? [index === 0 ? 10 : 0, index === 0 ? 10 : 0, index === 2 ? 10 : 0, index === 2 ? 10 : 0]
        : [
            index === (rtl ? 2 : 0) ? 10 : 0,
            index === (rtl ? 0 : 2) ? 10 : 0,
            index === (rtl ? 2 : 0) ? 10 : 0,
            index === (rtl ? 0 : 2) ? 10 : 0,
          ];
      ensure(
        action.paint &&
          ['ltr', 'rtl'].includes(action.paint.direction) &&
          ['ltr', 'rtl'].includes(action.paint.drawableDirection) &&
          action.paint.drawableClass === 'com.facebook.react.uimanager.drawable.BorderDrawable' &&
          typeof action.paint.rawCorners === 'object',
        'Missing actual native border drawing evidence',
      );
      for (const [cornerIndex, name] of [
        'topLeft',
        'topRight',
        'bottomLeft',
        'bottomRight',
      ].entries()) {
        const corner = action.paint.corners?.[name];
        ensure(
          corner &&
            close(corner.x, expectedCorners[cornerIndex], 0.75) &&
            close(corner.y, expectedCorners[cornerIndex], 0.75),
          'Native outer corners must remain rounded and joined corners square',
        );
        const alpha = action.paint.cornerAlpha?.[name];
        ensure(
          Number.isInteger(alpha) &&
            alpha >= 0 &&
            alpha <= 255 &&
            (expectedCorners[cornerIndex] > 0 ? alpha === 0 : alpha > 0),
          'Actual border raster must retain rounded outer and square joined corners',
        );
      }
      const previous = state.actions[index - 1]?.bounds;
      const expectedX = vertical
        ? state.root.x
        : !index
          ? rtl
            ? state.root.x + state.root.width - action.bounds.width
            : state.root.x
          : rtl
            ? previous.x + 1 - action.bounds.width
            : previous.x + previous.width - 1;
      const expectedY = vertical && index ? previous.y + previous.height - 1 : state.root.y;
      ensure(
        close(action.bounds.x, expectedX) &&
          close(action.bounds.y, expectedY) &&
          (!vertical || close(action.bounds.width, state.root.width)),
        'RTL/vertical native joins or order are inconsistent',
      );
    }
    const last = state.actions.at(-1).bounds;
    ensure(
      close(
        rtl && !vertical ? last.x : last.x + last.width,
        rtl && !vertical ? state.root.x : state.root.x + state.root.width,
      ) && close(last.y + last.height, state.root.y + state.root.height),
      'Reading group endpoints do not match its actual root',
    );
    ensure(
      metadata.followSystem === (stateIndex === 5) && metadata.uncapped === (stateIndex === 5),
      'Live policy receipt does not match its phase',
    );
    if (stateIndex === 5)
      ensure(
        state.actions.every((action) => close(action.fontPx, state.actions[0].fontPx, 1.1)),
        'Cleared and zero-cap policies must follow the same actual system scaling',
      );
    if (report.device.fontScale >= 1.3 && stateIndex !== 5)
      ensure(
        state.actions[0].fontPx > state.actions[1].fontPx + 1 &&
          state.actions[2].fontPx >= state.actions[1].fontPx - 1.1,
        'Large-font profile must demonstrate actual native enlargement',
      );
  }
  ensure(
    report.mixed?.count === 1 &&
      bounds(report.mixed.root) &&
      bounds(report.mixed.first) &&
      bounds(report.mixed.last) &&
      inside(report.mixed.first, report.mixed.root) &&
      inside(report.mixed.last, report.mixed.root),
    'Mixed styled/literal text must wrap inside its native action',
  );
  ensure(
    report.portal?.text === 'Independent window text' &&
      bounds(report.portal.bounds) &&
      positive(report.portal.fontPx) &&
      close(report.portal.fontPx, Math.ceil(14 * report.device.density), 1.1),
    'Typography-origin Portal must have an independent unscaled physical text root',
  );
  return report;
}
