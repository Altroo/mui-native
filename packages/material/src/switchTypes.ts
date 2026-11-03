import type React from 'react';
import type { ViewProps, ViewInstance, StyleProp } from 'react-native';
import type { SlotProps, SxProps, NativeStyle } from '@altroo/mui-native-system';
import type {
  NativeCheckedControlProps,
  NativeCheckedRootProps,
  NativeCheckedRootComponentProps,
  NativeCheckedInputProps,
  NativeCheckedInputComponentProps,
  NativeCheckedChangeEvent,
} from './checkedTypes';
import type { SwitchClasses } from './switchClasses';
export interface SwitchPropsSizeOverrides {}
export interface SwitchPropsColorOverrides {}
export interface SwitchRootSlotPropsOverrides {}
export interface SwitchTrackSlotPropsOverrides {}
export interface SwitchThumbSlotPropsOverrides {}
export interface SwitchSwitchBaseSlotPropsOverrides {}
export interface SwitchInputSlotPropsOverrides {}
type Override<Base extends string, Extra> = Extract<
  {
    [Key in keyof (Omit<Record<Base, true>, keyof Extra> & Extra)]: true extends (Omit<
      Record<Base, true>,
      keyof Extra
    > &
      Extra)[Key]
      ? Key
      : never;
  }[keyof (Omit<Record<Base, true>, keyof Extra> & Extra)],
  string
>;
export interface NativeSwitchSlotProps extends Omit<ViewProps, 'style'> {
  ref?: React.Ref<ViewInstance>;
  style?: StyleProp<NativeStyle>;
  sx?: SxProps;
  ownerState?: SwitchOwnerState;
}
export interface SwitchSlots {
  root?: React.ComponentType<NativeSwitchSlotProps>;
  switchBase?: React.ComponentType<NativeCheckedRootComponentProps>;
  input?: React.ComponentType<NativeCheckedInputComponentProps>;
  thumb?: React.ComponentType<NativeSwitchSlotProps>;
  track?: React.ComponentType<NativeSwitchSlotProps>;
}
export interface SwitchOwnerState extends Omit<SwitchProps, 'slots' | 'slotProps'> {}
export interface SwitchSlotsAndSlotProps {
  slots?: SwitchSlots;
  slotProps?: {
    root?: SlotProps<NativeSwitchSlotProps & SwitchRootSlotPropsOverrides, SwitchOwnerState>;
    switchBase?: SlotProps<
      Partial<NativeCheckedRootProps> & SwitchSwitchBaseSlotPropsOverrides,
      SwitchOwnerState
    >;
    input?: SlotProps<NativeCheckedInputProps & SwitchInputSlotPropsOverrides, SwitchOwnerState>;
    thumb?: SlotProps<NativeSwitchSlotProps & SwitchThumbSlotPropsOverrides, SwitchOwnerState>;
    track?: SlotProps<NativeSwitchSlotProps & SwitchTrackSlotPropsOverrides, SwitchOwnerState>;
  };
}
export interface SwitchProps extends NativeCheckedControlProps, SwitchSlotsAndSlotProps {
  color?: Override<
    'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'default',
    SwitchPropsColorOverrides
  >;
  size?: Override<'small' | 'medium', SwitchPropsSizeOverrides>;
  classes?: Partial<SwitchClasses>;
}
export type NativeSwitchChangeEvent = NativeCheckedChangeEvent;
