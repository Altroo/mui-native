// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React from 'react';
import { View, type ViewInstance } from 'react-native';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  AccordionActions,
  Button,
  type AccordionOwnerState,
  type AccordionSummaryRootSlotProps,
} from '@mui/material';
import DeepAccordion, { type AccordionProps } from '@mui/material/Accordion';
import DeepSummary from '@mui/material/AccordionSummary';
import DeepDetails from '@mui/material/AccordionDetails';
import DeepActions from '@mui/material/AccordionActions';
import classes, { getAccordionUtilityClass } from '@mui/material/Accordion/accordionClasses';
import summaryClasses from '@mui/material/AccordionSummary/accordionSummaryClasses';
import detailsClasses from '@mui/material/AccordionDetails/accordionDetailsClasses';
import actionsClasses from '@mui/material/AccordionActions/accordionActionsClasses';
export const rootProps: AccordionProps = {
  children: 'Example',
  slotProps: {
    root: (owner: AccordionOwnerState) => ({ testID: owner.expanded ? 'open' : 'closed' }),
    transition: { timeout: 'auto', unmountOnExit: true },
  },
};
export const content = (
  <Accordion
    ref={React.createRef<ViewInstance>()}
    onChange={(event, next) => {
      void event.nativeEvent;
      void next;
    }}
  >
    <AccordionSummary id="settings" aria-controls="settings-body" expandIcon="Expand">
      Settings
    </AccordionSummary>
    <AccordionDetails>Native body</AccordionDetails>
    <AccordionActions disableSpacing>
      <Button>Save</Button>
    </AccordionActions>
  </Accordion>
);
export const deep = (
  <DeepAccordion defaultExpanded>
    <DeepSummary>Details</DeepSummary>
    <DeepDetails>Body</DeepDetails>
    <DeepActions>Done</DeepActions>
  </DeepAccordion>
);
export const slot = React.forwardRef<ViewInstance, AccordionSummaryRootSlotProps>(
  function SummaryRoot({ ownerState, children }, ref) {
    return (
      <View ref={ref} accessibilityState={{ expanded: ownerState?.expanded }}>
        {children}
      </View>
    );
  },
);
export const identifiers: string[] = [
  classes.expanded,
  getAccordionUtilityClass('region'),
  summaryClasses.content,
  detailsClasses.root,
  actionsClasses.spacing,
];
// @ts-expect-error Expansion is a boolean, not a string.
export const badExpanded = <DeepAccordion expanded="yes">Body</DeepAccordion>;
const browserRef = React.createRef<HTMLDivElement>();
// @ts-expect-error Native refs cannot accept browser element refs.
export const badRef = <DeepAccordion ref={browserRef}>Body</DeepAccordion>;
// @ts-expect-error The first-level component requires content.
export const missingChildren = <Accordion />;
