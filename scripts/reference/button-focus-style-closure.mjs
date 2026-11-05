// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { loadReference } from './load.mjs';

const material = await loadReference('@mui/material', [
  'Button/Button.js',
  'ButtonBase/ButtonBase.js',
  'styles/focusVisible.js',
  'styles/shadows.js',
  'styles/createThemeNoVars.js',
  'utils/memoTheme.js',
]);
const createTheme = material.require(
  `${material.directory}/node_modules/@mui/material/styles/createThemeNoVars.js`,
).default;
async function rootStyle(name) {
  const file = `${material.directory}/node_modules/@mui/material/${name}/${name}.js`;
  const source = await readFile(file, 'utf8');
  const localRequire = createRequire(file);
  const module = { exports: {} };
  let captured;
  vm.runInNewContext(
    source,
    {
      module,
      exports: module.exports,
      process,
      require: (specifier) => {
        // Execute the pinned source callback itself, before Emotion serializes it.
        // This is a style-contract probe, not a browser or native rendering result.
        if (specifier === '../utils/memoTheme')
          return { __esModule: true, default: (style) => style };
        if (specifier === '../zero-styled')
          return {
            ...localRequire(specifier),
            styled:
              (_tag, options) =>
              (...styles) => {
                if (options.name === `Mui${name}` && options.slot === 'Root') captured = styles[0];
                return function ReferenceStyledRoot() {
                  return null;
                };
              },
          };
        return localRequire(specifier);
      },
    },
    { filename: file },
  );
  assert.equal(typeof captured, 'function', `${name} root callback was not captured`);
  return captured;
}
const button = await rootStyle('Button');
const base = await rootStyle('ButtonBase');
const cases = [
  {},
  { focusVisible: false },
  { focusVisible: true },
  { focusVisible: { outlineWidth: 4, boxShadow: '0 0 4px red' } },
].map((options) => {
  const theme = createTheme(options);
  const original = button({ theme });
  const contained = original.variants.find(
    (variant) => variant.props.variant === 'contained',
  ).style;
  const noElevation = original.variants.find(
    (variant) => variant.props.disableElevation === true,
  ).style;
  const root = base({ theme });
  const ring = root.variants.find(
    (variant) => variant.props.internalDisabledThemeFocusVisible === false,
  ).style;
  assert.equal(contained.boxShadow, theme.shadows[2]);
  assert.equal(contained['&:hover'].boxShadow, theme.shadows[4]);
  assert.equal(contained['&:active'].boxShadow, theme.shadows[8]);
  assert.equal(
    contained['&.Mui-focusVisible'].boxShadow,
    theme.focusVisible?.boxShadow
      ? `${theme.shadows[6]}, ${theme.focusVisible.boxShadow}`
      : theme.shadows[6],
  );
  assert.equal(contained['&.Mui-disabled'].boxShadow, theme.shadows[0]);
  assert.equal(noElevation.boxShadow, 'none');
  assert.equal(
    noElevation['&.Mui-focusVisible'].boxShadow,
    theme.focusVisible?.boxShadow ?? 'none',
  );
  assert(
    Object.keys(contained).indexOf('&:active') <
      Object.keys(contained).indexOf('&.Mui-focusVisible'),
  );
  assert(
    Object.keys(noElevation).indexOf('&.Mui-focusVisible') <
      Object.keys(noElevation).indexOf('&:active'),
  );
  assert.equal(Boolean(ring), Boolean(theme.focusVisible));
  if (ring) assert.equal(ring['&.Mui-focusVisible'], theme.focusVisible);
  return {
    options,
    order: Object.keys(contained).filter((key) => key.startsWith('&')),
    baseRing: ring || null,
    contained: Object.fromEntries(
      ['boxShadow', '&:hover', '&:active', '&.Mui-focusVisible', '&.Mui-disabled'].map((key) => [
        key,
        contained[key],
      ]),
    ),
    noElevation,
  };
});
const report = { reference: material.reference, cases };
const outputIndex = process.argv.indexOf('--output');
if (outputIndex !== -1) {
  const output = process.argv[outputIndex + 1];
  if (!output?.startsWith('/tmp/mui-native-button-focus-style-closure-'))
    throw new Error('Use the delegated /tmp output prefix.');
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
}
console.log(`${cases.length} pinned Button/ButtonBase root focus/shadow configurations verified.`);
