/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
jest.mock(
  '@mui/material',
  () => {
    const actual = jest.requireActual('../packages/material/src');
    const React = require('react');
    const { View } = require('react-native');
    return {
      ...actual,
      Popper: jest.fn(({ open, children }) =>
        open ? React.createElement(View, null, children) : null,
      ),
    };
  },
  { virtual: true },
);
import { act, render } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { Button, Switch, type Popper } from '@altroo/mui-native';
import * as CatalogMaterial from '@mui/material';
import { PopperAnchorExamples } from '../apps/native-catalog/PopperAnchorExamples';

test('the shared-note fixture keeps detached native anchors and owns read state inside its popup child', () => {
  const tree = render(<PopperAnchorExamples />);
  const button = (id: string) =>
    tree.UNSAFE_getAllByType(Button).find((node) => node.props.testID === id)!;
  const props = () =>
    (CatalogMaterial.Popper as unknown as jest.Mock).mock.calls.at(-1)![0] as ComponentProps<
      typeof Popper
    >;
  const first = { measureInWindow: jest.fn() } as any,
    second = { measureInWindow: jest.fn() } as any;
  const firstRef = button('shared-anchor-a').props.ref as (node: any) => void;
  const secondRef = button('shared-anchor-b').props.ref as (node: any) => void;
  act(() => {
    firstRef(first);
    secondRef(second);
  });
  act(() => button('shared-anchor-a').props.onClick?.({} as any));
  expect(props().anchorEl).toBe(first);
  act(() => button('shared-read').props.onClick?.({} as any));
  expect(tree.getByText('Read count: 1')).toBeTruthy();
  act(() => button('shared-anchor-b').props.onClick?.({} as any));
  expect(props().anchorEl).toBe(second);
  expect(tree.getByText('Read count: 1')).toBeTruthy();
  const mounted = () =>
    tree.UNSAFE_getAllByType(Switch).find((node) => node.props.testID === 'shared-mounted-toggle')!;
  act(() => mounted().props.onChange?.({} as any, false));
  act(() => {
    firstRef(null);
    secondRef(null);
  });
  expect(props().anchorEl).toBe(second);
  expect(tree.queryByTestId('shared-anchor-b')).toBeNull();
  act(() => mounted().props.onChange?.({} as any, true));
  const replacement = { measureInWindow: jest.fn() } as any;
  act(() => (button('shared-anchor-b').props.ref as (node: any) => void)(replacement));
  expect(props().anchorEl).toBe(replacement);
  expect(tree.getByText('Read count: 1')).toBeTruthy();
  act(() => button('shared-close').props.onClick?.({} as any));
  act(() => button('shared-anchor-a').props.onClick?.({} as any));
  expect(tree.getByText('Read count: 0')).toBeTruthy();
});
