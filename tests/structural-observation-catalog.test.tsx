// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Host/transport doubles exercise scene ownership. Native order and geometry
// are verified separately by the installed iOS and Android collectors.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(actual),
      View: { value: 'View', enumerable: true, configurable: true },
      findNodeHandle: {
        value: jest.fn((n: any) => n?.tag ?? null),
        enumerable: true,
        configurable: true,
        writable: true,
      },
    },
  );
});
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import * as RN from 'react-native';
import { StructuralObservationProbe } from '../apps/native-catalog/StructuralObservationProbe';
import { createStructuralObserverClient } from '../packages/native-host/src/structuralObserverClient';
const receipt = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('structure-probe-receipt').props.accessibilityLabel);
function hosts() {
  const nodes = new Map<string, any>();
  let serial = 100;
  const order = ['target', 'a', 'b'];
  const parent: any = {
    parentElement: null,
    get children() {
      return order.map((x) => nodes.get(x)).filter(Boolean);
    },
  };
  function createNodeMock(element: any) {
    if (element.props.testID === 'structure-probe-parent') return parent;
    let key = element.props.testID === 'structure-probe-target' ? 'target' : undefined;
    if (!key && element.props.style?.display === 'none') key = 'hidden';
    if (!key && element.props.style?.left === 80) key = 'a';
    if (!key && element.props.style?.left === 100) key = 'b';
    if (!key && element.props.style?.left === 120) key = 'c';
    if (!key) return {};
    const node = { parentElement: parent, children: [], tag: ++serial };
    nodes.set(key, node);
    return node;
  }
  return { parent, nodes, order, createNodeMock };
}
function transport() {
  let listener: any;
  const release = jest.fn(),
    dispose = jest.fn();
  const watch = jest.fn((_tag: number, _lease: string, _mode: string, cb: any) => {
    listener = cb;
    return release;
  });
  return { watch, release, dispose, emit: (c: any) => act(() => listener(c)) };
}
beforeEach(() => jest.spyOn(RN, 'findNodeHandle').mockImplementation((n: any) => n?.tag ?? null));
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
test('stable memoized target refs survive all seven stages and explicit measurements', () => {
  const model = hosts(),
    client = transport(),
    factory = jest.fn(() => client),
    diagnostics = jest.fn(() => ({ subscriptions: 1 }));
  const tree = render(
    <StructuralObservationProbe createClient={factory} diagnostics={diagnostics} />,
    { createNodeMock: model.createNodeMock },
  );
  expect(receipt(tree).actual.parentMatchesForwardedRef).toBe(true);
  expect(receipt(tree).actual.targetIsCanonicalChild).toBe(true);
  const target = model.nodes.get('target');
  const before = receipt(tree).leases.target;
  fireEvent(tree.getByTestId('structure-probe-target'), 'layout');
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  expect(client.watch).toHaveBeenCalledWith(
    target.tag,
    'structure-probe:1',
    'siblings',
    expect.any(Function),
  );
  for (let i = 1; i < 7; i++) {
    fireEvent.press(tree.getByTestId('structure-probe-next'));
    fireEvent.press(tree.getByTestId('structure-probe-measure'));
    expect(receipt(tree).stage).toBe(i);
    expect(receipt(tree).leases.target).toEqual(before);
    expect(model.nodes.get('target')).toBe(target);
  }
  fireEvent.press(tree.getByTestId('structure-probe-stop'));
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(client.dispose).toHaveBeenCalledTimes(1);
  expect(receipt(tree).active).toBe(false);
});
test('failed watch disposes the acquired client and reports failure visibly', () => {
  const model = hosts(),
    client = transport();
  client.watch.mockImplementation(() => {
    throw Error('watch rejected');
  });
  const tree = render(
    <StructuralObservationProbe createClient={() => client} diagnostics={() => ({})} />,
    { createNodeMock: model.createNodeMock },
  );
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  expect(client.dispose).toHaveBeenCalledTimes(1);
  expect(receipt(tree).active).toBe(false);
  expect(receipt(tree).errors.join(' ')).toContain('watch rejected');
});
test('stop attempts both release and disposal even when both reject', () => {
  const model = hosts(),
    client = transport();
  client.release.mockImplementation(() => {
    throw Error('release failure');
  });
  client.dispose.mockImplementation(() => {
    throw Error('dispose failure');
  });
  const tree = render(
    <StructuralObservationProbe createClient={() => client} diagnostics={() => ({})} />,
    { createNodeMock: model.createNodeMock },
  );
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  fireEvent.press(tree.getByTestId('structure-probe-stop'));
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(client.dispose).toHaveBeenCalledTimes(1);
  expect(receipt(tree).active).toBe(false);
  expect(receipt(tree).errors).toEqual(['Error: release failure', 'Error: dispose failure']);
});
test('StrictMode liveness and unmount cleanup suppress a late captured callback', () => {
  const model = hosts(),
    client = transport(),
    diagnostics = jest.fn(() => ({}));
  const tree = render(
    <StrictMode>
      <StructuralObservationProbe createClient={() => client} diagnostics={diagnostics} />
    </StrictMode>,
    { createNodeMock: model.createNodeMock },
  );
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  expect(receipt(tree).active).toBe(true);
  tree.unmount();
  const calls = diagnostics.mock.calls.length;
  client.emit({ subscriptionId: 1, lease: 'structure-probe:1', revision: 2, closed: false });
  expect(diagnostics).toHaveBeenCalledTimes(calls);
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(client.dispose).toHaveBeenCalledTimes(1);
});
test('a real client releases its scene owner after native closure and permits restart', () => {
  const model = hosts();
  let notify: () => void = () => {};
  let records: any[] = [];
  let nextId = 0;
  const native = {
    connect: jest.fn((cb: () => void) => {
      notify = cb;
    }),
    observe: jest.fn(() => ++nextId),
    unobserve: jest.fn(() => true),
    takeRecords: jest.fn(() => {
      const pending = records;
      records = [];
      return pending;
    }),
    disconnect: jest.fn(),
    getDiagnostics: () => ({ subscriptions: 0 }),
  };
  const factory = jest.fn(() => createStructuralObserverClient(native as any));
  const tree = render(
    <StructuralObservationProbe createClient={factory} diagnostics={native.getDiagnostics} />,
    { createNodeMock: model.createNodeMock },
  );
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  records = [{ subscriptionId: 1, lease: 'structure-probe:1', revision: 1, closed: false }];
  act(() => notify());
  records = [{ subscriptionId: 1, lease: 'structure-probe:1', revision: 2, closed: true }];
  act(() => notify());
  expect(native.unobserve).toHaveBeenCalledWith(1, 'structure-probe:1');
  expect(native.disconnect).toHaveBeenCalledTimes(1);
  expect(receipt(tree).events.at(-1).closed).toBe(true);
  expect(receipt(tree).active).toBe(false);
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  expect(native.observe).toHaveBeenCalledTimes(2);
});
test('native closure clears the scene handle after its client disconnects', () => {
  const model = hosts();
  let notify: () => void = () => {};
  let records: any[] = [];
  let nextId = 0;
  const native = {
    connect: jest.fn((cb: () => void) => {
      notify = cb;
    }),
    observe: jest.fn(() => ++nextId),
    unobserve: jest.fn(() => true),
    takeRecords: jest.fn(() => {
      const pending = records;
      records = [];
      return pending;
    }),
    disconnect: jest.fn(),
    getDiagnostics: () => ({ subscriptions: 0 }),
  };
  const tree = render(
    <StructuralObservationProbe
      createClient={() => createStructuralObserverClient(native as any)}
      diagnostics={native.getDiagnostics}
    />,
    { createNodeMock: model.createNodeMock },
  );
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  records = [{ subscriptionId: 1, lease: 'structure-probe:1', revision: 1, closed: false }];
  act(() => notify());
  records = [{ subscriptionId: 1, lease: 'structure-probe:1', revision: 2, closed: true }];
  act(() => notify());
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  expect(native.observe).toHaveBeenCalledTimes(2);
});
test('reentrant Stop during release does not release or dispose the same owner twice', () => {
  const model = hosts(),
    client = transport();
  let tree: ReturnType<typeof render>;
  tree = render(
    <StructuralObservationProbe createClient={() => client} diagnostics={() => ({})} />,
    { createNodeMock: model.createNodeMock },
  );
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  client.release.mockImplementation(() =>
    fireEvent.press(tree.getByTestId('structure-probe-stop')),
  );
  fireEvent.press(tree.getByTestId('structure-probe-stop'));
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(client.dispose).toHaveBeenCalledTimes(1);
  expect(receipt(tree).active).toBe(false);
});
test('a stale ref cleanup preserves the current replacement ref token', () => {
  const model = hosts(),
    client = transport();
  const tree = render(
    <StructuralObservationProbe createClient={() => client} diagnostics={() => ({})} />,
    { createNodeMock: model.createNodeMock },
  );
  const cb = tree.getByTestId('structure-probe-target').props.ref;
  expect(typeof cb).toBe('function');
  const a = { parentElement: model.parent, children: [], tag: 501 },
    b = { parentElement: model.parent, children: [], tag: 502 };
  let old: () => void, current: () => void;
  act(() => {
    old = cb(a);
    current = cb(b);
    model.nodes.set('target', b);
    old();
  });
  fireEvent.press(tree.getByTestId('structure-probe-measure'));
  expect(receipt(tree).actual.targetIsCanonicalChild).toBe(true);
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  expect(client.watch.mock.calls[0][0]).toBe(502);
  act(() => current());
});
test('updated factory and diagnostics are used by the next controlled start', () => {
  const model = hosts(),
    old = transport(),
    fresh = transport();
  const tree = render(
    <StructuralObservationProbe createClient={() => old} diagnostics={() => ({ marker: 'old' })} />,
    { createNodeMock: model.createNodeMock },
  );
  tree.rerender(
    <StructuralObservationProbe
      createClient={() => fresh}
      diagnostics={() => ({ marker: 'fresh' })}
    />,
  );
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  expect(old.watch).not.toHaveBeenCalled();
  expect(fresh.watch).toHaveBeenCalledTimes(1);
  expect(receipt(tree).nativeDiagnostics.marker).toBe('fresh');
});
test('closed then fresh Start ignores old queued callbacks and Stop disposes only current owner', () => {
  const model = hosts(),
    first = transport(),
    second = transport();
  let calls = 0;
  const diagnostics = jest.fn(() => ({}));
  const tree = render(
    <StructuralObservationProbe
      createClient={() => (calls++ === 0 ? first : second)}
      diagnostics={diagnostics}
    />,
    { createNodeMock: model.createNodeMock },
  );
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  first.emit({ subscriptionId: 1, lease: 'structure-probe:1', revision: 1, closed: false });
  first.emit({ subscriptionId: 1, lease: 'structure-probe:1', revision: 2, closed: true });
  expect(receipt(tree).active).toBe(false);
  expect(first.release).toHaveBeenCalledTimes(1);
  expect(first.dispose).toHaveBeenCalledTimes(1);
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  expect(second.watch).toHaveBeenCalledWith(
    expect.any(Number),
    'structure-probe:2',
    'siblings',
    expect.any(Function),
  );
  expect(receipt(tree).active).toBe(true);
  const events = receipt(tree).events.length,
    reads = diagnostics.mock.calls.length;
  first.emit({ subscriptionId: 1, lease: 'structure-probe:1', revision: 3, closed: true });
  expect(receipt(tree).events).toHaveLength(events);
  expect(diagnostics).toHaveBeenCalledTimes(reads);
  expect(second.release).not.toHaveBeenCalled();
  expect(receipt(tree).active).toBe(true);
  second.emit({ subscriptionId: 2, lease: 'structure-probe:wrong', revision: 1, closed: true });
  expect(receipt(tree).events).toHaveLength(events);
  expect(second.release).not.toHaveBeenCalled();
  fireEvent.press(tree.getByTestId('structure-probe-stop'));
  expect(second.release).toHaveBeenCalledTimes(1);
  expect(second.dispose).toHaveBeenCalledTimes(1);
  tree.unmount();
  expect(first.dispose).toHaveBeenCalledTimes(1);
  expect(second.dispose).toHaveBeenCalledTimes(1);
});
test('closed-record cleanup records both failures, clears ownership and allows a fresh client', () => {
  const model = hosts(),
    first = transport(),
    second = transport();
  let calls = 0;
  first.release.mockImplementation(() => {
    throw Error('closed release failure');
  });
  first.dispose.mockImplementation(() => {
    throw Error('closed dispose failure');
  });
  const tree = render(
    <StructuralObservationProbe
      createClient={() => (calls++ === 0 ? first : second)}
      diagnostics={() => ({})}
    />,
    { createNodeMock: model.createNodeMock },
  );
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  first.emit({ subscriptionId: 1, lease: 'structure-probe:1', revision: 1, closed: true });
  expect(first.release).toHaveBeenCalledTimes(1);
  expect(first.dispose).toHaveBeenCalledTimes(1);
  expect(receipt(tree).active).toBe(false);
  expect(receipt(tree).errors).toEqual([
    'Error: closed release failure',
    'Error: closed dispose failure',
  ]);
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  expect(second.watch).toHaveBeenCalledTimes(1);
  fireEvent.press(tree.getByTestId('structure-probe-stop'));
  expect(second.dispose).toHaveBeenCalledTimes(1);
});
test('canonicality metadata rejects same-tag clones and a distinct parent object', () => {
  const model = hosts(),
    client = transport();
  const tree = render(
    <StructuralObservationProbe createClient={() => client} diagnostics={() => ({})} />,
    { createNodeMock: model.createNodeMock },
  );
  const target = model.nodes.get('target');
  model.nodes.set('target', { ...target });
  fireEvent.press(tree.getByTestId('structure-probe-measure'));
  expect(receipt(tree).actual.targetIsCanonicalChild).toBe(false);
  expect(receipt(tree).actual.order).toContain('unmapped');
  model.nodes.set('target', target);
  target.parentElement = { parentElement: null, children: [target] };
  fireEvent.press(tree.getByTestId('structure-probe-measure'));
  expect(receipt(tree).actual.parentMatchesForwardedRef).toBe(false);
  expect(receipt(tree).actual.targetIsCanonicalChild).toBe(true);
});

test('direct-children mode watches the forwarded parent and releases the old session first', () => {
  const model = hosts();
  model.parent.tag = 99;
  const first = transport(),
    second = transport();
  let acquired = 0;
  const tree = render(
    <StructuralObservationProbe
      createClient={() => (++acquired === 1 ? first : second)}
      diagnostics={() => ({})}
    />,
    { createNodeMock: model.createNodeMock },
  );
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  expect(first.watch).toHaveBeenCalledWith(
    expect.any(Number),
    'structure-probe:1',
    'siblings',
    expect.any(Function),
  );
  fireEvent.press(tree.getByTestId('structure-probe-mode'));
  expect(first.release).toHaveBeenCalledTimes(1);
  expect(first.dispose).toHaveBeenCalledTimes(1);
  expect(receipt(tree).watchMode).toBe('children');
  expect(receipt(tree).events).toEqual([]);
  expect(receipt(tree).active).toBe(false);
  fireEvent.press(tree.getByTestId('structure-probe-start'));
  expect(second.watch).toHaveBeenCalledWith(
    99,
    'structure-probe:1',
    'children',
    expect.any(Function),
  );
  first.emit({ subscriptionId: 1, lease: 'structure-probe:1', revision: 2, closed: true });
  expect(receipt(tree).events).toEqual([]);
  expect(receipt(tree).active).toBe(true);
  fireEvent.press(tree.getByTestId('structure-probe-stop'));
  expect(second.release).toHaveBeenCalledTimes(1);
  expect(second.dispose).toHaveBeenCalledTimes(1);
});
