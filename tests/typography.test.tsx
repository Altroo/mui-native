import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import {
  createTheme,
  resolveSx,
  componentStyle,
  configureDiagnostics,
  styled,
  type TypographyVariantsOptions,
} from '../packages/system/src';
import { Typography, Button, ThemeProvider, TextField, Box } from '../packages/material/src';
import reference from './fixtures/mui-typography-9.5.0.json';

const serializable = (value: unknown) => JSON.parse(JSON.stringify(value));
test.each(reference.cases)(
  'typography configuration $input matches pinned MUI',
  ({ input, output, conversions }) => {
    const typography = createTheme({ typography: input as TypographyVariantsOptions }).typography;
    expect(serializable(typography)).toEqual(output);
    for (const { value, output: expected } of conversions)
      expect(typography.pxToRem(value)).toBe(expected);
  },
);
test('typography callbacks receive the derived palette; custom converters are retained', () => {
  const theme = createTheme({
    palette: { primary: { main: '#345678' } },
    typography: (palette) => ({
      fontFamily: 'Inter',
      body1: { color: palette.primary.main },
      allVariants: { fontWeight: 650 },
    }),
  });
  expect(serializable(theme.typography)).toEqual(reference.callback);
  expect(
    serializable(createTheme({ typography: { pxToRem: (size) => `${size / 10}px` } }).typography),
  ).toEqual(reference.custom);
});
test('typography options are not mutated and additional theme arguments merge after derivation', () => {
  const options = { typography: { allVariants: { fontWeight: 600 }, body1: { lineHeight: 2 } } };
  const snapshot = structuredClone(options);
  const base = createTheme(options);
  const changed = createTheme(base, { typography: { fontSize: 28, body1: { color: '#123' } } });
  expect(options).toEqual(snapshot);
  expect(changed.typography.body1.fontSize).toBe(base.typography.body1.fontSize);
  expect(changed.typography.body1.lineHeight).toBe(2);
  expect(changed.typography.body1.color).toBe('#123');
  expect(base.typography.body1.color).toBeUndefined();
});
test.each(reference.sx)(
  'sx typography tokens match normalized pinned output: $input',
  ({ input, output }) => {
    const theme = createTheme();
    expect(resolveSx(input, theme)).toEqual(resolveSx(output, theme, { mode: 'css' }));
  },
);
test.each([
  [
    { fontSize: '2rem', lineHeight: 1.5, letterSpacing: '0.125em' },
    { fontSize: 32, lineHeight: 48, letterSpacing: 4 },
  ],
  [
    { fontSize: 20, lineHeight: 5 },
    { fontSize: 20, lineHeight: 100 },
  ],
  [
    { fontSize: 20, lineHeight: '150%', letterSpacing: '-0.1em' },
    { fontSize: 20, lineHeight: 30, letterSpacing: -2 },
  ],
  [
    { fontSize: 20, lineHeight: '2px', letterSpacing: 'normal' },
    { fontSize: 20, lineHeight: 2, letterSpacing: 0 },
  ],
  [
    { fontSize: 20, lineHeight: 'calc(2 * 1px)' },
    { fontSize: 20, lineHeight: 2 },
  ],
  [
    { fontSize: 0, lineHeight: 1.5, letterSpacing: '1em' },
    { fontSize: 0, lineHeight: 0, letterSpacing: 0 },
  ],
])('relative and absolute text lengths normalize at the final boundary: %j', (input, expected) => {
  expect(resolveSx(input, createTheme())).toEqual(expected);
});
test('relative metrics use the final cascade and native style font size', () => {
  const theme = createTheme({
    components: { MuiTypography: { styleOverrides: { root: { fontSize: 24 } } } },
  });
  expect(
    componentStyle(
      theme,
      'MuiTypography',
      {},
      { fontSize: 30 },
      {
        baseStyle: {
          fontSize: 20,
          lineHeight: 1.5,
          letterSpacing: '0.1em',
          marginBottom: '0.35em',
        },
        nativeStyle: { fontSize: 40 },
      },
    ),
  ).toMatchObject({ fontSize: 30, lineHeight: 60, letterSpacing: 4, marginBottom: 14 });
});
test('native Typography derives scaled fonts, no-wrap, gutters and palette color names', () => {
  const theme = createTheme({ typography: { fontSize: 21 } });
  render(
    <ThemeProvider theme={theme}>
      <Typography testID="text" noWrap gutterBottom color="primary" style={{ fontSize: 40 }}>
        Hello
      </Typography>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('text')).toHaveStyle({
    fontSize: 40,
    lineHeight: 60,
    marginBottom: 14,
    color: theme.palette.primary.main,
    fontFamily: 'System',
  });
  expect(screen.getByTestId('text').props.numberOfLines).toBe(1);
  expect(screen.getByTestId('text').props.ellipsizeMode).toBe('tail');
});
test('custom font stacks retain theme values and choose the first loaded native family', () => {
  const theme = createTheme({ typography: { fontFamily: '"My Font", sans-serif' } });
  expect(theme.typography.body1.fontFamily).toBe('"My Font", sans-serif');
  expect(resolveSx(theme.typography.body1, theme)).toMatchObject({
    fontFamily: 'My Font',
    fontSize: 16,
  });
  expect(resolveSx(theme.typography.body1, theme).letterSpacing).toBeUndefined();
});
test('nested inherit variants retain parent text metrics and support relative overrides', () => {
  render(
    <ThemeProvider theme={createTheme()}>
      <Typography variant="h4" style={{ fontSize: 40, lineHeight: 50 }} color="error">
        <Typography
          testID="child"
          variant="inherit"
          sx={{ fontSize: '50%', lineHeight: 1.5, letterSpacing: '0.1em' }}
        >
          Nested
        </Typography>
      </Typography>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('child')).toHaveStyle({
    fontSize: 20,
    lineHeight: 30,
    letterSpacing: 2,
  });
});
test('variant mapping controls native heading semantics and native custom roots receive refs and text props', () => {
  const Root = React.forwardRef<React.ComponentRef<typeof Text>, React.ComponentProps<typeof Text>>(
    (props, ref) => <Text {...props} ref={ref} testID="custom" />,
  );
  render(
    <>
      <Typography variant="h2">Heading</Typography>
      <Typography variant="h2" component="span">
        Plain
      </Typography>
      <Typography variantMapping={{ body1: 'h3' }}>Mapped</Typography>
      <Typography component={Root} selectable>
        Custom
      </Typography>
    </>,
  );
  expect(screen.getByText('Heading').props.accessibilityRole).toBe('header');
  expect(screen.getByText('Plain').props.accessibilityRole).toBeUndefined();
  expect(screen.getByText('Mapped').props.accessibilityRole).toBe('header');
  expect(screen.getByTestId('custom').props.selectable).toBe(true);
});
test('variant, alignment and gutter overrides precede matching variants, sx and native styles', () => {
  const theme = createTheme({
    components: {
      MuiTypography: {
        defaultProps: { variant: 'h6' },
        styleOverrides: {
          root: { fontSize: 10 },
          h6: { fontSize: 20 },
          alignCenter: { letterSpacing: '0.2em' },
          gutterBottom: { marginBottom: '0.5em' },
        },
        variants: [{ props: { gutterBottom: true }, style: { fontSize: 30 } }],
      },
    },
  });
  render(
    <ThemeProvider theme={theme}>
      <Typography
        testID="styled"
        gutterBottom
        align="center"
        sx={{ fontSize: 40 }}
        style={{ fontSize: 50 }}
      >
        Styled
      </Typography>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('styled')).toHaveStyle({
    fontSize: 50,
    lineHeight: 80,
    letterSpacing: 10,
    marginBottom: 25,
    textAlign: 'center',
  });
});
test('disabled and unknown runtime variants diagnose instead of crashing', () => {
  const record = jest.fn();
  const reset = configureDiagnostics(record);
  try {
    render(
      <ThemeProvider theme={createTheme({ typography: { h3: undefined } })}>
        <Typography variant="h3">Disabled</Typography>
      </ThemeProvider>,
    );
    expect(screen.getByText('Disabled')).toBeTruthy();
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ code: 'typography' }));
  } finally {
    reset();
  }
});
test('Button and TextField consume normalized theme typography', () => {
  const theme = createTheme({
    typography: { fontSize: 21, fontFamily: 'Inter', button: { textTransform: 'none' } },
  });
  render(
    <ThemeProvider theme={theme}>
      <Button sx={{ fontSize: 30 }}>Mixed Case</Button>
      <TextField testID="input" value="Input" />
    </ThemeProvider>,
  );
  expect(screen.getByText('Mixed Case')).toHaveStyle({
    fontSize: 30,
    lineHeight: 52.5,
    fontFamily: 'Inter',
    textTransform: 'none',
  });
  expect(screen.getByTestId('input')).toHaveStyle({
    fontSize: 24,
    lineHeight: 36,
    fontFamily: 'Inter',
  });
});
test('unsupported text values never reach the native renderer as CSS strings or NaN', () => {
  const record = jest.fn();
  const reset = configureDiagnostics(record);
  try {
    expect(
      resolveSx(
        { fontSize: 'var(--font)', lineHeight: 'calc(1em + 2px)', letterSpacing: '2vw' },
        createTheme(),
      ),
    ).toEqual({});
    expect(record).toHaveBeenCalledTimes(3);
  } finally {
    reset();
  }
});

test('typography shorthand evaluates nested media styles and never passes selectors to native views', () => {
  const theme = createTheme({
    typography: { h1: { '@media (min-width:600px)': { fontSize: '2rem', lineHeight: 2 } } },
  });
  expect(resolveSx({ typography: 'h1' }, theme, { width: 500 }).fontSize).toBe(96);
  expect(resolveSx({ typography: 'h1' }, theme, { width: 500 }).lineHeight).toBeCloseTo(112.032);
  const wide = resolveSx({ typography: 'h1' }, theme, { width: 700 });
  expect(wide).toMatchObject({ fontSize: 32, lineHeight: 64 });
  expect(Object.keys(wide).some((key) => key.startsWith('@'))).toBe(false);
});
test('styled Text combines base styles and overrides before computing relative text metrics', () => {
  const Styled = styled(Text)({ fontSize: 20, lineHeight: 1.5, letterSpacing: '0.1em' });
  render(
    <Styled testID="styled-text" sx={{ fontSize: 30 }} style={{ fontSize: 40 }}>
      Styled
    </Styled>,
  );
  expect(screen.getByTestId('styled-text')).toHaveStyle({
    fontSize: 40,
    lineHeight: 60,
    letterSpacing: 4,
  });
});

test.each([
  [1, '100'],
  [350, '400'],
  [650, '700'],
  [1000, '900'],
])('CSS weight %s maps to the nearest supported native hundred', (weight, native) => {
  const theme = createTheme({ typography: { fontWeightRegular: weight } });
  expect(theme.typography.body1.fontWeight).toBe(weight);
  expect(resolveSx(theme.typography.body1, theme).fontWeight).toBe(native);
});

test('TextField native input slot font sizes participate in theme relative line heights', () => {
  render(
    <TextField
      testID="slot-text"
      value="Slot"
      slotProps={{ htmlInput: { style: { fontSize: 30 } } }}
    />,
  );
  expect(screen.getByTestId('slot-text')).toHaveStyle({ fontSize: 30, lineHeight: 45 });
});

test('inherited unitless heights recompute while inherited percentages and native lengths stay absolute', () => {
  const content = (lineHeight: number | string, native = false) => (
    <Typography
      sx={{ fontSize: 40, ...(native ? {} : { lineHeight }) }}
      style={native ? { lineHeight: Number(lineHeight) } : undefined}
    >
      <Typography testID="ratio-child" variant="inherit" sx={{ fontSize: '50%' }}>
        Nested
      </Typography>
    </Typography>
  );
  const { rerender } = render(content(1.5));
  expect(screen.getByTestId('ratio-child')).toHaveStyle({ fontSize: 20, lineHeight: 30 });
  rerender(content('150%'));
  expect(screen.getByTestId('ratio-child')).toHaveStyle({ fontSize: 20 });
  expect(screen.getByTestId('ratio-child').props.style.lineHeight).toBeUndefined();
  rerender(content(60, true));
  expect(screen.getByTestId('ratio-child')).toHaveStyle({ fontSize: 20 });
  expect(screen.getByTestId('ratio-child').props.style.lineHeight).toBeUndefined();
  rerender(
    <Typography testID="ratio-child" variant="inherit" sx={{ fontSize: 40 }}>
      Root
    </Typography>,
  );
  expect(screen.getByTestId('ratio-child')).toHaveStyle({ fontSize: 40 });
  expect(screen.getByTestId('ratio-child').props.style.lineHeight).toBeUndefined();
});
test.each(['2em', '200%'])('root relative font size %s is applied exactly once', (fontSize) => {
  const theme = createTheme({ typography: { body1: { fontSize } } });
  expect(resolveSx({ typography: 'body1' }, theme)).toMatchObject({ fontSize: 32, lineHeight: 48 });
});
test('typography shortcut preserves CSS spacing/radius units, including media rules', () => {
  const theme = createTheme({
    typography: {
      body1: { marginTop: 2, borderRadius: 2, '@media (min-width:600px)': { marginTop: 3 } },
    },
  });
  for (const width of [500, 700])
    expect(resolveSx({ typography: 'body1' }, theme, { width })).toEqual(
      resolveSx(theme.typography.body1, theme, { width, mode: 'css' }),
    );
});
test('Button sends all supported font and decoration properties to its Text label', () => {
  render(
    <ThemeProvider
      theme={createTheme({
        typography: { button: { fontStyle: 'italic', textDecorationLine: 'underline' } },
      })}
    >
      <Button>Decorated</Button>
    </ThemeProvider>,
  );
  expect(screen.getByText('Decorated')).toHaveStyle({
    fontStyle: 'italic',
    textDecorationLine: 'underline',
  });
  expect(StyleSheet.flatten(screen.getByRole('button').props.style).fontStyle).toBeUndefined();
});

test('inherit leaves untracked native Text and Button parent attributes intact', () => {
  render(
    <>
      <Text style={{ fontSize: 40, color: 'red' }}>
        <Typography variant="inherit" testID="native-inherit">
          Nested
        </Typography>
      </Text>
      <Button variant="contained">
        <Typography variant="inherit" testID="button-inherit">
          Label
        </Typography>
      </Button>
    </>,
  );
  for (const id of ['native-inherit', 'button-inherit']) {
    const style = StyleSheet.flatten(screen.getByTestId(id).props.style);
    expect(style.fontSize).toBeUndefined();
    expect(style.color).toBeUndefined();
    expect(style.lineHeight).toBeUndefined();
  }
});
test('an inherited normal line-height reset produces an actionable native limitation diagnostic', () => {
  const record = jest.fn();
  const reset = configureDiagnostics(record);
  try {
    render(
      <Typography sx={{ lineHeight: 2 }}>
        <Typography variant="inherit" sx={{ lineHeight: 'normal' }}>
          Reset
        </Typography>
      </Typography>,
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'typography-inheritance' }),
    );
  } finally {
    reset();
  }
});

test('styled Typography preserves unitless metadata when handing normalized styles to native Typography', () => {
  const Styled = styled(Typography)({ fontSize: 40, lineHeight: 1.5 });
  render(
    <Styled>
      <Typography variant="inherit" testID="styled-child" sx={{ fontSize: '50%' }}>
        Child
      </Typography>
    </Styled>,
  );
  expect(screen.getByTestId('styled-child')).toHaveStyle({ fontSize: 20, lineHeight: 30 });
});
test('an intervening ordinary Text keeps native inheritance instead of forced tracked grandparent values', () => {
  render(
    <Typography sx={{ fontSize: 40, lineHeight: 2, color: 'red' }}>
      <Text style={{ fontSize: 10, lineHeight: 12, color: 'blue' }}>
        <Typography variant="inherit" testID="native-middle">
          Child
        </Typography>
      </Text>
    </Typography>,
  );
  const style = StyleSheet.flatten(screen.getByTestId('native-middle').props.style);
  expect(style.fontSize).toBeUndefined();
  expect(style.lineHeight).toBeUndefined();
  expect(style.color).toBeUndefined();
});
test('Button component defaults beat typography defaults while explicit component styling wins last', () => {
  const theme = createTheme({
    typography: { allVariants: { color: 'red', padding: 100, backgroundColor: 'red' } },
  });
  const content = (disabled = false, loading = false, sx = {}) => (
    <ThemeProvider theme={theme}>
      <Button variant="contained" disabled={disabled} loading={loading} sx={sx}>
        Contrast
      </Button>
    </ThemeProvider>
  );
  const { rerender } = render(content());
  expect(screen.getByText('Contrast')).toHaveStyle({ color: theme.palette.primary.contrastText });
  expect(screen.getByRole('button')).toHaveStyle({
    backgroundColor: theme.palette.primary.main,
    paddingTop: 6,
    paddingBottom: 6,
  });
  rerender(content(true));
  expect(screen.getByText('Contrast')).toHaveStyle({ color: theme.palette.action.disabled });
  rerender(content(false, true));
  // Original centered loading makes the label transparent; the visible loader
  // still inherits disabled contrast instead of the allVariants red text color.
  expect(screen.getByText('Contrast')).toHaveStyle({ color: 'transparent', opacity: 0 });
  expect(screen.getByRole('progressbar').props.color).toBe(theme.palette.action.disabled);
  rerender(content(false, false, { color: 'green', bgcolor: 'black' }));
  expect(screen.getByText('Contrast')).toHaveStyle({ color: 'green' });
  expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: 'black' });
});

test.each(['22px', '150%'])(
  'an explicit %s line height breaks an ancestor ratio for later descendants',
  (lineHeight) => {
    render(
      <Typography sx={{ fontSize: 40, lineHeight: 1.5 }}>
        <Typography variant="inherit" testID="absolute-child" sx={{ fontSize: 20, lineHeight }}>
          <Typography variant="inherit" testID="absolute-grandchild" sx={{ fontSize: 10 }}>
            Third
          </Typography>
        </Typography>
      </Typography>,
    );
    expect(screen.getByTestId('absolute-child')).toHaveStyle({
      lineHeight: lineHeight === '22px' ? 22 : 30,
    });
    expect(screen.getByTestId('absolute-grandchild').props.style.lineHeight).toBeUndefined();
  },
);
test('styled relative metrics resolve against the selected Typography variant', () => {
  const Styled = styled(Typography)({ lineHeight: 1.5, letterSpacing: '0.1em' });
  render(
    <Styled variant="h1" testID="late-metrics">
      Large
    </Styled>,
  );
  expect(screen.getByTestId('late-metrics')).toHaveStyle({
    fontSize: 96,
    lineHeight: 144,
  });
  expect(
    StyleSheet.flatten(screen.getByTestId('late-metrics').props.style).letterSpacing,
  ).toBeCloseTo(9.6);
});
test.each([false, true])(
  'native Button padding shorthands override generated edges, callback=%s',
  (callback) => {
    const value = { paddingHorizontal: 30, paddingVertical: 20, paddingLeft: 35 };
    render(<Button style={callback ? () => value : value}>Padded</Button>);
    expect(screen.getByRole('button')).toHaveStyle({
      paddingLeft: 35,
      paddingRight: 30,
      paddingTop: 20,
      paddingBottom: 20,
    });
  },
);

test('styled Typography retains literal native height precedence and nested wrapper metrics', () => {
  const Inner = styled(Typography)({ letterSpacing: '0.1em' });
  const Outer = styled(Inner)({ lineHeight: 1.5 });
  render(
    <Outer variant="h1" testID="nested-wrapper" style={{ fontSize: 20, lineHeight: 25 }}>
      <Typography variant="inherit" testID="literal-height-child" sx={{ fontSize: 10 }}>
        Nested
      </Typography>
    </Outer>,
  );
  expect(screen.getByTestId('nested-wrapper')).toHaveStyle({
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: 2,
  });
  expect(screen.getByTestId('literal-height-child').props.style.lineHeight).toBeUndefined();
});
test('IconButton native padding is not masked by Button edge defaults', () => {
  const { IconButton } = require('../packages/material/src');
  render(<IconButton>Icon</IconButton>);
  expect(screen.getByRole('button')).toHaveStyle({
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 8,
    paddingBottom: 8,
  });
});

test('nested styled wrappers retain relative metrics without a literal native override', () => {
  const Inner = styled(Typography)({ letterSpacing: '0.1em' });
  const Outer = styled(Inner)({ lineHeight: 1.5 });
  render(
    <Outer variant="h1" testID="nested-relative">
      Heading
    </Outer>,
  );
  expect(screen.getByTestId('nested-relative')).toHaveStyle({ fontSize: 96, lineHeight: 144 });
  expect(
    StyleSheet.flatten(screen.getByTestId('nested-relative').props.style).letterSpacing,
  ).toBeCloseTo(9.6);
});

test('MUI htmlFontSize calibrates conversion without changing the native CSS root', () => {
  const theme = createTheme({ typography: { htmlFontSize: 20 } });
  expect(theme.typography.pxToRem(20)).toBe('1rem');
  expect(
    resolveSx({ fontSize: '1rem', width: '2rem', margin: 'calc(2 * 1rem)' }, theme),
  ).toMatchObject({ fontSize: 16, width: 32, margin: 32 });
  expect(resolveSx(theme.typography.body1, theme).fontSize).toBeCloseTo(12.8);
  const configured = createTheme({ cssRootFontSize: 20, typography: { htmlFontSize: 20 } });
  expect(resolveSx({ fontSize: '1rem', width: '2rem' }, configured)).toMatchObject({
    fontSize: 20,
    width: 40,
  });
  expect(resolveSx(configured.typography.body1, configured).fontSize).toBe(16);
});
test.each([0, -1, NaN, Infinity])(
  'invalid native CSS root %s fails at theme construction',
  (cssRootFontSize) => {
    expect(() => createTheme({ cssRootFontSize })).toThrow(/finite positive/);
  },
);
test('native root configuration remains separate from scoped text inheritance', () => {
  const theme = createTheme({ cssRootFontSize: 20, typography: { htmlFontSize: 20 } });
  render(
    <ThemeProvider theme={theme}>
      <Box>
        <Typography variant="inherit" testID="root-size">
          Root
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 30 }}>
        <Typography
          variant="inherit"
          sx={{ fontSize: '50%', marginBottom: '1rem' }}
          testID="child-size"
        >
          Child
        </Typography>
      </Typography>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('root-size')).toHaveStyle({ fontSize: 20 });
  expect(screen.getByTestId('child-size')).toHaveStyle({ fontSize: 15, marginBottom: 20 });
});

test('an explicitly absent CSS root option uses the native default', () => {
  expect(createTheme({ cssRootFontSize: undefined }).cssRootFontSize).toBe(16);
});
