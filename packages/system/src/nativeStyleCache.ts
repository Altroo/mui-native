// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
/** Cache lifetime is independent of themes and mounted component instances. */
export interface NativeStyleCache {
  readonly key: string;
  reset(): void;
  dispose(): void;
}
export type NativeCssInsertion = Readonly<{
  cache: NativeStyleCache;
  css: string;
  hasRules: boolean;
}>;
export type NativeCssOrder = readonly [block: number, programme: number];
type Entry = { ordinal: number; hasRules: boolean };
type State = {
  prepend: boolean;
  disposed: boolean;
  entries: Map<string, Entry>;
  registered: Set<string>;
  next: number;
  bindings: Set<symbol>;
};
// Construction records identity only. Stylesheet order changes exclusively in
// commit/reset/dispose, never while projecting a render's prospective order.
const states = new WeakMap<NativeStyleCache, State>();
const blocks: NativeStyleCache[] = [];
const listeners = new Set<() => void>();
let revision = 0;
function state(cache: NativeStyleCache): State {
  const value = states.get(cache);
  if (!value || value.disposed) throw Error('The native style cache has been disposed');
  return value;
}
function publish() {
  revision++;
  for (const listener of [...listeners]) listener();
}
function forget(cache: NativeStyleCache, dispose: boolean) {
  const value = states.get(cache);
  if (!value || value.disposed) {
    if (dispose) return;
    throw Error('The native style cache has been disposed');
  }
  if (value.bindings.size)
    throw Error('Unmount the native style cache roots before resetting or disposing their cache');
  const index = blocks.indexOf(cache);
  if (index !== -1) blocks.splice(index, 1);
  value.entries.clear();
  value.registered.clear();
  value.next = 0;
  value.disposed = dispose;
  if (index !== -1) publish();
}
export function createNativeStyleCache(options: {
  key: string;
  prepend?: boolean;
}): NativeStyleCache {
  const { key, prepend } = options;
  if (!key || /[^a-z-]/.test(key))
    throw new TypeError('A native style cache key must contain only lowercase letters and hyphens');
  const cache = Object.freeze({
    key,
    reset() {
      forget(cache, false);
    },
    dispose() {
      forget(cache, true);
    },
  });
  states.set(cache, {
    prepend: prepend === true,
    disposed: false,
    entries: new Map(),
    registered: new Set(),
    next: 0,
    bindings: new Set(),
  });
  return cache;
}
const later = (left: NativeCssOrder, right: NativeCssOrder) =>
  left[0] > right[0] || (left[0] === right[0] && left[1] > right[1]);
/** @internal Shared stylesheet placement; selector ownership remains separate. */
export const nativeStyleCacheRegistry = {
  snapshot: () => revision,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  bind(cache: NativeStyleCache) {
    const value = state(cache),
      lease = Symbol();
    value.bindings.add(lease);
    return () => {
      value.bindings.delete(lease);
    };
  },
  // Emotion registers nonterminal classes during render. This cache-owned
  // membership is separate from committed stylesheet ranks and notifications.
  register(chain: readonly NativeCssInsertion[]) {
    for (const item of chain) state(item.cache).registered.add(item.css);
  },
  registered(cache: NativeStyleCache, source: NativeCssInsertion): boolean {
    return cache.key === source.cache.key && state(cache).registered.has(source.css);
  },
  committedOrder(insertion: NativeCssInsertion): NativeCssOrder | undefined {
    if (!insertion.hasRules) return undefined;
    let result: NativeCssOrder | undefined;
    for (const [index, cache] of blocks.entries()) {
      if (cache.key !== insertion.cache.key) continue;
      const entry = state(cache).entries.get(insertion.css);
      if (entry?.hasRules && (!result || later([index, entry.ordinal], result)))
        result = [index, entry.ordinal];
    }
    return result;
  },
  rules(cache: NativeStyleCache, css: string): boolean | undefined {
    return state(cache).entries.get(css)?.hasRules;
  },
  order(insertion: NativeCssInsertion): NativeCssOrder | undefined {
    const own = state(insertion.cache);
    if (!insertion.hasRules) return undefined;
    const block = blocks.indexOf(insertion.cache);
    let result: NativeCssOrder = [
      block === -1 ? (own.prepend ? -1 : blocks.length) : block,
      own.entries.get(insertion.css)?.ordinal ?? own.next,
    ];
    // Caches with the same key emit the same generated selector identities.
    // Their retained duplicate rules can apply to roots in either cache.
    for (const [index, cache] of blocks.entries()) {
      if (cache.key !== insertion.cache.key) continue;
      const entry = state(cache).entries.get(insertion.css);
      if (entry?.hasRules && later([index, entry.ordinal], result)) result = [index, entry.ordinal];
    }
    return result;
  },
  commit(chain: readonly NativeCssInsertion[]) {
    // Reject an invalid dependency before changing any other cache in the batch.
    const planned = new Map<NativeStyleCache, Map<string, boolean>>();
    for (const item of chain) {
      const existing = state(item.cache).entries.get(item.css);
      const cachePlan = planned.get(item.cache) ?? new Map<string, boolean>();
      const pending = cachePlan.get(item.css);
      if (
        (existing && existing.hasRules !== item.hasRules) ||
        (pending !== undefined && pending !== item.hasRules)
      )
        throw Error('Inconsistent emitted CSS programme');
      cachePlan.set(item.css, item.hasRules);
      planned.set(item.cache, cachePlan);
    }
    let changed = false;
    for (const item of chain) {
      const value = state(item.cache);
      if (value.entries.has(item.css)) continue;
      const ordinal = item.hasRules ? value.next++ : -1;
      value.entries.set(item.css, { ordinal, hasRules: item.hasRules });
      if (!item.hasRules) continue;
      if (!blocks.includes(item.cache)) {
        if (value.prepend) blocks.unshift(item.cache);
        else blocks.push(item.cache);
      }
      changed = true;
    }
    if (changed) publish();
    return changed;
  },
};
export const defaultNativeStyleCache = createNativeStyleCache({ key: 'css' });
