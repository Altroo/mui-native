// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { render, cleanup } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import {
  Accordion,
  AccordionSummary,
  Typography,
  ThemeProvider,
  createTheme,
} from '@altroo/mui-native';
import { nativeColorSource, nativeColorLayer } from '../packages/system/src/nativeColorSources';
import { nativeStyleBorderDeclarations } from '../packages/system/src/borders';
afterEach(cleanup);
for (const variant of ['inherit', 'body1'] as const) {
  test.each(['inherited', 'native-blue', 'css-blue', 'theme-blue'] as const)(
    variant + ': equal blue paint retains its authored or inherited source (%s)',
    (kind) => {
      const theme = createTheme({
        motion: { reducedMotion: 'always' },
        ...(kind === 'theme-blue'
          ? { components: { MuiTypography: { styleOverrides: { root: { color: '#0000ff' } } } } }
          : {}),
      });
      const tree = render(
        <ThemeProvider theme={theme}>
          <Accordion sx={{ color: '#0000ff' }}>
            <AccordionSummary>
              <Typography
                variant={variant}
                testID="glyph"
                style={kind === 'native-blue' ? { color: '#0000ff' } : undefined}
                sx={kind === 'css-blue' ? { color: '#0000ff' } : undefined}
              >
                MMMM
              </Typography>
            </AccordionSummary>
          </Accordion>
        </ThemeProvider>,
      );
      const style = tree.getByTestId('glyph').props.style;
      expect(StyleSheet.flatten(style).color).toBe('#0000ff');
      expect(nativeColorSource(style)).toBe(kind === 'inherited' ? 'inherited' : 'authored');
      expect(tree.getByTestId('glyph').props).not.toHaveProperty('colorSource');
    },
  );
}
test('an explicit native layer reauthors an inherited library result without touching its source', () => {
  const caller = { color: '#0000ff' };
  const inherited = nativeStyleBorderDeclarations(nativeColorLayer(caller, 'inherited'));
  expect(nativeColorSource(inherited)).toBe('inherited');
  const authored = nativeStyleBorderDeclarations(nativeColorLayer(inherited, 'authored'));
  expect(nativeColorSource(authored)).toBe('authored');
  expect(nativeColorSource(inherited)).toBe('inherited');
  expect(nativeColorSource(caller)).toBeUndefined();
});
test('channel tracking adds no reads of a caller color getter', () => {
  let reads = 0;
  const style = {
    get color() {
      reads++;
      return '#0000ff';
    },
  };
  const result = nativeStyleBorderDeclarations(nativeColorLayer(style, 'authored'));
  expect(result.color).toBe('#0000ff');
  expect(reads).toBe(1);
  expect(nativeColorSource(result)).toBe('authored');
});

test('a colorless inherited Text scope keeps the dark-theme fallback of a nested body variant', () => {
  const theme = createTheme({ palette: { mode: 'dark' } });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Typography variant="inherit">
        <Typography testID="dark-child">Child</Typography>
      </Typography>
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('dark-child').props.style).color).toBe(
    theme.palette.text.primary,
  );
  expect(nativeColorSource(tree.getByTestId('dark-child').props.style)).toBe('authored');
});
