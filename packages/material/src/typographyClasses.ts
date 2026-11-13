/* Utility vocabulary adapts MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/typography-contract.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { unstable_ClassNameGenerator } from './classNameGenerator';

export interface TypographyClasses {
  root: string;
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  h5: string;
  h6: string;
  subtitle1: string;
  subtitle2: string;
  body1: string;
  body2: string;
  inherit: string;
  button: string;
  caption: string;
  overline: string;
  alignLeft: string;
  alignRight: string;
  alignCenter: string;
  alignJustify: string;
  noWrap: string;
  gutterBottom: string;
}
export type TypographyClassKey = keyof TypographyClasses;
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
export function getTypographyUtilityClass(slot: string): string {
  const state = globalStates[slot];
  return state
    ? `Mui-${state}`
    : `${unstable_ClassNameGenerator.generate('MuiTypography')}-${slot}`;
}
export const typographyClasses: TypographyClasses = {
  root: getTypographyUtilityClass('root'),
  h1: getTypographyUtilityClass('h1'),
  h2: getTypographyUtilityClass('h2'),
  h3: getTypographyUtilityClass('h3'),
  h4: getTypographyUtilityClass('h4'),
  h5: getTypographyUtilityClass('h5'),
  h6: getTypographyUtilityClass('h6'),
  subtitle1: getTypographyUtilityClass('subtitle1'),
  subtitle2: getTypographyUtilityClass('subtitle2'),
  body1: getTypographyUtilityClass('body1'),
  body2: getTypographyUtilityClass('body2'),
  inherit: getTypographyUtilityClass('inherit'),
  button: getTypographyUtilityClass('button'),
  caption: getTypographyUtilityClass('caption'),
  overline: getTypographyUtilityClass('overline'),
  alignLeft: getTypographyUtilityClass('alignLeft'),
  alignRight: getTypographyUtilityClass('alignRight'),
  alignCenter: getTypographyUtilityClass('alignCenter'),
  alignJustify: getTypographyUtilityClass('alignJustify'),
  noWrap: getTypographyUtilityClass('noWrap'),
  gutterBottom: getTypographyUtilityClass('gutterBottom'),
};
