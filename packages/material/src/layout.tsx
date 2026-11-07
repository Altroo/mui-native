// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { forwardRef } from 'react';
import { Typography, type TypographyProps } from './typography';
export * from './typography';
export * from './paper';
import type { ViewInstance } from 'react-native';
import { Box, type BoxProps } from './nativeBox';
export * from './nativeBox';
import {
  useDefaultProps,
  type SpacingArgument,
  type ResponsiveStyleValue,
} from '@altroo/mui-native-system';
export interface StackProps extends BoxProps {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  spacing?: ResponsiveStyleValue<SpacingArgument>;
  divider?: React.ReactNode;
}
export const Stack: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<StackProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, StackProps>(function Stack(inProps, ref) {
  const {
    direction = 'column',
    spacing = 0,
    divider,
    children,
    sx,
    ...props
  } = useDefaultProps({ props: inProps, name: 'MuiStack' });

  const items = React.Children.toArray(children);
  return (
    <Box
      {...props}
      ref={ref}
      sx={[{ flexDirection: direction, gap: spacing }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {items.map((child, index) => (
        <React.Fragment key={React.isValidElement(child) ? child.key : index}>
          {index > 0 ? divider : null}
          {child}
        </React.Fragment>
      ))}
    </Box>
  );
});
export * from './card';
export const CardContent: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<BoxProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, BoxProps>(function CardContent(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiCardContent' });

  return <Box {...props} ref={ref} style={[{ padding: 16, paddingBottom: 24 }, props.style]} />;
});
export const CardActions: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<BoxProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, BoxProps>(function CardActions(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiCardActions' });

  return (
    <Stack
      {...props}
      ref={ref}
      direction="row"
      style={[{ padding: 8, alignItems: 'center' }, props.style]}
    />
  );
});
export * from './divider';
export function DialogTitle(inProps: TypographyProps) {
  const props = useDefaultProps({ props: inProps, name: 'MuiDialogTitle' });

  return (
    <Typography
      {...props}
      variant={props.variant ?? 'h6'}
      style={[{ padding: 24, paddingBottom: 16 }, props.style]}
    />
  );
}
export function DialogContent(inProps: BoxProps) {
  const props = useDefaultProps({ props: inProps, name: 'MuiDialogContent' });

  return <Box {...props} style={[{ paddingHorizontal: 24, paddingBottom: 20 }, props.style]} />;
}
export function DialogActions(inProps: BoxProps) {
  const props = useDefaultProps({ props: inProps, name: 'MuiDialogActions' });

  return (
    <Stack
      {...props}
      direction="row"
      spacing={1}
      style={[{ justifyContent: 'flex-end', padding: 8 }, props.style]}
    />
  );
}
