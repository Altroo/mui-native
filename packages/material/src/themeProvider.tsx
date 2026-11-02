import React, { useMemo } from 'react';
import {
  ThemeProvider as SystemThemeProvider,
  useTheme as useSystemTheme,
  useThemeProps as useSystemThemeProps,
  useSx as useSystemSx,
  useComponentStyle as useSystemComponentStyle,
  styled as systemStyled,
  type Theme,
  type Components,
  type SxProps,
  type StyleContext,
  type ThemeProviderProps as SystemThemeProviderProps,
} from '@altroo/mui-native-system';
// Material's public scope identifier, from the pinned MIT reference.
export const THEME_ID = '$$material';
export interface ThemeProviderProps<T = Theme>
  extends Omit<SystemThemeProviderProps<T>, 'themeId'> {}
export function ThemeProvider<T = Theme>({ theme, children }: ThemeProviderProps<T>) {
  const input = useMemo(() => {
    if (typeof theme === 'function') return { theme };
    const raw = theme as Record<string, unknown>;
    const scoped = raw[THEME_ID];
    const selected = (scoped || raw) as Record<string, unknown>;
    // Preserve the no-vars provider marker. Native CSS scheme APIs are separate work.
    const noVars =
      !('colorSchemes' in selected) && !('vars' in selected) ? { ...raw, vars: null } : raw;
    return scoped ? { theme: scoped, themeId: THEME_ID } : { theme: noVars };
  }, [theme]);
  return (
    <SystemThemeProvider {...(input as SystemThemeProviderProps<T>)}>
      {children}
    </SystemThemeProvider>
  );
}
export function useTheme<T = Theme>(): T {
  const raw = useSystemTheme<Theme & Record<string, unknown>>();
  return (raw[THEME_ID] || raw) as T;
}
export interface ThemeWithProps {
  components?: Components;
}
export type ThemedProps<ThemeInput, Name extends PropertyKey> = ThemeInput extends {
  components: Record<Name, { defaultProps: infer Props }>;
}
  ? Props
  : {};
export function useThemeProps<ThemeInput extends ThemeWithProps, Props, Name extends PropertyKey>({
  props,
  name,
}: {
  props: Props;
  name: Name;
}): Props & ThemedProps<ThemeInput, Name> {
  return useSystemThemeProps({
    props: props as object,
    name: name as string,
    themeId: THEME_ID,
  }) as Props & ThemedProps<ThemeInput, Name>;
}
export function useSx(sx?: SxProps, context: StyleContext = {}) {
  return useSystemSx(sx, context, THEME_ID);
}
export function useComponentStyle(
  name: string,
  props: object,
  sx?: SxProps,
  context: StyleContext = {},
) {
  return useSystemComponentStyle(name, props, sx, context, THEME_ID);
}
export function styled<P extends object>(
  Component: React.ComponentType<P>,
  options: { name?: string; shouldForwardProp?: (prop: string) => boolean } = {},
) {
  return systemStyled(Component, { ...options, themeId: THEME_ID });
}
