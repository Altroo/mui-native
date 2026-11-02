import React, { forwardRef } from 'react';
import { TextInput, type ViewInstance, type TextInputInstance } from 'react-native';
import TextField, {
  NativeTextFieldInput,
  type TextFieldInputSlotProps,
} from '@mui/material/TextField';
import { useForkRef, setRef } from '@mui/material/utils';
const Input = forwardRef<ViewInstance, TextFieldInputSlotProps>((props, ref) => (
  <NativeTextFieldInput {...props} ref={ref} />
));
const root = React.createRef<ViewInstance>();
const input = React.createRef<TextInputInstance>();
const example = (
  <TextField
    ref={root}
    inputRef={input}
    label="Customer"
    slots={{ input: Input, htmlInput: TextInput }}
    slotProps={{
      root: (state) => ({ sx: { mt: state.error ? 2 : 1 }, ref: root }),
      input: { sx: { mb: 1 }, inputRef: input },
      htmlInput: { ref: input, autoCapitalize: 'words' },
      inputLabel: { ref: React.createRef() },
      formHelperText: { ref: React.createRef() },
    }}
  />
);
function RefProbe() {
  const combined = useForkRef(input, (instance: TextInputInstance | null) => {
    instance?.focus();
    return () => {
      /* Release application resources. */
    };
  });
  return <TextInput ref={combined} />;
}
// @ts-expect-error Editable input refs must target a TextInput, not a View.
const invalid = <TextField slotProps={{ htmlInput: { ref: root } }} />;
// @ts-expect-error DOM tag names are not native slot components.
const html = <TextField slots={{ htmlInput: 'input' }} />;
setRef(input, null);
