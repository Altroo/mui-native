// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { StyleSheet } from 'react-native';
import { render, screen, cleanup } from '@testing-library/react-native';
import { ButtonGroup, Paper, Button, ThemeProvider, createTheme } from '../packages/material/src';
import { resolveSx, configureDiagnostics } from '../packages/system/src';
afterEach(cleanup);
test.each([
  [4, 4, 8],
  ['6px', 6, 12],
  ['0.5rem', 8, 16],
  ['10%', '10%', '20%'],
] as const)('shape radius %s resolves base and sx factors', (radius, base, doubled) => {
  const theme = createTheme({ shape: { borderRadius: radius } });
  expect(resolveSx({ borderRadius: 2 }, theme).borderRadius).toBe(doubled);
  render(
    <ThemeProvider theme={theme}>
      <ButtonGroup testID="base">
        <Button>One</Button>
      </ButtonGroup>
      <ButtonGroup testID="factor" sx={{ borderRadius: 2 }}>
        <Button>Two</Button>
      </ButtonGroup>
      <Paper testID="paper" />
      <Paper square testID="square" />
    </ThemeProvider>,
  );
  expect(screen.getByTestId('base')).toHaveStyle({ borderRadius: base });
  expect(screen.getByTestId('factor')).toHaveStyle({ borderRadius: doubled });
  expect(screen.getByTestId('paper')).toHaveStyle({ borderRadius: base });
  // Pinned Paper omits the rounded declaration for square roots; native defaults are zero.
  expect(StyleSheet.flatten(screen.getByTestId('square').props.style).borderRadius).toBeUndefined();
});
test('unsupported variable radii diagnose while source zero factor stays native zero', () => {
  const diagnostic = jest.fn(),
    restore = configureDiagnostics(diagnostic);
  try {
    const theme = createTheme({ shape: { borderRadius: 'var(--shape-radius)' } });
    expect(resolveSx({ borderRadius: 0 }, theme)).toMatchObject({ borderRadius: 0 });
    expect(resolveSx({ borderRadius: 1 }, theme).borderRadius).toBeUndefined();
    expect(diagnostic).toHaveBeenCalled();
  } finally {
    restore();
  }
});

test.each(['0 0 4px currentColor', '0 0 4px'])(
  'Paper shadow %s binds its final sx or native inline color',
  (shadow) => {
    const theme = createTheme();
    theme.shadows[1] = shadow;
    render(
      <ThemeProvider theme={theme}>
        <Paper testID="sx-paint" sx={{ color: 'red' }} />
        <Paper testID="inline-paint" sx={{ color: 'red' }} style={{ color: 'blue' }} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('sx-paint')).toHaveStyle({ boxShadow: '0 0 4px red' });
    expect(screen.getByTestId('inline-paint')).toHaveStyle({ boxShadow: '0 0 4px blue' });
  },
);
