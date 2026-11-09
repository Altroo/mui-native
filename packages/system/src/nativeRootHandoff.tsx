// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// First-party opt-in only. Pure React/data boundary, not a native host or public prop.
import { createContext, useContext, type ReactNode, type Ref } from 'react';
import type { StyleProp, ViewInstance } from 'react-native';
import type { Theme } from './theme';
import type { NativeStyle, StyleContext } from './sx';
import type { NativePreparedStyle } from './nativeStyledMetadata';
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
export const NativeRootHandoffContext = createContext<NativeRootHandoff | null>(null);
/** Register only a first-party constructor which implements the terminal contract. */
export function registerNativeRoot(component: object): void {
  roots.add(component);
}
export function isNativeCooperatingRoot(value: unknown): value is object {
  return (
    value !== null && (typeof value === 'object' || typeof value === 'function') && roots.has(value)
  );
}
/** Component identity, never display names, private React fields or native IDs. */
export function useNativeRootHandoff(target: object): NativeRootHandoff | null {
  const handoff = useContext(NativeRootHandoffContext);
  if (handoff && handoff.target !== target)
    throw Error('Nested/opaque cooperating roots are unsupported');
  return handoff;
}
