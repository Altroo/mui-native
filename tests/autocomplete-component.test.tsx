import React from 'react';
import { View, StyleSheet, type TextInputInstance, type ViewInstance } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import {
  Autocomplete,
  TextField,
  IconButton,
  Chip,
  ThemeProvider,
  createTheme,
  configureDiagnostics,
  useForkRef,
  type AutocompleteProps,
  type AutocompleteRenderInputParams,
  type PopperProps,
} from '@altroo/mui-native';
import { Commands } from '../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';
import { nativeButtonModality } from '../packages/material/src/nativeButtonModality';
let input: AutocompleteRenderInputParams;
let popup: PopperProps;
let inputNode: TextInputInstance | null;
const diagnostics: string[] = [];
const styleWarnings: string[] = [];
let restore: () => void;
beforeEach(() => {
  diagnostics.length = 0;
  styleWarnings.length = 0;
  restore = configureDiagnostics(({ code, message }) => {
    diagnostics.push(code);
    if (code === 'style') styleWarnings.push(message);
  });
  for (const name of ['focus', 'blur', 'setPressed', 'setHotspot'] as const)
    jest.spyOn(Commands, name).mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  restore();
  jest.restoreAllMocks();
});
// The positioning engine has separate measured tests. This slot deliberately
// retains closing children to exercise Autocomplete's transition cache itself.
function PopperSlot(props: PopperProps) {
  popup = props;
  return (
    <View
      testID="popup"
      pointerEvents={props.pointerEvents}
      accessibilityElementsHidden={props.accessibilityElementsHidden}
      style={props.style}
    >
      {props.children as React.ReactNode}
    </View>
  );
}
function Field({ params }: { params: AutocompleteRenderInputParams }) {
  input = params;
  const ref = useForkRef(
    params.slotProps.htmlInput.ref,
    React.useCallback((node: TextInputInstance | null) => {
      inputNode = node;
    }, []),
  );
  const anchor = useForkRef(
    params.slotProps.input.ref,
    React.useCallback((node: ViewInstance | null) => {
      if (node) node.measure = (callback) => callback(0, 0, 300, 56, 0, 0);
    }, []),
  );
  return (
    <TextField
      {...params}
      label="City"
      slotProps={{
        ...params.slotProps,
        input: { ...params.slotProps.input, ref: anchor },
        htmlInput: { ...params.slotProps.htmlInput, ref, testID: 'editor' },
      }}
    />
  );
}
function field<
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
>(props: Partial<AutocompleteProps<string, Multiple, DisableClearable, FreeSolo>> = {}) {
  return (
    <Autocomplete
      options={['Rabat', 'Casablanca', 'Marrakesh']}
      testID="autocomplete"
      slots={{ popper: PopperSlot }}
      renderInput={(params) => <Field params={params} />}
      {...props}
    />
  );
}
function open() {
  fireEvent.press(screen.getByLabelText('Open'));
}
function type(text: string) {
  fireEvent(screen.getByTestId('editor'), 'focus', { nativeEvent: {} });
  fireEvent(screen.getByTestId('editor'), 'change', {
    nativeEvent: { text, eventCount: 1, target: 1 },
  });
}
function pressOption(label: string) {
  fireEvent.press(screen.getByRole('option', { name: label }), { nativeEvent: {} });
}

test('TextField receives real input/anchor refs, native combobox props and a measured popup width', () => {
  render(field());
  expect(input.id).toMatch(/^mui-native-autocomplete-/);
  expect(input.fullWidth).toBe(true);
  expect(inputNode).toBeTruthy();
  expect(screen.getByTestId('editor').props.role).toBe('combobox');
  open();
  expect(screen.getAllByRole('option')).toHaveLength(3);
  expect(popup.open).toBe(true);
  fireEvent(screen.getByTestId('editor'), 'layout', {
    nativeEvent: { layout: { width: 250, height: 44 } },
  });
  // Only the input container's layout, never the narrower editable child, owns width.
  act(() =>
    input.slotProps.input.slotProps!.root!.onLayout!({
      nativeEvent: { layout: { width: 320, height: 56 } },
    } as any),
  );
  expect(StyleSheet.flatten(popup.style!)!.width).toBe(320);
  expect(diagnostics).not.toContain('button-classes');
  expect(styleWarnings).toEqual([]);
});
test('filtering and selecting retain callback events, reasons, details and the selected label', () => {
  const change = jest.fn(),
    close = jest.fn(),
    inputChange = jest.fn();
  render(field({ onChange: change, onClose: close, onInputChange: inputChange }));
  type('casa');
  expect(screen.getAllByRole('option')).toHaveLength(1);
  pressOption('Casablanca');
  expect(change).toHaveBeenCalledWith(expect.anything(), 'Casablanca', 'selectOption', {
    option: 'Casablanca',
  });
  expect(close).toHaveBeenLastCalledWith(expect.anything(), 'selectOption');
  expect(screen.getByTestId('editor').props.value).toBe('Casablanca');
  expect(inputChange.mock.calls.map((call) => call.slice(1))).toEqual([
    ['casa', 'input'],
    ['Casablanca', 'selectOption'],
  ]);
});
test('controlled mapped selection requests do not mutate the caller value', () => {
  const change = jest.fn();
  const options = [
    { id: 1, label: 'Rabat' },
    { id: 2, label: 'Casablanca' },
  ];
  render(
    <Autocomplete
      options={options}
      getOptionValue={(option) => option.id}
      value={1}
      onChange={change}
      slots={{ popper: PopperSlot }}
      renderInput={(params) => <Field params={params} />}
    />,
  );
  expect(screen.getByTestId('editor').props.value).toBe('Rabat');
  open();
  pressOption('Casablanca');
  expect(change).toHaveBeenCalledWith(expect.anything(), 2, 'selectOption', { option: options[1] });
  expect(screen.getByTestId('editor').props.value).toBe('Rabat');
});
test('multiple values use native Chips, filter selected rows and remove exactly one item', () => {
  const change = jest.fn();
  render(
    field({
      multiple: true,
      defaultValue: ['Rabat', 'Casablanca'],
      filterSelectedOptions: true,
      onChange: change,
    }),
  );
  expect(screen.UNSAFE_getAllByType(Chip)).toHaveLength(2);
  open();
  expect(screen.getAllByRole('option').map((node) => node.props.accessibilityLabel)).toHaveLength(
    1,
  );
  act(() => screen.UNSAFE_getAllByType(Chip)[0].props.onDelete({ nativeEvent: {} }));
  expect(change).toHaveBeenLastCalledWith(expect.anything(), ['Casablanca'], 'removeOption', {
    option: 'Rabat',
  });
  expect(screen.UNSAFE_getAllByType(Chip)).toHaveLength(1);
  expect(diagnostics).not.toContain('chip-classes');
});
test('readonly multiple values cannot be deleted and do not show clear controls', () => {
  render(field({ multiple: true, defaultValue: ['Rabat'], readOnly: true }));
  expect(screen.UNSAFE_getByType(Chip).props.onDelete).toBeUndefined();
  expect(screen.queryByLabelText('Clear')).toBeNull();
  expect(screen.getByTestId('editor').props.editable).toBe(false);
});
test('limitTags never mutates a renderer-owned frozen array and expands on focus', () => {
  const values = Object.freeze([<Chip key="a" label="First" />, <Chip key="b" label="Second" />]);
  render(
    field({
      multiple: true,
      defaultValue: ['Rabat', 'Casablanca'],
      limitTags: 1,
      renderValue: () => values,
    }),
  );
  expect(screen.getByText('+1')).toBeTruthy();
  expect(values).toHaveLength(2);
  fireEvent(screen.getByTestId('editor'), 'focus', { nativeEvent: {} });
  expect(screen.getByText('Second')).toBeTruthy();
  expect(screen.queryByText('+1')).toBeNull();
});
test('renderValue receives scalar mapped values and usable native item bindings', () => {
  let rendered: unknown;
  render(
    <Autocomplete
      options={[{ id: 3, label: 'Rabat' }]}
      value={3}
      getOptionValue={(option) => option.id}
      renderValue={(value, getItemProps) => {
        rendered = value;
        const { className, ...props } = getItemProps();
        return <Chip {...props} label={'City ' + value} />;
      }}
      renderInput={(params) => <Field params={params} />}
      slots={{ popper: PopperSlot }}
    />,
  );
  expect(rendered).toBe(3);
  expect(screen.getByText('City 3')).toBeTruthy();
  expect(screen.getByTestId('editor').props.value).toBe('');
});
test('loading, no options and free solo suppress empty popup content as in MUI', () => {
  const { rerender } = render(field({ options: [], open: true, loading: true }));
  expect(screen.getByText('Loading…')).toBeTruthy();
  rerender(field({ options: [], open: true }));
  expect(screen.getByText('No options')).toBeTruthy();
  rerender(field({ options: [], open: true, freeSolo: true }));
  expect(screen.queryByTestId('popup')).toBeNull();
  rerender(
    field({
      options: [],
      open: true,
      freeSolo: true,
      slotProps: { popper: () => ({ keepMounted: true }) },
    }),
  );
  expect(screen.getByTestId('popup')).toBeTruthy();
  expect(screen.queryByText('No options')).toBeNull();
});
test('closing rows preserve the previous grouping mode and become inaccessible/inert', () => {
  const change = jest.fn();
  const { rerender } = render(
    field({ open: true, groupBy: (option) => option[0], onChange: change }),
  );
  expect(screen.getByText('R')).toBeTruthy();
  const row = screen.getByRole('option', { name: 'Rabat' });
  rerender(field({ open: false, groupBy: undefined, onChange: change }));
  expect(screen.getByTestId('popup', { includeHiddenElements: true }).props.pointerEvents).toBe(
    'none',
  );
  expect(screen.queryByRole('option')).toBeNull();
  fireEvent.press(row);
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByText('R', { includeHiddenElements: true })).toBeTruthy();
  rerender(field({ options: [], open: true, freeSolo: true }));
  expect(screen.queryByTestId('popup')).toBeNull();
});
test('resolved slot callbacks and native refs receive current owner state', () => {
  let owner: any;
  const custom = React.createRef<ViewInstance>();
  const { rerender } = render(
    field({
      open: true,
      value: 'Rabat',
      slotProps: {
        root: (state) => {
          owner = state;
          return { ref: custom, testID: 'root-slot', sx: { opacity: 0.7 } };
        },
        popper: (state) => ({ testID: state.popupOpen ? 'shown' : 'hidden' }),
        listbox: { testID: 'rows' },
        status: { testID: 'status' },
      },
    }),
  );
  expect(custom.current).toBeTruthy();
  expect(owner).toMatchObject({
    popupOpen: true,
    hasClearIcon: true,
    hasPopupIcon: true,
    inputFocused: true,
  });
  expect(screen.getByTestId('rows')).toBeTruthy();
  expect(screen.getByTestId('status').props.accessibilityLiveRegion).toBe('polite');
  rerender(field({ disabled: true, open: false, value: 'Rabat' }));
  expect(custom.current).toBeNull();
});
test('MuiAutocomplete theme defaults, named overrides and RTL reach the native popup', () => {
  const theme = createTheme({
    direction: 'rtl',
    components: {
      MuiAutocomplete: {
        defaultProps: { openText: 'Choose' },
        styleOverrides: { root: { minWidth: 240 }, option: { minHeight: 54 } },
      },
    },
  });
  render(<ThemeProvider theme={theme}>{field()}</ThemeProvider>);
  expect(StyleSheet.flatten(screen.getByTestId('autocomplete').props.style).minWidth).toBe(240);
  fireEvent.press(screen.getByLabelText('Choose'));
  expect(popup.direction).toBe('rtl');
  expect(StyleSheet.flatten(screen.getAllByRole('option')[0].props.style).minHeight).toBe(54);
});

test('option focused selectors apply only to the highlighted row', () => {
  const theme = createTheme({
    components: {
      MuiAutocomplete: {
        styleOverrides: {
          option: { '&.Mui-focused': { borderWidth: 3 } },
        },
      },
    },
  });
  render(<ThemeProvider theme={theme}>{field({ open: true })}</ThemeProvider>);
  fireEvent(screen.getByTestId('editor'), 'focus', { nativeEvent: {} });
  expect(
    screen.getAllByRole('option').every((row) => !StyleSheet.flatten(row.props.style).borderWidth),
  ).toBe(true);
  fireEvent(screen.getAllByRole('option')[1], 'hoverIn', { nativeEvent: {} });
  expect(
    screen
      .getAllByRole('option')
      .map((row) => StyleSheet.flatten(row.props.style).borderWidth ?? 0),
  ).toEqual([0, 3, 0]);
});
test('indicator style callbacks receive live pressed state', () => {
  const style = jest.fn(({ pressed }) => ({ opacity: pressed ? 0.4 : 0.9 }));
  render(field({ slotProps: { popupIndicator: { style } } }));
  const indicator = screen.UNSAFE_getByType(IconButton);
  const result = indicator.props.style({ pressed: true, disabled: false, focusVisible: true });
  expect(style).toHaveBeenCalledWith(
    expect.objectContaining({ pressed: true, focusVisible: true }),
  );
  expect(StyleSheet.flatten(result).opacity).toBe(0.4);
});
test('custom Chip refs and focus callbacks preserve internal registration', () => {
  const ref = jest.fn(),
    focus = jest.fn(),
    owners: any[] = [];
  const { unmount } = render(
    field({
      multiple: true,
      defaultValue: ['Rabat', 'Casablanca'],
      slotProps: {
        chip: { ref, onFocus: focus },
        root: (state) => {
          owners.push(state);
          return {};
        },
      },
    }),
  );
  expect(ref.mock.calls.filter(([node]) => node != null)).toHaveLength(2);
  fireEvent(screen.UNSAFE_getAllByType(Chip)[1], 'focus', { nativeEvent: {} });
  expect(focus).toHaveBeenCalledTimes(1);
  expect(owners.at(-1).inputFocused).toBe(false);
  expect(input.slotProps.htmlInput.value).toBe('');
  unmount();
  expect(ref.mock.calls.filter(([node]) => node == null)).toHaveLength(2);
});
test('custom paper receives the same owner state as resolved slot props', () => {
  let paperOwner: any;
  const Paper = ({ ownerState, children }: any) => {
    paperOwner = ownerState;
    return <View>{children}</View>;
  };
  render(field({ open: true, slots: { popper: PopperSlot, paper: Paper } }));
  expect(paperOwner).toMatchObject({ popupOpen: true, hasPopupIcon: true, size: 'medium' });
});

test('the authored id identifies only the editable input rather than duplicating the root id', () => {
  render(field({ id: 'destination' }));
  expect(screen.getByTestId('editor').props.nativeID).toBe('destination');
  expect(screen.getByTestId('autocomplete').props.nativeID).not.toBe('destination');
});

test.each([
  { name: 'missing', root: {}, opacity: 0.4 },
  { name: 'undefined', root: { sx: undefined }, opacity: 1 },
  { name: 'null', root: { sx: null }, opacity: 1 },
])('root slot sx preserves explicit $name precedence', ({ root, opacity }) => {
  render(field({ sx: { opacity: 0.4 }, slotProps: { root } }));
  expect(StyleSheet.flatten(screen.getByTestId('autocomplete').props.style).opacity ?? 1).toBe(
    opacity,
  );
});

test('read-only indicator preserves the disabled binding exposed by the hook', () => {
  render(field({ readOnly: true }));
  expect(screen.getByLabelText('Open').props.accessibilityState.disabled).toBe(true);
});

test('custom value rendering retains explicit per-item disabled metadata', () => {
  render(
    field({
      multiple: true,
      defaultValue: ['Rabat'],
      renderValue: (_values, getItemProps) => {
        const { key, ...item } = getItemProps({ index: 0, disabled: true });
        return <Chip key={key} {...item} label="Locked city" />;
      },
    }),
  );
  expect(screen.UNSAFE_getByType(Chip).props.disabled).toBe(true);
});

test('editor keyboard navigation reveals focus on a selected Chip after pointer input', () => {
  const visible = jest.fn(),
    chip = React.createRef<ViewInstance>();
  render(
    field({
      multiple: true,
      defaultValue: ['Rabat', 'Casablanca'],
      slotProps: { chip: { ref: chip, onFocusVisible: visible } },
    }),
  );
  nativeButtonModality.pointer();
  fireEvent(screen.getByTestId('autocomplete'), 'keyDown', {
    target: inputNode,
    currentTarget: inputNode,
    nativeEvent: {
      key: 'ArrowLeft',
      code: 'ArrowLeft',
      muiKeySource: 'hardware',
      isEditable: true,
      isComposing: false,
      isCanceled: false,
    },
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  });
  expect(Commands.focus).toHaveBeenCalled();
  fireEvent(screen.getByRole('button', { name: 'Casablanca' }), 'MUIFocus', {
    target: chip.current,
    currentTarget: chip.current,
    nativeEvent: {},
  });
  expect(visible).toHaveBeenCalledTimes(1);
});

test.each([{ isComposing: true }, { isCanceled: true }])(
  'an invalid key cannot establish keyboard focus visibility: %o',
  (metadata) => {
    const visible = jest.fn(),
      chip = React.createRef<ViewInstance>();
    render(
      field({
        multiple: true,
        defaultValue: ['Rabat'],
        slotProps: { chip: { ref: chip, onFocusVisible: visible } },
      }),
    );
    nativeButtonModality.pointer();
    fireEvent(screen.getByTestId('autocomplete'), 'keyDown', {
      target: inputNode,
      currentTarget: inputNode,
      nativeEvent: {
        key: 'ArrowLeft',
        code: 'ArrowLeft',
        muiKeySource: 'hardware',
        isEditable: true,
        ...metadata,
      },
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    });
    expect(Commands.focus).not.toHaveBeenCalled();
    fireEvent(screen.getByRole('button', { name: 'Rabat' }), 'MUIFocus', {
      target: chip.current,
      currentTarget: chip.current,
      nativeEvent: {},
    });
    expect(visible).not.toHaveBeenCalled();
  },
);
