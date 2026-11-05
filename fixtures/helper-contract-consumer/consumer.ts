// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  createSpacing,
  createBreakpoints,
  type Breakpoint,
  type BreakpointsOptions,
  type Spacing,
  type SpacingOptions,
} from '@mui/system';
import { unstable_createBreakpoints } from '@mui/system/createBreakpoints';
import { createSpacing as nativeSpacing } from '@altroo/mui-native-system';
import type {} from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface BreakpointOverrides {
    xs: false;
    sm: false;
    md: false;
    lg: false;
    xl: false;
    phone: true;
    desktop: true;
    '640': true;
  }
}
const scale = [0, 4, '1rem'] as const;
export const options: SpacingOptions = scale;
export const spacing: Spacing = createSpacing(options);
export const insets: string = spacing(1, 'auto', -1, 0);
export const transformed: string = createSpacing(8, (value) =>
  typeof value === 'string' ? value : value * 3,
)(1, 'auto');
export const empty: string = createSpacing(undefined, () => undefined)(1, 2);
export const numericFunction: string = nativeSpacing((value: number) => value * 3)(2);
export const key: Breakpoint = 'phone';
export const breakpointOptions: BreakpointsOptions = {
  values: { phone: 0, 640: 1000, desktop: 1200 },
  unit: undefined,
  step: undefined,
};
export const breakpoints = createBreakpoints(breakpointOptions);
export const deep = unstable_createBreakpoints(breakpointOptions);
export const boundary: string = deep.between('phone', 640);
export const namedBoundary: string = breakpoints.only('640');
// @ts-expect-error disabled default keys remain unavailable after emitted augmentation
breakpoints.up('xs');
// @ts-expect-error unregistered names remain unavailable
breakpoints.only('tablet');
// @ts-expect-error only takes a named key, not a numeric boundary
breakpoints.only(640);
// @ts-expect-error spacing accepts no more than four arguments
spacing(1, 2, 3, 4, 5);
// @ts-expect-error mui is an internal marker absent from the public Spacing declaration
spacing.mui;
