// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
import observe from './transition-helper-cases.cjs';
const { reference, require, directory } = await loadReference('@mui/material', [
  'styles/createTransitions.js',
  'styles/createTransitions.d.ts',
  'styles/createMotion.js',
  'styles/createMotion.d.ts',
  'styles/createThemeNoVars.d.ts',
]);
const transitions = require(`${directory}/node_modules/@mui/material/styles/createTransitions.js`);
const motion = require(`${directory}/node_modules/@mui/material/styles/createMotion.js`);
const helpers = {
  createTransitions: transitions.default,
  createMotion: motion.default,
  duration: transitions.duration,
  easing: transitions.easing,
};
const cases = Object.fromEntries(
  ['development', 'production'].map((mode) => [mode, observe(helpers, mode)]),
);
const file = 'tests/fixtures/mui-transition-helpers-9.5.0.json';
const output = await format(
  JSON.stringify({
    reference,
    transitionExports: Object.keys(transitions).sort(),
    motionExports: Object.keys(motion).sort(),
    cases,
  }),
  { ...(await resolveConfig(file)), filepath: file },
);
if (process.argv.includes('--check')) {
  if ((await readFile(file, 'utf8')) !== output) throw Error('Transition helper reference drift');
} else await writeFile(file, output);
console.log(`${cases.development.length} transition helper boundary cases per mode verified.`);
