import { StyleSheet, type StyleProp } from 'react-native';
import type { NativeStyle } from '@altroo/mui-native-system';
import { nativeInsets } from './nativeInsets';
export function directionOf(...values: unknown[]): 'ltr' | 'rtl' {
  const fallback = values.at(-1) === 'rtl' ? 'rtl' : 'ltr';
  for (const value of values) {
    if (value === 'inherit') return fallback;
    if (value === 'ltr' || value === 'rtl') return value;
  }
  return fallback;
}
function logicalInsets(style: NativeStyle, kind: 'margin' | 'padding', direction: 'ltr' | 'rtl') {
  const all = style[`${kind}Horizontal`] ?? style[kind],
    rtl = direction === 'rtl';
  const start = style[`${kind}Start`] ?? style[`${kind}${rtl ? 'Right' : 'Left'}`] ?? all;
  const end = style[`${kind}End`] ?? style[`${kind}${rtl ? 'Left' : 'Right'}`] ?? all;
  return {
    ...(start != null ? { [`${kind}Start`]: start } : {}),
    ...(end != null ? { [`${kind}End`]: end } : {}),
  };
}
export function mergeNativeStylesAtDirection(
  layers: NativeStyle[],
  direction: 'ltr' | 'rtl',
): NativeStyle {
  return (
    StyleSheet.flatten(
      layers.flatMap((style) => [
        style,
        nativeInsets(style, 'padding'),
        logicalInsets(style, 'padding', direction),
        nativeInsets(style, 'margin'),
        logicalInsets(style, 'margin', direction),
      ]),
    ) ?? {}
  );
}
export function mergeNativeStyles(
  parentDirection: 'ltr' | 'rtl',
  ...input: StyleProp<NativeStyle>[]
): NativeStyle {
  const layers = input
    .map((value) => StyleSheet.flatten(value))
    .filter((value): value is NativeStyle => Boolean(value));
  const direction = directionOf(
    ...layers
      .slice()
      .reverse()
      .map((value) => value.direction),
    parentDirection,
  );
  return mergeNativeStylesAtDirection(layers, direction);
}
