// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { serializeStyles, type Interpolation } from '@emotion/serialize';
import { nativeCssHasRules } from './nativeCssEmission';
import {
  defaultNativeStyleCache,
  nativeStyleCacheRegistry,
  type NativeStyleCache,
  type NativeCssInsertion,
} from './nativeStyleCache';
import type { NativePreparedSheet } from './nativeStyledMetadata';

/** Owned CSS values, captured by the compiler before native-only conversion. */
export function snapshotNativeCssValue(value: unknown, active = new Set<object>()): unknown {
  if (!value || typeof value !== 'object') return value;
  if (active.has(value)) throw new TypeError('A CSS interpolation cannot contain a circular value');
  active.add(value);
  try {
    if (Array.isArray(value)) return value.map((item) => snapshotNativeCssValue(item, active));
    const copy: Record<string, unknown> = Object.create(null);
    for (const key in value)
      copy[key] = snapshotNativeCssValue((value as Record<string, unknown>)[key], active);
    return copy;
  } finally {
    active.delete(value);
  }
}

export function serializeNativeCss(value: unknown): string {
  return serializeStyles([value as Interpolation<unknown>]).styles;
}

// A processed object is interpolated inside styled's expression list. Emotion's
// single-argument fast path would omit its original trailing separator.
export function serializeNativeCssInterpolation(value: unknown): string {
  return serializeStyles(['', value as Interpolation<unknown>]).styles;
}

export type NativeCssOwner = Readonly<{
  /** Private immutable source occurrence, excluded from serialized CSS identity. */
  selectorOwner?: string;
  name: string;
  base: string;
  tail: string;
  css: string;
}>;
export function createNativeCssOwner(
  name: string,
  base: unknown,
  tail: readonly unknown[],
  selectorOwner?: string,
): NativeCssOwner {
  const baseCss = serializeNativeCssInterpolation(base);
  const tailCss = tail.map(serializeNativeCssInterpolation).join('');
  const label = name ? 'label:' + name + '-root;' : '';
  return Object.freeze({
    name,
    base: baseCss,
    tail: tailCss,
    css: label + baseCss + tailCss,
    ...(selectorOwner ? { selectorOwner } : {}),
  });
}
export function rebaseNativeCssOwner(
  previous: NativeCssOwner,
  base: NativeCssOwner,
): NativeCssOwner {
  const label = previous.name ? 'label:' + previous.name + '-root;' : '';
  return Object.freeze({ ...previous, base: base.base, css: label + base.base + previous.tail });
}
/** Full same-root programmes retain their boundaries, even when repeated. */
export function nativeCssProgram(sheets: readonly NativePreparedSheet[]): string {
  return renderProgramme(nativeCssProgramTree(sheets));
}
export type NativeCssProgramNode =
  | Readonly<{ kind: 'owner'; owner: NativeCssOwner }>
  | Readonly<{ kind: 'sequence'; parts: readonly NativeCssProgramNode[] }>
  | Readonly<{
      kind: 'registered';
      own: NativeCssProgramNode;
      classes: readonly NativeCssProgramNode[];
    }>;
export type NativeCssProgrammeOccurrence = Readonly<{
  programme: NativeCssProgramNode;
  insertion: NativeCssInsertion;
}>;
export function nativeCssSequence(parts: readonly NativeCssProgramNode[]): NativeCssProgramNode {
  return parts.length === 1
    ? parts[0]
    : Object.freeze({ kind: 'sequence', parts: Object.freeze([...parts]) });
}
export function nativeCssRegistered(
  own: NativeCssProgramNode,
  classes: readonly NativeCssProgramNode[],
): NativeCssProgramNode {
  return classes.length
    ? Object.freeze({ kind: 'registered', own, classes: Object.freeze([...classes]) })
    : own;
}
export function nativeCssProgramTree(sheets: readonly NativePreparedSheet[]): NativeCssProgramNode {
  const parts: NativeCssProgramNode[] = [];
  for (const sheet of sheets) {
    if (sheet.ancestor) continue;
    if (sheet.emissionProgramme) {
      if (sheet.emissionProgrammeStart) parts.push(sheet.emissionProgramme.programme);
    } else if (sheet.emissionStart) {
      if (!sheet.emissionOwner) throw Error('Missing owned CSS programme');
      parts.push(Object.freeze({ kind: 'owner', owner: sheet.emissionOwner }));
    }
  }
  return nativeCssSequence(parts);
}
function renderProgramme(node: NativeCssProgramNode): string {
  if (node.kind === 'owner') return node.owner.css;
  if (node.kind === 'sequence') return node.parts.map(renderProgramme).join('');
  // Emotion appends a separator when a registered class becomes an
  // interpolation. Nested component boundaries each retain their separator.
  return (
    renderProgramme(node.own) + node.classes.map((value) => renderProgramme(value) + ';').join('')
  );
}
export function retainNativeCssProgram(
  sheets: readonly NativePreparedSheet[],
  programme: NativeCssProgramNode,
  cache: NativeStyleCache = sheets.find((sheet) => !sheet.ancestor && sheet.emissionProgramme)
    ?.emissionProgramme?.insertion.cache ?? defaultNativeStyleCache,
): NativePreparedSheet[] {
  const css = renderProgramme(programme);
  const occurrence = Object.freeze({
    programme,
    insertion: Object.freeze({
      cache,
      css,
      hasRules: nativeStyleCacheRegistry.rules(cache, css) ?? nativeCssHasRules(css),
    }),
  });
  // Native constructor geometry may precede a registered outer class in the
  // prepared array. Source CSS keeps that class after the complete inner root.
  const positions = new Map<NativeCssOwner, number[]>();
  let ordinal = 0;
  const visit = (node: NativeCssProgramNode) => {
    if (node.kind === 'owner') {
      const list = positions.get(node.owner) ?? [];
      list.push(ordinal++);
      positions.set(node.owner, list);
    } else if (node.kind === 'sequence') node.parts.forEach(visit);
    else {
      visit(node.own);
      node.classes.forEach(visit);
    }
  };
  visit(programme);
  const nextPosition = new Map<NativeCssOwner, number>();
  const activePosition = new Map<NativeCssOwner, number>();
  let first = true;
  return sheets.map((sheet) => {
    if (sheet.ancestor) return sheet;
    const owner = sheet.emissionOwner;
    // Composite ButtonBase carries outer class sheets forward while reporting
    // only its own prefix. Their existing insertion token remains separate
    // until the final Button programme consumes that registered class.
    if (owner && !positions.has(owner))
      return { ...sheet, emissionProgrammeStart: false, emissionForeign: true };
    if (owner && sheet.emissionStart) {
      const next = nextPosition.get(owner) ?? 0;
      const position = positions.get(owner)?.[next];
      if (position === undefined) throw Error('Missing emitted CSS owner occurrence');
      activePosition.set(owner, position);
      nextPosition.set(owner, next + 1);
    }
    const next = {
      ...sheet,
      emissionProgramme: occurrence,
      emissionForeign: false,
      emissionProgrammeStart: first,
      emissionPosition: owner ? activePosition.get(owner) : undefined,
    };
    first = false;
    return next;
  });
}
export function replaceNativeCssOwner(
  node: NativeCssProgramNode,
  before: NativeCssOwner,
  after: NativeCssOwner,
): NativeCssProgramNode {
  if (node.kind === 'owner')
    return node.owner === before ? Object.freeze({ kind: 'owner', owner: after }) : node;
  if (node.kind === 'sequence')
    return nativeCssSequence(node.parts.map((part) => replaceNativeCssOwner(part, before, after)));
  return nativeCssRegistered(
    replaceNativeCssOwner(node.own, before, after),
    node.classes.map((part) => replaceNativeCssOwner(part, before, after)),
  );
}
