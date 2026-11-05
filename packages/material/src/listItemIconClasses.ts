/* Utility vocabulary adapts MIT-licensed Material UI 9.5.0.
 * Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/list-item-icon.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. */
export interface ListItemIconClasses {
  root: string;
  alignItemsFlexStart: string;
}
export type ListItemIconClassKey = keyof ListItemIconClasses;
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
export function getListItemIconUtilityClass(slot: string): string {
  const state = globalStates[slot];
  return state ? `Mui-${state}` : `MuiListItemIcon-${slot}`;
}
export const listItemIconClasses: ListItemIconClasses = {
  root: getListItemIconUtilityClass('root'),
  alignItemsFlexStart: getListItemIconUtilityClass('alignItemsFlexStart'),
};
