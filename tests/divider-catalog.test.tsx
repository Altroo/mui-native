// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { I18nManager, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import {
  DividerContractExample,
  dividerContractKeys,
  dividerContractStates,
} from '../apps/native-catalog/DividerContractExample';
import reference from './fixtures/mui-divider-9.5.0.json';
const receipt = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('divider-contract-receipt').props.accessibilityLabel);
const next = (tree: ReturnType<typeof render>) =>
  fireEvent.press(tree.getByTestId('divider-contract-next'));
beforeEach(() => {
  jest.replaceProperty(I18nManager, 'isRTL', false);
  jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', false);
});
afterEach(cleanup);
test('finite public Divider scene covers source variants and native border-reset semantics', () => {
  const tree = render(<DividerContractExample />);
  expect(Object.keys(reference.classes)).not.toContain('light'); // Removed from the pinned source API.
  for (const [index, expected] of dividerContractStates.entries()) {
    expect(receipt(tree)).toMatchObject({
      state: index,
      input: expected,
      fontScale: expect.any(Number),
    });
    expect(
      StyleSheet.flatten(tree.getByTestId('divider-contract-counter').findByType(Text).props.style),
    ).toMatchObject({
      color: expected.dark ? '#fff' : 'rgba(0, 0, 0, 0.87)',
    });
    const plain = tree.getByTestId('divider-contract-plain');
    expect(plain).toHaveStyle(
      expected.vertical
        ? { borderRightWidth: 1, borderBottomWidth: 0, height: expected.flexItem ? 'auto' : '100%' }
        : { borderBottomWidth: 1 },
    );
    if (expected.variant === 'inset') expect(plain).toHaveStyle({ marginLeft: 72 });
    if (expected.variant === 'middle')
      expect(plain).toHaveStyle(
        expected.vertical ? { marginTop: 8, marginBottom: 8 } : { marginLeft: 16, marginRight: 16 },
      );
    const paint = tree.getByTestId('divider-contract-paint');
    const lines = paint.findAll(
      (node) =>
        node.type === View && node.props.importantForAccessibility === 'no-hide-descendants',
    );
    expect(lines).toHaveLength(2);
    for (const line of lines)
      expect(StyleSheet.flatten(line.props.style)).toMatchObject({
        borderTopWidth: expected.reset ? 1 : 0,
      });
    next(tree);
  }
  expect(receipt(tree).state).toBe(dividerContractStates.length - 1);
});
test('all retained roots, custom native event fields and keyed child state survive every input', () => {
  const tree = render(<DividerContractExample />);
  const host = (key: string) =>
    tree.UNSAFE_getAllByType(View).find((node) => node.props.testID === `divider-contract-${key}`)!
      .instance;
  const roots = dividerContractKeys.map(host);
  fireEvent.press(tree.getByTestId('divider-contract-counter'));
  const event = { nativeEvent: { target: 29, pageX: 12, pageY: 34 }, timeStamp: 567 };
  fireEvent(tree.getByTestId('divider-contract-custom'), 'touchEnd', event);
  for (let index = 0; index < dividerContractStates.length; index++) {
    expect(receipt(tree).count).toBe(1);
    expect(receipt(tree).touch).toEqual({
      count: 1,
      target: 29,
      pageX: 12,
      pageY: 34,
      timestamp: 567,
    });
    for (const [keyIndex, key] of dividerContractKeys.entries()) {
      expect(host(key)).toBe(roots[keyIndex]);
      expect(receipt(tree).refs[key]).toEqual({
        attached: 1,
        cleaned: 0,
        generation: 1,
        sameRoot: true,
      });
    }
    expect(tree.getByTestId('divider-contract-custom').props).toMatchObject({
      accessibilityHint: 'quiet',
      accessibilityRole: 'button',
    });
    next(tree);
  }
});
test('measure requests reject stale configurations, superseded requests and malformed native coordinates', () => {
  const tree = render(<DividerContractExample />);
  const host = tree
    .UNSAFE_getAllByType(View)
    .find((node) => node.props.testID === 'divider-contract-plain')!.instance as ViewInstance;
  const original = host.measureInWindow,
    pending: Parameters<ViewInstance['measureInWindow']>[0][] = [];
  host.measureInWindow = (callback) => pending.push(callback);
  const measure = () => fireEvent.press(tree.getByTestId('divider-contract-measure'));
  try {
    measure();
    measure();
    act(() => pending[0](1, 2, 280, 1));
    expect(receipt(tree).receipts.plain).toBeUndefined();
    next(tree);
    act(() => pending[1](1, 2, 280, 1));
    expect(receipt(tree).receipts.plain).toBeUndefined();
    measure();
    act(() => pending[2](NaN, 2, 208, 1));
    expect(receipt(tree).receipts.plain).toBeUndefined();
    measure();
    act(() => pending[3](73, 2, 208, 1));
    expect(receipt(tree).receipts.plain).toEqual({
      window: { x: 73, y: 2, width: 208, height: 1 },
      state: 1,
      request: 4,
      generation: 1,
    });
    measure();
    expect(receipt(tree).receipts.plain).toBeUndefined();
    act(() => pending[4](73, 2, 208, 1));
    expect(receipt(tree).receipts.plain.request).toBe(5); // Same bounds still require a fresh observation.
    for (let index = 1; index < dividerContractStates.length; index++) next(tree);
    expect(receipt(tree).receipts).toEqual({});
    measure();
    act(() => pending[5](0, 0, -1, 1));
    expect(receipt(tree).receipts.plain).toBeUndefined();
  } finally {
    host.measureInWindow = original;
  }
});
