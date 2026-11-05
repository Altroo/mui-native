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
import { StyleSheet } from 'react-native';
import { ThemeProvider, createTheme } from '../packages/material/src';
import { ListItemIconContractExample } from '../apps/native-catalog/ListItemIconContractExample';
afterEach(cleanup);
test('wrapper example retains custom child state, alignment, theme spacing and bounded layout receipt', () => {
  const tree = render(<ListItemIconContractExample />);
  const native = () => tree.getByTestId('icon-contract-native');
  expect(native()).toHaveStyle({ minWidth: 36 });
  fireEvent.press(tree.getByTestId('icon-contract-child'));
  fireEvent.press(tree.getByTestId('icon-contract-alignment'));
  expect(tree.getByTestId('icon-contract-custom')).toHaveStyle({ marginTop: 12 });
  fireEvent.press(tree.getByTestId('icon-contract-theme'));
  expect(native()).toHaveStyle({ minWidth: 45, marginTop: 8 });
  expect(tree.getByTestId('icon-contract-menu')).toHaveStyle({ minWidth: 36 });
  expect(tree.getByTestId('icon-contract-child')).toHaveTextContent('1');
  expect(tree.getByTestId('icon-contract-child')).toHaveStyle({ minWidth: 44, minHeight: 44 });
  fireEvent.press(tree.getByTestId('icon-contract-menu-item'));
  const event = { nativeEvent: { layout: { x: 0, y: 0, width: 45, height: 24 } } };
  fireEvent(native(), 'layout', event);
  fireEvent(native(), 'layout', event);
  const receipt = JSON.parse(tree.getByTestId('icon-contract-receipt').props.accessibilityLabel);
  expect(receipt).toMatchObject({
    top: true,
    custom: true,
    menuCount: 1,
    frames: { native: event.nativeEvent.layout },
  });
  expect(typeof receipt.fontScale).toBe('number');
  expect(StyleSheet.flatten(native().props.style).borderWidth).toBeUndefined();
});

test('the unregistered example inherits the enclosing dark palette instead of resetting to light text', () => {
  const theme = createTheme({ palette: { mode: 'dark' } });
  const tree = render(
    <ThemeProvider theme={theme}>
      <ListItemIconContractExample />
    </ThemeProvider>,
  );
  expect(tree.getByText('Delivery updates')).toHaveStyle({ color: theme.palette.text.primary });
});
