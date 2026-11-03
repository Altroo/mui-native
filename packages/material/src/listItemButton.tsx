import React, { forwardRef, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, type ViewInstance, type StyleProp } from 'react-native';
import {
  useDefaultProps,
  componentStyle,
  alpha,
  useNativeTextContext,
  nativeTextStyleContext,
  type NativeStyle,
} from '@altroo/mui-native-system';
import { useTheme } from './themeProvider';
import { ButtonBase, type ButtonBaseProps, type ButtonBaseState } from './buttonBase';
import { ListContext } from './listContext';
import { nativeListProps, listDirection } from './listStyles';
import { useForkRef } from './utils';
export interface ListItemButtonBaseProps extends ButtonBaseProps {
  alignItems?: 'center' | 'flex-start';
  autoFocus?: boolean;
  dense?: boolean;
  disableGutters?: boolean;
  divider?: boolean;
  selected?: boolean;
}
export interface ListItemButtonOwnProps extends ListItemButtonBaseProps {}
export interface ListItemButtonProps extends ListItemButtonOwnProps {}
export const ListItemButton: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ListItemButtonProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, ListItemButtonProps>(function ListItemButton(inProps, forwarded) {
  const props = useDefaultProps({ props: inProps, name: 'MuiListItemButton' });
  const baseDefaults = useDefaultProps({ props, name: 'MuiButtonBase' });
  const {
    alignItems = 'center',
    autoFocus = false,
    dense = false,
    disableGutters = false,
    divider = false,
    selected = false,
    disabled = baseDefaults.disabled ?? false,
    children,
    sx,
    style: suppliedStyle,
    onHoverIn: suppliedHoverIn,
    onHoverOut: suppliedHoverOut,
    ...other
  } = props;
  const { style, onHoverIn, onHoverOut } = baseDefaults;
  const inherited = useContext(ListContext),
    theme = useTheme(),
    parent = useNativeTextContext(),
    { width } = useWindowDimensions();
  const [hovered, setHovered] = useState(false);
  const node = useRef<ViewInstance | null>(null),
    ref = useForkRef(node, forwarded);
  const actualDense = dense || inherited.dense || false;
  const authoredDirection = StyleSheet.flatten(
    typeof style === 'function' ? undefined : style,
  )?.direction;
  const direction = listDirection(authoredDirection, inherited.direction ?? theme.direction);
  const context = useMemo(
    () => ({ dense: actualDense, alignItems, disableGutters, direction }),
    [actualDense, alignItems, disableGutters, direction],
  );
  useLayoutEffect(() => {
    if (autoFocus) node.current?.focus();
  }, [autoFocus]);
  const owner = {
    ...props,
    dense: actualDense,
    alignItems,
    disableGutters,
    divider,
    selected,
    disabled,
  };
  let cached:
    | { pressed: boolean; focusVisible: boolean; disabled: boolean; style: StyleProp<NativeStyle> }
    | undefined;
  const styled = (state: ButtonBaseState): StyleProp<NativeStyle> => {
    if (
      cached &&
      cached.pressed === state.pressed &&
      cached.focusVisible === state.focusVisible &&
      cached.disabled === state.disabled
    )
      return cached.style;
    const activeHover = hovered && !disabled;
    const background = selected
      ? alpha(
          theme.palette.primary.main,
          theme.palette.action.selectedOpacity +
            (activeHover
              ? theme.palette.action.hoverOpacity
              : state.focusVisible
                ? theme.palette.action.focusOpacity
                : 0),
        )
      : state.focusVisible
        ? theme.palette.action.focus
        : activeHover
          ? theme.palette.action.hover
          : 'transparent';
    const result: StyleProp<NativeStyle> = [
      componentStyle(theme, 'MuiListItemButton', { ...owner, ...state }, sx, {
        ...nativeTextStyleContext(parent, typeof style === 'function' ? undefined : style, theme),
        width,
        states: [
          ...(selected ? ['selected'] : []),
          ...(disabled ? ['disabled'] : []),
          ...(state.focusVisible ? ['focusVisible'] : []),
          ...(activeHover ? ['hover'] : []),
        ],
        overrideKeys: [
          ...(actualDense ? ['dense'] : []),
          ...(alignItems === 'flex-start' ? ['alignItemsFlexStart'] : []),
          ...(divider ? ['divider'] : []),
          ...(!disableGutters ? ['gutters'] : []),
        ],
        baseStyle: {
          flexDirection: 'row',
          flexGrow: 1,
          justifyContent: 'flex-start',
          alignItems,
          position: 'relative',
          minWidth: 0,
          minHeight: actualDense ? 36 : 48,
          direction: inherited.direction ?? theme.direction,
          paddingTop: actualDense ? 4 : 8,
          paddingBottom: actualDense ? 4 : 8,
          paddingStart: disableGutters ? 0 : 16,
          paddingEnd: inherited.secondaryAction ?? (disableGutters ? 0 : 16),
          backgroundColor: background,
          ...(disabled ? { opacity: theme.palette.action.disabledOpacity } : {}),
          ...(divider ? { borderBottomWidth: 1, borderBottomColor: theme.palette.divider } : {}),
        },
      }),
      typeof style === 'function' ? style(state) : style,
    ];
    cached = { ...state, style: result };
    return result;
  };
  return (
    <ButtonBase
      {...nativeListProps(other)}
      ref={ref}
      disabled={disabled}
      sx={undefined}
      accessibilityState={{ ...baseDefaults.accessibilityState, selected }}
      style={styled}
      onHoverIn={(event) => {
        setHovered(true);
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        setHovered(false);
        onHoverOut?.(event);
      }}
    >
      {(state) => {
        const actualDirection = listDirection(
          StyleSheet.flatten(styled(state))?.direction,
          direction,
        );
        const current =
          actualDirection === context.direction
            ? context
            : { ...context, direction: actualDirection };
        return (
          <ListContext.Provider value={current}>
            {typeof children === 'function' ? children(state) : children}
          </ListContext.Provider>
        );
      }}
    </ButtonBase>
  );
});
