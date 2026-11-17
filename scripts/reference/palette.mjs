// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import prettier from 'prettier';
const { format } = prettier;
import { loadReference } from './load.mjs';
import observeColorContract from './color-contract-cases.cjs';

// Run against isolated original packages, never the native aliases or implementations.
// Setup and cache locations are documented in docs/theming.md.
const directory = resolve('.cache/palette-reference');
const require = createRequire(`${directory}/package.json`);
const references = [];
for (const [name, files] of [
  [
    '@mui/material',
    [
      'styles/createPalette.js',
      'colors/common.js',
      'colors/grey.js',
      'colors/blue.js',
      'colors/purple.js',
      'colors/red.js',
      'colors/orange.js',
      'colors/lightBlue.js',
      'colors/green.js',
    ],
  ],
  [
    '@mui/system',
    ['colorManipulator/colorManipulator.js', 'colorManipulator/colorManipulator.d.ts'],
  ],
  [
    '@mui/utils',
    [
      'clamp/index.js',
      'clamp/clamp.js',
      'formatMuiErrorMessage/index.js',
      'formatMuiErrorMessage/formatMuiErrorMessage.js',
    ],
  ],
]) {
  const loaded = await loadReference(name, files);
  references.push(loaded.reference);
}
const createPalette = require(
  `${directory}/node_modules/@mui/material/styles/createPalette.js`,
).default;
const colors = require(
  `${directory}/node_modules/@mui/system/colorManipulator/colorManipulator.js`,
);
const paletteInputs = [
  {},
  { mode: 'dark' },
  { primary: { main: '#123456' } },
  { mode: 'dark', primary: { main: '#123456' }, secondary: { main: 'hsl(220, 70%, 40%)' } },
  { primary: { main: '#36c' }, tonalOffset: 0.3 },
  { primary: { main: '#36c' }, tonalOffset: { light: 0.1, dark: 0.4 } },
  { primary: { main: '#777' }, contrastThreshold: 4.5 },
  {
    primary: { 300: '#89a', 500: '#456', 700: '#123' },
    secondary: { A200: '#c9f', A400: '#96c', A700: '#639' },
  },
  {
    primary: { main: '#456', light: '#abc', dark: '#123', contrastText: '#fff' },
    common: { white: '#fefefe' },
    grey: { 500: '#888' },
    text: { secondary: '#123' },
    action: { hoverOpacity: 0.07 },
  },
  {
    primary: { main: 'rgba(12, 34, 56, 0.8)' },
    secondary: { main: 'hsla(240, 50%, 45%, 0.8)' },
    error: { main: '#900' },
    warning: { main: '#aa4' },
    info: { main: 'rgb(12, 90, 128)' },
    success: { main: '#172' },
  },
];
const backgrounds = ['#fff', '#000', '#90caf9', '#123456', '#777', 'hsl(200, 50%, 50%)'];
const palettes = paletteInputs.map((input) => {
  const palette = createPalette(input);
  return {
    input,
    output: JSON.parse(JSON.stringify(palette)),
    contrast: backgrounds.map((background) => ({
      background,
      output: palette.getContrastText(background),
    })),
  };
});
const augmentInputs = [
  { color: { main: '#36c' }, name: 'brand' },
  {
    color: { 400: '#456', 200: '#abc', 800: '#123' },
    mainShade: 400,
    lightShade: 200,
    darkShade: 800,
  },
  { color: { main: '#456', contrastText: '#fff', custom: '#fff' } },
];
const augmentation = augmentInputs.map((input) => ({
  input,
  output: createPalette({ tonalOffset: { light: 0.1, dark: 0.4 } }).augmentColor(input),
}));
const colorCases = [];
const add = (operation, args) =>
  colorCases.push({ operation, args, output: colors[operation](...structuredClone(args)) });
for (const color of [
  '#000',
  '#fff',
  '#123456',
  '#f09a',
  '#12345678',
  'rgb(12, 34, 56)',
  'rgba(12, 34, 56, 0.8)',
  'hsl(220, 70%, 40%)',
  'hsla(200, 50%, 60%, 0.4)',
  'color(srgb 0.2 0.4 0.6)',
  'color(display-p3 0.2 0.4 0.6 /0.8)',
]) {
  for (const operation of ['decomposeColor', 'colorChannel', 'getLuminance', 'emphasize'])
    add(operation, [color]);
  for (const operation of ['alpha', 'lighten', 'darken'])
    for (const coefficient of [0, 0.2, 1]) add(operation, [color, coefficient]);
  add('getContrastRatio', [color, '#fff']);
}
for (const color of ['#f09', '#f09a', '#123456', '#12345678']) add('hexToRgb', [color]);
for (const color of ['rgb(12, 34, 56)', 'rgba(12, 34, 56, 0.4)']) add('rgbToHex', [color]);
for (const color of ['hsl(220, 70%, 40%)', 'hsla(200, 50%, 60%, 0.4)']) add('hslToRgb', [color]);
for (const gamma of [1, 2.2]) add('blend', ['#123456', '#abcdef', 0.4, gamma]);
for (const color of [
  { type: 'rgba', values: [12.8, 34.2, 56, 0.8] },
  { type: 'hsl', values: [220, 70, 40] },
])
  add('recomposeColor', [color]);
const colorContract = Object.fromEntries(
  ['development', 'production'].map((mode) => [mode, observeColorContract(colors, mode)]),
);
const output = await format(
  JSON.stringify({
    references,
    palettes,
    augmentation,
    colors: colorCases,
    colorExports: Object.keys(colors).sort(),
    colorContract,
  }),
  { parser: 'json' },
);
const file = 'tests/fixtures/mui-palette-9.5.0.json';
if (process.argv.includes('--check')) {
  if ((await readFile(file, 'utf8')) !== output)
    throw new Error('Palette reference fixture has drifted.');
} else await writeFile(file, output);
console.log(
  `${palettes.length} palette, ${augmentation.length} augmentation and ${colorCases.length} color reference cases and ${colorContract.development.length} boundary cases per mode verified.`,
);
