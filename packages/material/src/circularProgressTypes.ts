/* CircularProgress props adapt MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/circular-progress.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import type { BoxProps } from './boxTypes';
import type { CircularProgressClasses } from './circularProgressClasses';

export interface CircularProgressPropsColorOverrides {}
export interface CircularProgressPropsVariantOverrides {}
type OverrideUnion<Base extends string, Overrides> = Extract<
  {
    [K in keyof (Omit<Record<Base, true>, keyof Overrides> & Overrides)]: true extends (Omit<
      Record<Base, true>,
      keyof Overrides
    > &
      Overrides)[K]
      ? K
      : never;
  }[keyof (Omit<Record<Base, true>, keyof Overrides> & Overrides)],
  string
>;

/** The outer progress host exposes a native View ref; SVG slots remain internal. */
export interface CircularProgressProps extends Omit<BoxProps, 'children' | 'component'> {
  classes?: Partial<CircularProgressClasses> | undefined;
  color?:
    | OverrideUnion<
        'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit',
        CircularProgressPropsColorOverrides
      >
    | undefined;
  disableShrink?: boolean | undefined;
  enableTrackSlot?: boolean | undefined;
  min?: number | undefined;
  max?: number | undefined;
  size?: number | string | undefined;
  thickness?: number | undefined;
  value?: number | undefined;
  variant?:
    | OverrideUnion<'determinate' | 'indeterminate', CircularProgressPropsVariantOverrides>
    | undefined;
}
