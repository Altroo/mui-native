import React from 'react';
import { Dimensions } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import {
  createTheme,
  createSpacing,
  createBreakpoints,
  resolveSx,
  componentStyle,
  configureDiagnostics,
  styled,
  type BreakpointsOptions,
  type Spacing,
  type SpacingOptions,
} from '../packages/system/src';
import { Box, Stack, ThemeProvider } from '../packages/material/src';
import reference from './fixtures/mui-layout-9.5.0.json';

test.each(reference.spacing)(
  'spacing $input with $args matches pinned MUI',
  ({ input, args, output }) => {
    expect(
      (createSpacing(input as SpacingOptions) as (...args: (string | number)[]) => string)(...args),
    ).toBe(output);
  },
);
test.each(reference.breakpoints)(
  'breakpoint configuration $input matches pinned MUI',
  ({ input, values, keys, unit, mediaKeys, calls }) => {
    const breakpoints = createBreakpoints(input as BreakpointsOptions);
    expect(breakpoints.values).toEqual(values);
    expect(breakpoints.keys).toEqual(keys);
    expect(breakpoints.unit).toEqual(unit);
    expect(breakpoints.internal_mediaKeys).toEqual(mediaKeys);
    for (const call of calls)
      expect(
        (breakpoints[call.method as 'up'] as (...args: unknown[]) => string)(...call.args),
      ).toBe(call.output);
  },
);
function edges(style: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const [key, original] of Object.entries(style)) {
    if (original == null) continue;
    const value =
      typeof original === 'string' && original.endsWith('px')
        ? Number(original.slice(0, -2))
        : original;
    if (key === 'padding' || key === 'margin')
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) result[key + side] = value;
    else result[key] = value;
  }
  return result;
}
function referenceAtWidth(css: Record<string, unknown>, width: number) {
  let result = edges(
    Object.fromEntries(Object.entries(css).filter(([key]) => !key.startsWith('@'))),
  );
  for (const [query, declarations] of Object.entries(css)) {
    if (!query.startsWith('@media')) continue;
    const clauses = [...query.matchAll(/\((min|max)-width:([\d.-]+)px\)/g)];
    const inside = clauses.every((clause) =>
      clause[1] === 'min' ? width >= Number(clause[2]) : width <= Number(clause[2]),
    );
    if (query.includes('not all') ? !inside : inside)
      result = { ...result, ...edges(declarations as Record<string, unknown>) };
  }
  return result;
}
test.each(reference.sx)(
  'native responsive spacing follows the actual MUI rule cascade for $input',
  ({ input, output }) => {
    for (const width of [0, 500, 599.95, 600, 899.95, 900, 1200]) {
      expect(edges(resolveSx(input, createTheme(), { width }) as Record<string, unknown>)).toEqual(
        referenceAtWidth(output, width),
      );
    }
  },
);
test('spacing accepts functions, mixed arguments and an existing spacing helper without double conversion', () => {
  const transform = jest.fn((value: number | string) =>
    typeof value === 'string' ? value : value * 5,
  );
  const spacing = createSpacing(transform);
  expect(spacing(1, 'auto', -0.5, 0)).toBe('5px auto -2.5px 0px');
  expect(transform.mock.calls.map(([value]) => value)).toEqual([1, 'auto', -0.5, 0]);
  expect(createSpacing(spacing)).toBe(spacing);
  expect(createTheme(createTheme({ spacing })).spacing).toBe(spacing);
  expect(createSpacing(8, (value) => (typeof value === 'number' ? value * 3 : value))(2)).toBe(
    '6px',
  );
});
test('native spacing resolves shorthand, rem scales, negative arrays and direct CSS-style overrides', () => {
  const theme = createTheme({ spacing: '0.5rem' });
  expect(resolveSx({ p: 2, mx: -1, gap: 0.5 }, theme)).toEqual({
    padding: 16,
    marginLeft: -8,
    marginRight: -8,
    gap: 4,
  });
  expect(resolveSx({ padding: theme.spacing(1, 2, 3, 4), margin: 'auto 16px' }, theme)).toEqual({
    paddingTop: 8,
    paddingRight: 16,
    paddingBottom: 24,
    paddingLeft: 32,
    marginTop: 'auto',
    marginRight: 16,
    marginBottom: 'auto',
    marginLeft: 16,
  });
  expect(resolveSx({ m: -2 }, createTheme({ spacing: [0, 4, '1rem'] }))).toEqual({ margin: -16 });
  expect(
    componentStyle(
      createTheme({
        components: {
          MuiBox: {
            styleOverrides: { root: { paddingLeft: 8, padding: '4px 12px', fontSize: 20 } },
          },
        },
      }),
      'MuiBox',
      {},
      { p: 2, lineHeight: 1.5 },
    ),
  ).toEqual({ padding: 16, fontSize: 20, lineHeight: 30 });
});
test('unsupported native expressions and invalid array spacing produce diagnostics and no invalid layout values', () => {
  const collect = jest.fn();
  const reset = configureDiagnostics(collect);
  try {
    expect(resolveSx({ p: 9, m: -9, gap: 0.5 }, createTheme({ spacing: [0, 4] }))).toEqual({});
    expect(resolveSx({ p: 2 }, createTheme({ spacing: 'var(--space)' }))).toEqual({});
    expect(
      resolveSx({ '@media (prefers-reduced-motion: reduce)': { p: 2 } }, createTheme()),
    ).toEqual({});
    expect(collect.mock.calls.map(([entry]) => entry.code)).toEqual(
      expect.arrayContaining(['spacing', 'spacing-value', 'css-unit', 'media-query']),
    );
  } finally {
    reset();
  }
});
test('custom units, inclusive boundaries, negated ranges and nested media rules resolve natively', () => {
  const theme = createTheme({
    breakpoints: {
      values: { small: 0, wide: 40 } as unknown as BreakpointsOptions['values'],
      unit: 'em',
    },
    typography: { htmlFontSize: 20 },
  });
  expect(resolveSx({ p: { small: 1, wide: 2 } }, theme, { width: 639 })).toEqual({ padding: 8 });
  expect(resolveSx({ p: { small: 1, wide: 2 } }, theme, { width: 640 })).toEqual({ padding: 16 });
  const regular = createTheme();
  const sx = {
    p: 1,
    [regular.breakpoints.only('sm')]: { p: 2, [regular.breakpoints.up(750)]: { p: 3 } },
    [regular.breakpoints.not('sm')]: { m: 1 },
  };
  expect(resolveSx(sx, regular, { width: 700 })).toEqual({ padding: 16 });
  expect(resolveSx(sx, regular, { width: 750 })).toEqual({ padding: 24 });
  expect(resolveSx(sx, regular, { width: 900 })).toEqual({ padding: 8, margin: 8 });
  expect(
    resolveSx({ fontSize: 20, [regular.breakpoints.up('sm')]: { lineHeight: 1.5 } }, regular, {
      width: 700,
    }),
  ).toEqual({ fontSize: 20, lineHeight: 30 });
});
test('theme options and breakpoint values remain unmodified, and inactive selectors cannot leak styles', () => {
  const values = Object.freeze({ xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 });
  const theme = createTheme({
    breakpoints: { values, step: undefined, unit: undefined },
    spacing: undefined,
  });
  expect(theme.breakpoints.down('sm')).toBe('@media (max-width:599.95px)');
  expect(theme.spacing()).toBe('8px');
  expect(theme.breakpoints.values).not.toBe(values);
  expect(
    resolveSx({ '&.Mui-disabled': { opacity: 0.3 }, opacity: 1 }, theme, { states: ['disabled'] }),
  ).toEqual({ opacity: 0.3 });
  expect(resolveSx({ '&.Mui-disabled': { opacity: 0.3 }, opacity: 1 }, theme)).toEqual({
    opacity: 1,
  });
});
test('Box and Stack react to native width changes and share the same responsive spacing resolver', () => {
  const window = Dimensions.get('window');
  const screenSize = Dimensions.get('screen');
  const resize = (width: number) =>
    act(() => Dimensions.set({ window: { ...window, width }, screen: { ...screenSize, width } }));
  const theme = createTheme({ spacing: '0.5rem' });
  resize(500);
  const view = render(
    <ThemeProvider theme={theme}>
      <Box testID="box" sx={{ p: 1, [theme.breakpoints.up('sm')]: { p: 2 } }} />
      <Stack testID="stack" spacing={{ xs: 1, sm: 3 }} />
    </ThemeProvider>,
  );
  try {
    expect(screen.getByTestId('box')).toHaveStyle({ padding: 8 });
    expect(screen.getByTestId('stack')).toHaveStyle({ gap: 8 });
    resize(800);
    expect(screen.getByTestId('box')).toHaveStyle({ padding: 16 });
    expect(screen.getByTestId('stack')).toHaveStyle({ gap: 24 });
  } finally {
    view.unmount();
    act(() => Dimensions.set({ window, screen: screenSize }));
  }
});

test('Dialog resolves custom breakpoint widths, missing defaults and the xs minimum', () => {
  const { Dialog } =
    require('../packages/material/src') as typeof import('../packages/material/src');
  const available = Math.max(0, Dimensions.get('window').width - 48);
  const custom = createTheme({
    breakpoints: {
      values: { mobile: 0, tablet: 40, desktop: 75 } as unknown as BreakpointsOptions['values'],
      unit: 'em',
    },
  });
  const { rerender } = render(
    <ThemeProvider theme={custom}>
      <Dialog
        open
        slotProps={{ paper: { testID: 'dialog' } }}
        maxWidth={'tablet' as Parameters<typeof custom.breakpoints.up>[0] & string}
      />
    </ThemeProvider>,
  );
  expect(screen.getByTestId('dialog')).toHaveStyle({ maxWidth: Math.min(available, 640) });
  rerender(
    <ThemeProvider theme={custom}>
      <Dialog open slotProps={{ paper: { testID: 'dialog' } }} />
    </ThemeProvider>,
  );
  expect(screen.getByTestId('dialog')).toHaveStyle({ maxWidth: available });
  rerender(
    <ThemeProvider theme={createTheme()}>
      <Dialog open slotProps={{ paper: { testID: 'dialog' } }} maxWidth="xs" />
    </ThemeProvider>,
  );
  expect(screen.getByTestId('dialog')).toHaveStyle({ maxWidth: Math.min(available, 444) });
});

test('selector specificity survives media nesting and equal-specificity rules retain source order', () => {
  const theme = createTheme();
  const sx = {
    [theme.breakpoints.up('sm')]: { '&.Mui-disabled': { p: 1 } },
    [theme.breakpoints.up('md')]: { p: 2 },
  };
  expect(resolveSx(sx, theme, { width: 1000, states: ['disabled'] })).toEqual({ padding: 8 });
  expect(resolveSx(sx, theme, { width: 1000 })).toEqual({ padding: 16 });
  expect(
    resolveSx(
      { '&.Mui-disabled': { p: 1 }, '@media (min-width:650px)': { '&.Mui-disabled': { p: 2 } } },
      theme,
      { width: 1000, states: ['disabled'] },
    ),
  ).toEqual({ padding: 16 });
  expect(
    resolveSx([{ '&.Mui-disabled': { p: 1 } }, { p: 2 }], theme, { states: ['disabled'] }),
  ).toEqual({ padding: 8 });
});
test('replacement aliases retain MUI declaration insertion order before shorthand expansion', () => {
  const theme = createTheme();
  expect(resolveSx({ p: 1, pl: 2, padding: 3 }, theme)).toEqual({ padding: 24, paddingLeft: 16 });
  expect(
    resolveSx({ p: { sm: 1 }, pl: { sm: 2 }, padding: { sm: 3 } }, theme, { width: 700 }),
  ).toEqual({ padding: 24, paddingLeft: 16 });
  expect(resolveSx({ p: 1, pl: 2, padding: '4px 12px' }, theme)).toEqual({
    paddingTop: 4,
    paddingRight: 12,
    paddingBottom: 4,
    paddingLeft: 16,
  });
});
test('absolute line heights remain absolute while fractional multipliers use final font size', () => {
  const theme = createTheme();
  expect(resolveSx({ fontSize: 20, lineHeight: '1px' }, theme)).toEqual({
    fontSize: 20,
    lineHeight: 1,
  });
  expect(resolveSx({ fontSize: 20, lineHeight: '0.1rem' }, theme)).toEqual({
    fontSize: 20,
    lineHeight: 1.6,
  });
  expect(resolveSx({ fontSize: 20, lineHeight: 'calc(2 * 1px)' }, theme)).toEqual({
    fontSize: 20,
    lineHeight: 2,
  });
  expect(resolveSx({ fontSize: 20, lineHeight: 1.5 }, theme)).toEqual({
    fontSize: 20,
    lineHeight: 30,
  });
});
test('Dialog respects sx radius, clamps minimum width to small custom caps and converts style rem units', () => {
  const { Dialog } =
    require('../packages/material/src') as typeof import('../packages/material/src');
  const available = Math.max(0, Dimensions.get('window').width - 48);
  const tiny = createTheme({
    breakpoints: { values: { tiny: 200 } as unknown as BreakpointsOptions['values'] },
  });
  const { rerender } = render(
    <ThemeProvider theme={tiny}>
      <Dialog
        open
        slotProps={{ paper: { testID: 'dialog', sx: { borderRadius: 3 } } }}
        maxWidth={'tiny' as Parameters<typeof tiny.breakpoints.up>[0] & string}
      />
    </ThemeProvider>,
  );
  expect(screen.getByTestId('dialog')).toHaveStyle({
    minWidth: Math.min(available, 200),
    maxWidth: Math.min(available, 200),
    borderRadius: 12,
  });
  const rem = createTheme({
    typography: { htmlFontSize: 20 },
    breakpoints: { values: { tablet: 40 } as unknown as BreakpointsOptions['values'], unit: 'rem' },
  });
  rerender(
    <ThemeProvider theme={rem}>
      <Dialog
        open
        slotProps={{ paper: { testID: 'dialog' } }}
        maxWidth={'tablet' as Parameters<typeof rem.breakpoints.up>[0] & string}
      />
    </ThemeProvider>,
  );
  expect(screen.getByTestId('dialog')).toHaveStyle({ maxWidth: Math.min(available, 800) });
});

test('CSS typography variants normalize consistently through sx and CSS mode', () => {
  const theme = createTheme();
  for (const variant of ['body1', 'h1', 'button'] as const) {
    const style = { ...theme.typography[variant] };
    const expected = resolveSx(style, theme, { mode: 'css' });
    expect(typeof expected.fontSize).toBe('number');
    expect(typeof expected.lineHeight).toBe('number');
    expect(resolveSx(style, theme)).toEqual(expected);
    expect(resolveSx({ typography: variant }, theme)).toEqual(expected);
  }
});

test('undefined responsive entries erase same-condition aliases without clearing lower breakpoints', () => {
  const theme = createTheme();
  expect(resolveSx({ px: { sm: 2 }, pl: [1, undefined, 3] }, theme, { width: 700 })).toEqual({
    paddingLeft: 8,
    paddingRight: 16,
  });
  expect(
    resolveSx({ px: { sm: 2 }, pl: { xs: 1, sm: null, md: 3 } }, theme, { width: 700 }),
  ).toEqual({
    paddingLeft: 8,
    paddingRight: 16,
  });
});

test('styled viewport rules resize with literal CSS lengths and Stack sx overrides its spacing', () => {
  const window = Dimensions.get('window');
  const screenSize = Dimensions.get('screen');
  const resize = (width: number) =>
    act(() => Dimensions.set({ window: { ...window, width }, screen: { ...screenSize, width } }));
  const theme = createTheme({ spacing: 10 });
  const Surface = styled(Box)(({ theme: currentTheme }) => ({
    padding: 6,
    [currentTheme.breakpoints.up('sm')]: { padding: 12 },
  }));
  resize(500);
  const view = render(
    <ThemeProvider theme={theme}>
      <Surface testID="surface" />
      <Stack testID="stack-override" spacing={{ xs: 1, sm: 3 }} sx={{ gap: { sm: 2 } }} />
    </ThemeProvider>,
  );
  try {
    expect(screen.getByTestId('surface')).toHaveStyle({ padding: 6 });
    expect(screen.getByTestId('stack-override')).toHaveStyle({ gap: 10 });
    resize(800);
    expect(screen.getByTestId('surface')).toHaveStyle({ padding: 12 });
    expect(screen.getByTestId('stack-override')).toHaveStyle({ gap: 20 });
  } finally {
    view.unmount();
    act(() => Dimensions.set({ window, screen: screenSize }));
  }
});

test('responsive holes remove synthetic shadow and border declarations but typography null remains a merge no-op', () => {
  const theme = createTheme();
  const condition = theme.breakpoints.up('sm');
  expect(
    resolveSx({ [condition]: { boxShadow: 2 }, boxShadow: [0, null, 3] }, theme, { width: 700 }),
  ).toEqual({
    elevation: 0,
    shadowOpacity: 0,
  });
  expect(
    resolveSx({ [condition]: { border: 2 }, border: [0, null, 3] }, theme, { width: 700 }),
  ).toEqual({
    borderWidth: 0,
    borderStyle: 'solid',
  });
  expect(
    resolveSx({ [condition]: { typography: 'h1' }, typography: ['body1', null, 'button'] }, theme, {
      width: 700,
    }),
  ).toEqual(resolveSx(theme.typography.h1, theme, { mode: 'css' }));
  expect(resolveSx({ border: 2, borderBottomWidth: 4 }, theme)).toEqual({
    borderWidth: 2,
    borderStyle: 'solid',
    borderBottomWidth: 4,
  });
});

test('sparse responsive arrays preserve lower-breakpoint values without throwing', () => {
  const theme = createTheme();
  const values = [1, , 3];
  expect(resolveSx({ p: values }, theme, { width: 700 })).toEqual({ padding: 8 });
  expect(resolveSx({ p: values }, theme, { width: 950 })).toEqual({ padding: 24 });
  expect(resolveSx({ px: { sm: 2 }, pl: values }, theme, { width: 700 })).toEqual({
    paddingLeft: 8,
    paddingRight: 16,
  });
});
