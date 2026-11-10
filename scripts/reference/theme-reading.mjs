// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';

const system = await loadReference('@mui/system', [
  'useTheme/useTheme.js',
  'useTheme/useTheme.d.ts',
  'useThemeWithoutDefault/useThemeWithoutDefault.js',
  'useThemeWithoutDefault/useThemeWithoutDefault.d.ts',
  'ThemeProvider/ThemeProvider.js',
  'createStyled/createStyled.js',
  'styled/index.js',
]);
const material = await loadReference('@mui/material', [
  'styles/useTheme.js',
  'styles/useTheme.d.ts',
  'styles/defaultTheme.js',
  'styles/identifier.js',
  'styles/styled.js',
  'styles/useThemeProps.js',
]);
const React = system.require('react');
const { renderToStaticMarkup } = system.require('react-dom/server');
const root = `${system.directory}/node_modules/@mui/system`;
const useTheme = system.require(`${root}/useTheme/index.js`).default;
const namedDefault = system.require(`${root}/useTheme/index.js`).systemDefaultTheme;
const withoutDefault = system.require(`${root}/useThemeWithoutDefault/index.js`).default;
const Provider = system.require(`${root}/ThemeProvider/index.js`).default;
const useMaterial = material.require(
  `${material.directory}/node_modules/@mui/material/styles/useTheme.js`,
).default;
const cases = [
  { name: 'no provider', kind: 'none' },
  { name: 'empty context', kind: 'object', theme: {} },
  { name: 'unscoped context', kind: 'object', theme: { stamp: 'outer' } },
  {
    name: 'Material scope',
    kind: 'object',
    theme: { stamp: 'outer', $$material: { stamp: 'material' }, other: { stamp: 'other' } },
  },
  ...[null, false, 0, ''].map((scope) => ({
    name: `falsy scope ${JSON.stringify(scope)}`,
    kind: 'object',
    theme: { stamp: 'outer', $$material: scope },
  })),
  { name: 'empty callback replaces context', kind: 'reset' },
];
let materialDefault;
renderToStaticMarkup(
  React.createElement(function ReadDefault() {
    materialDefault = useMaterial();
    return null;
  }),
);
const fixtures = cases.map((input) => {
  let result;
  const fallback = { fallback: true };
  function Probe() {
    const raw = useTheme(),
      value = useMaterial();
    result = {
      systemIsDefault: raw === namedDefault,
      materialIsDefault: value === materialDefault,
      materialIsSystem: value === raw,
      nullableIsNull: withoutDefault() === null,
      explicitSystemIsFallback: useTheme(fallback) === fallback,
      explicitNullableIsFallback: withoutDefault(fallback) === fallback,
      systemStamp: raw.stamp ?? null,
      materialStamp: value.stamp ?? null,
    };
    return null;
  }
  let tree = React.createElement(Probe);
  if (input.kind === 'object') tree = React.createElement(Provider, { theme: input.theme }, tree);
  if (input.kind === 'reset')
    tree = React.createElement(
      Provider,
      { theme: { stamp: 'outer' } },
      React.createElement(Provider, { theme: () => ({}) }, tree),
    );
  renderToStaticMarkup(tree);
  return { input, result };
});
const systemStyled = system.require(`${root}/styled/index.js`).default;
const materialStyled = material.require(
  `${material.directory}/node_modules/@mui/material/styles/styled.js`,
).default;
const styledFixtures = [];
for (const opaque of [false, true])
  for (const firstMaterial of [false, true]) {
    const Base = opaque ? (props) => React.createElement('div', props) : 'div';
    let inner, outer;
    const first = firstMaterial ? materialStyled : systemStyled;
    const second = firstMaterial ? systemStyled : materialStyled;
    const Inner = first(Base)(({ theme }) => {
      inner = theme;
      return {};
    });
    const Outer = second(Inner)(({ theme }) => {
      outer = theme;
      return {};
    });
    renderToStaticMarkup(React.createElement(Outer));
    styledFixtures.push({
      input: { opaque, firstMaterial, memo: false },
      result: {
        innerIsMaterial: inner === materialDefault,
        outerIsMaterial: outer === materialDefault,
        sameTheme: inner === outer,
      },
    });
  }
for (const firstMaterial of [false, true]) {
  let inner, outer;
  const first = firstMaterial ? materialStyled : systemStyled;
  const second = firstMaterial ? systemStyled : materialStyled;
  const Inner = first('div')(({ theme }) => {
    inner = theme;
    return {};
  });
  const Outer = second(React.memo(Inner))(({ theme }) => {
    outer = theme;
    return {};
  });
  renderToStaticMarkup(React.createElement(Outer));
  styledFixtures.push({
    input: { opaque: false, firstMaterial, memo: true },
    result: {
      innerIsMaterial: inner === materialDefault,
      outerIsMaterial: outer === materialDefault,
      sameTheme: inner === outer,
    },
  });
}
const options = (await resolveConfig('.')) ?? {};
const provenance = {
  schemaVersion: 1,
  description:
    'Finite native theme-reading hook contract; theme construction, provider and CSS-variable completion are separate.',
  references: [material.reference, system.reference],
  localFiles: [
    'packages/material/src/themeProvider.tsx',
    'packages/system/src/provider.tsx',
    'tests/theme-reading.test.tsx',
    'fixtures/theme-reading-consumer/consumer.tsx',
  ],
  adaptations: [
    'Native hooks read the shared native context; no DOM/styled-engine bridge is installed.',
    'Native Theme construction remains its own contract. Material and System retain distinct stable fallback objects.',
    'Generic signatures and canonical root/styles/deep imports remain intact.',
  ],
};
const fixturePath = 'tests/fixtures/mui-theme-reading-9.5.0.json';
const snapshot = await format(JSON.stringify({ version: '9.5.0', fixtures, styledFixtures }), {
  ...options,
  parser: 'json',
});
provenance.fixture = {
  path: fixturePath,
  sha256: createHash('sha256').update(snapshot).digest('hex'),
};
await writeFile(
  'upstream/native-theme-reading.json',
  await format(JSON.stringify(provenance), { ...options, parser: 'json' }),
);
await writeFile(fixturePath, snapshot);
console.log(
  `Recorded ${fixtures.length} verified original theme-reading and ${styledFixtures.length} fallback composition cases.`,
);
