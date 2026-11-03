import React, { forwardRef } from 'react';
import { View, TextInput, type ViewInstance, type TextInputInstance } from 'react-native';
import InputBase, {
  type InputBaseComponentProps,
  type InputBaseOwnerState,
} from '@mui/material/InputBase';
import Input from '@mui/material/Input';
import OutlinedInput from '@mui/material/OutlinedInput';
import FilledInput from '@mui/material/FilledInput';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl, { useFormControl } from '@mui/material/FormControl';
const inputRef = React.createRef<TextInputInstance>();
const rootRef = React.createRef<ViewInstance>();
const Host = forwardRef<
  TextInputInstance,
  InputBaseComponentProps & { ownerState?: InputBaseOwnerState }
>(({ ownerState, sx, ...props }, ref) => <TextInput {...props} ref={ref} />);
function State() {
  const state = useFormControl();
  return <View testID={state?.focused ? 'focused' : 'idle'} />;
}
export const basic = (
  <InputBase
    ref={rootRef}
    inputRef={inputRef}
    inputComponent={Host}
    aria-label="Notes"
    multiline
    rows="3"
    inputProps={{ autoCapitalize: 'sentences' }}
  />
);
export const composed = (
  <FormControl variant="outlined" color="secondary" size="small">
    <OutlinedInput
      label="Amount"
      inputRef={inputRef}
      startAdornment={<InputAdornment position="start">$</InputAdornment>}
      endAdornment={<InputAdornment position="end">USD</InputAdornment>}
      slots={{ input: Host }}
      slotProps={{ notchedOutline: (state) => ({ notched: state.focused, testID: 'outline' }) }}
    />
    <State />
  </FormControl>
);
export const variants = (
  <>
    <Input disableUnderline />
    <FilledInput hiddenLabel disableUnderline />
  </>
);
// @ts-expect-error Native editable refs cannot point to a View.
export const wrong = <InputBase inputRef={rootRef} />;
// @ts-expect-error Native inputs do not accept browser tag names.
export const html = <InputBase inputComponent="input" />;
// @ts-expect-error Outline input does not have an underline toggle.
export const underline = <OutlinedInput disableUnderline />;

declare module '@mui/material/InputBase' {
  interface InputBasePropsSizeOverrides {
    compact: true;
  }
  interface InputBasePropsColorOverrides {
    brand: true;
  }
}
export const augmented = <Input size="compact" color="brand" />;
