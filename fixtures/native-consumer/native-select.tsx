import React from 'react';
import { View, type ViewInstance } from 'react-native';
import {
  NativeSelect,
  Select,
  TextField,
  nativeSelectClasses,
  getNativeSelectUtilityClasses,
  type NativeSelectProps,
  type NativeSelectInputHandle,
  type NativeSelectChangeEvent,
  type NativeSelectModeProps,
  type TextFieldNativeSelectProps,
  type SelectIconProps,
} from '@mui/material';
import Deep, { type NativeSelectClasses } from '@mui/material/NativeSelect';
import Input, { type NativeSelectInputProps } from '@mui/material/NativeSelect/NativeSelectInput';
import classes, {
  getNativeSelectUtilityClasses as deepHelper,
} from '@mui/material/NativeSelect/nativeSelectClasses';
const root = React.createRef<ViewInstance>(),
  control = React.createRef<NativeSelectInputHandle>();
const nativeProps: NativeSelectProps = {
  defaultValue: ['1'],
  inputProps: { multiple: true },
  inputRef: control,
  onChange(event) {
    const value: string = event.target.value;
    const values = Array.from(event.target.selectedOptions, (option) => option.value);
    event.persist();
    void [value, values, event.nativeEvent.optionId];
  },
};
export const standalone = (
  <NativeSelect {...nativeProps} ref={root}>
    <optgroup label="Numbers">
      <option value={1}>One</option>
      <option value="2">Two</option>
    </optgroup>
  </NativeSelect>
);
export const direct = <Deep {...nativeProps} />;
const mode: NativeSelectModeProps<number> = {
  native: true,
  value: 1,
  inputRef: control,
  onChange: (event) => event.target.value.toUpperCase(),
};
export const nativeMode = (
  <Select<number> {...mode}>
    <option value={1}>One</option>
  </Select>
);
export const inlineIcon = <Select IconComponent={(props) => <View style={props.style} />} />;
export const nativeIcon = <Select native IconComponent={(props) => <View style={props.style} />} />;
const field: TextFieldNativeSelectProps<'outlined'> = {
  select: true,
  variant: 'outlined',
  defaultValue: ['1'],
  slotProps: { select: (owner) => ({ native: true, multiple: true, error: owner.error }) },
  inputRef: control,
  onChange: (event) => Array.from(event.target.selectedOptions, (option) => option.value),
};
export const typedField = <TextField<'outlined'> {...field} />;
export const literalField = (
  <TextField
    select
    defaultValue={['1']}
    slotProps={{ select: { native: true, multiple: true } }}
    inputRef={control}
    onChange={(event) => event.target.selectedOptions.item(0)?.value}
  />
);
export const legacyField = (
  <TextField
    select
    SelectProps={{ native: true }}
    onChange={(event) => event.target.value.toUpperCase()}
  />
);
const all: NativeSelectClasses = classes;
const inner: NativeSelectInputProps = { value: 'a', IconComponent: () => null };
void [
  Input,
  inner,
  all,
  nativeSelectClasses,
  getNativeSelectUtilityClasses('readOnly'),
  deepHelper('disabled'),
];
const event = {} as NativeSelectChangeEvent;
const raw: string = event.target.value;
void raw;
control.current?.focus();
control.current?.blur();
control.current?.selectedOptions.item(0)?.label;
// @ts-expect-error Native values are strings, including the empty value.
const wrong: number = control.current!.value;
// @ts-expect-error Native handles expose a real view node rather than a browser select.
export const browser = <NativeSelect inputRef={React.createRef<HTMLSelectElement>()} />;
const wrongMode: NativeSelectModeProps<string[]> = {
  native: true,
  // @ts-expect-error Original default Select generic refs retain their array values.
  inputRef: React.createRef<import('@mui/material').SelectInputHandle<string[]>>(),
};
void wrongMode;
const icon: React.ComponentType<SelectIconProps> = () => null;
void icon;
