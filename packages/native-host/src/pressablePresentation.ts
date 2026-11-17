// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createContext, type ReactNode, type RefObject } from 'react';
import type { StyleProp, ViewInstance, ViewStyle } from 'react-native';

/** Internal presentation handoff after native press state and caller styles resolve.
 * Frame updates render only the host; they never repeat consumer style callbacks.
 */
export type NativePressablePresentation = (input: {
  root: RefObject<ViewInstance | null>;
  style: StyleProp<ViewStyle>;
  children(style: StyleProp<ViewStyle>): ReactNode;
}) => ReactNode;
export const NativePressablePresentationContext = createContext<NativePressablePresentation | null>(
  null,
);
