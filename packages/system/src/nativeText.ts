import { Platform, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import type { Theme } from './theme';
import { diagnostic } from './diagnostics';
import { defaultTypographyFontFamily } from './typography';

export type NativeTextContext = {
  parentTextStyle?: TextStyle;
  parentLineHeight?: number;
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
  'textAlign',
  'textTransform',
  'color',
  'textDecorationColor',
  'textDecorationLine',
  'textDecorationStyle',
]);
export function isNativeTextStyleProperty(key: string) {
  return inheritedKeys.has(key);
}
export function inheritedTextStyle(style: TextStyle): TextStyle {
  return Object.fromEntries(
    Object.entries(style).filter(([key]) => inheritedKeys.has(key)),
  ) as TextStyle;
}
const relativeLineHeights = new WeakMap<object, number>();
const cssTextMetrics = new WeakMap<object, Record<string, unknown>>();
const relativeMetricKeys = ['fontSize', 'lineHeight', 'letterSpacing'] as const;
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
  const adjusted = { ...native };
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
  return {
    style: inheritedTextStyle({ ...parent, ...style, ...native }),
    lineHeight: relativeLineHeights.get(style),
  };
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
function fontFamily(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (value === defaultTypographyFontFamily) return 'System';
  const first = value.trim().match(/^(?:"([^"]+)"|'([^']+)'|([^,]+))/);
  const family = (first?.[1] ?? first?.[2] ?? first?.[3])?.trim();
  if (!family) return undefined;
  if (['system-ui', 'sans-serif', 'System', '-apple-system'].includes(family)) return 'System';
  if (family === 'serif') return Platform.OS === 'ios' ? 'Times New Roman' : 'serif';
  if (family === 'monospace') return Platform.OS === 'ios' ? 'Menlo' : 'monospace';
  return family;
}

// Public theme/sx values use CSS units. Only the final native boundary produces dp values.
// Native `style` retains RN units; its font size participates in relative CSS computations.
export function normalizeTextStyle(
  input: Record<string, unknown>,
  theme: Theme,
  context: NativeTextContext = {},
): Record<string, unknown> {
  input = { ...input, ...context.nativeTextMetrics };
  const output = { ...input };
  const rem =
    Number.isFinite(theme.typography.htmlFontSize) && theme.typography.htmlFontSize > 0
      ? theme.typography.htmlFontSize
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
    diagnostic('typography-value', `Unsupported native ${key}: ${String(input[key])}`);
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
        diagnostic(
          'typography-inheritance',
          'lineHeight: normal cannot reset an inherited native line height; use an explicit px length or unitless ratio.',
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
  if (output.textAlign === 'start') output.textAlign = theme.direction === 'rtl' ? 'right' : 'left';
  if (output.textAlign === 'end') output.textAlign = theme.direction === 'rtl' ? 'left' : 'right';
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
    if (Object.hasOwn(output, key))
      metrics[key] = key === 'lineHeight' ? authoredLineHeight : input[key];
  cssTextMetrics.set(output, metrics);
  return output;
}
