import {
  componentStyle,
  type NativeStyle,
  type SxProps,
  type Theme,
} from '@altroo/mui-native-system';
import {
  directionOf,
  mergeNativeStyles,
  mergeNativeStylesAtDirection,
} from './nativeControlStyles';
import type { NativeCheckedVisualState } from './checkControls';
import type { SwitchOwnerState, NativeSwitchSlotProps } from './switchTypes';
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
  return mergeNativeStylesAtDirection(
    [value],
    directionOf(insets?.nativeDirection, value.direction, parent),
  );
}
export function authoredStyle(
  base: NativeStyle,
  props: NativeSwitchSlotProps,
  parentDirection: 'ltr' | 'rtl',
): NativeStyle {
  return mergeNativeStyles(parentDirection, base, props.style);
}
