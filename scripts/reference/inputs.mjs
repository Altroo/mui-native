// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import prettier from 'prettier';
const { format, resolveConfig } = prettier;
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'InputBase/InputBase.js',
  'InputBase/InputBase.d.ts',
  'InputBase/utils.js',
  'Input/Input.js',
  'Input/Input.d.ts',
  'FilledInput/FilledInput.js',
  'FilledInput/FilledInput.d.ts',
  'OutlinedInput/OutlinedInput.js',
  'OutlinedInput/OutlinedInput.d.ts',
  'OutlinedInput/NotchedOutline.js',
  'InputAdornment/InputAdornment.js',
  'InputAdornment/InputAdornment.d.ts',
  'FormControl/FormControl.js',
  'FormControl/useFormControl.js',
]);
const { require, directory, reference } = material;
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = (name) =>
  require(`${directory}/node_modules/@mui/material/${name}/${name}.js`).default;
const fixtures = [];
for (const component of ['InputBase', 'Input', 'FilledInput', 'OutlinedInput']) {
  let captured;
  const events = [];
  const Root = ({ children }) => children;
  const Host = (props) => {
    captured = props;
    return null;
  };
  renderToStaticMarkup(
    React.createElement(load(component), {
      name: 'name',
      id: 'field',
      defaultValue: 'Ada',
      slots: { root: Root, input: Host },
      inputProps: { onChange: () => events.push('baseHost') },
      slotProps: { input: { onChange: () => events.push('slotHost') } },
      onChange: () => events.push('mui'),
    }),
  );
  captured.onChange({ target: { value: 'Edited' } });
  fixtures.push({
    component,
    initial: captured.value ?? captured.defaultValue,
    name: captured.name,
    id: captured.id,
    events,
  });
}
const text = (node) =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : React.isValidElement(node)
      ? React.Children.toArray(node.props.children).map(text).join('')
      : '';
const outlines = [];
for (const input of [
  { required: true, label: 'Name', notched: true },
  { required: false, label: 'Name', notched: false },
  { required: true, label: 'Name', notched: true, override: 'Custom' },
]) {
  let result;
  const Notch = (props) => {
    result = { label: text(props.label), notched: props.notched };
    return null;
  };
  renderToStaticMarkup(
    React.createElement(load('OutlinedInput'), {
      required: input.required,
      label: input.label,
      notched: input.notched,
      slots: { root: ({ children }) => children, input: () => null, notchedOutline: Notch },
      slotProps: input.override ? { notchedOutline: { label: input.override } } : undefined,
    }),
  );
  outlines.push({ input, output: result });
}
const output = await format(JSON.stringify({ reference, fixtures, outlines }), {
  ...(await resolveConfig('tests/fixtures/mui-inputs-9.5.0.json')),
  filepath: 'tests/fixtures/mui-inputs-9.5.0.json',
});
const file = 'tests/fixtures/mui-inputs-9.5.0.json';
if (process.argv.includes('--check')) {
  if ((await readFile(file, 'utf8')) !== output) throw new Error('Input reference drift');
  console.log('Pinned native-input routing, event order and outline references passed.');
} else await writeFile(file, output);
