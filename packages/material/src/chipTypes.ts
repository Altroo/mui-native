// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import type React from 'react';
import type { ViewInstance, ViewProps, StyleProp } from 'react-native';
import type { NativePressable } from '@altroo/mui-native-host';
import type { SlotProps, SxProps, NativeStyle } from '@altroo/mui-native-system';
import type { ButtonBaseProps, ButtonBaseRootProps, ButtonBaseActivationEvent } from './buttonBase';
import type { ChipClasses } from './chipClasses';
export interface ChipPropsVariantOverrides {}
export interface ChipPropsSizeOverrides {}
export interface ChipPropsColorOverrides {}
export interface ChipRootSlotPropsOverrides {}
export interface ChipLabelSlotPropsOverrides {}
type OverrideUnion<Base extends string, Overrides> = Extract<
  {
    [K in keyof (Omit<Record<Base, true>, keyof Overrides> & Overrides)]: true extends (Omit<
      Record<Base, true>,
      keyof Overrides
    > &
      Overrides)[K]
      ? K
      : never;
  }[keyof (Omit<Record<Base, true>, keyof Overrides> & Overrides)],
  string
>;
export interface NativeChipRootProps extends ButtonBaseProps {
  ownerState?: ChipOwnerState;
}
export interface NativeChipLabelProps
  extends Omit<ViewProps, 'style'>,
    React.RefAttributes<ViewInstance> {
  style?: StyleProp<NativeStyle>;
  sx?: SxProps;
  ownerState?: ChipOwnerState;
}
export interface ChipSlots {
  root?: React.ComponentType<ButtonBaseRootProps & { ownerState?: ChipOwnerState }>;
  label?: React.ComponentType<NativeChipLabelProps>;
}
export type ChipDeleteEvent =
  | ButtonBaseActivationEvent
  | Parameters<NonNullable<ViewProps['onAccessibilityAction']>>[0];
export interface ChipOwnProps extends Omit<ButtonBaseProps, 'children' | 'component' | 'ref'> {
  children?: null;
  id?: string;
  label?: React.ReactNode;
  avatar?: React.ReactElement;
  icon?: React.ReactElement;
  deleteIcon?: React.ReactElement;
  onDelete?: (event: ChipDeleteEvent) => void;
  clickable?: boolean;
  skipFocusWhenDisabled?: boolean;
  color?: OverrideUnion<
    'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning',
    ChipPropsColorOverrides
  >;
  size?: OverrideUnion<'small' | 'medium', ChipPropsSizeOverrides>;
  variant?: OverrideUnion<'filled' | 'outlined', ChipPropsVariantOverrides>;
  classes?: Partial<ChipClasses>;
  className?: string;
  slots?: ChipSlots;
  slotProps?: {
    root?: SlotProps<NativeChipRootProps & ChipRootSlotPropsOverrides, ChipOwnerState>;
    label?: SlotProps<NativeChipLabelProps & ChipLabelSlotPropsOverrides, ChipOwnerState>;
  };
}
export type ChipProps<
  Root extends React.ComponentType<any> = typeof NativePressable,
  Additional = {},
> = ChipOwnProps &
  Additional &
  Omit<
    React.ComponentPropsWithoutRef<Root>,
    keyof ChipOwnProps | keyof Additional | 'ref' | 'component'
  > & { ref?: React.Ref<ViewInstance> } & (Root extends typeof NativePressable
    ? { component?: Root }
    : { component: Root });
export interface ChipOwnerState
  extends Omit<ChipOwnProps, 'slots' | 'slotProps' | 'onDelete' | 'color' | 'size' | 'variant'> {
  disabled: boolean;
  clickable: boolean | undefined;
  onDelete: boolean;
  color: string;
  size: string;
  variant: string;
  iconColor: string;
  component: React.ElementType;
}
export type ChipSlotsAndSlotProps = Pick<ChipOwnProps, 'slots' | 'slotProps'>;
export interface NativeChipComponent {
  <Root extends React.ComponentType<any>>(
    props: ChipProps<Root> & { component: Root },
  ): React.ReactNode;
  (props: ChipProps): React.ReactNode;
  displayName?: string;
}
