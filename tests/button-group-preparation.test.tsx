// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { act, cleanup, render } from '@testing-library/react-native';
import {
  Button,
  ButtonBase,
  ButtonGroup,
  ThemeProvider,
  createTheme,
  useTheme,
} from '../packages/material/src';
import reference from './fixtures/mui-button-group-preparation-9.5.0.json';

afterEach(cleanup);

test.each([false, true])(
  'ButtonGroup retains owner preparation across child updates (strict=%s)',
  (strict) => {
    const counts = {
      root: 0,
      grouped: 0,
      firstButton: 0,
      middleButton: 0,
      lastButton: 0,
      sx: 0,
      variantProps: 0,
      variantStyle: 0,
    };
    const trace: string[] = [];
    const expected = strict ? reference.observations.strict : reference.observations.plain;
    const slots = ['root', 'grouped', 'firstButton', 'middleButton', 'lastButton'] as const;
    const overrides = Object.fromEntries(
      slots.map((slot) => [
        slot,
        () => {
          counts[slot]++;
          trace.push(slot);
          return slot === 'root' ? { padding: 3 } : { minWidth: 61 };
        },
      ]),
    );
    const theme = createTheme({
      components: {
        MuiButtonGroup: {
          styleOverrides: overrides,
          variants: [
            {
              props: () => {
                counts.variantProps++;
                trace.push('variantProps');
                return true;
              },
              style: () => {
                counts.variantStyle++;
                trace.push('variantStyle');
                return { marginTop: 2 };
              },
            },
          ],
        },
      },
    });
    const sx = () => {
      counts.sx++;
      trace.push('sx');
      return { '& .MuiButtonGroup-grouped': { minHeight: 38 } };
    };
    let increment: () => void = () => {
      throw Error('Counter is not mounted');
    };
    function Counter() {
      const [count, setCount] = useState(0);
      increment = () => setCount((value) => value + 1);
      return <Button>Count {count}</Button>;
    }
    const group = (orientation: 'horizontal' | 'vertical') => (
      <ThemeProvider theme={theme}>
        <ButtonGroup orientation={orientation} sx={sx}>
          <Counter />
          <Button>B</Button>
          <Button>C</Button>
        </ButtonGroup>
      </ThemeProvider>
    );
    const scene = (orientation: 'horizontal' | 'vertical') =>
      strict ? <React.StrictMode>{group(orientation)}</React.StrictMode> : group(orientation);
    const tree = render(scene('horizontal'));
    expect(counts).toEqual(expected.mount);
    act(() => increment());
    expect(counts).toEqual(expected.childUpdate);
    const button = tree.UNSAFE_getAllByType(ButtonBase)[0];
    button.props.style({ pressed: true, focusVisible: true });
    expect(counts).toEqual(expected.childUpdate);
    tree.rerender(scene('vertical'));
    expect(counts).toEqual(expected.groupUpdate);
    expect(trace).toEqual(expected.trace);
  },
);

test('inherited override getters resolve in source order before selected CSS getters', () => {
  const trace: string[] = [];
  const overrides = Object.create({
    grouped() {
      trace.push('call:grouped');
      return {
        get minWidth() {
          trace.push('css:grouped');
          return 72;
        },
      };
    },
  });
  Object.defineProperties(overrides, {
    root: {
      enumerable: true,
      get() {
        trace.push('get:root');
        return () => {
          trace.push('call:root');
          return {
            get padding() {
              trace.push('css:root');
              return 7;
            },
          };
        };
      },
    },
    unused: {
      enumerable: true,
      get() {
        trace.push('get:unused');
        return () => {
          trace.push('call:unused');
          return {
            get marginTop() {
              trace.push('css:unused');
              return 999;
            },
          };
        };
      },
    },
  });
  const theme = createTheme();
  theme.components.MuiButtonGroup = { styleOverrides: overrides };
  const tree = render(
    <ThemeProvider theme={theme}>
      <ButtonGroup testID="accessors">
        <Button>A</Button>
      </ButtonGroup>
    </ThemeProvider>,
  );
  expect(trace).toEqual(reference.observations.accessors.trace);
  expect(StyleSheet.flatten(tree.getByTestId('accessors').props.style).padding).toBe(
    parseFloat(reference.observations.accessors.padding),
  );
  const button = tree.UNSAFE_getByType(ButtonBase);
  expect(
    StyleSheet.flatten(button.props.style({ pressed: false, focusVisible: false })).minWidth,
  ).toBe(parseFloat(reference.observations.accessors.minWidth));
  expect(trace).toEqual(reference.observations.accessors.trace);
});

test('deferred root functions keep genuine arguments and resolved-slot order', () => {
  const trace: string[] = [],
    sameArguments: boolean[] = [];
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: {
          root: (first) => {
            trace.push('root:first');
            return (second) => {
              trace.push('root:second');
              sameArguments.push(first === second);
              return { padding: 8 };
            };
          },
          grouped: () => {
            trace.push('grouped:first');
            return { minWidth: 83 };
          },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <ButtonGroup testID="deferred">
        <Button>A</Button>
      </ButtonGroup>
    </ThemeProvider>,
  );
  expect(trace).toEqual(reference.observations.rootDeferred.trace);
  expect(sameArguments).toEqual(reference.observations.rootDeferred.sameArguments);
  expect(StyleSheet.flatten(tree.getByTestId('deferred').props.style).padding).toBe(
    parseFloat(reference.observations.rootDeferred.padding),
  );
  const button = tree.UNSAFE_getByType(ButtonBase);
  expect(
    StyleSheet.flatten(button.props.style({ pressed: false, focusVisible: false })).minWidth,
  ).toBe(parseFloat(reference.observations.rootDeferred.minWidth));
});

test('legacy recursive named-slot callbacks remain an explicit native extension', () => {
  // Original 9.5.0 leaves this second named-slot function unevaluated. The
  // existing native extension is retained separately from source parity checks.
  expect(reference.observations.deferred.minWidth).toBe('40px');
  const sameArguments: boolean[] = [];
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: {
          grouped: (first) => (second) => {
            sameArguments.push(first === second);
            return { minWidth: 83 };
          },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <ButtonGroup>
        <Button>A</Button>
      </ButtonGroup>
    </ThemeProvider>,
  );
  const button = tree.UNSAFE_getByType(ButtonBase);
  expect(
    StyleSheet.flatten(button.props.style({ pressed: false, focusVisible: false })).minWidth,
  ).toBe(83);
  expect(sameArguments).toEqual([true]);
});

test('direction rebinding and nested groups retain one callback evaluation per owner', () => {
  const counts = { outer: 0, inner: 0 };
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: {
          root: ({ ownerState }) => {
            counts[ownerState.className as 'outer' | 'inner']++;
            return { padding: 4 };
          },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <ButtonGroup className="outer" style={{ direction: 'rtl' }}>
        <Button>A</Button>
        <ButtonGroup className="inner">
          <Button>B</Button>
          <Button>C</Button>
        </ButtonGroup>
      </ButtonGroup>
    </ThemeProvider>,
  );
  for (const button of tree.UNSAFE_getAllByType(ButtonBase))
    button.props.style({ pressed: false, focusVisible: true });
  expect(counts).toEqual({ outer: 1, inner: 1 });
});

test('group callbacks observe the same theme object as its consuming component', () => {
  let consumed: unknown;
  const seen: unknown[] = [];
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: {
          root: ({ theme }) => {
            seen.push(theme);
            return {};
          },
        },
      },
    },
  });
  function Subject() {
    consumed = useTheme();
    return (
      <ButtonGroup>
        <Button>A</Button>
      </ButtonGroup>
    );
  }
  render(
    <ThemeProvider theme={theme}>
      <Subject />
    </ThemeProvider>,
  );
  expect(seen).toEqual([consumed]);
});

test('deferred root CSS leaves non-enumerable MUI processing properties unread', () => {
  const css = Object.defineProperties(
    { padding: 9 },
    Object.fromEntries(
      ['variants', 'isProcessed', 'style'].map((key) => [
        key,
        {
          get() {
            throw Error('Unexpected read: ' + key);
          },
        },
      ]),
    ),
  );
  const theme = createTheme({
    components: { MuiButtonGroup: { styleOverrides: { root: () => () => css } } },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <ButtonGroup testID="guarded">
        <Button>A</Button>
      </ButtonGroup>
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('guarded').props.style).padding).toBe(
    parseFloat(reference.observations.guarded.padding),
  );
});

test('native variant-array callback output is prepared as CSS without another MUI pass', () => {
  const css = Object.defineProperties(
    { padding: 9 },
    Object.fromEntries(
      ['variants', 'isProcessed', 'style'].map((key) => [
        key,
        {
          get() {
            throw Error('Unexpected read: ' + key);
          },
        },
      ]),
    ),
  );
  const theme = createTheme({
    components: { MuiButtonGroup: { variants: [{ props: {}, style: () => [() => css] }] } },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <ButtonGroup testID="variant-css">
        <Button>A</Button>
      </ButtonGroup>
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('variant-css').props.style).padding).toBe(9);
});
