import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
const system = await loadReference('@mui/system', [
  'ThemeProvider/ThemeProvider.js',
  'ThemeProvider/ThemeProvider.d.ts',
  'useTheme/useTheme.js',
  'useTheme/useTheme.d.ts',
  'useThemeWithoutDefault/useThemeWithoutDefault.js',
  'useThemeWithoutDefault/useThemeWithoutDefault.d.ts',
  'RtlProvider/index.js',
  'RtlProvider/index.d.ts',
  'useThemeProps/useThemeProps.js',
  'createStyled/createStyled.js',
  'createBox/createBox.js',
]);
const material = await loadReference('@mui/material', [
  'styles/ThemeProvider.js',
  'styles/ThemeProviderNoVars.js',
  'styles/ThemeProvider.d.ts',
  'styles/useTheme.js',
  'styles/useThemeProps.js',
  'styles/useThemeProps.d.ts',
  'styles/identifier.js',
  'styles/styled.js',
  'Box/Box.js',
]);
const { require, directory } = system;
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sys = require(`${directory}/node_modules/@mui/system/index.js`);
const mat = require(`${directory}/node_modules/@mui/material/styles/index.js`);
const { useRtl } = require(`${directory}/node_modules/@mui/system/RtlProvider/index.js`);
const { useDefaultProps } = require(
  `${directory}/node_modules/@mui/system/DefaultPropsProvider/index.js`,
);
const base = {
  stamp: 'outer',
  nested: { first: 1, second: 2 },
  direction: 'rtl',
  components: {
    Probe: { defaultProps: { value: 'outer' } },
    Other: { defaultProps: { value: 'other' } },
  },
};
const local = {
  stamp: 'local',
  nested: { second: 3 },
  components: { Probe: { defaultProps: { value: 'local' } } },
};
const layer = (provider, theme, extra = {}) => ({ provider, theme, ...extra });
const cases = [
  { name: 'no provider', layers: [] },
  { name: 'empty object', layers: [layer('system', {})] },
  { name: 'system root', layers: [layer('system', base)] },
  { name: 'system shallow object', layers: [layer('system', base), layer('system', local)] },
  { name: 'system empty child', layers: [layer('system', base), layer('system', {})] },
  {
    name: 'system callback replaces',
    layers: [layer('system', base), layer('system', { operation: 'replace' })],
  },
  {
    name: 'system callback extends',
    layers: [layer('system', base), layer('system', { operation: 'extend' })],
  },
  {
    name: 'root callback receives empty object',
    layers: [layer('system', { operation: 'replace' })],
  },
  {
    name: 'scoped object retains outer',
    layers: [layer('system', base), layer('system', local, { themeId: 'design' })],
  },
  {
    name: 'scoped callback selects scope',
    layers: [
      layer('system', base),
      layer('system', local, { themeId: 'design' }),
      layer('system', { operation: 'extend' }, { themeId: 'design' }),
    ],
  },
  {
    name: 'scoped object replaces scope',
    layers: [
      layer('system', base),
      layer('system', local, { themeId: 'design' }),
      layer('system', { stamp: 'replacement' }, { themeId: 'design' }),
    ],
  },
  { name: 'material root', layers: [layer('material', base)] },
  { name: 'material shallow object', layers: [layer('material', base), layer('material', local)] },
  {
    name: 'material callback replaces',
    layers: [layer('material', base), layer('material', { operation: 'replace' })],
  },
  {
    name: 'material callback extends',
    layers: [layer('material', base), layer('material', { operation: 'extend' })],
  },
  {
    name: 'material scoped object',
    layers: [layer('system', base), layer('material', { $$material: local })],
  },
  {
    name: 'material scope replacement',
    layers: [
      layer('system', base),
      layer('material', { $$material: local }),
      layer('material', { $$material: { stamp: 'replacement' } }),
    ],
  },
  {
    name: 'material function receives engine envelope',
    layers: [
      layer('system', base),
      layer('material', { $$material: local }),
      layer('material', { operation: 'extend' }),
    ],
  },
  {
    name: 'system explicit material callback',
    layers: [
      layer('system', base),
      layer('material', { $$material: local }),
      layer('system', { operation: 'extend' }, { themeId: '$$material' }),
    ],
  },
  {
    name: 'nested third-party scope preserves material',
    layers: [
      layer('material', { $$material: base }),
      layer('system', local, { themeId: 'design' }),
    ],
  },
];
const themeInput = (input) =>
  input.operation
    ? (outer) =>
        input.operation === 'replace'
          ? {
              stamp: 'callback',
              received: outer.stamp ?? null,
              receivedScope: outer['$$material']?.stamp ?? null,
            }
          : {
              ...outer,
              stamp: 'callback',
              nested: { ...outer.nested, third: 4 },
              components: { Probe: { defaultProps: { value: 'callback' } } },
            }
    : input;
const summarize = (theme) =>
  !theme
    ? null
    : Object.fromEntries(
        Object.entries(theme).filter(([key]) =>
          [
            'stamp',
            'nested',
            'direction',
            'components',
            'received',
            'receivedScope',
            '$$material',
            'design',
            'vars',
            'fallback',
          ].includes(key),
        ),
      );
const fixtures = cases.map((input) => {
  let output;
  function Probe() {
    output = {
      system: summarize(sys.useTheme({ fallback: true })),
      material: summarize(mat.useTheme()),
      withoutDefault: summarize(sys.useThemeWithoutDefault()),
      defaults: useDefaultProps({ name: 'Probe', props: {} }),
      systemDefaults: sys.useThemeProps({ name: 'Probe', props: {} }),
      materialDefaults: mat.useThemeProps({ name: 'Probe', props: {} }),
      rtl: useRtl(),
    };
    return null;
  }
  let tree = React.createElement(Probe);
  for (const item of [...input.layers].reverse())
    tree = React.createElement(
      item.provider === 'system' ? sys.ThemeProvider : mat.ThemeProvider,
      { theme: themeInput(item.theme), ...(item.themeId ? { themeId: item.themeId } : {}) },
      tree,
    );
  renderToStaticMarkup(tree);
  return { ...input, output };
});
const filename = 'tests/fixtures/mui-theme-providers-9.5.0.json';
const output = await format(
  JSON.stringify({
    references: [system.reference, material.reference],
    themeId: mat.THEME_ID,
    fixtures,
  }),
  { ...(await resolveConfig(filename)), filepath: filename },
);
if (process.argv.includes('--check')) {
  if ((await readFile(filename, 'utf8')) !== output)
    throw new Error('Theme provider reference drift');
} else await writeFile(filename, output);
console.log(`${fixtures.length} pinned provider, scope, hook, default and direction cases passed.`);
