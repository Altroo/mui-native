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
import {
  alpha as materialAlpha,
  type ColorObject as MaterialColorObject,
  type ThemeOptions,
} from '@mui/material/styles';
import * as colorHelpers from '@mui/system/colorManipulator';
import { type ColorObject as SystemColorObject } from '@mui/system';
import { type ColorObject as NativeColorObject } from '@altroo/mui-native-system';

import createTransitions, {
  duration as deepDuration,
  easing as deepEasing,
  type TransitionsOptions,
  type Transitions,
  type Easing,
  type Duration,
} from '@mui/material/styles/createTransitions';
import createMotion, { type MotionOptions, type Motion } from '@mui/material/styles/createMotion';

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

// Explicit undefined is legal in the original declarations, including when a
// strict consumer forwards a computed optional colorSpace through each entry.
export const parsedColor: SystemColorObject = {
  type: 'rgb',
  values: [12, 34, 56],
  colorSpace: undefined,
};
export const materialColor: MaterialColorObject = parsedColor;
export const nativeColor: NativeColorObject = materialColor;
export const deepColor: colorHelpers.ColorObject = nativeColor;
export const recomposed: string = colorHelpers.recomposeColor(deepColor);
export const overlay: string = materialAlpha(recomposed, 0.4);
export const safeChannel: string = colorHelpers.private_safeColorChannel(recomposed);
// @ts-expect-error runtime object reuse does not add a public object-input overload
colorHelpers.decomposeColor(parsedColor);
export const invalidSpace: colorHelpers.ColorObject = {
  type: 'color',
  values: [0, 0, 0],
  // @ts-expect-error unsupported spaces remain excluded from the public declaration
  colorSpace: 'xyz',
};

export const timingOptions: TransitionsOptions = {
  easing: undefined,
  duration: undefined,
  create: undefined,
  getAutoHeightDuration: undefined,
};
export const timing: Transitions = createTransitions({ duration: { standard: 42 } });
export const timingText: string = timing.create(['opacity', 'transform'], {
  duration: '1s',
  delay: 2,
});
export const autoHeight: number = timing.getAutoHeightDuration(100);
export const durations: Duration = deepDuration;
export const curves: Easing = deepEasing;
export const requiredPropertyCreator: TransitionsOptions = {
  create: (props: string | string[]) => String(props),
};
export const motionOptions: MotionOptions = { reducedMotion: undefined };
export const motion: Motion = createMotion(motionOptions);
export const timingThemeOptions: ThemeOptions = { transitions: undefined, motion: undefined };
export const nestedTimingThemeOptions: ThemeOptions = {
  transitions: timingOptions,
  motion: motionOptions,
};
// @ts-expect-error inner timing options retain original exact optional-property rules
timing.create('opacity', { duration: undefined });
// @ts-expect-error automatic-height calculation takes a numeric height
timing.getAutoHeightDuration('100');
// @ts-expect-error unknown reduced-motion modes are not public options
createMotion({ reducedMotion: 'sometimes' });
