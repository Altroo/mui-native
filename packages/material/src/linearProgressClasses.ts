/* Utility vocabulary adapts MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/linear-progress.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { unstable_ClassNameGenerator } from './classNameGenerator';

export interface LinearProgressClasses {
  root: string;
  colorPrimary: string;
  colorSecondary: string;
  determinate: string;
  indeterminate: string;
  buffer: string;
  query: string;
  dashed: string;
  bar: string;
  bar1: string;
  bar2: string;
}
export type LinearProgressClassKey = keyof LinearProgressClasses;
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
export function getLinearProgressUtilityClass(slot: string): string {
  const state = globalStates[slot];
  return state
    ? `Mui-${state}`
    : `${unstable_ClassNameGenerator.generate('MuiLinearProgress')}-${slot}`;
}
// Augmentation changes declarations, not the pinned rendered slot vocabulary.
const slots = [
  'root',
  'colorPrimary',
  'colorSecondary',
  'determinate',
  'indeterminate',
  'buffer',
  'query',
  'dashed',
  'bar',
  'bar1',
  'bar2',
] as const;
export const linearProgressClasses = Object.fromEntries(
  slots.map((slot) => [slot, getLinearProgressUtilityClass(slot)]),
) as Record<(typeof slots)[number], string> as LinearProgressClasses;
