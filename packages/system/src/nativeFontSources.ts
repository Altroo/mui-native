// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Field ownership is captured from owned maps before parent styles are materialized.
import type { TextStyle } from 'react-native';
import {
  supportsNativeTextFonts,
  nativeFontKeys,
  isNativeFontStep,
  type NativeFontBinding,
  type NativeFontValues,
  type NativeFontState,
  type NativeFontStep,
  type NativeFontPresentation,
} from '@altroo/mui-native-host/internal/structural-root';
const bindings = new WeakMap<object, NativeFontBinding>();
const states = new WeakMap<object, NativeFontState>();
const plans = new WeakMap<object, NativeFontStep>();
/** Only inspect scalar leaves. Nested caller arrays/records remain ordinary RN data. */
export function nativeFontStep(style: object, emitResets = false): NativeFontStep {
  let owns = 0,
    blocked = 0;
  const values = nativeFontKeys.map((key, index) => {
    if (!Object.hasOwn(style, key)) return null;
    const value = (style as Record<string, unknown>)[key];
    if (!emitResets && (value == null || value === 'inherit' || value === 'unset')) return null;
    const bit = 1 << index;
    owns |= bit;
    if (value == null) return null;
    // Text.js converts genuine native numeric weights before payload processing.
    if (key === 'fontWeight' && typeof value === 'number' && Number.isFinite(value))
      return String(value);
    if (typeof value === 'string' && value.length <= 4096) return value;
    blocked |= bit;
    return null;
  }) as unknown as NativeFontValues;
  return Object.freeze({ values: Object.freeze(values), owns, blocked });
}
export function retainNativeFontPlan(style: object): void {
  if (supportsNativeTextFonts) plans.set(style, nativeFontStep(style));
}
export function nativeFontPlan(style: object): NativeFontStep | undefined {
  return plans.get(style);
}
export function nativeFontBinding(scope: object | undefined): NativeFontBinding | undefined {
  return scope ? bindings.get(scope) : undefined;
}
export function nativeFontState(scope: object | undefined): NativeFontState | undefined {
  return scope ? states.get(scope) : undefined;
}
export function retainNativeFontBinding(
  scope: object,
  binding: NativeFontBinding | undefined,
): void {
  if (binding) bindings.set(scope, binding);
  else bindings.delete(scope);
}
export function retainNativeFontScope(
  scope: object,
  parent: object | undefined,
  style: TextStyle,
  steps: readonly NativeFontStep[],
): void {
  if (!supportsNativeTextFonts) return;
  const ordinary = nativeFontStep(style, true);
  states.set(scope, Object.freeze({ values: ordinary.values, blocked: ordinary.blocked }));
  const previous = nativeFontBinding(parent);
  if (!previous || !steps.every(isNativeFontStep)) return;
  const next = [...previous.steps, ...steps.filter((step) => step.owns !== 0)];
  if (next.length > 128) return;
  bindings.set(
    scope,
    Object.freeze({ owner: previous.owner, key: previous.key, steps: Object.freeze(next) }),
  );
}
export function nativeFontPresentation(
  scope: object | undefined,
  style: TextStyle,
): NativeFontPresentation | undefined {
  if (!supportsNativeTextFonts) return;
  const ordinary = nativeFontStep(style, true);
  return Object.freeze({
    binding: nativeFontBinding(scope),
    ordinary: Object.freeze({ values: ordinary.values, blocked: ordinary.blocked }),
  });
}
export function equalNativeFontBindings(a: object, b: object): boolean {
  const left = bindings.get(a),
    right = bindings.get(b);
  return (
    left === right ||
    (left?.owner === right?.owner &&
      left?.key === right?.key &&
      left?.steps.length === right?.steps.length &&
      (left?.steps.every((step, index) => {
        const other = right!.steps[index]!;
        return (
          step.owns === other.owns &&
          step.blocked === other.blocked &&
          step.values.every((value, field) => value === other.values[field])
        );
      }) ??
        true))
  );
}
