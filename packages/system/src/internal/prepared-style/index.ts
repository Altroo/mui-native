// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Canonical metadata identity for first-party candidate compilation. No new map.
export {
  nativeStyledStyles,
  nativeInlineStyle,
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
  retainNativeRootPreparation,
  refreshNativeRootPreparation,
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

export {
  rebaseNativeComponentStyle,
  prepareNativeCompositeSource,
} from '../../nativePreparedComponent';

export {
  nativeCssProgram,
  serializeNativeCss,
  nativeCssProgramTree,
  retainNativeCssProgram,
} from '../../nativeCssProgram';

export {
  reevaluateNativeStyle,
  refreshNativeStyle,
  retainNativeStyleTransform,
  nativeStyleInsertions,
} from '../../nativeStyleEvaluation';

export {
  NativeCssRootBoundary,
  NativeCssInsertionScope,
  useNativeStyleCache,
  useNativeStyleCacheRevision,
} from '../../nativeStyleCacheScope';

export { useNativeDefaultPropsSource, useNativeSourceDefaultProps } from '../../defaultProps';
