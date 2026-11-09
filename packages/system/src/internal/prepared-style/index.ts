// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Canonical metadata identity for first-party candidate compilation. No new map.
export { nativeStyledStyles } from '../../nativeStyledMetadata';
export type { NativePreparedSheet } from '../../nativeStyledMetadata';

export {
  NativeRootHandoffContext,
  registerNativeRoot,
  isNativeCooperatingRoot,
  useNativeRootHandoff,
} from '../../nativeRootHandoff';
export type {
  NativeRootHandoff,
  NativeRootStyleInput,
  NativeRootPreparation,
  NativeRootOutput,
} from '../../nativeRootHandoff';
