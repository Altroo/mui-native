import { catalogArrowEdge } from '../apps/native-catalog/popperArrow';
import type { ViewInstance } from 'react-native';
import {
  NativePopperAdapter,
  windowRectToContaining,
  physicalPopperStyle,
  sameNativeValue,
} from '../packages/material/src/nativePopper/nativeAdapter';
import { createNativePopper } from '../packages/material/src/nativePopper/engine';
import type {
  NativePopperInstance,
  NativePopperModifier,
} from '../packages/material/src/nativePopper/types';
import { nativePopperSnapshot } from './helpers/nativePopperSnapshot';
function setup() {
  const root = {
    tag: 2,
    isConnected: true,
    measureInWindow: jest.fn(),
    contains: (value: any) => value.tag === 3,
    setNativeProps: jest.fn(),
  } as any as ViewInstance;
  const anchor = { getBoundingClientRect: () => ({ x: 120, y: 200, width: 100, height: 40 }) };
  const bindings = {
    tag: (node: any) => node.tag,
    pixelRatio: () => 2,
    configure: jest.fn(),
    publish: jest.fn(),
    ready: jest.fn(),
    report: jest.fn(),
  };
  const adapter = new NativePopperAdapter(bindings);
  return { adapter, bindings, root, anchor };
}
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
test('native measurements wait for a matching popup snapshot, then publish actual placement', async () => {
  const { adapter, bindings, root, anchor } = setup(),
    instance = createNativePopper(anchor, root, {}, adapter);
  await tick();
  expect(bindings.publish).not.toHaveBeenCalled();
  expect(bindings.configure).toHaveBeenCalledTimes(1);
  adapter.receive(nativePopperSnapshot());
  await tick();
  await instance.update();
  expect(instance.state.rects.reference).toEqual({ x: 120, y: 200, width: 100, height: 40 });
  expect(bindings.publish).toHaveBeenCalledWith(
    expect.objectContaining({
      position: 'absolute',
      left: 0,
      top: 0,
      transform: [{ translateX: 130 }, { translateY: 240 }],
    }),
  );
  expect(bindings.ready).toHaveBeenLastCalledWith(true);
  instance.destroy();
  adapter.dispose();
});
test('destroy/deactivation releases pending native reads and requires fresh configuration', async () => {
  const { adapter, bindings, root, anchor } = setup(),
    first = createNativePopper(anchor, root, {}, adapter);
  await tick();
  first.destroy();
  adapter.setActive(false);
  await tick();
  expect(bindings.publish).not.toHaveBeenCalled();
  adapter.setActive(true);
  const second = createNativePopper(anchor, root, {}, adapter);
  await tick();
  expect(bindings.configure).toHaveBeenCalledTimes(2);
  adapter.receive(nativePopperSnapshot());
  await tick();
  expect(bindings.publish).toHaveBeenCalled();
  second.destroy();
  adapter.dispose();
});
test('old subscription cleanup cannot delete a newer registration on the same instance', async () => {
  const { adapter } = setup(),
    update = jest.fn(() => Promise.resolve({})),
    instance = { update } as any as NativePopperInstance;
  const old = adapter.subscribe(instance, { scroll: true, resize: true }),
    current = adapter.subscribe(instance, { scroll: true, resize: true });
  old();
  adapter.receive(nativePopperSnapshot());
  expect(update).toHaveBeenCalledTimes(1);
  current();
  adapter.receive(nativePopperSnapshot());
  expect(update).toHaveBeenCalledTimes(1);
  adapter.dispose();
});
test.each(['disabled', 'superseded'])(
  'effective modifiers exclude a %s native boundary',
  async (kind) => {
    const { adapter, bindings, root, anchor } = setup(),
      detached = { tag: 4, isConnected: false, measureInWindow: jest.fn() } as any;
    const modifiers: NativePopperModifier[] =
      kind === 'disabled'
        ? [{ name: 'preventOverflow', enabled: false, options: { boundary: detached } }]
        : [
            { name: 'preventOverflow', options: { boundary: detached } },
            { name: 'preventOverflow', options: { boundary: anchor } },
          ];
    const instance = createNativePopper(anchor, root, { modifiers }, adapter);
    await tick();
    expect(bindings.configure.mock.calls[0][0].boundaries).toEqual([]);
    adapter.receive(nativePopperSnapshot());
    await tick();
    expect(bindings.publish).toHaveBeenCalled();
    instance.destroy();
    adapter.dispose();
  },
);
test('modifier reads, arrow data and publication use the newest immutable measurement frame', async () => {
  const { adapter, bindings, root } = setup(),
    reference = { tag: 1, isConnected: true, measureInWindow: jest.fn() } as any,
    arrow = {
      tag: 3,
      isConnected: true,
      measureInWindow: jest.fn(),
      setNativeProps: jest.fn(),
    } as any,
    boundary = { tag: 4, isConnected: true, measureInWindow: jest.fn() } as any,
    readings: any[] = [];
  const first = jest.fn(),
    instance = createNativePopper(
      reference,
      root,
      {
        onFirstUpdate: first,
        modifiers: [
          { name: 'eventListeners', enabled: false },
          { name: 'arrow', options: { element: arrow } },
          { name: 'preventOverflow', options: { boundary } },
          {
            name: 'inspect',
            enabled: true,
            phase: 'afterRead',
            fn: ({ state }) => {
              readings.push([
                state.rects.reference.x,
                adapter.boundary(boundary, state)?.x,
                adapter.layout(arrow, state)?.width,
              ]);
              return { ...state, native: { ...state.native } };
            },
          },
        ],
      },
      adapter,
    );
  await tick();
  const a = nativePopperSnapshot(),
    b = nativePopperSnapshot();
  for (const [value, x, w] of [
    [a, 120, 10],
    [b, 220, 20],
  ] as const) {
    value.observedTag = 1;
    value.anchorAvailable = true;
    value.position!.anchorAvailable = true;
    value.position!.reference = { x, y: 200, width: 100, height: 40 };
    value.position!.boundaries = [
      { tag: 4, available: true, x: x - 100, y: 0, width: 350, height: 800 },
    ];
    value.position!.arrow = {
      ...value.position!.arrow,
      tag: 3,
      available: true,
      width: w,
      height: 10,
      parentWidth: 80,
      parentHeight: 30,
    };
  }
  adapter.receive(a);
  adapter.receive(b);
  await tick();
  await tick();
  expect(readings.length).toBeGreaterThan(0);
  expect(readings.every((reading) => sameNativeValue(reading, [220, 120, 20]))).toBe(true);
  expect(first).toHaveBeenCalledTimes(1);
  expect(first.mock.calls[0][0].rects.reference.x).toBe(220);
  expect(bindings.report).not.toHaveBeenCalled();
  instance.destroy();
  adapter.dispose();
});
test('imperative arrow axis changes and cleanup use explicit null removals', async () => {
  const { adapter, root, anchor } = setup(),
    arrow = {
      tag: 3,
      isConnected: true,
      measureInWindow: jest.fn(),
      setNativeProps: jest.fn(),
    } as any;
  const instance = createNativePopper(
    anchor,
    root,
    { modifiers: [{ name: 'arrow', options: { element: arrow } }] },
    adapter,
  );
  await tick();
  const value = nativePopperSnapshot();
  value.position!.arrow = {
    ...value.position!.arrow,
    tag: 3,
    available: true,
    width: 10,
    height: 10,
    parentWidth: 80,
    parentHeight: 30,
  };
  adapter.receive(value);
  await tick();
  await instance.update();
  expect(arrow.setNativeProps.mock.calls.at(-1)[0].style.top).toBeNull();
  await instance.setOptions({ placement: 'right' });
  expect(arrow.setNativeProps.mock.calls.at(-1)[0].style.left).toBeNull();
  instance.destroy();
  const cleared = arrow.setNativeProps.mock.calls.at(-1)[0].style;
  expect(cleared.position).toBeNull();
  expect(cleared.transform).toEqual([]);
  expect(cleared.left).toBeNull();
  expect(cleared.top).toBeNull();
  adapter.dispose();
});
test('published style snapshots cannot change through later modifier mutations', async () => {
  const { adapter, bindings, root, anchor } = setup(),
    instance = createNativePopper(anchor, root, {}, adapter);
  await tick();
  adapter.receive(nativePopperSnapshot());
  await tick();
  const published = bindings.publish.mock.calls.at(-1)[0];
  (instance.state.styles.popper as any).transform = [{ translateX: 999 }];
  expect(published.transform).not.toEqual([{ translateX: 999 }]);
  instance.destroy();
  adapter.dispose();
});
test('inactive and unavailable native geometry hides the popup without resolving stale bounds', async () => {
  const { adapter, bindings, root, anchor } = setup(),
    instance = createNativePopper(anchor, root, {}, adapter);
  await tick();
  adapter.receive(null);
  await tick();
  expect(bindings.ready).toHaveBeenLastCalledWith(false);
  expect(bindings.publish).not.toHaveBeenCalled();
  instance.destroy();
  adapter.dispose();
});
test('virtual window rectangles convert once into a rotated containing block', () => {
  const frame = { x: 100, y: 50, width: 300, height: 400, a: 0, b: 2, c: -2, d: 0 };
  expect(windowRectToContaining({ x: 40, y: 90, width: 20, height: 40 }, frame)).toEqual({
    x: 20,
    y: 20,
    width: 20,
    height: 10,
  });
});
test('empty virtual boundaries remain empty while zero-size anchor lines keep anchor geometry', () => {
  const frame = { x: 0, y: 0, width: 100, height: 100, a: 1, b: 1, c: -1, d: 1 },
    line = { x: 0, y: 0, width: 100, height: 0 };
  expect(windowRectToContaining(line, frame, true)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  expect(windowRectToContaining(line, frame)).toEqual({ x: 0, y: -50, width: 50, height: 50 });
});
test('physical side publication swaps insets only when the native layout actually swapped them', () => {
  const style = { left: 0, right: undefined, top: 10, transform: [{ translateX: 20 }] };
  expect(physicalPopperStyle(style, false)).toBe(style);
  expect(physicalPopperStyle(style, true)).toEqual({
    left: undefined,
    right: 0,
    top: 10,
    transform: [{ translateX: 20 }],
  });
  expect(sameNativeValue({}, { left: undefined })).toBe(false);
});

test.each(
  (
    ['native anchor', 'virtual context', 'unavailable boundary', 'missing boundary'] as const
  ).flatMap((kind) => [true, false].map((events) => ({ kind, events }))),
)(
  'lost $kind hides an already positioned popup with event listeners $events',
  async ({ kind, events }) => {
    const { adapter, bindings, root, anchor } = setup(),
      node = { tag: 1, isConnected: true, measureInWindow: jest.fn() } as any as ViewInstance,
      boundary = { tag: 4, isConnected: true, measureInWindow: jest.fn() } as any as ViewInstance,
      hasContext = kind === 'native anchor' || kind === 'virtual context',
      reference =
        kind === 'native anchor' ? node : hasContext ? { ...anchor, contextElement: node } : anchor,
      instance = createNativePopper(
        reference,
        root,
        {
          modifiers: [
            { name: 'eventListeners', enabled: events },
            ...(!hasContext ? [{ name: 'preventOverflow', options: { boundary } }] : []),
          ],
        },
        adapter,
      );
    try {
      await tick();
      const valid = nativePopperSnapshot();
      valid.observedTag = hasContext ? 1 : 0;
      valid.anchorAvailable = hasContext;
      valid.position!.anchorAvailable = hasContext;
      if (!hasContext)
        valid.position!.boundaries = [
          { tag: 4, available: true, x: 0, y: 0, width: 390, height: 844 },
        ];
      adapter.receive(valid);
      await instance.update();
      expect(bindings.ready).toHaveBeenLastCalledWith(true);
      bindings.publish.mockClear();
      const invalid = nativePopperSnapshot();
      invalid.observedTag = valid.observedTag;
      if (kind === 'unavailable boundary')
        invalid.position!.boundaries = [
          { tag: 4, available: false, x: 0, y: 0, width: 0, height: 0 },
        ];
      adapter.receive(invalid);
      expect(bindings.ready).toHaveBeenLastCalledWith(false);
      adapter.positioned();
      expect(bindings.ready).toHaveBeenLastCalledWith(false);
      await instance.update();
      expect(bindings.publish).not.toHaveBeenCalled();
      expect(bindings.ready).toHaveBeenLastCalledWith(false);
      adapter.receive(valid);
      await instance.update();
      expect(bindings.ready).toHaveBeenLastCalledWith(true);
      expect(bindings.publish).toHaveBeenCalled();
    } finally {
      instance.destroy();
      adapter.dispose();
    }
  },
);

test('catalog arrow edge composes with real native publication across placement changes', async () => {
  const { adapter, root, anchor } = setup();
  const arrow = {
    tag: 3,
    isConnected: true,
    measureInWindow: jest.fn(),
    setNativeProps: jest.fn(),
  } as any;
  const instance = createNativePopper(
    anchor,
    root,
    { modifiers: [{ name: 'arrow', options: { element: arrow } }, catalogArrowEdge] },
    adapter,
  );
  try {
    await tick();
    const value = nativePopperSnapshot();
    value.position!.arrow = {
      ...value.position!.arrow,
      tag: 3,
      available: true,
      width: 10,
      height: 10,
      parentWidth: 80,
      parentHeight: 30,
    };
    adapter.receive(value);
    await instance.update();
    for (const [placement, edge, cleared] of [
      ['bottom', 'top', 'bottom'],
      ['top', 'bottom', 'top'],
      ['right', 'left', 'right'],
      ['left', 'right', 'left'],
    ] as const) {
      await instance.setOptions({ placement });
      const style = arrow.setNativeProps.mock.calls.at(-1)[0].style;
      expect(style[edge]).toBe(-5);
      expect(style[cleared]).toBeNull();
    }
  } finally {
    instance.destroy();
    adapter.dispose();
  }
});

test('arrow teardown uses reset values accepted by the real React Native transform processor', async () => {
  const processTransform = jest.requireActual(
    'react-native/Libraries/StyleSheet/processTransform',
  ).default;
  const { adapter, root, anchor } = setup();
  const arrow = {
    tag: 3,
    isConnected: true,
    measureInWindow: jest.fn(),
    setNativeProps: jest.fn(({ style }: { style: Record<string, unknown> }) => {
      if (Object.hasOwn(style, 'transform')) processTransform(style.transform);
    }),
  } as any;
  const instance = createNativePopper(
    anchor,
    root,
    { modifiers: [{ name: 'arrow', options: { element: arrow } }] },
    adapter,
  );
  await tick();
  const value = nativePopperSnapshot();
  value.position!.arrow = {
    ...value.position!.arrow,
    tag: 3,
    available: true,
    width: 10,
    height: 10,
    parentWidth: 80,
    parentHeight: 30,
  };
  adapter.receive(value);
  await instance.update();
  try {
    await instance.setOptions({ placement: 'top' });
    instance.destroy();
    expect(arrow.setNativeProps.mock.calls.at(-1)[0].style.transform).toEqual([]);
  } finally {
    instance.destroy();
    adapter.dispose();
  }
});
