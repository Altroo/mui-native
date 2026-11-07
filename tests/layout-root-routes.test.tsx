// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
jest.mock(
  '@mui/icons-material/NotificationsNoneRounded',
  () => jest.requireActual('../packages/icons/src/NotificationsNoneRounded'),
  { virtual: true },
);
jest.mock('@mui/icons-material/Check', () => jest.requireActual('../packages/icons/src/Check'), {
  virtual: true,
});
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { RootLayoutExamples } from '../apps/native-catalog/RootLayoutExamples';
afterEach(cleanup);

test('workload owns its viewport without nesting inside the contract scene scroll view', () => {
  const tree = render(<RootLayoutExamples />);
  expect(tree.getByTestId('root-layout-scroll')).toBeTruthy();
  fireEvent.press(tree.getByTestId('root-layout-benchmark'));
  expect(tree.queryByTestId('root-layout-scroll')).toBeNull();
  expect(tree.getByTestId('layout-root-viewport')).toBeTruthy();
  const state = JSON.parse(
    tree.getByTestId('layout-root-controller-receipt').props.accessibilityLabel,
  );
  expect(state).toMatchObject({ mode: 'rn', family: 'form-group', rowCount: 100 });
  fireEvent.press(tree.getByTestId('root-layout-form-group'));
  expect(tree.queryByTestId('layout-root-controller-receipt')).toBeNull();
  expect(tree.getByTestId('root-layout-scroll')).toBeTruthy();
});

test('direct Details, Menu and Typography scenes share the contract scroll viewport', () => {
  const tree = render(<RootLayoutExamples />);
  for (const [route, receipt] of [
    ['details', 'details-contract-receipt'],
    ['menu-styles', 'menu-style-receipt'],
    ['typography', 'type-contract-receipt'],
    ['divider', 'divider-contract-receipt'],
    ['paper', 'paper-contract-receipt'],
    ['box', 'box-contract-receipt'],
  ]) {
    fireEvent.press(tree.getByTestId('root-layout-' + route));
    expect(tree.getByTestId('root-layout-scroll')).toBeTruthy();
    expect(tree.getByTestId(receipt)).toBeTruthy();
  }
});
