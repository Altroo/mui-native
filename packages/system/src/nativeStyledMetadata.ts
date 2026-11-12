// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  nativeCssProgram,
  nativeCssProgramTree,
  type NativeCssProgramNode,
  type NativeCssOwner,
  type NativeCssProgrammeOccurrence,
} from './nativeCssProgram';
import { nativeStyleCacheRegistry, type NativeStyleCache } from './nativeStyleCache';
import type { StyleProp } from 'react-native';
import type { NativeStyle, StyleContext } from './sx';

export type NativePreparedNode = {
  readonly base: Readonly<Record<string, unknown>>;
  readonly conditions?: ReadonlyMap<string, readonly NativePreparedNode[] | undefined>;
};
export type NativeSelectorContext = Pick<
  StyleContext,
  | 'classes'
  | 'lastChild'
  | 'states'
  | 'descendantClasses'
  | 'descendantPath'
  | 'descendantOnly'
  | 'slot'
  | 'width'
  | 'protectPhysicalGeometry'
>;
export type NativePreparedSheet = {
  readonly emissionProgramme?: NativeCssProgrammeOccurrence;
  readonly emissionProgrammeStart?: boolean;
  /** A retained foreign class keeps its emitting stylesheet, never a prospective insertion. */
  readonly emissionForeign?: boolean;
  readonly emissionPosition?: number;
  readonly emissionOwner?: NativeCssOwner;
  readonly emissionStart?: boolean;
  readonly nodes: readonly NativePreparedNode[];
  readonly context: NativeSelectorContext;
  readonly ancestor?: boolean;
  /** Same-host source selectors retain Base aliases and virtual states in native frames. */
  readonly retainSourceContext?: true;
};
/** @internal Immutable CSS prepared at its owning root, reusable by physical descendants. */
export interface NativePreparedStyle {
  readonly sheets: readonly NativePreparedSheet[];
  /** Actual source roots retain their ordered emitted classes; helper recipes omit this. */
  readonly classTokens?: readonly NativeCssProgrammeOccurrence[];
}
interface NativeStyledStyleDescriptor {
  readonly sheets: readonly NativePreparedSheet[];
  readonly authored: StyleProp<NativeStyle>;
  readonly hasAuthoredStyle: boolean;
  /** Present only for emitted class references; native preparation recipes stay explicit CSS. */
  readonly classTokens?: readonly NativeCssProgrammeOccurrence[];
}
// Library-created arrays are the only keys. Metadata never appears on native
// payloads or caller objects, and retained sheets are never changed by defaults.
export const nativeStyledStyles = new WeakMap<object, NativeStyledStyleDescriptor>();
/** Ordered emitted classes stay separate from their declaration-sheet order. */
export function nativeStyleClassTokens(style: unknown): NativeCssProgrammeOccurrence[] {
  if (!style || typeof style !== 'object') return [];
  const descriptor = nativeStyledStyles.get(style);
  if (descriptor)
    return descriptor.classTokens
      ? [...descriptor.classTokens]
      : nativeStyleClassTokens(descriptor.authored);
  return Array.isArray(style) ? style.flatMap(nativeStyleClassTokens) : [];
}

/** Finalize ordered classes once, with the same immutable carrier descriptor. */
export function nativeStyleClassReferences(
  sheets: readonly NativePreparedSheet[],
  incoming: unknown,
  cache: NativeStyleCache,
): readonly NativeCssProgrammeOccurrence[] {
  const own = sheets.find((sheet) => !sheet.ancestor && !sheet.emissionForeign)?.emissionProgramme;
  const unknown = nativeStyleClassTokens(incoming).filter(
    (token) => !nativeStyleCacheRegistry.registered(cache, token.insertion),
  );
  return Object.freeze([...unknown, ...(own ? [own] : [])]);
}
/** Nonterminal classes register after prop filtering, before virtual child preparation. */
export function registerNativeStyleClass(style: StyleProp<NativeStyle>, register: boolean) {
  if (!style || typeof style !== 'object') throw Error('Expected an owned styled carrier');
  const descriptor = nativeStyledStyles.get(style);
  if (!descriptor?.classTokens) throw Error('Expected prepared styled class metadata');
  const own = descriptor.sheets.find(
    (sheet) => !sheet.ancestor && !sheet.emissionForeign,
  )?.emissionProgramme;
  if (register && own) nativeStyleCacheRegistry.register([own.insertion]);
}

/** Only rendered classes require cache-local lookup; native recipes are explicit CSS fragments. */
export function registeredNativeCssProgrammes(
  style: unknown,
  cache: NativeStyleCache,
): NativeCssProgramNode[] {
  if (!style || typeof style !== 'object') return [];
  const descriptor = nativeStyledStyles.get(style);
  if (descriptor) {
    if (descriptor.classTokens)
      return descriptor.classTokens
        .filter((token) => nativeStyleCacheRegistry.registered(cache, token.insertion))
        .map((token) => token.programme);
    return [nativeCssProgramTree(descriptor.sheets)];
  }
  return Array.isArray(style)
    ? style.flatMap((value) => registeredNativeCssProgrammes(value, cache))
    : [];
}

interface StyleInput {
  readonly sheets: readonly NativePreparedSheet[];
  readonly style: unknown;
  readonly supplied: boolean;
}
function separateStyle(style: unknown, supplied: boolean): StyleInput {
  const descriptor = style && typeof style === 'object' ? nativeStyledStyles.get(style) : undefined;
  if (descriptor) {
    const nested = separateStyle(descriptor.authored, descriptor.hasAuthoredStyle);
    return { ...nested, sheets: [...descriptor.sheets, ...nested.sheets] };
  }
  if (Array.isArray(style)) {
    const nested = style.map((layer) => separateStyle(layer, true));
    const sheets = nested.flatMap((layer) => layer.sheets);
    return { sheets, style: sheets.length ? nested.map((layer) => layer.style) : style, supplied };
  }
  return { sheets: [], style, supplied };
}
/** Native inline data remains outside an already-prepared source root's CSS. */
export function nativeInlineStyle(style: StyleProp<NativeStyle>): StyleProp<NativeStyle> {
  return separateStyle(style, true).style as StyleProp<NativeStyle>;
}
/** @internal A retained carrier may widen a narrow object/tuple; callback argument ABI is preserved. */
export type NativeRootStyle<Style> = Style extends (...args: infer Args) => unknown
  ? (...args: Args) => StyleProp<NativeStyle>
  : StyleProp<NativeStyle>;
export type NativeRootStyleInput =
  | StyleProp<NativeStyle>
  | ((...args: never[]) => StyleProp<NativeStyle>);
interface NativeStyleProps {
  style?: NativeRootStyleInput | undefined;
}
interface NativeRootPreparation<Props> {
  readonly props: Props;
  readonly prepared:
    | {
        readonly sheets: readonly NativePreparedSheet[];
        readonly fallback: unknown;
        readonly classTokens?: readonly NativeCssProgrammeOccurrence[];
      }
    | undefined;
}
/** @internal Separate owned CSS from the genuine native layer without evaluating callbacks. */
export function nativeStyleInput(style: unknown, supplied: boolean): StyleInput {
  return separateStyle(style, supplied);
}
/** Root-local split before default resolution; do not send prepared CSS through public props. */
export function separateNativeRootProps<Props extends NativeStyleProps>(
  props: Props,
): NativeRootPreparation<Props> {
  const descriptor = Object.getOwnPropertyDescriptor(props, 'style');
  if (descriptor && !descriptor.enumerable) {
    // Source prop spreads ignore hidden styles. Omit the carrier without
    // observing an accessor or retaining its prepared CSS for the final root.
    const descriptors: PropertyDescriptorMap = Object.getOwnPropertyDescriptors(props);
    delete descriptors.style;
    return { props: Object.create(Object.getPrototypeOf(props), descriptors), prepared: undefined };
  }
  const supplied = descriptor !== undefined;
  const style = supplied ? props.style : undefined;
  const separated = separateStyle(style, supplied);
  // An accessor has already been observed while checking for prepared CSS.
  // Cache that value so the following default spread does not invoke it again;
  // ordinary data props retain their original identity.
  if (!separated.sheets.length && (!descriptor || 'value' in descriptor))
    return { props, prepared: undefined };
  // Keep other accessors lazy, and replace this one already-observed style value.
  // In particular, deleting absent style allows defaultProps.style to apply;
  // explicit undefined and null retain their distinct source presence semantics.
  const descriptors: PropertyDescriptorMap = Object.getOwnPropertyDescriptors(props);
  if (separated.supplied)
    descriptors.style = {
      value: separated.style,
      enumerable: descriptor?.enumerable ?? false,
      writable: true,
      configurable: true,
    };
  else delete descriptors.style;
  const clean: Props = Object.create(Object.getPrototypeOf(props), descriptors);
  return {
    props: clean,
    prepared: separated.sheets.length
      ? Object.freeze({
          sheets: Object.freeze(separated.sheets),
          fallback: style,
          ...(nativeStyleClassTokens(style).length
            ? { classTokens: Object.freeze(nativeStyleClassTokens(style)) }
            : {}),
        })
      : undefined,
  };
}
/** Reattach immutable sheets outside resolved public props for the final CSS root resolver. */
export function restoreNativeRootStyle<Props extends NativeStyleProps>(
  input: NativeRootPreparation<Props>,
  props: Props,
): NativeRootStyle<Props['style']>;
export function restoreNativeRootStyle(
  input: NativeRootPreparation<NativeStyleProps>,
  props: NativeStyleProps,
): unknown {
  const authored = props.style;
  if (!input.prepared) return authored;
  const retain = (native: StyleProp<NativeStyle>) => {
    // Retain the existing eager native fallback without mutating its layers.
    // Metadata belongs only to this newly allocated carrier.
    const style = [input.prepared!.fallback, native];
    nativeStyledStyles.set(
      style,
      Object.freeze({
        sheets: input.prepared!.sheets,
        ...(input.prepared!.classTokens ? { classTokens: input.prepared!.classTokens } : {}),
        authored: native,
        hasAuthoredStyle: Object.hasOwn(props, 'style'),
      }),
    );
    return style;
  };
  // Stateful native roots may resolve a genuine style callback after defaults.
  // Do not execute it here: the host supplies its actual state, once, and only
  // its returned native layers are attached to the retained immutable CSS.
  return typeof authored === 'function'
    ? (...args: unknown[]) => retain(Reflect.apply(authored, undefined, args))
    : retain(authored);
}

/** Internal pure CSS handoff; genuine style/prop presence stays on the actual root. */
export function retainNativeRootCss(
  style: StyleProp<NativeStyle>,
  programme: StyleProp<NativeStyle>,
  supplied: boolean,
  fallback: StyleProp<NativeStyle> = style,
): StyleProp<NativeStyle> {
  const descriptor =
    programme && typeof programme === 'object' ? nativeStyledStyles.get(programme) : undefined;
  if (!descriptor) throw Error('Expected first-party prepared root CSS');
  // Plain native roots read the fallback; participating roots recover only
  // genuine inline values and source classes from the immutable descriptor.
  const carrier = [fallback];
  nativeStyledStyles.set(
    carrier,
    Object.freeze({
      sheets: descriptor.sheets,
      authored: style,
      hasAuthoredStyle: supplied,
      ...(descriptor.classTokens ? { classTokens: descriptor.classTokens } : {}),
    }),
  );
  return carrier;
}

const generatedRootToken = /^altroo-root-(css|handoff)-v1-/;
const selectorKeys = [
  'classes',
  'lastChild',
  'states',
  'descendantClasses',
  'descendantPath',
  'descendantOnly',
  'slot',
  'width',
  'protectPhysicalGeometry',
] as const;
/** Pure descriptor comparison of prepared data, never user getter evaluation. */
function samePreparedData(a: unknown, b: unknown, seen = new WeakMap<object, object>()): boolean {
  if (Object.is(a, b)) return true;
  if (
    !a ||
    !b ||
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)
  )
    return false;
  if (seen.has(a)) return seen.get(a) === b;
  seen.set(a, b);
  if (a instanceof Map && b instanceof Map) {
    const right = [...b];
    return (
      a.size === b.size &&
      [...a].every(
        ([key, value], at) =>
          Object.is(key, right[at][0]) && samePreparedData(value, right[at][1], seen),
      )
    );
  }
  if (
    !Array.isArray(a) &&
    Object.getPrototypeOf(a) !== Object.prototype &&
    Object.getPrototypeOf(a) !== null
  )
    return false;
  const left = Object.getOwnPropertyDescriptors(a),
    right = Object.getOwnPropertyDescriptors(b);
  const keys = Reflect.ownKeys(left),
    other = Reflect.ownKeys(right);
  return (
    keys.length === other.length &&
    keys.every((key, at) => {
      if (key !== other[at]) return false;
      const x = Reflect.get(left, key) as PropertyDescriptor,
        y = Reflect.get(right, key) as PropertyDescriptor;
      return (
        'value' in x === 'value' in y &&
        ('value' in x
          ? samePreparedData(x.value, y.value, seen)
          : x.get === y.get && x.set === y.set)
      );
    })
  );
}
function selectorSnapshot(context: NativeSelectorContext): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of selectorKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(context, key);
    if (!descriptor) continue;
    // This field is the library-owned deferred structural predicate. A later
    // compiler binds each counterfactual; do not observe a released getter.
    if (!('value' in descriptor)) {
      result[key] = key === 'lastChild' ? 'deferred-last-child' : descriptor;
      continue;
    }
    const value: unknown = descriptor.value;
    result[key] =
      (key === 'classes' || key === 'descendantClasses') && Array.isArray(value)
        ? value.filter((value) => typeof value !== 'string' || !generatedRootToken.test(value))
        : value;
  }
  return result;
}
/** Compare stylesheet semantics rather than freshly allocated carrier identity. */
export function sameNativeRootCss(a: StyleProp<NativeStyle>, b: StyleProp<NativeStyle>): boolean {
  if (a === b) return true;
  const left = a && typeof a === 'object' ? nativeStyledStyles.get(a) : undefined;
  const right = b && typeof b === 'object' ? nativeStyledStyles.get(b) : undefined;
  return (
    !!left &&
    !!right &&
    Boolean(left.classTokens) === Boolean(right.classTokens) &&
    (left.classTokens ?? []).length === (right.classTokens ?? []).length &&
    (left.classTokens ?? []).every(
      (token, index) =>
        token.insertion.cache === right.classTokens![index].insertion.cache &&
        token.insertion.css === right.classTokens![index].insertion.css,
    ) &&
    nativeCssProgram(left.sheets) === nativeCssProgram(right.sheets) &&
    left.sheets.length === right.sheets.length &&
    left.sheets.every((sheet, index) => {
      const other = right.sheets[index];
      return (
        sheet.ancestor === other.ancestor &&
        sheet.retainSourceContext === other.retainSourceContext &&
        Boolean(sheet.emissionForeign) === Boolean(other.emissionForeign) &&
        sheet.emissionProgramme?.insertion.cache === other.emissionProgramme?.insertion.cache &&
        samePreparedData(sheet.nodes, other.nodes) &&
        samePreparedData(selectorSnapshot(sheet.context), selectorSnapshot(other.context))
      );
    })
  );
}
/** Retain CSS only. Native inline stays exclusively in the actual accepted props. */
export function snapshotNativeRootCss(programme: StyleProp<NativeStyle>): StyleProp<NativeStyle> {
  const descriptor =
    programme && typeof programme === 'object' ? nativeStyledStyles.get(programme) : undefined;
  if (!descriptor) throw Error('Expected prepared root CSS snapshot');
  const carrier = Object.freeze([undefined]);
  nativeStyledStyles.set(
    carrier,
    Object.freeze({
      sheets: descriptor.sheets,
      authored: undefined,
      hasAuthoredStyle: false,
      ...(descriptor.classTokens ? { classTokens: descriptor.classTokens } : {}),
    }),
  );
  return carrier;
}
