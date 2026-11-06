// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
export const layoutRootStates = [
  {
    name: 'group-initial',
    kind: 'group',
    row: false,
    parentError: false,
    themed: false,
    rtl: false,
    fontSize: 16,
    count: 0,
  },
  {
    name: 'group-counter',
    kind: 'group',
    row: false,
    parentError: false,
    themed: false,
    rtl: false,
    fontSize: 16,
    count: 1,
  },
  {
    name: 'group-row',
    kind: 'group',
    row: true,
    parentError: false,
    themed: false,
    rtl: false,
    fontSize: 16,
    count: 1,
  },
  {
    name: 'group-error',
    kind: 'group',
    row: true,
    parentError: true,
    themed: false,
    rtl: false,
    fontSize: 16,
    count: 1,
  },
  {
    name: 'group-theme',
    kind: 'group',
    row: true,
    parentError: true,
    themed: true,
    rtl: false,
    fontSize: 16,
    count: 1,
  },
  {
    name: 'group-rtl',
    kind: 'group',
    row: true,
    parentError: true,
    themed: true,
    rtl: true,
    fontSize: 16,
    count: 1,
  },
  {
    name: 'group-text',
    kind: 'group',
    row: true,
    parentError: true,
    themed: true,
    rtl: true,
    fontSize: 20,
    count: 1,
  },
  {
    name: 'group-restored',
    kind: 'group',
    row: false,
    parentError: false,
    themed: false,
    rtl: false,
    fontSize: 16,
    count: 1,
  },
  { name: 'avatar-initial', kind: 'avatar', top: false, rtl: false, customStyle: false, count: 0 },
  { name: 'avatar-counter', kind: 'avatar', top: false, rtl: false, customStyle: false, count: 1 },
  { name: 'avatar-alignment', kind: 'avatar', top: true, rtl: false, customStyle: false, count: 1 },
  { name: 'avatar-theme', kind: 'avatar', top: true, rtl: false, customStyle: true, count: 1 },
  { name: 'avatar-rtl', kind: 'avatar', top: true, rtl: true, customStyle: true, count: 1 },
  { name: 'avatar-restored', kind: 'avatar', top: false, rtl: false, customStyle: false, count: 1 },
];
export const layoutRootStages = layoutRootStates.map(({ name }) => name);
export const layoutRootPictures = [
  'group-column.png',
  'group-row-error.png',
  'group-rtl-text.png',
  'avatar-default.png',
  'avatar-themed-rtl.png',
  'avatar-restored.png',
];
const finite = Number.isFinite;
const close = (a, b, tolerance = 1.5) => finite(a) && finite(b) && Math.abs(a - b) <= tolerance;
const rectangle = (r) =>
  r && ['x', 'y', 'width', 'height'].every((key) => finite(r[key])) && r.width > 0 && r.height > 0;
const color = (value) => Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
const nativeText = (type, backend) =>
  typeof type === 'string' &&
  type.length > 0 &&
  (backend === 'TextView'
    ? type !== 'com.facebook.react.views.text.PreparedLayoutTextView'
    : backend === 'prepared-layout' &&
      type === 'com.facebook.react.views.text.PreparedLayoutTextView');
const centerX = (r) => r.x + r.width / 2;
const centerY = (r) => r.y + r.height / 2;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function requireEvidence(condition, message) {
  if (!condition) throw Error('Invalid native layout-root evidence: ' + message);
}
function physicalRelation(physical, bounds, nativeId, children) {
  requireEvidence(
    physical &&
      Number.isInteger(physical.parentId) &&
      typeof physical.parentClass === 'string' &&
      physical.parentClass.length > 0 &&
      Number.isInteger(physical.rootChildren) &&
      physical.rootChildren >= 0,
    'actual wrapper native parent',
  );
  for (const prefix of Object.keys(children)) {
    const path = physical[prefix + 'Ancestors'];
    requireEvidence(
      Array.isArray(path) &&
        path.length > 0 &&
        path.length <= 16 &&
        path.every(Number.isInteger) &&
        physical[prefix + 'ParentId'] === path[0],
      'actual wrapper ancestor path',
    );
    requireEvidence(
      physical.mode === 'descendants'
        ? physical.rootChildren > 0 && path.includes(nativeId)
        : physical.mode === 'flattened-siblings' &&
            physical.rootChildren === 0 &&
            path[0] === physical.parentId &&
            !path.includes(nativeId),
      'descendant or immediate flattened sibling',
    );
    const frame = children[prefix];
    requireEvidence(
      rectangle(frame) &&
        frame.x >= bounds.x - 1.5 &&
        frame.y >= bounds.y - 1.5 &&
        frame.x + frame.width <= bounds.x + bounds.width + 1.5 &&
        frame.y + frame.height <= bounds.y + bounds.height + 1.5,
      'contained actual wrapper child frame',
    );
  }
}
/** Validate artifact paths before pulling diagnostics, including failed native runs. */
export function inspectLayoutRootReport(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: layoutRootReport=([^\r\n]+)\r?$/gm),
  ];
  if (matches.length !== 1) throw Error('No unambiguous layout-root instrumentation report');
  const report = JSON.parse(matches[0][1]);
  if (
    report?.schemaVersion !== 1 ||
    report.scenario !== 'layout-roots-v1' ||
    report.driver !== 'native Instrumentation and UiAutomation' ||
    !['passed', 'failed'].includes(report.status) ||
    typeof report.artifactDirectory !== 'string' ||
    !/^cache\/mui-layout-roots-\d+$/.test(report.artifactDirectory) ||
    !Number.isInteger(report.device?.sdk) ||
    report.device.sdk < 29 ||
    typeof report.device.model !== 'string' ||
    !report.device.model ||
    !finite(report.device.fontScale) ||
    report.device.fontScale <= 0 ||
    !finite(report.device.density) ||
    report.device.density <= 0 ||
    !Array.isArray(report.screenshots) ||
    new Set(report.screenshots).size !== report.screenshots.length ||
    !report.screenshots.every((name) => [...layoutRootPictures, 'failure.png'].includes(name))
  )
    throw Error('Unsafe or incomplete layout-root diagnostic metadata');
  return report;
}
/** Native views, glyph paint and receipts must agree through every real touch update. */
export function summarizeLayoutRoots(output) {
  if (
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length !== 1 ||
    !/^INSTRUMENTATION_CODE: -1\r?$/m.test(output) ||
    /^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output)
  )
    throw Error('Missing or failed layout-root instrumentation');
  const report = inspectLayoutRootReport(output);
  requireEvidence(report.status === 'passed' && report.error == null, 'native completion');
  requireEvidence(
    same(report.stages, layoutRootStages) && same(report.screenshots, layoutRootPictures),
    'complete stages/screenshots',
  );
  requireEvidence(
    Array.isArray(report.states) && report.states.length === layoutRootStates.length,
    'complete state samples',
  );
  const hosts = new Map();
  for (const [index, expected] of layoutRootStates.entries()) {
    const state = report.states[index],
      keys =
        expected.kind === 'group'
          ? ['inherited', 'own-false', 'custom', 'styled']
          : ['native', 'custom', 'portal'];
    requireEvidence(
      state?.name === expected.name &&
        state.metadata &&
        Array.isArray(state.roots) &&
        state.roots.length === keys.length,
      'state ' + expected.name,
    );
    const metadata = state.metadata;
    const flags =
      expected.kind === 'group'
        ? ['row', 'parentError', 'themed', 'rtl', 'fontSize']
        : ['top', 'rtl', 'customStyle'];
    requireEvidence(
      flags.every((key) => metadata[key] === expected[key]) &&
        close(metadata.fontScale, report.device.fontScale, 0.01),
      'live flags/fontScale ' + expected.name,
    );
    if (expected.kind === 'group')
      requireEvidence(metadata.schemaVersion === 1, 'Group receipt schema');
    if (expected.kind === 'avatar')
      requireEvidence(
        nativeText(state.counterTextClass, state.counterTextBackend),
        'actual badge text backend',
      );
    const nativeIds = new Set();
    for (const [rootIndex, key] of keys.entries()) {
      const root = state.roots[rootIndex],
        token = expected.kind + ':' + key;
      requireEvidence(
        root?.key === key &&
          Number.isInteger(root.nativeId) &&
          root.nativeId > 0 &&
          !nativeIds.has(root.nativeId),
        'actual host ' + token,
      );
      nativeIds.add(root.nativeId);
      requireEvidence(
        !hosts.has(token) || hosts.get(token) === root.nativeId,
        'retained host ' + token,
      );
      hosts.set(token, root.nativeId);
      requireEvidence(
        rectangle(root.bounds) && same(root.receipt, metadata.receipts?.[key]),
        'receipt association ' + token,
      );
      // Origins are retained diagnostics: scrolling does not emit another onLayout.
      for (const kind of ['local', 'window'])
        requireEvidence(
          rectangle(root.receipt?.[kind]) &&
            close(root.receipt[kind].width, root.bounds.width) &&
            close(root.receipt[kind].height, root.bounds.height),
          'native receipt dimensions ' + token,
        );
      requireEvidence(
        root.direction === (expected.rtl ? 'rtl' : 'ltr') &&
          root.count === (key === 'custom' ? expected.count : 0),
        'native direction/count ' + token,
      );
      if (expected.kind === 'group') {
        physicalRelation(root.physical, root.bounds, root.nativeId, {
          literal: root.literal,
          action: root.action,
          text: root.text,
        });
        for (const prefix of ['text', 'literalText', 'actionText'])
          requireEvidence(
            nativeText(root[prefix + 'Class'], root[prefix + 'Backend']),
            'actual native text backend ' + prefix,
          );
        requireEvidence(
          typeof root.textLayoutClass === 'string' &&
            root.textLayoutClass.length > 0 &&
            Number.isInteger(root.textLines) &&
            root.textLines > 0,
          'actual rendered native Layout',
        );
        requireEvidence(
          root.refs?.attached === 1 &&
            root.refs.cleaned === 0 &&
            same(root.refs, metadata.refs?.[key]),
          'native ref lifecycle ' + key,
        );
        requireEvidence(
          rectangle(root.literal) && rectangle(root.action) && rectangle(root.text),
          'physical child bounds ' + key,
        );
        if (expected.row) {
          const overlap =
            Math.min(root.literal.y + root.literal.height, root.action.y + root.action.height) -
            Math.max(root.literal.y, root.action.y);
          requireEvidence(
            finite(root.unwrappedFitWidth) &&
              root.unwrappedFitWidth > 0 &&
              (root.unwrappedFitWidth > root.bounds.width || overlap > 0),
            'native intrinsic row fit ' + key,
          );
          requireEvidence(
            overlap > 0
              ? expected.rtl
                ? centerX(root.literal) > centerX(root.action)
                : centerX(root.literal) < centerX(root.action)
              : root.literal.y + root.literal.height <= root.action.y + 1.5,
            'physical row ordering ' + key,
          );
        } else
          requireEvidence(
            root.literal.y + root.literal.height <= root.action.y + 1.5 &&
              root.action.y + root.action.height <= root.text.y + 1.5,
            'physical column ordering ' + key,
          );
        requireEvidence(
          finite(root.fontPx) &&
            root.fontPx > 0 &&
            finite(root.expectedFontPx) &&
            root.expectedFontPx > 0 &&
            close(root.fontPx, root.expectedFontPx, 1.1),
          'actual glyph size ' + key,
        );
        if (key === 'styled' && expected.row)
          requireEvidence(close(root.borderRightWidth, 4, 0.1), 'native wrapped row border');
        requireEvidence(
          color(root.textColor) &&
            color(root.borderColor) &&
            close(root.borderWidth, expected.themed ? 2 : 1, 0.1) &&
            close(root.alpha, key === 'styled' && expected.parentError ? 0.6 : 1, 0.02),
          'native style ' + key,
        );
      } else {
        requireEvidence(
          Number.isInteger(root.rowNativeId) &&
            root.rowNativeId > 0 &&
            typeof root.rowClass === 'string' &&
            root.rowClass.length > 0,
          'actual Avatar row host',
        );
        physicalRelation(root.rowPhysical, root.row, root.rowNativeId, {
          avatar: root.bounds,
          primary: root.primary,
        });
        requireEvidence(
          nativeText(root.primaryTextClass, root.primaryTextBackend),
          'actual primary text backend',
        );
        requireEvidence(
          close(root.bounds.width, expected.customStyle ? 64 : 56, 1) &&
            (key === 'custom' ? root.bounds.height >= 43.5 : close(root.bounds.height, 40, 1)) &&
            rectangle(root.row) &&
            rectangle(root.primary),
          'Avatar native bounds ' + key,
        );
        requireEvidence(
          root.inScroll === (key !== 'portal') &&
            root.sameWindow === true &&
            root.rowDirection === (expected.rtl ? 'rtl' : 'ltr'),
          'actual Portal/layout ancestry ' + key,
        );
        requireEvidence(
          expected.rtl
            ? centerX(root.bounds) > centerX(root.primary)
            : centerX(root.bounds) < centerX(root.primary),
          'physical Avatar ordering ' + key,
        );
        requireEvidence(
          expected.top
            ? close(root.bounds.y - root.row.y, expected.customStyle ? 20 : 16)
            : close(centerY(root.bounds), centerY(root.row)),
          'actual Avatar alignment ' + key,
        );
      }
    }
    if (expected.kind === 'group') {
      const own = state.roots[1];
      for (const i of [0, 2, 3])
        requireEvidence(
          expected.parentError
            ? state.roots[i].textColor !== own.textColor &&
                state.roots[i].borderColor !== own.borderColor
            : state.roots[i].textColor === own.textColor,
          'inherited error vs own false',
        );
    }
  }
  for (const [i, root] of report.states[7].roots.entries())
    requireEvidence(
      root.textColor === report.states[0].roots[i].textColor &&
        root.borderColor === report.states[0].roots[i].borderColor &&
        close(root.fontPx, report.states[0].roots[i].fontPx, 1.1),
      'actual restored foreground/border/font',
    );
  requireEvidence(
    report.states[3].roots[1].textColor !== report.states[4].roots[1].textColor,
    'actual theme foreground update',
  );
  requireEvidence(
    report.states[6].roots.every((root, i) => root.fontPx > report.states[5].roots[i].fontPx),
    'actual authored text-size update',
  );
  return report;
}
