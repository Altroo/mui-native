// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { useState } from 'react';
import { View } from 'react-native';
import { act, cleanup, render } from '@testing-library/react-native';
import * as material from '../packages/material/src/themeProvider';
import { useTheme as materialRootTheme } from '../packages/material/src';
import { useTheme as materialStylesTheme } from '../packages/material/src/styles';
import materialDeepTheme from '../packages/material/src/styles/useTheme';
import * as system from '../packages/system/src';
import systemDeepTheme, { systemDefaultTheme } from '../packages/system/src/useTheme';
import systemDeepWithoutDefault from '../packages/system/src/useThemeWithoutDefault';
import themeReadingReference from './fixtures/mui-theme-reading-9.5.0.json';

afterEach(cleanup);

test('Material owns a stable fallback distinct from the System fallback', () => {
  const materialValues: system.Theme[] = [],
    systemValues: system.Theme[] = [];
  function Probe() {
    materialValues.push(material.useTheme());
    systemValues.push(system.useTheme());
    return null;
  }
  const tree = render(<Probe />);
  tree.rerender(<Probe />);
  expect(systemValues[0]).toBe(systemDefaultTheme);
  expect(systemValues[1]).toBe(systemValues[0]);
  expect(materialValues[1]).toBe(materialValues[0]);
  // The pinned Material hook supplies its own module-level defaultTheme to System.
  expect(Object.is(materialValues[0], systemValues[0])).toBe(false);
  expect(materialValues[0].palette.primary.main).toBe(system.createTheme().palette.primary.main);
});

test.each([null, false, 0, 'fallback', { token: 'fallback' }])(
  'System fallback preserves %p by identity',
  (fallback) => {
    let actual: unknown, without: unknown;
    function Probe() {
      actual = system.useTheme<unknown>(fallback);
      without = system.useThemeWithoutDefault<unknown>(fallback);
      return null;
    }
    const tree = render(<Probe />);
    expect(actual).toBe(fallback);
    expect(without).toBe(fallback);
    tree.rerender(
      <system.ThemeProvider theme={{}}>
        <Probe />
      </system.ThemeProvider>,
    );
    expect(actual).toBe(fallback);
    expect(without).toBe(fallback);
  },
);

test('explicit undefined uses the System singleton and the nullable hook stays null', () => {
  let actual: unknown, without: unknown;
  function Probe() {
    actual = systemDeepTheme(undefined);
    without = systemDeepWithoutDefault(undefined);
    return null;
  }
  render(<Probe />);
  expect(actual).toBe(systemDefaultTheme);
  expect(without).toBeNull();
});

test('nonempty context wins over explicit fallbacks and shares its unscoped identity', () => {
  const fallback = { source: 'fallback' };
  let raw: unknown, materialValue: unknown, without: unknown;
  function Probe() {
    raw = system.useTheme(fallback);
    materialValue = material.useTheme();
    without = system.useThemeWithoutDefault(fallback);
    return null;
  }
  render(
    <system.ThemeProvider theme={{ source: 'context' }}>
      <Probe />
    </system.ThemeProvider>,
  );
  expect(raw).toEqual({ source: 'context' });
  expect(materialValue).toBe(raw);
  expect(without).toBe(raw);
});

test('Material selects its scope while System preserves other design-system scopes', () => {
  const selected = system.createTheme({ palette: { mode: 'dark' } });
  let raw: unknown, materialValue: unknown;
  function Probe() {
    raw = system.useTheme();
    materialValue = materialDeepTheme();
    return null;
  }
  render(
    <system.ThemeProvider theme={{ [material.THEME_ID]: selected, other: { token: 1 } }}>
      <Probe />
    </system.ThemeProvider>,
  );
  expect(materialValue).toBe(selected);
  expect(raw).toEqual({ [material.THEME_ID]: selected, other: { token: 1 } });
});

test.each([null, false, 0, ''])(
  'a falsy Material scope %p preserves the surrounding context',
  (scope) => {
    let raw: unknown, selected: unknown;
    function Probe() {
      raw = system.useTheme();
      selected = material.useTheme();
      return null;
    }
    render(
      <system.ThemeProvider theme={{ [material.THEME_ID]: scope, token: 1 }}>
        <Probe />
      </system.ThemeProvider>,
    );
    expect(selected).toBe(raw);
  },
);

test('theme-reading updates retain consumer state and every canonical import shares its hook', () => {
  expect(materialRootTheme).toBe(material.useTheme);
  expect(materialDeepTheme).toBe(material.useTheme);
  expect(materialStylesTheme).toBe(material.useTheme);
  expect(systemDeepTheme).toBe(system.useTheme);
  expect(systemDeepWithoutDefault).toBe(system.useThemeWithoutDefault);
  let update: (() => void) | undefined;
  let value: { count: number; theme: { token: number } } | undefined;
  function Probe() {
    const [count, setCount] = useState(0);
    update = () => setCount((n) => n + 1);
    value = { count, theme: material.useTheme<{ token: number }>() };
    return null;
  }
  const scene = (token: number) => (
    <system.ThemeProvider theme={{ [material.THEME_ID]: { token } }}>
      <Probe />
    </system.ThemeProvider>
  );
  const tree = render(scene(1));
  act(() => update?.());
  tree.rerender(scene(2));
  expect(value).toEqual({ count: 1, theme: { token: 2 } });
});

test('Material exposes the raw envelope to React DevTools before selecting its scope', () => {
  const debug = jest.spyOn(React, 'useDebugValue');
  let raw: unknown;
  function Probe() {
    raw = system.useTheme();
    material.useTheme();
    return null;
  }
  render(
    <system.ThemeProvider theme={{ [material.THEME_ID]: { token: 1 }, other: true }}>
      <Probe />
    </system.ThemeProvider>,
  );
  expect(debug).toHaveBeenCalledWith(raw);
});

test('an empty callback context restores the same Material fallback singleton', () => {
  const values: system.Theme[] = [];
  function Probe() {
    values.push(material.useTheme());
    return null;
  }
  const tree = render(<Probe />);
  const fallback = values[0];
  tree.rerender(
    <system.ThemeProvider theme={{ token: 'outer' }}>
      <system.ThemeProvider theme={() => ({})}>
        <Probe />
      </system.ThemeProvider>
    </system.ThemeProvider>,
  );
  expect(values.at(-1)).toBe(fallback);
});

test('the Material fallback can be mutated without changing the System singleton', () => {
  let fallback: system.Theme | undefined;
  function Probe() {
    fallback = material.useTheme();
    return null;
  }
  render(<Probe />);
  const target = fallback as unknown as Record<string, unknown>;
  try {
    target.themeReadingMutation = true;
    expect(
      (systemDefaultTheme as unknown as Record<string, unknown>).themeReadingMutation,
    ).toBeUndefined();
  } finally {
    delete target.themeReadingMutation;
  }
});

test('Material omits the DevTools hook in production', () => {
  const debug = jest.spyOn(React, 'useDebugValue');
  jest.replaceProperty(process, 'env', { ...process.env, NODE_ENV: 'production' });
  function Probe() {
    material.useTheme();
    return null;
  }
  render(<Probe />);
  expect(debug).not.toHaveBeenCalled();
});

test.each(themeReadingReference.fixtures)(
  'original theme-reading contract: $input.name',
  ({ input, result }) => {
    let materialDefault: unknown;
    function ReadDefault() {
      materialDefault = material.useTheme();
      return null;
    }
    const initial = render(<ReadDefault />);
    initial.unmount();
    let actual: unknown;
    const fallback = { fallback: true };
    function Probe() {
      const raw = system.useTheme<Record<string, unknown>>();
      const value = material.useTheme<Record<string, unknown>>();
      actual = {
        systemIsDefault: Object.is(raw, systemDefaultTheme),
        materialIsDefault: value === materialDefault,
        materialIsSystem: value === raw,
        nullableIsNull: system.useThemeWithoutDefault() === null,
        explicitSystemIsFallback: system.useTheme(fallback) === fallback,
        explicitNullableIsFallback: system.useThemeWithoutDefault(fallback) === fallback,
        systemStamp: raw.stamp ?? null,
        materialStamp: value.stamp ?? null,
      };
      return null;
    }
    let tree = <Probe />;
    if (input.kind === 'object')
      tree = (
        <system.ThemeProvider<Record<string, unknown>>
          theme={('theme' in input ? input.theme : undefined) ?? {}}
        >
          {tree}
        </system.ThemeProvider>
      );
    if (input.kind === 'reset')
      tree = (
        <system.ThemeProvider theme={{ stamp: 'outer' }}>
          <system.ThemeProvider theme={() => ({})}>{tree}</system.ThemeProvider>
        </system.ThemeProvider>
      );
    render(tree);
    expect(actual).toEqual(result);
  },
);

test('Material styled callbacks and the reading hook share the same providerless fallback', () => {
  let styledTheme: unknown, hookTheme: unknown;
  const Styled = material.styled(View)(({ theme }) => {
    styledTheme = theme;
    return {};
  });
  function Probe() {
    hookTheme = material.useTheme();
    return <Styled />;
  }
  render(<Probe />);
  expect(Object.is(styledTheme, hookTheme)).toBe(true);
});

test('every Material theme helper uses the hook fallback when context is absent', () => {
  let hookTheme: system.Theme | undefined;
  const seen: unknown[] = [];
  let defaults: unknown;
  const read = ({ theme }: { theme: system.Theme }) => {
    seen.push(theme);
    return {};
  };
  function Probe() {
    hookTheme = material.useTheme();
    material.useSx((theme) => {
      seen.push(theme);
      return {};
    });
    material.useComponentStyle('MuiThemeReadingProbe', {});
    material.useComponentRootStyle('MuiThemeReadingProbe', {}, undefined, undefined);
    defaults = material.useThemeProps({ name: 'MuiThemeReadingProbe', props: {} });
    return null;
  }
  let fallback: system.Theme | undefined;
  function ReadDefault() {
    fallback = material.useTheme();
    return null;
  }
  const initial = render(<ReadDefault />);
  initial.unmount();
  const theme = fallback!;
  const previous = theme.components.MuiThemeReadingProbe;
  try {
    theme.components.MuiThemeReadingProbe = {
      defaultProps: { token: 'material-default' },
      styleOverrides: { root: read },
    };
    render(<Probe />);
    expect(seen.length).toBe(3);
    expect(seen.every((value) => value === hookTheme)).toBe(true);
    expect(defaults).toEqual({ token: 'material-default' });
  } finally {
    if (previous === undefined) delete theme.components.MuiThemeReadingProbe;
    else theme.components.MuiThemeReadingProbe = previous;
  }
});

test.each([false, true])(
  'mixed styled creators preserve the first fallback for opaque=%s',
  (opaque) => {
    const Base = opaque ? (props: React.ComponentProps<typeof View>) => <View {...props} /> : View;
    let materialDefault: unknown;
    function ReadDefault() {
      materialDefault = material.useTheme();
      return null;
    }
    const initial = render(<ReadDefault />);
    initial.unmount();
    for (const firstMaterial of [false, true]) {
      const seen: unknown[] = [];
      const first = firstMaterial ? material.styled : system.styled;
      const second = firstMaterial ? system.styled : material.styled;
      const Inner = first(Base)(({ theme }) => {
        seen.push(theme);
        return {};
      });
      const Outer = second(Inner)(({ theme }) => {
        seen.push(theme);
        return {};
      });
      const tree = render(<Outer />);
      expect(seen.length).toBe(2);
      expect(Object.is(seen[0], seen[1])).toBe(true);
      expect(Object.is(seen[0], materialDefault)).toBe(firstMaterial);
      tree.unmount();
    }
  },
);

test('memo is an actual boundary between styled fallback creators', () => {
  let innerTheme: unknown, outerTheme: unknown, materialTheme: unknown;
  const Inner = system.styled(View)(({ theme }) => {
    innerTheme = theme;
    return {};
  });
  const Outer = material.styled(React.memo(Inner))(({ theme }) => {
    outerTheme = theme;
    return {};
  });
  function Probe() {
    materialTheme = material.useTheme();
    return <Outer />;
  }
  render(<Probe />);
  expect(Object.is(outerTheme, materialTheme)).toBe(true);
  expect(Object.is(innerTheme, outerTheme)).toBe(false);
});

test.each(themeReadingReference.styledFixtures)(
  'original fallback composition: $input',
  ({ input, result }) => {
    let materialDefault: unknown, inner: unknown, outer: unknown;
    function ReadDefault() {
      materialDefault = material.useTheme();
      return null;
    }
    const initial = render(<ReadDefault />);
    initial.unmount();
    const Base = input.opaque
      ? (props: React.ComponentProps<typeof View>) => <View {...props} />
      : View;
    const first = input.firstMaterial ? material.styled : system.styled;
    const second = input.firstMaterial ? system.styled : material.styled;
    const Inner = first(Base)(({ theme }) => {
      inner = theme;
      return {};
    });
    const Outer = second(input.memo ? React.memo(Inner) : Inner)(({ theme }) => {
      outer = theme;
      return {};
    });
    render(<Outer />);
    expect({
      innerIsMaterial: inner === materialDefault,
      outerIsMaterial: outer === materialDefault,
      sameTheme: inner === outer,
    }).toEqual(result);
  },
);
