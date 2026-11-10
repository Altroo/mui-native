// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import * as RN from 'react-native';
import { Commands } from '../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';
import { clearNativeFocus, getNativeFocusedView } from '../packages/native-host/src/nativeFocus';
import { FormGroupKeyboardExample } from '../apps/native-catalog/FormGroupKeyboardExample';
const kinds = ['native', 'host', 'stock', 'custom', 'styled'];
beforeEach(() => {
  jest.spyOn(Commands, 'focus').mockImplementation(() => {});
  jest
    .spyOn(RN, 'findNodeHandle')
    .mockImplementation((node) => (typeof node === 'number' ? node : undefined));
});
afterEach(() => {
  cleanup();
  clearNativeFocus(getNativeFocusedView());
  jest.restoreAllMocks();
});
const receipt = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('form-group-keyboard-receipt').props.accessibilityLabel);
function event(key = 'Enter') {
  let prevented = false,
    stopped = false;
  return {
    target: 41,
    currentTarget: 41,
    nativeEvent: {
      key,
      code: key === ' ' ? 'Space' : key,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
    },
    preventDefault: jest.fn(() => {
      prevented = true;
    }),
    stopPropagation: jest.fn(() => {
      stopped = true;
    }),
    isDefaultPrevented: () => prevented,
    isPropagationStopped: () => stopped,
  };
}
test('all root and child layouts must be ready before native verification', () => {
  const tree = render(<FormGroupKeyboardExample />);
  expect(receipt(tree)).toMatchObject({ ready: false, policy: 'observe', entries: [], clicks: {} });
  for (const kind of kinds)
    for (const suffix of ['', '-button'])
      fireEvent(tree.getByTestId('form-group-keyboard-' + kind + suffix), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 64 } },
      });
  expect(receipt(tree).ready).toBe(true);
});
test('the child control observes the real ButtonBase key path and activation', () => {
  const tree = render(<FormGroupKeyboardExample />);
  const button = tree.getByTestId('form-group-keyboard-stock-button');
  fireEvent(button, 'MUIKeyDown', event());
  fireEvent(button, 'MUIKeyUp', event());
  expect(receipt(tree).clicks.stock).toBe(1);
  expect(receipt(tree).entries).toMatchObject([
    { scope: 'button', phase: 'down', kind: 'stock', key: 'Enter', target: 41 },
    { scope: 'button', phase: 'up', kind: 'stock', key: 'Enter', target: 41 },
  ]);
});
test('parent capture prevention reaches the child activation event', () => {
  const tree = render(<FormGroupKeyboardExample />);
  fireEvent.press(tree.getByTestId('form-group-keyboard-policy'));
  const key = event();
  fireEvent(tree.getByTestId('form-group-keyboard-stock'), 'keyDownCapture', key);
  fireEvent(tree.getByTestId('form-group-keyboard-stock-button'), 'MUIKeyDown', key);
  expect(key.isDefaultPrevented()).toBe(true);
  expect(receipt(tree).clicks.stock).toBeUndefined();
  expect(receipt(tree).entries).toMatchObject([
    { scope: 'root', phase: 'down-capture', prevented: true },
    { scope: 'button', phase: 'down', prevented: true },
  ]);
});
test('policy and reset retain every root/child while exposing capture cancellation', () => {
  const tree = render(<FormGroupKeyboardExample />);
  const ids = kinds.flatMap((kind) => [kind, kind + '-button']);
  const roots = ids.map((id) => tree.getByTestId('form-group-keyboard-' + id));
  fireEvent.press(tree.getByTestId('form-group-keyboard-policy'));
  fireEvent.press(tree.getByTestId('form-group-keyboard-policy'));
  const key = event(' ');
  fireEvent(tree.getByTestId('form-group-keyboard-stock'), 'keyUpCapture', key);
  expect(key.stopPropagation).toHaveBeenCalledTimes(1);
  expect(receipt(tree)).toMatchObject({
    policy: 'stop',
    entries: [{ scope: 'root', stopped: true }],
  });
  fireEvent.press(tree.getByTestId('form-group-keyboard-reset'));
  expect(receipt(tree)).toMatchObject({ policy: 'stop', entries: [], clicks: {}, total: 0 });
  for (const [index, id] of ids.entries()) {
    expect(tree.getByTestId('form-group-keyboard-' + id)).toBe(roots[index]);
    expect(receipt(tree).refs[id]).toEqual({ attached: 1, cleaned: 0 });
  }
});

test('touch requests focus but only the native callback acknowledges it, and keyboard clicks do not refocus', () => {
  const tree = render(<FormGroupKeyboardExample />);
  const button = tree.getByTestId('form-group-keyboard-stock-button');
  expect(receipt(tree).focused).toBeNull();
  fireEvent.press(button, { nativeEvent: {} });
  expect(Commands.focus).toHaveBeenCalledTimes(1);
  expect(receipt(tree)).toMatchObject({ focused: null, total: 0, clicks: { stock: 1 } });
  fireEvent(button, 'MUIFocus', { target: 41, currentTarget: 41, nativeEvent: { target: 41 } });
  expect(receipt(tree).focused).toBe(41);
  fireEvent.press(tree.getByTestId('form-group-keyboard-reset'));
  expect(receipt(tree)).toMatchObject({ focused: 41, total: 0, entries: [], clicks: {} });
  fireEvent(button, 'MUIKeyDown', event());
  fireEvent(button, 'MUIKeyUp', event());
  expect(Commands.focus).toHaveBeenCalledTimes(1);
  expect(receipt(tree).clicks.stock).toBe(1);
  fireEvent(button, 'MUIBlur', { target: 41, currentTarget: 41, nativeEvent: { target: 41 } });
  expect(receipt(tree).focused).toBeNull();
});
test('a delayed blur from another child cannot clear the acknowledged focused child', () => {
  const tree = render(<FormGroupKeyboardExample />);
  const first = tree.getByTestId('form-group-keyboard-stock-button'),
    second = tree.getByTestId('form-group-keyboard-styled-button');
  fireEvent(first, 'MUIFocus', { target: 41, currentTarget: 41, nativeEvent: { target: 41 } });
  fireEvent(second, 'MUIFocus', { target: 51, currentTarget: 51, nativeEvent: { target: 51 } });
  fireEvent(first, 'MUIBlur', { target: 41, currentTarget: 41, nativeEvent: { target: 41 } });
  expect(receipt(tree).focused).toBe(51);
});
