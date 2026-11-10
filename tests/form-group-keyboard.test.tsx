// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef } from 'react';
import { View, type ViewInstance, type ViewProps } from 'react-native';
import { render, cleanup } from '@testing-library/react-native';
import { InteractiveView } from '../packages/native-host/src';
import { acceptsNativeViewKey } from '../packages/native-host/src/nativeKeyTargets';
import { FormGroup, styled } from '../packages/material/src';

afterEach(cleanup);
const names = ['onKeyDownCapture', 'onKeyDown', 'onKeyUpCapture', 'onKeyUp'] as const;
const PlainRoot = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  ({ className: _className, ...props }, ref) => <View {...props} ref={ref} />,
);
const OwnedRoot = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  ({ className: _className, ...props }, ref) => <InteractiveView {...props} ref={ref} />,
);
const StyledGroup = styled(FormGroup)({ padding: 2 });
function event(target: ViewInstance, currentTarget: ViewInstance, source?: string) {
  return {
    target,
    currentTarget,
    nativeEvent: { key: 'Enter', code: 'Enter', muiKeySource: source },
  } as any;
}

test.each(['stock', 'plain', 'owned', 'styled'] as const)(
  '%s root forwards original events once across framework and owned transports',
  (kind) => {
    const handlers = Object.fromEntries(names.map((name) => [name, jest.fn()]));
    const parent = createRef<ViewInstance>(),
      child = createRef<ViewInstance>();
    const Root = kind === 'styled' ? StyledGroup : FormGroup;
    const component = kind === 'plain' ? PlainRoot : kind === 'owned' ? OwnedRoot : undefined;
    const tree = render(
      <Root {...handlers} ref={parent} component={component} testID="parent">
        <InteractiveView ref={child} />
      </Root>,
    );
    const host = tree.getByTestId('parent');
    const framework = event(child.current!, parent.current!);
    const hardware = event(child.current!, parent.current!, 'hardware');
    for (const name of names) {
      host.props[name](framework);
      expect(handlers[name]).not.toHaveBeenCalled();
      host.props[name.replace('onKey', 'onMUIKey')](hardware);
      expect(handlers[name].mock.calls).toEqual([[hardware]]);
      expect(handlers[name].mock.calls[0][0]).toBe(hardware);
    }
  },
);

test.each(['stock', 'plain', 'styled'] as const)(
  '%s preserves ordinary native descendant callbacks without private provenance',
  (kind) => {
    const handlers = Object.fromEntries(names.map((name) => [name, jest.fn()]));
    const parent = createRef<ViewInstance>(),
      child = createRef<ViewInstance>();
    const Root = kind === 'styled' ? StyledGroup : FormGroup;
    const tree = render(
      <Root
        {...handlers}
        ref={parent}
        component={kind === 'plain' ? PlainRoot : undefined}
        testID="parent"
      >
        <View ref={child} />
      </Root>,
    );
    const original = event(child.current!, parent.current!);
    for (const name of names) {
      tree.getByTestId('parent').props[name](original);
      expect(handlers[name].mock.calls).toEqual([[original]]);
    }
  },
);

test('native target ownership is revoked on ref cleanup without retaining native hosts', () => {
  const ref = createRef<ViewInstance>();
  const tree = render(<InteractiveView ref={ref} />);
  const target = ref.current!;
  expect(acceptsNativeViewKey(event(target, target))).toBe(false);
  for (const source of ['hardware', 'command', 'input'])
    expect(acceptsNativeViewKey(event(target, target, source))).toBe(true);
  tree.unmount();
  expect(ref.current).toBeNull();
  expect(acceptsNativeViewKey(event(target, target))).toBe(true);
});

test('adding, replacing and removing handlers keeps the same native group root', () => {
  const ref = createRef<ViewInstance>(),
    first = jest.fn(),
    second = jest.fn();
  const tree = render(<FormGroup ref={ref} testID="parent" />);
  const initial = ref.current!;
  for (const name of names) expect(tree.getByTestId('parent').props[name]).toBeUndefined();
  tree.rerender(<FormGroup ref={ref} testID="parent" onKeyDown={first} />);
  const original = event(initial, initial);
  tree.getByTestId('parent').props.onKeyDown(original);
  expect(first.mock.calls).toEqual([[original]]);
  tree.rerender(<FormGroup ref={ref} testID="parent" onKeyDown={second} />);
  tree.getByTestId('parent').props.onKeyDown(original);
  expect(first).toHaveBeenCalledTimes(1);
  expect(second.mock.calls).toEqual([[original]]);
  tree.rerender(<FormGroup ref={ref} testID="parent" />);
  for (const name of names) {
    expect(tree.getByTestId('parent').props[name]).toBeUndefined();
    expect(tree.getByTestId('parent').props[name.replace('onKey', 'onMUIKey')]).toBeUndefined();
  }
  expect(ref.current).toBe(initial);
});
