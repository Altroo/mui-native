// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Finite Accordion/slot motion resolves after the selected native terminal has
// evaluated CSS and genuine inline styles, including opaque forwarding wrappers.
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type RefObject,
  type ReactNode,
} from 'react';
import { StyleSheet, type StyleProp, type ViewInstance } from 'react-native';
import type { NativeStyle, Theme } from '@altroo/mui-native-system';
import {
  NativePressablePresentationContext,
  type NativePressablePresentation,
} from '@altroo/mui-native-host/internal/pressable-presentation';
import { nativeStyleTree } from './nativeStyleAncestry';
import { useAccordionMotion, type AccordionMotionProperty } from './accordionMotion';
type Candidate = { root: RefObject<ViewInstance | null>; depth: number };
function createOwner(root: RefObject<ViewInstance | null>) {
  const candidates = new Set<Candidate>();
  const listeners = new Set<() => void>();
  let owner: { candidate: Candidate; element: ViewInstance } | null = null;
  let stop: (() => void) | undefined;
  const refresh = () => {
    let next: Candidate | null = null;
    const element = root.current;
    if (element)
      for (const candidate of candidates)
        if (candidate.root.current === element && (!next || candidate.depth > next.depth))
          next = candidate;
    if (
      (next === null && owner === null) ||
      (next === owner?.candidate && element === owner.element)
    )
      return;
    owner = next && element ? { candidate: next, element } : null;
    for (const notify of [...listeners]) notify();
  };
  return {
    snapshot: () => owner,
    subscribe(notify: () => void) {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
    refresh,
    claim(candidate: Candidate) {
      candidates.add(candidate);
      stop ??= nativeStyleTree.subscribe(refresh);
      refresh();
      return () => {
        candidates.delete(candidate);
        if (!candidates.size) {
          stop?.();
          stop = undefined;
        }
        refresh();
      };
    },
  };
}
type Scope = {
  owner: ReturnType<typeof createOwner>;
  theme: Theme;
  ready: boolean;
  property: AccordionMotionProperty;
  timing: Readonly<{ declaration: unknown }> | undefined;
};
const Context = createContext<Scope | null>(null);
const Depth = createContext(0);
export const useAccordionRootMotion = () => useContext(Context);
export function AccordionRootMotionScope({
  root,
  theme,
  ready,
  timing,
  property = 'root',
  children,
}: {
  root: RefObject<ViewInstance | null>;
  theme: Theme;
  ready: boolean;
  timing: Readonly<{ declaration: unknown }> | undefined;
  property?: AccordionMotionProperty | undefined;
  children(scope: Scope): ReactNode;
}) {
  const owner = useMemo(() => createOwner(root), [root]);
  const scope = useMemo(
    () => ({ owner, theme, ready, timing, property }),
    [owner, theme, ready, timing, property],
  );
  const present = useMemo<NativePressablePresentation>(
    () =>
      ({ root: host, style, children: render }) => (
        <AccordionRootMotionBoundary scope={scope} root={host} style={style}>
          {render}
        </AccordionRootMotionBoundary>
      ),
    [scope],
  );
  return (
    <Context.Provider value={scope}>
      <Depth.Provider value={0}>
        <NativePressablePresentationContext.Provider value={present}>
          {children(scope)}
        </NativePressablePresentationContext.Provider>
      </Depth.Provider>
    </Context.Provider>
  );
}
/** Only the deepest styling-aware boundary on the exact shared host animates.
 * This avoids promoting generated geometry to inline CSS, replaying source
 * callbacks every frame, or applying root motion to a nested child's host.
 */
export function AccordionRootMotionBoundary({
  scope,
  root,
  style,
  children,
}: {
  scope: Scope;
  root: RefObject<ViewInstance | null>;
  style: StyleProp<NativeStyle>;
  children(style: StyleProp<NativeStyle>): ReactNode;
}) {
  const depth = useContext(Depth);
  const candidate = useMemo(() => ({ root, depth }), [root, depth]);
  const owner = useSyncExternalStore(
    scope.owner.subscribe,
    scope.owner.snapshot,
    scope.owner.snapshot,
  );
  useLayoutEffect(() => scope.owner.claim(candidate), [scope.owner, candidate]);
  useLayoutEffect(scope.owner.refresh);
  const finalStyle = StyleSheet.flatten(style) ?? {};
  const patch = useAccordionMotion(
    finalStyle,
    scope.theme,
    owner?.candidate === candidate && scope.ready && scope.timing && finalStyle.display !== 'none'
      ? scope.property
      : undefined,
    owner?.candidate === candidate ? owner.element : null,
    scope.timing,
  );
  return (
    <Depth.Provider value={depth + 1}>{children(patch ? [style, patch] : style)}</Depth.Provider>
  );
}
export function renderAccordionRootMotion(
  scope: Scope | null,
  root: RefObject<ViewInstance | null>,
  style: StyleProp<NativeStyle>,
  render: (style: StyleProp<NativeStyle>) => ReactNode,
): ReactNode {
  return scope ? (
    <AccordionRootMotionBoundary scope={scope} root={root} style={style}>
      {render}
    </AccordionRootMotionBoundary>
  ) : (
    render(style)
  );
}
