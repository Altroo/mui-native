// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import * as RN from 'react-native';
import { FormGroupEditorExample } from '../apps/native-catalog/FormGroupEditorExample';
const controls = [
  'stock-native',
  'stock-field',
  'custom-native',
  'custom-field',
  'styled-native',
  'styled-field',
];
beforeEach(() =>
  jest
    .spyOn(RN, 'findNodeHandle')
    .mockImplementation((node) => (typeof node === 'number' ? node : undefined)),
);
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
const receipt = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('form-group-editor-receipt').props.accessibilityLabel);
function key() {
  let prevented = false,
    stopped = false;
  return {
    target: 41,
    currentTarget: 11,
    nativeEvent: { target: 41, key: 'ArrowDown', code: 'ArrowDown', muiKeySource: 'hardware' },
    preventDefault: () => {
      prevented = true;
    },
    stopPropagation: () => {
      stopped = true;
    },
    isDefaultPrevented: () => prevented,
    isPropagationStopped: () => stopped,
  };
}
test('readiness requires all native groups, command owners and editors without fabricated input', () => {
  const tree = render(<FormGroupEditorExample />);
  expect(receipt(tree)).toMatchObject({
    ready: false,
    total: 0,
    entries: [],
    focused: null,
    values: {},
    submissions: {},
  });
  for (const control of controls)
    for (const suffix of ['', '-owner', '-input'])
      fireEvent(tree.getByTestId('form-group-editor-' + control + suffix), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 44 } },
      });
  for (const id of ['baseline', 'baseline-input'])
    fireEvent(tree.getByTestId('form-group-editor-' + id), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 44 } },
    });
  expect(receipt(tree)).toMatchObject({ ready: true, total: 0, focused: null });
});
test('original editable event and payload identities survive capture, editor, owner and bubble recording', () => {
  const tree = render(<FormGroupEditorExample />),
    root = tree.getByTestId('form-group-editor-stock-native'),
    input = tree.getByTestId('form-group-editor-stock-native-input'),
    owner = tree.getByTestId('form-group-editor-stock-native-owner');
  const event = key();
  act(() => {
    root.props.onKeyDownCapture(event);
    event.currentTarget = 41;
    input.props.onKeyDown(event);
    event.currentTarget = 21;
    owner.props.onKeyDown(event);
    event.currentTarget = 11;
    root.props.onKeyDown(event);
  });
  event.currentTarget = 99;
  const value = receipt(tree);
  expect(value.entries.map((e: { scope: string }) => e.scope)).toEqual([
    'capture',
    'input',
    'owner',
    'bubble',
  ]);
  expect(value.entries.map((e: { currentTarget: number }) => e.currentTarget)).toEqual([
    11, 41, 21, 11,
  ]);
  for (const entry of value.entries)
    expect(entry).toMatchObject({
      eventId: 1,
      payloadId: 1,
      key: 'ArrowDown',
      source: 'hardware',
      target: 41,
      nativeTarget: 41,
    });
});
test('capture policies record real cancellation without inventing editor or owner delivery', () => {
  const tree = render(<FormGroupEditorExample />),
    root = tree.getByTestId('form-group-editor-stock-field');
  fireEvent.press(tree.getByTestId('form-group-editor-policy'));
  const prevented = key();
  act(() => root.props.onKeyDownCapture(prevented));
  expect(prevented.isDefaultPrevented()).toBe(true);
  expect(receipt(tree).entries).toMatchObject([
    { scope: 'capture', prevented: true, stopped: false },
  ]);
  fireEvent.press(tree.getByTestId('form-group-editor-policy'));
  const stopped = key();
  act(() => root.props.onKeyDownCapture(stopped));
  expect(stopped.isPropagationStopped()).toBe(true);
  expect(receipt(tree).entries.at(-1)).toMatchObject({
    scope: 'capture',
    prevented: false,
    stopped: true,
  });
});
test('reset clears observations while preserving acknowledged focus, native text and all group roots', () => {
  const tree = render(<FormGroupEditorExample />),
    input = tree.getByTestId('form-group-editor-stock-native-input');
  const roots = controls.map((control) => tree.getByTestId('form-group-editor-' + control));
  fireEvent(input, 'focus', { target: 41, currentTarget: 41, nativeEvent: { target: 41 } });
  fireEvent(input, 'change', { nativeEvent: { target: 41, text: 'Casablanca', eventCount: 1 } });
  expect(receipt(tree)).toMatchObject({ focused: 41, values: { 'stock-native': 'Casablanca' } });
  fireEvent(input, 'submitEditing', { nativeEvent: { text: 'Casablanca' } });
  fireEvent.press(tree.getByTestId('form-group-editor-reset'));
  expect(receipt(tree)).toMatchObject({
    total: 0,
    entries: [],
    submissions: {},
    focused: 41,
    values: { 'stock-native': 'Casablanca' },
  });
  for (const [index, control] of controls.entries())
    expect(tree.getByTestId('form-group-editor-' + control)).toBe(roots[index]);
});
