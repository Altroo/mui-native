import React, { forwardRef, useContext, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, type ViewInstance } from 'react-native';
import {
  useDefaultProps,
  resolveSlotProps,
  componentStyle,
  NativeTextScope,
  useNativeTextRootRef,
  alpha,
  diagnostic,
  type NativeStyle,
  isNativeTextStyleProperty,
  useNativeTextContext,
  nativeTextStyleContext,
  nativeStyleTextMetrics,
  applyNativeTextMetrics,
  getTextStyleInheritance,
  type SxProps,
} from '@altroo/mui-native-system';
import {
  ButtonBase,
  type ButtonBaseProps,
  type ButtonBaseState,
  type ButtonBaseKeyEvent,
} from './buttonBase';
import { useTheme } from './themeProvider';
import { useForkRef } from './utils';
import { useMenuEvent } from './useMenuEvent';
import { NativeButtonActivationKeys } from './nativeButtonActivationKeys';
import { NativeModalParentContext } from './nativeModalContext';
import { NativeOverlayReadiness } from './nativeOverlayReadiness';
import { NativeMenuFocusReadiness } from './menuContext';
import { nativeModalManager as manager } from './nativeModalManager';
import { mergeNativeStyles } from './nativeControlStyles';
import type {
  ChipOwnProps,
  ChipOwnerState,
  NativeChipComponent,
  ChipDeleteEvent,
} from './chipTypes';
export * from './chipTypes';
export * from './chipClasses';
const cap = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);
const deleteKey = (event: ButtonBaseKeyEvent) =>
  event.key === 'Backspace' || event.key === 'Delete';
const noKeys: readonly string[] = [];
const deletionKeys = ['Enter', ' ', 'Backspace', 'Delete'];
const activationKeys = ['Enter', ' '];
export const Chip = forwardRef<
  ViewInstance,
  ChipOwnProps & { component?: React.ComponentType<any> }
>(function Chip(inProps, forwarded) {
  const props = useDefaultProps({ props: inProps, name: 'MuiChip' });
  const {
    label,
    avatar,
    icon,
    deleteIcon,
    onDelete,
    onClick,
    onPress,
    onKeyDown,
    onKeyUp,
    clickable: authoredClickable,
    disabled = false,
    skipFocusWhenDisabled = false,
    color = 'default',
    size = 'medium',
    variant = 'filled',
    slots = {},
    slotProps = {},
    component,
    sx,
    style,
    classes,
    className,
    _muiNativeClassName,
    children,
    id,
    action,
    onFocus,
    onBlur,
    onFocusVisible,
    onHoverIn,
    onHoverOut,
    onPressIn,
    onPressOut,
    ...native
  } = props;
  const textParent = useNativeTextContext();
  const theme = useTheme(),
    { width } = useWindowDimensions();
  const clickable = authoredClickable !== false && (onClick || onPress) ? true : authoredClickable;
  const owner: ChipOwnerState = {
    ...props,
    disabled,
    clickable,
    onDelete: Boolean(onDelete),
    color,
    size,
    variant,
    iconColor: (icon?.props as any)?.color || color,
    component: clickable || onDelete ? ButtonBase : (component ?? View),
  };
  const root = resolveSlotProps(slotProps.root, owner) ?? {},
    labelSlot = resolveSlotProps(slotProps.label, owner) ?? {};
  const { root: labelTextRoot, ref: labelTextRef } = useNativeTextRootRef(labelSlot.ref);
  const decorationTextRoot = useRef<ViewInstance | null>(null),
    deleteTextRoot = useRef<ViewInstance | null>(null);
  const effectiveDisabled = disabled || Boolean(root.disabled);
  const interactive = Boolean(
    clickable ||
      onDelete ||
      onClick ||
      onPress ||
      root.onClick ||
      root.onPress ||
      onKeyDown ||
      onKeyUp ||
      root.onKeyDown ||
      root.onKeyUp,
  );
  const focusedControl = Boolean(clickable || onDelete);
  const [state, setState] = useState<ButtonBaseState & { hovered: boolean }>({
    pressed: false,
    disabled: effectiveDisabled,
    focusVisible: false,
    hovered: false,
  });
  const visual = {
    ...state,
    disabled: effectiveDisabled,
    focusVisible: !effectiveDisabled && state.focusVisible,
    pressed: !effectiveDisabled && state.pressed,
    hovered: !effectiveDisabled && state.hovered,
  };
  useLayoutEffect(() => {
    if (effectiveDisabled)
      setState((old) =>
        old.focusVisible || old.pressed || old.hovered
          ? { ...old, focusVisible: false, pressed: false, hovered: false }
          : old,
      );
  }, [effectiveDisabled]);
  const inheritedActivationKeys = useContext(NativeButtonActivationKeys);
  const node = useRef<ViewInstance | null>(null),
    mounted = useRef(false),
    baseAction = useRef<import('./buttonBase').ButtonBaseActions | null>(null);
  const ref = useForkRef(node, forwarded, root.ref);
  const parent = useContext(NativeModalParentContext),
    ready = useContext(NativeOverlayReadiness),
    menuReady = useContext(NativeMenuFocusReadiness);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const eligible = useMenuEvent(
    () =>
      mounted.current &&
      !effectiveDisabled &&
      node.current != null &&
      node.current.isConnected !== false &&
      ready &&
      menuReady &&
      parent?.open !== false &&
      parent?.presented !== false &&
      (!manager.top() || manager.top()!.contains(node.current!)),
  );
  React.useImperativeHandle(
    root.action ?? action,
    () => ({
      focusVisible() {
        if (eligible()) {
          setState((old) => ({ ...old, focusVisible: true }));
          baseAction.current?.focusVisible();
        }
      },
    }),
    [eligible],
  );
  const remove = useMenuEvent((event: ChipDeleteEvent, stop = true) => {
    if (stop) event.stopPropagation?.();
    if (eligible()) onDelete?.(event);
  });
  if (children != null)
    diagnostic(
      'chip-children',
      'Chip renders label, avatar/icon and deleteIcon; use label instead of children.',
    );
  if (React.isValidElement(avatar) && React.isValidElement(icon))
    diagnostic('chip-icon', 'Chip displays avatar before icon when both are supplied.');
  if (classes || (className && className !== _muiNativeClassName))
    diagnostic(
      'chip-classes',
      'Chip class helpers identify slots; use native styles, sx or theme overrides.',
    );
  const palette = (theme.palette as any)[color],
    small = size === 'small',
    outlined = variant === 'outlined';
  const rootNative = StyleSheet.flatten(
      typeof root.style === 'function' ? root.style(visual) : root.style,
    ),
    authoredStyle = StyleSheet.flatten(typeof style === 'function' ? style(visual) : style);
  const rootStyle = componentStyle(
    theme,
    'MuiChip',
    { ...owner },
    Object.hasOwn(root, 'sx') ? root.sx : sx,
    {
      ...nativeTextStyleContext(textParent, [authoredStyle, rootNative], theme),
      width,
      logicalInsets: {
        parentDirection: theme.direction,
        direction: StyleSheet.flatten([authoredStyle, rootNative])?.direction,
      },
      states: [
        ...(effectiveDisabled ? ['disabled'] : []),
        ...(visual.focusVisible ? ['focusVisible'] : []),
        ...(visual.hovered && !effectiveDisabled ? ['hover'] : []),
        ...(visual.pressed && !effectiveDisabled ? ['active'] : []),
        ...(clickable ? ['clickable'] : []),
      ],
      overrideKeys: [
        `size${cap(size)}`,
        `color${cap(color)}`,
        ...(clickable ? ['clickable'] : []),
        ...(onDelete ? ['deletable'] : []),
        variant,
      ],
      baseStyle: {
        alignSelf: 'flex-start',
        maxWidth: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        direction: theme.direction,
        minHeight: focusedControl ? 44 : undefined,
        height: focusedControl ? 44 : small ? 24 : 32,
        borderRadius: focusedControl ? 22 : 16,
        padding: 0,
        borderWidth: outlined ? 1 : 0,
        borderColor: outlined
          ? palette?.main
            ? alpha(palette.main, 0.7)
            : theme.palette.grey[theme.palette.mode === 'light' ? 400 : 700]
          : undefined,
        backgroundColor: outlined
          ? 'transparent'
          : (palette?.main ?? theme.palette.action.selected),
        color: outlined
          ? (palette?.main ?? theme.palette.text.primary)
          : (palette?.contrastText ?? theme.palette.text.primary),
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.pxToRem(13),
        lineHeight: 1.5,
        '&.Mui-disabled': { opacity: theme.palette.action.disabledOpacity },
        ...(clickable || onDelete
          ? {
              '&.Mui-focusVisible': {
                backgroundColor: outlined
                  ? palette?.main
                    ? alpha(palette.main, theme.palette.action.focusOpacity)
                    : theme.palette.action.focus
                  : (palette?.dark ??
                    alpha(
                      theme.palette.text.primary,
                      theme.palette.action.selectedOpacity + theme.palette.action.focusOpacity,
                    )),
              },
            }
          : {}),
        ...(clickable
          ? {
              '&.Mui-hover': {
                backgroundColor: outlined
                  ? palette?.main
                    ? alpha(palette.main, theme.palette.action.hoverOpacity)
                    : theme.palette.action.hover
                  : (palette?.dark ??
                    alpha(
                      theme.palette.text.primary,
                      theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity,
                    )),
              },
            }
          : {}),
      } as SxProps,
    },
  );
  const merged = mergeNativeStyles(theme.direction, rootStyle, authoredStyle, rootNative);
  const computed =
    applyNativeTextMetrics(
      merged,
      rootStyle,
      nativeStyleTextMetrics([rootStyle, authoredStyle, rootNative]),
    ) ?? merged;
  const named = (slot: string, base: SxProps, slotSx?: SxProps, native?: NativeStyle) =>
    componentStyle(theme, 'MuiChip', { ...owner }, slotSx, {
      width,
      slot,
      rootSlot: slot,
      skipVariants: true,
      parentTextStyle: computed,
      parentLineHeight: getTextStyleInheritance(computed).lineHeight,
      inheritOnly: true,
      nativeStyle: native,
      baseStyle: base,
    });
  const labelStyle = named(
    'label',
    {
      flexShrink: 1,
      minWidth: 0,
      paddingLeft: small ? (outlined ? 7 : 8) : outlined ? 11 : 12,
      paddingRight: small ? (outlined ? 7 : 8) : outlined ? 11 : 12,
    },
    labelSlot.sx,
    StyleSheet.flatten(labelSlot.style) ?? undefined,
  );
  const Label = slots.label;
  const labelContent = (
    <NativeTextScope
      rootRef={labelTextRoot}
      theme={theme}
      kind="view"
      style={[labelStyle, labelSlot.style]}
      content={label}
    >
      {(nativeStyle, content, scope) =>
        Label ? (
          <Label
            {...labelSlot}
            ref={labelTextRef}
            ownerState={owner}
            style={Label === View ? nativeStyle : [nativeStyle, scope.style]}
          >
            {content}
          </Label>
        ) : (
          <View {...labelSlot} ref={labelTextRef} style={[{ overflow: 'hidden' }, nativeStyle]}>
            {typeof label === 'string' || typeof label === 'number' || typeof label === 'bigint' ? (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={scope.literalStyle ?? scope.style}
              >
                {String(label)}
              </Text>
            ) : (
              content
            )}
          </View>
        )
      }
    </NativeTextScope>
  );
  const validAvatar = React.isValidElement(avatar),
    validIcon = React.isValidElement(icon);
  const decoration = validAvatar ? avatar : validIcon ? icon : null;
  const decorationKind = validAvatar ? 'avatar' : 'icon';
  const decorationStyle = named(decorationKind, {
    marginLeft: outlined ? (small ? 2 : 4) : small ? 4 : 5,
    marginRight: small ? -4 : -6,
    ...(validAvatar
      ? {
          width: small ? 18 : 24,
          height: small ? 18 : 24,
          borderRadius: small ? 9 : 12,
          overflow: 'hidden',
          fontSize: theme.typography.pxToRem(small ? 10 : 12),
          color:
            palette?.contrastText ?? theme.palette.grey[theme.palette.mode === 'light' ? 700 : 300],
          ...(palette?.dark && ['primary', 'secondary'].includes(color)
            ? { backgroundColor: palette.dark }
            : {}),
        }
      : {
          fontSize: small ? 18 : 20,
          color:
            owner.iconColor === color
              ? color === 'default'
                ? theme.palette.grey[theme.palette.mode === 'light' ? 700 : 300]
                : computed.color
              : undefined,
        }),
  });
  const deleteStyle = named('deleteIcon', {
    marginLeft: small ? -4 : -6,
    marginRight: outlined ? (small ? 3 : 5) : small ? 4 : 5,
    fontSize: small ? 16 : 22,
    color: alpha(
      outlined
        ? (palette?.main ?? theme.palette.text.primary)
        : (palette?.contrastText ?? theme.palette.text.primary),
      palette ? 0.7 : 0.26,
    ),
  });
  const contents = (
    <>
      {decoration ? (
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexShrink: 0 }}
        >
          <NativeTextScope
            rootRef={decorationTextRoot}
            theme={theme}
            kind="view"
            style={decorationStyle}
            content={decoration}
          >
            {(nativeStyle, content) => (
              <View ref={decorationTextRoot} style={nativeStyle}>
                {content}
              </View>
            )}
          </NativeTextScope>
        </View>
      ) : null}
      {labelContent}
      {onDelete ? (
        <ButtonBase
          testID={props.testID ? props.testID + '-delete' : undefined}
          focusable={false}
          tabIndex={-1}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          disabled={effectiveDisabled}
          disableRipple
          onClick={remove}
          style={[deleteStyle, { minWidth: 44, minHeight: 44 }]}
        >
          <NativeTextScope
            rootRef={React.isValidElement(deleteIcon) ? undefined : deleteTextRoot}
            theme={theme}
            kind="view"
            style={[deleteStyle, { minWidth: 44, minHeight: 44 }]}
            content={
              React.isValidElement(deleteIcon)
                ? React.cloneElement(deleteIcon as React.ReactElement<any>, {
                    onClick: undefined,
                    onPress: undefined,
                  })
                : null
            }
          >
            {(_nativeStyle, content, scope) =>
              React.isValidElement(deleteIcon) ? (
                content
              ) : (
                <View
                  ref={deleteTextRoot}
                  testID={props.testID ? props.testID + '-delete-icon' : undefined}
                  style={{
                    width: small ? 16 : 22,
                    height: small ? 16 : 22,
                    borderRadius: 11,
                    borderWidth: 1.5,
                    borderColor: scope.style.color as string,
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      width: small ? 9 : 12,
                      height: 2,
                      backgroundColor: scope.style.color as string,
                      transform: [{ rotate: '45deg' }],
                    }}
                  />
                  <View
                    style={{
                      width: small ? 9 : 12,
                      height: 2,
                      backgroundColor: scope.style.color as string,
                      transform: [{ rotate: '-45deg' }],
                    }}
                  />
                </View>
              )
            }
          </NativeTextScope>
        </ButtonBase>
      ) : null}
    </>
  );
  const scopedContents = (
    <NativeButtonActivationKeys.Provider value={inheritedActivationKeys}>
      {contents}
    </NativeButtonActivationKeys.Provider>
  );
  const {
    onClick: rootClick,
    onPress: rootPress,
    onKeyDown: rootDown,
    onKeyUp: rootUp,
    style: _rootStyle,
    sx: _rootSx,
    ref: _rootRef,
    action: _rootAction,
    disabled: _rootDisabled,
    ownerState: _owner,
    ...rootOther
  } = root;
  const Root = slots.root ?? component;
  const canFocus =
    rootOther.focusable ??
    native.focusable ??
    (rootOther.tabIndex != null || native.tabIndex != null || focusedControl);
  const handlers: ButtonBaseProps = {
    ...native,
    ...rootOther,
    ...({
      managedKeys: focusedControl ? deletionKeys : noKeys,
    } as any),
    nativeID: rootOther.nativeID ?? id ?? native.nativeID,
    accessibilityRole:
      rootOther.accessibilityRole ??
      native.accessibilityRole ??
      (focusedControl ? 'button' : 'none'),
    accessible: rootOther.accessible ?? native.accessible ?? focusedControl,
    accessibilityLabel:
      rootOther.accessibilityLabel ??
      native.accessibilityLabel ??
      (typeof label === 'string' || typeof label === 'number' ? String(label) : undefined),
    accessibilityState: {
      ...native.accessibilityState,
      ...rootOther.accessibilityState,
      disabled: effectiveDisabled,
    },
    accessibilityActions:
      rootOther.accessibilityActions ??
      native.accessibilityActions ??
      (onDelete ? [{ name: 'delete', label: 'Delete' }] : undefined),
    onAccessibilityAction: (event) => {
      (rootOther.onAccessibilityAction ?? native.onAccessibilityAction)?.(event);
      if (event.nativeEvent.actionName === 'delete' && eligible()) remove(event);
    },
    disabled: effectiveDisabled,
    focusableWhenDisabled: canFocus && !skipFocusWhenDisabled,
    focusable: canFocus,
    tabIndex:
      effectiveDisabled && skipFocusWhenDisabled
        ? -1
        : (rootOther.tabIndex ?? native.tabIndex ?? (focusedControl ? 0 : -1)),
    onClick: useMenuEvent((event) => {
      if (!eligible()) return;
      (rootPress ?? rootClick)?.(event);
      if (eligible()) (onPress ?? onClick)?.(event);
    }),
    onKeyDown: useMenuEvent((event) => {
      if (!eligible()) return;
      rootDown?.(event);
      if (event.currentTarget === event.target && deleteKey(event)) event.preventDefault();
      if (mounted.current) onKeyDown?.(event);
    }),
    onKeyUp: useMenuEvent((event) => {
      if (!eligible()) return;
      rootUp?.(event);
      if (
        eligible() &&
        event.currentTarget === event.target &&
        !event.isComposing &&
        !event.isCanceled &&
        deleteKey(event)
      )
        remove(event, false);
      if (mounted.current) onKeyUp?.(event);
    }),
    onFocus: (event) => {
      (root.onFocus ?? onFocus)?.(event);
    },
    onFocusVisible: (event) => {
      setState((old) => ({ ...old, focusVisible: true }));
      (root.onFocusVisible ?? onFocusVisible)?.(event);
    },
    onBlur: (event) => {
      setState((old) => ({ ...old, focusVisible: false }));
      (root.onBlur ?? onBlur)?.(event);
    },
    onHoverIn: (event) => {
      setState((old) => ({ ...old, hovered: true }));
      (root.onHoverIn ?? onHoverIn)?.(event);
    },
    onHoverOut: (event) => {
      setState((old) => ({ ...old, hovered: false }));
      (root.onHoverOut ?? onHoverOut)?.(event);
    },
    onPressIn: (event) => {
      setState((old) => ({ ...old, pressed: true }));
      (root.onPressIn ?? onPressIn)?.(event);
    },
    onPressOut: (event) => {
      setState((old) => ({ ...old, pressed: false }));
      (root.onPressOut ?? onPressOut)?.(event);
    },
    style: computed,
  };
  const element = interactive ? (
    <ButtonBase
      {...handlers}
      action={baseAction}
      component={Root as any}
      {...(Root ? { ownerState: owner } : {})}
      ref={ref}
      disableRipple={Boolean(onDelete) || handlers.disableRipple}
    >
      {scopedContents}
    </ButtonBase>
  ) : Root ? (
    <Root
      {...(handlers as any)}
      style={Object.fromEntries(
        Object.entries(computed).filter(([key]) => !isNativeTextStyleProperty(key)),
      )}
      ref={ref}
      ownerState={owner}
    >
      {scopedContents}
    </Root>
  ) : (
    <View
      {...(handlers as any)}
      style={Object.fromEntries(
        Object.entries(computed).filter(([key]) => !isNativeTextStyleProperty(key)),
      )}
      ref={ref}
    >
      {scopedContents}
    </View>
  );
  return (
    <NativeButtonActivationKeys.Provider value={focusedControl ? activationKeys : noKeys}>
      {/* ButtonBase already owns the interactive host's text scope. Reapplying
          the computed root scope there would resolve relative metrics twice. */}
      {interactive ? (
        element
      ) : (
        <NativeTextScope rootRef={node} theme={theme} kind="view" style={computed}>
          {() => element}
        </NativeTextScope>
      )}
    </NativeButtonActivationKeys.Provider>
  );
}) as NativeChipComponent;
