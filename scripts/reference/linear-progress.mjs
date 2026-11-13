// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';

const { reference, require, directory } = await loadReference('@mui/material', [
  'LinearProgress/index.js',
  'LinearProgress/index.d.ts',
  'LinearProgress/LinearProgress.js',
  'LinearProgress/LinearProgress.d.ts',
  'LinearProgress/linearProgressClasses.js',
  'LinearProgress/linearProgressClasses.d.ts',
  'transitions/utils.js',
  'styles/reducedMotion.js',
  'utils/memoTheme.js',
  'utils/createSimplePaletteValueFilter.js',
]);
const { reference: utilitiesReference } = await loadReference('@mui/utils', [
  'composeClasses/composeClasses.js',
  'generateUtilityClass/generateUtilityClass.js',
]);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = (path) => require(directory + '/node_modules/@mui/material/' + path);
const {
  default: Progress,
  linearProgressClasses,
  getLinearProgressUtilityClass,
} = load('LinearProgress');
const { resetWarningFlags } = load('LinearProgress/LinearProgress.js');
const { createTheme, ThemeProvider } = load('styles');
const RtlProvider = require('@mui/system/RtlProvider').default;
const { unstable_ClassNameGenerator: generator } = load('className');
const inputs = [
  {
    name: 'rtl-context-on',
    rtlContext: true,
    props: { variant: 'buffer', value: 25, valueBuffer: 65 },
  },
  {
    name: 'rtl-context-off',
    rtl: true,
    rtlContext: false,
    props: { variant: 'buffer', value: 25, valueBuffer: 65 },
  },
  {
    name: 'light-receiver',
    receiver: true,
    props: { variant: 'buffer', value: 25, valueBuffer: 65 },
  },
  {
    name: 'dark-receiver',
    receiver: true,
    dark: true,
    props: { variant: 'buffer', value: 25, valueBuffer: 65 },
  },
  { name: 'default' },
  ...['determinate', 'buffer', 'query', 'indeterminate'].map((variant) => ({
    name: variant,
    props: { variant, value: 25, valueBuffer: 65 },
  })),
  {
    name: 'custom-range',
    props: { variant: 'buffer', min: 20, max: 80, value: 35, valueBuffer: 65 },
  },
  { name: 'rtl', rtl: true, props: { variant: 'buffer', value: 25, valueBuffer: 65 } },
  ...['primary', 'secondary', 'error', 'info', 'success', 'warning', 'inherit', 'brand', ''].map(
    (color) => ({
      name: 'color-' + color,
      props: { variant: 'buffer', value: 25, valueBuffer: 65, color },
    }),
  ),
  { name: 'custom-variant', props: { variant: 'paused' } },
  { name: 'missing-value', props: { variant: 'determinate' } },
  { name: 'missing-buffer', props: { variant: 'buffer', value: 25 } },
  {
    name: 'invalid-range',
    props: { variant: 'buffer', min: 50, max: 20, value: 30, valueBuffer: 10 },
  },
  { name: 'out-of-range', props: { variant: 'buffer', value: 125, valueBuffer: 110 } },
  { name: 'indeterminate-range', props: { min: 20, max: 80 } },
  { name: 'query-range', props: { variant: 'query', min: 20, max: 80 } },
  {
    name: 'defaults',
    defaults: { variant: 'buffer', value: 25, valueBuffer: 65, color: 'secondary' },
  },
  {
    name: 'undefined-defaults',
    defaults: { variant: 'buffer', value: 25, valueBuffer: 65 },
    props: { variant: '$undefined', value: '$undefined' },
  },
  {
    name: 'aria-overrides',
    props: {
      variant: 'determinate',
      value: 25,
      'aria-valuenow': 30,
      'aria-valuemin': 20,
      'aria-valuemax': 80,
      'aria-valuetext': 'Thirty',
      role: 'meter',
      id: 'progress',
    },
  },
  {
    name: 'authored-classes',
    props: {
      variant: 'buffer',
      value: 25,
      valueBuffer: 65,
      classes: {
        root: 'own-root',
        bar: 'own-bar',
        bar1: 'own-first',
        bar2: 'own-second',
        dashed: 'own-dashed',
        buffer: 'own-buffer',
        colorPrimary: 'own-color',
      },
      className: 'authored',
    },
  },
  { name: 'authored-children', props: { children: 'Ignored child' } },
  {
    name: 'configured',
    configured: true,
    props: { variant: 'buffer', value: 25, valueBuffer: 65 },
  },
  { name: 'dark', dark: true, props: { variant: 'buffer', value: 25, valueBuffer: 65 } },
  { name: 'reduced', reduced: true, props: { variant: 'query' } },
];
function shape(value) {
  return React.Children.toArray(value).map((child) =>
    React.isValidElement(child)
      ? {
          className: child.props.className ?? null,
          style: child.props.style ?? null,
          children: shape(child.props.children),
        }
      : { kind: typeof child, value: child },
  );
}
function attrs(text) {
  return Object.fromEntries(
    [...text.matchAll(/([:\w-]+)="([^"]*)"/g)]
      .map((m) => [m[1], m[2].replaceAll('&quot;', '"')])
      .map(([k, v]) => [
        k,
        k === 'class'
          ? v
              .split(/\s+/)
              .filter((x) => !x.startsWith('css-'))
              .join(' ')
          : v,
      ]),
  );
}
const observations = [];
for (const input of inputs) {
  generator.reset();
  resetWarningFlags();
  if (input.configured) generator.configure((name) => 'Configured' + name);
  const trace = [],
    warnings = [];
  const warn = console.warn,
    error = console.error;
  console.warn = (...args) => warnings.push({ level: 'warn', args: args.map(String) });
  console.error = (...args) => warnings.push({ level: 'error', args: args.map(String) });
  let markup;
  try {
    const theme = createTheme({
      direction: input.rtl ? 'rtl' : 'ltr',
      motion: { reducedMotion: input.reduced ? 'always' : 'never' },
      palette: { mode: input.dark ? 'dark' : 'light', brand: { main: '#156b5f' } },
      components: {
        MuiLinearProgress: {
          defaultProps: input.defaults,
          styleOverrides: Object.fromEntries(
            [
              'root',
              'colorPrimary',
              'colorSecondary',
              'determinate',
              'indeterminate',
              'buffer',
              'query',
              'dashed',
              'bar',
              'bar1',
              'bar2',
            ].map((slot) => [
              slot,
              (args) => {
                trace.push({
                  slot,
                  ownerKeys: Object.keys(args.ownerState),
                  color: args.ownerState.color,
                  variant: args.ownerState.variant,
                  style: args.style ?? null,
                  className: args.className ?? null,
                  children: shape(args.children),
                  ownerChildren: args.ownerState.children ?? null,
                });
                return {};
              },
            ]),
          ),
        },
      },
    });
    if (input.receiver) {
      const method = input.dark ? 'darken' : 'lighten';
      const original = theme[method];
      theme.__receiver = 'linear-progress-receiver';
      theme[method] = function (...args) {
        assert.equal(
          this?.__receiver,
          'linear-progress-receiver',
          'Shade methods retain their theme receiver',
        );
        return Reflect.apply(original, this, args);
      };
    }
    let content = React.createElement(
      Progress,
      Object.fromEntries(
        Object.entries(input.props ?? {}).map(([k, v]) => [k, v === '$undefined' ? undefined : v]),
      ),
    );
    if (input.rtlContext !== undefined)
      content = React.createElement(RtlProvider, { value: input.rtlContext }, content);
    markup = renderToStaticMarkup(React.createElement(ThemeProvider, { theme }, content));
    const colors = {};
    for (const color of ['primary', 'secondary', 'error', 'info', 'success', 'warning', 'brand'])
      colors[color] = input.dark
        ? theme.darken(theme.palette[color].main, 0.5)
        : theme.lighten(theme.palette[color].main, 0.62);
    observations.push({
      input,
      elements: [...markup.matchAll(/<span\b([^>]*)>/g)].map((m) => attrs(m[1])),
      trace: trace.reduce((groups, { slot, ...context }) => {
        const last = groups.at(-1);
        if (last && JSON.stringify(last.context) === JSON.stringify(context)) last.slots.push(slot);
        else groups.push({ context, slots: [slot] });
        return groups;
      }, []),
      warnings,
      shades: colors,
      containsAuthoredChild: markup.includes('Ignored child'),
    });
  } finally {
    console.warn = warn;
    console.error = error;
    generator.reset();
  }
}
const fixture = {
  schemaVersion: 1,
  reference,
  utilitiesReference,
  classes: linearProgressClasses,
  utilities: Object.fromEntries(
    ['root', 'bar', 'dashed', 'disabled', 'constructor', 'toString', '__proto__', ''].map(
      (slot) => [slot, getLinearProgressUtilityClass(slot)],
    ),
  ),
  observations,
};
const provenance = {
  schemaVersion: 1,
  description:
    'Pinned LinearProgress four variants, ranges, RTL geometry, eleven class keys, genuine styled children, diagnostic order and source palette shades.',
  references: [reference, utilitiesReference],
  fixture: {
    path: 'tests/fixtures/mui-linear-progress-9.5.0.json',
    producer: 'scripts/reference/linear-progress.mjs',
  },
  adaptations: [
    'Render real native View bars with native-driver transforms instead of browser positioned spans.',
    'Render the buffer radial background with an SVG pattern and native-driver translation/opacity.',
    'Keep impossible numeric accessibility ranges out of Android RangeInfo and supply correct localized relative percentages on iOS.',
  ],
};
for (const [path, value] of [
  ['tests/fixtures/mui-linear-progress-9.5.0.json', fixture],
  ['upstream/linear-progress.json', provenance],
]) {
  const text = await format(JSON.stringify(value), {
    ...(await resolveConfig(path)),
    filepath: path,
  });
  if (process.argv.includes('--check'))
    assert.equal(await readFile(path, 'utf8'), text, path + ' is stale.');
  else await writeFile(path, text);
}
console.log('Original LinearProgress observations verified: ' + observations.length + '.');
