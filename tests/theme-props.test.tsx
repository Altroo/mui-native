// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useState } from 'react';
import { act, cleanup, render } from '@testing-library/react-native';
import * as system from '../packages/system/src';
import { useThemeProps as materialRoot } from '../packages/material/src';
import { useThemeProps as materialStyles } from '../packages/material/src/styles';
import materialDeep from '../packages/material/src/styles/useThemeProps';
import systemDeep from '../packages/system/src/useThemeProps';

afterEach(cleanup);

test('canonical root, styles and deep hooks share their respective implementation', () => {
  expect(systemDeep).toBe(system.useThemeProps);
  expect(materialDeep).toBe(materialRoot);
  expect(materialStyles).toBe(materialRoot);
});

test.each(['Probe', 2, Symbol('component')])(
  'System resolves a custom fallback for name %p',
  (name) => {
    const defaults = Object.freeze({ fallback: 'theme', zero: 4 });
    const theme = Object.freeze({ components: { [name]: { defaultProps: defaults } } });
    const props = Object.freeze({ own: 1, zero: 0 });
    let result: unknown;
    function Probe() {
      result = systemDeep({ name, props, defaultTheme: theme, themeId: undefined });
      return null;
    }
    render(<Probe />);
    expect(result).toEqual({ fallback: 'theme', own: 1, zero: 0 });
    expect(defaults).toEqual({ fallback: 'theme', zero: 4 });
    expect(props).toEqual({ own: 1, zero: 0 });
  },
);

test.each([null, undefined, 7, 'value', false, (value: number) => value + 1])(
  'without component defaults, unconstrained props %p pass through by identity',
  (props) => {
    let systemValue: unknown, materialValue: unknown;
    function Probe() {
      systemValue = systemDeep({ name: 2, props, defaultTheme: undefined });
      materialValue = materialDeep({ name: 2, props });
      return null;
    }
    render(<Probe />);
    expect(systemValue).toBe(props);
    expect(materialValue).toBe(props);
  },
);

test('context wins over a supplied fallback and each hook selects its own scope', () => {
  const fallback = { components: { Probe: { defaultProps: { value: 'fallback' } } } };
  const theme = {
    components: { Probe: { defaultProps: { value: 'outer' } } },
    design: { components: { Probe: { defaultProps: { value: 'design' } } } },
    $$material: { components: { Probe: { defaultProps: { value: 'material' } } } },
  };
  let values: unknown;
  function Probe() {
    values = [
      systemDeep({ props: {}, name: 'Probe', defaultTheme: fallback }),
      systemDeep({ props: {}, name: 'Probe', defaultTheme: fallback, themeId: 'design' }),
      materialDeep({ props: {}, name: 'Probe' }),
    ];
    return null;
  }
  const tree = render(
    <system.ThemeProvider theme={theme}>
      <Probe />
    </system.ThemeProvider>,
  );
  expect(values).toEqual([{ value: 'outer' }, { value: 'design' }, { value: 'material' }]);
  tree.rerender(
    <system.ThemeProvider theme={{ stamp: 'without defaults' }}>
      <Probe />
    </system.ThemeProvider>,
  );
  expect(values).toEqual([{}, {}, {}]);
});

test('v5 theme lookup ignores the standalone default-provider map and style-merge flag', () => {
  const props = { className: 'caller', style: { opacity: 0.8 } };
  const fallback = {
    components: {
      Probe: { defaultProps: { className: 'default', style: { opacity: 0.2 }, value: 'theme' } },
    },
  };
  let result: unknown;
  function Probe() {
    result = systemDeep({ props, name: 'Probe', defaultTheme: fallback });
    return null;
  }
  render(
    <system.DefaultPropsProvider
      value={{ mergeClassNameAndStyle: true, Probe: { defaultProps: { value: 'standalone' } } }}
    >
      <Probe />
    </system.DefaultPropsProvider>,
  );
  expect(result).toEqual({ ...props, value: 'theme' });
});

test('theme-default updates preserve the consuming component state', () => {
  let increment: (() => void) | undefined, observed: unknown;
  function Probe() {
    const [count, setCount] = useState(0);
    increment = () => setCount((value) => value + 1);
    observed = materialDeep({ name: 'Probe', props: { count } });
    return null;
  }
  const scene = (value: string) => (
    <system.ThemeProvider
      theme={{ $$material: { components: { Probe: { defaultProps: { value } } } } }}
    >
      <Probe />
    </system.ThemeProvider>
  );
  const tree = render(scene('first'));
  act(() => increment?.());
  tree.rerender(scene('second'));
  expect(observed).toEqual({ count: 1, value: 'second' });
});
