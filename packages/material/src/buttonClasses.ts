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
export function getButtonUtilityClass(slot: string) {
  return globalStates.has(slot) ? `Mui-${slot}` : `MuiButton-${slot}`;
}
export function getIconButtonUtilityClass(slot: string) {
  return globalStates.has(slot) ? `Mui-${slot}` : `MuiIconButton-${slot}`;
}
const buttonSlots = [
  'root',
  'text',
  'outlined',
  'contained',
  'disableElevation',
  'focusVisible',
  'disabled',
  'colorInherit',
  'colorPrimary',
  'colorSecondary',
  'colorSuccess',
  'colorError',
  'colorInfo',
  'colorWarning',
  'sizeMedium',
  'sizeSmall',
  'sizeLarge',
  'fullWidth',
  'startIcon',
  'endIcon',
  'icon',
  'loading',
  'loadingWrapper',
  'loadingIconPlaceholder',
  'loadingIndicator',
  'loadingPositionCenter',
  'loadingPositionStart',
  'loadingPositionEnd',
] as const;
const iconSlots = [
  'root',
  'disabled',
  'colorInherit',
  'colorPrimary',
  'colorSecondary',
  'colorError',
  'colorInfo',
  'colorSuccess',
  'colorWarning',
  'edgeStart',
  'edgeEnd',
  'sizeSmall',
  'sizeMedium',
  'sizeLarge',
  'loading',
  'loadingIndicator',
  'loadingWrapper',
] as const;
export type ButtonClassKey = (typeof buttonSlots)[number];
export type ButtonClasses = Record<ButtonClassKey, string>;
export type IconButtonClassKey = (typeof iconSlots)[number];
export type IconButtonClasses = Record<IconButtonClassKey, string>;
export const buttonClasses = Object.fromEntries(
  buttonSlots.map((slot) => [slot, getButtonUtilityClass(slot)]),
) as ButtonClasses;
export const iconButtonClasses = Object.fromEntries(
  iconSlots.map((slot) => [slot, getIconButtonUtilityClass(slot)]),
) as IconButtonClasses;
