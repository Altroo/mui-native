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
  StyleSheet,
  Platform,
  Linking,
  type PressableProps,
  type PressableStateCallbackType,
  type ViewInstance,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import {
  useDefaultProps,
  NativeTextScope,
  useNativeTextContext,
  nativeTextStyleContext,
  isNativeTextStyleProperty,
  diagnostic,
  type SxProps,
  type NativeStyle,
} from '@altroo/mui-native-system';
import { useComponentStyle, useTheme } from './themeProvider';
import { useForkRef } from './utils';
import {
  buttonKeyEvent,
  buttonActivationEvent,
  isButtonEventPrevented,
  type ButtonBaseKeyEvent,
  type ButtonBaseActivationEvent,
} from './nativeButtonEvents';
import { NativePressable } from '@altroo/mui-native-host';
import { NativeButtonActivationKeys } from './nativeButtonActivationKeys';
import { NativeCompositeKeys } from './nativeCompositeKeys';
import { useNativeButtonAutoFocus } from './useNativeButtonAutoFocus';
import { useMenuEvent } from './useMenuEvent';
import { nativeButtonModality } from './nativeButtonModality';
export type { ButtonBaseKeyEvent, ButtonBaseActivationEvent } from './nativeButtonEvents';
export interface ButtonBaseActions {
  focusVisible(): void;
}
export interface ButtonBaseState extends PressableStateCallbackType {
  focusVisible: boolean;
  disabled: boolean;
}
export interface ButtonBaseRootProps extends PressableProps {
  ref?: React.Ref<ViewInstance>;
  href?: string;
  to?: unknown;
}
export interface ButtonBaseOwnProps {
  disabled?: boolean;
  autoFocus?: boolean;
  ref?: React.Ref<ViewInstance>;
  action?: React.Ref<ButtonBaseActions>;
  children?: React.ReactNode | ((state: ButtonBaseState) => React.ReactNode);
  sx?: SxProps;
  style?: StyleProp<NativeStyle> | ((state: ButtonBaseState) => StyleProp<NativeStyle>);
  component?: React.ComponentType<ButtonBaseRootProps>;
  LinkComponent?: React.ComponentType<ButtonBaseRootProps>;
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
    Object.fromEntries(Object.entries(flattened).filter(([key]) => !isNativeTextStyleProperty(key)))
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
  if ((disabled || suppressFocusVisible) && focused) setFocused(false);
  const theme = useTheme(),
    parent = useNativeTextContext();
  const isLink = Boolean(href || to);
  const chosen = component === Pressable ? NativePressable : component;
  const link = LinkComponent === Pressable ? NativePressable : LinkComponent;
  const Root =
    !chosen || chosen === NativePressable
      ? ((isLink ? link : undefined) ?? NativePressable)
      : chosen;
  const ownedLink = Root === NativePressable && Boolean(href);
  const staticStyle = typeof style === 'function' ? undefined : style;
  const computed = useComponentStyle(
    'MuiButtonBase',
    { ...props, disabled, disableRipple, disableTouchRipple, focusRipple, tabIndex, focusVisible },
    sx,
    {
      ...nativeTextStyleContext(parent, staticStyle, theme),
      states: [...(disabled ? ['disabled'] : []), ...(focusVisible ? ['focusVisible'] : [])],
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
      },
    },
  );
  useImperativeHandle(
    action,
    () => ({
      focusVisible() {
        setFocused(true);
        node.current?.focus();
      },
    }),
    [],
  );
  const activate = useMenuEvent((event: ButtonBaseActivationEvent) => {
    if (!mounted.current || disabled || node.current?.isConnected === false) {
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
    focusVisible,
    disabled,
  });
  const effectiveStyle = (state: PressableStateCallbackType): StyleProp<NativeStyle> => [
    computed,
    focusVisible && focusRipple && !disableRipple
      ? { outlineWidth: 2, outlineColor: theme.palette.primary.main, outlineStyle: 'solid' }
      : undefined,
    Platform.OS !== 'android' && state.pressed && !disabled && !disableRipple && !disableTouchRipple
      ? { opacity: (typeof computed.opacity === 'number' ? computed.opacity : 1) * 0.8 }
      : undefined,
    typeof style === 'function' ? style(stateFor(state)) : style,
  ];
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
  if (classes || className || focusVisibleClassName)
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
    if (!mounted.current) return;
    nativeButtonModality.keyboard();
    const key = buttonKeyEvent(event);
    if (disabled) {
      if (focusableWhenDisabled && key.key !== 'Tab' && !compositeKeys?.includes(key.key))
        key.preventDefault();
      return;
    }
    onKeyDown?.(key);
    if (key.target !== key.currentTarget || key.isComposing || key.isCanceled) return;
    if (key.key === ' ' && activationKeys.includes(' ')) key.preventDefault();
    else if (key.key === 'Enter' && activationKeys.includes('Enter')) {
      key.preventDefault();
      activate(buttonActivationEvent(key));
    }
  });
  const handleKeyUp = useMenuEvent((event) => {
    if (!mounted.current) return;
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
      {...(Root === NativePressable ? {} : { href, to })}
      ref={ref}
      accessibilityRole={native.accessibilityRole ?? (isLink ? 'link' : 'button')}
      accessibilityState={{ ...native.accessibilityState, disabled }}
      aria-disabled={disabled || native['aria-disabled']}
      disabled={disabled && focusableWhenDisabled ? undefined : disabled}
      pointerEvents={disabled ? 'none' : native.pointerEvents}
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
