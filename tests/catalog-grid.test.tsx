import '@shopify/flash-list/jestSetup';
import React from 'react';
import { ScrollView } from 'react-native';
import { DataGrid } from '../packages/x-data-grid/src';
import {
  act,
  cleanupAsync,
  fireEventAsync,
  renderAsync,
  screen,
} from '@testing-library/react-native';
import { InvoiceGrid } from '../apps/native-catalog/InvoiceGrid';

jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
jest.mock('@mui/x-data-grid', () => jest.requireActual('../packages/x-data-grid/src'), {
  virtual: true,
});
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  await cleanupAsync();
  jest.useRealTimers();
});

test('invoice search resets the page and layout changes retain the selected invoices', async () => {
  await renderAsync(<InvoiceGrid />);
  await fireEventAsync.press(screen.getByLabelText('Cards layout'));
  await fireEventAsync.press(screen.getByLabelText('Select row 1'), { nativeEvent: {} });
  await fireEventAsync.press(screen.getByLabelText('Next page'), { nativeEvent: {} });
  expect(screen.getByText('26-50 of 10000')).toBeTruthy();
  await fireEventAsync(screen.getByLabelText('Search clients'), 'change', {
    nativeEvent: { text: 'Atelier Atlas' },
  });
  expect(screen.getByText('1-25 of 1667')).toBeTruthy();
  expect(screen.getByLabelText('Select row 1')).toBeChecked();
  expect(screen.queryByText('Maison Rive')).toBeNull();
  await fireEventAsync.press(screen.getByLabelText('Table layout'));
  expect(screen.getByTestId('native-grid-table')).toBeTruthy();
  expect(screen.getByLabelText('Select row 1')).toBeChecked();
  await fireEventAsync(screen.getByLabelText('Search clients'), 'change', {
    nativeEvent: { text: 'No matching client' },
  });
  expect(screen.getByText('No rows')).toBeTruthy();
  expect(screen.getByText('0-0 of 0')).toBeTruthy();
  await fireEventAsync(screen.getByLabelText('Search clients'), 'change', {
    nativeEvent: { text: '' },
  });
  expect(screen.getByText('1-25 of 10000')).toBeTruthy();
});

test('short and collapsed viewports have a recoverable screen-level scroll fallback', async () => {
  await renderAsync(<InvoiceGrid />);
  const layout = async (testID: string, height: number) =>
    fireEventAsync(screen.getByTestId(testID), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
    });
  await layout('invoice-grid-header', 90);
  await layout('invoice-grid-search', 50);
  await layout('invoice-grid-viewport', 80);
  const viewport = () =>
    screen
      .UNSAFE_getAllByType(ScrollView)
      .find((node) => node.props.testID === 'invoice-grid-viewport')!;
  expect(viewport().props.scrollEnabled).toBe(true);
  expect(viewport().props.contentContainerStyle.minHeight).toBe(80);
  expect(screen.UNSAFE_getByType(DataGrid).props.height).toBe(160);
  await fireEventAsync.press(screen.getByLabelText('Cards layout'));
  await fireEventAsync.press(screen.getByLabelText('Sort Amount'), { nativeEvent: {} });
  await fireEventAsync.press(screen.getByLabelText('Select row 1'), { nativeEvent: {} });
  const scrollTo = jest.spyOn(viewport().instance, 'scrollTo');
  await layout('invoice-grid-viewport', 0);
  expect(viewport().props.scrollEnabled).toBe(true);
  expect(viewport().props.contentContainerStyle.minHeight).toBe(0);
  await layout('invoice-grid-viewport', 600);
  expect(viewport().props.scrollEnabled).toBe(false);
  expect(screen.UNSAFE_getByType(DataGrid).props.height).toBe(460);
  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
  expect(screen.getByLabelText('Sort Amount')).toHaveAccessibilityValue({ text: 'Ascending' });
  expect(screen.getByLabelText('Select row 1')).toBeChecked();
  await layout('invoice-grid-header', 500);
  expect(viewport().props.scrollEnabled).toBe(true);
  expect(screen.UNSAFE_getByType(DataGrid).props.height).toBe(160);
  scrollTo.mockRestore();
});
