import { AccessibilityInfo } from 'react-native';
import { observeLabelMotion, reducedLabelMotion } from '../packages/material/src/labelMotion';

test('motion observers share one native subscription and late queries cannot override newer events', async () => {
  let resolve!: (value: boolean) => void;
  let event!: (value: boolean) => void;
  const remove = jest.fn();
  const query = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const subscribe = jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockImplementation((_name, callback) => {
      event = callback as (value: boolean) => void;
      return { remove };
    });
  const first = jest.fn();
  const second = jest.fn();
  const stopFirst = observeLabelMotion(first);
  const stopSecond = observeLabelMotion(second);
  expect(subscribe).toHaveBeenCalledTimes(1);
  expect(reducedLabelMotion()).toBe(true);
  event(true);
  resolve(false);
  await Promise.resolve();
  expect(reducedLabelMotion()).toBe(true);
  expect(first).toHaveBeenCalledTimes(1);
  stopFirst();
  expect(remove).not.toHaveBeenCalled();
  stopSecond();
  expect(remove).toHaveBeenCalledTimes(1);
  query.mockRestore();
  subscribe.mockRestore();
});
test('old events and query completions do not reach a later subscription generation', async () => {
  const events: Array<(value: boolean) => void> = [];
  const resolves: Array<(value: boolean) => void> = [];
  const query = jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockImplementation(() => new Promise((done) => resolves.push(done)));
  const subscribe = jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockImplementation((_name, callback) => {
      events.push(callback as (value: boolean) => void);
      return { remove: jest.fn() };
    });
  const old = observeLabelMotion(jest.fn());
  old();
  const current = jest.fn();
  const stop = observeLabelMotion(current);
  events[0](false);
  resolves[0](false);
  await Promise.resolve();
  expect(current).not.toHaveBeenCalled();
  expect(reducedLabelMotion()).toBe(true);
  resolves[1](false);
  await Promise.resolve();
  expect(current).toHaveBeenCalledWith(false);
  expect(reducedLabelMotion()).toBe(false);
  stop();
  expect(reducedLabelMotion()).toBe(true);
  query.mockRestore();
  subscribe.mockRestore();
});
