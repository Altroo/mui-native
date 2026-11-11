/* Utility identifiers adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/button-base.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { unstable_ClassNameGenerator } from './classNameGenerator';
export interface ButtonBaseClasses {
  root: string;
  disabled: string;
  focusVisible: string;
}
export type ButtonBaseClassKey = keyof ButtonBaseClasses;
// The source uses an ordinary object, including its inherited keys.
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
export function getButtonBaseUtilityClass(slot: string): string {
  const state = globalStates[slot];
  return state
    ? `Mui-${state}`
    : `${unstable_ClassNameGenerator.generate('MuiButtonBase')}-${slot}`;
}
export const buttonBaseClasses: ButtonBaseClasses = {
  root: getButtonBaseUtilityClass('root'),
  disabled: getButtonBaseUtilityClass('disabled'),
  focusVisible: getButtonBaseUtilityClass('focusVisible'),
};
