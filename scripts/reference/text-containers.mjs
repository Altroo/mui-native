import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'Paper/Paper.js',
  'Typography/Typography.js',
  'Box/Box.js',
  'Modal/Modal.js',
]);
const system = await loadReference('@mui/system', [
  'createBox/createBox.js',
  'Stack/createStack.js',
  'styleFunctionSx/styleFunctionSx.js',
]);
const { require, directory } = material;
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const mui = require(`${directory}/node_modules/@mui/material/index.js`);
const { ThemeProvider, createTheme } = require(
  `${directory}/node_modules/@mui/material/styles/index.js`,
);
const cases = [
  {
    name: 'nested relative font and unitless height',
    label: 'Nested ratio',
    tree: {
      type: 'Box',
      sx: { color: '#123456', fontSize: 40, lineHeight: 1.5, letterSpacing: '0.1em' },
      children: {
        type: 'Box',
        sx: { fontSize: '50%' },
        children: {
          type: 'Typography',
          props: { variant: 'inherit' },
          probe: true,
          children: 'Nested ratio',
        },
      },
    },
  },
  {
    name: 'literal native height corresponds to an absolute CSS length',
    label: 'Absolute height',
    tree: {
      type: 'Box',
      sx: { fontSize: 40, lineHeight: 2 },
      children: {
        type: 'Box',
        style: { fontSize: 20, lineHeight: '29px' },
        nativeStyle: { fontSize: 20, lineHeight: 29 },
        children: { type: 'Box', sx: { fontSize: 10 }, probe: true, children: 'Absolute height' },
      },
    },
  },
  {
    name: 'percentage height and em spacing inherit as computed lengths',
    label: 'Computed lengths',
    tree: {
      type: 'Box',
      sx: { fontSize: 40, lineHeight: '150%', letterSpacing: '0.1em' },
      children: { type: 'Box', sx: { fontSize: 20 }, probe: true, children: 'Computed lengths' },
    },
  },
  {
    name: 'bare text excludes Typography component defaults',
    label: 'Bare default',
    theme: {
      components: {
        MuiTypography: {
          defaultProps: { variant: 'h1' },
          styleOverrides: { root: { fontSize: 99, color: 'red' } },
        },
      },
    },
    tree: {
      type: 'Box',
      sx: { fontSize: 20, color: 'blue' },
      probe: true,
      children: 'Bare default',
    },
  },
  {
    name: 'Paper resets inherited color in dark mode',
    label: 'Dark paper',
    theme: { palette: { mode: 'dark' } },
    tree: {
      type: 'Box',
      sx: { color: 'red' },
      children: { type: 'Paper', probe: true, children: 'Dark paper' },
    },
  },
  {
    name: 'Paper caller palette override wins',
    label: 'Paper override',
    tree: {
      type: 'Box',
      sx: { color: 'red' },
      children: {
        type: 'Paper',
        sx: { color: 'primary.main' },
        probe: true,
        children: 'Paper override',
      },
    },
  },
  {
    name: 'explicit text establishes the relative font and absolute height',
    label: 'Explicit text',
    tree: {
      type: 'Box',
      sx: { fontSize: 40, lineHeight: 2, color: 'red' },
      children: {
        type: 'NativeText',
        style: { fontSize: 10, lineHeight: '12px', color: 'blue' },
        nativeStyle: { fontSize: 10, lineHeight: 12, color: 'blue' },
        children: {
          type: 'Typography',
          props: { variant: 'inherit' },
          sx: { fontSize: '50%' },
          probe: true,
          children: 'Explicit text',
        },
      },
    },
  },
  {
    name: 'root metrics exclude body1 variant font size',
    label: 'Root basis',
    theme: { typography: { body1: { fontSize: 30 } } },
    tree: {
      type: 'Box',
      sx: { lineHeight: 1.5, letterSpacing: '0.1em' },
      probe: true,
      children: 'Root basis',
    },
  },
  {
    name: 'native View boundary preserves inherited computed text',
    label: 'View boundary',
    tree: {
      type: 'Box',
      sx: { fontSize: 40, lineHeight: 2, color: '#456789' },
      children: {
        type: 'NativeView',
        style: { fontSize: 18, lineHeight: '36px' },
        nativeStyle: { fontSize: 18, lineHeight: 36 },
        children: {
          type: 'Typography',
          props: { variant: 'inherit' },
          sx: { fontSize: '50%' },
          probe: true,
          children: 'View boundary',
        },
      },
    },
  },
  {
    name: 'explicit Typography variant replaces inherited metrics',
    label: 'Body variant',
    tree: {
      type: 'Box',
      sx: { fontSize: 40, lineHeight: 2, color: '#456789' },
      children: {
        type: 'Typography',
        props: { variant: 'body2' },
        probe: true,
        children: 'Body variant',
      },
    },
  },
];
const properties = ['fontSize', 'lineHeight', 'letterSpacing', 'color'];
function build(node, id) {
  if (typeof node !== 'object' || node === null) return node;
  if (Array.isArray(node)) return node.map((item, i) => build(item, id + ':' + i));
  const Component =
    node.type === 'NativeText' ? 'span' : node.type === 'NativeView' ? 'div' : mui[node.type];
  return React.createElement(
    Component,
    { ...node.props, sx: node.sx, style: node.style, ...(node.probe ? { 'data-probe': id } : {}) },
    build(node.children, id),
  );
}
const markup = renderToStaticMarkup(
  React.createElement(
    React.Fragment,
    null,
    ...cases.map((input, i) => {
      const theme = createTheme(input.theme ?? {});
      return React.createElement(
        'section',
        {
          key: i,
          style: {
            fontFamily: 'system-ui',
            fontSize: 16,
            lineHeight: 'normal',
            letterSpacing: 'normal',
            color: theme.palette.text.primary,
          },
        },
        React.createElement(ThemeProvider, { theme }, build(input.tree, String(i))),
      );
    }),
  ),
);
const html =
  '<!doctype html><meta charset="utf-8"><title>Pinned MUI text reference</title>' + markup;
const identity = {
  references: [material.reference, system.reference],
  cases,
  properties,
  htmlSha256: createHash('sha256').update(html).digest('hex'),
};
const fixture = 'tests/fixtures/mui-text-containers-9.5.0.json';
if (process.argv.includes('--check')) {
  const actual = JSON.parse(await readFile(fixture, 'utf8'));
  for (const [key, value] of Object.entries(identity))
    if (JSON.stringify(actual[key]) !== JSON.stringify(value))
      throw new Error(`Text reference drift: ${key}`);
  if (
    actual.computed.length !== cases.length ||
    actual.computed.some((item, index) => item.id !== String(index))
  )
    throw new Error('Missing or unordered browser observations');
  console.log(
    `Pinned original text HTML/source verified for ${cases.length} browser-observed cases.`,
  );
} else {
  await mkdir('.cache', { recursive: true });
  await writeFile('.cache/text-reference.html', html);
  await writeFile('.cache/text-reference-identity.json', JSON.stringify(identity, null, 2) + '\n');
  console.log(
    'Render .cache/text-reference.html in a browser; capture each [data-probe] computed fontSize/lineHeight/letterSpacing/color and renderer identity.',
  );
}
