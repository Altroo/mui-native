import React, { forwardRef, useImperativeHandle, useRef, StrictMode } from 'react';
import { Animated, StyleSheet, View, Text, type ViewInstance } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import {
  Collapse,
  collapseClasses,
  getCollapseUtilityClass,
  ThemeProvider,
  createTheme,
  configureDiagnostics,
  type CollapseProps,
  type NativeCollapseSlotProps,
} from '@altroo/mui-native';
import { NativeTransitionReadiness } from '../packages/material/src/transitionReadiness';
import reference from './fixtures/mui-collapse-9.5.0.json';
const animations: Array<{ value: Animated.Value; config: any; stop: jest.Mock }> = [];
let warnings: string[] = [],
  restore: () => void;
beforeEach(() => {
  jest.useFakeTimers();
  animations.length = 0;
  warnings = [];
  restore = configureDiagnostics(({ code }) => warnings.push(code));
  jest.spyOn(Animated, 'timing').mockImplementation((value, config) => {
    const motion = { value: value as Animated.Value, config, stop: jest.fn() };
    animations.push(motion);
    return { start: jest.fn(), stop: motion.stop, reset: jest.fn() };
  });
});
afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  restore();
});
const tick = (time: number) => act(() => jest.advanceTimersByTime(time));
const layout = (width = 120, height = 36) =>
  fireEvent(screen.getByTestId('wrapper', { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height } },
  });
const surface = () => screen.getByTestId('surface', { includeHiddenElements: true });
function measuredSlots() {
  const size = { width: 120, height: 36 },
    state: { value?: string } = {};
  const Root = forwardRef<ViewInstance, NativeCollapseSlotProps>(function Root(
    { ownerState, ...props },
    ref,
  ) {
    state.value = ownerState?.state;
    return <View {...props} ref={ref} testID="surface" />;
  });
  const Wrapper = forwardRef<ViewInstance, NativeCollapseSlotProps>(function Wrapper(
    { ownerState: _owner, ...props },
    ref,
  ) {
    const local = useRef<ViewInstance | null>(null);
    useImperativeHandle(ref, () => {
      Object.defineProperty(local.current, 'clientHeight', {
        get: () => size.height,
        configurable: true,
      });
      Object.defineProperty(local.current, 'clientWidth', {
        get: () => size.width,
        configurable: true,
      });
      return local.current!;
    }, []);
    return <View {...props} ref={local} testID="wrapper" />;
  });
  return { size, state, slots: { root: Root, wrapper: Wrapper } };
}

test('Collapse publishes the pinned utility vocabulary and auto marker', () => {
  expect(Collapse.muiSupportAuto).toBe(reference.muiSupportAuto);
  expect(collapseClasses).toEqual(reference.classes);
  expect(getCollapseUtilityClass('disabled')).toBe(reference.globalDisabled);
});

test.each(reference.fixtures)(
  'pinned lifecycle, timing and native ref contract: $name',
  (input) => {
    const measured = measuredSlots(),
      trace: string[] = [],
      autoSizes: number[] = [],
      slotOwners: unknown[] = [],
      done: Array<() => void> = [];
    const ref = React.createRef<ViewInstance>();
    let open = input.initial;
    const theme = createTheme({
      motion: { reducedMotion: 'reduced' in input && input.reduced ? 'always' : 'never' },
      components: { MuiCollapse: { defaultProps: 'defaults' in input ? input.defaults : {} } },
    });
    const auto = theme.transitions.getAutoHeightDuration;
    theme.transitions.getAutoHeightDuration = (size) => {
      autoSizes.push(size);
      return auto(size);
    };
    const callbacks = Object.fromEntries(
      ['Enter', 'Entering', 'Entered', 'Exit', 'Exiting', 'Exited'].map((phase) => [
        'on' + phase,
        (node: ViewInstance, appearing: boolean) =>
          trace.push(
            phase.toLowerCase() +
              (phase.startsWith('Enter') ? ':' + appearing : '') +
              (node === ref.current ? '' : ':wrong-ref'),
          ),
      ]),
    );
    const field = () => (
      <ThemeProvider theme={theme}>
        <Collapse
          {...(input.props as CollapseProps)}
          {...callbacks}
          ref={ref}
          in={open}
          slots={measured.slots}
          slotProps={{
            root: (owner) => {
              slotOwners.push(owner.state ?? null);
              return {};
            },
          }}
          {...('listener' in input && input.listener
            ? {
                addEndListener: (node: ViewInstance, next: () => void) => {
                  expect(node).toBe(ref.current);
                  done.push(next);
                },
              }
            : {})}
        >
          Content
        </Collapse>
      </ThemeProvider>
    );
    const { rerender } = render(field());
    const measure = () => {
      if (screen.queryAllByTestId('wrapper', { includeHiddenElements: true }).length)
        layout(measured.size.width, measured.size.height);
    };
    const check = (expected: (typeof input.snapshots)[number]) => {
      const mounted =
        screen.queryAllByTestId('surface', { includeHiddenElements: true }).length > 0;
      expect(mounted).toBe(expected.mounted);
      expect(mounted ? measured.state.value : 'unmounted').toBe(expected.state);
      expect(trace).toEqual(expected.trace);
      expect(autoSizes).toEqual(expected.autoSizes);
      expect(slotOwners.every((state) => state === null)).toBe(true);
      if (
        mounted &&
        expected.state === 'entering' &&
        !(
          'reduced' in input &&
          input.reduced &&
          !('disablePrefersReducedMotion' in input.props && input.props.disablePrefersReducedMotion)
        )
      ) {
        expect(animations.at(-1)?.config.duration).toBe(
          parseFloat((expected.style as Record<string, string>).transitionDuration ?? '0'),
        );
      }
    };
    measure();
    check(input.snapshots[0]);
    input.actions.forEach((raw, index) => {
      const action = raw as {
        height?: number;
        width?: number;
        open?: boolean;
        done?: number;
        tick?: number;
      };
      if (typeof action.height === 'number') measured.size.height = action.height;
      if (typeof action.width === 'number') measured.size.width = action.width;
      if (typeof action.open === 'boolean') {
        open = action.open;
        rerender(field());
        measure();
      }
      if (typeof action.height === 'number' || typeof action.width === 'number') measure();
      if (typeof action.done === 'number') {
        const index = action.done;
        act(() => done[index]());
      }
      if (typeof action.tick === 'number') tick(action.tick);
      check(input.snapshots[index + 1]);
    });
  },
);

test('initial appearance waits for native content layout and shares the actual root across refs/listeners', () => {
  const root = React.createRef<ViewInstance>(),
    slot = React.createRef<ViewInstance>(),
    entering = jest.fn(),
    listener = jest.fn();
  render(
    <Collapse
      ref={root}
      in
      appear
      onEnter={entering}
      addEndListener={listener}
      slotProps={{ root: { ref: slot, testID: 'surface' }, wrapper: { testID: 'wrapper' } }}
    >
      <Text>Measured content</Text>
    </Collapse>,
  );
  expect(entering).not.toHaveBeenCalled();
  layout(200, 64);
  expect(entering).toHaveBeenCalledWith(root.current, true);
  expect(slot.current).toBe(root.current);
  expect(listener.mock.calls[0][0]).toBe(root.current);
  expect(animations.at(-1)?.config).toMatchObject({
    toValue: 1,
    duration: 300,
    useNativeDriver: false,
    isInteraction: false,
  });
});

test('collapsed content retains one subtree, blocks hidden accessibility/hits and restores normal layout', () => {
  const field = (open: boolean, collapsedSize: number | string = 0) => (
    <Collapse
      in={open}
      timeout={10}
      collapsedSize={collapsedSize}
      slotProps={{ root: { testID: 'surface' }, wrapper: { testID: 'wrapper' } }}
    >
      <Text testID="content">Details</Text>
    </Collapse>
  );
  const { rerender } = render(field(false));
  layout();
  const content = screen.getByTestId('content', { includeHiddenElements: true }).instance;
  expect(surface().props.pointerEvents).toBe('none');
  expect(surface().props.importantForAccessibility).toBe('no-hide-descendants');
  expect(screen.getByTestId('wrapper', { includeHiddenElements: true })).toHaveStyle({
    position: 'absolute',
    flexShrink: 0,
  });
  rerender(field(true));
  tick(10);
  expect(screen.getByTestId('content').instance).toBe(content);
  expect(surface()).toHaveStyle({ height: 'auto', overflow: 'visible' });
  expect(screen.getByTestId('wrapper').props.style.position).not.toBe('absolute');
  rerender(field(false, '8px'));
  tick(10);
  expect(surface().props.pointerEvents).not.toBe('none');
  expect(surface().props.accessibilityElementsHidden).not.toBe(true);
});

test('horizontal content measures outside the zero-width root and reserves the measured cross axis', () => {
  const { rerender } = render(
    <Collapse
      orientation="horizontal"
      in={false}
      slotProps={{ root: { testID: 'surface' }, wrapper: { testID: 'wrapper' } }}
    >
      <View style={{ width: 120, height: 36 }} />
    </Collapse>,
  );
  layout();
  expect(surface()).toHaveStyle({ width: 0, height: 36, flexDirection: 'row' });
  rerender(
    <Collapse
      orientation="horizontal"
      in
      timeout={10}
      slotProps={{ root: { testID: 'surface' }, wrapper: { testID: 'wrapper' } }}
    >
      <View style={{ width: 120, height: 36 }} />
    </Collapse>,
  );
  expect(animations.at(-1)?.config.toValue).toBe(1);
  tick(10);
  expect(surface()).toHaveStyle({ width: 'auto', overflow: 'visible' });
});

test('interruptions retain progress, reject old listener completion and stop work on unmount', () => {
  const done: Array<() => void> = [],
    entered = jest.fn(),
    exited = jest.fn();
  const props = {
    timeout: 100,
    onEntered: entered,
    onExited: exited,
    addEndListener: (_node: ViewInstance, next: () => void) => done.push(next),
    slotProps: { root: { testID: 'surface' }, wrapper: { testID: 'wrapper' } },
  };
  const { rerender, unmount } = render(
    <Collapse {...props} in={false}>
      <Text>Content</Text>
    </Collapse>,
  );
  layout();
  rerender(
    <Collapse {...props} in>
      <Text>Content</Text>
    </Collapse>,
  );
  const first = animations.at(-1)!;
  act(() => first.value.setValue(0.4));
  rerender(
    <Collapse {...props} in={false}>
      <Text>Content</Text>
    </Collapse>,
  );
  expect(animations.at(-1)!.value).toBe(first.value);
  expect(first.stop).toHaveBeenCalled();
  expect(surface()).toHaveStyle({ height: 14.4 });
  act(() => done[0]());
  expect(entered).not.toHaveBeenCalled();
  unmount();
  act(() => done[1]());
  tick(200);
  expect(exited).not.toHaveBeenCalled();
  expect(animations.at(-1)!.stop).toHaveBeenCalled();
});

test('reduced motion changes stop an active layout animation without duplicate completion', () => {
  const entered = jest.fn();
  const field = (reduced: 'always' | 'never', open: boolean) => (
    <ThemeProvider theme={createTheme({ motion: { reducedMotion: reduced } })}>
      <Collapse
        in={open}
        timeout={100}
        onEntered={entered}
        slotProps={{ root: { testID: 'surface' }, wrapper: { testID: 'wrapper' } }}
      >
        <Text>Content</Text>
      </Collapse>
    </ThemeProvider>
  );
  const { rerender } = render(field('never', false));
  layout();
  rerender(field('never', true));
  const motion = animations.at(-1)!;
  rerender(field('always', true));
  tick(0);
  expect(motion.stop).toHaveBeenCalled();
  expect(entered).toHaveBeenCalledTimes(1);
  expect(surface()).toHaveStyle({ height: 'auto' });
  tick(200);
  expect(entered).toHaveBeenCalledTimes(1);
});

test('theme root/named styles, sx replacement and native styles preserve clear precedence', () => {
  const theme = createTheme({
    components: {
      MuiCollapse: {
        styleOverrides: {
          root: { marginTop: 1 },
          horizontal: { paddingLeft: 3 },
          entered: { opacity: 0.7 },
          wrapper: { paddingBottom: 4 },
          wrapperInner: { paddingLeft: 5 },
        },
        variants: [{ props: { orientation: 'horizontal' }, style: { borderWidth: 2 } }],
      },
    },
  });
  render(
    <ThemeProvider theme={theme}>
      <Collapse
        in
        orientation="horizontal"
        sx={{ mt: 2, mr: 4 }}
        style={{ marginTop: 9 }}
        slotProps={{
          root: { testID: 'surface', sx: { ml: 3 }, style: { marginTop: 11 } },
          wrapper: { testID: 'wrapper', style: { paddingBottom: 6 } },
          wrapperInner: { testID: 'inner' },
        }}
      >
        Text
      </Collapse>
    </ThemeProvider>,
  );
  expect(surface()).toHaveStyle({
    marginTop: 11,
    marginLeft: 24,
    paddingLeft: 3,
    opacity: 0.7,
    borderWidth: 2,
  });
  expect(StyleSheet.flatten(surface().props.style).marginRight).toBeUndefined();
  expect(screen.getByTestId('wrapper')).toHaveStyle({ paddingBottom: 6 });
  expect(screen.getByTestId('inner')).toHaveStyle({ paddingLeft: 5 });
  expect(screen.getByText('Text')).toBeDefined();
});

test('normal expanded content and hidden retained children respect overlay measurement readiness', () => {
  const enter = jest.fn();
  const field = (ready: boolean) => (
    <NativeTransitionReadiness.Provider value={ready}>
      <Collapse
        in
        appear
        onEnter={enter}
        slotProps={{ root: { testID: 'surface' }, wrapper: { testID: 'wrapper' } }}
      >
        <Text>Ready</Text>
      </Collapse>
    </NativeTransitionReadiness.Provider>
  );
  const { rerender } = render(field(false));
  layout();
  expect(enter).not.toHaveBeenCalled();
  rerender(field(true));
  expect(enter).toHaveBeenCalledTimes(1);
});

test('StrictMode replay leaves no stale animation completion after unmount', () => {
  const exited = jest.fn();
  const { rerender, unmount } = render(
    <StrictMode>
      <Collapse
        in={false}
        timeout={20}
        onExited={exited}
        slotProps={{ root: { testID: 'surface' }, wrapper: { testID: 'wrapper' } }}
      >
        <Text>Content</Text>
      </Collapse>
    </StrictMode>,
  );
  layout();
  rerender(
    <StrictMode>
      <Collapse
        in
        timeout={20}
        onExited={exited}
        slotProps={{ root: { testID: 'surface' }, wrapper: { testID: 'wrapper' } }}
      >
        <Text>Content</Text>
      </Collapse>
    </StrictMode>,
  );
  unmount();
  tick(100);
  expect(exited).not.toHaveBeenCalled();
});

test.each([
  { collapsedSize: 0.5, expected: 0.5 },
  { collapsedSize: '8px', expected: 8 },
  { collapsedSize: '1rem', expected: 16 },
  { collapsedSize: 'auto', expected: 0 },
])('native collapsed size resolves $collapsedSize', ({ collapsedSize, expected }) => {
  render(
    <Collapse
      collapsedSize={collapsedSize}
      in={false}
      slotProps={{ root: { testID: 'surface' }, wrapper: { testID: 'wrapper' } }}
    >
      <Text>Content</Text>
    </Collapse>,
  );
  layout();
  expect(surface()).toHaveStyle({ height: expected });
  expect(warnings).not.toContain('collapse-size');
});

test('percentage collapsed size resolves against its actual native parent', () => {
  const Root = forwardRef<ViewInstance, NativeCollapseSlotProps>(function Root(
    { ownerState: _owner, ...props },
    ref,
  ) {
    const local = useRef<ViewInstance | null>(null);
    useImperativeHandle(ref, () => {
      Object.defineProperty(local.current, 'parentElement', {
        get: () => ({ clientWidth: 300, clientHeight: 200 }),
        configurable: true,
      });
      return local.current!;
    }, []);
    return <View {...props} testID="surface" ref={local} />;
  });
  render(
    <Collapse
      collapsedSize="10%"
      in={false}
      slots={{ root: Root }}
      slotProps={{ wrapper: { testID: 'wrapper' } }}
    >
      <Text>Content</Text>
    </Collapse>,
  );
  layout();
  expect(surface()).toHaveStyle({ height: 20 });
  expect(warnings).not.toContain('collapse-size');
});

test('a ref-only wrapper can provide public geometry at the native root layout receipt', () => {
  const measured = measuredSlots(),
    entered = jest.fn();
  render(
    <Collapse in appear timeout={10} slots={measured.slots} onEntered={entered}>
      <Text>Content</Text>
    </Collapse>,
  );
  fireEvent(surface(), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 0 } },
  });
  tick(10);
  expect(entered).toHaveBeenCalledTimes(1);
});

test('changing wrapper keys retires old layout callbacks and waits for the new wrapper', () => {
  let oldLayout: ((event: any) => void) | undefined;
  const Wrapper = forwardRef<ViewInstance, NativeCollapseSlotProps>(function Wrapper(
    { ownerState: _owner, ...props },
    ref,
  ) {
    oldLayout = props.onLayout;
    return <View {...props} ref={ref} testID="wrapper" />;
  });
  const field = (key: string, open = false) => (
    <Collapse
      in={open}
      slots={{ wrapper: Wrapper }}
      slotProps={{ root: { testID: 'surface' }, wrapper: { key } }}
    >
      <Text>Content</Text>
    </Collapse>
  );
  const { rerender } = render(field('a'));
  layout(120, 36);
  const stale = oldLayout!;
  rerender(field('b'));
  act(() => stale({ nativeEvent: { layout: { x: 0, y: 0, width: 900, height: 900 } } }));
  rerender(field('b', true));
  expect(animations).toHaveLength(0);
  layout(160, 48);
  expect(animations.at(-1)?.config.toValue).toBe(1);
});

test('React19 callback-ref cleanup reaches root and both named wrapper slots once', () => {
  const clean = [jest.fn(), jest.fn(), jest.fn()];
  const refs = clean.map((cleanup) => jest.fn((_node: ViewInstance) => cleanup));
  const { unmount } = render(
    <Collapse
      in
      slotProps={{
        root: { ref: refs[0] },
        wrapper: { ref: refs[1] },
        wrapperInner: { ref: refs[2] },
      }}
    >
      <Text>Content</Text>
    </Collapse>,
  );
  unmount();
  clean.forEach((finish) => expect(finish).toHaveBeenCalledTimes(1));
});

test('zero-size hidden state wins over visible overflow and false aria-hidden without discarding authored styles', () => {
  const field = (open: boolean) => (
    <Collapse
      in={open}
      timeout={10}
      aria-hidden={false}
      style={{ overflow: 'visible', opacity: 0.6 }}
      slotProps={{
        root: { testID: 'surface', 'aria-hidden': false },
        wrapper: { testID: 'wrapper' },
      }}
    >
      <Text>Hidden content</Text>
    </Collapse>
  );
  const { rerender } = render(field(false));
  layout();
  expect(surface()).toHaveStyle({ opacity: 0 });
  expect(surface().props['aria-hidden']).toBe(true);
  rerender(field(true));
  tick(10);
  expect(surface()).toHaveStyle({ opacity: 0.6 });
  expect(surface().props['aria-hidden']).toBe(false);
});

test.each(['root', 'wrapper', 'wrapperInner'] as const)(
  'slotProps.%s.component selects the native leaf',
  (slot) => {
    const Leaf = forwardRef<ViewInstance, NativeCollapseSlotProps>(function Leaf(
      { ownerState: _owner, ...props },
      ref,
    ) {
      return <View {...props} ref={ref} testID="leaf" />;
    });
    render(
      <Collapse in slotProps={{ [slot]: { component: Leaf } }}>
        <Text>Content</Text>
      </Collapse>,
    );
    expect(screen.getByTestId('leaf')).toBeDefined();
  },
);

test('a custom root receives the slot leaf through as, before the top-level component', () => {
  let actual: unknown;
  const Top = forwardRef<ViewInstance, NativeCollapseSlotProps>(function Top(props, ref) {
    return <View {...props} ref={ref} testID="top-leaf" />;
  });
  const Leaf = forwardRef<ViewInstance, NativeCollapseSlotProps>(function Leaf(
    { ownerState: _owner, ...props },
    ref,
  ) {
    return <View {...props} ref={ref} testID="slot-leaf" />;
  });
  const Root = forwardRef<
    ViewInstance,
    NativeCollapseSlotProps & { as?: React.ComponentType<any> }
  >(function Root({ as: Component = View, ownerState: _owner, ...props }, ref) {
    actual = Component;
    return <Component {...props} ref={ref} />;
  });
  render(
    <Collapse in component={Top} slots={{ root: Root }} slotProps={{ root: { component: Leaf } }}>
      Content
    </Collapse>,
  );
  expect(actual).toBe(Leaf);
  expect(screen.queryByTestId('top-leaf')).toBeNull();
  expect(screen.getByTestId('slot-leaf')).toBeDefined();
});

test('a ref-only wrapper publishes changed natural size before the next animation target', () => {
  const measured = measuredSlots();
  const field = (open: boolean) => (
    <Collapse in={open} timeout="auto" slots={measured.slots}>
      Content
    </Collapse>
  );
  const { rerender } = render(field(false));
  layout();
  measured.size.height = 72;
  rerender(field(true));
  act(() => animations.at(-1)!.value.setValue(0.5));
  expect(surface()).toHaveStyle({ height: 36 });
});

test('literal text inherits wrapper and inner font/color overrides', () => {
  render(
    <Collapse
      in
      style={{ fontSize: 10, color: 'red' }}
      slotProps={{
        wrapper: { sx: { fontSize: 18, color: 'green' } },
        wrapperInner: { sx: { fontSize: 24, color: 'blue' } },
      }}
    >
      Inherited text
    </Collapse>,
  );
  expect(screen.getByText('Inherited text')).toHaveStyle({ fontSize: 24, color: 'blue' });
});

test('top-level generic root props win while owned measurement remains composed', () => {
  const top = jest.fn(),
    slot = jest.fn();
  render(
    <Collapse
      in
      accessibilityLabel="Top"
      onTouchEnd={top}
      slotProps={{ root: { testID: 'surface', accessibilityLabel: 'Slot', onTouchEnd: slot } }}
    >
      Content
    </Collapse>,
  );
  expect(surface().props.accessibilityLabel).toBe('Top');
  fireEvent(surface(), 'touchEnd', { nativeEvent: {} });
  expect(top).toHaveBeenCalledTimes(1);
  expect(slot).not.toHaveBeenCalled();
});

test.each(['orientation', 'key', 'component'] as const)(
  'active %s replacement preserves progress and waits for fresh geometry',
  (kind) => {
    const enter = jest.fn(),
      entering = jest.fn(),
      entered = jest.fn(),
      done: Array<() => void> = [];
    const Replacement = forwardRef<ViewInstance, NativeCollapseSlotProps>(function Replacement(
      { ownerState: _owner, ...props },
      ref,
    ) {
      return <View {...props} ref={ref} testID="wrapper" />;
    });
    const field = (changed: boolean, open: boolean) => (
      <Collapse
        in={open}
        timeout={100}
        orientation={changed && kind === 'orientation' ? 'horizontal' : 'vertical'}
        onEnter={enter}
        onEntering={entering}
        onEntered={entered}
        addEndListener={(_node, next) => done.push(next)}
        slots={kind === 'component' && changed ? { wrapper: Replacement } : {}}
        slotProps={{
          root: { testID: 'surface' },
          wrapper: { testID: 'wrapper', key: changed && kind === 'key' ? 'new' : 'old' },
        }}
      >
        Content
      </Collapse>
    );
    const { rerender } = render(field(false, false));
    layout();
    rerender(field(false, true));
    const value = animations.at(-1)!.value;
    act(() => value.setValue(0.4));
    rerender(field(true, true));
    act(() => done[0]());
    tick(200);
    expect(entered).not.toHaveBeenCalled();
    layout(200, 60);
    expect(animations.at(-1)!.value).toBe(value);
    expect(surface()).toHaveStyle(kind === 'orientation' ? { width: 80 } : { height: 24 });
    expect(enter).toHaveBeenCalledTimes(1);
    expect(entering).toHaveBeenCalledTimes(1);
    tick(99);
    expect(entered).not.toHaveBeenCalled();
    tick(1);
    expect(entered).toHaveBeenCalledTimes(1);
  },
);

test('a disabled exit collapses immediately while replacement layout is unmeasured', () => {
  const exited = jest.fn();
  const field = (open: boolean, key: string) => (
    <Collapse
      in={open}
      timeout={100}
      exit={false}
      onExited={exited}
      slotProps={{ root: { testID: 'surface' }, wrapper: { testID: 'wrapper', key } }}
    >
      Content
    </Collapse>
  );
  const { rerender } = render(field(false, 'old'));
  layout();
  rerender(field(true, 'old'));
  act(() => animations.at(-1)!.value.setValue(0.4));
  rerender(field(true, 'new'));
  rerender(field(false, 'new'));
  expect(exited).toHaveBeenCalledTimes(1);
  expect(surface()).toHaveStyle({ height: 0, opacity: 0 });
});

test.each(['enter', 'exit'] as const)(
  'a %s completion batched with wrapper replacement waits for the committed geometry',
  (direction) => {
    const entered = jest.fn(),
      exited = jest.fn(),
      done: Array<() => void> = [];
    const opening = direction === 'enter';
    const field = (changed: boolean, open: boolean) => (
      <Collapse
        in={open}
        timeout={100}
        onEntered={entered}
        onExited={exited}
        addEndListener={(_node, finish) => done.push(finish)}
        slotProps={{
          root: { testID: 'surface' },
          wrapper: { testID: 'wrapper', key: changed ? 'new' : 'old' },
        }}
      >
        Content
      </Collapse>
    );
    const { rerender } = render(field(false, !opening));
    layout();
    rerender(field(false, opening));
    act(() => {
      done[0]();
      rerender(field(true, opening));
    });
    const complete = opening ? entered : exited;
    expect(complete).not.toHaveBeenCalled();
    layout(200, 60);
    tick(100);
    expect(complete).toHaveBeenCalledTimes(1);
  },
);

test.each(['orientation', 'key', 'component'] as const)(
  'active exit %s replacement preserves progress and ignores the retired completion',
  (kind) => {
    const exited = jest.fn(),
      exit = jest.fn(),
      exiting = jest.fn(),
      done: Array<() => void> = [];
    const Replacement = forwardRef<ViewInstance, NativeCollapseSlotProps>(function Replacement(
      { ownerState: _owner, ...props },
      ref,
    ) {
      return <View {...props} ref={ref} testID="wrapper" />;
    });
    const field = (changed: boolean, open: boolean) => (
      <Collapse
        in={open}
        timeout={100}
        orientation={changed && kind === 'orientation' ? 'horizontal' : 'vertical'}
        slots={kind === 'component' && changed ? { wrapper: Replacement } : {}}
        onExited={exited}
        onExit={exit}
        onExiting={exiting}
        addEndListener={(_node, finish) => done.push(finish)}
        slotProps={{
          root: { testID: 'surface' },
          wrapper: { testID: 'wrapper', key: changed && kind === 'key' ? 'new' : 'old' },
        }}
      >
        Content
      </Collapse>
    );
    const { rerender } = render(field(false, true));
    layout();
    rerender(field(false, false));
    const value = animations.at(-1)!.value;
    act(() => value.setValue(0.4));
    rerender(field(true, false));
    act(() => done[0]());
    tick(200);
    expect(exited).not.toHaveBeenCalled();
    layout(200, 60);
    expect(animations.at(-1)!.value).toBe(value);
    expect(surface()).toHaveStyle(kind === 'orientation' ? { width: 80 } : { height: 24 });
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exiting).toHaveBeenCalledTimes(1);
    tick(100);
    expect(exited).toHaveBeenCalledTimes(1);
  },
);

test('an orientation change preserves the mounted child state', () => {
  let mounts = 0;
  function Child() {
    const [id] = React.useState(() => ++mounts);
    return <Text>Child {id}</Text>;
  }
  const field = (orientation: CollapseProps['orientation']) => (
    <Collapse in orientation={orientation}>
      <Child />
    </Collapse>
  );
  const { rerender } = render(field('vertical'));
  rerender(field('horizontal'));
  expect(screen.getByText('Child 1')).toBeDefined();
  expect(mounts).toBe(1);
});

test.each(['enter', 'exit'] as const)(
  'a %s completion batched with an internal native leaf replacement retains progress',
  (direction) => {
    let replace: () => void = () => {};
    const Wrapper = forwardRef<ViewInstance, NativeCollapseSlotProps>(function Wrapper(
      { ownerState: _owner, ...props },
      ref,
    ) {
      const [key, setKey] = React.useState(0);
      replace = () => setKey((old) => old + 1);
      return <View {...props} key={key} ref={ref} testID="wrapper" />;
    });
    const done: Array<() => void> = [],
      complete = jest.fn();
    const opening = direction === 'enter';
    const field = (open: boolean) => (
      <Collapse
        in={open}
        timeout={100}
        slots={{ wrapper: Wrapper }}
        onEntered={opening ? complete : undefined}
        onExited={opening ? undefined : complete}
        addEndListener={(_node, finish) => done.push(finish)}
        slotProps={{ root: { testID: 'surface' } }}
      >
        Content
      </Collapse>
    );
    const { rerender } = render(field(!opening));
    layout();
    rerender(field(opening));
    const value = animations.at(-1)!.value;
    act(() => value.setValue(0.4));
    act(() => {
      done[0]();
      replace();
    });
    expect(complete).not.toHaveBeenCalled();
    expect(surface()).toHaveStyle({ height: 14.4 });
    tick(200);
    expect(complete).not.toHaveBeenCalled();
    layout(200, 60);
    expect(animations.at(-1)!.value).toBe(value);
    expect(surface()).toHaveStyle({ height: 24 });
    tick(100);
    expect(complete).toHaveBeenCalledTimes(1);
  },
);

test('native component/as and generic prop precedence match original slot observations', () => {
  const observed: Record<string, unknown> = {},
    clicks: string[] = [];
  const leaves = new Map<React.ComponentType<any>, string>();
  const leaf = (name: string) => {
    const Component = forwardRef<ViewInstance, NativeCollapseSlotProps>(function Leaf(props, ref) {
      return <View {...props} ref={ref} />;
    });
    leaves.set(Component, name);
    return Component;
  };
  const Top = leaf('nav'),
    RootLeaf = leaf('article'),
    WrapperLeaf = leaf('aside'),
    InnerLeaf = leaf('section');
  const slot = (name: string) =>
    forwardRef<ViewInstance, NativeCollapseSlotProps>(function Slot(
      { as: Leaf = View, ownerState: _owner, ...props },
      ref,
    ) {
      observed[name] = leaves.get(Leaf);
      return <Leaf {...props} ref={ref} />;
    });
  render(
    <Collapse
      in
      component={Top}
      id="top-id"
      accessibilityLabel="Top"
      onTouchEnd={() => clicks.push('top')}
      slots={{ root: slot('root'), wrapper: slot('wrapper'), wrapperInner: slot('inner') }}
      slotProps={{
        root: {
          component: RootLeaf,
          testID: 'surface',
          id: 'slot-id',
          accessibilityLabel: 'Slot',
          onTouchEnd: () => clicks.push('slot'),
        },
        wrapper: { component: WrapperLeaf },
        wrapperInner: { component: InnerLeaf },
      }}
    >
      Content
    </Collapse>,
  );
  fireEvent(surface(), 'touchEnd', { nativeEvent: {} });
  expect({
    ...observed,
    id: surface().props.nativeID,
    title: surface().props.accessibilityLabel,
    clicks,
  }).toEqual(reference.slotComposition);
});

test.each(['enter', 'exit'] as const)(
  'a listener fired during %s ref cleanup revalidates the reattached same node',
  (direction) => {
    const done: Array<() => void> = [],
      complete = jest.fn();
    const opening = direction === 'enter';
    const oldRef = (_node: ViewInstance) => () => done[0]?.();
    const newRef = (_node: ViewInstance) => () => {};
    const field = (open: boolean, changed = false) => (
      <Collapse
        in={open}
        timeout={100}
        addEndListener={(_node, finish) => done.push(finish)}
        onEntered={opening ? complete : undefined}
        onExited={opening ? undefined : complete}
        slotProps={{
          root: { testID: 'surface' },
          wrapper: { testID: 'wrapper', ref: changed ? newRef : oldRef },
        }}
      >
        Content
      </Collapse>
    );
    const { rerender } = render(field(!opening));
    layout();
    rerender(field(opening));
    rerender(field(opening, true));
    tick(100);
    expect(complete).toHaveBeenCalledTimes(1);
  },
);
