import React from 'react';
import { Text, type ViewInstance } from 'react-native';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react-native';
import { InteractiveView, NativePressable } from '../packages/native-host/src';
import { Commands } from '../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';
beforeEach(() => {
  for (const key of ['focus', 'blur', 'setPressed', 'setHotspot'] as const)
    jest.spyOn(Commands, key).mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
const keyEvent = () => ({
  nativeEvent: {
    key: 'Enter',
    code: 'Enter',
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    isCanceled: false,
  },
  target: 1,
  currentTarget: 1,
});
test('native focus commands keep the actual ref identity and restore decorated methods on detach', () => {
  const ref = React.createRef<ViewInstance>();
  const { unmount } = render(<InteractiveView ref={ref} focusable testID="host" />);
  const native = ref.current!,
    bound = native.focus;
  act(() => {
    native.focus();
    native.blur();
  });
  expect(Commands.focus).toHaveBeenCalledWith(native);
  expect(Commands.blur).toHaveBeenCalledWith(native);
  expect(typeof native.measureInWindow).toBe('function');
  unmount();
  expect(ref.current).toBeNull();
  expect(native.focus).not.toBe(bound);
});
test('callback ref changes release once and retain native focus commands for the current attachment', () => {
  const oldRelease = jest.fn(),
    newRelease = jest.fn();
  const first = jest.fn((_node: ViewInstance | null) => oldRelease),
    second = jest.fn((_node: ViewInstance | null) => newRelease);
  const { rerender, unmount } = render(<InteractiveView ref={first} />);
  rerender(<InteractiveView ref={second} />);
  expect(oldRelease).toHaveBeenCalledTimes(1);
  const current = second.mock.calls.at(-1)![0] as ViewInstance;
  act(() => current.focus());
  expect(Commands.focus).toHaveBeenLastCalledWith(current);
  unmount();
  expect(newRelease).toHaveBeenCalledTimes(1);
  expect(oldRelease).toHaveBeenCalledTimes(1);
});
test('legacy concise ref returns are tolerated and cleared', () => {
  const refs: Array<ViewInstance | null> = [];
  const concise = ((node: ViewInstance | null) => {
    refs.push(node);
    return node;
  }) as unknown as React.RefCallback<ViewInstance>;
  const { unmount } = render(<InteractiveView ref={concise} />);
  expect(refs[0]).not.toBeNull();
  unmount();
  expect(refs.at(-1)).toBeNull();
});
test('native private key/focus events and capture phases map to the public callbacks once', () => {
  const down = jest.fn(),
    up = jest.fn(),
    focus = jest.fn(),
    blur = jest.fn();
  const downCapture = jest.fn(),
    upCapture = jest.fn(),
    focusCapture = jest.fn(),
    blurCapture = jest.fn();
  render(
    <InteractiveView
      testID="host"
      onKeyDown={down}
      onKeyUp={up}
      onFocus={focus}
      onBlur={blur}
      onKeyDownCapture={downCapture}
      onKeyUpCapture={upCapture}
      onFocusCapture={focusCapture}
      onBlurCapture={blurCapture}
    />,
  );
  for (const [name, handler] of [
    ['MUIKeyDown', down],
    ['MUIKeyUp', up],
    ['MUIFocus', focus],
    ['MUIBlur', blur],
    ['MUIKeyDownCapture', downCapture],
    ['MUIKeyUpCapture', upCapture],
    ['MUIFocusCapture', focusCapture],
    ['MUIBlurCapture', blurCapture],
  ] as const) {
    fireEvent(screen.getByTestId('host'), name, keyEvent());
    expect(handler).toHaveBeenCalledTimes(1);
  }
  expect(screen.getByTestId('host').props.onKeyDown).toBeUndefined();
  expect(screen.getByTestId('host').props.onFocus).toBeUndefined();
});
test('explicit native focusability is independent from the traversal tab index', () => {
  const { rerender } = render(<InteractiveView focusable tabIndex={-1} testID="host" />);
  expect(screen.getByTestId('host').props).toMatchObject({
    nativeFocusable: true,
    nativeTabIndex: -1,
  });
  rerender(<InteractiveView focusable={false} tabIndex={0} testID="host" />);
  expect(screen.getByTestId('host').props.nativeFocusable).toBe(false);
});
test('native accessibility aliases survive the custom host without an extra View wrapper', () => {
  const { toJSON } = render(
    <InteractiveView
      testID="host"
      id="native-id"
      aria-label="Action"
      aria-disabled
      aria-hidden
      aria-valuemax={10}
      aria-valuenow={3}
      aria-labelledby="first, second"
    />,
  );
  const props = screen.getByTestId('host', { includeHiddenElements: true }).props;
  expect(props).toMatchObject({
    nativeID: 'native-id',
    accessibilityLabel: 'Action',
    accessibilityState: { disabled: true },
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants',
    accessibilityValue: { max: 10, now: 3 },
    accessibilityLabelledBy: ['first', 'second'],
  });
  expect(toJSON()).toMatchObject({ type: 'AltrooMUIInteractiveView' });
});
test('native pressable composes one host and forwards native ripple configuration', () => {
  const { toJSON } = render(
    <NativePressable
      testID="host"
      android_ripple={{ color: 'red', radius: 0, foreground: true, borderless: true }}
    >
      <Text>Action</Text>
    </NativePressable>,
  );
  expect(toJSON()).toMatchObject({ type: 'AltrooMUIInteractiveView' });
  expect(screen.getByTestId('host').props).toMatchObject({
    rippleColor: 'red',
    rippleRadius: 0,
    rippleForeground: true,
    rippleBorderless: true,
  });
});

test('hover delays reach the native Pressability contract and update', () => {
  const native = require('react-native');
  const original = native.usePressability;
  let settings: any;
  jest.spyOn(native, 'usePressability').mockImplementation((config: any) => {
    settings = config;
    return original(config);
  });
  const { rerender } = render(<NativePressable delayHoverIn={40} delayHoverOut={90} />);
  expect(settings).toMatchObject({ delayHoverIn: 40, delayHoverOut: 90 });
  rerender(<NativePressable delayHoverIn={80} delayHoverOut={120} />);
  expect(settings).toMatchObject({ delayHoverIn: 80, delayHoverOut: 120 });
});
test('partial native ripple configurations enable the platform theme fallback', () => {
  render(<NativePressable testID="host" android_ripple={{ borderless: true }} />);
  const props = screen.getByTestId('host').props;
  expect(props.rippleEnabled).toBe(true);
  expect(props.rippleColor).toBeUndefined();
});

test('pressable modal accessibility alias reaches the native host', () => {
  render(<NativePressable testID="host" aria-modal />);
  expect(screen.getByTestId('host').props.accessibilityViewIsModal).toBe(true);
  expect(screen.getByTestId('host').props['aria-modal']).toBeUndefined();
});

test('explicit disabled state takes precedence over the accessibility alias', () => {
  const { rerender } = render(<NativePressable testID="host" disabled aria-disabled={false} />);
  expect(
    screen.getByTestId('host', { includeHiddenElements: true }).props.accessibilityState.disabled,
  ).toBe(true);
  rerender(<NativePressable testID="host" disabled={false} aria-disabled />);
  expect(screen.getByTestId('host').props.accessibilityState.disabled).toBe(false);
});
