// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useLayoutEffect, useEffect, useRef, useMemo } from 'react';
import type { RefObject, Ref, RefCallback } from 'react';
import type { NativeTextScopeValue } from './textScope';
type Node = {
  readonly parentNode?: unknown;
  readonly parentElement?: unknown;
  readonly isConnected?: boolean;
};
type Entry = { value: NativeTextScopeValue; depth: number };
const roots = new WeakMap<object, Map<symbol, Entry>>();
const depths = new WeakMap<NativeTextScopeValue, number>();
const listeners = new Set<() => void>();
let revision = 0;
const asNode = (value: unknown): Node | null =>
  value != null && typeof value === 'object' ? (value as Node) : null;
function changed() {
  revision++;
  for (const listener of [...listeners]) listener();
}
// Resolved scopes are allocated during rendering. Compare their semantic values,
// including native color objects and metric provenance, before notifying Portals.
export function equalNativeTextScopeValue(
  a: unknown,
  b: unknown,
  seen = new WeakMap<object, object>(),
): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (seen.has(a)) return seen.get(a) === b;
  seen.set(a, b);
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every(
      (key) =>
        Object.hasOwn(b, key) &&
        equalNativeTextScopeValue(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
          seen,
        ),
    )
  );
}
export function setNativeTextScopeParent(
  value: NativeTextScopeValue,
  parent: NativeTextScopeValue | undefined,
) {
  depths.set(value, (parent ? (depths.get(parent) ?? 0) : -1) + 1);
}
export const nativeTextScopes = {
  snapshot: () => revision,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  register(root: object, value: NativeTextScopeValue) {
    const entries = roots.get(root) ?? new Map<symbol, Entry>();
    roots.set(root, entries);
    const lease = Symbol();
    const entry: Entry = { value, depth: depths.get(value) ?? 0 };
    entries.set(lease, entry);
    changed();
    return {
      update(next: NativeTextScopeValue) {
        if (entries.get(lease) !== entry) return;
        const depth = depths.get(next) ?? 0;
        if (entry.depth === depth && equalNativeTextScopeValue(entry.value, next)) return;
        entry.value = next;
        entry.depth = depth;
        changed();
      },
      remove() {
        if (entries.delete(lease)) changed();
        if (!entries.size && roots.get(root) === entries) roots.delete(root);
      },
    };
  },
  /** Nearest physical text owner. Material passes its Portal-aware parent walk. */
  at(
    target: object | null,
    parent: (node: object) => object | null = (value) => {
      const current = value as Node;
      return asNode(current.parentNode ?? current.parentElement);
    },
  ): NativeTextScopeValue | undefined {
    let node = asNode(target);
    const visited = new Set<object>();
    let nearest: Entry | undefined;
    while (node && node.isConnected !== false && !visited.has(node)) {
      visited.add(node);
      const entries = roots.get(node);
      if (!nearest && entries?.size) {
        // A custom native root may host nested scopes on the same instance.
        // Prefer the innermost resolved scope, independent of effect order.
        nearest = [...entries.values()].reduce((best, entry) =>
          entry.depth > best.depth ? entry : best,
        );
      }
      node = asNode(parent(node));
    }
    // Validate the entire destination chain before inheriting a nearer scope.
    // A self-container could otherwise feed its computed text back into itself.
    return node ? undefined : nearest?.value;
  },
};
/** Observe an explicitly owned native root without changing its public ref. */
export function useNativeTextScopeRoot(
  root: RefObject<object | null> | undefined,
  value: NativeTextScopeValue,
) {
  const active = useRef<
    { node: object; lease: ReturnType<typeof nativeTextScopes.register> } | undefined
  >(undefined);
  const synchronize = () => {
    const node = root?.current;
    if (active.current?.node !== node) {
      active.current?.lease.remove();
      active.current = node ? { node, lease: nativeTextScopes.register(node, value) } : undefined;
    } else active.current?.lease.update(value);
  };
  useLayoutEffect(synchronize);
  // A scope may render inside its own ancestor host (ButtonBase). Its layout
  // effect precedes that host ref, so verify once more after all refs attach.
  useEffect(synchronize);
  useLayoutEffect(
    () => () => {
      active.current?.lease.remove();
      active.current = undefined;
    },
    [],
  );
}

/** Compose an owned host ref with a caller's React 19 ref lifecycle. */
export function useNativeTextRootRef<T>(forwarded?: Ref<T>) {
  const root = useRef<T | null>(null);
  const ref = useMemo<RefCallback<T>>(() => {
    let detach: (() => void) | undefined;
    return (instance) => {
      detach?.();
      detach = undefined;
      if (instance === null) return;
      root.current = instance;
      let release: (() => void) | void;
      try {
        if (typeof forwarded === 'function') release = forwarded(instance);
        else if (forwarded) forwarded.current = instance;
      } catch (error) {
        root.current = null;
        throw error;
      }
      let detached = false;
      const cleanup = () => {
        if (detached) return;
        detached = true;
        if (detach === cleanup) detach = undefined;
        if (root.current === instance) root.current = null;
        if (typeof release === 'function') release();
        else if (typeof forwarded === 'function') forwarded(null);
        else if (forwarded?.current === instance) forwarded.current = null;
      };
      detach = cleanup;
      return cleanup;
    };
  }, [forwarded]);
  return { root, ref };
}

export type NativeTextChildRootTracker = (
  key: string,
  ref: Ref<object> | undefined,
  value: NativeTextScopeValue,
) => RefCallback<object>;
/** Track only the native children this renderer already clones for text styles.
 * Collection is render-local; registration and updates happen after commit.
 */
export function useNativeTextChildRoots(): NativeTextChildRootTracker {
  type Collector = {
    original: Ref<object> | undefined;
    node: object | null;
    ref: RefCallback<object>;
  };
  const collectors = useRef(new Map<string, Collector>());
  const active = useRef(
    new Map<string, { node: object; lease: ReturnType<typeof nativeTextScopes.register> }>(),
  );
  const frame = new Map<string, { collector: Collector; value: NativeTextScopeValue }>();
  const track: NativeTextChildRootTracker = (key, original, value) => {
    let collector = collectors.current.get(key);
    if (!collector || collector.original !== original) {
      const entry: Collector = { original, node: null, ref: () => {} };
      let detach: (() => void) | undefined;
      entry.ref = (node) => {
        detach?.();
        detach = undefined;
        if (node === null) return;
        entry.node = node;
        let release: (() => void) | void;
        try {
          if (typeof original === 'function') release = original(node);
          else if (original) original.current = node;
        } catch (error) {
          entry.node = null;
          throw error;
        }
        let detached = false;
        const cleanup = () => {
          if (detached) return;
          detached = true;
          if (detach === cleanup) detach = undefined;
          if (entry.node === node) entry.node = null;
          if (typeof release === 'function') release();
          else if (typeof original === 'function') original(null);
          else if (original?.current === node) original.current = null;
        };
        detach = cleanup;
        return cleanup;
      };
      collector = entry;
    }
    frame.set(key, { collector, value });
    return collector.ref;
  };
  useLayoutEffect(() => {
    for (const [key, entry] of active.current) {
      if (frame.get(key)?.collector.node !== entry.node) {
        entry.lease.remove();
        active.current.delete(key);
      }
    }
    for (const [key, { collector, value }] of frame) {
      if (!collector.node) continue;
      const entry = active.current.get(key);
      if (entry) entry.lease.update(value);
      else
        active.current.set(key, {
          node: collector.node,
          lease: nativeTextScopes.register(collector.node, value),
        });
    }
    // Only the committed render may replace the public ref callback cache.
    // An aborted ref change must not detach an unchanged committed child.
    collectors.current = new Map([...frame].map(([key, { collector }]) => [key, collector]));
  });
  useLayoutEffect(
    () => () => {
      for (const entry of active.current.values()) entry.lease.remove();
      active.current.clear();
      collectors.current.clear();
    },
    [],
  );
  return track;
}
