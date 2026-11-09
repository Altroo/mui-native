// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import * as prettier from 'prettier';
import { loadReference } from './load.mjs';

// Original source/SSR observations. Emitted CSS is not computed browser layout.
const material = await loadReference('@mui/material', [
  'CardContent/CardContent.js',
  'CardContent/CardContent.d.ts',
  'CardContent/CardContent.d.mts',
  'CardContent/cardContentClasses.js',
  'CardContent/cardContentClasses.d.ts',
  'CardContent/cardContentClasses.d.mts',
  'CardContent/index.js',
  'CardContent/index.d.ts',
  'CardContent/index.d.mts',
  'styles/components.d.ts',
  'styles/props.d.ts',
  'styles/styled.js',
  'DefaultPropsProvider/DefaultPropsProvider.js',
]);
const utils = await loadReference('@mui/utils', [
  'composeClasses/composeClasses.js',
  'generateUtilityClass/generateUtilityClass.js',
  'generateUtilityClasses/generateUtilityClasses.js',
  'ClassNameGenerator/ClassNameGenerator.js',
]);
const system = await loadReference('@mui/system', [
  'createStyled/createStyled.js',
  'DefaultPropsProvider/DefaultPropsProvider.js',
]);
const React = material.require('react');
const { renderToStaticMarkup } = material.require('react-dom/server');
const canonical = material.require('@mui/material/CardContent');
const CardContent = canonical.default;
const { ThemeProvider, createTheme, styled } = material.require('@mui/material/styles');
const root = material.require('@mui/material');
assert.equal(root.CardContent, CardContent);
assert.equal(root.cardContentClasses, canonical.cardContentClasses);
const plainClass = (value) =>
  String(value ?? '')
    .split(/\s+/)
    .filter((value) => value && !value.startsWith('css-'))
    .join(' ');
function observe(props = {}, theme = createTheme(), Component = CardContent) {
  const html = renderToStaticMarkup(
    React.createElement(
      ThemeProvider,
      { theme },
      React.createElement(Component, { id: 'content', ...props }, 'Body'),
    ),
  );
  const tag = html.match(/<(?:div|section|article)\b[^>]*\bid="content"[^>]*>/)?.[0];
  assert(tag, 'CardContent root missing');
  return {
    tag: tag.match(/^<([a-z]+)/)[1],
    className: plainClass(tag.match(/class="([^"]*)"/)?.[1]),
    inline: tag.match(/style="([^"]*)"/)?.[1] ?? '',
    css: [...html.matchAll(/<style[^>]*>(.*?)<\/style>/g)].map((value) => value[1]).join(''),
  };
}
const fixtures = [];
for (const [name, props] of [
  ['default', {}],
  ['caller-class', { className: 'consumer' }],
  ['root-class', { classes: { root: 'root-override' }, className: 'consumer' }],
  ['component-section', { component: 'section' }],
  ['as-article', { as: 'article' }],
  ['component-then-as', { component: 'section', as: 'article' }],
  ['own-undefined-component', { component: undefined }],
  ['null-component-js', { component: null }],
  ['sx-root-padding', { sx: { p: 0 } }],
  ['sx-root-bottom', { sx: { paddingBottom: 5 } }],
  ['sx-last-child-bottom', { sx: { '&:last-child': { paddingBottom: 5 } } }],
  ['inline-bottom', { style: { paddingBottom: 4 } }],
  [
    'inline-and-sx',
    { sx: { p: 0, '&:last-child': { paddingBottom: 3 } }, style: { paddingBottom: 4 } },
  ],
])
  fixtures.push({ name, props, result: observe(props) });

// Literal defaults stay16/24 even with a nonstandard theme spacing function.
const spacingTheme = createTheme({ spacing: 11 });
const spacing = {
  base: observe({}, spacingTheme),
  sx: observe({ sx: { p: 2 } }, spacingTheme),
  sxArray: observe(
    { sx: [false, { p: 1 }, (theme) => ({ marginTop: theme.spacing(2) })] },
    spacingTheme,
  ),
};
const defaultsTheme = createTheme({
  components: {
    MuiCardContent: {
      defaultProps: {
        component: 'section',
        className: 'theme-default',
        classes: { root: 'theme-root' },
        sx: { p: 2 },
      },
    },
  },
});
const defaults = [
  { name: 'theme-defaults', result: observe({}, defaultsTheme) },
  {
    name: 'own-undefined',
    result: observe({ component: undefined, className: undefined, sx: undefined }, defaultsTheme),
  },
  {
    name: 'explicit',
    result: observe({ component: 'article', className: 'caller', sx: { p: 1 } }, defaultsTheme),
  },
];
const trace = [];
const callback = (slot) => (args) => {
  const state = args.ownerState;
  trace.push({
    slot,
    keys: Object.keys(state).sort(),
    component: state.component ?? null,
    hasComponent: Object.hasOwn(state, 'component'),
    density: state['data-density'] ?? null,
  });
  return slot === 'root' ? { padding: 3, '&:last-child': { paddingBottom: 5 } } : { marginTop: 99 };
};
const callbackTheme = createTheme({
  components: {
    MuiCardContent: { styleOverrides: { root: callback('root'), unused: callback('unused') } },
  },
});
const themed = [];
for (const [name, props] of [
  ['default-state', {}],
  ['selected-component', { component: 'section' }],
  ['authored-state', { ownerState: { 'data-density': 'compact' } }],
  ['sx-after-root', { sx: { p: 0 } }],
  ['sx-after-pseudo', { sx: { '&:last-child': { paddingBottom: 2 } } }],
  ['inline-after-pseudo', { style: { paddingBottom: 4 } }],
]) {
  trace.length = 0;
  const result = observe(props, callbackTheme);
  themed.push({ name, result, trace: trace.slice() });
}
const variantsTheme = createTheme({
  components: {
    MuiCardContent: {
      styleOverrides: { root: { padding: 3 } },
      variants: [
        {
          props: { 'data-density': 'compact' },
          style: { padding: 5, '&:last-child': { paddingBottom: 7 } },
        },
      ],
    },
  },
});
const variants = [
  observe({ 'data-density': 'compact' }, variantsTheme),
  observe({ 'data-density': 'compact', sx: { p: 0 } }, variantsTheme),
  observe(
    { 'data-density': 'compact', sx: { '&:last-child': { paddingBottom: 2 } } },
    variantsTheme,
  ),
];
const Wrapped = styled(CardContent)({ padding: 9, '&:last-child': { paddingBottom: 11 } });
const wrapped = observe({ sx: { p: 0 } }, createTheme(), Wrapped);
const throwingTheme = createTheme({
  components: {
    MuiCardContent: {
      styleOverrides: {
        root: {},
        unused: () => {
          throw Error('unused-card-content-slot');
        },
      },
    },
  },
});
let unusedThrow;
try {
  observe({}, throwingTheme);
} catch (error) {
  unusedThrow = error.message;
}
assert.equal(unusedThrow, 'unused-card-content-slot');
const getterTrace = [];
const getterTheme = createTheme({ components: { MuiCardContent: { styleOverrides: {} } } });
for (const slot of ['root', 'unused'])
  Object.defineProperty(getterTheme.components.MuiCardContent.styleOverrides, slot, {
    enumerable: true,
    get() {
      getterTrace.push('get:' + slot);
      return () => {
        getterTrace.push('call:' + slot);
        return slot === 'root' ? { marginTop: 2 } : { marginBottom: 99 };
      };
    },
  });
const getter = { result: observe({}, getterTheme), trace: getterTrace };
const utilitySlots = ['root', 'disabled', 'focusVisible', 'invented', 'constructor', 'toString'];
const data = {
  references: [material.reference, utils.reference, system.reference],
  classes: canonical.cardContentClasses,
  utilities: Object.fromEntries(
    utilitySlots.map((slot) => [slot, canonical.getCardContentUtilityClass(slot)]),
  ),
  fixtures,
  spacing,
  defaults,
  themed,
  variants,
  wrapped,
  unusedThrow,
  getter,
};
const fixture = 'tests/fixtures/mui-card-content-9.5.0.json';
const config = await prettier.resolveConfig(fixture);
const bytes = await prettier.format(
  JSON.stringify(data, (_key, value) => (value === undefined ? '$undefined' : value)),
  { ...config, parser: 'json' },
);
if (process.argv.includes('--check'))
  assert.equal(await readFile(fixture, 'utf8'), bytes, 'CardContent source/SSR reference changed');
else await writeFile(fixture, bytes);
console.log(
  `Pinned CardContent: ${fixtures.length} roots, ${themed.length} callback traces, defaults/variants/getters/unused throws verified; fixture SHA256 ${createHash('sha256').update(bytes).digest('hex')}.`,
);
