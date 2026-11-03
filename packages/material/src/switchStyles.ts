import { StyleSheet, type StyleProp } from 'react-native';
import {
  componentStyle,
  type NativeStyle,
  type SxProps,
  type Theme,
} from '@altroo/mui-native-system';
import { nativeInsets } from './nativeInsets';
import type { NativeCheckedVisualState } from './checkControls';
import type { SwitchOwnerState, NativeSwitchSlotProps } from './switchTypes';
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
function mergeAtDirection(layers: NativeStyle[], direction: 'ltr' | 'rtl'): NativeStyle {
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
  return mergeAtDirection(layers, direction);
}
interface InsetContext {
  parentDirection: 'ltr' | 'rtl';
  nativeDirection?: NativeStyle['direction'];
}
export function namedStyle(
  theme: Theme,
  slot: string,
  owner: SwitchOwnerState,
  width: number,
  state: NativeCheckedVisualState | undefined,
  base: SxProps,
  sx?: SxProps,
  keys: string[] = [],
  insets?: InsetContext,
): NativeStyle {
  const parent = insets?.parentDirection ?? theme.direction;
  const value = componentStyle(theme, 'MuiSwitch', owner as Record<string, unknown>, sx, {
    baseStyle: base,
    rootSlot: slot,
    skipVariants: slot !== 'root',
    overrideKeys: keys,
    width,
    slot,
    states:
      slot === 'switchBase' && state
        ? [
            ...(state.checked ? ['checked'] : []),
            ...(state.disabled ? ['disabled'] : []),
            ...(state.focusVisible ? ['focusVisible'] : []),
            ...(state.hovered && !state.disabled ? ['hover'] : []),
          ]
        : [],
    logicalInsets: { parentDirection: parent, direction: insets?.nativeDirection },
  });
  return mergeAtDirection([value], directionOf(insets?.nativeDirection, value.direction, parent));
}
export function authoredStyle(
  base: NativeStyle,
  props: NativeSwitchSlotProps,
  parentDirection: 'ltr' | 'rtl',
): NativeStyle {
  return mergeNativeStyles(parentDirection, base, props.style);
}
