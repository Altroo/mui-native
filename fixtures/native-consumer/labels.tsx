import React from 'react';
import { type TextInstance } from 'react-native';
import FormControl, { useFormControl } from '@mui/material/FormControl';
import FormLabel, { type FormLabelProps } from '@mui/material/FormLabel';
import InputLabel, { type InputLabelProps } from '@mui/material/InputLabel';
import FormHelperText, { type FormHelperTextProps } from '@mui/material/FormHelperText';
import { OutlinedInput, TextField } from '@mui/material';
const label = React.createRef<TextInstance>();
const form = (
  <FormControl component="fieldset" margin="dense" variant="outlined">
    <FormLabel component="legend">Customer</FormLabel>
    <InputLabel htmlFor="name" shrink disableAnimation ref={label}>
      Name
    </InputLabel>
    <OutlinedInput id="name" aria-describedby="help" />
    <FormHelperText id="help" variant="outlined" error={false}>
      Required for invoices.
    </FormHelperText>
  </FormControl>
);
const field = (
  <TextField
    label="Name"
    labelDisplay="floating"
    slots={{ input: OutlinedInput }}
    slotProps={{
      inputLabel: (state) => ({ shrink: state.focused || Boolean(state.value), required: false }),
      input: { endAdornment: 'EUR' },
    }}
  />
);
const stacked = <TextField label="Name" labelDisplay="stacked" />;
function State() {
  const state = useFormControl();
  return <FormLabel focused={state?.focused} />;
}
const a: FormLabelProps = {
  error: false,
  disabled: false,
  filled: true,
  required: false,
  color: 'secondary',
};
const b: InputLabelProps = { shrink: true, variant: 'filled', margin: 'dense', size: 'small' };
const c: FormHelperTextProps = { variant: 'standard', error: false, focused: true };
// @ts-expect-error Helper variant denotes the control, not typography.
const typography = <FormHelperText variant="caption" />;
// @ts-expect-error Browser label refs are not native text refs.
const wrongRef = <InputLabel ref={React.createRef<HTMLLabelElement>()} />;

declare module '@mui/material/InputLabel' {
  interface InputLabelPropsSizeOverrides {
    compact: true;
  }
}
declare module '@mui/material/FormHelperText' {
  interface FormHelperTextPropsVariantOverrides {
    denseMessage: true;
  }
}
declare module '@mui/material/FormLabel' {
  interface FormLabelPropsColorOverrides {
    brand: true;
  }
}
const customLabel = <InputLabel size="compact" color="brand" />;
const customHelper = <FormHelperText variant="denseMessage">Hint</FormHelperText>;
