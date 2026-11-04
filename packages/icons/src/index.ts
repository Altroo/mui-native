// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React from 'react';
import { Path } from 'react-native-svg';
import { createSvgIcon as createMaterialSvgIcon } from '@altroo/mui-native';
export { SvgIcon } from '@altroo/mui-native';
export type {
  SvgIconProps,
  SvgIconHandle,
  SvgIconOwnProps,
  SvgIconPropsSizeOverrides,
  SvgIconPropsColorOverrides,
} from '@altroo/mui-native';
/** Retain the early path-string extension while sharing the Material factory. */
export function createSvgIcon(path: React.ReactNode, displayName: string) {
  return createMaterialSvgIcon(
    typeof path === 'string' ? React.createElement(Path, { d: path }) : path,
    displayName,
  );
}
// Original simple geometric paths. No upstream icon artwork has been copied.
export const Close = createSvgIcon(
  'M6 4.6 4.6 6 10.6 12 4.6 18 6 19.4 12 13.4 18 19.4 19.4 18 13.4 12 19.4 6 18 4.6 12 10.6Z',
  'Close',
);
export const Add = createSvgIcon('M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7Z', 'Add');
export const Remove = createSvgIcon('M4 11h16v2H4Z', 'Remove');
export const Check = createSvgIcon('M3 12l5 5L21 4l1.4 1.4L8 19.8 1.6 13.4Z', 'Check');
