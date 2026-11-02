import React, { createContext, useContext, useMemo } from 'react';
import { Text, View, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import type { Theme } from './theme';
import type { NativeStyle } from './sx';
import {
  inheritedTextStyle,
  isNativeTextStyleProperty,
  nativeStyleTextMetrics,
  normalizeTextStyle,
  applyNativeTextMetrics,
  getTextStyleInheritance,
} from './nativeText';
export interface NativeTextScopeValue {
  style: TextStyle;
  literalStyle?: TextStyle;
  lineHeight?: number;
  nativeText: boolean;
}
export const NativeTextStyleContext = createContext<NativeTextScopeValue | undefined>(undefined);
export const useNativeTextContext = () => useContext(NativeTextStyleContext);
export function nativeTextStyleContext(
  parent: NativeTextScopeValue | undefined,
  style?: StyleProp<NativeStyle>,
  theme?: Theme,
) {
  return {
    parentTextStyle:
      parent?.style ?? (theme ? { fontSize: theme.typography.htmlFontSize } : undefined),
    parentLineHeight: parent?.lineHeight,
    nativeStyle: StyleSheet.flatten(style) ?? undefined,
    nativeTextMetrics: nativeStyleTextMetrics(style),
    inheritOnly: true,
  };
}
function ownText(style: TextStyle): TextStyle {
  return Object.fromEntries(
    Object.entries(inheritedTextStyle(style)).filter(
      ([, value]) => value != null && value !== 'inherit' && value !== 'unset',
    ),
  ) as TextStyle;
}
function resolveScope(
  theme: Theme,
  parent: NativeTextScopeValue | undefined,
  style: StyleProp<NativeStyle>,
  kind: 'view' | 'text',
) {
  const flat = StyleSheet.flatten(style) ?? {};
  const text = { ...inheritedTextStyle(flat) };
  const metrics = nativeStyleTextMetrics(style);
  // Literal RN lineHeight is an absolute length, unlike a CSS unitless ratio.
  if (!Object.hasOwn(metrics, 'lineHeight')) delete text.lineHeight;
  const normalized = normalizeTextStyle(
    text as Record<string, unknown>,
    theme,
    nativeTextStyleContext(parent, style, theme),
  ) as TextStyle;
  const adjusted = applyNativeTextMetrics(flat, normalized, metrics) ?? {};
  const base =
    parent?.style ??
    (kind === 'view'
      ? (normalizeTextStyle(
          {
            fontFamily: theme.typography.fontFamily,
            fontSize: theme.typography.htmlFontSize,
            color: theme.palette.text.primary,
          },
          theme,
        ) as TextStyle)
      : {});
  const own = { ...flat, ...ownText(normalized), ...ownText(adjusted) };
  for (const key of Object.keys(own))
    if (
      isNativeTextStyleProperty(key) &&
      (own[key as keyof typeof own] == null ||
        own[key as keyof typeof own] === 'inherit' ||
        own[key as keyof typeof own] === 'unset')
    )
      delete own[key as keyof typeof own];
  const value: NativeTextScopeValue = {
    style: { ...base, ...ownText(normalized), ...ownText(adjusted) },
    lineHeight: getTextStyleInheritance(normalized).lineHeight,
    nativeText: kind === 'text',
  };
  const inheritable = inheritedTextStyle(flat);
  value.literalStyle = {
    ...value.style,
    ...Object.fromEntries(
      Object.entries(flat).filter(
        ([key]) => isNativeTextStyleProperty(key) && !Object.hasOwn(inheritable, key),
      ),
    ),
  };
  const native =
    kind === 'view'
      ? Object.fromEntries(Object.entries(own).filter(([key]) => !isNativeTextStyleProperty(key)))
      : { ...(parent && !parent.nativeText ? value.style : {}), ...own };
  return { value, native };
}
export interface NativeTextScopeProps {
  theme: Theme;
  style?: StyleProp<NativeStyle>;
  kind?: 'view' | 'text';
  reset?: boolean;
  content?: React.ReactNode;
  children: (
    style: NativeStyle,
    content: React.ReactNode,
    scope: NativeTextScopeValue,
  ) => React.ReactNode;
}
// React-only boundary: refs, hit testing and view geometry stay on the caller's root.
export function NativeTextScope({
  theme,
  style,
  kind = 'view',
  reset = false,
  content,
  children,
}: NativeTextScopeProps) {
  const outer = useNativeTextContext();
  const parent = reset ? undefined : outer;
  const resolved = useMemo(
    () => resolveScope(theme, parent, style, kind),
    [theme, parent, style, kind],
  );
  return (
    <NativeTextStyleContext.Provider value={resolved.value}>
      {children(
        resolved.native,
        renderNativeTextChildren(content, theme, resolved.value),
        resolved.value,
      )}
    </NativeTextStyleContext.Provider>
  );
}
export function renderNativeTextChildren(
  content: React.ReactNode,
  theme: Theme,
  scope: NativeTextScopeValue,
): React.ReactNode {
  const items = React.Children.toArray(content),
    result: React.ReactNode[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length) {
      result.push(
        <Text key={'native-text:' + result.length} style={scope.literalStyle ?? scope.style}>
          {run.join('')}
        </Text>,
      );
      run = [];
    }
  };
  for (const child of items) {
    if (typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint') {
      if (scope.nativeText) {
        result.push(child);
        continue;
      }
      if (String(child)) run.push(String(child));
      continue;
    }
    flush();
    if (
      React.isValidElement<{ children?: React.ReactNode; style?: StyleProp<NativeStyle> }>(child)
    ) {
      if (child.type === React.Fragment)
        result.push(
          React.cloneElement(
            child,
            {},
            renderNativeTextChildren(child.props.children, theme, scope),
          ),
        );
      else if (child.type === Text || child.type === View) {
        const resolved = resolveScope(
          theme,
          scope,
          child.props.style,
          child.type === Text ? 'text' : 'view',
        );
        result.push(
          React.cloneElement(
            child,
            { style: resolved.native },
            <NativeTextStyleContext.Provider value={resolved.value}>
              {renderNativeTextChildren(child.props.children, theme, resolved.value)}
            </NativeTextStyleContext.Provider>,
          ),
        );
      } else result.push(child);
    } else result.push(child);
  }
  flush();
  return result.length === 1 ? result[0] : result;
}
