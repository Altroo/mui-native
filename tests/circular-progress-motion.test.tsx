// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { renderHook } from '@testing-library/react-native';
import { Animated } from 'react-native';
import {
  useCircularProgressRotation,
  useCircularProgressDash,
} from '../packages/material/src/circularProgressMotion';

function useMotion(active: boolean, disableShrink: boolean) {
  const rotate = useCircularProgressRotation(active);
  return { rotate, ...useCircularProgressDash(active, disableShrink) };
}

afterEach(() => jest.restoreAllMocks());

test('native timing preserves the two CSS easing halves without interaction handles', () => {
  const loop = jest
    .spyOn(Animated, 'loop')
    .mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  const timing = jest.spyOn(Animated, 'timing');
  const hook = renderHook(() => useMotion(true, false));
  expect(loop).toHaveBeenCalledTimes(2);
  for (const [, config] of timing.mock.calls) {
    expect(config).toMatchObject({ duration: 1400, useNativeDriver: true, isInteraction: false });
  }
  const dash = timing.mock.calls[1][1].easing!;
  expect(dash(0)).toBeCloseTo(0);
  expect(dash(0.125)).toBeCloseTo(0.06458, 4);
  expect(dash(0.5)).toBeCloseTo(0.5);
  expect(dash(0.875)).toBeCloseTo(0.93542, 4);
  expect(dash(1)).toBeCloseTo(1);
  hook.unmount();
});

test('live shrink and motion policy changes stop only affected native loops', () => {
  const loops: Array<{ start: jest.Mock; stop: jest.Mock; reset: jest.Mock }> = [];
  jest.spyOn(Animated, 'loop').mockImplementation(() => {
    const loop = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
    loops.push(loop);
    return loop;
  });
  const hook = renderHook(
    ({ active, disableShrink }: { active: boolean; disableShrink: boolean }) =>
      useMotion(active, disableShrink),
    { initialProps: { active: true, disableShrink: false } },
  );
  expect(loops).toHaveLength(2);
  hook.rerender({ active: true, disableShrink: true });
  expect(loops[0].stop).not.toHaveBeenCalled();
  expect(loops[1].stop).toHaveBeenCalledTimes(1);
  expect(hook.result.current.dashLength).toBe(80);
  expect(hook.result.current.dashOffset).toBe(0);
  hook.rerender({ active: false, disableShrink: true });
  expect(loops[0].stop).toHaveBeenCalledTimes(1);
  expect(hook.result.current.rotate).toBe('0deg');
  hook.rerender({ active: true, disableShrink: false });
  expect(loops).toHaveLength(4);
  hook.unmount();
  expect(loops[2].stop).toHaveBeenCalledTimes(1);
  expect(loops[3].stop).toHaveBeenCalledTimes(1);
});
