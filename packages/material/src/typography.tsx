import { useTheme, useComponentStyle } from './themeProvider';
import React, { forwardRef } from 'react';
import { Text, StyleSheet, type TextInstance, type TextProps, type TextStyle } from 'react-native';
import {
  useDefaultProps,
  NativeTextStyleContext,
  useNativeTextContext,
  renderNativeTextChildren,
  getTextStyleInheritance,
  nativeStyleTextMetrics,
  applyNativeTextMetrics,
  diagnostic,
  type SxProps,
  type TypographyVariant,
} from '@altroo/mui-native-system';

export interface TypographyPropsVariantOverrides {}
export interface TypographyPropsColorOverrides {}
type VariantFlags = Omit<
  Record<TypographyVariant | 'inherit', true>,
  keyof TypographyPropsVariantOverrides
> &
  TypographyPropsVariantOverrides;
export type TypographyVariantProp = Extract<
  { [K in keyof VariantFlags]: true extends VariantFlags[K] ? K : never }[keyof VariantFlags],
  string
>;
export type NativeTypographyComponent = React.ComponentType<
  TextProps & React.RefAttributes<TextInstance>
>;
export interface TypographyProps extends TextProps {
  sx?: SxProps;
  variant?: TypographyVariantProp;
  align?: TextStyle['textAlign'] | 'inherit';
  color?: string;
  gutterBottom?: boolean;
  noWrap?: boolean;
  /** Native compatibility extension retained for earlier MUI applications. */
  paragraph?: boolean;
  component?: NativeTypographyComponent | string;
  variantMapping?: Partial<Record<TypographyVariantProp, string>>;
}
const defaultMapping: Record<string, string> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  subtitle1: 'h6',
  subtitle2: 'h6',
  body1: 'p',
  body2: 'p',
  inherit: 'p',
};
const textTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'label', 'a']);
export const Typography: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<TypographyProps> & React.RefAttributes<TextInstance>
> = forwardRef<TextInstance, TypographyProps>(function Typography(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiTypography' });
  const {
    sx,
    variant = 'body1',
    align = 'inherit',
    color,
    gutterBottom = false,
    noWrap = false,
    paragraph,
    style,
    component,
    variantMapping = defaultMapping,
    ...native
  } = props;
  const theme = useTheme();
  const parent = useNativeTextContext();
  const nativeStyle = StyleSheet.flatten(style) ?? undefined;
  const inheritedRatio = parent?.lineHeight;
  const nativeMetrics = nativeStyleTextMetrics(style);
  const variantStyle = (theme.typography as unknown as Record<string, unknown>)[variant];
  if (variant !== 'inherit' && (!variantStyle || typeof variantStyle !== 'object'))
    diagnostic('typography', `Unknown or disabled typography variant: ${variant}`);
  const paletteEntry = color
    ? (theme.palette as unknown as Record<string, unknown>)[color]
    : undefined;
  const colorValue =
    paletteEntry && typeof paletteEntry === 'object' && 'main' in paletteEntry
      ? paletteEntry.main
      : color?.match(/^text[A-Z]/)
        ? `text.${color[4].toLowerCase()}${color.slice(5)}`
        : color;
  const resolved = useComponentStyle(
    'MuiTypography',
    { ...props, variant, align, gutterBottom, noWrap },
    sx,
    {
      overrideKeys: [
        variant,
        ...(align !== 'inherit' ? [`align${align[0].toUpperCase()}${align.slice(1)}`] : []),
        ...(noWrap ? ['noWrap'] : []),
        ...(gutterBottom ? ['gutterBottom'] : []),
      ],
      parentTextStyle: parent?.style,
      parentLineHeight: inheritedRatio,
      nativeStyle,
      nativeTextMetrics: nativeMetrics,
      inheritOnly: variant === 'inherit',
      baseStyle: {
        margin: 0,
        ...(variant === 'inherit' || color === 'inherit'
          ? {}
          : { color: parent?.style.color ?? theme.palette.text.primary }),
        ...(variant !== 'inherit' && variantStyle && typeof variantStyle === 'object'
          ? variantStyle
          : {}),
        ...(colorValue && colorValue !== 'inherit' ? { color: colorValue } : {}),
        ...(align !== 'inherit' ? { textAlign: align } : {}),
        ...(paragraph ? { marginBottom: 16 } : gutterBottom ? { marginBottom: '0.35em' } : {}),
      },
    },
  );
  const adjustedNativeStyle = applyNativeTextMetrics(
    nativeStyle,
    resolved as TextStyle,
    nativeMetrics,
  );
  const finalStyle = StyleSheet.flatten([
    parent && !parent.nativeText ? parent.style : undefined,
    resolved as TextStyle,
    adjustedNativeStyle,
  ]);
  const context = {
    ...getTextStyleInheritance(resolved as TextStyle, parent?.style, adjustedNativeStyle),
    nativeText: true,
  };
  const mapped = component ?? variantMapping[variant] ?? defaultMapping[variant] ?? 'span';
  if (typeof mapped === 'string' && !textTags.has(mapped))
    diagnostic(
      'typography-component',
      `Native Typography renders ${mapped} as Text; custom native components can replace the root.`,
    );
  const Component = typeof mapped === 'string' ? Text : mapped;
  const role =
    typeof mapped === 'string' && /^h[1-6]$/.test(mapped)
      ? 'header'
      : mapped === 'a'
        ? 'link'
        : undefined;
  return (
    <NativeTextStyleContext.Provider value={context}>
      <Component
        {...native}
        ref={ref}
        accessibilityRole={native.accessibilityRole ?? (native.role ? undefined : role)}
        numberOfLines={noWrap ? 1 : native.numberOfLines}
        ellipsizeMode={native.ellipsizeMode ?? (noWrap ? 'tail' : undefined)}
        style={finalStyle}
      >
        {renderNativeTextChildren(native.children, theme, context)}
      </Component>
    </NativeTextStyleContext.Provider>
  );
});
