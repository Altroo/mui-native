// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';

const references = await Promise.all(
  ['@mui/system', '@mui/material'].map((name) =>
    loadReference(name, [
      'DefaultPropsProvider/index.js',
      'DefaultPropsProvider/index.d.ts',
      'DefaultPropsProvider/DefaultPropsProvider.js',
      'DefaultPropsProvider/DefaultPropsProvider.d.ts',
      ...(name === '@mui/system'
        ? ['useThemeProps/getThemeProps.js', 'useThemeProps/getThemeProps.d.ts']
        : []),
      ...(name === '@mui/material' ? ['styles/props.d.ts'] : []),
    ]),
  ),
);
const utils = await loadReference('@mui/utils', ['resolveProps/resolveProps.js']);
const React = references[0].require('react');
const { renderToStaticMarkup } = references[0].require('react-dom/server');
const modules = references.map((reference) =>
  reference.require(
    `${reference.directory}/node_modules/${reference.reference.name}/DefaultPropsProvider`,
  ),
);
const resolve = utils.require(`${utils.directory}/node_modules/@mui/utils/resolveProps`).default;
const getThemeProps = references[0].require(
  `${references[0].directory}/node_modules/@mui/system/useThemeProps/getThemeProps.js`,
).default;
const cases = [
  ...[null, false, 0, ''].map((defaultProps) => ({
    name: `raw fallback with defaultProps ${JSON.stringify(defaultProps)}`,
    value: { Probe: { defaultProps, fallback: 'raw' } },
    props: {},
  })),
  {
    name: 'wrapped defaults',
    value: { Probe: { defaultProps: { fallback: 'wrapped' } } },
    props: {},
  },
  { name: 'empty wrapped defaults clone', value: { Probe: { defaultProps: {} } }, props: {} },
  {
    name: 'empty variants block raw defaults',
    value: { Probe: { variants: [], fallback: 'blocked' } },
    props: {},
  },
  {
    name: 'empty overrides block raw defaults',
    value: { Probe: { styleOverrides: {}, fallback: 'blocked' } },
    props: {},
  },
  {
    name: 'falsy variants permit raw defaults',
    value: { Probe: { variants: false, fallback: 'raw' } },
    props: {},
  },
  { name: 'empty context preserves identity', value: {}, props: { retained: true } },
  { name: 'null entry preserves identity', value: { Probe: null }, props: { retained: true } },
  {
    name: 'plain object style merging',
    value: {
      mergeClassNameAndStyle: true,
      Probe: { style: { color: 'red', padding: 2 }, className: 'theme' },
    },
    props: { style: { padding: 4 }, className: 'app' },
  },
  {
    name: 'ordinary values replace',
    value: { Probe: { nested: { theme: true }, sx: { p: 2 } } },
    props: { nested: { app: true }, sx: { m: 1 } },
  },
  {
    name: 'explicit null and false win',
    value: { Probe: { label: 'theme', disabled: true, count: 3 } },
    props: { label: null, disabled: false, count: 0 },
  },
  {
    name: 'slot string enumerable values',
    value: { Probe: { slots: 'ab' } },
    props: { slots: { root: 'Root' } },
  },
  {
    name: 'inherited prototype property stays inherited',
    value: { Probe: { toString: 'fallback' } },
    props: {},
  },
];
const providers = modules.map((module) =>
  cases.map((input) => {
    let output;
    function Probe() {
      output = module.useDefaultProps({ props: input.props, name: 'Probe' });
      return null;
    }
    renderToStaticMarkup(
      React.createElement(module.default, { value: input.value }, React.createElement(Probe)),
    );
    return { output, sameProps: output === input.props, styleArray: Array.isArray(output.style) };
  }),
);
const primitives = [null, 7, 'abc', false].map((props) => {
  let output;
  function Probe() {
    output = modules[0].useDefaultProps({ props, name: 'Probe' });
    return null;
  }
  renderToStaticMarkup(
    React.createElement(
      modules[0].default,
      { value: { Probe: { value: 'default' } } },
      React.createElement(Probe),
    ),
  );
  return { props, output };
});
const enumerable = () => {
  const trace = [];
  const props = {
    get value() {
      trace.push('get supplied');
      return undefined;
    },
  };
  const output = resolve({ value: 'default' }, props);
  return { output, trace };
};
const className = Object.create({ inherited: true });
className.own = true;
const functionConfig = Object.assign(function configuration() {}, { value: 'function' });
let functionOutput;
function FunctionProbe() {
  functionOutput = modules[0].useDefaultProps({ props: {}, name: 'Probe' });
  return null;
}
renderToStaticMarkup(
  React.createElement(
    modules[0].default,
    { value: { Probe: functionConfig } },
    React.createElement(FunctionProbe),
  ),
);
const data = {
  references: [...references.map((reference) => reference.reference), utils.reference],
  cases,
  providers,
  primitives,
  getter: enumerable(),
  inheritedClassName: resolve({ className: 'theme' }, { className }, true).className,
  functionOutput,
  distinctProviders: modules[0].default !== modules[1].default,
  distinctHooks: modules[0].useDefaultProps !== modules[1].useDefaultProps,
  lookup: (() => {
    const trace = [];
    const config = {
      get defaultProps() {
        trace.push('defaultProps');
        return { value: 'default' };
      },
    };
    const value = {
      get Probe() {
        trace.push('entry');
        return config;
      },
    };
    let output;
    function Probe() {
      output = modules[0].useDefaultProps({ props: {}, name: 'Probe' });
      return null;
    }
    renderToStaticMarkup(
      React.createElement(modules[0].default, { value }, React.createElement(Probe)),
    );
    return { output, trace };
  })(),
  themeHelper: (() => {
    const props = { style: { padding: 4 } };
    const raw = getThemeProps({
      props,
      name: 'Probe',
      theme: { components: { Probe: { value: 'raw' } } },
    });
    const wrapped = getThemeProps({
      props,
      name: 'Probe',
      theme: {
        components: {
          mergeClassNameAndStyle: true,
          Probe: { defaultProps: { value: 'wrapped', style: { color: 'red' } } },
        },
      },
    });
    return { raw, rawSame: raw === props, wrapped, styleSame: wrapped.style === props.style };
  })(),
};
const file = 'tests/fixtures/mui-default-props-contract-9.5.0.json';
const output = await format(JSON.stringify(data), {
  ...(await resolveConfig(file)),
  filepath: file,
});
if (process.argv.includes('--check')) {
  if ((await readFile(file, 'utf8')) !== output)
    throw Error('DefaultPropsProvider reference drift');
} else await writeFile(file, output);
console.log(
  `${cases.length} provider configurations across both barrels and ${primitives.length} unconstrained prop cases verified.`,
);
