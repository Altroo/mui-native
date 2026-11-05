// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadReference } from './load.mjs';
import * as prettier from 'prettier';

// Use the formatter's public ESM functions at a concrete, inspectable boundary.
const formatter = /** @type {{
 * format(source: string, options: Record<string, unknown>): Promise<string>,
 * resolveConfig(file: string): Promise<Record<string, unknown> | null>
 * }} */ (prettier);

const material = await loadReference('@mui/material', [
  'FormGroup/FormGroup.js',
  'FormGroup/FormGroup.d.ts',
  'FormGroup/index.js',
  'FormGroup/index.d.ts',
  'FormGroup/formGroupClasses.js',
  'FormGroup/formGroupClasses.d.ts',
  'FormControl/useFormControl.js',
  'FormControl/useFormControl.d.ts',
]);
const utils = await loadReference('@mui/utils', [
  'composeClasses/composeClasses.js',
  'generateUtilityClass/generateUtilityClass.js',
]);
const React = material.require('react');
const { renderToStaticMarkup } = material.require('react-dom/server');
const { default: FormGroup } = material.require('@mui/material/FormGroup');
const { default: FormControl } = material.require('@mui/material/FormControl');
const { ThemeProvider, createTheme } = material.require('@mui/material/styles');
const originalClasses = material.require('@mui/material/FormGroup');
const unset = '$undefined';
const specs = [
  { name: 'unscoped defaults' },
  { name: 'class accessor order', kind: 'class-getter' },
  { name: 'explicit row', props: { row: true } },
  {
    name: 'styled root arguments',
    kind: 'root-props',
    props: { row: true, className: 'authored', classes: { root: 'custom' } },
    form: { error: true },
  },
  { name: 'parent false', form: { error: false } },
  { name: 'parent true', form: { error: true } },
  { name: 'own false beats parent', form: { error: true }, props: { error: false } },
  { name: 'own undefined inherits parent', form: { error: true }, props: { error: unset } },
  {
    name: 'row and error classes',
    form: { error: true },
    props: {
      row: true,
      classes: { root: 'custom-root', row: 'custom-row', error: 'custom-error' },
      className: 'extra',
    },
  },
  {
    name: 'inactive classes stay inactive',
    props: { classes: { row: 'inactive-row', error: 'inactive-error' }, className: 'extra' },
  },
  {
    name: 'provider defaults',
    defaults: { row: true, className: 'theme', classes: { root: 'default-root' } },
  },
  {
    name: 'explicit values replace defaults',
    defaults: { row: true, className: 'theme', classes: { root: 'default-root' } },
    props: { row: false, className: 'own', classes: { root: 'own-root' } },
  },
  {
    name: 'explicit undefined receives defaults',
    defaults: { row: true, className: 'theme', classes: { root: 'default-root' } },
    props: { row: unset, className: unset, classes: unset, sx: unset },
  },
];
const decode = (props = {}) =>
  Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, value === unset ? undefined : value]),
  );
const observations = specs.map((spec) => {
  const states = [];
  const rootArguments = [];
  let classReads = 0;
  const props = decode(spec.props);
  if (spec.kind === 'class-getter')
    props.classes = Object.defineProperty({}, 'root', {
      enumerable: true,
      get() {
        return `custom-${++classReads}`;
      },
    });
  const theme = createTheme({
    components: {
      MuiFormGroup: {
        defaultProps: spec.defaults,
        styleOverrides: {
          root: (rootProps) => {
            const { ownerState } = rootProps;
            if (spec.kind === 'root-props')
              rootArguments.push({
                className: rootProps.className,
                id: rootProps.id,
                rowPresent: Object.hasOwn(rootProps, 'row'),
                errorPresent: Object.hasOwn(rootProps, 'error'),
              });
            states.push({
              row: ownerState.row,
              error: ownerState.error === undefined ? unset : ownerState.error,
            });
            return {};
          },
        },
      },
    },
  });
  let content = React.createElement(FormGroup, { id: 'form-group-reference', ...props }, 'Content');
  if (spec.form) content = React.createElement(FormControl, spec.form, content);
  // Error is a retained native extension: original JavaScript resolves it too,
  // while React DOM warns when that non-HTML boolean reaches its div.
  const warnings = [];
  const previousError = console.error;
  let markup;
  try {
    console.error = (...args) => warnings.push(args);
    markup = renderToStaticMarkup(React.createElement(ThemeProvider, { theme }, content));
  } finally {
    console.error = previousError;
  }
  if (
    warnings.some(
      (args) => !String(args[0]).includes('non-boolean attribute') || !args.includes('error'),
    )
  )
    throw Error('Unexpected original FormGroup diagnostic');
  const tag = markup.match(/<div\b[^>]*\bid="form-group-reference"[^>]*>/)?.[0];
  if (!tag || !states.length) throw Error('Original FormGroup observation missing');
  const className = tag.match(/class="([^"]*)"/)?.[1] ?? '';
  return {
    input: spec,
    state: states.at(-1),
    classes: className.split(/\s+/).filter((name) => !name.startsWith('css-')),
    text: 'Content',
    ...(spec.kind === 'class-getter' ? { classReads } : {}),
    ...(spec.kind === 'root-props' ? { rootArguments: rootArguments.at(-1) } : {}),
  };
});
const slots = [
  'root',
  'row',
  'error',
  'active',
  'checked',
  'completed',
  'disabled',
  'expanded',
  'focused',
  'focusVisible',
  'open',
  'readOnly',
  'required',
  'selected',
  'unknown',
  'dense',
  'indeterminate',
  '__proto__',
  'constructor',
  'toString',
];
const data = {
  references: [material.reference, utils.reference],
  classes: originalClasses.formGroupClasses,
  utility: Object.fromEntries(
    slots.map((slot) => [slot, originalClasses.getFormGroupUtilityClass(slot)]),
  ),
  observations,
};
const target = fileURLToPath(
  new URL('../../tests/fixtures/mui-form-group-contract-9.5.0.json', import.meta.url),
);
const output = await formatter.format(JSON.stringify(data), {
  ...(await formatter.resolveConfig(target)),
  parser: 'json',
});
if (process.argv.includes('--check')) {
  if ((await readFile(target, { encoding: 'utf8' })) !== output)
    throw Error('Original FormGroup reference changed');
} else await writeFile(target, output);
console.log(
  `Original FormGroup: ${observations.length} state/class/default cases and ${slots.length} utility identifiers verified.`,
);
