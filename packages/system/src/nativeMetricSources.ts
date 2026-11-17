// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Private immutable inheritance paths, anchored only at an actual owned root.
import type { TextStyle } from 'react-native';
import {
  supportsNativeTextMetrics,
  isNativeMetricScalar,
  isNativeMetricStep,
  type NativeMetricState,
  type NativeMetricStep,
  type NativeMetricBinding,
  type NativeMetricPresentation,
} from '@altroo/mui-native-host/internal/structural-root';
const bindings = new WeakMap<object, NativeMetricBinding>();
const states = new WeakMap<object, NativeMetricState>();
export function nativeMetricBinding(scope: object | undefined): NativeMetricBinding | undefined {
  return scope ? bindings.get(scope) : undefined;
}
export function nativeMetricState(scope: object | undefined): NativeMetricState | undefined {
  return scope ? states.get(scope) : undefined;
}
export function retainNativeMetricBinding(
  scope: object,
  binding: NativeMetricBinding | undefined,
): void {
  if (binding) bindings.set(scope, binding);
  else bindings.delete(scope);
}
function nullable(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
export function retainNativeMetricScope(
  scope: object,
  parent: object | undefined,
  style: TextStyle,
  ratio: number | undefined,
  steps: readonly NativeMetricStep[] | undefined,
): void {
  if (!supportsNativeTextMetrics) return;
  states.set(
    scope,
    Object.freeze([
      nullable(style.fontSize),
      nullable(style.lineHeight),
      nullable(ratio),
      nullable(style.letterSpacing),
    ]),
  );
  if (!steps || !steps.every(isNativeMetricStep)) return;
  const previous = nativeMetricBinding(parent);
  if (!previous) return;
  const next = [
    ...previous.steps,
    ...steps.filter((step) => step[0] !== 0 || step[2] !== 0 || step[4] !== 0 || step[6] !== 0),
  ];
  if (next.length > 128) return;
  bindings.set(
    scope,
    Object.freeze({ owner: previous.owner, key: previous.key, steps: Object.freeze(next) }),
  );
}
export function equalNativeMetricBindings(a: object, b: object): boolean {
  const left = bindings.get(a),
    right = bindings.get(b);
  return (
    left === right ||
    (left?.owner === right?.owner &&
      left?.key === right?.key &&
      left?.steps.length === right?.steps.length &&
      (left?.steps.every((step, index) =>
        step.every((v, field) => v === right!.steps[index]![field]),
      ) ??
        true))
  );
}
/** Every supplied style here is the final library-owned map at a Text constructor. */
export function nativeMetricPresentation(
  scope: object | undefined,
  style: TextStyle,
): NativeMetricPresentation | undefined {
  if (!supportsNativeTextMetrics) return;
  const keys = ['fontSize', 'lineHeight', 'letterSpacing'] as const;
  if (
    keys.some((key, index) => {
      const value = style[key];
      return (
        value != null &&
        (typeof value !== 'number' || !isNativeMetricScalar(value) || (index < 2 && value < 0))
      );
    })
  )
    return;
  let resets = 0;
  const ordinary = keys.map((key, index) => {
    const value = style[key];
    if (Object.hasOwn(style, key) && value == null) resets |= 1 << index;
    return nullable(value);
  }) as [number | null, number | null, number | null];
  return Object.freeze({
    binding: nativeMetricBinding(scope),
    ordinary: Object.freeze(ordinary),
    resets,
  });
}
/** Typography composes genuine native fields after CSS. Keep its scope metadata
 * distinct from the emitted null-reset mask, and do not replay caller styles. */
export function nativeMetricTypographyTail(
  style: TextStyle,
  metrics: Record<string, unknown>,
  basis: Readonly<{ rootSize: number; fallbackSize: number }>,
): NativeMetricStep {
  const literalFont = !Object.hasOwn(metrics, 'fontSize') && Object.hasOwn(style, 'fontSize');
  const literalHeight = !Object.hasOwn(metrics, 'lineHeight') && Object.hasOwn(style, 'lineHeight');
  const literalSpacing =
    !Object.hasOwn(metrics, 'letterSpacing') && Object.hasOwn(style, 'letterSpacing');
  const font = nullable(style.fontSize),
    height = nullable(style.lineHeight),
    spacing = nullable(style.letterSpacing);
  return Object.freeze([
    literalFont ? (font === null ? 3 : 1) : 0,
    font ?? 0,
    literalHeight ? (height === null ? 5 : 1) : 0,
    height ?? 0,
    0,
    0,
    literalSpacing ? (spacing === null ? 3 : 1) : 0,
    spacing ?? 0,
    basis.rootSize,
    basis.fallbackSize,
  ]);
}
