import { useCallback, useSyncExternalStore } from 'react';
import type { ReducedMotionMode } from '@altroo/mui-native-system';
import { AccessibilityInfo } from 'react-native';
let reduced: boolean | undefined;
let revision = 0;
let generation = 0;
const listeners = new Set<(value: boolean) => void>();
let subscription: { remove(): void } | undefined;
function publish(value: boolean) {
  reduced = value;
  for (const listener of listeners) listener(value);
}
export function reducedNativeMotion() {
  return reduced ?? true;
}
export function observeNativeMotion(listener: (value: boolean) => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    const request = ++revision;
    const active = ++generation;
    subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      if (active !== generation || !listeners.size) return;
      revision++;
      publish(value);
    });
    AccessibilityInfo.isReduceMotionEnabled().then(
      (value) => {
        if (request === revision && listeners.size) publish(value);
      },
      () => {
        if (request === revision && listeners.size) publish(true);
      },
    );
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      revision++;
      generation++;
      subscription?.remove();
      subscription = undefined;
      reduced = undefined;
    }
  };
}

const subscribeStore = (notify: () => void) => observeNativeMotion(() => notify());
const subscribeNoop = () => () => {};
export function useNativeReducedMotion(
  mode: ReducedMotionMode | undefined,
  disabled = false,
): boolean {
  const system = !disabled && mode === 'system';
  const snapshot = useCallback(
    () => !disabled && (mode === 'always' || (system && reducedNativeMotion())),
    [disabled, mode, system],
  );
  return useSyncExternalStore(system ? subscribeStore : subscribeNoop, snapshot, snapshot);
}
