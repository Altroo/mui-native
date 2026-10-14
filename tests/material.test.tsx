import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import {
  Button,
  TextField,
  Checkbox,
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
    id: undefined,
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
