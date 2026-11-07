/* Classes adapt MIT Material UI 9.5.0. Copyright (c) MUI contributors.
 * See NOTICE and upstream/card.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { unstable_ClassNameGenerator } from './classNameGenerator';
export interface CardClasses {
  root: string;
}
export type CardClassKey = keyof CardClasses;
// Source utility lookup includes inherited keys on its ordinary state object.
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
export function getCardUtilityClass(slot: string): string {
  const state = globalStates[slot];
  return state ? `Mui-${state}` : `${unstable_ClassNameGenerator.generate('MuiCard')}-${slot}`;
}
// Augmentation widens declarations; it does not add source runtime slots.
export const cardClasses = { root: getCardUtilityClass('root') } as CardClasses;
