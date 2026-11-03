const slots = [
  'root',
  'sizeSmall',
  'sizeMedium',
  'colorDefault',
  'colorError',
  'colorInfo',
  'colorPrimary',
  'colorSecondary',
  'colorSuccess',
  'colorWarning',
  'disabled',
  'clickable',
  'deletable',
  'outlined',
  'filled',
  'avatar',
  'icon',
  'label',
  'deleteIcon',
  'focusVisible',
] as const;
export type ChipClassKey = (typeof slots)[number];
export type ChipClasses = Record<ChipClassKey, string>;
export function getChipUtilityClass(slot: string): string {
  return `${['active', 'checked', 'completed', 'disabled', 'error', 'expanded', 'focused', 'focusVisible', 'open', 'readOnly', 'required', 'selected'].includes(slot) ? 'Mui' : 'MuiChip'}-${slot}`;
}
export const chipClasses = Object.fromEntries(
  slots.map((slot) => [slot, getChipUtilityClass(slot)]),
) as ChipClasses;
