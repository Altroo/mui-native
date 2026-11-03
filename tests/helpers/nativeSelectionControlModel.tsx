import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import {
  NativeSelect,
  Select,
  TextField,
  type NativeSelectInputHandle,
} from '../../packages/material/src';
import { NativeMenuModel } from './nativeMenuModel';
export class NativeSelectionControlModel extends NativeMenuModel {
  kind: 'standalone' | 'select' | 'field' = 'standalone';
  props: Record<string, any> = {};
  fieldProps: Record<string, any> = {};
  options: React.ReactNode = (
    <>
      <option value="a">Alpha</option>
      <option value="b">Beta</option>
    </>
  );
  handle: NativeSelectInputHandle | null = null;
  wrapper: (node: React.ReactElement) => React.ReactElement = (node) => node;
  handleRef = (handle: NativeSelectInputHandle | null) => {
    this.handle = handle;
    if (handle?.node) return this.attach('trigger')(handle.node);
  };
  constructor() {
    super({ items: [] });
    this.parents.set('trigger', null);
  }
  element() {
    const props = {
      inputRef: this.handleRef,
      nativePickerProps: { testID: 'native-picker' },
      ...this.props,
      inputProps: { testID: 'trigger', ...this.props.inputProps },
    };
    const element =
      this.kind === 'standalone' ? (
        <NativeSelect {...props}>{this.options}</NativeSelect>
      ) : this.kind === 'select' ? (
        <Select native {...props}>
          {this.options}
        </Select>
      ) : (
        <TextField
          select
          label="Choice"
          inputRef={this.handleRef}
          {...this.fieldProps}
          SelectProps={{ native: true, ...props, ...this.fieldProps.SelectProps }}
        >
          {this.options}
        </TextField>
      );
    return this.wrapper(element);
  }
  native() {
    return this.tree!.getByTestId('native-picker', { includeHiddenElements: true }).props;
  }
  async press() {
    await act(async () => {
      fireEvent.press(
        this.tree!.getByTestId('trigger', { includeHiddenElements: true }),
        this.event(this.nodes.get('trigger')),
      );
    });
  }
  async key(key: string, extra: any = {}) {
    await act(async () =>
      this.nodes
        .get('trigger')
        .props.onMUIKeyDown(this.event(this.nodes.get('trigger'), key, extra)),
    );
  }
  async choose(value: string, selected = true) {
    const host = this.native();
    const option = host.options.find((option: any) => JSON.parse(option.id)[1] === value);
    const source = this.event(101);
    source.nativeEvent = {
      sessionId: host.sessionId,
      revision: host.revision,
      optionId: option.id,
      selected,
    };
    await act(async () => host.onPickerSelection(source));
    return source;
  }
  async dismiss(reason = 'cancel') {
    const host = this.native(),
      source = this.event(101);
    source.nativeEvent = { sessionId: host.sessionId, reason };
    await act(async () => host.onPickerDismiss(source));
  }
  async phase(state: 'presented' | 'dismissed', terminal = false, reason = '') {
    const host = this.native(),
      source = this.event(101);
    source.nativeEvent = { sessionId: host.sessionId, state, terminal, reason };
    await act(async () => {
      host.onPickerPresentation(source);
      await Promise.resolve();
    });
  }
}
