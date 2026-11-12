// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  rebaseNativeCssOwner,
  nativeCssProgramTree,
  replaceNativeCssOwner,
  retainNativeCssProgram,
  nativeCssRegistered,
} from './nativeCssProgram';
import type { NativePreparedSheet, NativePreparedStyle } from './nativeStyledMetadata';
import { nativeStyleCacheRegistry, type NativeStyleCache } from './nativeStyleCache';

type BaseRange = Readonly<{ start: number; end: number }>;
// Array ownership keeps constructor boundaries with the prepared programme.
// Only integer offsets are retained; caller props and callbacks stay outside this table.
const constructorRanges = new WeakMap<readonly NativePreparedSheet[], BaseRange>();

export function retainNativeComponentBase<T extends readonly NativePreparedSheet[]>(
  sheets: T,
  start: number,
  end: number,
): T {
  constructorRanges.set(sheets, { start, end });
  return sheets;
}

export function nativeComponentBaseRange(sheets: readonly NativePreparedSheet[]): BaseRange {
  const range = constructorRanges.get(sheets);
  if (!range) throw Error('Expected a prepared component constructor boundary');
  return range;
}

/** Replace constructor-owned geometry while retaining the resolved theme/SX phases.
 * Both inputs come from componentRootStyle. Rebinding never invokes theme callbacks.
 */
export function rebaseNativeComponentStyle(
  prepared: NativePreparedStyle,
  constructor: NativePreparedStyle,
): NativePreparedStyle {
  const previous = nativeComponentBaseRange(prepared.sheets);
  const next = nativeComponentBaseRange(constructor.sheets);
  const previousOwner = prepared.sheets[previous.start]?.emissionOwner;
  const nextOwner = constructor.sheets[next.start]?.emissionOwner;
  const owner =
    previousOwner && nextOwner ? rebaseNativeCssOwner(previousOwner, nextOwner) : undefined;
  const retainOwner = (sheet: NativePreparedSheet): NativePreparedSheet =>
    owner && sheet.emissionOwner === previousOwner ? { ...sheet, emissionOwner: owner } : sheet;
  const base = constructor.sheets.slice(next.start, next.end).map((sheet, index) => ({
    ...sheet,
    ...(owner ? { emissionOwner: owner, emissionStart: index === 0 } : {}),
  }));
  const sheets = [
    ...prepared.sheets.slice(0, previous.start),
    ...base,
    ...prepared.sheets.slice(previous.end).map(retainOwner),
  ];
  let first = true;
  let owned = owner
    ? sheets.map((sheet) => {
        if (sheet.emissionOwner !== owner) return sheet;
        const nextSheet = { ...sheet, emissionStart: first };
        first = false;
        return nextSheet;
      })
    : sheets;
  if (owner && previousOwner)
    owned = retainNativeCssProgram(
      owned,
      replaceNativeCssOwner(nativeCssProgramTree(prepared.sheets), previousOwner, owner),
    );
  retainNativeComponentBase(owned, previous.start, previous.start + base.length);
  return Object.freeze({ sheets: Object.freeze(owned) });
}

/** Resolve an inner source root's ordered incoming classes once, before native frames. */
export function prepareNativeCompositeSource(
  base: NativePreparedStyle,
  outer: NativePreparedStyle,
  cache: NativeStyleCache,
): NativePreparedStyle {
  if (!outer.classTokens) throw Error('Expected an actual composite source root');
  const registered = outer.classTokens
    .filter((token) => nativeStyleCacheRegistry.registered(cache, token.insertion))
    .map((token) => token.programme);
  const range = nativeComponentBaseRange(outer.sheets);
  return Object.freeze({
    sheets: Object.freeze(
      retainNativeComponentBase(
        retainNativeCssProgram(
          [
            ...base.sheets.map((sheet) =>
              sheet.ancestor ? sheet : { ...sheet, retainSourceContext: true as const },
            ),
            ...outer.sheets,
          ],
          nativeCssRegistered(nativeCssProgramTree(base.sheets), registered),
          cache,
        ),
        base.sheets.length + range.start,
        base.sheets.length + range.end,
      ),
    ),
  });
}
