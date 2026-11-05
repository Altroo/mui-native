/* Utility vocabulary adapts MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/button-group.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. */
const slots = [
  'root',
  'contained',
  'outlined',
  'text',
  'disableElevation',
  'disabled',
  'firstButton',
  'fullWidth',
  'horizontal',
  'vertical',
  'colorPrimary',
  'colorSecondary',
  'grouped',
  'lastButton',
  'middleButton',
] as const;
export interface ButtonGroupClasses {
  root: string;
  contained: string;
  outlined: string;
  text: string;
  disableElevation: string;
  disabled: string;
  firstButton: string;
  fullWidth: string;
  horizontal: string;
  vertical: string;
  colorPrimary: string;
  colorSecondary: string;
  grouped: string;
  lastButton: string;
  middleButton: string;
}
export type ButtonGroupClassKey = keyof ButtonGroupClasses;
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
export function getButtonGroupUtilityClass(slot: string) {
  return globalStates.has(slot) ? `Mui-${slot}` : `MuiButtonGroup-${slot}`;
}
// Declaration merging extends the public type, while this runtime vocabulary
// remains the pinned source slots.
export const buttonGroupClasses = Object.fromEntries(
  slots.map((slot) => [slot, getButtonGroupUtilityClass(slot)]),
) as Record<(typeof slots)[number], string> as ButtonGroupClasses;
