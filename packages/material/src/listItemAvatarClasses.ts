/* Utility vocabulary adapts MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/list-item-avatar.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { unstable_ClassNameGenerator } from './classNameGenerator';

export interface ListItemAvatarClasses {
  root: string;
  alignItemsFlexStart: string;
}
export type ListItemAvatarClassKey = keyof ListItemAvatarClasses;
// Preserve the source lookup semantics, including inherited Object keys.
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
export function getListItemAvatarUtilityClass(slot: string): string {
  const state = globalStates[slot];
  return state
    ? `Mui-${state}`
    : `${unstable_ClassNameGenerator.generate('MuiListItemAvatar')}-${slot}`;
}
export const listItemAvatarClasses: ListItemAvatarClasses = {
  root: getListItemAvatarUtilityClass('root'),
  alignItemsFlexStart: getListItemAvatarUtilityClass('alignItemsFlexStart'),
};
