import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, type ViewInstance } from 'react-native';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react-native';
import {
  Popover,
  PopoverRoot,
  PopoverPaper,
  Fade,
  Grow,
  ThemeProvider,
  createTheme,
  type PopoverProps,
  type PopoverActions,
  type PopoverRootProps,
  type PopoverPaperProps,
  type NativePopoverAnchor,
} from '../packages/material/src';
import { NativeTransitionReadiness } from '../packages/material/src/transitionReadiness';
const viewport = Dimensions.get('window');
let rootRect = { left: 0, top: 0, width: viewport.width, height: viewport.height };
let size = { width: 120, height: 80 };
let deferRoot = false;
let offsetDimensions = true;
const roots: Array<(...values: number[]) => void> = [];
function geometry(node: ViewInstance, root: boolean) {
  Object.defineProperty(node, 'offsetWidth', {
    get: () => (offsetDimensions ? (root ? rootRect.width : size.width) : undefined),
    configurable: true,
  });
  Object.defineProperty(node, 'offsetHeight', {
    get: () => (offsetDimensions ? (root ? rootRect.height : size.height) : undefined),
    configurable: true,
  });
  Object.defineProperty(node, 'clientHeight', {
    get: () => (root ? rootRect.height : size.height),
    configurable: true,
  });
  node.measureInWindow = ((callback: any) => {
    if (root && deferRoot) roots.push(callback);
    else {
      const rect = root ? rootRect : { left: 0, top: 0, ...size };
      callback(rect.left, rect.top, rect.width, rect.height);
    }
  }) as ViewInstance['measureInWindow'];
  return node;
}
const Root = forwardRef<ViewInstance, PopoverRootProps>(function Root(props, ref) {
  const local = useRef<ViewInstance | null>(null);
  useImperativeHandle(ref, () => geometry(local.current!, true), []);
  return <PopoverRoot {...props} ref={local} />;
});
const Surface = forwardRef<ViewInstance, PopoverPaperProps>(function Surface(props, ref) {
  const local = useRef<ViewInstance | null>(null);
  useImperativeHandle(ref, () => geometry(local.current!, false), []);
  return <PopoverPaper {...props} ref={local} />;
});
const anchor = (top = 200, left = 100, width = 40, height = 20): NativePopoverAnchor => ({
  nodeType: 1,
  getBoundingClientRect: () => ({ top, left, width, height }),
});
function field(props: Partial<PopoverProps> = {}) {
  return (
    <Popover
      open
      disablePortal
      disableAutoFocus
      anchorEl={anchor()}
      transitionDuration={10}
      slots={{ root: Root, paper: Surface }}
      {...props}
      slotProps={{ root: { testID: 'root' }, paper: { testID: 'paper' }, ...props.slotProps }}
    >
      Popup copy
    </Popover>
  );
}
beforeEach(() => {
  jest.useFakeTimers();
  rootRect = { left: 0, top: 0, width: viewport.width, height: viewport.height };
  size = { width: 120, height: 80 };
  deferRoot = false;
  offsetDimensions = true;
  roots.length = 0;
});
afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});
const tick = (value: number) =>
  act(() => {
    jest.advanceTimersByTime(value);
  });
test('native Popover anchors the reusable paper and preserves root/paper refs', () => {
  const root = React.createRef<ViewInstance>(),
    paper = React.createRef<ViewInstance>();
  render(
    field({
      ref: root,
      slotProps: { root: { testID: 'root' }, paper: { testID: 'paper', ref: paper } },
    }),
  );
  expect(screen.getByTestId('paper')).toHaveStyle({
    position: 'absolute',
    top: 200,
    left: 100,
    transformOrigin: [0, 0, 0],
  });
  expect(root.current !== null).toBe(true);
  expect(paper.current !== null).toBe(true);
  expect(root.current !== paper.current).toBe(true);
  expect(screen.getByText('Popup copy')).toBeTruthy();
});
test('window coordinates convert into inline root coordinates and origin corrections survive clipping', () => {
  rootRect = { left: 20, top: 50, width: viewport.width, height: viewport.height };
  render(
    field({
      anchorEl: anchor(240, 160),
      anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
      transformOrigin: { vertical: 'center', horizontal: 'center' },
    }),
  );
  expect(screen.getByTestId('paper')).toHaveStyle({
    top: 170,
    left: 120,
    transformOrigin: [60, 40, 0],
  });
});
test('anchorPosition bypasses anchor reads and action updates current geometry', () => {
  const action = React.createRef<PopoverActions>(),
    resolve = jest.fn(() => anchor());
  const { rerender } = render(
    field({
      action,
      anchorReference: 'anchorPosition',
      anchorPosition: { top: 120, left: 80 },
      anchorEl: resolve,
    }),
  );
  expect(resolve).not.toHaveBeenCalled();
  expect(screen.getByTestId('paper')).toHaveStyle({ top: 120, left: 80 });
  size = { width: 200, height: 160 };
  act(() => action.current?.updatePosition());
  rerender(
    field({
      action,
      anchorReference: 'anchorPosition',
      anchorPosition: { top: 120, left: 80 },
      transformOrigin: { vertical: 'bottom', horizontal: 'right' },
    }),
  );
  expect(screen.getByTestId('paper')).toHaveStyle({ top: 16, left: 16 });
});
test('none reference preserves authored top/left and updates only transform origin', () => {
  render(
    field({
      anchorReference: 'none',
      transformOrigin: { vertical: 'bottom', horizontal: 'right' },
      slotProps: { paper: { testID: 'paper', style: { top: 44, left: 33 } } },
    }),
  );
  expect(screen.getByTestId('paper')).toHaveStyle({
    top: 44,
    left: 33,
    transformOrigin: [120, 80, 0],
  });
});
test('default Grow waits for measurement while retaining the initial appear lifecycle', () => {
  deferRoot = true;
  const trace: string[] = [];
  render(
    field({
      slotProps: {
        paper: { testID: 'paper' },
        transition: {
          onEnter: (_node, appearing) => trace.push('enter:' + appearing),
          onEntering: () => trace.push('entering'),
          onEntered: () => trace.push('entered'),
        },
      },
    }),
  );
  expect(trace).toEqual([]);
  expect(screen.getByTestId('paper', { includeHiddenElements: true })).toHaveStyle({ opacity: 0 });
  act(() => roots.at(-1)!(0, 0, viewport.width, viewport.height));
  expect(trace).toEqual(['enter:true', 'entering']);
  tick(10);
  expect(trace.at(-1)).toBe('entered');
});
test('closing before position resolves releases the modal without accepting a late measurement', () => {
  deferRoot = true;
  const action = React.createRef<PopoverActions>();
  const { rerender } = render(field({ action }));
  const old = roots.at(-1)!;
  rerender(field({ open: false, action }));
  tick(10);
  expect(screen.queryByTestId('paper', { includeHiddenElements: true })).toBeNull();
  expect(action.current).toBeNull();
  act(() => old(0, 0, viewport.width, viewport.height));
  expect(screen.queryByTestId('paper', { includeHiddenElements: true })).toBeNull();
});
test('later requests win when native window callbacks complete out of order', () => {
  deferRoot = true;
  const { rerender } = render(field({ anchorEl: anchor(200, 100) }));
  const first = roots.at(-1)!;
  rerender(field({ anchorEl: anchor(300, 220) }));
  const last = roots.at(-1)!;
  act(() => last(0, 0, viewport.width, viewport.height));
  expect(screen.getByTestId('paper')).toHaveStyle({ top: 300, left: 220 });
  act(() => first(0, 0, viewport.width, viewport.height));
  expect(screen.getByTestId('paper')).toHaveStyle({ top: 300, left: 220 });
});
test('custom transition auto negotiation and slot timeout precedence follow pinned routing', () => {
  let received: any;
  const Transition = forwardRef<ViewInstance, any>(function Transition(props, ref) {
    received = props;
    return React.cloneElement(props.children, { ref });
  });
  const { rerender } = render(
    field({
      transitionDuration: 'auto',
      slots: { root: Root, paper: Surface, transition: Transition },
      slotProps: { transition: { timeout: 50 } },
    }),
  );
  expect(received.timeout).toBeUndefined();
  rerender(
    field({
      transitionDuration: 80,
      slots: { root: Root, paper: Surface, transition: Transition },
      slotProps: { transition: { timeout: 50, in: false, appear: false } },
    }),
  );
  expect(received.timeout).toBe(80);
  expect(received.in).toBe(false);
  expect(received.appear).toBe(false);
});
test('root slot overrides ordinary props but explicit disableAutoFocus wins and styles merge', () => {
  let received: any;
  const Capture = forwardRef<ViewInstance, PopoverRootProps>(function Capture(props, ref) {
    received = props;
    return <Root {...props} ref={ref} />;
  });
  render(
    field({
      testID: 'top',
      disableAutoFocus: false,
      style: { padding: 3 },
      slots: { root: Capture, paper: Surface },
      slotProps: {
        root: { testID: 'slot', disableAutoFocus: true, style: { margin: 5 } },
        paper: { testID: 'paper', elevation: 4 },
      },
    }),
  );
  expect(received.testID).toBe('slot');
  expect(received.disableAutoFocus).toBe(false);
  expect(StyleSheet.flatten(received.style)).toMatchObject({ padding: 3, margin: 5 });
});
test('paper slot and root style overrides remain scoped, with vertical native scrolling', () => {
  const theme = createTheme({
    components: {
      MuiPopover: { styleOverrides: { root: { padding: 3 }, paper: { borderWidth: 2 } } },
    },
  });
  render(<ThemeProvider theme={theme}>{field()}</ThemeProvider>);
  expect(screen.getByTestId('root')).toHaveStyle({ padding: 3 });
  expect(StyleSheet.flatten(screen.getByTestId('paper').props.style).padding).not.toBe(3);
  expect(screen.getByTestId('paper')).toHaveStyle({ borderWidth: 2, minHeight: 16 });
  expect(screen.UNSAFE_getAllByType(ScrollView).length).toBe(1);
});
test('native readiness close with exit disabled still reports exited exactly once', () => {
  const exited = jest.fn();
  const field = (open: boolean) => (
    <NativeTransitionReadiness.Provider value={false}>
      <Grow in={open} exit={false} timeout={10} onExited={exited}>
        <View />
      </Grow>
    </NativeTransitionReadiness.Provider>
  );
  const { rerender } = render(field(true));
  rerender(field(false));
  expect(exited).toHaveBeenCalledTimes(1);
});

test.each(['component', 'key'])(
  'transition %s replacement hides stale geometry until measured',
  (kind) => {
    const { rerender } = render(field());
    tick(10);
    deferRoot = true;
    const entering = jest.fn();
    rerender(
      field({
        slots: { root: Root, paper: Surface, transition: kind === 'component' ? Fade : Grow },
        slotProps: {
          paper: { testID: 'paper' },
          transition: { key: 'replacement', onEnter: entering } as any,
        },
      }),
    );
    expect(entering).not.toHaveBeenCalled();
    expect(screen.getByTestId('paper', { includeHiddenElements: true })).toHaveStyle({
      opacity: 0,
    });
    act(() => roots.at(-1)!(0, 0, viewport.width, viewport.height));
    expect(entering).toHaveBeenCalledTimes(1);
  },
);
test.each([Grow, Fade])(
  'transition layout handler preserves internal paper sizing fallback with %p',
  (Transition) => {
    offsetDimensions = false;
    const handler = jest.fn();
    render(
      field({
        slots: { root: Root, paper: Surface, transition: Transition },
        slotProps: { paper: { testID: 'paper' }, transition: { onLayout: handler } },
      }),
    );
    fireEvent(screen.getByTestId('paper', { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 80 } },
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('paper')).toHaveStyle({ top: 200, left: 100 });
  },
);
test('overlay coordinates stay LTR while resolved root sx restores RTL content', () => {
  const theme = createTheme({
    direction: 'ltr',
    components: {
      MuiPopover: { styleOverrides: { root: { direction: 'rtl' } } },
    },
  });
  render(<ThemeProvider theme={theme}>{field({ sx: { direction: 'rtl' } })}</ThemeProvider>);
  expect(screen.getByTestId('root')).toHaveStyle({ direction: 'ltr' });
  expect(screen.getByTestId('paper')).toHaveStyle({ direction: 'rtl', left: 100 });
});

test('an opaque paper replacing its native node invalidates the old placement', () => {
  let leaf = 'first';
  const Replaceable = forwardRef<ViewInstance, PopoverPaperProps>(function Replaceable(props, ref) {
    return <Surface {...props} key={leaf} ref={ref} />;
  });
  const slots = { root: Root, paper: Replaceable };
  const { rerender } = render(field({ slots }));
  tick(10);
  deferRoot = true;
  leaf = 'second';
  rerender(field({ slots }));
  expect(screen.getByTestId('paper', { includeHiddenElements: true })).toHaveStyle({ opacity: 0 });
  act(() => roots.at(-1)!(0, 0, viewport.width, viewport.height));
  expect(screen.getByTestId('paper')).toHaveStyle({ top: 200, left: 100 });
});
test('reopening rejects old measurement and waits for its own anchor', () => {
  const { rerender } = render(field());
  tick(10);
  deferRoot = true;
  rerender(field({ anchorEl: anchor(240, 160) }));
  const stale = roots.at(-1)!;
  rerender(field({ open: false }));
  rerender(field({ anchorEl: anchor(320, 200) }));
  const fresh = roots.at(-1)!;
  act(() => stale(0, 0, viewport.width, viewport.height));
  expect(screen.getByTestId('paper', { includeHiddenElements: true })).toHaveStyle({ opacity: 0 });
  act(() => fresh(0, 0, viewport.width, viewport.height));
  expect(screen.getByTestId('paper')).toHaveStyle({ top: 320, left: 200 });
});
test('native anchor uses window measurement and updates after resize', () => {
  const resolve = jest.fn((callback) => callback(370, 790, 40, 20));
  const nativeAnchor = { measureInWindow: resolve } as unknown as ViewInstance;
  const { unmount } = render(field({ anchorEl: nativeAnchor }));
  expect(resolve).toHaveBeenCalled();
  const window = Dimensions.get('window'),
    screenSize = Dimensions.get('screen');
  try {
    act(() =>
      Dimensions.set({ window: { ...window, width: 400, height: 800 }, screen: screenSize }),
    );
    expect(screen.getByTestId('paper')).toHaveStyle({
      top: 704,
      left: 264,
      transformOrigin: [106, 86, 0],
    });
  } finally {
    unmount();
    act(() => Dimensions.set({ window, screen: screenSize }));
  }
});
test('backdrop dismissal remains controlled with the invisible native backdrop', () => {
  const close = jest.fn();
  render(
    field({
      onClose: close,
      slotProps: { paper: { testID: 'paper' }, backdrop: { testID: 'backdrop' } },
    }),
  );
  fireEvent.press(screen.getByTestId('backdrop'), { target: 1, currentTarget: 1, nativeEvent: {} });
  expect(close).toHaveBeenCalledWith(expect.anything(), 'backdropClick');
  expect(screen.getByTestId('paper')).toBeTruthy();
  expect(screen.getByTestId('backdrop')).toHaveStyle({ backgroundColor: 'transparent' });
});

test.each([false, true])(
  'nested Modal root style cannot replace physical coordinates (callback=%s)',
  (callback) => {
    const inner = { style: { direction: 'rtl' as const }, testID: 'root' };
    render(
      field({
        slotProps: {
          paper: { testID: 'paper' },
          root: {
            slotProps: {
              root: callback ? () => inner : inner,
            },
          },
        },
      }),
    );
    expect(screen.getByTestId('root')).toHaveStyle({ direction: 'ltr' });
    expect(screen.getByTestId('paper')).toHaveStyle({ direction: 'rtl', left: 100 });
  },
);

test('coordinate surface preserves the themed Modal root component and its authored direction', () => {
  const NativeRoot = forwardRef<ViewInstance, any>(function NativeRoot(
    { ownerState, ...props },
    ref,
  ) {
    return <View {...props} ref={ref} testID="themed-root" />;
  });
  const theme = createTheme({
    components: {
      MuiModal: {
        defaultProps: {
          slots: { root: NativeRoot },
          slotProps: { root: () => ({ style: { direction: 'rtl' } }) },
        },
      },
    },
  });
  render(<ThemeProvider theme={theme}>{field()}</ThemeProvider>);
  expect(screen.getByTestId('themed-root')).toHaveStyle({ direction: 'ltr' });
  expect(screen.getByTestId('paper')).toHaveStyle({ direction: 'rtl', left: 100 });
});
