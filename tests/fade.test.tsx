import React, { StrictMode, forwardRef } from 'react';
import transitionReference from './fixtures/mui-transitions-9.5.0.json';
import {
  View,
  Text,
  Pressable,
  Animated,
  AccessibilityInfo,
  StyleSheet,
  type ViewInstance,
} from 'react-native';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react-native';
import {
  Fade,
  ThemeProvider,
  createTheme,
  Backdrop,
  Dialog,
  TextField,
  type FadeProps,
} from '../packages/material/src';
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
function traceProps(trace: string[]) {
  return {
    onEnter: (_node: ViewInstance, appearing: boolean) => trace.push('enter:' + appearing),
    onEntering: (_node: ViewInstance, appearing: boolean) => trace.push('entering:' + appearing),
    onEntered: (_node: ViewInstance, appearing: boolean) => trace.push('entered:' + appearing),
    onExit: () => trace.push('exit'),
    onExiting: () => trace.push('exiting'),
    onExited: () => trace.push('exited'),
  };
}
const tick = (time: number) =>
  act(() => {
    jest.advanceTimersByTime(time);
  });
test('Fade uses native-driver opacity and the pinned appear/enter/exit lifecycle deadlines', () => {
  const trace: string[] = [];
  const field = (open: boolean) => (
    <Fade in={open} timeout={{ appear: 10, enter: 20, exit: 30 }} {...traceProps(trace)}>
      <View testID="surface" />
    </Fade>
  );
  const { rerender } = render(field(true));
  expect(trace).toEqual(['enter:true', 'entering:true']);
  expect(animations.at(-1)?.config).toMatchObject({
    toValue: 1,
    duration: 20,
    useNativeDriver: true,
    isInteraction: false,
  });
  tick(9);
  expect(trace).toHaveLength(2);
  tick(1);
  expect(trace.at(-1)).toBe('entered:true');
  rerender(field(false));
  expect(trace.slice(-2)).toEqual(['exit', 'exiting']);
  tick(30);
  expect(trace.at(-1)).toBe('exited');
  expect(screen.getByTestId('surface', { includeHiddenElements: true })).toHaveStyle({
    opacity: 0,
  });
  expect(screen.getByTestId('surface', { includeHiddenElements: true }).props.pointerEvents).toBe(
    'none',
  );
  expect(animations.at(-1)?.stop).toHaveBeenCalled();
});
test('appear=false mounts entered without callbacks; later enter=false and exit=false skip intermediate callbacks', () => {
  const trace: string[] = [];
  const field = (open: boolean) => (
    <Fade in={open} appear={false} enter={false} exit={false} {...traceProps(trace)}>
      <View testID="surface" />
    </Fade>
  );
  const { rerender } = render(field(true));
  expect(trace).toEqual([]);
  expect(animations).toHaveLength(0);
  rerender(field(false));
  expect(trace).toEqual(['exited']);
  rerender(field(true));
  expect(trace).toEqual(['exited', 'entered:false']);
  expect(animations).toHaveLength(0);
});
test('mountOnEnter and unmountOnExit preserve native ref availability through the active cycle', () => {
  const ref = React.createRef<ViewInstance>();
  const field = (open: boolean) => (
    <Fade in={open} mountOnEnter unmountOnExit timeout={10} ref={ref}>
      <View testID="surface" />
    </Fade>
  );
  const { rerender } = render(field(false));
  expect(ref.current).toBeNull();
  expect(screen.queryByTestId('surface')).toBeNull();
  rerender(field(true));
  expect(ref.current !== null).toBe(true);
  tick(10);
  rerender(field(false));
  expect(ref.current !== null).toBe(true);
  tick(10);
  expect(ref.current).toBeNull();
  expect(screen.queryByTestId('surface', { includeHiddenElements: true })).toBeNull();
});
test('listener completion races the fallback exactly once and stale listeners cannot finish a later phase', () => {
  const trace: string[] = [];
  const completions: Array<() => void> = [];
  const field = (open: boolean) => (
    <Fade
      in={open}
      timeout={50}
      addEndListener={(_node, done) => completions.push(done)}
      {...traceProps(trace)}
    >
      <View />
    </Fade>
  );
  const { rerender } = render(field(true));
  act(() => completions[0]());
  expect(trace.at(-1)).toBe('entered:true');
  tick(50);
  expect(trace.filter((x) => x.startsWith('entered'))).toHaveLength(1);
  rerender(field(false));
  const old = completions.at(-1)!;
  rerender(field(true));
  act(() => old());
  expect(trace.at(-1)).toBe('entering:false');
  act(() => completions.at(-1)!());
  expect(trace.at(-1)).toBe('entered:false');
  tick(100);
  expect(trace).not.toContain('exited');
});
test('callback updates stay fresh without restarting an active completion deadline', () => {
  const first = jest.fn(),
    last = jest.fn();
  const { rerender } = render(
    <Fade in timeout={20} onEntered={first}>
      <View />
    </Fade>,
  );
  tick(10);
  rerender(
    <Fade in timeout={200} onEntered={last}>
      <View />
    </Fade>,
  );
  tick(10);
  expect(first).not.toHaveBeenCalled();
  expect(last).toHaveBeenCalledTimes(1);
});
test('unmount cancels native animations, timers and listener deliveries', () => {
  const entered = jest.fn();
  let done!: () => void;
  const { unmount } = render(
    <Fade
      in
      timeout={100}
      onEntered={entered}
      addEndListener={(_node, next) => {
        done = next;
      }}
    >
      <View />
    </Fade>,
  );
  const animation = animations.at(-1)!;
  unmount();
  expect(animation.stop).toHaveBeenCalled();
  act(() => done());
  tick(100);
  expect(entered).not.toHaveBeenCalled();
});
test('StrictMode reconnects active work without duplicate lifecycle callbacks', () => {
  const trace: string[] = [];
  render(
    <StrictMode>
      <Fade in timeout={15} {...traceProps(trace)}>
        <View />
      </Fade>
    </StrictMode>,
  );
  tick(15);
  expect(trace).toEqual(['enter:true', 'entering:true', 'entered:true']);
});
test('timing style overrides configure native animation while authored timeout remains the completion fallback', () => {
  const entered = jest.fn();
  render(
    <Fade
      in
      timeout={20}
      style={{
        transitionDuration: '0.1s',
        transitionDelay: '5ms',
        transitionTimingFunction: 'linear',
      }}
      onEntered={entered}
    >
      <View testID="surface" />
    </Fade>,
  );
  expect(animations.at(-1)?.config).toMatchObject({
    duration: 100,
    delay: 5,
    useNativeDriver: true,
  });
  tick(20);
  expect(entered).toHaveBeenCalledTimes(1);
  const style = StyleSheet.flatten(screen.getByTestId('surface').props.style);
  expect(style.transitionDuration).toBeUndefined();
  expect(style.transitionDelay).toBeUndefined();
  expect(style.transitionTimingFunction).toBeUndefined();
});
test('hidden Fade keeps layout, composes style precedence and supports native Pressable style callbacks', () => {
  const { rerender } = render(
    <Fade in appear={false} style={{ opacity: 0.4, padding: 2 }}>
      <Pressable
        testID="surface"
        style={({ pressed }) => ({ opacity: pressed ? 0.2 : 0.7, padding: 3 })}
      />
    </Fade>,
  );
  expect(screen.getByTestId('surface')).toHaveStyle({ opacity: 0.7, padding: 3 });
  fireEvent(screen.getByTestId('surface'), 'pressIn', { nativeEvent: {} });
  expect(screen.getByTestId('surface')).toHaveStyle({ opacity: 0.2 });
  rerender(
    <Fade in={false} appear={false} exit={false} style={{ opacity: 1 }}>
      <View testID="surface" style={{ height: 17 }} />
    </Fade>,
  );
  const hidden = screen.getByTestId('surface', { includeHiddenElements: true });
  expect(hidden).toHaveStyle({ opacity: 0, height: 17 });
  expect(StyleSheet.flatten(hidden.props.style).display).not.toBe('none');
});
test('initial entering commits never flash the target opacity before the native driver starts', () => {
  const values: number[] = [];
  const Child = forwardRef<ViewInstance, any>(function Child(props, ref) {
    const alpha = StyleSheet.flatten(props.style)?.opacity;
    values.push(typeof alpha === 'number' ? alpha : alpha?.__getValue?.());
    return <View {...props} ref={ref} />;
  });
  render(
    <Fade in>
      <Child />
    </Fade>,
  );
  expect(values.every((x) => x === 0)).toBe(true);
});
test('theme motion always removes animation; component opt-out restores authored timing', () => {
  const trace: string[] = [];
  const theme = createTheme({ motion: { reducedMotion: 'always' } });
  const field = (disabled: boolean) => (
    <ThemeProvider theme={theme}>
      <Fade in timeout={20} disablePrefersReducedMotion={disabled} {...traceProps(trace)}>
        <View />
      </Fade>
    </ThemeProvider>
  );
  const { unmount } = render(field(false));
  expect(animations).toHaveLength(0);
  tick(0);
  expect(trace.at(-1)).toBe('entered:true');
  unmount();
  render(field(true));
  expect(animations.at(-1)?.config.duration).toBe(20);
});
test('enabling system reduced motion ends the active phase once and shares the label preference subscription', async () => {
  const events: Array<(value: boolean) => void> = [];
  const remove = jest.fn();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const subscribe = jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockImplementation((_name, callback) => {
      events.push(callback as (value: boolean) => void);
      return { remove };
    });
  const entered = jest.fn();
  const theme = createTheme({ motion: { reducedMotion: 'system' } });
  const field = (open: boolean) => (
    <ThemeProvider theme={theme}>
      <TextField label="Shared" />
      <Fade in={open} timeout={200} onEntered={entered}>
        <View testID="surface" />
      </Fade>
    </ThemeProvider>
  );
  const { rerender, unmount } = render(field(false));
  await act(async () => {
    await Promise.resolve();
  });
  expect(subscribe).toHaveBeenCalledTimes(1);
  rerender(field(true));
  expect(animations.some((x) => x.config.toValue === 1)).toBe(true);
  act(() => events[0](true));
  tick(0);
  expect(entered).toHaveBeenCalledTimes(1);
  tick(500);
  expect(entered).toHaveBeenCalledTimes(1);
  unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});
test('Backdrop and Dialog use configurable transition slots and retain content until matching exit', () => {
  let state: any;
  const Transition = forwardRef<ViewInstance, any>(function Transition(props, ref) {
    state = props;
    return React.cloneElement(props.children, { ref });
  });
  const backdrop = render(
    <Backdrop
      open
      slots={{ transition: Transition }}
      transitionDuration={{ enter: 12, exit: 18 }}
      slotProps={{ transition: (owner) => ({ appear: !owner.invisible }) }}
      testID="backdrop"
    />,
  );
  expect(state.in).toBe(true);
  expect(state.timeout).toEqual({ enter: 12, exit: 18 });
  expect(state.appear).toBe(true);
  backdrop.unmount();
  const { rerender } = render(
    <Dialog open disablePortal slots={{ transition: Transition }} transitionDuration={10}>
      <Text>Content</Text>
    </Dialog>,
  );
  expect(state.in).toBe(true);
  rerender(
    <Dialog open={false} disablePortal slots={{ transition: Transition }} transitionDuration={10}>
      <Text>Content</Text>
    </Dialog>,
  );
  expect(screen.queryByText('Content')).not.toBeNull();
  act(() => state.onExited());
  expect(screen.queryByText('Content')).toBeNull();
});

test('Fade honors the theme transition factory and passes pinned opacity/timing arguments', () => {
  const create = jest.fn(() => 'opacity 41ms linear 7ms');
  render(
    <ThemeProvider theme={createTheme({ transitions: { create } })}>
      <Fade in timeout={20}>
        <View />
      </Fade>
    </ThemeProvider>,
  );
  expect(create).toHaveBeenCalledWith('opacity', {
    duration: 20,
    easing: undefined,
    delay: undefined,
  });
  expect(animations.at(-1)?.config).toMatchObject({ duration: 41, delay: 7 });
});

test.each(transitionReference.lifecycles)('pinned original Fade lifecycle: $name', (input: any) => {
  const trace: string[] = [],
    completions: Array<() => void> = [];
  let open = input.initial;
  const field = () => (
    <ThemeProvider
      theme={createTheme({ motion: { reducedMotion: input.reduced ? 'always' : 'never' } })}
    >
      <Fade
        {...input.props}
        {...traceProps(trace)}
        in={open}
        {...(input.listener
          ? { addEndListener: (_node: ViewInstance, done: () => void) => completions.push(done) }
          : {})}
      >
        <View testID="surface" />
      </Fade>
    </ThemeProvider>
  );
  const { rerender } = render(field());
  const check = (expected: any) => {
    const surface = screen.queryByTestId('surface', { includeHiddenElements: true });
    expect({
      trace,
      mounted: Boolean(surface),
      hidden: surface ? surface.props.pointerEvents === 'none' : false,
    }).toEqual(expected);
  };
  check(input.snapshots[0]);
  input.actions.forEach((action: any, index: number) => {
    if ('open' in action) {
      open = action.open;
      rerender(field());
    }
    if ('done' in action) act(() => completions[action.done]());
    if ('tick' in action) tick(action.tick);
    check(input.snapshots[index + 1]);
  });
});

test('Fade composes caller and child native refs and detaches both after unmount', () => {
  const caller = React.createRef<ViewInstance>(),
    child = React.createRef<ViewInstance>();
  const { unmount } = render(
    <Fade in appear={false} ref={caller}>
      <View ref={child} />
    </Fade>,
  );
  expect(caller.current !== null).toBe(true);
  expect(caller.current === child.current).toBe(true);
  unmount();
  expect(caller.current).toBeNull();
  expect(child.current).toBeNull();
});
