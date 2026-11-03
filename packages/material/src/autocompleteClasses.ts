/* Class metadata adapts MIT-licensed Material UI 9.5.0 Autocomplete.
 * Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/reuse.json.
 * Native adaptation copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
export interface AutocompleteClasses {
  root: string;
  expanded: string;
  fullWidth: string;
  focused: string;
  focusVisible: string;
  tag: string;
  tagSizeSmall: string;
  tagSizeMedium: string;
  hasPopupIcon: string;
  hasClearIcon: string;
  inputRoot: string;
  input: string;
  inputFocused: string;
  endAdornment: string;
  clearIndicator: string;
  popupIndicator: string;
  popupIndicatorOpen: string;
  popper: string;
  popperDisablePortal: string;
  paper: string;
  listbox: string;
  loading: string;
  noOptions: string;
  status: string;
  option: string;
  groupLabel: string;
  groupUl: string;
}
export type AutocompleteClassKey = keyof AutocompleteClasses;
const globals = new Set([
  'active',
  'checked',
  'completed',
  'disabled',
  'error',
  'expanded',
  'focused',
  'focusVisible',
  'open',
  'readOnly',
  'required',
  'selected',
]);
export const getAutocompleteUtilityClass = (slot: string) =>
  `${globals.has(slot) ? 'Mui' : 'MuiAutocomplete'}-${slot}`;
export const autocompleteClasses = Object.fromEntries(
  [
    'root',
    'expanded',
    'fullWidth',
    'focused',
    'focusVisible',
    'tag',
    'tagSizeSmall',
    'tagSizeMedium',
    'hasPopupIcon',
    'hasClearIcon',
    'inputRoot',
    'input',
    'inputFocused',
    'endAdornment',
    'clearIndicator',
    'popupIndicator',
    'popupIndicatorOpen',
    'popper',
    'popperDisablePortal',
    'paper',
    'listbox',
    'loading',
    'noOptions',
    'status',
    'option',
    'groupLabel',
    'groupUl',
  ].map((slot) => [slot, getAutocompleteUtilityClass(slot)]),
) as unknown as AutocompleteClasses;
