// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import prettier from 'prettier';
const { format, resolveConfig } = prettier;
import { loadReference } from './load.mjs';
const loaded = await loadReference('@mui/material', [
  'FormLabel/FormLabel.js',
  'FormLabel/FormLabel.d.ts',
  'InputLabel/InputLabel.js',
  'InputLabel/InputLabel.d.ts',
  'FormHelperText/FormHelperText.js',
  'FormHelperText/FormHelperText.d.ts',
  'FormControl/FormControl.js',
  'FormControl/FormControl.d.ts',
  'FormControl/useFormControl.js',
  'InputBase/InputBase.js',
  'Input/Input.js',
  'FilledInput/FilledInput.js',
  'OutlinedInput/OutlinedInput.js',
  'TextField/TextField.js',
  'styles/createTransitions.js',
]);
const { require, directory, reference } = loaded;
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = (name) =>
  require(`${directory}/node_modules/@mui/material/${name}/${name}.js`).default;
const { createTheme, ThemeProvider } = require(
  `${directory}/node_modules/@mui/material/styles/index.js`,
);
const FormControl = load('FormControl');
const OutlinedInput = load('OutlinedInput');
const cases = [
  { component: 'FormLabel', props: {} },
  {
    component: 'FormLabel',
    form: { required: true, error: true, disabled: true, focused: true, color: 'secondary' },
    props: {},
  },
  {
    component: 'FormLabel',
    form: { required: true, error: true, disabled: true, focused: true, color: 'secondary' },
    props: { required: false, error: false, disabled: false, focused: true, color: 'success' },
  },
  { component: 'FormLabel', form: { focused: true, color: 'secondary' }, props: {} },
  { component: 'InputLabel', props: {} },
  { component: 'InputLabel', props: { focused: true } },
  { component: 'InputLabel', form: {}, props: {} },
  {
    component: 'InputLabel',
    form: { focused: true, size: 'small', variant: 'filled', required: true },
    props: {},
  },
  { component: 'InputLabel', form: {}, input: { defaultValue: 'Ada' }, props: {} },
  { component: 'InputLabel', form: {}, input: { startAdornment: '$' }, props: {} },
  { component: 'InputLabel', form: { focused: true }, props: { shrink: false } },
  { component: 'InputLabel', form: {}, props: { focused: true } },
  { component: 'FormHelperText', props: {} },
  {
    component: 'FormHelperText',
    form: { variant: 'outlined', size: 'small', required: true, error: true, disabled: true },
    props: {},
  },
  {
    component: 'FormHelperText',
    form: { variant: 'filled', error: true, required: true },
    props: { variant: 'standard', error: false, required: false },
  },
  { component: 'FormHelperText', form: {}, props: {}, children: ' ' },
];
const pick = (state, keys) =>
  Object.fromEntries(
    keys.filter((key) => state[key] !== undefined).map((key) => [key, state[key]]),
  );
const fixtures = cases.map((input) => {
  let output;
  const theme = createTheme({
    components: {
      [`Mui${input.component}`]: {
        styleOverrides: {
          root: ({ ownerState }) => {
            const keys =
              input.component === 'InputLabel'
                ? ['focused', 'required', 'shrink', 'size', 'variant']
                : input.component === 'FormLabel'
                  ? ['color', 'focused', 'required', 'filled', 'disabled', 'error']
                  : [
                      'focused',
                      'required',
                      'filled',
                      'disabled',
                      'error',
                      'size',
                      'variant',
                      'contained',
                    ];
            output = pick(ownerState, keys);
            if (input.component === 'InputLabel')
              output.formControl = Boolean(ownerState.formControl);
            return {};
          },
        },
      },
    },
  });
  let content = React.createElement(load(input.component), input.props, input.children ?? 'Label');
  if (input.form)
    content = React.createElement(
      FormControl,
      input.form,
      content,
      input.input ? React.createElement(OutlinedInput, input.input) : null,
    );
  const markup = renderToStaticMarkup(React.createElement(ThemeProvider, { theme }, content));
  return {
    ...input,
    output,
    requiredMarker: markup.includes('MuiFormLabel-asterisk'),
    reservedLine: input.component === 'FormHelperText' && markup.includes('\u200b'),
  };
});
const filename = 'tests/fixtures/mui-labels-9.5.0.json';
const output = await format(
  JSON.stringify({
    reference,
    transitionDuration: require(
      `${directory}/node_modules/@mui/material/styles/createTransitions.js`,
    ).default({}).duration.shorter,
    fixtures,
  }),
  {
    ...(await resolveConfig(filename)),
    filepath: filename,
  },
);
if (process.argv.includes('--check')) {
  if ((await readFile(filename, 'utf8')) !== output) throw new Error('Label reference drift');
  console.log('Pinned form/label/helper state and marker references passed.');
} else await writeFile(filename, output);
