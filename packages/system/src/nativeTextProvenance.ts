// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Private handoff receipts. No React/RN objects, callbacks or processors are read.
import type { NativeTextInputSources } from './nativeTextInputProvenance';
export type NativeTextNormalization = Readonly<{
  rootFont: unknown;
  bodyFont: unknown;
  rootSize: number;
  parentSize: number;
  effectiveSize: number;
  direction: unknown;
  metrics: Readonly<Record<string, unknown>>;
  canonical: Readonly<Record<string, unknown>>;
  fallbackDirection?: unknown;
}>;
export type NativeTextProvenance = Readonly<{
  inputs?: NativeTextInputSources;
  emissionPolicy?: Readonly<{
    scopeKind: 'view' | 'text';
    materializesParentTextStyle: boolean;
    paragraphDirection: 'ltr' | 'rtl';
    cssTextAlign: 'left' | 'right' | 'start' | 'end' | undefined;
  }>;
  normalization: NativeTextNormalization;
  nativeTextMetrics: Readonly<Record<string, unknown>>;
  inheritOnly: true;
  defaults: Readonly<Record<string, unknown>> | undefined;
  normalizedDefaults: Readonly<Record<string, unknown>> | undefined;
}>;
const contexts = new WeakSet<object>();
const fallbackDirections = new WeakMap<object, unknown>();
const normalizations = new WeakMap<object, NativeTextNormalization>();
const styles = new WeakMap<object, NativeTextProvenance>();
const frames = new WeakSet<object>();
type TextDescriptors = Readonly<{
  prototype: object | null;
  entries: readonly (readonly [string, PropertyDescriptor | undefined])[];
}>;
type TextReceipt = Readonly<{
  style: object;
  provenance: NativeTextProvenance;
  emission: Readonly<Record<string, unknown>>;
  rnProcessingValidated: false;
}>;
const elements = new WeakMap<object, { receipt: TextReceipt; entries: TextDescriptors }>();
export function trackNativeTextContext<T extends object>(context: T): T {
  contexts.add(context);
  const parent = Object.getOwnPropertyDescriptor(context, 'parentDirection');
  if (parent && Object.hasOwn(parent, 'value')) fallbackDirections.set(context, parent.value);
  else fallbackDirections.delete(context);
  return context;
}
export function tracksNativeTextContext(context: object): boolean {
  return contexts.has(context);
}
export function retainNativeTextNormalization(
  output: object,
  frame: Omit<NativeTextNormalization, 'canonical' | 'fallbackDirection'>,
): void {
  const entries = textDescriptors(output);
  if (!entries) return;
  normalizations.set(
    output,
    Object.freeze({
      ...frame,
      canonical: snapshotTextData(entries),
      metrics: Object.freeze({ ...frame.metrics }),
    }),
  );
}
export function finishNativeTextProvenance(
  normalized: object,
  native: object,
  literal: object,
  metrics: Record<string, unknown>,
  defaults: Record<string, unknown> | undefined,
  inputs?: NativeTextInputSources,
  emissionPolicy?: NativeTextProvenance['emissionPolicy'],
  context?: object,
  normalizedDefaults?: object,
): NativeTextProvenance | undefined {
  const captured = normalizations.get(normalized);
  const normalization =
    captured && context
      ? Object.freeze({ ...captured, fallbackDirection: fallbackDirections.get(context) })
      : captured;
  if (!normalization) return undefined;
  const defaultEntries = normalizedDefaults ? textDescriptors(normalizedDefaults) : undefined;
  const frame: NativeTextProvenance = Object.freeze({
    ...(inputs ? { inputs } : {}),
    ...(emissionPolicy ? { emissionPolicy: Object.freeze({ ...emissionPolicy }) } : {}),
    normalization,
    nativeTextMetrics: Object.freeze({ ...metrics }),
    inheritOnly: true,
    defaults: defaults ? Object.freeze({ ...defaults }) : undefined,
    normalizedDefaults: defaultEntries ? snapshotTextData(defaultEntries) : undefined,
  });
  frames.add(frame);
  styles.set(native, frame);
  styles.set(literal, frame);
  return frame;
}
export function nativeTextStyleProvenance(style: unknown): NativeTextProvenance | undefined {
  return style !== null && typeof style === 'object' ? styles.get(style) : undefined;
}
// The actual Text element construction supplies both arguments. A branded
// frame can accompany a reused literal style without changing its old metadata.
export function sealNativeTextElement<T extends object>(
  element: T,
  style: unknown,
  provenance = nativeTextStyleProvenance(style),
): T {
  if (provenance) {
    if (!frames.has(provenance)) throw new Error('Untracked native text provenance');
    if (!style || typeof style !== 'object') return element;
    const entries = textDescriptors(style);
    if (entries) storeTextReceipt(element, style, provenance, entries);
  }
  return element;
}
export function nativeTextElementProvenance(element: unknown) {
  const saved = element !== null && typeof element === 'object' ? elements.get(element) : undefined;
  return saved && sameTextDescriptors(saved.receipt.style, saved.entries)
    ? saved.receipt
    : undefined;
}

// Props are branded only at the actual library-created React element. Public
// cloneElement/createElement copies are untracked, with no authority prop to replay.
export const nativeTextEmissionKeys = Object.freeze([
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'fontVariant',
  'fontVariationSettings',
  'color',
  'textAlign',
  'textTransform',
  'textDecorationLine',
  'textDecorationStyle',
  'textDecorationColor',
  'writingDirection',
  'textShadowColor',
  'textShadowOffset',
  'textShadowRadius',
  'direction',
  'includeFontPadding',
  'textAlignVertical',
  'verticalAlign',
  'userSelect',
] as const);
function textDescriptors(style: object): TextDescriptors | undefined {
  const prototype: object | null = Object.getPrototypeOf(style);
  if (prototype !== Object.prototype && prototype !== null) return undefined;
  const entries = nativeTextEmissionKeys.map(
    (key) => [key, Object.getOwnPropertyDescriptor(style, key)] as const,
  );
  return entries.some(([, descriptor]) => descriptor && !Object.hasOwn(descriptor, 'value'))
    ? undefined
    : { prototype, entries };
}
function sameTextDescriptors(style: object, snapshot: TextDescriptors): boolean {
  if (Object.getPrototypeOf(style) !== snapshot.prototype) return false;
  for (const [key, before] of snapshot.entries) {
    const after = Object.getOwnPropertyDescriptor(style, key);
    if (!before) {
      if (after) return false;
      continue;
    }
    if (
      !after ||
      !Object.hasOwn(after, 'value') ||
      !Object.is(after.value, before.value) ||
      after.enumerable !== before.enumerable ||
      after.configurable !== before.configurable ||
      after.writable !== before.writable
    )
      return false;
  }
  return true;
}
function snapshotTextData(snapshot: TextDescriptors): Readonly<Record<string, unknown>> {
  return Object.freeze(
    Object.fromEntries(
      snapshot.entries.flatMap(([key, entry]) => (entry?.enumerable ? [[key, entry.value]] : [])),
    ),
  );
}
function storeTextReceipt(
  element: object,
  style: object,
  provenance: NativeTextProvenance,
  entries: TextDescriptors,
) {
  elements.set(element, {
    receipt: Object.freeze({
      style,
      provenance,
      // Entries already came from the existing23 DATA descriptor snapshot.
      // Do not read style again or walk/process any retained opaque value.
      emission: snapshotTextData(entries),
      rnProcessingValidated: false,
    }),
    entries,
  });
}
const emissions = new WeakMap<
  object,
  {
    style: object;
    provenance: NativeTextProvenance;
    entries: TextDescriptors;
  }
>();
export function bindNativeTextEmission(
  props: object,
  style: unknown,
  provenance: NativeTextProvenance | undefined,
): void {
  if (!provenance || !frames.has(provenance) || !style || typeof style !== 'object') return;
  const entries = textDescriptors(style);
  if (entries) emissions.set(props, { style, provenance, entries });
}
export function sealNativeTextEmission<T extends object>(
  element: T,
  style: unknown,
  props: object,
): T {
  const saved = emissions.get(props);
  if (!saved || saved.style !== style || !sameTextDescriptors(saved.style, saved.entries))
    return element;
  storeTextReceipt(element, saved.style, saved.provenance, saved.entries);
  return element;
}
