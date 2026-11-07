/* Utility vocabulary adapts MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/divider.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
export interface DividerClasses {
  root: string;
  absolute: string;
  fullWidth: string;
  inset: string;
  middle: string;
  flexItem: string;
  vertical: string;
  withChildren: string;
  textAlignRight: string;
  textAlignLeft: string;
  wrapper: string;
  wrapperVertical: string;
}
export type DividerClassKey = keyof DividerClasses;
const slots = [
  'root',
  'absolute',
  'fullWidth',
  'inset',
  'middle',
  'flexItem',
  'vertical',
  'withChildren',
  'textAlignRight',
  'textAlignLeft',
  'wrapper',
  'wrapperVertical',
] as const;
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
export function getDividerUtilityClass(slot: string): string {
  const state = globalStates[slot];
  return state ? `Mui-${state}` : `MuiDivider-${slot}`;
}
// Augmentation changes the declaration, not the pinned runtime vocabulary.
export const dividerClasses = Object.fromEntries(
  slots.map((slot) => [slot, getDividerUtilityClass(slot)]),
) as Record<(typeof slots)[number], string> as DividerClasses;
