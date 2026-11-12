/* Menu descendant styling adapts MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/menu-icon-cascade.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. */
import React, { forwardRef, useContext, useId, useLayoutEffect, useRef, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, type ViewInstance } from 'react-native';
import {
  useDefaultProps,
  separateNativeRootProps,
  restoreNativeRootStyle,
  componentRootStyle,
  joinClassNames,
  type NativeRootStyleResult,
  alpha,
  useNativeTextContext,
  nativeTextStyleContext,
} from '@altroo/mui-native-system';
import {
  NativeCssInsertionScope,
  refreshNativeStyle,
  prepareNativeCompositeSource,
  nativeInlineStyle,
  useNativeStyleCache,
  useNativeDefaultPropsSource,
} from '@altroo/mui-native-system/internal/prepared-style';
import {
  ButtonBase,
  type ButtonBaseProps,
  type ButtonBaseState,
  type ButtonBaseActions,
  type ButtonBaseActivationEvent,
  type ButtonBaseKeyEvent,
  type NativeButtonBaseStyleSheet,
} from './buttonBase';
import { useTheme } from './themeProvider';
import { ListContext } from './listContext';
import { NativeMenuFocusReadiness, useNativeMenuContext } from './menuContext';
import { useMenuRegistration } from './useMenuRegistration';
import { useMenuEvent } from './useMenuEvent';
import { nativeListProps, listDirection } from './listStyles';
import { nativeButtonModality } from './nativeButtonModality';
import { useForkRef } from './utils';
import { NativeStyleScope, nativeStyleAncestors, useNativeStyleRef } from './nativeStyleScope';
import { NativeButtonGroupRules } from './buttonGroupContext';
import type { MenuFocusSource } from './nativeMenuRegistry';
export interface MenuItemOwnProps {
  /** Finite native selector metadata for participating Material descendants. */
  classes?:
    | Partial<
        Record<
          'root' | 'focusVisible' | 'dense' | 'disabled' | 'divider' | 'gutters' | 'selected',
          string
        >
      >
    | undefined;
  className?: string | undefined;
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
export interface MenuItemProps
  extends Omit<ButtonBaseProps, 'role' | 'classes'>,
    MenuItemOwnProps {}
export const MenuItem: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<MenuItemProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, MenuItemProps>(function MenuItem(inProps, forwarded) {
  const input = separateNativeRootProps(inProps);
  const props = useDefaultProps({ props: input.props, name: 'MuiMenuItem' });
  const base = useDefaultProps({ props, name: 'MuiButtonBase' });
  // Both default layers resolve against genuine props before restoring the CSS
  // carrier. A merged Base callback already includes Menu's authored callback.
  const preparedStyle = restoreNativeRootStyle(input, base);
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
    classes,
    className,
    sx,
    style: suppliedStyle,
    onHoverIn: suppliedHoverIn,
    onHoverOut: suppliedHoverOut,
    action,
    onFocus: suppliedFocus,
    onBlur: suppliedBlur,
    ...other
  } = props;
  const { onHoverIn, onHoverOut, onFocus, onBlur } = base,
    menu = useNativeMenuContext(),
    inherited = useContext(ListContext),
    ancestry = useContext(NativeButtonGroupRules),
    focusReady = useContext(NativeMenuFocusReadiness),
    theme = useTheme(),
    parent = useNativeTextContext(),
    { width } = useWindowDimensions();
  const id = useId(),
    node = useRef<ViewInstance | null>(null),
    internalAction = useRef<ButtonBaseActions | null>(null),
    actionRef = useForkRef(internalAction, action);
  const actualDense = dense || inherited.dense || false;
  const styleCache = useNativeStyleCache();
  const defaultsSource = useNativeDefaultPropsSource();
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
  const composedRef = useForkRef(node, registration, forwarded);
  const ref = useNativeStyleRef(node, composedRef);
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
  const token = (slot: keyof NonNullable<MenuItemOwnProps['classes']>) => {
    const name = ['selected', 'disabled', 'focusVisible'].includes(slot)
      ? `Mui-${slot}`
      : `MuiMenuItem-${slot}`;
    return classes?.[slot] ? name + ' ' + classes[slot] : name;
  };
  const rootClasses = (focusVisible: boolean, hovered: boolean, pressed: boolean) =>
    joinClassNames(
      'MuiButtonBase-root',
      token('root'),
      dense && token('dense'),
      !disableGutters && token('gutters'),
      divider && token('divider'),
      selected && token('selected'),
      focusVisible && token('focusVisible'),
      disabled && token('disabled'),
      hovered && !disabled && 'Mui-hover',
      pressed && !disabled && 'Mui-active',
      className,
    );
  const staticStyle = typeof preparedStyle === 'function' ? undefined : preparedStyle;
  // CSS is owned by the logical MenuItem before the arbitrary native host renders.
  // Host hover/press only select these retained branches, never re-run user CSS.
  const source = useMemo(
    () => ({
      ...componentRootStyle(theme, 'MuiMenuItem', owner, sx, staticStyle, {
        sourceClass: true,
        styleCache,
        ...nativeTextStyleContext(parent, staticStyle, theme),
        classes: rootClasses(false, false, false).split(/\s+/).filter(Boolean),
        rootProps: { ...props, className: rootClasses(false, false, false) },
        width,
        states: [...(selected ? ['selected'] : []), ...(disabled ? ['disabled'] : [])],
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
          '& .MuiListItemIcon-root': { minWidth: 36 },
          ...(actualDense ? { '& .MuiListItemIcon-root svg': { fontSize: '1.25rem' } } : {}),
          backgroundColor: 'transparent',
          '&.Mui-hover': { backgroundColor: theme.palette.action.hover },
          // Keep selected state at compound specificity. Selected hover follows
          // selected focus so a pointer can replace its paint without moving focus.
          '&.Mui-selected': {
            backgroundColor: alpha(
              theme.palette.primary.main,
              theme.palette.action.selectedOpacity,
            ),
            '&.Mui-focusVisible': {
              backgroundColor: alpha(
                theme.palette.primary.main,
                theme.palette.action.selectedOpacity + theme.palette.action.focusOpacity,
              ),
            },
          },
          '&.Mui-selected.Mui-hover': {
            backgroundColor: alpha(
              theme.palette.primary.main,
              theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity,
            ),
          },
          '&.Mui-focusVisible': { backgroundColor: theme.palette.action.focus },
          ...(disabled ? { opacity: theme.palette.action.disabledOpacity } : {}),
          ...(divider ? { borderBottomWidth: 1, borderBottomColor: theme.palette.divider } : {}),
        },
      }),
      owner,
    }),
    [inProps, actualDense, inherited.direction, theme, parent, width, styleCache, defaultsSource],
  );
  const frame = (
    state: ButtonBaseState,
    baseSheet: NativeButtonBaseStyleSheet | undefined,
    hovered: boolean,
    authored: NativeRootStyleResult['authored'],
  ) => {
    const rootClass = rootClasses(state.focusVisible, hovered, state.pressed);
    const tokens = rootClass.split(/\s+/).filter(Boolean);
    const result = componentRootStyle(theme, 'MuiMenuItem', source.owner, undefined, authored, {
      preparedRoot: baseSheet?.sourcePrepared ?? source.prepared,
      styleCache,
      ...nativeTextStyleContext(parent, authored, theme),
      classes: tokens,
      ancestors: [
        ...(baseSheet && !baseSheet.sourcePrepared
          ? [{ ...baseSheet, context: { ...baseSheet.context, classes: tokens }, sameRoot: true }]
          : []),
        ...nativeStyleAncestors(ancestry, { classes: tokens }),
      ],
      width,
      states: [
        ...(selected ? ['selected'] : []),
        ...(disabled ? ['disabled'] : []),
        ...(state.focusVisible ? ['focusVisible'] : []),
        ...(hovered && !disabled ? ['hover'] : []),
        ...(state.pressed && !disabled ? ['active'] : []),
      ],
    });
    return { result, rootClass };
  };
  const sourceFor = useMemo(
    () => (sheet: NativeButtonBaseStyleSheet) =>
      prepareNativeCompositeSource(sheet.prepared!, source.prepared, styleCache),
    [source],
  );
  let nativeHovered = false;
  let lastSheet: NativeButtonBaseStyleSheet | undefined;
  let cached:
    | {
        pressed: boolean;
        focusVisible: boolean;
        disabled: boolean;
        hovered: boolean;
        sheet?: NativeButtonBaseStyleSheet;
        result: NativeRootStyleResult;
        rootClass: string;
      }
    | undefined;
  const styled = (
    state: ButtonBaseState,
    baseSheet = lastSheet,
    hovered = nativeHovered,
  ): NativeRootStyleResult => {
    nativeHovered = hovered;
    lastSheet = baseSheet;
    if (
      cached &&
      cached.pressed === state.pressed &&
      cached.focusVisible === state.focusVisible &&
      cached.disabled === state.disabled &&
      cached.hovered === hovered &&
      cached.sheet === baseSheet
    ) {
      const computed = refreshNativeStyle(cached.result.computed);
      if (computed !== cached.result.computed) cached.result = { ...cached.result, computed };
      return cached.result;
    }
    const authored =
      typeof preparedStyle === 'function' ? preparedStyle(state) : nativeInlineStyle(staticStyle);
    const { result, rootClass } = frame(state, baseSheet, hovered, authored);
    cached = { ...state, hovered, sheet: baseSheet, result, rootClass };
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
    <NativeCssInsertionScope style={source.computed}>
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
        style={props.style}
        _muiNativeSourceStyle={sourceFor}
        _muiNativeStyle={styled}
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
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
      >
        {(state) => {
          const result = styled(state);
          return (
            <NativeStyleScope
              root={node}
              theme={theme}
              classes={cached!.rootClass.split(/\s+/).filter(Boolean)}
              prepared={result.prepared}
            >
              <ListContext.Provider
                value={{
                  dense: actualDense,
                  disableGutters,
                  menuItem: true,
                  direction: listDirection(
                    StyleSheet.flatten([result.computed, result.authored])?.direction,
                    inherited.direction ?? theme.direction,
                  ),
                }}
              >
                {typeof children === 'function' ? children(state) : children}
              </ListContext.Provider>
            </NativeStyleScope>
          );
        }}
      </ButtonBase>
    </NativeCssInsertionScope>
  );
});
