// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import type { ComponentStyleArgs, SharedComponentStyleArgs } from '../../packages/system/src';

/** Assert the native-owner premise of a component regression without changing its arguments. */
export function nativeOwnerState(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new Error('Expected native component owner state');
  return value as Record<string, unknown>;
}

/** Shared configuration may also style arbitrary components. These tests target native roots. */
export function nativeStyleCallback<Result>(
  callback: (this: unknown, args: ComponentStyleArgs) => Result,
) {
  return function (this: unknown, args: SharedComponentStyleArgs): Result {
    nativeOwnerState(args.ownerState);
    return Reflect.apply(callback, this, [args as ComponentStyleArgs]);
  };
}
