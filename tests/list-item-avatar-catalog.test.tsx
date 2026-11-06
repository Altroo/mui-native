// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { cleanup, render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ListItemAvatarContractExample } from '../apps/native-catalog/ListItemAvatarContractExample';
afterEach(cleanup);
test('live catalog alignment, RTL and themed classes retain caller-owned state', () => {
  const tree = render(<ListItemAvatarContractExample />);
  const root = () => tree.getByTestId('avatar-contract-custom');
  expect(StyleSheet.flatten(root().props.style)).toMatchObject({ minWidth: 56, flexShrink: 0 });
  fireEvent.press(tree.getByTestId('avatar-contract-child'));
  expect(tree.getByTestId('avatar-contract-child')).toHaveTextContent('1');
  fireEvent.press(tree.getByTestId('avatar-contract-alignment'));
  expect(StyleSheet.flatten(root().props.style).marginTop).toBe(8);
  fireEvent.press(tree.getByTestId('avatar-contract-theme'));
  expect(StyleSheet.flatten(root().props.style)).toMatchObject({ minWidth: 64, marginTop: 12 });
  fireEvent.press(tree.getByTestId('avatar-contract-rtl'));
  expect(
    StyleSheet.flatten(tree.getByTestId('avatar-contract-row-custom').props.style).direction,
  ).toBe('rtl');
  expect(tree.getByTestId('avatar-contract-child')).toHaveTextContent('1');
  const receipt = JSON.parse(tree.getByTestId('avatar-contract-receipt').props.accessibilityLabel);
  expect(receipt).toMatchObject({ top: true, rtl: true, customStyle: true, receipts: {} });
  expect(typeof receipt.fontScale).toBe('number');
});
