import React from 'react';
import { View, Text, type ViewInstance } from 'react-native';
import {
  Switch,
  NativeCheckedInputSurface,
  type SwitchProps,
  type NativeSwitchSlotProps,
  type NativeCheckedInputHandle,
  type NativeCheckedInputComponentProps,
  type NativeCheckedRootComponentProps,
  type ButtonBaseActions,
  type NativeSwitchChangeEvent,
} from '@mui/material';
import DeepSwitch, { type SwitchPropsSizeOverrides } from '@mui/material/Switch';
import switchClasses, { getSwitchUtilityClass } from '@mui/material/Switch/switchClasses';
declare module '@mui/material/Switch' {
  interface SwitchPropsColorOverrides {
    brand: true;
  }
  interface SwitchPropsSizeOverrides {
    compact: true;
  }
  interface SwitchThumbSlotPropsOverrides {
    tag?: string;
  }
  interface SwitchInputSlotPropsOverrides {
    tag?: string;
  }
}
const base = React.createRef<ViewInstance>(),
  root = React.createRef<ViewInstance>(),
  surface = React.createRef<ViewInstance>(),
  handle = React.createRef<NativeCheckedInputHandle>(),
  action = React.createRef<ButtonBaseActions>();
const Visual = React.forwardRef<ViewInstance, NativeSwitchSlotProps>(function Visual(
  { ownerState, sx, ...props },
  ref,
) {
  void [ownerState?.checked, ownerState?.color, sx];
  return <View {...props} ref={ref} />;
});
const Base = React.forwardRef<ViewInstance, NativeCheckedRootComponentProps>(function Base(
  { ownerState, ...props },
  ref,
) {
  void ownerState;
  return <View {...props} ref={ref} />;
});
const Input = React.forwardRef<ViewInstance, NativeCheckedInputComponentProps>(
  function Input(props, ref) {
    void [props.checked, props.value, props.onChange];
    return <NativeCheckedInputSurface {...props} ref={ref} />;
  },
);
const props: SwitchProps = {
  defaultChecked: true,
  value: 42,
  color: 'brand',
  size: 'compact',
  inputRef: handle,
  action,
  slots: { root: Visual, switchBase: Base, input: Input, thumb: Visual, track: Visual },
  slotProps: {
    root: (owner) => ({ ref: root, sx: { m: 1 }, testID: owner.edge ? 'edge' : 'root' }),
    switchBase: { style: (state) => ({ opacity: state.disabled ? 0.5 : 1 }) },
    input: (owner) => ({
      ref: surface,
      tag: owner.checked ? 'checked' : 'unchecked',
      onChange(event) {
        event.persist();
        event.preventDefault();
        const checked: boolean = event.target.checked;
        const value: string = event.target.value;
        void [checked, value];
      },
    }),
    thumb: (owner) => ({ tag: owner.size, children: <Text>Thumb</Text> }),
  },
  onChange(event, checked) {
    const typed: NativeSwitchChangeEvent = event;
    const value: string = event.target.value;
    void [typed, value, checked];
  },
};
export const switchExample = <Switch {...props} ref={base} />;
export const deep = <DeepSwitch edge="end" checked readOnly aria-label="Sync" />;
handle.current?.focus();
handle.current?.blur();
action.current?.focusVisible();
void [switchClasses, getSwitchUtilityClass('thumb')];
// @ts-expect-error Native checked-input handles are not HTML input elements.
export const browserInput = <Switch inputRef={React.createRef<HTMLInputElement>()} />;
// @ts-expect-error Native switchBase refs are ViewInstance.
export const browserRoot = <Switch ref={React.createRef<HTMLSpanElement>()} />;
// @ts-expect-error Native slot components cannot be HTML tag names.
export const browserSlot = <Switch slots={{ track: 'span' }} />;
