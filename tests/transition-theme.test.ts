import { createTheme, createTransitions, createMotion } from '../packages/system/src';
import reference from './fixtures/mui-transitions-9.5.0.json';
const summarize = (theme: any) => ({
  duration: theme.transitions.duration,
  easing: theme.transitions.easing,
  motion: theme.motion,
  legacyMotion: Object.hasOwn(theme.transitions, 'reducedMotion'),
  calls: reference.calls.map((args) => theme.transitions.create(...args)),
  heights: reference.heights.map((height) => theme.transitions.getAutoHeightDuration(height)),
});
test.each(reference.themes)('pinned transition theme: $name', (input) => {
  expect(
    summarize(createTheme(input.options as any, ...('extra' in input ? [input.extra as any] : []))),
  ).toEqual(input.output);
});
test.each(reference.helpers)('pinned transition helpers: $input', ({ input, output }) => {
  const before = JSON.stringify(input);
  expect(summarize({ transitions: createTransitions(input as any), motion: {} })).toEqual(output);
  expect(JSON.stringify(input)).toBe(before);
});
test.each(reference.motions)('pinned motion configuration: $input', ({ input, output }) => {
  expect(createMotion(input as any)).toEqual(output);
  expect(createMotion(input as any)).not.toBe(input);
});
