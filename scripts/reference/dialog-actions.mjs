// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';

const { reference, require, directory } = await loadReference('@mui/material', [
  'package.json',
  'className/index.js',
  'DialogActions/index.js',
  'DialogActions/index.d.ts',
  'DialogActions/DialogActions.js',
  'DialogActions/DialogActions.d.ts',
  'DialogActions/dialogActionsClasses.js',
  'DialogActions/dialogActionsClasses.d.ts',
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
const {
  default: Actions,
  dialogActionsClasses,
  getDialogActionsUtilityClass,
} = load('DialogActions');
const { createTheme, ThemeProvider } = load('styles');
const { unstable_ClassNameGenerator: generator } = load('className');

if (process.argv.includes('--observe-getters')) {
  const observations = [false, true].map((first) => {
    const trace = [];
    let reads = 0;
    const owner = {
      get disableSpacing() {
        const value = reads++ === 0 ? first : !first;
        trace.push('read:' + value);
        return value;
      },
    };
    const theme = createTheme({
      components: {
        MuiDialogActions: {
          styleOverrides: {
            root: () => {
              trace.push('root');
              return { opacity: 0.7 };
            },
            spacing: () => {
              trace.push('spacing');
              return { paddingBottom: 13 };
            },
          },
        },
      },
    });
    const markup = renderToStaticMarkup(
      React.createElement(
        ThemeProvider,
        { theme },
        React.createElement(
          Actions,
          { ownerState: owner, disableSpacing: false, id: 'getter-actions' },
          'Actions',
        ),
      ),
    );
    return {
      first,
      trace,
      siblingMargin: markup.includes('margin-left:8px'),
      spacingOverride: markup.includes('padding-bottom:13px'),
    };
  });
  process.stdout.write(JSON.stringify(observations));
  process.exit(0);
}

if (process.argv.includes('--observe-nullable')) {
  process.stdout.write(
    JSON.stringify(
      ['null', 'undefined'].map((input) => {
        try {
          const markup = renderToStaticMarkup(
            React.createElement(
              ThemeProvider,
              { theme: createTheme() },
              React.createElement(
                Actions,
                { id: 'nullable-actions', ownerState: input === 'null' ? null : undefined },
                'Actions',
              ),
            ),
          );
          const tag = markup.match(/<div[^>]*id="nullable-actions"[^>]*>/)?.[0];
          assert(tag);
          return {
            input,
            error: null,
            spacingClass: tag.includes('MuiDialogActions-spacing'),
            siblingMargin: markup.includes('margin-left:8px'),
          };
        } catch (error) {
          return { input, error: error.name };
        }
      }),
    ),
  );
  process.exit(0);
}

if (process.argv.includes('--observe-reserved')) {
  const { THEME_ID } = load('styles');
  const result = [
    'owner-on',
    'owner-off',
    'owner-empty',
    'owner-undefined',
    'theme-plain',
    'theme-scoped',
  ].map((name) => {
    const state =
      name === 'owner-empty'
        ? { marker: 'caller' }
        : {
            disableSpacing: name === 'owner-undefined' ? undefined : name === 'owner-on',
            marker: 'caller',
          };
    let seenOwner, seenTheme, sxTheme;
    const root = ({ ownerState, theme }) => {
      seenOwner = ownerState;
      seenTheme = theme;
      return { opacity: 0.7 };
    };
    const provider = createTheme({
      shape: { borderRadius: 4 },
      components: {
        MuiDialogActions: {
          defaultProps: { disableSpacing: false },
          styleOverrides: { root, spacing: { paddingBottom: 13 } },
        },
      },
    });
    const explicit = createTheme({
      shape: { borderRadius: 12 },
      components: {
        MuiDialogActions: {
          defaultProps: { disableSpacing: true },
          styleOverrides: { root, spacing: { paddingBottom: 13 } },
        },
      },
    });
    const supplied = name === 'theme-scoped' ? { ...provider, [THEME_ID]: explicit } : explicit;
    const ownerCase = name.startsWith('owner-');
    const input = {
      id: 'reserved-actions',
      ...(ownerCase
        ? { disableSpacing: !state.disableSpacing, ownerState: state }
        : { theme: supplied }),
      sx: (theme) => {
        sxTheme = theme;
        return { paddingTop: '10px' };
      },
    };
    const markup = renderToStaticMarkup(
      React.createElement(
        ThemeProvider,
        { theme: provider },
        React.createElement(Actions, input, 'Actions'),
      ),
    );
    const tag = markup.match(/<div[^>]*id="reserved-actions"[^>]*>/)?.[0];
    assert(tag);
    return {
      name,
      ownerIdentity: ownerCase && seenOwner === state,
      ownerDisableSpacing: seenOwner.disableSpacing ?? null,
      ownerHasDisableSpacing: Object.hasOwn(seenOwner, 'disableSpacing'),
      themeRadius: seenTheme.shape.borderRadius,
      sxThemeRadius: sxTheme.shape.borderRadius,
      spacingClass: tag.includes('MuiDialogActions-spacing'),
      siblingMargin: markup.includes('margin-left:8px'),
      spacingOverride: markup.includes('padding-bottom:13px'),
    };
  });
  process.stdout.write(JSON.stringify(result));
  process.exit(0);
}

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
      MuiDialogActions: {
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
      liveRoot: getDialogActionsUtilityClass('root'),
      globalState: getDialogActionsUtilityClass('disabled'),
      classMapRoot: dialogActionsClasses.root,
    };
  } finally {
    generator.reset();
  }
});
// Production permits the original styled root to attach an explicit theme.
const reservedObservations = JSON.parse(
  execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--observe-reserved'], {
    env: { ...process.env, NODE_ENV: 'production' },
    encoding: 'utf8',
  }),
);
const nullableOwnerObservations = JSON.parse(
  execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--observe-nullable'], {
    env: { ...process.env, NODE_ENV: 'production' },
    encoding: 'utf8',
  }),
);
const ownerGetterObservations = JSON.parse(
  execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--observe-getters'], {
    env: { ...process.env, NODE_ENV: 'production' },
    encoding: 'utf8',
  }),
);
const destination = 'tests/fixtures/mui-dialog-actions-9.5.0.json';
const value = await format(
  JSON.stringify({
    reference,
    utilitiesReference,
    observations,
    reservedObservations,
    nullableOwnerObservations,
    ownerGetterObservations,
  }),
  {
    ...(await resolveConfig(destination)),
    filepath: destination,
  },
);
if (process.argv.includes('--check'))
  assert.equal(await readFile(destination, 'utf8'), value, 'Pinned DialogActions drift');
else await writeFile(destination, value);
console.log(
  `Pinned DialogActions: ${observations.length} root/default/spacing and ${reservedObservations.length} reserved-input observations passed.`,
);
