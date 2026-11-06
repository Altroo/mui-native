/* Utility vocabulary adapts MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/accordion.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
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
const utility = (name: string, slot: string) => `${globalStates.has(slot) ? 'Mui' : name}-${slot}`;
const accordionSlots = [
  'root',
  'heading',
  'rounded',
  'expanded',
  'disabled',
  'gutters',
  'region',
] as const;
const summarySlots = [
  'root',
  'expanded',
  'focusVisible',
  'disabled',
  'gutters',
  'content',
  'expandIconWrapper',
] as const;
const actionsSlots = ['root', 'spacing'] as const;
export type AccordionClassKey = (typeof accordionSlots)[number];
export type AccordionClasses = Record<AccordionClassKey, string>;
export type AccordionSummaryClassKey = (typeof summarySlots)[number];
export type AccordionSummaryClasses = Record<AccordionSummaryClassKey, string>;
export interface AccordionDetailsClasses {
  root: string;
}
export type AccordionDetailsClassKey = keyof AccordionDetailsClasses;
export type AccordionActionsClassKey = (typeof actionsSlots)[number];
export type AccordionActionsClasses = Record<AccordionActionsClassKey, string>;
export const getAccordionUtilityClass = (slot: string): string => utility('MuiAccordion', slot);
export const getAccordionSummaryUtilityClass = (slot: string): string =>
  utility('MuiAccordionSummary', slot);
// The source helper reads an ordinary object, including inherited keys.
const detailsGlobalStates = Object.fromEntries([...globalStates].map((state) => [state, state]));
export const getAccordionDetailsUtilityClass = (slot: string): string => {
  const state = detailsGlobalStates[slot];
  return state ? `Mui-${state}` : `MuiAccordionDetails-${slot}`;
};
export const getAccordionActionsUtilityClass = (slot: string): string =>
  utility('MuiAccordionActions', slot);
export const accordionClasses = Object.fromEntries(
  accordionSlots.map((slot) => [slot, getAccordionUtilityClass(slot)]),
) as AccordionClasses;
export const accordionSummaryClasses = Object.fromEntries(
  summarySlots.map((slot) => [slot, getAccordionSummaryUtilityClass(slot)]),
) as AccordionSummaryClasses;
export const accordionDetailsClasses = {
  root: getAccordionDetailsUtilityClass('root'),
} as AccordionDetailsClasses;
export const accordionActionsClasses = Object.fromEntries(
  actionsSlots.map((slot) => [slot, getAccordionActionsUtilityClass(slot)]),
) as AccordionActionsClasses;
