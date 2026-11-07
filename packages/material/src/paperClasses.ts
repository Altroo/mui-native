/* Utility vocabulary adapts MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/paper.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
export interface PaperClasses {
  root: string;
  rounded: string;
  outlined: string;
  elevation: string;
  elevation0: string;
  elevation1: string;
  elevation2: string;
  elevation3: string;
  elevation4: string;
  elevation5: string;
  elevation6: string;
  elevation7: string;
  elevation8: string;
  elevation9: string;
  elevation10: string;
  elevation11: string;
  elevation12: string;
  elevation13: string;
  elevation14: string;
  elevation15: string;
  elevation16: string;
  elevation17: string;
  elevation18: string;
  elevation19: string;
  elevation20: string;
  elevation21: string;
  elevation22: string;
  elevation23: string;
  elevation24: string;
}
export type PaperClassKey = keyof PaperClasses;
const slots = [
  'root',
  'rounded',
  'outlined',
  'elevation',
  'elevation0',
  'elevation1',
  'elevation2',
  'elevation3',
  'elevation4',
  'elevation5',
  'elevation6',
  'elevation7',
  'elevation8',
  'elevation9',
  'elevation10',
  'elevation11',
  'elevation12',
  'elevation13',
  'elevation14',
  'elevation15',
  'elevation16',
  'elevation17',
  'elevation18',
  'elevation19',
  'elevation20',
  'elevation21',
  'elevation22',
  'elevation23',
  'elevation24',
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
export function getPaperUtilityClass(slot: string): string {
  const state = globalStates[slot];
  return state ? `Mui-${state}` : `MuiPaper-${slot}`;
}
// Augmentation changes the declaration, not the pinned runtime vocabulary.
export const paperClasses = Object.fromEntries(
  slots.map((slot) => [slot, getPaperUtilityClass(slot)]),
) as Record<(typeof slots)[number], string> as PaperClasses;
