// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import { createRef, forwardRef, useState, type ComponentType } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  type ViewInstance,
  type ViewProps,
} from 'react-native';
import {
  Card,
  Paper,
  Box,
  Typography,
  ThemeProvider,
  createTheme,
  styled,
  cardClasses,
  getCardUtilityClass,
  configureDiagnostics,
  type SharedComponentStyleArgs,
  type ComponentStyleArgs,
} from '../packages/material/src';
import Canonical, {
  Card as Named,
  Paper as LegacyPaper,
  cardClasses as CanonicalClasses,
} from '../packages/material/src/Card/index';
import { unstable_ClassNameGenerator } from '../packages/material/src/className';
import original from './fixtures/mui-card-9.5.0.json';
import { DefaultPropsProvider } from '../packages/system/src';
const flat = (style: unknown) => StyleSheet.flatten(style as any) ?? {};
const decode = (input: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(input).map(([k, v]) => [k, v === '$undefined' ? undefined : v]),
  );
const Root = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  (props, ref) => <View {...props} ref={ref} />,
);
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  unstable_ClassNameGenerator.reset();
});
test('canonical, root and additive entry points share the source class vocabulary', () => {
  expect(Canonical).toBe(Card);
  expect(Named).toBe(Card);
  expect(LegacyPaper).toBe(Paper);
  expect(CanonicalClasses).toBe(cardClasses);
  expect(cardClasses).toEqual(original.classes);
  for (const [slot, value] of Object.entries(original.utilities))
    expect(getCardUtilityClass(slot)).toBe(value);
});
test.each(original.fixtures)(
  'pinned root classes, inherited Paper and clipping: $name',
  ({ input, className, shadow }) => {
    const props = decode(input);
    const tree = render(<Card {...(props as any)} component={Root} testID="card" />);
    expect(tree.UNSAFE_getByType(Root).props.className).toBe(className);
    const style = flat(tree.getByTestId('card').props.style);
    expect(style.backgroundColor).toBe('#fff');
    expect(style.overflow).toBe(input.style?.overflow ?? input.sx?.overflow ?? 'hidden');
    expect(style.boxShadow ?? null).toBe(shadow);
    if (input.square) expect(style.borderRadius).toBeUndefined();
    else expect(style.borderRadius).toBe(4);
    if (input.variant === 'outlined') expect(style.borderWidth).toBe(1);
    if (input.sx) expect(style).toMatchObject({ padding: 16, paddingLeft: 7 });
  },
);
const args = nativeStyleCallback((a: ComponentStyleArgs) => ({
  className: a.className ?? '',
  rootHasRaised: Object.hasOwn(a, 'raised'),
  rootElevation: a.elevation ?? null,
  ownerRaised: a.ownerState.raised ?? null,
  ownerHasElevation: Object.hasOwn(a.ownerState, 'elevation'),
  ownerElevation: a.ownerState.elevation ?? null,
  ownerClassName: a.ownerState.className ?? '',
  ownerHasStyle: Object.hasOwn(a.ownerState, 'style'),
  ownerStyle: a.ownerState.style ?? null,
  rootStyle: a.style ?? null,
  direction: a.theme.direction,
}));
test.each(original.themed)(
  'original Card/Paper callback props, unused slot and variant order: $input',
  ({ input, calls: expected }) => {
    const calls: unknown[] = [];
    const theme = createTheme({
      components: {
        MuiCard: {
          styleOverrides: {
            root: nativeStyleCallback((a) => {
              calls.push({ name: 'card-root', ...args(a) });
              return { padding: 2 };
            }),
            unused: nativeStyleCallback((a) => {
              calls.push({ name: 'card-unused', ...args(a) });
              return { unsupportedUnused: 'resolved-only' };
            }),
          },
          variants: [
            {
              props: nativeStyleCallback((a) => {
                calls.push({ name: 'card-predicate', ...args(a) });
                return a.raised === true;
              }),
              style: nativeStyleCallback((a) => {
                calls.push({ name: 'card-variant', ...args(a) });
                return { marginTop: 3 };
              }),
            },
          ],
        },
        MuiPaper: {
          defaultProps: { elevation: 5 },
          styleOverrides: {
            root: nativeStyleCallback((a) => {
              calls.push({ name: 'paper-root', ...args(a) });
              return { padding: 1 };
            }),
          },
        },
      },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Card {...(decode(input) as any)} testID="card" />
      </ThemeProvider>,
    );
    expect(calls).toEqual(expected);
    expect(tree.getByTestId('card')).toHaveStyle({ padding: 2 });
    expect(flat(tree.getByTestId('card').props.style).marginTop).toBe(input.raised ? 3 : undefined);
  },
);
test.each(original.defaults)(
  'Card named defaults precede Paper defaults without consuming Paper classes: $input',
  ({ input, className, inline }) => {
    const theme = createTheme({
      components: {
        MuiCard: { defaultProps: { raised: true, classes: { root: 'card-default' } } },
        MuiPaper: {
          defaultProps: {
            elevation: 5,
            classes: { root: 'paper-default' },
            style: { paddingLeft: 13 },
          },
        },
      },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Card {...(decode(input) as any)} component={Root} testID="card" />
      </ThemeProvider>,
    );
    expect(tree.UNSAFE_getByType(Root).props.className).toBe(className);
    expect(tree.getByTestId('card')).toHaveStyle({ paddingLeft: 13 });
    expect(inline).toContain(
      '--Paper-shadow:' + flat(tree.getByTestId('card').props.style).boxShadow,
    );
  },
);
test('source callback evaluation order differs from final Paper then Card CSS cascade', () => {
  const calls: string[] = [];
  const theme = createTheme({
    components: {
      MuiCard: {
        defaultProps: {
          sx: (t) => {
            calls.push('card-sx');
            return { p: t.spacing(2) };
          },
        },
        styleOverrides: {
          root: () => {
            calls.push('card-root');
            return { padding: 3 };
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          sx: (t) => {
            calls.push('paper-sx');
            return { p: t.spacing(4) };
          },
        },
        styleOverrides: {
          root: () => {
            calls.push('paper-root');
            return { padding: 1 };
          },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Card testID="card" />
    </ThemeProvider>,
  );
  expect(calls).toEqual(original.priority.calls);
  expect(tree.getByTestId('card')).toHaveStyle({ padding: 16 });
});
test('outer styled sheets, default native style and final authored shorthand retain their precedence', () => {
  const calls: unknown[] = [];
  const Styled = styled(Card)((p) => {
    calls.push({ raised: p.raised, hasStyle: Object.hasOwn(p, 'style') });
    return { padding: 4, '&.MuiCard-root': { minHeight: 66 } };
  });
  const theme = createTheme({
    components: {
      MuiCard: { defaultProps: { style: { paddingLeft: 9 } } },
      MuiPaper: { defaultProps: { style: { paddingLeft: 13 } } },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Styled raised component={Root} testID="card" />
    </ThemeProvider>,
  );
  expect(calls).toEqual(original.styledFixture.calls);
  expect(tree.UNSAFE_getByType(Root).props.className).toBe(original.styledFixture.className);
  expect(tree.getByTestId('card')).toHaveStyle({ padding: 4, paddingLeft: 9, minHeight: 66 });
  tree.rerender(
    <ThemeProvider theme={theme}>
      <Styled testID="card" style={[{ paddingLeft: 22 }, { padding: 0, overflow: 'visible' }]} />
    </ThemeProvider>,
  );
  expect(tree.getByTestId('card')).toHaveStyle({ padding: 0, overflow: 'visible' });
  expect(flat(tree.getByTestId('card').props.style).paddingLeft).toBe(22);
});
test('an explicit empty native style blocks Paper native defaults; absence permits them', () => {
  const theme = createTheme({
    components: { MuiPaper: { defaultProps: { style: { paddingLeft: 13 } } } },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Card testID="card" style={{}} />
    </ThemeProvider>,
  );
  expect(flat(tree.getByTestId('card').props.style).paddingLeft).toBeUndefined();
  tree.rerender(
    <ThemeProvider theme={theme}>
      <Card testID="card" />
    </ThemeProvider>,
  );
  expect(tree.getByTestId('card')).toHaveStyle({ paddingLeft: 13 });
});
test('unused override slots resolve once without preparing unused CSS, and throws are retained', () => {
  const diagnostic = jest.fn(),
    restore = configureDiagnostics(diagnostic),
    unused = jest.fn(() => ({ unsupportedUnused: 'resolved-only' }));
  try {
    render(
      <ThemeProvider
        theme={createTheme({ components: { MuiCard: { styleOverrides: { unused } } } })}
      >
        <Card />
      </ThemeProvider>,
    );
    expect(unused).toHaveBeenCalledTimes(1);
    expect(diagnostic).not.toHaveBeenCalled();
    expect(() =>
      render(
        <ThemeProvider
          theme={createTheme({
            components: {
              MuiCard: {
                styleOverrides: {
                  unused: () => {
                    throw new Error('unused-card-slot');
                  },
                },
              },
            },
          })}
        >
          <Card />
        </ThemeProvider>,
      ),
    ).toThrow(original.unusedThrow);
  } finally {
    restore();
  }
});
test('active Card class getter and configurable generator retain original behavior', () => {
  let reads = 0;
  const classes = {
    get root() {
      reads++;
      return 'getter';
    },
  };
  const tree = render(<Card component={Root} classes={classes} />);
  expect(reads).toBe(original.getter.reads);
  expect(tree.UNSAFE_getByType(Root).props.className).toBe(original.getter.className);
  unstable_ClassNameGenerator.configure((name) => 'Custom' + name);
  tree.rerender(<Card component={Root} classes={{ root: 'chosen' }} />);
  expect(getCardUtilityClass('root')).toBe('CustomMuiCard-root');
  expect(cardClasses.root).toBe('MuiCard-root');
  expect(tree.UNSAFE_getByType(Root).props.className).toContain('CustomMuiCard-root chosen');
});
test('ancestor Card selectors and inherited Paper text scope compose without MuiBox/MuiStack defaults', () => {
  const theme = createTheme({
    components: {
      MuiBox: { defaultProps: { sx: { padding: 99 } } },
      MuiStack: { defaultProps: { sx: { padding: 88 } } },
      MuiCard: { styleOverrides: { root: { '& .MuiTypography-root': { letterSpacing: 2 } } } },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Box sx={{ color: 'red', fontSize: 30 }}>
        <Card testID="card" style={{ color: 'blue' }}>
          <Typography variant="inherit" testID="text">
            Body
          </Typography>
        </Card>
      </Box>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('text')).toHaveStyle({ color: 'blue', fontSize: 30, letterSpacing: 2 });
  expect(flat(tree.getByTestId('card').props.style).padding).toBeUndefined();
  expect(flat(tree.getByTestId('card').props.style).color).toBeUndefined();
});
test('selected custom root owns native events and ref cleanup while retained child state survives Card/Paper transitions', () => {
  const ref = createRef<ViewInstance>(),
    touch = jest.fn(),
    layout = jest.fn(),
    detached = jest.fn(),
    attached = jest.fn(() => detached);
  const Custom = forwardRef<
    ViewInstance,
    ViewProps & { tracking: string; className?: string | undefined }
  >(({ tracking, className: _className, ...props }, forwarded) => (
    <View {...props} ref={forwarded} nativeID={tracking} />
  ));
  const Counter = () => {
    const [n, set] = useState(0);
    return (
      <Text testID="counter" onPress={() => set(n + 1)}>
        {n}
      </Text>
    );
  };
  const scene = (
    raised: boolean,
    elevation: number | undefined,
    variant: 'elevation' | 'outlined',
    dark: boolean,
  ) => (
    <ThemeProvider theme={createTheme({ palette: { mode: dark ? 'dark' : 'light' } })}>
      <Card
        component={Custom}
        tracking="tracked"
        ref={attached}
        raised={raised}
        elevation={elevation}
        variant={variant}
        testID="card"
        onTouchEnd={touch}
        onLayout={layout}
      >
        <Counter />
      </Card>
    </ThemeProvider>
  );
  const tree = render(scene(false, undefined, 'elevation', false), { createNodeMock: () => ({}) });
  const first = tree.getByTestId('card');
  fireEvent.press(tree.getByTestId('counter'));
  for (const [raised, elevation, variant, dark] of [
    [true, undefined, 'elevation', true],
    [false, 0, 'outlined', false],
    [true, 3, 'elevation', false],
  ] as const) {
    tree.rerender(scene(raised, elevation, variant, dark));
    expect(tree.getByTestId('card')).toBe(first);
    expect(tree.getByTestId('counter').props.children).toBe(1);
  }
  fireEvent(first, 'touchEnd', { nativeEvent: { pageX: 9 } });
  fireEvent(first, 'layout', { nativeEvent: { layout: { width: 80 } } });
  expect(touch).toHaveBeenCalledTimes(1);
  expect(layout).toHaveBeenCalledTimes(1);
  expect(first.props.nativeID).toBe('tracked');
  expect(attached).toHaveBeenCalledTimes(1);
  expect(detached).not.toHaveBeenCalled();
  tree.unmount();
  expect(detached).toHaveBeenCalledTimes(1);
  const object = render(<Card ref={ref} />, { createNodeMock: () => ({}) });
  expect(ref.current).not.toBeNull();
  object.unmount();
  expect(ref.current).toBeNull();
});
test('Card default elevation is resolved before raised spread and before Paper named defaults', () => {
  const theme = createTheme({
    components: {
      MuiCard: { defaultProps: { elevation: 3, raised: true } },
      MuiPaper: { defaultProps: { elevation: 5 } },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Card testID="card" elevation={undefined} />
    </ThemeProvider>,
  );
  expect(flat(tree.getByTestId('card').props.style).boxShadow).toBe(theme.shadows[3]);
  tree.rerender(
    <ThemeProvider theme={theme}>
      <Card testID="card" raised={false} elevation={0} />
    </ThemeProvider>,
  );
  expect(flat(tree.getByTestId('card').props.style).boxShadow).toBe('none');
});
test('scoped Material theme controls Card defaults and inherited Paper styling', () => {
  const counter = () => <Text testID="text">Body</Text>;
  const inner = createTheme({
    shape: { borderRadius: 11 },
    components: {
      MuiCard: { defaultProps: { raised: true } },
      MuiPaper: { styleOverrides: { root: { opacity: 0.7 } } },
    },
  });
  const tree = render(
    <ThemeProvider theme={{ $$material: inner }}>
      <Card testID="card">{counter()}</Card>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('card')).toHaveStyle({
    borderRadius: 11,
    opacity: 0.7,
    boxShadow: inner.shadows[8],
  });
});
test('native numeric padding shorthand can reset Card CSS edges without converting native priority', () => {
  const input = Object.freeze({ padding: 0 });
  const tree = render(
    <Card testID="card" sx={{ paddingLeft: 22, overflow: 'scroll' }} style={input} />,
  );
  expect(tree.getByTestId('card')).toHaveStyle({ padding: 0, overflow: 'scroll' });
  expect(flat(tree.getByTestId('card').props.style).paddingLeft).toBeUndefined();
  expect(input).toEqual({ padding: 0 });
});
test('outer styled CSS remains after both named component cascades', () => {
  const Styled = styled(Card)({ padding: 4, overflow: 'scroll' });
  const theme = createTheme({
    components: {
      MuiCard: {
        defaultProps: { sx: { p: 2 } },
        styleOverrides: { root: { padding: 3, overflow: 'visible' } },
      },
      MuiPaper: {
        defaultProps: { sx: { p: 4 } },
        styleOverrides: { root: { padding: 1, overflow: 'visible' } },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Styled testID="card" />
    </ThemeProvider>,
  );
  const sourcePadding = [...original.layeredFixture.css.matchAll(/padding:(\d+)px/g)].at(-1)?.[1];
  const sourceOverflow = [...original.layeredFixture.css.matchAll(/overflow:(\w+)/g)].at(-1)?.[1];
  expect(sourcePadding).toBeDefined();
  expect(sourceOverflow).toBeDefined();
  expect(tree.getByTestId('card')).toHaveStyle({ padding: Number(sourcePadding) });
  expect(flat(tree.getByTestId('card').props.style).overflow).toBe(sourceOverflow);
});
test('Card prepared CSS retains shadow currentColor, descendant text and responsive padding at the final root', () => {
  const theme = createTheme({
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            color: 'green',
            boxShadow: '0 0 2px currentColor',
            '& .MuiTypography-root': { fontSize: '1em' },
          },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Card testID="card" sx={{ fontSize: 24, p: { xs: 1, sm: 2 } }}>
        <Typography variant="inherit" testID="text">
          Body
        </Typography>
      </Card>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('card')).toHaveStyle({ boxShadow: '0 0 2px green' });
  expect(tree.getByTestId('text')).toHaveStyle({ color: 'green', fontSize: 24 });
  expect(flat(tree.getByTestId('card').props.style).padding).toBe(
    Dimensions.get('window').width >= 600 ? 16 : 8,
  );
});
test('Card selectors bind to final Paper state classes and update without stale prepared sheets', () => {
  const theme = createTheme({
    components: {
      MuiCard: { styleOverrides: { root: { '&.MuiPaper-elevation8': { opacity: 0.8 } } } },
    },
  });
  const scene = (raised: boolean) => (
    <ThemeProvider theme={theme}>
      <Card raised={raised} testID="card" />
    </ThemeProvider>
  );
  const tree = render(scene(false));
  expect(flat(tree.getByTestId('card').props.style).opacity).toBeUndefined();
  tree.rerender(scene(true));
  expect(tree.getByTestId('card')).toHaveStyle({ opacity: 0.8 });
  tree.rerender(scene(false));
  expect(flat(tree.getByTestId('card').props.style).opacity).toBeUndefined();
});
test('separate Card and Paper default context updates preserve the selected native root and child state', () => {
  const Counter = () => {
    const [n, set] = useState(0);
    return (
      <Text testID="child" onPress={() => set(n + 1)}>
        {n}
      </Text>
    );
  };
  const scene = (raised: boolean, paddingLeft: number) => (
    <DefaultPropsProvider
      value={{
        MuiCard: { defaultProps: { raised } },
        MuiPaper: { defaultProps: { style: { paddingLeft } } },
      }}
    >
      <Card testID="card">
        <Counter />
      </Card>
    </DefaultPropsProvider>
  );
  const tree = render(scene(false, 13)),
    root = tree.getByTestId('card');
  fireEvent.press(tree.getByTestId('child'));
  tree.rerender(scene(true, 17));
  expect(tree.getByTestId('card')).toBe(root);
  expect(tree.getByTestId('child').props.children).toBe(1);
  expect(root).toHaveStyle({ paddingLeft: 17, boxShadow: createTheme().shadows[8] });
});
test.each(original.reserved.production)(
  'original reserved Card styling and base selection: $name',
  (expected) => {
    const calls: unknown[] = [],
      received: unknown[] = [];
    const name = expected.name,
      authored =
        name === 'owner-null'
          ? null
          : name === 'owner-undefined'
            ? undefined
            : name === 'owner-style-only'
              ? { marker: 'authored', style: { paddingLeft: 7 } }
              : { marker: 'authored' };
    const capture = (layer: string, a: SharedComponentStyleArgs) => {
      const owner =
        a.ownerState && typeof a.ownerState === 'object'
          ? (a.ownerState as Record<string, unknown>)
          : undefined;
      return {
        layer,
        ownerIdentity: a.ownerState === authored,
        ownerNull: a.ownerState === null,
        ownerUndefined: a.ownerState === undefined,
        marker: owner?.marker ?? null,
        raised: owner?.raised ?? null,
        rootHasStyle: Object.hasOwn(a, 'style'),
        rootStyle: a.style ?? null,
        ownerHasStyle: a.ownerState != null && Object.hasOwn(a.ownerState, 'style'),
        ownerStyle: owner?.style ?? null,
      };
    };
    let Custom: ComponentType<any>;
    const host = (kind: string) =>
      forwardRef<
        ViewInstance,
        ViewProps & {
          className?: string;
          theme?: ReturnType<typeof createTheme>;
          as?: ComponentType<any> | null;
          ownerState?: Record<string, unknown> | null;
          component?: ComponentType<any>;
          elevation?: number;
        }
      >((p, r) => {
        received.push({
          kind,
          className: p.className,
          componentIsCustom: p.component === Custom,
          elevation: p.elevation ?? null,
          hasOwnerState: Object.hasOwn(p, 'ownerState'),
          hasTheme: Object.hasOwn(p, 'theme'),
          hasAs: Object.hasOwn(p, 'as'),
          hasClasses: Object.hasOwn(p, 'classes'),
        });
        const { className: _class, component: _component, elevation: _elevation, ...native } = p;
        return <View {...native} ref={r} testID={kind} />;
      });
    Custom = host('custom');
    const Alternate = host('alternate');
    const provider = createTheme({
      components: {
        MuiCard: {
          styleOverrides: {
            root: (a) => {
              calls.push(capture('card-provider', a));
              return { opacity: 0.2 };
            },
          },
        },
        MuiPaper: {
          ...(name === 'owner-style-only' || name === 'owner-undefined-style-no-default'
            ? {}
            : { defaultProps: { style: { paddingLeft: 13 } } }),
          styleOverrides: {
            root: (a) => {
              calls.push(capture('paper-provider', a));
              return { backgroundColor: '#1565c0' };
            },
          },
        },
      },
    });
    const explicit = createTheme({
      components: {
        MuiCard: {
          styleOverrides: {
            root: (a) => {
              calls.push(capture('card-explicit', a));
              return { opacity: 0.7 };
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: (a) => {
              calls.push(capture('paper-explicit', a));
              return { backgroundColor: '#b71c1c' };
            },
          },
        },
      },
    });
    const props = {
      component: Custom,
      ...(name === 'explicit-theme' || name === 'combined' ? { theme: explicit } : {}),
      ...(name.startsWith('owner-') || name === 'combined'
        ? { raised: true, ownerState: authored }
        : {}),
      ...(name === 'owner-object-undefined-style' || name === 'owner-undefined-style-no-default'
        ? { style: undefined }
        : {}),
      ...(name === 'owner-object-null-style' ? { style: null } : {}),
      ...(name === 'as-native' || name === 'combined' ? { as: Alternate } : {}),
      ...(name === 'as-undefined' ? { as: undefined } : {}),
    };
    const tree = render(
      <ThemeProvider theme={provider}>
        <Card {...(props as any)}>Body</Card>
      </ThemeProvider>,
    );
    expect(calls).toEqual(expected.calls);
    expect(received.at(-1)).toEqual(expected.received.at(-1));
    const alternate = name === 'as-native' || name === 'combined',
      root = tree.getByTestId(alternate ? 'alternate' : 'custom'),
      style = flat(root.props.style);
    expect(style.opacity).toBe(name === 'explicit-theme' || name === 'combined' ? 0.7 : 0.2);
    if (alternate) {
      expect(tree.queryByTestId('custom')).toBeNull();
      expect(style.backgroundColor).toBeUndefined();
      expect(style.paddingLeft).toBeUndefined();
      expect(style.boxShadow).toBeUndefined();
      expect(received.at(-1)).toMatchObject({ className: 'MuiCard-root' });
    } else expect(style.backgroundColor).toBe('#1565c0');
    expect(authored).toEqual(
      name === 'owner-null'
        ? null
        : name === 'owner-undefined'
          ? undefined
          : name === 'owner-style-only'
            ? { marker: 'authored', style: { paddingLeft: 7 } }
            : { marker: 'authored' },
    );
  },
);
test('original explicit-theme evidence distinguishes production success from React development frozen-props failure', () => {
  expect(
    original.reserved.production.find((row) => row.name === 'explicit-theme'),
  ).not.toHaveProperty('error');
  expect(original.reserved.development.find((row) => row.name === 'explicit-theme')?.error).toMatch(
    /read only property 'theme'/,
  );
});
test('native alternate Card host binds descendants/inherited text and refs without Paper defaults or scope', () => {
  const attached = jest.fn(() => released),
    released = jest.fn(),
    layout = jest.fn();
  const Alternate = forwardRef<
    ViewInstance,
    ViewProps & { className?: string; component?: unknown; elevation?: number }
  >(({ component: _component, elevation: _elevation, ...p }, r) => <View {...p} ref={r} />);
  const Selected = forwardRef<ViewInstance, ViewProps & { as?: typeof Alternate | 'div' | null }>(
    (p, r) => <View {...p} ref={r} />,
  );
  const theme = createTheme({
    components: {
      MuiPaper: {
        defaultProps: { style: { padding: 40, opacity: 0.1 }, nativeID: 'paper-trap' },
        styleOverrides: { root: { backgroundColor: 'red' } },
      },
      MuiCard: {
        styleOverrides: {
          root: { backgroundColor: '#0b5d44', '& .MuiTypography-root': { letterSpacing: 2 } },
        },
      },
    },
  });
  const scene = (alternate: typeof Alternate | 'div' | null) => (
    <ThemeProvider theme={theme}>
      <Box sx={{ color: 'blue', fontSize: 24 }}>
        <Card
          component={Selected}
          as={alternate}
          ref={attached}
          testID="alternate"
          raised
          onLayout={layout}
        >
          <Typography variant="inherit" testID="text">
            Body
          </Typography>
        </Card>
      </Box>
    </ThemeProvider>
  );
  const tree = render(scene(Alternate), { createNodeMock: () => ({}) });
  expect(tree.getByTestId('alternate')).toHaveStyle({
    backgroundColor: '#0b5d44',
    overflow: 'hidden',
  });
  expect(tree.getByTestId('alternate').props.nativeID).toBeUndefined();
  expect(flat(tree.getByTestId('alternate').props.style).padding).toBeUndefined();
  expect(tree.getByTestId('text')).toHaveStyle({ color: 'blue', fontSize: 24, letterSpacing: 2 });
  fireEvent(tree.getByTestId('alternate'), 'layout', { nativeEvent: { layout: { width: 80 } } });
  expect(layout).toHaveBeenCalledTimes(1);
  expect(attached).toHaveBeenCalledTimes(1);
  tree.rerender(scene(Alternate));
  expect(attached).toHaveBeenCalledTimes(1);
  tree.unmount();
  expect(released).toHaveBeenCalledTimes(1);
  const alias = render(scene('div'));
  expect(flat(alias.getByTestId('alternate').props.style).padding).toBeUndefined();
  alias.unmount();
  const normal = render(scene(null));
  expect(normal.getByTestId('alternate').props.nativeID).toBe('paper-trap');
  expect(normal.getByTestId('alternate')).toHaveStyle({ padding: 40, opacity: 0.1 });
});
