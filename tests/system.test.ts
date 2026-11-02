import {
  createTheme,
  resolveSx,
  componentStyle,
  configureDiagnostics,
} from '../packages/system/src';
test('theme tokens, spacing, sizing and responsive arrays translate to native units', () => {
  const theme = createTheme({ palette: { primary: { main: '#123456' } }, spacing: 10 });
  expect(
    resolveSx(
      [
        { p: 2, width: 0.5, color: 'primary.main' },
        false,
        (t) => ({ mt: [1, null, 3], fontSize: '1.5rem', borderRadius: 2 }),
      ],
      theme,
      { width: 950 },
    ),
  ).toEqual({
    padding: 20,
    width: '50%',
    color: '#123456',
    marginTop: 30,
    fontSize: 24,
    borderRadius: 8,
  });
  expect(resolveSx({ p: { xs: 1, md: 3 } }, theme, { width: 600 })).toEqual({ padding: 10 });
});
test('styles follow overrides, variants, sx precedence and CSS uses literal padding', () => {
  const theme = createTheme({
    components: {
      MuiButton: {
        styleOverrides: {
          root: ({ ownerState }) => ({ padding: 6, opacity: ownerState.disabled ? 0.3 : 1 }),
        },
        variants: [{ props: { variant: 'contained' }, style: { padding: 12 } }],
      },
    },
  });
  expect(
    componentStyle(theme, 'MuiButton', { variant: 'contained', disabled: true }, { p: 2 }),
  ).toMatchObject({ padding: 16, opacity: 0.3 });
  expect(componentStyle(theme, 'MuiButton', {}, undefined)).toMatchObject({ padding: 6 });
});
test('unsupported selectors and CSS units emit actionable diagnostics', () => {
  const collect = jest.fn();
  const reset = configureDiagnostics(collect);
  try {
    expect(
      resolveSx({ '&:hover': { color: 'red' }, height: '100vh', p: 1 }, createTheme()),
    ).toEqual({ padding: 8 });
    expect(collect.mock.calls.map(([x]) => x.code).sort()).toEqual(['css-unit', 'selector']);
  } finally {
    reset();
  }
});
test('registered states apply only to active state', () => {
  const sx = { '&.Mui-disabled': { opacity: 0.2 } };
  expect(resolveSx(sx, createTheme())).toEqual({});
  expect(resolveSx(sx, createTheme(), { states: ['disabled'] })).toEqual({ opacity: 0.2 });
});
