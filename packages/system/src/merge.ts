/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */

// Keep this helper independent of theme construction: typography also needs it,
// and importing it through theme.ts creates a runtime initialization cycle.
export function merge<T>(base: T, value: unknown): T {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return (value === undefined ? base : value) as T;
  const out: Record<string, unknown> = { ...(base as object) };
  for (const [key, next] of Object.entries(value))
    if (!['__proto__', 'prototype', 'constructor'].includes(key))
      out[key] =
        next && typeof next === 'object' && !Array.isArray(next)
          ? merge(out[key] ?? {}, next)
          : next;
  return out as T;
}
