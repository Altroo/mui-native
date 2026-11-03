import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
const names = ['Button', 'IconButton'];
const { reference, require, directory } = await loadReference('@mui/material', [
  ...names.flatMap((name) => [
    `${name}/${name}.js`,
    `${name}/${name}.d.ts`,
    `${name}/${name[0].toLowerCase() + name.slice(1)}Classes.js`,
    `${name}/${name[0].toLowerCase() + name.slice(1)}Classes.d.ts`,
  ]),
  'ButtonBase/ButtonBase.js',
  'ButtonBase/useButtonBase.js',
  'ButtonGroup/ButtonGroupContext.js',
]);
const React = require('react'),
  { create, act } = require('react-test-renderer');
const { createTheme, ThemeProvider } = require(
  `${directory}/node_modules/@mui/material/styles/index.js`,
);
const ButtonBase = require(
  `${directory}/node_modules/@mui/material/ButtonBase/ButtonBase.js`,
).default;
const components = Object.fromEntries(
  names.map((name) => [
    name,
    require(`${directory}/node_modules/@mui/material/${name}/${name}.js`).default,
  ]),
);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.document = { querySelector: () => null };
const cases = [
  ...names.flatMap((component) => [
    { name: component + ' defaults', component },
    ...[true, false, null].map((loading) => ({
      name: component + ' loading ' + loading,
      component,
      props: { loading },
    })),
    { name: component + ' disabled', component, props: { disabled: true } },
    { name: component + ' disable focus ripple', component, props: { disableFocusRipple: true } },
    ...['small', 'large'].map((size) => ({
      name: component + ' ' + size,
      component,
      props: { size },
    })),
    { name: component + ' native link', component, props: { href: 'https://example.com' } },
    {
      name: component + ' explicit undefined restores defaults',
      component,
      defaults: { size: 'large', color: 'secondary', loading: true },
      props: { $undefined: ['size', 'loading'] },
    },
  ]),
  ...['start', 'end', 'center'].map((loadingPosition) => ({
    name: 'Button loading ' + loadingPosition,
    component: 'Button',
    props: { loading: true, loadingPosition },
    icons: true,
  })),
  {
    name: 'Button outlined full width',
    component: 'Button',
    props: { variant: 'outlined', fullWidth: true, disableElevation: true },
  },
  { name: 'IconButton edge start', component: 'IconButton', props: { edge: 'start' } },
  {
    name: 'IconButton edge end small',
    component: 'IconButton',
    props: { edge: 'end', size: 'small' },
  },
  {
    name: 'IconButton does not inherit Button defaults',
    component: 'IconButton',
    buttonDefaults: { color: 'error', variant: 'contained', size: 'large', disabled: true },
  },
  {
    name: 'Button custom palette and variant',
    component: 'Button',
    props: { color: 'brand', variant: 'soft' },
    custom: true,
  },
];
const fixtures = [];
for (const input of cases) {
  let owner;
  const theme = createTheme({
    ...(input.custom ? { palette: { brand: { main: '#345678' } } } : {}),
    components: {
      MuiButton: { defaultProps: input.buttonDefaults },
      ['Mui' + input.component]: {
        defaultProps: input.defaults,
        styleOverrides: {
          root: ({ ownerState }) => {
            owner = ownerState;
            return {};
          },
        },
      },
    },
  });
  const { $undefined, ...authored } = input.props ?? {};
  for (const key of $undefined ?? []) authored[key] = undefined;
  let root;
  await act(() => {
    root = create(
      React.createElement(
        ThemeProvider,
        { theme },
        React.createElement(
          components[input.component],
          {
            id: 'choice',
            ...authored,
            ...(input.icons ? { startIcon: 'Start', endIcon: 'End' } : {}),
          },
          'Action',
        ),
      ),
      {
        createNodeMock: (element) => ({
          nodeType: 1,
          tagName: String(element.type).toUpperCase(),
          matches: () => false,
          focus() {},
          blur() {},
          getAttribute: () => null,
        }),
      },
    );
  });
  const base = root.root.findAllByType(ButtonBase)[0];
  const state = Object.fromEntries(
    (input.component === 'Button'
      ? [
          'color',
          'variant',
          'size',
          'disabled',
          'disableElevation',
          'disableFocusRipple',
          'fullWidth',
          'loading',
          'loadingPosition',
        ]
      : ['color', 'edge', 'size', 'disabled', 'disableFocusRipple', 'loading']
    ).map((key) => [key, owner[key]]),
  );
  const output = {
    owner: state,
    base: {
      disabled: Boolean(base.props.disabled),
      focusRipple: base.props.focusRipple,
      href: base.props.href ?? null,
      id: base.props.id,
    },
    loadingWrappers: root.root.findAll(
      (node) =>
        typeof node.type === 'string' &&
        String(node.props.className ?? '')
          .split(' ')
          .includes('Mui' + input.component + '-loadingWrapper'),
    ).length,
    loadingIndicators: root.root.findAll(
      (node) =>
        typeof node.type === 'string' &&
        String(node.props.className ?? '')
          .split(' ')
          .includes('Mui' + input.component + '-loadingIndicator'),
    ).length,
  };
  fixtures.push({ input, output });
  await act(() => root.unmount());
}
const helpers = Object.fromEntries(
  names.map((name) => {
    const mod = require(
      `${directory}/node_modules/@mui/material/${name}/${name[0].toLowerCase() + name.slice(1)}Classes.js`,
    );
    const helper = mod['get' + name + 'UtilityClass'];
    return [
      name,
      {
        classes: mod.default,
        states: Object.fromEntries(
          [
            'active',
            'checked',
            'completed',
            'disabled',
            'error',
            'expanded',
            'focused',
            'focusVisible',
            'open',
            'readOnly',
            'required',
            'selected',
            'custom',
          ].map((slot) => [slot, helper(slot)]),
        ),
      },
    ];
  }),
);
const output = await format(
  JSON.stringify({
    reference,
    scope:
      'Actual original MUI in react-test-renderer with modeled host refs. Wrapper props, loading structure and helpers; not CSS or native-device evidence.',
    fixtures,
    helpers,
  }),
  { ...(await resolveConfig('.')), parser: 'json' },
);
const file = 'tests/fixtures/mui-buttons-9.5.0.json';
if (process.argv.includes('--check')) {
  if ((await readFile(file, 'utf8')) !== output) throw new Error('Button reference differs');
  console.log(
    `Pinned original buttons passed ${fixtures.length} wrapper/loading cases and class helpers.`,
  );
} else {
  await writeFile(file, output);
  console.log(`Recorded ${fixtures.length} original button cases and helpers.`);
}
