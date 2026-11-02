import React, { createContext, useContext, useMemo, forwardRef } from 'react';
import { useWindowDimensions, StyleSheet, type StyleProp } from 'react-native';
import { createTheme, type Theme } from './theme';
import { diagnostic } from './diagnostics';
import RtlProvider from './RtlProvider';
import { DefaultPropsProvider, getThemeProps } from './defaultProps';
import { nativeStyleTextMetrics, applyNativeTextMetrics } from './nativeText';
import {
  componentStyle,
  resolveSx,
  type SxProps,
  type SxObject,
  type StyleContext,
  type NativeStyle,
} from './sx';
export const systemDefaultTheme = createTheme();
const EMPTY_THEME = {};
const Context = createContext<object | undefined>(undefined);
export interface ThemeProviderProps<T = Theme> {
  theme: Partial<T> | ((outer: T) => T);
  themeId?: string;
  children?: React.ReactNode;
}
// Adapted from the pinned System provider: objects merge at the top level;
// callbacks replace their selected theme. Keep one native context, not two engines.
export function ThemeProvider<T = Theme>({ theme, themeId, children }: ThemeProviderProps<T>) {
  const outer = useThemeWithoutDefault<Record<string, unknown>>(EMPTY_THEME);
  const value = useMemo(() => {
    const selected = themeId ? outer[themeId] || outer : outer;
    if (typeof theme === 'function' && (!Object.keys(outer).length || (themeId && !outer[themeId])))
      diagnostic('theme-provider', 'A theme callback needs an outer theme for its selected scope.');
    const local = typeof theme === 'function' ? theme(selected as T) : theme;
    return themeId
      ? { ...outer, [themeId]: local }
      : typeof theme === 'function'
        ? (local as object)
        : { ...outer, ...local };
  }, [outer, theme, themeId]);
  const effective = (
    themeId ? (value as Record<string, unknown>)[themeId] : value
  ) as Partial<Theme>;
  return (
    <Context.Provider value={value}>
      <RtlProvider value={effective.direction === 'rtl'}>
        <DefaultPropsProvider value={effective.components}>{children}</DefaultPropsProvider>
      </RtlProvider>
    </Context.Provider>
  );
}
export function useThemeWithoutDefault<T = null>(fallback: T = null as T): T {
  const value = useContext(Context);
  return !value || Object.keys(value).length === 0 ? fallback : (value as T);
}
export function useTheme<T = Theme>(fallback: T = systemDefaultTheme as T): T {
  return useThemeWithoutDefault(fallback);
}
function scopedTheme(theme: Theme, themeId?: string): Theme {
  return (themeId && (theme as unknown as Record<string, Theme>)[themeId]) || theme;
}
export function useThemeProps<P extends object>({
  props,
  name,
  defaultTheme: fallback,
  themeId,
}: {
  props: P;
  name: string;
  defaultTheme?: Theme;
  themeId?: string;
}): P {
  const theme = useTheme(fallback);
  const scoped = themeId ? (theme as unknown as Record<string, unknown>)[themeId] || theme : theme;
  return getThemeProps({ theme: scoped as Theme, props, name });
}

export function useSx(sx?: SxProps, context: StyleContext = {}, themeId?: string) {
  const theme = scopedTheme(useTheme(), themeId);
  const { width } = useWindowDimensions();
  return resolveSx(sx, theme, { width, ...context });
}
export function useComponentStyle(
  name: string,
  props: object,
  sx?: SxProps,
  context: StyleContext = {},
  themeId?: string,
) {
  const theme = scopedTheme(useTheme(), themeId);
  const { width } = useWindowDimensions();
  return componentStyle(theme, name, props as Record<string, unknown>, sx, { width, ...context });
}
export function styled<P extends object>(
  Component: React.ComponentType<P>,
  options: { name?: string; shouldForwardProp?: (prop: string) => boolean; themeId?: string } = {},
) {
  return (styles: SxObject | ((props: P & { theme: Theme; ownerState?: unknown }) => SxProps)) =>
    forwardRef<unknown, P & { sx?: SxProps; style?: StyleProp<NativeStyle>; ownerState?: unknown }>(
      (props, ref) => {
        const theme = scopedTheme(useTheme(), options.themeId);
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
