// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useMemo, useLayoutEffect, useRef } from 'react';

// Keep the stable invoker outside the hook's effect closure environment, which
// also contains the previous handler and any caller data captured by it.
function createInvoker<T extends (...args: any[]) => any>(current: { current: T }): T {
  return ((...args: Parameters<T>) => current.current(...args)) as T;
}
export function useMenuEvent<T extends (...args: any[]) => any>(callback: T): T {
  const current = useRef(callback);
  useLayoutEffect(() => {
    current.current = callback;
  });
  return useMemo(() => createInvoker(current), [current]);
}
