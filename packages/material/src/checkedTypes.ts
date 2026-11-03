import type React from 'react';
import type {
  ViewInstance,
  ViewProps,
  NativeSyntheticEvent,
  TargetedEvent,
  StyleProp,
} from 'react-native';
import type { SlotProps, SxProps, NativeStyle } from '@altroo/mui-native-system';
import type {
  ButtonBaseProps,
  ButtonBaseRootProps,
  ButtonBaseActivationEvent,
  ButtonBaseState,
} from './buttonBase';
import type { CheckboxClasses, RadioClasses } from './controlClasses';
export interface NativeCheckedTarget {
  checked: boolean;
  value: string;
  indeterminate: boolean;
  readonly name: string;
  readonly id: string;
  readonly type: 'checkbox' | 'radio';
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly required: boolean;
  readonly node: ViewInstance | null;
}
export interface NativeCheckedInputHandle extends Readonly<NativeCheckedTarget> {
  focus(): void;
  blur(): void;
}
type TargetEvent<Source> = Source extends unknown
  ? Omit<Source, 'target' | 'currentTarget'> & {
      target: NativeCheckedTarget;
      currentTarget: NativeCheckedTarget;
    }
  : never;
export type NativeCheckedChangeEvent = TargetEvent<ButtonBaseActivationEvent>;
export type NativeCheckedFocusEvent = TargetEvent<NativeSyntheticEvent<TargetedEvent>>;
export interface NativeCheckedInputComponentProps extends ButtonBaseRootProps {
  type?: 'checkbox' | 'radio';
  checked?: boolean;
  defaultChecked?: boolean;
  autoFocus?: boolean;
  value?: string;
  name?: string;
  id?: string;
  indeterminate?: boolean;
  readOnly?: boolean;
  required?: boolean;
  ownerState?: object;
  onChange?: (event: NativeCheckedChangeEvent) => void;
}
export interface NativeCheckedInputProps
  extends Omit<
    NativeCheckedInputComponentProps,
    'onClick' | 'onFocus' | 'onBlur' | 'onKeyDown' | 'onKeyUp' | 'style'
  > {
  style?: StyleProp<NativeStyle> | ((state: ButtonBaseState) => StyleProp<NativeStyle>);
  defaultChecked?: boolean;
  autoFocus?: boolean;
  onClick?: (event: NativeCheckedChangeEvent) => void;
  onChange?: (event: NativeCheckedChangeEvent) => void;
  onFocus?: (event: NativeCheckedFocusEvent) => void;
  onBlur?: (event: NativeCheckedFocusEvent) => void;
  onKeyDown?: ButtonBaseProps['onKeyDown'];
  onKeyUp?: ButtonBaseProps['onKeyUp'];
  sx?: SxProps;
}
export interface NativeCheckedRootProps
  extends Omit<
    ButtonBaseProps,
    'onClick' | 'onPress' | 'children' | 'component' | 'onFocus' | 'onBlur'
  > {
  edge?: 'start' | 'end' | false;
  className?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  value?: unknown;
  name?: string;
  id?: string;
  ownerState?: object;
  children?: React.ReactNode;
  onClick?: (event: NativeCheckedChangeEvent) => void;
  onPress?: (event: NativeCheckedChangeEvent) => void;
  onChange?: (event: NativeCheckedChangeEvent, checked: boolean) => void;
  onFocus?: (event: NativeCheckedFocusEvent) => void;
  onBlur?: (event: NativeCheckedFocusEvent) => void;
}
export interface CheckboxPropsSizeOverrides {}
export interface CheckboxPropsColorOverrides {}
export interface CheckboxRootSlotPropsOverrides {}
export interface CheckboxInputSlotPropsOverrides {}
export interface RadioPropsSizeOverrides {}
export interface RadioPropsColorOverrides {}
export interface RadioRootSlotPropsOverrides {}
export interface RadioInputSlotPropsOverrides {}
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
export interface NativeCheckedControlProps
  extends Omit<NativeCheckedRootProps, 'ownerState' | 'children' | 'onChange'> {
  inputRef?: React.Ref<NativeCheckedInputHandle>;
  inputProps?: NativeCheckedInputProps;
  icon?: React.ReactNode;
  checkedIcon?: React.ReactNode;
  disableFocusRipple?: boolean;
  onChange?: (event: NativeCheckedChangeEvent, checked: boolean) => void;
  component?: React.ComponentType<ViewProps & React.RefAttributes<ViewInstance>>;
}
export interface CheckboxOwnerState extends Omit<CheckboxProps, 'slots' | 'slotProps'> {}
export interface RadioOwnerState extends Omit<RadioProps, 'slots' | 'slotProps'> {}
export interface NativeCheckedRootComponentProps extends Omit<ViewProps, 'style'> {
  ref?: React.Ref<ViewInstance>;
  ownerState?: object;
  style?: StyleProp<NativeStyle>;
  children?: React.ReactNode;
}
export interface CheckboxSlots {
  root?: React.ComponentType<NativeCheckedRootComponentProps>;
  input?: React.ComponentType<NativeCheckedInputComponentProps>;
}
export interface RadioSlots extends CheckboxSlots {}
export interface CheckboxSlotsAndSlotProps {
  slots?: CheckboxSlots;
  slotProps?: {
    root?: SlotProps<
      Partial<NativeCheckedRootProps> & CheckboxRootSlotPropsOverrides,
      CheckboxOwnerState
    >;
    input?: SlotProps<
      NativeCheckedInputProps & CheckboxInputSlotPropsOverrides,
      CheckboxOwnerState
    >;
  };
}
export interface RadioSlotsAndSlotProps {
  slots?: RadioSlots;
  slotProps?: {
    root?: SlotProps<
      Partial<NativeCheckedRootProps> & RadioRootSlotPropsOverrides,
      RadioOwnerState
    >;
    input?: SlotProps<NativeCheckedInputProps & RadioInputSlotPropsOverrides, RadioOwnerState>;
  };
}
export interface CheckboxProps extends NativeCheckedControlProps, CheckboxSlotsAndSlotProps {
  classes?: Partial<CheckboxClasses>;
  color?: OverrideUnion<
    'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'default',
    CheckboxPropsColorOverrides
  >;
  size?: OverrideUnion<'small' | 'medium' | 'large', CheckboxPropsSizeOverrides>;
  indeterminate?: boolean;
  indeterminateIcon?: React.ReactNode;
}
export interface RadioProps extends NativeCheckedControlProps, RadioSlotsAndSlotProps {
  classes?: Partial<RadioClasses>;
  color?: OverrideUnion<
    'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'default',
    RadioPropsColorOverrides
  >;
  size?: OverrideUnion<'small' | 'medium', RadioPropsSizeOverrides>;
}
export interface NativeCheckedState {
  checked: boolean;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  indeterminate: boolean;
  value: string;
  name: string;
  id: string;
  node: ViewInstance | null;
}
