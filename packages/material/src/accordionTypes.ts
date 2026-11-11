/* Public contracts adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/accordion.json.
 * Native contracts: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import type React from 'react';
import type { ViewInstance, ViewProps } from 'react-native';
import type { SxProps, SlotProps } from '@altroo/mui-native-system';
import type { PaperProps, BoxProps } from './layout';
import type { CollapseProps } from './collapse';
import type { ButtonBaseProps, ButtonBaseActivationEvent } from './buttonBase';
import type {
  AccordionClasses,
  AccordionSummaryClasses,
  AccordionDetailsClasses,
  AccordionActionsClasses,
} from './accordionClasses';

export interface NativeAccordionSlotProps<Owner = AccordionOwnerState>
  extends Omit<BoxProps, 'component'>,
    React.RefAttributes<ViewInstance> {
  component?: React.ComponentType<any>;
  as?: React.ComponentType<any>;
  ownerState?: Owner;
}
export interface AccordionRootSlotPropsOverrides {}
export interface AccordionHeadingSlotPropsOverrides {}
export interface AccordionTransitionSlotPropsOverrides {}
export interface AccordionRegionSlotPropsOverrides {}
export interface AccordionRootSlotProps
  extends Omit<PaperProps, 'component'>,
    React.RefAttributes<ViewInstance> {
  component?: React.ComponentType<any>;
  as?: React.ComponentType<any>;
  ownerState?: AccordionOwnerState;
}
export interface AccordionSlots {
  root?: React.ComponentType<AccordionRootSlotProps>;
  heading?: React.ComponentType<NativeAccordionSlotProps>;
  transition?: React.ComponentType<CollapseProps & { ownerState?: AccordionOwnerState }>;
  region?: React.ComponentType<NativeAccordionSlotProps>;
}
export interface AccordionSlotsAndSlotProps {
  slots?: AccordionSlots;
  slotProps?: {
    root?: SlotProps<AccordionRootSlotProps & AccordionRootSlotPropsOverrides, AccordionOwnerState>;
    heading?: SlotProps<
      NativeAccordionSlotProps & AccordionHeadingSlotPropsOverrides,
      AccordionOwnerState
    >;
    transition?: SlotProps<
      CollapseProps & AccordionTransitionSlotPropsOverrides,
      AccordionOwnerState
    >;
    region?: SlotProps<
      NativeAccordionSlotProps & AccordionRegionSlotPropsOverrides,
      AccordionOwnerState
    >;
  };
}
export interface AccordionOwnProps extends AccordionSlotsAndSlotProps {
  children: NonNullable<React.ReactNode>;
  classes?: Partial<AccordionClasses> | undefined;
  className?: string | undefined;
  defaultExpanded?: boolean | undefined;
  disabled?: boolean | undefined;
  disableGutters?: boolean | undefined;
  expanded?: boolean | undefined;
  onChange?: ((event: ButtonBaseActivationEvent, expanded: boolean) => void) | undefined;
}
export interface AccordionProps
  extends Omit<PaperProps, 'children' | 'onChange' | 'component' | 'classes'>,
    AccordionOwnProps {
  component?: React.ComponentType<any>;
}
export interface AccordionOwnerState extends AccordionProps {
  expanded: boolean;
  disabled: boolean;
  disableGutters: boolean;
}
export interface AccordionSummaryRootSlotPropsOverrides {}
export interface AccordionSummaryContentSlotPropsOverrides {}
export interface AccordionSummaryExpandIconWrapperSlotPropsOverrides {}
export interface AccordionSummaryRootSlotProps extends Omit<ButtonBaseProps, 'children'> {
  className?: string | undefined;
  focusVisibleClassName?: string | undefined;
  children?: React.ReactNode;
  ownerState?: AccordionSummaryOwnerState;
  as?: React.ComponentType<any>;
}
export interface AccordionSummarySlots {
  root?: React.ComponentType<AccordionSummaryRootSlotProps>;
  content?: React.ComponentType<NativeAccordionSlotProps<AccordionSummaryOwnerState>>;
  expandIconWrapper?: React.ComponentType<NativeAccordionSlotProps<AccordionSummaryOwnerState>>;
}
export interface AccordionSummarySlotsAndSlotProps {
  slots?: AccordionSummarySlots;
  slotProps?: {
    root?: SlotProps<
      AccordionSummaryRootSlotProps & AccordionSummaryRootSlotPropsOverrides,
      AccordionSummaryOwnerState
    >;
    content?: SlotProps<
      NativeAccordionSlotProps<AccordionSummaryOwnerState> &
        AccordionSummaryContentSlotPropsOverrides,
      AccordionSummaryOwnerState
    >;
    expandIconWrapper?: SlotProps<
      NativeAccordionSlotProps<AccordionSummaryOwnerState> &
        AccordionSummaryExpandIconWrapperSlotPropsOverrides,
      AccordionSummaryOwnerState
    >;
  };
}
export interface AccordionSummaryOwnProps extends AccordionSummarySlotsAndSlotProps {
  classes?: Partial<AccordionSummaryClasses> | undefined;
  className?: string | undefined;
  focusVisibleClassName?: string | undefined;
  expandIcon?: React.ReactNode;
  'aria-controls'?: string | undefined;
}
export interface AccordionSummaryProps
  extends Omit<ButtonBaseProps, 'children' | 'classes'>,
    AccordionSummaryOwnProps {
  children?: React.ReactNode;
}
export interface AccordionSummaryOwnerState
  extends Omit<AccordionSummaryProps, 'slots' | 'slotProps'> {
  expanded?: boolean | undefined;
  disabled: boolean;
  disableGutters?: boolean | undefined;
}
export interface AccordionDetailsProps extends Omit<BoxProps, 'sx' | 'component'> {
  classes?: Partial<AccordionDetailsClasses> | undefined;
  className?: string | undefined;
  sx?: SxProps | undefined;
  component?:
    | React.ComponentType<
        ViewProps & { className?: string | undefined } & React.RefAttributes<ViewInstance>
      >
    | undefined;
}
export interface AccordionActionsProps extends Omit<BoxProps, 'component'> {
  component?: React.ComponentType<any> | undefined;
  classes?: Partial<AccordionActionsClasses> | undefined;
  className?: string | undefined;
  disableSpacing?: boolean | undefined;
}
