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
import { Card, Typography, createTheme } from '../packages/material/src';
import {
  CardContractExample,
  cardContractStates,
  cardContractKeys,
  cardNativeReset,
  cardProbeKeys,
  cardProbeInputs,
} from '../apps/native-catalog/CardContractExample';
const receipt = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('card-contract-receipt').props.accessibilityLabel);
const next = (tree: ReturnType<typeof render>) =>
  fireEvent.press(tree.getByTestId('card-contract-next'));
const measure = (tree: ReturnType<typeof render>) =>
  fireEvent.press(tree.getByTestId('card-contract-measure'));
type Key = (typeof cardContractKeys)[number];
type ProbeKey = (typeof cardProbeKeys)[number];
type Target = Key | `${Key}-text` | `probe-${ProbeKey}`;
type NativeNode = ViewInstance | TextInstance;
const targets: Target[] = [
  ...cardContractKeys.flatMap((key): Target[] => [key, `${key}-text`]),
  ...cardProbeKeys.map((key): Target => `probe-${key}`),
];
const host = (tree: ReturnType<typeof render>, key: Target) =>
  (key.endsWith('-text') ? tree.UNSAFE_getAllByType(Text) : tree.UNSAFE_getAllByType(View)).find(
    (node) =>
      node.props.testID ===
      (key === 'probe-as' ? 'card-contract-probe-as-alternate' : `card-contract-${key}`),
  )!.instance as NativeNode;
const flat = (value: unknown) => StyleSheet.flatten(value as any) ?? {};
afterEach(cleanup);

test('two real counters, native root/text refs and first raw custom event survive all retained updates', () => {
  const tree = render(<CardContractExample />),
    nodes = targets.map((key) => host(tree, key));
  for (const key of cardContractKeys)
    fireEvent.press(tree.getByTestId(`card-contract-${key}-counter`));
  const touch = tree.getByTestId('card-contract-custom').props.onTouchEnd;
  const first = { nativeEvent: { target: 29, pageX: 12, pageY: 34 }, timeStamp: 567 };
  act(() => {
    touch(first);
    first.nativeEvent.target = 99;
    first.nativeEvent.pageX = 88;
    first.nativeEvent.pageY = 77;
    first.timeStamp = 666;
    touch({ nativeEvent: { target: 30, pageX: 56, pageY: 78 }, timeStamp: 789 });
  });
  for (let state = 0; state < cardContractStates.length; state++) {
    expect(receipt(tree)).toMatchObject({
      counts: { stock: 1, custom: 1 },
      touch: { count: 1, target: 29, pageX: 12, pageY: 34, timestamp: 567 },
    });
    for (const key of cardProbeKeys)
      expect(receipt(tree).probeRefs[key]).toEqual({
        attached: 1,
        cleaned: 0,
        generation: 1,
        sameRoot: true,
      });
    expect(tree.getByTestId('card-contract-custom').props.onTouchEnd).toBe(touch);
    expect(tree.getByTestId('card-contract-custom').props.accessibilityHint).toBe('quiet');
    for (const [index, key] of targets.entries()) expect(host(tree, key)).toBe(nodes[index]);
    for (const key of cardContractKeys) {
      expect(tree.getByTestId(`card-contract-${key}-counter`).props.accessibilityLabel).toBe(
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
  fireEvent(tree.getByTestId('card-contract-custom'), 'touchEnd', {
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
  expect(receipt(tree).counts).toEqual({ stock: 1, custom: 1 });
});
test('all four measured targets reject superseded requests and old states, then publish distinct raw frames', () => {
  const tree = render(<CardContractExample />);
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
    expect(receipt(tree).probeReceipts).toEqual({});
    next(tree);
    act(() => {
      for (const key of targets) pending[key][1](1, 2, 232, 88);
    });
    expect(receipt(tree).receipts).toEqual({});
    expect(receipt(tree).textReceipts).toEqual({});
    expect(receipt(tree).probeReceipts).toEqual({});
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
    for (const key of cardContractKeys) {
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
    for (const key of cardProbeKeys)
      expect(receipt(tree).probeReceipts[key]).toEqual({
        window: { x: 1, y: 2, width: 232, height: 88 },
        state: 1,
        request: 3,
        generation: 1,
      });
    measure(tree);
    expect(receipt(tree).receipts).toEqual({});
    expect(receipt(tree).textReceipts).toEqual({});
    expect(receipt(tree).probeReceipts).toEqual({});
    act(() => {
      for (const key of targets) pending[key][2](1, 2, 232, 88);
    });
    expect(receipt(tree).receipts).toEqual({});
    expect(receipt(tree).textReceipts).toEqual({});
    expect(receipt(tree).probeReceipts).toEqual({});
  } finally {
    for (const key of targets) nodes[key].measureInWindow = originals[key];
  }
});
test('profile and real counter changes invalidate root/text/probe pending measurements', () => {
  const initial = Dimensions.get('window'),
    tree = render(<CardContractExample />),
    node = host(tree, 'stock'),
    text = host(tree, 'stock-text'),
    probe = host(tree, 'probe-theme');
  const original = node.measureInWindow,
    originalText = text.measureInWindow,
    originalProbe = probe.measureInWindow;
  const roots: Parameters<NativeNode['measureInWindow']>[0][] = [],
    copies: Parameters<NativeNode['measureInWindow']>[0][] = [],
    probes: Parameters<NativeNode['measureInWindow']>[0][] = [];
  node.measureInWindow = (done) => {
    roots.push(done);
  };
  text.measureInWindow = (done) => {
    copies.push(done);
  };
  probe.measureInWindow = (done) => {
    probes.push(done);
  };
  const reject = (index: number) => {
    act(() => {
      roots[index](1, 2, 232, 88);
      copies[index](1, 46, 232, 24);
      probes[index](1, 2, 80, 44);
    });
    expect(receipt(tree).receipts.stock).toBeUndefined();
    expect(receipt(tree).textReceipts.stock).toBeUndefined();
    expect(receipt(tree).probeReceipts.theme).toBeUndefined();
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
    fireEvent.press(tree.getByTestId('card-contract-stock-counter'));
    reject(2);
    measure(tree);
    act(() => {
      roots[3](1, 2, 231, 188);
      copies[3](1, 100, 231, 86);
      probes[3](1, 2, 80, 44);
    });
    expect(receipt(tree).receipts.stock.request).toBe(4);
    expect(receipt(tree).textReceipts.stock.request).toBe(4);
    expect(receipt(tree).probeReceipts.theme.request).toBe(4);
    expect(host(tree, 'probe-theme')).toBe(probe);
    expect(host(tree, 'stock')).toBe(node);
    expect(host(tree, 'stock-text')).toBe(text);
    for (const label of tree.UNSAFE_getAllByType(Text)) {
      expect(label.props.allowFontScaling).not.toBe(false);
      expect(
        label.props.maxFontSizeMultiplier == null || label.props.maxFontSizeMultiplier === 0,
      ).toBe(true);
    }
    for (const id of ['next', 'measure', ...cardContractKeys.map((key) => `${key}-counter`)]) {
      const style = flat(tree.getByTestId(`card-contract-${id}`).props.style);
      expect(style.minHeight).toBe(44);
      expect(style.height).toBeUndefined();
    }
  } finally {
    node.measureInWindow = original;
    text.measureInWindow = originalText;
    probe.measureInWindow = originalProbe;
    cleanup();
    act(() => Dimensions.set({ window: initial }));
  }
});
test.each(targets)(
  'a released/rebound %s ref invalidates only its old ownership generation',
  (target) => {
    const tree = render(<CardContractExample />),
      node = host(tree, target),
      original = node.measureInWindow;
    const pending: Parameters<NativeNode['measureInWindow']>[0][] = [];
    node.measureInWindow = (done) => {
      pending.push(done);
    };
    const text = target.endsWith('-text'),
      probe = target.startsWith('probe-'),
      key = (probe ? target.slice(6) : target.replace(/-text$/, '')) as Key | ProbeKey;
    const items = text ? tree.UNSAFE_getAllByType(Typography) : tree.UNSAFE_getAllByType(Card);
    const targetRef = items.find((item) => item.props.testID === `card-contract-${target}`)!.props
      .ref;
    const observations = probe ? 'probeReceipts' : text ? 'textReceipts' : 'receipts',
      lifecycle = probe ? 'probeRefs' : text ? 'textRefs' : 'refs';
    try {
      measure(tree);
      act(() => targetRef(null));
      act(() => pending[0](1, 2, 232, 88));
      expect(receipt(tree)[observations][key]).toBeUndefined();
      expect(receipt(tree)[lifecycle][key]).toEqual({
        attached: 1,
        cleaned: 1,
        generation: 2,
        sameRoot: false,
      });
      act(() => targetRef(node));
      measure(tree);
      act(() => pending[0](1, 2, 232, 88));
      expect(receipt(tree)[observations][key]).toBeUndefined();
      act(() => pending[1](1, 2, 232, 88));
      expect(receipt(tree)[observations][key].generation).toBe(3);
      expect(receipt(tree)[lifecycle][key]).toEqual({
        attached: 2,
        cleaned: 1,
        generation: 3,
        sameRoot: true,
      });
    } finally {
      node.measureInWindow = original;
    }
  },
);
test('late native root/text callbacks after unmount cannot publish or warn', () => {
  const tree = render(<CardContractExample />),
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
    expect(pending).toHaveLength(7);
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
  const tree = render(<CardContractExample />),
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
    expect(receipt(tree).probeReceipts).toEqual({});
  } finally {
    nodes.forEach((node, index) => {
      node.measureInWindow = original[index];
    });
  }
});
test('thirteen source-driven Card inputs match the separate authored protocol without a scene paint oracle', () => {
  const names = [
    'default',
    'raised',
    'explicit-zero',
    'explicit-three',
    'explicit-undefined',
    'paper-default',
    'card-default',
    'dark-raised',
    'outlined-raised',
    'square',
    'theme-sx',
    'native-reset',
    'restored',
  ];
  const elevations = [1, 8, 0, 3, 1, 5, 3, 8, 8, 1, 8, 8, 1];
  expect(cardContractStates.map(({ name }) => name)).toEqual(names);
  const tree = render(<CardContractExample />),
    defaults = flat(tree.getByTestId('card-contract-stock').props.style);
  for (const [state, input] of cardContractStates.entries()) {
    const data = receipt(tree);
    expect(data).toMatchObject({
      schemaVersion: 1,
      scenario: 'card-v1',
      state,
      input,
      sequenceLength: 13,
      fontScale: expect.any(Number),
      windowProfile: {
        width: expect.any(Number),
        height: expect.any(Number),
        scale: expect.any(Number),
      },
      authoredNativeReset: input.nativeReset ? cardNativeReset : null,
    });
    expect(Object.keys(data).sort()).toEqual(
      [
        'schemaVersion',
        'scenario',
        'state',
        'input',
        'sequenceLength',
        'fontScale',
        'windowProfile',
        'counts',
        'request',
        'receipts',
        'textReceipts',
        'refRevision',
        'authoredNativeReset',
        'refs',
        'textRefs',
        'authoredProbeInputs',
        'probeRefs',
        'probeReceipts',
      ].sort(),
    );
    expect(data).not.toHaveProperty('expectedPaint');
    expect(data).not.toHaveProperty('computedStyle');
    for (const key of cardContractKeys) {
      const style = flat(tree.getByTestId(`card-contract-${key}`).props.style),
        copy = tree.getByTestId(`card-contract-${key}-text`),
        card = tree
          .UNSAFE_getAllByType(Card)
          .find((node) => node.props.testID === `card-contract-${key}`)!;
      expect(style).toMatchObject({ minHeight: 88, padding: 16, overflow: 'hidden' });
      expect(style.height).toBeUndefined();
      expect(style.maxHeight).toBeUndefined();
      expect(style.opacity).toBeUndefined();
      expect(style.borderRadius ?? 0).toBe(input.nativeReset ? 2 : input.square ? 0 : 4);
      expect(style.borderWidth ?? 0).toBe(input.outlined ? 1 : 0);
      expect(style.backgroundColor).toBe(
        input.nativeReset
          ? '#243447'
          : input.themeSx
            ? '#0b5d44'
            : input.dark
              ? '#121212'
              : '#ffffff',
      );
      expect(style.boxShadow).toBe(
        input.nativeReset
          ? 'none'
          : input.outlined
            ? undefined
            : createTheme().shadows[elevations[state]],
      );
      if (input.nativeReset) expect(style.backgroundImage).toEqual([]);
      else if (input.dark)
        expect(style.backgroundImage).toEqual([
          {
            type: 'linear-gradient',
            colorStops: [
              { color: 'rgba(255, 255, 255, 0.119)' },
              { color: 'rgba(255, 255, 255, 0.119)' },
            ],
          },
        ]);
      else expect(style.backgroundImage).toBeUndefined();
      expect(copy).toHaveStyle({
        color: input.nativeReset ? '#f5f7fa' : input.themeSx || input.dark ? '#ffffff' : '#203247',
        fontSize: input.nativeReset ? 22 : input.themeSx ? 18 : 16,
        lineHeight: input.nativeReset ? 30 : input.themeSx ? 26 : 24,
      });
      expect(
        tree
          .UNSAFE_getAllByType(Typography)
          .find((node) => node.props.testID === `card-contract-${key}-text`)!.props.variant,
      ).toBe('inherit');
      expect(Object.hasOwn(card.props, 'elevation')).toBe(input.elevationInput !== 'absent');
      if (input.elevationInput === 'undefined') expect(card.props.elevation).toBeUndefined();
      expect(Object.hasOwn(card.props, 'raised')).toBe(input.raisedInput !== 'absent');
      expect(tree.getByTestId(`card-contract-${key}-frame`).props.collapsable).toBe(false);
    }
    const custom = tree
      .UNSAFE_getAllByType(Card)
      .find((node) => node.props.testID === 'card-contract-custom')!.props.component;
    const expected = [
      'MuiPaper-root',
      ...(input.paperDefault ? ['qa-paper-default'] : []),
      input.outlined ? 'MuiPaper-outlined' : 'MuiPaper-elevation',
      ...(!input.square ? ['MuiPaper-rounded'] : []),
      ...(!input.outlined ? [`MuiPaper-elevation${elevations[state]}`] : []),
      'MuiCard-root',
      ...(input.cardDefault ? ['qa-card-default'] : []),
    ].join(' ');
    expect(tree.UNSAFE_getByType(custom).props.className).toBe(expected);
    if (state === 12)
      expect(flat(tree.getByTestId('card-contract-stock').props.style)).toEqual(defaults);
    next(tree);
  }
  expect(receipt(tree).state).toBe(12);
});
test('real measurement updaters recheck freshness when React evaluates them after a stage commit', () => {
  // Prime RN's lazy host imports before observing React's receipt setters.
  const primed = render(<CardContractExample />);
  primed.unmount();
  const React = jest.requireActual<typeof import('react')>('react');
  const originalUseState = React.useState,
    queued: ((previous: Record<string, unknown>) => unknown)[] = [];
  let hold = false;
  const spy = jest.spyOn(React, 'useState').mockImplementation(((initial: unknown) => {
    const result = originalUseState(initial);
    if (
      initial &&
      typeof initial === 'object' &&
      !Array.isArray(initial) &&
      Object.keys(initial).length === 0
    ) {
      return [
        result[0],
        (action: unknown) => {
          if (hold && typeof action === 'function') {
            queued.push(action as (previous: Record<string, unknown>) => unknown);
            return;
          }
          result[1](action);
        },
      ];
    }
    return result;
  }) as typeof React.useState);
  const tree = render(<CardContractExample />),
    nodes = [host(tree, 'stock'), host(tree, 'stock-text'), host(tree, 'probe-theme')],
    old = nodes.map((node) => node.measureInWindow),
    pending: Parameters<NativeNode['measureInWindow']>[0][] = [];
  nodes.forEach((node) => {
    node.measureInWindow = (done) => {
      pending.push(done);
    };
  });
  try {
    measure(tree);
    hold = true;
    act(() => {
      pending.forEach((done) => done(1, 2, 232, 88));
    });
    hold = false;
    expect(queued).toHaveLength(3);
    const sentinel = { retained: 'previous' };
    for (const update of queued) expect(update(sentinel)).not.toBe(sentinel);
    next(tree);
    for (const update of queued) expect(update(sentinel)).toBe(sentinel);
    expect(receipt(tree).receipts).toEqual({});
    expect(receipt(tree).textReceipts).toEqual({});
    expect(receipt(tree).probeReceipts).toEqual({});
  } finally {
    hold = false;
    nodes.forEach((node, index) => {
      node.measureInWindow = old[index];
    });
    tree.unmount();
    spy.mockRestore();
  }
});
test.each([1, 3.571])(
  'all authored stages keep natural controls and inherited Copy uncapped at OS font scale %p',
  (fontScale) => {
    const before = Dimensions.get('window');
    act(() => Dimensions.set({ window: { ...before, fontScale } }));
    const tree = render(<CardContractExample />);
    try {
      for (const input of cardContractStates) {
        expect(receipt(tree).fontScale).toBe(fontScale);
        for (const key of cardContractKeys) {
          const root = flat(tree.getByTestId(`card-contract-${key}`).props.style);
          expect(root.minHeight).toBe(88);
          expect(root.height).toBeUndefined();
          expect(root.maxHeight).toBeUndefined();
          expect(tree.getByTestId(`card-contract-${key}-text`)).toHaveStyle({
            fontSize: input.nativeReset ? 22 : input.themeSx ? 18 : 16,
            lineHeight: input.nativeReset ? 30 : input.themeSx ? 26 : 24,
          });
          expect(receipt(tree).refs[key]).toMatchObject({
            attached: 1,
            cleaned: 0,
            generation: 1,
            sameRoot: true,
          });
        }
        for (const id of ['next', 'measure', ...cardContractKeys.map((key) => `${key}-counter`)]) {
          const style = flat(tree.getByTestId(`card-contract-${id}`).props.style);
          expect(style.minHeight).toBe(44);
          expect(style.height).toBeUndefined();
          expect(style.maxHeight).toBeUndefined();
        }
        for (const label of tree.UNSAFE_getAllByType(Text)) {
          expect(label.props.allowFontScaling).not.toBe(false);
          expect(
            label.props.maxFontSizeMultiplier == null || label.props.maxFontSizeMultiplier === 0,
          ).toBe(true);
        }
        next(tree);
      }
    } finally {
      tree.unmount();
      act(() => Dimensions.set({ window: before }));
    }
  },
);
test.each(cardProbeKeys)(
  'permanent %s native probe retains its exact independent source semantics across all main stages',
  (key) => {
    const tree = render(<CardContractExample />);
    const actualID =
      key === 'as' ? 'card-contract-probe-as-alternate' : `card-contract-probe-${key}`;
    expect(tree.queryByTestId(actualID)).not.toBeNull();
    const initialRef = host(tree, `probe-${key}`);
    const expected = {
      theme: { backgroundColor: '#1565c0', opacity: 0.7, borderRadius: 4 },
      owner: { backgroundColor: '#0b5d44', opacity: undefined, borderRadius: 4 },
      as: { backgroundColor: '#4527a0', opacity: undefined, borderRadius: undefined },
    };
    for (const input of cardContractStates) {
      const data = receipt(tree);
      expect(data.authoredProbeInputs).toEqual(cardProbeInputs);
      expect(Object.keys(data.refs)).toEqual(['stock', 'custom']);
      expect(Object.keys(data.textRefs)).toEqual(['stock', 'custom']);
      expect(Object.keys(data.probeRefs)).toEqual(['theme', 'owner', 'as']);
      const target =
          key === 'as' ? 'card-contract-probe-as-alternate' : `card-contract-probe-${key}`,
        node = tree.getByTestId(target),
        style = flat(node.props.style);
      expect(style).toMatchObject({
        width: 80,
        minHeight: 44,
        padding: 0,
        overflow: 'hidden',
        backgroundColor: expected[key].backgroundColor,
      });
      expect(style.opacity).toBe(expected[key].opacity);
      expect(style.borderRadius).toBe(expected[key].borderRadius);
      expect(style.height).toBeUndefined();
      expect(style.borderWidth ?? 0).toBe(0);
      expect(style.boxShadow).toBe(key === 'as' ? undefined : 'none');
      expect(node.props.nativeID).toBe(target);
      expect(node.findAllByType(Text)).toHaveLength(0);
      expect(host(tree, `probe-${key}`)).toBe(initialRef);
      expect(data.probeRefs[key]).toEqual({
        attached: 1,
        cleaned: 0,
        generation: 1,
        sameRoot: true,
      });
      const frame = tree.getByTestId(`card-contract-probe-${key}-frame`);
      expect(frame.props.collapsable).toBe(false);
      expect(flat(frame.props.style)).toMatchObject({ padding: 12, backgroundColor: '#ffffff' });
      const card = tree
        .UNSAFE_getAllByType(Card)
        .find((item) => item.props.testID === `card-contract-probe-${key}`)!;
      expect(Object.hasOwn(card.props, 'style')).toBe(false);
      if (key === 'owner') {
        expect(card.props.ownerState).toEqual({ marker: 'authored' });
        expect(Object.isFrozen(card.props.ownerState)).toBe(true);
      }
      if (key === 'as') expect(tree.queryByTestId('card-contract-probe-as-original')).toBeNull();
      expect(data.input).toEqual(input);
      next(tree);
    }
  },
);
