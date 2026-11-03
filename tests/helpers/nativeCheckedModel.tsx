import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import {
  Checkbox,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  type NativeCheckedInputHandle,
} from '../../packages/material/src';
import { NativeMenuModel } from './nativeMenuModel';
export class NativeCheckedModel extends NativeMenuModel {
  kind = 'Checkbox';
  props: Record<string, any> = {};
  inputProps: Record<string, any> = {};
  rootProps: Record<string, any> = {};
  labelProps: Record<string, any> = {};
  form: Record<string, any> | undefined;
  options: any[] = [{ id: 'a' }];
  cancel: string | undefined;
  controlChange = true;
  changeTrace: any[] = [];
  handles = new Map<string, NativeCheckedInputHandle>();
  wrapper: (node: React.ReactElement) => React.ReactElement = (node) => node;
  constructor() {
    super({ items: [] });
  }
  control(item: any) {
    const id = item.id,
      isRadio = this.kind === 'Radio' || this.kind === 'group';
    if (!this.parents.has(id)) this.parents.set(id, null);
    const props = {
      ...this.props,
      ...item,
      testID: id,
      inputRef: (handle: NativeCheckedInputHandle | null) => {
        if (handle) this.handles.set(id, handle);
        else this.handles.delete(id);
      },
      slotProps: {
        root: this.rootProps,
        input: {
          ...this.inputProps,
          ref: this.attach(id),
          onClick: (event: any) => {
            this.changeTrace.push({ kind: 'input-click', checked: event.target.checked });
          },
          onChange: (event: any) => {
            this.changeTrace.push({ kind: 'input-change', checked: event.target.checked });
            if (this.cancel === 'input') event.preventDefault();
          },
        },
      },
      onClick: (event: any) => {
        this.changeTrace.push({ kind: 'click', checked: event.target.checked });
        if (this.cancel === 'click') event.preventDefault();
      },
      onChange: this.controlChange
        ? (event: any, checked: boolean) =>
            this.changeTrace.push({
              kind: 'change',
              id,
              checked,
              value: event.target.value,
              name: event.target.name,
              indeterminate: event.target.indeterminate,
            })
        : undefined,
    };
    return isRadio ? <Radio key={id} {...props} /> : <Checkbox key={id} {...props} />;
  }
  element() {
    this.items = this.options.map((item) => ({
      id: item.id,
      label: item.id,
      disabled: item.disabled,
    }));
    let node =
      this.kind === 'group' ? (
        <RadioGroup
          {...this.props}
          onChange={(event, value) =>
            this.changeTrace.push({ kind: 'group', value, name: event.target.name })
          }
        >
          {this.options.map((item) => this.control(item))}
        </RadioGroup>
      ) : this.kind === 'label' ? (
        <FormControlLabel
          label="Label"
          {...this.labelProps}
          onChange={(_event, checked) => this.changeTrace.push({ kind: 'label-change', checked })}
          control={this.control({ id: 'a' })}
        />
      ) : (
        this.control({ id: 'a' })
      );
    if (this.form) node = <FormControl {...this.form}>{node}</FormControl>;
    return this.wrapper(node);
  }
  async press(id = 'a') {
    await act(async () => {
      fireEvent.press(this.tree!.getByTestId(id), this.event(this.nodes.get(id)));
    });
  }
  async label() {
    await act(async () => {
      fireEvent.press(this.tree!.getByText('Label'), this.event(this.nodes.get('a')));
    });
  }
  async nativeKey(id: string, key: string, up = false, extra: object = {}) {
    await act(async () => {
      this.nodes
        .get(id)
        .props[up ? 'onMUIKeyUp' : 'onMUIKeyDown'](this.event(this.nodes.get(id), key, extra));
    });
  }
  controlSnapshot() {
    return this.options.map((item) => {
      const handle = this.handles.get(item.id)!;
      return {
        id: item.id,
        checked: handle.checked,
        indeterminate: handle.indeterminate,
        value: handle.value,
        name: handle.name,
        disabled: handle.disabled,
        required: handle.required,
        readOnly: handle.readOnly,
      };
    });
  }
}
