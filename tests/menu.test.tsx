import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  View,
  Modal as NativeModal,
  Dimensions,
  Platform,
  StyleSheet,
  type ViewInstance,
} from 'react-native';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react-native';
import {
  Menu,
  MenuPaper,
  MenuItem,
  PopoverRoot,
  ThemeProvider,
  createTheme,
  configureDiagnostics,
  menuClasses,
  getMenuUtilityClass,
  type MenuRootProps,
  type MenuPaperProps,
  type MenuListSlotProps,
} from '../packages/material/src';
import { RtlProvider } from '../packages/system/src';
import { getNativeFocusedView } from '../packages/native-host/src';
import { Commands } from '../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';
import { clearNativeFocus } from '../packages/native-host/src/nativeFocus';
import { NativeMenuOverlayModel as MenuModel } from './helpers/nativeMenuOverlayModel';
import { useForkRef } from '../packages/material/src/utils';
import { nativeModalManager } from '../packages/material/src/nativeModalManager';
import reference from './fixtures/mui-menu-9.5.0.json';
const viewport = Dimensions.get('window');
function geometry(node: ViewInstance, root: boolean) {
  Object.defineProperties(node, {
    offsetWidth: { configurable: true, value: root ? viewport.width : 120 },
    offsetHeight: { configurable: true, value: root ? viewport.height : 80 },
    clientHeight: { configurable: true, value: root ? viewport.height : 80 },
  });
  node.measureInWindow = ((callback: any) =>
    callback(
      0,
      0,
      root ? viewport.width : 120,
      root ? viewport.height : 80,
    )) as ViewInstance['measureInWindow'];
  return node;
}
const anchor = {
  nodeType: 1 as const,
  getBoundingClientRect: () => ({ top: 200, left: 100, width: 40, height: 20 }),
};
let restore: () => void;
beforeEach(() => {
  jest.useFakeTimers();
  restore = configureDiagnostics(() => {});
});
afterEach(() => {
  cleanup();
  clearNativeFocus(getNativeFocusedView());
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  restore();
  expect(nativeModalManager.top()).toBeUndefined();
});
const tick = () =>
  act(() => {
    jest.advanceTimersByTime(100);
  });
for (const fixture of reference.fixtures)
  test(`pinned Menu: ${fixture.input.name}`, () => {
    const input: any = fixture.input,
      trace: string[] = [];
    let root: any, paper: any, list: any, transition: any;
    const Root = forwardRef<ViewInstance, MenuRootProps>((props, ref) => {
      root = props;
      const local = useRef<ViewInstance | null>(null);
      useImperativeHandle(ref, () => geometry(local.current!, true), []);
      return <View ref={local}>{props.children}</View>;
    });
    const Paper = forwardRef<ViewInstance, MenuPaperProps>((props, ref) => {
      paper = props;
      const local = useRef<ViewInstance | null>(null);
      useImperativeHandle(ref, () => geometry(local.current!, false), []);
      return (
        <View ref={local} style={props.style}>
          {props.children}
        </View>
      );
    });
    const List = forwardRef<ViewInstance, MenuListSlotProps>((props, ref) => {
      list = props;
      useImperativeHandle(props.actions, () => ({
        adjustStyleForScrollbar: (node, options) => {
          trace.push(`adjust:${node === paperNode.current}:${options?.direction}`);
          return node ?? null;
        },
        focusInitialTarget: () => {
          trace.push('focus');
          return null;
        },
      }));
      return <View ref={ref}>{props.children}</View>;
    });
    const Transition: any = (props: any) => {
      transition = props;
      return props.children;
    };
    if (input.auto) Transition.muiSupportAuto = true;
    const paperNode = React.createRef<ViewInstance>();
    const owner = (value: any) => ({
      autoFocus: value?.autoFocus ?? null,
      disableAutoFocusItem: value?.disableAutoFocusItem ?? null,
      variant: value?.variant ?? null,
      transitionDuration: value?.transitionDuration ?? null,
      open: value?.open ?? null,
    });
    const slots: any = {
      root: input.rootClose
        ? { onClose: (_event: any, reason: string) => trace.push('rootClose:' + reason) }
        : {},
      paper: { ref: paperNode },
      list: {
        ...input.list,
        onKeyDown: (event: any) => trace.push(`external:${event.key}:${event.defaultPrevented}`),
      },
      transition: { onEntering: () => trace.push('entering') },
      backdrop: { invisible: false },
    };
    if (input.callbacks)
      for (const key of Object.keys(slots)) {
        const props = slots[key];
        slots[key] = (state: any) => ({ ...props, 'data-owner': owner(state) });
      }
    render(
      <RtlProvider value={input.rtl ?? false}>
        <Menu
          open
          anchorEl={anchor}
          onClose={(_event, reason) => trace.push('close:' + reason)}
          slots={{ root: Root, paper: Paper, list: List, transition: Transition }}
          slotProps={slots}
          {...input.props}
        >
          Content
        </Menu>
      </RtlProvider>,
    );
    const style = StyleSheet.flatten(paper.style),
      origin = style.transformOrigin;
    const snapshot: any = {
      root: {
        disableAutoFocus: root.disableAutoFocus,
        open: root.open,
        keepMounted: root.keepMounted ?? false,
      },
      list: { autoFocus: list.autoFocus, autoFocusItem: list.autoFocusItem, variant: list.variant },
      paper: {
        top: style.top ?? null,
        left: style.left ?? null,
        ...(origin ? { origin: `${origin[0]}px ${origin[1]}px` } : {}),
      },
      timeout: transition.timeout ?? null,
      owner: owner(list.ownerState),
    };
    if (input.callbacks)
      snapshot.callbacks = {
        root: root['data-owner'],
        paper: paper['data-owner'],
        list: list['data-owner'],
      };
    expect(snapshot).toEqual(fixture.snapshot);
    act(() => transition.onEntering(paperNode.current, true));
    if (input.key) {
      let prevented = input.prevented ?? false;
      act(() =>
        list.onKeyDown({
          key: input.key,
          shiftKey: input.shiftKey ?? false,
          get defaultPrevented() {
            return prevented;
          },
          preventDefault() {
            prevented = true;
          },
        }),
      );
    }
    if (input.rootClose) act(() => root.onClose({}, 'backdropClick'));
    expect(trace).toEqual(fixture.trace);
  });
test('Menu class helpers retain pinned identifiers without claiming native CSS rendering', () => {
  expect(menuClasses).toEqual(reference.helpers.classes);
  for (const [slot, value] of reference.helpers.utility)
    expect(getMenuUtilityClass(slot)).toBe(value);
});
test('default Menu focuses the selected connected item after placement', async () => {
  const model = await new MenuModel({
    items: [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta', selected: true },
    ],
  }).mount();
  expect(model.snapshot().focus).toBe('b');
  expect(getNativeFocusedView() === model.nodes.get('b')).toBe(true);
  expect(model.nodes.get('overlay').props.managedKeys).toContain('Escape');
  expect(model.nodes.get('list').props.managedKeys).toContain('Tab');
});
test('disableAutoFocusItem focuses the list and all-disabled menus retain the list fallback', async () => {
  const model = new MenuModel({ items: [{ id: 'a', label: 'Alpha', disabled: true }] });
  model.menuProps = { disableAutoFocusItem: true };
  await model.mount();
  expect(model.snapshot().focus).toBe('list');
});
test('closed retained Menu cannot autofocus items, including explicit slot and item requests', async () => {
  const model = new MenuModel({ items: [{ id: 'a', label: 'Alpha' }], autoFocusItem: true });
  model.open = false;
  model.menuProps = { keepMounted: true };
  model.itemProps = { autoFocus: true };
  await model.mount();
  expect(model.snapshot().focus).toBeNull();
  model.open = true;
  await model.update();
  expect(model.snapshot().focus).toBe('a');
  model.open = false;
  await model.update();
  const calls = model.nodes.get('a').focus as any;
  expect(typeof calls).toBe('function');
});
test('Tab closes before the caller handler and canceled/composing keys cannot close', async () => {
  const trace: string[] = [],
    model = new MenuModel({ items: [{ id: 'a', label: 'Alpha' }] });
  model.menuProps = { onClose: (_event, reason) => trace.push(reason) };
  model.listProps = { onKeyDown: (event) => trace.push('external:' + event.defaultPrevented) };
  await model.mount();
  await model.action({ key: 'Tab', shiftKey: true });
  expect(trace).toEqual(['tabKeyDown', 'external:true']);
  trace.length = 0;
  await model.action({ key: 'Tab', isComposing: true });
  await model.action({ key: 'Tab', isCanceled: true });
  expect(trace).toEqual(['external:false', 'external:false']);
});
test('stale closed-menu Tab and Escape delivery cannot request closure', async () => {
  const close = jest.fn(),
    model = new MenuModel({ items: [{ id: 'a', label: 'Alpha' }] });
  model.menuProps = { keepMounted: true, onClose: close };
  await model.mount();
  model.open = false;
  await model.update();
  await model.action({ key: 'Tab' });
  const event = model.event(model.nodes.get('list'), 'Escape');
  act(() => model.nodes.get('overlay').props.onMUIKeyDown(event));
  expect(close).not.toHaveBeenCalled();
});
test('Escape bubbles to the explicit root once and backdrop requests retain native reasons', async () => {
  const close = jest.fn(),
    model = new MenuModel({ items: [{ id: 'a', label: 'Alpha' }] });
  model.menuProps = { onClose: close };
  await model.mount();
  const event = model.event(model.nodes.get('a'), 'Escape');
  event.currentTarget = model.nodes.get('overlay');
  act(() => model.nodes.get('overlay').props.onMUIKeyDown(event));
  expect(close.mock.calls[0][1]).toBe('escapeKeyDown');
  const backdrop = screen.UNSAFE_getByType(require('../packages/material/src').Backdrop);
  fireEvent(backdrop, 'press', { target: 1, currentTarget: 1, nativeEvent: {} });
  expect(close.mock.calls[1][1]).toBe('backdropClick');
});
test('MenuPaper reserves dismissible viewport space and lets authored styles override', () => {
  const tree = render(<MenuPaper testID="paper" style={{ maxHeight: 222 }} />);
  expect(screen.getByTestId('paper')).toHaveStyle({ maxHeight: 222 });
  tree.rerender(<MenuPaper testID="paper" />);
  expect(screen.getByTestId('paper')).toHaveStyle({ maxHeight: Math.max(0, viewport.height - 96) });
});
test('native window Menu defers focus until onShow and restores a button trigger after dismissal', async () => {
  const model = new MenuModel({ items: [{ id: 'a', label: 'Alpha' }] });
  model.menuProps = { disablePortal: false };
  const trigger: any = { props: {}, focus: jest.fn(), isConnected: true };
  const release = model.attach('trigger')(trigger);
  model.parents.set('trigger', null);
  const { recordNativeFocus } = require('../packages/native-host/src/nativeFocus');
  recordNativeFocus(trigger);
  await model.mount();
  expect(model.snapshot().focus).toBeNull();
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  await act(async () => {});
  expect(model.snapshot().focus).toBe('a');
  model.open = false;
  await model.update();
  tick();
  expect(trigger.focus).not.toHaveBeenCalled();
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'dismiss');
  expect(trigger.focus).toHaveBeenCalledTimes(1);
  release?.();
});

test('Android close and reopen waits for the new presentation without onDismiss', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const model = new MenuModel({ items: [{ id: 'a', label: 'Alpha' }] });
  model.menuProps = { disablePortal: false };
  await model.mount();
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  await act(async () => {});
  model.open = false;
  await model.update();
  tick();
  const count = (Commands.focus as jest.Mock).mock.calls.length;
  model.open = true;
  await model.update();
  expect((Commands.focus as jest.Mock).mock.calls.length).toBe(count);
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  await act(async () => {});
  expect((Commands.focus as jest.Mock).mock.calls.length).toBeGreaterThan(count);
});
test('interrupted exit retains the presented window and does not wait for a second onShow', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const model = new MenuModel({ items: [{ id: 'a', label: 'Alpha' }] });
  model.menuProps = { disablePortal: false };
  await model.mount();
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  await act(async () => {});
  const count = (Commands.focus as jest.Mock).mock.calls.length;
  model.open = false;
  await model.update();
  model.open = true;
  await model.update();
  expect((Commands.focus as jest.Mock).mock.calls.length).toBeGreaterThan(count);
});
test('autoFocus false uses the actual native overlay root after presentation', async () => {
  const model = new MenuModel({ items: [{ id: 'a', label: 'Alpha' }] });
  model.menuProps = { autoFocus: false, disablePortal: false };
  await model.mount();
  expect((Commands.focus as jest.Mock).mock.calls.length).toBe(0);
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  await act(async () => {});
  expect(model.current === model.nodes.get('overlay')).toBe(true);
});
test('native Escape and disabled Escape policy travel through the real composite key path', async () => {
  const close = jest.fn(),
    model = new MenuModel({ items: [{ id: 'a', label: 'Alpha' }] });
  model.menuProps = { onClose: close };
  await model.mount();
  await model.action({ key: 'Escape', isComposing: true });
  await model.action({ key: 'Escape', isCanceled: true });
  expect(close).not.toHaveBeenCalled();
  await model.action({ key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(1);
  model.menuProps = { onClose: close, disableEscapeKeyDown: true };
  await model.update();
  await model.action({ key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(1);
});

test('nested Menu owns typeahead and restores its parent item on close', async () => {
  const model = new MenuModel({
    items: [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ],
  });
  model.parents.set('child-overlay', 'list');
  model.parents.set('child-paper', 'child-overlay');
  model.parents.set('child-list', 'child-paper');
  model.parents.set('c', 'child-list');
  model.parents.set('d', 'child-list');
  const Root = forwardRef<ViewInstance, MenuRootProps>((props, ref) => {
    const merged = useForkRef(
      ref,
      (node) => {
        if (node) geometry(node, true);
      },
      model.attach('child-overlay'),
    );
    return <PopoverRoot {...props} ref={merged} />;
  });
  const Paper = forwardRef<ViewInstance, MenuPaperProps>((props, ref) => {
    const merged = useForkRef(
      ref,
      (node) => {
        if (node) geometry(node, false);
      },
      model.attach('child-paper'),
    );
    return <MenuPaper {...props} ref={merged} />;
  });
  const child = (open: boolean) => (
    <Menu
      open={open}
      disablePortal
      keepMounted
      anchorEl={anchor}
      transitionDuration={10}
      slots={{ root: Root, paper: Paper }}
      slotProps={{ list: { ref: model.attach('child-list') } }}
    >
      <MenuItem ref={model.attach('c')} textValue="Charlie">
        Charlie
      </MenuItem>
      <MenuItem ref={model.attach('d')} textValue="Boat">
        Boat
      </MenuItem>
    </Menu>
  );
  model.extra = child(false);
  await model.mount();
  expect(model.snapshot().focus).toBe('a');
  model.extra = child(true);
  await model.update();
  expect(model.snapshot().focus).toBe('c');
  await model.action({ key: 'b' });
  expect(model.snapshot().focus).toBe('d');
  model.extra = child(false);
  await model.update();
  tick();
  await act(async () => {});
  expect(model.snapshot().focus).toBe('a');
});

test('Menu theme defaults and named slot overrides retain owner state and dense content', async () => {
  const model = new MenuModel({
    items: [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta', selected: true },
    ],
  });
  const theme = createTheme({
    components: {
      MuiMenu: {
        defaultProps: {
          variant: 'menu',
          slotProps: { paper: { style: { padding: 9 } }, list: { dense: true } },
        },
        styleOverrides: {
          root: ({ ownerState }) => ({ borderWidth: ownerState.variant === 'menu' ? 3 : 0 }),
          paper: ({ ownerState }) => ({ borderWidth: ownerState.autoFocus ? 2 : 0 }),
          list: ({ ownerState }) => ({ marginTop: ownerState.autoFocus ? 7 : 0 }),
        },
      },
    },
  });
  const element = model.element.bind(model);
  model.element = () => <ThemeProvider theme={theme}>{element()}</ThemeProvider>;
  await model.mount();
  expect(model.snapshot().focus).toBe('a');
  expect(model.nodes.get('overlay').props.style).toEqual(expect.anything());
  expect(StyleSheet.flatten(model.nodes.get('overlay').props.style)).toMatchObject({
    borderWidth: 3,
  });
  expect(StyleSheet.flatten(model.nodes.get('paper').props.style)).toMatchObject({
    padding: 9,
    borderWidth: 2,
  });
  expect(StyleSheet.flatten(model.nodes.get('list').props.style)).toMatchObject({ marginTop: 7 });
  expect(StyleSheet.flatten(model.nodes.get('a').props.style)).toMatchObject({ minHeight: 32 });
});
test('Menu composes external list actions and releases every installed callback handle', async () => {
  const model = new MenuModel({ items: [{ id: 'a', label: 'Alpha' }] }),
    release = jest.fn();
  const handles: any[] = [];
  model.listProps = {
    actions: (node) => {
      if (node) handles.push(node);
      return release;
    },
  };
  await model.mount();
  expect(handles.length).toBeGreaterThan(0);
  expect(handles.at(-1).focusInitialTarget() === model.nodes.get('a')).toBe(true);
  model.tree!.unmount();
  expect(release).toHaveBeenCalledTimes(handles.length);
});

test('Android window Escape requests close once through native requestClose', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const close = jest.fn(),
    model = new MenuModel({ items: [{ id: 'a', label: 'Alpha' }] });
  model.menuProps = { disablePortal: false, onClose: close };
  await model.mount();
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  await act(async () => {});
  await model.action({ key: 'Escape' });
  expect(close).not.toHaveBeenCalled();
  fireEvent(screen.UNSAFE_getByType(NativeModal), 'requestClose');
  expect(close).toHaveBeenCalledTimes(1);
  expect(close.mock.calls[0]).toEqual([null, 'escapeKeyDown']);
});

test.each([true, false])(
  'inline child waits for its Android window and owns one close request (Menu autofocus %s)',
  async (childAutoFocus) => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const parentClose = jest.fn(),
      childClose = jest.fn(),
      model = new MenuModel({ items: [{ id: 'a', label: 'Alpha' }] });
    model.menuProps = { disablePortal: false, onClose: parentClose };
    model.parents.set('child-overlay', 'list');
    model.parents.set('child-paper', 'child-overlay');
    model.parents.set('child-list', 'child-paper');
    model.parents.set('c', 'child-list');
    const Root = forwardRef<ViewInstance, MenuRootProps>((props, ref) => {
      const merged = useForkRef(
        ref,
        (node) => {
          if (node) geometry(node, true);
        },
        model.attach('child-overlay'),
      );
      return <PopoverRoot {...props} ref={merged} />;
    });
    const Paper = forwardRef<ViewInstance, MenuPaperProps>((props, ref) => {
      const merged = useForkRef(
        ref,
        (node) => {
          if (node) geometry(node, false);
        },
        model.attach('child-paper'),
      );
      return <MenuPaper {...props} ref={merged} />;
    });
    model.extra = (
      <Menu
        open
        autoFocus={childAutoFocus}
        disablePortal
        anchorEl={anchor}
        onClose={childClose}
        slots={{ root: Root, paper: Paper }}
        slotProps={{ list: { ref: model.attach('child-list') } }}
      >
        <MenuItem ref={model.attach('c')}>Child</MenuItem>
      </Menu>
    );
    await model.mount();
    act(() =>
      model.nodes.get('child-overlay').props.onLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: viewport.width, height: viewport.height } },
      }),
    );
    expect((Commands.focus as jest.Mock).mock.calls.length).toBe(0);
    fireEvent(screen.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
    await act(async () => {});
    expect(model.snapshot().focus).toBe(childAutoFocus ? 'c' : 'child-overlay');
    await model.action({ key: 'Escape' });
    expect(childClose).not.toHaveBeenCalled();
    fireEvent(screen.UNSAFE_getByType(NativeModal), 'requestClose');
    expect(childClose).toHaveBeenCalledTimes(1);
    expect(parentClose).not.toHaveBeenCalled();
  },
);
