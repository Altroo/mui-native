// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import prettier from 'prettier';
const { format, resolveConfig } = prettier;
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'package.json',
  'index.js',
  'index.d.ts',
  'Typography/Typography.js',
  'Typography/Typography.d.ts',
  'Typography/index.js',
  'Typography/index.d.ts',
  'Typography/typographyClasses.js',
  'Typography/typographyClasses.d.ts',
  'internal/index.d.ts',
  'utils/createSimplePaletteValueFilter.js',
  'styles/rootShouldForwardProp.js',
  'DefaultPropsProvider/DefaultPropsProvider.js',
]);
const utils = await loadReference('@mui/utils', [
  'composeClasses/composeClasses.js',
  'generateUtilityClass/generateUtilityClass.js',
]);
const system = await loadReference('@mui/system', [
  'createStyled/createStyled.js',
  'DefaultPropsProvider/DefaultPropsProvider.js',
  'styleFunctionSx/styleFunctionSx.js',
]);
const React = material.require('react');
const { renderToStaticMarkup } = material.require('react-dom/server');
const canonical = material.require('@mui/material/Typography');
const Typography = canonical.default;
const root = material.require('@mui/material');
const { createTheme, ThemeProvider, styled } = material.require('@mui/material/styles');
assert.equal(root.Typography, Typography);
assert.equal(root.typographyClasses, canonical.typographyClasses);
assert.equal(root.getTypographyUtilityClass, canonical.getTypographyUtilityClass);
assert.throws(() => material.require('@mui/material/Typography/typographyClasses'), {
  code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
});
assert(
  !String(
    await readFile(material.directory + '/node_modules/@mui/material/Typography/Typography.d.ts'),
  ).includes('paragraph'),
);
const publicClass = (value) =>
  value == null
    ? null
    : String(value)
        .split(/\s+/)
        .filter((token) => token && !token.startsWith('css-'))
        .join(' ') || null;
const decode = (props = {}) =>
  Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, value === '$undefined' ? undefined : value]),
  );
const observe = (args) => ({
  ownerClass: publicClass(args.ownerState.className),
  rootClass: publicClass(args.className),
  ownerStyle: args.ownerState.style ?? null,
  hasOwnerStyle: Object.hasOwn(args.ownerState, 'style'),
  ownerSx: args.ownerState.sx ?? null,
  hasOwnerSx: Object.hasOwn(args.ownerState, 'sx'),
  align: args.ownerState.align,
  color: args.ownerState.color ?? null,
  gutterBottom: args.ownerState.gutterBottom,
  noWrap: args.ownerState.noWrap,
  variant: args.ownerState.variant,
  variantMapping: args.ownerState.variantMapping,
  hasColor: Object.hasOwn(args.ownerState, 'color'),
  hasComponent: Object.hasOwn(args.ownerState, 'component'),
  ownerComponent: args.ownerState.component ?? null,
  rootStyle: args.style,
  rootAs: args.as,
  id: args.id,
});
const inputs = [
  { name: 'defaults' },
  ...[
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'subtitle1',
    'subtitle2',
    'body1',
    'body2',
    'button',
    'caption',
    'overline',
    'inherit',
  ].map((variant) => ({ name: 'variant ' + variant, props: { variant } })),
  ...['left', 'right', 'center', 'justify'].map((align) => ({
    name: 'align ' + align,
    props: { align },
  })),
  ...[
    'primary',
    'secondary',
    'error',
    'warning',
    'info',
    'success',
    'textPrimary',
    'textSecondary',
    'textDisabled',
    'inherit',
    '#ff0000',
  ].map((color) => ({ name: 'color ' + color, props: { color } })),
  {
    name: 'custom variant',
    theme: { typography: { poster: { fontSize: '2rem', lineHeight: 1.25 } } },
    props: { variant: 'poster' },
  },
  {
    name: 'custom palette',
    theme: { palette: { brand: { main: '#123456' } } },
    props: { color: 'brand' },
  },
  { name: 'gutter and no-wrap', props: { gutterBottom: true, noWrap: true } },
  {
    name: 'all active class getter order',
    classGetter: true,
    props: { align: 'center', gutterBottom: true, noWrap: true, className: ' authored ' },
  },
  { name: 'mapped heading', props: { variantMapping: { body1: 'h4' } } },
  { name: 'empty mapping falls back', props: { variant: 'h2', variantMapping: { h2: '' } } },
  { name: 'empty component falls back', props: { variant: 'h2', component: '' } },
  { name: 'component wins', props: { variant: 'h2', component: 'span' } },
  {
    name: 'theme defaults',
    defaults: { variant: 'h6', className: 'theme', style: { opacity: 0.2 }, sx: { fontSize: 24 } },
  },
  {
    name: 'own values replace defaults',
    defaults: { variant: 'h6', className: 'theme', style: { opacity: 0.2 } },
    props: { variant: 'body2', className: 'own', style: { color: 'red' } },
  },
  {
    name: 'undefined selects defaults',
    defaults: { variant: 'h6', style: { opacity: 0.2 } },
    props: { variant: '$undefined', style: '$undefined' },
  },
  {
    name: 'null style suppresses default',
    defaults: { style: { opacity: 0.2 } },
    props: { style: null },
  },
  {
    name: 'opt-in merge',
    merge: true,
    defaults: { className: 'theme', style: { opacity: 0.2, fontSize: 30 } },
    props: { className: 'own', align: 'center', style: { fontSize: 40 } },
  },
  {
    name: 'native inline metric counterpart',
    props: { align: 'center', gutterBottom: true, style: { fontSize: 40, textAlign: 'right' } },
  },
];
const cases = inputs.map((input) => {
  let observation;
  const classReads = [];
  const classes = input.classGetter
    ? Object.fromEntries(
        ['root', 'body1', 'alignCenter', 'gutterBottom', 'noWrap'].map((slot) => [slot, null]),
      )
    : undefined;
  if (classes)
    for (const slot of Object.keys(classes))
      Object.defineProperty(classes, slot, {
        enumerable: true,
        get() {
          classReads.push(slot);
          return slot + '-' + classReads.length;
        },
      });
  const theme = createTheme({
    ...input.theme,
    components: {
      mergeClassNameAndStyle: input.merge ?? false,
      MuiTypography: {
        defaultProps: input.defaults,
        styleOverrides: {
          root: (args) => {
            observation = observe(args);
            return {};
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
        Typography,
        { ...decode(input.props), ...(classes ? { classes } : {}), id: 'type-probe' },
        'Text',
      ),
    ),
  );
  const tag = markup.match(/<([a-z][a-z0-9]*)\b[^>]*\bid="type-probe"[^>]*>/)?.[0];
  assert(tag, 'Original Typography root is missing');
  const hash = tag
    .match(/class="([^"]*)"/)?.[1]
    .split(/\s+/)
    .find((token) => token.startsWith('css-'));
  const css = markup.match(new RegExp('\\.' + hash + '\\{([^}]+)\\}'))?.[1];
  assert(css, 'Original Typography CSS is missing');
  const declarations = Object.fromEntries(
    css
      .split(';')
      .filter(Boolean)
      .map((entry) => {
        const i = entry.indexOf(':');
        return [entry.slice(0, i), entry.slice(i + 1)];
      }),
  );
  return { input, observation, classReads, tag: tag.match(/^<([^\s>]+)/)[1], declarations };
});
const styledDefaults = [
  { name: 'absent style', defaults: { style: { opacity: 0.2 } } },
  {
    name: 'undefined style',
    defaults: { style: { opacity: 0.2 } },
    props: { style: '$undefined' },
  },
  { name: 'null style', defaults: { style: { opacity: 0.2 } }, props: { style: null } },
  { name: 'own style', defaults: { style: { opacity: 0.2 } }, props: { style: { opacity: 0.4 } } },
  {
    name: 'merged style',
    merge: true,
    defaults: { style: { opacity: 0.2, fontSize: 30 } },
    props: { style: { opacity: 0.4 } },
  },
  { name: 'absent sx', defaults: { sx: { opacity: 0.3 } } },
  { name: 'own sx', defaults: { sx: { opacity: 0.3 } }, props: { sx: { opacity: 0.5 } } },
  { name: 'nested wrappers', nested: true, defaults: { style: { opacity: 0.2 } } },
].map((input) => {
  let observation;
  const theme = createTheme({
    components: {
      mergeClassNameAndStyle: input.merge ?? false,
      MuiTypography: {
        defaultProps: input.defaults,
        styleOverrides: {
          root: (args) => {
            observation = observe(args);
            return {};
          },
        },
      },
    },
  });
  const Wrapped = input.nested
    ? styled(styled(Typography)({ opacity: 0.6 }))({ opacity: 0.8 })
    : styled(Typography)({ opacity: 0.8 });
  renderToStaticMarkup(
    React.createElement(
      ThemeProvider,
      { theme },
      React.createElement(Wrapped, { ...decode(input.props), id: 'type-probe' }, 'Text'),
    ),
  );
  return { input, observation };
});
const fixture = {
  references: [material.reference, system.reference, utils.reference],
  classes: canonical.typographyClasses,
  utilities: Object.fromEntries(
    [
      ...Object.keys(canonical.typographyClasses),
      'active',
      'checked',
      'completed',
      'disabled',
      'error',
      'expanded',
      'focused',
      'focusVisible',
      'open',
      'readOnly',
      'required',
      'selected',
      'custom',
      '__proto__',
      'toString',
      'constructor',
    ].map((key) => [key, canonical.getTypographyUtilityClass(key)]),
  ),
  cases,
  styledDefaults,
  adaptations: {
    paragraph: 'Not declared by original9.5; retained native extension.',
    literalColor:
      'Original color=#ff0000 has no matching source color variant; native literal colors are an existing additive extension.',
  },
};
const file = 'tests/fixtures/mui-typography-contract-9.5.0.json';
const output = await format(JSON.stringify(fixture), {
  ...(await resolveConfig(file)),
  filepath: file,
});
const record = await format(
  JSON.stringify({
    schemaVersion: 1,
    description:
      'Typography component source/type observations, separate from native text geometry.',
    references: fixture.references,
    fixture: {
      path: file,
      sha256: createHash('sha256').update(output).digest('hex'),
      originalCases: cases.length,
      styledDefaultCases: styledDefaults.length,
      utilityIdentifiers: Object.keys(fixture.utilities).length,
      renderer: 'Actual pinned ReactDOM SSR; no native layout or attached DOM refs.',
    },
    localFiles: [
      'packages/material/src/typography.tsx',
      'packages/material/src/typographyClasses.ts',
      'packages/material/src/Typography/index.ts',
    ],
    adaptations: fixture.adaptations,
  }),
  { ...(await resolveConfig('upstream/typography-contract.json')), parser: 'json' },
);
for (const [path, data] of [
  [file, output],
  ['upstream/typography-contract.json', record],
]) {
  if (process.argv.includes('--check'))
    assert.equal(await readFile(path, 'utf8'), data, 'Typography reference drift: ' + path);
  else await writeFile(path, data);
}
console.log(
  `${cases.length} Typography cases, ${styledDefaults.length} styled/default cases and ${Object.keys(fixture.utilities).length} utilities verified against pinned MIT originals.`,
);
