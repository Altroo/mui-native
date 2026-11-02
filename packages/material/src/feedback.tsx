import React, { useEffect } from 'react';
import {
  View,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  AppState,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import {
  useTheme,
  useDefaultProps,
  resolveSx,
  diagnostic,
  type SxProps,
  type Breakpoint,
} from '@altroo/mui-native-system';
import { Box, Paper, Typography, Stack, type BoxProps } from './layout';
import { Button } from './buttons';
export interface DialogProps extends BoxProps {
  open: boolean;
  onClose?: (
    event: GestureResponderEvent | null,
    reason: 'backdropClick' | 'escapeKeyDown',
  ) => void;
  disableEscapeKeyDown?: boolean;
  fullWidth?: boolean;
  fullScreen?: boolean;
  maxWidth?: Breakpoint | false;
}
export function Dialog(inProps: DialogProps) {
  const {
    open,
    onClose,
    disableEscapeKeyDown,
    fullWidth,
    fullScreen,
    maxWidth = 'sm' as Breakpoint,
    children,
    sx,
    ...props
  } = useDefaultProps({ props: inProps, name: 'MuiDialog' });

  const theme = useTheme();
  const { width } = useWindowDimensions();
  const availableWidth = Math.max(0, width - 48);
  const unit = theme.breakpoints.unit ?? 'px';
  const multiplier =
    unit === 'px'
      ? 1
      : unit === 'rem'
        ? theme.typography.htmlFontSize
        : unit === 'em'
          ? (resolveSx(theme.typography.body1, theme, { mode: 'css' }).fontSize ?? 16)
          : undefined;
  const configuredWidth = maxWidth ? theme.breakpoints.values[maxWidth] : undefined;
  if (maxWidth && configuredWidth !== undefined && multiplier === undefined)
    diagnostic('breakpoint-unit', `Unsupported native Dialog breakpoint unit: ${unit}`);
  const scaledWidth =
    configuredWidth !== undefined && multiplier !== undefined
      ? configuredWidth * multiplier
      : availableWidth;
  const maximumWidth = Number.isFinite(scaledWidth)
    ? maxWidth === 'xs'
      ? Math.max(scaledWidth, 444)
      : Math.max(0, scaledWidth)
    : availableWidth;
  return (
    <Modal
      visible={open}
      transparent={!fullScreen}
      animationType="fade"
      onRequestClose={() => {
        if (!disableEscapeKeyDown) onClose?.(null, 'escapeKeyDown');
      }}
    >
      <KeyboardAvoidingView
        accessibilityViewIsModal
        onAccessibilityEscape={() => {
          if (!disableEscapeKeyDown) onClose?.(null, 'escapeKeyDown');
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <Pressable
          accessibilityLabel="Dismiss dialog"
          accessibilityRole="button"
          onPress={(e) => onClose?.(e, 'backdropClick')}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        />
        <Paper
          {...props}
          sx={sx}
          style={[
            {
              margin: fullScreen ? 0 : 24,
              width: fullScreen ? '100%' : fullWidth ? availableWidth : undefined,
              minWidth: fullScreen ? undefined : Math.min(280, availableWidth, maximumWidth),
              maxWidth: fullScreen ? undefined : Math.min(availableWidth, maximumWidth),
              ...(fullScreen ? { borderRadius: 0 } : {}),
              alignSelf: fullScreen ? 'stretch' : undefined,
              flex: fullScreen ? 1 : undefined,
            },
            props.style,
          ]}
        >
          {children}
        </Paper>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export interface AlertProps extends BoxProps {
  severity?: 'error' | 'warning' | 'info' | 'success';
  onClose?: () => void;
  action?: React.ReactNode;
}
export function Alert(inProps: AlertProps) {
  const {
    severity = 'success',
    children,
    onClose,
    action,
    ...props
  } = useDefaultProps({ props: inProps, name: 'MuiAlert' });

  const theme = useTheme();
  return (
    <Stack
      {...props}
      direction="row"
      accessibilityRole="alert"
      style={[
        {
          padding: 16,
          gap: 12,
          borderWidth: 1,
          borderColor: theme.palette[severity].main,
          borderRadius: theme.shape.borderRadius,
          alignItems: 'center',
        },
        props.style,
      ]}
    >
      <Typography style={{ flex: 1, color: theme.palette[severity].main }}>{children}</Typography>
      {action ??
        (onClose ? (
          <Button onClick={onClose} aria-label="Close alert">
            ×
          </Button>
        ) : null)}
    </Stack>
  );
}
export interface ProgressProps {
  variant?: 'indeterminate' | 'determinate';
  value?: number;
  size?: number;
  sx?: SxProps;
  'aria-label'?: string;
}
export function CircularProgress(inProps: Omit<ProgressProps, 'variant' | 'value'>) {
  const { size = 40, 'aria-label': label = 'Loading' } = useDefaultProps({
    props: inProps,
    name: 'MuiCircularProgress',
  });

  const theme = useTheme();
  return (
    <ActivityIndicator
      size={size}
      color={theme.palette.primary.main}
      accessibilityLabel={label}
      accessibilityRole="progressbar"
    />
  );
}
export function LinearProgress(inProps: ProgressProps) {
  const {
    variant = 'indeterminate',
    value = 0,
    sx,
    'aria-label': label = 'Loading',
  } = useDefaultProps({ props: inProps, name: 'MuiLinearProgress' });

  const theme = useTheme();
  return (
    <Box
      sx={sx}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={
        variant === 'determinate'
          ? { min: 0, max: 100, now: Math.min(100, Math.max(0, value)) }
          : undefined
      }
      style={{ height: 4, overflow: 'hidden', backgroundColor: theme.palette.primary.light }}
    >
      {variant === 'indeterminate' ? (
        <ActivityIndicator color={theme.palette.primary.main} />
      ) : (
        <View
          style={{
            height: 4,
            width: `${Math.min(100, Math.max(0, value))}%`,
            backgroundColor: theme.palette.primary.main,
          }}
        />
      )}
    </Box>
  );
}
export interface SnackbarProps {
  open: boolean;
  message?: React.ReactNode;
  action?: React.ReactNode;
  autoHideDuration?: number | null;
  onClose?: (event: null, reason: 'timeout') => void;
  children?: React.ReactNode;
}
export function Snackbar(inProps: SnackbarProps) {
  const {
    open,
    message,
    action,
    autoHideDuration = null,
    onClose,
    children,
  } = useDefaultProps({ props: inProps, name: 'MuiSnackbar' });

  useEffect(() => {
    if (!open || autoHideDuration == null) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onClose?.(null, 'timeout'), autoHideDuration);
    };
    start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else clearTimeout(timer);
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [open, autoHideDuration, onClose]);
  if (!open) return null;
  return (
    <Paper
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', bottom: 24, left: 16, right: 16, padding: 16, elevation: 6 }}
    >
      {children ?? (
        <Stack direction="row" style={{ alignItems: 'center' }}>
          <Typography style={{ flex: 1 }}>{message}</Typography>
          {action}
        </Stack>
      )}
    </Paper>
  );
}
