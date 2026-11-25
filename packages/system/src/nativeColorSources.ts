// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Color ownership follows declaration channels, never equality of painted values.
import type { StyleProp } from 'react-native';
import type { NativeTextColorBinding } from '@altroo/mui-native-host/internal/structural-root';
import type { NativeStyle } from './sx';
export type NativeColorSource = 'inherited' | 'authored';
const declarations = new WeakMap<object, NativeColorSource>();
const layers = new WeakMap<object, NativeColorSource>();
export function nativeColorSource(style: unknown): NativeColorSource | undefined {
  return style !== null && typeof style === 'object' ? declarations.get(style) : undefined;
}
export function retainNativeColorSource(style: object, source: NativeColorSource): void {
  declarations.set(style, source);
}
export function copyNativeColorSource<T extends object>(source: object, target: T): T {
  const declaration = declarations.get(source);
  if (declaration) declarations.set(target, declaration);
  return target;
}
/** Only an owned layer wrapper changes channel ownership. The caller's style
 * stays untouched and is read by the existing style composition exactly once. */
export function nativeColorLayer(
  style: StyleProp<NativeStyle>,
  source: NativeColorSource,
): StyleProp<NativeStyle> {
  const wrapper = [style];
  layers.set(wrapper, source);
  return wrapper;
}
export function nativeColorLayerSource(style: object): NativeColorSource | undefined {
  return layers.get(style);
}

// Scope bindings are private immutable ancestry data, separate from local
// declaration ownership. Equal paint values never create a binding.
const bindings = new WeakMap<object, NativeTextColorBinding>();
export function nativeTextColorBinding(
  scope: object | undefined,
): NativeTextColorBinding | undefined {
  return scope ? bindings.get(scope) : undefined;
}
export function retainNativeTextColorBinding(
  scope: object,
  binding: NativeTextColorBinding | undefined,
): void {
  if (binding) bindings.set(scope, binding);
  else bindings.delete(scope);
}
export function inheritNativeTextColorBinding(
  scope: object,
  parent: object | undefined,
  style: object,
  resetsInherit = false,
): void {
  // Scope normalization elides native null/undefined colors; Typography
  // separately emits those resets to stock Text and keeps authored ownership.
  const reset = resetsInherit && (style as { color?: unknown }).color == null;
  retainNativeTextColorBinding(
    scope,
    nativeColorSource(style) === 'authored' && !reset ? undefined : nativeTextColorBinding(parent),
  );
}
export function equalNativeTextColorBinding(a: object, b: object): boolean {
  const left = bindings.get(a),
    right = bindings.get(b);
  return left?.owner === right?.owner && left?.key === right?.key;
}
