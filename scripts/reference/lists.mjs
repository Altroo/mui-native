import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
const names = [
  'List',
  'ListItem',
  'ListItemButton',
  'ListItemText',
  'ListItemIcon',
  'ListItemAvatar',
  'ListItemSecondaryAction',
  'ListSubheader',
];
const { reference, require, directory } = await loadReference('@mui/material', [
  ...names.flatMap((name) => [`${name}/${name}.js`, `${name}/${name}.d.ts`]),
  'List/ListContext.js',
  'utils/useSlot.js',
  'ButtonBase/ButtonBase.js',
  'ButtonBase/useButtonBase.js',
]);
const React = require('react'),
  { renderToStaticMarkup } = require('react-dom/server');
const load = (name) =>
  require(`${directory}/node_modules/@mui/material/${name}/${name}.js`).default;
const components = Object.fromEntries(names.map((name) => [name, load(name)]));
const Typography = load('Typography');
const { createTheme, ThemeProvider } = require(
  `${directory}/node_modules/@mui/material/styles/index.js`,
);
const keys = {
  List: ['dense', 'disablePadding'],
  ListItem: ['dense', 'alignItems', 'disableGutters', 'disablePadding', 'divider'],
  ListItemButton: ['dense', 'alignItems', 'disableGutters', 'divider', 'selected'],
  ListItemText: ['dense', 'disableTypography', 'inset', 'primary', 'secondary'],
  ListItemIcon: ['alignItems'],
  ListItemAvatar: ['alignItems'],
  ListItemSecondaryAction: ['disableGutters'],
  ListSubheader: ['color', 'disableGutters', 'disableSticky', 'inset'],
};
const cases = [
  { name: 'ordinary item' },
  { name: 'dense list inheritance', listDense: true, itemDense: false },
  { name: 'item can opt into density', itemDense: true },
  {
    name: 'gutters padding alignment and divider',
    disableGutters: true,
    disablePadding: true,
    alignItems: 'flex-start',
    divider: true,
  },
  { name: 'end action and two lines', secondaryAction: true, secondary: 'Detail' },
  { name: 'zero primary remains content', primary: 0, secondary: 'Detail' },
  { name: 'empty primary suppresses children fallback', primary: '', secondary: 'Detail' },
  { name: 'null primary falls back to children', primary: null, secondary: 'Detail' },
  {
    name: 'text inset and raw typography',
    inset: true,
    disableTypography: true,
    secondary: 'Detail',
  },
  { name: 'provided typography is retained', providedTypography: true, secondary: 'Detail' },
  {
    name: 'button inherits dense context',
    button: true,
    listDense: true,
    selected: true,
    divider: true,
  },
  {
    name: 'button alignment gutters and disabled',
    button: true,
    alignItems: 'flex-start',
    disableGutters: true,
    disabled: true,
  },
  { name: 'ButtonBase disabled default is inherited', button: true, baseDisabled: true },
  {
    name: 'explicit false overrides ButtonBase disabled default',
    button: true,
    baseDisabled: true,
    disabled: false,
  },
  { name: 'subheader resets top padding', subheader: true },
  {
    name: 'explicit header options',
    subheader: true,
    header: { color: 'primary', disableGutters: true, disableSticky: true, inset: true },
    listDisablePadding: true,
  },
];
const fixtures = cases.map((input) => {
  const owners = {};
  const theme = createTheme({
    components: Object.fromEntries(
      names.map((name) => [
        'Mui' + name,
        {
          styleOverrides: {
            root: ({ ownerState }) => {
              owners[name] = Object.fromEntries(
                keys[name]
                  .filter((key) => ownerState[key] !== undefined)
                  .map((key) => [key, ownerState[key]]),
              );
              return {};
            },
          },
        },
      ]),
    ),
  });
  if (input.baseDisabled !== undefined)
    theme.components.MuiButtonBase = { defaultProps: { disabled: input.baseDisabled } };
  const Item = input.button ? components.ListItemButton : components.ListItem;
  const itemProps = {
    'data-button': input.button ? 'button' : undefined,
    dense: input.itemDense,
    alignItems: input.alignItems,
    disableGutters: input.disableGutters,
    divider: input.divider,
    ...(input.button
      ? { selected: input.selected, disabled: input.disabled, disableRipple: true }
      : {
          disablePadding: input.disablePadding,
          secondaryAction: input.secondaryAction
            ? React.createElement('button', null, 'More')
            : undefined,
        }),
  };
  const primary = input.providedTypography
    ? React.createElement(Typography, { variant: 'caption' }, 'Custom')
    : input.primary;
  const content = React.createElement(
    components.List,
    {
      dense: input.listDense,
      disablePadding: input.listDisablePadding,
      subheader: input.subheader
        ? React.createElement(components.ListSubheader, input.header, 'Section')
        : undefined,
    },
    React.createElement(
      Item,
      itemProps,
      React.createElement(components.ListItemIcon, null, 'Icon'),
      React.createElement(components.ListItemAvatar, null, 'Avatar'),
      React.createElement(
        components.ListItemText,
        {
          primary,
          secondary: input.secondary,
          inset: input.inset,
          disableTypography: input.disableTypography,
        },
        'Fallback',
      ),
    ),
  );
  const html = renderToStaticMarkup(React.createElement(ThemeProvider, { theme }, content));
  const typography = [...html.matchAll(/class="([^"]*MuiTypography-root[^"]*)"/g)].map((match) =>
    match[1]
      .match(/MuiTypography-([a-z][A-Za-z0-9]*)/g)
      ?.find((name) => !['MuiTypography-root'].includes(name))
      ?.slice('MuiTypography-'.length),
  );
  const tag = input.button ? html.match(/<[^>]*data-button="button"[^>]*>/)?.[0] : undefined;
  const buttonState = tag
    ? {
        disabled: tag.includes('aria-disabled="true"'),
        tabIndex: Number(tag.match(/tabindex="(-?\d+)"/)?.[1]),
      }
    : undefined;
  return { input, owners, typography, buttonState };
});
const file = 'tests/fixtures/mui-lists-9.5.0.json';
const output = await format(
  JSON.stringify({
    reference,
    renderer:
      'Original React DOM static markup and real style override owner states; no browser layout, focus or native evidence',
    fixtures,
  }),
  { ...(await resolveConfig(file)), parser: 'json' },
);
if (process.argv.includes('--check')) {
  if ((await readFile(file, 'utf8')) !== output) throw new Error('Pinned list fixture drift');
  console.log(`Pinned original List family passed ${fixtures.length} composition cases.`);
} else {
  await writeFile(file, output);
  console.log(`Recorded ${fixtures.length} original List composition cases.`);
}
