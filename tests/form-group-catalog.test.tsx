// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { act, cleanup, render, fireEvent } from '@testing-library/react-native';
import { StyleSheet, View, type ViewInstance } from 'react-native';
import { FormGroupContractExample } from '../apps/native-catalog/FormGroupContractExample';
afterEach(cleanup);
test('live FormGroup scene keeps native roots, keyed counters, inheritance and inline resets', () => {
  const tree = render(<FormGroupContractExample />);
  const root = (key: string) => tree.getByTestId(`form-group-contract-${key}`);
  const metadata = () =>
    JSON.parse(tree.getByTestId('form-group-contract-receipt').props.accessibilityLabel);
  const layouts = ['inherited', 'own-false', 'custom', 'styled'].map(
    (key) => root(key).props.onLayout,
  );
  expect(StyleSheet.flatten(root('inherited').props.style)).toMatchObject({
    flexDirection: 'column',
    marginTop: 0,
    paddingLeft: 0,
    paddingTop: 0,
  });
  expect(tree.getByText('Literal inherited')).toHaveStyle({ fontSize: 16, lineHeight: 22.4 });
  fireEvent.press(tree.getByTestId('form-group-contract-child-inherited'));
  fireEvent.press(tree.getByTestId('form-group-contract-child-custom'));
  fireEvent.press(tree.getByTestId('form-group-contract-row'));
  expect(StyleSheet.flatten(root('inherited').props.style)).toMatchObject({
    flexDirection: 'row',
    paddingRight: 0,
  });
  expect(StyleSheet.flatten(root('styled').props.style).borderRightWidth).toBe(4);
  fireEvent.press(tree.getByTestId('form-group-contract-error'));
  expect(StyleSheet.flatten(root('styled').props.style).opacity).toBe(0.6);
  expect(StyleSheet.flatten(root('inherited').props.style).borderColor).not.toBe(
    StyleSheet.flatten(root('own-false').props.style).borderColor,
  );
  fireEvent.press(tree.getByTestId('form-group-contract-theme'));
  fireEvent.press(tree.getByTestId('form-group-contract-rtl'));
  fireEvent.press(tree.getByTestId('form-group-contract-text'));
  expect(tree.getByTestId('form-group-contract-child-inherited')).toHaveTextContent('Choice 1');
  expect(tree.getByTestId('form-group-contract-child-custom')).toHaveTextContent('Choice 1');
  expect(tree.getByText('Literal inherited')).toHaveStyle({ fontSize: 20, lineHeight: 28 });
  expect(tree.getByTestId('form-group-contract-text-inherited')).toHaveStyle({
    fontSize: 16,
    lineHeight: 22.4,
  });
  const result = metadata();
  expect(result).toMatchObject({
    schemaVersion: 1,
    row: true,
    parentError: true,
    themed: true,
    rtl: true,
    fontSize: 20,
    receipts: {},
  });
  for (const [index, key] of ['inherited', 'own-false', 'custom', 'styled'].entries()) {
    expect(result.refs[key]).toEqual({ attached: 1, cleaned: 0 });
    expect(root(key).props.onLayout).toBe(layouts[index]);
  }
  expect(typeof result.fontScale).toBe('number');
});

test('measurement receipts reject stale callbacks and retain stable native handlers', () => {
  const tree = render(<FormGroupContractExample />);
  const target = tree.getByTestId('form-group-contract-inherited');
  const instance = tree
    .UNSAFE_getAllByType(View)
    .find((view) => view.props.testID === 'form-group-contract-inherited')!
    .instance as ViewInstance;
  const pending: Parameters<ViewInstance['measureInWindow']>[0][] = [];
  const original = instance.measureInWindow;
  instance.measureInWindow = (callback) => {
    pending.push(callback);
  };
  const first = { x: 0, y: 0, width: 300, height: 100 };
  const second = { x: 0, y: 0, width: 320, height: 80 };
  const metadata = () =>
    JSON.parse(tree.getByTestId('form-group-contract-receipt').props.accessibilityLabel);
  try {
    fireEvent(target, 'layout', { nativeEvent: { layout: first } });
    fireEvent(target, 'layout', { nativeEvent: { layout: second } });
    expect(pending).toHaveLength(2);
    act(() => pending[0](10, 20, 300, 100));
    expect(metadata().receipts.inherited).toBeUndefined();
    act(() => pending[1](30, 40, 320, 80));
    expect(metadata().receipts.inherited).toEqual({
      local: second,
      window: { x: 30, y: 40, width: 320, height: 80 },
    });
    const receipt = tree.getByTestId('form-group-contract-receipt').props.accessibilityLabel;
    fireEvent(target, 'layout', { nativeEvent: { layout: second } });
    act(() => pending[2](30, 40, 320, 80));
    expect(tree.getByTestId('form-group-contract-receipt').props.accessibilityLabel).toBe(receipt);
  } finally {
    instance.measureInWindow = original;
  }
});
