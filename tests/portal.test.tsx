import React, { useContext, useEffect, useState } from 'react';
import * as RN from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import {
  Portal,
  Button,
  ThemeProvider,
  createTheme,
  useTheme,
  configureDiagnostics,
  type NativePortalHandle,
} from '../packages/material/src';
import { NativePortalHost, getNativeFocusedView } from '../packages/native-host/src';
import { clearNativeFocus } from '../packages/native-host/src/nativeFocus';
import { NativePortalContext } from '../packages/material/src/portalContext';
import { NativeOverlayReadiness } from '../packages/material/src/nativeOverlayReadiness';
import { nativeModalManager } from '../packages/material/src/nativeModalManager';
import { NativePortalModel } from './helpers/nativePortalModel';
import {
  portalBounds,
  portalWindowRect,
  windowPointToPortal,
} from '../packages/material/src/portalGeometry';
let restore: () => void;
beforeEach(() => {
  restore = configureDiagnostics(() => {});
  jest
    .spyOn(require('react-native'), 'findNodeHandle')
    .mockImplementation((node: any) => node?.tag ?? 11);
});
afterEach(() => {
  cleanup();
  clearNativeFocus(getNativeFocusedView());
  jest.restoreAllMocks();
  restore();
});
test('default Portal uses one native host in the existing tree and waits for actual bounds', async () => {
  const model = new NativePortalModel();
  await model.mount();
  expect(model.host().props).toMatchObject({ active: true, containerTag: 0, layer: 0 });
  expect(model.portal.current!.presented).toBe(false);
  expect(model.tree!.UNSAFE_queryAllByType(RN.Modal)).toHaveLength(0);
  await model.layout();
  expect(model.portal.current!.presented).toBe(true);
  expect(model.portal.current!.bounds).toMatchObject({ width: 390, height: 844 });
  expect(model.tree!.getByText('Action')).toBeTruthy();
});
test('Portal attachment does not request focus or blur the current editor', async () => {
  const model = new NativePortalModel();
  await model.mount();
  await model.layout();
  expect(model.current).toBe(null);
  expect(model.trace).toEqual([]);
});
test('callbacks resolve custom containers after sibling refs are attached', async () => {
  const model = new NativePortalModel(),
    calls: any[] = [];
  model.props.container = () => {
    calls.push(model.nodes.get('container'));
    return model.nodes.get('container');
  };
  await model.mount();
  expect(calls.length).toBe(1);
  expect(calls[0]).toBeTruthy();
  expect(model.host().props.containerTag).toBe(11);
  expect(model.portal.current!.container === model.nodes.get('container')).toBe(true);
});
test('inline mode ignores container and composes child plus forwarded refs', () => {
  const own = React.createRef<any>(),
    forwarded = React.createRef<any>(),
    container = jest.fn();
  const tree = render(
    <Portal disablePortal container={container} ref={forwarded}>
      <RN.View ref={own} testID="inline" />
    </Portal>,
  );
  expect(container).not.toHaveBeenCalled();
  expect(tree.UNSAFE_queryAllByType(NativePortalHost)).toHaveLength(0);
  expect(forwarded.current).toBe(own.current);
  tree.unmount();
  expect(forwarded.current).toBe(null);
  expect(own.current).toBe(null);
});
test.each([null, 'Words', 42])(
  'inline non-element content is native-safe and has no assigned child ref: %s',
  (content) => {
    const forwarded = React.createRef<any>(),
      tree = render(
        <Portal disablePortal ref={forwarded}>
          {content}
        </Portal>,
      );
    expect(forwarded.current).toBe(null);
    if (content != null) expect(tree.getByText(String(content))).toBeTruthy();
  },
);
test('unknown application context and exact resolved theme identity survive Portal', async () => {
  const Context = React.createContext<any>(null),
    value = { account: 1 },
    theme = createTheme(),
    seen: any[] = [];
  let outer: any;
  function Outer() {
    outer = useTheme();
    return (
      <Portal>
        <Read />
      </Portal>
    );
  }
  function Read() {
    seen.push([useContext(Context), useTheme()]);
    return <RN.Text>Context</RN.Text>;
  }
  const tree = render(
    <Context.Provider value={value}>
      <ThemeProvider theme={theme}>
        <Outer />
      </ThemeProvider>
    </Context.Provider>,
  );
  await act(async () => {});
  expect(seen.length).toBeGreaterThan(0);
  expect(seen.every(([context, current]) => context === value && current === outer)).toBe(true);
  expect(tree.UNSAFE_queryAllByType(RN.Modal)).toHaveLength(0);
});
test('container changes remount content and reject retained old layout callbacks', async () => {
  const model = new NativePortalModel(),
    mounts: string[] = [],
    unmounts: string[] = [];
  let count = 0;
  function Child() {
    const [id] = useState(() => String(++count));
    useEffect(() => {
      mounts.push(id);
      return () => {
        unmounts.push(id);
      };
    }, [id]);
    return <RN.Text>{id}</RN.Text>;
  }
  model.content = <Child />;
  model.props.container = { tag: 21 };
  await model.mount();
  await model.layout();
  const old = model.host().props;
  model.props.container = { tag: 22 };
  await model.update();
  expect(model.host().props.revision).not.toBe(old.revision);
  expect(mounts).toHaveLength(2);
  expect(unmounts).toHaveLength(1);
  expect(model.portal.current!.presented).toBe(false);
  await act(async () =>
    old.onPortalLayout({
      nativeEvent: {
        revision: old.revision,
        presented: true,
        x: 0,
        y: 0,
        width: 900,
        height: 900,
        a: 1,
        b: 0,
        c: 0,
        d: 1,
      },
    }),
  );
  expect(model.portal.current!.presented).toBe(false);
  await model.layout({ width: 280 });
  expect(model.portal.current!.bounds!.width).toBe(280);
});
test('same native container preserves children when callback identity changes', async () => {
  const model = new NativePortalModel(),
    mount = jest.fn();
  function Child() {
    useEffect(mount, []);
    return <RN.Text>Same</RN.Text>;
  }
  const node = { tag: 20 };
  model.content = <Child />;
  model.props.container = () => node;
  await model.mount();
  const revision = model.host().props.revision;
  model.props.container = () => node;
  await model.update();
  expect(model.host().props.revision).toBe(revision);
  expect(mount).toHaveBeenCalledTimes(1);
});
test('default container callback null resolves to the current window', async () => {
  const model = new NativePortalModel();
  model.props.container = () => null;
  await model.mount();
  expect(model.host().props.containerTag).toBe(0);
  expect(model.portal.current!.container).toBe(null);
});
test('inline/default mode transition restores original remount and ref ownership', async () => {
  const model = new NativePortalModel(),
    values: any[] = [];
  model.props.ref = (value: any) => values.push(value);
  await model.mount();
  await model.layout();
  expect(values.filter(Boolean)[0].measureInWindow).toEqual(expect.any(Function));
  model.props.disablePortal = true;
  model.content = <RN.View testID="inline" />;
  await model.update();
  expect(model.tree!.UNSAFE_queryAllByType(NativePortalHost)).toHaveLength(0);
  expect(values).toContain(null);
  expect(values.at(-1)).toBeTruthy();
});
test('native layout update supplies physical affine coordinates rather than shadow coordinates', async () => {
  const model = new NativePortalModel(),
    callback = jest.fn();
  await model.mount();
  await model.layout({ x: 15, y: 25, width: 100, height: 60, a: 0, b: 2, c: -2, d: 0 });
  model.portal.current!.measureInWindow(callback);
  expect(callback).toHaveBeenCalledWith(-105, 25, 120, 200);
});
test.each([{ width: NaN }, { height: -1 }, { a: 0, d: 0 }, { b: Infinity }])(
  'invalid native geometry cannot expose an interactive surface: %j',
  async (data) => {
    const model = new NativePortalModel();
    await model.mount();
    await model.layout(data);
    expect(model.portal.current!.presented).toBe(false);
    expect(model.portal.current!.bounds).toBe(null);
  },
);
test('detach hides current content without discarding its React state', async () => {
  const model = new NativePortalModel(),
    mount = jest.fn();
  function Child() {
    useEffect(mount, []);
    return <RN.Text>State</RN.Text>;
  }
  model.content = <Child />;
  await model.mount();
  await model.layout();
  await model.layout({ presented: false, reason: 'detached', width: 0, height: 0 });
  expect(model.portal.current!.presented).toBe(false);
  await model.layout();
  expect(mount).toHaveBeenCalledTimes(1);
  expect(model.portal.current!.presented).toBe(true);
});
test('presentation readiness reaches children before any interactive action can publish', async () => {
  const model = new NativePortalModel();
  await model.mount();
  const node = model.nodes.get('button');
  await act(async () => node.props.onMUIKeyDown(model.event(node, 'Enter')));
  expect(model.trace).toEqual([]);
  await model.layout();
  await act(async () => node.props.onMUIKeyDown(model.event(node, 'Enter')));
  expect(model.trace).toEqual(['click']);
});
test('covered Portal clears active/readiness and ignores late native ready for interaction', async () => {
  const model = new NativePortalModel();
  await model.mount();
  await model.layout();
  const top = jest
    .spyOn(nativeModalManager, 'top')
    .mockReturnValue({ id: Symbol(), contains: () => false } as any);
  await model.update();
  expect(model.host().props.active).toBe(false);
  await model.layout();
  expect(model.portal.current!.presented).toBe(false);
  top.mockRestore();
});
test('an unpresented parent prevents native host attachment', async () => {
  const model = new NativePortalModel();
  model.wrapper = (node) => (
    <NativeOverlayReadiness.Provider value={false}>{node}</NativeOverlayReadiness.Provider>
  );
  await model.mount();
  expect(model.host().props.active).toBe(false);
  await model.layout();
  expect(model.portal.current!.presented).toBe(false);
});
test('forwarded native handle clears once and retained callbacks cannot update unmounted content', async () => {
  const model = new NativePortalModel(),
    callback = jest.fn(),
    ref = jest.fn();
  model.props = { ref, onContainerLayout: callback };
  await model.mount();
  await model.layout();
  const handler = model.host().props.onPortalLayout,
    revision = model.host().props.revision;
  callback.mockClear();
  await act(async () => model.tree!.unmount());
  handler({
    nativeEvent: {
      revision,
      presented: true,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      a: 1,
      b: 0,
      c: 0,
      d: 1,
    },
  });
  expect(callback).not.toHaveBeenCalled();
  expect(ref.mock.calls.filter(([value]) => value === null)).toHaveLength(1);
});
test('native placeholder cannot inflate parent layout and never substitutes a Modal', async () => {
  const model = new NativePortalModel();
  await model.mount();
  expect(model.host().props.style).toMatchObject({
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
  });
  expect(model.tree!.UNSAFE_queryAllByType(RN.Modal)).toHaveLength(0);
});
test.each([NaN, Infinity, -Infinity])(
  'invalid layer %s rejects before reaching native rendering',
  (layer) => {
    expect(() =>
      render(
        <Portal layer={layer}>
          <RN.View />
        </Portal>,
      ),
    ).toThrow('layer must be finite');
  },
);
test('portal affine coordinates invert translations, rotations and scale', () => {
  const data = {
      revision: 'x',
      rootX: 0,
      rootY: 0,
      rootA: 1,
      rootB: 0,
      rootC: 0,
      rootD: 1,
      presented: true,
      reason: 'presented',
      x: 30,
      y: 50,
      width: 100,
      height: 80,
      a: 0,
      b: 2,
      c: -3,
      d: 0,
    },
    bounds = portalBounds(data)!;
  expect(windowPointToPortal(0, 90, bounds)).toEqual({ x: 20, y: 10 });
  expect(portalWindowRect(bounds)).toEqual({ x: -210, y: 50, width: 240, height: 200 });
});
