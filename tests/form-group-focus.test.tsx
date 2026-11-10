// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type ComponentRef } from 'react';
import { View, TextInput, type ViewInstance, type ViewProps } from 'react-native';
import { render, cleanup } from '@testing-library/react-native';
import { InteractiveView } from '../packages/native-host/src';
import { acceptsNativeViewFocus } from '../packages/native-host/src/nativeKeyTargets';
import { clearNativeFocus, getNativeFocusedView } from '../packages/native-host/src/nativeFocus';
import { FormGroup, styled } from '../packages/material/src';

afterEach(() => {
  cleanup();
  clearNativeFocus(getNativeFocusedView());
});
const names = ['onFocusCapture', 'onFocus', 'onBlurCapture', 'onBlur'] as const;
const StyledGroup = styled(FormGroup)({ padding: 2 });
function event(target: object, currentTarget: object, source?: string) {
  return { target, currentTarget, nativeEvent: { target: 17, muiFocusSource: source } } as any;
}
test.each(['stock', 'plain', 'owned', 'styled'] as const)(
  '%s group adapts owned focus and blur without a framework copy',
  (kind) => {
    let forwarded!: ViewProps;
    const CustomRoot = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
      ({ className: _className, ...props }, ref) => {
        forwarded = props;
        return kind === 'owned' ? (
          <InteractiveView {...props} ref={ref} />
        ) : (
          <View {...props} ref={ref} />
        );
      },
    );
    const handlers = Object.fromEntries(names.map((name) => [name, jest.fn()]));
    const parent = createRef<ViewInstance>(),
      child = createRef<ViewInstance>();
    const Root = kind === 'styled' ? StyledGroup : FormGroup;
    const tree = render(
      <Root
        {...handlers}
        ref={parent}
        component={kind === 'plain' || kind === 'owned' ? CustomRoot : undefined}
        testID="parent"
      >
        <InteractiveView ref={child} />
      </Root>,
    );
    const host = tree.getByTestId('parent');
    const framework = event(child.current!, parent.current!);
    const owned = event(child.current!, parent.current!, 'owned');
    for (const name of names) {
      const standard = kind === 'owned' ? forwarded[name] : host.props[name];
      standard!(framework);
      expect(handlers[name]).not.toHaveBeenCalled();
      host.props[name.replace(/^on/, 'onMUI')](owned);
      expect(handlers[name].mock.calls).toEqual([[owned]]);
      expect(handlers[name].mock.calls[0][0]).toBe(owned);
    }
  },
);
test.each(['stock', 'plain', 'styled'] as const)(
  '%s group preserves original ordinary View and TextInput focus events',
  (kind) => {
    const handlers = Object.fromEntries(names.map((name) => [name, jest.fn()]));
    const Plain = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
      ({ className: _className, ...props }, ref) => <View {...props} ref={ref} />,
    );
    const parent = createRef<ViewInstance>(),
      view = createRef<ViewInstance>(),
      input = createRef<ComponentRef<typeof TextInput>>();
    const Root = kind === 'styled' ? StyledGroup : FormGroup;
    const tree = render(
      <Root
        {...handlers}
        ref={parent}
        component={kind === 'plain' ? Plain : undefined}
        testID="parent"
      >
        <View ref={view} />
        <TextInput ref={input} />
      </Root>,
    );
    for (const target of [view.current!, input.current!]) {
      const original = event(target, parent.current!);
      for (const name of names) tree.getByTestId('parent').props[name](original);
      for (const name of names) expect(handlers[name]).toHaveBeenLastCalledWith(original);
    }
    for (const name of names) expect(handlers[name]).toHaveBeenCalledTimes(2);
  },
);
test('only owned focus provenance bypasses target suppression and cleanup revokes ownership', () => {
  const ref = createRef<ViewInstance>(),
    tree = render(<InteractiveView ref={ref} />),
    target = ref.current!;
  expect(acceptsNativeViewFocus(event(target, target))).toBe(false);
  expect(acceptsNativeViewFocus(event(target, target, 'hardware'))).toBe(false);
  expect(acceptsNativeViewFocus(event(target, target, 'owned'))).toBe(true);
  tree.unmount();
  expect(ref.current).toBeNull();
  expect(acceptsNativeViewFocus(event(target, target))).toBe(true);
});
test('changing or removing focus callbacks retains the same native root and current handler', () => {
  const ref = createRef<ViewInstance>(),
    first = jest.fn(),
    second = jest.fn();
  const tree = render(<FormGroup ref={ref} testID="group" />),
    root = ref.current!;
  tree.rerender(<FormGroup ref={ref} testID="group" onFocus={first} />);
  const original = event(root, root);
  tree.getByTestId('group').props.onFocus(original);
  expect(first.mock.calls).toEqual([[original]]);
  tree.rerender(<FormGroup ref={ref} testID="group" onFocus={second} />);
  tree.getByTestId('group').props.onFocus(original);
  expect(first).toHaveBeenCalledTimes(1);
  expect(second.mock.calls).toEqual([[original]]);
  tree.rerender(<FormGroup ref={ref} testID="group" />);
  for (const name of names) {
    expect(tree.getByTestId('group').props[name]).toBeUndefined();
    expect(tree.getByTestId('group').props[name.replace(/^on/, 'onMUI')]).toBeUndefined();
  }
  expect(ref.current).toBe(root);
});
