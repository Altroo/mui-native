import reference from './fixtures/mui-textfield-slots-9.5.0.json';
import React, { forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  type ViewInstance,
  type TextInputInstance,
  type TextInstance,
} from 'react-native';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import {
  TextField,
  FormControl,
  InputLabel,
  FormHelperText,
  NativeTextFieldInput,
  ThemeProvider,
  createTheme,
  type TextFieldRootSlotProps,
  type TextFieldInputSlotProps,
  type TextFieldHtmlInputSlotProps,
  type TextFieldLabelSlotProps,
  type TextFieldOwnerState,
} from '@altroo/mui-native';
type Owned<P> = P & { ownerState?: TextFieldOwnerState };

test('all five slots mount distinctly, receive live state and retain form context', () => {
  const root = jest.fn();
  const input = jest.fn();
  const host = jest.fn();
  const Root = forwardRef<ViewInstance, Owned<TextFieldRootSlotProps>>(
    (
      { ownerState, disabled: _d, error: _e, required: _r, fullWidth: _w, sx: _s, ...props },
      ref,
    ) => {
      root(ownerState);
      return <View {...props} ref={ref} />;
    },
  );
  const Input = forwardRef<ViewInstance, Owned<TextFieldInputSlotProps>>((props, ref) => {
    input(props.ownerState);
    return <NativeTextFieldInput {...props} ref={ref} />;
  });
  const Host = forwardRef<TextInputInstance, Owned<TextFieldHtmlInputSlotProps>>(
    ({ ownerState, ...props }, ref) => {
      host(ownerState);
      return <TextInput {...props} ref={ref} />;
    },
  );
  const Label = forwardRef<TextInstance, Owned<TextFieldLabelSlotProps>>(
    ({ ownerState: _o, ...props }, ref) => <InputLabel {...props} ref={ref} testID="label-slot" />,
  );
  const Helper = forwardRef<TextInstance, Owned<TextFieldLabelSlotProps>>(
    ({ ownerState: _o, ...props }, ref) => (
      <FormHelperText {...props} ref={ref} testID="helper-slot" />
    ),
  );
  render(
    <TextField
      label="Name"
      helperText="Required"
      required
      error
      slots={{
        root: Root,
        input: Input,
        htmlInput: Host,
        inputLabel: Label,
        formHelperText: Helper,
      }}
      slotProps={{
        root: { testID: 'root' },
        input: { style: { padding: 3 } },
        htmlInput: { testID: 'host' },
      }}
    />,
  );
  expect(screen.getByTestId('label-slot')).toHaveTextContent('Name *');
  expect(screen.getByTestId('helper-slot')).toHaveStyle({ color: '#d32f2f' });
  expect(screen.getByTestId('root')).toHaveStyle({ gap: 0 });
  expect(screen.getByTestId('host').props.ownerState).toBeUndefined();
  fireEvent(screen.getByTestId('host'), 'focus', { nativeEvent: {} });
  for (const slot of [root, input, host])
    expect(slot).toHaveBeenLastCalledWith(
      expect.objectContaining({ focused: true, required: true, error: true }),
    );
  fireEvent(screen.getByTestId('host'), 'blur', { nativeEvent: {} });
  expect(input).toHaveBeenLastCalledWith(expect.objectContaining({ focused: false }));
});
test('MUI input handlers replace top handlers while htmlInput handlers receive native events in order', () => {
  const order: string[] = [];
  const top = jest.fn();
  const event = { nativeEvent: { text: 'Next' } };
  render(
    <TextField
      label="Edit"
      name="name"
      id="field"
      defaultValue="Before"
      onChange={top}
      onChangeText={() => order.push('text')}
      slotProps={{
        input: {
          onChange: (e) => {
            expect(e.target).toEqual({ name: 'name', id: 'field', value: 'Next' });
            order.push('input');
          },
        },
        htmlInput: {
          onChange: (e) => {
            expect(e).toBe(event);
            order.push('native');
          },
          onChangeText: () => order.push('nativeText'),
        },
      }}
    />,
  );
  fireEvent(screen.getByLabelText('Edit'), 'change', event);
  expect(screen.getByLabelText('Edit').props.value).toBe('Next');
  expect(order).toEqual(['input', 'text', 'native', 'nativeText']);
  expect(top).not.toHaveBeenCalled();
});
test('input and host customization cannot replace controlled value or weaken disabled/read-only aliases', () => {
  const { rerender } = render(
    <TextField
      label="Locked"
      disabled
      value="Controlled"
      slotProps={{
        input: { disabled: false, editable: true },
        htmlInput: { readOnly: false, editable: true, value: 'Wrong' },
      }}
    />,
  );
  expect(screen.getByLabelText('Locked').props).toEqual(
    expect.objectContaining({
      value: 'Controlled',
      editable: false,
      accessibilityState: { disabled: true },
    }),
  );
  rerender(
    <TextField
      label="Locked"
      value="Controlled"
      readOnly
      slotProps={{ input: { readOnly: false }, htmlInput: { readOnly: false, editable: true } }}
    />,
  );
  expect(screen.getByLabelText('Locked').props.editable).toBe(false);
});
test('theme slot defaults merge with caller slots and resolved callback styles', () => {
  const Root = forwardRef<ViewInstance, Owned<TextFieldRootSlotProps>>(
    ({ ownerState: _o, ...props }, ref) => <FormControl {...props} ref={ref} />,
  );
  const theme = createTheme({
    components: {
      MuiTextField: {
        defaultProps: {
          slots: { root: Root },
          slotProps: { root: { testID: 'theme-root' }, htmlInput: { placeholder: 'Theme' } },
        },
      },
    },
  });
  render(
    <ThemeProvider theme={theme}>
      <TextField
        label="Themed"
        slotProps={{
          root: (state) => ({ sx: { p: state.focused ? 2 : 1 } }),
          htmlInput: { testID: 'host' },
        }}
      />
    </ThemeProvider>,
  );
  expect(screen.getByTestId('theme-root')).toHaveStyle({ padding: 8 });
  expect(screen.getByTestId('host').props.placeholder).toBe('Theme');
  fireEvent(screen.getByTestId('host'), 'focus', { nativeEvent: {} });
  expect(screen.getByTestId('theme-root')).toHaveStyle({ padding: 16 });
});
test('root, input-container, editable-host and text refs compose and clean up on replacement/unmount', () => {
  const rootInstance = { measure: jest.fn() } as unknown as ViewInstance;
  const containerInstance = { measure: jest.fn() } as unknown as ViewInstance;
  const hostInstance = { focus: jest.fn() } as unknown as TextInputInstance;
  const textInstance = { measure: jest.fn() } as unknown as TextInstance;
  const Root = forwardRef<ViewInstance, Owned<TextFieldRootSlotProps>>(
    ({ ownerState: _o, ...props }, ref) => {
      useImperativeHandle(ref, () => rootInstance, [rootInstance]);
      return <FormControl {...props} />;
    },
  );
  const Input = forwardRef<ViewInstance, Owned<TextFieldInputSlotProps>>((props, ref) => {
    useImperativeHandle(ref, () => containerInstance, [containerInstance]);
    return <NativeTextFieldInput {...props} />;
  });
  const Host = forwardRef<TextInputInstance, Owned<TextFieldHtmlInputSlotProps>>(
    ({ ownerState: _o, ...props }, ref) => {
      useImperativeHandle(ref, () => hostInstance, [hostInstance]);
      return <TextInput {...props} />;
    },
  );
  const Label = forwardRef<TextInstance, Owned<TextFieldLabelSlotProps>>(
    ({ ownerState: _o, ...props }, ref) => {
      useImperativeHandle(ref, () => textInstance, [textInstance]);
      return <InputLabel {...props} />;
    },
  );
  const rootRef = React.createRef<ViewInstance>();
  const slotRootRef = React.createRef<ViewInstance>();
  const containerRef = React.createRef<ViewInstance>();
  const inputRef = React.createRef<TextInputInstance>();
  const nestedHostRef = React.createRef<TextInputInstance>();
  const slotInputRef = React.createRef<TextInputInstance>();
  const labelRef = React.createRef<TextInstance>();
  const cleanup = jest.fn();
  const hostRef = jest.fn(() => cleanup);
  const replacement = jest.fn();
  const props = {
    label: 'Refs',
    slots: { root: Root, input: Input, htmlInput: Host, inputLabel: Label },
    ref: rootRef,
    inputRef,
  };
  const { rerender, unmount } = render(
    <TextField
      {...props}
      slotProps={{
        root: { ref: slotRootRef },
        input: { ref: containerRef, inputRef: slotInputRef, inputProps: { ref: nestedHostRef } },
        htmlInput: { ref: hostRef },
        inputLabel: { ref: labelRef },
      }}
    />,
  );
  expect(rootRef.current).toBe(rootInstance);
  expect(slotRootRef.current).toBe(rootInstance);
  expect(containerRef.current).toBe(containerInstance);
  for (const ref of [inputRef, nestedHostRef, slotInputRef]) expect(ref.current).toBe(hostInstance);
  expect(labelRef.current).toBe(textInstance);
  act(() => inputRef.current?.focus());
  expect(hostInstance.focus).toHaveBeenCalledTimes(1);
  rerender(<TextField {...props} slotProps={{ htmlInput: { ref: replacement } }} />);
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(hostRef.mock.calls).toEqual([[hostInstance]]);
  expect(replacement).toHaveBeenCalledWith(hostInstance);
  expect(slotRootRef.current).toBeNull();
  expect(containerRef.current).toBeNull();
  expect(labelRef.current).toBeNull();
  unmount();
  expect(rootRef.current).toBeNull();
  expect(inputRef.current).toBeNull();
  expect(replacement).toHaveBeenLastCalledWith(null);
});
test('explicit accessible names beat slot names, empty labels are omitted, root and host styles remain separate', () => {
  render(
    <TextField
      label=""
      helperText="Help"
      aria-label="Explicit"
      style={{ marginTop: 12 }}
      slotProps={{
        root: { testID: 'root', style: { marginBottom: 4 } },
        htmlInput: { testID: 'host', accessibilityLabel: 'Slot name', style: { fontSize: 30 } },
      }}
    />,
  );
  expect(screen.queryByText('')).toBeNull();
  expect(screen.getByLabelText('Explicit')).toBeTruthy();
  expect(screen.getByTestId('root')).toHaveStyle({ marginTop: 12, marginBottom: 4 });
  expect(screen.getByTestId('host')).toHaveStyle({ fontSize: 30, lineHeight: 43.125 });
});

test('shared focus, blur and text handlers run only once across input and host slots', () => {
  const focus = jest.fn();
  const blur = jest.fn();
  const text = jest.fn();
  render(
    <TextField
      label="Shared"
      onFocus={focus}
      onBlur={blur}
      onChangeText={text}
      slotProps={{ htmlInput: { onFocus: focus, onBlur: blur, onChangeText: text } }}
    />,
  );
  fireEvent(screen.getByLabelText('Shared'), 'focus', { nativeEvent: {} });
  fireEvent(screen.getByLabelText('Shared'), 'blur', { nativeEvent: {} });
  fireEvent(screen.getByLabelText('Shared'), 'change', { nativeEvent: { text: 'New' } });
  expect(focus).toHaveBeenCalledTimes(1);
  expect(blur).toHaveBeenCalledTimes(1);
  expect(text).toHaveBeenCalledTimes(1);
});

test.each(reference.slots)(
  'native slot routing agrees with the pinned MUI structure: $events',
  (expected) => {
    const seen: Record<string, unknown> = {};
    const events: string[] = [];
    const Root = forwardRef<ViewInstance, Owned<TextFieldRootSlotProps>>(
      ({ ownerState, ...props }, ref) => {
        seen.root = {
          disabled: props.disabled,
          error: props.error,
          required: props.required,
          fullWidth: props.fullWidth,
          variant: ownerState?.variant,
        };
        return <FormControl {...props} ref={ref} />;
      },
    );
    const Host = forwardRef<TextInputInstance, Owned<TextFieldHtmlInputSlotProps>>(
      ({ ownerState: _o, ...props }, ref) => <TextInput {...props} ref={ref} />,
    );
    const Input = forwardRef<ViewInstance, Owned<TextFieldInputSlotProps>>((props, ref) => {
      seen.input = {
        value: props.value,
        name: props.name,
        id: props.id,
        htmlInput: props.inputProps?.testID,
        customHost: props.slots?.input === Host,
      };
      return <NativeTextFieldInput {...props} ref={ref} />;
    });
    const Label = forwardRef<TextInstance, Owned<TextFieldLabelSlotProps>>(
      ({ ownerState: _o, ...props }, ref) => {
        seen.label = { children: props.children, id: props.nativeID };
        return <InputLabel {...props} ref={ref} />;
      },
    );
    const Helper = forwardRef<TextInstance, Owned<TextFieldLabelSlotProps>>(
      ({ ownerState: _o, ...props }, ref) => {
        seen.helper = { children: props.children, id: props.nativeID };
        return <FormHelperText {...props} ref={ref} />;
      },
    );
    render(
      <TextField
        label="Name"
        helperText="Help"
        id="customer"
        name="customer"
        value="Ada"
        required
        fullWidth
        slots={{
          root: Root,
          input: Input,
          htmlInput: Host,
          inputLabel: Label,
          formHelperText: Helper,
        }}
        onChange={() => events.push('top')}
        slotProps={{
          htmlInput: { testID: 'host' },
          ...(expected.events[0] === 'input'
            ? { input: { onChange: () => events.push('input') } }
            : {}),
        }}
      />,
    );
    fireEvent(screen.getByTestId('host'), 'change', { nativeEvent: { text: 'New' } });
    expect({ ...seen, events }).toEqual(expected);
  },
);

test.each(reference.inputDefaults)(
  'input container defaults follow original MUI precedence: %j',
  ({ topDefault, slotDefault, value }) => {
    const { rerender } = render(
      <TextField
        label="Defaults"
        defaultValue={topDefault ?? undefined}
        slotProps={{ input: { defaultValue: slotDefault ?? undefined } }}
      />,
    );
    expect(screen.getByLabelText('Defaults').props.value).toBe(value);
    fireEvent(screen.getByLabelText('Defaults'), 'change', { nativeEvent: { text: 'Edited' } });
    expect(screen.getByLabelText('Defaults').props.value).toBe('Edited');
    rerender(<TextField label="Defaults" slotProps={{ input: { defaultValue: 'Later' } }} />);
    expect(screen.getByLabelText('Defaults').props.value).toBe('Edited');
  },
);

test('an editable slot can control value when the outer TextField has no value', () => {
  const change = jest.fn();
  const { rerender } = render(
    <TextField label="Composite" slotProps={{ htmlInput: { value: 'Rabat', onChange: change } }} />,
  );
  expect(screen.getByLabelText('Composite').props.value).toBe('Rabat');
  rerender(
    <TextField
      label="Composite"
      slotProps={{ htmlInput: { value: 'Casablanca', onChange: change } }}
    />,
  );
  expect(screen.getByLabelText('Composite').props.value).toBe('Casablanca');
  const event = { nativeEvent: { text: 'Draft', eventCount: 1, target: 1 } };
  fireEvent(screen.getByLabelText('Composite'), 'change', event);
  expect(change).toHaveBeenCalledWith(event);
  expect(screen.getByLabelText('Composite').props.value).toBe('Casablanca');
});
