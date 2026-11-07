// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet, Platform, View, Text, type ViewInstance, type ViewProps } from 'react-native';
import {
  Paper,
  Card,
  Box,
  Typography,
  Stack,
  ThemeProvider,
  createTheme,
  styled,
  paperClasses,
  getPaperUtilityClass,
  configureDiagnostics,
  useTheme,
  type ComponentStyleArgs,
} from '../packages/material/src';
import Canonical, {
  Paper as Named,
  Box as LegacyBox,
  Card as LegacyCard,
  paperClasses as CanonicalClasses,
} from '../packages/material/src/Paper/index';
import original from './fixtures/mui-paper-9.5.0.json';
const processBackgroundImage = require('react-native/Libraries/StyleSheet/processBackgroundImage')
  .default as (input: unknown) => unknown;
const flat = (value: unknown) => StyleSheet.flatten(value as any) ?? {};
const Root = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  (props, ref) => <View {...props} ref={ref} />,
);
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

test('root/canonical/additive entry points and complete pinned class vocabulary', () => {
  expect(Canonical).toBe(Paper);
  expect(Named).toBe(Paper);
  expect(LegacyBox).toBe(Box);
  expect(LegacyCard).toBe(Card);
  expect(CanonicalClasses).toBe(paperClasses);
  expect(paperClasses).toEqual(original.classes);
  for (const [slot, value] of Object.entries(original.utilities))
    expect(getPaperUtilityClass(slot)).toBe(value);
});
test.each(original.fixtures)(
  'source classes and base declarations: $name',
  ({ input, className, css, shadow }) => {
    const tree = render(<Paper {...(input as any)} component={Root} testID="paper" />);
    expect(tree.UNSAFE_getByType(Root).props.className).toBe(className);
    const style = flat(tree.getByTestId('paper').props.style);
    expect(style.backgroundColor).toBe('#fff');
    if (css?.includes('border-radius:')) expect(style.borderRadius).toBe(4);
    else expect(style.borderRadius).toBeUndefined();
    if (input.variant === 'outlined')
      expect(style).toMatchObject({
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(0, 0, 0, 0.12)',
      });
    else expect(style.borderWidth).toBeUndefined();
    const variant = input.variant ?? 'elevation';
    if (variant === 'elevation') expect(style.boxShadow).toBe(shadow);
    else expect(style.boxShadow).toBeUndefined();
    expect(style.backgroundImage).toBeUndefined();
  },
);
test.each(original.dark)(
  'dark elevation $elevation uses exact source alpha and actual RN gradient conversion',
  ({ elevation, alpha, style: sourceInline }) => {
    const tree = render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <Paper testID="paper" elevation={elevation} />
      </ThemeProvider>,
    );
    const style = flat(tree.getByTestId('paper').props.style);
    const color = `rgba(255, 255, 255, ${alpha})`,
      css = `linear-gradient(${color}, ${color})`;
    expect(sourceInline).toContain('--Paper-overlay:' + css);
    expect(style.backgroundColor).toBe('#121212');
    expect(style.backgroundImage).toEqual([
      { type: 'linear-gradient', colorStops: [{ color }, { color }] },
    ]);
    const processed = processBackgroundImage(style.backgroundImage);
    expect(processed).toEqual(processBackgroundImage(css));
    expect(processed).toEqual([
      expect.objectContaining({ type: 'linear-gradient', colorStops: expect.any(Array) }),
    ]);
  },
);
test('the same host and retained child survive all depth/variant/square/dark changes', () => {
  const attached = jest.fn(() => () => cleaned()),
    cleaned = jest.fn();
  const Counter = () => {
    const [n, set] = useState(0);
    return (
      <Text testID="counter" onPress={() => set(n + 1)}>
        {n}
      </Text>
    );
  };
  const tree = render(
    <ThemeProvider theme={createTheme()}>
      <Paper ref={attached} testID="paper">
        <Counter />
      </Paper>
    </ThemeProvider>,
    { createNodeMock: (node) => (node.type === 'View' ? {} : null) },
  );
  const first = tree.getByTestId('paper');
  fireEvent.press(tree.getByTestId('counter'));
  for (const [elevation, variant, square, dark] of [
    [24, 'elevation', true, true],
    [0, 'outlined', false, true],
    [3, 'glass', false, false],
    [1, 'elevation', false, false],
  ] as const) {
    tree.rerender(
      <ThemeProvider theme={createTheme({ palette: { mode: dark ? 'dark' : 'light' } })}>
        <Paper
          ref={attached}
          testID="paper"
          elevation={elevation}
          variant={variant as any}
          square={square}
        >
          <Counter />
        </Paper>
      </ThemeProvider>,
    );
    expect(tree.getByTestId('counter').props.children).toBe(1);
    expect(tree.getByTestId('paper')).toBe(first);
    const image = flat(tree.getByTestId('paper').props.style).backgroundImage;
    if (dark && variant === 'elevation') expect(image).toHaveLength(1);
    else expect(image).toBeUndefined();
  }
  expect(attached).toHaveBeenCalledTimes(1);
  expect(cleaned).not.toHaveBeenCalled();
  tree.unmount();
  expect(cleaned).toHaveBeenCalledTimes(1);
});
const callbackArgs = (args: ComponentStyleArgs) => ({
  className: args.className,
  component: typeof args.ownerState.component === 'string' ? args.ownerState.component : 'custom',
  elevation: args.ownerState.elevation,
  square: args.ownerState.square,
  variant: args.ownerState.variant,
  rootStyle: args.style ?? null,
  ownerStyle: args.ownerState.style ?? null,
  rootHasElevation: Object.hasOwn(args, 'elevation'),
  as: typeof args.as === 'string' ? args.as : 'custom',
});
test.each(original.themed)(
  'source callback argument/slot order and selected CSS: $input',
  ({ input, calls: expected }) => {
    const calls: unknown[] = [];
    const styleOverrides = Object.fromEntries(
      ['root', 'rounded', 'elevation', 'outlined', 'elevation3'].map((slot, index) => [
        slot,
        (args: ComponentStyleArgs) => {
          calls.push({ slot, args: callbackArgs(args) });
          return { opacity: (index + 1) / 10 };
        },
      ]),
    );
    const theme = createTheme({
      components: {
        MuiPaper: {
          styleOverrides,
          variants: [{ props: { elevation: 3 }, style: { padding: 7 } }],
        },
      },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Paper {...(input as any)} testID="paper" />
      </ThemeProvider>,
    );
    expect(calls).toEqual(expected);
    expect(tree.getByTestId('paper')).toHaveStyle({
      opacity:
        input.elevation === 3 && input.variant !== 'outlined' ? 0.5 : input.square ? 0.3 : 0.2,
    });
    if (input.elevation === 3)
      expect(tree.getByTestId('paper')).toHaveStyle({ padding: input.style?.padding ?? 7 });
  },
);
test('theme defaults and explicit undefined use source owner defaults and active classes', () => {
  const theme = createTheme({
    components: {
      MuiPaper: {
        defaultProps: {
          elevation: 3,
          square: true,
          variant: 'outlined',
          classes: { root: 'default-root' },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Paper component={Root} testID="paper" elevation={undefined} square={undefined} />
    </ThemeProvider>,
  );
  expect(tree.UNSAFE_getByType(Root).props.className).toBe(original.defaults.className);
  expect(flat(tree.getByTestId('paper').props.style).boxShadow).toBeUndefined();
  expect(flat(tree.getByTestId('paper').props.style).borderRadius).toBeUndefined();
});
test('styled/default/variant/sx layers stay below final genuine native style arrays and shorthand resets', () => {
  const Styled = styled(Paper)({
    opacity: 0.2,
    '&.MuiPaper-elevation3': { opacity: 0.7 },
    '& .MuiTypography-root': { letterSpacing: 2 },
  });
  const tree = render(
    <Styled
      component={Root}
      elevation={3}
      testID="paper"
      sx={{ opacity: 0.8, paddingLeft: 22, borderWidth: 8 }}
      style={[{ opacity: 0.9 }, { padding: 0, borderWidth: 0 }]}
    >
      <Typography testID="text">Nested</Typography>
    </Styled>,
  );
  expect(tree.getByTestId('paper')).toHaveStyle({ opacity: 0.9, padding: 0, borderWidth: 0 });
  expect(flat(tree.getByTestId('paper').props.style).paddingLeft).toBeUndefined();
  expect(tree.getByTestId('text')).toHaveStyle({ letterSpacing: 2 });
  expect(tree.UNSAFE_getByType(Root).props.className).toBe(original.styledFixture.className);
});
test('genuine native images, legacy alias and explicit resets override the default overlay without input mutation', () => {
  const theme = createTheme({ palette: { mode: 'dark' } });
  const authored = Object.freeze({ backgroundImage: [] });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Paper testID="paper" style={authored} />
    </ThemeProvider>,
  );
  expect(flat(tree.getByTestId('paper').props.style).backgroundImage).toEqual([]);
  expect(authored).toEqual({ backgroundImage: [] });
  for (const style of [
    { backgroundImage: undefined },
    { backgroundImage: null },
    { experimental_backgroundImage: [] },
  ]) {
    tree.rerender(
      <ThemeProvider theme={theme}>
        <Paper testID="paper" style={style as any} />
      </ThemeProvider>,
    );
    const value = flat(tree.getByTestId('paper').props.style);
    expect(value.backgroundImage).toBe(style.backgroundImage);
    if ('experimental_backgroundImage' in style)
      expect(value.experimental_backgroundImage).toEqual([]);
  }
});
test('outlined/custom variants do not clear authored shadows or add elevation overlays', () => {
  for (const variant of ['outlined', 'glass']) {
    const tree = render(
      <ThemeProvider
        theme={createTheme({
          palette: { mode: 'dark' },
          components: { MuiPaper: { styleOverrides: { root: { boxShadow: '0 0 4px red' } } } },
        })}
      >
        <Paper variant={variant as any} testID="paper" />
      </ThemeProvider>,
    );
    expect(tree.getByTestId('paper')).toHaveStyle({ boxShadow: '0 0 4px red' });
    expect(flat(tree.getByTestId('paper').props.style).backgroundImage).toBeUndefined();
    tree.unmount();
  }
});
test('Paper resets inherited text color while preserving metric and authored native color overrides', () => {
  const tree = render(
    <Box sx={{ color: 'red', fontSize: 30 }}>
      <Paper testID="paper" style={{ color: 'blue' }}>
        <Typography variant="inherit" testID="text">
          Child
        </Typography>
      </Paper>
    </Box>,
  );
  expect(tree.getByTestId('text')).toHaveStyle({ color: 'blue', fontSize: 30 });
  expect(flat(tree.getByTestId('paper').props.style).color).toBeUndefined();
});
test('opaque custom root receives genuine native props/events and composes later styles before host emission', () => {
  const ref = createRef<ViewInstance>(),
    touch = jest.fn(),
    layout = jest.fn();
  const Custom = forwardRef<ViewInstance, ViewProps & { tracking: string; className?: string }>(
    ({ tracking, className: _className, style, ...props }, forwarded) => (
      <View {...props} nativeID={tracking} ref={forwarded} style={[style, { marginLeft: 12 }]} />
    ),
  );
  const tree = render(
    <Paper
      component={Custom}
      tracking="owned"
      ref={ref}
      testID="paper"
      onTouchEnd={touch}
      onLayout={layout}
      style={{ direction: 'rtl', marginLeft: 6, marginStart: 8 }}
    />,
    { createNodeMock: () => ({}) },
  );
  expect(ref.current).not.toBeNull();
  expect(tree.getByTestId('paper')).toHaveProp('nativeID', 'owned');
  expect(tree.getByTestId('paper')).toHaveStyle({ marginLeft: 12, marginStart: 8 });
  fireEvent(tree.getByTestId('paper'), 'touchEnd', { nativeEvent: { pageX: 12 } });
  fireEvent(tree.getByTestId('paper'), 'layout', { nativeEvent: { layout: { width: 80 } } });
  expect(touch).toHaveBeenCalledTimes(1);
  expect(layout).toHaveBeenCalledTimes(1);
});
test('invalid shadow index diagnoses without inventing a fallback shadow', () => {
  const collect = jest.fn(),
    restore = configureDiagnostics(collect);
  try {
    const tree = render(<Paper elevation={25} testID="paper" />);
    expect(flat(tree.getByTestId('paper').props.style).boxShadow).toBeUndefined();
    expect(collect).toHaveBeenCalledWith(expect.objectContaining({ code: 'paper-elevation' }));
  } finally {
    restore();
  }
});
test('Card keeps its existing Paper dependency, overflow clipping and final authored styles', () => {
  const tree = render(
    <Card testID="card" sx={{ p: 2 }} style={{ opacity: 0.8 }}>
      <Stack>
        <Text>Body</Text>
      </Stack>
    </Card>,
  );
  expect(tree.getByTestId('card')).toHaveStyle({ overflow: 'hidden', padding: 16, opacity: 0.8 });
  expect(tree.getByText('Body')).toBeTruthy();
});

test('Paper retains the established Android pre-API28 elevation fallback', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(27);
  const collect = jest.fn(),
    restore = configureDiagnostics(collect);
  try {
    const tree = render(<Paper elevation={3} testID="legacy" />);
    expect(tree.getByTestId('legacy')).toHaveStyle({ elevation: 3 });
    expect(flat(tree.getByTestId('legacy').props.style).boxShadow).toBeUndefined();
    expect(collect).toHaveBeenCalledWith(expect.objectContaining({ code: 'box-shadow-platform' }));
  } finally {
    restore();
  }
});

test('callback CSS-variable metadata and owner styling props do not leak to native hosts', () => {
  const tree = render(
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <Paper component={Root} testID="paper" sx={{ opacity: 0.8 }} classes={{ root: 'custom' }}>
        Text
      </Paper>
    </ThemeProvider>,
  );
  const node = tree.getByTestId('paper');
  expect(Object.keys(flat(node.props.style)).some((key) => key.startsWith('--'))).toBe(false);
  const props = tree.UNSAFE_getByType(Root).props;
  for (const key of ['sx', 'classes', 'ownerState', 'elevation', 'variant', 'square'])
    expect(Object.hasOwn(props, key)).toBe(false);
});

test('Paper preserves CSS-none border provenance through dark overlay and native solid resets', () => {
  const theme = createTheme({ palette: { mode: 'dark' } });
  const scene = (solid: boolean) => (
    <ThemeProvider theme={theme}>
      <Paper
        testID="paper"
        variant="elevation"
        sx={{ borderWidth: 1, borderStyle: 'none' }}
        style={solid ? { borderStyle: 'solid' } : undefined}
      />
    </ThemeProvider>
  );
  const tree = render(scene(false));
  expect(tree.getByTestId('paper')).toHaveStyle({ borderWidth: 0 });
  tree.rerender(scene(true));
  expect(tree.getByTestId('paper')).toHaveStyle({ borderWidth: 1, borderStyle: 'solid' });
  tree.rerender(scene(false));
  expect(tree.getByTestId('paper')).toHaveStyle({ borderWidth: 0 });
});

test.each(original.shadowAccess)('source shadow capture $mode/$variant/$behavior', (expected) => {
  let reads = 0,
    error: string | null = null,
    metadata: unknown = null,
    paint: unknown = null;
  function Armed() {
    const theme = useTheme(),
      shadows = Array(25).fill('none');
    Object.defineProperty(shadows, '1', {
      get() {
        reads++;
        if (expected.behavior === 'throw-first') throw Error('unused-shadow');
        if (expected.behavior === 'throw-second' && reads > 1) throw Error('shadow-read-again');
        return reads === 1 ? '0 0 4px red' : '0 0 8px blue';
      },
    });
    Object.defineProperty(theme, 'shadows', { value: shadows, writable: true, configurable: true });
    theme.components.MuiPaper = {
      styleOverrides: {
        root: (args) => {
          metadata = (args.style as Record<string, unknown>)['--Paper-shadow'] ?? null;
          return {};
        },
      },
    };
    return (
      <Paper testID="captured" variant={expected.variant as any}>
        Body
      </Paper>
    );
  }
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = expected.mode;
  try {
    const tree = render(
      <ThemeProvider theme={createTheme()}>
        <Armed />
      </ThemeProvider>,
    );
    paint = flat(tree.getByTestId('captured').props.style).boxShadow ?? null;
  } catch (caught) {
    error = (caught as Error).message;
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
    cleanup();
  }
  expect({ error, metadata, paint }).toEqual({
    error: expected.error,
    metadata: expected.metadata,
    paint: expected.inlineShadow,
  });
  // Renderer retry counts on throws are not compared. Successful production
  // must neither observe an inactive slot nor repeat an active source lookup.
  if (expected.mode === 'production') expect(reads).toBe(expected.reads);
});
test.each(['production', 'development'])(
  'legacy Android reuses one captured shadow value in %s',
  (mode) => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(27);
    let reads = 0,
      metadata: unknown;
    const collect = jest.fn(),
      restore = configureDiagnostics(collect);
    function Armed() {
      const theme = useTheme(),
        shadows = Array(25).fill('none');
      Object.defineProperty(shadows, '1', {
        get() {
          reads++;
          return reads === 1 ? '0 0 4px red' : '0 0 8px blue';
        },
      });
      Object.defineProperty(shadows, '3', {
        get() {
          throw Error('unrelated-shadow');
        },
      });
      Object.freeze(shadows);
      Object.defineProperty(theme, 'shadows', {
        value: shadows,
        writable: false,
        configurable: false,
      });
      theme.components.MuiPaper = {
        styleOverrides: {
          root: (args) => {
            metadata = (args.style as Record<string, unknown>)['--Paper-shadow'];
            return {};
          },
        },
      };
      return <Paper testID="captured" />;
    }
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = mode;
    try {
      const tree = render(
        <ThemeProvider theme={createTheme()}>
          <Armed />
        </ThemeProvider>,
      );
      expect(reads).toBe(mode === 'production' ? 1 : 2);
      expect(metadata).toBe(mode === 'production' ? '0 0 4px red' : '0 0 8px blue');
      expect(tree.getByTestId('captured')).toHaveStyle({
        elevation: 1,
        shadowRadius: 1,
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 0.5 },
      });
      expect(collect).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'box-shadow-platform' }),
      );
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
      cleanup();
      restore();
    }
  },
);
test('literal theme shadow strings cannot select another numeric token', () => {
  const collect = jest.fn(),
    restore = configureDiagnostics(collect);
  function Armed() {
    const theme = useTheme(),
      shadows = Array(25).fill('none');
    shadows[1] = '3';
    Object.defineProperty(shadows, '3', {
      get() {
        throw Error('unused-shadow-index');
      },
    });
    Object.defineProperty(theme, 'shadows', { value: shadows });
    return <Paper testID="captured" />;
  }
  try {
    const tree = render(
      <ThemeProvider theme={createTheme()}>
        <Armed />
      </ThemeProvider>,
    );
    expect(flat(tree.getByTestId('captured').props.style).boxShadow).toBeUndefined();
    expect(collect).toHaveBeenCalledWith(expect.objectContaining({ code: 'box-shadow' }));
  } finally {
    restore();
  }
});

test.each(original.shadowTableAccess)('source shadow table access $mode', (expected) => {
  let reads = 0,
    metadata: unknown = null;
  function Armed() {
    const theme = useTheme(),
      shadows = Array(25).fill('none');
    shadows[1] = '0 0 4px red';
    Object.defineProperty(theme, 'shadows', {
      configurable: true,
      get() {
        reads++;
        if (reads > expected.reads) throw Error('shadow-table-read-again');
        return shadows;
      },
    });
    theme.components.MuiPaper = {
      styleOverrides: {
        root: (args) => {
          metadata = (args.style as Record<string, unknown>)['--Paper-shadow'];
          return {};
        },
      },
    };
    return <Paper testID="table-shadow">Body</Paper>;
  }
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = expected.mode;
  try {
    const tree = render(
      <ThemeProvider theme={createTheme()}>
        <Armed />
      </ThemeProvider>,
    );
    expect(metadata).toBe(expected.metadata);
    expect(flat(tree.getByTestId('table-shadow').props.style).boxShadow).toBe(
      expected.inlineShadow,
    );
    expect(reads).toBe(expected.reads);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
    cleanup();
  }
});
