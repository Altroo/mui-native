// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ViewInstance } from 'react-native';
import { useNativeStructuralFacts } from '@altroo/mui-native-system/internal/prepared-style';
import type {
  NativePreparedStyle,
  NativeStyleTarget,
  StyleContext,
  Theme,
} from '@altroo/mui-native-system';
import {
  NativeButtonGroupRules,
  type NativeButtonGroupRule,
  type NativeStyleClassIdentity,
} from './buttonGroupContext';
import { nativeStyleTree } from './nativeStyleAncestry';

/** The existing physical registry serves all participating finite descendant sheets. */
export function nativeStyleAncestors(
  rules: readonly NativeButtonGroupRule[],
  target: NativeStyleTarget,
): NonNullable<StyleContext['ancestors']> {
  return rules.map((rule, index) =>
    rule.cascade(target.classes, [
      ...rules.slice(index + 1).flatMap((next) => (next.selector ? [next.selector] : [])),
      target,
    ]),
  );
}
// Prepared records contain library-owned declarations. Compare only data
// descriptors: equality must never observe a caller's nested getter again.
function equalData(a: unknown, b: unknown, seen = new WeakMap<object, object>()): boolean {
  if (Object.is(a, b)) return true;
  if (
    !a ||
    !b ||
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)
  )
    return false;
  const prototype = Object.getPrototypeOf(a);
  if (
    !Array.isArray(a) &&
    !(a instanceof Map) &&
    prototype !== Object.prototype &&
    prototype !== null
  )
    return false;
  if (seen.has(a)) return seen.get(a) === b;
  seen.set(a, b);
  if (a instanceof Map && b instanceof Map) {
    const entries = [...b];
    return (
      a.size === b.size &&
      [...a].every(
        ([key, value], index) =>
          Object.is(key, entries[index][0]) && equalData(value, entries[index][1], seen),
      )
    );
  }
  const left = Object.getOwnPropertyDescriptors(a),
    right = Object.getOwnPropertyDescriptors(b);
  const keys = Reflect.ownKeys(left),
    otherKeys = Reflect.ownKeys(right);
  return (
    keys.length === otherKeys.length &&
    keys.every((key, index) => {
      if (key !== otherKeys[index]) return false;
      const x = Reflect.get(left, key) as PropertyDescriptor,
        y = Reflect.get(right, key) as PropertyDescriptor | undefined;
      return (
        y !== undefined && x.get === y.get && x.set === y.set && equalData(x.value, y.value, seen)
      );
    })
  );
}
// Decode only owned immutable programme data during preparation. Physical
// peer refreshes consume these snapshots without evaluating CSS callbacks.
function emittedClasses(prepared: NativePreparedStyle): readonly NativeStyleClassIdentity[] {
  const own = prepared.sheets.find(
    (sheet) => !sheet.ancestor && !sheet.emissionForeign,
  )?.emissionProgramme;
  const tokens = prepared.classTokens ?? (own ? [own] : []);
  return Object.freeze(
    tokens.map((token) => {
      const sourceOwners: string[] = [];
      const selectorOwners: string[] = [];
      const visit = (programme: typeof token.programme) => {
        if (programme.kind === 'owner') {
          sourceOwners.push(programme.owner.css);
          if (programme.owner.selectorOwner) selectorOwners.push(programme.owner.selectorOwner);
        } else if (programme.kind === 'sequence') programme.parts.forEach(visit);
        else {
          visit(programme.own);
          programme.classes.forEach(visit);
        }
      };
      visit(token.programme);
      return Object.freeze({
        cacheKey: token.insertion.cache.key,
        css: token.insertion.css,
        sourceOwners: Object.freeze(sourceOwners),
        ...(selectorOwners.length ? { selectorOwners: Object.freeze(selectorOwners) } : {}),
      });
    }),
  );
}
/** Publish exact host replacement even when a custom root updates internally. */
export function useNativeStyleRef<T>(
  root: React.RefObject<T | null>,
  forwarded: React.RefCallback<T> | null,
): React.RefCallback<T> {
  return useMemo(
    () => (instance) => {
      const previous = root.current;
      let release: ReturnType<React.RefCallback<T>>;
      try {
        release = forwarded?.(instance);
      } finally {
        if (root.current !== previous) nativeStyleTree.changed();
      }
      if (typeof release !== 'function') return;
      return () => {
        const attached = root.current;
        try {
          release();
        } finally {
          if (root.current !== attached) nativeStyleTree.changed();
        }
      };
    },
    [root, forwarded],
  );
}
interface ScopeProps {
  root: React.RefObject<ViewInstance | null>;
  theme: Theme;
  classes: readonly string[];
  prepared: NativePreparedStyle;
  children: React.ReactNode;
}
/** Renderless ownership boundary; Portal resets this same context at its destination. */
export function NativeStyleScope({ root, theme, classes, prepared, children }: ScopeProps) {
  const inherited = useContext(NativeButtonGroupRules);
  const structure = useNativeStructuralFacts(root);
  const current = useRef({ theme, classes, prepared, structure });
  if (
    current.current.theme !== theme ||
    !equalData(current.current.classes, classes) ||
    !equalData(current.current.prepared, prepared) ||
    !equalData(current.current.structure, structure)
  )
    current.current = { theme, classes, prepared, structure };
  const value = current.current;
  const own = useMemo<NativeButtonGroupRule>(
    () => ({
      get element() {
        return root.current;
      },
      selector: { classes: value.classes, ...value.structure },
      scopeDepth: inherited.length,
      sourceClasses: emittedClasses(value.prepared),
      cascade(target, path) {
        return {
          theme: value.theme,
          name: '',
          props: {},
          prepared: value.prepared,
          context: {
            ...value.structure,
            descendantOnly: true,
            descendantClasses: target,
            descendantPath: path,
          },
        };
      },
    }),
    [root, value, inherited.length],
  );
  const committed = useRef(own);
  const registered = useMemo<NativeButtonGroupRule>(
    () => ({
      get element() {
        return root.current;
      },
      get selector() {
        return committed.current.selector;
      },
      get cascade() {
        return committed.current.cascade;
      },
      get sourceClasses() {
        return committed.current.sourceClasses;
      },
      get scopeDepth() {
        return committed.current.scopeDepth;
      },
    }),
    [root],
  );
  useLayoutEffect(() => {
    if (committed.current !== own) {
      committed.current = own;
      nativeStyleTree.changed();
    }
  }, [own]);
  useLayoutEffect(() => nativeStyleTree.registerGroup(registered), [registered]);
  const lastNode = useRef<ViewInstance | null>(null);
  const syncRoot = () => {
    if (lastNode.current !== root.current) {
      lastNode.current = root.current;
      nativeStyleTree.changed();
    }
  };
  useLayoutEffect(syncRoot);
  // An ancestor-owned host ref can attach after this descendant layout effect.
  // The idempotent passive pass publishes that first committed host as well.
  useEffect(syncRoot);
  const rules = useMemo(() => [...inherited, own], [inherited, own]);
  return (
    <NativeButtonGroupRules.Provider value={rules}>{children}</NativeButtonGroupRules.Provider>
  );
}
