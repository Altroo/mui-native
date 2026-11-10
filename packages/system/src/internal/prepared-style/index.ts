// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Canonical metadata identity for first-party candidate compilation. No new map.
export {
  nativeStyledStyles,
  retainNativeRootCss,
  sameNativeRootCss,
  snapshotNativeRootCss,
} from '../../nativeStyledMetadata';
export type { NativePreparedSheet } from '../../nativeStyledMetadata';

export {
  NativeRootHandoffContext,
  NativeRootStyleForwardContext,
  useNativeRootStyleForward,
  clearNativeRootStyleForward,
  registerNativeRoot,
  isNativeCooperatingRoot,
  nativeCooperatingRootTarget,
  useNativeRootHandoff,
  useNativeRootHandoffForward,
} from '../../nativeRootHandoff';
export type {
  NativeRootHandoff,
  NativeRootHandoffSource,
  NativeRootHandoffSnapshot,
  NativeRootStyleInput,
  NativeRootPreparation,
  NativeRootOutput,
} from '../../nativeRootHandoff';

export {
  useNativeRootSnapshotScope,
  retainNativeRootSnapshotProps,
  retainNativeRootSnapshotElement,
  nativeRootSnapshotClassName,
} from '../../nativeRootStyleSnapshots';

export { nativeTextIntentStyleServices } from '../../nativeTextConditions';
export { normalizeTextStyle } from '../../nativeText';
export { nativeTextElementProvenance } from '../../nativeTextProvenance';
export type { NativeTextProvenance, NativeTextNormalization } from '../../nativeTextProvenance';
