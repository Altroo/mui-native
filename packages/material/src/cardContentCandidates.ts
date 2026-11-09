// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { StyleSheet } from 'react-native';
import { nativeStyledStyles } from '@altroo/mui-native-system/internal/prepared-style';
import type {
  NativeRootPreparation,
  NativeRootStyleInput,
} from '@altroo/mui-native-system/internal/prepared-style';
import type { NativePreparedSheet } from '@altroo/mui-native-system/internal/prepared-style';
import {
  applyNativeTextMetrics,
  isNativeTextStyleProperty,
  nativeStyleTextMetrics,
  type NativeStyle,
} from '@altroo/mui-native-system';
import type { StyleProp } from 'react-native';
import { componentRootStyle } from '@altroo/mui-native-system';
import { directionOf, mergeNativeRootStyle } from './nativeControlStyles';
import type { CardContentBackendInput } from './cardContentRuntime';
// Snapshot genuine native values once for both counterfactual outputs. This
// carrier belongs to the canonical System metadata module.
function snapshotProgram(style: StyleProp<NativeStyle>): StyleProp<NativeStyle> {
  const sheets: NativePreparedSheet[] = [];
  const native: StyleProp<NativeStyle>[] = [];
  const visit = (layer: StyleProp<NativeStyle>) => {
    const descriptor =
      layer && typeof layer === 'object' ? nativeStyledStyles.get(layer) : undefined;
    if (descriptor) {
      sheets.push(...descriptor.sheets);
      visit(descriptor.authored);
    } else if (Array.isArray(layer)) {
      for (const value of layer) visit(value);
    } else if (layer) native.push(layer);
  };
  visit(style);
  const inline = { ...(StyleSheet.flatten(native) ?? {}) };
  const carrier = [inline];
  nativeStyledStyles.set(
    carrier,
    Object.freeze({
      sheets: Object.freeze(sheets),
      authored: inline,
      hasAuthoredStyle: native.length > 0,
    }),
  );
  return carrier;
}

// Only library-owned maps/metrics are compared. The normalizer and the canonical
// NativeTextScope still own text semantics; no text field is sent to a View.
function textFacet(
  style: NativeStyle,
  metrics: Record<string, unknown>,
  parentDirection: 'ltr' | 'rtl',
) {
  return {
    style: Object.fromEntries(
      Object.entries(style).filter(([key]) => isNativeTextStyleProperty(key)),
    ),
    metrics,
    direction: directionOf(style.direction, parentDirection),
  };
}

// Facet containers contain library-owned data properties. Leaf objects retain
// canonical identity: do not traverse authored arrays, colors or shadow objects
// and introduce getter/Proxy observations while checking conditional support.
function sameTextFacet(a: ReturnType<typeof textFacet>, b: ReturnType<typeof textFacet>) {
  const same = (x: Record<string, unknown>, y: Record<string, unknown>) => {
    const keys = Object.keys(x);
    return (
      keys.length === Object.keys(y).length &&
      keys.every((key) => Object.hasOwn(y, key) && Object.is(x[key], y[key]))
    );
  };
  return a.direction === b.direction && same(a.style, b.style) && same(a.metrics, b.metrics);
}

// Enumerate counterfactual target states. Native structure chooses later.
export function compileCandidates(input: CardContentBackendInput) {
  const {
    baseStyle: _base,
    rootProps: _props,
    ancestors: _ancestors,
    ...context
  } = input.styleContext;
  const programme = snapshotProgram(input.styleProgram);
  const resolve = (lastChild: boolean) => {
    const { computed, authored } = componentRootStyle(input.theme, '', {}, undefined, programme, {
      ...context,
      lastChild,
    });
    const merged = mergeNativeRootStyle(input.parentDirection, computed, authored);
    const metrics = nativeStyleTextMetrics([computed, authored]);
    const presentation = applyNativeTextMetrics(merged, computed, metrics) ?? merged;
    return {
      view: Object.fromEntries(
        Object.entries(presentation).filter(([key]) => !isNativeTextStyleProperty(key)),
      ),
      text: textFacet(presentation, metrics, input.parentDirection),
    };
  };
  const normal = resolve(false),
    last = resolve(true);
  // Equal point heights can still carry different inherited line-height ratios;
  // logical alignment and effective direction also belong to the text snapshot.
  if (!sameTextFacet(normal.text, last.text))
    throw Error('Conditional CardContent text is not supported');
  const ordinary = textFacet(
    input.ordinaryText.presentation,
    input.ordinaryText.metrics,
    input.parentDirection,
  );
  if (!sameTextFacet(normal.text, ordinary))
    throw Error('CardContent text snapshot differs from its ordinary scope presentation');
  return { normal: normal.view, last: last.view };
}

/** Compile one terminal cooperating root; all callbacks were already prepared once. */
export function compileCooperatingCandidates(
  input: CardContentBackendInput,
  root: NativeRootStyleInput,
): NativeRootPreparation {
  const cardSheets: NativePreparedSheet[] = [],
    rootSheets: NativePreparedSheet[] = [];
  const native: StyleProp<NativeStyle>[] = [];
  const visit = (
    style: StyleProp<NativeStyle>,
    sheets: NativePreparedSheet[],
    keepNative: boolean,
  ) => {
    const descriptor =
      style && typeof style === 'object' ? nativeStyledStyles.get(style) : undefined;
    if (descriptor) {
      sheets.push(...descriptor.sheets);
      visit(descriptor.authored, sheets, keepNative);
    } else if (Array.isArray(style)) for (const value of style) visit(value, sheets, keepNative);
    else if (style && keepNative) native.push(style);
  };
  visit(input.styleProgram, cardSheets, true);
  visit(root.programme, rootSheets, false);
  const classes = Array.from(
    new Set([...(input.styleContext.classes ?? []), ...(root.context.classes ?? [])]),
  );
  const ancestors = rootSheets.some((sheet) => sheet.ancestor)
    ? rootSheets.filter((sheet) => sheet.ancestor)
    : cardSheets.filter((sheet) => sheet.ancestor);
  const rebound = ancestors.map((sheet) => ({
    ...sheet,
    context: {
      ...sheet.context,
      descendantClasses: classes,
      descendantPath: sheet.context.descendantPath?.map((target, index, path) =>
        index === path.length - 1 ? { ...target, classes } : target,
      ),
    },
  }));
  // Emotion evaluates the selected styled root before CardContent's forwarded
  // CSS. Genuine native inline values remain the final layer, once per snapshot.
  const sheets = [
    ...rebound,
    ...rootSheets.filter((sheet) => !sheet.ancestor),
    ...cardSheets.filter((sheet) => !sheet.ancestor),
  ];
  const inline = { ...(StyleSheet.flatten(native) ?? {}) };
  const programme = [inline];
  nativeStyledStyles.set(
    programme,
    Object.freeze({
      sheets: Object.freeze(sheets),
      authored: inline,
      hasAuthoredStyle: native.length > 0,
    }),
  );
  const { baseStyle: _base, rootProps: _props, ancestors: _ancestors, ...context } = root.context;
  const resolve = (lastChild?: boolean) => {
    const { computed, authored, prepared } = componentRootStyle(
      root.theme,
      '',
      {},
      undefined,
      programme,
      {
        ...context,
        classes,
        ...(lastChild === undefined ? {} : { lastChild }),
      },
    );
    const merged = mergeNativeRootStyle(root.parentDirection, computed, authored);
    const metrics = nativeStyleTextMetrics([computed, authored]);
    const presentation = applyNativeTextMetrics(merged, computed, metrics) ?? merged;
    return {
      presentation,
      prepared,
      text: textFacet(presentation, metrics, root.parentDirection),
      view: Object.fromEntries(
        Object.entries(presentation).filter(([key]) => !isNativeTextStyleProperty(key)),
      ),
    };
  };
  const ordinary = resolve(),
    normal = resolve(false),
    last = resolve(true);
  if (!sameTextFacet(normal.text, last.text) || !sameTextFacet(normal.text, ordinary.text))
    throw Error('Conditional cooperating-root text is unsupported');
  return {
    presentation: ordinary.presentation,
    normal: normal.view,
    last: last.view,
    prepared: ordinary.prepared,
  };
}
