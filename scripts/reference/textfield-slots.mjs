import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'TextField/TextField.js',
  'TextField/TextField.d.ts',
  'utils/useSlot.js',
]);
const utils = await loadReference('@mui/utils', [
  'useForkRef/useForkRef.js',
  'useForkRef/useForkRef.d.ts',
  'setRef/setRef.js',
  'setRef/setRef.d.ts',
]);
const { require, directory } = material;
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const TextField = require(`${directory}/node_modules/@mui/material/TextField/TextField.js`).default;
const useForkRef = require(`${directory}/node_modules/@mui/utils/useForkRef/useForkRef.js`).default;
const setRef = require(`${directory}/node_modules/@mui/utils/setRef/setRef.js`).default;
const slots = [];
for (const override of [false, true]) {
  const seen = {};
  const slots = {
    root: ({ children, disabled, error, required, fullWidth, ownerState }) => {
      seen.root = { disabled, error, required, fullWidth, variant: ownerState.variant };
      return children;
    },
    input: ({ value, name, id, inputProps, slots, onChange }) => {
      seen.input = {
        value,
        name,
        id,
        htmlInput: inputProps['data-host'],
        customHost: slots.input === Host,
      };
      onChange();
      return null;
    },
    htmlInput: Host,
    inputLabel: ({ children, id }) => {
      seen.label = { children, id };
      return null;
    },
    formHelperText: ({ children, id }) => {
      seen.helper = { children, id };
      return null;
    },
  };
  function Host() {
    return null;
  }
  const events = [];
  renderToStaticMarkup(
    React.createElement(TextField, {
      label: 'Name',
      helperText: 'Help',
      id: 'customer',
      name: 'customer',
      value: 'Ada',
      required: true,
      fullWidth: true,
      slots,
      onChange: () => events.push('top'),
      slotProps: {
        htmlInput: { 'data-host': 'host' },
        ...(override ? { input: { onChange: () => events.push('input') } } : {}),
      },
    }),
  );
  slotsResult(seen, events);
}
function slotsResult(seen, events) {
  slots.push({ ...seen, events });
}
const events = [];
const object = { current: null };
let ref;
function Probe() {
  ref = useForkRef(
    object,
    (value) => {
      events.push(value);
    },
    (value) => {
      events.push(`cleanup:${value}`);
      return () => events.push('released');
    },
  );
  return null;
}
renderToStaticMarkup(React.createElement(Probe));
ref('instance');
const attached = object.current;
ref(null);
setRef(object, 'setter');
const inputDefaults = [
  { topDefault: null, slotDefault: 'Ada' },
  { topDefault: 'Grace', slotDefault: 'Ada' },
  { topDefault: 'Grace', slotDefault: null },
].map((input) => {
  const markup = renderToStaticMarkup(
    React.createElement(TextField, {
      defaultValue: input.topDefault ?? undefined,
      slots: {
        root: ({ children }) => children,
        input: ({ value, defaultValue }) =>
          React.createElement('input', { value, defaultValue, onChange() {} }),
      },
      slotProps: { input: { defaultValue: input.slotDefault ?? undefined } },
    }),
  );
  return { ...input, value: /value="([^"]*)"/.exec(markup)?.[1] ?? '' };
});
const result = {
  references: [material.reference, utils.reference],
  slots,
  inputDefaults,
  refs: { attached, detached: events, setter: object.current },
};
const filename = 'tests/fixtures/mui-textfield-slots-9.5.0.json';
const output = await format(JSON.stringify(result), {
  ...(await resolveConfig(filename)),
  filepath: filename,
});
if (process.argv.includes('--check')) {
  if ((await readFile(filename, 'utf8')) !== output)
    throw new Error('TextField/ref reference drift');
  console.log('Pinned TextField slot routing and ref lifecycle reference passed.');
} else await writeFile(filename, output);
