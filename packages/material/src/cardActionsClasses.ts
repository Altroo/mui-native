/* Utility vocabulary adapts MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/card-actions.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { unstable_ClassNameGenerator } from './classNameGenerator';

export interface CardActionsClasses {
  root: string;
  spacing: string;
}
export type CardActionsClassKey = keyof CardActionsClasses;
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
export function getCardActionsUtilityClass(slot: string): string {
  const state = globalStates[slot];
  return state
    ? `Mui-${state}`
    : `${unstable_ClassNameGenerator.generate('MuiCardActions')}-${slot}`;
}
// Augmentation changes the declaration, not the pinned runtime vocabulary.
export const cardActionsClasses = Object.fromEntries(
  (['root', 'spacing'] as const).map((slot) => [slot, getCardActionsUtilityClass(slot)]),
) as Record<'root' | 'spacing', string> as CardActionsClasses;
