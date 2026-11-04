/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
/** Internal assertions used by the adapted React Native editor. */
export function invariant(condition: unknown, message: string): asserts condition {
  if (condition) return;
  const error = new Error(message);
  error.name = 'Invariant Violation';
  throw error;
}
export function nullthrows<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Got unexpected null or undefined');
  return value;
}
/** Fail before creating an editor against an unreviewed JS/native ABI. */
export function assertNativeInputBaseline(
  jsVersion: string,
  nativeVersion: {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string | number | null;
  },
  registered: boolean,
) {
  const native =
    nativeVersion && `${nativeVersion.major}.${nativeVersion.minor}.${nativeVersion.patch}`;
  if (jsVersion !== '0.88.1' || native !== '0.88.1' || nativeVersion.prerelease != null) {
    throw new Error(
      `NativeTextInput requires a reviewed React Native editor adapter. Found JS ${jsVersion}, native ${native || 'unknown'}. Upgrade MUI Native to an adapter for your React Native version and rebuild the app.`,
    );
  }
  if (!registered)
    throw new Error(
      'NativeTextInput is missing from this app binary. Rebuild the app with the current @altroo/mui-native-host source.',
    );
}
