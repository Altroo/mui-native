/* Native contracts adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/svg-icon.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. */
import React, { forwardRef, useContext, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { type SvgProps } from 'react-native-svg';
import {
  NativeIconStyleContext,
  NativeTextStyleContext,
  useNativeTextContext,
  useDefaultProps,
  joinClassNames,
  nativeTextStyleContext,
  type NativeStyle,
} from '@altroo/mui-native-system';
import { useTheme, useComponentStyle } from './themeProvider';
import { nativeSvgChildren, NativeSvgParentContext } from './nativeSvgChildren';
import { getSvgIconUtilityClass } from './svgIconClasses';
import type {
  SvgIconProps,
  SvgIconOwnerState,
  NativeSvgIconComponent,
  NativeSvgIconStyle,
} from './svgIconTypes';
export type * from './svgIconTypes';
export { svgIconClasses, getSvgIconUtilityClass } from './svgIconClasses';
export type { SvgIconClasses, SvgIconClassKey } from './svgIconClasses';
const paintKeys = new Set([
  'fill',
  'fillOpacity',
  'fillRule',
  'stroke',
  'strokeOpacity',
  'strokeWidth',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeLinecap',
  'strokeLinejoin',
  'strokeMiterlimit',
  'clipRule',
  'clipPath',
  'mask',
  'vectorEffect',
]);
const capital = (value: string) => value[0].toUpperCase() + value.slice(1);
/** Material SVG contracts with an actual native SVG root and measurable SVG ref. */
export const SvgIcon = forwardRef<
  Svg,
  Omit<SvgIconProps, 'component'> & { component?: React.ComponentType<any> | 'svg' }
>(function SvgIcon(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiSvgIcon' });
  const {
    children,
    classes,
    className,
    color = 'inherit',
    component = 'svg',
    fontSize = 'medium',
    htmlColor,
    inheritViewBox = false,
    titleAccess,
    viewBox = '0 0 24 24',
    shapeRendering: _shapeRendering,
    sx,
    style,
    ...other
  } = props;
  const theme = useTheme(),
    parent = useNativeTextContext(),
    icon = useContext(NativeIconStyleContext),
    svgParent = useContext(NativeSvgParentContext);
  const child =
    React.isValidElement<Record<string, unknown>>(children) &&
    (children.type === 'svg' || children.type === Svg)
      ? children
      : null;
  const hasSvgAsChild = child !== null;
  const ownerState: SvgIconOwnerState = {
    ...props,
    color,
    fontSize,
    instanceFontSize: inProps.fontSize,
    component,
    inheritViewBox,
    viewBox,
    hasSvgAsChild,
  };
  // A single SVG child's props replace authored presentation props, including
  // explicit undefined and style/sx. Material owner state stays on the wrapper.
  const presentation = { ...other, ...(child?.props ?? {}) } as SvgProps & {
    sx?: typeof sx;
    className?: string;
    ref?: React.Ref<Svg>;
    'data-testid'?: string;
    onClick?: SvgProps['onPress'];
  };
  const effectiveStyle =
    child && Object.hasOwn(child.props, 'style') ? (child.props.style as typeof style) : style;
  const effectiveSx =
    child && Object.hasOwn(child.props, 'sx') ? (child.props.sx as typeof sx) : sx;
  const nativeStyle = StyleSheet.flatten(effectiveStyle) ?? undefined;
  const inheritedFont = nativeStyle?.fontSize ?? icon?.fontSize;
  const generatedClass = [
    'root',
    ...(color === 'inherit' ? [] : ['color' + capital(color)]),
    'fontSize' + capital(fontSize),
  ]
    .map((key) =>
      joinClassNames(
        getSvgIconUtilityClass(key),
        (classes as Record<string, string> | undefined)?.[key],
      ),
    )
    .join(' ');
  const attributeColor =
    child && Object.hasOwn(child.props, 'color')
      ? (child.props.color as SvgProps['color'])
      : htmlColor;
  const authoredRoot: Record<string, unknown> = { ...other };
  for (const key of ['classes', 'sx', 'style', 'shapeRendering'])
    if (Object.hasOwn(props, key)) authoredRoot[key] = (props as Record<string, unknown>)[key];
  const rootProps = {
    as: component,
    className: joinClassNames(generatedClass, className),
    focusable: 'false',
    color: htmlColor,
    'aria-hidden': titleAccess ? undefined : true,
    role: titleAccess ? 'img' : undefined,
    ...(!inheritViewBox ? { viewBox } : {}),
    ...authoredRoot,
    ...child?.props,
    ownerState,
    children: [
      child ? child.props.children : children,
      titleAccess ? React.createElement('title', null, titleAccess) : null,
    ],
  };

  let paletteColor: unknown;
  for (const [name, entry] of Object.entries(theme.palette))
    if (
      entry &&
      typeof entry === 'object' &&
      'main' in entry &&
      entry.main &&
      (color === name || rootProps.color === name)
    )
      paletteColor = entry.main;
  for (const [name, value] of [
    ['action', theme.palette.action.active],
    ['disabled', theme.palette.action.disabled],
  ])
    if (color === name || rootProps.color === name) paletteColor = value;
  let size: unknown = presentation.fontSize ?? 'inherit';
  // Source object variants match either final root props or owner state. Their
  // declaration order still decides collisions; named overrides use owner state.
  for (const [name, pixels] of [
    ['inherit', null],
    ['small', 20],
    ['medium', 24],
    ['large', 35],
  ] as const)
    if (fontSize === name || presentation.fontSize === name)
      size = pixels === null ? 'inherit' : theme.typography.pxToRem(pixels);
  const resolved = useComponentStyle('MuiSvgIcon', ownerState, effectiveSx, {
    ...nativeTextStyleContext(parent, effectiveStyle as typeof nativeStyle, theme),
    nativeStyle: {
      ...nativeStyle,
      ...(inheritedFont === undefined ? {} : { fontSize: inheritedFont }),
    },
    svg: true,
    rootProps,
    overrideKeys: [
      ...(color === 'inherit' ? [] : ['color' + capital(color)]),
      'fontSize' + capital(fontSize),
    ],
    baseStyle: {
      width: '1em',
      height: '1em',
      flexShrink: 0,
      fontSize: size,
      ...(paletteColor ? { color: paletteColor } : {}),
      ...(!hasSvgAsChild ? { fill: 'currentColor' } : {}),
    },
  });
  const computed = {
    ...resolved,
    ...(icon?.fontSize === undefined ? {} : { fontSize: icon.fontSize }),
    ...nativeStyle,
  } as NativeSvgIconStyle;
  // CSS rules outrank SVG presentation attributes. Resolve the root color from
  // tracked containers, but keep currentColor paint symbolic for SVG descendants.
  const inheritedColor = parent?.style.color ?? theme.palette.text.primary;
  const candidateColor = computed.color ?? attributeColor;
  const actualColor = ['inherit', 'unset', 'currentColor'].includes(String(candidateColor))
    ? inheritedColor
    : (candidateColor ?? inheritedColor);
  const actualFontSize = computed.fontSize ?? parent?.style.fontSize ?? theme.cssRootFontSize ?? 16;
  const font = {
    fontFamily:
      computed.fontFamily ??
      presentation.fontFamily ??
      presentation.font?.fontFamily ??
      (svgParent ? undefined : parent?.style.fontFamily),
    fontWeight:
      computed.fontWeight ??
      presentation.fontWeight ??
      presentation.font?.fontWeight ??
      (svgParent ? undefined : parent?.style.fontWeight),
    fontStyle:
      computed.fontStyle ??
      presentation.fontStyle ??
      presentation.font?.fontStyle ??
      (svgParent ? undefined : parent?.style.fontStyle),
    letterSpacing:
      computed.letterSpacing ??
      presentation.letterSpacing ??
      presentation.font?.letterSpacing ??
      (svgParent ? undefined : parent?.style.letterSpacing),
  };
  // Svg forwards only its font object/style to its internal G. Top-level
  // font props alone would leave actual SVG text at the backend defaults.
  const fontAttributeKeys = [
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontFamily',
    'textAnchor',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'kerning',
    'fontFeatureSettings',
    'fontVariantLigatures',
    'fontVariationSettings',
  ] as const;
  const nativeFont = {
    ...presentation.font,
    ...Object.fromEntries(
      fontAttributeKeys
        .filter((key) => presentation[key] !== undefined)
        .map((key) => [key, presentation[key]]),
    ),
    ...Object.fromEntries(Object.entries(font).filter(([, value]) => value !== undefined)),
    fontSize: actualFontSize,
  };
  const childContext = useMemo(
    () => ({
      ...parent,
      style: { ...parent?.style, color: actualColor, fontSize: actualFontSize },
      nativeText: false,
    }),
    [
      parent,
      actualColor,
      actualFontSize,
      font.fontFamily,
      font.fontWeight,
      font.fontStyle,
      font.letterSpacing,
    ],
  );
  const paint = Object.fromEntries(
    Object.entries(computed)
      .filter(([key]) => paintKeys.has(key))
      .map(([key, value]) => [key, value === 'inherit' || value === 'unset' ? undefined : value]),
  );
  const layout = Object.fromEntries(
    Object.entries(computed).filter(
      ([key]) =>
        !paintKeys.has(key) &&
        !['fontSize', 'color', 'fontFamily', 'fontWeight', 'fontStyle', 'letterSpacing'].includes(
          key,
        ),
    ),
  ) as NativeStyle;
  const rawRole = Object.hasOwn(presentation, 'role')
    ? presentation.role
    : titleAccess
      ? 'img'
      : undefined;
  const hiddenValue = Object.hasOwn(presentation, 'aria-hidden')
    ? presentation['aria-hidden']
    : !titleAccess;
  const hidden = hiddenValue === true || String(hiddenValue) === 'true';
  const role = rawRole === 'img' ? 'image' : rawRole === 'presentation' ? 'none' : undefined;
  const {
    children: _children,
    sx: _sx,
    style: _style,
    color: _color,
    className: childClassName,
    role: _role,
    'aria-hidden': _hidden,
    'aria-label': _ariaLabel,
    'aria-labelledby': _ariaLabelledBy,
    'data-testid': _testId,
    onClick: _onClick,
    ...native
  } = presentation;
  const content = child ? (child.props.children as React.ReactNode) : children;
  const normalized = useMemo(
    () => nativeSvgChildren(content, false, childContext, theme),
    [content, childContext, theme],
  );
  const Root = component === 'svg' ? Svg : component;
  if (typeof Root === 'string')
    throw Error('SvgIcon requires the native SVG root or a native custom component.');
  const NativeRoot = Root as React.ComponentType<
    SvgProps & { className?: string } & React.RefAttributes<Svg>
  >;
  return (
    <NativeRoot
      accessible={Boolean(titleAccess || presentation['aria-label'] || rawRole) && !hidden}
      accessibilityLabel={presentation['aria-label'] ?? titleAccess}
      accessibilityRole={role}
      accessibilityLabelledBy={
        presentation['aria-labelledby'] ?? presentation.accessibilityLabelledBy
      }
      role={rawRole}
      accessibilityElementsHidden={hidden === true}
      importantForAccessibility={hidden === true ? 'no-hide-descendants' : 'auto'}
      focusable={false}
      {...(!inheritViewBox ? { viewBox } : {})}
      color={actualColor}
      {...native}
      {...(child && Object.hasOwn(child.props, 'viewBox')
        ? { viewBox: child.props.viewBox as string | undefined }
        : {})}
      {...paint}
      opacity={layout.opacity ?? presentation.opacity}
      onPress={presentation.onPress ?? presentation.onClick}
      {...font}
      font={nativeFont}
      width={layout.width ?? 24}
      height={layout.height ?? 24}
      fontSize={computed.fontSize ?? parent?.style.fontSize ?? theme.cssRootFontSize ?? 16}
      style={layout}
      {...(Root === Svg
        ? {}
        : {
            className:
              child && Object.hasOwn(child.props, 'className')
                ? childClassName
                : joinClassNames(generatedClass, className),
          })}
      testID={
        Object.hasOwn(presentation, 'testID') ? presentation.testID : presentation['data-testid']
      }
      ref={child && Object.hasOwn(child.props, 'ref') ? (child.props.ref as React.Ref<Svg>) : ref}
    >
      <NativeSvgParentContext.Provider value={true}>
        <NativeTextStyleContext.Provider value={childContext}>
          {normalized}
        </NativeTextStyleContext.Provider>
      </NativeSvgParentContext.Provider>
    </NativeRoot>
  );
}) as unknown as NativeSvgIconComponent;
SvgIcon.muiName = 'SvgIcon';
SvgIcon.displayName = 'SvgIcon';
