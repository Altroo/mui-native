// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
  type TextInstance,
  type ViewInstance,
} from 'react-native';
import { Box, Typography } from '../packages/material/src';
import {
  BoxContractExample,
  boxContractStates,
  boxContractKeys,
  boxNativeReset,
} from '../apps/native-catalog/BoxContractExample';
const receipt = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('box-contract-receipt').props.accessibilityLabel);
const next = (tree: ReturnType<typeof render>) =>
  fireEvent.press(tree.getByTestId('box-contract-next'));
const measure = (tree: ReturnType<typeof render>) =>
  fireEvent.press(tree.getByTestId('box-contract-measure'));
type Key = (typeof boxContractKeys)[number];
type Target = Key | `${Key}-text`;
type NativeNode = ViewInstance | TextInstance;
const targets = boxContractKeys.flatMap((key): Target[] => [key, `${key}-text`]);
const host = (tree: ReturnType<typeof render>, key: Target) =>
  (key.endsWith('-text') ? tree.UNSAFE_getAllByType(Text) : tree.UNSAFE_getAllByType(View)).find(
    (node) => node.props.testID === `box-contract-${key}`,
  )!.instance as NativeNode;
const flat = (value: unknown) => StyleSheet.flatten(value as any) ?? {};
afterEach(cleanup);

test('eleven finite authored cases exercise native root/style/text behavior without emitted paint claims', () => {
  expect(boxContractStates.map(({ name }) => name)).toEqual([
    'default',
    'ignored-config',
    'sx-array',
    'inline-final',
    'div-alias',
    'rtl-physical',
    'text-inheritance',
    'ancestor-styled',
    'explicit-theme',
    'native-reset',
    'restored',
  ]);
  const tree = render(<BoxContractExample />);
  const defaults = Object.fromEntries(
    boxContractKeys.map((key) => [key, flat(tree.getByTestId(`box-contract-${key}`).props.style)]),
  );
  for (const [state, input] of boxContractStates.entries()) {
    const data = receipt(tree);
    expect(data).toMatchObject({
      schemaVersion: 1,
      scenario: 'box-v1',
      state,
      input,
      sequenceLength: 11,
      fontScale: expect.any(Number),
      windowProfile: {
        width: expect.any(Number),
        height: expect.any(Number),
        scale: expect.any(Number),
      },
      authoredNativeReset: input.reset ? boxNativeReset : null,
    });
    expect(data).not.toHaveProperty('expectedPaint');
    expect(data).not.toHaveProperty('computedStyle');
    for (const key of boxContractKeys) {
      const style = flat(tree.getByTestId(`box-contract-${key}`).props.style),
        text = tree.getByTestId(`box-contract-${key}-text`);
      expect(style.minHeight).toBe(88);
      expect(style.height).toBeUndefined();
      expect(style.opacity).toBe(1);
      expect(tree.getByTestId(`box-contract-${key}-frame`).props.collapsable).toBe(false);
      expect(
        tree
          .UNSAFE_getAllByType(Typography)
          .find((node) => node.props.testID === `box-contract-${key}-text`)!.props.variant,
      ).toBe('inherit');
      expect(text).toHaveStyle({ letterSpacing: key === 'styled' ? 1 : undefined });
      if (
        input.name === 'default' ||
        input.name === 'ignored-config' ||
        input.name === 'restored'
      ) {
        expect(style).toEqual(defaults[key]);
        expect(style.padding).toBeUndefined();
        expect(text).toHaveStyle({ color: '#203247', fontSize: 16, lineHeight: 24 });
      } else if (input.name === 'sx-array') {
        expect(style).toMatchObject({
          padding: 16,
          backgroundColor: key === 'styled' ? '#0b5d44' : '#1565c0',
        });
        expect(text).toHaveStyle({ color: '#ffffff', fontSize: 18, lineHeight: 26 });
      } else if (input.name === 'inline-final') {
        expect(style).toMatchObject({ padding: 4, backgroundColor: '#243447' });
        expect(style.paddingLeft).toBeUndefined();
        expect(text).toHaveStyle({ color: '#f5f7fa', fontSize: 20, lineHeight: 28 });
      } else if (input.name === 'div-alias') expect(style.padding).toBe(8);
      else if (input.rtl)
        expect(style).toMatchObject({
          direction: 'rtl',
          marginLeft: 12,
          marginRight: 4,
          paddingLeft: 24,
          paddingRight: 8,
        });
      else if (input.name === 'text-inheritance') {
        expect(style.padding).toBe(8);
        expect(text).toHaveStyle({ color: '#7542a6', fontSize: 24, lineHeight: 32 });
      } else if (input.name === 'ancestor-styled') {
        expect(style.paddingLeft).toBe(20);
        expect(text).toHaveStyle({ color: '#6a1b9a' });
      } else if (input.explicitTheme) {
        expect(style.backgroundColor).toBe(
          key === 'custom' ? '#27384a' : key === 'styled' ? '#e8f0fa' : '#ffffff',
        );
        expect(text).toHaveStyle({
          color: key === 'custom' ? '#f5f7fa' : '#203247',
          fontSize: 16,
          lineHeight: 24,
        });
      } else if (input.reset) {
        expect(style).toMatchObject({
          padding: 0,
          margin: 0,
          borderWidth: 0,
          backgroundColor: '#243447',
        });
        expect(style.paddingLeft).toBeUndefined();
        expect(text).toHaveStyle({ color: '#f5f7fa', fontSize: 16, lineHeight: 24 });
      }
      if (key === 'styled' && !input.reset) expect(style.borderWidth).toBe(2);
    }
    next(tree);
  }
  expect(receipt(tree).state).toBe(10);
});
test('three real counters, native root/text refs and first raw custom event survive all retained updates', () => {
  const tree = render(<BoxContractExample />),
    nodes = targets.map((key) => host(tree, key));
  for (const key of boxContractKeys)
    fireEvent.press(tree.getByTestId(`box-contract-${key}-counter`));
  const touch = tree.getByTestId('box-contract-custom').props.onTouchEnd;
  const first = { nativeEvent: { target: 29, pageX: 12, pageY: 34 }, timeStamp: 567 };
  act(() => {
    touch(first);
    first.nativeEvent.target = 99;
    first.nativeEvent.pageX = 88;
    first.nativeEvent.pageY = 77;
    first.timeStamp = 666;
    touch({ nativeEvent: { target: 30, pageX: 56, pageY: 78 }, timeStamp: 789 });
  });
  for (let state = 0; state < boxContractStates.length; state++) {
    expect(receipt(tree)).toMatchObject({
      counts: { stock: 1, custom: 1, styled: 1 },
      touch: { count: 1, target: 29, pageX: 12, pageY: 34, timestamp: 567 },
    });
    expect(tree.getByTestId('box-contract-custom').props.onTouchEnd).toBe(touch);
    expect(tree.getByTestId('box-contract-custom').props.accessibilityHint).toBe('quiet');
    for (const [index, key] of targets.entries()) expect(host(tree, key)).toBe(nodes[index]);
    for (const key of boxContractKeys) {
      expect(tree.getByTestId(`box-contract-${key}-counter`).props.accessibilityLabel).toBe(
        `${key} 1`,
      );
      for (const name of ['refs', 'textRefs'])
        expect(receipt(tree)[name][key]).toEqual({
          attached: 1,
          cleaned: 0,
          generation: 1,
          sameRoot: true,
        });
    }
    next(tree);
  }
  fireEvent(tree.getByTestId('box-contract-custom'), 'touchEnd', {
    nativeEvent: { target: 650, pageX: 201, pageY: 757.666 },
    timeStamp: 32672476.631917,
  });
  expect(receipt(tree).touch).toEqual({
    count: 1,
    target: 29,
    pageX: 12,
    pageY: 34,
    timestamp: 567,
  });
  expect(receipt(tree).counts).toEqual({ stock: 1, custom: 1, styled: 1 });
});
test('all six measured targets reject superseded requests and old states, then publish distinct raw frames', () => {
  const tree = render(<BoxContractExample />);
  type Done = Parameters<NativeNode['measureInWindow']>[0];
  const nodes = Object.fromEntries(targets.map((key) => [key, host(tree, key)])) as Record<
      Target,
      NativeNode
    >,
    originals = Object.fromEntries(targets.map((key) => [key, nodes[key].measureInWindow]));
  const pending = Object.fromEntries(targets.map((key) => [key, [] as Done[]])) as Record<
    Target,
    Done[]
  >;
  for (const key of targets)
    nodes[key].measureInWindow = (done) => {
      pending[key].push(done);
    };
  try {
    measure(tree);
    measure(tree);
    act(() => {
      for (const key of targets) pending[key][0](1, 2, 232, 88);
    });
    expect(receipt(tree).receipts).toEqual({});
    expect(receipt(tree).textReceipts).toEqual({});
    next(tree);
    act(() => {
      for (const key of targets) pending[key][1](1, 2, 232, 88);
    });
    expect(receipt(tree).receipts).toEqual({});
    expect(receipt(tree).textReceipts).toEqual({});
    measure(tree);
    act(() => {
      for (const key of targets)
        pending[key][2](
          key.endsWith('-text') ? 17 : 1,
          key.endsWith('-text') ? 46 : 2,
          key.endsWith('-text') ? 200 : 232,
          key.endsWith('-text') ? 24 : 88,
        );
    });
    for (const key of boxContractKeys) {
      expect(receipt(tree).receipts[key]).toEqual({
        window: { x: 1, y: 2, width: 232, height: 88 },
        state: 1,
        request: 3,
        generation: 1,
      });
      expect(receipt(tree).textReceipts[key]).toEqual({
        window: { x: 17, y: 46, width: 200, height: 24 },
        state: 1,
        request: 3,
        generation: 1,
      });
    }
    measure(tree);
    expect(receipt(tree).receipts).toEqual({});
    expect(receipt(tree).textReceipts).toEqual({});
    act(() => {
      for (const key of targets) pending[key][2](1, 2, 232, 88);
    });
    expect(receipt(tree).receipts).toEqual({});
    expect(receipt(tree).textReceipts).toEqual({});
  } finally {
    for (const key of targets) nodes[key].measureInWindow = originals[key];
  }
});
test('profile and real counter changes invalidate both root and inherited-text pending measurements', () => {
  const initial = Dimensions.get('window'),
    tree = render(<BoxContractExample />),
    node = host(tree, 'stock'),
    text = host(tree, 'stock-text');
  const original = node.measureInWindow,
    originalText = text.measureInWindow;
  const roots: Parameters<NativeNode['measureInWindow']>[0][] = [],
    copies: Parameters<NativeNode['measureInWindow']>[0][] = [];
  node.measureInWindow = (done) => {
    roots.push(done);
  };
  text.measureInWindow = (done) => {
    copies.push(done);
  };
  const reject = (index: number) => {
    act(() => {
      roots[index](1, 2, 232, 88);
      copies[index](1, 46, 232, 24);
    });
    expect(receipt(tree).receipts.stock).toBeUndefined();
    expect(receipt(tree).textReceipts.stock).toBeUndefined();
  };
  try {
    measure(tree);
    act(() => Dimensions.set({ window: { ...initial, fontScale: 3.571 } }));
    reject(0);
    expect(receipt(tree).fontScale).toBe(3.571);
    measure(tree);
    act(() =>
      Dimensions.set({
        window: {
          ...initial,
          fontScale: 3.571,
          width: initial.width - 1,
          height: initial.height - 1,
          scale: initial.scale + 1,
        },
      }),
    );
    reject(1);
    measure(tree);
    fireEvent.press(tree.getByTestId('box-contract-stock-counter'));
    reject(2);
    measure(tree);
    act(() => {
      roots[3](1, 2, 231, 188);
      copies[3](1, 100, 231, 86);
    });
    expect(receipt(tree).receipts.stock.request).toBe(4);
    expect(receipt(tree).textReceipts.stock.request).toBe(4);
    expect(host(tree, 'stock')).toBe(node);
    expect(host(tree, 'stock-text')).toBe(text);
    for (const label of tree.UNSAFE_getAllByType(Text)) {
      expect(label.props.allowFontScaling).not.toBe(false);
      expect(
        label.props.maxFontSizeMultiplier == null || label.props.maxFontSizeMultiplier === 0,
      ).toBe(true);
    }
    for (const id of ['next', 'measure', ...boxContractKeys.map((key) => `${key}-counter`)]) {
      const style = flat(tree.getByTestId(`box-contract-${id}`).props.style);
      expect(style.minHeight).toBe(44);
      expect(style.height).toBeUndefined();
    }
  } finally {
    node.measureInWindow = original;
    text.measureInWindow = originalText;
    cleanup();
    act(() => Dimensions.set({ window: initial }));
  }
});
test('a released/rebound public root ref invalidates old ownership generations', () => {
  const tree = render(<BoxContractExample />),
    node = host(tree, 'stock'),
    original = node.measureInWindow;
  const pending: Parameters<NativeNode['measureInWindow']>[0][] = [];
  node.measureInWindow = (done) => {
    pending.push(done);
  };
  const targetRef = tree
    .UNSAFE_getAllByType(Box)
    .find((item) => item.props.testID === 'box-contract-stock')!.props.ref;
  try {
    measure(tree);
    act(() => targetRef(null));
    act(() => pending[0](1, 2, 232, 88));
    expect(receipt(tree).receipts.stock).toBeUndefined();
    expect(receipt(tree).refs.stock).toEqual({
      attached: 1,
      cleaned: 1,
      generation: 2,
      sameRoot: false,
    });
    act(() => targetRef(node));
    measure(tree);
    act(() => pending[0](1, 2, 232, 88));
    expect(receipt(tree).receipts.stock).toBeUndefined();
    act(() => pending[1](1, 2, 232, 88));
    expect(receipt(tree).receipts.stock.generation).toBe(3);
    expect(receipt(tree).refs.stock).toEqual({
      attached: 2,
      cleaned: 1,
      generation: 3,
      sameRoot: true,
    });
  } finally {
    node.measureInWindow = original;
  }
});
test('late native root/text callbacks after unmount cannot publish or warn', () => {
  const tree = render(<BoxContractExample />),
    nodes = targets.map((key) => host(tree, key)),
    original = nodes.map((node) => node.measureInWindow),
    pending: Parameters<NativeNode['measureInWindow']>[0][] = [];
  for (const node of nodes)
    node.measureInWindow = (done) => {
      pending.push(done);
    };
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    measure(tree);
    expect(pending).toHaveLength(6);
    tree.unmount();
    expect(() =>
      act(() => {
        for (const done of pending) done(1, 2, 232, 88);
      }),
    ).not.toThrow();
    expect(error).not.toHaveBeenCalled();
  } finally {
    nodes.forEach((node, index) => {
      node.measureInWindow = original[index];
    });
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
])('invalid native root/text frame (%p,%p,%p,%p) fails closed', (x, y, width, height) => {
  const tree = render(<BoxContractExample />),
    nodes = targets.map((key) => host(tree, key)),
    original = nodes.map((node) => node.measureInWindow);
  for (const node of nodes)
    node.measureInWindow = (done) => {
      done(x, y, width, height);
    };
  try {
    measure(tree);
    expect(receipt(tree).receipts).toEqual({});
    expect(receipt(tree).textReceipts).toEqual({});
  } finally {
    nodes.forEach((node, index) => {
      node.measureInWindow = original[index];
    });
  }
});
