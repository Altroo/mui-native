import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { act, cleanup, render, fireEvent } from '@testing-library/react-native';
import {
  Checkbox,
  ButtonBase,
  Radio,
  RadioGroup,
  FormControlLabel,
  Switch,
  Typography,
  ThemeProvider,
  createTheme,
  NativeCheckedInputSurface,
  configureDiagnostics,
  type NativeCheckedInputComponentProps,
  type RadioGroupActions,
  useRadioGroup,
} from '../packages/material/src';
import { NativeCheckedModel } from './helpers/nativeCheckedModel';
import { getNativeFocusedView } from '../packages/native-host/src';
import { clearNativeFocus } from '../packages/native-host/src/nativeFocus';
import { NativeOverlayReadiness } from '../packages/material/src/nativeOverlayReadiness';
import { NativeModalParentContext } from '../packages/material/src/nativeModalContext';
import {
  nativeModalManager as manager,
  type NativeModalEntry,
} from '../packages/material/src/nativeModalManager';
let restore: () => void;
beforeEach(() => {
  restore = configureDiagnostics(() => {});
});
afterEach(() => {
  cleanup();
  while (manager.top()) manager.remove(manager.top()!);
  clearNativeFocus(getNativeFocusedView());
  jest.restoreAllMocks();
  restore();
});

test('input click propagation stops the root click but retains the checked change', async () => {
  const click = jest.fn(),
    change = jest.fn();
  const tree = render(
    <Checkbox
      onClick={click}
      onChange={change}
      slotProps={{ input: { onClick: (event) => event.stopPropagation() } }}
    />,
  );
  let stopped = false;
  fireEvent.press(tree.getByRole('checkbox'), {
    nativeEvent: {},
    persist() {},
    stopPropagation() {
      stopped = true;
    },
    isPropagationStopped: () => stopped,
  });
  expect(click).not.toHaveBeenCalled();
  expect(change).toHaveBeenCalledTimes(1);
});
test('custom input publishes once with genuine payload and controlled proposal restoration', async () => {
  let surface: NativeCheckedInputComponentProps;
  const Input = React.forwardRef<any, NativeCheckedInputComponentProps>((props, ref) => {
    surface = props;
    return <NativeCheckedInputSurface {...props} ref={ref} />;
  });
  const model = new NativeCheckedModel();
  model.props = { checked: false, slots: { input: Input } };
  await model.mount();
  const source = { ...model.event(model.nodes.get('a')), target: { checked: true } };
  await act(async () => surface!.onChange!(source));
  expect(model.changeTrace.filter((item) => item.kind === 'change')).toHaveLength(1);
  expect(model.handles.get('a')!.checked).toBe(false);
  await act(async () => surface!.onChange!(source));
  expect(model.changeTrace.filter((item) => item.kind === 'change')).toHaveLength(1);
});
test.each(['isCanceled', 'isComposing'])(
  'custom publisher ignores %s source metadata',
  async (field) => {
    let surface: NativeCheckedInputComponentProps;
    const Input = React.forwardRef<any, NativeCheckedInputComponentProps>((props, ref) => {
      surface = props;
      return <NativeCheckedInputSurface {...props} ref={ref} />;
    });
    const model = new NativeCheckedModel();
    model.props = { slots: { input: Input } };
    await model.mount();
    await act(async () =>
      surface!.onChange!({
        ...model.event(model.nodes.get('a'), undefined, { [field]: true }),
        target: { checked: true },
      }),
    );
    expect(model.changeTrace).toEqual([]);
  },
);
test('retained native activation respects current disabled state and unmount', async () => {
  const model = new NativeCheckedModel();
  await model.mount();
  const press = model.tree!.UNSAFE_getByType(ButtonBase).props.onPress;
  model.props.disabled = true;
  await act(async () => model.tree!.rerender(model.element()));
  await act(async () => press(model.event(model.nodes.get('a'))));
  expect(model.changeTrace).toEqual([]);
  model.tree!.unmount();
  await act(async () => press(model.event(model.nodes.get('a'))));
  expect(model.changeTrace).toEqual([]);
  expect(model.handles.size).toBe(0);
});
test.each(['readiness', 'closed parent', 'covered'])(
  'native label/handle/activation reject %s controls',
  async (kind) => {
    const model = new NativeCheckedModel();
    model.kind = 'label';
    model.wrapper = (node) =>
      kind === 'readiness' ? (
        <NativeOverlayReadiness.Provider value={false}>{node}</NativeOverlayReadiness.Provider>
      ) : kind === 'closed parent' ? (
        <NativeModalParentContext.Provider value={{ open: false, presented: false } as any}>
          {node}
        </NativeModalParentContext.Provider>
      ) : (
        node
      );
    await model.mount();
    if (kind === 'covered') {
      const entry = {
        id: Symbol(),
        host: Symbol(),
        open: true,
        restore: false,
        contains: () => false,
        focus() {},
        escape() {},
      } satisfies NativeModalEntry;
      await act(async () => manager.add(entry));
    }
    await model.press();
    await model.label();
    await act(async () => model.handles.get('a')!.focus());
    expect(model.handles.get('a')!.checked).toBe(false);
    expect(model.changeTrace).toEqual([]);
    expect(model.current).toBe(null);
  },
);
test('radio ordering follows keyed reorder, removal and disabled mutations', async () => {
  const model = new NativeCheckedModel();
  model.kind = 'group';
  model.props = { defaultValue: 'a', name: 'choice' };
  model.options = [
    { id: 'a', value: 'a' },
    { id: 'b', value: 'b' },
    { id: 'c', value: 'c' },
  ];
  await model.mount();
  model.options = [model.options[0], model.options[2], model.options[1]];
  await act(async () => model.tree!.rerender(model.element()));
  await model.nativeKey('a', 'ArrowRight');
  expect(model.handles.get('c')!.checked).toBe(true);
  model.options = [
    { id: 'a', value: 'a' },
    { id: 'b', value: 'b', disabled: true },
    { id: 'c', value: 'c' },
  ];
  await act(async () => model.tree!.rerender(model.element()));
  await model.nativeKey('c', 'ArrowLeft');
  expect(model.handles.get('a')!.checked).toBe(true);
  model.options = model.options.filter((item) => item.id !== 'a');
  await act(async () => model.tree!.rerender(model.element()));
  expect(model.handles.has('a')).toBe(false);
  expect(model.tree!.getByTestId('c').props.nativeTabIndex).toBe(0);
});
test('strict-mode radio registration survives effect replay and actions focus selected native node', async () => {
  const actions = React.createRef<RadioGroupActions>();
  const model = new NativeCheckedModel();
  model.kind = 'group';
  model.props = { defaultValue: 'b', name: 'choice', actions };
  model.options = [
    { id: 'a', value: 'a' },
    { id: 'b', value: 'b' },
  ];
  model.wrapper = (node) => <React.StrictMode>{node}</React.StrictMode>;
  await model.mount();
  await act(async () => actions.current!.focus());
  expect(model.current).toBe(model.nodes.get('b'));
  await model.nativeKey('b', 'ArrowRight');
  expect(model.handles.get('a')!.checked).toBe(true);
});
test('all-disabled radio actions do not focus a control', async () => {
  const actions = React.createRef<RadioGroupActions>();
  const model = new NativeCheckedModel();
  model.kind = 'group';
  model.props = { actions };
  model.options = [{ id: 'a', value: 'a', disabled: true }];
  await model.mount();
  await act(async () => actions.current!.focus());
  expect(model.current).toBe(null);
  expect(model.tree!.getByTestId('a').props.nativeTabIndex).toBe(-1);
});
test('public radio hook exposes only the current public context', () => {
  let context: any;
  function Probe() {
    context = useRadioGroup();
    return null;
  }
  const tree = render(
    <RadioGroup name="choice" value={42}>
      <Probe />
    </RadioGroup>,
  );
  expect(Object.keys(context).sort()).toEqual(['name', 'onChange', 'value']);
  expect(context.value).toBe(42);
  tree.rerender(<Probe />);
  expect(context).toBeUndefined();
});
test('root and input refs address different native nodes and clean up', () => {
  const root = React.createRef<any>(),
    input = React.createRef<any>(),
    handle = React.createRef<any>();
  const tree = render(
    <Checkbox inputRef={handle} slotProps={{ root: { ref: root }, input: { ref: input } }} />,
  );
  expect(root.current).not.toBe(input.current);
  expect(handle.current.node).toBe(input.current);
  tree.unmount();
  expect(root.current).toBe(null);
  expect(input.current).toBe(null);
  expect(handle.current).toBe(null);
});
test('root padding shorthands override named-theme edges', () => {
  const theme = createTheme({
    components: { MuiCheckbox: { styleOverrides: { root: { paddingTop: 31, paddingLeft: 29 } } } },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Checkbox slotProps={{ root: { testID: 'root', style: { padding: 3 } } }} />
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('root').props.style)).toMatchObject({
    paddingTop: 3,
    paddingLeft: 3,
    paddingRight: 3,
    paddingBottom: 3,
  });
});
test('opaque rich labels keep native views out of Text and retain typography metrics', () => {
  const theme = createTheme({
    components: { MuiTypography: { defaultProps: { variant: 'body2' } } },
  });
  function Rich() {
    return (
      <View testID="rich">
        <Typography>Details</Typography>
      </View>
    );
  }
  const tree = render(
    <ThemeProvider theme={theme}>
      <FormControlLabel label={<Rich />} control={<Checkbox />} />
    </ThemeProvider>,
  );
  let parent = tree.getByTestId('rich').parent;
  while (parent) {
    expect(parent.type).not.toBe(Text);
    expect(parent.type).not.toBe('Text');
    parent = parent.parent;
  }
  expect(tree.getByRole('checkbox').props.accessibilityLabelledBy).toBeTruthy();
  expect(StyleSheet.flatten(tree.getByText('Details').props.style).fontSize).toBe(14);
});
test('default label span overrides a global Typography custom-root default', () => {
  const Custom = React.forwardRef<any, any>((props, ref) => (
    <View {...props} ref={ref} testID="global-root" />
  ));
  const theme = createTheme({
    components: { MuiTypography: { defaultProps: { component: Custom } } },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <FormControlLabel label="Label" control={<Checkbox />} />
    </ThemeProvider>,
  );
  expect(tree.queryByTestId('global-root')).toBe(null);
  expect(tree.getByText('Label').type).toBe('Text');
});
test('custom label typography slot receives owner state and explicit slot component wins', () => {
  let owner: any;
  const Slot = React.forwardRef<any, any>(({ ownerState, ...props }, ref) => {
    owner = ownerState;
    return <Typography {...props} ref={ref} />;
  });
  const tree = render(
    <FormControlLabel
      required
      disabled
      labelPlacement="top"
      label="Label"
      control={<Checkbox />}
      slots={{ typography: Slot }}
    />,
  );
  expect(owner).toMatchObject({ required: true, disabled: true, labelPlacement: 'top' });
  expect(tree.getByText('Label')).toBeTruthy();
});
test('native Switch and label callbacks retain actual source event methods', () => {
  const change = jest.fn();
  const tree = render(<FormControlLabel label="Mode" onChange={change} control={<Switch />} />);
  const persist = jest.fn(),
    preventDefault = jest.fn();
  const source = {
    nativeEvent: { value: true, target: 7 },
    persist,
    preventDefault,
    stopPropagation: jest.fn(),
    isDefaultPrevented: () => false,
  };
  fireEvent(tree.getByRole('switch'), 'change', source);
  expect(change).toHaveBeenCalledTimes(1);
  const event = change.mock.calls[0][0];
  expect(event.nativeEvent).toBe(source.nativeEvent);
  expect(event.target).toMatchObject({ checked: true, value: 'on', name: '', type: 'checkbox' });
  event.preventDefault();
  expect(preventDefault).toHaveBeenCalledTimes(1);
  expect(persist).toHaveBeenCalled();
});

test('focus-visible actions respect fresh overlay ownership and disabled state', async () => {
  const actions = React.createRef<any>();
  const model = new NativeCheckedModel();
  model.props = { action: actions };
  await model.mount();
  const entry = {
    id: Symbol(),
    host: Symbol(),
    open: true,
    restore: false,
    contains: () => false,
    focus() {},
    escape() {},
  } satisfies NativeModalEntry;
  await act(async () => manager.add(entry));
  await act(async () => actions.current!.focusVisible());
  expect(model.current).toBe(null);
  await act(async () => manager.remove(entry));
  model.props.disabled = true;
  await act(async () => model.tree!.rerender(model.element()));
  await act(async () => actions.current!.focusVisible());
  expect(model.current).toBe(null);
});
test('rich labels associate their retained native Switch with visible text', () => {
  const tree = render(
    <FormControlLabel label={<Typography>Mode</Typography>} control={<Switch />} />,
  );
  expect(tree.getByRole('switch').props.accessibilityLabelledBy).toMatch(/^mui-control-label-/);
});

test('input focusable override reaches the actual native input surface', async () => {
  const model = new NativeCheckedModel();
  model.inputProps = { focusable: false };
  await model.mount();
  expect(model.nodes.get('a').props.nativeFocusable).toBe(false);
});
test('custom checked glyphs are hidden from accessibility as a purely visual subtree', () => {
  const tree = render(<Checkbox icon={<Text testID="glyph">Empty</Text>} />);
  let node = tree.getByTestId('glyph', { includeHiddenElements: true }).parent;
  while (node && node.props.pointerEvents !== 'none') node = node.parent;
  expect(node).not.toBe(null);
  expect(node!.props.accessibilityElementsHidden).toBe(true);
  expect(node!.props.importantForAccessibility).toBe('no-hide-descendants');
});
