// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Activation/style contracts adapt MIT Material UI 9.5.0. See NOTICE and upstream/reuse.json.
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useContext,
  useLayoutEffect,
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
  useDefaultProps,
  NativeTextScope,
  useNativeTextContext,
  nativeTextStyleContext,
  applyNativeTextMetrics,
  nativeStyleTextMetrics,
  isNativeTextStyleProperty,
  diagnostic,
  componentStyle,
  componentRootStyle,
  type SxProps,
  type NativeStyle,
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
import { unstable_ClassNameGenerator } from './classNameGenerator';
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
export type NativeButtonBaseStyleSheet = NonNullable<StyleContext['ancestors']>[number];
export interface NativeButtonBaseStyleResult {
  computed: NativeStyle;
  authored: StyleProp<NativeStyle>;
}
export interface ButtonBaseRootProps extends PressableProps {
  ref?: React.Ref<ViewInstance>;
  href?: string;
  to?: unknown;
}
export interface ButtonBaseOwnProps {
  /** @internal Visual state for composites that keep native focus in an input. */
  _muiNativeItemState?: { focused: boolean; focusVisible: boolean; selected: boolean };
  /** @internal Exact generated class metadata; authored CSS still diagnoses. */
  _muiNativeClassName?: string;
  /** @internal Class metadata activated by the actual native focus-visible state. */
  _muiNativeClassMetadata?: { root: string; focusVisible?: string | undefined };
  /** @internal A composing control can own its theme focus ring. */
  internalDisabledThemeFocusVisible?: boolean;
  /** @internal Keep wrapper CSS in the same cascade, separately from native inline styles. */
  _muiNativeStyle?: (
    state: ButtonBaseState,
    base: NativeButtonBaseStyleSheet,
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
  return (
    applyNativeTextMetrics(
      applyNativeBorderStyle(nativeStyleBorderDeclarations([value, inline])),
      computed,
      nativeStyleTextMetrics([computed, authored]),
    ) ?? value
  );
}
export const ButtonBase: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ButtonBaseProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, ButtonBaseProps>(function ButtonBase(inProps, forwarded) {
  const props = useDefaultProps({ props: inProps, name: 'MuiButtonBase' });
  const compositeKeys = useContext(NativeCompositeKeys);
  const activationKeys = useContext(NativeButtonActivationKeys);
  const {
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
  const [focused, setFocused] = useState(false);
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
    tabIndex,
    focusVisible: visualFocusVisible,
  };
  // A composed Summary retains the actual inherited ButtonBase identifiers.
  const composedClassName = _muiNativeClassMetadata
    ? [
        unstable_ClassNameGenerator.generate('MuiButtonBase') + '-root',
        disabled && 'Mui-disabled',
        focusVisible && !suppressFocusVisible && 'Mui-focusVisible',
        focusVisible && !suppressFocusVisible && _muiNativeClassMetadata.focusVisible,
        _muiNativeClassMetadata.root,
      ]
        .filter(Boolean)
        .join(' ')
    : undefined;
  const styleContext = {
    ...(_muiNativeClassMetadata
      ? {
          classes: composedClassName!.split(/\s+/).filter(Boolean),
          rootProps: { ...props, className: composedClassName, ownerState },
        }
      : {}),
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
  const baseSheet: NativeButtonBaseStyleSheet = {
    theme,
    name: 'MuiButtonBase',
    props: ownerState,
    sx,
    context: styleContext,
  };
  const computed =
    _muiNativeStyle || typeof style === 'function'
      ? undefined
      : componentStyle(theme, 'MuiButtonBase', ownerState, sx, styleContext);
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
  let styleCache:
    | { input: StyleProp<NativeStyle>; authored: StyleProp<NativeStyle>; computed: NativeStyle }
    | undefined;
  const effectiveStyle = (state: PressableStateCallbackType): StyleProp<NativeStyle> => {
    let authored: StyleProp<NativeStyle>;
    let resolved: NativeStyle;
    if (_muiNativeStyle) {
      ({ computed: resolved, authored } = _muiNativeStyle(stateFor(state), baseSheet));
    } else if (typeof style === 'function') {
      const input = style(stateFor(state));
      if (styleCache && styleCache.input === input) {
        resolved = styleCache.computed;
        authored = styleCache.authored;
      } else {
        if (_muiNativeClassMetadata) {
          const root = componentRootStyle(
            theme,
            'MuiButtonBase',
            ownerState,
            sx,
            input,
            styleContext,
          );
          resolved = root.computed;
          authored = root.authored;
        } else {
          authored = input;
          resolved = componentStyle(theme, 'MuiButtonBase', ownerState, sx, {
            ...styleContext,
            ...nativeTextStyleContext(parent, authored, theme),
          });
        }
        styleCache = { input, authored, computed: resolved };
      }
    } else {
      authored = style;
      resolved = computed!;
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
    classes,
    className,
    focusVisibleClassName,
    centerRipple,
    TouchRippleProps,
    touchRippleRef,
    nativeButton,
    type,
    formAction,
    ...host
  } = native as typeof native & Record<string, unknown>;
  if (classes || (className && className !== _muiNativeClassName) || focusVisibleClassName)
    diagnostic(
      'button-classes',
      'Use native ButtonBase sx state selectors or style callbacks instead of CSS classes.',
    );
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
    <Root
      {...host}
      {...(Root === NativePressable || Root === View || Root === Text || !_muiNativeClassMetadata
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
        disabled ||
        (_muiNativeClassMetadata && composedClassName?.split(/\s+/).includes('Mui-disabled'))
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
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={(state) => viewStyle(effectiveStyle(state))}
    >
      {(state) => (
        <NativeTextScope
          rootRef={node}
          theme={theme}
          style={effectiveStyle(state)}
          content={typeof children === 'function' ? children(stateFor(state)) : children}
        >
          {(_style, content) => content}
        </NativeTextScope>
      )}
    </Root>
  );
});
