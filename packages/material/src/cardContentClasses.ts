/* Classes adapt MIT Material UI 9.5.0. Copyright (c) MUI contributors.
 * See NOTICE and tests/fixtures/mui-card-content-9.5.0.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { unstable_ClassNameGenerator } from './classNameGenerator';
export interface CardContentClasses {
  root: string;
}
export type CardContentClassKey = keyof CardContentClasses;
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
export function getCardContentUtilityClass(slot: string): string {
  const state = globalStates[slot];
  return state
    ? `Mui-${state}`
    : `${unstable_ClassNameGenerator.generate('MuiCardContent')}-${slot}`;
}
// Augmentation widens declarations; it does not add source runtime slots.
export const cardContentClasses = {
  root: getCardContentUtilityClass('root'),
} as CardContentClasses;
