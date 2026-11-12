// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import * as rootColors from '../packages/system/src';
import * as materialColors from '../packages/material/src/styles';
import * as deepColors from '../packages/system/src/colorManipulator/index';
import {
  createTheme,
  type PaletteOptions,
  type PaletteAugmentColorOptions,
} from '../packages/system/src';
import * as colors from '../packages/system/src/colorManipulator';
import reference from './fixtures/mui-palette-9.5.0.json';

const serializable = (value: unknown) => JSON.parse(JSON.stringify(value));

test.each(reference.palettes)(
  'palette and contrast match pinned MUI for $input',
  ({ input, output, contrast }) => {
    const palette = createTheme({ palette: input as PaletteOptions }).palette;
    expect(serializable(palette)).toEqual(output);
    for (const entry of contrast)
      expect(palette.getContrastText(entry.background)).toBe(entry.output);
  },
);

test.each(reference.augmentation)('augmentColor matches MUI for $input', ({ input, output }) => {
  const frozen = Object.freeze({ ...input, color: Object.freeze({ ...input.color }) });
  const palette = createTheme({ palette: { tonalOffset: { light: 0.1, dark: 0.4 } } }).palette;
  expect(palette.augmentColor(frozen as PaletteAugmentColorOptions)).toEqual(output);
});

test.each(reference.colors)(
  '$operation($args) matches pinned MUI',
  ({ operation, args, output }) => {
    const fn = colors[operation as keyof typeof colors] as (...values: unknown[]) => unknown;
    expect(serializable(fn(...structuredClone(args)))).toEqual(output);
  },
);

test('changing main derives new shades without mutating options or sharing palette objects', () => {
  const main = Object.freeze({ main: '#123456' });
  const options = Object.freeze({ primary: main });
  const first = createTheme({ palette: options });
  const second = createTheme();
  expect(first.palette.primary).toEqual({
    main: '#123456',
    light: 'rgb(65, 92, 119)',
    dark: 'rgb(12, 36, 60)',
    contrastText: '#fff',
  });
  first.palette.grey[500] = '#000';
  first.palette.common.white = '#ddd';
  expect(second.palette.grey[500]).toBe('#9e9e9e');
  expect(second.palette.common.white).toBe('#fff');
  expect(options).toEqual({ primary: { main: '#123456' } });
});

test('explicit zero tonal offsets remain valid', () => {
  const palette = createTheme({
    palette: { primary: { main: '#123456' }, tonalOffset: { light: 0, dark: 0 } },
  }).palette;
  expect(palette.primary.light).toBe('rgb(18, 52, 86)');
  expect(palette.primary.dark).toBe('rgb(18, 52, 86)');
});

test('invalid palette colors fail early and unsupported CSS can use an explicit safe helper', () => {
  expect(() => createTheme({ palette: { primary: {} } })).toThrow(/string main/);
  expect(() =>
    createTheme({ palette: { primary: { main: 4 } } } as unknown as Parameters<
      typeof createTheme
    >[0]),
  ).toThrow(/string main/);
  expect(() => colors.lighten('var(--brand)', 0.2)).toThrow(/Unsupported `var\(--brand\)` color/);
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    expect(colors.private_safeLighten('var(--brand)', 0.2, 'Cannot derive CSS variable')).toBe(
      'var(--brand)',
    );
    expect(warn).toHaveBeenCalledWith('Cannot derive CSS variable');
  } finally {
    warn.mockRestore();
  }
});

test('contrast overrides and two-step theme extension preserve upstream merge semantics', () => {
  const getContrastText = jest.fn(() => '#abcdef');
  const theme = createTheme({ palette: { primary: { main: '#123456' }, getContrastText } });
  expect(theme.palette.getContrastText('#fff')).toBe('#abcdef');
  // Upstream derives colors before merging the public override.
  expect(theme.palette.primary.contrastText).toBe('#fff');
  const extended = createTheme(theme, { palette: { primary: { main: '#234567' } } });
  expect(extended.palette.primary.light).toBe(theme.palette.primary.light);
  expect(extended.palette.primary.main).toBe('#234567');
});

test('explicitly undefined palette controls retain resolved MUI defaults', () => {
  const palette = createTheme({
    palette: { mode: undefined, tonalOffset: undefined, contrastThreshold: undefined },
  }).palette;
  expect(palette.mode).toBe('light');
  expect(palette.tonalOffset).toBe(0.2);
  expect(palette.contrastThreshold).toBe(3);
  expect(palette.augmentColor({ color: { main: '#123456' } })).toEqual(
    createTheme().palette.augmentColor({ color: { main: '#123456' } }),
  );
});

const observeColorContract = require('../scripts/reference/color-contract-cases.cjs') as (
  helpers: typeof colors,
  mode: string,
) => unknown;

test.each(['development', 'production'] as const)(
  'color boundary behavior matches original MUI in %s',
  (mode) => {
    expect(observeColorContract(colors, mode)).toEqual(reference.colorContract[mode]);
  },
);

test('every original color helper export shares root, deep and Material identity', () => {
  expect(Object.keys(colors).sort()).toEqual(reference.colorExports);
  for (const name of reference.colorExports) {
    const key = name as keyof typeof colors;
    expect(rootColors[key]).toBe(colors[key]);
    expect(deepColors[key]).toBe(colors[key]);
    expect(materialColors[key]).toBe(colors[key]);
  }
});
