// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Styled theme attachment adapts MIT MUI System/Utils 9.5.0; see NOTICE and upstream/dialog-title.json.
import React, { createContext, useContext, useMemo, forwardRef } from 'react';
import { useWindowDimensions, View, Text, type StyleProp } from 'react-native';
import { createTheme, type Theme, type SharedComponentStyleArgs } from './theme';
import { diagnostic } from './diagnostics';
import RtlProvider from './RtlProvider';
import {
  DefaultPropsProvider,
  getThemeProps,
  useDefaultProps,
  type ThemeWithProps,
  type ThemedProps,
} from './defaultProps';
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
  refreshNativeRootPreparation,
} from './nativeRootHandoff';
import {
  sameNativeRootCss,
  snapshotNativeRootCss,
  registerNativeStyleClass,
} from './nativeStyledMetadata';
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
import {
  NativeCssInsertionScope,
  NativeCssRootBoundary,
  useNativeStyleCache,
} from './nativeStyleCacheScope';
import { refreshNativeStyleProp } from './nativeStyleEvaluation';
import { preprocessNativeStyledStyle } from './nativeStyledPreprocessing';

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
/** Match each styled constructor's attachTheme stage without changing context. */
function attachStyledTheme(
  theme: Theme | null | undefined,
  fallback: Theme,
  themeId?: string,
): Theme {
  if (theme == null) return fallback;
  // The pinned emptiness check includes enumerable prototype properties.
  for (const _key in theme)
    return (theme as unknown as Record<string, Theme>)[themeId as string] || theme;
  return fallback;
}
export function useThemeProps<ThemeInput extends ThemeWithProps, Props, Name extends PropertyKey>({
  props,
  name,
  defaultTheme: fallback,
  themeId,
}: {
  props: Props;
  name: Name;
  defaultTheme?: ThemeInput | undefined;
  themeId?: string | undefined;
}): Props & ThemedProps<ThemeInput, Name> {
  const theme = useTheme(fallback);
  const scoped = themeId ? (theme as Record<string, unknown>)[themeId] || theme : theme;
  return getThemeProps({ theme: scoped as ThemeInput, props, name });
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
}>;
function forwardNativeStyledProps(
  rest: Record<string, unknown>,
  forward: (key: string) => boolean,
  consumeAs: boolean,
) {
  return Object.fromEntries(
    Object.entries(rest).filter(([key]) => {
      if (consumeAs && key === 'as') return false;
      return Boolean(Reflect.apply(forward, undefined, [key]));
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
// Forwarding composes for every styled tag, independently of native root cooperation.
const styledForwarders = new WeakMap<object, ((key: string) => boolean) | undefined>();
export function styled<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    name?: string;
    shouldForwardProp?: ((prop: string) => boolean) | undefined;
    themeId?: string;
    defaultTheme?: Theme;
  } = {},
) {
  const inherited = styledRecipes.get(Component);
  const parentForward = styledForwarders.get(Component);
  const declared = Object.prototype.propertyIsEnumerable.call(options, 'shouldForwardProp')
    ? options.shouldForwardProp
    : (key: string) => key !== 'ownerState' && key !== 'theme' && key !== 'sx' && key !== 'as';
  // Explicit undefined removes MUI's default. Emotion then inherits a styled
  // tag's predicate directly, or falls back to its actual base tag policy.
  const forward =
    parentForward && typeof declared === 'function'
      ? (key: string) =>
          Boolean(
            Reflect.apply(parentForward, Component, [key]) &&
              Reflect.apply(declared, undefined, [key]),
          )
      : typeof declared === 'function'
        ? declared
        : parentForward;
  const baseTag = inherited?.base ?? Component;
  const defaultForward =
    forward ??
    (baseTag === (View as unknown) || baseTag === (Text as unknown)
      ? (key: string) => key !== 'ownerState' && key !== 'theme' && key !== 'sx' && key !== 'as'
      : (key: string) => key !== 'theme');
  const shouldUseAs = !Reflect.apply(defaultForward, undefined, ['as']);
  return (styles: SxObject | ((props: P & { theme: Theme; ownerState?: unknown }) => SxProps)) => {
    const preparedStyles =
      typeof styles === 'function' ? styles : preprocessNativeStyledStyle(styles);
    // Adjacent styled constructors share their source expressions. Memo and
    // the original arbitrary tag remain genuine React component boundaries.
    const fallback = styledFallbacks.get(Component) ?? options.defaultTheme ?? systemDefaultTheme;
    const known = Component === (View as unknown) || isNativeCooperatingRoot(Component);
    const layer: NativeStyledLayer = {
      prepare(props, rawTheme, parent, width, last, genuine) {
        const theme = attachStyledTheme(
          (genuine ? genuine.theme : rawTheme) as Theme | null | undefined,
          fallback,
          options.themeId,
        );
        const callbackProps = genuine ?? { ...props, theme };
        if (genuine) genuine.theme = theme;
        const resolved =
          typeof preparedStyles === 'function'
            ? preparedStyles(callbackProps as P & { theme: Theme; ownerState?: unknown })
            : preparedStyles;
        return {
          theme,
          name: options.name ?? '',
          props: genuine ?? props,
          sx: last ? (callbackProps.sx as SxProps | undefined) : undefined,
          context: {
            ...nativeTextStyleContext(parent, props.style as StyleProp<NativeStyle>, theme),
            width,
            baseStyle: resolved,
            styledProps: callbackProps as SharedComponentStyleArgs,
          },
        };
      },
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
      P & {
        sx?: SxProps | undefined;
        style?: StyleProp<NativeStyle>;
        ownerState?: unknown;
        as?: Exclude<React.ElementType, string>;
      }
    >((inProps, ref) => {
      // A first-party composite can carry incoming CSS separately from its real
      // authored style. Public callbacks must never observe that private carrier.
      const input = separateNativeRootProps(inProps);
      const props = input.props;
      const carrierStyle = (
        input.prepared ? input.prepared.fallback : props.style
      ) as StyleProp<NativeStyle>;
      const styleCache = useNativeStyleCache();
      const rootClassName = (props as Record<string, unknown>).className;
      const classes =
        typeof rootClassName === 'string' ? rootClassName.split(/\s+/).filter(Boolean) : [];
      const handoff = useNativeRootHandoff(Styled, rootClassName);
      const forwarded = useNativeRootStyleForward(Styled, rootClassName);
      const forwarding = useForwarding();
      const { root, ref: rootRef } = useNativeTextRootRef(ref);
      const contextTheme = useTheme(fallback);
      const rawTheme = (props as { theme?: Theme | null }).theme ?? contextTheme;
      // Adjacent constructors attach in their retained inner-to-outer sequence.
      // An eager outer attachment would observe a scoped-theme getter twice.
      let theme = inherited ? fallback : attachStyledTheme(rawTheme, fallback, options.themeId);
      const parent = useNativeTextContext();
      const { width } = useWindowDimensions();
      const { sx, style, ownerState, ...rest } = props;
      let filtered: Record<string, unknown>;
      let finalStyle: StyleProp<NativeStyle>;
      if (inherited) {
        const genuine = { ...props, theme: rawTheme };
        finalStyle = createNativeStyledStyle(
          theme,
          '',
          props,
          undefined,
          { ...nativeTextStyleContext(parent, style, theme), width, classes },
          carrierStyle,
          undefined,
          {
            layers: layers.map((own, index) => () => {
              const layer = own.prepare(
                props,
                rawTheme,
                parent,
                width,
                index === layers.length - 1,
                genuine,
              );
              theme = layer.theme;
              return { ...layer, context: { ...layer.context, styleCache, classes } };
            }),
            forwarded: forwarded?.programme,
            renderedClass: true,
          },
        );
        filtered = forwardNativeStyledProps(rest, defaultForward, shouldUseAs);
      } else {
        const callbackProps = { ...props, theme };
        const resolved =
          typeof preparedStyles === 'function'
            ? preparedStyles(callbackProps as P & { theme: Theme; ownerState?: unknown })
            : preparedStyles;
        // Preserve opaque-root behavior. Known constructors follow the source's
        // style evaluation before native-prop filtering.
        if (!known) filtered = forwardNativeStyledProps(rest, defaultForward, shouldUseAs);
        finalStyle = createNativeStyledStyle(
          theme,
          options.name ?? '',
          props,
          sx,
          {
            ...nativeTextStyleContext(parent, style, theme),
            width,
            baseStyle: resolved,
            styledProps: callbackProps as SharedComponentStyleArgs,
            classes,
            styleCache,
          },
          carrierStyle,
          undefined,
          { forwarded: forwarded?.programme, renderedClass: true },
        );
        if (known) filtered = forwardNativeStyledProps(rest, defaultForward, shouldUseAs);
      }
      const output = filtered!;
      const finalTag = ((shouldUseAs && props.as) || Base) as React.ComponentType<P>;
      if (
        typeof finalTag === 'string' &&
        finalTag !== (View as unknown) &&
        finalTag !== (Text as unknown)
      )
        throw new TypeError(
          'Native styled as targets must be native components, such as View or Text.',
        );
      if (handoff && finalTag !== Base)
        throw new Error(
          'A cooperating native root cannot replace its physical target through styled as.',
        );
      const registerClass = finalTag !== View && finalTag !== Text;
      registerNativeStyleClass(finalStyle, registerClass);
      if (finalTag === Base && Base !== (View as unknown) && known) {
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
          <NativeCssInsertionScope style={finalStyle} registerClass={registerClass}>
            {result}
          </NativeCssInsertionScope>,
          record,
          handoff?.retained,
          forwarded?.retained,
        );
      }
      if (handoff && finalTag === Base) {
        if (Base !== (View as unknown))
          throw Error('Only known first-party styled roots can cooperate');
        const classes =
          typeof output.className === 'string' ? output.className.split(/\s+/).filter(Boolean) : [];
        const context = {
          styleCache,
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
          <NativeCssRootBoundary style={preparation.presentation} registerClass={registerClass}>
            {() => {
              const current = refreshNativeRootPreparation(preparation);
              return (
                <NativeTextScope
                  rootRef={root as React.RefObject<object | null>}
                  theme={theme}
                  style={current.presentation}
                  content={output.children as React.ReactNode}
                >
                  {(presentation, children) => (
                    <NativeRootHandoffContext.Provider value={null}>
                      {handoff.render({
                        preparation: current,
                        hostProps: output,
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
            }}
          </NativeCssRootBoundary>,
          handoff?.retained,
        );
      }
      if (finalTag === (View as unknown) || finalTag === (Text as unknown)) {
        return clearNativeRootStyleForward(
          forwarded,
          <NativeCssRootBoundary style={finalStyle} registerClass={registerClass}>
            {() => (
              <NativeTextScope
                rootRef={root as React.RefObject<object | null>}
                theme={theme}
                kind={finalTag === (Text as unknown) ? 'text' : 'view'}
                style={refreshNativeStyleProp(finalStyle)}
                content={output.children as React.ReactNode}
              >
                {(style, children) => {
                  const element = React.createElement(finalTag, {
                    ...output,
                    ref: rootRef,
                    style,
                    children,
                  } as unknown as P);
                  return finalTag === (Text as unknown)
                    ? sealNativeTextElement(element, style)
                    : element;
                }}
              </NativeTextScope>
            )}
          </NativeCssRootBoundary>,
        );
      }
      return (
        <NativeCssInsertionScope style={finalStyle} registerClass={registerClass}>
          {React.createElement(finalTag, { ...output, ref, style: finalStyle } as unknown as P)}
        </NativeCssInsertionScope>
      );
    });
    // Emotion copies the genuine tag defaults at every styled construction,
    // including canonical memo boundaries; preserve its exact read/copy timing.
    (Styled as { defaultProps?: unknown }).defaultProps = (
      Component as { defaultProps?: unknown }
    ).defaultProps;
    if (known) registerNativeRoot(Styled);
    // Emotion retains style/forwarding construction metadata for every styled
    // tag. Arbitrary component bodies remain genuine React boundaries.
    styledRecipes.set(Styled, {
      base: Base as React.ComponentType<object>,
      target: baseTarget,
      layers,
    });
    styledForwarders.set(Styled, forward);
    styledFallbacks.set(Styled, fallback);
    return Styled;
  };
}
