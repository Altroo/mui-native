import React, { forwardRef } from 'react';
import {
  Pressable,
  View,
  type ViewInstance,
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
  loading?: boolean | null;
  loadingIndicator?: React.ReactNode;
  loadingPosition?: 'start' | 'end' | 'center';
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
export const Button: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ButtonProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, ButtonProps>(function Button(inProps, ref) {
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
    loading = null,
    loadingIndicator,
    loadingPosition = 'center',
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
  const isLoading = loading === true;
  const inactive = disabled || isLoading;
  const hideContent = isLoading && loadingPosition === 'center';
  const accessibleName =
    label ??
    native.accessibilityLabel ??
    (typeof children === 'string' || typeof children === 'number' ? String(children) : undefined);
  const resolved = useComponentStyle(
    'MuiButton',
    { ...props, variant, color, size, disabled, loading, loadingPosition },
    sx,
    { states: [...(inactive ? ['disabled'] : []), ...(isLoading ? ['loading'] : [])] },
  );
  const textStyle = Object.fromEntries(
    Object.entries(resolved).filter(([k]) => textKeys.has(k)),
  ) as TextStyle;
  const viewStyle = Object.fromEntries(Object.entries(resolved).filter(([k]) => !textKeys.has(k)));
  const foregroundColor = inactive
    ? theme.palette.action.disabled
    : variant === 'contained'
      ? activeColor.contrastText
      : activeColor.main;
  const indicator = loadingIndicator ?? (
    <ActivityIndicator
      size="small"
      color={textStyle.color ?? foregroundColor}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibleName ?? 'Loading'}
    />
  );
  const renderNode = (node: React.ReactNode) =>
    typeof node === 'string' || typeof node === 'number' ? (
      <Text style={[theme.typography.button, { color: foregroundColor }, textStyle]}>{node}</Text>
    ) : (
      node
    );
  const renderIcon = (icon: React.ReactNode, position: 'start' | 'end') => {
    const replace = isLoading && loadingPosition === position;
    const hasIcon = icon != null && typeof icon !== 'boolean' && icon !== '';
    if (!hasIcon && !replace) return null;
    return (
      <View
        style={{
          minWidth: 20,
          minHeight: 20,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: hideContent ? 0 : 1,
        }}
      >
        {hasIcon ? <View style={{ opacity: replace ? 0 : 1 }}>{renderNode(icon)}</View> : null}
        {replace ? (
          <View
            pointerEvents="none"
            style={
              hasIcon
                ? {
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    start: 0,
                    end: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }
                : undefined
            }
          >
            {renderNode(indicator)}
          </View>
        ) : null}
      </View>
    );
  };
  return (
    <Pressable
      {...native}
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibleName}
      accessibilityState={{ ...native.accessibilityState, disabled: inactive, busy: isLoading }}
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
      {renderIcon(startIcon, 'start')}
      <Text
        style={[
          theme.typography.button,
          {
            color: foregroundColor,
            textTransform: 'uppercase',
            flexShrink: 1,
            ...(hideContent ? { opacity: 0 } : {}),
          },
          textStyle,
        ]}
      >
        {children}
      </Text>
      {renderIcon(endIcon, 'end')}
      {isLoading && loadingPosition === 'center' ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            start: 0,
            end: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {renderNode(indicator)}
        </View>
      ) : null}
    </Pressable>
  );
});
export const IconButton: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ButtonProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, ButtonProps>(function IconButton(props, ref) {
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
