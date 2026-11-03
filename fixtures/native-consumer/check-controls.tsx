import React from 'react';
import { View, Text, type ViewInstance } from 'react-native';
import {
  Checkbox,
  Radio,
  RadioGroup,
  FormGroup,
  FormControlLabel,
  NativeCheckedInputSurface,
  useRadioGroup,
  type NativeCheckedInputHandle,
  type NativeCheckedInputComponentProps,
  type NativeCheckedRootComponentProps,
  type RadioGroupActions,
  type CheckboxProps,
  type RadioProps,
  type FormControlLabelProps,
} from '@mui/material';
import DeepCheckbox from '@mui/material/Checkbox';
import DeepRadio from '@mui/material/Radio';
import DeepGroup, { useRadioGroup as groupHook } from '@mui/material/RadioGroup';
import deepHook from '@mui/material/RadioGroup/useRadioGroup';
import checkboxClasses from '@mui/material/Checkbox/checkboxClasses';
import radioClasses from '@mui/material/Radio/radioClasses';
import groupClasses from '@mui/material/RadioGroup/radioGroupClasses';
import formClasses from '@mui/material/FormGroup/formGroupClasses';
import labelClasses from '@mui/material/FormControlLabel/formControlLabelClasses';
declare module '@mui/material/Checkbox' {
  interface CheckboxPropsColorOverrides {
    brand: true;
  }
  interface CheckboxPropsSizeOverrides {
    compact: true;
  }
  interface CheckboxInputSlotPropsOverrides {
    tag?: string;
  }
}
declare module '@mui/material/Radio' {
  interface RadioPropsColorOverrides {
    brand: true;
  }
  interface RadioInputSlotPropsOverrides {
    tag?: string;
  }
}
const root = React.createRef<ViewInstance>(),
  input = React.createRef<NativeCheckedInputHandle>(),
  surface = React.createRef<ViewInstance>(),
  group = React.createRef<RadioGroupActions>();
const Root = React.forwardRef<ViewInstance, NativeCheckedRootComponentProps>(function Root(
  { ownerState, ...props },
  ref,
) {
  void ownerState;
  return <View {...props} ref={ref} />;
});
const Input = React.forwardRef<ViewInstance, NativeCheckedInputComponentProps>(
  function Input(props, ref) {
    void [props.type, props.value, props.checked, props.onChange];
    return <NativeCheckedInputSurface {...props} ref={ref} />;
  },
);
const checkbox: CheckboxProps = {
  checked: true,
  value: 42,
  color: 'brand',
  size: 'compact',
  inputRef: input,
  icon: <Text>Empty</Text>,
  checkedIcon: <Text>Checked</Text>,
  slots: { root: Root, input: Input },
  slotProps: {
    root: (owner) => ({
      sx: [{ mt: 1 }, (theme) => ({ mb: theme.spacing(owner.checked ? 2 : 1) })],
      style: (state) => ({ opacity: state.focusVisible ? 1 : 0.8 }),
    }),
    input: (owner) => ({
      ref: surface,
      tag: 'check',
      readOnly: false,
      onChange: (event) => {
        const checked: boolean = event.target.checked;
        const value: string = event.target.value;
        event.persist();
        void [checked, value, owner.color, event.nativeEvent];
      },
    }),
  },
  onChange(event, checked) {
    const value: string = event.target.value;
    const target: boolean = event.currentTarget.checked;
    void [checked, value, target];
  },
};
const radio: RadioProps = {
  value: { key: 'one' },
  inputRef: input,
  color: 'brand',
  slotProps: {
    root: { sx: undefined },
    input: (owner) => ({ tag: owner.checked ? 'checked' : 'empty' }),
  },
};
export const controls = (
  <FormGroup row>
    <Checkbox {...checkbox} ref={root} />
    <DeepCheckbox defaultChecked indeterminate slotProps={{ root: { sx: null } }} />
    <DeepRadio sx={null} slotProps={{ root: { sx: () => null } }} />
    <RadioGroup
      actions={group}
      ref={root}
      defaultValue={1}
      onChange={(event, value) => {
        const name: string = event.target.name;
        value.toUpperCase();
        void name;
      }}
    >
      <Radio value={1} />
      <DeepRadio {...radio} />
    </RadioGroup>
  </FormGroup>
);
const label: FormControlLabelProps = {
  control: <Checkbox />,
  label: 'Accept',
  checked: true,
  name: 'accept',
  value: 1,
  required: true,
  labelPlacement: 'start',
  slotProps: { typography: (owner) => ({ testID: owner.required ? 'required' : 'normal' }) },
  onChange: (event, checked) => {
    event.persist();
    event.preventDefault();
    void [event.target.checked, checked];
  },
};
export const labeled = <FormControlLabel {...label} ref={root} />;
function Hooks() {
  const state = useRadioGroup(),
    also = groupHook(),
    deep = deepHook();
  return <Text>{String(state?.value ?? also?.name ?? deep?.name ?? 'none')}</Text>;
}
export const hooks = (
  <DeepGroup>
    <Hooks />
  </DeepGroup>
);
input.current?.focus();
input.current?.blur();
const checked: boolean | undefined = input.current?.checked;
const value: string | undefined = input.current?.value;
group.current?.focus();
void [checked, value, checkboxClasses, radioClasses, groupClasses, formClasses, labelClasses];
// @ts-expect-error Checked input handles are native rather than HTML input refs.
export const browser = <Checkbox inputRef={React.createRef<HTMLInputElement>()} />;
// @ts-expect-error Root refs use native ViewInstance.
export const browserRoot = <Radio ref={React.createRef<HTMLSpanElement>()} />;
// @ts-expect-error Native root slots are components, not HTML tag names.
export const browserSlot = <Checkbox slots={{ root: 'span' }} />;
