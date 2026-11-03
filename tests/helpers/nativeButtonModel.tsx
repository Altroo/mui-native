import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { Button, IconButton } from '../../packages/material/src';
import { NativeMenuModel } from './nativeMenuModel';
export class NativeButtonModel extends NativeMenuModel {
  kind: 'Button' | 'IconButton' = 'Button';
  props: Record<string, any> = {};
  children: React.ReactNode = 'Action';
  wrapper: (node: React.ReactElement) => React.ReactElement = (node) => node;
  constructor() {
    super({ items: [] });
    this.parents.set('trigger', null);
  }
  element() {
    const props = { ref: this.attach('trigger'), testID: 'trigger', ...this.props };
    return this.wrapper(
      this.kind === 'Button' ? (
        <Button {...props}>{this.children}</Button>
      ) : (
        <IconButton {...props}>{this.children}</IconButton>
      ),
    );
  }
  native() {
    return this.tree!.getByTestId('trigger', { includeHiddenElements: true }).props;
  }
  async nativeKey(key: string, up = false, extra: object = {}) {
    await act(async () => {
      this.nodes
        .get('trigger')
        .props[
          up ? 'onMUIKeyUp' : 'onMUIKeyDown'
        ](this.event(this.nodes.get('trigger'), key, extra));
    });
  }
  async press() {
    await act(async () => {
      fireEvent.press(this.tree!.getByTestId('trigger'), this.event(this.nodes.get('trigger')));
    });
  }
}
