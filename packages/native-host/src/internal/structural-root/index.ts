// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Thin first-party root boundary. The optional codec is gated at module initialization.
export { OwnedStructuralHost } from '../../ownedStructuralHost';
export { ownedStructuralCases } from '../../ownedStructuralCases';
export {
  NativeTextColorMarker,
  supportsNativeTextColors,
  supportsNativeTextMetrics,
  supportsNativeTextFonts,
  encodeNativeFontBank,
  prepareNativeTextColorBank,
} from '../../nativeTextColorMarker';
export type { NativeTextColorBinding, OwnedTextColorBank } from '../../nativeTextColorMarker';

export type {
  NativeMetricState,
  NativeMetricStep,
  NativeMetricBinding,
  OwnedMetricBank,
  NativeMetricPresentation,
} from '../../nativeTextMetricData';

export {
  prepareNativeMetricBank,
  applyNativeMetricStep,
  isNativeMetricScalar,
  isNativeMetricStep,
} from '../../nativeTextMetricData';

export {
  nativeFontKeys,
  isNativeFontStep,
  applyNativeFontStep,
  prepareNativeFontBank,
} from '../../nativeTextFontData';
export type {
  NativeFontValues,
  NativeFontState,
  NativeFontStep,
  NativeFontBinding,
  NativeFontBank,
  NativeFontPresentation,
} from '../../nativeTextFontData';
