// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React from 'react';
import type { ViewInstance } from 'react-native';
import {
  NativeTextStyleContext,
  useNativeTextContext,
  useNativeTextChildRoots,
  renderNativeTextChildren,
  type NativeTextScopeValue,
  type Theme,
} from '@altroo/mui-native-system';
import { useNativeTextScopeRoot } from '@altroo/mui-native-system/internal/prepared-style';
// A native View wrapper needs a text fallback, while a styling-aware wrapper
// must resolve the retained CSS from the original parent and own its final text.
// Keep the same boundary type when that ownership changes, preserving children.
export function NativeRootTextBoundary({
  parent,
  fallback,
  rootRef,
  theme,
  children,
}: {
  parent: NativeTextScopeValue | undefined;
  fallback: NativeTextScopeValue;
  rootRef: React.RefObject<ViewInstance | null>;
  theme: Theme;
  children: React.ReactNode;
}) {
  const current = useNativeTextContext();
  const needsFallback = current === parent;
  const value = needsFallback ? fallback : current;
  const trackChildren = useNativeTextChildRoots();
  // Register the fallback only when the selected root did not publish a scope.
  // Otherwise Portal inheritance must see that root's actual final text styles.
  useNativeTextScopeRoot(needsFallback ? rootRef : undefined, fallback);
  return (
    <NativeTextStyleContext.Provider value={value}>
      {value ? renderNativeTextChildren(children, theme, value, trackChildren) : children}
    </NativeTextStyleContext.Provider>
  );
}
