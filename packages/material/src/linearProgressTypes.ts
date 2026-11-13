/* LinearProgress props adapt MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/linear-progress.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import type { BoxProps } from './boxTypes';
import type { LinearProgressClasses } from './linearProgressClasses';

export interface LinearProgressPropsColorOverrides {}
export interface LinearProgressPropsVariantOverrides {}
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

/** The outer progress host exposes a native View ref; generated bars remain internal. */
export interface LinearProgressProps extends Omit<BoxProps, 'children' | 'component'> {
  classes?: Partial<LinearProgressClasses> | undefined;
  color?:
    | OverrideUnion<
        'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit',
        LinearProgressPropsColorOverrides
      >
    | undefined;
  min?: number | undefined;
  max?: number | undefined;
  value?: number | undefined;
  valueBuffer?: number | undefined;
  variant?:
    | OverrideUnion<
        'determinate' | 'indeterminate' | 'buffer' | 'query',
        LinearProgressPropsVariantOverrides
      >
    | undefined;
}
