// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Private read-coherent snapshots; no React/native discovery or opaque-leaf reads.
import type { NativePreparedSheet } from './nativeStyledMetadata';
type Data = Readonly<Record<string, unknown>>;
type Entries = readonly (readonly [string, PropertyDescriptor | undefined])[];
type CapturedData = Readonly<{
  sheets: readonly NativePreparedSheet[];
  ordinaryWinner: Data;
  nativeOwn: Data | undefined;
}>;
export type NativeTextInputSources = CapturedData &
  Readonly<{
    scopeKind: 'view' | 'text';
  }>;
type Plan = {
  computed: object;
  computedPrototype: object | null;
  native: object | undefined;
  nativeSupported: boolean;
  sheets: readonly NativePreparedSheet[];
  keys: readonly string[];
  entries: Entries;
  winner: Data;
};
const winners = new WeakMap<object, Data>();
const plans = new WeakMap<object, Plan>();
const captures = new WeakMap<
  object,
  { data: CapturedData; combined: Data; plan: Plan; carrier: object }
>();
const inputContexts = new WeakMap<
  object,
  { values: Data; nativeOwn: Data | undefined; plan: Plan; carrier: object }
>();
const flattenedInputs = new WeakMap<
  object,
  { nativeOwn: Data | undefined; plan: Plan; carrier: object }
>();
const ownKeys = Reflect.ownKeys;
const descriptor = Object.getOwnPropertyDescriptor;
const read = Reflect.get;
const define = Object.defineProperty;
function data(source: object, keys: readonly string[]): Data | undefined {
  const prototype = Object.getPrototypeOf(source);
  if (prototype !== Object.prototype && prototype !== null) return undefined;
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const entry = descriptor(source, key);
    if (!entry) {
      if (prototype && descriptor(prototype, key)) return undefined;
      continue;
    }
    if (!Object.hasOwn(entry, 'value')) return undefined;
    if (entry.enumerable) define(result, key, { value: entry.value, enumerable: true });
  }
  return Object.freeze(result);
}
function same(source: object, entries: Entries) {
  return entries.every(([key, before]) => {
    const after = descriptor(source, key);
    return before
      ? after &&
          Object.hasOwn(after, 'value') &&
          Object.is(after.value, before.value) &&
          after.enumerable === before.enumerable &&
          after.writable === before.writable &&
          after.configurable === before.configurable
      : !after;
  });
}
export function simpleNativeTextInput(style: unknown): boolean {
  try {
    return !Array.isArray(style);
  } catch {
    return false;
  }
}
// Both arguments are library-owned DATA records at the existing CSS finish.
export function retainNativeTextWinner(
  output: object,
  winner: object,
  keys: readonly string[],
): void {
  const snapshot = data(winner, keys);
  if (snapshot) winners.set(output, snapshot);
}
// This two-layer carrier is freshly library-created at registration.
export function retainNativeTextStyleInputs(
  carrier: object,
  computed: object,
  native: object | undefined,
  nativeSupported: boolean,
  sheets: readonly NativePreparedSheet[],
  keys: readonly string[],
): void {
  const winner = winners.get(computed);
  if (!winner) return;
  plans.set(carrier, {
    computed,
    computedPrototype: Object.getPrototypeOf(computed),
    native,
    nativeSupported,
    sheets,
    keys,
    winner,
    entries: keys.map((key) => [key, descriptor(computed, key)] as const),
  });
}
function currentPlan(carrier: object, plan: Plan): boolean {
  const first = descriptor(carrier, '0'),
    second = descriptor(carrier, '1');
  return (
    !!first &&
    Object.hasOwn(first, 'value') &&
    first.value === plan.computed &&
    !!second &&
    Object.hasOwn(second, 'value') &&
    second.value === plan.native &&
    Object.getPrototypeOf(plan.computed) === plan.computedPrototype &&
    same(plan.computed, plan.entries)
  );
}
// Observe RN's existing for-in reads. No extra caller walk or getter runs.
// A transparent carrier observer preserves live index reads, including mutations
// caused by a prior layer. The original receiver reaches each caller Proxy.
export function flattenNativeTextInput<Input, Output>(
  style: Input,
  flatten: (input: Input) => Output,
): Output {
  const plan = style && typeof style === 'object' ? plans.get(style) : undefined;
  if (!plan || !plan.nativeSupported || !currentPlan(style as object, plan)) return flatten(style);
  const values: Record<string, unknown> = {};
  const entries = new Map<PropertyKey, PropertyDescriptor | undefined>();
  let valid = true;
  // Owned empty targets prevent the engine's Proxy invariant checks from
  // repeating descriptor reads against a caller Proxy behind our observer.
  const source = plan.native;
  const native =
    source &&
    new Proxy(Object.create(null) as object, {
      ownKeys() {
        return ownKeys(source);
      },
      getPrototypeOf() {
        return Object.getPrototypeOf(source);
      },
      getOwnPropertyDescriptor(target, key) {
        const entry = descriptor(source, key);
        entries.set(key, entry);
        if (entry && !entry.configurable) define(target, key, entry);
        return entry;
      },
      get(_target, key) {
        const value = read(source, key, source);
        if (typeof key === 'string' && plan.keys.includes(key)) {
          const entry = entries.get(key);
          if (
            !entry?.enumerable ||
            !Object.hasOwn(entry, 'value') ||
            !Object.is(entry.value, value)
          )
            valid = false;
          else define(values, key, { value, enumerable: true });
        }
        return value;
      },
    });
  const observed = new Proxy([], {
    get(_target, key) {
      const value = read(style as object, key, style);
      return key === '1' && value === plan.native ? native : value;
    },
  });
  const output = flatten(observed as Input);
  if (output && typeof output === 'object')
    flattenedInputs.set(output, {
      nativeOwn: valid ? Object.freeze(values) : undefined,
      plan,
      carrier: style as object,
    });
  return output;
}
// Context is freshly library-created; its known carrier Array was already
// flattened by the existing expression into an owned DATA record, not user style.
export function retainNativeTextInputContext(context: object, style: unknown): void {
  const plan = style && typeof style === 'object' ? plans.get(style) : undefined;
  if (!plan || !currentPlan(style as object, plan)) return;
  const entry = descriptor(context, 'nativeStyle');
  if (!entry || !Object.hasOwn(entry, 'value') || !entry.value) return;
  const values = data(entry.value, plan.keys);
  const flattened = flattenedInputs.get(entry.value);
  if (values)
    inputContexts.set(context, {
      values,
      nativeOwn:
        flattened?.plan === plan && flattened.carrier === style ? flattened.nativeOwn : undefined,
      plan,
      carrier: style as object,
    });
}
export function nativeTextInputSources(
  style: object,
  scopeKind: 'view' | 'text',
  context: object,
): NativeTextInputSources | undefined {
  const saved = captures.get(style),
    later = inputContexts.get(context);
  if (
    !saved ||
    !later ||
    saved.plan !== later.plan ||
    saved.carrier !== later.carrier ||
    !currentPlan(saved.carrier, saved.plan)
  )
    return undefined;
  let nativeOwn = saved.data.nativeOwn;
  if (nativeOwn) {
    for (const key of saved.plan.keys) {
      const earlier = descriptor(nativeOwn, key);
      const current = later.nativeOwn && descriptor(later.nativeOwn, key);
      const combined = descriptor(saved.combined, key);
      const laterCombined = descriptor(later.values, key);
      if (
        !later.nativeOwn ||
        (earlier ? !current || !Object.is(earlier.value, current.value) : !!current) ||
        (combined
          ? !laterCombined || !Object.is(combined.value, laterCombined.value)
          : !!laterCombined)
      ) {
        nativeOwn = undefined;
        break;
      }
    }
  }
  return Object.freeze({
    ...saved.data,
    scopeKind,
    nativeOwn: scopeKind === 'text' ? nativeOwn : undefined,
  });
}
export function beginNativeTextInputCapture(style: unknown) {
  const plan = style && typeof style === 'object' ? plans.get(style) : undefined;
  if (!plan || !same(plan.computed, plan.entries)) return undefined;
  const first = descriptor(style as object, '0'),
    second = descriptor(style as object, '1');
  if (
    !first ||
    !Object.hasOwn(first, 'value') ||
    first.value !== plan.computed ||
    !second ||
    !Object.hasOwn(second, 'value') ||
    second.value !== plan.native
  )
    return undefined;
  const visited: object[] = [];
  let own: Data | undefined = plan.native ? undefined : Object.freeze({});
  return {
    // The existing {...flat} CopyDataProperties read with a private DATA tap.
    // No second caller walk/getter; captured containers alone are frozen.
    copy(flat: object): Record<string, unknown> {
      visited.push(flat);
      const target: Record<string, unknown> = {};
      let sourceValid = true;
      for (const key of ownKeys(flat)) {
        const entry = descriptor(flat, key);
        if (entry && typeof key === 'string' && plan.keys.includes(key) && !entry.enumerable)
          sourceValid = false;
        if (!entry?.enumerable) continue;
        const value = read(flat, key);
        define(target, key, { value, enumerable: true, writable: true, configurable: true });
        if (
          typeof key === 'string' &&
          plan.keys.includes(key) &&
          (!Object.hasOwn(entry, 'value') || !Object.is(entry.value, value))
        )
          sourceValid = false;
      }
      if (flat === plan.native) own = sourceValid ? data(target, plan.keys) : undefined;
      return target;
    },
    finish(output: object): void {
      if (
        visited.length !== (plan.native ? 2 : 1) ||
        visited[0] !== plan.computed ||
        (plan.native && visited[1] !== plan.native) ||
        !same(plan.computed, plan.entries)
      )
        return;
      const combined = data(output, plan.keys);
      if (!combined) return;
      captures.set(output, {
        combined,
        carrier: style as object,
        plan,
        data: Object.freeze({
          sheets: plan.sheets,
          ordinaryWinner: plan.winner,
          nativeOwn: plan.nativeSupported ? own : undefined,
        }),
      });
    },
  };
}
