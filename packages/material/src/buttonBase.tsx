// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Activation/style contracts adapt MIT Material UI 9.5.0. See NOTICE and upstream/reuse.json.
import {
  nativeCssProgramTree,
  retainNativeCssProgram,
  retainNativeStyleTransform,
  refreshNativeStyle,
  nativeInlineStyle,
  NativeCssRootBoundary,
  useNativeStyleCache,
  useNativeDefaultPropsSource,
  useNativeSourceDefaultProps,
} from '@altroo/mui-native-system/internal/prepared-style';
import { buttonBaseConstructorCss, buttonBaseOverrideCss } from './nativeButtonCss';
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useContext,
  useLayoutEffect,
  useMemo,
} from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  Platform,
  Linking,
  useWindowDimensions,
  type PressableProps,
  type PressableStateCallbackType,
  type ViewInstance,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import {
  nativeStyleBorderDeclarations,
  copyNativeBorderStyle,
  applyNativeBorderStyle,
  separateNativeRootProps,
  restoreNativeRootStyle,
  joinClassNames,
  NativeTextScope,
  useNativeTextContext,
  nativeTextStyleContext,
  applyNativeTextMetrics,
  nativeStyleTextMetrics,
  isNativeTextStyleProperty,
  diagnostic,
  componentRootStyle,
  componentStyle,
  type SxProps,
  type NativeStyle,
  type NativePreparedStyle,
  type StyleContext,
} from '@altroo/mui-native-system';
import { useTheme } from './themeProvider';
import { useForkRef } from './utils';
import { nativeInlineBorderBase, nativeInlineSideMapper } from './nativeInlineBorders';
import {
  buttonKeyEvent,
  buttonActivationEvent,
  isButtonEventPrevented,
  type ButtonBaseKeyEvent,
  type ButtonBaseActivationEvent,
} from './nativeButtonEvents';
import { NativePressable } from '@altroo/mui-native-host';
import { getButtonBaseUtilityClass, type ButtonBaseClasses } from './buttonBaseClasses';
export { buttonBaseClasses, getButtonBaseUtilityClass } from './buttonBaseClasses';
export type { ButtonBaseClasses, ButtonBaseClassKey } from './buttonBaseClasses';
import { NativeButtonActivationKeys } from './nativeButtonActivationKeys';
import { NativeCompositeKeys } from './nativeCompositeKeys';
import { useNativeButtonAutoFocus } from './useNativeButtonAutoFocus';
import { useMenuEvent } from './useMenuEvent';
import { NativeOverlayReadiness } from './nativeOverlayReadiness';
import { NativeMenuFocusReadiness } from './menuContext';
import { NativeModalParentContext } from './nativeModalContext';
import { nativeModalManager as manager } from './nativeModalManager';
import { nativeButtonModality } from './nativeButtonModality';
export type { ButtonBaseKeyEvent, ButtonBaseActivationEvent } from './nativeButtonEvents';
export interface ButtonBaseActions {
  focusVisible(): void;
}
export interface ButtonBaseState extends PressableStateCallbackType {
  focusVisible: boolean;
  disabled: boolean;
}
/** @internal Shared sheets preserve specificity across native styled wrappers. */
export type NativeButtonBaseStyleSheet = NonNullable<StyleContext['ancestors']>[number] & {
  /** Immutable complete CSS prepared at the genuine Base source render. */
  readonly sourcePrepared?: NativePreparedStyle;
};
export interface NativeButtonBaseStyleResult {
  computed: NativeStyle;
  authored: StyleProp<NativeStyle>;
}
export interface ButtonBaseRootProps extends PressableProps {
  className?: string | undefined;
  ref?: React.Ref<ViewInstance>;
  href?: string;
  to?: unknown;
}
export interface ButtonBaseOwnProps {
  classes?: Partial<ButtonBaseClasses> | undefined;
  className?: string | undefined;
  focusVisibleClassName?: string | undefined;
  /** @internal Visual state for composites that keep native focus in an input. */
  _muiNativeItemState?: { focused: boolean; focusVisible: boolean; selected: boolean };
  /** @internal Generated class metadata supplied by native composite controls. */
  _muiNativeClassName?: string;
  /** @internal Class metadata activated by the actual native focus-visible state. */
  _muiNativeClassMetadata?: { root: string; focusVisible?: string | undefined };
  /** @internal A composing control can own its theme focus ring. */
  internalDisabledThemeFocusVisible?: boolean;
  /** @internal Keep wrapper CSS in the same cascade, separately from native inline styles. */
  /** @internal Source CSS is prepared independently of native presentation callbacks. */
  _muiNativeSourceStyle?: (base: NativeButtonBaseStyleSheet) => NativePreparedStyle;
  _muiNativeStyle?: (
    state: ButtonBaseState,
    base: NativeButtonBaseStyleSheet,
    hovered?: boolean,
  ) => NativeButtonBaseStyleResult;
  disabled?: boolean;
  autoFocus?: boolean;
  ref?: React.Ref<ViewInstance>;
  action?: React.Ref<ButtonBaseActions>;
  children?: React.ReactNode | ((state: ButtonBaseState) => React.ReactNode);
  sx?: SxProps;
  style?: StyleProp<NativeStyle> | ((state: ButtonBaseState) => StyleProp<NativeStyle>);
  component?: React.ComponentType<ButtonBaseRootProps> | typeof View;
  LinkComponent?: React.ComponentType<ButtonBaseRootProps> | typeof View;
  href?: string;
  to?: unknown;
  onClick?: (event: ButtonBaseActivationEvent) => void;
  onPress?: (event: ButtonBaseActivationEvent) => void;
  onKeyDown?: (event: ButtonBaseKeyEvent) => void;
  onKeyUp?: (event: ButtonBaseKeyEvent) => void;
  onFocusVisible?: PressableProps['onFocus'];
  disableRipple?: boolean;
  disableTouchRipple?: boolean;
  focusRipple?: boolean;
  /** Native focus coordination for composite items; activation stays disabled. */
  focusableWhenDisabled?: boolean;
  /** Native menu focus handoff without a keyboard focus indicator. */
  suppressFocusVisible?: boolean;
}
export interface ButtonBaseProps
  extends Omit<
      PressableProps,
      'children' | 'style' | 'onPress' | 'onClick' | 'onKeyDown' | 'onKeyUp' | 'disabled'
    >,
    ButtonBaseOwnProps {}
function viewStyle(input: StyleProp<NativeStyle>): StyleProp<ViewStyle> {
  const flattened = StyleSheet.flatten(input);
  return (
    flattened &&
    copyNativeBorderStyle(
      flattened,
      Object.fromEntries(
        Object.entries(flattened).filter(([key]) => !isNativeTextStyleProperty(key)),
      ),
    )
  );
}
/** @internal Apply true native inline declarations after the shared CSS cascade. */
export function mergeNativeButtonStyle(
  computed: NativeStyle,
  authored: StyleProp<NativeStyle>,
  feedback?: NativeStyle,
): NativeStyle {
  const flattened = StyleSheet.flatten(authored);
  const inline = flattened && { ...flattened };
  if (inline)
    for (const edge of ['Top', 'Right', 'Bottom', 'Left'] as const) {
      const value =
        inline[`padding${edge}`] ??
        inline[edge === 'Top' || edge === 'Bottom' ? 'paddingVertical' : 'paddingHorizontal'] ??
        inline.padding;
      if (value != null) inline[`padding${edge}`] = value;
    }
  const value = nativeInlineBorderBase(
    feedback ? nativeStyleBorderDeclarations([computed, feedback]) : computed,
    inline,
  );
  if (inline) {
    const nativeSide = nativeInlineSideMapper(value, inline);
    // Native specific edges outrank shorthands regardless of array order.
    // Remove computed overlap edges before applying a final authored reset;
    // margins use Yoga's global swap, without Android's local border-paint swap.
    if (inline.margin != null)
      for (const edge of [
        'Top',
        'Right',
        'Bottom',
        'Left',
        'Start',
        'End',
        'Horizontal',
        'Vertical',
      ] as const)
        delete value[`margin${edge}`];
    else {
      if (inline.marginHorizontal != null)
        for (const edge of ['Left', 'Right', 'Start', 'End'] as const)
          delete value[`margin${edge}`];
      if (inline.marginVertical != null)
        for (const edge of ['Top', 'Bottom'] as const) delete value[`margin${edge}`];
    }
    for (const side of ['Left', 'Right', 'Start', 'End'] as const)
      if (inline[`margin${side}`] != null)
        for (const other of ['Left', 'Right', 'Start', 'End'] as const)
          if (nativeSide(side, false) === nativeSide(other, false)) delete value[`margin${other}`];
    Object.assign(value, inline);
  }
  const result =
    applyNativeTextMetrics(
      applyNativeBorderStyle(nativeStyleBorderDeclarations([value, inline])),
      computed,
      nativeStyleTextMetrics([computed, authored]),
    ) ?? value;
  return retainNativeStyleTransform(result, computed, (next) =>
    mergeNativeButtonStyle(next, authored, feedback),
  );
}
// Hover belongs to native presentation. Keeping it below the source owner
// avoids replaying default getters and CSS callbacks on a host-only update.
function NativeButtonHover({
  children,
}: {
  children: (hovered: boolean, setHovered: (value: boolean) => void) => React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return children(hovered, setHovered);
}
export const ButtonBase: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ButtonBaseProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, ButtonBaseProps>(function ButtonBase(inProps, forwarded) {
  const [focused, setFocused] = useState(false);
  const rootInput = useMemo(() => separateNativeRootProps(inProps), [inProps]);
  const props = useNativeSourceDefaultProps({
    props: rootInput.props,
    name: 'MuiButtonBase',
    sourceState: focused,
  });
  const preparedStyle = restoreNativeRootStyle(rootInput, props);
  const compositeKeys = useContext(NativeCompositeKeys);
  const styleCache = useNativeStyleCache();
  const defaultsSource = useNativeDefaultPropsSource();
  const activationKeys = useContext(NativeButtonActivationKeys);
  const {
    classes,
    className,
    focusVisibleClassName,
    action,
    autoFocus = false,
    children,
    component,
    LinkComponent,
    href,
    to,
    disabled = false,
    disableRipple = false,
    disableTouchRipple = false,
    focusRipple = false,
    focusableWhenDisabled = false,
    suppressFocusVisible = false,
    internalDisabledThemeFocusVisible = false,
    _muiNativeStyle,
    _muiNativeSourceStyle,
    _muiNativeItemState,
    _muiNativeClassName,
    _muiNativeClassMetadata,
    onClick,
    onPress,
    onKeyDown,
    onKeyUp,
    onFocusVisible,
    onFocus,
    onBlur,
    onPointerDownCapture,
    onTouchStart,
    onPressIn,
    sx,
    style,
    tabIndex = 0,
    ...native
  } = props;
  const node = useRef<ViewInstance | null>(null);
  const ref = useForkRef(node, forwarded);
  useNativeButtonAutoFocus(autoFocus, node, disabled);
  const mounted = useRef(true);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const focusVisible = focused && !disabled && !suppressFocusVisible;
  // Virtual option highlight must not move the editor's focus, invoke focus
  // callbacks, or grant activation to disabled rows. It only affects styling.
  const visualFocusVisible = focusVisible || Boolean(_muiNativeItemState?.focusVisible);
  if ((disabled || suppressFocusVisible) && focused) setFocused(false);
  const overlayReady = useContext(NativeOverlayReadiness),
    menuReady = useContext(NativeMenuFocusReadiness),
    modalParent = useContext(NativeModalParentContext);
  const interactionReady = useMenuEvent(
    () =>
      mounted.current &&
      overlayReady &&
      menuReady &&
      modalParent?.open !== false &&
      modalParent?.presented !== false &&
      (!manager.top() || (node.current != null && manager.top()!.contains(node.current))),
  );
  const requestFocusVisible = useMenuEvent(() => {
    if (
      (disabled && !focusableWhenDisabled) ||
      !interactionReady() ||
      node.current?.isConnected === false
    )
      return;
    setFocused(true);
    node.current?.focus();
  });
  const theme = useTheme(),
    parent = useNativeTextContext(),
    { width } = useWindowDimensions();
  const isLink = Boolean(href || to);
  const chosen = component === Pressable || component === View ? NativePressable : component;
  const link =
    LinkComponent === Pressable || LinkComponent === View ? NativePressable : LinkComponent;
  const Root = (
    !chosen || chosen === NativePressable
      ? ((isLink ? link : undefined) ?? NativePressable)
      : chosen
  ) as React.ComponentType<ButtonBaseRootProps>;
  const ownedLink = Root === NativePressable && Boolean(href);
  const staticStyle = typeof style === 'function' ? undefined : style;
  const ownerState = {
    ...props,
    disabled,
    disableRipple,
    disableTouchRipple,
    focusRipple,
    internalDisabledThemeFocusVisible,
    suppressFocusVisible,
    tabIndex,
    focusVisible: visualFocusVisible,
  };
  const activeFocus = focusVisible && !suppressFocusVisible;
  // Keep source order and both reads of an active truthy custom class getter.
  const composed = [
    'root',
    ...(disabled ? ['disabled'] : []),
    ...(activeFocus ? ['focusVisible'] : []),
  ]
    .map((slot) => {
      const generated = getButtonBaseUtilityClass(slot);
      const custom = classes as Record<string, string | undefined> | undefined;
      return custom?.[slot] ? generated + ' ' + custom[slot] : generated;
    })
    .join(' ');
  const composedClassName = joinClassNames(
    composed,
    activeFocus &&
      (_muiNativeClassMetadata ? _muiNativeClassMetadata.focusVisible : focusVisibleClassName),
    className ?? _muiNativeClassMetadata?.root ?? _muiNativeClassName,
  );
  const styleContext = {
    styleCache,
    baseProgramme: buttonBaseConstructorCss(theme, ownerState),
    overrideProgramme: buttonBaseOverrideCss,
    classes: composedClassName.split(/\s+/).filter(Boolean),
    rootProps: { ...props, className: composedClassName, ownerState },
    ...nativeTextStyleContext(parent, staticStyle, theme),
    width,
    states: [
      ...(disabled ? ['disabled'] : []),
      ...(_muiNativeItemState?.focused ? ['focused'] : []),
      ...(_muiNativeItemState?.selected ? ['selected'] : []),
      ...(visualFocusVisible ? ['focusVisible'] : []),
    ],
    baseStyle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderRadius: 0,
      margin: 0,
      padding: 0,
      color: 'inherit',
      ...(focusVisible && !internalDisabledThemeFocusVisible && theme.focusVisible
        ? { '&.Mui-focusVisible': theme.focusVisible }
        : {}),
    },
  };
  // Composite controls consume Base CSS on this same physical host. Prepare
  // it once without invoking the composite's genuine native style callback.
  const sourceKey = _muiNativeSourceStyle ?? inProps;
  const basePrepared = useMemo(
    () =>
      _muiNativeStyle
        ? componentRootStyle(theme, 'MuiButtonBase', ownerState, sx, undefined, styleContext)
            .prepared
        : undefined,
    [sourceKey, theme, parent, width, styleCache, defaultsSource, visualFocusVisible],
  );
  const basePrefix: NativeButtonBaseStyleSheet = {
    theme,
    name: 'MuiButtonBase',
    props: ownerState,
    sx,
    context: styleContext,
    ...(_muiNativeStyle
      ? {
          sameRoot: true,
          prepared: {
            sheets: retainNativeCssProgram(
              [
                ...basePrepared!.sheets,
                ...(rootInput.prepared?.sheets ?? []).map((sheet) =>
                  sheet.ancestor
                    ? sheet
                    : {
                        ...sheet,
                        context: {
                          ...sheet.context,
                          classes: styleContext.classes,
                          states: styleContext.states,
                        },
                      },
                ),
              ],
              nativeCssProgramTree(basePrepared!.sheets),
            ),
          },
        }
      : {}),
  };
  const sourceAuthored =
    typeof preparedStyle === 'function'
      ? restoreNativeRootStyle(
          { props: { style: undefined }, prepared: rootInput.prepared },
          { style: undefined },
        )
      : preparedStyle;
  const rootStyle = useMemo(
    () =>
      _muiNativeStyle
        ? undefined
        : componentRootStyle(theme, 'MuiButtonBase', ownerState, sx, sourceAuthored, styleContext),
    [sourceKey, theme, parent, width, styleCache, defaultsSource, visualFocusVisible],
  );
  const sourcePrepared = useMemo(
    () => _muiNativeSourceStyle?.(basePrefix),
    [sourceKey, theme, parent, width, styleCache, defaultsSource, visualFocusVisible],
  );
  const baseSheet: NativeButtonBaseStyleSheet = sourcePrepared
    ? { ...basePrefix, sourcePrepared }
    : basePrefix;
  const sourceStyle = sourcePrepared
    ? componentStyle(theme, 'MuiButtonBase', ownerState, undefined, {
        ...styleContext,
        preparedRoot: sourcePrepared,
      })
    : (rootStyle?.computed ??
      componentStyle(theme, 'MuiButtonBase', ownerState, undefined, {
        ...styleContext,
        preparedRoot: basePrepared,
      }));
  useImperativeHandle(
    action,
    () => ({
      focusVisible: requestFocusVisible,
    }),
    [],
  );
  const activate = useMenuEvent((event: ButtonBaseActivationEvent) => {
    if (!interactionReady() || disabled || node.current?.isConnected === false) {
      event.preventDefault?.();
      return;
    }
    (onPress ?? onClick)?.(event);
    if (ownedLink && !isButtonEventPrevented(event)) {
      try {
        Promise.resolve(Linking.openURL(href!)).catch(() =>
          diagnostic('button-link', 'The native platform could not open this ButtonBase link.'),
        );
      } catch {
        diagnostic('button-link', 'The native platform could not open this ButtonBase link.');
      }
    }
  });
  const stateFor = (state: PressableStateCallbackType): ButtonBaseState => ({
    ...state,
    focusVisible: visualFocusVisible,
    disabled,
  });
  let stateStyleCache:
    | {
        authored: StyleProp<NativeStyle>;
        computed: NativeStyle;
        pressed: boolean;
        focusVisible: boolean;
        hovered: boolean;
      }
    | undefined;
  const effectiveStyle = (
    state: PressableStateCallbackType,
    hovered: boolean,
  ): StyleProp<NativeStyle> => {
    let authored: StyleProp<NativeStyle>;
    let resolved: NativeStyle;
    if (_muiNativeStyle) {
      ({ computed: resolved, authored } = _muiNativeStyle(stateFor(state), baseSheet, hovered));
    } else {
      const current = stateFor(state);
      if (
        stateStyleCache &&
        stateStyleCache.pressed === current.pressed &&
        stateStyleCache.focusVisible === current.focusVisible &&
        stateStyleCache.hovered === hovered
      ) {
        resolved = refreshNativeStyle(stateStyleCache.computed);
        authored = stateStyleCache.authored;
      } else {
        const input =
          typeof preparedStyle === 'function' ? preparedStyle(current) : rootStyle!.authored;
        // Native callback output is presentation, never a new CSS programme.
        authored = rootInput.prepared ? nativeInlineStyle(input) : input;
        resolved = componentStyle(theme, 'MuiButtonBase', ownerState, undefined, {
          ...styleContext,
          preparedRoot: rootStyle!.prepared,
          ...nativeTextStyleContext(parent, authored, theme),
          states: [
            ...styleContext.states,
            ...(current.pressed && !disabled ? ['active'] : []),
            ...(hovered && !disabled ? ['hover'] : []),
          ],
          classes: [
            ...styleContext.classes,
            ...(current.pressed && !disabled ? ['Mui-active'] : []),
            ...(hovered && !disabled ? ['Mui-hover'] : []),
          ],
        });
        stateStyleCache = {
          authored,
          computed: resolved,
          pressed: current.pressed,
          focusVisible: current.focusVisible,
          hovered,
        };
      }
    }
    return mergeNativeButtonStyle(resolved, authored, {
      ...(focusVisible && focusRipple && !disableRipple && !theme.focusVisible
        ? {
            outlineWidth: 2,
            outlineColor: theme.palette.primary.main,
            outlineStyle: 'solid' as const,
          }
        : {}),
      ...(Platform.OS !== 'android' &&
      state.pressed &&
      !disabled &&
      !disableRipple &&
      !disableTouchRipple
        ? { opacity: (typeof resolved.opacity === 'number' ? resolved.opacity : 1) * 0.8 }
        : {}),
    });
  };
  const {
    centerRipple,
    TouchRippleProps,
    touchRippleRef,
    nativeButton,
    type,
    formAction,
    ...host
  } = native as typeof native & Record<string, unknown>;
  if (
    centerRipple ||
    TouchRippleProps ||
    touchRippleRef ||
    nativeButton != null ||
    type ||
    formAction
  )
    diagnostic(
      'button-browser',
      'DOM button/form and programmable browser ripple contracts are not native ButtonBase behavior.',
    );
  if (to != null && Root === NativePressable)
    diagnostic(
      'button-route',
      'ButtonBase to requires an application-owned native link component.',
    );
  const handleKeyDown = useMenuEvent((event) => {
    if (!interactionReady()) return;
    nativeButtonModality.keyboard();
    const key = buttonKeyEvent(event);
    if (disabled) {
      if (focusableWhenDisabled && key.key !== 'Tab' && !compositeKeys?.includes(key.key))
        key.preventDefault();
      return;
    }
    // Ancestor capture cancellation must reach the native activation path.
    // Keep MUI's own onKeyDown semantics: canceling Enter inside that callback
    // does not suppress its separately dispatched click event.
    const capturePrevented = isButtonEventPrevented(key);
    onKeyDown?.(key);
    if (key.target !== key.currentTarget || key.isComposing || key.isCanceled || capturePrevented)
      return;
    if (key.key === ' ' && activationKeys.includes(' ')) key.preventDefault();
    else if (key.key === 'Enter' && activationKeys.includes('Enter')) {
      key.preventDefault();
      activate(buttonActivationEvent(key));
    }
  });
  const handleKeyUp = useMenuEvent((event) => {
    if (!interactionReady()) return;
    nativeButtonModality.keyboard();
    if (disabled) return;
    const key = buttonKeyEvent(event);
    onKeyUp?.(key);
    if (
      key.target === key.currentTarget &&
      !key.isComposing &&
      !key.isCanceled &&
      key.key === ' ' &&
      activationKeys.includes(' ') &&
      !isButtonEventPrevented(key)
    )
      activate(buttonActivationEvent(key));
  });
  return (
    <NativeCssRootBoundary style={sourceStyle} registerClass={Root !== NativePressable}>
      {() => (
        <NativeButtonHover>
          {(hovered, setHovered) => (
            <Root
              {...host}
              {...(Root === NativePressable || Root === View || Root === Text
                ? {}
                : {
                    className: composedClassName,
                  })}
              {...(Root === NativePressable ? {} : { href, to })}
              ref={ref}
              accessibilityRole={native.accessibilityRole ?? (isLink ? 'link' : 'button')}
              accessibilityState={{ ...native.accessibilityState, disabled }}
              aria-disabled={disabled || native['aria-disabled']}
              disabled={disabled && focusableWhenDisabled ? undefined : disabled}
              // The shared host's disabled class blocks pointer targeting even when a
              // slot keeps disabled=false and native keyboard activation enabled.
              pointerEvents={
                disabled || composedClassName.split(/\s+/).includes('Mui-disabled')
                  ? 'none'
                  : native.pointerEvents
              }
              onLongPress={(event) => {
                if (!disabled) native.onLongPress?.(event);
              }}
              focusable={disabled ? focusableWhenDisabled : (native.focusable ?? true)}
              tabIndex={disabled && !focusableWhenDisabled ? -1 : tabIndex}
              android_ripple={
                disabled || disableRipple || disableTouchRipple
                  ? undefined
                  : (native.android_ripple ?? { color: theme.palette.action.focus })
              }
              onPress={activate}
              onPointerDownCapture={(event) => {
                nativeButtonModality.pointer();
                onPointerDownCapture?.(event);
              }}
              onTouchStart={(event) => {
                nativeButtonModality.pointer();
                onTouchStart?.(event);
              }}
              onPressIn={(event) => {
                nativeButtonModality.pointer();
                onPressIn?.(event);
              }}
              onFocus={(event) => {
                const visible = !suppressFocusVisible && nativeButtonModality.isKeyboard();
                if (visible) {
                  setFocused(true);
                  onFocusVisible?.(event);
                }
                onFocus?.(event);
              }}
              onBlur={(event) => {
                setFocused(false);
                onBlur?.(event);
              }}
              onHoverIn={(event) => {
                setHovered(true);
                native.onHoverIn?.(event);
              }}
              onHoverOut={(event) => {
                setHovered(false);
                native.onHoverOut?.(event);
              }}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              style={(state) => viewStyle(effectiveStyle(state, hovered))}
            >
              {(state) => {
                const resolved = effectiveStyle(state, hovered);
                return (
                  <NativeTextScope
                    rootRef={node}
                    theme={theme}
                    style={resolved}
                    content={typeof children === 'function' ? children(stateFor(state)) : children}
                  >
                    {(_style, content) => content}
                  </NativeTextScope>
                );
              }}
            </Root>
          )}
        </NativeButtonHover>
      )}
    </NativeCssRootBoundary>
  );
});
