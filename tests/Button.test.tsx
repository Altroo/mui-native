import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import { ActivityIndicator, Text, StyleSheet } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button, ThemeProvider, createTheme } from '../packages/material/src';

function hostParent(node: ReactTestInstance): ReactTestInstance {
  let parent = node.parent;
  while (parent && typeof parent.type !== 'string') parent = parent.parent;
  if (!parent) throw new Error('Expected a native parent');
  return parent;
}

test('centered loading retains the label and content geometry while disabling presses', () => {
  const press = jest.fn();
  const { rerender } = render(<Button onClick={press}>Save invoice</Button>);
  fireEvent.press(screen.getByRole('button', { name: 'Save invoice' }));
  expect(press).toHaveBeenCalledTimes(1);
  rerender(
    <Button loading onClick={press}>
      Save invoice
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Save invoice' });
  expect(button).toBeDisabled();
  expect(button.props.accessibilityState.busy).toBe(true);
  expect(screen.getByText('Save invoice')).not.toBeVisible();
  let overlay = hostParent(screen.getByRole('progressbar', { name: 'Save invoice' }));
  while (overlay !== button && StyleSheet.flatten(overlay.props.style)?.position !== 'absolute')
    overlay = hostParent(overlay);
  expect(overlay).toHaveStyle({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 });
  fireEvent.press(button);
  expect(press).toHaveBeenCalledTimes(1);
  rerender(
    <Button loading={false} onClick={press}>
      Save invoice
    </Button>,
  );
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(screen.getByText('Save invoice')).toBeVisible();
  expect(screen.getByRole('button')).toBeEnabled();
});

test.each(['start', 'end'] as const)(
  '%s loading replaces its icon while keeping the label visible',
  (position) => {
    const icon = <Text testID="icon">+</Text>;
    const { rerender } = render(
      <Button
        loading
        loadingPosition={position}
        startIcon={position === 'start' ? icon : undefined}
        endIcon={position === 'end' ? icon : undefined}
      >
        Send
      </Button>,
    );
    expect(screen.getByText('Send')).toBeVisible();
    expect(screen.getByTestId('icon')).not.toBeVisible();
    expect(screen.getByRole('progressbar')).toBeTruthy();
    rerender(
      <Button loading={null} loadingPosition={position} startIcon={icon}>
        Send
      </Button>,
    );
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByTestId('icon')).toBeVisible();
  },
);

test('custom indicators and default progress colors work with theme defaults and loading selectors', () => {
  const theme = createTheme({
    components: {
      MuiButton: {
        defaultProps: { loadingPosition: 'end' },
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState }) => ({
            borderWidth: ownerState.loadingPosition === 'end' ? 3 : 1,
            '&.Mui-loading': { opacity: 0.7 },
          })),
        },
      },
    },
  });
  const { rerender } = render(
    <ThemeProvider theme={theme}>
      <Button loading>Save</Button>
    </ThemeProvider>,
  );
  expect(screen.UNSAFE_getByType(ActivityIndicator).props.color).toBe(
    theme.palette.action.disabled,
  );
  expect(screen.getByRole('button')).toHaveStyle({ borderWidth: 3, opacity: 0.7 });
  rerender(
    <ThemeProvider theme={theme}>
      <Button
        loading
        loadingIndicator={
          <Text accessibilityRole="progressbar" accessibilityLabel="Uploading">
            42%
          </Text>
        }
      >
        Save
      </Button>
    </ThemeProvider>,
  );
  expect(screen.getByRole('progressbar', { name: 'Uploading' })).toBeTruthy();
  expect(screen.queryByRole('progressbar', { name: 'Save' })).toBeNull();
  rerender(
    <ThemeProvider theme={theme}>
      <Button loading loadingIndicator="Preparing" aria-label="Save draft">
        Save
      </Button>
    </ThemeProvider>,
  );
  expect(screen.getByText('Preparing')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
});

test('button content stays in the styled root layout so gap and direction affect its children', () => {
  render(
    <Button
      startIcon={<Text testID="start">+</Text>}
      endIcon={<Text testID="end">-</Text>}
      sx={{ gap: 3, flexDirection: 'row-reverse', justifyContent: 'space-between' }}
    >
      Continue
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Continue' });
  expect(button).toHaveStyle({
    gap: 24,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  });
  // An intervening fixed row would swallow the root's gap and direction.
  expect(hostParent(screen.getByText('Continue')) === button).toBe(true);
});

test.each([false, true, ''])('empty icon values (%s) do not add layout slots', (icon) => {
  const { toJSON, rerender } = render(<Button>Continue</Button>);
  expect((toJSON() as any).children).toHaveLength(1);
  rerender(
    <Button startIcon={icon} endIcon={icon}>
      Continue
    </Button>,
  );
  const native = toJSON() as any;
  expect(native.children).toHaveLength(1);
  expect(native.children[0].type).toBe('Text');
  expect(native.children[0].children).toEqual(['Continue']);
});

test.each([undefined, null, false])(
  'inactive loading=%s preserves interaction and explicit disabled state',
  (loading) => {
    const press = jest.fn();
    const click = jest.fn();
    const { rerender } = render(
      <Button
        loading={loading}
        onPress={press}
        onClick={click}
        accessibilityState={{ selected: true }}
      >
        Save
      </Button>,
    );
    fireEvent.press(screen.getByRole('button'));
    expect(press).toHaveBeenCalledTimes(1);
    expect(click).not.toHaveBeenCalled();
    expect(screen.getByRole('button').props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
      busy: false,
    });
    rerender(
      <Button loading={loading} disabled onPress={press}>
        Save
      </Button>,
    );
    fireEvent.press(screen.getByRole('button'));
    expect(press).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button')).toBeDisabled();
  },
);

test('loading preserves theme typography opacity across positions and transitions', () => {
  const theme = createTheme({ typography: { button: { opacity: 0.4 } } });
  const content = (loading: boolean, loadingPosition: 'center' | 'start' | 'end') => (
    <ThemeProvider theme={theme}>
      <Button loading={loading} loadingPosition={loadingPosition}>
        Save
      </Button>
    </ThemeProvider>
  );
  const { rerender } = render(content(false, 'center'));
  expect(screen.getByRole('button')).toHaveStyle({ opacity: 0.4 });
  rerender(content(true, 'center'));
  expect(screen.getByText('Save')).toHaveStyle({ opacity: 0 });
  for (const position of ['start', 'end'] as const) {
    rerender(content(true, position));
    expect(screen.getByRole('button')).toHaveStyle({ opacity: 0.4 });
  }
  rerender(content(false, 'center'));
  expect(screen.getByRole('button')).toHaveStyle({ opacity: 0.4 });
});
