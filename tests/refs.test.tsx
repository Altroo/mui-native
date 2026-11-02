import React from 'react';
import { render } from '@testing-library/react-native';
import { setRef, useForkRef } from '../packages/material/src/utils';
type Instance = { focus: () => void };
let latest: React.RefCallback<Instance> | null;
function Probe({ refs }: { refs: Array<React.Ref<Instance> | undefined> }) {
  latest = useForkRef(...refs);
  return null;
}
const attach = (instance: Instance) => latest?.(instance) as (() => void) | undefined;

test('setRef assigns callback/object refs and accepts absent refs', () => {
  const ref = React.createRef<Instance>();
  const callback = jest.fn();
  const value = { focus: jest.fn() };
  setRef(ref, value);
  setRef(callback, value);
  setRef(undefined, value);
  expect(ref.current).toBe(value);
  expect(callback).toHaveBeenCalledWith(value);
  setRef(ref, null);
  expect(ref.current).toBeNull();
});
test('fork refs share an instance and use cleanup returns instead of null callbacks', () => {
  const object = React.createRef<Instance>();
  const plain = jest.fn();
  const cleanup = jest.fn();
  const callback = jest.fn(() => cleanup);
  render(<Probe refs={[object, plain, callback]} />);
  const instance = { focus: jest.fn() };
  const release = attach(instance);
  expect(object.current).toBe(instance);
  expect(plain).toHaveBeenCalledWith(instance);
  release?.();
  release?.();
  latest?.(null);
  expect(object.current).toBeNull();
  expect(plain.mock.calls).toEqual([[instance], [null]]);
  expect(callback.mock.calls).toEqual([[instance]]);
  expect(cleanup).toHaveBeenCalledTimes(1);
});
test('ref identity is stable and a changed-length list gets a fresh callback', () => {
  const object = React.createRef<Instance>();
  const { rerender } = render(<Probe refs={[object]} />);
  const first = latest;
  rerender(<Probe refs={[object]} />);
  expect(latest).toBe(first);
  rerender(<Probe refs={[object, undefined]} />);
  expect(latest).not.toBe(first);
  rerender(<Probe refs={[undefined, null]} />);
  expect(latest).toBeNull();
});
test('stale cleanup cannot detach a replacement instance', () => {
  const object = React.createRef<Instance>();
  const callback = jest.fn();
  render(<Probe refs={[object, callback]} />);
  const first = { focus: jest.fn() };
  const second = { focus: jest.fn() };
  const stale = attach(first);
  const current = attach(second);
  stale?.();
  expect(object.current).toBe(second);
  expect(callback.mock.calls).toEqual([[first], [null], [second]]);
  current?.();
  expect(object.current).toBeNull();
});
test('attachment errors roll back other refs and cleanup errors still release every ref', () => {
  const object = React.createRef<Instance>();
  const error = new Error('attach failed');
  const bad = () => {
    throw error;
  };
  const { rerender } = render(<Probe refs={[object, bad]} />);
  expect(() => attach({ focus: jest.fn() })).toThrow(error);
  expect(object.current).toBeNull();
  const cleanup = jest.fn(() => {
    throw new Error('cleanup failed');
  });
  const final = jest.fn();
  rerender(<Probe refs={[() => cleanup, object, final]} />);
  const release = attach({ focus: jest.fn() });
  expect(release).toThrow('cleanup failed');
  expect(object.current).toBeNull();
  expect(final).toHaveBeenLastCalledWith(null);
  release?.();
});

test('shared refs reproduce the pinned original attachment and detach sequence', () => {
  const expected = require('./fixtures/mui-textfield-slots-9.5.0.json').refs;
  const events: unknown[] = [];
  const object = React.createRef<string>();
  let callback: React.RefCallback<string> | null = null;
  function OriginalSequence() {
    callback = useForkRef(
      object,
      (value) => {
        events.push(value);
      },
      (value) => {
        events.push(`cleanup:${value}`);
        return () => {
          events.push('released');
        };
      },
    );
    return null;
  }
  render(<OriginalSequence />);
  (callback as React.RefCallback<string> | null)?.('instance');
  expect(object.current).toBe(expected.attached);
  (callback as React.RefCallback<string> | null)?.(null);
  expect(events).toEqual(expected.detached);
  setRef(object, 'setter');
  expect(object.current).toBe(expected.setter);
});
