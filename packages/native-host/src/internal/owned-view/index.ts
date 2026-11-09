// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// First-party ABI boundary, never a new public root export.
export { requireOwnedStyleProfile, requireGeneratedTextOrigin } from '../../ownedStyleBootstrap';
export { createOwnedStyleBootstrap } from '../../ownedStyleMetadata';
export type { GeneratedTextOrigin } from '../../ownedStyleMetadata';
export { OwnedStructuralHost, usePrelayoutActivation } from '../../ownedStructuralHost';
export type { StructuralProps, StructuralView } from '../../ownedStructuralHost';
export { encodeStylePair } from '../../ownedStyleEncoding';
export type { OwnedStyleProfile, OwnedProgramme } from '../../ownedStyleTypes';
// Explicit preparation adapters may observe status; the host receives acquire only.
export { structuralStyleActivation as createOwnedStyleActivation } from '../../structuralStyleActivation';
export type {
  StructuralStyleStatus,
  StructuralStyleErrorReporter,
} from '../../structuralStyleActivation';
import type { Spec } from '../../NativeAltrooStructuralObserver';
export type OwnedStyleNative = Pick<
  Spec,
  | 'enableStructuralStyleRuntime'
  | 'disableStructuralStyleRuntime'
  | 'getStructuralStyleRuntimeStatus'
  | 'getStructuralStyleMetadata'
>;
