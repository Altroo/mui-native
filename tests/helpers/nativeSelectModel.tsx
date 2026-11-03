import React from 'react';
import { type ViewInstance } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { Select, TextField, MenuItem, type SelectProps } from '../../packages/material/src';
import { NativeMenuOverlayModel } from './nativeMenuOverlayModel';
import type { ModelItem } from './nativeMenuModel';
export interface SelectOption extends ModelItem {
  value?: unknown;
}
export class NativeSelectModel extends NativeMenuOverlayModel {
  options: SelectOption[];
  props: Partial<SelectProps<any>> = {};
  field = false;
  fieldProps: Record<string, any> = {};
  anchorWidth = 200;
  readonly anchorRef = (node: ViewInstance | null) => {
    if (node) {
      Object.defineProperties(node, {
        offsetWidth: { configurable: true, get: () => this.anchorWidth },
        offsetHeight: { configurable: true, value: 56 },
      });
      node.measureInWindow = ((callback: any) =>
        callback(16, 100, this.anchorWidth, 56)) as ViewInstance['measureInWindow'];
    }
    return this.attach('anchor')(node);
  };
  constructor(
    options: SelectOption[] = [
      { id: 'a', label: 'Alpha', value: 'a' },
      { id: 'b', label: 'Beta', value: 'b' },
    ],
  ) {
    super({ items: options });
    this.options = options;
    this.parents.set('anchor', null);
    this.parents.set('trigger', 'anchor');
  }
  element() {
    const props: any = {
      defaultValue: 'a',
      ...this.props,
      ref: this.anchorRef,
      SelectDisplayProps: {
        testID: 'trigger',
        ref: this.attach('trigger'),
        ...this.props.SelectDisplayProps,
      },
      MenuProps: {
        disablePortal: true,
        ...this.props.MenuProps,
        slots: { root: this.Root, paper: this.Paper, ...this.props.MenuProps?.slots },
        slotProps: {
          ...this.props.MenuProps?.slotProps,
          list: (owner: any) => ({
            testID: 'list',
            ref: this.attach('list'),
            ...(typeof this.props.MenuProps?.slotProps?.list === 'function'
              ? this.props.MenuProps.slotProps.list(owner)
              : this.props.MenuProps?.slotProps?.list),
          }),
        },
      },
    };
    const children = this.options.map((option) => (
      <MenuItem
        key={option.id}
        ref={this.attach(option.id)}
        testID={option.id}
        value={option.value}
        disabled={option.disabled}
        textValue={option.textValue}
        {...this.itemProps}
      >
        {option.label}
      </MenuItem>
    ));
    if (this.field) {
      const { ref, defaultValue, value, ...selectProps } = props;
      const slotProps = this.fieldProps.slotProps ?? {};
      const selectSlot = slotProps.select;
      return (
        <TextField
          select
          label="Choice"
          defaultValue={defaultValue}
          {...(value !== undefined ? { value } : {})}
          {...this.fieldProps}
          slotProps={{
            ...slotProps,
            input: (owner: any) => ({
              ref: this.anchorRef,
              ...(typeof slotProps.input === 'function' ? slotProps.input(owner) : slotProps.input),
            }),
            ...(selectSlot === undefined
              ? {}
              : {
                  select: (owner: any) => ({
                    MenuProps: props.MenuProps,
                    SelectDisplayProps: props.SelectDisplayProps,
                    ...(typeof selectSlot === 'function' ? selectSlot(owner) : selectSlot),
                  }),
                }),
          }}
          SelectProps={{ ...selectProps, ...this.fieldProps.SelectProps }}
        >
          {children}
        </TextField>
      );
    }
    return <Select {...props}>{children}</Select>;
  }
  async press(id = 'trigger') {
    const event = this.event(this.nodes.get(id));
    await act(async () => {
      fireEvent.press(this.tree!.getByTestId(id), event);
    });
    return event;
  }
  async key(key: string, extra: object = {}, target = 'trigger', up = false) {
    const event = this.event(this.nodes.get(target), key, extra);
    await act(async () => {
      this.nodes.get(target).props[up ? 'onMUIKeyUp' : 'onMUIKeyDown']?.(event);
    });
    return event;
  }
  display() {
    return this.tree!.getByTestId('trigger', { includeHiddenElements: true }).props
      .accessibilityValue.text;
  }
}
