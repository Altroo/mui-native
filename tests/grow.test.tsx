import reference from './fixtures/mui-grow-9.5.0.json';
import React, { forwardRef, useRef, useImperativeHandle, StrictMode } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  type ViewInstance,
  type ViewProps,
  AccessibilityInfo,
} from 'react-native';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react-native';
import { Grow, Fade, ThemeProvider, createTheme } from '../packages/material/src';
const animations: Array<{
  value: Animated.Value;
  config: any;
  finish?: (result: { finished: boolean }) => void;
  stop: jest.Mock;
}> = [];
beforeEach(() => {
  jest.useFakeTimers();
  animations.length = 0;
  jest.spyOn(Animated, 'timing').mockImplementation((value, config) => {
    const motion = {
      value: value as Animated.Value,
      config,
      finish: undefined as ((result: { finished: boolean }) => void) | undefined,
      stop: jest.fn(),
    };
    animations.push(motion);
    return {
      start: (done) => {
        motion.finish = done;
      },
      stop: motion.stop,
      reset: jest.fn(),
    };
  });
});
afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});
const tick = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });
const Measured = forwardRef<ViewInstance, ViewProps & { height?: number; read?: () => void }>(
  function Measured({ height = 36, read, ...props }, ref) {
    const local = useRef<ViewInstance | null>(null),
      value = useRef(height);
    value.current = height;
    useImperativeHandle(ref, () => {
      Object.defineProperty(local.current, 'clientHeight', {
        get: () => {
          read?.();
          return value.current;
        },
        configurable: true,
      });
      return local.current!;
    }, []);
    return <View {...props} ref={local} />;
  },
);
const traceProps = (trace: string[]) => ({
  onEnter: (_node: ViewInstance, appearing: boolean) => trace.push('enter:' + appearing),
  onEntering: (_node: ViewInstance, appearing: boolean) => trace.push('entering:' + appearing),
  onEntered: (_node: ViewInstance, appearing: boolean) => trace.push('entered:' + appearing),
  onExit: () => trace.push('exit'),
  onExiting: () => trace.push('exiting'),
  onExited: () => trace.push('exited'),
});
test('Grow exposes auto support and uses measured native height for lifecycle and split native-driver timing', () => {
  const trace: string[] = [];
  const field = (open: boolean) => (
    <Grow in={open} {...traceProps(trace)}>
      <Measured height={36} testID="surface" />
    </Grow>
  );
  const { rerender } = render(field(true));
  expect(Grow.muiSupportAuto).toBe(true);
  expect(trace).toEqual(['enter:true', 'entering:true']);
  expect(animations[0].config).toMatchObject({
    duration: 192,
    delay: 0,
    useNativeDriver: true,
    isInteraction: false,
  });
  expect(animations[1].config).toMatchObject({
    duration: 128,
    delay: 0,
    useNativeDriver: true,
    isInteraction: false,
  });
  tick(191);
  expect(trace).toHaveLength(2);
  tick(1);
  expect(trace.at(-1)).toBe('entered:true');
  rerender(field(false));
  expect(animations.at(-2)?.config.duration).toBe(192);
  expect(animations.at(-1)?.config).toMatchObject({ duration: 128, delay: 64 });
  tick(192);
  expect(trace.at(-1)).toBe('exited');
  expect(screen.getByTestId('surface', { includeHiddenElements: true })).toHaveStyle({
    opacity: 0,
    transform: [{ scaleX: 0.75 }, { scaleY: 0.5625 }],
  });
});
test('numeric appear timeout controls completion while enter duration controls the actual animation', () => {
  const trace: string[] = [];
  render(
    <Grow in timeout={{ appear: 10, enter: 60, exit: 90 }} {...traceProps(trace)}>
      <View />
    </Grow>,
  );
  expect(animations.map((x) => x.config.duration)).toEqual([60, 40]);
  tick(10);
  expect(trace.at(-1)).toBe('entered:true');
});
test('auto height overrides authored style duration and reads new geometry only at the next phase', () => {
  const auto = jest.fn((height: number) => height * 2 + 1),
    entered = jest.fn();
  const theme = createTheme({ transitions: { getAutoHeightDuration: auto } });
  const field = (height: number, open: boolean) => (
    <ThemeProvider theme={theme}>
      <Grow in={open} style={{ transitionDuration: '500ms' }} onEntered={entered}>
        <Measured height={height} />
      </Grow>
    </ThemeProvider>
  );
  const { rerender } = render(field(20, true));
  expect(auto).toHaveBeenLastCalledWith(20);
  expect(animations[0].config.duration).toBe(41);
  tick(10);
  rerender(field(50, true));
  expect(auto).toHaveBeenCalledTimes(1);
  tick(31);
  expect(entered).toHaveBeenCalledTimes(1);
  rerender(field(50, false));
  expect(auto).toHaveBeenLastCalledWith(50);
  expect(animations.at(-2)?.config.duration).toBe(101);
});
test('string duration retains full transform duration and string zero delay avoids the default exit delay', () => {
  const field = (open: boolean) => (
    <Grow in={open} timeout={20} style={{ transitionDuration: '120ms', transitionDelay: '0ms' }}>
      <View />
    </Grow>
  );
  const { rerender } = render(field(true));
  expect(animations.map((x) => x.config.duration)).toEqual([120, 120]);
  rerender(field(false));
  expect(animations.at(-1)?.config).toMatchObject({ duration: 120, delay: 0 });
});
test('interrupted phases stop both drivers and old listener completions cannot finish a new cycle', () => {
  const trace: string[] = [],
    done: Array<() => void> = [];
  const field = (open: boolean) => (
    <Grow
      in={open}
      timeout={100}
      {...traceProps(trace)}
      addEndListener={(_node, next) => done.push(next)}
    >
      <View />
    </Grow>
  );
  const { rerender } = render(field(true));
  const old = animations.slice();
  rerender(field(false));
  const oldExit = done.at(-1)!;
  rerender(field(true));
  expect(old.every((x) => x.stop.mock.calls.length > 0)).toBe(true);
  act(() => oldExit());
  expect(trace.at(-1)).toBe('entering:false');
  act(() => done.at(-1)!());
  tick(200);
  expect(trace.filter((x) => x === 'entered:false')).toHaveLength(1);
  expect(trace).not.toContain('exited');
});
test('callbacks and refs remain available through exit and detach after unmountOnExit', () => {
  const caller = React.createRef<ViewInstance>(),
    child = React.createRef<ViewInstance>(),
    exited = jest.fn();
  const field = (open: boolean) => (
    <Grow
      in={open}
      mountOnEnter
      unmountOnExit
      timeout={10}
      ref={caller}
      onExited={(node) => {
        expect(node === caller.current).toBe(true);
        exited();
      }}
    >
      <View ref={child} />
    </Grow>
  );
  const { rerender } = render(field(false));
  expect(caller.current).toBeNull();
  rerender(field(true));
  expect(caller.current === child.current).toBe(true);
  tick(10);
  rerender(field(false));
  tick(10);
  expect(exited).toHaveBeenCalledTimes(1);
  expect(caller.current).toBeNull();
  expect(child.current).toBeNull();
});
test('reduced motion skips geometry reads and both animations, while opt-out preserves them', () => {
  const read = jest.fn(),
    auto = jest.fn(() => 50),
    theme = createTheme({
      motion: { reducedMotion: 'always' },
      transitions: { getAutoHeightDuration: auto },
    });
  const Child = forwardRef<ViewInstance, ViewProps>(function Child(props, ref) {
    const local = useRef<ViewInstance | null>(null);
    useImperativeHandle(ref, () => {
      Object.defineProperty(local.current, 'clientHeight', {
        get: () => {
          read();
          return 20;
        },
        configurable: true,
      });
      return local.current!;
    }, []);
    return <View {...props} ref={local} />;
  });
  const field = (disable: boolean) => (
    <ThemeProvider theme={theme}>
      <Grow in disablePrefersReducedMotion={disable}>
        <Child />
      </Grow>
    </ThemeProvider>
  );
  const { unmount } = render(field(false));
  tick(0);
  expect(read).not.toHaveBeenCalled();
  expect(auto).not.toHaveBeenCalled();
  expect(animations).toHaveLength(0);
  unmount();
  render(field(true));
  expect(read).toHaveBeenCalledTimes(1);
  expect(animations).toHaveLength(2);
});
test('StrictMode fires lifecycle callbacks once and unmount cancels work', () => {
  const trace: string[] = [];
  const { unmount } = render(
    <StrictMode>
      <Grow in timeout={20} {...traceProps(trace)}>
        <View />
      </Grow>
    </StrictMode>,
  );
  tick(20);
  expect(trace).toEqual(['enter:true', 'entering:true', 'entered:true']);
  unmount();
  tick(100);
  expect(animations.every((x) => x.stop.mock.calls.length > 0)).toBe(true);
});
test('idle Grow has no transform graph and closed state preserves layout without hit testing', () => {
  const { rerender } = render(
    <Grow in appear={false}>
      <View testID="surface" style={{ height: 17 }} />
    </Grow>,
  );
  expect(animations).toHaveLength(0);
  expect(screen.getByTestId('surface')).toHaveStyle({ transform: [] });
  rerender(
    <Grow in={false} exit={false}>
      <View testID="surface" style={{ height: 17 }} />
    </Grow>,
  );
  const hidden = screen.getByTestId('surface', { includeHiddenElements: true });
  expect(hidden).toHaveStyle({ height: 17, opacity: 0 });
  expect(StyleSheet.flatten(hidden.props.style).display).not.toBe('none');
  expect(hidden.props.pointerEvents).toBe('none');
});

test.each([
  ['Grow', Grow],
  ['Fade', Fade],
] as const)(
  '%s settles an actively canceled native driver at the authored lifecycle boundary',
  (_name, Transition) => {
    const entered = jest.fn();
    render(
      <Transition in timeout={20} onEntered={entered}>
        <View testID="surface" />
      </Transition>,
    );
    const active = animations.slice();
    act(() => {
      for (const animation of active) animation.finish?.({ finished: false });
    });
    expect(entered).not.toHaveBeenCalled();
    tick(20);
    expect(entered).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('surface')).toHaveStyle({ opacity: 1 });
    if (Transition === Grow) expect(screen.getByTestId('surface')).toHaveStyle({ transform: [] });
  },
);
test('auto layout fallback survives a callback ref swap on the same native node', () => {
  const auto = jest.fn(() => 100),
    theme = createTheme({ transitions: { getAutoHeightDuration: auto } }),
    first = jest.fn(),
    second = jest.fn();
  const field = (open: boolean, ref: React.Ref<ViewInstance>) => (
    <ThemeProvider theme={theme}>
      <Grow in={open}>
        <Measured ref={ref} height={NaN} testID="surface" />
      </Grow>
    </ThemeProvider>
  );
  const { rerender } = render(field(false, first));
  fireEvent(screen.getByTestId('surface', { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { height: 48, width: 10, x: 0, y: 0 } },
  });
  rerender(field(false, second));
  rerender(field(true, second));
  expect(auto).toHaveBeenLastCalledWith(48);
});
test('transition children preserve their authored keys and remount state when a key changes', () => {
  const Child = forwardRef<ViewInstance, { identity: string }>(function Child({ identity }, ref) {
    const [initial] = React.useState(identity);
    return <View ref={ref} testID="child" accessibilityLabel={initial} />;
  });
  const field = (key: string) => (
    <Grow in appear={false}>
      <Child key={key} identity={key} />
    </Grow>
  );
  const { rerender } = render(field('first'));
  rerender(field('second'));
  expect(screen.getByTestId('child').props.accessibilityLabel).toBe('second');
});

test.each(reference.fixtures)('pinned original Grow contract: $name', (input: any) => {
  const trace: string[] = [],
    done: Array<() => void> = [],
    factoryCalls: Array<any> = [],
    autoHeights: number[] = [];
  let height = input.height ?? 36,
    open = input.initial,
    heightReads = 0;
  const theme = createTheme({
    motion: { reducedMotion: input.reduced ? 'always' : 'never' },
    ...(input.themeDefaults
      ? { components: { MuiGrow: { defaultProps: { timeout: 500, appear: false } } } }
      : {}),
  });
  const originalCreate = theme.transitions.create,
    originalAuto = theme.transitions.getAutoHeightDuration;
  theme.transitions.create = (property, options) => {
    const output = input.customFactory
      ? `${property} ${property === 'opacity' ? 7 : 11}ms linear ${property === 'opacity' ? 2 : 3}ms`
      : originalCreate(property, options);
    factoryCalls.push({ property, options, output });
    return output;
  };
  theme.transitions.getAutoHeightDuration = (value) => {
    autoHeights.push(value);
    return input.autoScale ? value * 2 + 1 : originalAuto(value);
  };
  const field = () => (
    <ThemeProvider theme={theme}>
      <Grow
        {...input.props}
        {...traceProps(trace)}
        in={open}
        {...(input.listener
          ? { addEndListener: (_node: ViewInstance, next: () => void) => done.push(next) }
          : {})}
      >
        <Measured height={height} read={() => heightReads++} testID="surface" />
      </Grow>
    </ThemeProvider>
  );
  const { rerender } = render(field());
  const check = (expected: any) => {
    const surface = screen.queryByTestId('surface', { includeHiddenElements: true });
    expect({
      trace,
      mounted: Boolean(surface),
      hidden: surface ? surface.props.pointerEvents === 'none' : false,
      factoryCalls: JSON.parse(JSON.stringify(factoryCalls)),
      heightReads,
      autoHeights,
    }).toEqual(expected);
  };
  check(input.snapshots[0]);
  input.actions.forEach((action: any, index: number) => {
    if ('height' in action) {
      height = action.height;
      rerender(field());
    }
    if ('open' in action) {
      open = action.open;
      rerender(field());
    }
    if ('done' in action) act(() => done[action.done]());
    if ('tick' in action) tick(action.tick);
    check(input.snapshots[index + 1]);
  });
});

test('first entering commits preserve the initial scale and forward transform origin', () => {
  const values: Array<[number, number]> = [];
  const Child = forwardRef<ViewInstance, ViewProps>(function Child(props, ref) {
    const style = StyleSheet.flatten(props.style),
      transforms = style?.transform as Array<any>;
    const value = (entry: any) => (typeof entry === 'number' ? entry : entry?.__getValue?.());
    values.push([value(transforms?.[0]?.scaleX), value(transforms?.[1]?.scaleY)]);
    return <View {...props} ref={ref} />;
  });
  render(
    <Grow in timeout={20} style={{ transformOrigin: 'top left' }}>
      <Child testID="surface" />
    </Grow>,
  );
  expect(values.length).toBeGreaterThan(0);
  expect(values.every(([x, y]) => x === 0.75 && y === 0.5625)).toBe(true);
  expect(screen.getByTestId('surface')).toHaveStyle({ transformOrigin: 'top left' });
});
test('system reduced motion interrupts both drivers and completes the active lifecycle once', async () => {
  let change!: (value: boolean) => void;
  const remove = jest.fn();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_event, next) => {
    change = next as (value: boolean) => void;
    return { remove };
  });
  const entered = jest.fn(),
    theme = createTheme({ motion: { reducedMotion: 'system' } });
  const field = (open: boolean) => (
    <ThemeProvider theme={theme}>
      <Grow in={open} timeout={100} onEntered={entered}>
        <View testID="surface" />
      </Grow>
    </ThemeProvider>
  );
  const { rerender, unmount } = render(field(false));
  await act(async () => {
    await Promise.resolve();
  });
  rerender(field(true));
  expect(animations).toHaveLength(2);
  act(() => change(true));
  tick(0);
  expect(entered).toHaveBeenCalledTimes(1);
  expect(animations.every((motion) => motion.stop.mock.calls.length > 0)).toBe(true);
  expect(screen.getByTestId('surface')).toHaveStyle({ opacity: 1, transform: [] });
  tick(500);
  expect(entered).toHaveBeenCalledTimes(1);
  unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});
