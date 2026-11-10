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
  isNativeCooperatingRoot,
  nativeCooperatingRootTarget,
  NativeRootStyleForwardContext,
  useNativeRootStyleForward,
  clearNativeRootStyleForward,
  useNativeRootHandoffForward,
  useNativeRootHandoff,
} from './nativeRootHandoff';
import { sameNativeRootCss, snapshotNativeRootCss } from './nativeStyledMetadata';
import {
  useNativeRootSnapshotScope,
  retainNativeRootSnapshotProps,
  retainNativeRootSnapshotElement,
  nativeRootSnapshotClassName,
} from './nativeRootStyleSnapshots';
import { NativeTextScope, useNativeTextContext, nativeTextStyleContext } from './textScope';
import { sealNativeTextElement } from './nativeTextProvenance';
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

export function useSx(
  sx?: SxProps,
  context: StyleContext = {},
  themeId?: string,
  fallback?: Theme,
) {
  const theme = scopedTheme(useTheme(fallback), themeId);
  const { width } = useWindowDimensions();
  return resolveSx(sx, theme, { width, ...context });
}
export function useComponentStyle(
  name: string,
  props: object,
  sx?: SxProps,
  context: StyleContext = {},
  themeId?: string,
  fallback?: Theme,
) {
  const theme = scopedTheme(useTheme(fallback), themeId);
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
  fallback?: Theme,
): NativeRootStyleResult {
  const theme = scopedTheme(useTheme(fallback), themeId);
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
type NativeStyledLayer = Readonly<{
  prepare(
    props: Record<string, unknown>,
    rawTheme: Theme,
    parent: ReturnType<typeof useNativeTextContext>,
    width: number,
    last: boolean,
    genuine?: Record<string, unknown>,
  ): Readonly<{
    theme: Theme;
    name: string;
    props: Record<string, unknown>;
    sx: SxProps | undefined;
    context: StyleContext;
  }>;
  forward(key: string): boolean;
}>;
function forwardNativeStyledProps(
  rest: Record<string, unknown>,
  layers: readonly NativeStyledLayer[],
) {
  return Object.fromEntries(
    Object.entries(rest).filter(([key]) => {
      for (const layer of layers) if (!layer.forward(key)) return false;
      return true;
    }),
  );
}
const styledRecipes = new WeakMap<
  object,
  Readonly<{
    base: React.ComponentType<object>;
    target: object | undefined;
    layers: readonly NativeStyledLayer[];
  }>
>();
// Retain the first styled creator's fallback across exact constructor composition.
// Memo remains a component boundary, so its inner creator resolves independently.
const styledFallbacks = new WeakMap<object, Theme>();
export function styled<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    name?: string;
    shouldForwardProp?: (prop: string) => boolean;
    themeId?: string;
    defaultTheme?: Theme;
  } = {},
) {
  return (styles: SxObject | ((props: P & { theme: Theme; ownerState?: unknown }) => SxProps)) => {
    // Only our exact first-party constructors contribute recipes. Memo is an
    // actual component boundary, never flattened or invoked by this metadata.
    const inherited = styledRecipes.get(Component);
    const fallback = styledFallbacks.get(Component) ?? options.defaultTheme ?? systemDefaultTheme;
    const known = Component === (View as unknown) || isNativeCooperatingRoot(Component);
    const layer: NativeStyledLayer = {
      prepare(props, rawTheme, parent, width, last, genuine) {
        const theme = scopedTheme(rawTheme, options.themeId);
        const callbackProps = genuine ?? { ...props, theme };
        if (genuine) genuine.theme = theme;
        const resolved =
          typeof styles === 'function'
            ? styles(callbackProps as P & { theme: Theme; ownerState?: unknown })
            : styles;
        return {
          theme,
          name: options.name ?? '',
          props: genuine ?? props,
          sx: last ? (callbackProps.sx as SxProps | undefined) : undefined,
          context: {
            ...nativeTextStyleContext(parent, props.style as StyleProp<NativeStyle>, theme),
            width,
            baseStyle: resolved,
          },
        };
      },
      forward: (key) => options.shouldForwardProp?.(key) ?? true,
    };
    const layers = inherited ? [...inherited.layers, layer] : [layer];
    const Base = (inherited?.base ?? Component) as React.ComponentType<P>;
    const baseTarget = inherited?.target ?? nativeCooperatingRootTarget(Base);
    // Constructor-specialized hook: ordinary terminal roots create no snapshot scope.
    const useForwarding =
      known && Base !== (View as unknown)
        ? function useForwardingScope() {
            const snapshots = useNativeRootSnapshotScope('css', sameNativeRootCss);
            const native = useNativeRootHandoffForward(baseTarget!);
            const css = useMemo(
              () => Object.freeze({ target: baseTarget!, snapshots }),
              [snapshots],
            );
            return { snapshots, native, css };
          }
        : function useNoForwardingScope() {
            return null;
          };
    const Styled = forwardRef<
      NativeStyledRef<P>,
      P & { sx?: SxProps | undefined; style?: StyleProp<NativeStyle>; ownerState?: unknown }
    >((props, ref) => {
      const rootClassName = (props as Record<string, unknown>).className;
      const handoff = useNativeRootHandoff(Styled, rootClassName);
      const forwarded = useNativeRootStyleForward(Styled, rootClassName);
      const forwarding = useForwarding();
      const { root, ref: rootRef } = useNativeTextRootRef(ref);
      const rawTheme = useTheme(fallback),
        theme = scopedTheme(rawTheme, options.themeId);
      const parent = useNativeTextContext();
      const { width } = useWindowDimensions();
      const { sx, style, ownerState, ...rest } = props;
      let filtered: Record<string, unknown>;
      let finalStyle: StyleProp<NativeStyle>;
      if (inherited) {
        const genuine = { ...props };
        finalStyle = createNativeStyledStyle(
          theme,
          '',
          props,
          undefined,
          { ...nativeTextStyleContext(parent, style, theme), width },
          style,
          undefined,
          {
            layers: layers.map(
              (own, index) => () =>
                own.prepare(props, rawTheme, parent, width, index === layers.length - 1, genuine),
            ),
            forwarded: forwarded?.programme,
          },
        );
        filtered = forwardNativeStyledProps(rest, layers);
      } else {
        const resolved =
          typeof styles === 'function'
            ? styles({ ...props, theme } as P & { theme: Theme; ownerState?: unknown })
            : styles;
        // Preserve opaque-root behavior. Known constructors follow the source's
        // style evaluation before native-prop filtering.
        if (!known) filtered = forwardNativeStyledProps(rest, layers);
        finalStyle = createNativeStyledStyle(
          theme,
          options.name ?? '',
          props,
          sx,
          { ...nativeTextStyleContext(parent, style, theme), width, baseStyle: resolved },
          style,
          undefined,
          forwarded ? { forwarded: forwarded.programme } : undefined,
        );
        if (known) filtered = forwardNativeStyledProps(rest, layers);
      }
      const output = filtered!;
      if (Base !== (View as unknown) && known) {
        const target = nativeCooperatingRootTarget(Base);
        if (!target || target !== baseTarget)
          throw Error('Known root composition no longer reaches its original first-party terminal');
        const record = forwarding!.snapshots.publish(snapshotNativeRootCss(finalStyle));
        const element = React.createElement(Base, {
          ...output,
          ref,
          className: nativeRootSnapshotClassName(rootClassName, record),
          ...(Object.hasOwn(props, 'style') ? { style } : {}),
        } as unknown as P);
        retainNativeRootSnapshotProps(
          element.props as object,
          record,
          handoff?.retained,
          forwarded?.retained,
        );
        const content = (
          <NativeRootStyleForwardContext.Provider value={forwarding!.css}>
            {element}
          </NativeRootStyleForwardContext.Provider>
        );
        const result = forwarding!.native ? (
          <NativeRootHandoffContext.Provider value={forwarding!.native}>
            {content}
          </NativeRootHandoffContext.Provider>
        ) : (
          content
        );
        return retainNativeRootSnapshotElement(
          result,
          record,
          handoff?.retained,
          forwarded?.retained,
        );
      }
      if (handoff) {
        if (Base !== (View as unknown))
          throw Error('Only known first-party styled roots can cooperate');
        const classes =
          typeof output.className === 'string' ? output.className.split(/\s+/).filter(Boolean) : [];
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
        return clearNativeRootStyleForward(
          forwarded,
          <NativeTextScope
            rootRef={root as React.RefObject<object | null>}
            theme={theme}
            style={preparation.presentation}
            content={output.children as React.ReactNode}
          >
            {(presentation, children) => (
              <NativeRootHandoffContext.Provider value={null}>
                {handoff.render({
                  preparation,
                  hostProps: output,
                  nativeRef: rootRef as React.Ref<import('react-native').ViewInstance>,
                  children,
                  presentation,
                  theme,
                  classes,
                })}
              </NativeRootHandoffContext.Provider>
            )}
          </NativeTextScope>,
          handoff?.retained,
        );
      }
      if (Base === (View as unknown) || Base === (Text as unknown)) {
        return clearNativeRootStyleForward(
          forwarded,
          <NativeTextScope
            rootRef={root as React.RefObject<object | null>}
            theme={theme}
            kind={Base === (Text as unknown) ? 'text' : 'view'}
            style={finalStyle}
            content={output.children as React.ReactNode}
          >
            {(style, children) => {
              const element = React.createElement(Base, {
                ...output,
                ref: rootRef,
                style,
                children,
              } as unknown as P);
              return Base === (Text as unknown) ? sealNativeTextElement(element, style) : element;
            }}
          </NativeTextScope>,
        );
      }
      return React.createElement(Base, { ...output, ref, style: finalStyle } as unknown as P);
    });
    // Emotion copies the genuine tag defaults at every styled construction,
    // including canonical memo boundaries; preserve its exact read/copy timing.
    (Styled as { defaultProps?: unknown }).defaultProps = (
      Component as { defaultProps?: unknown }
    ).defaultProps;
    if (known) {
      registerNativeRoot(Styled);
      styledRecipes.set(Styled, {
        base: Base as React.ComponentType<object>,
        target: baseTarget,
        layers,
      });
    }
    styledFallbacks.set(Styled, fallback);
    return Styled;
  };
}
