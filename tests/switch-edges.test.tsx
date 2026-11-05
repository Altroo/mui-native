import React from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { act, render, cleanup, fireEvent } from '@testing-library/react-native';
import {
  Switch,
  ButtonBase,
  ThemeProvider,
  createTheme,
  NativeCheckedInputSurface,
  configureDiagnostics,
  switchClasses,
  getSwitchUtilityClass,
  type NativeCheckedInputComponentProps,
  type NativeCheckedInputHandle,
  type NativeSwitchSlotProps,
} from '../packages/material/src';
import { getNativeFocusedView } from '../packages/native-host/src';
import { clearNativeFocus } from '../packages/native-host/src/nativeFocus';
import {
  nativeModalManager as manager,
  type NativeModalEntry,
} from '../packages/material/src/nativeModalManager';
import { NativeOverlayReadiness } from '../packages/material/src/nativeOverlayReadiness';
import { NativeSwitchModel } from './helpers/nativeSwitchModel';
import reference from './fixtures/mui-switch-browser-9.5.0.json';
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
test('Switch class helpers preserve original identifiers', () => {
  expect(switchClasses).toEqual(reference.helpers);
  expect(getSwitchUtilityClass('focusVisible')).toBe('Mui-focusVisible');
  expect(getSwitchUtilityClass('thumb')).toBe('MuiSwitch-thumb');
});
test('root, switchBase, input, thumb and track refs and owners stay distinct and clear', () => {
  const root = React.createRef<any>(),
    base = React.createRef<any>(),
    input = React.createRef<any>(),
    thumb = React.createRef<any>(),
    track = React.createRef<any>(),
    handle = React.createRef<NativeCheckedInputHandle>();
  const owners: any[] = [];
  const Slot = React.forwardRef<any, NativeSwitchSlotProps>(({ ownerState, sx, ...props }, ref) => {
    owners.push(ownerState);
    return <View {...props} ref={ref} />;
  });
  const tree = render(
    <Switch
      checked
      inputRef={handle}
      ref={base}
      slots={{ root: Slot, thumb: Slot, track: Slot }}
      slotProps={{
        root: { ref: root },
        input: { ref: input },
        thumb: { ref: thumb },
        track: { ref: track },
      }}
    />,
  );
  expect(
    new Set([root.current, base.current, input.current, thumb.current, track.current]).size,
  ).toBe(5);
  expect(handle.current!.node).toBe(input.current);
  expect(
    owners.every((owner) => owner.checked && owner.color === 'primary' && owner.size === 'medium'),
  ).toBe(true);
  tree.unmount();
  for (const ref of [root, base, input, thumb, track, handle]) expect(ref.current).toBe(null);
});
test('legacy input props defer to current slot values and callbacks', () => {
  const legacy = jest.fn(),
    current = jest.fn(),
    change = jest.fn();
  const tree = render(
    <Switch
      inputProps={{ value: 'old', onChange: legacy }}
      slotProps={{ input: { value: 'new', onChange: current } }}
      onChange={change}
    />,
  );
  fireEvent.press(tree.getByRole('switch'), { nativeEvent: {} });
  expect(legacy).not.toHaveBeenCalled();
  expect(current).toHaveBeenCalledTimes(1);
  expect(change.mock.calls[0][0].target.value).toBe('new');
});
test('input change propagation can suppress switchBase bubbling', () => {
  const base = jest.fn(),
    change = jest.fn();
  let stopped = false;
  const tree = render(
    <Switch
      onChange={change}
      slotProps={{
        switchBase: { onChange: base },
        input: { onChange: (event) => event.stopPropagation() },
      }}
    />,
  );
  fireEvent.press(tree.getByRole('switch'), {
    nativeEvent: {},
    stopPropagation() {
      stopped = true;
    },
    isPropagationStopped: () => stopped,
  });
  expect(change).toHaveBeenCalledTimes(1);
  expect(base).not.toHaveBeenCalled();
});
test('readOnly input publication bubbles but does not change the native model', async () => {
  const model = new NativeSwitchModel();
  model.test = { props: { readOnly: true } };
  await model.mount();
  await model.press();
  expect(model.handle!.checked).toBe(false);
  expect(model.changeTrace.map((item) => item.kind)).toEqual([
    'input-click',
    'click',
    'input-change',
    'base-change',
  ]);
});
test.each(['covered', 'unready'])(
  'native Switch label and action reject %s control',
  async (kind) => {
    const action = React.createRef<any>();
    const model = new NativeSwitchModel();
    model.test = { label: true, props: { action } };
    if (kind === 'unready')
      model.wrapper = (node) => (
        <NativeOverlayReadiness.Provider value={false}>{node}</NativeOverlayReadiness.Provider>
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
    await model.label();
    await model.press();
    await act(async () => {
      model.handle!.focus();
      action.current!.focusVisible();
    });
    expect(model.handle!.checked).toBe(false);
    expect(model.current).toBe(null);
    expect(model.changeTrace).toEqual([]);
  },
);
test('retained Switch activation uses current disabled props and ignores unmount', async () => {
  const model = new NativeSwitchModel();
  await model.mount();
  const handler = model.tree!.UNSAFE_getByType(ButtonBase).props.onPress;
  model.test = { props: { disabled: true } };
  await act(async () => model.tree!.rerender(model.element()));
  await act(async () => handler!(model.event(model.nodes.get('a'))));
  expect(model.changeTrace).toEqual([]);
  model.tree!.unmount();
  await act(async () => handler!(model.event(model.nodes.get('a'))));
  expect(model.changeTrace).toEqual([]);
  expect(model.handle).toBe(null);
});
test('custom input change preserves its actual source and exposes a controlled proposal', () => {
  let input: NativeCheckedInputComponentProps,
    seen: any,
    during = false;
  const handle = React.createRef<NativeCheckedInputHandle>();
  const Input = React.forwardRef<any, NativeCheckedInputComponentProps>((props, ref) => {
    input = props;
    return <NativeCheckedInputSurface {...props} ref={ref} />;
  });
  render(
    <Switch
      checked={false}
      inputRef={handle}
      slots={{ input: Input }}
      onChange={(event) => {
        during = handle.current!.checked;
        seen = event;
      }}
    />,
  );
  const payload = { source: 'native' },
    source = { target: { checked: true }, nativeEvent: payload, persist: jest.fn() };
  act(() => input!.onChange!(source as any));
  expect(during).toBe(true);
  expect(handle.current!.checked).toBe(false);
  expect(seen.nativeEvent).toBe(payload);
});
test('named slot styles stay isolated and sx keeps spacing units', () => {
  const theme = createTheme({
    components: {
      MuiSwitch: {
        styleOverrides: {
          root: { borderWidth: 3 },
          switchBase: { borderWidth: 5 },
          thumb: { borderWidth: 7 },
          track: { borderWidth: 9 },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Switch
        sx={{ mt: 2 }}
        slotProps={{
          root: { testID: 'root' },
          switchBase: { testID: 'base' },
          input: { testID: 'input' },
          thumb: { testID: 'thumb', sx: { m: 1 } },
          track: { testID: 'track' },
        }}
      />
    </ThemeProvider>,
  );
  for (const [id, width] of [
    ['root', 3],
    ['base', 5],
    ['thumb', 7],
    ['track', 9],
  ] as const)
    expect(
      StyleSheet.flatten(tree.getByTestId(id, { includeHiddenElements: true }).props.style)
        .borderWidth,
    ).toBe(width);
  expect(StyleSheet.flatten(tree.getByTestId('root').props.style).marginTop).toBe(16);
  expect(
    StyleSheet.flatten(tree.getByTestId('thumb', { includeHiddenElements: true }).props.style)
      .margin,
  ).toBe(8);
});
test('custom icon content does not add a default thumb or accessible glyph', () => {
  const tree = render(
    <Switch icon={<Text testID="icon">Off</Text>} slotProps={{ thumb: { testID: 'thumb' } }} />,
  );
  expect(tree.queryByTestId('thumb', { includeHiddenElements: true })).toBe(null);
  expect(tree.queryByTestId('icon')).toBe(null);
  expect(tree.getByTestId('icon', { includeHiddenElements: true })).toBeTruthy();
});
test('native thumb animates changes with native driver and theme timing, without a mount animation', () => {
  const timing = jest.spyOn(Animated, 'timing'),
    theme = createTheme({
      motion: { reducedMotion: 'never' },
      transitions: { duration: { shortest: 233 }, easing: { easeInOut: 'linear' } },
    });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Switch checked={false} />
    </ThemeProvider>,
  );
  expect(timing).not.toHaveBeenCalled();
  tree.rerender(
    <ThemeProvider theme={theme}>
      <Switch checked />
    </ThemeProvider>,
  );
  expect(timing).toHaveBeenCalledTimes(1);
  expect(timing.mock.calls[0][1]).toMatchObject({
    toValue: 20,
    duration: 233,
    useNativeDriver: true,
  });
});
test('reduced motion snaps the thumb without a timing animation', () => {
  const timing = jest.spyOn(Animated, 'timing'),
    theme = createTheme({ motion: { reducedMotion: 'always' } });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Switch checked={false} />
    </ThemeProvider>,
  );
  tree.rerender(
    <ThemeProvider theme={theme}>
      <Switch checked />
    </ThemeProvider>,
  );
  expect(timing).not.toHaveBeenCalled();
});
test('small RTL thumb uses the original travel with reversed native direction', () => {
  const timing = jest.spyOn(Animated, 'timing'),
    theme = createTheme({ direction: 'rtl', motion: { reducedMotion: 'never' } });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Switch size="small" checked={false} />
    </ThemeProvider>,
  );
  tree.rerender(
    <ThemeProvider theme={theme}>
      <Switch size="small" checked />
    </ThemeProvider>,
  );
  expect(timing.mock.calls[0][1]).toMatchObject({ toValue: -16, useNativeDriver: true });
});

test('root slot sx overrides the top-level root sx', () => {
  const tree = render(
    <Switch sx={{ mt: 2 }} slotProps={{ root: { testID: 'root', sx: { mt: 3 } } }} />,
  );
  expect(StyleSheet.flatten(tree.getByTestId('root').props.style).marginTop).toBe(24);
});
test('Switch switchBase focus and blur callbacks chain before top-level callbacks', async () => {
  const calls: string[] = [];
  const model = new NativeSwitchModel();
  model.test = {
    props: { onFocus: () => calls.push('focus'), onBlur: () => calls.push('blur') },
    base: { onFocus: () => calls.push('base-focus'), onBlur: () => calls.push('base-blur') },
  };
  await model.mount();
  await act(async () => model.nodes.get('a').focus());
  await act(async () => model.nodes.get('a').blur());
  expect(calls).toEqual(['base-focus', 'focus', 'base-blur', 'blur']);
});

test('default Switch does not emit unsupported-style diagnostics and keeps a native thumb shadow', () => {
  const diagnostic = jest.fn(),
    reset = configureDiagnostics(diagnostic);
  try {
    const tree = render(<Switch slotProps={{ thumb: { testID: 'thumb' } }} />);
    expect(diagnostic).not.toHaveBeenCalled();
    const style = StyleSheet.flatten(
      tree.getByTestId('thumb', { includeHiddenElements: true }).props.style,
    );
    expect(style.boxShadow).toBe(createTheme().shadows[1]);
    expect(style.elevation).toBeUndefined();
  } finally {
    reset();
  }
});
test('small Switch reserves at least a 44dp input target with centered visual geometry', () => {
  const tree = render(<Switch size="small" slotProps={{ root: { testID: 'root' } }} />);
  expect(StyleSheet.flatten(tree.getByTestId('root').props.style)).toMatchObject({
    width: 44,
    minHeight: 44,
  });
});

test('root sx margin shorthand overrides default edge offset', () => {
  const tree = render(
    <Switch edge="start" sx={{ m: 0 }} slotProps={{ root: { testID: 'root' } }} />,
  );
  expect(StyleSheet.flatten(tree.getByTestId('root').props.style).marginStart).toBe(0);
});

test('switchBase sx styles apply to the checked interaction slot', () => {
  const tree = render(
    <Switch
      checked
      slotProps={{ switchBase: { testID: 'base', sx: { '&.Mui-checked': { opacity: 0.27 } } } }}
    />,
  );
  expect(StyleSheet.flatten(tree.getByTestId('base').props.style).opacity).toBe(0.27);
});
test('checked state selectors do not leak onto the Switch root slot', () => {
  const tree = render(
    <Switch
      checked
      sx={{ '&.Mui-checked': { opacity: 0.27 } }}
      slotProps={{ root: { testID: 'root' } }}
    />,
  );
  expect(StyleSheet.flatten(tree.getByTestId('root').props.style).opacity).toBeUndefined();
});

test.each(['ltr', 'rtl'] as const)(
  'horizontal sx cancels logical edge offset in %s',
  (direction) => {
    const tree = render(
      <ThemeProvider theme={createTheme({ direction })}>
        <Switch edge="start" sx={{ mx: 0 }} slotProps={{ root: { testID: 'root' } }} />
      </ThemeProvider>,
    );
    const style = StyleSheet.flatten(tree.getByTestId('root').props.style);
    expect(style.marginStart).toBe(0);
    expect(style.marginEnd).toBe(0);
  },
);

test('track fills the root content box without shrink-wrapped native containers', () => {
  const tree = render(
    <Switch
      sx={{ width: 68 }}
      slotProps={{ root: { testID: 'root' }, track: { testID: 'track' } }}
    />,
  );
  const track = tree.getByTestId('track', { includeHiddenElements: true }),
    root = tree.getByTestId('root');
  expect(StyleSheet.flatten(track.props.style)).toMatchObject({ width: '100%', height: '100%' });
  expect(StyleSheet.flatten(root.props.style)).toMatchObject({
    width: 68,
    paddingLeft: 12,
    paddingRight: 12,
  });
  let parent = track.parent;
  while (parent && typeof parent.type !== 'string') parent = parent.parent;
  expect(parent?.props.testID).toBe('root');
});

test.each(['thumb', 'track'] as const)(
  'RTL %s physical margins keep their authored side',
  (slot) => {
    const tree = render(
      <ThemeProvider theme={createTheme({ direction: 'rtl' })}>
        <Switch slotProps={{ [slot]: { testID: slot, style: { marginLeft: 6 } } }} />
      </ThemeProvider>,
    );
    const style = StyleSheet.flatten(
      tree.getByTestId(slot, { includeHiddenElements: true }).props.style,
    );
    expect(style.marginEnd).toBe(6);
    expect(style.marginStart).toBeUndefined();
  },
);
test('root native direction governs thumb travel and child inset mapping', () => {
  const timing = jest.spyOn(Animated, 'timing');
  const props = {
    slotProps: {
      root: { style: { direction: 'rtl' as const } },
      thumb: { testID: 'thumb', style: { marginLeft: 6 } },
    },
  };
  const tree = render(<Switch {...props} checked={false} />);
  tree.rerender(<Switch {...props} checked />);
  expect(timing.mock.calls[0][1].toValue).toBe(-20);
  expect(
    StyleSheet.flatten(tree.getByTestId('thumb', { includeHiddenElements: true }).props.style)
      .marginEnd,
  ).toBe(6);
});

test.each(['root', 'switchBase', 'thumb', 'track'] as const)(
  'RTL root inheritance reaches %s sx insets',
  (slot) => {
    const slotProps: any = { root: { style: { direction: 'rtl' } } };
    slotProps[slot] = { ...slotProps[slot], testID: slot, sx: { ml: 1 } };
    const tree = render(<Switch slotProps={slotProps} />);
    const style = StyleSheet.flatten(
      tree.getByTestId(slot, { includeHiddenElements: true }).props.style,
    );
    expect(style.marginEnd).toBe(8);
    expect(style.marginStart).toBeUndefined();
  },
);
test('switchBase native direction governs its sx inset mapping', () => {
  const tree = render(
    <Switch
      style={() => ({ direction: 'rtl' })}
      slotProps={{ switchBase: { testID: 'base', sx: { ml: 1 } } }}
    />,
  );
  const style = StyleSheet.flatten(tree.getByTestId('base').props.style);
  expect(style.marginEnd).toBe(8);
  expect(style.marginStart).toBeUndefined();
});
test('later native switchBase margins override earlier sx edges', () => {
  const tree = render(
    <Switch
      style={{ direction: 'rtl', marginLeft: 6 }}
      slotProps={{ switchBase: { testID: 'base', sx: { ml: 1 } } }}
    />,
  );
  const style = StyleSheet.flatten(tree.getByTestId('base').props.style);
  expect(style.marginEnd).toBe(6);
  expect(style.marginStart).toBeUndefined();
});

test('theme physical margin overrides the default logical edge', () => {
  const tree = render(
    <ThemeProvider
      theme={createTheme({
        components: { MuiSwitch: { styleOverrides: { root: { marginLeft: 0 } } } },
      })}
    >
      <Switch edge="start" slotProps={{ root: { testID: 'root' } }} />
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('root').props.style).marginStart).toBe(0);
});
test('later named CSS layers preserve logical and physical inset precedence', () => {
  const tree = render(
    <ThemeProvider
      theme={createTheme({
        components: {
          MuiSwitch: {
            styleOverrides: { root: { marginStart: -8 }, sizeMedium: { marginLeft: 0 } },
          },
        },
      })}
    >
      <Switch slotProps={{ root: { testID: 'root' } }} />
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('root').props.style).marginStart).toBe(0);
});
