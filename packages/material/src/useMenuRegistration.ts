import { useCallback, useLayoutEffect, useRef } from 'react';
import type { ViewInstance } from 'react-native';
import type { NativeMenuRecord } from './nativeMenuRegistry';
import { useNativeMenuContext } from './menuContext';
type Metadata = Omit<NativeMenuRecord, 'element' | 'token'>;
export function useMenuRegistration(metadata: Metadata) {
  const { registry } = useNativeMenuContext();
  const latest = useRef(metadata);
  latest.current = metadata;
  const attached = useRef<{ element: ViewInstance; token: object } | null>(null);
  const ref = useCallback(
    (element: ViewInstance | null) => {
      const detach = (value: { element: ViewInstance; token: object }) => {
        if (attached.current === value) attached.current = null;
        queueMicrotask(() => registry.remove(metadata.id, value.token));
      };
      if (attached.current) detach(attached.current);
      if (!element) return;
      const value = { element, token: {} };
      attached.current = value;
      registry.set({ ...latest.current, ...value });
      return () => detach(value);
    },
    [registry, metadata.id],
  );
  useLayoutEffect(() => {
    if (attached.current) registry.set({ ...metadata, ...attached.current });
  }, [
    registry,
    metadata.id,
    metadata.disabled,
    metadata.focusableWhenDisabled,
    metadata.focusable,
    metadata.selected,
    metadata.textValue,
    metadata.focus,
  ]);
  return ref;
}
