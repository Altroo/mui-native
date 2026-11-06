// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { forwardRef, useState, type Dispatch, type SetStateAction } from 'react';
import { StyleSheet, View, type ViewInstance, type ViewProps } from 'react-native';
import { ThemeProvider, createTheme } from '../packages/material/src';
import { AccordionDetailsContractExample } from '../apps/native-catalog/AccordionDetailsContractExample';

afterEach(cleanup);
type Tree = ReturnType<typeof render>;
const metadata = (tree: Tree) =>
  JSON.parse(tree.getByTestId('details-contract-receipt').props.accessibilityLabel);
const press = (tree: Tree, id: string) =>
  fireEvent.press(tree.getByTestId(`details-contract-${id}`));
const host = (tree: Tree, key: string) =>
  tree.UNSAFE_getAllByType(View).find((view) => view.props.testID === `details-contract-${key}`)!
    .instance as ViewInstance;
function insets(tree: Tree, top: number, right: number, bottom: number, left = right) {
  for (const key of ['stock', 'custom']) {
    expect(tree.getByTestId(`details-contract-${key}`)).toHaveStyle({
      paddingTop: top,
      paddingRight: right,
      paddingBottom: bottom,
      paddingLeft: left,
    });
  }
}

test('two live roots exercise source spacing, tuple spacing, class/default style and final inline resets', () => {
  const tree = render(<AccordionDetailsContractExample />);
  const roots = ['stock', 'custom'].map((key) => host(tree, key));
  const callbacks = ['stock', 'custom'].map(
    (key) => tree.getByTestId(`details-contract-${key}`).props.onLayout,
  );
  insets(tree, 8, 16, 16);
  press(tree, 'child');
  press(tree, 'spacing');
  insets(tree, 10, 20, 20);
  press(tree, 'spacing');
  insets(tree, 5, 7, 9);
  press(tree, 'style');
  insets(tree, 11, 21, 13, 7);
  press(tree, 'inline');
  // A genuine native shorthand remains the final authored declaration.
  for (const key of ['stock', 'custom']) {
    const root = tree.getByTestId(`details-contract-${key}`);
    expect(root).toHaveStyle({ padding: 0 });
    const style = StyleSheet.flatten(root.props.style);
    for (const edge of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'])
      expect(style[edge] ?? style.padding).toBe(0);
  }
  press(tree, 'inline');
  insets(tree, 11, 21, 13, 7);
  press(tree, 'style');
  insets(tree, 5, 7, 9);
  press(tree, 'spacing');
  insets(tree, 8, 16, 16);
  expect(tree.getByTestId('details-contract-child').props.accessibilityLabel).toBe('Marked 1');
  expect(metadata(tree).childCount).toBe(1);
  for (const [index, key] of ['stock', 'custom'].entries()) {
    expect(host(tree, key)).toBe(roots[index]);
    expect(tree.getByTestId(`details-contract-${key}`).props.onLayout).toBe(callbacks[index]);
    expect(metadata(tree).refs[key]).toEqual({ attached: 1, cleaned: 0, sameRoot: true });
    expect(tree.getByTestId(`details-contract-${key}`).props.collapsable).toBe(false);
  }
});

test('authored parent metrics and em child metrics update without multiplying the observed OS font scale', () => {
  const tree = render(<AccordionDetailsContractExample />);
  for (const key of ['stock', 'custom']) {
    expect(tree.getByTestId(`details-contract-primary-${key}`)).toHaveStyle({
      fontSize: 20,
      lineHeight: 25,
      textAlign: 'left',
    });
    expect(tree.getByTestId(`details-contract-small-${key}`)).toHaveStyle({
      fontSize: 10,
      lineHeight: 12.5,
    });
  }
  press(tree, 'font');
  press(tree, 'rtl');
  for (const key of ['stock', 'custom']) {
    expect(tree.getByTestId(`details-contract-primary-${key}`)).toHaveStyle({
      fontSize: 24,
      lineHeight: 30,
      // RN mirrors native left/right in RTL; this paints at CSS logical start.
      // The unchanged native glyph assertion verifies the actual right edge.
      textAlign: 'left',
    });
    expect(tree.getByTestId(`details-contract-small-${key}`)).toHaveStyle({
      fontSize: 12,
      lineHeight: 15,
    });
  }
  expect(metadata(tree)).toMatchObject({ large: true, rtl: true });
  expect(metadata(tree).fontScale).toBeGreaterThan(0);
  press(tree, 'font');
  press(tree, 'rtl');
  for (const key of ['stock', 'custom']) {
    expect(tree.getByTestId(`details-contract-primary-${key}`)).toHaveStyle({
      fontSize: 20,
      lineHeight: 25,
      textAlign: 'left',
    });
    expect(tree.getByTestId(`details-contract-small-${key}`)).toHaveStyle({
      fontSize: 10,
      lineHeight: 12.5,
    });
  }
  expect(metadata(tree)).toMatchObject({ large: false, rtl: false });
  for (const id of ['spacing', 'inline', 'style', 'rtl', 'font', 'child'])
    expect(tree.getByTestId(`details-contract-${id}`)).toHaveStyle({ maxWidth: '100%' });
});

test('the standalone scene preserves its enclosing palette', () => {
  const theme = createTheme({ palette: { mode: 'dark' } });
  const tree = render(
    <ThemeProvider theme={theme}>
      <AccordionDetailsContractExample />
    </ThemeProvider>,
  );
  expect(tree.getByText('Delivery notes')).toHaveStyle({ color: theme.palette.text.primary });
});

test('real touch payloads and native text lines are published separately from the child press', () => {
  const tree = render(<AccordionDetailsContractExample />);
  press(tree, 'child');
  expect(metadata(tree).touches).toEqual({});
  fireEvent(tree.getByTestId('details-contract-custom'), 'touchEnd', {
    timeStamp: 120,
    nativeEvent: { pageX: 30, pageY: 80, target: 17 },
  });
  const lines = [{ text: 'Dock 3.', x: 0, y: 2, width: 62, height: 25, capHeight: 14 }];
  const target = tree.getByTestId('details-contract-primary-stock');
  fireEvent(target, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 220, height: 25 } } });
  fireEvent(target, 'textLayout', { nativeEvent: { lines } });
  expect(metadata(tree)).toMatchObject({
    childCount: 1,
    touches: { custom: { count: 1, pageX: 30, pageY: 80, target: 17, timestamp: 120 } },
    metrics: { 'primary-stock': lines },
    textFrames: { 'primary-stock': { x: 0, y: 0, width: 220, height: 25 } },
  });
  const receipt = tree.getByTestId('details-contract-receipt').props.accessibilityLabel;
  fireEvent(target, 'textLayout', { nativeEvent: { lines } });
  expect(tree.getByTestId('details-contract-receipt').props.accessibilityLabel).toBe(receipt);
});

test('native ref measurements reject older layouts and avoid duplicate publication', () => {
  const tree = render(<AccordionDetailsContractExample />);
  const target = tree.getByTestId('details-contract-stock');
  const instance = host(tree, 'stock');
  const pending: Parameters<ViewInstance['measureInWindow']>[0][] = [];
  const original = instance.measureInWindow;
  instance.measureInWindow = (callback) => pending.push(callback);
  const local = { x: 0, y: 0, width: 260, height: 80 };
  const next = { ...local, height: 90 };
  try {
    fireEvent(target, 'layout', { nativeEvent: { layout: local } });
    fireEvent(target, 'layout', { nativeEvent: { layout: next } });
    act(() => pending[0](20, 30, 260, 80));
    expect(metadata(tree).receipts.stock).toBeUndefined();
    act(() => pending[1](20, 40, 260, 90));
    expect(metadata(tree).receipts.stock).toEqual({
      local: next,
      window: { x: 20, y: 40, width: 260, height: 90 },
    });
    const receipt = tree.getByTestId('details-contract-receipt').props.accessibilityLabel;
    fireEvent(target, 'layout', { nativeEvent: { layout: next } });
    act(() => pending[2](20, 40, 260, 90));
    expect(tree.getByTestId('details-contract-receipt').props.accessibilityLabel).toBe(receipt);
  } finally {
    instance.measureInWindow = original;
  }
});

test('ref revision publishes release and replacement even when native dimensions do not change', () => {
  const leases = new Map<string, Dispatch<SetStateAction<number | null>>>();
  const LeaseRoot = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
    ({ className: _className, ...native }, ref) => {
      const [lease, setLease] = useState<number | null>(0);
      if (native.testID) leases.set(native.testID, setLease);
      return lease === null ? null : <View {...native} key={lease} ref={ref} />;
    },
  );
  const theme = createTheme({
    components: { MuiAccordionDetails: { defaultProps: { component: LeaseRoot } } },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <AccordionDetailsContractExample />
    </ThemeProvider>,
  );
  const first = host(tree, 'stock');
  const firstMeasure = first.measureInWindow;
  const pending: Parameters<ViewInstance['measureInWindow']>[0][] = [];
  let replacement: ViewInstance | undefined;
  let replacementMeasure: ViewInstance['measureInWindow'] | undefined;
  const local = { x: 0, y: 0, width: 260, height: 80 };
  const setLease = leases.get('details-contract-stock');
  expect(setLease).toBeDefined();
  try {
    first.measureInWindow = (callback) => pending.push(callback);
    fireEvent(tree.getByTestId('details-contract-stock'), 'layout', {
      nativeEvent: { layout: local },
    });
    act(() => setLease!(null));
    expect(metadata(tree).refs.stock).toEqual({ attached: 1, cleaned: 1, sameRoot: false });
    act(() => pending[0](10, 20, 260, 80));
    expect(metadata(tree).receipts.stock).toBeUndefined();
    act(() => setLease!(1));
    replacement = host(tree, 'stock');
    replacementMeasure = replacement.measureInWindow;
    replacement.measureInWindow = (callback) => callback(10, 20, 260, 80);
    fireEvent(tree.getByTestId('details-contract-stock'), 'layout', {
      nativeEvent: { layout: local },
    });
    expect(replacement).not.toBe(first);
    expect(metadata(tree).refs.stock).toEqual({ attached: 2, cleaned: 1, sameRoot: false });
    expect(metadata(tree).receipts.stock).toEqual({
      local,
      window: { x: 10, y: 20, width: 260, height: 80 },
    });
  } finally {
    first.measureInWindow = firstMeasure;
    if (replacement && replacementMeasure) replacement.measureInWindow = replacementMeasure;
  }
});
