// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { I18nManager, Platform, StyleSheet, type StyleProp } from 'react-native';
import { nativeStyleBorderDeclarations, type NativeStyle } from '@altroo/mui-native-system';

type NativeSide = 'Left' | 'Right' | 'Start' | 'End';
/** @internal Map authored aliases using RN layout or border-paint semantics. */
export function nativeInlineSideMapper(
  computed: Pick<NativeStyle, 'direction'>,
  authored: Pick<NativeStyle, 'direction'> | undefined,
  parentDirection?: 'ltr' | 'rtl',
): (side: NativeSide, paint?: boolean) => 'Left' | 'Right' {
  const direction =
    authored?.direction === 'ltr' || authored?.direction === 'rtl'
      ? authored.direction
      : authored?.direction === 'inherit' && parentDirection !== undefined
        ? parentDirection
        : computed.direction;
  const rtl =
    direction === 'rtl' ||
    (direction !== 'ltr' &&
      (parentDirection === undefined ? I18nManager.isRTL : parentDirection === 'rtl'));
  return (side, paint = true) => {
    if (I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL)
      side = side === 'Left' ? 'Start' : side === 'Right' ? 'End' : side;
    else if (paint && Platform.OS === 'android' && rtl && I18nManager.doLeftAndRightSwapInRTL)
      side = side === 'Left' ? 'Right' : side === 'Right' ? 'Left' : side;
    return side === 'Start'
      ? rtl
        ? 'Right'
        : 'Left'
      : side === 'End'
        ? rtl
          ? 'Left'
          : 'Right'
        : side;
  };
}
/**
 * @internal Remove computed border aliases that would defeat final native
 * inline declarations. Return an owned base without merging authored styles;
 * callers retain their existing inset and text-metric merge policies.
 */
export function nativeInlineBorderBase(
  computed: NativeStyle,
  authored: StyleProp<NativeStyle>,
  parentDirection?: 'ltr' | 'rtl',
): ReturnType<typeof nativeStyleBorderDeclarations> {
  const value = nativeStyleBorderDeclarations(computed);
  const inline = StyleSheet.flatten(authored);
  if (inline) {
    const nativeSide = nativeInlineSideMapper(value, inline, parentDirection);
    const corners = {
      TopLeft: ['Top', 'Left'],
      TopRight: ['Top', 'Right'],
      BottomLeft: ['Bottom', 'Left'],
      BottomRight: ['Bottom', 'Right'],
      TopStart: ['Top', 'Start'],
      TopEnd: ['Top', 'End'],
      BottomStart: ['Bottom', 'Start'],
      BottomEnd: ['Bottom', 'End'],
      StartStart: ['Top', 'Start'],
      StartEnd: ['Top', 'End'],
      EndStart: ['Bottom', 'Start'],
      EndEnd: ['Bottom', 'End'],
    } as const;
    const cornerKeys = Object.keys(corners) as (keyof typeof corners)[];
    if (inline.borderRadius != null)
      for (const corner of cornerKeys) delete value[`border${corner}Radius`];
    for (const corner of cornerKeys)
      if (inline[`border${corner}Radius`] != null) {
        const [row, side] = corners[corner];
        for (const other of cornerKeys)
          if (corners[other][0] === row && nativeSide(corners[other][1]) === nativeSide(side))
            delete value[`border${other}Radius`];
      }
    for (const channel of ['Color', 'Width'] as const)
      if (inline[`border${channel}`] != null) {
        for (const edge of ['Top', 'Right', 'Bottom', 'Left', 'Start', 'End'] as const)
          delete value[`border${edge}${channel}`];
      } else {
        for (const side of ['Left', 'Right', 'Start', 'End'] as const)
          if (inline[`border${side}${channel}`] != null)
            for (const other of ['Left', 'Right', 'Start', 'End'] as const)
              if (nativeSide(side) === nativeSide(other)) delete value[`border${other}${channel}`];
      }
  }
  return value;
}
