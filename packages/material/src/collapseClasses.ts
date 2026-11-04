const slots = [
  'root',
  'horizontal',
  'vertical',
  'entered',
  'hidden',
  'wrapper',
  'wrapperInner',
] as const;
export type CollapseClassKey = (typeof slots)[number];
export type CollapseClasses = Record<CollapseClassKey, string>;
export function getCollapseUtilityClass(slot: string): string {
  return `${['active', 'checked', 'completed', 'disabled', 'error', 'expanded', 'focused', 'focusVisible', 'open', 'readOnly', 'required', 'selected'].includes(slot) ? 'Mui' : 'MuiCollapse'}-${slot}`;
}
export const collapseClasses = Object.fromEntries(
  slots.map((slot) => [slot, getCollapseUtilityClass(slot)]),
) as CollapseClasses;
