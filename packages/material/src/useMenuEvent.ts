import { useCallback, useLayoutEffect, useRef } from 'react';
export function useMenuEvent<T extends (...args: any[]) => any>(callback: T): T {
  const current = useRef(callback);
  useLayoutEffect(() => {
    current.current = callback;
  });
  return useCallback(((...args: Parameters<T>) => current.current(...args)) as T, []);
}
