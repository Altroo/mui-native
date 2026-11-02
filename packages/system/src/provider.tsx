import React, { createContext, useContext, useMemo, forwardRef } from 'react';
import { useWindowDimensions, StyleSheet, type StyleProp } from 'react-native';
import { createTheme, type Theme } from './theme';
import { nativeStyleTextMetrics, applyNativeTextMetrics } from './nativeText';
import {
  componentStyle,
  resolveSx,
  type SxProps,
  type SxObject,
  type StyleContext,
  type NativeStyle,
} from './sx';
const defaultTheme = createTheme();
const Context = createContext(defaultTheme);
export function ThemeProvider({
  theme,
  children,
}: {
  theme: Theme | ((outer: Theme) => Theme);
  children?: React.ReactNode;
}) {
  const outer = useTheme();
  const value = useMemo(() => (typeof theme === 'function' ? theme(outer) : theme), [outer, theme]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTheme(): Theme {
  return useContext(Context);
}
export function useThemeProps<P extends object>({ props, name }: { props: P; name: string }): P {
  const theme = useTheme();
  const result = { ...theme.components[name]?.defaultProps } as Record<string, unknown>;
  for (const [key, value] of Object.entries(props)) if (value !== undefined) result[key] = value;
  return result as P;
}
export function useSx(sx?: SxProps, context: StyleContext = {}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  return resolveSx(sx, theme, { width, ...context });
}
export function useComponentStyle(
  name: string,
  props: object,
  sx?: SxProps,
  context: StyleContext = {},
) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  return componentStyle(theme, name, props as Record<string, unknown>, sx, { width, ...context });
}
export function styled<P extends object>(
  Component: React.ComponentType<P>,
  options: { name?: string; shouldForwardProp?: (prop: string) => boolean } = {},
) {
  return (styles: SxObject | ((props: P & { theme: Theme; ownerState?: unknown }) => SxProps)) =>
    forwardRef<unknown, P & { sx?: SxProps; style?: StyleProp<NativeStyle>; ownerState?: unknown }>(
      (props, ref) => {
        const theme = useTheme();
        const { width } = useWindowDimensions();
        const { sx, style, ownerState, ...rest } = props;
        const resolved =
          typeof styles === 'function'
            ? styles({ ...props, theme } as P & { theme: Theme; ownerState?: unknown })
            : styles;
        const filtered = Object.fromEntries(
          Object.entries(rest).filter(([key]) => options.shouldForwardProp?.(key) ?? true),
        );
        const native = StyleSheet.flatten(style) ?? undefined;
        const nativeMetrics = nativeStyleTextMetrics(style);
        const computed = componentStyle(theme, options.name ?? '', props, sx, {
          width,
          baseStyle: resolved,
          nativeStyle: native,
          nativeTextMetrics: nativeMetrics,
        });
        return React.createElement(Component, {
          ...filtered,
          ref,
          style: [computed, applyNativeTextMetrics(native, computed, nativeMetrics)],
        } as unknown as P);
      },
    );
}
