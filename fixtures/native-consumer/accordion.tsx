// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React from 'react';
import { Pressable, View, type PressableProps, type ViewInstance } from 'react-native';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  AccordionActions,
  Button,
  type AccordionOwnerState,
  type AccordionSummaryRootSlotProps,
  type AccordionSummaryTypeMap,
} from '@mui/material';
import DeepAccordion, { type AccordionProps } from '@mui/material/Accordion';
import DeepSummary, {
  type AccordionSummaryProps,
  type AccordionSummaryTypeMap as DeepSummaryTypeMap,
} from '@mui/material/AccordionSummary';
import DeepDetails from '@mui/material/AccordionDetails';
import { createTheme, styled, type ComponentsPropsList } from '@mui/material/styles';
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

const TrackingRoot = React.forwardRef<ViewInstance, PressableProps & { tracking: string }>(
  ({ tracking, ...props }, ref) => <Pressable {...props} nativeID={tracking} ref={ref} />,
);
export const summaryMap: AccordionSummaryTypeMap<{ analytics: boolean }, typeof TrackingRoot> = {
  props: { analytics: true, expandIcon: 'Expand' },
  defaultComponent: TrackingRoot,
};
export const summaryDeepMap: DeepSummaryTypeMap<{ analytics: boolean }, typeof TrackingRoot> =
  summaryMap;
export const trackingProps: AccordionSummaryProps<typeof TrackingRoot> = {
  component: TrackingRoot,
  tracking: 'settings',
};
export const trackedSummary = (
  <DeepSummary component={TrackingRoot} tracking="settings" ref={React.createRef<ViewInstance>()}>
    Settings
  </DeepSummary>
);
export const trackedSummarySpread = <DeepSummary {...trackingProps}>Settings</DeepSummary>;
export const missingTracking = (
  // @ts-expect-error A custom root keeps its required native data.
  <AccordionSummary component={TrackingRoot}>Settings</AccordionSummary>
);
// @ts-expect-error Custom root data requires the associated component.
export const strayTracking = <DeepSummary tracking="settings">Settings</DeepSummary>;
export const customSummaryBrowserRef = (
  // @ts-expect-error The custom root's ref still targets a native view.
  <DeepSummary component={TrackingRoot} tracking="settings" ref={browserRef}>
    Settings
  </DeepSummary>
);

type Destination = { kind: 'account'; username: string } | { kind: 'billing'; invoice: number };
const DestinationRoot = React.forwardRef<ViewInstance, PressableProps & Destination>(
  (props, ref) => {
    const id = props.kind === 'account' ? props.username : String(props.invoice);
    return <Pressable nativeID={id} ref={ref} />;
  },
);
export const destination = (
  <DeepSummary component={DestinationRoot} kind="billing" invoice={42}>
    Billing
  </DeepSummary>
);
export const invalidDestination = (
  // @ts-expect-error The chosen native root branch requires its own data.
  <DeepSummary component={DestinationRoot} kind="billing" username="account">
    Billing
  </DeepSummary>
);
// Keep a browser-only member visible even when the native tsconfig omits lib.dom.
type BrowserSummaryHandle = HTMLDivElement & { innerHTML: string };
const BrowserRoot = React.forwardRef<BrowserSummaryHandle>((props, ref) => (
  <div {...props} ref={ref} />
));
export const invalidRoot = (
  // @ts-expect-error Browser handles cannot back the native Summary root.
  <DeepSummary component={BrowserRoot}>Browser</DeepSummary>
);

const OptionalRoot = React.forwardRef<ViewInstance, PressableProps & { tracking?: string }>(
  ({ tracking, ...props }, ref) => <Pressable {...props} nativeID={tracking} ref={ref} />,
);
const invalidOptionalProps = { component: OptionalRoot, tracking: 123 };
// @ts-expect-error Spreading props cannot bypass the declared native root type.
export const invalidOptional = <DeepSummary {...invalidOptionalProps}>Invalid</DeepSummary>;

export const extractedProps: React.ComponentProps<typeof DeepSummary> = {
  component: View,
  expandIcon: 'Expand',
};
export const summaryDefaults: Partial<ComponentsPropsList['MuiAccordionSummary']> = {
  component: View,
};
export const summaryTheme = createTheme({
  components: { MuiAccordionSummary: { defaultProps: summaryDefaults } },
});
const StyledSummary = styled(DeepSummary)({ opacity: 0.8 });
export const styledSummary = (
  <StyledSummary
    component={View}
    disabled
    expandIcon="Expand"
    ref={React.createRef<ViewInstance>()}
  >
    Settings
  </StyledSummary>
);

export const configuredStyledSummary = (
  <StyledSummary component={OptionalRoot}>Settings</StyledSummary>
);
export const invalidExtractedRoot: React.ComponentProps<typeof DeepSummary> = {
  // @ts-expect-error Extracted defaults must reject declared DOM refs as well.
  component: BrowserRoot,
};

const conditionalTracking =
  Math.random() > 0.5 ? { component: TrackingRoot, tracking: 'settings' } : {};
export const conditionalSummary = <DeepSummary {...conditionalTracking}>Settings</DeepSummary>;
const conditionalMissing = Math.random() > 0.5 ? { component: TrackingRoot } : {};
export const invalidConditionalSummary = (
  // @ts-expect-error The default branch cannot satisfy a custom root missing its required data.
  <DeepSummary {...conditionalMissing}>Settings</DeepSummary>
);

// The declared native host can expose extra imperative methods.
type TrackingHandle = ViewInstance & { reportTracking(): string };
declare const TrackingHandleRoot: React.ForwardRefExoticComponent<
  PressableProps & React.RefAttributes<TrackingHandle>
>;
export const preciseRootRef = (
  <DeepSummary
    component={TrackingHandleRoot}
    ref={(root) => {
      if (root) void root.reportTracking();
    }}
  />
);
