// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { I18nManager, Text, type TextInstance } from 'react-native';
import {
  TypographyContractExample,
  typographySourceVariants,
} from '../apps/native-catalog/TypographyContractExample';
import reference from './fixtures/mui-typography-9.5.0.json';
import { backendEdges } from './helpers/nativeInsetEdges';
beforeEach(() => {
  jest.replaceProperty(I18nManager, 'isRTL', false);
  jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', false);
});
afterEach(cleanup);
const receipt = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('type-contract-receipt').props.accessibilityLabel);
test('all thirteen selected variants use actual checked source metrics without scaling render units', () => {
  expect(typographySourceVariants).toHaveLength(13);
  const tree = render(<TypographyContractExample />);
  const seen = new Set<string>();
  for (let index = 0; index < 14; index++) {
    const data = receipt(tree);
    if (data.variant !== 'inherit') {
      const variant = data.variant as (typeof typographySourceVariants)[number]['variant'];
      const original = reference.cases[0].output[variant];
      if (!original) throw new Error('The checked default variant must exist.');
      expect(data.expected.fontSize).toBe(Number.parseFloat(String(original.fontSize)) * 16);
      seen.add(variant);
    }
    expect(tree.getByTestId('type-contract-selected')).toHaveStyle({
      fontSize: data.expected.fontSize,
      lineHeight: data.expected.fontSize * data.expected.lineHeight,
      marginBottom: data.expected.fontSize * 0.35,
    });
    expect(tree.getByTestId('type-contract-selected').props).toMatchObject({
      selectable: true,
      allowFontScaling: true,
      maxFontSizeMultiplier: 0,
    });
    fireEvent.press(tree.getByTestId('type-contract-next'));
  }
  expect(seen.size).toBe(13);
  for (const name of ['body1', 'caption', 'h6', 'inherit']) {
    fireEvent.press(tree.getByTestId(`type-contract-choose-${name}`));
    expect(receipt(tree).variant).toBe(name);
  }
});
test('actual classes and parent Menu CSS retain priority until a genuine native inline reset', () => {
  const tree = render(<TypographyContractExample />);
  expect(tree.getByTestId('type-contract-menu')).toHaveStyle({ color: '#264f78' });
  fireEvent.press(tree.getByTestId('type-contract-style'));
  expect(tree.getByTestId('type-contract-selected')).toHaveStyle({ paddingTop: 5, paddingLeft: 7 });
  fireEvent.press(tree.getByTestId('type-contract-rtl'));
  expect(tree.getByTestId('type-contract-selected')).toHaveStyle({ textAlign: 'left' });
  expect(tree.getByTestId('type-contract-paragraph')).toHaveStyle({ textAlign: 'right' });
  fireEvent.press(tree.getByTestId('type-contract-style'));
  expect(tree.getByTestId('type-contract-selected')).toHaveStyle({ textAlign: 'right' });
  for (const kind of ['margin', 'padding'] as const)
    expect(
      backendEdges(tree.getByTestId('type-contract-selected').props.style, kind, 'rtl', false),
    ).toEqual({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    });
  expect(tree.getByTestId('type-contract-menu')).toHaveStyle({ color: '#276749' });
  expect(tree.getByTestId('type-contract-nowrap').props).toMatchObject({
    numberOfLines: 1,
    ellipsizeMode: 'tail',
  });
});
test('live variants/style/direction retain actual Text roots, keyed child state and original native event fields', () => {
  const tree = render(<TypographyContractExample />);
  const keys = ['selected', 'custom', 'menu', 'paragraph', 'nowrap'];
  const host = (key: string) =>
    tree.UNSAFE_getAllByType(Text).find((node) => node.props.testID === `type-contract-${key}`)!
      .instance;
  const roots = keys.map(host);
  fireEvent.press(tree.getByTestId('type-contract-child'));
  fireEvent.press(tree.getByTestId('type-contract-next'));
  fireEvent.press(tree.getByTestId('type-contract-style'));
  fireEvent.press(tree.getByTestId('type-contract-rtl'));
  const event = { nativeEvent: { target: 29, pageX: 120, pageY: 220 }, timeStamp: 1234 };
  fireEvent.press(tree.getByTestId('type-contract-selected'), event);
  expect(receipt(tree).touch).toEqual({
    count: 1,
    target: 29,
    pageX: 120,
    pageY: 220,
    timestamp: 1234,
  });
  expect(receipt(tree).childCount).toBe(1);
  expect(tree.getByTestId('type-contract-child').props.accessibilityLabel).toBe('Count 1');
  for (const [index, key] of keys.entries()) {
    expect(host(key)).toBe(roots[index]);
    expect(receipt(tree).refs[key]).toEqual({ attached: 1, cleaned: 0, sameRoot: true });
  }
  // The RN Jest host does not implement Text's native ancestor provider. The
  // device collector separately requires virtual=true and custom=false.
  expect(receipt(tree).textKinds.custom).toBe(false);
  expect(typeof receipt(tree).textKinds.virtual).toBe('boolean');
});
test('native measurements reject obsolete layout/config callbacks and coalesce identical geometry', () => {
  const tree = render(<TypographyContractExample />);
  const host = tree
    .UNSAFE_getAllByType(Text)
    .find((node) => node.props.testID === 'type-contract-selected')!.instance as TextInstance;
  const pending: Parameters<TextInstance['measureInWindow']>[0][] = [];
  const measure = host.measureInWindow;
  host.measureInWindow = (callback) => pending.push(callback);
  const local = { x: 0, y: 0, width: 300, height: 24 };
  const layout = () =>
    fireEvent(tree.getByTestId('type-contract-selected'), 'layout', {
      nativeEvent: { layout: local },
    });
  try {
    layout();
    layout();
    act(() => pending[0](8, 80, 300, 24));
    expect(receipt(tree).receipts.selected).toBeUndefined();
    fireEvent.press(tree.getByTestId('type-contract-rtl'));
    fireEvent.press(tree.getByTestId('type-contract-rtl'));
    act(() => pending[1](8, 80, 300, 24));
    expect(receipt(tree).receipts.selected).toBeUndefined();
    layout();
    act(() => pending[2](8, 80, 300, 24));
    expect(receipt(tree).receipts.selected).toMatchObject({
      local,
      window: { x: 8, y: 80, width: 300, height: 24 },
    });
    const before = tree.getByTestId('type-contract-receipt').props.accessibilityLabel;
    layout();
    act(() => pending[3](8, 80, 300, 24));
    expect(tree.getByTestId('type-contract-receipt').props.accessibilityLabel).toBe(before);
  } finally {
    host.measureInWindow = measure;
  }
});
