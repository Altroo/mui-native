// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { createContext, useContext, useId, useMemo, useRef } from 'react';
import {
  Text,
  View,
  Platform,
  StyleSheet,
  unstable_TextAncestorContext as TextAncestorContext,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import {
  setNativeTextScopeParent,
  useNativeTextScopeRoot,
  equalNativeTextScopeValue,
  useNativeTextChildRoots,
  type NativeTextChildRootTracker,
} from './nativeTextRegistry';
import type { Theme } from './theme';
import {
  trackNativeTextContext,
  finishNativeTextProvenance,
  sealNativeTextElement,
  bindNativeTextEmission,
  sealNativeTextEmission,
  type NativeTextProvenance,
} from './nativeTextProvenance';
import { GENERATED_TEXT_ORIGIN_CONTRACT } from './generatedParagraphOrigin';
import {
  flattenNativeTextInput,
  nativeTextInputSources,
  retainNativeTextInputContext,
} from './nativeTextInputProvenance';
import {
  nativeStyleBorderDeclarations,
  applyNativeBorderStyle,
  copyNativeBorderStyle,
} from './borders';
import type { NativeStyle } from './sx';
import {
  inheritedTextStyle,
  isNativeTextStyleProperty,
  nativeStyleTextMetrics,
  normalizeTextStyle,
  applyNativeTextMetrics,
  getTextStyleInheritance,
  nativeTextAlignmentStyle,
  nativeTextParagraphDirection,
  type NativeCssTextAlign,
} from './nativeText';
export interface NativeTextScopeValue {
  style: TextStyle;
  literalStyle?: TextStyle;
  lineHeight?: number;
  /** Known native layout direction, preserved across physical Portal destinations. */
  direction?: 'ltr' | 'rtl' | undefined;
  /** CSS physical/logical alignment stays distinct from genuine native inline values. */
  textAlign?: NativeCssTextAlign | undefined;
  /** Actual emitting paragraph; virtual Text has no independent Yoga direction. */
  paragraphDirection?: 'ltr' | 'rtl' | undefined;
  nativeText: boolean;
}
export const NativeTextStyleContext = createContext<NativeTextScopeValue | undefined>(undefined);
export const useNativeTextContext = () => useContext(NativeTextStyleContext);
export function nativeTextStyleContext(
  parent: NativeTextScopeValue | undefined,
  style?: StyleProp<NativeStyle>,
  theme?: Theme,
) {
  const context = {
    parentTextStyle:
      parent?.style ?? (theme ? { fontSize: theme.cssRootFontSize ?? 16 } : undefined),
    parentLineHeight: parent?.lineHeight,
    parentDirection: nativeTextParagraphDirection(parent?.direction, undefined, false),
    parentTextAlign: parent?.textAlign,
    nativeStyle: flattenNativeTextInput(style, StyleSheet.flatten) ?? undefined,
    nativeTextMetrics: nativeStyleTextMetrics(style),
    inheritOnly: true,
  };
  retainNativeTextInputContext(context, style);
  return context;
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
  owningParagraph?: 'ltr' | 'rtl',
) {
  const flat = nativeStyleBorderDeclarations(style);
  const text = { ...inheritedTextStyle(flat) };
  const metrics = nativeStyleTextMetrics(style);
  // Literal RN lineHeight is an absolute length, unlike a CSS unitless ratio.
  if (!Object.hasOwn(metrics, 'lineHeight')) delete text.lineHeight;
  const context = trackNativeTextContext(nativeTextStyleContext(parent, style, theme));
  const normalized = normalizeTextStyle(
    text as Record<string, unknown>,
    theme,
    context,
  ) as TextStyle;
  const adjusted = applyNativeTextMetrics(flat, normalized, metrics) ?? {};
  let defaults: Record<string, unknown> | undefined;
  const base =
    parent?.style ??
    (kind === 'view'
      ? (normalizeTextStyle(
          (defaults = {
            fontFamily: theme.typography.fontFamily,
            fontSize: theme.cssRootFontSize ?? 16,
            color: theme.palette.text.primary,
          }),
          theme,
        ) as TextStyle)
      : {});
  const own = { ...flat, ...ownText(normalized), ...ownText(adjusted) };
  // Fabric processes an explicitly cleared transform before sending the reset.
  // Use the identity array, preserving the last style layer's reset semantics;
  // leave absent keys absent so they do not override another owner's transform.
  if (Object.hasOwn(own, 'transform') && own.transform == null) own.transform = [];
  for (const key of Object.keys(own))
    if (
      isNativeTextStyleProperty(key) &&
      (own[key as keyof typeof own] == null ||
        own[key as keyof typeof own] === 'inherit' ||
        own[key as keyof typeof own] === 'unset')
    )
      delete own[key as keyof typeof own];
  const direction =
    flat.direction === 'ltr' || flat.direction === 'rtl'
      ? flat.direction
      : nativeTextParagraphDirection(parent?.direction, undefined, false);
  // RN View resets TextAncestorContext (View.js:125-128). Preserve CSS
  // inheritance across Views, but only Text can retain an owning paragraph.
  const paragraphDirection = kind === 'text' ? (owningParagraph ?? direction) : undefined;
  const inheritance = getTextStyleInheritance(normalized, undefined, adjusted);
  const inherited = { ...base, ...ownText(normalized), ...ownText(adjusted) };
  // A genuine native undefined/null reset clears this property, including a
  // synthetic parent CSS value. It must not turn back into CSS inheritance.
  if (
    Object.hasOwn(flat, 'textAlign') &&
    flat.textAlign == null &&
    !Object.hasOwn(metrics, 'textAlign')
  ) {
    delete own.textAlign;
    delete inherited.textAlign;
  }
  const value: NativeTextScopeValue = {
    style: inherited,
    lineHeight: inheritance.lineHeight,
    nativeText: kind === 'text',
    direction,
    ...(paragraphDirection ? { paragraphDirection } : {}),
    ...(inheritance.textAlign ? { textAlign: inheritance.textAlign } : {}),
  };
  setNativeTextScopeParent(value, parent);
  const inheritable = inheritedTextStyle(flat);
  value.literalStyle = {
    ...value.style,
    ...Object.fromEntries(
      Object.entries(flat).filter(
        ([key]) => isNativeTextStyleProperty(key) && !Object.hasOwn(inheritable, key),
      ),
    ),
  };
  const materializeParent = kind !== 'view' && parent && !parent.nativeText;
  const native =
    kind === 'view'
      ? Object.fromEntries(Object.entries(own).filter(([key]) => !isNativeTextStyleProperty(key)))
      : { ...(materializeParent ? value.style : {}), ...own };
  const presentation = applyNativeBorderStyle(
    copyNativeBorderStyle(
      flat,
      kind === 'text'
        ? nativeTextAlignmentStyle(native, value.textAlign, paragraphDirection ?? direction)
        : native,
    ),
  );
  return {
    value,
    native: presentation,
    provenance: finishNativeTextProvenance(
      normalized,
      presentation,
      value.literalStyle,
      metrics,
      defaults,
      nativeTextInputSources(flat, kind, context),
      {
        scopeKind: kind,
        materializesParentTextStyle: !!materializeParent,
        paragraphDirection: paragraphDirection ?? direction,
        cssTextAlign: value.textAlign,
      },
      context,
      defaults ? base : undefined,
    ),
  };
}
export interface NativeTextScopeProps {
  theme: Theme;
  style?: StyleProp<NativeStyle>;
  kind?: 'view' | 'text';
  reset?: boolean;
  /** Native root owned by this scope; used for physical Portal inheritance. */
  rootRef?: React.RefObject<object | null>;
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
  rootRef,
  content,
  children,
}: NativeTextScopeProps) {
  const outer = useNativeTextContext();
  const parent = reset ? undefined : outer;
  const hasTextAncestor = useContext(TextAncestorContext);
  const owningParagraph =
    kind === 'text' && hasTextAncestor
      ? nativeTextParagraphDirection(undefined, parent?.paragraphDirection, true)
      : undefined;
  const resolved = useMemo(
    () => resolveScope(theme, parent, style, kind, owningParagraph),
    [theme, parent, style, kind, owningParagraph],
  );
  // Equivalent style arrays must not broadcast a fresh inheritance context.
  // Nested groups inside a custom Portal otherwise feed their own publications.
  const stable = useRef(resolved.value);
  if (!equalNativeTextScopeValue(stable.current, resolved.value)) stable.current = resolved.value;
  setNativeTextScopeParent(stable.current, parent);
  useNativeTextScopeRoot(rootRef, stable.current);
  const trackChildren = useNativeTextChildRoots();
  return (
    <NativeTextStyleContext.Provider value={stable.current}>
      {children(
        resolved.native,
        renderNativeTextChildren(
          content,
          theme,
          stable.current,
          trackChildren,
          '',
          resolved.provenance,
        ),
        stable.current,
      )}
    </NativeTextStyleContext.Provider>
  );
}
// An outer wrapper can prepare children before its selected native root renders.
// Keep only our own cloned props so the nearest scope can rebind inheritance;
// a consumer clone or changed style/children remains an authored native layer.
type EmittedStyle = {
  prototype: object | null;
  descriptors: PropertyDescriptorMap;
  keys: readonly (string | symbol)[];
};
function snapshotEmission(style: unknown): EmittedStyle | undefined {
  if (!style || typeof style !== 'object') return undefined;
  const prototype = Object.getPrototypeOf(style) as object | null;
  if (prototype !== Object.prototype && prototype !== null) return undefined;
  const descriptors = Object.getOwnPropertyDescriptors(style);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.some((key) => !Object.hasOwn(Reflect.get(descriptors, key) as PropertyDescriptor, 'value'))
  )
    return undefined;
  return { prototype, descriptors, keys };
}
function unchangedEmission(
  props: object,
  style: unknown,
  content: React.ReactNode,
  saved: EmittedStyle | undefined,
) {
  if (
    !saved ||
    !style ||
    typeof style !== 'object' ||
    Object.getPrototypeOf(style) !== saved.prototype
  )
    return false;
  const propStyle = Object.getOwnPropertyDescriptor(props, 'style');
  const propChildren = Object.getOwnPropertyDescriptor(props, 'children');
  if (
    !propStyle ||
    !Object.hasOwn(propStyle, 'value') ||
    propStyle.value !== style ||
    !propChildren ||
    !Object.hasOwn(propChildren, 'value') ||
    propChildren.value !== content
  )
    return false;
  const current = Object.getOwnPropertyDescriptors(style),
    keys = Reflect.ownKeys(current);
  return (
    keys.length === saved.keys.length &&
    keys.every((key, index) => {
      if (key !== saved.keys[index]) return false;
      const before = Reflect.get(saved.descriptors, key) as PropertyDescriptor;
      const after = Reflect.get(current, key) as PropertyDescriptor;
      return (
        Object.hasOwn(after, 'value') &&
        Object.is(after.value, before.value) &&
        after.enumerable === before.enumerable &&
        after.configurable === before.configurable &&
        after.writable === before.writable
      );
    })
  );
}
const childInputs = new WeakMap<
  object,
  {
    style: StyleProp<NativeStyle>;
    content: React.ReactNode;
    emittedStyle: StyleProp<NativeStyle>;
    emittedContent: React.ReactNode;
    emission: EmittedStyle | undefined;
  }
>();
const literalInputs = new WeakMap<
  object,
  { style: StyleProp<TextStyle>; content: string; emission: EmittedStyle | undefined }
>();
function originalChildInput(props: object) {
  const saved = childInputs.get(props);
  return saved && unchangedEmission(props, saved.emittedStyle, saved.emittedContent, saved.emission)
    ? saved
    : undefined;
}

// Only library-created literal runs use this wrapper. Explicit consumer Text
// keeps its own nativeID/id, refs and props. The namespace identifies origin;
// it does not authenticate callers or add another native host.
function GeneratedParagraph(props: { children: string; style: StyleProp<TextStyle> }) {
  const { children, style } = props;
  // An unconditional hook keeps identity stable across updates and StrictMode.
  const id = useId();
  const mobile = Platform.OS === 'ios' || Platform.OS === 'android';
  return sealNativeTextEmission(
    <Text
      style={style}
      {...(mobile ? { nativeID: GENERATED_TEXT_ORIGIN_CONTRACT.nativeIDPrefix + id } : {})}
    >
      {children}
    </Text>,
    style,
    props,
  );
}
export function renderNativeTextChildren(
  content: React.ReactNode,
  theme: Theme,
  scope: NativeTextScopeValue,
  track?: NativeTextChildRootTracker,
  parentKey = '',
  provenance?: NativeTextProvenance,
): React.ReactNode {
  const items = React.Children.toArray(content),
    result: React.ReactNode[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length) {
      const style = nativeTextAlignmentStyle(
        scope.literalStyle ?? scope.style,
        scope.textAlign,
        scope.paragraphDirection ??
          scope.direction ??
          nativeTextParagraphDirection(undefined, undefined, false),
      );
      const element = (
        <GeneratedParagraph key={'native-text:' + result.length} style={style}>
          {run.join('')}
        </GeneratedParagraph>
      );
      literalInputs.set(element.props, {
        style,
        content: run.join(''),
        emission: snapshotEmission(style),
      });
      bindNativeTextEmission(element.props, style, provenance);
      result.push(element);
      run = [];
    }
  };
  for (const [index, child] of items.entries()) {
    // JSON string segments preserve arbitrary React keys, including lone UTF16
    // surrogates, without allowing a child key to impersonate a path separator.
    const segment = React.isValidElement(child) ? (child.key ?? index) : index;
    const key = parentKey + '/' + JSON.stringify(String(segment));
    const literal =
      React.isValidElement<{ style?: StyleProp<TextStyle>; children?: React.ReactNode }>(child) &&
      child.type === GeneratedParagraph
        ? literalInputs.get(child.props)
        : undefined;
    if (
      literal &&
      React.isValidElement<{ style?: StyleProp<TextStyle>; children?: React.ReactNode }>(child) &&
      unchangedEmission(child.props, literal.style, literal.content, literal.emission)
    ) {
      if (scope.nativeText) result.push(literal.content);
      else if (literal.content) run.push(literal.content);
      continue;
    }
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
      React.isValidElement<{
        children?: React.ReactNode;
        style?: StyleProp<NativeStyle>;
        ref?: React.Ref<object>;
      }>(child)
    ) {
      if (child.type === React.Fragment)
        result.push(
          React.cloneElement(
            child,
            {},
            renderNativeTextChildren(child.props.children, theme, scope, track, key, provenance),
          ),
        );
      else if (child.type === Text || child.type === View) {
        const input = originalChildInput(child.props);
        const sourceStyle = input ? input.style : child.props.style;
        const resolved = resolveScope(
          theme,
          scope,
          sourceStyle,
          child.type === Text ? 'text' : 'view',
          child.type === Text ? scope.paragraphDirection : undefined,
        );
        const sourceContent = input ? input.content : child.props.children;
        const element = React.cloneElement(
          child,
          {
            style: resolved.native,
            ...(track ? { ref: track(key, child.props.ref, resolved.value) } : {}),
          },
          <NativeTextStyleContext.Provider value={resolved.value}>
            {renderNativeTextChildren(
              sourceContent,
              theme,
              resolved.value,
              track,
              key,
              resolved.provenance,
            )}
          </NativeTextStyleContext.Provider>,
        );
        childInputs.set(element.props, {
          style: sourceStyle,
          content: sourceContent,
          emittedStyle: resolved.native,
          emittedContent: element.props.children,
          emission: snapshotEmission(resolved.native),
        });
        result.push(
          child.type === Text
            ? sealNativeTextElement(element, resolved.native, resolved.provenance)
            : element,
        );
      } else result.push(child);
    } else result.push(child);
  }
  flush();
  return result.length === 1 ? result[0] : result;
}
