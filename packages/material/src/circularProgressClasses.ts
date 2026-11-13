/* Utility vocabulary adapts MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/circular-progress.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { unstable_ClassNameGenerator } from './classNameGenerator';

export interface CircularProgressClasses {
  root: string;
  determinate: string;
  indeterminate: string;
  colorPrimary: string;
  colorSecondary: string;
  svg: string;
  track: string;
  circle: string;
  circleDisableShrink: string;
}
export type CircularProgressClassKey = keyof CircularProgressClasses;
// The pinned utility reads an ordinary object, including inherited keys.
const globalStates: Record<string, unknown> = {
  active: 'active',
  checked: 'checked',
  completed: 'completed',
  disabled: 'disabled',
  error: 'error',
  expanded: 'expanded',
  focused: 'focused',
  focusVisible: 'focusVisible',
  open: 'open',
  readOnly: 'readOnly',
  required: 'required',
  selected: 'selected',
};
export function getCircularProgressUtilityClass(slot: string): string {
  const state = globalStates[slot];
  return state
    ? `Mui-${state}`
    : `${unstable_ClassNameGenerator.generate('MuiCircularProgress')}-${slot}`;
}
// Augmentation changes declarations, not the pinned rendered slot vocabulary.
const slots = [
  'root',
  'determinate',
  'indeterminate',
  'colorPrimary',
  'colorSecondary',
  'svg',
  'track',
  'circle',
  'circleDisableShrink',
] as const;
export const circularProgressClasses = Object.fromEntries(
  slots.map((slot) => [slot, getCircularProgressUtilityClass(slot)]),
) as Record<(typeof slots)[number], string> as CircularProgressClasses;
