// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// First-party opt-in only. Pure React/data boundary, not a native host or public prop.
import { createContext, useContext, useMemo, type ReactNode, type Ref } from 'react';
import type { StyleProp, ViewInstance } from 'react-native';
import type { Theme } from './theme';
import type { NativeStyle, StyleContext } from './sx';
import type { NativePreparedStyle } from './nativeStyledMetadata';
import { nativeMemoType } from './nativeMemoInterop';
import {
  readNativeRootSnapshot,
  retainNativeRootSnapshotElement,
  type NativeRootSnapshot,
  type NativeRootSnapshotScope,
} from './nativeRootStyleSnapshots';
export type NativeRootPreparation = Readonly<{
  presentation: NativeStyle;
  normal: NativeStyle;
  last: NativeStyle;
  prepared: NativePreparedStyle;
}>;
export type NativeRootStyleInput = Readonly<{
  theme: Theme;
  programme: StyleProp<NativeStyle>;
  context: StyleContext;
  parentDirection: 'ltr' | 'rtl';
}>;
export type NativeRootOutput = Readonly<{
  preparation: NativeRootPreparation;
  hostProps: Record<string, unknown>;
  nativeRef: Ref<ViewInstance>;
  children: ReactNode;
  presentation: StyleProp<NativeStyle>;
  theme: Theme;
  classes: readonly string[];
}>;
export type NativeRootHandoff = Readonly<{
  target: object;
  prepare(input: NativeRootStyleInput): NativeRootPreparation;
  render(input: NativeRootOutput): ReactNode;
}>;
const roots = new WeakSet<object>();
export type NativeRootHandoffSnapshot = Readonly<{
  handoff: NativeRootHandoff;
  programme: StyleProp<NativeStyle>;
  classes: readonly string[];
}>;
export type NativeRootHandoffSource =
  | NativeRootHandoff
  | Readonly<{ target: object; snapshots: NativeRootSnapshotScope<NativeRootHandoffSnapshot> }>;
export const NativeRootHandoffContext = createContext<NativeRootHandoffSource | null>(null);
/** Register only first-party terminal or known forwarding constructors. */
export function registerNativeRoot(component: object): void {
  roots.add(component);
}
/** Exact registered roots stay allocation-free; only canonical memo chains
 * allocate the bounded cycle guard. Opaque/lazy/forwardRef wrappers are not unwrapped.
 */
const object = (candidate: unknown): candidate is object =>
  candidate !== null && (typeof candidate === 'object' || typeof candidate === 'function');
export function nativeCooperatingRootTarget(value: unknown): object | undefined {
  if (!object(value)) return;
  if (roots.has(value)) return value;
  const seen = new Set<object>();
  let current: unknown = value;
  for (let depth = 0; depth < 128 && object(current); depth++) {
    if (seen.has(current)) return;
    seen.add(current);
    current = nativeMemoType(current);
    if (object(current) && roots.has(current)) return current;
  }
  return;
}
export function isNativeCooperatingRoot(value: unknown): value is object {
  return nativeCooperatingRootTarget(value) !== undefined;
}
/** Identity plus guarded canonical Memo runtime interop. No Fiber/renderer
 * fields, display names, native IDs or render-time native observations.
 */
export function useNativeRootHandoff(
  target: object,
  className?: unknown,
): (NativeRootHandoff & { retained?: NativeRootSnapshot<NativeRootHandoffSnapshot> }) | null {
  const source = useContext(NativeRootHandoffContext);
  if (source && source.target !== target)
    throw Error('Opaque cooperating root handoff is unsupported');
  if (!source || !('snapshots' in source)) return source;
  const record = readNativeRootSnapshot(source.snapshots, className)!;
  return { ...record.value.handoff, retained: record };
}
/** Stable forwarding context transports the resolver, never newer render input. */
export function useNativeRootHandoffForward(target: object): NativeRootHandoffSource | null {
  const source = useContext(NativeRootHandoffContext);
  return useMemo(
    () =>
      !source
        ? null
        : 'snapshots' in source
          ? { target, snapshots: source.snapshots }
          : { ...source, target },
    [source, target],
  );
}
export const NativeRootStyleForwardContext = createContext<Readonly<{
  target: object;
  snapshots: NativeRootSnapshotScope<StyleProp<NativeStyle>>;
}> | null>(null);
export function useNativeRootStyleForward(target: object, className?: unknown) {
  const forward = useContext(NativeRootStyleForwardContext);
  if (forward && forward.target !== target)
    throw Error('Opaque root style forwarding is unsupported');
  if (!forward) return null;
  const record = readNativeRootSnapshot(forward.snapshots, className)!;
  return { target, programme: record.value, retained: record };
}

/** No extra element on ordinary roots which have no pending CSS handoff. */
export function clearNativeRootStyleForward(
  forward: ReturnType<typeof useNativeRootStyleForward>,
  children: ReactNode,
  retained?: NativeRootSnapshot<NativeRootHandoffSnapshot>,
): ReactNode {
  const result = forward ? (
    <NativeRootStyleForwardContext.Provider value={null}>
      {children}
    </NativeRootStyleForwardContext.Provider>
  ) : (
    children
  );
  return retained || forward?.retained
    ? retainNativeRootSnapshotElement(result, retained, forward?.retained)
    : result;
}
