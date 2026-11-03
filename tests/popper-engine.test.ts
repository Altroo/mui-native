import type { ViewInstance } from 'react-native';
import { createNativePopper } from '../packages/material/src/popper/engine';
import { orderModifiers, intersect } from '../packages/material/src/popper/geometry';
import type {
  NativePopperModifier,
  NativePopperOptions,
  NativePopperPlatform,
  NativePopperMeasurements,
  NativePopperRect,
} from '../packages/material/src/popper/types';
function fixture(
  options: Partial<NativePopperOptions> = {},
  adjust: Partial<NativePopperMeasurements> = {},
) {
  const reference = { isConnected: true } as unknown as ViewInstance,
    popper = { isConnected: true } as unknown as ViewInstance;
  const viewport = { x: 0, y: 0, width: 390, height: 844 },
    data: NativePopperMeasurements = {
      reference: { x: 100, y: 200, width: 40, height: 20 },
      popper: { x: 0, y: 0, width: 120, height: 80 },
      viewport,
      document: viewport,
      clipping: { reference: viewport, popper: viewport },
      offsetParent: { width: 390, height: 844 },
      pixelRatio: 1,
      ...adjust,
    };
  const stop = jest.fn(),
    apply = jest.fn(),
    measure = jest.fn<
      ReturnType<NativePopperPlatform['measure']>,
      Parameters<NativePopperPlatform['measure']>
    >(() => data),
    report = jest.fn();
  const platform: NativePopperPlatform = {
    measure,
    apply,
    report,
    subscribe: jest.fn(() => stop),
    layout: () => ({ x: 0, y: 0, width: 10, height: 10 }),
    parent: () => ({ width: 120, height: 80 }),
    contains: () => true,
    boundary: () => ({ x: 20, y: 30, width: 200, height: 300 }),
  };
  const instance = createNativePopper(reference, popper, options, platform);
  return { instance, platform, data, reference, popper, stop, apply, measure, report };
}
afterEach(() => jest.restoreAllMocks());
test.each([
  ['bottom', 60, 220],
  ['bottom-start', 100, 220],
  ['bottom-end', 20, 220],
  ['top', 60, 120],
  ['top-start', 100, 120],
  ['top-end', 20, 120],
  ['left', -20, 170],
  ['left-start', -20, 200],
  ['left-end', -20, 140],
  ['right', 140, 170],
  ['right-start', 140, 200],
  ['right-end', 140, 140],
] as const)('%s places the popup at its reference geometry', async (placement, x, y) => {
  const f = fixture({
    placement,
    modifiers: [
      { name: 'flip', enabled: false },
      { name: 'preventOverflow', enabled: false },
    ],
  });
  await f.instance.update();
  expect(f.instance.state.modifiersData.popperOffsets).toEqual({ x, y });
  f.instance.destroy();
});
test('bottom placement flips above a reference near the lower edge', async () => {
  const f = fixture({}, { reference: { x: 100, y: 820, width: 40, height: 20 } });
  await f.instance.update();
  expect(f.instance.state.placement).toBe('top');
  expect(f.instance.state.modifiersData.popperOffsets).toEqual({ x: 60, y: 740 });
  f.instance.destroy();
});
test('offset changes both axes and retains per-placement modifier data', async () => {
  const f = fixture({ modifiers: [{ name: 'offset', options: { offset: [5, 10] } }] });
  await f.instance.update();
  expect(f.instance.state.modifiersData.popperOffsets).toEqual({ x: 65, y: 230 });
  expect(f.instance.state.modifiersData.offset.left).toEqual({ x: -10, y: 5 });
  f.instance.destroy();
});
test('native transforms round at the supplied pixel ratio', async () => {
  const f = fixture(
    { modifiers: [{ name: 'computeStyles', options: { adaptive: false } }] },
    { reference: { x: 100.125, y: 200.25, width: 40, height: 20 }, pixelRatio: 2 },
  );
  await f.instance.update();
  expect(f.instance.state.styles.popper.transform).toEqual([
    { translateX: 60 },
    { translateY: 220.5 },
  ]);
  f.instance.destroy();
});
test('a callback offset reads the current reference and placement for all candidates', async () => {
  const callback = jest.fn(({ reference, placement }) => [
    reference.width / 10,
    placement.startsWith('top') ? 7 : 12,
  ]);
  const f = fixture({ modifiers: [{ name: 'offset', options: { offset: callback } }] });
  await f.instance.update();
  expect(callback).toHaveBeenCalledWith(
    expect.objectContaining({ placement: 'bottom', reference: f.data.reference }),
  );
  expect(f.instance.state.modifiersData.popperOffsets).toEqual({ x: 64, y: 232 });
  f.instance.destroy();
});
test('same-turn async updates share one promise and one native read', async () => {
  const f = fixture();
  const a = f.instance.update(),
    b = f.instance.update();
  expect(a).toBe(b);
  await a;
  expect(f.measure).toHaveBeenCalledTimes(1);
  f.instance.destroy();
});
test('forceUpdate reads synchronously when the platform exposes synchronous bounds', () => {
  const f = fixture();
  f.instance.forceUpdate();
  expect(f.instance.state.rects.reference).toEqual(f.data.reference);
  expect(f.apply).toHaveBeenCalledTimes(1);
  f.instance.destroy();
});
test('onFirstUpdate follows the modifier pipeline once', async () => {
  const trace: string[] = [],
    first = jest.fn(() => trace.push('first')),
    f = fixture({
      onFirstUpdate: first,
      modifiers: [
        {
          name: 'trace',
          enabled: true,
          phase: 'afterWrite',
          fn: () => {
            trace.push('write');
          },
        },
      ],
    });
  await f.instance.update();
  expect(trace).toEqual(['write', 'first']);
  f.instance.forceUpdate();
  await Promise.resolve();
  expect(first).toHaveBeenCalledTimes(1);
  f.instance.destroy();
});
test('changing options cleans effects, accepts an updater and keeps the same instance', async () => {
  const cleanup = jest.fn(),
    effect = jest.fn(() => cleanup),
    f = fixture({ modifiers: [{ name: 'custom', enabled: true, phase: 'main', effect }] });
  await f.instance.update();
  const same = f.instance;
  await same.setOptions((previous) => ({ placement: 'top', modifiers: previous.modifiers }));
  expect(f.instance).toBe(same);
  expect(effect).toHaveBeenCalledTimes(2);
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(f.stop).toHaveBeenCalledTimes(1);
  expect(same.state.placement).toBe('top');
  same.destroy();
  expect(cleanup).toHaveBeenCalledTimes(2);
  expect(f.stop).toHaveBeenCalledTimes(2);
});
test('modifiers are merged by name, ordered by dependencies and then by phase', () => {
  const fn = () => {},
    ordered = orderModifiers([
      {
        name: 'last',
        enabled: true,
        phase: 'main',
        requires: ['first'],
        options: { a: 1 },
        data: { x: 1 },
        fn,
      },
      { name: 'first', enabled: true, phase: 'main', fn },
      { name: 'last', options: { b: 2 }, data: { y: 2 } },
      { name: 'read', enabled: true, phase: 'read', fn },
    ]);
  expect(ordered.map((x) => x.name)).toEqual(['read', 'first', 'last']);
  expect(ordered[2]).toMatchObject({ options: { a: 1, b: 2 }, data: { x: 1, y: 2 }, fn });
});
test('custom modifier reset recomputes offsets and preserves its cycle data', async () => {
  const f = fixture({
    modifiers: [
      { name: 'flip', enabled: false },
      {
        name: 'change',
        enabled: true,
        phase: 'main',
        data: { changed: false },
        fn: ({ state, name }) => {
          if (!state.modifiersData[name].changed) {
            state.modifiersData[name].changed = true;
            state.placement = 'top';
            state.reset = true;
          }
        },
      },
    ],
  });
  await f.instance.update();
  expect(f.instance.state.modifiersData.popperOffsets).toEqual({ x: 60, y: 120 });
  expect(f.instance.state.modifiersData.change.changed).toBe(true);
  f.instance.destroy();
});
test('replacement modifier state remains the public state and retains native overflow access', async () => {
  const f = fixture({
    modifiers: [
      {
        name: 'replace',
        enabled: true,
        phase: 'afterWrite',
        fn: ({ state }) => ({ ...state, attributes: { popper: { custom: true } } }),
      },
    ],
  });
  await f.instance.update();
  expect(f.instance.state.attributes.popper).toEqual({ custom: true });
  f.instance.destroy();
});
test('stale native measurements cannot publish over newer bounds', async () => {
  const f = fixture();
  await f.instance.update();
  let finish!: (data: NativePopperMeasurements) => void;
  f.measure.mockImplementationOnce(
    () =>
      new Promise<NativePopperMeasurements>((resolve) => {
        finish = resolve;
      }),
  );
  const old = f.instance.update();
  await Promise.resolve();
  f.data.reference = { x: 200, y: 300, width: 40, height: 20 };
  f.instance.forceUpdate();
  const count = f.apply.mock.calls.length;
  finish({ ...f.data, reference: { x: 0, y: 0, width: 10, height: 10 } });
  await old;
  expect(f.apply).toHaveBeenCalledTimes(count);
  expect(f.instance.state.rects.reference.x).toBe(200);
  f.instance.destroy();
});
test('disconnecting or destroying while a measurement is pending prevents publication', async () => {
  const f = fixture();
  await f.instance.update();
  let finish!: (data: NativePopperMeasurements) => void;
  f.measure.mockImplementation(
    () =>
      new Promise<NativePopperMeasurements>((resolve) => {
        finish = resolve;
      }),
  );
  const pending = f.instance.update();
  await Promise.resolve();
  f.instance.destroy();
  const count = f.apply.mock.calls.length;
  finish(f.data);
  await pending;
  expect(f.apply).toHaveBeenCalledTimes(count);
  await f.instance.setOptions({ placement: 'left' });
  expect(f.stop).toHaveBeenCalledTimes(1);
});
test('a disconnected target is not measured and cannot receive a first-update callback', async () => {
  const first = jest.fn(),
    f = fixture({ onFirstUpdate: first });
  Object.defineProperty(f.reference, 'isConnected', { value: false });
  await f.instance.update();
  expect(f.measure).not.toHaveBeenCalled();
  expect(first).not.toHaveBeenCalled();
  f.instance.destroy();
});
test('destroy is idempotent and attempts every cleanup even when one throws', async () => {
  const second = jest.fn(),
    f = fixture({
      modifiers: [
        {
          name: 'a',
          enabled: true,
          phase: 'main',
          effect: () => () => {
            throw Error('cleanup');
          },
        },
        { name: 'b', enabled: true, phase: 'main', effect: () => second },
      ],
    });
  await f.instance.update();
  expect(() => f.instance.destroy()).toThrow(AggregateError);
  expect(second).toHaveBeenCalledTimes(1);
  expect(f.stop).toHaveBeenCalledTimes(1);
  expect(() => f.instance.destroy()).not.toThrow();
});
test('destroy during effect setup runs its returned cleanup and stops further effects', () => {
  const cleanup = jest.fn(),
    later = jest.fn(),
    f = fixture({
      modifiers: [
        {
          name: 'destroy',
          enabled: true,
          phase: 'afterWrite',
          effect: ({ instance }) => {
            instance.destroy();
            return cleanup;
          },
        },
        { name: 'later', enabled: true, phase: 'afterWrite', effect: later },
      ],
    });
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(later).not.toHaveBeenCalled();
  expect(f.stop).toHaveBeenCalledTimes(1);
});
test('pathological reset modifiers stop rather than blocking the JavaScript thread', async () => {
  const f = fixture({
    modifiers: [
      {
        name: 'reset',
        enabled: true,
        phase: 'beforeRead',
        fn: ({ state }) => {
          state.reset = true;
        },
      },
    ],
  });
  await expect(f.instance.update()).rejects.toThrow('reset limit');
  f.instance.destroy();
});
test.each([
  { pixelRatio: 0 },
  { reference: { x: NaN, y: 0, width: 10, height: 10 } },
  { popper: { x: 0, y: 0, width: -1, height: 10 } },
])('invalid native measurements cannot reach the style writer: %j', async (adjust) => {
  const f = fixture({}, adjust);
  await expect(f.instance.update()).rejects.toThrow('invalid native measurements');
  expect(f.apply).not.toHaveBeenCalled();
  f.instance.destroy();
});
test('invalid offsets cannot silently become a visible origin popup', async () => {
  const f = fixture({ modifiers: [{ name: 'offset', options: { offset: [Infinity, 0] } }] });
  await expect(f.instance.update()).rejects.toThrow('finite');
  expect(f.apply).not.toHaveBeenCalled();
  f.instance.destroy();
});
test('disjoint clipping rectangles retain signed edge distances', () => {
  expect(
    intersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 30, width: 10, height: 10 }),
  ).toEqual({ x: 20, y: 30, width: -10, height: -20 });
});

test('reentrant option changes during cleanup keep the newest pipeline and effects together', async () => {
  let nested = false;
  const nestedEffect = jest.fn(() => () => {}),
    outerEffect = jest.fn(() => () => {});
  const f = fixture({
    modifiers: [
      {
        name: 'old',
        enabled: true,
        phase: 'main',
        effect:
          ({ instance }) =>
          () => {
            if (!nested) {
              nested = true;
              void instance.setOptions({
                placement: 'right',
                modifiers: [{ name: 'nested', enabled: true, phase: 'main', effect: nestedEffect }],
              });
            }
          },
      },
    ],
  });
  await f.instance.update();
  await f.instance.setOptions({
    placement: 'left',
    modifiers: [{ name: 'outer', enabled: true, phase: 'main', effect: outerEffect }],
  });
  expect(f.instance.state.options.placement).toBe('right');
  expect(f.instance.state.orderedModifiers.some((x) => x.name === 'nested')).toBe(true);
  expect(nestedEffect).toHaveBeenCalledTimes(1);
  expect(outerEffect).not.toHaveBeenCalled();
  f.instance.destroy();
});
test.each(['effect', 'returned cleanup'] as const)(
  'stale rollback after a reentrant %s failure leaves newer effects active',
  async (mode) => {
    const nestedCleanup = jest.fn(),
      f = fixture();
    await f.instance.update();
    expect(() =>
      f.instance.setOptions({
        modifiers: [
          {
            name: 'bad',
            enabled: true,
            phase: 'main',
            effect: ({ instance }) => {
              void instance.setOptions({
                placement: 'right',
                modifiers: [
                  { name: 'nested', enabled: true, phase: 'main', effect: () => nestedCleanup },
                ],
              });
              if (mode === 'effect') throw Error('outer failure');
              return () => {
                throw Error('outer failure');
              };
            },
          },
        ],
      }),
    ).toThrow('outer failure');
    await f.instance.update();
    expect(f.instance.state.options.placement).toBe('right');
    expect(nestedCleanup).not.toHaveBeenCalled();
    f.instance.destroy();
    expect(nestedCleanup).toHaveBeenCalledTimes(1);
  },
);
test('a stale replacement state returned after a synchronous nested update cannot overwrite newer measurements', async () => {
  let updated = false;
  const f = fixture({
    modifiers: [
      {
        name: 'replace',
        enabled: true,
        phase: 'afterWrite',
        fn: ({ state, instance }) => {
          const previous = {
            ...state,
            rects: { reference: { ...state.rects.reference }, popper: { ...state.rects.popper } },
          };
          if (!updated) {
            updated = true;
            f.data.reference = { x: 200, y: 300, width: 40, height: 20 };
            instance.forceUpdate();
          }
          return previous;
        },
      },
    ],
  });
  await f.instance.update();
  expect(f.instance.state.rects.reference.x).toBe(200);
  f.instance.destroy();
});
test('arrow cleanup clears the live elements after a modifier replaces state', async () => {
  const element = {} as ViewInstance,
    replace: NativePopperModifier = {
      name: 'replace',
      enabled: true,
      phase: 'afterWrite',
      fn: ({ state }) => ({ ...state, elements: { ...state.elements } }),
    },
    f = fixture({ modifiers: [{ name: 'arrow', options: { element } }, replace] });
  await f.instance.update();
  expect(f.instance.state.elements.arrow).toBe(element);
  await f.instance.setOptions({ modifiers: [{ name: 'arrow', enabled: false }, replace] });
  expect(f.instance.state.elements.arrow).toBeUndefined();
  f.instance.destroy();
});
test('an empty boundary array uses root bounds without requesting native boundary measurement', async () => {
  const f = fixture({
    modifiers: [
      { name: 'flip', options: { boundary: [] } },
      { name: 'preventOverflow', options: { boundary: [] } },
    ],
  });
  f.platform.boundary = jest.fn(() => null);
  await expect(f.instance.update()).resolves.toBe(f.instance.state);
  expect(f.platform.boundary).not.toHaveBeenCalled();
  f.instance.destroy();
});
test('a throwing updater keeps the working options and effects intact', async () => {
  const f = fixture();
  await f.instance.update();
  const options = f.instance.state.options;
  expect(() =>
    f.instance.setOptions(() => {
      throw Error('updater failed');
    }),
  ).toThrow('updater failed');
  expect(f.instance.state.options).toBe(options);
  expect(f.stop).not.toHaveBeenCalled();
  f.instance.destroy();
});
test('invalid option candidates cannot poison the active configuration', async () => {
  const f = fixture();
  await f.instance.update();
  const options = f.instance.state.options;
  expect(() => f.instance.setOptions({ placement: 'invalid' as any })).toThrow('placement');
  expect(f.instance.state.options).toBe(options);
  expect(f.stop).not.toHaveBeenCalled();
  f.instance.destroy();
});

test('successful option updates resolve the updater before cleaning and reinstalling effects', async () => {
  const trace: string[] = [],
    f = fixture({
      modifiers: [
        {
          name: 'trace',
          enabled: true,
          phase: 'main',
          effect: () => {
            trace.push('effect');
            return () => {
              trace.push('cleanup');
            };
          },
        },
      ],
    });
  await f.instance.update();
  trace.length = 0;
  await f.instance.setOptions((previous) => {
    trace.push('updater');
    return { placement: previous.placement };
  });
  expect(trace).toEqual(['updater', 'cleanup', 'effect']);
  f.instance.destroy();
});
test('reentrant updates inside an option updater cannot be overwritten by its older return value', async () => {
  const nestedCleanup = jest.fn(),
    f = fixture();
  await f.instance.update();
  await f.instance.setOptions(() => {
    void f.instance.setOptions({
      placement: 'right',
      modifiers: [{ name: 'nested', enabled: true, phase: 'main', effect: () => nestedCleanup }],
    });
    return { placement: 'left' };
  });
  expect(f.instance.state.options.placement).toBe('right');
  expect(nestedCleanup).not.toHaveBeenCalled();
  f.instance.destroy();
  expect(nestedCleanup).toHaveBeenCalledTimes(1);
});

test.each([true, false])(
  'a rejected nested option candidate cannot retire a valid setup (caught=%s)',
  async (caught) => {
    const earlyCleanup = jest.fn(),
      middleCleanup = jest.fn(),
      tail = jest.fn(),
      f = fixture();
    await f.instance.update();
    const configure = () =>
      f.instance.setOptions({
        modifiers: [
          { name: 'early', enabled: true, phase: 'beforeRead', effect: () => earlyCleanup },
          {
            name: 'middle',
            enabled: true,
            phase: 'beforeMain',
            effect: ({ instance }) => {
              try {
                void instance.setOptions({ placement: 'invalid' as any });
              } catch (error) {
                if (!caught) throw error;
              }
              return middleCleanup;
            },
          },
          { name: 'tail', enabled: true, phase: 'afterWrite', effect: tail },
        ],
      });
    if (caught) {
      await configure();
      expect(earlyCleanup).not.toHaveBeenCalled();
      expect(middleCleanup).not.toHaveBeenCalled();
      expect(tail).toHaveBeenCalledTimes(1);
    } else {
      expect(configure).toThrow('placement');
      expect(earlyCleanup).toHaveBeenCalledTimes(1);
      expect(tail).not.toHaveBeenCalled();
    }
    f.instance.destroy();
    expect(earlyCleanup).toHaveBeenCalledTimes(1);
  },
);
test('retired arrow cleanup cannot remove a newer effect using the same native View', async () => {
  const element = {} as ViewInstance;
  let changed = false;
  const arrow: NativePopperModifier = { name: 'arrow', options: { element } },
    f = fixture({
      modifiers: [
        {
          name: 'trigger',
          enabled: true,
          phase: 'beforeRead',
          effect:
            ({ instance }) =>
            () => {
              if (!changed) {
                changed = true;
                void instance.setOptions({ placement: 'right', modifiers: [arrow] });
              }
            },
        },
        arrow,
      ],
    });
  await f.instance.update();
  await f.instance.setOptions({ placement: 'left', modifiers: [arrow] });
  expect(f.instance.state.options.placement).toBe('right');
  expect(f.instance.state.elements.arrow).toBe(element);
  f.instance.destroy();
  expect(f.instance.state.elements.arrow).toBeUndefined();
});
