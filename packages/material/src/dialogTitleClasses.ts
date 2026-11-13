/* Utility vocabulary adapts MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/dialog-title.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { unstable_ClassNameGenerator } from './classNameGenerator';

export interface DialogTitleClasses {
  root: string;
}
export type DialogTitleClassKey = keyof DialogTitleClasses;
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
export function getDialogTitleUtilityClass(slot: string): string {
  const state = globalStates[slot];
  return state
    ? `Mui-${state}`
    : `${unstable_ClassNameGenerator.generate('MuiDialogTitle')}-${slot}`;
}
// Augmentation changes the declaration, not the pinned runtime vocabulary.
export const dialogTitleClasses = Object.fromEntries(
  (['root'] as const).map((slot) => [slot, getDialogTitleUtilityClass(slot)]),
) as Record<'root', string> as DialogTitleClasses;
