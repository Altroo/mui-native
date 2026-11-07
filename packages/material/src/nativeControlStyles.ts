// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { StyleSheet, type StyleProp } from 'react-native';
import type { NativeStyle } from '@altroo/mui-native-system';
import { nativeInsets } from './nativeInsets';
import { nativeInlineBorderBase, nativeInlineSideMapper } from './nativeInlineBorders';

const horizontalInsetSides = [
  ['Left', 'Left'],
  ['Right', 'Right'],
  ['Start', 'Start'],
  ['End', 'End'],
  ['InlineStart', 'Start'],
  ['InlineEnd', 'End'],
] as const;
const verticalInsetSides = [
  ['Top', 'Top'],
  ['Bottom', 'Bottom'],
  ['BlockStart', 'Top'],
  ['BlockEnd', 'Bottom'],
] as const;
const horizontalInsetKeys = [
  ...horizontalInsetSides.map(([key]) => key),
  'Horizontal',
  'Inline',
] as const;
const verticalInsetKeys = [...verticalInsetSides.map(([key]) => key), 'Vertical', 'Block'] as const;
const insetKeys = [...horizontalInsetKeys, ...verticalInsetKeys] as const;
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

/** Keep CSS longhands below a genuine native shorthand, preserving native arrays. */
export function mergeNativeRootStyle(
  parentDirection: 'ltr' | 'rtl',
  computed: NativeStyle,
  authored: StyleProp<NativeStyle>,
): NativeStyle {
  const inline = StyleSheet.flatten(authored);
  const resetDirection = inline && Object.hasOwn(inline, 'direction') && inline.direction == null;
  const direction = resetDirection
    ? parentDirection
    : directionOf(inline?.direction, computed.direction, parentDirection);
  // A real native reset inherits its parent, while an absent property keeps
  // computed CSS direction. Matching must use the same final native direction.
  const matching = resetDirection ? { ...computed, direction } : computed;
  const base = { ...nativeInlineBorderBase(matching, inline, direction) };
  if (inline?.gap != null) {
    delete base.rowGap;
    delete base.columnGap;
  }
  if (inline?.flex != null) {
    delete base.flexGrow;
    delete base.flexShrink;
    delete base.flexBasis;
  }
  if (inline) {
    const nativeSide = nativeInlineSideMapper(base, inline, direction);
    for (const kind of ['margin', 'padding'] as const) {
      if (inline[kind] != null) {
        for (const edge of insetKeys) delete base[`${kind}${edge}`];
      } else {
        if (inline[`${kind}Horizontal`] != null || inline[`${kind}Inline`] != null)
          for (const edge of horizontalInsetKeys) delete base[`${kind}${edge}`];
        if (inline[`${kind}Vertical`] != null || inline[`${kind}Block`] != null)
          for (const edge of verticalInsetKeys) delete base[`${kind}${edge}`];
        // Compare both public naming families, but leave their native priority
        // (including Inline and Block aliases) to RN's applyAliasedProps stage.
        for (const [side, semantic] of horizontalInsetSides)
          if (inline[`${kind}${side}`] != null)
            for (const [other, otherSemantic] of horizontalInsetSides)
              if (nativeSide(semantic, false) === nativeSide(otherSemantic, false))
                delete base[`${kind}${other}`];
        for (const [side, semantic] of verticalInsetSides)
          if (inline[`${kind}${side}`] != null)
            for (const [other, otherSemantic] of verticalInsetSides)
              if (semantic === otherSemantic) delete base[`${kind}${other}`];
      }
    }
  }
  // Fabric can replace logical edges with defined physical aliases during its
  // global RTL swap. Keep computed CSS protection intact and let Yoga resolve
  // the original native shorthand/specific edges instead of synthesizing sides.
  return Object.assign(base, inline);
}
