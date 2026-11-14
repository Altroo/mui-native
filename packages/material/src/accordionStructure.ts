// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Finite Accordion grouping reads the actual public native host tree. React
// child indices are insufficient for opaque wrappers, Fragments and portals.
import { createContext, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { findNodeHandle, type ViewInstance } from 'react-native';
import { createNativeStructuralObservation } from '@altroo/mui-native-host/internal/structural-observation';
import type { NativeStructuralFacts } from '@altroo/mui-native-system/internal/prepared-style';
import { GENERATED_TEXT_ORIGIN_CONTRACT } from '@altroo/mui-native-system/internal/generated-paragraph';
import { nativeStyleTree } from './nativeStyleAncestry';
import type { CSSPeerObservation } from '@altroo/mui-native-host/internal/css-peer';
import type { NativeStyleClassIdentity } from './buttonGroupContext';
export type AccordionHost = {
  readonly parentElement?: AccordionHost | null;
  readonly children?: ArrayLike<AccordionHost>;
  readonly tagName?: string;
  readonly id?: string;
  readonly isConnected?: boolean;
  readonly ownerDocument?: { readonly documentElement?: AccordionHost | null } | null;
};
export type AccordionStructure = Readonly<{
  element: AccordionHost | null;
  facts: NativeStructuralFacts;
  previousExpanded: boolean;
  peerObservation?: CSSPeerObservation | undefined;
}>;
export const AccordionPeerObservationContext = createContext<CSSPeerObservation | null>(null);
const unknown: AccordionStructure = Object.freeze({
  element: null,
  facts: {},
  previousExpanded: false,
});
// Reserved native ID, excluded from source element sibling classification.
export const accordionBeforeOrigin = 'altroo:accordion-before:v1:';
type Entry = {
  element: AccordionHost | null;
  expanded: boolean;
  sourceCss: string | undefined;
  snapshot: AccordionStructure;
  publish(value: AccordionStructure): void;
  readElement(): AccordionHost | null;
  stop?: (() => void) | undefined;
};
function observedPeer(
  subject: AccordionHost,
  parent: AccordionHost,
  previous: AccordionHost | undefined,
  expanded: boolean,
): CSSPeerObservation | undefined {
  const surfaceNode = subject.ownerDocument?.documentElement;
  if (!surfaceNode) return;
  const tag = (node: AccordionHost | undefined) =>
    node ? findNodeHandle(node as ViewInstance) : 0;
  const surface = tag(surfaceNode),
    current = tag(subject),
    container = tag(parent),
    prior = tag(previous);
  if (
    [surface, current, container].some(
      (value) => typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0,
    ) ||
    typeof prior !== 'number' ||
    !Number.isSafeInteger(prior) ||
    prior < 0
  )
    return;
  return Object.freeze({
    surface: surface!,
    subject: current!,
    parent: container!,
    previous: prior,
    expanded,
  });
}
function sameObservation(
  a: CSSPeerObservation | undefined,
  b: CSSPeerObservation | undefined,
): boolean {
  return (
    a === b ||
    (!!a &&
      !!b &&
      a.surface === b.surface &&
      a.subject === b.subject &&
      a.parent === b.parent &&
      a.previous === b.previous &&
      a.expanded === b.expanded)
  );
}
/** One physical region read per notification, independent of group size. */
function regionAt(
  parent: AccordionHost,
  expandedAt: (node: AccordionHost) => boolean | undefined,
  sharesSourceClass: (previous: AccordionHost, current: AccordionHost) => boolean = () => true,
) {
  const children = parent.children;
  if (!children) return new Map<AccordionHost, AccordionStructure>();
  const siblings = Array.from(children).filter((child) => {
    const id = child.id;
    return (
      !id?.startsWith(GENERATED_TEXT_ORIGIN_CONTRACT.nativeIDPrefix) &&
      !id?.startsWith(accordionBeforeOrigin)
    );
  });
  const tags = siblings.map((child) => {
    const tag = child.tagName;
    // RN's public DOM prefixes actual component names with RN:. Keep the
    // legacy unprefixed model spelling equivalent without widening other hosts.
    if (tag === 'RN:AltrooMUIStructuralView') return 'RN:View';
    return tag === 'AltrooMUIStructuralView' ? 'View' : tag;
  });
  const first = new Map<string, number>(),
    last = new Map<string, number>();
  tags.forEach((tag, index) => {
    if (!tag) return;
    if (!first.has(tag)) first.set(tag, index);
    last.set(tag, index);
  });
  return new Map(
    siblings.flatMap((element, index) => {
      const tag = tags[index];
      if (!tag || element.isConnected === false) return [];
      const previousExpanded =
        index > 0 &&
        expandedAt(siblings[index - 1]) === true &&
        sharesSourceClass(siblings[index - 1], element);
      return [
        [
          element,
          {
            element,
            facts: {
              firstOfType: first.get(tag) === index,
              lastOfType: last.get(tag) === index,
              lastChild: index === siblings.length - 1,
              states: previousExpanded ? ['nativePreviousExpanded'] : [],
            },
            previousExpanded,
            ...(element.ownerDocument
              ? {
                  peerObservation: observedPeer(
                    element,
                    parent,
                    siblings[index - 1],
                    previousExpanded,
                  ),
                }
              : {}),
          } satisfies AccordionStructure,
        ] as const,
      ];
    }),
  );
}
/** Pure selector facts, shared by the live registry and physical-tree fixtures. */
export function accordionStructureAt(
  element: AccordionHost | null,
  expandedAt: (node: AccordionHost) => boolean | undefined,
): AccordionStructure {
  if (!element || element.isConnected === false || !element.parentElement) return unknown;
  return regionAt(element.parentElement, expandedAt).get(element) ?? unknown;
}
const entries = new Set<Entry>();
const byHost = new WeakMap<AccordionHost, Entry>();
let stopTree: (() => void) | undefined;
let nextLease = 0;
let queued = false;
function refresh() {
  const regions = new Map<AccordionHost, ReturnType<typeof regionAt>>();
  const styles = new Map<
    AccordionHost,
    { expanded: boolean; classes: readonly NativeStyleClassIdentity[] }
  >();
  const styleAt = (host: AccordionHost) => {
    let value = styles.get(host);
    if (!value) {
      const scope = nativeStyleTree.exactHostStyle(host);
      value = {
        expanded: scope?.selector?.classes.includes('Mui-expanded') === true,
        classes: scope?.sourceClasses ?? [],
      };
      styles.set(host, value);
    }
    return value;
  };
  const sharesSourceClass = (previous: AccordionHost, current: AccordionHost) => {
    const sourceCss = byHost.get(current)?.sourceCss;
    if (!sourceCss) return false;
    const prior = styleAt(previous).classes;
    const currentClasses = styleAt(current).classes;
    return currentClasses.some(
      (token) =>
        token.sourceOwners.includes(sourceCss) &&
        prior.some((peer) => peer.cacheKey === token.cacheKey && peer.css === token.css),
    );
  };

  for (const entry of entries) {
    const element = entry.element;
    const parent = element?.isConnected !== false ? element?.parentElement : undefined;
    if (parent && !regions.has(parent))
      regions.set(
        parent,
        regionAt(parent, (host) => styleAt(host).expanded, sharesSourceClass),
      );
    const next = parent && element ? (regions.get(parent)?.get(element) ?? unknown) : unknown;
    const prior = entry.snapshot;
    if (
      next.element === prior.element &&
      next.previousExpanded === prior.previousExpanded &&
      sameObservation(next.peerObservation, prior.peerObservation) &&
      next.facts.firstOfType === prior.facts.firstOfType &&
      next.facts.lastOfType === prior.facts.lastOfType &&
      next.facts.lastChild === prior.facts.lastChild
    )
      continue;
    entry.snapshot = next;
    entry.publish(next);
  }
}
function syncRoots() {
  const errors: unknown[] = [];
  for (const entry of entries) {
    try {
      update(entry, entry.readElement(), entry.expanded, false);
    } catch (error) {
      errors.push(error);
    }
  }
  refresh();
  if (errors.length) throw new AggregateError(errors, 'Accordion root observation failed');
}
function scheduleRefresh() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    refresh();
  });
}
function update(
  entry: Entry,
  element: AccordionHost | null,
  expanded: boolean,
  repaint = true,
  sourceCss = entry.sourceCss,
) {
  if (entry.element === element && entry.expanded === expanded && entry.sourceCss === sourceCss)
    return;
  if (entry.element !== element) {
    const stop = entry.stop;
    entry.stop = undefined;
    if (entry.element && byHost.get(entry.element) === entry) byHost.delete(entry.element);
    entry.element = null;
    stop?.();
    entry.element = element;
    if (element) {
      byHost.set(element, entry);
      const tag =
        element.isConnected === true && typeof element.tagName === 'string'
          ? findNodeHandle(element as ViewInstance)
          : null;
      if (tag != null) {
        const observer = createNativeStructuralObservation();
        if (observer) {
          const stop = observer.watch(tag, `accordion:${++nextLease}`, 'siblings', scheduleRefresh);
          entry.stop = () => {
            try {
              stop();
            } finally {
              observer.dispose();
            }
          };
        }
      }
    }
  }
  entry.expanded = expanded;
  entry.sourceCss = sourceCss;
  if (repaint) refresh();
}
/** Ref changes and library state are synchronous commit facts. Native dirty
 * hints cover host insertion/removal/reparenting outside this React subtree.
 * Hints only trigger a fresh public-tree read; they never supply guessed facts.
 */
export function useAccordionStructure(
  root: RefObject<ViewInstance | null>,
  expanded: boolean,
  sourceCss: string | undefined,
) {
  const [snapshot, setSnapshot] = useState(unknown);
  const owned = useRef<Entry | null>(null);
  if (!owned.current)
    owned.current = {
      element: null,
      expanded,
      sourceCss,
      snapshot: unknown,
      publish: setSnapshot,
      readElement: () => root.current,
    };
  const entry = owned.current;
  useLayoutEffect(() => {
    entry.readElement = () => root.current;
    entries.add(entry);
    stopTree ??= nativeStyleTree.subscribe(syncRoots);
    return () => {
      const stop = entry.stop;
      entry.stop = undefined;
      entries.delete(entry);
      if (entry.element && byHost.get(entry.element) === entry) byHost.delete(entry.element);
      entry.element = null;
      if (!entries.size) {
        stopTree?.();
        stopTree = undefined;
      }
      try {
        stop?.();
      } finally {
        refresh();
      }
    };
  }, [entry, root]);
  useLayoutEffect(() => update(entry, root.current, expanded, true, sourceCss));
  return snapshot;
}
