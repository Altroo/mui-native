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
export type ButtonGroupClassKey = (typeof slots)[number];
export type ButtonGroupClasses = Record<ButtonGroupClassKey, string>;
export function getButtonGroupUtilityClass(slot: string) {
  return slot === 'disabled' ? 'Mui-disabled' : `MuiButtonGroup-${slot}`;
}
export const buttonGroupClasses = Object.fromEntries(
  slots.map((slot) => [slot, getButtonGroupUtilityClass(slot)]),
) as ButtonGroupClasses;
