import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal as NativeModal,
  TextInput,
  BackHandler,
  StyleSheet,
  type ViewInstance,
} from 'react-native';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react-native';
import {
  Modal,
  Backdrop,
  Dialog,
  ThemeProvider,
  createTheme,
  Button,
  type ModalProps,
  type ModalRootProps,
} from '../packages/material/src';
import { nativeModalManager as manager } from '../packages/material/src/nativeModalManager';
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  expect(manager.top()).toBeUndefined();
});
const focusTarget = () => ({ focus: jest.fn(), isConnected: true });
const node = (target: ReturnType<typeof focusTarget>, id: string) =>
  forwardRef<ViewInstance, any>(function Node(props, ref) {
    useImperativeHandle(ref, () => target as unknown as ViewInstance, []);
    return <View {...props} testID={id} />;
  });
test('standalone backdrop supports invisible, disabled hit testing, styles and native refs', () => {
  const ref = React.createRef<ViewInstance>();
  const { rerender } = render(
    <Backdrop ref={ref} open invisible testID="backdrop" style={{ padding: 3 }} />,
  );
  expect(screen.getByTestId('backdrop')).toHaveStyle({
    backgroundColor: 'transparent',
    padding: 3,
  });
  rerender(<Backdrop open={false} testID="backdrop" />);
  expect(screen.getByTestId('backdrop', { includeHiddenElements: true })).toHaveStyle({
    display: 'none',
  });
  expect(screen.getByTestId('backdrop', { includeHiddenElements: true }).props.pointerEvents).toBe(
    'none',
  );
});
test('inline keepMounted preserves child state and hides inactive roots', () => {
  function Counter() {
    const [n, set] = useState(0);
    return (
      <Pressable onPress={() => set(n + 1)}>
        <Text>Count {n}</Text>
      </Pressable>
    );
  }
  const field = (open: boolean) => (
    <Modal open={open} disablePortal keepMounted testID="root">
      <View>
        <Counter />
      </View>
    </Modal>
  );
  const { rerender } = render(field(true));
  fireEvent.press(screen.getByText('Count 0'));
  rerender(field(false));
  expect(screen.queryByText('Count 1')).toBeNull();
  expect(
    screen.getByTestId('root', { includeHiddenElements: true }).props.importantForAccessibility,
  ).toBe('no-hide-descendants');
  rerender(field(true));
  expect(screen.getByText('Count 1')).toBeTruthy();
});
test('backdrop handlers run before controlled close, reject content-origin presses and preserve cancellation semantics', () => {
  const trace: string[] = [];
  render(
    <Modal
      open
      disablePortal
      onClose={(_, reason) => trace.push(reason)}
      slotProps={{ backdrop: { testID: 'backdrop', onPress: () => trace.push('slot') } }}
    >
      <View />
    </Modal>,
  );
  fireEvent.press(screen.getByTestId('backdrop'), { target: 1, currentTarget: 2, nativeEvent: {} });
  expect(trace).toEqual(['slot']);
  fireEvent.press(screen.getByTestId('backdrop'), {
    target: 2,
    currentTarget: 2,
    defaultPrevented: true,
    nativeEvent: {},
  });
  expect(trace).toEqual(['slot', 'slot', 'backdropClick']);
});
test('hardware key dispatch respects top ownership and ignores composing Escape', () => {
  const a = jest.fn(),
    b = jest.fn(),
    external = jest.fn(),
    stop = jest.fn();
  render(
    <>
      <Modal open disablePortal testID="a" onClose={a}>
        <View />
      </Modal>
      <Modal
        open
        disablePortal
        testID="b"
        onClose={b}
        slotProps={{ root: { onKeyDown: external } }}
      >
        <View />
      </Modal>
    </>,
  );
  const event = (isComposing = false) => ({
    nativeEvent: { key: 'Escape', isComposing },
    stopPropagation: stop,
  });
  fireEvent(screen.getByTestId('a', { includeHiddenElements: true }), 'keyDown', event());
  fireEvent(screen.getByTestId('b'), 'keyDown', event(true));
  expect(a).not.toHaveBeenCalled();
  expect(b).not.toHaveBeenCalled();
  fireEvent(screen.getByTestId('b'), 'keyDown', event());
  expect(external).toHaveBeenCalledTimes(2);
  expect(b.mock.calls[0][1]).toBe('escapeKeyDown');
  expect(stop).toHaveBeenCalledTimes(1);
});
test('nested initial registration keeps the child on top and native host dismissal reaches inline children', () => {
  const parentClose = jest.fn(),
    childClose = jest.fn();
  render(
    <Modal open onClose={parentClose}>
      <View>
        <Modal open disablePortal onClose={childClose}>
          <View />
        </Modal>
      </View>
    </Modal>,
  );
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'requestClose');
  expect(childClose).toHaveBeenCalledWith(null, 'escapeKeyDown');
  expect(parentClose).not.toHaveBeenCalled();
});
test('inline Android back listeners consume top-level requests and release on close', () => {
  const listeners: Array<() => boolean> = [];
  const remove = jest.fn();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    listeners.push(handler as () => boolean);
    return { remove };
  });
  const close = jest.fn();
  const { rerender } = render(
    <Modal open disablePortal disableEscapeKeyDown onClose={close}>
      <View />
    </Modal>,
  );
  expect(listeners.at(-1)!()).toBe(true);
  expect(close).not.toHaveBeenCalled();
  rerender(
    <Modal open={false} disablePortal>
      <View />
    </Modal>,
  );
  expect(remove).toHaveBeenCalledTimes(1);
});
test('auto-focus waits for presentation; iOS restoration waits for dismissal', () => {
  const origin = focusTarget(),
    inside = focusTarget(),
    Content = node(inside, 'content');
  jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(origin as any);
  const { rerender } = render(
    <Modal open>
      <Content />
    </Modal>,
  );
  expect(inside.focus).not.toHaveBeenCalled();
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  expect(inside.focus).toHaveBeenCalledTimes(1);
  rerender(
    <Modal open={false}>
      <Content />
    </Modal>,
  );
  expect(origin.focus).not.toHaveBeenCalled();
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'dismiss');
  expect(origin.focus).toHaveBeenCalledTimes(1);
});
test('explicit focus refs work and stale dismissal after reopening cannot steal focus', () => {
  const origin = focusTarget(),
    inside = focusTarget();
  const initial = { current: inside },
    back = { current: origin };
  const field = (open: boolean) => (
    <Modal open={open} initialFocusRef={initial} returnFocusRef={back}>
      <View />
    </Modal>
  );
  const { rerender } = render(field(true));
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  expect(inside.focus).toHaveBeenCalledTimes(1);
  rerender(field(false));
  rerender(field(true));
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'dismiss');
  expect(origin.focus).not.toHaveBeenCalled();
  expect(screen.UNSAFE_getByType(NativeModal).props.visible).toBe(true);
});
test('disabled auto-focus and restore flags preserve caller focus policy', () => {
  const origin = focusTarget(),
    inside = focusTarget(),
    Content = node(inside, 'content');
  jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(origin as any);
  const { rerender } = render(
    <Modal open disableAutoFocus disableRestoreFocus>
      <Content />
    </Modal>,
  );
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  expect(inside.focus).not.toHaveBeenCalled();
  rerender(
    <Modal open={false} disableRestoreFocus>
      <Content />
    </Modal>,
  );
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'dismiss');
  expect(origin.focus).not.toHaveBeenCalled();
});
test('closeAfterTransition retains stack ownership until exit and chains transition callbacks', () => {
  const trace: string[] = [];
  let transition: any;
  const Transition = forwardRef<ViewInstance, any>(function Transition(props, ref) {
    transition = props;
    return <View ref={ref} />;
  });
  const field = (open: boolean) => (
    <Modal
      open={open}
      disablePortal
      closeAfterTransition
      onTransitionEnter={() => trace.push('modal-enter')}
      onTransitionExited={() => trace.push('modal-exit')}
    >
      <Transition
        in={open}
        onEnter={() => trace.push('child-enter')}
        onExited={() => trace.push('child-exit')}
      />
    </Modal>
  );
  const { rerender } = render(field(true));
  act(() => transition.onEnter());
  rerender(field(false));
  expect(manager.top()).toBeDefined();
  act(() => transition.onExited());
  expect(manager.top()).toBeUndefined();
  expect(trace).toEqual(['modal-enter', 'child-enter', 'modal-exit', 'child-exit']);
});
test('late transition exit from a prior close does not dismiss a reopened modal', () => {
  let transition: any;
  const Transition = forwardRef<ViewInstance, any>(function Transition(props, ref) {
    transition = props;
    return <View ref={ref} />;
  });
  const field = (open: boolean) => (
    <Modal open={open} disablePortal closeAfterTransition>
      <Transition in={open} />
    </Modal>
  );
  const { rerender } = render(field(true));
  act(() => transition.onEnter());
  rerender(field(false));
  const stale = transition.onExited;
  rerender(field(true));
  act(() => stale());
  expect(manager.top()?.open).toBe(true);
});
test('Dialog slots retain legacy paper styles while keeping root/container overrides scoped', () => {
  const theme = createTheme({
    components: {
      MuiDialog: {
        styleOverrides: {
          root: { opacity: 0.9 },
          container: { padding: 3 },
          paper: { borderRadius: 13 },
        },
      },
    },
  });
  const paper = React.createRef<ViewInstance>(),
    root = React.createRef<ViewInstance>();
  render(
    <ThemeProvider theme={theme}>
      <Dialog
        open
        disablePortal
        ref={root}
        sx={{ borderRadius: 4 }}
        slotProps={{
          root: { testID: 'root' },
          container: { testID: 'container' },
          paper: { testID: 'paper', ref: paper, sx: { borderRadius: '5px' } },
        }}
      >
        Content
      </Dialog>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('root')).toHaveStyle({ opacity: 0.9 });
  expect(screen.getByTestId('container')).toHaveStyle({ padding: 3 });
  expect(screen.getByTestId('container')).not.toHaveStyle({ opacity: 0.9 });
  expect(screen.getByTestId('paper')).toHaveStyle({ borderRadius: 5 });
  expect(screen.getByTestId('paper')).not.toHaveStyle({ opacity: 0.9 });
});

test('focus enforcement only retries observable outside text input focus and respects cleanup/opt-out', async () => {
  const inside = focusTarget(),
    outside = focusTarget(),
    Content = node(inside, 'content');
  jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(outside as any);
  const field = (open: boolean, disabled = false) => (
    <Modal open={open} disablePortal disableEnforceFocus={disabled} testID="root">
      <Content />
    </Modal>
  );
  const { rerender } = render(field(true));
  fireEvent(screen.getByTestId('root'), 'blurCapture', { nativeEvent: {} });
  await act(async () => {});
  expect(inside.focus).toHaveBeenCalledTimes(1);
  rerender(field(true, true));
  fireEvent(screen.getByTestId('root'), 'blurCapture', { nativeEvent: {} });
  await act(async () => {});
  expect(inside.focus).toHaveBeenCalledTimes(1);
  rerender(field(true));
  fireEvent(screen.getByTestId('root'), 'blurCapture', { nativeEvent: {} });
  rerender(field(false));
  await act(async () => {});
  expect(inside.focus).toHaveBeenCalledTimes(1);
});
test('late backdrop delivery cannot close an inactive retained modal', () => {
  const close = jest.fn();
  let saved: any;
  const Custom = forwardRef<ViewInstance, any>(function Custom(p, ref) {
    saved = p.onPress;
    return <View ref={ref} />;
  });
  const field = (open: boolean) => (
    <Modal open={open} disablePortal keepMounted slots={{ backdrop: Custom }} onClose={close}>
      <View />
    </Modal>
  );
  const { rerender } = render(field(true));
  const late = saved;
  rerender(field(false));
  act(() => late({ target: 1, currentTarget: 1 }));
  expect(close).not.toHaveBeenCalled();
});
test('reopening an earlier inline sibling brings its root above the surviving layer', () => {
  const tree = (a: boolean) => (
    <>
      <Modal open={a} disablePortal keepMounted testID="a">
        <View />
      </Modal>
      <Modal open disablePortal testID="b">
        <View />
      </Modal>
    </>
  );
  const { rerender } = render(tree(false));
  rerender(tree(true));
  const a = screen.getByTestId('a'),
    b = screen.getByTestId('b', { includeHiddenElements: true });
  expect(StyleSheet.flatten(a.props.style).zIndex).toBeGreaterThan(
    StyleSheet.flatten(b.props.style).zIndex,
  );
  expect(b.props.pointerEvents).toBe('none');
});

test('default Dialog container forwards a native handle, allows backdrop hit testing and cannot crash onShow', () => {
  const { KeyboardAvoidingView } = require('react-native');
  render(<Dialog open>Content</Dialog>);
  expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.pointerEvents).toBe('box-none');
  expect(() =>
    fireEvent(screen.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} }),
  ).not.toThrow();
});
test('transition callbacks invoked in child layout effects observe their committed cycle', () => {
  const trace: string[] = [];
  const Transition = forwardRef<ViewInstance, any>(function Transition(p, ref) {
    React.useLayoutEffect(() => {
      if (p.in) p.onEnter();
      else p.onExited();
    }, [p.in]);
    return <View ref={ref} />;
  });
  const field = (open: boolean) => (
    <Modal
      open={open}
      disablePortal
      keepMounted
      closeAfterTransition
      onTransitionEnter={() => trace.push('enter')}
      onTransitionExited={() => trace.push('exit')}
    >
      <Transition in={open} />
    </Modal>
  );
  const { rerender } = render(field(true));
  expect(trace).toEqual(['enter']);
  rerender(field(false));
  expect(trace).toEqual(['enter', 'exit']);
  expect(manager.top()).toBeUndefined();
  rerender(field(true));
  expect(trace).toEqual(['enter', 'exit', 'enter']);
  rerender(field(false));
  expect(trace).toEqual(['enter', 'exit', 'enter', 'exit']);
  expect(manager.top()).toBeUndefined();
});
test('close A exit cannot finish close B after a reopen', () => {
  let transition: any;
  const Transition = forwardRef<ViewInstance, any>(function Transition(p, ref) {
    transition = p;
    return <View ref={ref} />;
  });
  const field = (open: boolean) => (
    <Modal open={open} disablePortal closeAfterTransition>
      <Transition in={open} />
    </Modal>
  );
  const { rerender } = render(field(true));
  act(() => transition.onEnter());
  rerender(field(false));
  const closeA = transition.onExited;
  rerender(field(true));
  act(() => transition.onEnter());
  rerender(field(false));
  const closeB = transition.onExited;
  act(() => closeA());
  expect(manager.top()).toBeDefined();
  act(() => closeB());
  expect(manager.top()).toBeUndefined();
});

test('default Dialog onShow focuses safely with its actual keyboard-container instance', () => {
  render(<Dialog open>Content</Dialog>);
  expect(() =>
    fireEvent(screen.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} }),
  ).not.toThrow();
});

test('default Dialog container refs and autofocus reach the underlying native view', () => {
  const { KeyboardAvoidingView } = require('react-native');
  const container = React.createRef<ViewInstance>();
  render(
    <Dialog open slotProps={{ container: { ref: container } }}>
      Content
    </Dialog>,
  );
  const keyboard = screen.UNSAFE_getByType(KeyboardAvoidingView).instance;
  expect(container.current === keyboard.viewRef.current).toBe(true);
  expect(container.current === keyboard).toBe(false);
  const focus = jest.spyOn(container.current!, 'focus').mockClear();
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  expect(focus).toHaveBeenCalledTimes(1);
});

test('Dialog top-level native props and sx style the root, with paper props explicitly scoped', () => {
  render(
    <Dialog
      open
      disablePortal
      testID="dialog-root"
      sx={{ opacity: 0.7 }}
      style={{ zIndex: 29 }}
      slotProps={{ paper: { testID: 'dialog-paper', sx: { borderRadius: '5px' } } }}
    >
      Content
    </Dialog>,
  );
  expect(screen.getByTestId('dialog-root')).toHaveStyle({ opacity: 0.7, zIndex: 29 });
  expect(screen.getByTestId('dialog-paper')).not.toHaveStyle({ opacity: 0.7 });
  expect(screen.getByTestId('dialog-paper')).toHaveStyle({ borderRadius: 5 });
});
