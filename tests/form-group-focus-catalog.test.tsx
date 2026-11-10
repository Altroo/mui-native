// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import * as RN from 'react-native';
import { FormGroupFocusExample } from '../apps/native-catalog/FormGroupFocusExample';
import { Commands } from '../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';
import { clearNativeFocus, getNativeFocusedView } from '../packages/native-host/src/nativeFocus';
const kinds = ['native', 'host', 'stock', 'custom', 'styled'];
beforeEach(() => {
  jest
    .spyOn(RN, 'findNodeHandle')
    .mockImplementation((node) => (typeof node === 'number' ? node : undefined));
  jest.spyOn(Commands, 'focus').mockImplementation(() => {});
  jest.spyOn(Commands, 'blur').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  clearNativeFocus(getNativeFocusedView());
  jest.restoreAllMocks();
});
const receipt = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('form-group-focus-receipt').props.accessibilityLabel);
test('focus requests do not fabricate native callbacks or optimistic focus', () => {
  const tree = render(<FormGroupFocusExample />);
  fireEvent.press(tree.getByTestId('form-group-focus-stock-button'));
  expect(Commands.focus).toHaveBeenCalledTimes(1);
  expect(receipt(tree)).toMatchObject({
    total: 0,
    entries: [],
    focused: null,
    requests: { stock: 1 },
  });
  fireEvent.press(tree.getByTestId('form-group-focus-release'));
  expect(Commands.blur).toHaveBeenCalledTimes(5);
  expect(receipt(tree).entries).toEqual([]);
});
test('readiness requires every root and child layout', () => {
  const tree = render(<FormGroupFocusExample />);
  expect(receipt(tree).ready).toBe(false);
  for (const kind of kinds)
    for (const suffix of ['', '-button'])
      fireEvent(tree.getByTestId('form-group-focus-' + kind + suffix), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 64 } },
      });
  expect(receipt(tree).ready).toBe(true);
});
test('recording captures original event identity and synchronous currentTarget before clearing', () => {
  const tree = render(<FormGroupFocusExample />);
  const root = tree.getByTestId('form-group-focus-stock'),
    child = tree.getByTestId('form-group-focus-stock-button');
  const original = { target: 31, currentTarget: 11, nativeEvent: { target: 31 } };
  fireEvent(root, 'focusCapture', original);
  original.currentTarget = 31;
  fireEvent(child, 'MUIFocus', original);
  original.currentTarget = 11;
  fireEvent(root, 'focus', original);
  expect(receipt(tree).entries).toMatchObject([
    {
      sequence: 1,
      type: 'focus',
      phase: 'capture',
      eventId: 1,
      payloadId: 1,
      target: 31,
      currentTarget: 11,
    },
    {
      sequence: 2,
      type: 'focus',
      phase: 'child',
      eventId: 1,
      payloadId: 1,
      target: 31,
      currentTarget: 31,
    },
    {
      sequence: 3,
      type: 'focus',
      phase: 'bubble',
      eventId: 1,
      payloadId: 1,
      target: 31,
      currentTarget: 11,
    },
  ]);
  const before = kinds
    .flatMap((kind) => [kind, kind + '-button'])
    .map((id) => tree.getByTestId('form-group-focus-' + id));
  fireEvent.press(tree.getByTestId('form-group-focus-clear'));
  expect(receipt(tree)).toMatchObject({ entries: [], total: 0 });
  for (const [index, id] of kinds.flatMap((kind) => [kind, kind + '-button']).entries()) {
    expect(tree.getByTestId('form-group-focus-' + id)).toBe(before[index]);
    expect(receipt(tree).refs[id]).toEqual({ attached: 1, cleaned: 0 });
  }
});
