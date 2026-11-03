import React from 'react';
import { View, Text, TextInput, Linking, StyleSheet } from 'react-native';
import { act, cleanup } from '@testing-library/react-native';
import {
  ButtonBase,
  ThemeProvider,
  createTheme,
  configureDiagnostics,
  buttonClasses,
  iconButtonClasses,
  getButtonUtilityClass,
  getIconButtonUtilityClass,
  type ButtonBaseActions,
  type ButtonBaseRootProps,
} from '../packages/material/src';
import { NativePressable, getNativeFocusedView } from '../packages/native-host/src';
import { clearNativeFocus } from '../packages/native-host/src/nativeFocus';
import { nativeButtonModality } from '../packages/material/src/nativeButtonModality';
import { NativeOverlayReadiness } from '../packages/material/src/nativeOverlayReadiness';
import { NativeButtonModel } from './helpers/nativeButtonModel';
import reference from './fixtures/mui-buttons-9.5.0.json';
let restore: () => void;
beforeEach(() => {
  restore = configureDiagnostics(() => {});
  nativeButtonModality.keyboard();
});
afterEach(() => {
  cleanup();
  clearNativeFocus(getNativeFocusedView());
  jest.restoreAllMocks();
  restore();
});
test.each(reference.fixtures)('original button wrapper: $input.name', async (fixture) => {
  const input: any = fixture.input,
    expected: any = fixture.output,
    model = new NativeButtonModel();
  model.kind = input.component;
  const { $undefined, ...authored } = input.props ?? {};
  for (const key of $undefined ?? []) authored[key] = undefined;
  let owner: any;
  const theme = createTheme({
    ...(input.custom ? { palette: { brand: { main: '#345678' } } } : {}),
    components: {
      MuiButton: { defaultProps: input.buttonDefaults },
      ['Mui' + input.component]: {
        defaultProps: input.defaults,
        styleOverrides: {
          root: ({ ownerState }: { ownerState: Record<string, unknown> }) => {
            owner = ownerState;
            return {};
          },
        },
      },
    },
  } as any);
  model.props = {
    id: 'choice',
    ...authored,
    ...(input.icons ? { startIcon: 'Start', endIcon: 'End' } : {}),
  };
  model.wrapper = (node) => <ThemeProvider theme={theme}>{node}</ThemeProvider>;
  await model.mount();
  const base = model.tree!.UNSAFE_getByType(ButtonBase).props;
  expect(Object.fromEntries(Object.keys(expected.owner).map((key) => [key, owner[key]]))).toEqual(
    expected.owner,
  );
  expect({
    disabled: base.disabled,
    focusRipple: base.focusRipple,
    href: base.href ?? null,
    id: base.nativeID,
  }).toEqual(expected.base);
  expect(model.tree!.queryAllByRole('progressbar')).toHaveLength(
    expected.owner.loading === true ? 1 : 0,
  );
});
test('utility class helpers match the actual original exports', () => {
  for (const [name, classes, helper] of [
    ['Button', buttonClasses, getButtonUtilityClass],
    ['IconButton', iconButtonClasses, getIconButtonUtilityClass],
  ] as const) {
    const expected = reference.helpers[name];
    expect(classes).toEqual(expected.classes);
    for (const [key, value] of Object.entries(expected.states)) expect(helper(key)).toBe(value);
  }
});
test.each(['Button', 'IconButton'] as const)(
  '%s uses native keyboard activation with one callback',
  async (kind) => {
    const click = jest.fn(),
      press = jest.fn(),
      model = new NativeButtonModel();
    model.kind = kind;
    model.props = { onClick: click, onPress: press };
    await model.mount();
    await model.nativeKey('Enter');
    await model.nativeKey('Enter', true);
    expect(press).toHaveBeenCalledTimes(1);
    expect(click).not.toHaveBeenCalled();
    expect(press.mock.calls[0][0].key).toBe('Enter');
    await model.nativeKey(' ');
    expect(press).toHaveBeenCalledTimes(1);
    await model.nativeKey(' ', true);
    expect(press).toHaveBeenCalledTimes(2);
  },
);
test.each(['Button', 'IconButton'] as const)(
  '%s rejects canceled/composing/nested key activation',
  async (kind) => {
    const click = jest.fn(),
      model = new NativeButtonModel();
    model.kind = kind;
    model.props = { onClick: click, onKeyUp: (event: any) => event.preventDefault() };
    await model.mount();
    await model.nativeKey('Enter', false, { isComposing: true });
    await model.nativeKey('Enter', false, { isCanceled: true });
    await model.nativeKey(' ', true);
    expect(click).not.toHaveBeenCalled();
    const event = model.event({}, 'Enter');
    event.currentTarget = model.nodes.get('trigger');
    await act(async () => model.nodes.get('trigger').props.onMUIKeyDown(event));
    expect(click).not.toHaveBeenCalled();
  },
);
test.each(['Button', 'IconButton'] as const)(
  '%s loading disables retained press and key callbacks',
  async (kind) => {
    const click = jest.fn(),
      key = jest.fn(),
      model = new NativeButtonModel();
    model.kind = kind;
    model.props = { onClick: click, onKeyDown: key };
    await model.mount();
    const old = model.native(),
      oldPress = model.tree!.UNSAFE_getByType(NativePressable).props.onPress!,
      source = model.event(model.nodes.get('trigger'), 'Enter');
    model.props = { ...model.props, loading: true };
    await model.update();
    await act(async () => {
      old.onMUIKeyDown(source);
      oldPress(source);
    });
    expect(click).not.toHaveBeenCalled();
    expect(key).not.toHaveBeenCalled();
    expect(model.native().accessibilityState).toMatchObject({ disabled: true, busy: true });
    model.props = { ...model.props, loading: false };
    await model.update();
    await model.press();
    expect(click).toHaveBeenCalledTimes(1);
  },
);
test('a retained custom-root activation after unmount does not publish or open a link', async () => {
  let old: any;
  const Root = React.forwardRef<any, ButtonBaseRootProps>(function Root(props, ref) {
    old = props.onPress;
    return <NativePressable {...props} ref={ref} />;
  });
  const click = jest.fn(),
    open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any),
    model = new NativeButtonModel();
  model.props = { component: Root, onClick: click, href: 'https://example.com' };
  await model.mount();
  const source = model.event(model.nodes.get('trigger'));
  model.tree!.unmount();
  await act(async () => old(source));
  expect(click).not.toHaveBeenCalled();
  expect(open).not.toHaveBeenCalled();
});
test.each(['Button', 'IconButton'] as const)(
  '%s forwards native action/ref focus and focus-ripple settings',
  async (kind) => {
    const action = React.createRef<ButtonBaseActions>(),
      focus = jest.fn(),
      model = new NativeButtonModel();
    model.kind = kind;
    model.props = { action, onFocusVisible: focus };
    await model.mount();
    act(() => action.current!.focusVisible());
    expect(model.current === model.nodes.get('trigger')).toBe(true);
    expect(model.tree!.getByTestId('trigger')).toHaveStyle({ outlineWidth: 2 });
    model.props = { ...model.props, disableFocusRipple: true };
    await model.update();
    expect(StyleSheet.flatten(model.native().style)?.outlineWidth).toBeUndefined();
  },
);
test.each(['Button', 'IconButton'] as const)(
  '%s autofocus waits for presentation readiness and does not steal later focus',
  async (kind) => {
    const model = new NativeButtonModel();
    model.kind = kind;
    model.props = { autoFocus: true };
    let ready = false;
    model.wrapper = (node) => (
      <NativeOverlayReadiness.Provider value={ready}>{node}</NativeOverlayReadiness.Provider>
    );
    await model.mount();
    expect(model.current).toBeNull();
    ready = true;
    await model.update();
    expect(model.current === model.nodes.get('trigger')).toBe(true);
  },
);
test('dynamic autofocus skips another focused native input', async () => {
  const model = new NativeButtonModel();
  await model.mount();
  jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({} as any);
  model.props = { autoFocus: true };
  await model.update();
  expect(model.current).toBeNull();
});
test('IconButton keeps dedicated defaults, color, edge and native touch targets', async () => {
  const model = new NativeButtonModel();
  model.kind = 'IconButton';
  model.props = { size: 'small', edge: 'start' };
  model.wrapper = (node) => (
    <ThemeProvider
      theme={createTheme({
        components: {
          MuiButton: {
            defaultProps: { disabled: true, size: 'large' },
            styleOverrides: { root: { backgroundColor: 'red' } },
          },
          MuiIconButton: { styleOverrides: { sizeSmall: { borderWidth: 2 } } },
        },
      })}
    >
      {node}
    </ThemeProvider>
  );
  await model.mount();
  expect(model.native().accessibilityState.disabled).toBe(false);
  expect(model.tree!.getByTestId('trigger')).toHaveStyle({
    minWidth: 44,
    minHeight: 44,
    paddingTop: 5,
    marginStart: -3,
    backgroundColor: 'transparent',
    borderWidth: 2,
  });
});
test('named Button overrides receive owner state while inline native styles win last', async () => {
  const model = new NativeButtonModel();
  model.props = { variant: 'outlined', size: 'large', style: { padding: 20, paddingLeft: 24 } };
  model.wrapper = (node) => (
    <ThemeProvider
      theme={createTheme({
        components: {
          MuiButton: {
            styleOverrides: {
              outlined: { paddingRight: 40 },
              sizeLarge: ({ ownerState }) => ({
                borderWidth: ownerState.variant === 'outlined' ? 3 : 0,
              }),
            },
          },
        },
      })}
    >
      {node}
    </ThemeProvider>
  );
  await model.mount();
  expect(model.tree!.getByTestId('trigger')).toHaveStyle({
    paddingLeft: 24,
    paddingRight: 20,
    paddingTop: 20,
    borderWidth: 3,
  });
});
test('loading keeps stateful label and icon nodes mounted through every position', async () => {
  const mounted = jest.fn(),
    unmounted = jest.fn();
  function Label() {
    React.useEffect(() => {
      mounted();
      return unmounted;
    }, []);
    return <Text>Stateful</Text>;
  }
  const model = new NativeButtonModel();
  model.children = <Label />;
  model.props = { startIcon: <Text>Before</Text>, endIcon: <Text>After</Text>, loading: false };
  await model.mount();
  for (const loadingPosition of ['start', 'center', 'end']) {
    model.props = { ...model.props, loading: true, loadingPosition, fullWidth: true };
    await model.update();
    expect(model.tree!.getAllByRole('progressbar')).toHaveLength(1);
    expect(model.tree!.getByText('Stateful')).toBeTruthy();
  }
  expect(mounted).toHaveBeenCalledTimes(1);
  expect(unmounted).not.toHaveBeenCalled();
});
test('rich native view content is not nested under a Text label', async () => {
  const model = new NativeButtonModel();
  model.children = (
    <View testID="rich">
      <Text>Rich</Text>
    </View>
  );
  await model.mount();
  let parent = model.tree!.getByTestId('rich').parent;
  while (parent) {
    expect(parent.type).not.toBe(Text);
    parent = parent.parent;
  }
});

test.each(['Button', 'IconButton'] as const)(
  '%s leaves opaque accessible names to native descendants',
  async (kind) => {
    function Label() {
      return <Text>Custom label</Text>;
    }
    const model = new NativeButtonModel();
    model.kind = kind;
    model.children = <Label />;
    await model.mount();
    expect(model.native().accessibilityLabel).toBeUndefined();
    model.children = (
      <>
        Prefix <Label />
      </>
    );
    await model.update();
    expect(model.native().accessibilityLabel).toBeUndefined();
    model.props = { 'aria-label': '' };
    await model.update();
    expect(model.native().accessibilityLabel).toBe('');
  },
);
test.each(['Button', 'IconButton'] as const)(
  '%s loading indicator styles reach default and custom content',
  async (kind) => {
    const model = new NativeButtonModel();
    model.kind = kind;
    model.props = { loading: true };
    model.wrapper = (node) => (
      <ThemeProvider
        theme={createTheme({
          components: {
            ['Mui' + kind]: {
              styleOverrides: { loadingIndicator: { color: 'red', fontSize: 23 } },
            },
          },
        })}
      >
        {node}
      </ThemeProvider>
    );
    await model.mount();
    const { ActivityIndicator } = require('react-native');
    expect(model.tree!.UNSAFE_getByType(ActivityIndicator).props.color).toBe('red');
    model.props = { loading: true, loadingIndicator: <Text>Custom progress</Text> };
    await model.update();
    expect(model.tree!.getByText('Custom progress')).toHaveStyle({ color: 'red', fontSize: 23 });
  },
);
test('callback native font sizes participate in relative typography', async () => {
  const model = new NativeButtonModel();
  model.props = { style: () => ({ fontSize: 28 }) };
  await model.mount();
  expect(model.tree!.getByText('Action')).toHaveStyle({ fontSize: 28, lineHeight: 49 });
});
test('nested Button typography keeps inherited unitless line height', async () => {
  const { Typography } = require('../packages/material/src');
  const model = new NativeButtonModel();
  model.children = (
    <Typography variant="inherit" sx={{ fontSize: 10 }}>
      Child
    </Typography>
  );
  await model.mount();
  expect(model.tree!.getByText('Child')).toHaveStyle({ fontSize: 10, lineHeight: 17.5 });
});
test('custom native Typography roots stay outside a Text label', async () => {
  const { Typography } = require('../packages/material/src');
  const Root = React.forwardRef<any, any>(function Root(props, ref) {
    return <View {...props} ref={ref} />;
  });
  const model = new NativeButtonModel();
  model.children = (
    <Typography component={Root} testID="custom-typography">
      Child
    </Typography>
  );
  await model.mount();
  let parent = model.tree!.getByTestId('custom-typography').parent;
  while (parent) {
    expect(parent.type).not.toBe(Text);
    parent = parent.parent;
  }
});

test.each(['theme', 'provider'])(
  'Typography %s root defaults remain outside native Text',
  async (source) => {
    const { Typography, DefaultPropsProvider } = require('../packages/material/src');
    const Root = React.forwardRef<any, any>(function Root({ children, ...props }, ref) {
      return (
        <View {...props} ref={ref}>
          <Text>{children}</Text>
        </View>
      );
    });
    const model = new NativeButtonModel();
    model.children = <Typography testID="default-typography">Default root</Typography>;
    model.wrapper =
      source === 'theme'
        ? (node) => (
            <ThemeProvider
              theme={createTheme({
                components: { MuiTypography: { defaultProps: { component: Root } } },
              })}
            >
              {node}
            </ThemeProvider>
          )
        : (node) => (
            <DefaultPropsProvider value={{ MuiTypography: { defaultProps: { component: Root } } }}>
              {node}
            </DefaultPropsProvider>
          );
    await model.mount();
    let parent = model.tree!.getByTestId('default-typography').parent;
    while (parent) {
      expect(parent.type).not.toBe(Text);
      parent = parent.parent;
    }
    expect(model.native().accessibilityLabel).toBeUndefined();
  },
);
