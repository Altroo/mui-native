// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { StyleProp } from 'react-native';
import { nativeStyleInsertions } from './nativeStyleEvaluation';
import {
  defaultNativeStyleCache,
  nativeStyleCacheRegistry as registry,
  type NativeStyleCache,
  type NativeCssInsertion,
} from './nativeStyleCache';
import type { NativeStyle } from './sx';

const CacheContext = createContext(defaultNativeStyleCache);
type InsertionSource = () => readonly NativeCssInsertion[];
const Dependencies = createContext<readonly InsertionSource[]>(Object.freeze([]));
/** Cache ownership survives theme replacement and component unmount. */
export function NativeStyleCacheProvider({
  value,
  children,
}: {
  value: NativeStyleCache;
  children?: React.ReactNode;
}) {
  return <CacheContext.Provider value={value}>{children}</CacheContext.Provider>;
}
export const useNativeStyleCache = () => useContext(CacheContext);
const ignoreCacheUpdates = () => () => {};
const inactiveCacheRevision = () => 0;
/** Cooperating terminals already refresh prepared CSS inside their own boundary. */
export function useNativeStyleCacheRevision(enabled = true) {
  return useSyncExternalStore(
    enabled ? registry.subscribe : ignoreCacheUpdates,
    enabled ? registry.snapshot : inactiveCacheRevision,
    enabled ? registry.snapshot : inactiveCacheRevision,
  );
}
/** Source programmes are owned before the arbitrary tag renders native state. */
export function NativeCssRootBoundary({
  style,
  children,
  registerClass = true,
}: {
  style: StyleProp<NativeStyle>;
  registerClass?: boolean;
  children: () => React.ReactNode;
}) {
  useNativeStyleCacheRevision();
  return (
    <NativeCssInsertionScope style={style} registerClass={registerClass}>
      {children()}
    </NativeCssInsertionScope>
  );
}

/** Logical insertion dependencies remain intact across physical native Portals. */
export function NativeCssInsertionScope({
  style,
  children,
  registerClass = true,
}: {
  style: StyleProp<NativeStyle>;
  children?: React.ReactNode;
  registerClass?: boolean;
}) {
  if (registerClass) registry.register(nativeStyleInsertions(style));
  const source = useMemo(() => () => nativeStyleInsertions(style), [style]);
  return <NativeCssDependencyScope source={source}>{children}</NativeCssDependencyScope>;
}
function NativeCssDependencyScope({
  source,
  children,
}: {
  source: InsertionSource;
  children?: React.ReactNode;
}) {
  const parent = useContext(Dependencies);
  const sources = useMemo(() => [...parent, source], [parent, source]);
  // Cache ownership outlives individual CSS programmes. Reconcile leases in
  // commit without update cleanups that briefly expose a still-mounted cache.
  const bindings = useRef(new Map<NativeStyleCache, () => void>());
  useLayoutEffect(
    () => () => {
      for (const release of bindings.current.values()) release();
      bindings.current.clear();
    },
    [],
  );
  useLayoutEffect(() => {
    const chain = sources.flatMap((read) => read());
    const required = new Set(chain.map((item) => item.cache));
    const added: NativeStyleCache[] = [];
    try {
      for (const cache of required)
        if (!bindings.current.has(cache)) {
          bindings.current.set(cache, registry.bind(cache));
          added.push(cache);
        }
      registry.commit(chain);
    } catch (error) {
      for (const cache of added) {
        bindings.current.get(cache)!();
        bindings.current.delete(cache);
      }
      throw error;
    }
    for (const [cache, release] of bindings.current)
      if (!required.has(cache)) {
        release();
        bindings.current.delete(cache);
      }
  });
  return <Dependencies.Provider value={sources}>{children}</Dependencies.Provider>;
}
