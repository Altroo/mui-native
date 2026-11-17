// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Binary readiness is immutable. The marker is an empty child of actual Text;
// no wrapper, host replacement, nativeID change or late runtime discovery.
import { useRef } from 'react';
import type { ColorValue } from 'react-native';
import type { NativeMetricPresentation } from './nativeTextMetricData';
import {
  supportsInheritedTextColors,
  supportsInheritedTextMetrics,
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
  const { encodeStylePair, encodeStructuralCases } =
    require('./ownedStyleEncoding') as typeof import('./ownedStyleEncoding');
  return Object.freeze({
    Native,
    encodeStylePair,
    encodeStructuralCases,
    profile: requireOwnedStyleProfile(),
    activation: ownedStructuralCases.activation,
  });
}
const runtime = capture();
export const supportsNativeTextColors = !!runtime;
export const supportsNativeTextMetrics =
  !!runtime && typeof supportsInheritedTextMetrics === 'function' && supportsInheritedTextMetrics();
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
export function NativeTextColorMarker({
  binding,
  color,
  metrics,
}: {
  binding?: NativeTextColorBinding | undefined;
  color?: ColorValue | undefined;
  metrics?: NativeMetricPresentation | undefined;
}) {
  // A retained Text can leave its last source root while keeping COW props.
  // Keep its reset lease through unmount, including a later inactive binding.
  const hasOwnedColor = useRef(false);
  if (binding || metrics?.binding) hasOwnedColor.current = true;
  usePrelayoutActivation(hasOwnedColor.current ? runtime?.activation : undefined);
  if (!runtime) return null;
  const ordinary = scalar(color)
    ? (runtime.encodeStylePair(runtime.profile, { color }, {}).normal.color ?? null)
    : undefined;
  return (
    <runtime.Native
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
