import { useTheme } from './themeProvider';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, AppState } from 'react-native';
import { useDefaultProps, type SxProps } from '@altroo/mui-native-system';
import { Box, Paper, Typography, Stack, type BoxProps } from './layout';
import { Button } from './buttons';
export { Dialog } from './dialog';
export type { DialogProps, DialogOwnerState, DialogSlots } from './dialog';
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
