import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import {
  Switch,
  FormControlLabel,
  FormControl,
  ThemeProvider,
  createTheme,
  type NativeCheckedInputHandle,
} from '../../packages/material/src';
import { NativeMenuModel } from './nativeMenuModel';
export class NativeSwitchModel extends NativeMenuModel {
  test: any = {};
  changeTrace: any[] = [];
  handle: NativeCheckedInputHandle | null = null;
  wrapper: (node: React.ReactElement) => React.ReactElement = (node) => node;
  constructor() {
    super({ items: [{ id: 'a', label: 'a' }] });
    this.parents.set('a', null);
  }
  element() {
    const test = this.test;
    const control = (
      <Switch
        {...test.props}
        testID="a"
        inputRef={(handle) => {
          this.handle = handle;
        }}
        slotProps={{
          switchBase: {
            ...test.base,
            testID: 'base',
            onChange: (event) =>
              this.changeTrace.push({ kind: 'base-change', checked: event.target.checked }),
          },
          thumb: { testID: 'thumb' },
          track: { testID: 'track' },
          root: { testID: 'root', ...test.root },
          input: {
            ...test.input,
            ref: this.attach('a'),
            onClick: (event) => {
              this.changeTrace.push({ kind: 'input-click', checked: event.target.checked });
              if (test.stop) event.stopPropagation();
            },
            onChange: (event) => {
              this.changeTrace.push({ kind: 'input-change', checked: event.target.checked });
              if (test.cancel === 'input') event.preventDefault();
              if (test.mutate) event.target.checked = false;
            },
          },
        }}
        onClick={(event) => {
          this.changeTrace.push({ kind: 'click', checked: event.target.checked });
          if (test.cancel === 'root') event.preventDefault();
        }}
        onChange={(event, checked) =>
          this.changeTrace.push({
            kind: 'change',
            checked,
            value: event.target.value,
            name: event.target.name,
          })
        }
      />
    );
    let body = test.label ? (
      <FormControlLabel {...test.labelProps} label="Label" control={control} />
    ) : (
      control
    );
    if (test.form) body = <FormControl {...test.form}>{body}</FormControl>;
    return this.wrapper(
      <ThemeProvider
        theme={createTheme({
          palette: { mode: test.mode ?? 'light' },
          motion: { reducedMotion: 'always' },
          components: { MuiSwitch: { styleOverrides: test.overrides } },
        })}
      >
        {body}
      </ThemeProvider>,
    );
  }
  async press() {
    await act(async () =>
      fireEvent.press(this.tree!.getByTestId('a'), this.event(this.nodes.get('a'))),
    );
  }
  async label() {
    await act(async () =>
      fireEvent.press(this.tree!.getByText('Label'), this.event(this.nodes.get('a'))),
    );
  }
  async nativeKey(key: string, up = false, extra: object = {}) {
    await act(async () =>
      this.nodes
        .get('a')
        .props[up ? 'onMUIKeyUp' : 'onMUIKeyDown'](this.event(this.nodes.get('a'), key, extra)),
    );
  }
}
