import React from 'react';
import * as RN from 'react-native';
import { cleanup } from '@testing-library/react-native';
import { ThemeProvider, createTheme, configureDiagnostics } from '../packages/material/src';
import {
  getPopperUtilityClass,
  popperClasses,
  type PopperRootProps,
} from '../packages/material/src/popper';
import { NativePortalHost } from '../packages/native-host/src';
import { NativePopperModel } from './helpers/nativePopperModel';
import fixture from './fixtures/mui-popper-component-browser-9.5.0.json';
let restore: () => void;
beforeEach(() => {
  restore = configureDiagnostics(() => {});
  const tags = new WeakMap<object, number>();
  let sequence = 10;
  jest.spyOn(require('react-native'), 'findNodeHandle').mockImplementation((node: any) => {
    if (!node) return null;
    if (!tags.has(node)) tags.set(node, ++sequence);
    return tags.get(node)!;
  });
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  restore();
});
const original = (name: string) => fixture.states.find((state) => state.name === name) as any;
test('default Popper is a real native tooltip with root/instance refs and measured placement', async () => {
  const m = await new NativePopperModel().mount();
  await m.ready();
  expect(m.root.current).toBeTruthy();
  expect(m.instance.current).toBeTruthy();
  expect(m.style().opacity).toBe(0);
  await m.observe();
  expect(m.childProps?.placement).toBe(original('default').childPlacement);
  expect(m.tree!.getByTestId('popup', { includeHiddenElements: true }).props.role).toBe('tooltip');
  expect(m.style().opacity).not.toBe(0);
  expect(m.style().transform).toEqual([{ translateX: 130 }, { translateY: 240 }]);
  expect(m.instance.current!.state.elements.popper).toBe(m.root.current);
  expect(m.current).toBeNull();
  expect(m.trace).toEqual([]);
});
test.each([
  ['left', 'ltr', 'placement left'],
  ['bottom-start', 'rtl', 'RTL bottom start'],
] as const)(
  'native %s placement follows the original %s wrapper contract',
  async (placement, direction, name) => {
    const m = new NativePopperModel();
    m.props.placement = placement;
    m.wrapper = (node) => <ThemeProvider theme={createTheme({ direction })}>{node}</ThemeProvider>;
    await m.mount();
    await m.ready();
    await m.observe();
    expect(m.childProps?.placement).toBe(original(name).childPlacement);
  },
);
test('popperOptions placement overrides the RTL default and both modifier lists merge', async () => {
  const m = new NativePopperModel(),
    events: string[] = [];
  m.props.placement = 'bottom-start';
  m.props.direction = 'rtl';
  m.props.modifiers = [
    {
      name: 'record',
      enabled: true,
      phase: 'afterMain',
      fn: () => {
        events.push('first');
      },
      options: { x: 1 },
    },
  ];
  m.props.popperOptions = {
    placement: 'right-end',
    modifiers: [{ name: 'record', options: { x: 2 } }],
  };
  await m.mount();
  await m.ready();
  await m.observe();
  expect(m.childProps?.placement).toBe(original('options override RTL').childPlacement);
  expect(
    m.instance.current!.state.orderedModifiers.find((modifier) => modifier.name === 'record')!
      .options,
  ).toEqual({ x: 2 });
  expect(events).toContain('first');
});
test('inline mode uses its own non-collapsable positioning surface and never resolves container', async () => {
  const m = new NativePopperModel(),
    container = jest.fn(() => {
      throw Error('inline container evaluated');
    });
  m.props.disablePortal = true;
  m.props.container = container;
  await m.mount();
  await m.ready();
  expect(m.host().props.observationOnly).toBe(true);
  expect(container).not.toHaveBeenCalled();
  await m.observe();
  expect(m.style().transform).toEqual([{ translateX: 130 }, { translateY: 240 }]);
  const surfaces = m
    .tree!.UNSAFE_getAllByType(RN.View)
    .filter(
      (node) =>
        node.props.pointerEvents === 'box-none' &&
        RN.StyleSheet.flatten(node.props.style)?.borderWidth === 0,
    );
  expect(surfaces.length).toBe(1);
  expect(surfaces[0].props.collapsable).toBe(false);
  expect(RN.StyleSheet.flatten(surfaces[0].props.style)).toMatchObject({
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    padding: 0,
  });
});
test('root slots preserve actual native refs and override forwarded props using tooltip owner state', async () => {
  const m = new NativePopperModel(),
    slot = React.createRef<RN.ViewInstance>(),
    states: any[] = [];
  const Root = React.forwardRef<RN.ViewInstance, PopperRootProps>(
    ({ ownerState, sx, ...props }, ref) => {
      states.push(ownerState);
      return <RN.View {...props} ref={ref} />;
    },
  );
  m.props.slots = { root: Root };
  m.props.accessibilityLabel = 'forwarded';
  m.props.slotProps = {
    root: (ownerState) => ({
      ref: slot,
      accessibilityLabel: ownerState.open ? 'slot-open' : 'slot-closed',
      style: { backgroundColor: '#123456' },
    }),
  };
  await m.mount();
  await m.ready();
  await m.observe();
  expect(slot.current).toBe(m.root.current);
  expect(
    m.tree!.getByTestId('popup', { includeHiddenElements: true }).props.accessibilityLabel,
  ).toBe('slot-open');
  expect(states.at(-1)).toMatchObject({
    open: original('root slot').slotOpen,
    placement: original('root slot').slotPlacement,
  });
  expect(m.style().backgroundColor).toBe('#123456');
  m.tree!.unmount();
  expect(slot.current).toBeNull();
  expect(m.root.current).toBeNull();
  expect(m.instance.current).toBeNull();
});
test('theme defaults provide placement and slot props without changing original web contracts', async () => {
  const m = new NativePopperModel();
  m.wrapper = (node) => (
    <ThemeProvider
      theme={createTheme({
        components: {
          MuiPopper: {
            defaultProps: {
              placement: 'top-end',
              slotProps: { root: { accessibilityLabel: 'theme' } },
            },
          },
        },
      })}
    >
      {node}
    </ThemeProvider>
  );
  await m.mount();
  await m.ready();
  await m.observe();
  expect(m.childProps?.placement).toBe(original('theme defaults').childPlacement);
  expect(
    m.tree!.getByTestId('popup', { includeHiddenElements: true }).props.accessibilityLabel,
  ).toBe('theme');
});
test('component replaces the whole implementation as observed upstream; root slots retain it', async () => {
  const m = new NativePopperModel(),
    seen: any[] = [];
  const Custom = React.forwardRef<RN.ViewInstance, any>((props, ref) => {
    seen.push(props);
    return <RN.View ref={ref} testID="replacement" />;
  });
  m.props.component = Custom;
  await m.mount();
  expect(m.tree!.UNSAFE_queryAllByType(NativePortalHost)).toHaveLength(0);
  expect(m.instance.current).toBeNull();
  expect(m.root.current).toBeTruthy();
  expect(seen.at(-1).open).toBe(original('component bypass').componentOpen);
  expect(typeof seen.at(-1).children).toBe('function');
});
test('closed unmounted roots disappear and kept roots retain child state and release the instance', async () => {
  const m = await new NativePopperModel().mount();
  await m.ready();
  await m.observe();
  m.props.open = false;
  await m.update();
  expect(m.tree!.queryByTestId('popup')).toBeNull();
  expect(m.instance.current).toBeNull();
  expect(m.root.current).toBeNull();
  m.props.keepMounted = true;
  await m.update();
  expect(m.tree!.getByTestId('popup', { includeHiddenElements: true })).toBeTruthy();
  expect(m.host().props.active).toBe(false);
  expect(m.style().display).toBe('none');
  const content = m.tree!.getByTestId('content', { includeHiddenElements: true }).props.children;
  m.props.open = true;
  await m.update();
  await m.ready();
  await m.observe();
  expect(m.tree!.getByTestId('content', { includeHiddenElements: true }).props.children).toBe(
    content,
  );
  expect(m.instance.current).toBeTruthy();
});
test('transition onEnter starts the engine and onExited releases retained closing content', async () => {
  const m = new NativePopperModel();
  m.props.transition = true;
  await m.mount();
  await m.ready();
  expect(m.instance.current).toBeNull();
  expect(Object.keys(m.childProps!.TransitionProps!).sort()).toEqual(
    original('transition initially exited').transitionKeys,
  );
  await m.invoke(m.childProps!.TransitionProps!.onEnter);
  await m.observe();
  expect(m.instance.current).toBeTruthy();
  m.props.open = false;
  await m.update();
  expect(m.childProps!.TransitionProps!.in).toBe(false);
  expect(m.instance.current).toBeTruthy();
  expect(m.host().props.active).toBe(true);
  await m.invoke(m.childProps!.TransitionProps!.onExited);
  expect(m.tree!.queryByTestId('popup')).toBeNull();
  expect(m.instance.current).toBeNull();
});
test('instance ref replacement and cleanup do not recreate the engine or close a native session', async () => {
  const m = new NativePopperModel(),
    a = jest.fn(),
    b = jest.fn(),
    released = jest.fn();
  m.props.popperRef = (value) => {
    a(value);
    if (value) return released;
  };
  await m.mount();
  await m.ready();
  await m.observe();
  const instance = a.mock.calls.find((call) => call[0])![0];
  m.props.popperRef = b;
  await m.update();
  expect(released).toHaveBeenCalledTimes(1);
  expect(b).toHaveBeenLastCalledWith(instance);
  m.tree!.unmount();
  expect(b).toHaveBeenLastCalledWith(null);
});
test('popup position follows automatic geometry changes and disconnect hides stale content', async () => {
  const m = await new NativePopperModel().mount();
  await m.ready();
  await m.observe();
  const originalStyle = m.style();
  await m.observe((value) => {
    value.position!.viewport.height = 220;
  });
  expect(m.childProps!.placement).toBe('top');
  expect(m.style().transform).not.toEqual(originalStyle.transform);
  await m.observe((value) => {
    value.position!.available = false;
  });
  expect(m.style().opacity).toBe(0);
  expect(m.tree!.getByTestId('popup', { includeHiddenElements: true }).props.pointerEvents).toBe(
    'none',
  );
});
test('utility helpers preserve original class identifiers', () => {
  expect(popperClasses).toEqual({ root: 'MuiPopper-root' });
  expect(getPopperUtilityClass('focusVisible')).toBe('Mui-focusVisible');
});
