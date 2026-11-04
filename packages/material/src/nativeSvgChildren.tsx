// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React from 'react';
import { StyleSheet } from 'react-native';
import * as SVG from 'react-native-svg';
import {
  NativeTextStyleContext,
  resolveSx,
  type NativeTextScopeValue,
  type NativeStyle,
  type Theme,
} from '@altroo/mui-native-system';

// Translate only actual SVG element names. Exported helpers and base classes
// in react-native-svg are not valid authored SVG tags.
const names =
  'svg g path rect circle ellipse line polyline polygon defs linearGradient radialGradient stop clipPath mask pattern symbol use text tspan textPath image foreignObject marker filter feBlend feColorMatrix feComponentTransfer feFuncA feFuncB feFuncG feFuncR feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence'.split(
    ' ',
  );
const aliases: Record<string, string> = { svg: 'Svg', g: 'G', tspan: 'TSpan' };
const tags = Object.fromEntries(
  names.map((name) => [
    name,
    (SVG as unknown as Record<string, React.ComponentType<any>>)[
      aliases[name] ?? name[0].toUpperCase() + name.slice(1)
    ],
  ]),
);
const nativeTypes = new Set(Object.values(tags).filter(Boolean));
export const NativeSvgParentContext = React.createContext(false);
const metadata = new Set(['title', 'desc', 'metadata']);
const reset = (value: unknown) => value === 'inherit' || value === 'unset';

/** Keep custom components opaque; their hooks run only through React rendering. */
export function nativeSvgChildren(
  children: React.ReactNode,
  text = false,
  scope?: NativeTextScopeValue,
  theme?: Theme,
  flattenFragments = false,
): React.ReactNode {
  const visit = (child: React.ReactNode): React.ReactNode => {
    if (typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint') {
      if (text) return String(child);
      if (!String(child).trim()) return null;
      throw Error('SvgIcon text must be inside an SVG text, tspan or textPath element.');
    }
    if (!React.isValidElement<Record<string, unknown> & { children?: React.ReactNode }>(child))
      return child;
    if (child.type === React.Fragment && (text || flattenFragments)) {
      const items = React.Children.toArray(
        nativeSvgChildren(child.props.children, text, scope, theme, flattenFragments),
      );
      return items.map((item, index) =>
        React.isValidElement(item)
          ? React.cloneElement(item, { key: `fragment:${child.key ?? ''}/${item.key ?? index}` })
          : item,
      );
    }
    let Component = child.type;
    if (typeof Component === 'string') {
      if (metadata.has(Component)) return null;
      const native = tags[Component];
      if (!native)
        throw Error(
          `SvgIcon cannot render <${Component}> on native. Use react-native-svg elements or a native custom component.`,
        );
      Component = native;
    }
    const known = nativeTypes.has(Component as React.ComponentType<any>);
    let next = scope;
    const props = { ...child.props };
    if (typeof child.type === 'string' && Object.hasOwn(props, 'onClick')) {
      props.onPress = props.onPress ?? props.onClick;
      delete props.onClick;
    }
    if (known) {
      const style = StyleSheet.flatten(props.style as NativeStyle | undefined);
      const color = style && Object.hasOwn(style, 'color') ? style.color : props.color;
      const fontSize = style && Object.hasOwn(style, 'fontSize') ? style.fontSize : props.fontSize;
      // Owned SVG groups establish a React-only scope for nested Material icons.
      // Native SVG descendants still inherit symbolic currentColor in their renderer.
      if (scope && theme && (color !== undefined || fontSize !== undefined)) {
        const resolved =
          fontSize === undefined
            ? {}
            : resolveSx({ fontSize }, theme, { mode: 'css', parentTextStyle: scope.style });
        next = {
          ...scope,
          style: {
            ...scope.style,
            ...resolved,
            ...(color === undefined
              ? {}
              : {
                  color:
                    reset(color) || color === 'currentColor'
                      ? scope.style.color
                      : (color as NativeStyle['color']),
                }),
          },
        };
      }
      if (color !== undefined && (reset(color) || color === 'currentColor')) {
        props.color = scope?.style.color;
        if (style && Object.hasOwn(style, 'color'))
          props.style = { ...style, color: scope?.style.color };
      }
      for (const key of ['fill', 'stroke']) if (reset(props[key])) props[key] = undefined;
      if (Component === SVG.Stop) {
        const stopStyle = style as Record<string, unknown> | undefined;
        // Browser inline paint outranks presentation attributes. Native Stop
        // deliberately keeps its backend prop priority for existing RN callers.
        if (typeof child.type === 'string' && stopStyle)
          for (const key of ['stopColor', 'stopOpacity']) {
            const value = stopStyle[key];
            if (value != null && value !== '') props[key] = value;
          }
        const stopColor = props.stopColor ?? stopStyle?.stopColor;
        if (stopColor === 'currentColor') props.stopColor = next?.style.color;
      }
    }
    const isText = Component === SVG.Text || Component === SVG.TSpan || Component === SVG.TextPath;
    const normalized = nativeSvgChildren(
      child.props.children,
      text || isText,
      next,
      theme,
      Component === SVG.LinearGradient || Component === SVG.RadialGradient,
    );
    const content =
      next !== scope && (Component === SVG.G || Component === SVG.Svg) ? (
        <NativeTextStyleContext.Provider value={next}>{normalized}</NativeTextStyleContext.Provider>
      ) : (
        normalized
      );
    if (Component === child.type) return React.cloneElement(child, props, content);
    return React.createElement(Component, { ...props, key: child.key }, content);
  };
  if (
    React.isValidElement(children) ||
    typeof children === 'string' ||
    typeof children === 'number' ||
    typeof children === 'bigint' ||
    children == null
  )
    return visit(children);
  return React.Children.map(children, visit);
}
