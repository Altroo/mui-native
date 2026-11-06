// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Typography composition adapts MIT Material UI 9.5.0. See NOTICE and upstream/typography-contract.json.
import { useTheme, useComponentRootStyle } from './themeProvider';
import React, { forwardRef, useContext } from 'react';
import {
  Text,
  StyleSheet,
  type TextInstance,
  type TextProps,
  type TextStyle,
  unstable_TextAncestorContext as TextAncestorContext,
} from 'react-native';
import {
  useNativeRootProps,
  joinClassNames,
  NativeTextStyleContext,
  useNativeTextContext,
  nativeTextStyleContext,
  renderNativeTextChildren,
  useNativeTextRootRef,
  useNativeTextScopeRoot,
  useNativeTextChildRoots,
  setNativeTextScopeParent,
  getTextStyleInheritance,
  nativeStyleTextMetrics,
  applyNativeTextMetrics,
  nativeTextAlignmentStyle,
  nativeTextParagraphDirection,
  diagnostic,
  type SxProps,
  type TypographyVariant,
} from '@altroo/mui-native-system';
import { mergeNativeRootStyle } from './nativeControlStyles';
import { NativeStyleScope, nativeStyleAncestors, useNativeStyleRef } from './nativeStyleScope';
import { NativeButtonGroupRules } from './buttonGroupContext';
import { getTypographyUtilityClass, type TypographyClasses } from './typographyClasses';
export { typographyClasses, getTypographyUtilityClass } from './typographyClasses';
export type { TypographyClasses, TypographyClassKey } from './typographyClasses';

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
export interface TypographyOwnProps {
  children?: React.ReactNode;
  classes?: Partial<TypographyClasses> | undefined;
  className?: string | undefined;
  sx?: SxProps | undefined;
  variant?: TypographyVariantProp | undefined;
  align?: TextStyle['textAlign'] | 'inherit' | undefined;
  color?: string | undefined;
  gutterBottom?: boolean | undefined;
  noWrap?: boolean | undefined;
  /** Native compatibility extension retained for earlier MUI applications. */
  paragraph?: boolean | undefined;
  variantMapping?: Partial<Record<TypographyVariantProp, string>> | undefined;
}
type NativeTypographyRoot = string | React.JSXElementConstructor<never>;
type RootProps<Root> = Root extends string
  ? React.ComponentPropsWithRef<typeof Text>
  : Root extends React.ElementType
    ? React.ComponentPropsWithRef<Root>
    : never;
type CompatibleRoot<Root> =
  RootProps<Root> extends { style?: infer Style }
    ? [Style] extends [TextProps['style']]
      ? RefCompatibleRoot<Root>
      : never
    : RefCompatibleRoot<Root>;
type RefCompatibleRoot<Root> =
  RootProps<Root> extends { ref?: React.Ref<infer Instance> | undefined }
    ? [Instance] extends [TextInstance]
      ? Root
      : never
    : Root;
export interface TypographyTypeMap<
  AdditionalProps = {},
  RootComponent extends NativeTypographyRoot = typeof Text,
> {
  props: AdditionalProps & TypographyOwnProps;
  defaultComponent: RootComponent;
}
export type TypographyProps<
  RootComponent extends NativeTypographyRoot = typeof Text,
  AdditionalProps = {},
> = TypographyOwnProps &
  AdditionalProps &
  Omit<RootProps<RootComponent>, keyof TypographyOwnProps | keyof AdditionalProps | 'component'> & {
    component?: RootComponent | NativeTypographyComponent | string | undefined;
  };
interface NativeTypographyRootComponent
  extends Omit<React.ForwardRefExoticComponent<TypographyProps>, never> {
  <Root extends NativeTypographyRoot>(
    props: TypographyProps<Root> & { component: Root & CompatibleRoot<Root> },
  ): React.JSX.Element | null;
  (props: TypographyProps): React.JSX.Element | null;
}
type TypographyRenderProps = TypographyOwnProps &
  TextProps & { component?: NativeTypographyRoot | undefined };
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
export const Typography: NativeTypographyRootComponent = forwardRef<
  TextInstance,
  TypographyRenderProps
>(function Typography(inProps, ref) {
  const { root, ref: rootRef } = useNativeTextRootRef(ref);
  const styleRef = useNativeStyleRef(root, rootRef);
  const ancestry = useContext(NativeButtonGroupRules);
  const { props, style: preparedStyle } = useNativeRootProps({
    props: inProps,
    name: 'MuiTypography',
  });
  const {
    sx,
    variant = 'body1',
    align = 'inherit',
    color,
    classes,
    className,
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
  const hasTextAncestor = useContext(TextAncestorContext);
  const textContext = nativeTextStyleContext(parent, style, theme);
  const nativeStyle = StyleSheet.flatten(style) ?? undefined;
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
  const mapped = component || variantMapping[variant] || defaultMapping[variant] || 'span';
  const ownerState = {
    ...props,
    align,
    color,
    className,
    component,
    gutterBottom,
    noWrap,
    variant,
    variantMapping,
  };
  const token = (slot: string) => {
    let value = getTypographyUtilityClass(slot);
    const custom = classes as Record<string, string | undefined> | undefined;
    if (custom && custom[slot]) value += ' ' + custom[slot];
    return value;
  };
  const rootClass = joinClassNames(
    token('root'),
    token(variant),
    align !== 'inherit' && token('align' + align[0].toUpperCase() + align.slice(1)),
    gutterBottom && token('gutterBottom'),
    noWrap && token('noWrap'),
    className,
  );
  const rootTokens = rootClass.split(/\s+/).filter(Boolean);
  const {
    computed: resolved,
    authored,
    prepared,
  } = useComponentRootStyle('MuiTypography', ownerState, sx, preparedStyle, {
    classes: rootTokens,
    ancestors: nativeStyleAncestors(ancestry, { classes: rootTokens }),
    rootProps: {
      as: mapped,
      className: rootClass,
      ...native,
      classes,
      sx,
      style: { ...(align !== 'inherit' ? { '--Typography-textAlign': align } : {}), ...style },
    },
    overrideKeys: [
      variant,
      ...(align !== 'inherit' ? [`align${align[0].toUpperCase()}${align.slice(1)}`] : []),
      ...(noWrap ? ['noWrap'] : []),
      ...(gutterBottom ? ['gutterBottom'] : []),
    ],
    ...textContext,
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
      ...(noWrap ? { overflow: 'hidden' } : {}),
      ...(paragraph ? { marginBottom: 16 } : gutterBottom ? { marginBottom: '0.35em' } : {}),
    },
  });
  const adjustedNativeStyle = applyNativeTextMetrics(
    StyleSheet.flatten(authored) ?? undefined,
    resolved as TextStyle,
    nativeStyleTextMetrics(authored),
  );
  const finalStyle = StyleSheet.flatten([
    parent && !parent.nativeText ? parent.style : undefined,
    mergeNativeRootStyle(textContext.parentDirection, resolved, adjustedNativeStyle),
  ]);
  const ownDirection = nativeStyle?.direction ?? resolved.direction;
  const direction =
    ownDirection === 'ltr' || ownDirection === 'rtl' ? ownDirection : parent?.direction;
  const context = {
    ...getTextStyleInheritance(resolved as TextStyle, parent?.style, adjustedNativeStyle),
    nativeText: true,
    paragraphDirection: nativeTextParagraphDirection(
      direction,
      parent?.paragraphDirection,
      hasTextAncestor,
    ),
    ...(direction ? { direction } : {}),
  };
  setNativeTextScopeParent(context, parent);
  useNativeTextScopeRoot(root, context);
  const trackChildren = useNativeTextChildRoots();
  if (typeof mapped === 'string' && !textTags.has(mapped))
    diagnostic(
      'typography-component',
      `Native Typography renders ${mapped} as Text; custom native components can replace the root.`,
    );
  // Public overloads retain a Text-compatible custom root's own props/ref type;
  // runtime forwards those authored fields unchanged through the native rest.
  const Component = typeof mapped === 'string' ? Text : (mapped as NativeTypographyComponent);
  const role =
    typeof mapped === 'string' && /^h[1-6]$/.test(mapped)
      ? 'header'
      : mapped === 'a'
        ? 'link'
        : undefined;
  return (
    <NativeStyleScope root={root} theme={theme} classes={rootTokens} prepared={prepared}>
      <NativeTextStyleContext.Provider value={context}>
        <Component
          {...native}
          {...(Component === Text ? {} : { className: rootClass })}
          ref={styleRef}
          accessibilityRole={native.accessibilityRole ?? (native.role ? undefined : role)}
          numberOfLines={noWrap ? 1 : native.numberOfLines}
          ellipsizeMode={native.ellipsizeMode ?? (noWrap ? 'tail' : undefined)}
          style={nativeTextAlignmentStyle(
            finalStyle,
            context.textAlign,
            context.paragraphDirection,
          )}
        >
          {renderNativeTextChildren(native.children, theme, context, trackChildren)}
        </Component>
      </NativeTextStyleContext.Provider>
    </NativeStyleScope>
  );
}) as NativeTypographyRootComponent;
