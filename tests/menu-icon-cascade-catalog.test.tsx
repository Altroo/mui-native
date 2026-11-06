// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
jest.mock('@mui/icons-material/Check', () => jest.requireActual('../packages/icons/src/Check'), {
  virtual: true,
});
import { useCallback } from 'react';
import { View, Text, type ViewInstance, type MeasureInWindowOnSuccessCallback } from 'react-native';
import Svg from 'react-native-svg';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '../packages/material/src';
import {
  MenuIconCascadeExample,
  useMenuIconMeasurements,
} from '../apps/native-catalog/MenuIconCascadeExample';
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
const receipt = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('menu-style-receipt').props.accessibilityLabel);
function glyph(tree: ReturnType<typeof render>, name: string) {
  return tree
    .UNSAFE_getAllByType(Svg)
    .find((node) => node.props.testID === `menu-style-${name}-glyph`)!;
}
test('the scene exposes parent specificity, final inline styles and dense rem calibration while keeping refs and child state', () => {
  const tree = render(<MenuIconCascadeExample />);
  const initial = receipt(tree);
  expect(tree.getByTestId('menu-style-parent-root')).toHaveStyle({ minWidth: 56 });
  expect(glyph(tree, 'parent').props).toMatchObject({ width: 31, height: 31, color: '#2f6f4f' });
  expect(tree.getByTestId('menu-style-inline-root')).toHaveStyle({ minWidth: 84 });
  expect(glyph(tree, 'inline').props).toMatchObject({ width: 40, height: 40, color: '#204e9c' });
  expect(glyph(tree, 'dense').props.width).toBe(20);
  fireEvent.press(tree.getByTestId('menu-style-parent-row'));
  fireEvent.press(tree.getByTestId('menu-style-class'));
  expect(tree.getByTestId('menu-style-parent-root')).toHaveStyle({ minWidth: 68 });
  expect(glyph(tree, 'parent').props).toMatchObject({ width: 35, color: '#8f3f71' });
  fireEvent.press(tree.getByTestId('menu-style-selected'));
  expect(tree.getByTestId('menu-style-parent-root')).toHaveStyle({ minWidth: 72 });
  expect(glyph(tree, 'parent').props).toMatchObject({ width: 37, color: '#2b667e' });
  fireEvent.press(tree.getByTestId('menu-style-root'));
  expect(glyph(tree, 'dense').props.width).toBe(30);
  expect(glyph(tree, 'inline').props.width).toBe(40);
  expect(receipt(tree)).toMatchObject({
    cssRoot: 24,
    accent: true,
    selected: true,
    counts: { parent: 1 },
  });
  expect(receipt(tree).refs).toEqual(initial.refs);
  expect(receipt(tree).refRevision).toBe(initial.refRevision);
  fireEvent.press(tree.getByTestId('menu-style-selected'));
  fireEvent.press(tree.getByTestId('menu-style-class'));
  fireEvent.press(tree.getByTestId('menu-style-root'));
  expect(glyph(tree, 'parent').props.width).toBe(31);
  expect(glyph(tree, 'dense').props.width).toBe(20);
  expect(receipt(tree).counts.parent).toBe(1);
});
test('largest-profile controls shorten their labels while native text remains uncapped and vectors remain authored units', () => {
  jest
    .spyOn(require('react-native'), 'useWindowDimensions')
    .mockReturnValue({ width: 393, height: 852, scale: 3, fontScale: 3.57 });
  const tree = render(<MenuIconCascadeExample />);
  expect(tree.getByTestId('menu-style-class')).toHaveTextContent('Class');
  expect(tree.getByTestId('menu-style-measure')).toHaveTextContent('Measure');
  for (const name of ['class', 'selected', 'root', 'measure'])
    expect(tree.getByTestId('menu-style-' + name)).toHaveStyle({ minHeight: 44 });
  expect(glyph(tree, 'dense').props.width).toBe(20);
  fireEvent.press(tree.getByTestId('menu-style-root'));
  expect(glyph(tree, 'dense').props.width).toBe(30);
  expect(receipt(tree).fontScale).toBe(3.57);
});
test('the scene inherits its enclosing dark palette', () => {
  const theme = createTheme({ palette: { mode: 'dark' } });
  const tree = render(
    <ThemeProvider theme={theme}>
      <MenuIconCascadeExample />
    </ThemeProvider>,
  );
  expect(tree.getByTestId('menu-style-heading')).toHaveStyle({
    color: theme.palette.text.primary,
  });
});
test('real host replacement with identical bounds publishes a new ref revision and rejects the old asynchronous measure', () => {
  let target: ViewInstance | null = null;
  let current: ReturnType<typeof useMenuIconMeasurements>;
  function Harness({ version }: { version: number }) {
    const state = useMenuIconMeasurements();
    current = state;
    const attach = useCallback(
      (node: ViewInstance | null) => {
        target = node;
        return state.refs['parent-root'](node);
      },
      [state.refs],
    );
    return (
      <>
        <View
          key={version}
          testID="owned-host"
          ref={attach}
          onLayout={state.layouts['parent-root']}
        />
        <Text testID="own-metadata">
          {JSON.stringify({
            receipts: state.receipts,
            revision: state.refRevision,
            refs: state.refsSnapshot,
          })}
        </Text>
      </>
    );
  }
  const tree = render(<Harness version={0} />);
  const first = target!;
  const pending: MeasureInWindowOnSuccessCallback[] = [];
  jest.spyOn(first, 'measureInWindow').mockImplementation((callback) => {
    pending.push(callback);
  });
  const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 56, height: 31 } } };
  fireEvent(tree.getByTestId('owned-host'), 'layout', layout);
  const before = current!.refRevision;
  tree.rerender(<Harness version={1} />);
  expect(target).not.toBe(first);
  expect(current!.refRevision).toBeGreaterThan(before);
  const fresh: MeasureInWindowOnSuccessCallback[] = [];
  jest.spyOn(target!, 'measureInWindow').mockImplementation((callback) => {
    fresh.push(callback);
  });
  act(() => current!.measureAll());
  act(() => fresh.at(-1)!(10, 20, 56, 31));
  const valid = current!.receipts['parent-root'];
  expect(valid?.window).toEqual({ x: 10, y: 20, width: 56, height: 31 });
  act(() => pending[0](99, 99, 56, 31));
  expect(current!.receipts['parent-root']).toBe(valid);
  act(() => current!.measureAll());
  act(() => fresh.at(-1)!(0, 0, Number.NaN, 31));
  expect(current!.receipts['parent-root']?.window).toBeUndefined();
  expect(current!.receipts['parent-root']?.error).toContain('nonfinite');
  act(() => current!.measureAll());
  act(() => fresh.at(-1)!(10, 20, 56, 31));
  expect(current!.refsSnapshot['parent-root']).toMatchObject({
    attached: 2,
    cleaned: 1,
    sameRoot: false,
  });
  fireEvent(tree.getByTestId('owned-host'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 0, height: 0 } },
  });
  expect(current!.receipts['parent-root']).toBeUndefined();
  act(() => fresh.at(-1)!(11, 21, 56, 31));
  expect(current!.receipts['parent-root']).toBeUndefined();
  tree.unmount();
  act(() => pending[0](99, 99, 56, 31));
});

test('manual measurement acknowledges the real control without inventing native receipts', () => {
  const tree = render(<MenuIconCascadeExample />);
  const before = receipt(tree);
  expect(before.measureRequests).toBe(0);
  fireEvent.press(tree.getByTestId('menu-style-measure'));
  expect(receipt(tree).measureRequests).toBe(1);
  expect(receipt(tree).receipts).toEqual(before.receipts);
  fireEvent.press(tree.getByTestId('menu-style-measure'));
  expect(receipt(tree).measureRequests).toBe(2);
});
