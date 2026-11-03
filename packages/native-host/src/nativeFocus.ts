import type { ViewInstance } from 'react-native';
let current: WeakRef<ViewInstance> | undefined;
function target(value: unknown): ViewInstance | null {
  return value && typeof value === 'object' && 'focus' in value && typeof value.focus === 'function'
    ? (value as ViewInstance)
    : null;
}
/** The latest observed native focus target, never an optimistic focus request. */
export function getNativeFocusedView(): ViewInstance | null {
  const node = current?.deref();
  if (!node || node.isConnected === false) {
    current = undefined;
    return null;
  }
  return node;
}
export function recordNativeFocus(value: unknown) {
  const node = target(value);
  if (node && node.isConnected !== false && current?.deref() !== node) current = new WeakRef(node);
}
export function clearNativeFocus(value: unknown) {
  if (current?.deref() === value) current = undefined;
}
