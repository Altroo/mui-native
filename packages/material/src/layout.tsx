import React, { forwardRef } from 'react';
import {
  View,
  Text,
  type ViewProps,
  type TextProps,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import {
  useTheme,
  useThemeProps,
  useComponentStyle,
  useSx,
  type SxProps,
  type TypographyVariant,
} from '@altroo/mui-native-system';
export interface BoxProps extends ViewProps {
  sx?: SxProps;
  component?: React.ComponentType<ViewProps & React.RefAttributes<View>>;
}
export const Box = forwardRef<View, BoxProps>(function Box(
  { sx, style, component: Component = View, ...props },
  ref,
) {
  const resolved = useSx(sx);
  return <Component {...props} ref={ref} style={[resolved, style]} />;
});
export interface StackProps extends BoxProps {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  spacing?: number;
  divider?: React.ReactNode;
}
export const Stack = forwardRef<View, StackProps>(function Stack(
  { direction = 'column', spacing = 0, divider, children, sx, ...props },
  ref,
) {
  const theme = useTheme();
  const gap = parseFloat(theme.spacing(spacing));
  const items = React.Children.toArray(children);
  return (
    <Box
      {...props}
      ref={ref}
      sx={[{ flexDirection: direction }, ...(Array.isArray(sx) ? sx : [sx])]}
      style={[{ gap }, props.style]}
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
export interface TypographyProps extends TextProps {
  sx?: SxProps;
  variant?: TypographyVariant;
  align?: TextStyle['textAlign'];
  color?: string;
  gutterBottom?: boolean;
  noWrap?: boolean;
  paragraph?: boolean;
}
export const Typography = forwardRef<Text, TypographyProps>(function Typography(inProps, ref) {
  const props = useThemeProps({ props: inProps, name: 'MuiTypography' });
  const {
    sx,
    variant = 'body1',
    align,
    color,
    gutterBottom,
    noWrap,
    paragraph,
    style,
    ...rest
  } = props;
  const theme = useTheme();
  const resolved = useComponentStyle('MuiTypography', { ...props, variant }, sx);
  const colorStyle = useSx(color ? { color } : undefined);
  return (
    <Text
      {...rest}
      ref={ref}
      numberOfLines={noWrap ? 1 : rest.numberOfLines}
      style={[
        {
          fontFamily: theme.typography.fontFamily,
          color: theme.palette.text.primary,
          ...theme.typography[variant],
          textAlign: align,
          marginBottom: paragraph
            ? 16
            : gutterBottom
              ? Number(theme.typography[variant].fontSize) * 0.35
              : 0,
        },
        colorStyle,
        resolved as TextStyle,
        style,
      ]}
    />
  );
});
export interface PaperProps extends BoxProps {
  elevation?: number;
  variant?: 'elevation' | 'outlined';
  square?: boolean;
}
export const Paper = forwardRef<View, PaperProps>(function Paper(inProps, ref) {
  const props = useThemeProps({ props: inProps, name: 'MuiPaper' });
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
export const Card = forwardRef<View, PaperProps>(function Card(props, ref) {
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
export const CardContent = forwardRef<View, BoxProps>(function CardContent(props, ref) {
  return <Box {...props} ref={ref} style={[{ padding: 16, paddingBottom: 24 }, props.style]} />;
});
export const CardActions = forwardRef<View, BoxProps>(function CardActions(props, ref) {
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
export function Divider({
  orientation = 'horizontal',
  flexItem,
  sx,
  style,
  ...props
}: DividerProps) {
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
export function DialogTitle(props: TypographyProps) {
  return (
    <Typography {...props} variant="h6" style={[{ padding: 24, paddingBottom: 16 }, props.style]} />
  );
}
export function DialogContent(props: BoxProps) {
  return <Box {...props} style={[{ paddingHorizontal: 24, paddingBottom: 20 }, props.style]} />;
}
export function DialogActions(props: BoxProps) {
  return (
    <Stack
      {...props}
      direction="row"
      spacing={1}
      style={[{ justifyContent: 'flex-end', padding: 8 }, props.style]}
    />
  );
}
