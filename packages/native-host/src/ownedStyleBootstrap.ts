// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Internal proposal, not a package export. Static import initializes readiness before React.
// Synchronous require from a component render is outside this initialization contract.
import { Platform, ReactNativeVersion } from 'react-native';
import { createOwnedStyleBootstrap } from './ownedStyleMetadata';
// Same compiled normalized View vocabulary as OwnedProgramme.h, checked by source tests.
const styleKeys = 'a7c54eb9011d822990f62b846cc6f333e1fbce23343e2426611925edcacac578';
const rn = '0.88.1';
const bootstrap = createOwnedStyleBootstrap(
  () => {
    // The public API reads the bundled JS version, including patch/prerelease.
    if (ReactNativeVersion?.getVersionString?.() !== rn)
      throw Error('React Native version does not match the compiled owned View codec');
    return require('./NativeAltrooStructuralObserver').default as unknown;
  },
  { rn, platform: Platform.OS, styleKeys },
);
/** Check before constructing an owned native host; no native call occurs here. */
export const requireOwnedStyleProfile = bootstrap.requireProfile;

/** Generated stock-paragraph origin; same immutable module read, no activation. */
export const requireGeneratedTextOrigin = bootstrap.requireGeneratedTextOrigin;

/** Additive native support; old development binaries retain their ordinary path. */
export const supportsStructuralCases = bootstrap.supportsStructuralCases;

/** Parent-projected pseudo targets require the matching native selector capability. */
export const supportsParentStructuralCases = bootstrap.supportsParentStructuralCases;

/** Full CSS peers require the newer matching binary, independently of positional v1. */
export const supportsPeerStyleIdentity = bootstrap.supportsPeerStyleIdentity;
