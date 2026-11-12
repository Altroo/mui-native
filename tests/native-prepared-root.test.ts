// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import { componentRootStyle, componentStyle, createTheme } from '../packages/system/src';
import { nativeCssProgram } from '../packages/system/src/internal/prepared-style';

test('native state frames rebind retained source selectors without resolving callbacks again', () => {
  const calls = { root: 0, variant: 0, sx: 0, css: 0 };
  const theme = createTheme({
    components: {
      MuiProbe: {
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState }) => {
            calls.root++;
            expect(ownerState.pressed).toBeUndefined();
            return {
              get color() {
                calls.css++;
                return 'red';
              },
              '&:hover': { color: 'green' },
              '&:active': { color: 'blue' },
              '&:focus-visible': { minHeight: 51 },
            };
          }),
        },
        variants: [
          {
            props: () => {
              calls.variant++;
              return true;
            },
            style: { padding: 2 },
          },
        ],
      },
    },
  });
  const source = componentRootStyle(
    theme,
    'MuiProbe',
    {},
    () => {
      calls.sx++;
      return { margin: 1 };
    },
    undefined,
  );
  const before = { ...calls },
    css = nativeCssProgram(source.prepared.sheets);
  expect(css).toContain('&:active{');
  expect(css).toContain('&:hover{');
  expect(css).toContain('&:focus-visible{');
  for (const [states, color] of [
    [[], 'red'],
    [['hover'], 'green'],
    [['active'], 'blue'],
    [['focusVisible'], 'red'],
  ] as const) {
    const frame = componentStyle(theme, 'MuiProbe', {}, undefined, {
      preparedRoot: source.prepared,
      states,
      classes: ['MuiProbe-root'],
    });
    expect(frame.color).toBe(color);
    expect(frame.padding).toBe(2);
    expect(frame.margin).toBe(8);
    if (states.some((value) => value === 'focusVisible')) expect(frame.minHeight).toBe(51);
    expect(calls).toEqual(before);
  }
  expect(calls).toEqual({ root: 1, variant: 1, sx: 1, css: 1 });
});
