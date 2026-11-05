// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { render, fireEvent, cleanup } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../packages/material/src';
import { ButtonGroupReadingExample } from '../apps/native-catalog/ButtonGroupReadingExample';
import { createCatalogTheme } from '../apps/native-catalog/catalogTheme';

afterEach(cleanup);
const scene = () =>
  render(
    <ThemeProvider theme={createCatalogTheme(false)}>
      <ButtonGroupReadingExample />
    </ThemeProvider>,
  );

test('native reading measurements stay optional and native text events populate the receipt', () => {
  const tree = scene();
  expect(tree.queryByTestId('group-reading-metadata')).toBeNull();
  const line = { text: 'Review 0', x: 0, y: 0, width: 60, height: 24.5, capHeight: 10 };
  fireEvent(tree.getByTestId('group-reading-label-1'), 'textLayout', {
    nativeEvent: { lines: [line] },
  });
  fireEvent.press(tree.getByTestId('group-reading-measurements-toggle'));
  const receipt = JSON.parse(tree.getByTestId('group-reading-metadata').props.children);
  expect(receipt.schemaVersion).toBe(1);
  expect(receipt.metrics['1']).toEqual([line]);
  expect(receipt.direction).toBe('ltr');
  expect(receipt.orientation).toBe('horizontal');
  fireEvent.press(tree.getByTestId('group-reading-measurements-toggle'));
  expect(tree.queryByTestId('group-reading-metadata')).toBeNull();
});

test('direction and orientation updates preserve authored action counters and scaling policies', () => {
  const tree = scene();
  fireEvent.press(tree.getByTestId('group-reading-action-0'));
  fireEvent.press(tree.getByTestId('group-reading-direction'));
  fireEvent.press(tree.getByTestId('group-reading-orientation'));
  expect(tree.getByLabelText('Reading Save count 1')).toBeTruthy();
  expect(StyleSheet.flatten(tree.getByTestId('group-reading-actions').props.style)).toMatchObject({
    flexDirection: 'column',
  });
  expect(tree.getByTestId('group-reading-status')).toHaveTextContent(
    /^RTL · vertical · system text [\d.]+×$/,
  );
  expect(tree.getByTestId('group-reading-label-1').props.allowFontScaling).toBe(false);
  expect(tree.getByTestId('group-reading-label-2').props.maxFontSizeMultiplier).toBe(1.2);
  fireEvent.press(tree.getByTestId('group-reading-direction'));
  expect(tree.getByLabelText('Reading Save count 1')).toBeTruthy();
});

// The explanation follows each policy independently, including live restoration.
test('reading instructions describe the active scaling policies', () => {
  const tree = scene();
  const policy = () => tree.getByTestId('group-reading-policy');
  expect(policy()).toHaveTextContent(
    'Save follows system text size, Review stays fixed, and Send caps enlargement at 1.2×.',
  );
  fireEvent.press(tree.getByTestId('group-reading-follow-toggle'));
  expect(policy()).toHaveTextContent(
    'Save follows system text size, Review follows system text size, and Send caps enlargement at 1.2×.',
  );
  fireEvent.press(tree.getByTestId('group-reading-cap-toggle'));
  expect(policy()).toHaveTextContent(
    'Save follows system text size, Review follows system text size, and Send follows system text size without a cap.',
  );
  fireEvent.press(tree.getByTestId('group-reading-follow-toggle'));
  expect(policy()).toHaveTextContent(
    'Save follows system text size, Review stays fixed, and Send follows system text size without a cap.',
  );
  fireEvent.press(tree.getByTestId('group-reading-cap-toggle'));
  expect(policy()).toHaveTextContent(
    'Save follows system text size, Review stays fixed, and Send caps enlargement at 1.2×.',
  );
});
