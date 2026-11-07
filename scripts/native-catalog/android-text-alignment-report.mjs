// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
export const textAlignmentStates = [
  { name: 'alignment-20-ltr', font: 20, rtl: false, count: 0 },
  { name: 'alignment-24-rtl', font: 24, rtl: true, count: 1 },
  { name: 'alignment-restored-ltr', font: 20, rtl: false, count: 1 },
];
export const textAlignmentPictures = textAlignmentStates.flatMap(({ name }) =>
  ['stock', 'custom'].map((key) => `${name}-${key}.png`),
);
const finite = Number.isFinite;
const close = (a, b, tolerance = 1.5) => finite(a) && finite(b) && Math.abs(a - b) <= tolerance;
const rectangle = (r) =>
  r && ['x', 'y', 'width', 'height'].every((key) => finite(r[key])) && r.width > 0 && r.height > 0;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function requireEvidence(condition, message) {
  if (!condition) throw Error('Invalid native text-alignment evidence: ' + message);
}
function contained(outer, inner) {
  return (
    rectangle(outer) &&
    rectangle(inner) &&
    inner.x >= outer.x - 1.5 &&
    inner.y >= outer.y - 1.5 &&
    inner.x + inner.width <= outer.x + outer.width + 1.5 &&
    inner.y + inner.height <= outer.y + outer.height + 1.5
  );
}
function physical(relation, ownerId, bounds, children) {
  requireEvidence(
    relation &&
      Number.isInteger(relation.parentId) &&
      typeof relation.parentClass === 'string' &&
      relation.parentClass.length > 0 &&
      Number.isInteger(relation.rootChildren) &&
      relation.rootChildren >= 0,
    'physical parent',
  );
  for (const [name, frame] of Object.entries(children)) {
    const path = relation[name + 'Ancestors'];
    requireEvidence(
      Array.isArray(path) &&
        path.length > 0 &&
        path.length <= 16 &&
        path.every(Number.isInteger) &&
        relation[name + 'ParentId'] === path[0] &&
        contained(bounds, frame),
      'contained physical child ' + name,
    );
    requireEvidence(
      relation.mode === 'descendants'
        ? relation.rootChildren > 0 && path.includes(ownerId)
        : relation.mode === 'flattened-siblings' &&
            relation.rootChildren === 0 &&
            path[0] === relation.parentId &&
            !path.includes(ownerId),
      'descendant or immediate flattened sibling ' + name,
    );
  }
}
/** Safe diagnostic paths are checked before pulling artifacts from failed runs too. */
export function inspectTextAlignmentReport(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: textAlignmentReport=([^\r\n]+)\r?$/gm),
  ];
  if (matches.length !== 1) throw Error('No unambiguous text-alignment instrumentation report');
  const report = JSON.parse(matches[0][1]);
  if (
    report?.schemaVersion !== 1 ||
    report.scenario !== 'text-alignment-v1' ||
    report.driver !== 'native Instrumentation and UiAutomation' ||
    !['passed', 'failed'].includes(report.status) ||
    typeof report.artifactDirectory !== 'string' ||
    !/^cache\/mui-text-alignment-\d+$/.test(report.artifactDirectory) ||
    !Number.isInteger(report.device?.sdk) ||
    report.device.sdk < 29 ||
    typeof report.device.model !== 'string' ||
    !report.device.model ||
    !finite(report.device.density) ||
    report.device.density <= 0 ||
    !finite(report.device.fontScale) ||
    report.device.fontScale <= 0 ||
    !Array.isArray(report.screenshots) ||
    new Set(report.screenshots).size !== report.screenshots.length ||
    !report.screenshots.every((file) => [...textAlignmentPictures, 'failure.png'].includes(file))
  )
    throw Error('Unsafe or incomplete text-alignment diagnostic metadata');
  return report;
}
/** Compare real native paint/geometry and screenshot ink, not intrinsic lineLeft or JS flags alone. */
export function summarizeTextAlignment(output) {
  if (
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length !== 1 ||
    !/^INSTRUMENTATION_CODE: -1\r?$/m.test(output) ||
    /^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output)
  )
    throw Error('Missing or failed text-alignment instrumentation');
  const report = inspectTextAlignmentReport(output);
  requireEvidence(
    report.status === 'passed' && report.error == null && close(report.device.fontScale, 1, 0.01),
    'baseline native completion',
  );
  requireEvidence(
    same(
      report.stages,
      textAlignmentStates.map(({ name }) => name),
    ) &&
      same(report.screenshots, textAlignmentPictures) &&
      Array.isArray(report.states) &&
      report.states.length === 3,
    'complete stages/screenshots',
  );
  const hosts = new Map();
  for (const [index, expected] of textAlignmentStates.entries()) {
    const state = report.states[index],
      metadata = state.metadata;
    requireEvidence(
      state.name === expected.name &&
        metadata &&
        metadata.large === (expected.font === 24) &&
        metadata.rtl === expected.rtl &&
        metadata.childCount === expected.count &&
        metadata.spacing === 'source' &&
        metadata.inline === false &&
        metadata.adjusted === false &&
        close(metadata.fontScale, report.device.fontScale, 0.01),
      'committed scene state',
    );
    requireEvidence(
      Number.isInteger(state.child?.nativeId) &&
        state.child.nativeId > 0 &&
        typeof state.child.text === 'string' &&
        state.child.text.toLowerCase() === `mark ${expected.count}`,
      'actual native child counter',
    );
    requireEvidence(
      !hosts.has('child') || hosts.get('child') === state.child.nativeId,
      'retained native child',
    );
    hosts.set('child', state.child.nativeId);
    if (expected.count > 0) {
      const touch = metadata.touches?.custom;
      requireEvidence(
        touch &&
          Number.isInteger(touch.count) &&
          touch.count > 0 &&
          Number.isInteger(touch.target) &&
          touch.target > 0 &&
          ['pageX', 'pageY', 'timestamp'].every((key) => finite(touch[key])),
        'actual bubbling native touch',
      );
    }
    requireEvidence(Array.isArray(state.roots) && state.roots.length === 2, 'stock/custom roots');
    for (const [rootIndex, key] of ['stock', 'custom'].entries()) {
      const root = state.roots[rootIndex],
        refs = metadata.refs?.[key],
        receipt = metadata.receipts?.[key];
      requireEvidence(
        root.key === key &&
          Number.isInteger(root.nativeId) &&
          root.nativeId > 0 &&
          rectangle(root.bounds) &&
          root.direction === (expected.rtl ? 'rtl' : 'ltr') &&
          root.screenshot === `${expected.name}-${key}.png`,
        'actual root identity/direction',
      );
      requireEvidence(
        refs?.attached === 1 &&
          refs.cleaned === 0 &&
          refs.sameRoot === true &&
          same(root.refs, refs) &&
          same(root.receipt, receipt),
        'same ref and receipt',
      );
      for (const kind of ['local', 'window'])
        requireEvidence(
          rectangle(receipt?.[kind]) &&
            close(receipt[kind].width, root.bounds.width) &&
            close(receipt[kind].height, root.bounds.height),
          'current measured dimensions',
        );
      requireEvidence(!hosts.has(key) || hosts.get(key) === root.nativeId, 'retained actual root');
      hosts.set(key, root.nativeId);
      requireEvidence(
        Number.isInteger(root.contentId) && root.contentId > 0,
        'actual content identity',
      );
      physical(root.physical, root.nativeId, root.bounds, { content: root.content });
      requireEvidence(
        Array.isArray(root.texts) && root.texts.length === 2,
        'two native text roots',
      );
      physical(root.textPhysical, root.contentId, root.content, {
        primary: root.texts[0].bounds,
        small: root.texts[1].bounds,
      });
      for (const [textIndex, kind] of ['primary', 'small'].entries()) {
        const text = root.texts[textIndex],
          id = `details-contract-${kind}-${key}`;
        const authored = expected.font * (kind === 'small' ? 0.5 : 1);
        const label =
          kind === 'primary'
            ? key === 'stock'
              ? 'Dock 3.'
              : 'Notes.'
            : key === 'stock'
              ? 'Keep dry.'
              : 'Fragile.';
        const nativeClass =
          text.backend === 'prepared-layout'
            ? text.class === 'com.facebook.react.views.text.PreparedLayoutTextView'
            : text.backend === 'TextView' &&
              ['android.widget.TextView', 'com.facebook.react.views.text.ReactTextView'].includes(
                text.class,
              );
        requireEvidence(
          text.id === id &&
            text.text === label &&
            nativeClass &&
            Number.isInteger(text.nativeId) &&
            text.nativeId > 0 &&
            text.direction === root.direction &&
            contained(root.content, text.bounds),
          'source-unique actual Text',
        );
        requireEvidence(!hosts.has(id) || hosts.get(id) === text.nativeId, 'retained actual Text');
        hosts.set(id, text.nativeId);
        requireEvidence(
          close(text.expectedFontPx, Math.ceil(authored * report.device.density), 0.01) &&
            close(text.fontPx, text.expectedFontPx, 1.1) &&
            close(text.lineHeight, authored * 1.25) &&
            close(text.bounds.height, authored * 1.25),
          'actual native SP font and inherited line height',
        );
        const frame = metadata.textFrames?.[`${kind}-${key}`];
        requireEvidence(
          rectangle(frame) &&
            close(frame.width, text.bounds.width) &&
            close(frame.height, text.bounds.height),
          'current native Text frame receipt',
        );
        const lines = metadata.metrics?.[`${kind}-${key}`];
        requireEvidence(
          Array.isArray(lines) &&
            lines.length === 1 &&
            close(lines[0].height, authored * 1.25) &&
            finite(lines[0].capHeight) &&
            lines[0].capHeight > 0,
          'current native line receipt',
        );
        const ink = text.ink,
          blank = text.bounds.width - text.advance;
        const tolerance = Math.min(Math.max(2, authored * 0.2), blank / 3);
        requireEvidence(
          rectangle(ink) &&
            ink.x >= 0 &&
            ink.y >= 0 &&
            ink.x + ink.width <= text.bounds.width + 0.5 &&
            ink.y + ink.height <= text.bounds.height + 0.5 &&
            Number.isInteger(ink.pixels) &&
            ink.pixels >= 12 &&
            ink.pixels <=
              Math.ceil(text.bounds.width * text.bounds.height * report.device.density ** 2) &&
            ink.width > authored &&
            finite(text.advance) &&
            text.advance > authored &&
            blank > Math.max(6, authored * 0.1),
          'meaningful screenshot glyphs and distinguishable edges',
        );
        const inset = expected.rtl ? text.bounds.width - ink.x - ink.width : ink.x;
        const oppositeInset = expected.rtl ? ink.x : text.bounds.width - ink.x - ink.width;
        requireEvidence(
          inset >= -1 &&
            inset <= tolerance &&
            oppositeInset >= blank - tolerance &&
            ink.width <= text.advance + tolerance,
          'actual screenshot logical-start glyph edge and opposite blank space',
        );
      }
    }
  }
  return report;
}
