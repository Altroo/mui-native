// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import * as RN from 'react-native';
import { FormGroupEventsExample } from '../apps/native-catalog/FormGroupEventsExample';

const kinds = ['native', 'stock', 'custom', 'styled'] as const;
beforeEach(() => {
  jest
    .spyOn(RN, 'findNodeHandle')
    .mockImplementation((node) => (typeof node === 'number' ? node : undefined));
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
const receipt = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('form-group-events-receipt').props.accessibilityLabel);

test('native and grouped event controls publish readiness without changing focus or inventing events', () => {
  const tree = render(<FormGroupEventsExample />);
  expect(receipt(tree)).toMatchObject({ ready: false, total: 0, entries: [] });
  for (const kind of kinds) {
    const node = tree.getByTestId(`form-group-events-${kind}`);
    expect(node.props).toMatchObject({
      focusable: true,
      accessible: true,
      tabIndex: 0,
      role: 'group',
      accessibilityActions: [{ name: 'inspect', label: 'Inspect control' }],
    });
    fireEvent(node, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 48 } } });
  }
  expect(receipt(tree)).toMatchObject({ ready: true, total: 0, entries: [] });
});

test.each(kinds)(
  '%s root records capture/bubble identity and synchronous target snapshots',
  (kind) => {
    const tree = render(<FormGroupEventsExample />);
    const root = tree.getByTestId(`form-group-events-${kind}`);
    const event = { target: 41, currentTarget: 41, nativeEvent: { target: 41 } };
    act(() => {
      root.props.onFocusCapture(event);
      root.props.onFocus(event);
    });
    // React changes currentTarget after dispatch; the receipt must remain scalar.
    event.currentTarget = 99;
    expect(receipt(tree).entries).toMatchObject([
      {
        sequence: 1,
        eventId: 1,
        kind,
        type: 'focus',
        phase: 'capture',
        target: 41,
        currentTarget: 41,
        nativeTarget: 41,
      },
      {
        sequence: 2,
        eventId: 1,
        kind,
        type: 'focus',
        phase: 'bubble',
        target: 41,
        currentTarget: 41,
        nativeTarget: 41,
      },
    ]);
    expect(receipt(tree).total).toBe(2);
  },
);

test('keyboard modifiers and custom accessibility actions are observed without changing their values', () => {
  const tree = render(<FormGroupEventsExample />);
  const root = tree.getByTestId('form-group-events-stock');
  const key = {
    target: 44,
    currentTarget: 44,
    nativeEvent: {
      key: 'ArrowDown',
      code: 'ArrowDown',
      altKey: false,
      ctrlKey: true,
      shiftKey: false,
      metaKey: false,
    },
  };
  act(() => {
    root.props.onKeyDownCapture(key);
    root.props.onKeyDown(key);
  });
  fireEvent(root, 'accessibilityAction', {
    target: 44,
    currentTarget: 44,
    nativeEvent: { actionName: 'inspect' },
  });
  expect(receipt(tree).entries).toMatchObject([
    {
      type: 'key-down',
      phase: 'capture',
      eventId: 1,
      key: 'ArrowDown',
      code: 'ArrowDown',
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      metaKey: false,
    },
    {
      type: 'key-down',
      phase: 'bubble',
      eventId: 1,
      key: 'ArrowDown',
      code: 'ArrowDown',
      ctrlKey: true,
    },
    { type: 'accessibility', phase: 'direct', eventId: 2, actionName: 'inspect' },
  ]);
});

test('reset clears only the callback history and preserves each root and caller handler', () => {
  const tree = render(<FormGroupEventsExample />);
  const roots = kinds.map((kind) => tree.getByTestId(`form-group-events-${kind}`));
  // The standard focus prop may wrap duplicate suppression. The private
  // transport retains the original caller callback on grouped roots.
  const callerFocus = (node: (typeof roots)[number]) => node.props.onMUIFocus ?? node.props.onFocus;
  const handlers = roots.map(callerFocus);
  fireEvent(roots[1], 'focus', { target: 45, currentTarget: 45, nativeEvent: { target: 45 } });
  fireEvent.press(tree.getByTestId('form-group-events-reset'));
  expect(receipt(tree)).toMatchObject({ total: 0, entries: [] });
  for (const [index, kind] of kinds.entries()) {
    const node = tree.getByTestId(`form-group-events-${kind}`);
    expect(node).toBe(roots[index]);
    expect(callerFocus(node)).toBe(handlers[index]);
    expect(receipt(tree).refs[kind]).toEqual({ attached: 1, cleaned: 0 });
  }
});

test('retained history is bounded and its total exposes any discarded entries', () => {
  const tree = render(<FormGroupEventsExample />);
  const root = tree.getByTestId('form-group-events-native');
  act(() => {
    for (let index = 0; index < 70; index++)
      root.props.onFocus({ target: 46, currentTarget: 46, nativeEvent: { target: 46 } });
  });
  const value = receipt(tree);
  expect(value.total).toBe(70);
  expect(value.entries).toHaveLength(64);
  expect(value.entries[0].sequence).toBe(7);
  expect(value.entries.at(-1).sequence).toBe(70);
});
