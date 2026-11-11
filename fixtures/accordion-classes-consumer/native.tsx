// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import Accordion, {
  type AccordionProps,
  type AccordionClasses,
  type AccordionClassKey,
} from '@mui/material/Accordion';
import Summary, {
  type AccordionSummaryProps,
  type AccordionSummaryClasses,
  type AccordionSummaryClassKey,
} from '@mui/material/AccordionSummary';
import { Accordion as RootAccordion, AccordionSummary as RootSummary } from '@mui/material';
import nativeClasses, {
  getAccordionUtilityClass,
} from '@altroo/mui-native/Accordion/accordionClasses';
import nativeSummaryClasses, {
  getAccordionSummaryUtilityClass,
} from '@altroo/mui-native/AccordionSummary/accordionSummaryClasses';

declare module '@mui/material/Accordion' {
  interface AccordionClasses {
    contributorSlot?: string | undefined;
  }
}
declare module '@mui/material/AccordionSummary' {
  interface AccordionSummaryClasses {
    contributorSlot?: string | undefined;
  }
}
export const panelKey: AccordionClassKey = 'contributorSlot';
export const summaryKey: AccordionSummaryClassKey = 'contributorSlot';
export const panelClasses: Partial<AccordionClasses> = { contributorSlot: 'custom-panel' };
export const summaryClasses: Partial<AccordionSummaryClasses> = {
  contributorSlot: 'custom-summary',
};
export const nativePanelClassMap: AccordionClasses = nativeClasses;
export const nativeSummaryClassMap: AccordionSummaryClasses = nativeSummaryClasses;
export const panelAlias: typeof Accordion = RootAccordion;
export const summaryAlias: typeof Summary = RootSummary;
export const classHelpers: [(slot: string) => string, (slot: string) => string] = [
  getAccordionUtilityClass,
  getAccordionSummaryUtilityClass,
];
export const panelOptions: AccordionProps = {
  children: 'Body',
  defaultExpanded: undefined,
  disabled: undefined,
  disableGutters: undefined,
  expanded: undefined,
  onChange: undefined,
  classes: undefined,
  className: undefined,
};
export const summaryOptions: AccordionSummaryProps = {
  classes: undefined,
  className: undefined,
  focusVisibleClassName: undefined,
};
export const sample = (
  <Accordion classes={panelClasses}>
    <Summary classes={summaryClasses}>Summary</Summary>Body
  </Accordion>
);
// @ts-expect-error A class key cannot accept a numeric declaration.
export const invalidClass: Partial<AccordionClasses> = { root: 1 };
// @ts-expect-error Class helper slots are strings.
export const invalidSlot = getAccordionSummaryUtilityClass(1);
