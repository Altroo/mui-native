// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import prettier from 'prettier';
const { format, resolveConfig } = prettier;
import { loadReference } from './load.mjs';
const { reference, require, directory } = await loadReference('@mui/system', [
  'createTheme/createSpacing.js',
  'spacing/spacing.js',
  'createBreakpoints/createBreakpoints.js',
  'styleFunctionSx/styleFunctionSx.js',
  'breakpoints/breakpoints.js',
]);
const root = `${directory}/node_modules/@mui/system`;
const createSpacing = require(`${root}/createTheme/createSpacing.js`).default;
const createBreakpoints = require(`${root}/createBreakpoints/createBreakpoints.js`).default;
const styleFunctionSx = require(`${root}/styleFunctionSx/styleFunctionSx.js`).default;
const spacingCases = [];
for (const input of [
  8,
  0,
  4.5,
  [0, 4, 10, 24],
  ['0px', '0.25rem', '1rem'],
  '0.5rem',
  'var(--space)',
]) {
  const argsList = Array.isArray(input)
    ? [[], [0], [1], [-1], [2, 'auto'], [0, 1, 2, -2]]
    : [[], [0], [1], [-2], [0.5], [1, 'auto'], ['2rem', -1, 0, 2]];
  for (const args of argsList)
    spacingCases.push({ input, args, output: createSpacing(input)(...args) });
}
const breakpointCases = [];
for (const input of [
  {},
  { step: 10 },
  { step: 0 },
  { values: { desktop: 1200, mobile: 0, tablet: 640 } },
  { values: { desktop: 75, mobile: 0, tablet: 40 }, unit: 'em' },
  { values: { only: 0 } },
]) {
  const breakpoints = createBreakpoints(input);
  const calls = [];
  for (const key of breakpoints.keys)
    for (const method of ['up', 'down', 'only', 'not'])
      calls.push({ method, args: [key], output: breakpoints[method](key) });
  for (const args of [
    [320, 768],
    [breakpoints.keys[0], breakpoints.keys.at(-1)],
  ])
    calls.push({ method: 'between', args, output: breakpoints.between(...args) });
  calls.push({ method: 'up', args: [640], output: breakpoints.up(640) });
  breakpointCases.push({
    input,
    values: breakpoints.values,
    keys: breakpoints.keys,
    unit: breakpoints.unit,
    mediaKeys: breakpoints.internal_mediaKeys,
    calls,
  });
}
const breakpoints = createBreakpoints({});
const theme = { breakpoints, spacing: createSpacing(8) };
const sxCases = [
  { [breakpoints.up('sm')]: { p: 3 }, p: 1 },
  { p: { md: 3, xs: 1 }, px: { sm: 2 } },
  { p: { sm: 2 }, [breakpoints.up('sm')]: { px: 3 } },
  { [breakpoints.up('sm')]: { px: 3 }, p: { sm: 2 } },
  { px: 2, p: 1 },
  { p: 1, px: 2 },
  { p: 1, pl: 2, padding: 3 },
  { p: { sm: 1 }, pl: { sm: 2 }, padding: { sm: 3 } },
  { [breakpoints.up('sm')]: false, p: { sm: 1 } },
  { [breakpoints.up('sm')]: [], p: { sm: 1 } },
  { px: { sm: 2 }, pl: [1, null, 3] },
  { [breakpoints.up('sm')]: { p: 3 }, p: [1, null, 4] },
  {
    [breakpoints.up('sm')]: { opacity: 0.5, color: 'red', borderRadius: 2 },
    opacity: [0.2, null, 0.8],
    color: ['blue', null, 'green'],
    borderRadius: [1, null, 3],
  },
  { [breakpoints.not('sm')]: { mt: 2 }, [breakpoints.only('sm')]: { mt: 1 } },
].map((input) => ({ input, output: styleFunctionSx({ sx: input, theme }) }));
const file = 'tests/fixtures/mui-layout-9.5.0.json';
const output = await format(
  JSON.stringify({ reference, spacing: spacingCases, breakpoints: breakpointCases, sx: sxCases }),
  { ...(await resolveConfig(file)), parser: 'json' },
);
if (process.argv.includes('--check')) {
  if ((await readFile(file, 'utf8')) !== output)
    throw new Error('Layout reference fixture has drifted.');
} else await writeFile(file, output);
console.log(
  `${spacingCases.length} spacing, ${breakpointCases.length} breakpoint configurations and ${sxCases.length} sx reference cases verified.`,
);
