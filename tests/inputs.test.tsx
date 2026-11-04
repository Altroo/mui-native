import reference from './fixtures/mui-inputs-9.5.0.json';
import React, { forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  I18nManager,
  type ViewInstance,
  type TextInputInstance,
} from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import {
  InputBase,
  Input,
  FilledInput,
  OutlinedInput,
  InputAdornment,
  FormControl,
  InputLabel,
  TextField,
  ThemeProvider,
  createTheme,
  useFormControl,
  type InputRootProps,
  type InputBaseComponentProps,
  type InputBaseOwnerState,
} from '@altroo/mui-native';

test.each([InputBase, Input, FilledInput, OutlinedInput])(
  'native input variants manage values and native events',
  (Component) => {
    const calls: string[] = [];
    render(
      <Component
        aria-label="Edit"
        name="customer"
        id="name"
        defaultValue="Before"
        inputProps={{
          onChange: (e) => {
            expect(e.nativeEvent.text).toBe('After');
            calls.push('host');
          },
        }}
        onChange={(e) => {
          expect(e.target).toEqual({ value: 'After', name: 'customer', id: 'name' });
          calls.push('mui');
        }}
        onChangeText={() => calls.push('text')}
      />,
    );
    fireEvent(screen.getByLabelText('Edit'), 'change', { nativeEvent: { text: 'After' } });
    expect(screen.getByLabelText('Edit').props.value).toBe('After');
    expect(calls).toEqual(['host', 'mui', 'text']);
  },
);
test('inputProps and input slot precedence preserve controlled values and read-only guards', () => {
  const { rerender } = render(
    <InputBase
      aria-label="Controlled"
      value="Top"
      inputProps={{ value: 'Host' }}
      slotProps={{ input: { value: 'Slot' } }}
    />,
  );
  fireEvent(screen.getByLabelText('Controlled'), 'change', { nativeEvent: { text: 'Ignored' } });
  expect(screen.getByLabelText('Controlled').props.value).toBe('Slot');
  rerender(
    <InputBase
      aria-label="Controlled"
      value="Top"
      disabled
      readOnly
      inputProps={{ editable: true, readOnly: false }}
    />,
  );
  expect(screen.getByLabelText('Controlled').props).toEqual(
    expect.objectContaining({
      editable: false,
      accessibilityState: expect.objectContaining({ disabled: true }),
    }),
  );
});
test('adornments share one outline and editable hosts remain borderless', () => {
  render(
    <OutlinedInput
      testID="root"
      aria-label="Amount"
      startAdornment={<InputAdornment position="start">$</InputAdornment>}
      endAdornment={<InputAdornment position="end">USD</InputAdornment>}
    />,
  );
  expect(screen.getByText('$')).toBeTruthy();
  expect(screen.getByText('USD')).toBeTruthy();
  expect(screen.getByTestId('root')).toHaveStyle({
    flexDirection: 'row',
    paddingLeft: 14,
    paddingRight: 14,
  });
  expect(screen.getByLabelText('Amount')).not.toHaveStyle({ borderWidth: 1 });
});
test('FormControl exposes fill/focus state, updates labels and keeps custom hosts isolated', () => {
  let state: ReturnType<typeof useFormControl>;
  let hostState: ReturnType<typeof useFormControl>;
  function Probe() {
    state = useFormControl();
    return null;
  }
  const Host = forwardRef<
    TextInputInstance,
    InputBaseComponentProps & { ownerState?: InputBaseOwnerState }
  >(({ ownerState: _o, ...props }, ref) => {
    hostState = useFormControl();
    return <TextInput {...props} ref={ref} />;
  });
  const { rerender } = render(
    <FormControl color="secondary" size="small">
      <InputLabel>Label</InputLabel>
      <Input aria-label="Field" slots={{ input: Host }} />
      <Probe />
    </FormControl>,
  );
  expect(state).toEqual(expect.objectContaining({ focused: false, filled: false, size: 'small' }));
  expect(hostState).toBeUndefined();
  fireEvent(screen.getByLabelText('Field'), 'focus', { nativeEvent: {} });
  expect(state?.focused).toBe(true);
  expect(screen.getByText('Label')).toHaveStyle({ color: '#9c27b0' });
  fireEvent(screen.getByLabelText('Field'), 'change', { nativeEvent: { text: 'Filled' } });
  expect(state?.filled).toBe(true);
  fireEvent(screen.getByLabelText('Field'), 'change', { nativeEvent: { text: '' } });
  expect(state?.filled).toBe(false);
  rerender(
    <FormControl disabled>
      <InputLabel>Label</InputLabel>
      <Input aria-label="Field" />
      <Probe />
    </FormControl>,
  );
  expect(state?.focused).toBe(false);
  expect(screen.getByText('Label')).toHaveStyle({ color: 'rgba(0, 0, 0, 0.38)' });
});
test('native root and host refs compose and root-padding touches focus once', () => {
  const instance = { focus: jest.fn() } as unknown as TextInputInstance;
  const rootInstance = { measure: jest.fn() } as unknown as ViewInstance;
  const Root = forwardRef<ViewInstance, InputRootProps & { ownerState?: InputBaseOwnerState }>(
    ({ ownerState: _o, ...props }, ref) => {
      useImperativeHandle(ref, () => rootInstance);
      return <View {...props} />;
    },
  );
  const Host = forwardRef<
    TextInputInstance,
    InputBaseComponentProps & { ownerState?: InputBaseOwnerState }
  >(({ ownerState: _o, ...props }, ref) => {
    useImperativeHandle(ref, () => instance);
    return <TextInput {...props} />;
  });
  const root = React.createRef<ViewInstance>();
  const slotRoot = React.createRef<ViewInstance>();
  const input = React.createRef<TextInputInstance>();
  const slotInput = React.createRef<TextInputInstance>();
  const inputPropsRef = React.createRef<TextInputInstance>();
  const { unmount } = render(
    <InputBase
      ref={root}
      inputRef={input}
      testID="root"
      slots={{ root: Root, input: Host }}
      inputProps={{ ref: inputPropsRef }}
      slotProps={{ root: { ref: slotRoot }, input: { ref: slotInput } }}
    />,
  );
  expect(root.current).toBe(rootInstance);
  expect(slotRoot.current).toBe(rootInstance);
  for (const ref of [input, slotInput, inputPropsRef]) expect(ref.current).toBe(instance);
  fireEvent(screen.getByTestId('root'), 'touchEnd', { target: 1, currentTarget: 1 });
  expect(instance.focus).toHaveBeenCalledTimes(1);
  fireEvent(screen.getByTestId('root'), 'touchEnd', { target: 2, currentTarget: 1 });
  expect(instance.focus).toHaveBeenCalledTimes(1);
  unmount();
  for (const ref of [root, slotRoot, input, slotInput, inputPropsRef])
    expect(ref.current).toBeNull();
});
test('multiline rows bound content-driven height and fixed rows win', () => {
  const { rerender } = render(<InputBase aria-label="Notes" multiline minRows={2} maxRows="4" />);
  expect(screen.getByLabelText('Notes')).toHaveStyle({ minHeight: 48, maxHeight: 96 });
  fireEvent(screen.getByLabelText('Notes'), 'contentSizeChange', {
    nativeEvent: { contentSize: { height: 80, width: 100 } },
  });
  expect(screen.getByLabelText('Notes')).toHaveStyle({ height: 80 });
  fireEvent(screen.getByLabelText('Notes'), 'contentSizeChange', {
    nativeEvent: { contentSize: { height: 150, width: 100 } },
  });
  expect(screen.getByLabelText('Notes')).toHaveStyle({ height: 96 });
  rerender(<InputBase aria-label="Notes" multiline rows={2} minRows={1} maxRows={10} />);
  expect(screen.getByLabelText('Notes')).toHaveStyle({ height: 48, maxHeight: 48 });
});
test('variant and InputBase defaults/overrides reach TextField through the shared engine', () => {
  const theme = createTheme({
    components: {
      MuiInputBase: {
        defaultProps: { placeholder: 'Base' },
        styleOverrides: { input: { fontSize: 20 } },
      },
      MuiOutlinedInput: {
        defaultProps: { size: 'small' },
        styleOverrides: { root: { marginTop: 3 }, input: { color: '#123456' } },
      },
    },
  });
  render(
    <ThemeProvider theme={theme}>
      <TextField label="Themed" slotProps={{ input: { size: 'small', testID: 'unused-root' } }} />
    </ThemeProvider>,
  );
  expect(screen.getByLabelText('Themed').props.placeholder).toBe('Base');
  expect(screen.getByLabelText('Themed')).toHaveStyle({
    fontSize: 20,
    lineHeight: 30,
    color: '#123456',
  });
});
test('notched outline receives required label and focus/fill state with explicit override', () => {
  const outline = jest.fn();
  const Outline = forwardRef<
    ViewInstance,
    import('../packages/material/src').NotchedOutlineProps & { ownerState?: InputBaseOwnerState }
  >((props, _ref) => {
    outline(props);
    return null;
  });
  const { rerender } = render(
    <OutlinedInput label="Name" required aria-label="Name" slots={{ notchedOutline: Outline }} />,
  );
  expect(outline.mock.lastCall[0].notched).toBe(false);
  expect(React.Children.toArray(outline.mock.lastCall[0].label.props.children)).toEqual([
    'Name',
    '\u2009',
    '*',
  ]);
  fireEvent(screen.getByLabelText('Name'), 'focus', { nativeEvent: {} });
  expect(outline.mock.lastCall[0].notched).toBe(true);
  rerender(
    <OutlinedInput
      label="Name"
      required
      aria-label="Name"
      notched={false}
      slots={{ notchedOutline: Outline }}
      slotProps={{ notchedOutline: { label: 'Custom' } }}
    />,
  );
  expect(outline.mock.lastCall[0]).toEqual(
    expect.objectContaining({ label: 'Custom', notched: false }),
  );
});
test('underline toggles and filled hidden-label spacing are implemented without host prop leakage', () => {
  const { unmount } = render(
    <FilledInput testID="root" aria-label="Filled" hiddenLabel disableUnderline />,
  );
  expect(screen.getByTestId('root')).toHaveStyle({ backgroundColor: 'rgba(0, 0, 0, 0.04)' });
  expect(screen.getByLabelText('Filled')).toHaveStyle({ paddingTop: 16, paddingBottom: 16 });
  expect(screen.getByLabelText('Filled').props.disableUnderline).toBeUndefined();
  unmount();
  render(<InputBase aria-label="Filled" />);
  expect(screen.getByLabelText('Filled')).toHaveStyle({ paddingTop: 0, paddingBottom: 0 });
});

const components = { InputBase, Input, FilledInput, OutlinedInput };
test.each(reference.fixtures)(
  'native routing and handler precedence match pinned $component',
  (expected) => {
    const Component = components[expected.component as keyof typeof components];
    const events: string[] = [];
    render(
      <Component
        aria-label="Reference"
        name="name"
        id="field"
        defaultValue="Ada"
        inputProps={{ onChange: () => events.push('baseHost') }}
        slotProps={{ input: { onChange: () => events.push('slotHost') } }}
        onChange={() => events.push('mui')}
      />,
    );
    expect(screen.getByLabelText('Reference').props.value).toBe(expected.initial);
    expect(screen.getByLabelText('Reference').props.nativeID).toBe(expected.id);
    fireEvent(screen.getByLabelText('Reference'), 'change', { nativeEvent: { text: 'Edited' } });
    expect(events).toEqual(expected.events);
  },
);
function text(node: React.ReactNode): string {
  return typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : React.isValidElement<{ children?: React.ReactNode }>(node)
      ? React.Children.toArray(node.props.children).map(text).join('')
      : '';
}
test.each(reference.outlines)(
  'native outline label and override follow pinned input %j',
  ({ input, output }) => {
    let result: unknown;
    const Outline = forwardRef<
      ViewInstance,
      import('../packages/material/src').NotchedOutlineProps & { ownerState?: InputBaseOwnerState }
    >((props, _ref) => {
      result = { label: text(props.label), notched: props.notched };
      return null;
    });
    render(
      <OutlinedInput
        required={input.required}
        label={input.label}
        notched={input.notched}
        slots={{ notchedOutline: Outline }}
        slotProps={'override' in input ? { notchedOutline: { label: input.override } } : undefined}
      />,
    );
    expect(result).toEqual(output);
  },
);
test('default outline measures a bounded label gap without exposing hidden text to accessibility', () => {
  render(
    <OutlinedInput
      label="Reserved"
      notched
      slotProps={{ notchedOutline: { testID: 'outline' } }}
    />,
  );
  const outline = screen.getByTestId('outline', { includeHiddenElements: true });
  fireEvent(outline, 'layout', { nativeEvent: { layout: { width: 200 } } });
  fireEvent(screen.getByText('Reserved', { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { width: 60 } },
  });
  expect(outline.props.accessibilityElementsHidden).toBe(true);
  expect(outline).toHaveStyle({ borderWidth: 0 });
  const segments = outline.findAll((node) => node.props.style?.start === 82);
  expect(segments.length).toBeGreaterThan(0);
});

test.each(['MuiInputBase', 'MuiOutlinedInput'])(
  'TextField protects managed values from %s theme slot defaults',
  (component) => {
    const theme = createTheme({
      components: {
        [component]: {
          defaultProps: {
            slotProps: { input: { value: 'Host default', defaultValue: 'Host initial' } },
          },
        },
      },
    });
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <TextField label="Managed" value="Root value" />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('Managed').props.value).toBe('Root value');
    rerender(
      <ThemeProvider theme={theme}>
        <TextField label="Managed" value="Next value" />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('Managed').props.value).toBe('Next value');
  },
);
test('disabling a focused TextField requests native blur, forwards the real event once and clears slot focus', () => {
  const nativeBlur = { nativeEvent: { target: 12 } };
  let deliverBlur: (() => void) | undefined;
  const blur = jest.fn(() => deliverBlur?.());
  const topBlur = jest.fn();
  const hostBlur = jest.fn();
  const Host = forwardRef<TextInputInstance, InputBaseComponentProps & { ownerState?: object }>(
    ({ ownerState: _o, sx: _s, ...props }, ref) => {
      deliverBlur = () =>
        props.onBlur?.(nativeBlur as Parameters<NonNullable<typeof props.onBlur>>[0]);
      useImperativeHandle(ref, () => ({ blur }) as unknown as TextInputInstance);
      return <TextInput {...props} />;
    },
  );
  const field = (disabled: boolean) => (
    <TextField
      label="Transition"
      disabled={disabled}
      slots={{ htmlInput: Host }}
      onBlur={topBlur}
      slotProps={{
        htmlInput: (state) => ({
          onBlur: hostBlur,
          selectionColor: state.focused ? 'red' : 'blue',
        }),
      }}
    />
  );
  const { rerender } = render(field(false));
  expect(blur).not.toHaveBeenCalled();
  fireEvent(screen.getByLabelText('Transition'), 'focus', { nativeEvent: { target: 12 } });
  expect(screen.getByLabelText('Transition').props.selectionColor).toBe('red');
  rerender(field(true));
  expect(blur).toHaveBeenCalledTimes(1);
  expect(topBlur).toHaveBeenCalledTimes(1);
  expect(hostBlur).toHaveBeenCalledTimes(1);
  expect(topBlur).toHaveBeenCalledWith(nativeBlur);
  expect(hostBlur).toHaveBeenCalledWith(nativeBlur);
  expect(screen.getByLabelText('Transition').props.selectionColor).toBe('blue');
  rerender(field(false));
  expect(screen.getByLabelText('Transition').props.selectionColor).toBe('blue');
  expect(blur).toHaveBeenCalledTimes(1);
});

test.each(['field', 'slot'] as const)(
  'disabled logical focus clears for %s before delayed native blur',
  (source) => {
    let deliverBlur: (() => void) | undefined;
    const blur = jest.fn();
    const onBlur = jest.fn();
    const Host = forwardRef<TextInputInstance, InputBaseComponentProps & { ownerState?: object }>(
      ({ ownerState: _o, sx: _s, ...props }, ref) => {
        deliverBlur = () =>
          props.onBlur?.({ nativeEvent: { target: 12 } } as Parameters<
            NonNullable<typeof props.onBlur>
          >[0]);
        useImperativeHandle(ref, () => ({ blur }) as unknown as TextInputInstance);
        return <TextInput {...props} />;
      },
    );
    const field = (disabled: boolean) => (
      <TextField
        label="Delayed"
        disabled={source === 'field' ? disabled : undefined}
        slots={{ htmlInput: Host }}
        onBlur={onBlur}
        slotProps={{
          input: { disabled: source === 'slot' ? disabled : undefined },
          htmlInput: (state) => ({ selectionColor: state.focused ? 'red' : 'blue' }),
        }}
      />
    );
    const { rerender } = render(field(true));
    expect(blur).not.toHaveBeenCalled();
    rerender(field(false));
    fireEvent(screen.getByLabelText('Delayed'), 'focus', { nativeEvent: { target: 12 } });
    rerender(field(true));
    expect(blur).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Delayed').props.selectionColor).toBe('blue');
    expect(onBlur).not.toHaveBeenCalled();
    rerender(field(false));
    expect(screen.getByLabelText('Delayed').props.selectionColor).toBe('blue');
    // fireEvent filters blur for non-editable inputs; simulate native delivery directly.
    act(() => deliverBlur?.());
    expect(onBlur).toHaveBeenCalledTimes(1);
    rerender(field(false));
    expect(screen.getByLabelText('Delayed').props.selectionColor).toBe('blue');
  },
);

test('native padding shorthands beat generated edges and multiline bounds include caller insets', () => {
  const { rerender } = render(
    <TextField
      label="Padding"
      slotProps={{ htmlInput: { style: { paddingVertical: 20, paddingHorizontal: 12 } } }}
    />,
  );
  expect(screen.getByLabelText('Padding')).toHaveStyle({
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 12,
    paddingRight: 12,
  });
  rerender(
    <TextField
      label="Padding"
      multiline
      rows={2}
      slotProps={{ htmlInput: { style: { padding: 10, paddingTop: 15 } } }}
    />,
  );
  expect(screen.getByLabelText('Padding')).toHaveStyle({
    paddingTop: 15,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 10,
    minHeight: 73,
    maxHeight: 73,
    height: 73,
  });
});

test('root padding shorthands override generated adornment edges', () => {
  const { rerender } = render(
    <OutlinedInput testID="root-pad" startAdornment="$" style={{ paddingHorizontal: 24 }} />,
  );
  expect(screen.getByTestId('root-pad')).toHaveStyle({ paddingLeft: 24, paddingRight: 24 });
  rerender(
    <OutlinedInput
      testID="root-pad"
      startAdornment="$"
      style={{ padding: 20 }}
      slotProps={{ root: { style: { paddingHorizontal: 30, paddingLeft: 35 } } }}
    />,
  );
  expect(screen.getByTestId('root-pad')).toHaveStyle({
    paddingLeft: 35,
    paddingRight: 30,
    paddingTop: 20,
    paddingBottom: 20,
  });
});
test.each([true, false])('RTL adornment insets respect native left/right swapping: %s', (swap) => {
  const descriptors = Object.getOwnPropertyDescriptors(I18nManager);
  Object.defineProperties(I18nManager, {
    isRTL: { value: true, configurable: true },
    doLeftAndRightSwapInRTL: { value: swap, configurable: true },
  });
  try {
    const { unmount } = render(
      <OutlinedInput testID="rtl-root" aria-label="RTL" startAdornment="$" />,
    );
    expect(screen.getByTestId('rtl-root')).toHaveStyle({
      paddingLeft: swap ? 14 : 0,
      paddingRight: swap ? 0 : 14,
    });
    expect(screen.getByLabelText('RTL')).toHaveStyle({
      paddingLeft: swap ? 0 : 14,
      paddingRight: swap ? 14 : 0,
    });
    unmount();
  } finally {
    for (const key of ['isRTL', 'doLeftAndRightSwapInRTL']) {
      if (descriptors[key]) Object.defineProperty(I18nManager, key, descriptors[key]);
      else Reflect.deleteProperty(I18nManager, key);
    }
  }
});
