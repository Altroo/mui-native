/* Native contracts adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/svg-icon.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. */
const slots = [
  'root',
  'colorPrimary',
  'colorSecondary',
  'colorAction',
  'colorError',
  'colorDisabled',
  'fontSizeInherit',
  'fontSizeSmall',
  'fontSizeMedium',
  'fontSizeLarge',
] as const;
export type SvgIconClassKey = (typeof slots)[number];
export type SvgIconClasses = Record<SvgIconClassKey, string>;
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
export const getSvgIconUtilityClass = (slot: string): string =>
  `${globalStates.has(slot) ? 'Mui' : 'MuiSvgIcon'}-${slot}`;
export const svgIconClasses = Object.fromEntries(
  slots.map((slot) => [slot, getSvgIconUtilityClass(slot)]),
) as SvgIconClasses;
