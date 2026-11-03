import React from 'react';
import { type ViewInstance } from 'react-native';
import {
  NativePicker,
  type NativePickerProps,
  type NativePickerOption,
  type NativePickerSelection,
  type NativePickerDismissReason,
} from '@altroo/mui-native-host';
const anchor = React.createRef<ViewInstance>();
const options: readonly NativePickerOption[] = [
  { id: 'one', label: 'One', groupId: 'g', groupLabel: 'Numbers', enabled: true, selected: false },
];
const props: NativePickerProps = {
  open: true,
  options,
  multiple: true,
  colorScheme: 'dark',
  onSelection(event) {
    const value: NativePickerSelection = event.nativeEvent;
    event.persist();
    void value.optionId;
  },
  onDismiss(event) {
    const reason: NativePickerDismissReason = event.nativeEvent.reason;
    void reason;
  },
};
export const picker = <NativePicker {...props} ref={anchor} />;
// @ts-expect-error A native picker anchor is not an HTML select ref.
export const browser = <NativePicker {...props} ref={React.createRef<HTMLSelectElement>()} />;
// @ts-expect-error Options are configuration, not rendered native children.
export const children = <NativePicker {...props}>One</NativePicker>;
