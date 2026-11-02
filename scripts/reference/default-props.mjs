import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
const utils = await loadReference('@mui/utils', [
  'resolveProps/resolveProps.js',
  'resolveProps/resolveProps.d.ts',
  'isEventHandler/isEventHandler.js',
]);
const system = await loadReference('@mui/system', [
  'useThemeProps/getThemeProps.js',
  'useThemeProps/useThemeProps.js',
  'DefaultPropsProvider/DefaultPropsProvider.js',
]);
const material = await loadReference('@mui/material', [
  'utils/mergeSlotProps.js',
  'utils/mergeSlotProps.d.ts',
  'DefaultPropsProvider/DefaultPropsProvider.js',
]);
const resolveProps = utils.require(
  `${utils.directory}/node_modules/@mui/utils/resolveProps/resolveProps.js`,
).default;
const mergeSlotProps = material.require(
  `${material.directory}/node_modules/@mui/material/utils/mergeSlotProps.js`,
).default;
const cases = [
  [{ disabled: true, size: 'small' }, { disabled: false }],
  [
    { value: 'default', label: 'Default' },
    { value: null, label: '' },
  ],
  [
    { slotProps: { input: { placeholder: 'Default', editable: false } } },
    { slotProps: { input: { placeholder: 'Override' } } },
  ],
  [
    { slotProps: { input: { readOnly: true }, label: { color: 'red' } } },
    { slotProps: { input: { editable: true }, helper: { testID: 'help' } } },
  ],
  [
    { componentsProps: { input: { name: 'theme' } } },
    { componentsProps: { input: { value: 'app' } } },
  ],
  [{ slots: { root: 'ThemeRoot', input: 'ThemeInput' } }, { slots: { input: 'AppInput' } }],
  [{ components: { Root: 'ThemeRoot' } }, { components: { Input: 'AppInput' } }],
  [{ slotProps: { input: { id: 'theme' } } }, { slotProps: null }],
  [{ slotProps: { input: { id: 'theme' } } }, { slotProps: { input: null } }],
  [
    { className: 'theme', style: { color: 'red', fontSize: 20 } },
    { className: 'app', style: { fontSize: 24 } },
  ],
].flatMap(([defaults, props]) =>
  [false, true].map((merge) => ({
    defaults,
    props,
    merge,
    output: resolveProps(defaults, props, merge),
  })),
);
const states = [
  { disabled: false, tag: 'one' },
  { disabled: true, tag: 'two' },
];
const callbacks = [];
for (const defaultFunction of [false, true])
  for (const externalFunction of [false, true]) {
    const defaults = {
      slotProps: {
        input: defaultFunction
          ? (state) => ({
              placeholder: state.tag,
              editable: !state.disabled,
              style: { color: 'red' },
            })
          : { placeholder: 'theme', style: { color: 'red' } },
      },
    };
    const props = {
      slotProps: {
        input: externalFunction
          ? (state) => ({ value: state.tag, style: { fontSize: 24 } })
          : { value: 'app', style: { fontSize: 24 } },
      },
    };
    const output = resolveProps(defaults, props, true).slotProps.input;
    callbacks.push({
      defaultFunction,
      externalFunction,
      states: states.map((state) => ({
        state,
        output: typeof output === 'function' ? output(state) : output,
      })),
    });
  }
const slotMerges = [];
for (const defaultFunction of [false, true])
  for (const externalFunction of [false, true]) {
    const trace = [];
    const defaults = {
      id: 'default',
      className: 'theme',
      style: { color: 'red' },
      sx: { p: 1 },
      onPress: (...args) => trace.push(['default', ...args]),
    };
    const external = {
      className: 'app',
      style: { fontSize: 24 },
      sx: [{ m: 1 }],
      onPress: (...args) => trace.push(['external', ...args]),
    };
    const merged = mergeSlotProps(
      externalFunction ? (state) => ({ ...external, stateDefaultId: state.id }) : external,
      defaultFunction ? (state) => ({ ...defaults, ownerTag: state.tag }) : defaults,
    );
    const state = { tag: 'tag', className: 'owner' };
    const output = typeof merged === 'function' ? merged(state) : merged;
    output.onPress('event', 2);
    slotMerges.push({ defaultFunction, externalFunction, output, trace });
  }
const file = 'tests/fixtures/mui-default-props-9.5.0.json';
const output = await format(
  JSON.stringify({
    references: [utils.reference, system.reference, material.reference],
    cases,
    callbacks,
    slotMerges,
  }),
  { ...(await resolveConfig(file)), parser: 'json' },
);
if (process.argv.includes('--check')) {
  if ((await readFile(file, 'utf8')) !== output)
    throw new Error('Default-prop reference fixture has drifted');
} else await writeFile(file, output);
console.log(
  `${cases.length} default-prop cases, ${callbacks.length} deferred callback configurations, ${slotMerges.length} slot merge configurations verified.`,
);
