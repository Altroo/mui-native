import React from 'react';
import { Modal } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import {
  Button,
  TextField,
  Checkbox,
  Switch,
  Radio,
  RadioGroup,
  FormControlLabel,
  Dialog,
  Snackbar,
  ThemeProvider,
  createTheme,
} from '../packages/material/src';
test('one press invokes the native alias once and loading prevents presses', () => {
  const click = jest.fn();
  const press = jest.fn();
  const { rerender } = render(
    <Button onClick={click} onPress={press}>
      Save
    </Button>,
  );
  fireEvent.press(screen.getByRole('button'));
  expect(press).toHaveBeenCalledTimes(1);
  expect(click).not.toHaveBeenCalled();
  rerender(
    <Button loading onClick={click}>
      Save
    </Button>,
  );
  fireEvent.press(screen.getByRole('button'));
  expect(click).not.toHaveBeenCalled();
});
test('theme defaults and state overrides affect a button without mutating its theme', () => {
  const theme = createTheme({
    components: {
      MuiButton: {
        defaultProps: { variant: 'contained' },
        styleOverrides: { root: { minHeight: 52 } },
      },
    },
  });
  render(
    <ThemeProvider theme={theme}>
      <Button>Save</Button>
    </ThemeProvider>,
  );
  expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: '#1976d2', minHeight: 52 });
});
test('input exposes MUI value/name while preserving controlled value and native event', () => {
  const onChange = jest.fn();
  const onChangeText = jest.fn();
  render(
    <TextField
      label="Email"
      name="email"
      value="before"
      onChange={onChange}
      onChangeText={onChangeText}
    />,
  );
  const input = screen.getByLabelText('Email');
  fireEvent(input, 'change', { nativeEvent: { text: 'after', eventCount: 1, target: 1 } });
  expect(onChange.mock.calls[0][0].target).toEqual({
    value: 'after',
    name: 'email',
    id: input.props.nativeID,
  });
  expect(onChangeText).toHaveBeenCalledWith('after');
  expect(input.props.value).toBe('before');
});
test('uncontrolled checkbox changes selection, disabled checkbox does not', () => {
  const onChange = jest.fn();
  const { rerender } = render(<Checkbox aria-label="Agree" onChange={onChange} />);
  fireEvent.press(screen.getByRole('checkbox'), { nativeEvent: {} });
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(onChange.mock.calls[0][1]).toBe(true);
  rerender(<Checkbox aria-label="Agree" disabled onChange={onChange} />);
  fireEvent.press(screen.getByRole('checkbox'), { nativeEvent: {} });
  expect(onChange).toHaveBeenCalledTimes(1);
});
test('dialog backdrop reports its MUI close reason', () => {
  const onClose = jest.fn();
  render(
    <Dialog open onClose={onClose}>
      <Button>Continue</Button>
    </Dialog>,
  );
  fireEvent.press(screen.getByLabelText('Dismiss dialog'), { nativeEvent: {} });
  expect(onClose.mock.calls[0][1]).toBe('backdropClick');
});
test('snackbar cancels its timeout on unmount', () => {
  jest.useFakeTimers();
  const onClose = jest.fn();
  const { unmount } = render(
    <Snackbar open autoHideDuration={1000} message="Saved" onClose={onClose} />,
  );
  unmount();
  act(() => jest.advanceTimersByTime(2000));
  expect(onClose).not.toHaveBeenCalled();
  jest.useRealTimers();
});

test('slotted input handlers preserve focus and read-only state', () => {
  const focus = jest.fn();
  const blur = jest.fn();
  const { rerender } = render(
    <TextField
      label="Slotted"
      slotProps={{
        htmlInput: {
          editable: false,
          onFocus: focus,
          onBlur: blur,
        },
      }}
    />,
  );
  const input = screen.getByLabelText('Slotted');
  expect(input.props.editable).toBe(false);
  rerender(
    <TextField label="Slotted" slotProps={{ htmlInput: { onFocus: focus, onBlur: blur } }} />,
  );
  fireEvent(screen.getByLabelText('Slotted'), 'focus', { nativeEvent: {} });
  fireEvent(screen.getByLabelText('Slotted'), 'blur', { nativeEvent: {} });
  expect(focus).toHaveBeenCalledTimes(1);
  expect(blur).toHaveBeenCalledTimes(1);
});

test('slotted text callbacks fire once without breaking uncontrolled input', () => {
  const change = jest.fn();
  const text = jest.fn();
  render(
    <TextField
      label="Slotted"
      defaultValue="before"
      slotProps={{
        htmlInput: {
          onChange: change,
          onChangeText: text,
        },
      }}
    />,
  );
  fireEvent(screen.getByLabelText('Slotted'), 'change', { nativeEvent: { text: 'after' } });
  expect(change).toHaveBeenCalledTimes(1);
  expect(text).toHaveBeenCalledTimes(1);
  expect(text).toHaveBeenCalledWith('after');
  expect(screen.getByLabelText('Slotted').props.value).toBe('after');
});

test('label taps toggle an uncontrolled checkbox once and respect disabled state', () => {
  const change = jest.fn();
  const { rerender } = render(
    <FormControlLabel label="Accept" control={<Checkbox onChange={change} />} />,
  );
  fireEvent.press(screen.getByText('Accept'), { nativeEvent: {} });
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(change).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('checkbox'), { nativeEvent: {} });
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(change).toHaveBeenCalledTimes(2);
  rerender(<FormControlLabel disabled label="Accept" control={<Checkbox onChange={change} />} />);
  fireEvent.press(screen.getByText('Accept'), { nativeEvent: {} });
  expect(change).toHaveBeenCalledTimes(2);
});

test('switch labels toggle the control state', () => {
  const change = jest.fn();
  render(<FormControlLabel label="Mode" control={<Switch onChange={change} />} />);
  fireEvent.press(screen.getByText('Mode'), { nativeEvent: {} });
  expect(screen.getByRole('switch')).toBeChecked();
  expect(change).toHaveBeenCalledTimes(1);
});

test('radio labels use group state and do not reselect the same value', () => {
  const radioChange = jest.fn();
  render(
    <RadioGroup defaultValue="one" onChange={radioChange}>
      <FormControlLabel label="One" control={<Radio value="one" />} />
      <FormControlLabel label="Two" control={<Radio value="two" />} />
    </RadioGroup>,
  );
  fireEvent.press(screen.getByText('Two'), { nativeEvent: {} });
  expect(screen.getByRole('radio', { name: 'Two' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'One' })).not.toBeChecked();
  fireEvent.press(screen.getByText('Two'), { nativeEvent: {} });
  expect(radioChange).toHaveBeenCalledTimes(1);
});

test('dialog fullScreen ignores the default maxWidth and back requests respect the guard', () => {
  const close = jest.fn();
  const { rerender } = render(
    <Dialog open fullScreen testID="dialog" onClose={close}>
      <Button>Save</Button>
    </Dialog>,
  );
  expect(screen.getByTestId('dialog')).not.toHaveStyle({ maxWidth: 600 });
  fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');
  expect(close).toHaveBeenCalledWith(null, 'escapeKeyDown');
  rerender(
    <Dialog open disableEscapeKeyDown onClose={close}>
      <Button>Save</Button>
    </Dialog>,
  );
  fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');
  expect(close).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByLabelText('Dismiss dialog'), { nativeEvent: {} });
  expect(close.mock.calls[1][1]).toBe('backdropClick');
});

test.each([
  { disabled: true, readOnly: false },
  { slotProps: { htmlInput: { editable: false, readOnly: false } } },
  { readOnly: true, slotProps: { htmlInput: { editable: true } } },
])('TextField preserves a non-editable policy despite conflicting native aliases: %j', (props) => {
  render(<TextField label="Locked" {...props} />);
  const input = screen.getByLabelText('Locked');
  // React Native gives readOnly precedence over editable, including false.
  const editable =
    input.props.readOnly === undefined ? input.props.editable : !input.props.readOnly;
  expect(editable).toBe(false);
});

test.each([
  { label: 17, name: '17' },
  { label: <>Accept terms</>, name: 'Accept terms' },
  { label: ['Invoice ', <React.Fragment key="number">17</React.Fragment>], name: 'Invoice 17' },
])('FormControlLabel names controls from textual ReactNode labels: $name', ({ label, name }) => {
  render(<FormControlLabel label={label} control={<Checkbox />} />);
  expect(screen.getByRole('checkbox', { name })).toBeTruthy();
});

test('complex labels remain accessible unless the control has an explicit accessible name', () => {
  const { Typography } =
    require('../packages/material/src') as typeof import('../packages/material/src');
  const { rerender } = render(
    <FormControlLabel label={<Typography>Details</Typography>} control={<Checkbox />} />,
  );
  const visibleText = screen.getByText('Details');
  expect(visibleText.props.accessible).not.toBe(false);
  rerender(
    <FormControlLabel
      label={<Typography>Details</Typography>}
      control={<Checkbox aria-label="Read details" />}
    />,
  );
  expect(screen.getByRole('checkbox', { name: 'Read details' })).toBeTruthy();
});
