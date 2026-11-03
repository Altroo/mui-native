export interface SwitchClasses {
  root: string;
  edgeStart: string;
  edgeEnd: string;
  switchBase: string;
  colorPrimary: string;
  colorSecondary: string;
  sizeSmall: string;
  sizeMedium: string;
  checked: string;
  disabled: string;
  input: string;
  thumb: string;
  track: string;
}
export type SwitchClassKey = keyof SwitchClasses;
const global = new Set([
  'active',
  'checked',
  'completed',
  'disabled',
  'error',
  'expanded',
  'focused',
  'focusVisible',
  'required',
  'selected',
  'readOnly',
  'loading',
]);
export function getSwitchUtilityClass(slot: string) {
  return global.has(slot) ? `Mui-${slot}` : `MuiSwitch-${slot}`;
}
export const switchClasses = Object.fromEntries(
  [
    'root',
    'edgeStart',
    'edgeEnd',
    'switchBase',
    'colorPrimary',
    'colorSecondary',
    'sizeSmall',
    'sizeMedium',
    'checked',
    'disabled',
    'input',
    'thumb',
    'track',
  ].map((slot) => [slot, getSwitchUtilityClass(slot)]),
) as unknown as SwitchClasses;
