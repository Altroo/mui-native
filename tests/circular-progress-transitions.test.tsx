// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { act, cleanup, render, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import { CircularProgress, createTheme, ThemeProvider } from '../packages/material/src';
import { useCircularProgressTransform } from '../packages/material/src/circularProgressTransform';
import { nativeStyleCallback } from './helpers/nativeStyleCallback';

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

function nativeDrivers() {
  const drivers: Array<{ start: jest.Mock; stop: jest.Mock; reset: jest.Mock }> = [];
  const timing = jest.spyOn(Animated, 'timing').mockImplementation(() => {
    const driver = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
    drivers.push(driver);
    return driver;
  });
  const loops: Array<{ start: jest.Mock; stop: jest.Mock; reset: jest.Mock }> = [];
  jest.spyOn(Animated, 'loop').mockImplementation(() => {
    const loop = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
    loops.push(loop);
    return loop;
  });
  return { timing, drivers, loops };
}

test('real OS preference changes stop and resume motion without replaying caller styling', async () => {
  let publish: ((value: boolean) => void) | undefined;
  const remove = jest.fn();
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_event, listener) => {
    publish = listener;
    return { remove };
  });
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const { loops } = nativeDrivers();
  const root = jest.fn(() => ({})),
    circle = jest.fn(() => ({})),
    sx = jest.fn(() => ({}));
  const theme = createTheme({
    motion: { reducedMotion: 'system' },
    components: {
      MuiCircularProgress: {
        styleOverrides: {
          root: nativeStyleCallback(root),
          circle: nativeStyleCallback(circle),
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <CircularProgress sx={sx} />
    </ThemeProvider>,
  );
  const sourceCounts = [root.mock.calls.length, circle.mock.calls.length, sx.mock.calls.length];
  await act(async () => {});
  expect(loops).toHaveLength(2);
  act(() => publish!(true));
  expect(loops.every((loop) => loop.stop.mock.calls.length === 1)).toBe(true);
  act(() => publish!(false));
  expect(loops).toHaveLength(4);
  expect([root.mock.calls.length, circle.mock.calls.length, sx.mock.calls.length]).toEqual(
    sourceCounts,
  );
  tree.unmount();
  expect(loops.every((loop) => loop.stop.mock.calls.length === 1)).toBe(true);
  expect(remove).toHaveBeenCalledTimes(1);
});

test('root CSS transform and circle offset use retained source factory timings', () => {
  const { timing, drivers } = nativeDrivers();
  const create = jest.fn((property?: string | string[]) => `${property} 120ms linear 40ms`);
  const theme = createTheme({ motion: { reducedMotion: 'never' }, transitions: { create } });
  const scene = (value: number, angle: number) => (
    <ThemeProvider theme={theme}>
      <CircularProgress
        variant="determinate"
        value={value}
        style={{ transform: `rotate(${angle}deg)` }}
      />
    </ThemeProvider>
  );
  const tree = render(scene(25, 15));
  expect(create.mock.calls.map((call) => call[0])).toEqual(['transform', 'stroke-dashoffset']);
  expect(timing).not.toHaveBeenCalled();
  tree.rerender(scene(75, 75));
  expect(timing).toHaveBeenCalledTimes(2);
  for (const [, config] of timing.mock.calls)
    expect(config).toMatchObject({
      duration: 120,
      delay: 40,
      useNativeDriver: true,
      isInteraction: false,
    });
  const circle = timing.mock.calls.find(([, config]) => config.toValue !== 1)!;
  expect(circle[1].toValue).toBeCloseTo(31.73);
  const root = tree.getByRole('progressbar');
  const transform = StyleSheet.flatten(root.props.style).transform;
  expect(transform[0].rotate).toBe('15deg');
  expect(create).toHaveBeenCalledTimes(2);
  tree.unmount();
  expect(drivers.every((driver) => driver.stop.mock.calls.length > 0)).toBe(true);
});

test('indeterminate to determinate snaps to the source position without a new transition', () => {
  const { timing, loops } = nativeDrivers();
  const theme = createTheme({ motion: { reducedMotion: 'never' } });
  const scene = (determinate: boolean) => (
    <ThemeProvider theme={theme}>
      <CircularProgress variant={determinate ? 'determinate' : 'indeterminate'} value={50} />
    </ThemeProvider>
  );
  const tree = render(scene(false));
  expect(loops).toHaveLength(2);
  timing.mockClear();
  tree.rerender(scene(true));
  expect(loops.every((loop) => loop.stop.mock.calls.length === 1)).toBe(true);
  expect(timing).not.toHaveBeenCalled();
  expect(StyleSheet.flatten(tree.getByRole('progressbar').props.style).transform).toEqual([
    { rotate: '-90deg' },
  ]);
});

test('a timing-only declaration change keeps the running transition and times the next target', () => {
  const { timing, drivers } = nativeDrivers();
  const scene = (value: number, duration: number) => (
    <ThemeProvider
      theme={createTheme({
        motion: { reducedMotion: 'never' },
        transitions: {
          create: (property: string | string[]) => `${property} ${duration}ms linear`,
        },
      })}
    >
      <CircularProgress variant="determinate" value={value} />
    </ThemeProvider>
  );
  const tree = render(scene(25, 120));
  tree.rerender(scene(75, 120));
  expect(timing).toHaveBeenCalledTimes(1);
  const original = drivers[0];
  tree.rerender(scene(75, 250));
  expect(original.stop).not.toHaveBeenCalled();
  expect(timing).toHaveBeenCalledTimes(1);
  tree.rerender(scene(50, 250));
  expect(original.stop).toHaveBeenCalledTimes(1);
  expect(timing.mock.calls.at(-1)![1].duration).toBe(250);
});

test('reduced motion updates values immediately and never starts a timing driver', () => {
  const { timing } = nativeDrivers();
  const theme = createTheme({ motion: { reducedMotion: 'always' } });
  const scene = (value: number) => (
    <ThemeProvider theme={theme}>
      <CircularProgress variant="determinate" value={value} />
    </ThemeProvider>
  );
  const tree = render(scene(25));
  tree.rerender(scene(75));
  expect(timing).not.toHaveBeenCalled();
});

test('removing transition properties cancels both running drivers immediately', () => {
  const { timing, drivers } = nativeDrivers();
  const theme = (none: boolean) =>
    createTheme({
      motion: { reducedMotion: 'never' },
      transitions: {
        create: (property: string | string[]) => (none ? 'none' : `${property} 120ms linear`),
      },
    });
  const scene = (value: number, none: boolean) => (
    <ThemeProvider theme={theme(none)}>
      <CircularProgress
        variant="determinate"
        value={value}
        style={{ transform: `rotate(${value}deg)` }}
      />
    </ThemeProvider>
  );
  const tree = render(scene(25, false));
  tree.rerender(scene(75, false));
  expect(timing).toHaveBeenCalledTimes(2);
  tree.rerender(scene(75, true));
  expect(drivers.every((driver) => driver.stop.mock.calls.length === 1)).toBe(true);
  expect(StyleSheet.flatten(tree.getByRole('progressbar').props.style).transform).toEqual([
    { rotate: '75deg' },
  ]);
  expect(timing).toHaveBeenCalledTimes(2);
});

test('perspective passes through unchanged instead of interpolating from invalid zero depth', () => {
  const { timing } = nativeDrivers();
  const timingPolicy = { duration: 120, delay: 0, easing: 'linear' };
  const hook = renderHook(
    ({ raw }: { raw: Parameters<typeof useCircularProgressTransform>[0] }) =>
      useCircularProgressTransform(raw, timingPolicy, false, true),
    { initialProps: { raw: [] } },
  );
  hook.rerender({ raw: [{ perspective: 500 }] });
  expect(hook.result.current).toEqual([{ perspective: 500 }]);
  expect(timing).not.toHaveBeenCalled();
});

test('an interrupted matching transform resumes from the actual native progress', () => {
  const { timing, drivers } = nativeDrivers();
  const policy = { duration: 120, delay: 0, easing: 'linear' };
  const hook = renderHook(
    ({ angle }: { angle: number }) =>
      useCircularProgressTransform([{ rotate: `${angle}deg` }], policy, false, true),
    { initialProps: { angle: 15 } },
  );
  hook.rerender({ angle: 75 });
  const progress = timing.mock.calls[0][0] as Animated.Value;
  act(() => progress.setValue(0.5));
  hook.rerender({ angle: 135 });
  expect(drivers[0].stop).toHaveBeenCalledTimes(1);
  const transform = hook.result.current as Array<{
    rotate: Animated.AnimatedInterpolation<string>;
  }>;
  // The pinned Animated peer exposes this runtime observation in Jest only.
  expect((transform[0].rotate as unknown as { __getValue(): string }).__getValue()).toBe('45deg');
  expect(timing).toHaveBeenCalledTimes(2);
});

test('pausing an indeterminate root sends an identity transform through the real native validator', () => {
  nativeDrivers();
  const scene = (paused: boolean) => (
    <ThemeProvider theme={createTheme({ motion: { reducedMotion: paused ? 'always' : 'never' } })}>
      <CircularProgress />
    </ThemeProvider>
  );
  const tree = render(scene(false));
  tree.rerender(scene(true));
  const transform = StyleSheet.flatten(tree.getByRole('progressbar').props.style).transform;
  expect(transform).toEqual([]);
  // React Native converts an omitted removed style to null in its payload diff.
  // Exercise the pinned development validator which plain renderer tests omit.
  const processTransform = require('react-native/Libraries/StyleSheet/processTransform').default;
  expect(() => processTransform(null)).toThrow();
  expect(() => processTransform(transform ?? null)).not.toThrow();
});
