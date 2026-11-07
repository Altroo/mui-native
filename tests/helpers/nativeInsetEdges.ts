// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { StyleSheet, type StyleProp } from 'react-native';
import type { NativeStyle } from '../../packages/system/src';

type Kind = 'margin' | 'padding';
type Direction = 'ltr' | 'rtl';
type Edges = { left: unknown; right: unknown; top: unknown; bottom: unknown };
/**
 * Backend oracle adapted from MIT-licensed RN 0.88.1 Fabric and Yoga.
 * YogaLayoutableShadowNode.cpp applies Inline/Block aliases before its RTL swap; Style.h
 * resolves logical edges before physical, axis and all-edge fallbacks. See
 * NOTICE and upstream/native-rendering.json for pinned sources and license.
 */
export function backendEdges(
  style: StyleProp<NativeStyle>,
  kind: Kind,
  direction: Direction,
  swap: boolean,
): Edges {
  const values: Record<string, unknown> = { ...StyleSheet.flatten(style) };
  for (const [alias, edge] of [
    ['Inline', 'Horizontal'],
    ['InlineStart', 'Start'],
    ['InlineEnd', 'End'],
    ['Block', 'Vertical'],
  ] as const) {
    const value = values[`${kind}${alias}`];
    if (value != null) values[`${kind}${edge}`] = value;
  }
  // RN's BlockStart/End aliases only fill an undefined physical Top/Bottom.
  for (const [alias, edge] of [
    ['BlockStart', 'Top'],
    ['BlockEnd', 'Bottom'],
  ] as const)
    if (values[`${kind}${edge}`] == null) values[`${kind}${edge}`] = values[`${kind}${alias}`];
  if (swap) {
    for (const [physical, logical] of [
      ['Left', 'Start'],
      ['Right', 'End'],
    ] as const) {
      const value = values[`${kind}${physical}`];
      if (value != null) values[`${kind}${logical}`] = value;
      delete values[`${kind}${physical}`];
    }
  }
  const rtl = direction === 'rtl';
  return {
    left:
      values[`${kind}${rtl ? 'End' : 'Start'}`] ??
      values[`${kind}Left`] ??
      values[`${kind}Horizontal`] ??
      values[kind] ??
      0,
    right:
      values[`${kind}${rtl ? 'Start' : 'End'}`] ??
      values[`${kind}Right`] ??
      values[`${kind}Horizontal`] ??
      values[kind] ??
      0,
    top: values[`${kind}Top`] ?? values[`${kind}Vertical`] ?? values[kind] ?? 0,
    bottom: values[`${kind}Bottom`] ?? values[`${kind}Vertical`] ?? values[kind] ?? 0,
  };
}
