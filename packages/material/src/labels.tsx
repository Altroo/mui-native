import { useTheme, useSx, useComponentStyle } from './themeProvider';
import React, {
  forwardRef,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Text,
  Animated,
  I18nManager,
  StyleSheet,
  type TextInstance,
  type TextProps,
  type TextStyle,
  type GestureResponderEvent,
} from 'react-native';
import { useDefaultProps, getTextStyleInheritance, type SxProps } from '@altroo/mui-native-system';
import { FormContext, nativeLabelText, type NativeHelperRegistration } from './formState';
import { nativeInsets } from './nativeInsets';
import { useNativeReducedMotion } from './motionPreference';
import { nativeEasing } from './nativeTransitionTiming';
import type { NativeTypographyComponent } from './typography';
export interface FormLabelPropsColorOverrides {}
export interface InputLabelPropsSizeOverrides {}
export interface FormHelperTextPropsVariantOverrides {}
type Augmented<Base extends string, Extra> = Extract<
  {
    [K in keyof (Omit<Record<Base, true>, keyof Extra> & Extra)]: true extends (Omit<
      Record<Base, true>,
      keyof Extra
    > &
      Extra)[K]
      ? K
      : never;
  }[keyof (Omit<Record<Base, true>, keyof Extra> & Extra)],
  string
>;
type FieldVariant = 'standard' | 'outlined' | 'filled';
export interface FormLabelProps extends TextProps {
  sx?: SxProps;
  component?: NativeTypographyComponent | 'label' | 'legend' | 'span' | 'p' | 'div';
  color?: string;
  disabled?: boolean;
  error?: boolean;
  filled?: boolean;
  focused?: boolean;
  required?: boolean;
  id?: string;
  htmlFor?: string;
  onClick?: (event: GestureResponderEvent) => void;
}
export type FormLabelBaseProps = FormLabelProps;
export type FormLabelOwnProps = FormLabelProps;
export interface InputLabelProps extends FormLabelProps {
  disableAnimation?: boolean;
  margin?: 'dense';
  shrink?: boolean;
  size?: Augmented<'small' | 'medium', InputLabelPropsSizeOverrides>;
  variant?: FieldVariant;
}
export type InputLabelOwnProps = InputLabelProps;
export interface FormHelperTextProps extends Omit<FormLabelProps, 'htmlFor'> {
  margin?: 'dense';
  variant?: Augmented<FieldVariant, FormHelperTextPropsVariantOverrides>;
}
export type FormHelperTextOwnProps = FormHelperTextProps;
function useLabelState(props: FormLabelProps) {
  const form = useContext(FormContext);
  return {
    ...props,
    color: props.color ?? form?.color ?? 'primary',
    disabled: props.disabled ?? form?.disabled,
    error: props.error ?? form?.error,
    filled: props.filled ?? form?.filled,
    focused: props.focused ?? form?.focused,
    required: props.required ?? form?.required,
  };
}
function slotOverride(
  theme: import('@altroo/mui-native-system').Theme,
  name: string,
  slot: string,
  ownerState: object,
) {
  const config = theme.components[name];
  const value = config && typeof config === 'object' ? config.styleOverrides?.[slot] : undefined;
  return typeof value === 'function'
    ? value({ theme, ownerState: ownerState as Record<string, unknown> })
    : value;
}
function NativeFormLabel({
  inProps,
  labelRef,
  asteriskSx,
}: {
  inProps: FormLabelProps;
  labelRef: React.ForwardedRef<TextInstance>;
  asteriskSx?: SxProps;
}) {
  const props = useDefaultProps({ props: inProps, name: 'MuiFormLabel' });
  const state = useLabelState(props);
  const form = useContext(FormContext);
  const theme = useTheme();
  const {
    children,
    sx,
    style,
    component,
    color,
    disabled,
    error,
    filled,
    focused,
    required,
    id,
    htmlFor,
    onPress,
    onClick,
    ...native
  } = props;
  const entry = (theme.palette as unknown as Record<string, { main?: string }>)[state.color];
  const displayColor = state.error
    ? theme.palette.error.main
    : state.disabled
      ? theme.palette.text.disabled
      : entry?.main
        ? state.focused
          ? entry.main
          : theme.palette.text.secondary
        : (color ?? theme.palette.text.secondary);
  const resolved = useComponentStyle('MuiFormLabel', state, sx, {
    states: [
      ...(state.focused ? ['focused'] : []),
      ...(state.disabled ? ['disabled'] : []),
      ...(state.error ? ['error'] : []),
    ],
    overrideKeys: [
      ...(state.color === 'secondary' ? ['colorSecondary'] : []),
      ...(state.filled ? ['filled'] : []),
    ],
    nativeStyle: StyleSheet.flatten(style) ?? undefined,
    baseStyle: {
      typography: 'body1',
      lineHeight: 1.4375,
      color: displayColor,
      padding: 0,
      position: 'relative',
    },
  });
  const asterisk = useSx(
    [slotOverride(theme, 'MuiFormLabel', 'asterisk', state), asteriskSx].flat() as SxProps,
    {
      inheritOnly: true,
      parentTextStyle: StyleSheet.flatten([resolved, style]) ?? undefined,
      parentLineHeight: getTextStyleInheritance(resolved as TextStyle).lineHeight,
    },
  );
  const Component =
    typeof component === 'function' || typeof component === 'object' ? component : Text;
  return (
    <Component
      {...native}
      ref={labelRef}
      nativeID={id ?? native.nativeID}
      accessibilityState={{ ...native.accessibilityState, disabled: state.disabled }}
      onPress={(event) => {
        (onPress ?? onClick)?.(event);
        if (!state.disabled && !event.defaultPrevented) form?.focusInput?.(htmlFor);
      }}
      style={[
        resolved,
        style,
        nativeInsets(StyleSheet.flatten(style), 'margin'),
        nativeInsets(StyleSheet.flatten(style), 'padding'),
      ]}
    >
      {children}
      {state.required ? (
        <Text
          accessible={false}
          style={[state.error ? { color: theme.palette.error.main } : undefined, asterisk]}
        >
          {'\u2009'}*
        </Text>
      ) : null}
    </Component>
  );
}
export const FormLabel: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<FormLabelProps> & React.RefAttributes<TextInstance>
> = forwardRef((props, ref) => <NativeFormLabel inProps={props} labelRef={ref} />);
export const InputLabel: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<InputLabelProps> & React.RefAttributes<TextInstance>
> = forwardRef(function InputLabel(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiInputLabel' });
  const form = useContext(FormContext);
  const theme = useTheme();
  const {
    disableAnimation = false,
    shrink: shrinkProp,
    variant = form?.variant,
    size = form?.size,
    margin: _margin,
    style,
    sx,
    component,
    id,
    htmlFor,
    children,
    ...native
  } = props;
  const shrink =
    shrinkProp ?? (form ? Boolean(form.filled || form.focused || form.adornedStart) : undefined);
  const floating = Boolean(form) && form?.labelDisplay !== 'stacked';
  const transformsLabel =
    form?.labelDisplay !== 'stacked' &&
    (Boolean(form) || Boolean(shrink) || Boolean(variant) || size === 'small');
  const flags = useLabelState(props);
  const state = {
    ...props,
    disableAnimation,
    shrink,
    variant,
    size,
    formControl: form,
    focused: flags.focused,
    required: flags.required,
  };
  const [progress] = useState(() => new Animated.Value(shrink ? 1 : 0));
  const [expandedWidth, setExpandedWidth] = useState(Boolean(shrink));
  const target = useRef(shrink ? 1 : 0);
  useLayoutEffect(() => {
    target.current = shrink ? 1 : 0;
  }, [shrink]);
  const previousTarget = useRef(shrink ? 1 : 0);
  const reducedMotion = useNativeReducedMotion(
    theme.motion?.reducedMotion,
    disableAnimation || !transformsLabel,
  );
  useEffect(() => {
    let active = true;
    progress.stopAnimation();
    const next = shrink ? 1 : 0;
    if (previousTarget.current === next || disableAnimation || reducedMotion || !transformsLabel) {
      progress.setValue(next);
      setExpandedWidth(Boolean(shrink));
    } else {
      setExpandedWidth(false);
      Animated.timing(progress, {
        toValue: next,
        duration: theme.transitions.duration.shorter,
        easing: nativeEasing(theme.transitions.easing.easeOut),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && active) setExpandedWidth(Boolean(shrink));
      });
    }
    previousTarget.current = next;
    return () => {
      active = false;
      progress.stopAnimation();
    };
  }, [
    disableAnimation,
    transformsLabel,
    shrink,
    progress,
    reducedMotion,
    theme.transitions.duration.shorter,
    theme.transitions.easing.easeOut,
  ]);
  const text = nativeLabelText(children);
  const nativeID = id ?? props.nativeID;
  useLayoutEffect(
    () =>
      form?.registerLabel?.({
        id: nativeID,
        htmlFor,
        text: text?.trim() || undefined,
        shrink: shrinkProp,
      }),
    [form?.registerLabel, nativeID, htmlFor, text, shrinkProp],
  );
  const inset = variant === 'outlined' ? 14 : variant === 'filled' ? 12 : 0;
  const normalY =
    variant === 'outlined'
      ? size === 'small'
        ? 9
        : 16
      : variant === 'filled'
        ? size === 'small'
          ? 13
          : 16
        : floating
          ? size === 'small'
            ? 17
            : 20
          : 0;
  const shrinkY =
    variant === 'outlined' ? -9 : variant === 'filled' ? (size === 'small' ? 4 : 7) : -1.5;
  const transform = useMemo(
    () => [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [normalY, shrinkY] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] }) },
    ],
    [progress, normalY, shrinkY],
  );
  const resolved = useComponentStyle('MuiInputLabel', state, sx, {
    inheritOnly: true,
    states: [
      ...(state.focused ? ['focused'] : []),
      ...(flags.disabled ? ['disabled'] : []),
      ...(flags.error ? ['error'] : []),
    ],
    overrideKeys: [
      ...(form ? ['formControl'] : []),
      ...(size === 'small' ? ['sizeSmall'] : []),
      ...(shrink ? ['shrink'] : []),
      ...(!disableAnimation ? ['animated'] : []),
      ...(flags.focused ? ['focused'] : []),
      ...(variant ? [variant] : []),
    ],
  });
  const Root = typeof component === 'string' || !component ? Text : component;
  const AnimatedRoot = useMemo(
    () => (Root === Text ? Animated.Text : Animated.createAnimatedComponent(Root)),
    [Root],
  );
  const width = form?.width
    ? Math.max(0, form.width - inset * 2) / (shrink && expandedWidth ? 0.75 : 1)
    : undefined;
  const animatedStyle: TextStyle = {
    position: floating ? 'absolute' : 'relative',
    top: floating ? 0 : undefined,
    start: floating ? inset : undefined,
    end: floating && form?.width === undefined ? inset : undefined,
    zIndex: 1,
    maxWidth: width ?? (shrink && expandedWidth && transformsLabel ? '133.33%' : '100%'),
    transformOrigin: [I18nManager.isRTL ? '100%' : 0, 0, 0],
    transform: transformsLabel ? (transform as unknown as TextStyle['transform']) : undefined,
  };
  return (
    <NativeFormLabel
      labelRef={ref}
      asteriskSx={slotOverride(theme, 'MuiInputLabel', 'asterisk', state)}
      inProps={{
        ...native,
        children,
        htmlFor,
        id: nativeID,
        accessible: props.accessible ?? (form ? false : undefined),
        numberOfLines: props.numberOfLines ?? 1,
        component: AnimatedRoot as unknown as NativeTypographyComponent,
        style: [
          animatedStyle,
          resolved,
          style,
          nativeInsets(StyleSheet.flatten(style), 'margin'),
          nativeInsets(StyleSheet.flatten(style), 'padding'),
        ],
      }}
    />
  );
});
export const FormHelperText: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<FormHelperTextProps> & React.RefAttributes<TextInstance>
> = forwardRef(function FormHelperText(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiFormHelperText' });
  const form = useContext(FormContext);
  const theme = useTheme();
  const state = useLabelState(props);
  const {
    children,
    variant = form?.variant,
    margin: _margin,
    sx,
    style,
    component,
    color,
    id,
    onClick,
    disabled: _disabled,
    error: _error,
    filled: _filled,
    focused: _focused,
    required: _required,
    ...native
  } = props;
  const ownerState = {
    ...state,
    variant,
    size: form?.size,
    contained: variant === 'filled' || variant === 'outlined',
  };
  const resolved = useComponentStyle('MuiFormHelperText', ownerState, sx, {
    nativeStyle: StyleSheet.flatten(style) ?? undefined,
    states: [
      ...(state.disabled ? ['disabled'] : []),
      ...(state.error ? ['error'] : []),
      ...(state.focused ? ['focused'] : []),
    ],
    overrideKeys: [
      ...(form?.size && form.size !== 'medium'
        ? [`size${form.size[0].toUpperCase()}${form.size.slice(1)}`]
        : []),
      ...(ownerState.contained ? ['contained'] : []),
      ...(state.filled ? ['filled'] : []),
    ],
    baseStyle: {
      typography: 'caption',
      color: state.error
        ? theme.palette.error.main
        : state.disabled
          ? theme.palette.text.disabled
          : (color ?? theme.palette.text.secondary),
      marginTop: form?.size === 'small' ? 4 : 3,
      marginLeft: ownerState.contained ? 14 : 0,
      marginRight: ownerState.contained ? 14 : 0,
      marginBottom: 0,
    },
  });
  const text = nativeLabelText(children);
  const nativeID = id ?? native.nativeID;
  const registration = useRef<NativeHelperRegistration | undefined>(undefined);
  // Keep the mounted registration's order; description changes update it below.
  useLayoutEffect(() => {
    const current = form?.registerHelper?.({ id: nativeID, text: text?.trim() || undefined });
    registration.current = current;
    return () => {
      current?.remove();
      if (registration.current === current) registration.current = undefined;
    };
  }, [form?.registerHelper]);
  useLayoutEffect(() => {
    registration.current?.update({ id: nativeID, text: text?.trim() || undefined });
  }, [nativeID, text, form?.registerHelper]);
  const Component =
    typeof component === 'function' || typeof component === 'object' ? component : Text;
  return (
    <Component
      {...native}
      ref={ref}
      nativeID={nativeID}
      onPress={native.onPress ?? onClick}
      accessible={children === ' ' ? false : native.accessible}
      style={[
        resolved,
        style,
        nativeInsets(StyleSheet.flatten(style), 'margin'),
        nativeInsets(StyleSheet.flatten(style), 'padding'),
      ]}
    >
      {children === ' ' ? '\u200b' : children}
    </Component>
  );
});
