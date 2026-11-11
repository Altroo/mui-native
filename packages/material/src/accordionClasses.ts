/* Utility vocabulary adapts MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/accordion.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { unstable_ClassNameGenerator } from './classNameGenerator';

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
// Match the source's ordinary object lookup, including inherited keys.
const stateNames = Object.fromEntries([...globalStates].map((state) => [state, state]));
const utility = (name: string, slot: string) => {
  const state = stateNames[slot];
  return state ? 'Mui-' + state : unstable_ClassNameGenerator.generate(name) + '-' + slot;
};
export interface AccordionClasses {
  root: string;
  heading: string;
  rounded: string;
  expanded: string;
  disabled: string;
  gutters: string;
  region: string;
}
export type AccordionClassKey = keyof AccordionClasses;
export interface AccordionSummaryClasses {
  root: string;
  expanded: string;
  focusVisible: string;
  disabled: string;
  gutters: string;
  content: string;
  expandIconWrapper: string;
}
export type AccordionSummaryClassKey = keyof AccordionSummaryClasses;
export interface AccordionDetailsClasses {
  root: string;
}
export type AccordionDetailsClassKey = keyof AccordionDetailsClasses;
export interface AccordionActionsClasses {
  root: string;
  spacing: string;
}
export type AccordionActionsClassKey = keyof AccordionActionsClasses;
export const getAccordionUtilityClass = (slot: string): string => utility('MuiAccordion', slot);
export const getAccordionSummaryUtilityClass = (slot: string): string =>
  utility('MuiAccordionSummary', slot);
export const getAccordionDetailsUtilityClass = (slot: string): string =>
  utility('MuiAccordionDetails', slot);
export const getAccordionActionsUtilityClass = (slot: string): string =>
  utility('MuiAccordionActions', slot);
export const accordionClasses: AccordionClasses = {
  root: getAccordionUtilityClass('root'),
  heading: getAccordionUtilityClass('heading'),
  rounded: getAccordionUtilityClass('rounded'),
  expanded: getAccordionUtilityClass('expanded'),
  disabled: getAccordionUtilityClass('disabled'),
  gutters: getAccordionUtilityClass('gutters'),
  region: getAccordionUtilityClass('region'),
};
export const accordionSummaryClasses: AccordionSummaryClasses = {
  root: getAccordionSummaryUtilityClass('root'),
  expanded: getAccordionSummaryUtilityClass('expanded'),
  focusVisible: getAccordionSummaryUtilityClass('focusVisible'),
  disabled: getAccordionSummaryUtilityClass('disabled'),
  gutters: getAccordionSummaryUtilityClass('gutters'),
  content: getAccordionSummaryUtilityClass('content'),
  expandIconWrapper: getAccordionSummaryUtilityClass('expandIconWrapper'),
};
export const accordionDetailsClasses = {
  root: getAccordionDetailsUtilityClass('root'),
} as AccordionDetailsClasses;
export const accordionActionsClasses = {
  root: getAccordionActionsUtilityClass('root'),
  spacing: getAccordionActionsUtilityClass('spacing'),
} as AccordionActionsClasses;
