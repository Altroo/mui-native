// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useTheme, useSx, useComponentStyle } from './themeProvider';
import React, { forwardRef } from 'react';
import { Typography, type TypographyProps } from './typography';
export * from './typography';
import { Paper, type PaperProps } from './paper';
export * from './paper';
import { View, type ViewInstance, type ViewProps, type StyleProp } from 'react-native';
import {
  useDefaultProps,
  NativeTextScope,
  useNativeTextRootRef,
  useNativeTextContext,
  nativeTextStyleContext,
  type NativeStyle,
  type SxProps,
  type SpacingArgument,
  type ResponsiveStyleValue,
} from '@altroo/mui-native-system';
export interface BoxProps extends Omit<ViewProps, 'style'> {
  style?: StyleProp<NativeStyle>;
  sx?: SxProps;
  component?: React.ComponentType<ViewProps & React.RefAttributes<ViewInstance>>;
}
export const Box: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<BoxProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, BoxProps>(function Box(
  { sx, style, children, component: Component = View, ...props },
  ref,
) {
  const { root, ref: rootRef } = useNativeTextRootRef(ref);
  const theme = useTheme();
  const parent = useNativeTextContext();
  const resolved = useSx(sx, nativeTextStyleContext(parent, style, theme));
  return (
    <NativeTextScope rootRef={root} theme={theme} style={[resolved, style]} content={children}>
      {(native, content) => (
        <Component {...props} ref={rootRef} style={native}>
          {content}
        </Component>
      )}
    </NativeTextScope>
  );
});
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
export const Card: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<PaperProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, PaperProps>(function Card(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiCard' });

  const resolved = useComponentStyle('MuiCard', props, props.sx);
  return (
    <Paper
      {...props}
      ref={ref}
      sx={undefined}
      style={[{ overflow: 'hidden' }, resolved, props.style]}
    />
  );
});
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
