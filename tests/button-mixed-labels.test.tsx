// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { createRef, useEffect } from 'react';
import { Text, View, type TextInstance } from 'react-native';
import { render, cleanup } from '@testing-library/react-native';
import { Button, Typography } from '../packages/material/src';

afterEach(cleanup);

function textRuns(tree: ReturnType<typeof render>) {
  return tree
    .UNSAFE_getAllByType(Text)
    .flatMap((node) => React.Children.toArray(node.props.children))
    .filter((child): child is string => typeof child === 'string');
}

test('mixed label boundaries retain visible spaces without changing the accessible name', () => {
  const tree = render(
    <Button>
      <Typography variant="inherit">Approve</Typography>
      {' international '}
      <Text allowFontScaling={false}>delivery</Text>
    </Button>,
  );
  expect(textRuns(tree)).toContain('\u00a0international\u00a0');
  expect(tree.getByRole('button').props.accessibilityLabel).toBe('Approve international delivery');
  expect(tree.getByText('delivery').props.allowFontScaling).toBe(false);
});

test('adjacent primitives form one run and internal spaces remain breakable', () => {
  const tree = render(
    <Button>
      <Text>Order</Text>
      {'  international '}
      {2}
      {' day  '}
      <Text>delivery</Text>
    </Button>,
  );
  expect(textRuns(tree)).toContain('\u00a0\u00a0international 2 day\u00a0\u00a0');
});

test('nested keyed fragments retain authored refs and state across policy changes', () => {
  const ref = createRef<TextInstance>();
  const mounted = jest.fn(),
    unmounted = jest.fn();
  function Detail() {
    useEffect(() => {
      mounted();
      return unmounted;
    }, []);
    return <>delivery</>;
  }
  const field = (allowFontScaling: boolean) => (
    <Button aria-label="Approve delivery">
      <React.Fragment key="first">
        <Text>Approve</Text>{' '}
      </React.Fragment>
      <React.Fragment key="second">
        {' international '}
        <Typography ref={ref} testID="detail" allowFontScaling={allowFontScaling}>
          <Detail />
        </Typography>
      </React.Fragment>
    </Button>
  );
  const tree = render(field(false));
  const original = ref.current;
  expect(original).not.toBeNull();
  expect(textRuns(tree)).toEqual(expect.arrayContaining(['\u00a0', '\u00a0international\u00a0']));
  tree.rerender(field(true));
  expect(ref.current === original).toBe(true);
  expect(mounted).toHaveBeenCalledTimes(1);
  expect(unmounted).not.toHaveBeenCalled();
  expect(tree.getByTestId('detail').props.allowFontScaling).toBe(true);
  expect(tree.getByRole('button').props.accessibilityLabel).toBe('Approve delivery');
});

test('plain literal labels retain their source text', () => {
  const tree = render(<Button>{' ordinary words '}</Button>);
  expect(textRuns(tree)).toContain(' ordinary words ');
  expect(textRuns(tree)).not.toContain('\u00a0ordinary words\u00a0');
});

test.each([false, true])(
  'keyed labels retain state when inline layout changes (fragment=%s)',
  (fragment) => {
    const ref = createRef<TextInstance>();
    const mounted = jest.fn(),
      unmounted = jest.fn();
    function Detail() {
      useEffect(() => {
        mounted();
        return unmounted;
      }, []);
      return <>Retained</>;
    }
    const field = (view: boolean) => {
      const label = (
        <Text key="retained" testID="retained" ref={ref}>
          <Detail />
        </Text>
      );
      return (
        <Button>
          {fragment ? <React.Fragment key="boundary">{label}</React.Fragment> : label}
          {view ? <View key="content" /> : ' detail '}
        </Button>
      );
    };
    const tree = render(field(false));
    const original = ref.current;
    expect(original).not.toBeNull();
    tree.rerender(field(true));
    tree.rerender(field(false));
    expect(ref.current === original).toBe(true);
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
  },
);
