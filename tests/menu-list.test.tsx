import React from 'react';
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react-native';
import { ScrollView, StyleSheet, View, type ViewInstance } from 'react-native';
import {
  MenuList,
  MenuItem,
  ListSubheader,
  ListItemText,
  ListItemIcon,
  ThemeProvider,
  Typography,
  createTheme,
  configureDiagnostics,
  type MenuListActions,
} from '../packages/material/src';
import Svg from 'react-native-svg';
import { Check } from '../packages/icons/src';
import reference from './fixtures/mui-menu-list-9.5.0.json';
import { NativeMenuModel } from './helpers/nativeMenuModel';
import {
  NativeMenuRegistry,
  nextMenuItem,
  type NativeMenuRecord,
} from '../packages/material/src/nativeMenuRegistry';
import { nativeButtonModality } from '../packages/material/src/nativeButtonModality';
import { NativeIconStyleContext } from '../packages/system/src';
let restore: () => void;
beforeEach(() => {
  nativeButtonModality.keyboard();
  restore = configureDiagnostics(() => {});
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  restore();
});
test.each(reference.fixtures)('original registered menu: $input.name', async (fixture) => {
  const input = fixture.input as any,
    model = await new NativeMenuModel(input).mount(),
    snapshots = [model.snapshot()];
  for (const action of input.actions) {
    await model.action(action);
    snapshots.push(model.snapshot());
  }
  const expected = JSON.parse(JSON.stringify(fixture.snapshots));
  if (input.nativeInitialHandoffFix) {
    const last = expected.at(-1);
    last.items.find((item: any) => item.id === last.focus).focusVisible = true;
  }
  expect(snapshots).toEqual(expected);
});
test('native menu scrolling keeps the interactive root and native sticky indices', async () => {
  const model = new NativeMenuModel({ items: [{ id: 'a', label: 'Alpha' }] });
  model.listProps = {
    scrollable: true,
    sx: { height: 200, p: 2 },
    subheader: <ListSubheader>Section</ListSubheader>,
  };
  await model.mount();
  const scroll = model.tree!.UNSAFE_getByType(ScrollView);
  expect(model.nodes.get('list').props.nativeFocusable).toBe(true);
  expect(StyleSheet.flatten(model.nodes.get('list').props.style)).toMatchObject({ height: 200 });
  expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toMatchObject({ padding: 16 });
  expect(scroll.props.stickyHeaderIndices).toEqual([0]);
  await model.action({ focus: 'list' });
  await model.action({ key: 'ArrowDown' });
  expect(model.snapshot().focus).toBe('a');
});
test('disabled focusable items keep activation guarded while arrow navigation can leave them', async () => {
  const model = await new NativeMenuModel({
    items: [
      { id: 'a', label: 'Alpha', disabled: true },
      { id: 'b', label: 'Beta' },
    ],
    disabledItemsFocusable: true,
    autoFocusItem: true,
  }).mount();
  expect(model.snapshot().focus).toBe('a');
  await model.action({ key: 'Enter' });
  await model.action({ keyUp: ' ' });
  expect(model.trace.filter((value) => value.startsWith('click:'))).toEqual([]);
  await model.action({ key: 'ArrowDown' });
  expect(model.snapshot().focus).toBe('b');
});
test('checkable native roles use checked state without aria-selected on plain menuitems', async () => {
  const model = await new NativeMenuModel({
    items: [
      { id: 'a', label: 'Check', role: 'menuitemcheckbox', selected: true },
      { id: 'b', label: 'Radio', role: 'menuitemradio' },
      { id: 'c', label: 'Plain', selected: true },
    ],
  }).mount();
  expect(model.nodes.get('a').props).toMatchObject({
    role: 'checkbox',
    accessibilityState: { checked: true },
  });
  expect(model.nodes.get('b').props).toMatchObject({
    role: 'radio',
    accessibilityState: { checked: false },
  });
  expect(model.nodes.get('c').props.accessibilityState.checked).toBeUndefined();
  expect(model.nodes.get('c').props.accessibilityState.selected).toBeUndefined();
});
test('native typeahead override is used for complex labels', async () => {
  const model = await new NativeMenuModel({
    items: [
      { id: 'a', label: 'Icon Alpha', textValue: 'Alpha' },
      { id: 'b', label: 'Icon Beta', textValue: 'Beta' },
    ],
    autoFocusItem: true,
  }).mount();
  await model.action({ key: 'b' });
  expect(model.snapshot().focus).toBe('b');
});
test('composition/canceled keys remain external and never move native focus', async () => {
  const model = await new NativeMenuModel({
    items: [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ],
    autoFocusItem: true,
  }).mount();
  await model.action({ key: 'ArrowDown', isComposing: true });
  await model.action({ key: 'b', isCanceled: true });
  expect(model.snapshot().focus).toBe('a');
  expect(model.trace).toHaveLength(2);
});
test('imperative initial focus preserves current descendants and releases actions on unmount', async () => {
  const actions = React.createRef<MenuListActions>(),
    model = new NativeMenuModel({
      items: [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta', selected: true },
      ],
      autoFocusItem: true,
    });
  model.listProps = { actions };
  await model.mount();
  await model.action({ focus: 'a' });
  let current: unknown;
  act(() => {
    current = actions.current?.focusInitialTarget();
  });
  expect(current === model.nodes.get('a')).toBe(true);
  expect(model.snapshot().focus).toBe('a');
  expect(actions.current?.adjustStyleForScrollbar()).toBe(model.nodes.get('list'));
  model.tree!.unmount();
  expect(actions.current).toBeNull();
});
test('native menu labels and icons inherit menu density and color', () => {
  const theme = createTheme();
  const tree = render(
    <ThemeProvider theme={theme}>
      <MenuList dense>
        <MenuItem>
          <ListItemIcon testID="icon">
            <Check titleAccess="Mark" />
          </ListItemIcon>
          <ListItemText testID="text" inset primary="Primary" secondary="Detail" />
        </MenuItem>
      </MenuList>
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(screen.getByTestId('icon').props.style).minWidth).toBe(36);
  expect(StyleSheet.flatten(screen.getByTestId('text').props.style)).toMatchObject({
    marginTop: 0,
    marginBottom: 0,
    paddingStart: 36,
  });
  expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({
    width: 20,
    height: 20,
    fill: theme.palette.action.active,
  });
});
test('menu icons outside dense rows keep explicit sizes and inherited text colors', () => {
  const tree = render(
    <Typography sx={{ color: '#123456', fontSize: 30 }}>
      <Check fontSize="inherit" />
    </Typography>,
  );
  expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({
    width: 30,
    height: 30,
    fill: '#123456',
  });
});
test('registry stale detach tokens cannot remove a replacement node', () => {
  const notify = jest.fn(),
    registry = new NativeMenuRegistry(notify),
    node = { isConnected: true } as ViewInstance,
    old = {},
    current = {};
  const record = {
    id: 'a',
    element: node,
    disabled: false,
    focusableWhenDisabled: false,
    focusable: true,
    selected: false,
    focus: () => {},
    token: old,
  };
  registry.set(record);
  registry.set({ ...record, token: current });
  registry.remove('a', old);
  expect(registry.items.get('a')?.token).toBe(current);
  registry.remove('a', current);
  expect(registry.items.size).toBe(0);
});
test('navigation with no active row and only disabled items is bounded', () => {
  const record = {
    id: 'a',
    element: { isConnected: true } as ViewInstance,
    disabled: true,
    focusableWhenDisabled: false,
    focusable: true,
    selected: false,
    focus: () => {},
    token: {},
  } satisfies NativeMenuRecord;
  expect(nextMenuItem([record], -1, 'previous', false)).toBeNull();
  expect(nextMenuItem([record], -1, 'previous', true)).toBeNull();
});
test('MenuItem requires its registered menu context', () => {
  expect(() => render(<MenuItem>Orphan</MenuItem>)).toThrow(
    /must be placed within Menu or MenuList/,
  );
});

test('inner scroll props cannot erase root menu semantics or create a second focus target', async () => {
  const model = new NativeMenuModel({ items: [{ id: 'a', label: 'Alpha' }] });
  model.listProps = {
    scrollable: true,
    scrollViewProps: { role: 'list', tabIndex: 0, focusable: true },
  };
  await model.mount();
  expect(model.nodes.get('list').props).toMatchObject({
    role: 'menu',
    nativeTabIndex: -1,
    nativeFocusable: true,
  });
  expect(model.tree!.UNSAFE_getByType(ScrollView).props.focusable).toBe(false);
});
test.each(['MUI', 'standard'])(
  'focus handoff preserves arbitrary descendants through %s events and matching blur',
  async (channel) => {
    const actions = React.createRef<MenuListActions>(),
      model = new NativeMenuModel({ items: [{ id: 'a', label: 'Alpha' }], autoFocusItem: true });
    model.listProps = { actions };
    await model.mount();
    const child: any = { props: {}, focus: jest.fn() };
    model.attach('input')(child);
    model.current = child;
    const event = model.event(child);
    event.currentTarget = model.nodes.get('list');
    const root = model.nodes.get('list');
    const focus = channel === 'MUI' ? root.props.onMUIFocus : root.props.onFocus;
    const blur = channel === 'MUI' ? root.props.onMUIBlur : root.props.onBlur;
    await act(async () => focus(event));
    let current: unknown;
    act(() => {
      current = actions.current?.focusInitialTarget();
    });
    expect(current === child).toBe(true);
    expect(model.current).toBe(child);
    model.current = null;
    await act(async () => blur(event));
    act(() => {
      current = actions.current?.focusInitialTarget();
    });
    expect(current === model.nodes.get('a')).toBe(true);
  },
);

test('dual focus channels notify once and stale descendant blur preserves the new target', async () => {
  const actions = React.createRef<MenuListActions>(),
    onFocus = jest.fn(),
    onBlur = jest.fn();
  const model = new NativeMenuModel({ items: [{ id: 'a', label: 'Alpha' }], autoFocusItem: true });
  model.listProps = { actions, onFocus, onBlur };
  await model.mount();
  onFocus.mockClear();
  onBlur.mockClear();
  const child: any = { props: {}, focus: jest.fn() };
  model.attach('input')(child);
  const root = model.nodes.get('list'),
    event = model.event(child);
  event.currentTarget = root;
  await act(async () => {
    root.props.onFocus(event);
    root.props.onMUIFocus(event);
  });
  expect(onFocus).toHaveBeenCalledTimes(1);
  await act(async () => {
    root.props.onBlur(event);
    root.props.onMUIBlur(event);
  });
  expect(onBlur).toHaveBeenCalledTimes(1);
  await act(async () => {
    model.focus(model.nodes.get('a'));
    root.props.onBlur(event);
  });
  expect(actions.current?.focusInitialTarget() === model.nodes.get('a')).toBe(true);
});
test('late connected items receive initial focus after an empty root fallback', async () => {
  const model = await new NativeMenuModel({
    items: [],
    autoFocus: true,
    autoFocusItem: true,
  }).mount();
  expect(model.snapshot().focus).toBe('list');
  model.items = [{ id: 'a', label: 'Alpha' }];
  await model.update();
  expect(model.snapshot().focus).toBe('a');
});
test('disabled metadata updates the active tab target without retaining a stale candidate', async () => {
  const model = await new NativeMenuModel({
    items: [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ],
    autoFocusItem: true,
  }).mount();
  model.items[0].disabled = true;
  await model.update();
  expect(model.nodes.get('a').props.nativeTabIndex).toBe(-1);
  expect(model.nodes.get('b').props.nativeTabIndex).toBe(0);
  await model.action({ key: 'ArrowDown' });
  expect(model.snapshot().focus).toBe('b');
});
test('MenuList owns its children and composes MuiList and ButtonBase defaults', () => {
  const blur = jest.fn(),
    hover = jest.fn();
  const theme = createTheme({
    components: {
      MuiList: {
        defaultProps: {
          dense: true,
          scrollable: true,
          children: 'Unexpected default child',
          onBlur: blur,
        },
      },
      MuiButtonBase: {
        defaultProps: {
          onHoverIn: hover,
          style: { borderWidth: 3 },
          accessibilityLabel: 'Default action',
        },
      },
    },
  });
  const empty = render(
    <ThemeProvider theme={theme}>
      <MenuList />
    </ThemeProvider>,
  );
  expect(screen.queryByText('Unexpected default child')).toBeNull();
  empty.unmount();
  render(
    <ThemeProvider theme={theme}>
      <MenuList testID="menu">
        <MenuItem testID="row">Action</MenuItem>
      </MenuList>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('row').props.accessibilityLabel).toBe('Default action');
  expect(StyleSheet.flatten(screen.getByTestId('row').props.style)).toMatchObject({
    minHeight: 32,
    borderWidth: 3,
  });
  fireEvent(screen.getByTestId('row'), 'hoverIn', { nativeEvent: {} });
  expect(hover).toHaveBeenCalledTimes(1);
  fireEvent(screen.getByTestId('menu'), 'MUIBlur', {
    target: null,
    currentTarget: null,
    nativeEvent: {},
  });
  expect(blur).toHaveBeenCalledTimes(1);
});
test('ListItemIcon retains an outer icon scope outside dense menu overrides', () => {
  const tree = render(
    <NativeIconStyleContext.Provider value={{ fontSize: 31 }}>
      <ListItemIcon>
        <Check />
      </ListItemIcon>
    </NativeIconStyleContext.Provider>,
  );
  expect(tree.UNSAFE_getByType(Svg).props.width).toBe(31);
});

test.each(['sibling', 'ancestor'])(
  'stale %s blur inside one registered item preserves the newer descendant',
  async (kind) => {
    const actions = React.createRef<MenuListActions>();
    const model = new NativeMenuModel({
      items: [{ id: 'a', label: 'Alpha' }],
      autoFocusItem: true,
    });
    model.listProps = { actions };
    await model.mount();
    const first: any = { props: {}, focus: jest.fn() },
      second: any = { props: {}, focus: jest.fn() };
    model.attach('input-first')(first);
    model.attach('input-second')(second);
    const row = model.nodes.get('a'),
      root = model.nodes.get('list');
    Object.defineProperty(row, 'contains', {
      configurable: true,
      value: (node: any) => [row, first, second].includes(node),
    });
    const event = model.event(second);
    event.currentTarget = row;
    model.current = second;
    await act(async () => {
      row.props.onMUIFocus(event);
      event.currentTarget = root;
      root.props.onMUIFocus(event);
    });
    const stale = model.event(kind === 'sibling' ? first : row);
    stale.currentTarget = row;
    await act(async () => {
      row.props.onMUIBlur(stale);
      stale.currentTarget = root;
      root.props.onMUIBlur(stale);
    });
    expect(actions.current?.focusInitialTarget() === second).toBe(true);
  },
);
