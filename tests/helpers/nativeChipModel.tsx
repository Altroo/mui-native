import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { Chip, ThemeProvider, createTheme } from '../../packages/material/src';
import { NativeMenuModel } from './nativeMenuModel';
export class NativeChipModel extends NativeMenuModel {
  props: Record<string, any> = {};
  wrapper: (node: React.ReactElement) => React.ReactElement = (node) => node;
  owner: Record<string, any> = {};
  constructor() {
    super({ items: [] });
    this.parents.set('chip', null);
  }
  element() {
    return this.wrapper(
      <Chip label="Choice" {...this.props} ref={this.attach('chip')} testID="chip" />,
    );
  }
  async pressDelete() {
    await act(async () =>
      fireEvent.press(
        this.tree!.getByTestId('chip-delete', { includeHiddenElements: true }),
        this.event(this.nodes.get('chip')),
      ),
    );
  }
  async pressChip() {
    await act(async () =>
      fireEvent.press(this.tree!.getByTestId('chip'), this.event(this.nodes.get('chip'))),
    );
  }
  async key(key: string, up = false, extra: object = {}) {
    await act(async () =>
      this.nodes
        .get('chip')
        .props[up ? 'onMUIKeyUp' : 'onMUIKeyDown'](this.event(this.nodes.get('chip'), key, extra)),
    );
  }
}
