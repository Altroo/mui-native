// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import type { ViewProps } from 'react-native';
import { isDescendantKeyEvent } from './nativeKeyboard';

// Fabric event targets are the actual host instances. Weak ownership cannot keep
// an unmounted native view alive, and is revoked when its ref detaches.
const targets = new WeakSet<object>();
export function registerNativeKeyTarget(target: object): () => void {
  targets.add(target);
  return () => targets.delete(target);
}

/** Keep ordinary View input, excluding a framework copy of an owned key event. */
export function acceptsNativeViewKey(event: Parameters<NonNullable<ViewProps['onKeyDown']>>[0]) {
  const target = event.target;
  return (
    isDescendantKeyEvent(event) ||
    target === null ||
    typeof target !== 'object' ||
    !targets.has(target)
  );
}

/** Focus and blur from owned hosts also have a framework transport on Android. */
export function acceptsNativeViewFocus(event: Parameters<NonNullable<ViewProps['onFocus']>>[0]) {
  const target = event.target;
  const source = (event.nativeEvent as typeof event.nativeEvent & { muiFocusSource?: string })
    .muiFocusSource;
  return (
    source === 'owned' || target === null || typeof target !== 'object' || !targets.has(target)
  );
}
