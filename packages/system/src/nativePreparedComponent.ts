// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import type { NativePreparedSheet, NativePreparedStyle } from './nativeStyledMetadata';

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
  const base = constructor.sheets.slice(next.start, next.end);
  const sheets = [
    ...prepared.sheets.slice(0, previous.start),
    ...base,
    ...prepared.sheets.slice(previous.end),
  ];
  retainNativeComponentBase(sheets, previous.start, previous.start + base.length);
  return Object.freeze({ sheets: Object.freeze(sheets) });
}
