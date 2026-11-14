// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Readiness is captured at module initialization. Render never reads native metadata.
import { requireOwnedStyleProfile, supportsStructuralCases } from './ownedStyleBootstrap';
import { structuralStyleActivation } from './structuralStyleActivation';
import type { StructuralView } from './ownedStructuralHost';
function captureRuntime() {
  if (!supportsStructuralCases()) return;
  const native = (
    require('./NativeAltrooStructuralObserver') as typeof import('./NativeAltrooStructuralObserver')
  ).default;
  if (!native) return;
  const Native = (
    require('./AltrooMUIStructuralViewNativeComponent') as typeof import('./AltrooMUIStructuralViewNativeComponent')
  ).default;
  // This optional codec is initialized before React only after the matching
  // native binary advertises support. Ordinary roots keep the thin import path.
  const { encodeStructuralCases } =
    require('./ownedStyleEncoding') as typeof import('./ownedStyleEncoding');
  return Object.freeze({
    profile: requireOwnedStyleProfile(),
    activation: structuralStyleActivation(native),
    Native: Native as StructuralView,
    encode: encodeStructuralCases,
  });
}
export const ownedStructuralCases = captureRuntime();
