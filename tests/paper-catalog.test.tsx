// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import {
  PaperContractExample,
  paperContractStates,
  paperContractKeys,
  paperNativeReset,
} from '../apps/native-catalog/PaperContractExample';
import source from './fixtures/mui-paper-9.5.0.json';
const receipt = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('paper-contract-receipt').props.accessibilityLabel);
const next = (tree: ReturnType<typeof render>) =>
  fireEvent.press(tree.getByTestId('paper-contract-next'));
const measure = (tree: ReturnType<typeof render>) =>
  fireEvent.press(tree.getByTestId('paper-contract-measure'));
const host = (tree: ReturnType<typeof render>, key: string) =>
  tree.UNSAFE_getAllByType(View).find((node) => node.props.testID === `paper-contract-${key}`)!
    .instance as ViewInstance;
const flat = (value: unknown) => StyleSheet.flatten(value as any) ?? {};
afterEach(cleanup);

test('finite scene covers every pinned dark elevation and explicit source/reset inputs', () => {
  expect(paperContractStates).toHaveLength(33);
  expect(paperContractStates.slice(4, 29).map((input) => input.elevation)).toEqual(
    source.dark.map((input) => input.elevation),
  );
  expect(paperContractStates.map((input) => input.name)).toEqual([
    'default',
    'outlined',
    'square',
    'light-zero',
    ...source.dark.map((input) => `dark-${input.elevation}`),
    'dark-square',
    'rtl-dark',
    'native-reset',
    'restored',
  ]);
  const tree = render(<PaperContractExample />);
  for (const [state, input] of paperContractStates.entries()) {
    expect(receipt(tree)).toMatchObject({
      schemaVersion: 1,
      state,
      input,
      sequenceLength: 33,
      fontScale: expect.any(Number),
      windowProfile: {
        width: expect.any(Number),
        height: expect.any(Number),
        scale: expect.any(Number),
      },
      authoredNativeReset: input.reset ? paperNativeReset : null,
    });
    for (const key of paperContractKeys) {
      const style = flat(tree.getByTestId(`paper-contract-${key}`).props.style);
      expect(style.minHeight).toBe(88);
      expect(style.height).toBeUndefined();
      expect(tree.getByTestId(`paper-contract-${key}-frame`).props.collapsable).toBe(false);
      if (input.reset) expect(style).toMatchObject(paperNativeReset);
      else {
        expect(style.padding).toBe(16);
        expect(style.backgroundColor).toBe(input.dark ? '#121212' : '#fff');
        expect(style.borderRadius).toBe(input.square ? undefined : 4);
        if (input.variant === 'elevation') {
          const original = source.dark.find((value) => value.elevation === input.elevation)!;
          expect(style.boxShadow).toBe(original.shadow);
          if (input.dark) {
            const color = `rgba(255, 255, 255, ${original.alpha})`;
            expect(style.backgroundImage).toEqual([
              { type: 'linear-gradient', colorStops: [{ color }, { color }] },
            ]);
          } else expect(style.backgroundImage).toBeUndefined();
        } else {
          expect(style.boxShadow).toBeUndefined();
          expect(style.backgroundImage).toBeUndefined();
          expect(style.borderWidth).toBe(1);
        }
      }
    }
    next(tree);
  }
  expect(receipt(tree).state).toBe(32);
});
test('both hosts, retained child counters and raw custom native callbacks survive all33updates', () => {
  const tree = render(<PaperContractExample />),
    roots = paperContractKeys.map((key) => host(tree, key));
  const onTouch = tree.getByTestId('paper-contract-custom').props.onTouchEnd;
  fireEvent.press(tree.getByTestId('paper-contract-counter'));
  fireEvent.press(tree.getByTestId('paper-contract-customtouch'));
  const event = { nativeEvent: { target: 29, pageX: 12, pageY: 34 }, timeStamp: 567 };
  fireEvent(tree.getByTestId('paper-contract-custom'), 'touchEnd', event);
  for (let state = 0; state < paperContractStates.length; state++) {
    expect(receipt(tree)).toMatchObject({
      count: 1,
      customCount: 1,
      touch: { count: 1, target: 29, pageX: 12, pageY: 34, timestamp: 567 },
    });
    expect(tree.getByTestId('paper-contract-counter').props.accessibilityLabel).toBe('Count 1');
    expect(tree.getByTestId('paper-contract-customtouch').props.accessibilityLabel).toBe(
      'Custom 1',
    );
    expect(tree.getByTestId('paper-contract-custom').props.onTouchEnd).toBe(onTouch);
    expect(tree.getByTestId('paper-contract-custom').props.accessibilityHint).toBe('quiet');
    for (const [index, key] of paperContractKeys.entries()) {
      expect(host(tree, key)).toBe(roots[index]);
      expect(receipt(tree).refs[key]).toEqual({
        attached: 1,
        cleaned: 0,
        generation: 1,
        sameRoot: true,
      });
    }
    next(tree);
  }
});
test('fresh requests reject superseded callbacks, old states and invalid frames for either key', () => {
  const tree = render(<PaperContractExample />);
  type Done = Parameters<ViewInstance['measureInWindow']>[0];
  const nodes = Object.fromEntries(
    paperContractKeys.map((key) => [key, host(tree, key)]),
  ) as Record<(typeof paperContractKeys)[number], ViewInstance>;
  const original = Object.fromEntries(
    paperContractKeys.map((key) => [key, nodes[key].measureInWindow]),
  );
  const pending: Record<(typeof paperContractKeys)[number], Done[]> = { stock: [], custom: [] };
  for (const key of paperContractKeys)
    nodes[key].measureInWindow = (callback) => pending[key].push(callback);
  try {
    measure(tree);
    measure(tree);
    act(() => {
      for (const key of paperContractKeys) pending[key][0](1, 2, 232, 88);
    });
    expect(receipt(tree).receipts).toEqual({});
    next(tree);
    act(() => {
      for (const key of paperContractKeys) pending[key][1](1, 2, 232, 88);
    });
    expect(receipt(tree).receipts).toEqual({});
    measure(tree);
    act(() => {
      pending.stock[2](NaN, 2, 232, 88);
      pending.custom[2](1, 2, 0, 88);
    });
    expect(receipt(tree).receipts).toEqual({});
    measure(tree);
    act(() => {
      for (const key of paperContractKeys) pending[key][3](1, 2, 232, 88);
    });
    for (const key of paperContractKeys)
      expect(receipt(tree).receipts[key]).toEqual({
        window: { x: 1, y: 2, width: 232, height: 88 },
        request: 4,
        state: 1,
        generation: 1,
      });
    measure(tree);
    expect(receipt(tree).receipts).toEqual({});
    act(() => {
      for (const key of paperContractKeys) pending[key][3](1, 2, 232, 88);
    });
    expect(receipt(tree).receipts).toEqual({});
    act(() => {
      for (const key of paperContractKeys) pending[key][4](1, 2, 232, 88);
    });
    for (const key of paperContractKeys) expect(receipt(tree).receipts[key].request).toBe(5);
  } finally {
    for (const key of paperContractKeys) nodes[key].measureInWindow = original[key];
  }
});
test('font/window profile changes invalidate pending receipts without remounts or font caps', () => {
  const initialWindow = Dimensions.get('window'),
    tree = render(<PaperContractExample />),
    node = host(tree, 'stock');
  const original = node.measureInWindow,
    pending: Parameters<ViewInstance['measureInWindow']>[0][] = [];
  node.measureInWindow = (callback) => pending.push(callback);
  try {
    measure(tree);
    act(() => Dimensions.set({ window: { ...initialWindow, fontScale: 3.571 } }));
    expect(receipt(tree).fontScale).toBe(3.571);
    act(() => pending[0](1, 2, 232, 100));
    expect(receipt(tree).receipts.stock).toBeUndefined();
    measure(tree);
    act(() =>
      Dimensions.set({
        window: { ...initialWindow, fontScale: 3.571, width: initialWindow.width - 1 },
      }),
    );
    act(() => pending[1](1, 2, 232, 100));
    expect(receipt(tree).receipts.stock).toBeUndefined();
    measure(tree);
    act(() => pending[2](1, 2, 231, 101));
    expect(receipt(tree).receipts.stock.request).toBe(3);
    expect(host(tree, 'stock')).toBe(node);
    expect(receipt(tree).refs.stock).toEqual({
      attached: 1,
      cleaned: 0,
      generation: 1,
      sameRoot: true,
    });
    for (const text of tree.UNSAFE_getAllByType(Text)) {
      expect(text.props.allowFontScaling).not.toBe(false);
      expect(
        text.props.maxFontSizeMultiplier == null || text.props.maxFontSizeMultiplier === 0,
      ).toBe(true);
    }
    for (const id of ['next', 'measure', 'counter', 'customtouch']) {
      const style = flat(tree.getByTestId(`paper-contract-${id}`).props.style);
      expect(style.height).toBeUndefined();
      expect(style.minHeight).toBe(44);
    }
    expect(
      tree.UNSAFE_getAllByType(View).some((view) => flat(view.props.style).flexWrap === 'wrap'),
    ).toBe(true);
  } finally {
    node.measureInWindow = original;
    cleanup();
    act(() => Dimensions.set({ window: initialWindow }));
  }
});
test('late native measurement completion after unmount is harmless and cannot create a receipt', () => {
  const tree = render(<PaperContractExample />),
    node = host(tree, 'stock'),
    original = node.measureInWindow;
  let done: Parameters<ViewInstance['measureInWindow']>[0] | undefined;
  node.measureInWindow = (callback) => {
    done = callback;
  };
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    measure(tree);
    expect(done).toBeDefined();
    tree.unmount();
    expect(() => act(() => done!(1, 2, 232, 88))).not.toThrow();
    expect(error).not.toHaveBeenCalled();
  } finally {
    node.measureInWindow = original;
    error.mockRestore();
  }
});
test.each([
  [Infinity, 0, 232, 88],
  [0, -Infinity, 232, 88],
  [0, 0, NaN, 88],
  [0, 0, 232, Infinity],
  [0, 0, -1, 88],
  [0, 0, 232, -1],
  [0, 0, 0, 88],
  [0, 0, 232, 0],
])('malformed native frame (%p,%p,%p,%p) is rejected', (x, y, width, height) => {
  const tree = render(<PaperContractExample />),
    node = host(tree, 'stock'),
    original = node.measureInWindow;
  node.measureInWindow = (callback) => callback(x, y, width, height);
  try {
    measure(tree);
    expect(receipt(tree).receipts.stock).toBeUndefined();
  } finally {
    node.measureInWindow = original;
  }
});
