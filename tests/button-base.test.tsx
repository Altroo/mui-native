import React from 'react';
import { Pressable, Linking, Platform, StyleSheet, type ViewInstance } from 'react-native';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react-native';
import {
  ButtonBase,
  ThemeProvider,
  createTheme,
  Box,
  type ButtonBaseActions,
  type ButtonBaseProps,
  type ButtonBaseRootProps,
} from '@altroo/mui-native';
import { nativeButtonModality } from '../packages/material/src/nativeButtonModality';
import reference from './fixtures/mui-button-base-9.5.0.json';
import { Commands } from '../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';
function event(key?: string, nested = false, extra: object = {}) {
  let prevented = false;
  return {
    nativeEvent: {
      key,
      code: key,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      ...extra,
    },
    target: nested ? 2 : 1,
    currentTarget: 1,
    get defaultPrevented() {
      return prevented;
    },
    preventDefault: jest.fn(() => {
      prevented = true;
    }),
    isDefaultPrevented: () => prevented,
    stopPropagation: jest.fn(),
    persist: jest.fn(),
    isPropagationStopped: () => false,
  } as any;
}
beforeEach(() => {
  jest.clearAllMocks();
  for (const method of ['focus', 'blur', 'setPressed', 'setHotspot'] as const)
    jest.spyOn(Commands, method).mockImplementation(() => {});
  nativeButtonModality.keyboard();
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
let captured: ButtonBaseRootProps;
const Capture = React.forwardRef<ViewInstance, ButtonBaseRootProps>(function Capture(props, ref) {
  captured = props;
  return <Pressable {...props} ref={ref} />;
});
function field(props: Partial<ButtonBaseProps> = {}) {
  return (
    <ButtonBase testID="base" {...props}>
      Action
    </ButtonBase>
  );
}
test.each(reference.fixtures)('original activation/focus: $name', (fixture) => {
  const input = fixture as any,
    trace: string[] = [],
    snapshots: any[] = [];
  const action = React.createRef<ButtonBaseActions>(),
    node = React.createRef<ViewInstance>();
  let activation: any;
  render(
    field({
      component: Capture,
      ref: node,
      action,
      disabled: input.disabled,
      suppressFocusVisible: input.suppressFocusVisible,
      disableRipple: true,
      sx: { '&.Mui-focusVisible': { backgroundColor: '#123456' } },
      onKeyDown(e) {
        trace.push('down:' + e.key);
        if (input.cancelDown) e.preventDefault();
      },
      onKeyUp(e) {
        trace.push('up:' + e.key);
        if (input.cancelUp) e.preventDefault();
      },
      onClick(e) {
        activation = e;
        trace.push('click');
        if (input.cancelClick) e.preventDefault();
      },
      onFocusVisible() {
        trace.push('focus-visible');
      },
      onFocus() {
        trace.push('focus');
      },
      onBlur() {
        trace.push('blur');
      },
    }),
  );
  const focus = jest.spyOn(node.current!, 'focus');
  for (const inputAction of input.actions) {
    activation = undefined;
    const e = event(inputAction.key, inputAction.nested, { repeat: inputAction.repeat });
    if (inputAction.kind === 'down') fireEvent(screen.getByTestId('base'), 'keyDown', e);
    if (inputAction.kind === 'up') fireEvent(screen.getByTestId('base'), 'keyUp', e);
    if (inputAction.kind === 'click') act(() => captured.onPress!(e));
    if (inputAction.kind === 'focus') {
      if (inputAction.visible) nativeButtonModality.keyboard();
      else nativeButtonModality.pointer();
      fireEvent(screen.getByTestId('base'), 'focus', e);
    }
    if (inputAction.kind === 'blur') fireEvent(screen.getByTestId('base'), 'blur', e);
    if (inputAction.kind === 'action') act(() => action.current!.focusVisible());
    if (activation || inputAction.kind === 'click')
      trace.push('click-prevented:' + (activation ?? e).defaultPrevented);
    snapshots.push({
      trace: [...trace],
      eventPrevented: e.defaultPrevented,
      focuses: focus.mock.calls.length,
      focusVisible:
        StyleSheet.flatten(screen.getByTestId('base').props.style).backgroundColor === '#123456',
      tabIndex: screen.getByTestId('base').props.tabIndex,
    });
  }
  expect(snapshots).toEqual(input.snapshots);
});
test.each(reference.disabledFocus)(
  'disabled focus hook: disabled=$disabled allow=$allow',
  (fixture) => {
    const down = jest.fn();
    render(
      field({ disabled: fixture.disabled, focusableWhenDisabled: fixture.allow, onKeyDown: down }),
    );
    expect(screen.getByTestId('base').props.nativeTabIndex).toBe(fixture.tabIndex);
    for (const input of fixture.keys) {
      const e = event(input.key);
      fireEvent(screen.getByTestId('base'), 'MUIKeyDown', e);
      expect(e.defaultPrevented).toBe(input.prevented);
    }
    expect(down).toHaveBeenCalledTimes(fixture.disabled ? 0 : fixture.keys.length);
  },
);
test('native press has precedence and disabled activation is guarded even through custom roots', () => {
  const click = jest.fn(),
    press = jest.fn();
  const { rerender } = render(field({ component: Capture, onClick: click, onPress: press }));
  fireEvent.press(screen.getByTestId('base'), event());
  expect(press).toHaveBeenCalledTimes(1);
  expect(click).not.toHaveBeenCalled();
  rerender(
    field({
      component: Capture,
      disabled: true,
      focusableWhenDisabled: true,
      onClick: click,
      onPress: press,
    }),
  );
  const e = event();
  act(() => captured.onPress!(e));
  expect(e.defaultPrevented).toBe(true);
  expect(press).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('base').props.focusable).toBe(true);
  expect(screen.getByTestId('base')).toBeDisabled();
});
test('native refs and action handles clean up and native child/state callbacks inherit text', () => {
  const ref = React.createRef<ViewInstance>(),
    action = React.createRef<ButtonBaseActions>();
  const { unmount } = render(
    <Box sx={{ color: 'primary.main' }}>
      <ButtonBase
        ref={ref}
        action={action}
        testOnly_pressed
        testID="base"
        style={(state) => ({ fontWeight: state.pressed ? '700' : '400' })}
      >
        {(state) => (state.pressed ? 'Pressed' : 'Idle')}
      </ButtonBase>
    </Box>,
  );
  expect(ref.current).not.toBeNull();
  expect(action.current?.focusVisible).toBeInstanceOf(Function);
  expect(screen.getByText('Pressed')).toHaveStyle({
    fontWeight: '700',
    color: createTheme().palette.primary.main,
  });
  expect(StyleSheet.flatten(screen.getByTestId('base').props.style).fontWeight).toBeUndefined();
  unmount();
  expect(ref.current).toBeNull();
  expect(action.current).toBeNull();
});
test('keyboard adapter preserves native provenance, cancellation and event methods', () => {
  let received: any;
  render(
    field({
      onKeyDown: (e) => {
        received = e;
        e.persist();
        e.stopPropagation();
        e.preventDefault();
      },
    }),
  );
  const e = event('a');
  fireEvent(screen.getByTestId('base'), 'MUIKeyDown', e);
  expect(received.key).toBe('a');
  expect(received.nativeEvent).toBe(e.nativeEvent);
  expect(received.defaultPrevented).toBe(true);
  expect(received.isDefaultPrevented()).toBe(true);
  expect(e.persist).toHaveBeenCalledTimes(1);
  expect(e.stopPropagation).toHaveBeenCalledTimes(1);
});
test('composing IME keys do not activate native buttons', () => {
  const click = jest.fn();
  render(field({ onClick: click }));
  fireEvent(screen.getByTestId('base'), 'MUIKeyDown', event('Enter', false, { isComposing: true }));
  fireEvent(screen.getByTestId('base'), 'MUIKeyUp', event(' ', false, { isComposing: true }));
  expect(click).not.toHaveBeenCalled();
});
test('native link activation honors click cancellation including the separate keyboard activation', () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const { rerender } = render(field({ href: 'https://example.com' }));
  fireEvent(screen.getByTestId('base'), 'MUIKeyDown', event('Enter'));
  expect(open).toHaveBeenCalledTimes(1);
  expect(open).toHaveBeenCalledWith('https://example.com');
  rerender(field({ href: 'https://example.com', onClick: (e) => e.preventDefault() }));
  fireEvent.press(screen.getByTestId('base'), event());
  fireEvent(screen.getByTestId('base'), 'MUIKeyUp', event(' '));
  expect(open).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('base').props.accessibilityRole).toBe('link');
});
test('custom native link receives its route and owns navigation', () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  let received: any;
  const Root = React.forwardRef<ViewInstance, ButtonBaseRootProps>(function Root(props, ref) {
    received = props;
    return <Pressable {...props} ref={ref} />;
  });
  render(field({ LinkComponent: Root, href: 'https://example.com', to: { screen: 'Details' } }));
  fireEvent.press(screen.getByTestId('base'), event());
  expect(received.href).toBe('https://example.com');
  expect(received.to).toEqual({ screen: 'Details' });
  expect(open).not.toHaveBeenCalled();
});
test('theme defaults and focus/disabled selectors compose with inline state styles', () => {
  const theme = createTheme({
    components: {
      MuiButtonBase: {
        defaultProps: { disableRipple: true },
        styleOverrides: {
          root: {
            padding: 7,
            '&.Mui-focusVisible': { borderWidth: 2 },
            '&.Mui-disabled': { opacity: 0.4 },
          },
        },
      },
    },
  });
  const { rerender } = render(
    <ThemeProvider theme={theme}>
      {field({ style: (state) => ({ margin: state.focusVisible ? 4 : 0 }) })}
    </ThemeProvider>,
  );
  fireEvent(screen.getByTestId('base'), 'MUIFocus', event());
  expect(screen.getByTestId('base')).toHaveStyle({ padding: 7, borderWidth: 2, margin: 4 });
  rerender(<ThemeProvider theme={theme}>{field({ disabled: true })}</ThemeProvider>);
  expect(screen.getByTestId('base')).toHaveStyle({ opacity: 0.4 });
});
test('native touch feedback respects both disable flags and caller style overrides', () => {
  const touch = (props: Partial<ButtonBaseProps>) => field({ component: Capture, ...props });
  const { rerender } = render(touch({ testOnly_pressed: true }));
  expect(screen.getByTestId('base')).toHaveStyle({ opacity: 0.8 });
  rerender(touch({ testOnly_pressed: true, disableTouchRipple: true }));
  expect(StyleSheet.flatten(screen.getByTestId('base').props.style).opacity).toBeUndefined();
  rerender(touch({ testOnly_pressed: true, style: { opacity: 0.3 } }));
  expect(screen.getByTestId('base')).toHaveStyle({ opacity: 0.3 });
  jest.replaceProperty(Platform, 'OS', 'android');
  rerender(touch({ disableRipple: true, android_ripple: { color: 'red' } }));
  expect(captured.android_ripple).toBeUndefined();
});

test('focus feedback uses a native outline without changing layout dimensions', () => {
  const action = React.createRef<ButtonBaseActions>();
  render(field({ action, focusRipple: true }));
  act(() => action.current!.focusVisible());
  expect(screen.getByTestId('base')).toHaveStyle({
    outlineWidth: 2,
    outlineColor: createTheme().palette.primary.main,
    borderWidth: 0,
  });
});

test('disabled focusable controls reserve disabled accessibility over an authored aria alias', () => {
  render(field({ disabled: true, focusableWhenDisabled: true, 'aria-disabled': false }));
  expect(screen.getByTestId('base')).toBeDisabled();
});
test('disabled focusable custom roots cannot activate long press or native ripple feedback', () => {
  const long = jest.fn();
  render(
    field({ component: Capture, disabled: true, focusableWhenDisabled: true, onLongPress: long }),
  );
  act(() => captured.onLongPress!(event()));
  expect(long).not.toHaveBeenCalled();
  expect(captured.android_ripple).toBeUndefined();
});
test('an explicit default Pressable still routes through the supplied native link component', () => {
  let route: string | undefined;
  const Link = React.forwardRef<ViewInstance, ButtonBaseRootProps>(function Link(
    { href, to, ...props },
    ref,
  ) {
    route = href;
    return <Pressable {...props} ref={ref} />;
  });
  render(field({ component: Pressable, LinkComponent: Link, href: 'https://example.com' }));
  expect(route).toBe('https://example.com');
});

test('private native key events activate once and canceled keys remain non-activating', () => {
  const click = jest.fn();
  render(field({ onClick: click }));
  fireEvent(screen.getByTestId('base'), 'mUIKeyDown', event('Enter'));
  fireEvent(screen.getByTestId('base'), 'mUIKeyUp', event('Enter'));
  expect(click).toHaveBeenCalledTimes(1);
  fireEvent(screen.getByTestId('base'), 'mUIKeyDown', event('Enter', false, { isCanceled: true }));
  fireEvent(screen.getByTestId('base'), 'mUIKeyUp', event(' ', false, { isCanceled: true }));
  expect(click).toHaveBeenCalledTimes(1);
});

test('virtual option state styles without focusing or firing native focus callbacks', () => {
  const focus = jest.fn(),
    onFocus = jest.fn(),
    onFocusVisible = jest.fn();
  const diagnostic = jest.fn();
  const restore = require('../packages/system/src').configureDiagnostics(diagnostic);
  const authored = 'MuiAutocomplete-option Mui-focused Mui-focusVisible';
  try {
    const { rerender } = render(
      field({
        component: Capture,
        className: authored,
        _muiNativeClassName: authored,
        _muiNativeItemState: { focused: true, focusVisible: true, selected: true },
        onFocus,
        onFocusVisible,
        sx: {
          '&.Mui-focused': { opacity: 0.8 },
          '&.Mui-focusVisible': { backgroundColor: '#123456' },
          '&.Mui-selected': { borderWidth: 2 },
        },
      } as any),
    );
    const style = StyleSheet.flatten(screen.getByTestId('base').props.style);
    expect(style).toMatchObject({ opacity: 0.8, backgroundColor: '#123456', borderWidth: 2 });
    expect(captured).not.toHaveProperty('_muiNativeItemState');
    expect(captured).not.toHaveProperty('_muiNativeClassName');
    expect(focus).not.toHaveBeenCalled();
    expect(Commands.focus).not.toHaveBeenCalled();
    expect(onFocus).not.toHaveBeenCalled();
    expect(onFocusVisible).not.toHaveBeenCalled();
    expect(diagnostic).not.toHaveBeenCalled();
    rerender(
      field({
        component: Capture,
        className: 'authored-css',
        _muiNativeClassName: authored,
      } as any),
    );
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: 'button-classes' }));
  } finally {
    restore();
  }
});
