import React, { forwardRef } from 'react';
import { Typography, type TypographyProps } from './typography';
export * from './typography';
import { View, type ViewInstance, type ViewProps } from 'react-native';
import {
  useTheme,
  useDefaultProps,
  useComponentStyle,
  useSx,
  type SxProps,
  type SpacingArgument,
  type ResponsiveStyleValue,
} from '@altroo/mui-native-system';
export interface BoxProps extends ViewProps {
  sx?: SxProps;
  component?: React.ComponentType<ViewProps & React.RefAttributes<ViewInstance>>;
}
export const Box: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<BoxProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, BoxProps>(function Box(
  { sx, style, component: Component = View, ...props },
  ref,
) {
  const resolved = useSx(sx);
  return <Component {...props} ref={ref} style={[resolved, style]} />;
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
export interface PaperProps extends BoxProps {
  elevation?: number;
  variant?: 'elevation' | 'outlined';
  square?: boolean;
}
export const Paper: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<PaperProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, PaperProps>(function Paper(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiPaper' });
  const { elevation = 1, variant = 'elevation', square = false, sx, style, ...rest } = props;
  const theme = useTheme();
  const shadow = useSx({ boxShadow: variant === 'elevation' ? elevation : 0 });
  const resolved = useComponentStyle('MuiPaper', { ...props, elevation, variant, square }, sx);
  return (
    <View
      {...rest}
      ref={ref}
      style={[
        {
          backgroundColor: theme.palette.background.paper,
          borderRadius: square ? 0 : theme.shape.borderRadius,
          ...(variant === 'outlined' ? { borderWidth: 1, borderColor: theme.palette.divider } : {}),
        },
        shadow,
        resolved,
        style,
      ]}
    />
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
export interface DividerProps extends BoxProps {
  orientation?: 'horizontal' | 'vertical';
  flexItem?: boolean;
}
export function Divider(inProps: DividerProps) {
  const {
    orientation = 'horizontal',
    flexItem,
    sx,
    style,
    ...props
  } = useDefaultProps({ props: inProps, name: 'MuiDivider' });

  const theme = useTheme();
  return (
    <Box
      {...props}
      sx={sx}
      style={[
        {
          backgroundColor: theme.palette.divider,
          ...(orientation === 'vertical'
            ? { width: 1, alignSelf: flexItem ? 'stretch' : undefined }
            : { height: 1, width: '100%' }),
        },
        style,
      ]}
    />
  );
}
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
