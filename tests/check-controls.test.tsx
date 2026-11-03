import React from 'react';
import { cleanup } from '@testing-library/react-native';
import {
  configureDiagnostics,
  Checkbox,
  type NativeCheckedInputHandle,
} from '../packages/material/src';
import { getNativeFocusedView } from '../packages/native-host/src';
import { clearNativeFocus } from '../packages/native-host/src/nativeFocus';
import { NativeCheckedModel } from './helpers/nativeCheckedModel';
import reference from './fixtures/mui-check-controls-browser-9.5.0.json';
let restore: () => void;
beforeEach(() => {
  restore = configureDiagnostics(() => {});
});
afterEach(() => {
  cleanup();
  clearNativeFocus(getNativeFocusedView());
  jest.restoreAllMocks();
  restore();
});
test.each(reference.fixtures)('original checked control: $input.name', async (fixture) => {
  const input: any = fixture.input,
    model = new NativeCheckedModel();
  model.kind = input.kind;
  model.props = input.props ?? {};
  model.inputProps = input.inputProps ?? {};
  model.labelProps = input.labelProps ?? {};
  model.form = input.form;
  model.cancel = input.cancel;
  model.controlChange = input.controlChange !== false;
  if (input.options) model.options = input.options;
  await model.mount();
  const expected = (state: any) =>
    state.controls.map((control: any) => ({
      id: control.id,
      checked: control.modelChecked,
      indeterminate: control.indeterminate,
      value: control.value,
      name: control.name,
      disabled: control.disabled,
      required: control.required,
      readOnly: control.readOnly,
    }));
  expect(model.controlSnapshot()).toEqual(expected(fixture.states[0]));
  for (const [index, action] of (input.actions ?? []).entries()) {
    if (action.click) await model.press(action.click);
    if (action.label) await model.label();
    expect(model.controlSnapshot()).toEqual(expected(fixture.states[index + 1]));
  }
  expect(model.changeTrace).toEqual(fixture.trace);
});
test('checkbox Space toggles once and Enter does not activate', async () => {
  const model = new NativeCheckedModel();
  await model.mount();
  await model.nativeKey('a', 'Enter');
  expect(model.handles.get('a')!.checked).toBe(false);
  await model.nativeKey('a', ' ');
  expect(model.handles.get('a')!.checked).toBe(false);
  await model.nativeKey('a', ' ', true);
  expect(model.handles.get('a')!.checked).toBe(true);
});
test('radio group moves, wraps and skips disabled native controls', async () => {
  const model = new NativeCheckedModel();
  model.kind = 'group';
  model.props = { defaultValue: 'a', name: 'choice' };
  model.options = [
    { id: 'a', value: 'a' },
    { id: 'b', value: 'b', disabled: true },
    { id: 'c', value: 'c' },
  ];
  await model.mount();
  await model.nativeKey('a', 'ArrowRight');
  expect(model.handles.get('c')!.checked).toBe(true);
  expect(model.current === model.nodes.get('c')).toBe(true);
  await model.nativeKey('c', 'ArrowRight');
  expect(model.handles.get('a')!.checked).toBe(true);
  expect(model.tree!.getByTestId('a').props.nativeTabIndex).toBe(0);
  expect(model.tree!.getByTestId('c').props.nativeTabIndex).toBe(-1);
});
test('controlled proposals are visible through native handles during changeTrace then restored', () => {
  let during = false,
    event: any;
  const handle = React.createRef<NativeCheckedInputHandle>();
  const { render, fireEvent } = require('@testing-library/react-native');
  const tree = render(
    <Checkbox
      inputRef={handle}
      checked={false}
      onChange={(source) => {
        event = source;
        during = handle.current!.checked;
      }}
    />,
  );
  fireEvent.press(tree.getByRole('checkbox'), {
    nativeEvent: { test: 'original' },
    persist: jest.fn(),
  });
  expect(during).toBe(true);
  expect(handle.current!.checked).toBe(false);
  expect(event.nativeEvent).toEqual({ test: 'original' });
  expect(event.target === event.currentTarget).toBe(true);
});

import keyboardReference from './fixtures/mui-check-controls-keyboard-9.5.0.json';
test.each(keyboardReference.fixtures)(
  'original trusted keyboard: $input.name',
  async (fixture: any) => {
    const test = fixture.input,
      model = new NativeCheckedModel();
    model.kind = test.kind;
    model.props =
      test.kind === 'group'
        ? { defaultValue: 'a', name: 'choice', style: { direction: test.rtl ? 'rtl' : 'ltr' } }
        : {};
    if (test.options) model.options = test.options;
    else if (test.kind === 'group')
      model.options = [
        { id: 'a', value: 'a' },
        { id: 'b', value: 'b' },
        { id: 'c', value: 'c' },
      ];
    if (test.cancelSpace)
      model.inputProps = {
        onKeyDown: (event: any) => {
          if (event.key === ' ') event.preventDefault();
        },
      };
    await model.mount();
    const focus = test.focus ?? 'a';
    await require('@testing-library/react-native').act(async () => model.nodes.get(focus).focus());
    const snapshot = () => ({
      active: [...model.nodes].find(([_id, node]) => node === model.current)?.[0] ?? '',
      controls: model
        .controlSnapshot()
        .map(({ id, checked, value, name, disabled }) => ({ id, checked, value, name, disabled })),
      trace: model.changeTrace
        .filter((item) => ['change', 'group'].includes(item.kind))
        .map((item) =>
          item.kind === 'group'
            ? { group: item.value }
            : { id: item.id, checked: item.checked, value: item.value, name: item.name },
        ),
    });
    expect(snapshot()).toEqual(fixture.states[0]);
    for (const [index, key] of test.keys.entries()) {
      const active = [...model.nodes].find(([_id, node]) => node === model.current)![0];
      await model.nativeKey(active, key === 'Space' ? ' ' : key);
      await model.nativeKey(active, key === 'Space' ? ' ' : key, true);
      expect(snapshot()).toEqual(fixture.states[index + 1]);
    }
  },
);

test('checked-control class identifiers match actual original helpers', () => {
  const library = require('../packages/material/src');
  for (const [name, expected] of Object.entries(reference.helpers)) {
    const key = name[0].toLowerCase() + name.slice(1) + 'Classes';
    expect(library[key]).toEqual(expected);
  }
});
