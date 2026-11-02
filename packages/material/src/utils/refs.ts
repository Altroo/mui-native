import { useMemo, useRef, type Ref, type RefCallback } from 'react';

/** Assign a ref. Call from a ref lifecycle, and detach it when its owner changes. */
export function setRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

/** Share one native instance without losing React 19 callback-ref cleanups. */
export function useForkRef<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> | null {
  // A single dependency also supports callers whose ref list changes length.
  const stable = useRef(refs);
  if (stable.current.length !== refs.length || refs.some((ref, i) => ref !== stable.current[i]))
    stable.current = refs;
  return useMemo(() => {
    const currentRefs = stable.current;
    if (currentRefs.every((ref) => ref == null)) return null;
    let detach: (() => void) | undefined;
    return (instance: T | null) => {
      detach?.();
      detach = undefined;
      if (instance == null) return;
      const cleanups: Array<() => void> = [];
      let detached = false;
      const cleanup = () => {
        if (detached) return;
        detached = true;
        if (detach === cleanup) detach = undefined;
        let firstError: unknown;
        let failed = false;
        for (const release of cleanups) {
          try {
            release();
          } catch (error) {
            if (!failed) firstError = error;
            failed = true;
          }
        }
        if (failed) throw firstError;
      };
      try {
        for (const ref of currentRefs) {
          if (typeof ref === 'function') {
            const release = ref(instance);
            cleanups.push(
              typeof release === 'function'
                ? release
                : () => {
                    ref(null);
                  },
            );
          } else if (ref) {
            ref.current = instance;
            cleanups.push(() => {
              if (ref.current === instance) ref.current = null;
            });
          }
        }
      } catch (error) {
        try {
          cleanup();
        } catch {
          /* Preserve the original attachment error. */
        }
        throw error;
      }
      detach = cleanup;
      return cleanup;
    };
  }, [stable.current]);
}
