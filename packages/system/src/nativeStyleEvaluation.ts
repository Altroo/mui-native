// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import type { NativePreparedSheet } from './nativeStyledMetadata';
import { nativeStyleCacheRegistry, type NativeCssInsertion } from './nativeStyleCache';
import type { StyleProp } from 'react-native';
import type { NativeStyle } from './sx';
// Owned result keys do not keep an unmounted root alive. Evaluation closures
// retain already-prepared CSS, never a second callback/preparation operation.
const evaluations = new WeakMap<
  NativeStyle,
  {
    evaluate: () => NativeStyle;
    sheets: readonly NativePreparedSheet[];
    revision: number;
    latest?: { revision: number; value: NativeStyle };
  }
>();
export function retainNativeStyleEvaluation(
  computed: NativeStyle,
  evaluate: () => NativeStyle,
  sheets: readonly NativePreparedSheet[],
): NativeStyle {
  evaluations.set(computed, { evaluate, sheets, revision: nativeStyleCacheRegistry.snapshot() });
  return computed;
}
/** Reapply a retained cascade without resolving theme, variant or sx callbacks. */
export function reevaluateNativeStyle(computed: NativeStyle): NativeStyle {
  const evaluate = evaluations.get(computed);
  if (!evaluate) throw Error('Expected an owned prepared native style');
  return evaluate.evaluate();
}

/** Refresh cache order once per revision, without repeating source preparation. */
export function refreshNativeStyle(computed: NativeStyle): NativeStyle {
  const record = evaluations.get(computed);
  if (!record) return computed;
  const revision = nativeStyleCacheRegistry.snapshot();
  if (record.revision === revision) return computed;
  if (record.latest?.revision === revision) return record.latest.value;
  const value = record.evaluate();
  record.latest = { revision, value };
  return value;
}
/** Refresh only prepared presentation cells; native authored layers remain unchanged. */
export function refreshNativeStyleProp(style: StyleProp<NativeStyle>): StyleProp<NativeStyle> {
  if (!style || typeof style !== 'object') return style;
  if (evaluations.has(style as NativeStyle)) return refreshNativeStyle(style as NativeStyle);
  return Array.isArray(style) ? style.map(refreshNativeStyleProp) : style;
}
/** Retain a pure native inline/feedback transform over prepared CSS. */
export function retainNativeStyleTransform(
  value: NativeStyle,
  source: NativeStyle,
  transform: (next: NativeStyle) => NativeStyle,
): NativeStyle {
  const record = evaluations.get(source);
  return record
    ? retainNativeStyleEvaluation(value, () => transform(record.evaluate()), record.sheets)
    : value;
}
/** Read logical-root tokens. Physical selector ancestry creates no insertion dependency. */
export function nativeStyleInsertions(
  style: StyleProp<NativeStyle>,
): readonly NativeCssInsertion[] {
  const seen = new Set<NativeCssInsertion>();
  const visit = (value: StyleProp<NativeStyle>) => {
    if (!value || typeof value !== 'object') return;
    const record = evaluations.get(value as NativeStyle);
    if (record) {
      for (const sheet of record.sheets) {
        if (sheet.ancestor || sheet.emissionForeign) continue;
        const insertion = sheet.emissionProgramme?.insertion;
        if (insertion) seen.add(insertion);
      }
    } else if (Array.isArray(value)) value.forEach(visit);
  };
  visit(style);
  return [...seen];
}
