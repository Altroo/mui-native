// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Binary readiness is immutable. The marker is an empty child of actual Text;
// no wrapper, host replacement, nativeID change or late runtime discovery.
import { useRef } from 'react';
import type { ColorValue } from 'react-native';
import {
  nativeFontKeys,
  nativeFontAndAlignmentKeys,
  type NativeFontPresentation,
  type NativeFontState,
  type NativeFontStep,
  type NativeFontBank,
} from './nativeTextFontData';
import type { NativeMetricPresentation } from './nativeTextMetricData';
import {
  supportsInheritedTextColors,
  supportsInheritedTextMetrics,
  supportsInheritedTextFonts,
  supportsInheritedTextAlignment,
  requireOwnedStyleProfile,
} from './ownedStyleBootstrap';
import { ownedStructuralCases } from './ownedStructuralCases';
import { usePrelayoutActivation } from './ownedStructuralHost';
import type { NativeTextColorBinding, OwnedTextColorBank } from './ownedStyleTypes';
function capture() {
  if (!supportsInheritedTextColors() || !ownedStructuralCases) return;
  const Native = (
    require('./AltrooMUITextColorMarkerNativeComponent') as typeof import('./AltrooMUITextColorMarkerNativeComponent')
  ).default;
  const { encodeStylePair, encodeStructuralCases, encodeNativeFontValues } =
    require('./ownedStyleEncoding') as typeof import('./ownedStyleEncoding');
  return Object.freeze({
    Native,
    encodeStylePair,
    encodeStructuralCases,
    encodeNativeFontValues,
    profile: requireOwnedStyleProfile(),
    activation: ownedStructuralCases.activation,
  });
}
const runtime = capture();
export const supportsNativeTextColors = !!runtime;
export const supportsNativeTextMetrics =
  !!runtime && typeof supportsInheritedTextMetrics === 'function' && supportsInheritedTextMetrics();
export const supportsNativeTextFonts =
  supportsNativeTextMetrics &&
  typeof supportsInheritedTextFonts === 'function' &&
  supportsInheritedTextFonts();
const supportsTextAlignment =
  supportsNativeTextFonts &&
  typeof supportsInheritedTextAlignment === 'function' &&
  supportsInheritedTextAlignment();
export const nativeTextTransportKeys = supportsTextAlignment
  ? nativeFontAndAlignmentKeys
  : nativeFontKeys;
// Opaque platform/dynamic color objects stay on their ordinary RN path. They
// are never replayed through an extra processor or treated as inheritance proof.
function scalar(value: unknown): value is string | number | null | undefined {
  return value == null || typeof value === 'string' || typeof value === 'number';
}
export function prepareNativeTextColorBank(
  colors: readonly unknown[],
  ordinary: unknown,
  barriers?: number,
  parent?: NativeTextColorBinding,
): OwnedTextColorBank | undefined {
  if (!runtime || colors.length !== 8 || !scalar(ordinary) || !colors.every(scalar)) return;
  if (
    colors.every((color) => Object.is(color, ordinary)) &&
    (barriers === undefined || barriers === 0 || barriers === 511)
  )
    return;
  const encoded = runtime.encodeStructuralCases(
    runtime.profile,
    colors.map((color) => ({ color })),
  );
  const base =
    runtime.encodeStylePair(runtime.profile, { color: ordinary }, {}).normal.color ?? null;
  const values = Object.freeze(encoded.map((value) => value.color ?? null));
  const key = JSON.stringify([
    parent?.owner ?? null,
    parent?.key ?? null,
    barriers ?? null,
    base,
    ...values,
  ]);
  if (key.length > 4096) return;
  return Object.freeze({ key, colors: values, ordinary: base, parent: parent ?? null });
}
function encodeFontState(value: NativeFontState) {
  if (!runtime) throw Error('Native font codec is unavailable');
  return {
    values: runtime.encodeNativeFontValues(runtime.profile, value.values),
    blocked: value.blocked,
  };
}
function encodeFontStep(value: NativeFontStep) {
  return { ...encodeFontState(value), owns: value.owns };
}
function encodeFontBinding(value: NonNullable<NativeFontPresentation['binding']>) {
  return { owner: value.owner, key: value.key, steps: value.steps.map(encodeFontStep) };
}
export function encodeNativeFontBank(value: NativeFontBank) {
  return {
    key: value.key,
    base: encodeFontState(value.base),
    ordinary: encodeFontStep(value.ordinary),
    cases: value.cases.map(encodeFontStep),
    parent: value.parent ? encodeFontBinding(value.parent) : null,
  };
}
export function NativeTextColorMarker({
  binding,
  color,
  metrics,
  fonts,
}: {
  binding?: NativeTextColorBinding | undefined;
  color?: ColorValue | undefined;
  metrics?: NativeMetricPresentation | undefined;
  fonts?: NativeFontPresentation | undefined;
}) {
  // A retained Text can leave its last source root while keeping COW props.
  // Keep its reset lease through unmount, including a later inactive binding.
  const hasOwnedColor = useRef(false);
  if (binding || metrics?.binding || fonts?.binding) hasOwnedColor.current = true;
  usePrelayoutActivation(hasOwnedColor.current ? runtime?.activation : undefined);
  if (!runtime) return null;
  const ordinary = scalar(color)
    ? (runtime.encodeStylePair(runtime.profile, { color }, {}).normal.color ?? null)
    : undefined;
  return (
    <runtime.Native
      {...(supportsNativeTextFonts
        ? {
            fontProgramme: fonts
              ? {
                  schema: 1,
                  profile: runtime.profile,
                  owner: fonts.binding?.owner ?? '',
                  key: fonts.binding?.key ?? '',
                  steps: fonts.binding?.steps.map(encodeFontStep) ?? [],
                  ordinary: encodeFontState(fonts.ordinary),
                  ...(fonts.alignmentDirections === undefined
                    ? {}
                    : { alignmentDirections: fonts.alignmentDirections }),
                }
              : null,
          }
        : {})}
      {...(supportsNativeTextMetrics
        ? {
            metricProgramme: metrics
              ? {
                  schema: 1,
                  profile: runtime.profile,
                  owner: metrics.binding?.owner ?? '',
                  key: metrics.binding?.key ?? '',
                  steps: metrics.binding?.steps ?? [],
                  ordinary: metrics.ordinary,
                  resets: metrics.resets,
                }
              : null,
          }
        : {})}
      colorProgramme={
        ordinary === undefined
          ? null
          : {
              schema: 1,
              profile: runtime.profile,
              owner: binding?.owner ?? '',
              key: binding?.key ?? '',
              ordinary,
            }
      }
    />
  );
}
export type { NativeTextColorBinding, OwnedTextColorBank } from './ownedStyleTypes';
