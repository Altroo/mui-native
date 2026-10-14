import React, { useEffect } from 'react';
import {
  View,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  AppState,
  type GestureResponderEvent,
} from 'react-native';
import { useTheme, type SxProps } from '@altroo/mui-native-system';
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
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}
export function Dialog({
  open,
  onClose,
  disableEscapeKeyDown,
  fullWidth,
  fullScreen,
  maxWidth = 'sm',
  children,
  sx,
  ...props
}: DialogProps) {
  const theme = useTheme();
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
              width: fullScreen ? '100%' : fullWidth ? '90%' : undefined,
              minWidth: 280,
              maxWidth: maxWidth ? theme.breakpoints.values[maxWidth] : undefined,
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
export function Alert({ severity = 'success', children, onClose, action, ...props }: AlertProps) {
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
export function CircularProgress({
  size = 40,
  'aria-label': label = 'Loading',
}: Omit<ProgressProps, 'variant' | 'value'>) {
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
export function LinearProgress({
  variant = 'indeterminate',
  value = 0,
  sx,
  'aria-label': label = 'Loading',
}: ProgressProps) {
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
export function Snackbar({
  open,
  message,
  action,
  autoHideDuration = null,
  onClose,
  children,
}: SnackbarProps) {
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
