/* Default elevation tokens adapt MIT-licensed Material UI 9.5.0 styles/shadows.
 * Copyright (c) MUI contributors. See NOTICE and upstream/reuse.json.
 * Shadow token validation follows MIT React Native 0.88.1 processBoxShadow.
 * Copyright (c) Meta Platforms, Inc. and affiliates. See NOTICE.
 * Native translation: Copyright (c) 2026 Altroo and contributors. */
import {
  Platform,
  processColor,
  type BoxShadowValue,
  type ColorValue,
  type ViewStyle,
} from 'react-native';
import { diagnostic } from './diagnostics';
import { nativeRelativeLength } from './nativeTextConditions';

export type Shadows = [
  'none',
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];
function createShadow(...px: number[]): string {
  return [0.2, 0.14, 0.12]
    .map(
      (opacity, layer) =>
        `${px
          .slice(layer * 4, layer * 4 + 4)
          .map((value) => `${value}px`)
          .join(' ')} rgba(0,0,0,${opacity})`,
    )
    .join(',');
}
export const defaultShadows: Shadows = [
  'none',
  createShadow(0, 2, 1, -1, 0, 1, 1, 0, 0, 1, 3, 0),
  createShadow(0, 3, 1, -2, 0, 2, 2, 0, 0, 1, 5, 0),
  createShadow(0, 3, 3, -2, 0, 3, 4, 0, 0, 1, 8, 0),
  createShadow(0, 2, 4, -1, 0, 4, 5, 0, 0, 1, 10, 0),
  createShadow(0, 3, 5, -1, 0, 5, 8, 0, 0, 1, 14, 0),
  createShadow(0, 3, 5, -1, 0, 6, 10, 0, 0, 1, 18, 0),
  createShadow(0, 4, 5, -2, 0, 7, 10, 1, 0, 2, 16, 1),
  createShadow(0, 5, 5, -3, 0, 8, 10, 1, 0, 3, 14, 2),
  createShadow(0, 5, 6, -3, 0, 9, 12, 1, 0, 3, 16, 2),
  createShadow(0, 6, 6, -3, 0, 10, 14, 1, 0, 4, 18, 3),
  createShadow(0, 6, 7, -4, 0, 11, 15, 1, 0, 4, 20, 3),
  createShadow(0, 7, 8, -4, 0, 12, 17, 2, 0, 5, 22, 4),
  createShadow(0, 7, 8, -4, 0, 13, 19, 2, 0, 5, 24, 4),
  createShadow(0, 7, 9, -4, 0, 14, 21, 2, 0, 5, 26, 4),
  createShadow(0, 8, 9, -5, 0, 15, 22, 2, 0, 6, 28, 5),
  createShadow(0, 8, 10, -5, 0, 16, 24, 2, 0, 6, 30, 5),
  createShadow(0, 8, 11, -5, 0, 17, 26, 2, 0, 6, 32, 5),
  createShadow(0, 9, 11, -5, 0, 18, 28, 2, 0, 7, 34, 6),
  createShadow(0, 9, 12, -6, 0, 19, 29, 2, 0, 7, 36, 6),
  createShadow(0, 10, 13, -6, 0, 20, 31, 3, 0, 8, 38, 7),
  createShadow(0, 10, 13, -6, 0, 21, 33, 3, 0, 8, 40, 7),
  createShadow(0, 10, 14, -6, 0, 22, 35, 3, 0, 8, 42, 7),
  createShadow(0, 11, 14, -7, 0, 23, 36, 3, 0, 9, 44, 8),
  createShadow(0, 11, 15, -7, 0, 24, 38, 3, 0, 9, 46, 8),
];

type ShadowLength = readonly [amount: number, relativeToFont: boolean];
type ParsedShadowLayer = { lengths: ShadowLength[]; color: ColorValue; inset: boolean };
type ParsedShadow = { source: string; layers: ParsedShadowLayer[] };
const deferredTextShadowOffsets = new WeakMap<object, readonly [ShadowLength, ShadowLength]>();
function parseShadow(input: string, rem: number, textOnly = false): ParsedShadow | undefined {
  if (input.trim() === 'none') return { source: 'none', layers: [] };
  const layers: ParsedShadowLayer[] = [];
  const normalized: string[] = [];
  let needsNormalization = /\drem\b/.test(input);
  for (const layer of input.replace(/\n/g, ' ').split(/,(?![^()]*\))/)) {
    if (textOnly && layers.length) return undefined;
    const tokens = layer.trim().split(/\s+(?![^()]*\))/);
    const lengths: ShadowLength[] = [];
    let color: ColorValue | undefined;
    let inset = false;
    let endedLengths = false;
    const output: string[] = [];
    for (const token of tokens) {
      if (token === 'inset') {
        if (inset || textOnly) return undefined;
        inset = true;
        if (lengths.length) endedLengths = true;
        output.push(token);
      } else if (/^currentColor$/i.test(token) || processColor(token) != null) {
        if (color !== undefined) return undefined;
        color = /^currentColor$/i.test(token) ? 'currentColor' : token;
        if (lengths.length) endedLengths = true;
        output.push(String(color));
      } else {
        const match = token.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(px|rem|em)?$/);
        if (
          !match ||
          endedLengths ||
          (!textOnly && match[2] === 'em') ||
          lengths.length === (textOnly ? 3 : 4)
        )
          return undefined;
        const value = Number(match[1]) * (match[2] === 'rem' ? rem : 1);
        if (!Number.isFinite(value) || (!match[2] && value !== 0)) return undefined;
        lengths.push([value, match[2] === 'em']);
        output.push(match[2] === 'rem' ? `${value}px` : token);
      }
    }
    if (lengths.length < 2 || (lengths[2]?.[0] ?? 0) < 0) return undefined;
    if (color === undefined) {
      output.push('currentColor');
      needsNormalization = true;
    }
    layers.push({ lengths, color: color ?? 'currentColor', inset });
    normalized.push(output.join(' '));
  }
  return layers.length
    ? { source: needsNormalization ? normalized.join(', ') : input, layers }
    : undefined;
}

// Fabric exposes one text shadow without inset or spread. Expand the fields
// in rule order and defer only the font-relative lengths.
export function nativeTextShadow(value: unknown, rem: number): Record<string, unknown> | undefined {
  if (typeof value === 'string') {
    const keyword = value.trim().toLowerCase();
    if (keyword === 'inherit' || keyword === 'unset')
      return { textShadowColor: keyword, textShadowOffset: keyword, textShadowRadius: keyword };
    if (keyword === 'none' || keyword === 'initial')
      return {
        textShadowColor: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
      };
    const layer = parseShadow(value, rem, true)?.layers[0];
    if (layer) {
      const [width, height, blur] = layer.lengths;
      const textShadowOffset = {
        width: width[1] ? nativeRelativeLength(width[0]) : width[0],
        height: height[1] ? nativeRelativeLength(height[0]) : height[0],
      };
      if (width[1] || height[1]) deferredTextShadowOffsets.set(textShadowOffset, [width, height]);
      return {
        textShadowColor: layer.color,
        textShadowOffset,
        textShadowRadius: blur?.[1] ? nativeRelativeLength(blur[0]) : (blur?.[0] ?? 0),
      };
    }
  }
  diagnostic('text-shadow', 'Native textShadow supports one shadow with px, rem or em lengths.');
}

// Only System-created offsets can contain pending em lengths. Native inline
// offsets keep their own shape, units and read behavior.
export function resolveNativeTextShadowOffset(value: unknown, fontSize: number): unknown {
  const lengths = value && typeof value === 'object' ? deferredTextShadowOffsets.get(value) : null;
  if (!lengths) return value;
  const [width, height] = lengths.map(([amount, relative]) =>
    relative ? amount * fontSize : amount,
  );
  if (Number.isFinite(width) && Number.isFinite(height)) return { width, height };
  diagnostic('text-shadow', 'Native textShadow offsets must resolve to finite numbers.');
}

export function nativeBoxShadow(
  value: unknown,
  shadows: Shadows | undefined,
  rem: number,
  observeSource?: (source: unknown) => void,
): ViewStyle | undefined {
  const index =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)
        ? Number(value)
        : undefined;
  const source =
    index === undefined ? value : Number.isInteger(index) ? shadows?.[index] : undefined;
  observeSource?.(source);
  const parsed = typeof source === 'string' ? parseShadow(source, rem) : undefined;
  if (!parsed) {
    diagnostic(
      'box-shadow',
      `Unsupported native boxShadow: ${String(value)}. Use a theme index or px/rem lengths and native colors.`,
    );
    return undefined;
  }
  if (Platform.OS === 'android' && Number(Platform.Version) < 28) {
    if (!parsed.layers.length) return { elevation: 0, shadowOpacity: 0 };
    if (index !== undefined) {
      diagnostic(
        'box-shadow-platform',
        `Android before API 28 cannot render theme.shadows[${index}]; using the approximate legacy elevation fallback, without multi-layer/color/spread parity.`,
      );
      return {
        elevation: index,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: index,
        shadowOffset: { width: 0, height: index / 2 },
      };
    }
    diagnostic(
      'box-shadow-platform',
      'Android before API 28 cannot render authored boxShadow strings; use explicit native elevation for a legacy approximation.',
    );
    return undefined;
  }
  if (
    Platform.OS === 'android' &&
    Number(Platform.Version) < 29 &&
    parsed.layers.some((layer) => layer.inset)
  ) {
    diagnostic(
      'box-shadow-platform',
      'Inset boxShadow requires Android API 29; the complete shadow declaration was omitted.',
    );
    return undefined;
  }
  return { boxShadow: parsed.source };
}

export function bindShadowColor(
  value: ViewStyle['boxShadow'],
  color: ColorValue,
): ViewStyle['boxShadow'] {
  if (typeof value !== 'string' || !/\bcurrentColor\b/i.test(value)) return value;
  if (typeof color === 'string') {
    if (processColor(color) == null) {
      diagnostic('box-shadow', `The final currentColor is not a supported native color: ${color}`);
      return undefined;
    }
    return value.replace(/\bcurrentColor\b/gi, color);
  }
  // Native dynamic/semantic colors cannot be serialized into a CSS string.
  return parseShadow(value, 1)?.layers.map(
    (layer): BoxShadowValue => ({
      offsetX: layer.lengths[0][0],
      offsetY: layer.lengths[1][0],
      blurRadius: layer.lengths[2]?.[0] ?? 0,
      spreadDistance: layer.lengths[3]?.[0] ?? 0,
      color: layer.color === 'currentColor' ? color : layer.color,
      inset: layer.inset,
    }),
  );
}
