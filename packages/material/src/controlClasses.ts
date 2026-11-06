// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Utility identifiers adapt MIT Material UI 9.5.0; see NOTICE and upstream/reuse.json.
const globalStates = new Set([
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
const utility = (name: string, slot: string) =>
  globalStates.has(slot) ? `Mui-${slot}` : `${name}-${slot}`;
export const getCheckboxUtilityClass = (slot: string) => utility('MuiCheckbox', slot);
export const getRadioUtilityClass = (slot: string) => utility('MuiRadio', slot);
export const getRadioGroupUtilityClass = (slot: string) => utility('MuiRadioGroup', slot);
// The pinned utility uses ordinary object lookup, including inherited keys.
const formGroupGlobalStates = Object.fromEntries([...globalStates].map((state) => [state, state]));
export const getFormGroupUtilityClass = (slot: string) => {
  const global = formGroupGlobalStates[slot];
  return global ? `Mui-${global}` : `MuiFormGroup-${slot}`;
};
export const getFormControlLabelUtilityClasses = (slot: string) =>
  utility('MuiFormControlLabel', slot);
const checkbox = [
  'root',
  'checked',
  'disabled',
  'indeterminate',
  'colorPrimary',
  'colorSecondary',
  'sizeSmall',
  'sizeMedium',
] as const;
const radio = [
  'root',
  'checked',
  'disabled',
  'colorPrimary',
  'colorSecondary',
  'sizeSmall',
] as const;
const group = ['root', 'row', 'error'] as const;
const label = [
  'root',
  'labelPlacementStart',
  'labelPlacementEnd',
  'labelPlacementTop',
  'labelPlacementBottom',
  'disabled',
  'label',
  'error',
  'required',
  'asterisk',
] as const;
export type CheckboxClassKey = (typeof checkbox)[number];
export type CheckboxClasses = Record<CheckboxClassKey, string>;
export type RadioClassKey = (typeof radio)[number];
export type RadioClasses = Record<RadioClassKey, string>;
export type RadioGroupClassKey = (typeof group)[number];
export type RadioGroupClasses = Record<RadioGroupClassKey, string>;
// Keep the public class map open to canonical component-module augmentation.
export interface FormGroupClasses {
  root: string;
  row: string;
  error: string;
}
export type FormGroupClassKey = keyof FormGroupClasses;
export type FormControlLabelClassKey = (typeof label)[number];
export type FormControlLabelClasses = Record<FormControlLabelClassKey, string>;
export const checkboxClasses = Object.fromEntries(
  checkbox.map((key) => [key, getCheckboxUtilityClass(key)]),
) as CheckboxClasses;
export const radioClasses = Object.fromEntries(
  radio.map((key) => [key, getRadioUtilityClass(key)]),
) as RadioClasses;
export const radioGroupClasses = Object.fromEntries(
  group.map((key) => [key, getRadioGroupUtilityClass(key)]),
) as RadioGroupClasses;
export const formGroupClasses = {
  root: getFormGroupUtilityClass('root'),
  row: getFormGroupUtilityClass('row'),
  error: getFormGroupUtilityClass('error'),
} as FormGroupClasses;
export const formControlLabelClasses = Object.fromEntries(
  label.map((key) => [key, getFormControlLabelUtilityClasses(key)]),
) as FormControlLabelClasses;
