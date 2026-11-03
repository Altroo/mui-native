import React, { forwardRef, useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, type ViewInstance, type StyleProp } from 'react-native';
import {
  useDefaultProps,
  componentStyle,
  alpha,
  useNativeTextContext,
  nativeTextStyleContext,
  type NativeStyle,
} from '@altroo/mui-native-system';
import {
  ButtonBase,
  type ButtonBaseProps,
  type ButtonBaseState,
  type ButtonBaseActions,
  type ButtonBaseActivationEvent,
  type ButtonBaseKeyEvent,
} from './buttonBase';
import { useTheme } from './themeProvider';
import { ListContext } from './listContext';
import { NativeMenuFocusReadiness, useNativeMenuContext } from './menuContext';
import { useMenuRegistration } from './useMenuRegistration';
import { useMenuEvent } from './useMenuEvent';
import { nativeListProps, listDirection } from './listStyles';
import { nativeButtonModality } from './nativeButtonModality';
import { useForkRef } from './utils';
import type { MenuFocusSource } from './nativeMenuRegistry';
export interface MenuItemOwnProps {
  value?: unknown;
  autoFocus?: boolean;
  dense?: boolean;
  disableGutters?: boolean;
  divider?: boolean;
  selected?: boolean;
  role?: ButtonBaseProps['role'] | 'menuitemcheckbox' | 'menuitemradio';
  /** Native typeahead override for labels that are not represented by rendered text. */
  textValue?: string;
}
export interface MenuItemProps extends Omit<ButtonBaseProps, 'role'>, MenuItemOwnProps {}
export const MenuItem: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<MenuItemProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, MenuItemProps>(function MenuItem(inProps, forwarded) {
  const props = useDefaultProps({ props: inProps, name: 'MuiMenuItem' }),
    base = useDefaultProps({ props, name: 'MuiButtonBase' });
  const {
    autoFocus = false,
    dense = false,
    disableGutters = false,
    divider = false,
    selected = false,
    disabled = base.disabled ?? false,
    role = 'menuitem',
    tabIndex: explicitTabIndex,
    textValue,
    value: _optionValue,
    children,
    sx,
    style: suppliedStyle,
    onHoverIn: suppliedHoverIn,
    onHoverOut: suppliedHoverOut,
    action,
    onFocus: suppliedFocus,
    onBlur: suppliedBlur,
    ...other
  } = props;
  const { style, onHoverIn, onHoverOut, onFocus, onBlur } = base,
    menu = useNativeMenuContext(),
    inherited = useContext(ListContext),
    focusReady = useContext(NativeMenuFocusReadiness),
    theme = useTheme(),
    parent = useNativeTextContext(),
    { width } = useWindowDimensions();
  const id = useId(),
    node = useRef<ViewInstance | null>(null),
    internalAction = useRef<ButtonBaseActions | null>(null),
    actionRef = useForkRef(internalAction, action);
  const [hovered, setHovered] = useState(false),
    actualDense = dense || inherited.dense || false;
  const focus = useMenuEvent((source: MenuFocusSource) => {
    if (source === 'keyboard') {
      nativeButtonModality.keyboard();
      internalAction.current?.focusVisible();
    } else {
      if (source === 'pointer') nativeButtonModality.pointer();
      node.current?.focus();
    }
  });
  const registration = useMenuRegistration({
    id,
    disabled: disabled || base['aria-disabled'] === true,
    focusableWhenDisabled: menu.disabledItemsFocusable,
    focusable: disabled ? menu.disabledItemsFocusable : base.focusable !== false,
    selected,
    textValue,
    focus,
  });
  const ref = useForkRef(node, registration, forwarded);
  useLayoutEffect(() => {
    if (autoFocus && focusReady) focus(menu.focusSource);
  }, [autoFocus, focus, focusReady]);
  const tabIndex =
    explicitTabIndex !== undefined
      ? explicitTabIndex
      : menu.variant === 'selectedMenu'
        ? menu.activeId === id
          ? 0
          : -1
        : -1;
  const checkable = role === 'menuitemcheckbox' || role === 'menuitemradio',
    nativeRole =
      role === 'menuitemcheckbox' ? 'checkbox' : role === 'menuitemradio' ? 'radio' : role;
  const owner = { ...props, dense: actualDense, disableGutters, divider, selected, disabled };
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
    const hover = hovered && !disabled,
      background = selected
        ? alpha(
            theme.palette.primary.main,
            theme.palette.action.selectedOpacity +
              (hover
                ? theme.palette.action.hoverOpacity
                : state.focusVisible
                  ? theme.palette.action.focusOpacity
                  : 0),
          )
        : state.focusVisible
          ? theme.palette.action.focus
          : hover
            ? theme.palette.action.hover
            : 'transparent';
    const result: StyleProp<NativeStyle> = [
      componentStyle(theme, 'MuiMenuItem', { ...owner, ...state }, sx, {
        ...nativeTextStyleContext(parent, typeof style === 'function' ? undefined : style, theme),
        width,
        states: [
          ...(selected ? ['selected'] : []),
          ...(disabled ? ['disabled'] : []),
          ...(state.focusVisible ? ['focusVisible'] : []),
          ...(hover ? ['hover'] : []),
        ],
        overrideKeys: [
          ...(actualDense ? ['dense'] : []),
          ...(divider ? ['divider'] : []),
          ...(!disableGutters ? ['gutters'] : []),
        ],
        baseStyle: {
          ...theme.typography[actualDense ? 'body2' : 'body1'],
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          position: 'relative',
          minHeight: actualDense ? 32 : 48,
          paddingTop: actualDense ? 4 : 6,
          paddingBottom: actualDense ? 4 : 6,
          paddingStart: disableGutters ? 0 : 16,
          paddingEnd: disableGutters ? 0 : 16,
          direction: inherited.direction ?? theme.direction,
          color: 'inherit',
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
  const activate = useMenuEvent((event: ButtonBaseActivationEvent) => {
    if (!focusReady || !node.current || node.current.isConnected === false) {
      event.preventDefault();
      return;
    }
    (base.onPress ?? base.onClick)?.(event);
  });
  const keyDown = useMenuEvent((event: ButtonBaseKeyEvent) => {
    if (
      (event.key === ' ' || event.key === 'Enter') &&
      (!focusReady || !node.current || node.current.isConnected === false)
    ) {
      event.preventDefault();
      return;
    }
    base.onKeyDown?.(event);
  });
  const keyUp = useMenuEvent((event: ButtonBaseKeyEvent) => {
    if (
      (event.key === ' ' || event.key === 'Enter') &&
      (!focusReady || !node.current || node.current.isConnected === false)
    ) {
      event.preventDefault();
      return;
    }
    base.onKeyUp?.(event);
  });
  return (
    <ButtonBase
      {...nativeListProps(other)}
      ref={ref}
      action={actionRef}
      onPress={activate}
      onKeyDown={keyDown}
      onKeyUp={keyUp}
      disabled={disabled}
      role={nativeRole}
      accessibilityRole={base.accessibilityRole ?? nativeRole}
      accessibilityState={{
        ...base.accessibilityState,
        ...(checkable ? { checked: Boolean(selected) } : {}),
      }}
      aria-checked={props['aria-checked'] ?? (checkable ? Boolean(selected) : undefined)}
      focusableWhenDisabled={menu.disabledItemsFocusable}
      suppressFocusVisible={menu.suppressInitialFocusVisible || base.suppressFocusVisible}
      tabIndex={disabled ? -1 : tabIndex}
      sx={undefined}
      style={styled}
      onFocus={(event) => {
        const target = event.target;
        menu.reportFocus(
          id,
          target && typeof target === 'object' && 'focus' in target
            ? (target as ViewInstance)
            : node.current!,
        );
        onFocus?.(event);
      }}
      onBlur={(event) => {
        const target = event.target;
        const element =
          target && typeof target === 'object' && 'focus' in target
            ? (target as ViewInstance)
            : node.current;
        if (element) menu.reportBlur(id, element);
        onBlur?.(event);
      }}
      onHoverIn={(event) => {
        setHovered(true);
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        setHovered(false);
        onHoverOut?.(event);
      }}
    >
      {(state) => (
        <ListContext.Provider
          value={{
            dense: actualDense,
            disableGutters,
            menuItem: true,
            direction: listDirection(
              StyleSheet.flatten(styled(state))?.direction,
              inherited.direction ?? theme.direction,
            ),
          }}
        >
          {typeof children === 'function' ? children(state) : children}
        </ListContext.Provider>
      )}
    </ButtonBase>
  );
});
