// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { copyNativeBorderStyle } from './borders';
import { I18nManager, Platform, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import type { Theme } from './theme';
import { diagnostic } from './diagnostics';
import { defaultTypographyFontFamily } from './typography';

export type NativeCssTextAlign = 'left' | 'right' | 'start' | 'end';
export type NativeTextContext = {
  parentTextStyle?: TextStyle;
  parentLineHeight?: number;
  parentDirection?: 'ltr' | 'rtl' | undefined;
  parentTextAlign?: NativeCssTextAlign | undefined;
  nativeTextMetrics?: Record<string, unknown>;
  inheritOnly?: boolean;
  nativeStyle?: TextStyle;
};
const numeric = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[+-]?\\d+)?';
const dimension = new RegExp(`^(${numeric})(px|rem|em|%)?$`, 'i');
export const textMetricKeys = new Set([
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
]);
const inheritedKeys = new Set([
  ...textMetricKeys,
  'fontStyle',
  'fontVariant',
  'fontVariationSettings',
  'textShadowColor',
  'textShadowOffset',
  'textShadowRadius',
  'writingDirection',
  'textAlign',
  'textTransform',
  'color',
  'textDecorationColor',
  'textDecorationLine',
  'textDecorationStyle',
]);
const nativeTextOnlyKeys = new Set([
  ...inheritedKeys,
  'includeFontPadding',
  'textAlignVertical',
  'verticalAlign',
  'userSelect',
]);
export function isNativeTextStyleProperty(key: string) {
  return nativeTextOnlyKeys.has(key);
}
export function inheritedTextStyle(style: TextStyle): TextStyle {
  return Object.fromEntries(
    Object.entries(style).filter(([key]) => inheritedKeys.has(key)),
  ) as TextStyle;
}
const relativeLineHeights = new WeakMap<object, number>();
const cssTextMetrics = new WeakMap<object, Record<string, unknown>>();
const relativeMetricKeys = ['fontSize', 'lineHeight', 'letterSpacing', 'textAlign'] as const;
// Preserve authored CSS metrics across library-generated style arrays. Literal native
// styles clear that provenance and retain their absolute React Native semantics.
export function nativeStyleTextMetrics(style: StyleProp<TextStyle>): Record<string, unknown> {
  const metrics: Record<string, unknown> = {};
  const visit = (entry: StyleProp<TextStyle>) => {
    if (Array.isArray(entry)) {
      for (const child of entry) visit(child);
      return;
    }
    const flat = StyleSheet.flatten(entry);
    if (!flat) return;
    const authored = cssTextMetrics.get(flat);
    for (const key of relativeMetricKeys)
      if (Object.hasOwn(flat, key)) {
        if (authored && Object.hasOwn(authored, key)) metrics[key] = authored[key];
        else delete metrics[key];
      }
  };
  visit(style);
  return metrics;
}
export function applyNativeTextMetrics<T extends TextStyle>(
  native: T | undefined,
  resolved: TextStyle,
  metrics: Record<string, unknown>,
): T | undefined {
  if (!native || !Object.keys(metrics).length) return native;
  const adjusted = copyNativeBorderStyle(native, { ...native });
  for (const key of relativeMetricKeys)
    if (Object.hasOwn(metrics, key)) {
      if (Object.hasOwn(resolved, key)) (adjusted as Record<string, unknown>)[key] = resolved[key];
      else delete adjusted[key];
    }
  cssTextMetrics.set(adjusted, { ...metrics });
  const ratio = relativeLineHeights.get(resolved);
  if (ratio !== undefined) relativeLineHeights.set(adjusted, ratio);
  return adjusted;
}
export function getTextStyleInheritance(style: TextStyle, parent?: TextStyle, native?: TextStyle) {
  const align =
    native && Object.hasOwn(native, 'textAlign')
      ? cssTextMetrics.get(native)?.textAlign
      : cssTextMetrics.get(style)?.textAlign;
  const textAlign: NativeCssTextAlign | undefined =
    align === 'left' || align === 'right' || align === 'start' || align === 'end'
      ? align
      : undefined;
  return {
    style: inheritedTextStyle({ ...parent, ...style, ...native }),
    lineHeight: relativeLineHeights.get(style),
    textAlign,
  };
}
/** The native paragraph, unlike a virtual Text span, owns Yoga direction. */
export function nativeTextParagraphDirection(
  direction: 'ltr' | 'rtl' | undefined,
  parentParagraphDirection: 'ltr' | 'rtl' | undefined,
  hasTextAncestor: boolean,
): 'ltr' | 'rtl' {
  return (
    (hasTextAncestor ? parentParagraphDirection : direction) ?? (I18nManager.isRTL ? 'rtl' : 'ltr')
  );
}
/** Encode CSS physical alignment only at Text emission. Genuine RN inline values
 * have no CSS provenance and retain RN's own direction-dependent behavior.
 * Pinned RN0.88.1 RCTResolveTextAlignment (iOS) and TextLayoutManager /
 * TextAttributeProps (Android) both mirror native left/right in RTL paragraphs.
 */
export function nativeTextAlignmentStyle<T extends TextStyle | null | undefined>(
  style: T,
  alignment: NativeCssTextAlign | undefined,
  paragraphDirection: 'ltr' | 'rtl',
): T {
  if (!style || !alignment) return style;
  const metrics = cssTextMetrics.get(style);
  const physical = metrics?.emittedTextAlign ?? style.textAlign;
  if (physical !== 'left' && physical !== 'right') return style;
  const textAlign =
    paragraphDirection === 'rtl' && (Platform.OS === 'ios' || Platform.OS === 'android')
      ? physical === 'left'
        ? 'right'
        : 'left'
      : physical;
  const native =
    textAlign === style.textAlign ? style : copyNativeBorderStyle(style, { ...style, textAlign });
  // Keep emitted styles recognizable if a composing library root processes them
  // again. This marker stays in the existing weak metadata, never in native props.
  cssTextMetrics.set(native, { ...metrics, textAlign: alignment, emittedTextAlign: physical });
  return native;
}
function size(value: unknown, em: number, rem: number): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const multiplied = value
    .trim()
    .match(new RegExp(`^calc\\(\\s*(${numeric})\\s*\\*\\s*(${numeric})(px|rem|em|%)\\s*\\)$`, 'i'));
  if (multiplied)
    return size(`${Number(multiplied[1]) * Number(multiplied[2])}${multiplied[3]}`, em, rem);
  const match = value.trim().match(dimension);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  const result = amount * (unit === 'rem' ? rem : unit === 'em' ? em : unit === '%' ? em / 100 : 1);
  return Number.isFinite(result) ? result : undefined;
}
// The matching Android host registers this private alias with Typeface.DEFAULT.
// Only CSS-derived defaults use it; genuine native style layers remain untouched.
const androidDefaultFontFamily = '__AltrooMUIPlatformDefaultSansSerif';
function fontFamily(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const platformDefault = Platform.OS === 'android' ? androidDefaultFontFamily : 'System';
  // The stock MUI stack starts with quoted Roboto and retains its established
  // platform-default mapping before handling authored custom family names.
  if (value === defaultTypographyFontFamily) return platformDefault;
  const first = value.trim().match(/^(?:"([^"]+)"|'([^']+)'|([^,]+))/);
  const family = (first?.[1] ?? first?.[2] ?? first?.[3])?.trim();
  if (!family) return undefined;
  if (['system-ui', 'sans-serif', 'System', '-apple-system'].includes(family)) {
    // Quoted names are literal CSS custom families. Preserve an app's System
    // name rather than routing it to our private default alias on Android.
    if (Platform.OS === 'android' && (first?.[1] !== undefined || first?.[2] !== undefined))
      return family;
    return platformDefault;
  }
  if (family === 'serif') return Platform.OS === 'ios' ? 'Times New Roman' : 'serif';
  if (family === 'monospace') return Platform.OS === 'ios' ? 'Menlo' : 'monospace';
  return family;
}

// htmlFontSize calibrates pxToRem but does not set a document's root font.
// Public theme/sx values use CSS units. Only the final native boundary produces dp values.
// Native `style` retains RN units; its font size participates in relative CSS computations.
export function normalizeTextStyle(
  input: Record<string, unknown>,
  theme: Theme,
  context: NativeTextContext = {},
  // A prepared CSS sheet can report one validation per declaration while being
  // normalized both eagerly and at its final native root. Ordinary text paths
  // keep the default reporter and their existing diagnostic behavior.
  report: (code: string, message: string, property: string) => void = diagnostic,
): Record<string, unknown> {
  input = { ...input, ...context.nativeTextMetrics };
  const output = { ...input };
  const rem =
    Number.isFinite(theme.cssRootFontSize ?? 16) && (theme.cssRootFontSize ?? 16) > 0
      ? (theme.cssRootFontSize ?? 16)
      : 16;
  const parentSize = context.parentTextStyle?.fontSize ?? rem;
  const ownSize = size(input.fontSize, parentSize, rem);
  const fallbackSize = size(theme.typography.body1?.fontSize, parentSize, rem) ?? rem;
  const nativeSize = Object.hasOwn(context.nativeTextMetrics ?? {}, 'fontSize')
    ? undefined
    : context.nativeStyle?.fontSize;
  const effectiveSize =
    typeof nativeSize === 'number' && Number.isFinite(nativeSize) && nativeSize >= 0
      ? nativeSize
      : (ownSize ?? context.parentTextStyle?.fontSize ?? fallbackSize);
  let lineHeightRatio: number | undefined;
  for (const key of inheritedKeys) {
    if (output[key] === 'inherit' || output[key] === 'unset') delete output[key];
  }
  const invalid = (key: string) => {
    report('typography-value', `Unsupported native ${key}: ${String(input[key])}`, key);
    delete output[key];
  };
  if (output.fontSize !== undefined) {
    if (ownSize === undefined || ownSize < 0) invalid('fontSize');
    else output.fontSize = ownSize;
  }
  if (output.fontFamily !== undefined) {
    const family = fontFamily(output.fontFamily);
    if (family === undefined) invalid('fontFamily');
    else output.fontFamily = family;
  }
  if (output.fontWeight !== undefined) {
    const weight = output.fontWeight;
    if (weight === 'normal' || weight === 'bold') output.fontWeight = weight;
    else if (
      (typeof weight === 'number' || typeof weight === 'string') &&
      Number(weight) >= 1 &&
      Number(weight) <= 1000
    )
      output.fontWeight = String(
        Math.min(900, Math.max(100, Math.round(Number(weight) / 100) * 100)),
      );
    else invalid('fontWeight');
  }
  if (
    output.lineHeight === undefined &&
    context.parentLineHeight !== undefined &&
    (!context.inheritOnly || ownSize !== undefined || nativeSize !== undefined)
  ) {
    output.lineHeight = context.parentLineHeight;
  }
  const authoredLineHeight = output.lineHeight;
  if (output.lineHeight !== undefined) {
    const value = output.lineHeight;
    if (value === 'normal') {
      if (context.parentTextStyle?.lineHeight != null)
        report(
          'typography-inheritance',
          'lineHeight: normal cannot reset an inherited native line height; use an explicit px length or unitless ratio.',
          'lineHeight',
        );
      delete output.lineHeight;
    } else {
      const unitless =
        typeof value === 'number' ||
        (typeof value === 'string' && new RegExp(`^${numeric}$`).test(value.trim()));
      const height = unitless ? Number(value) * effectiveSize : size(value, effectiveSize, rem);
      if (height === undefined || !Number.isFinite(height) || height < 0) invalid('lineHeight');
      else {
        output.lineHeight = height;
        if (unitless) lineHeightRatio = Number(value);
      }
    }
  }
  if (output.letterSpacing !== undefined) {
    const spacing =
      output.letterSpacing === 'normal' ? 0 : size(output.letterSpacing, effectiveSize, rem);
    if (spacing === undefined) invalid('letterSpacing');
    else output.letterSpacing = spacing;
  }
  for (const [key, value] of Object.entries(output))
    if (value && typeof value === 'object' && 'emLength' in value)
      output[key] = Number(value.emLength) * effectiveSize;
  const nativeDirection = context.nativeStyle?.direction;
  const ownDirection = nativeDirection ?? input.direction;
  const direction =
    ownDirection === 'rtl' || ownDirection === 'ltr'
      ? ownDirection
      : (context.parentDirection ?? theme.direction);
  const alignment = output.textAlign ?? context.parentTextAlign;
  if (alignment === 'left' || alignment === 'right') output.textAlign = alignment;
  if (alignment === 'start') output.textAlign = direction === 'rtl' ? 'right' : 'left';
  if (alignment === 'end') output.textAlign = direction === 'rtl' ? 'left' : 'right';
  const nativeAbsoluteHeight =
    context.nativeStyle?.lineHeight != null &&
    !Object.hasOwn(context.nativeTextMetrics ?? {}, 'lineHeight');
  const inheritsHeight =
    input.lineHeight == null || input.lineHeight === 'inherit' || input.lineHeight === 'unset';
  const inheritedRatio = nativeAbsoluteHeight
    ? undefined
    : (lineHeightRatio ??
      (inheritsHeight && context.inheritOnly ? context.parentLineHeight : undefined));
  if (inheritedRatio !== undefined) relativeLineHeights.set(output, inheritedRatio);
  const metrics: Record<string, unknown> = {};
  for (const key of relativeMetricKeys)
    if (Object.hasOwn(output, key)) {
      if (key === 'textAlign') {
        if (
          alignment === 'left' ||
          alignment === 'right' ||
          alignment === 'start' ||
          alignment === 'end'
        )
          metrics[key] = alignment;
      } else metrics[key] = key === 'lineHeight' ? authoredLineHeight : input[key];
    }
  cssTextMetrics.set(output, metrics);
  return output;
}
