import type { ViewInstance } from 'react-native';
import type { NativePortalObservation } from '../packages/native-host/src';
import {
  PortalObservationRegistry,
  type PortalObservationLease,
} from '../packages/material/src/portalObservation';
const rect = { x: 0, y: 0, width: 390, height: 844 };
function setup() {
  let lease: PortalObservationLease | null = null;
  const changed = jest.fn((value: PortalObservationLease | null) => {
    lease = value;
  });
  const registry = new PortalObservationRegistry(changed),
    listener = jest.fn();
  const node = {} as ViewInstance;
  const cleanup = registry.observe(node, 42, listener);
  const event = (): NativePortalObservation => ({
    revision: 'container-1',
    observationRevision: lease!.revision,
    observedTag: lease!.tag,
    presented: true,
    anchorAvailable: true,
    reason: 'observed',
    anchor: { x: 20, y: 50, width: 120, height: 40 },
    referenceClip: { present: false, ...rect },
    popperClip: { present: true, ...rect },
    viewport: rect,
    window: rect,
  });
  return { registry, changed, listener, cleanup, event, node };
}
test('new native geometry is delivered as an immutable independent snapshot', () => {
  const { registry, listener, event } = setup(),
    value = event();
  expect(registry.receive(value, 'container-1', true)).toBe('delivered');
  const snapshot = listener.mock.calls[0][0];
  expect(snapshot).toEqual(value);
  expect(snapshot).not.toBe(value);
  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(Object.isFrozen(snapshot.anchor)).toBe(true);
  expect(Object.isFrozen(snapshot.viewport)).toBe(true);
  expect(Object.isFrozen(snapshot.popperClip)).toBe(true);
  (value.anchor as any).x = 99;
  expect(snapshot.anchor.x).toBe(20);
});
test.each(['revision', 'observationRevision', 'observedTag'] as const)(
  'late %s events cannot reach the current observer',
  (key) => {
    const { registry, listener, event } = setup();
    const value = { ...event(), [key]: key === 'observedTag' ? 99 : 'old' };
    expect(registry.receive(value, 'container-1', true)).toBe('stale');
    expect(listener).not.toHaveBeenCalled();
  },
);
test('a superseded cleanup cannot erase a new registration on the same native node', () => {
  const { registry, changed, listener, cleanup, event, node } = setup();
  const stale = event(),
    next = jest.fn();
  const stop = registry.observe(node, 42, next),
    value = event();
  expect(listener).toHaveBeenCalledWith(null);
  const count = changed.mock.calls.length;
  cleanup();
  expect(changed).toHaveBeenCalledTimes(count);
  expect(registry.receive(stale, 'container-1', true)).toBe('stale');
  expect(registry.receive(value, 'container-1', true)).toBe('delivered');
  expect(next).toHaveBeenCalledWith(value);
  stop();
  expect(changed).toHaveBeenLastCalledWith(null);
  expect(next).toHaveBeenLastCalledWith(null);
});
test('reentrant prior cleanup retains the newest owner', () => {
  const { registry, node, event } = setup();
  const newest = jest.fn(),
    superseded = jest.fn();
  registry.observe(node, 42, () => {
    registry.observe(node, 42, newest);
  });
  const staleStop = registry.observe(node, 42, superseded);
  staleStop();
  registry.receive(event(), 'container-1', true);
  expect(newest).toHaveBeenCalled();
  expect(superseded).toHaveBeenCalledWith(null);
});
test('clearing/unmounting invalidates state and rejects queued events', () => {
  const { registry, listener, cleanup, event, changed } = setup(),
    value = event();
  registry.clear();
  expect(listener).toHaveBeenCalledWith(null);
  const count = changed.mock.calls.length;
  cleanup();
  expect(changed).toHaveBeenCalledTimes(count);
  expect(registry.receive(value, 'container-1', true)).toBe('stale');
});
test('container invalidation preserves the registration for its next geometry', () => {
  const { registry, listener, event } = setup();
  registry.invalidate();
  expect(listener).toHaveBeenLastCalledWith(null);
  registry.receive(event(), 'container-1', true);
  expect(listener).toHaveBeenLastCalledWith(event());
});
test.each([false, true])(
  'an ineligible or detached Portal invalidates the current measurement: %s',
  (presented) => {
    const { registry, listener, event } = setup();
    registry.receive({ ...event(), presented }, 'container-1', false);
    expect(listener).toHaveBeenCalledWith(null);
  },
);
test('unavailable anchors and virtual context-free anchors keep viewport geometry', () => {
  const { registry, event, node } = setup(),
    listener = jest.fn();
  registry.observe(node, 42, listener);
  registry.receive({ ...event(), anchorAvailable: false }, 'container-1', true);
  expect(listener.mock.calls[0][0].anchorAvailable).toBe(false);
  registry.observe(null, 0, listener);
  registry.receive({ ...event(), anchorAvailable: false }, 'container-1', true);
  expect(listener.mock.calls.at(-1)![0]).toMatchObject({ observedTag: 0, viewport: rect });
});
test('signed disjoint clipping rectangles stay distinct from absent clipping parents', () => {
  const { registry, listener, event } = setup();
  const value = {
    ...event(),
    referenceClip: { present: true, x: 400, y: 0, width: -10, height: -20 },
  };
  expect(registry.receive(value, 'container-1', true)).toBe('delivered');
  expect(listener).toHaveBeenCalledWith(value);
});
test.each(['anchor', 'viewport', 'window', 'referenceClip', 'popperClip'] as const)(
  'nonfinite %s geometry invalidates previous positions',
  (field) => {
    const { registry, listener, event } = setup();
    const value = event();
    (value as any)[field] = { ...value[field], x: Infinity };
    expect(registry.receive(value, 'container-1', true)).toBe('invalid');
    expect(listener).toHaveBeenCalledWith(null);
  },
);
test.each(['anchor', 'viewport', 'window'] as const)(
  'negative %s sizes cannot enter the geometry adapter',
  (field) => {
    const { registry, event } = setup();
    const value = event();
    (value as any)[field] = { ...value[field], width: -1 };
    expect(registry.receive(value, 'container-1', true)).toBe('invalid');
  },
);
test.each([-1, 0, NaN, 1.5])(
  'invalid mounted tag %s is rejected before replacing a valid observer',
  (tag) => {
    const { registry, node, event, listener } = setup();
    expect(() => registry.observe(node, tag, jest.fn())).toThrow(/mounted native/);
    expect(registry.receive(event(), 'container-1', true)).toBe('delivered');
    expect(listener).toHaveBeenCalled();
  },
);
test('a null context must use tag zero', () => {
  const { registry } = setup();
  expect(() => registry.observe(null, 42, jest.fn())).toThrow(/mounted native/);
});

test('invalidation renews the native revision and makes queued pre-close geometry stale', () => {
  const { registry, event, listener, cleanup } = setup(),
    old = event();
  registry.invalidate();
  expect(event().observationRevision).not.toBe(old.observationRevision);
  expect(registry.receive(old, 'container-1', true)).toBe('stale');
  expect(registry.receive(event(), 'container-1', true)).toBe('delivered');
  cleanup();
  expect(listener).toHaveBeenLastCalledWith(null);
});
test('a teardown listener cannot re-arm an observer during clear', () => {
  const { registry, event, node, changed } = setup(),
    rearmed = jest.fn();
  registry.observe(node, 42, () => {
    registry.observe(node, 42, rearmed);
  });
  const count = changed.mock.calls.length;
  registry.clear();
  expect(changed).toHaveBeenCalledTimes(count);
  expect(registry.receive(event(), 'container-1', true)).toBe('stale');
  expect(rearmed).not.toHaveBeenCalled();
});

test('the unmount registration gate rejects late registration and permits explicit reactivation', () => {
  const { registry, event, node, changed } = setup(),
    late = jest.fn();
  registry.deactivate();
  registry.clear();
  const count = changed.mock.calls.length;
  registry.observe(node, 42, late);
  expect(changed).toHaveBeenCalledTimes(count);
  expect(registry.receive(event(), 'container-1', true)).toBe('stale');
  registry.activate();
  registry.observe(node, 42, late);
  expect(registry.receive(event(), 'container-1', true)).toBe('delivered');
  expect(late).toHaveBeenCalled();
});
