import React, { forwardRef } from 'react';
import {
  Pressable,
  View,
  Text,
  ActivityIndicator,
  type GestureResponderEvent,
  type PressableProps,
  type TextStyle,
} from 'react-native';
import {
  useTheme,
  useThemeProps,
  useComponentStyle,
  type SxProps,
} from '@altroo/mui-native-system';
export interface ButtonProps extends Omit<PressableProps, 'children' | 'style' | 'onPress'> {
  children?: React.ReactNode;
  sx?: SxProps;
  style?: PressableProps['style'];
  onClick?: (event: GestureResponderEvent) => void;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' | 'inherit';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  loading?: boolean;
  disableElevation?: boolean;
  'aria-label'?: string;
}
const textKeys = new Set([
  'color',
  'fontSize',
  'fontWeight',
  'fontFamily',
  'lineHeight',
  'letterSpacing',
  'textTransform',
  'textAlign',
]);
export const Button = forwardRef<View, ButtonProps>(function Button(inProps, ref) {
  const props = useThemeProps({ props: inProps, name: 'MuiButton' });
  const {
    children,
    sx,
    onClick,
    onPress,
    variant = 'text',
    color = 'primary',
    size = 'medium',
    fullWidth,
    startIcon,
    endIcon,
    loading = false,
    disabled = false,
    disableElevation,
    style,
    'aria-label': label,
    ...native
  } = props;
  const theme = useTheme();
  const activeColor =
    color === 'inherit'
      ? { main: theme.palette.text.primary, contrastText: theme.palette.background.paper }
      : theme.palette[color];
  const inactive = disabled || loading;
  const resolved = useComponentStyle(
    'MuiButton',
    { ...props, variant, color, size, disabled: inactive },
    sx,
    { states: inactive ? ['disabled'] : [] },
  );
  const textStyle = Object.fromEntries(
    Object.entries(resolved).filter(([k]) => textKeys.has(k)),
  ) as TextStyle;
  const viewStyle = Object.fromEntries(Object.entries(resolved).filter(([k]) => !textKeys.has(k)));
  return (
    <Pressable
      {...native}
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={label ?? native.accessibilityLabel}
      accessibilityState={{ ...native.accessibilityState, disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress ?? onClick}
      style={(state) => [
        {
          minHeight: 44,
          minWidth: 64,
          paddingHorizontal: size === 'small' ? 10 : size === 'large' ? 22 : 16,
          paddingVertical: size === 'small' ? 4 : size === 'large' ? 8 : 6,
          flexDirection: 'row',
          gap: 8,
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          borderRadius: theme.shape.borderRadius,
          backgroundColor:
            variant === 'contained'
              ? inactive
                ? theme.palette.action.disabledBackground
                : activeColor.main
              : 'transparent',
          borderWidth: variant === 'outlined' ? 1 : 0,
          borderColor: inactive ? theme.palette.action.disabledBackground : activeColor.main,
          opacity: state.pressed ? 0.8 : 1,
          elevation: variant === 'contained' && !disableElevation && !inactive ? 2 : 0,
        },
        viewStyle,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {startIcon}
      {loading ? (
        <ActivityIndicator color={activeColor.contrastText} accessibilityLabel="Loading" />
      ) : null}
      <Text
        style={[
          theme.typography.button,
          {
            color: inactive
              ? theme.palette.action.disabled
              : variant === 'contained'
                ? activeColor.contrastText
                : activeColor.main,
            textTransform: 'uppercase',
          },
          textStyle,
        ]}
      >
        {children}
      </Text>
      {endIcon}
    </Pressable>
  );
});
export const IconButton = forwardRef<View, ButtonProps>(function IconButton(props, ref) {
  return (
    <Button
      {...props}
      ref={ref}
      style={(state) => [
        { minWidth: 44, width: 44, height: 44, padding: 8, borderRadius: 22 },
        typeof props.style === 'function' ? props.style(state) : props.style,
      ]}
    />
  );
});
