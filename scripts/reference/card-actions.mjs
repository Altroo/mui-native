// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';

const { reference, require, directory } = await loadReference('@mui/material', [
  'package.json',
  'className/index.js',
  'CardActions/index.js',
  'CardActions/index.d.ts',
  'CardActions/CardActions.js',
  'CardActions/CardActions.d.ts',
  'CardActions/cardActionsClasses.js',
  'CardActions/cardActionsClasses.d.ts',
]);
const { reference: utilitiesReference } = await loadReference('@mui/utils', [
  'ClassNameGenerator/index.js',
  'ClassNameGenerator/ClassNameGenerator.js',
  'composeClasses/composeClasses.js',
  'generateUtilityClass/generateUtilityClass.js',
]);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = (file) => require(`${directory}/node_modules/@mui/material/${file}`);
const { default: Actions, cardActionsClasses, getCardActionsUtilityClass } = load('CardActions');
const { createTheme, ThemeProvider } = load('styles');
const { unstable_ClassNameGenerator: generator } = load('className');
const cases = [
  { name: 'stock', prop: 'absent' },
  { name: 'authored disabled', prop: true },
  { name: 'default disables spacing', prop: 'absent', defaults: true },
  { name: 'explicit undefined inherits theme default', prop: 'undefined', defaults: true },
  { name: 'explicit false restores spacing', prop: false, defaults: true },
  { name: 'configured active classes', prop: false, configured: true },
];
const observations = cases.map((input) => {
  const accesses = [];
  const classes = {
    get root() {
      accesses.push('root');
      return 'own-root';
    },
    get spacing() {
      accesses.push('spacing');
      return 'own-spacing';
    },
  };
  let ownerDisableSpacing, rootHasDisableSpacing;
  const theme = createTheme({
    components: {
      MuiCardActions: {
        ...(input.defaults === undefined
          ? {}
          : { defaultProps: { disableSpacing: input.defaults } }),
        styleOverrides: {
          root: ({ ownerState, ...rootProps }) => {
            rootHasDisableSpacing = Object.hasOwn(rootProps, 'disableSpacing');
            ownerDisableSpacing = ownerState.disableSpacing;
            return { opacity: 0.8 };
          },
          spacing: { paddingBottom: 9 },
        },
      },
    },
  });
  const props =
    input.prop === 'absent'
      ? {}
      : { disableSpacing: input.prop === 'undefined' ? undefined : input.prop };
  if (input.configured) generator.configure((name) => `Consumer${name}`);
  try {
    const child = React.createElement(
      Actions,
      { ...props, classes, className: 'authored', id: 'actions-probe' },
      React.createElement('button', null, 'Apply'),
      React.createElement('button', null, 'Cancel'),
    );
    const markup = renderToStaticMarkup(React.createElement(ThemeProvider, { theme }, child));
    const tag = markup.match(/<div[^>]*id="actions-probe"[^>]*>/)?.[0];
    assert(tag, 'Original actions root is missing');
    return {
      input,
      accesses,
      ownerDisableSpacing,
      rootHasDisableSpacing,
      className: tag
        .match(/class="([^"]*)"/)[1]
        .split(/\s+/)
        .filter((token) => !token.startsWith('css-'))
        .join(' '),
      siblingMargin: markup.includes('margin-left:8px'),
      spacingOverride: markup.includes('padding-bottom:9px'),
      liveRoot: getCardActionsUtilityClass('root'),
      globalState: getCardActionsUtilityClass('disabled'),
      classMapRoot: cardActionsClasses.root,
    };
  } finally {
    generator.reset();
  }
});
const destination = 'tests/fixtures/mui-card-actions-9.5.0.json';
const value = await format(JSON.stringify({ reference, utilitiesReference, observations }), {
  ...(await resolveConfig(destination)),
  filepath: destination,
});
if (process.argv.includes('--check'))
  assert.equal(await readFile(destination, 'utf8'), value, 'Pinned CardActions drift');
else await writeFile(destination, value);
console.log(`Pinned CardActions: ${observations.length} root/default/spacing observations passed.`);
