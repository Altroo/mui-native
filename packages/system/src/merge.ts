/*
 * Copyright (c) 2026 Altroo and contributors.
 * Nested identity handling adapts MIT MUI Utils9.5 deepmerge and React19 object types.
 * Copyright (c) MUI contributors and Meta Platforms, Inc. and affiliates.
 * SPDX-License-Identifier: MIT
 */

import { isValidElement } from 'react';

// Preserve nested React values as identity leaves, as pinned MIT MUI deepmerge
// and React's current object element-type contracts do. Arrays remain native
// replacement leaves; eligible records keep this helper's existing merge order.
function reactIdentity(value: object): boolean {
  const type = value as { $$typeof?: symbol; getModuleId?: unknown };
  return (
    isValidElement(value) ||
    type.$$typeof === Symbol.for('react.lazy') ||
    type.$$typeof === Symbol.for('react.memo') ||
    type.$$typeof === Symbol.for('react.context') ||
    type.$$typeof === Symbol.for('react.consumer') ||
    type.$$typeof === Symbol.for('react.forward_ref') ||
    type.$$typeof === Symbol.for('react.client.reference') ||
    type.getModuleId !== undefined
  );
}

// Nested recursion eligibility follows the pinned MUI plain-object predicate.
// Check symbol presence without invoking the symbol property's getter.
function plainObject(value: unknown): value is Record<PropertyKey, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === null ||
      prototype === Object.prototype ||
      Object.getPrototypeOf(prototype) === null) &&
    !(Symbol.toStringTag in value) &&
    !(Symbol.iterator in value)
  );
}

// Keep this helper independent of theme construction: typography also needs it,
// and importing it through theme.ts creates a runtime initialization cycle.
export function merge<T>(base: T, value: unknown): T {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return (value === undefined ? base : value) as T;
  const out: Record<string, unknown> = { ...(base as object) };
  for (const [key, next] of Object.entries(value))
    if (!['__proto__', 'prototype', 'constructor'].includes(key))
      out[key] =
        next &&
        typeof next === 'object' &&
        !Array.isArray(next) &&
        !reactIdentity(next) &&
        plainObject(next)
          ? merge(Object.hasOwn(out, key) && plainObject(out[key]) ? out[key] : {}, next)
          : next;
  return out as T;
}
