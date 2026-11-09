// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { createContext, useContext, useMemo, forwardRef } from 'react';
import { useWindowDimensions, View, Text, type StyleProp } from 'react-native';
import { createTheme, type Theme } from './theme';
import { diagnostic } from './diagnostics';
import RtlProvider from './RtlProvider';
import { DefaultPropsProvider, getThemeProps, useDefaultProps } from './defaultProps';
import {
  separateNativeRootProps,
  restoreNativeRootStyle,
  type NativeRootStyle,
  type NativeRootStyleInput,
} from './nativeStyledMetadata';
import { useNativeTextRootRef } from './nativeTextRegistry';
import {
  NativeRootHandoffContext,
  registerNativeRoot,
  useNativeRootHandoff,
} from './nativeRootHandoff';
import { NativeTextScope, useNativeTextContext, nativeTextStyleContext } from './textScope';
import {
  componentStyle,
  componentRootStyle,
  createNativeStyledStyle,
  resolveSx,
  type SxProps,
  type SxObject,
  type StyleContext,
  type NativeStyle,
  type NativeRootStyleResult,
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
  return componentStyle(theme, name, props as Record<string, unknown>, sx, {
    width,
    ...context,
  });
}
/** @internal Root-local counterpart to useComponentStyle for native library components. */
export function useComponentRootStyle(
  name: string,
  props: object,
  sx: SxProps | undefined,
  style: StyleProp<NativeStyle>,
  context: StyleContext = {},
  themeId?: string,
): NativeRootStyleResult {
  const theme = scopedTheme(useTheme(), themeId);
  const { width } = useWindowDimensions();
  return componentRootStyle(theme, name, props as Record<string, unknown>, sx, style, {
    width,
    ...context,
  });
}
/**
 * @internal Resolve participating root defaults against genuine authored props.
 * Pass the separate style only to useComponentRootStyle, never to public owner
 * callbacks or native hosts. sx retains the existing styled consumption policy.
 */
export function useNativeRootProps<Props extends { style?: NativeRootStyleInput | undefined }>({
  props,
  name,
}: {
  props: Props;
  name: string;
}): { props: Props; style: NativeRootStyle<Props['style']> } {
  const input = separateNativeRootProps(props);
  const resolved = useDefaultProps({ props: input.props, name });
  return { props: resolved, style: restoreNativeRootStyle(input, resolved) };
}
type NativeStyledRef<Props> = 'ref' extends keyof Props
  ? Props extends { ref?: React.Ref<infer Instance> | undefined }
    ? Instance
    : unknown
  : unknown;
export function styled<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    name?: string;
    shouldForwardProp?: (prop: string) => boolean;
    themeId?: string;
  } = {},
) {
  return (styles: SxObject | ((props: P & { theme: Theme; ownerState?: unknown }) => SxProps)) => {
    const Styled = forwardRef<
      NativeStyledRef<P>,
      P & {
        sx?: SxProps | undefined;
        style?: StyleProp<NativeStyle>;
        ownerState?: unknown;
      }
    >((props, ref) => {
      const handoff = useNativeRootHandoff(Styled);
      const { root, ref: rootRef } = useNativeTextRootRef(ref);
      const theme = scopedTheme(useTheme(), options.themeId);
      const parent = useNativeTextContext();
      const { width } = useWindowDimensions();
      const { sx, style, ownerState, ...rest } = props;
      const resolved =
        typeof styles === 'function'
          ? styles({ ...props, theme } as P & {
              theme: Theme;
              ownerState?: unknown;
            })
          : styles;
      const filtered = Object.fromEntries(
        Object.entries(rest).filter(([key]) => options.shouldForwardProp?.(key) ?? true),
      );
      const finalStyle = createNativeStyledStyle(
        theme,
        options.name ?? '',
        props,
        sx,
        {
          ...nativeTextStyleContext(parent, style, theme),
          width,
          baseStyle: resolved,
        },
        style,
      );
      if (handoff) {
        if (Component !== (View as unknown)) throw Error('Only styled(View) can cooperate');
        const classes =
          typeof filtered.className === 'string'
            ? filtered.className.split(/\s+/).filter(Boolean)
            : [];
        const context = {
          ...nativeTextStyleContext(parent, style, theme),
          width,
          classes,
          protectPhysicalGeometry: true,
        };
        const preparation = handoff.prepare({
          theme,
          programme: finalStyle,
          context,
          parentDirection: parent?.direction ?? theme.direction,
        });
        return (
          <NativeTextScope
            rootRef={root as React.RefObject<object | null>}
            theme={theme}
            style={preparation.presentation}
            content={(filtered as { children?: React.ReactNode }).children}
          >
            {(presentation, children) => (
              <NativeRootHandoffContext.Provider value={null}>
                {handoff.render({
                  preparation,
                  hostProps: filtered,
                  nativeRef: rootRef as React.Ref<import('react-native').ViewInstance>,
                  children,
                  presentation,
                  theme,
                  classes,
                })}
              </NativeRootHandoffContext.Provider>
            )}
          </NativeTextScope>
        );
      }
      if (Component === (View as unknown) || Component === (Text as unknown)) {
        return (
          <NativeTextScope
            rootRef={root as React.RefObject<object | null>}
            theme={theme}
            kind={Component === (Text as unknown) ? 'text' : 'view'}
            style={finalStyle}
            content={(filtered as { children?: React.ReactNode }).children}
          >
            {(style, children) =>
              React.createElement(Component, {
                ...filtered,
                ref: rootRef,
                style,
                children,
              } as unknown as P)
            }
          </NativeTextScope>
        );
      }
      return React.createElement(Component, {
        ...filtered,
        ref,
        style: finalStyle,
      } as unknown as P);
    });
    if (Component === (View as unknown)) registerNativeRoot(Styled);
    return Styled;
  };
}
