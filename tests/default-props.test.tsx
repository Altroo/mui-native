import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  createTheme,
  ThemeProvider,
  DefaultPropsProvider,
  useDefaultProps,
  useThemeProps,
  getThemeProps,
} from '../packages/system/src';
import { resolveDefaultProps } from '../packages/system/src/defaultProps';
import { Button, TextField } from '../packages/material/src';
import { mergeSlotProps } from '../packages/material/src/utils';
import reference from './fixtures/mui-default-props-9.5.0.json';
const canonical = (value: any): any =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value).map(([key, v]) => [
            key,
            key === 'style' ? StyleSheet.flatten(v as any) : canonical(v),
          ]),
        )
      : value;

test.each(reference.cases)(
  'default merge matches pinned MUI: $defaults $props merge=$merge',
  ({ defaults, props, merge, output }) => {
    const before = JSON.stringify({ defaults, props });
    expect(canonical(resolveDefaultProps(defaults, props, merge))).toEqual(output);
    expect(JSON.stringify({ defaults, props })).toBe(before);
  },
);
test.each(reference.callbacks)(
  'deferred default/slot callbacks $defaultFunction/$externalFunction',
  ({ defaultFunction, externalFunction, states }) => {
    const defaults = {
      slotProps: {
        input: defaultFunction
          ? (s: any) => ({ placeholder: s.tag, editable: !s.disabled, style: { color: 'red' } })
          : { placeholder: 'theme', style: { color: 'red' } },
      },
    };
    const props = {
      slotProps: {
        input: externalFunction
          ? (s: any) => ({ value: s.tag, style: { fontSize: 24 } })
          : { value: 'app', style: { fontSize: 24 } },
      },
    };
    const merged = resolveDefaultProps(defaults, props, true).slotProps.input;
    for (const { state, output } of states)
      expect(canonical(typeof merged === 'function' ? merged(state) : merged)).toEqual(output);
  },
);
test.each(reference.slotMerges)(
  'slot utility matches pinned composition $defaultFunction/$externalFunction',
  ({ defaultFunction, externalFunction, output, trace: expectedTrace }) => {
    const trace: any[] = [];
    const defaults = {
      id: 'default',
      className: 'theme',
      style: { color: 'red' },
      sx: { p: 1 },
      onPress: (...args: any[]) => trace.push(['default', ...args]),
    };
    const external = {
      className: 'app',
      style: { fontSize: 24 },
      sx: [{ m: 1 }],
      onPress: (...args: any[]) => trace.push(['external', ...args]),
    };
    const merged = mergeSlotProps(
      externalFunction ? (s: any) => ({ ...external, stateDefaultId: s.id }) : external,
      defaultFunction ? (s: any) => ({ ...defaults, ownerTag: s.tag }) : defaults,
    ) as any;
    const result =
      typeof merged === 'function' ? merged({ tag: 'tag', className: 'owner' }) : merged;
    result.onPress('event', 2);
    expect(JSON.parse(JSON.stringify(canonical(result)))).toEqual(output);
    expect(trace).toEqual(expectedTrace);
  },
);
test('missing defaults preserve props identity; plain props and handlers replace rather than deep merge', () => {
  const press = jest.fn(),
    fallback = jest.fn();
  const props = { onPress: press, sx: { p: 2 }, style: { fontSize: 24 } };
  expect(getThemeProps({ name: 'Absent', props, theme: { components: {} } })).toBe(props);
  const result = resolveDefaultProps(
    { onPress: fallback, sx: { m: 1 }, style: { color: 'red' } },
    props,
  );
  expect(result.onPress).toBe(press);
  expect(result.style).toBe(props.style);
  expect(result.sx).toBe(props.sx);
});
test('provider overrides are independent from system useThemeProps and preserve input props', () => {
  function Probe() {
    const props = { value: undefined };
    const material = useDefaultProps({ name: 'Probe', props });
    const system = useThemeProps({ name: 'Probe', props });
    return <Text>{`${material.value}/${system.value}`}</Text>;
  }
  render(
    <ThemeProvider
      theme={createTheme({ components: { Probe: { defaultProps: { value: 'theme' } } } })}
    >
      <DefaultPropsProvider value={{ Probe: { defaultProps: { value: 'provider' } } }}>
        <Probe />
      </DefaultPropsProvider>
    </ThemeProvider>,
  );
  expect(screen.getByText('provider/theme')).toBeTruthy();
});
test('default provider supports raw configurations and uses replace semantics for nesting', () => {
  function Probe() {
    const p = useDefaultProps({ name: 'Probe', props: { value: undefined } });
    return <Text>{String(p.value)}</Text>;
  }
  render(
    <DefaultPropsProvider value={{ Probe: { value: 'outer' } }}>
      <Probe />
      <DefaultPropsProvider value={{ Probe: { value: 'inner' } }}>
        <Probe />
      </DefaultPropsProvider>
      <DefaultPropsProvider value={undefined}>
        <Probe />
      </DefaultPropsProvider>
    </DefaultPropsProvider>,
  );
  expect(screen.getByText('outer')).toBeTruthy();
  expect(screen.getByText('inner')).toBeTruthy();
  expect(screen.getByText('undefined')).toBeTruthy();
});
test('Material defaults merge slot objects and callbacks see live owner state', () => {
  const slotFocus = jest.fn(),
    topFocus = jest.fn();
  const theme = createTheme({
    components: {
      MuiTextField: {
        defaultProps: {
          slotProps: {
            htmlInput: { placeholder: 'Theme', onFocus: slotFocus },
            inputLabel: { testID: 'theme-label' },
          },
        },
      },
    },
  });
  render(
    <ThemeProvider theme={theme}>
      <TextField
        label="Name"
        helperText="Help"
        onFocus={topFocus}
        slotProps={{
          htmlInput: (state) => ({
            testID: 'field',
            selectionColor: state.focused ? 'red' : 'blue',
          }),
          formHelperText: (state) => ({
            testID: 'helper',
            color: state.error ? 'error' : 'primary',
          }),
        }}
      />
    </ThemeProvider>,
  );
  expect(screen.getByTestId('field').props.placeholder).toBe('Theme');
  expect(screen.getByTestId('field').props.selectionColor).toBe('blue');
  expect(screen.getByTestId('theme-label')).toHaveTextContent('Name');
  fireEvent(screen.getByTestId('field'), 'focus', { nativeEvent: {} });
  expect(topFocus).toHaveBeenCalledTimes(1);
  expect(slotFocus).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('field').props.selectionColor).toBe('red');
});
test('opt-in native style merging preserves arrays and Pressable callback styles', () => {
  const theme = createTheme({
    components: {
      mergeClassNameAndStyle: true,
      MuiButton: { defaultProps: { style: () => ({ minWidth: 90, paddingHorizontal: 30 }) } },
    },
  });
  render(
    <ThemeProvider theme={theme}>
      <Button style={[{ paddingVertical: 20 }, { minWidth: 100 }]}>Merged</Button>
    </ThemeProvider>,
  );
  expect(screen.getByRole('button')).toHaveStyle({
    minWidth: 100,
    paddingLeft: 30,
    paddingRight: 30,
    paddingTop: 20,
    paddingBottom: 20,
  });
});
test('explicit undefined receives a default, null/false/zero remain explicit', () => {
  expect(
    resolveDefaultProps({ a: 1, b: 2, c: 3, d: 4 }, { a: undefined, b: null, c: false, d: 0 }),
  ).toEqual({ a: 1, b: null, c: false, d: 0 });
});
test('special own keys remain data and never alter object prototypes', () => {
  const defaults = JSON.parse(
    '{"__proto__":{"polluted":true},"slotProps":{"__proto__":{"id":"safe"}}}',
  );
  const result: any = resolveDefaultProps(defaults, {});
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(({} as any).polluted).toBeUndefined();
  expect(Object.hasOwn(result, '__proto__')).toBe(true);
});

test('system defaultTheme and explicit themeId choose the appropriate default-prop configuration', () => {
  const fallback = createTheme({ components: { Probe: { defaultProps: { value: 'fallback' } } } });
  const scoped = createTheme({ components: { Probe: { defaultProps: { value: 'scoped' } } } });
  const theme = createTheme({ customScope: scoped } as any);
  function Probe({ themeId }: { themeId?: string }) {
    const p = useThemeProps({
      props: { value: undefined },
      name: 'Probe',
      defaultTheme: fallback,
      themeId,
    });
    return <Text>{String(p.value)}</Text>;
  }
  render(
    <>
      <Probe />
      <ThemeProvider theme={theme}>
        <Probe themeId="customScope" />
        <Probe themeId="missing" />
      </ThemeProvider>
    </>,
  );
  expect(screen.getByText('fallback')).toBeTruthy();
  expect(screen.getByText('scoped')).toBeTruthy();
  expect(screen.getByText('undefined')).toBeTruthy();
});
test('layout, label and control families consume their own default configurations', () => {
  const {
    Stack,
    Card,
    DialogTitle,
    FormControl,
    FormLabel,
    InputLabel,
    Checkbox,
    Switch,
    RadioGroup,
    Radio,
  } = require('../packages/material/src');
  const theme = createTheme({
    components: {
      MuiStack: { defaultProps: { direction: 'row', spacing: 2 } },
      MuiCard: { defaultProps: { square: true } },
      MuiDialogTitle: { defaultProps: { variant: 'h4' } },
      MuiFormControl: { defaultProps: { required: true } },
      MuiFormLabel: { defaultProps: { color: 'primary.main' } },
      MuiInputLabel: { defaultProps: { testID: 'input-label' } },
      MuiCheckbox: { defaultProps: { defaultChecked: true } },
      MuiSwitch: { defaultProps: { checked: true } },
      MuiRadioGroup: { defaultProps: { defaultValue: 'b' } },
    },
  });
  render(
    <ThemeProvider theme={theme}>
      <Stack testID="stack" />
      <Card testID="card" />
      <DialogTitle>Title</DialogTitle>
      <FormControl>
        <FormLabel>Name</FormLabel>
        <InputLabel>Input</InputLabel>
      </FormControl>
      <Checkbox />
      <Switch />
      <RadioGroup>
        <Radio value="a" aria-label="A" />
        <Radio value="b" aria-label="B" />
      </RadioGroup>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('stack')).toHaveStyle({ flexDirection: 'row', gap: 16 });
  expect(screen.getByTestId('card')).toHaveStyle({ borderRadius: 0 });
  expect(screen.getByText('Title')).toHaveStyle({ fontSize: 34 });
  expect(screen.getByText('Name *')).toHaveStyle({ color: theme.palette.primary.main });
  expect(screen.getByTestId('input-label')).toHaveTextContent('Input *');
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(screen.getByRole('switch')).toBeChecked();
  expect(screen.getByLabelText('B')).toBeChecked();
});
test('feedback components receive their default props and explicit props still win', () => {
  const { Alert, CircularProgress, LinearProgress, Dialog } = require('../packages/material/src');
  const theme = createTheme({
    components: {
      MuiAlert: { defaultProps: { severity: 'error' } },
      MuiCircularProgress: { defaultProps: { size: 55, 'aria-label': 'Spinner' } },
      MuiLinearProgress: {
        defaultProps: { variant: 'determinate', value: 35, 'aria-label': 'Line' },
      },
      MuiDialog: { defaultProps: { fullScreen: true } },
    },
  });
  render(
    <ThemeProvider theme={theme}>
      <Alert>Failure</Alert>
      <CircularProgress />
      <LinearProgress />
      <Dialog open={false} />
    </ThemeProvider>,
  );
  expect(screen.getByText('Failure')).toHaveStyle({ color: theme.palette.error.main });
  expect(screen.getByLabelText('Spinner').props.size).toBe(55);
  expect(screen.getByLabelText('Line').props.accessibilityValue.now).toBe(35);
});

test('TextField preserves native slot IDs when no managed field id is supplied', () => {
  render(
    <TextField
      label="Custom"
      slotProps={{
        htmlInput: () => ({ testID: 'id-field', nativeID: 'input-slot' }),
        inputLabel: () => ({ testID: 'id-label', nativeID: 'label-slot' }),
      }}
    />,
  );
  expect(screen.getByTestId('id-field').props.nativeID).toBe('input-slot');
  expect(screen.getByTestId('id-label').props.nativeID).toBe('label-slot');
});
