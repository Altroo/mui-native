// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useTheme, useSx } from './themeProvider';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDefaultProps, type SxProps } from '@altroo/mui-native-system';
import { Paper, Typography, Stack, type BoxProps } from './layout';
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
  const shapeRadius = useSx({ borderRadius: 1 }).borderRadius;
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
          borderRadius: shapeRadius,
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
export { CircularProgress } from './circularProgress';
export type {
  CircularProgressProps,
  CircularProgressPropsColorOverrides,
  CircularProgressPropsVariantOverrides,
} from './circularProgressTypes';
export * from './circularProgressClasses';
export { LinearProgress } from './linearProgress';
export type {
  LinearProgressProps,
  LinearProgressPropsColorOverrides,
  LinearProgressPropsVariantOverrides,
} from './linearProgressTypes';
export * from './linearProgressClasses';
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
