// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';

const { reference, require, directory } = await loadReference('@mui/material', [
  'CircularProgress/index.js',
  'CircularProgress/index.d.ts',
  'CircularProgress/CircularProgress.js',
  'CircularProgress/CircularProgress.d.ts',
  'CircularProgress/circularProgressClasses.js',
  'CircularProgress/circularProgressClasses.d.ts',
  'transitions/utils.js',
  'utils/createSimplePaletteValueFilter.js',
  'utils/memoTheme.js',
  'styles/reducedMotion.js',
]);
const { reference: utilitiesReference } = await loadReference('@mui/utils', [
  'ClassNameGenerator/ClassNameGenerator.js',
  'composeClasses/composeClasses.js',
  'generateUtilityClass/generateUtilityClass.js',
  'isObjectEmpty/isObjectEmpty.js',
]);
const { reference: systemReference } = await loadReference('@mui/system', [
  'memoTheme.js',
  'preprocessStyles.js',
  'createStyled/createStyled.js',
]);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = (file) => require(`${directory}/node_modules/@mui/material/${file}`);
const {
  default: Progress,
  circularProgressClasses,
  getCircularProgressUtilityClass,
} = load('CircularProgress');
const { resetWarningFlags } = load('CircularProgress/CircularProgress.js');
const { createTheme, ThemeProvider } = load('styles');
const { unstable_ClassNameGenerator: generator } = load('className');

const inputs = [
  { name: 'owner-mutation', mutateRoot: true, props: { enableTrackSlot: true } },
  {
    name: 'authored-metadata',
    props: { id: 'source-progress', classes: { root: 'authored-root' }, sx: { opacity: 0.7 } },
  },
  { name: 'default' },
  { name: 'determinate-zero', props: { variant: 'determinate' } },
  { name: 'determinate-quarter', props: { variant: 'determinate', value: 25 } },
  { name: 'determinate-full', props: { variant: 'determinate', value: 100 } },
  { name: 'negative-range', props: { variant: 'determinate', min: -10, max: 10, value: 3 } },
  { name: 'minimum-default-value', props: { variant: 'determinate', min: 42 } },
  { name: 'fractional-range', props: { variant: 'determinate', min: 0.1, max: 0.3, value: 0.2 } },
  { name: 'invalid-empty-range', props: { variant: 'determinate', min: 10, max: 10, value: 10 } },
  {
    name: 'invalid-reversed-range',
    props: { variant: 'determinate', min: 10, max: -10, value: 3 },
  },
  { name: 'invalid-low-value', props: { variant: 'determinate', value: -5 } },
  { name: 'invalid-high-value', props: { variant: 'determinate', value: 105 } },
  { name: 'indeterminate-range-warning', props: { min: 10, max: 20 } },
  { name: 'track', props: { enableTrackSlot: true } },
  {
    name: 'determinate-track',
    props: { enableTrackSlot: true, variant: 'determinate', value: 70 },
  },
  { name: 'disable-shrink', props: { disableShrink: true } },
  { name: 'determinate-disable-shrink', props: { variant: 'determinate', disableShrink: true } },
  { name: 'zero-size', props: { size: 0 } },
  { name: 'rem-size', props: { size: '2rem' } },
  { name: 'percentage-size', props: { size: '50%' } },
  { name: 'fractional-size', props: { size: 31.5 } },
  { name: 'zero-thickness', props: { thickness: 0, variant: 'determinate', value: 37 } },
  {
    name: 'thick-track',
    props: { thickness: 8, enableTrackSlot: true, variant: 'determinate', value: 37 },
  },
  { name: 'inherit-color', props: { color: 'inherit' } },
  { name: 'secondary-color', props: { color: 'secondary' } },
  { name: 'custom-color', props: { color: 'brand' } },
  { name: 'custom-variant', props: { variant: 'paused' } },
  {
    name: 'authored-classes',
    props: {
      className: 'authored',
      classes: {
        root: 'root-extra',
        svg: 'svg-extra',
        track: 'track-extra',
        circle: 'circle-extra',
        circleDisableShrink: 'shrink-extra',
      },
      enableTrackSlot: true,
      disableShrink: true,
    },
  },
  {
    name: 'authored-style',
    props: {
      variant: 'determinate',
      value: 25,
      style: { width: 57, height: 29, transform: 'rotate(15deg)' },
    },
  },
  {
    name: 'authored-aria',
    props: {
      variant: 'determinate',
      value: 25,
      role: 'status',
      'aria-valuenow': 12,
      'aria-valuemin': 5,
      'aria-valuemax': 50,
      'aria-label': 'Loading records',
    },
  },
  { name: 'authored-children', props: { children: 'Ignored child' } },
  {
    name: 'theme-defaults',
    defaults: {
      variant: 'determinate',
      min: 20,
      max: 60,
      size: 52,
      value: 40,
      enableTrackSlot: true,
    },
  },
  {
    name: 'configured-classes',
    configured: true,
    props: { enableTrackSlot: true, color: 'warning' },
  },
];
const decode = (text) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const attributes = (text) =>
  Object.fromEntries([...text.matchAll(/([:\w-]+)="([^"]*)"/g)].map((m) => [m[1], decode(m[2])]));
const clean = (attrs) => ({
  ...attrs,
  class: attrs.class
    ?.split(/\s+/)
    .filter((name) => !name.startsWith('css-'))
    .join(' '),
});
const observations = [];
for (const input of inputs) {
  generator.reset();
  resetWarningFlags();
  if (input.configured) generator.configure((name) => 'Configured' + name);
  const warnings = [],
    trace = [];
  const originalWarn = console.warn,
    originalError = console.error;
  console.warn = (...args) => warnings.push({ level: 'warn', args: args.map(String) });
  console.error = (...args) => warnings.push({ level: 'error', args: args.map(String) });
  let markup;
  try {
    const override = (slot) => (args) => {
      const owner = args.ownerState;
      trace.push({
        slot,
        ownerKeys: Object.keys(owner),
        color: owner.color,
        variant: owner.variant,
        disableShrink: owner.disableShrink,
        enableTrackSlot: owner.enableTrackSlot,
        size: owner.size,
        thickness: owner.thickness,
        value: owner.value,
        style: args.style ?? null,
        genuine: {
          className: args.className ?? null,
          classMap: args.classes ?? null,
          hasSx: Object.hasOwn(args, 'sx'),
          id: args.id ?? null,
          hasStyle: Object.hasOwn(args, 'style'),
          viewBox: args.viewBox ?? null,
          cx: args.cx ?? null,
          cy: args.cy ?? null,
          r: args.r ?? null,
          fill: args.fill ?? null,
          strokeWidth: args.strokeWidth ?? null,
          hidden: args['aria-hidden'] ?? null,
        },
      });
      if (input.mutateRoot && slot === 'root') owner.thickness = 8;
      return {};
    };
    const theme = createTheme({
      palette: { brand: { main: '#156b5f' } },
      components: {
        MuiCircularProgress: {
          defaultProps: input.defaults,
          styleOverrides: Object.fromEntries(
            [
              'root',
              'determinate',
              'indeterminate',
              'colorPrimary',
              'colorSecondary',
              'svg',
              'track',
              'circle',
              'circleDisableShrink',
            ].map((slot) => [slot, override(slot)]),
          ),
        },
      },
    });
    markup = renderToStaticMarkup(
      React.createElement(ThemeProvider, { theme }, React.createElement(Progress, input.props)),
    );
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
    generator.reset();
  }
  const root = markup.match(/<span\b([^>]*)>/);
  const svg = markup.match(/<svg\b([^>]*)>/);
  assert(root && svg, input.name + ' did not render the expected source elements.');
  observations.push({
    input,
    root: clean(attributes(root[1])),
    svg: clean(attributes(svg[1])),
    circles: [...markup.matchAll(/<circle\b([^>]*)>/g)].map((m) => clean(attributes(m[1]))),
    containsAuthoredChild: markup.includes('Ignored child'),
    // Adjacent callbacks share their actual input record. Keep every callback's
    // order and count without duplicating the same owner/style dozens of times.
    trace: trace.reduce((groups, { slot, ...context }) => {
      const previous = groups.at(-1);
      if (previous && JSON.stringify(previous.context) === JSON.stringify(context)) {
        previous.slots.push(slot);
      } else groups.push({ context, slots: [slot] });
      return groups;
    }, []),
    warnings,
  });
}
const utilities = Object.fromEntries(
  [
    'root',
    'track',
    'circle',
    'circleDisableShrink',
    'disabled',
    'constructor',
    'toString',
    '__proto__',
    '',
  ].map((slot) => [slot, getCircularProgressUtilityClass(slot)]),
);
const fixture = {
  schemaVersion: 1,
  reference,
  utilitiesReference,
  systemReference,
  classes: circularProgressClasses,
  utilities,
  observations,
};
const provenance = {
  schemaVersion: 1,
  description:
    'Pinned CircularProgress defaults, four styled slots, range geometry, class ownership, root precedence and diagnostics.',
  references: [reference, utilitiesReference, systemReference],
  fixture: {
    path: 'tests/fixtures/mui-circular-progress-9.5.0.json',
    producer: 'scripts/reference/circular-progress.mjs',
  },
  adaptations: [
    'Render a native View progress root and native SVG circles; native refs and attributes replace browser element contracts.',
    'Use native Animated rotation, dash growth and supported transitions, retaining source geometry.',
    'Bind correctly localized relative progress text on iOS to bypass the pinned React Native percentage calculation; authored text takes precedence and Android keeps its numeric range.',
    'Native font, accessibility, motion and arbitrary CSS behavior require separate verification; reference observations do not certify native compatibility.',
  ],
};
for (const [path, value] of [
  ['tests/fixtures/mui-circular-progress-9.5.0.json', fixture],
  ['upstream/circular-progress.json', provenance],
]) {
  const text = await format(JSON.stringify(value), {
    ...(await resolveConfig(path)),
    filepath: path,
  });
  if (process.argv.includes('--check'))
    assert.equal(await readFile(path, 'utf8'), text, path + ' is stale.');
  else await writeFile(path, text);
}
console.log('Original CircularProgress observations verified: ' + observations.length + '.');
