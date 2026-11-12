import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import React from 'react';
import { View, Text, ScrollView, StyleSheet, type ViewInstance } from 'react-native';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react-native';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  ListSubheader,
  Typography,
  ThemeProvider,
  DefaultPropsProvider,
  createTheme,
  configureDiagnostics,
  alpha,
  type NativeListRootProps,
  type ButtonBaseActions,
} from '../packages/material/src';
import { Commands } from '../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';
import { nativeButtonModality } from '../packages/material/src/nativeButtonModality';
import reference from './fixtures/mui-lists-9.5.0.json';
let restore: () => void;
beforeEach(() => {
  jest.clearAllMocks();
  restore = configureDiagnostics(() => {});
  nativeButtonModality.keyboard();
  for (const key of ['focus', 'blur', 'setPressed', 'setHotspot'] as const)
    jest.spyOn(Commands, key).mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  restore();
  jest.restoreAllMocks();
});
const style = (id: string) =>
  StyleSheet.flatten(screen.getByTestId(id, { includeHiddenElements: true }).props.style);
const ownerKeys: Record<string, string[]> = {
  List: ['dense', 'disablePadding'],
  ListItem: ['dense', 'alignItems', 'disableGutters', 'disablePadding', 'divider'],
  ListItemButton: ['dense', 'alignItems', 'disableGutters', 'divider', 'selected'],
  ListItemText: ['dense', 'disableTypography', 'inset', 'primary', 'secondary'],
  ListItemIcon: ['alignItems'],
  ListItemAvatar: ['alignItems'],
  ListItemSecondaryAction: ['disableGutters'],
  ListSubheader: ['color', 'disableGutters', 'disableSticky', 'inset'],
};
test.each(reference.fixtures)('original list composition: $input.name', (fixture) => {
  const input = fixture.input as any,
    owners: Record<string, object> = {};
  const theme = createTheme({
    components: Object.fromEntries(
      Object.entries(ownerKeys).map(([name, keys]) => [
        'Mui' + name,
        {
          styleOverrides: {
            root: nativeStyleCallback(({ ownerState }: { ownerState: Record<string, unknown> }) => {
              owners[name] = Object.fromEntries(
                keys
                  .filter((key) => ownerState[key] !== undefined)
                  .map((key) => [key, ownerState[key]]),
              );
              return {};
            }),
          },
        },
      ]),
    ),
  });
  if (input.baseDisabled !== undefined)
    theme.components.MuiButtonBase = { defaultProps: { disabled: input.baseDisabled } };
  const Item = input.button ? ListItemButton : ListItem;
  const props = input.button
    ? { selected: input.selected, disabled: input.disabled, disableRipple: true }
    : {
        disablePadding: input.disablePadding,
        secondaryAction: input.secondaryAction ? <Text>More</Text> : undefined,
      };
  const primary = input.providedTypography ? (
    <Typography variant="caption">Custom</Typography>
  ) : (
    input.primary
  );
  const tree = render(
    <ThemeProvider theme={theme}>
      <List
        dense={input.listDense}
        disablePadding={input.listDisablePadding}
        subheader={
          input.subheader ? <ListSubheader {...input.header}>Section</ListSubheader> : undefined
        }
      >
        <Item
          testID="item"
          {...props}
          dense={input.itemDense}
          alignItems={input.alignItems}
          disableGutters={input.disableGutters}
          divider={input.divider}
        >
          <ListItemIcon>Icon</ListItemIcon>
          <ListItemAvatar>Avatar</ListItemAvatar>
          <ListItemText
            primary={primary}
            secondary={input.secondary}
            inset={input.inset}
            disableTypography={input.disableTypography}
          >
            Fallback
          </ListItemText>
        </Item>
      </List>
    </ThemeProvider>,
  );
  expect(owners).toEqual(fixture.owners);
  if ('buttonState' in fixture) {
    const host = screen.getByTestId('item');
    expect({
      disabled: host.props.accessibilityState.disabled,
      tabIndex: host.props.nativeTabIndex,
    }).toEqual(fixture.buttonState);
  }
  expect(tree.UNSAFE_queryAllByType(Typography).map((node) => node.props.variant)).toEqual(
    fixture.typography,
  );
});
test('list padding, density reset and subheader order follow distinct contexts', () => {
  const { rerender } = render(
    <List dense testID="outer" subheader={<ListSubheader disableSticky>Section</ListSubheader>}>
      <ListItem>
        <ListItemText primary="Dense" />
      </ListItem>
      <List>
        <ListItem>
          <ListItemText primary="Normal" />
        </ListItem>
      </List>
    </List>,
  );
  expect(style('outer')).toMatchObject({ paddingTop: 0, paddingBottom: 8 });
  expect(StyleSheet.flatten(screen.getByText('Dense').props.style).fontSize).toBe(14);
  expect(StyleSheet.flatten(screen.getByText('Normal').props.style).fontSize).toBe(16);
  rerender(
    <List testID="outer" disablePadding>
      Literal
    </List>,
  );
  expect(style('outer')).toMatchObject({ paddingTop: 0, paddingBottom: 0 });
  expect(screen.getByText('Literal')).toBeTruthy();
});
test('pinned icon spacing follows the theme while avatars keep their own width', () => {
  render(
    <ThemeProvider theme={createTheme({ spacing: 6 })}>
      <ListItem alignItems="flex-start">
        <ListItemIcon testID="icon">I</ListItemIcon>
        <ListItemAvatar testID="avatar">A</ListItemAvatar>
      </ListItem>
    </ThemeProvider>,
  );
  expect(style('icon')).toMatchObject({ minWidth: 27, marginTop: 8, flexShrink: 0 });
  expect(style('avatar')).toMatchObject({ minWidth: 56, marginTop: 8, flexShrink: 0 });
});
test('logical action space and text wrapping survive padding-free composed buttons', () => {
  render(
    <ThemeProvider theme={createTheme({ direction: 'rtl' })}>
      <ListItem testID="item" disablePadding secondaryAction={<Text>More</Text>}>
        <ListItemButton testID="button">
          <ListItemText
            testID="text"
            primary="Long content that wraps"
            secondary="Additional detail"
          />
        </ListItemButton>
      </ListItem>
    </ThemeProvider>,
  );
  expect(style('item')).toMatchObject({ direction: 'rtl', flexDirection: 'row' });
  expect(style('button')).toMatchObject({ paddingEnd: 48, paddingStart: 16, minHeight: 48 });
  expect(style('text')).toMatchObject({ minWidth: 0, flexShrink: 1, marginTop: 6 });
  expect(screen.getByText('Long content that wraps').props.numberOfLines).toBeUndefined();
});
test('secondary-action replacement keeps position and theme/slot styles and native ref', () => {
  const action = React.createRef<ViewInstance>();
  const Root = React.forwardRef<ViewInstance, NativeListRootProps>((props, ref) => (
    <View {...props} ref={ref} />
  ));
  render(
    <ThemeProvider
      theme={createTheme({
        components: { MuiListItem: { styleOverrides: { secondaryAction: { padding: 3 } } } },
      })}
    >
      <ListItem
        disableGutters
        secondaryAction="More"
        slots={{ secondaryAction: Root }}
        slotProps={{
          secondaryAction: (state) => ({
            testID: 'action',
            ref: action,
            style: { opacity: state.dense ? 0.5 : 0.7 },
          }),
        }}
      >
        Row
      </ListItem>
    </ThemeProvider>,
  );
  expect(style('action')).toMatchObject({
    position: 'absolute',
    end: 0,
    top: '50%',
    transform: [{ translateY: '-50%' }],
    padding: 3,
    opacity: 0.7,
  });
  expect(action.current).not.toBeNull();
});
test('root slot refs share one native view and release on replacement/unmount', () => {
  const forwarded = React.createRef<ViewInstance>(),
    oldCleanup = jest.fn(),
    newCleanup = jest.fn();
  const first = jest.fn((_node: ViewInstance | null) => oldCleanup),
    second = jest.fn((_node: ViewInstance | null) => newCleanup);
  const { rerender, unmount } = render(
    <ListItem ref={forwarded} slotProps={{ root: { ref: first } }}>
      Row
    </ListItem>,
  );
  expect(first.mock.calls[0][0]).toBe(forwarded.current);
  rerender(
    <ListItem ref={forwarded} slotProps={{ root: { ref: second } }}>
      Row
    </ListItem>,
  );
  expect(oldCleanup).toHaveBeenCalledTimes(1);
  expect(second.mock.calls[0][0]).toBe(forwarded.current);
  unmount();
  expect(newCleanup).toHaveBeenCalledTimes(1);
  expect(forwarded.current).toBeNull();
});
test('text slot callbacks receive resolved dense/false-content state and merge theme props', () => {
  const callback = jest.fn((state) => ({
    testID: 'primary',
    color: state.dense ? 'error' : 'primary',
    style: { fontWeight: '700' as const },
  }));
  render(
    <ThemeProvider
      theme={createTheme({
        components: {
          MuiListItemText: {
            defaultProps: { slotProps: { primary: { noWrap: true } } },
            styleOverrides: {
              primary: { fontSize: 19, color: 'green' },
              secondary: { fontWeight: 600 },
            },
          },
        },
      })}
    >
      <List dense>
        <ListItemText
          primary={0}
          secondary="Detail"
          slotProps={{ root: { testID: 'text', style: { paddingStart: 7 } }, primary: callback }}
        />
      </List>
    </ThemeProvider>,
  );
  expect(callback).toHaveBeenCalledWith(
    expect.objectContaining({ dense: true, primary: false, secondary: true }),
  );
  expect(style('primary')).toMatchObject({ fontSize: 19, fontWeight: '700', color: 'green' });
  expect(screen.getByTestId('primary').props.numberOfLines).toBe(1);
  expect(style('text')).toMatchObject({ marginTop: 4, paddingStart: 7 });
  expect(StyleSheet.flatten(screen.getByText('Detail').props.style).fontWeight).toBe('600');
});
test('custom text slots compose Typography and retain content, variant and ref cleanup', () => {
  const release = jest.fn(),
    slotRef = jest.fn(() => release);
  const Primary = (props: React.ComponentProps<typeof Typography>) => (
    <Typography {...props} testID="custom" />
  );
  const { unmount } = render(
    <List dense>
      <ListItemText
        primary="Primary"
        slots={{ primary: Primary }}
        slotProps={{ primary: { ref: slotRef, variant: 'h6' } }}
      />
    </List>,
  );
  expect(style('custom').fontSize).toBe(20);
  expect(screen.getByText('Primary')).toBeTruthy();
  unmount();
  expect(release).toHaveBeenCalledTimes(1);
});
test('provided Typography bypasses wrapper and primary slot overrides', () => {
  const slot = jest.fn();
  const tree = render(
    <ListItemText
      primary={<Typography variant="caption">Original</Typography>}
      slots={{ primary: slot }}
    />,
  );
  expect(slot).not.toHaveBeenCalled();
  expect(tree.UNSAFE_getAllByType(Typography)).toHaveLength(1);
});
test('scrolling moves padding into content and pins direct/fragment subheaders', () => {
  const tree = render(
    <List
      scrollable
      testID="list"
      sx={{ height: 200, p: 2 }}
      subheader={<ListSubheader>Top</ListSubheader>}
    >
      <>
        <ListItem>One</ListItem>
        <ListSubheader>Group</ListSubheader>
        <ListItem>Two</ListItem>
      </>
    </List>,
  );
  const scroll = tree.UNSAFE_getByType(ScrollView);
  expect(scroll.props.stickyHeaderIndices).toEqual([0, 2]);
  expect(StyleSheet.flatten(scroll.props.style)).toMatchObject({ height: 200 });
  expect(StyleSheet.flatten(scroll.props.style).padding).toBeUndefined();
  expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toMatchObject({ padding: 16 });
  expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
});
test('sticky indices account for literal text, header defaults and caller-owned overrides', () => {
  const { rerender, UNSAFE_getByType } = render(
    <DefaultPropsProvider value={undefined}>
      <List scrollable>
        {['A', 'B']}
        <ListSubheader>Section</ListSubheader>
        <ListItem>Row</ListItem>
      </List>
    </DefaultPropsProvider>,
  );
  expect(UNSAFE_getByType(ScrollView).props.stickyHeaderIndices).toEqual([1]);
  rerender(
    <DefaultPropsProvider value={{ MuiListSubheader: { defaultProps: { disableSticky: true } } }}>
      <List scrollable subheader={<ListSubheader>Section</ListSubheader>}>
        <ListItem>Row</ListItem>
      </List>
    </DefaultPropsProvider>,
  );
  expect(UNSAFE_getByType(ScrollView).props.stickyHeaderIndices).toEqual([]);
  rerender(
    <DefaultPropsProvider value={undefined}>
      <List
        scrollable
        scrollViewProps={{ stickyHeaderIndices: [1], keyboardShouldPersistTaps: 'always' }}
      >
        <ListSubheader disableSticky>Section</ListSubheader>
        <ListItem>Row</ListItem>
      </List>
    </DefaultPropsProvider>,
  );
  expect(UNSAFE_getByType(ScrollView).props).toMatchObject({
    stickyHeaderIndices: [1],
    keyboardShouldPersistTaps: 'always',
  });
});
test('stable keyed rows retain state when a sticky subheader is inserted', () => {
  const unmount = jest.fn();
  function Row() {
    React.useEffect(() => unmount, []);
    return <ListItem>Stable</ListItem>;
  }
  const { rerender } = render(
    <List scrollable>
      <Row key="row" />
    </List>,
  );
  rerender(
    <List scrollable subheader={<ListSubheader>Section</ListSubheader>}>
      <Row key="row" />
    </List>,
  );
  expect(unmount).not.toHaveBeenCalled();
});
test('static lists remain native views with no owned scroll host', () => {
  const tree = render(
    <List>
      <ListItem>Static</ListItem>
    </List>,
  );
  expect(tree.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0);
});
test('button autofocus uses native commands on each false-to-true change', () => {
  const ref = React.createRef<ViewInstance>();
  const { rerender } = render(
    <ListItemButton ref={ref} autoFocus>
      Action
    </ListItemButton>,
  );
  expect(Commands.focus).toHaveBeenCalledTimes(1);
  expect(Commands.focus).toHaveBeenCalledWith(ref.current);
  rerender(
    <ListItemButton ref={ref} autoFocus>
      Action
    </ListItemButton>,
  );
  expect(Commands.focus).toHaveBeenCalledTimes(1);
  rerender(<ListItemButton ref={ref}>Action</ListItemButton>);
  rerender(
    <ListItemButton ref={ref} autoFocus>
      Action
    </ListItemButton>,
  );
  expect(Commands.focus).toHaveBeenCalledTimes(2);
});
test('button selected/focus/hover styles, callbacks and disabled feedback compose', () => {
  const onHoverIn = jest.fn(),
    onHoverOut = jest.fn(),
    press = jest.fn(),
    action = React.createRef<ButtonBaseActions>(),
    theme = createTheme();
  const { rerender } = render(
    <ThemeProvider theme={theme}>
      <ListItemButton
        testID="button"
        selected
        action={action}
        onPress={press}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
      >
        Action
      </ListItemButton>
    </ThemeProvider>,
  );
  expect(style('button').backgroundColor).toBe(
    alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
  );
  fireEvent(screen.getByTestId('button'), 'hoverIn', {});
  expect(onHoverIn).toHaveBeenCalledTimes(1);
  expect(style('button').backgroundColor).toBe(
    alpha(
      theme.palette.primary.main,
      theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity,
    ),
  );
  fireEvent(screen.getByTestId('button'), 'hoverOut', {});
  expect(onHoverOut).toHaveBeenCalledTimes(1);
  act(() => action.current?.focusVisible());
  expect(style('button').backgroundColor).toBe(
    alpha(
      theme.palette.primary.main,
      theme.palette.action.selectedOpacity + theme.palette.action.focusOpacity,
    ),
  );
  fireEvent.press(screen.getByTestId('button'));
  expect(press).toHaveBeenCalledTimes(1);
  rerender(
    <ThemeProvider theme={theme}>
      <ListItemButton testID="button" disabled selected onPress={press}>
        Action
      </ListItemButton>
    </ThemeProvider>,
  );
  fireEvent.press(screen.getByTestId('button'));
  expect(press).toHaveBeenCalledTimes(1);
  expect(style('button').opacity).toBe(theme.palette.action.disabledOpacity);
  expect(screen.getByTestId('button').props.accessibilityState).toMatchObject({
    disabled: true,
    selected: true,
  });
});
test('button theme focus selectors and state callbacks receive native state', () => {
  const action = React.createRef<ButtonBaseActions>(),
    custom = jest.fn((state) => ({ borderWidth: state.focusVisible ? 3 : 0 }));
  render(
    <ThemeProvider
      theme={createTheme({
        components: {
          MuiListItemButton: {
            styleOverrides: { root: { '&.Mui-focusVisible': { backgroundColor: 'red' } } },
          },
        },
      })}
    >
      <ListItemButton testID="button" action={action} style={custom} />
    </ThemeProvider>,
  );
  act(() => action.current?.focusVisible());
  expect(style('button')).toMatchObject({ backgroundColor: 'red', borderWidth: 3 });
  expect(custom).toHaveBeenCalledWith(
    expect.objectContaining({ focusVisible: true, pressed: false, disabled: false }),
  );
});

test('ButtonBase disabled defaults apply to list styling and activation but explicit false wins', () => {
  const press = jest.fn(),
    theme = createTheme({
      components: {
        MuiButtonBase: { defaultProps: { disabled: true, style: { borderWidth: 2 } } },
      },
    });
  const { rerender } = render(
    <ThemeProvider theme={theme}>
      <ListItemButton testID="button" onClick={press}>
        Action
      </ListItemButton>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('button').props.accessibilityState.disabled).toBe(true);
  expect(style('button')).toMatchObject({
    opacity: theme.palette.action.disabledOpacity,
    borderWidth: 2,
  });
  fireEvent.press(screen.getByTestId('button'));
  expect(press).not.toHaveBeenCalled();
  rerender(
    <ThemeProvider theme={theme}>
      <ListItemButton testID="button" disabled={false} onClick={press}>
        Action
      </ListItemButton>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('button').props.accessibilityState.disabled).toBe(false);
  fireEvent.press(screen.getByTestId('button'));
  expect(press).toHaveBeenCalledTimes(1);
});
test('measured wide or tall actions reserve actual space and keep caller layout callbacks', () => {
  const onLayout = jest.fn();
  const { rerender } = render(
    <ListItem
      testID="item"
      secondaryAction={<Text>Wide action</Text>}
      slotProps={{ secondaryAction: { testID: 'action', onLayout } }}
    >
      <ListItemButton testID="button">Row</ListItemButton>
    </ListItem>,
  );
  fireEvent(screen.getByTestId('action'), 'layout', {
    nativeEvent: { layout: { width: 72, height: 52, x: 0, y: 0 } },
  });
  expect(onLayout).toHaveBeenCalledTimes(1);
  expect(style('item')).toMatchObject({ paddingEnd: 96, minHeight: 68 });
  expect(style('button').paddingEnd).toBe(96);
  fireEvent(screen.getByTestId('action'), 'layout', {
    nativeEvent: { layout: { width: 20, height: 24, x: 0, y: 0 } },
  });
  expect(style('item')).toMatchObject({ paddingEnd: 48, minHeight: 48 });
  rerender(
    <ListItem testID="item">
      <ListItemButton testID="button">Row</ListItemButton>
    </ListItem>,
  );
  expect(style('button').paddingEnd).toBe(16);
});
test('horizontal native scroll hosts never receive unsupported sticky indices', () => {
  const diagnostics: any[] = [];
  restore();
  restore = configureDiagnostics((value) => diagnostics.push(value));
  const tree = render(
    <List scrollable scrollViewProps={{ horizontal: true, stickyHeaderIndices: [0] }}>
      <ListSubheader>Header</ListSubheader>
      <ListItem>Row</ListItem>
    </List>,
  );
  expect(tree.UNSAFE_getByType(ScrollView).props.stickyHeaderIndices).toEqual([]);
  expect(diagnostics.map((value) => value.code)).toContain('list-sticky-horizontal');
});

test('percentage-sized action axes do not create parent measurement feedback', () => {
  const onLayout = jest.fn();
  const { rerender } = render(
    <ListItem
      testID="item"
      secondaryAction="Action"
      slotProps={{ secondaryAction: { testID: 'action', onLayout, style: { height: '100%' } } }}
    >
      Row
    </ListItem>,
  );
  for (const height of [48, 64, 80])
    fireEvent(screen.getByTestId('action'), 'layout', {
      nativeEvent: { layout: { width: 24, height, x: 0, y: 0 } },
    });
  expect(style('item').minHeight).toBe(48);
  expect(onLayout).toHaveBeenCalledTimes(3);
  rerender(
    <ListItem
      testID="item"
      secondaryAction="Action"
      slotProps={{ secondaryAction: { testID: 'action', style: { width: '100%' } } }}
    >
      Row
    </ListItem>,
  );
  fireEvent(screen.getByTestId('action'), 'layout', {
    nativeEvent: { layout: { width: 300, height: 24, x: 0, y: 0 } },
  });
  expect(style('item').paddingEnd).toBe(48);
});

test('secondary action preserves its own default layout callback and style', () => {
  const onLayout = jest.fn();
  render(
    <ThemeProvider
      theme={createTheme({
        components: {
          MuiListItemSecondaryAction: {
            defaultProps: { onLayout, style: { height: '100%', borderWidth: 3 } },
          },
        },
      })}
    >
      <ListItem
        testID="item"
        secondaryAction="Action"
        slotProps={{ secondaryAction: { testID: 'action' } }}
      >
        Row
      </ListItem>
    </ThemeProvider>,
  );
  fireEvent(screen.getByTestId('action'), 'layout', {
    nativeEvent: { layout: { width: 24, height: 64, x: 0, y: 0 } },
  });
  expect(onLayout).toHaveBeenCalledTimes(1);
  expect(style('action')).toMatchObject({ height: '100%', borderWidth: 3 });
  expect(style('item').minHeight).toBe(48);
});
test('list button retains default accessibility metadata and explicit state replaces it', () => {
  const theme = createTheme({
    components: {
      MuiButtonBase: { defaultProps: { accessibilityState: { busy: true, expanded: true } } },
    },
  });
  const { rerender } = render(
    <ThemeProvider theme={theme}>
      <ListItemButton testID="button" selected>
        Action
      </ListItemButton>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('button').props.accessibilityState).toMatchObject({
    busy: true,
    expanded: true,
    selected: true,
  });
  rerender(
    <ThemeProvider theme={theme}>
      <ListItemButton testID="button" accessibilityState={{ busy: false }}>
        Action
      </ListItemButton>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('button').props.accessibilityState.busy).toBe(false);
  expect(screen.getByTestId('button').props.accessibilityState.expanded).toBeUndefined();
});
test('Typography defaults survive list text slot styling until explicitly replaced', () => {
  const theme = createTheme({
    components: {
      MuiTypography: { defaultProps: { style: { fontWeight: '700' } } },
      MuiListItemText: { styleOverrides: { primary: { fontSize: 18 } } },
    },
  });
  const { rerender } = render(
    <ThemeProvider theme={theme}>
      <ListItemText primary="Primary" secondary="Secondary" />
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(screen.getByText('Primary').props.style)).toMatchObject({
    fontSize: 18,
    fontWeight: '700',
  });
  expect(StyleSheet.flatten(screen.getByText('Secondary').props.style).fontWeight).toBe('700');
  rerender(
    <ThemeProvider theme={theme}>
      <ListItemText primary="Primary" slotProps={{ primary: { style: { fontWeight: '500' } } }} />
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(screen.getByText('Primary').props.style).fontWeight).toBe('500');
});

test.each([{ top: 0, bottom: 0 }, { minHeight: '100%' }, { maxHeight: '100%' }] as const)(
  'parent-sized action height %j does not grow the containing row',
  (actionStyle) => {
    render(
      <ListItem
        testID="item"
        secondaryAction="Action"
        slotProps={{ secondaryAction: { testID: 'action', style: actionStyle } }}
      >
        Row
      </ListItem>,
    );
    for (const height of [48, 64, 80])
      fireEvent(screen.getByTestId('action'), 'layout', {
        nativeEvent: { layout: { width: 24, height, x: 0, y: 0 } },
      });
    expect(style('item').minHeight).toBe(48);
  },
);
test('opposing inline action edges do not feed parent width into content padding', () => {
  render(
    <ListItem
      testID="item"
      secondaryAction="Action"
      slotProps={{ secondaryAction: { testID: 'action', style: { start: 0 } } }}
    >
      Row
    </ListItem>,
  );
  fireEvent(screen.getByTestId('action'), 'layout', {
    nativeEvent: { layout: { width: 300, height: 24, x: 0, y: 0 } },
  });
  expect(style('item').paddingEnd).toBe(48);
});

test.each([
  { theme: 'rtl', root: undefined, action: { left: 0 }, space: 68 },
  { theme: 'rtl', root: 'ltr', action: { left: 0 }, space: 48 },
  { theme: 'ltr', root: undefined, action: { left: 0, direction: 'rtl' }, space: 68 },
  { theme: 'ltr', root: undefined, action: { right: 0 }, space: 68 },
] as const)('action physical/inline edges use effective direction %j', (input) => {
  render(
    <ThemeProvider theme={createTheme({ direction: input.theme })}>
      <ListItem
        testID="item"
        style={{ direction: input.root }}
        secondaryAction="Action"
        slotProps={{ secondaryAction: { testID: 'action', style: input.action } }}
      >
        Row
      </ListItem>
    </ThemeProvider>,
  );
  fireEvent(screen.getByTestId('action'), 'layout', {
    nativeEvent: { layout: { width: 44, height: 44, x: 0, y: 0 } },
  });
  expect(style('item').paddingEnd).toBe(input.space);
});
test('auto position edges remain unspecified for natural action fitting', () => {
  render(
    <ListItem
      testID="item"
      secondaryAction="Action"
      slotProps={{ secondaryAction: { testID: 'action', style: { top: 'auto', bottom: 0 } } }}
    >
      Row
    </ListItem>,
  );
  fireEvent(screen.getByTestId('action'), 'layout', {
    nativeEvent: { layout: { width: 24, height: 52, x: 0, y: 0 } },
  });
  expect(style('item').minHeight).toBe(68);
});

test('a list root direction override flows into row and button layout', () => {
  render(
    <ThemeProvider theme={createTheme({ direction: 'rtl' })}>
      <List style={{ direction: 'ltr' }}>
        <ListItem
          testID="item"
          secondaryAction="Action"
          slotProps={{ secondaryAction: { testID: 'action', style: { left: 0 } } }}
        >
          <ListItemButton testID="button">Row</ListItemButton>
        </ListItem>
      </List>
    </ThemeProvider>,
  );
  expect(style('item').direction).toBe('ltr');
  expect(style('button').direction).toBe('ltr');
  fireEvent(screen.getByTestId('action'), 'layout', {
    nativeEvent: { layout: { width: 44, height: 44, x: 0, y: 0 } },
  });
  expect(style('item').paddingEnd).toBe(48);
});

test('owned scroll content direction reaches row layout', () => {
  render(
    <ThemeProvider theme={createTheme({ direction: 'rtl' })}>
      <List scrollable scrollViewProps={{ contentContainerStyle: { direction: 'ltr' } }}>
        <ListItem testID="item">
          <ListItemButton testID="button">Row</ListItemButton>
        </ListItem>
      </List>
    </ThemeProvider>,
  );
  expect(style('item').direction).toBe('ltr');
  expect(style('button').direction).toBe('ltr');
});

test('inherit direction resolves viewport, content and nested row fallbacks in order', () => {
  render(
    <ThemeProvider theme={createTheme({ direction: 'rtl' })}>
      <List
        style={{ direction: 'ltr' }}
        scrollable
        scrollViewProps={{ contentContainerStyle: { direction: 'inherit' } }}
      >
        <List style={{ direction: 'inherit' }}>
          <ListItem style={{ direction: 'inherit' }}>
            <ListItemButton testID="button">Row</ListItemButton>
          </ListItem>
        </List>
      </List>
    </ThemeProvider>,
  );
  expect(style('button').direction).toBe('ltr');
});
test('stateful button styles publish their effective direction to nested list content', () => {
  const action = React.createRef<ButtonBaseActions>();
  render(
    <ListItemButton
      action={action}
      style={(state) => ({ direction: state.focusVisible ? 'rtl' : 'ltr' })}
    >
      <List>
        <ListItem testID="nested">Nested</ListItem>
      </List>
    </ListItemButton>,
  );
  expect(style('nested').direction).toBe('ltr');
  act(() => action.current?.focusVisible());
  expect(style('nested').direction).toBe('rtl');
});
