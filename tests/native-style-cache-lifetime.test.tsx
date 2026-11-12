// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import { nativeStyleCacheRegistry as registry } from '../packages/system/src/nativeStyleCache';
import React, { useLayoutEffect } from 'react';
import { render, cleanup, fireEvent, act } from '@testing-library/react-native';
import { Text, View, StyleSheet } from 'react-native';
import {
  createNativeStyleCache,
  NativeStyleCacheProvider,
  componentRootStyle,
  createTheme,
  type NativeStyleCache,
} from '../packages/system/src';
import {
  Button,
  ButtonBase,
  ButtonGroup,
  ThemeProvider,
  type ButtonBaseRootProps,
  type ButtonBaseActions,
  type ButtonProps,
} from '../packages/material/src';
import {
  NativeCssInsertionScope,
  nativeCssProgram,
  nativeStyleInsertions,
} from '../packages/system/src/internal/prepared-style';
import reference from './fixtures/mui-button-group-cache-9.5.0.json';
import { Commands } from '../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';
beforeEach(() => {
  for (const key of ['focus', 'blur', 'setPressed', 'setHotspot'] as const)
    jest.spyOn(Commands, key).mockImplementation(() => {});
});
const caches: NativeStyleCache[] = [];
const make = (key: string) => {
  const cache = createNativeStyleCache({ key });
  caches.push(cache);
  return cache;
};
afterEach(() => {
  cleanup();
  for (const cache of caches.splice(0)) cache.dispose();
  jest.restoreAllMocks();
});
class Catch extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Text>failed</Text> : this.props.children;
  }
}

test('a disposed later dependency cannot leak an earlier cache lease after a layout error', () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const a = make('healthy'),
    b = make('disposed');
  const theme = createTheme();
  const first = componentRootStyle(theme, 'First', {}, { color: 'red' }, undefined, {
    styleCache: a,
  });
  const second = componentRootStyle(theme, 'Second', {}, { color: 'blue' }, undefined, {
    styleCache: b,
  });
  function DisposeBeforeBinding() {
    useLayoutEffect(() => b.dispose(), []);
    return null;
  }
  const tree = render(
    <Catch>
      <NativeCssInsertionScope style={first.computed}>
        <DisposeBeforeBinding />
        <NativeCssInsertionScope style={second.computed}>
          <Text>child</Text>
        </NativeCssInsertionScope>
      </NativeCssInsertionScope>
    </Catch>,
  );
  expect(tree.getByText('failed')).toBeTruthy();
  tree.unmount();
  expect(() => a.reset()).not.toThrow();
  expect(() => a.dispose()).not.toThrow();
});

test.each(['reset', 'dispose'] as const)(
  'programme updates keep ownership leased during a sibling layout %s attempt',
  (operation) => {
    const cache = make('live-update');
    const errors: string[] = [];
    function Attempt({ active }: { active: boolean }) {
      useLayoutEffect(() => {
        if (active)
          try {
            cache[operation]();
          } catch (error) {
            errors.push((error as Error).message);
          }
      }, [active]);
      return null;
    }
    const content = (active: boolean) => (
      <NativeStyleCacheProvider value={cache}>
        <Attempt active={active} />
        <ButtonGroup disabled sx={{ padding: active ? 2 : 1 }}>
          <Button>A</Button>
          <Button>B</Button>
        </ButtonGroup>
      </NativeStyleCacheProvider>
    );
    const tree = render(content(false));
    tree.rerender(content(true));
    expect(errors).toEqual([expect.stringContaining('Unmount the native style cache roots')]);
    tree.unmount();
    expect(() => cache[operation]()).not.toThrow();
  },
);

test('a childless custom root owns committed Button CSS and warms a later group', () => {
  const cache = make('childless');
  const Childless = ({ testID }: { testID?: string }) => (
    <View testID={testID}>
      <Text>Own content</Text>
    </View>
  );
  const warm = render(
    <NativeStyleCacheProvider value={cache}>
      <Button component={Childless} variant="outlined" testID="childless-root">
        Ignored
      </Button>
    </NativeStyleCacheProvider>,
  );
  expect(warm.getByTestId('childless-root')).toBeTruthy();
  expect(() => cache.dispose()).toThrow('Unmount the native style cache roots');
  warm.unmount();
  const target = render(
    <NativeStyleCacheProvider value={cache}>
      <ButtonGroup
        disabled
        sx={{
          '& .MuiButtonGroup-grouped': { minWidth: 58, '&.Mui-disabled': { opacity: 0.4 } },
          '& .MuiButtonGroup-firstButton': { minWidth: 69 },
        }}
      >
        <Button testID="joined">A</Button>
        <Button>B</Button>
        <Button>C</Button>
      </ButtonGroup>
    </NativeStyleCacheProvider>,
  );
  const node = target.getByTestId('joined');
  const value =
    typeof node.props.style === 'function'
      ? node.props.style({ pressed: false })
      : node.props.style;
  const style = StyleSheet.flatten(value);
  expect(style.borderRightColor ?? style.borderColor).toBe('transparent');
  target.unmount();
  expect(() => cache.reset()).not.toThrow();
});

test('unrelated cache commits refresh retained roots without repeating source or native inline callbacks', () => {
  const a = make('counter-a'),
    b = make('counter-b');
  const counts = { group: 0, button: 0, sx: 0, inline: 0, plainInline: 0 };
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: {
          root: () => {
            counts.group++;
            return { padding: 1 };
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState }) => {
            if (ownerState.testID === 'counted') counts.button++;
            return { minWidth: 64 };
          }),
        },
      },
    },
  });
  const tree = render(
    <NativeStyleCacheProvider value={a}>
      <ThemeProvider theme={theme}>
        <ButtonGroup
          sx={() => {
            counts.sx++;
            return { margin: 1 };
          }}
        >
          <Button
            testID="counted"
            style={() => {
              counts.inline++;
              return { opacity: 0.9 };
            }}
          >
            A
          </Button>
          <Button>B</Button>
        </ButtonGroup>
        <ButtonBase
          style={() => {
            counts.plainInline++;
            return { padding: 3 };
          }}
        >
          Plain
        </ButtonBase>
      </ThemeProvider>
    </NativeStyleCacheProvider>,
  );
  expect(counts).toEqual({ group: 1, button: 1, sx: 1, inline: 1, plainInline: 1 });
  const warm = render(
    <NativeStyleCacheProvider value={b}>
      <Button variant="contained">Other cache</Button>
    </NativeStyleCacheProvider>,
  );
  expect(counts).toEqual({ group: 1, button: 1, sx: 1, inline: 1, plainInline: 1 });
  warm.unmount();
  tree.unmount();
});

const sourceOwner = (ownerState: Record<string, unknown>) => ({
  hasPressed: Object.hasOwn(ownerState, 'pressed'),
  pressed: ownerState.pressed ?? null,
  hasFocusVisible: Object.hasOwn(ownerState, 'focusVisible'),
  focusVisible: ownerState.focusVisible ?? null,
});
const ordinaryOwner = reference.buttonSourceState[0].before.owners[0];
const committedCss = (committed: jest.SpyInstance, cache: NativeStyleCache): string[] =>
  committed.mock.calls.flatMap(([chain]) =>
    chain
      .filter((entry: { cache: NativeStyleCache }) => entry.cache === cache)
      .map((entry: { css: string }) => entry.css),
  );
const expectNativePresentationExcluded = (css: readonly string[]) => {
  expect(css.some((value) => value.includes('811px') || value.includes('822px'))).toBe(false);
};

test('a first-pressed custom root keeps native presentation outside genuine source CSS', () => {
  const cache = make('first-pressed'),
    trace: unknown[] = [],
    inline: boolean[] = [];
  const committed = jest.spyOn(registry, 'commit');
  const theme = createTheme({
    components: {
      MuiButton: {
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState }) => {
            trace.push(sourceOwner(ownerState));
            return { padding: ownerState.pressed ? 11 : 99, '&:active': { minWidth: 101 } };
          }),
        },
      },
    },
  });
  const FirstPressed = ({ style, children }: ButtonBaseRootProps) => (
    <View
      testID="first-pressed"
      style={typeof style === 'function' ? style({ pressed: true }) : style}
    >
      {typeof children === 'function' ? children({ pressed: true }) : children}
    </View>
  );
  const tree = render(
    <NativeStyleCacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <Button
          component={FirstPressed}
          style={({ pressed }) => {
            inline.push(pressed);
            return { marginLeft: pressed ? 811 : 822 };
          }}
        >
          Pressed
        </Button>
      </ThemeProvider>
    </NativeStyleCacheProvider>,
  );
  expect(trace).toEqual([ordinaryOwner]);
  expect(inline).toEqual([true]);
  expect(StyleSheet.flatten(tree.getByTestId('first-pressed').props.style)).toMatchObject({
    padding: 99,
    minWidth: 101,
    marginLeft: 811,
  });
  const css = committedCss(committed, cache);
  expect(css.some((value) => value.includes('padding:99px;'))).toBe(true);
  expect(css.some((value) => value.includes('padding:11px;'))).toBe(false);
  expectNativePresentationExcluded(css);
  tree.unmount();
});

test('a retained pressed host receives true native state after an outer update without synthetic source state', () => {
  const cache = make('retained-pressed'),
    trace: unknown[] = [],
    inline: boolean[] = [];
  const committed = jest.spyOn(registry, 'commit');
  const theme = createTheme({
    components: {
      MuiButton: {
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState }) => {
            trace.push(sourceOwner(ownerState));
            return { padding: ownerState.pressed ? 11 : 99 };
          }),
        },
      },
    },
  });
  const content = (label: string) => (
    <NativeStyleCacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <Button
          testID="retained"
          accessibilityLabel={label}
          style={({ pressed }) => {
            inline.push(pressed);
            return { marginLeft: pressed ? 811 : 822 };
          }}
        >
          Pressed
        </Button>
      </ThemeProvider>
    </NativeStyleCacheProvider>
  );
  const tree = render(content('before'));
  fireEvent(tree.getByTestId('retained'), 'responderGrant', {
    persist() {},
    currentTarget: 1,
    nativeEvent: { pageX: 10, pageY: 10 },
  });
  expect(inline.at(-1)).toBe(true);
  expect(trace).toEqual([ordinaryOwner]);
  trace.length = 0;
  inline.length = 0;
  committed.mockClear();
  tree.rerender(content('after'));
  expect(trace).toEqual([ordinaryOwner]);
  expect(inline).toEqual([true]);
  expectNativePresentationExcluded(committedCss(committed, cache));
  tree.unmount();
});

test('external Suspense aborts cannot insert native presentation or state-derived source CSS', () => {
  const a = make('aborted-a'),
    b = make('aborted-b');
  const committed = jest.spyOn(registry, 'commit');
  let change!: (pressed: boolean) => void;
  const pending = new Promise<never>(() => {});
  function Suspend(): never {
    throw pending;
  }
  const Root = ({ style, children }: ButtonBaseRootProps) => {
    const [pressed, setPressed] = React.useState(false);
    change = setPressed;
    return (
      <View style={typeof style === 'function' ? style({ pressed }) : style}>
        {typeof children === 'function' ? children({ pressed }) : children}
        {pressed && <Suspend />}
      </View>
    );
  };
  const theme = createTheme({
    components: {
      MuiButton: {
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState }) => ({
            padding: ownerState.pressed ? 11 : 99,
          })),
        },
      },
    },
  });
  const tree = render(
    <NativeStyleCacheProvider value={a}>
      <ThemeProvider theme={theme}>
        <React.Suspense fallback={<Text>waiting</Text>}>
          <Button component={Root} style={({ pressed }) => ({ marginLeft: pressed ? 811 : 822 })}>
            Action
          </Button>
        </React.Suspense>
      </ThemeProvider>
    </NativeStyleCacheProvider>,
  );
  committed.mockClear();
  act(() => change(true));
  expect(tree.getByText('waiting')).toBeTruthy();
  const warm = render(
    <NativeStyleCacheProvider value={b}>
      <Button>Other cache</Button>
    </NativeStyleCacheProvider>,
  );
  act(() => change(false));
  expect(tree.queryByText('waiting')).toBeNull();
  const css = committedCss(committed, a);
  expect(css.some((value) => value.includes('padding:11px;'))).toBe(false);
  expectNativePresentationExcluded(css);
  warm.unmount();
  tree.unmount();
});

test('internal Suspense may abandon native callbacks while the genuine source owner commits', () => {
  const cache = make('internal-suspense'),
    trace: unknown[] = [],
    inline: boolean[] = [];
  const committed = jest.spyOn(registry, 'commit');
  const pending = new Promise<never>(() => {});
  function Late({ style, children }: ButtonBaseRootProps): never {
    if (typeof style === 'function') style({ pressed: true });
    if (typeof children === 'function') children({ pressed: true });
    throw pending;
  }
  const Root = (props: ButtonBaseRootProps) => (
    <React.Suspense fallback={<Text>internal waiting</Text>}>
      <Late {...props} />
    </React.Suspense>
  );
  const theme = createTheme({
    components: {
      MuiButton: {
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState }) => {
            trace.push(sourceOwner(ownerState));
            return { padding: ownerState.pressed ? 11 : 99 };
          }),
        },
      },
    },
  });
  const tree = render(
    <NativeStyleCacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <Button
          component={Root}
          style={({ pressed }) => {
            inline.push(pressed);
            return { marginLeft: pressed ? 811 : 822 };
          }}
        >
          Action
        </Button>
      </ThemeProvider>
    </NativeStyleCacheProvider>,
  );
  expect(tree.getByText('internal waiting')).toBeTruthy();
  expect(inline).toContain(true);
  expect(trace).toEqual([ordinaryOwner]);
  const css = committedCss(committed, cache);
  expect(css.some((value) => value.includes('padding:99px;'))).toBe(true);
  expect(css.some((value) => value.includes('padding:11px;'))).toBe(false);
  expectNativePresentationExcluded(css);
  tree.unmount();
});

test('a style-only custom host updates native inline visuals without changing source insertion identity', () => {
  const cache = make('style-only'),
    trace: unknown[] = [],
    inline: boolean[] = [];
  let change!: (pressed: boolean) => void;
  const Root = ({ style }: ButtonBaseRootProps) => {
    const [pressed, setPressed] = React.useState(false);
    change = setPressed;
    return (
      <View
        testID="style-only-host"
        style={typeof style === 'function' ? style({ pressed }) : style}
      >
        <Text>Own caption</Text>
      </View>
    );
  };
  const theme = createTheme({
    components: {
      MuiButton: {
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState }) => {
            trace.push(sourceOwner(ownerState));
            return { padding: ownerState.pressed ? 11 : 99 };
          }),
        },
      },
    },
  });
  const wrap = (children: React.ReactNode) => (
    <NativeStyleCacheProvider value={cache}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </NativeStyleCacheProvider>
  );
  const committed = jest.spyOn(registry, 'commit');
  const warm = render(
    wrap(
      <Button
        component={Root}
        variant="outlined"
        style={({ pressed }) => {
          inline.push(pressed);
          return { marginLeft: pressed ? 811 : 822 };
        }}
      >
        Ignored
      </Button>,
    ),
  );
  const before = [...new Set(committedCss(committed, cache))];
  act(() => change(true));
  expect(StyleSheet.flatten(warm.getByTestId('style-only-host').props.style)).toMatchObject({
    padding: 99,
    marginLeft: 811,
  });
  expect(inline).toEqual([false, true]);
  expect(trace).toEqual([ordinaryOwner]);
  expect([...new Set(committedCss(committed, cache))]).toEqual(before);
  expectNativePresentationExcluded(before);
  warm.unmount();
  const sx = {
    '& .MuiButtonGroup-grouped': { minWidth: 58, '&.Mui-disabled': { opacity: 0.4 } },
    '& .MuiButtonGroup-firstButton': { minWidth: 69 },
  };
  const target = render(
    wrap(
      <ButtonGroup disabled sx={sx}>
        <Button testID="later-join">A</Button>
        <Button>B</Button>
        <Button>C</Button>
      </ButtonGroup>,
    ),
  );
  const props = target.getByTestId('later-join').props;
  const value = typeof props.style === 'function' ? props.style({ pressed: false }) : props.style;
  const style = StyleSheet.flatten(value);
  expect(style.borderRightColor ?? style.borderColor).toBe('transparent');
  target.unmount();
});

test('Base-owned focus changes do not prepare Button source CSS again', () => {
  const cache = make('base-focus'),
    owners: unknown[] = [],
    baseFocus: boolean[] = [];
  const action = React.createRef<ButtonBaseActions>();
  const theme = createTheme({
    components: {
      MuiButton: {
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState }) => {
            owners.push(sourceOwner(ownerState));
            return { padding: 99, '&.Mui-focusVisible': { padding: 31 } };
          }),
        },
      },
      MuiButtonBase: {
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState }) => {
            baseFocus.push(Boolean(ownerState.focusVisible));
            return { marginTop: ownerState.focusVisible ? 2 : 1 };
          }),
        },
      },
    },
  });
  const tree = render(
    <NativeStyleCacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <Button action={action} testID="focus-source">
          Focus
        </Button>
      </ThemeProvider>
    </NativeStyleCacheProvider>,
  );
  act(() => action.current!.focusVisible());
  expect(owners).toEqual(reference.buttonSourceState[0].after.owners);
  expect(baseFocus).toEqual(reference.buttonSourceState[0].after.baseFocus);
  const props = tree.getByTestId('focus-source').props;
  const style = StyleSheet.flatten(
    typeof props.style === 'function' ? props.style({ pressed: false }) : props.style,
  );
  expect(style).toMatchObject({ padding: 31, marginTop: 2 });
  tree.unmount();
});

test('explicitly authored source pressed props are preserved instead of replaced by native state', () => {
  const cache = make('authored-pressed'),
    owners: unknown[] = [];
  const theme = createTheme({
    components: {
      MuiButton: {
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState }) => {
            owners.push(sourceOwner(ownerState));
            return { padding: ownerState.pressed ? 11 : 99 };
          }),
        },
      },
    },
  });
  const Authored = Button as React.ComponentType<ButtonProps & { pressed: boolean }>;
  const tree = render(
    <NativeStyleCacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <Authored pressed testID="authored">
          Authored
        </Authored>
      </ThemeProvider>
    </NativeStyleCacheProvider>,
  );
  expect(owners).toEqual(reference.buttonSourceState[1].before.owners);
  const props = tree.getByTestId('authored').props;
  expect(
    StyleSheet.flatten(
      typeof props.style === 'function' ? props.style({ pressed: false }) : props.style,
    ).padding,
  ).toBe(11);
  tree.unmount();
});

test('logical owner dependencies commit without inserting a merely prepared physical selector ancestor', () => {
  const logical = make('logical-owner'),
    physical = make('physical-owner'),
    target = make('target-owner');
  const theme = createTheme();
  const logicalSource = componentRootStyle(theme, 'Logical', {}, { padding: 1 }, undefined, {
    styleCache: logical,
  });
  const physicalSource = componentRootStyle(
    theme,
    'Physical',
    {},
    { '& .target': { color: 'red' } },
    undefined,
    { styleCache: physical },
  );
  const leaf = componentRootStyle(theme, 'Leaf', {}, { color: 'blue' }, undefined, {
    styleCache: target,
    classes: ['target'],
    ancestors: [
      {
        theme,
        name: 'Physical',
        props: {},
        prepared: physicalSource.prepared,
        context: { descendantOnly: true, descendantClasses: ['target'] },
      },
    ],
  });
  const physicalCss = nativeCssProgram(physicalSource.prepared.sheets);
  const tree = render(
    <NativeCssInsertionScope style={logicalSource.computed}>
      <NativeCssInsertionScope style={leaf.computed}>
        <Text>Target</Text>
      </NativeCssInsertionScope>
    </NativeCssInsertionScope>,
  );
  expect(registry.rules(physical, physicalCss)).toBeUndefined();
  const logicalInsertion = nativeStyleInsertions(logicalSource.computed)[0],
    targetInsertion = nativeStyleInsertions(leaf.computed)[0];
  expect(targetInsertion.cache).toBe(target);
  expect(registry.order(logicalInsertion)![0]).toBeLessThan(registry.order(targetInsertion)![0]);
  tree.unmount();
});
