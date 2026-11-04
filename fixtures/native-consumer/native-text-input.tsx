import React from 'react';
import type { TextInputInstance } from 'react-native';
import { NativeTextInput, type NativeTextInputProps } from '@altroo/mui-native-host';
import { TextField } from '@mui/material';

const editor = React.createRef<TextInputInstance>();
const props: NativeTextInputProps = {
  multiline: true,
  value: 'Native draft',
  selection: { start: 0, end: 6 },
  onChangeText: (value) => value.toUpperCase(),
  onKeyDown: (event) => {
    const source: 'hardware' | 'command' | 'input' | undefined = event.nativeEvent.muiKeySource;
    return source;
  },
};
export const nativeEditor = <NativeTextInput {...props} ref={editor} />;
export const nativeSlot = <TextField slots={{ htmlInput: NativeTextInput }} inputRef={editor} />;
// @ts-expect-error HTML mutation does not belong to a native editor.
export const rejectedDomEditor = <NativeTextInput dangerouslySetInnerHTML={{ __html: 'text' }} />;
