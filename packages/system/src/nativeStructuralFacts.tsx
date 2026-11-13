// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Private physical-root facts. Context transport never assumes that a React
// wrapper, or its first child, is the native element receiving the stylesheet.
import { createContext, useContext, type RefObject } from 'react';
import type { StyleContext } from './sx';
export type NativeStructuralFacts = Pick<
  StyleContext,
  'lastChild' | 'firstOfType' | 'lastOfType' | 'states'
>;
export const NativeStructuralFactsContext = createContext<Readonly<{
  element: object | null;
  facts: NativeStructuralFacts;
}> | null>(null);
/** Cooperating roots consume facts only when both public refs name one host. */
export function useNativeStructuralFacts(
  root: RefObject<object | null>,
): NativeStructuralFacts | undefined {
  const current = useContext(NativeStructuralFactsContext);
  return current?.element != null && current.element === root.current ? current.facts : undefined;
}
