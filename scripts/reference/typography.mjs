// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import prettier from 'prettier';
const { format, resolveConfig } = prettier;
import { loadReference } from './load.mjs';
const { reference, require, directory } = await loadReference('@mui/material', [
  'styles/createPalette.js',
  'styles/createTypography.js',
  'styles/createTypography.d.ts',
  'Typography/Typography.js',
  'Typography/Typography.d.ts',
]);
const system = await loadReference('@mui/system', [
  'styleFunctionSx/styleFunctionSx.js',
  'typography/typography.js',
  'style/style.js',
  'styleFunctionSx/defaultSxConfig.js',
]);
const createTypography = require(
  `${directory}/node_modules/@mui/material/styles/createTypography.js`,
).default;
const createPalette = require(
  `${directory}/node_modules/@mui/material/styles/createPalette.js`,
).default;
const styleFunctionSx = require(
  `${directory}/node_modules/@mui/system/styleFunctionSx/styleFunctionSx.js`,
).default;
const palette = createPalette({ primary: { main: '#345678' } });
const inputs = [
  {},
  { fontSize: 18 },
  { htmlFontSize: 20 },
  { fontSize: 18, htmlFontSize: 20 },
  { fontFamily: 'Inter, sans-serif' },
  { fontWeightLight: 200, fontWeightRegular: 350, fontWeightMedium: 600, fontWeightBold: 900 },
  { allVariants: { color: '#123456', letterSpacing: '0.03em', lineHeight: 1.4, fontSize: 18 } },
  {
    body1: { fontSize: '2rem', lineHeight: '150%', letterSpacing: '1px' },
    h1: { fontWeight: 'bold' },
  },
  { poster: { fontSize: '5rem', lineHeight: 1.1 }, h3: null },
];
const cases = inputs.map((input) => {
  const output = createTypography(palette, input);
  return {
    input,
    output,
    conversions: [0, 1, 12, 14, 16, 24, -8, 1.5].map((value) => ({
      value,
      output: output.pxToRem(value),
    })),
  };
});
const callback = createTypography(palette, (p) => ({
  fontFamily: 'Inter',
  body1: { color: p.primary.main },
  allVariants: { fontWeight: 650 },
}));
const custom = createTypography(palette, { pxToRem: (size) => `${size / 10}px` });
const typography = createTypography(palette, {});
const sx = [
  { typography: 'body1' },
  { typography: 'h1', fontSize: 32 },
  { fontWeight: 'medium', fontFamily: 'default', fontSize: 'body2.fontSize' },
  { fontWeight: 'fontWeightBold', fontSize: 'fontSize' },
  { typography: 'button', lineHeight: 5, letterSpacing: '0.5em' },
].map((input) => ({ input, output: styleFunctionSx({ sx: input, theme: { typography } }) }));
const file = 'tests/fixtures/mui-typography-9.5.0.json';
const output = await format(
  JSON.stringify({ references: [reference, system.reference], cases, callback, custom, sx }),
  { ...(await resolveConfig(file)), parser: 'json' },
);
if (process.argv.includes('--check')) {
  if ((await readFile(file, 'utf8')) !== output)
    throw new Error('Typography reference fixture has drifted.');
} else await writeFile(file, output);
console.log(
  `${cases.length} typography configurations, callback/custom conversion and ${sx.length} sx cases verified.`,
);
