import React from 'react';
import { View, type ViewInstance } from 'react-native';
import {
  Select as RootSelect,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  OutlinedInput,
} from '@mui/material';
import Select, {
  type SelectProps,
  type SelectChangeEvent,
  type SelectInputHandle,
  type SelectOwnerState,
  type SelectMenuProps,
  type SelectDisplayProps,
  type SelectVariants,
  type SelectClasses,
  selectClasses,
  getSelectUtilityClasses,
} from '@mui/material/Select';
import classes, { type SelectClassKey } from '@mui/material/Select/selectClasses';
import SelectInput, { type SelectInputProps } from '@mui/material/Select/SelectInput';
import type {
  TextFieldProps,
  TextFieldSelectProps,
  NativeTextFieldProps,
} from '@mui/material/TextField';
const root = React.createRef<ViewInstance>(),
  input = React.createRef<SelectInputHandle<string[]>>();
const options = [
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
];
const menu: SelectMenuProps = {
  slotProps: {
    paper: (owner: SelectOwnerState) => ({ style: { minWidth: owner.open ? 240 : 160 } }),
    list: (owner) => ({ dense: owner.multiple, role: 'listbox' }),
  },
};
const display: SelectDisplayProps = { accessibilityHint: 'Choose statuses' };
const props: SelectProps<string[]> = {
  multiple: true,
  defaultValue: [],
  name: 'statuses',
  MenuProps: menu,
  SelectDisplayProps: display,
  inputRef: input,
  renderValue: (value) => value.join(', '),
  onChange: (event: SelectChangeEvent<string[]>, child) => {
    const values: string[] = event.target.value;
    event.preventDefault();
    void [values, child, event.nativeEvent];
  },
};
export const many = (
  <FormControl>
    <InputLabel id="status-label" htmlFor="status">
      Statuses
    </InputLabel>
    <Select {...props} ref={root} id="status" labelId="status-label" label="Statuses">
      {options.map((option) => (
        <MenuItem key={option.id} value={option.id}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);
export const object = (
  <RootSelect
    value={options[0]}
    renderValue={(value) => value.label}
    onChange={(event) => event.target.value.id}
    input={<OutlinedInput label="Status" />}
  >
    {options.map((option) => (
      <MenuItem key={option.id} value={option}>
        {option.label}
      </MenuItem>
    ))}
  </RootSelect>
);
const fieldProps: TextFieldProps<'outlined', string[]> = {
  select: true,
  defaultValue: [],
  SelectProps: { multiple: true },
};
const specific: TextFieldSelectProps<string[]> = {
  select: true,
  defaultValue: [],
  inputRef: input,
  onChange: (event) => event.target.value.join(','),
};
export const fields = (
  <>
    <TextField {...fieldProps}>
      {options.map((option) => (
        <MenuItem key={option.id} value={option.id}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
    <TextField {...specific}>
      {options.map((option) => (
        <MenuItem key={option.id} value={option.id}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  </>
);
export function dynamic(select: boolean) {
  return <TextField select={select} value="draft" />;
}
const textProps: NativeTextFieldProps = {
  defaultValue: 'Text',
  onChange: (event) => event.target.value.toUpperCase(),
};
export const text = <TextField {...textProps} />;
const direct: SelectInputProps<string> = {
  value: 'draft',
  onChange: (event) => event.target.value.toUpperCase(),
};
void [SelectInput, direct];
const variant: SelectVariants = 'outlined',
  key: SelectClassKey = 'select';
const all: SelectClasses = classes;
export const identifiers = [
  all[key],
  selectClasses[key],
  getSelectUtilityClasses('focusVisible'),
  variant,
];
export function focus() {
  root.current?.measureInWindow(() => {});
  input.current?.focus();
  input.current?.blur();
  const value = input.current?.value;
  return Array.isArray(value) ? value.join(',') : value;
}
// @ts-expect-error Native view refs do not expose an HTML select element.
export const browser = <Select ref={React.createRef<HTMLSelectElement>()} />;
// @ts-expect-error Platform picker mode remains explicitly unsupported.
export const picker = <Select native />;
// @ts-expect-error Native select handles expose the generic value, not DOM selection APIs.
input.current?.selectedIndex;
// @ts-expect-error Generic value is checked through the handler contract.
export const wrong = <Select<string[]> value={12} />;
void View;

const annotated: TextFieldProps = {
  defaultValue: 12,
  onChange: (event) => event.target.value.toUpperCase(),
};
export const annotatedText = <TextField {...annotated} />;

const variantField: TextFieldProps<'outlined'> = {
  variant: 'outlined',
  onChange: (event) => event.target.value.toUpperCase(),
};
export const originalVariantGeneric = <TextField<'outlined'> {...variantField} />;
// @ts-expect-error Raw imperative values may be undefined before initialization.
input.current?.value.join(',');

const numeric = React.createRef<SelectInputHandle<number>>();
export const emptyNumeric = <Select<number> value="" inputRef={numeric} />;
// @ts-expect-error The valid empty sentinel must be narrowed before using numeric methods.
numeric.current?.value?.toFixed();
const numericValue = numeric.current?.value;
if (typeof numericValue === 'number') numericValue.toFixed();
