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
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { forwardRef, useState, type Dispatch, type SetStateAction } from 'react';
import { StyleSheet, View, type ViewInstance } from 'react-native';
import { ThemeProvider, createTheme, type ListItemIconRootProps } from '../packages/material/src';
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

test('stock, custom and dense-menu roots retain their actual host refs through scene updates', () => {
  const tree = render(<ListItemIconContractExample />);
  const metadata = () =>
    JSON.parse(tree.getByTestId('icon-contract-receipt').props.accessibilityLabel);
  const keys = ['native', 'custom', 'menu'] as const;
  const hosts = keys.map(
    (key) =>
      tree.UNSAFE_getAllByType(View).find((view) => view.props.testID === `icon-contract-${key}`)!
        .instance,
  );
  const layouts = keys.map((key) => tree.getByTestId(`icon-contract-${key}`).props.onLayout);
  fireEvent.press(tree.getByTestId('icon-contract-child'));
  fireEvent.press(tree.getByTestId('icon-contract-alignment'));
  fireEvent.press(tree.getByTestId('icon-contract-theme'));
  fireEvent.press(tree.getByTestId('icon-contract-menu-item'));
  for (const [index, key] of keys.entries()) {
    expect(metadata().refs[key]).toEqual({ attached: 1, cleaned: 0, sameRoot: true });
    expect(
      tree.UNSAFE_getAllByType(View).find((view) => view.props.testID === `icon-contract-${key}`)!
        .instance,
    ).toBe(hosts[index]);
    expect(tree.getByTestId(`icon-contract-${key}`).props.onLayout).toBe(layouts[index]);
  }
  expect(tree.getByTestId('icon-contract-child').props.accessibilityLabel).toBe(
    'Acknowledgments 1',
  );
  expect(metadata().menuCount).toBe(1);
});

test('ref measurements reject stale native callbacks and duplicate layout publications', () => {
  const tree = render(<ListItemIconContractExample />);
  const target = tree.getByTestId('icon-contract-native');
  const instance = tree
    .UNSAFE_getAllByType(View)
    .find((view) => view.props.testID === 'icon-contract-native')!.instance as ViewInstance;
  const pending: Parameters<ViewInstance['measureInWindow']>[0][] = [];
  const original = instance.measureInWindow;
  instance.measureInWindow = (callback) => pending.push(callback);
  const metadata = () =>
    JSON.parse(tree.getByTestId('icon-contract-receipt').props.accessibilityLabel);
  const first = { x: 16, y: 8, width: 36, height: 24 };
  const next = { x: 16, y: 16, width: 45, height: 24 };
  try {
    fireEvent(target, 'layout', { nativeEvent: { layout: first } });
    fireEvent(target, 'layout', { nativeEvent: { layout: next } });
    expect(pending).toHaveLength(2);
    act(() => pending[0](10, 20, 36, 24));
    expect(metadata().receipts.native).toBeUndefined();
    act(() => pending[1](30, 40, 45, 24));
    expect(metadata().receipts.native).toEqual({
      local: next,
      window: { x: 30, y: 40, width: 45, height: 24 },
    });
    expect(metadata().frames.native).toEqual(next);
    const receipt = tree.getByTestId('icon-contract-receipt').props.accessibilityLabel;
    fireEvent(target, 'layout', { nativeEvent: { layout: next } });
    act(() => pending[2](30, 40, 45, 24));
    expect(tree.getByTestId('icon-contract-receipt').props.accessibilityLabel).toBe(receipt);
  } finally {
    instance.measureInWindow = original;
  }
});

test('a replaced host publishes its ref lease even when both measured rectangles are identical', () => {
  const leases = new Map<string, Dispatch<SetStateAction<number | null>>>();
  const LeaseRoot = forwardRef<ViewInstance, ListItemIconRootProps>(
    ({ className: _className, ...props }, ref) => {
      const [lease, setLease] = useState<number | null>(0);
      if (props.testID) leases.set(props.testID, setLease);
      return lease === null ? null : <View key={lease} {...props} ref={ref} />;
    },
  );
  const theme = createTheme({
    components: { MuiListItemIcon: { defaultProps: { component: LeaseRoot } } },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <ListItemIconContractExample />
    </ThemeProvider>,
  );
  const metadata = () =>
    JSON.parse(tree.getByTestId('icon-contract-receipt').props.accessibilityLabel);
  const host = () =>
    tree.UNSAFE_getAllByType(View).find((view) => view.props.testID === 'icon-contract-native')!
      .instance as ViewInstance;
  const first = host();
  const firstMeasure = first.measureInWindow;
  let replacement: ViewInstance | undefined;
  let replacementMeasure: ViewInstance['measureInWindow'] | undefined;
  const local = { x: 16, y: 8, width: 36, height: 24 };
  const setLease = leases.get('icon-contract-native');
  expect(setLease).toBeDefined();
  try {
    first.measureInWindow = (callback) => callback(30, 40, 36, 24);
    fireEvent(tree.getByTestId('icon-contract-native'), 'layout', {
      nativeEvent: { layout: local },
    });
    const measured = metadata().receipts.native;
    expect(metadata().refs.native).toEqual({ attached: 1, cleaned: 0, sameRoot: true });
    act(() => setLease!(null));
    expect(tree.queryByTestId('icon-contract-native')).toBeNull();
    const afterCleanup = metadata().refs.native;
    act(() => setLease!(1));
    replacement = host();
    expect(replacement).not.toBe(first);
    replacementMeasure = replacement.measureInWindow;
    replacement.measureInWindow = (callback) => callback(30, 40, 36, 24);
    fireEvent(tree.getByTestId('icon-contract-native'), 'layout', {
      nativeEvent: { layout: local },
    });
    expect(metadata().receipts.native).toEqual(measured);
    expect({ afterCleanup, afterReplacement: metadata().refs.native }).toEqual({
      afterCleanup: { attached: 1, cleaned: 1, sameRoot: false },
      afterReplacement: { attached: 2, cleaned: 1, sameRoot: false },
    });
  } finally {
    first.measureInWindow = firstMeasure;
    if (replacement && replacementMeasure) replacement.measureInWindow = replacementMeasure;
  }
});
