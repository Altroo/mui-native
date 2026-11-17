// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
/**
 * Fabric's public node ancestry describes the React mounting tree. Native Portal
 * canvases are physically reparented, so finite descendant styles must follow
 * their actual container instead of leaking through their logical React parent.
 */
import type { NativeButtonGroupRule } from './buttonGroupContext';
type StyleNode = {
  readonly parentNode?: unknown;
  readonly parentElement?: unknown;
  readonly isConnected?: boolean;
};
type Boundary = { target: StyleNode | null; lease: symbol };
const boundaries = new WeakMap<StyleNode, Boundary>();
const groups = new Set<NativeButtonGroupRule>();
const listeners = new Set<() => void>();
let revision = 0;
// Derived lookups reuse the existing registry and are dropped on mutation, so
// an externally retained old host cannot keep an unregistered rule cached.
let indexedGroups: WeakMap<object, NativeButtonGroupRule[]> | undefined;
function rulesAt(element: object) {
  if (!indexedGroups) {
    const next = new WeakMap<object, NativeButtonGroupRule[]>();
    for (const rule of groups) {
      const host = rule.element;
      if (!host) continue;
      const rules = next.get(host) ?? [];
      rules.push(rule);
      next.set(host, rules);
    }
    indexedGroups = next;
  }
  return indexedGroups.get(element) ?? [];
}
const node = (value: unknown): StyleNode | null =>
  value !== null && typeof value === 'object' ? (value as StyleNode) : null;
function changed() {
  revision++;
  indexedGroups = undefined;
  for (const listener of [...listeners]) listener();
}
export const nativeStyleTree = {
  changed,
  snapshot: () => revision,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  registerGroup(rule: NativeButtonGroupRule) {
    groups.add(rule);
    changed();
    return () => {
      if (groups.delete(rule)) changed();
    };
  },
  /** Active finite rules in outer-to-inner physical ancestor order. */
  groupRulesAt(target: object | null) {
    const { path, valid } = physicalPath(target);
    if (!valid) return [];
    return path.reverse().flatMap(rulesAt);
  },
  /** The final styled constructor on one host replaces discarded wrapper classes. */
  exactHostStyle(element: object) {
    let selected: NativeButtonGroupRule | undefined;
    for (const rule of rulesAt(element))
      if (rule.sourceClasses && (rule.scopeDepth ?? -1) > (selected?.scopeDepth ?? -1))
        selected = rule;
    return selected;
  },
  registerPortal(canvas: object, container: object | null) {
    const entry: Boundary = { target: node(container), lease: Symbol() };
    boundaries.set(canvas, entry);
    changed();
    return () => {
      // A late cleanup must never remove the replacement canvas lease.
      if (boundaries.get(canvas)?.lease !== entry.lease) return;
      boundaries.delete(canvas);
      changed();
    };
  },
};
export const noStyleTreeSubscription = () => () => {};
export const emptyStyleTreeSnapshot = () => 0;
/** The public mounting ancestry with native Portal redirections applied. */
export function nativeStyleParent(value: object): object | null {
  const current = node(value)!;
  const boundary = boundaries.get(current);
  return boundary ? boundary.target : node(current.parentNode ?? current.parentElement);
}
function physicalPath(target: object | null) {
  let current = node(target);
  const path: StyleNode[] = [],
    visited = new Set<StyleNode>();
  while (current && current.isConnected !== false && !visited.has(current)) {
    visited.add(current);
    path.push(current);
    current = nativeStyleParent(current);
  }
  return { path, valid: current == null };
}
/** Resolve physical containment across nested Portal moves, including cycles. */
export function nativeStyleContains(ancestor: object | null | undefined, target: object | null) {
  const root = node(ancestor);
  if (!root || root.isConnected === false) return false;
  const { path, valid } = physicalPath(target);
  return valid && path.includes(root);
}

/** Prevent a canvas from acquiring one of its own physical descendants. */
export function nativeStyleTargetAvailable(canvas: object | null, target: object | null) {
  if (!target) return true;
  const { path, valid } = physicalPath(target);
  return valid && (!canvas || !path.includes(canvas));
}
