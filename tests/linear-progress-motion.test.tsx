// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { Rect } from 'react-native-svg';
import { Animated, AccessibilityInfo } from 'react-native';
import { act, fireEvent, render, renderHook } from '@testing-library/react-native';
import { LinearProgress, ThemeProvider, createTheme } from '@altroo/mui-native';
import {
  useLinearProgressPhase,
  useLinearProgressBarGeometry,
  useLinearProgressBufferGeometry,
  linearProgressKeyframeEasing,
} from '../packages/material/src/linearProgressFrames';
import { nativeStyleCallback } from './helpers/nativeStyleCallback';

afterEach(() => jest.restoreAllMocks());

test('each indeterminate keyframe eases its first sixty percent and holds the rest', () => {
  for (const slot of ['bar1', 'bar2'] as const) {
    const ease = linearProgressKeyframeEasing(slot);
    expect(ease(0)).toBeCloseTo(0);
    expect(ease(0.6)).toBeCloseTo(0.6);
    expect(ease(0.8)).toBeCloseTo(0.8);
    expect(ease(1)).toBeCloseTo(1);
  }
  expect(linearProgressKeyframeEasing('bar1')(0.3)).toBeCloseTo(0.29656757, 7);
  expect(linearProgressKeyframeEasing('bar2')(0.3)).toBeGreaterThan(0.45);
});

test('startup and loop timings request noninteraction native drivers with one bar2 delay', () => {
  const loops: Array<{ start: jest.Mock; stop: jest.Mock; reset: jest.Mock }> = [];
  jest.spyOn(Animated, 'loop').mockImplementation(() => {
    const loop = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
    loops.push(loop);
    return loop;
  });
  const sequence = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
  const queued = jest.spyOn(Animated, 'sequence').mockReturnValue(sequence);
  const timing = jest.spyOn(Animated, 'timing');
  const hook = renderHook(
    ({ active }: { active: boolean }) => {
      useLinearProgressPhase(active, 'bar1');
      useLinearProgressPhase(active, 'bar2');
      useLinearProgressPhase(active, 'dashed');
    },
    { initialProps: { active: true } },
  );
  expect(loops).toHaveLength(3);
  for (const [, config] of timing.mock.calls)
    expect(config).toMatchObject({ useNativeDriver: true, isInteraction: false });
  expect(timing.mock.calls.map(([, config]) => config.duration)).toEqual([2100, 2100, 1150, 3000]);
  const delayIndex = timing.mock.calls.findIndex(([, config]) => config.duration === 1150);
  expect(queued).toHaveBeenCalledWith([timing.mock.results[delayIndex].value, loops[1]]);
  hook.rerender({ active: false });
  expect(loops[0].stop).toHaveBeenCalledTimes(1);
  expect(sequence.stop).toHaveBeenCalledTimes(1);
  expect(loops[2].stop).toHaveBeenCalledTimes(1);
  hook.unmount();
});

test('viewport measurement does not replay caller overrides, variants or sx', () => {
  const calls: string[] = [];
  const tree = render(
    <ThemeProvider
      theme={createTheme({
        motion: { reducedMotion: 'always' },
        components: {
          MuiLinearProgress: {
            styleOverrides: {
              root: nativeStyleCallback(() => {
                calls.push('root');
                return {};
              }),
            },
            variants: [
              {
                props: { variant: 'buffer' },
                style: () => {
                  calls.push('variant');
                  return {};
                },
              },
            ],
          },
        },
      })}
    >
      <LinearProgress
        testID="progress"
        variant="buffer"
        value={25}
        valueBuffer={65}
        sx={() => {
          calls.push('sx');
          return {};
        }}
      />
    </ThemeProvider>,
  );
  const original = [...calls];
  fireEvent(tree.getByTestId('progress'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 240, height: 4 } },
  });
  expect(calls).toEqual(original);
});

test('system reduced-motion updates stop drivers without rerunning source callbacks', async () => {
  let notify: ((value: boolean) => void) | undefined;
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_name, listener) => {
    notify = listener;
    return { remove: jest.fn() };
  });
  const loop = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
  jest.spyOn(Animated, 'loop').mockReturnValue(loop);
  const calls: string[] = [];
  const tree = render(
    <ThemeProvider
      theme={createTheme({
        motion: { reducedMotion: 'system' },
        components: {
          MuiLinearProgress: {
            styleOverrides: {
              root: nativeStyleCallback(() => {
                calls.push('root');
                return {};
              }),
            },
          },
        },
      })}
    >
      <LinearProgress testID="progress" />
    </ThemeProvider>,
  );
  await act(async () => {});
  const original = [...calls];
  expect(loop.start).toHaveBeenCalled();
  await act(async () => notify?.(true));
  expect(loop.stop).toHaveBeenCalled();
  expect(calls).toEqual(original);
  tree.unmount();
});

const readAnimated = (node: unknown) => (node as { __getValue(): number }).__getValue();

test('retained native channels mask late phase updates, resize reduced paint and resume', () => {
  const phase = new Animated.Value(0.3),
    translation = new Animated.Value(-0.75);
  const hook = renderHook(
    ({ width, loading, reduced }: { width: number; loading: boolean; reduced: boolean }) =>
      useLinearProgressBarGeometry(phase, translation, width, loading, reduced, 'bar1'),
    { initialProps: { width: 200, loading: true, reduced: false } },
  );
  const original = hook.result.current;
  expect(readAnimated(original.translateX)).toBeCloseTo(65);
  expect(readAnimated(original.scaleX)).toBeCloseTo(0.625);
  hook.rerender({ width: 200, loading: true, reduced: true });
  expect(hook.result.current).toBe(original);
  expect(readAnimated(original.translateX)).toBeCloseTo(60);
  expect(readAnimated(original.scaleX)).toBeCloseTo(0.4);
  act(() => phase.setValue(0.55));
  expect(readAnimated(original.translateX)).toBeCloseTo(60);
  expect(readAnimated(original.scaleX)).toBeCloseTo(0.4);
  hook.rerender({ width: 400, loading: true, reduced: true });
  expect(hook.result.current).toBe(original);
  expect(readAnimated(original.translateX)).toBeCloseTo(120);
  hook.rerender({ width: 400, loading: false, reduced: true });
  expect(hook.result.current).toBe(original);
  expect(readAnimated(original.translateX)).toBeCloseTo(-300);
  expect(readAnimated(original.scaleX)).toBeCloseTo(1);
  act(() => translation.setValue(-0.25));
  expect(readAnimated(original.translateX)).toBeCloseTo(-100);
  hook.rerender({ width: 400, loading: true, reduced: false });
  expect(hook.result.current).toBe(original);
  expect(readAnimated(original.translateX)).toBeCloseTo(355);
  hook.unmount();
});

test('an initially reduced native graph starts with the centered source forty-percent bar', () => {
  const phase = new Animated.Value(0),
    translation = new Animated.Value(0);
  const hook = renderHook(() =>
    useLinearProgressBarGeometry(phase, translation, 240, true, true, 'bar1'),
  );
  expect(readAnimated(hook.result.current.translateX)).toBeCloseTo(72);
  expect(readAnimated(hook.result.current.scaleX)).toBeCloseTo(0.4);
  act(() => phase.setValue(1));
  expect(readAnimated(hook.result.current.translateX)).toBeCloseTo(72);
  hook.unmount();
});

test('buffer opacity and offset keep their native bindings when motion stops and resumes', () => {
  const phase = new Animated.Value(0.8);
  const hook = renderHook(
    ({ reduced }: { reduced: boolean }) => useLinearProgressBufferGeometry(phase, reduced, 0.3),
    { initialProps: { reduced: false } },
  );
  const original = hook.result.current;
  expect(readAnimated(original.opacity)).toBeCloseTo(0.15);
  expect(readAnimated(original.translateX)).toBeCloseTo(-100);
  hook.rerender({ reduced: true });
  expect(hook.result.current).toBe(original);
  expect(readAnimated(original.opacity)).toBeCloseTo(0.3);
  expect(readAnimated(original.translateX)).toBeCloseTo(0);
  act(() => phase.setValue(0.1));
  expect(readAnimated(original.opacity)).toBeCloseTo(0.3);
  expect(readAnimated(original.translateX)).toBeCloseTo(0);
  hook.rerender({ reduced: false });
  expect(hook.result.current).toBe(original);
  expect(readAnimated(original.opacity)).toBeCloseTo(0.25);
  expect(readAnimated(original.translateX)).toBeCloseTo(0);
  hook.unmount();
});

test('buffer paint follows concrete native host dimensions without replaying caller styling', () => {
  const calls: string[] = [];
  const theme = createTheme({
    motion: { reducedMotion: 'always' },
    components: {
      MuiLinearProgress: {
        styleOverrides: {
          root: nativeStyleCallback(() => {
            calls.push('root');
            return {};
          }),
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <LinearProgress variant="buffer" value={25} valueBuffer={85} />
    </ThemeProvider>,
  );
  const original = [...calls],
    host = tree.UNSAFE_getAllByType(Animated.View)[0];
  fireEvent(host, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 440, height: 4 } } });
  expect(tree.UNSAFE_getByType(Rect).props).toMatchObject({ width: 440, height: 4 });
  fireEvent(host, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 640, height: 8 } } });
  expect(tree.UNSAFE_getByType(Rect).props).toMatchObject({ width: 640, height: 8 });
  expect(calls).toEqual(original);
});
