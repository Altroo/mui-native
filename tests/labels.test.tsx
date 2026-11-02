import React, { forwardRef, useImperativeHandle } from 'react';
import {
  Text,
  TextInput,
  Animated,
  AccessibilityInfo,
  type TextInputInstance,
  type TextProps,
  type TextInstance,
} from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  FormControl,
  FormLabel,
  InputLabel,
  FormHelperText,
  TextField,
  OutlinedInput,
  Input,
  ThemeProvider,
  createTheme,
  useFormControl,
  type FormControlProps,
  type InputLabelProps,
  type FormHelperTextProps,
} from '../packages/material/src';
import reference from './fixtures/mui-labels-9.5.0.json';
const components = { FormLabel, InputLabel, FormHelperText };
const pick = (state: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(
    keys.filter((key) => state[key] !== undefined).map((key) => [key, state[key]]),
  );
test.each(reference.fixtures)(
  'native $component states follow pinned MUI: $props $form',
  (item) => {
    const Component = components[item.component as keyof typeof components];
    let output: unknown;
    const theme = createTheme({
      components: {
        [`Mui${item.component}`]: {
          styleOverrides: {
            root: ({ ownerState }) => {
              const keys =
                item.component === 'InputLabel'
                  ? ['focused', 'required', 'shrink', 'size', 'variant']
                  : item.component === 'FormLabel'
                    ? ['color', 'focused', 'required', 'filled', 'disabled', 'error']
                    : [
                        'focused',
                        'required',
                        'filled',
                        'disabled',
                        'error',
                        'size',
                        'variant',
                        'contained',
                      ];
              output = pick(ownerState, keys);
              if (item.component === 'InputLabel')
                (output as Record<string, unknown>).formControl = Boolean(ownerState.formControl);
              return {};
            },
          },
        },
      },
    });
    let content = (
      <Component {...(item.props as InputLabelProps & FormHelperTextProps)} testID="label">
        {'children' in item ? item.children : 'Label'}
      </Component>
    );
    if ('form' in item)
      content = (
        <FormControl {...(item.form as FormControlProps)}>
          {content}
          {'input' in item ? <OutlinedInput {...item.input} /> : null}
        </FormControl>
      );
    render(<ThemeProvider theme={theme}>{content}</ThemeProvider>);
    expect(output).toEqual(item.output);
    expect(screen.getByTestId('label').props.children === '\u200b').toBe(item.reservedLine);
  },
);
test('explicit label flags override form flags and required markers stay separate', () => {
  render(
    <FormControl error disabled required focused>
      <FormLabel testID="label" error={false} disabled={false} required={false} focused={false}>
        Name
      </FormLabel>
      <FormHelperText testID="help" error={false} disabled={false}>
        Help
      </FormHelperText>
    </FormControl>,
  );
  expect(screen.getByTestId('label')).toHaveTextContent('Name');
  expect(screen.getByTestId('label')).toHaveStyle({ color: 'rgba(0, 0, 0, 0.6)' });
  expect(screen.getByTestId('help')).toHaveStyle({ color: 'rgba(0, 0, 0, 0.6)' });
});
test('composed label presses focus the matched native input and respect disabled/preventDefault', () => {
  const focus = jest.fn();
  const Host = forwardRef<
    TextInputInstance,
    import('../packages/material/src').InputBaseComponentProps & { ownerState?: object }
  >(({ ownerState: _o, sx: _s, ...props }, ref) => {
    useImperativeHandle(ref, () => ({ focus }) as unknown as TextInputInstance, []);
    return <TextInput {...props} />;
  });
  const field = (disabled = false, htmlFor = 'name', prevent = false) => (
    <FormControl disabled={disabled}>
      <InputLabel
        htmlFor={htmlFor}
        nativeID="label"
        disableAnimation
        onPress={(event) => {
          if (prevent) event.preventDefault();
        }}
      >
        Name
      </InputLabel>
      <OutlinedInput id="name" inputComponent={Host} />
      <FormHelperText nativeID="help">Details</FormHelperText>
    </FormControl>
  );
  const { rerender } = render(field());
  expect(screen.getByLabelText('Name').props.accessibilityLabelledBy).toBe('label');
  expect(screen.getByLabelText('Name').props.accessibilityHint).toBe('Details');
  fireEvent.press(screen.getByText('Name'), { defaultPrevented: false });
  expect(focus).toHaveBeenCalledTimes(1);
  rerender(field(false, 'other'));
  fireEvent.press(screen.getByText('Name'), { defaultPrevented: false });
  expect(focus).toHaveBeenCalledTimes(1);
  rerender(field(true));
  fireEvent.press(screen.getByText('Name'), { defaultPrevented: false });
  expect(focus).toHaveBeenCalledTimes(1);
  rerender(field(false, 'name', true));
  const event = {
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
  fireEvent.press(screen.getByText('Name'), event);
  expect(focus).toHaveBeenCalledTimes(1);
});
test('floating labels coordinate placeholder visibility, explicit shrink and outline state', () => {
  const { rerender } = render(
    <TextField
      label="Email"
      placeholder="email@example.test"
      slotProps={{ inputLabel: { testID: 'label', disableAnimation: true } }}
    />,
  );
  expect(screen.getByLabelText('Email').props.placeholder).toBe('email@example.test');
  expect(screen.getByLabelText('Email').props.placeholderTextColor).toBe('transparent');
  expect(screen.getByTestId('label')).toHaveStyle({ position: 'absolute' });
  fireEvent(screen.getByLabelText('Email'), 'focus', { nativeEvent: {} });
  expect(screen.getByLabelText('Email').props.placeholderTextColor).not.toBe('transparent');
  rerender(
    <TextField
      label="Email"
      placeholder="email@example.test"
      slotProps={{ inputLabel: { shrink: false, testID: 'label', disableAnimation: true } }}
    />,
  );
  expect(screen.getByLabelText('Email').props.placeholderTextColor).not.toBe('transparent');
  fireEvent(screen.getByLabelText('Email'), 'blur', { nativeEvent: {} });
  expect(screen.getByLabelText('Email').props.placeholderTextColor).toBe('transparent');
});
test('stacked label option stays in flow and never hides its placeholder', () => {
  render(
    <TextField
      label="Stacked"
      labelDisplay="stacked"
      placeholder="Name"
      slotProps={{ root: { testID: 'root' }, inputLabel: { testID: 'label' } }}
    />,
  );
  expect(screen.getByTestId('root')).toHaveStyle({ gap: 4 });
  expect(screen.getByTestId('label')).toHaveStyle({ position: 'relative' });
  expect(screen.getByLabelText('Stacked').props.placeholderTextColor).not.toBe('transparent');
});
test('helper field variant and blank line behavior use caption metrics and native margins', () => {
  const { rerender } = render(
    <FormControl size="small" variant="outlined">
      <FormHelperText testID="help"> </FormHelperText>
    </FormControl>,
  );
  expect(screen.getByTestId('help')).toHaveStyle({
    fontSize: 12,
    marginTop: 4,
    marginLeft: 14,
    marginRight: 14,
  });
  expect(screen.getByTestId('help').props.accessible).toBe(false);
  rerender(
    <FormControl variant="filled">
      <FormHelperText testID="help" variant="standard" style={{ marginHorizontal: 2 }}>
        Help
      </FormHelperText>
    </FormControl>,
  );
  expect(screen.getByTestId('help')).toHaveStyle({ marginLeft: 2, marginRight: 2 });
});
test('native root aliases, automatic IDs and native text refs work through the public components', () => {
  render(
    <FormControl component="fieldset" testID="form" margin="normal">
      <FormLabel component="legend">Group</FormLabel>
      <TextField label="Automatic" helperText="Help" />
    </FormControl>,
  );
  expect(screen.getByTestId('form')).toHaveStyle({ marginTop: 16, marginBottom: 8 });
  const input = screen.getByLabelText('Automatic');
  expect(typeof input.props.nativeID).toBe('string');
  expect(input.props.nativeID.length).toBeGreaterThan(0);
});
test('named form, label and helper overrides receive resolved owner state without native prop leakage', () => {
  const theme = createTheme({
    components: {
      MuiInputLabel: {
        styleOverrides: { shrink: { color: '#123456' }, asterisk: { fontWeight: 700 } },
      },
      MuiFormHelperText: { styleOverrides: { contained: { marginLeft: 20 } } },
    },
  });
  render(
    <ThemeProvider theme={theme}>
      <FormControl required>
        <InputLabel shrink testID="label" disableAnimation>
          Name
        </InputLabel>
        <OutlinedInput defaultValue="Filled" />
        <FormHelperText testID="help">Help</FormHelperText>
      </FormControl>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('label')).toHaveStyle({ color: '#123456' });
  expect(screen.getByTestId('label').props.shrink).toBeUndefined();
  expect(screen.getByTestId('help').props.variant).toBeUndefined();
  expect(screen.getByTestId('help')).toHaveStyle({ marginLeft: 20 });
});

test('native explicit names win automatic associations and wrong ID relationships stay unlinked', () => {
  const { unmount } = render(
    <TextField
      label="Visual"
      aria-label="Explicit"
      slotProps={{ htmlInput: { 'aria-label': 'Lower' } }}
    />,
  );
  expect(screen.getByLabelText('Explicit').props.accessibilityLabelledBy).toBeUndefined();
  unmount();
  render(
    <FormControl>
      <InputLabel htmlFor="other" nativeID="label-id" disableAnimation>
        Wrong
      </InputLabel>
      <OutlinedInput id="actual" inputProps={{ testID: 'actual' }} />
      <FormHelperText nativeID="help-id">Help</FormHelperText>
    </FormControl>,
  );
  expect(screen.getByTestId('actual').props.accessibilityLabelledBy).toBeUndefined();
  expect(screen.getByTestId('actual').props.accessibilityLabel).toBeUndefined();
});
test('described-by association respects explicit IDs and helper removal', () => {
  const field = (id: string, show: boolean) => (
    <FormControl>
      <OutlinedInput aria-label="Field" aria-describedby={id} />
      {show ? <FormHelperText nativeID="help">Details</FormHelperText> : null}
    </FormControl>
  );
  const { rerender } = render(field('other', true));
  expect(screen.getByLabelText('Field').props.accessibilityHint).toBeUndefined();
  rerender(field('other help', true));
  expect(screen.getByLabelText('Field').props.accessibilityHint).toBe('Details');
  rerender(field('help', false));
  expect(screen.getByLabelText('Field').props.accessibilityHint).toBeUndefined();
});
test('public OutlinedInput can replace the TextField input slot without metadata leakage', () => {
  render(
    <TextField
      label="Reusable"
      slots={{ input: OutlinedInput }}
      slotProps={{
        inputLabel: { shrink: true, disableAnimation: true },
        input: { startAdornment: '$' },
      }}
    />,
  );
  expect(screen.getByLabelText('Reusable').props.ownerState).toBeUndefined();
  expect(screen.getByText('$')).toBeTruthy();
});
test('floating label width follows measured form width and immediate shrink state', () => {
  render(
    <FormControl testID="form">
      <InputLabel testID="label" shrink disableAnimation>
        Long label
      </InputLabel>
      <OutlinedInput />
    </FormControl>,
  );
  fireEvent(screen.getByTestId('form'), 'layout', { nativeEvent: { layout: { width: 200 } } });
  expect(screen.getByTestId('label')).toHaveStyle({ maxWidth: (200 - 28) / 0.75 });
});
test('native label animation uses the native driver and honors disableAnimation', async () => {
  const preference = jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(false);
  const timing = jest
    .spyOn(Animated, 'timing')
    .mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  const field = (disableAnimation: boolean) => (
    <TextField label="Motion" slotProps={{ inputLabel: { disableAnimation } }} />
  );
  const { rerender, unmount } = render(field(false));
  await act(async () => {
    await Promise.resolve();
  });
  fireEvent(screen.getByLabelText('Motion'), 'focus', { nativeEvent: {} });
  expect(timing).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({
      toValue: 1,
      duration: reference.transitionDuration,
      useNativeDriver: true,
    }),
  );
  const calls = timing.mock.calls.length;
  rerender(field(true));
  fireEvent(screen.getByLabelText('Motion'), 'blur', { nativeEvent: {} });
  expect(timing).toHaveBeenCalledTimes(calls);
  unmount();
  timing.mockRestore();
  preference.mockRestore();
});

test('standalone explicit shrink scales the label even without a form provider', () => {
  render(
    <InputLabel shrink disableAnimation testID="standalone">
      Name
    </InputLabel>,
  );
  expect(screen.getByTestId('standalone')).toHaveStyle({
    transform: [{ translateY: -1.5 }, { scale: 0.75 }],
  });
});

test('animated custom native label roots release every React 19 ref attachment exactly once', () => {
  const instance = { measure: jest.fn() } as unknown as TextInstance;
  const Root = forwardRef<TextInstance, TextProps>((props, ref) => {
    useImperativeHandle(ref, () => instance, []);
    return <Text {...props} />;
  });
  const releases: jest.Mock[] = [];
  const callback = jest.fn((node: TextInstance | null) => {
    expect(node).toBe(instance);
    const cleanup = jest.fn();
    releases.push(cleanup);
    return cleanup;
  });
  const { rerender, unmount } = render(
    <InputLabel component={Root} ref={callback} shrink disableAnimation>
      Name
    </InputLabel>,
  );
  expect(callback).toHaveBeenCalledWith(instance);
  rerender(
    <InputLabel component={Root} ref={callback} error shrink disableAnimation>
      Name
    </InputLabel>,
  );
  for (const release of releases.slice(0, -1)) expect(release).toHaveBeenCalledTimes(1);
  expect(releases.at(-1)).not.toHaveBeenCalled();
  unmount();
  for (const release of releases) expect(release).toHaveBeenCalledTimes(1);
});
test('long labels keep bounded width until the native shrink motion completes', async () => {
  const preference = jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(false);
  const motions: Array<{
    value: Animated.Value;
    finish?: (result: { finished: boolean }) => void;
  }> = [];
  const timing = jest.spyOn(Animated, 'timing').mockImplementation((value) => {
    const motion = {
      value: value as Animated.Value,
      finish: undefined as ((result: { finished: boolean }) => void) | undefined,
    };
    motions.push(motion);
    return {
      start: (callback) => {
        motion.finish = callback;
      },
      stop: jest.fn(),
      reset: jest.fn(),
    };
  });
  const field = (shrink: boolean) => (
    <FormControl testID="form">
      <InputLabel shrink={shrink} testID="label">
        A long label stays inside the field
      </InputLabel>
      <OutlinedInput />
    </FormControl>
  );
  const { rerender, unmount } = render(field(false));
  fireEvent(screen.getByTestId('form'), 'layout', { nativeEvent: { layout: { width: 200 } } });
  await act(async () => {
    await Promise.resolve();
  });
  rerender(field(true));
  expect(screen.getByTestId('label')).toHaveStyle({ maxWidth: 172 });
  act(() => {
    motions.at(-1)?.value.setValue(1);
    motions.at(-1)?.finish?.({ finished: true });
  });
  expect(screen.getByTestId('label')).toHaveStyle({ maxWidth: 172 / 0.75 });
  rerender(field(false));
  expect(screen.getByTestId('label')).toHaveStyle({ maxWidth: 172 });
  unmount();
  timing.mockRestore();
  preference.mockRestore();
});

test('enabling reduced motion during shrink releases the final long-label width', async () => {
  let changeMotion: ((value: boolean) => void) | undefined;
  const preference = jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(false);
  const subscribe = jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockImplementation((_name, callback) => {
      changeMotion = callback as (value: boolean) => void;
      return { remove: jest.fn() };
    });
  const timing = jest
    .spyOn(Animated, 'timing')
    .mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  const field = (shrink: boolean) => (
    <FormControl testID="form">
      <InputLabel shrink={shrink} testID="label">
        A long label with interrupted motion
      </InputLabel>
      <OutlinedInput />
    </FormControl>
  );
  const { rerender, unmount } = render(field(false));
  try {
    fireEvent(screen.getByTestId('form'), 'layout', { nativeEvent: { layout: { width: 200 } } });
    await act(async () => {
      await Promise.resolve();
    });
    rerender(field(true));
    expect(screen.getByTestId('label')).toHaveStyle({ maxWidth: 172 });
    act(() => changeMotion?.(true));
    expect(screen.getByTestId('label')).toHaveStyle({ maxWidth: 172 / 0.75 });
  } finally {
    unmount();
    timing.mockRestore();
    subscribe.mockRestore();
    preference.mockRestore();
  }
});

test('full-width form controls use width as well as cross-axis stretch', () => {
  render(
    <FormControl fullWidth testID="full">
      <InputLabel disableAnimation>Name</InputLabel>
      <OutlinedInput />
    </FormControl>,
  );
  expect(screen.getByTestId('full')).toHaveStyle({ width: '100%', alignSelf: 'stretch' });
});

test('helper ID lists preserve explicit order and surviving messages after removal', () => {
  const field = (first: boolean) => (
    <FormControl>
      <OutlinedInput aria-label="Messages" aria-describedby="second first" />
      {first ? <FormHelperText nativeID="first">First</FormHelperText> : null}
      <FormHelperText nativeID="second">Second</FormHelperText>
    </FormControl>
  );
  const { rerender } = render(field(true));
  expect(screen.getByLabelText('Messages').props.accessibilityHint).toBe('Second First');
  rerender(field(false));
  expect(screen.getByLabelText('Messages').props.accessibilityHint).toBe('Second');
});

test('updating an earlier helper preserves implicit description order', () => {
  const field = (message: string) => (
    <FormControl>
      <OutlinedInput aria-label="Ordered" />
      <FormHelperText nativeID="first">{message}</FormHelperText>
      <FormHelperText nativeID="second">Second</FormHelperText>
    </FormControl>
  );
  const { rerender } = render(field('First'));
  expect(screen.getByLabelText('Ordered').props.accessibilityHint).toBe('First Second');
  rerender(field('Updated First'));
  expect(screen.getByLabelText('Ordered').props.accessibilityHint).toBe('Updated First Second');
});
