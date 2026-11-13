// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';

// MUI attachTheme mutates the interpolation props. Its production renderer is
// required for explicit themes because development React freezes JSX props.
if (process.env.NODE_ENV !== 'production') {
  process.stdout.write(
    execFileSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
      env: { ...process.env, NODE_ENV: 'production' },
    }),
  );
  process.exit(0);
}

const { reference, require, directory } = await loadReference('@mui/material', [
  'DialogTitle/index.js',
  'DialogTitle/index.d.ts',
  'DialogTitle/DialogTitle.js',
  'DialogTitle/DialogTitle.d.ts',
  'DialogTitle/dialogTitleClasses.js',
  'DialogTitle/dialogTitleClasses.d.ts',
  'Dialog/DialogContext.js',
  'Dialog/Dialog.js',
  'Typography/Typography.js',
  'styles/rootShouldForwardProp.js',
]);
const { reference: styledReference } = await loadReference('@mui/system', [
  'createStyled/createStyled.js',
]);
const { reference: utilitiesReference } = await loadReference('@mui/utils', [
  'isObjectEmpty/isObjectEmpty.js',
  'generateUtilityClass/generateUtilityClass.js',
  'composeClasses/composeClasses.js',
]);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { DialogTitle, ThemeProvider, createTheme, styled } = require('@mui/material');
const Context = require(directory + '/node_modules/@mui/material/Dialog/DialogContext.js').default;
const { unstable_ClassNameGenerator: generator } = require('@mui/material/className');
const { dialogTitleClasses, getDialogTitleUtilityClass } = require('@mui/material/DialogTitle');
const decode = (props = {}) =>
  Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, value === '$undefined' ? undefined : value]),
  );
const inputs = [
  { name: 'default' },
  { name: 'body1', props: { variant: 'body1' } },
  { name: 'undefined-variant', props: { variant: '$undefined' } },
  { name: 'undefined-component', props: { component: '$undefined' } },
  { name: 'own-id', props: { id: 'authored' } },
  { name: 'empty-id', props: { id: '' } },
  { name: 'context-id', context: { titleId: 'context-title' } },
  {
    name: 'authored-over-context',
    props: { id: 'authored' },
    context: { titleId: 'context-title' },
  },
  { name: 'empty-over-context', props: { id: '' }, context: { titleId: 'context-title' } },
  { name: 'context-undefined', context: { titleId: '$undefined' } },
  { name: 'context-null', context: { titleId: null } },
  { name: 'classes', props: { classes: { root: 'title-own' }, className: 'authored' } },
  { name: 'default-caption', defaults: { variant: 'caption' } },
  {
    name: 'undefined-fills-caption',
    defaults: { variant: 'caption' },
    props: { variant: '$undefined' },
  },
  { name: 'typography-default', typographyDefaults: { variant: 'body2' } },
  {
    name: 'undefined-uses-typography-default',
    typographyDefaults: { variant: 'body2' },
    props: { variant: '$undefined' },
  },
  { name: 'configured', configured: true },
  ...['complete', 'scoped', 'inherited', 'empty', 'null', 'undefined'].map((localTheme) => ({
    name: 'local-theme-' + localTheme,
    localTheme,
  })),
  { name: 'styled-absent', styled: true },
  { name: 'styled-undefined', styled: true, props: { style: '$undefined' } },
  { name: 'styled-authored', styled: true, props: { style: { paddingBottom: 29 } } },
  {
    name: 'styled-merged-default',
    styled: true,
    defaults: { style: { paddingLeft: 18 } },
    props: { style: { paddingBottom: 29 } },
    mergeStyle: true,
  },
];
const observations = inputs.map((input) => {
  const trace = [];
  const makeTheme = (titlePadding, primary) =>
    createTheme({
      ...(primary
        ? { palette: { primary: { main: primary } }, typography: { h6: { fontSize: 38 } } }
        : {}),
      components: {
        ...(input.mergeStyle ? { mergeClassNameAndStyle: true } : {}),
        MuiDialogTitle: {
          defaultProps: input.defaults,
          styleOverrides: {
            root: (args) => {
              trace.push({
                stage: 'title',
                ownerHasVariant: Object.hasOwn(args.ownerState, 'variant'),
                ownerVariant: args.ownerState.variant ?? null,
                id: args.id ?? null,
                hasClasses: Boolean(args.classes),
                themePrimary: args.theme.palette.primary.main,
                hasStyle: Object.hasOwn(args, 'style'),
                style: args.style ?? null,
                ownerHasStyle: Object.hasOwn(args.ownerState, 'style'),
                ownerStyle: args.ownerState.style ?? null,
              });
              return { paddingTop: titlePadding };
            },
          },
        },
        MuiTypography: {
          defaultProps: input.typographyDefaults,
          styleOverrides: {
            root: (args) => {
              trace.push({
                stage: 'typography',
                variant: args.ownerState.variant,
                component: args.ownerState.component ?? null,
                hasClasses: Boolean(args.classes),
                themePrimary: args.theme.palette.primary.main,
                hasStyle: Object.hasOwn(args, 'style'),
                style: args.style ?? null,
                ownerHasStyle: Object.hasOwn(args.ownerState, 'style'),
                ownerStyle: args.ownerState.style ?? null,
              });
              return { paddingTop: 7 };
            },
          },
        },
      },
    });
  const theme = makeTheme(13);
  const props = decode(input.props);
  if (input.localTheme) {
    const local = makeTheme(31, '#c43a18');
    props.theme =
      input.localTheme === 'inherited'
        ? Object.create(local)
        : input.localTheme === 'complete'
          ? local
          : input.localTheme === 'scoped'
            ? { $$material: local }
            : input.localTheme === 'empty'
              ? {}
              : input.localTheme === 'null'
                ? null
                : undefined;
  }
  const Component = input.styled ? styled(DialogTitle)({ opacity: 0.4 }) : DialogTitle;
  if (input.configured) generator.configure((name) => 'Consumer' + name);
  try {
    let content = React.createElement(Component, props, 'Title');
    if (input.context)
      content = React.createElement(Context.Provider, { value: decode(input.context) }, content);
    const markup = renderToStaticMarkup(React.createElement(ThemeProvider, { theme }, content));
    const tag = markup.match(/<(h[1-6]|p|span|div)\b[^>]*>/g)?.at(-1);
    assert(tag);
    const classes = tag
      .match(/class="([^"]*)"/)[1]
      .split(/\s+/)
      .filter((name) => !name.startsWith('css-'))
      .join(' ');
    // These finite plain sheets have no conditional padding selectors. Include
    // shorthand and the final authored HTML style rather than reading only longhands.
    const padding = { top: undefined, left: undefined };
    for (const match of markup.matchAll(/\b(padding(?:-top|-left)?):([^;"}]+)/g)) {
      const values = match[2].trim().split(/\s+/).map(parseFloat);
      if (match[1] === 'padding') {
        padding.top = values[0];
        padding.left = values[1] ?? values[0];
      } else if (match[1] === 'padding-top') padding.top = values[0];
      else padding.left = values[0];
    }
    return {
      input,
      tag: tag.match(/^<(\w+)/)[1],
      id: tag.match(/ id="([^"]*)"/)?.[1] ?? null,
      classes,
      trace,
      paddingTop: padding.top,
      paddingLeft: padding.left,
    };
  } finally {
    generator.reset();
  }
});
const utilities = Object.fromEntries(
  ['root', 'disabled', 'custom', '__proto__', 'toString', 'constructor'].map((slot) => [
    slot,
    getDialogTitleUtilityClass(slot),
  ]),
);
const compositions = [
  'scoped-getter',
  'inherited-theme',
  'empty',
  'null',
  'mutated-theme',
  'mutated-null',
  'mutated-missing',
].map((input) => {
  const trace = [];
  const local = createTheme({ palette: { primary: { main: '#c43a18' } } });
  const next = createTheme({ palette: { primary: { main: '#6a1b9a' } } });
  const envelope = {
    get $$material() {
      trace.push('scope');
      return local;
    },
  };
  const theme =
    input === 'inherited-theme'
      ? Object.create(local)
      : input === 'empty'
        ? {}
        : input === 'null'
          ? null
          : envelope;
  const Inner = styled('div')((props) => {
    trace.push('inner:' + props.theme.palette.primary.main);
    if (input === 'mutated-theme')
      props.theme = {
        get $$material() {
          trace.push('next-scope');
          return next;
        },
      };
    if (input === 'mutated-null') props.theme = null;
    if (input === 'mutated-missing') delete props.theme;
    return { fontSize: 28 };
  });
  const Outer = styled(Inner)((props) => {
    trace.push('outer:' + props.theme.palette.primary.main);
    return { lineHeight: '1.5em' };
  });
  renderToStaticMarkup(
    React.createElement(
      ThemeProvider,
      { theme: createTheme({ palette: { primary: { main: '#2e7d32' } } }) },
      React.createElement(Outer, { theme }, 'Styled title'),
    ),
  );
  return { input, trace };
});
const fixture = {
  reference,
  styledReference,
  utilitiesReference,
  classes: dialogTitleClasses,
  utilities,
  observations,
  compositions,
};
const provenance = {
  schemaVersion: 1,
  description:
    'Pinned DialogTitle defaults, Typography composition, class filtering, title-ID precedence and source style order.',
  references: [reference, styledReference, utilitiesReference],
  fixture: {
    path: 'tests/fixtures/mui-dialog-title-9.5.0.json',
    producer: 'scripts/reference/dialog-title.mjs',
  },
  adaptations: [
    'Render native Text with header semantics for the default h2 alias; refs and custom roots use native Text contracts.',
    'Use native zero flex in place of browser 0 0 auto so later native flex shorthand can replace the default.',
    'Share a stable title ID inside Dialog paper and forward its label relationship; physical screen-reader announcements need independent validation.',
  ],
};
for (const [path, value] of [
  ['tests/fixtures/mui-dialog-title-9.5.0.json', fixture],
  ['upstream/dialog-title.json', provenance],
]) {
  const text = await format(JSON.stringify(value), {
    ...(await resolveConfig(path)),
    filepath: path,
  });
  if (process.argv.includes('--check'))
    assert.equal(await readFile(path, 'utf8'), text, path + ' is stale.');
  else await writeFile(path, text);
}
console.log('Original DialogTitle observations verified: ' + observations.length + '.');
