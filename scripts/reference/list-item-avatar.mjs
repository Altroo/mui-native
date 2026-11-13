// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import prettier from 'prettier';
const { format, resolveConfig } = prettier;
import { loadReference } from './load.mjs';
const files = [
  'package.json',
  'className/index.js',
  'ListItemAvatar/ListItemAvatar.js',
  'ListItemAvatar/ListItemAvatar.d.ts',
  'ListItemAvatar/ListItemAvatar.d.mts',
  'ListItemAvatar/index.js',
  'ListItemAvatar/index.d.ts',
  'ListItemAvatar/index.d.mts',
  'ListItemAvatar/listItemAvatarClasses.js',
  'ListItemAvatar/listItemAvatarClasses.d.ts',
  'ListItemAvatar/listItemAvatarClasses.d.mts',
  'List/ListContext.js',
  'ListItem/ListItem.js',
  'ListItemButton/ListItemButton.js',
];
const { reference, require, directory } = await loadReference('@mui/material', files);
const { reference: utilitiesReference } = await loadReference('@mui/utils', [
  'generateUtilityClass/generateUtilityClass.js',
  'generateUtilityClasses/generateUtilityClasses.js',
  'composeClasses/composeClasses.js',
  'ClassNameGenerator/index.js',
  'ClassNameGenerator/ClassNameGenerator.js',
]);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = (path) => require(`${directory}/node_modules/@mui/material/${path}`);
const Avatar = load('ListItemAvatar').default;
const List = load('List').default;
const Item = load('ListItem').default;
const Button = load('ListItemButton').default;
const { createTheme, ThemeProvider } = load('styles');
const classes = load('ListItemAvatar/listItemAvatarClasses');
const packageExports = load('package.json').exports;
assert(packageExports['./ListItemAvatar']);
assert.equal(packageExports['./ListItemAvatar/listItemAvatarClasses'], undefined);
const inputs = [
  {
    name: 'active nested class getters preserve read order and whitespace',
    alignItems: 'flex-start',
    classesGetter: true,
    className: ' authored ',
  },
  {
    name: 'inline shorthand resets flex-start',
    list: true,
    alignItems: 'flex-start',
    style: { margin: 0 },
  },
  {
    name: 'inline shorthand resets theme edges',
    list: true,
    alignItems: 'flex-start',
    edges: { marginTop: 13, paddingTop: 9, paddingLeft: 7 },
    style: { margin: 0, padding: 0 },
  },
  { name: 'unscoped' },
  { name: 'List only', list: true },
  { name: 'center', alignItems: 'center' },
  { name: 'flex-start', alignItems: 'flex-start' },
  { name: 'button flex-start', alignItems: 'flex-start', button: true },
  {
    name: 'authored classes',
    alignItems: 'flex-start',
    classes: { root: 'custom-root', alignItemsFlexStart: 'custom-top' },
    className: 'authored',
  },
  {
    name: 'theme defaults',
    alignItems: 'flex-start',
    defaults: { className: 'default', classes: { root: 'default-root' }, sx: { minWidth: 64 } },
  },
  {
    name: 'supplied props replace defaults',
    alignItems: 'center',
    defaults: { className: 'default', classes: { root: 'default-root' }, sx: { minWidth: 64 } },
    classes: { root: 'local-root' },
    className: 'local',
    sx: { minWidth: 72 },
  },
];
const fixtures = inputs.map((input) => {
  let observation;
  const classAccesses = [];
  const accessorClasses = input.classesGetter
    ? {
        get root() {
          classAccesses.push('root');
          return `custom-${classAccesses.length}`;
        },
        get alignItemsFlexStart() {
          classAccesses.push('alignItemsFlexStart');
          return `custom-${classAccesses.length}`;
        },
      }
    : input.classes;
  const theme = createTheme({
    components: {
      MuiListItemAvatar: {
        defaultProps: input.defaults,
        styleOverrides: {
          root: ({ ownerState, className, id, classes, ...rootProps }) => {
            observation = {
              alignItems: ownerState.alignItems ?? null,
              hasAlignment: Object.hasOwn(ownerState, 'alignItems'),
              className,
              id,
              classes: input.classesGetter ? '<accessor map>' : (classes ?? null),
              hasAs: Object.hasOwn(rootProps, 'as'),
            };
            return input.edges ?? {};
          },
        },
      },
    },
  });
  const props = {
    id: 'avatar-probe',
    classes: accessorClasses,
    className: input.className,
    sx: input.sx,
    style: input.style,
  };
  let body = React.createElement(Avatar, props, 'Avatar');
  if (input.alignItems)
    body = React.createElement(
      input.button ? Button : Item,
      { alignItems: input.alignItems },
      body,
    );
  if (input.list) body = React.createElement(List, null, body);
  const markup = renderToStaticMarkup(React.createElement(ThemeProvider, { theme }, body));
  const tag = markup.match(/<div[^>]*id="avatar-probe"[^>]*>/)?.[0];
  assert(tag, 'Original avatar root is missing');
  const className = tag
    .match(/class="([^"]*)"/)[1]
    .split(/\s+/)
    .filter((token) => !token.startsWith('css-'))
    .join(' ');
  assert.equal(className, observation.className.trim().split(/\s+/).join(' '));
  const inlineStyle = tag.match(/style="([^"]*)"/)?.[1] ?? null;
  if (input.style)
    assert.equal(
      inlineStyle,
      Object.entries(input.style)
        .map(([key, value]) => `${key}:${value}`)
        .join(';'),
    );
  return { input, observation, className, inlineStyle, classAccesses };
});
const utilitySlots = [
  'root',
  'alignItemsFlexStart',
  'disabled',
  'error',
  'selected',
  'focusVisible',
  'active',
  'checked',
  'completed',
  'expanded',
  'focused',
  'open',
  'readOnly',
  'required',
  '',
  'custom',
  '__proto__',
];
const { unstable_ClassNameGenerator: generator } = load('className');
const configured = (() => {
  const configure = (name) => `Consumer${name}`;
  generator.configure(configure);
  try {
    const root = React.createElement(
      Avatar,
      { id: 'configured-avatar', className: 'chosen' },
      'Avatar',
    );
    const markup = renderToStaticMarkup(
      React.createElement(Item, { alignItems: 'flex-start' }, root),
    );
    const tag = markup.match(/<div[^>]*id="configured-avatar"[^>]*>/)?.[0];
    assert(tag, 'Original configured avatar root is missing');
    const className = tag
      .match(/class="([^"]*)"/)[1]
      .split(/\s+/)
      .filter((token) => !token.startsWith('css-'))
      .join(' ');
    return {
      className,
      root: classes.getListItemAvatarUtilityClass('root'),
      alignItemsFlexStart: classes.getListItemAvatarUtilityClass('alignItemsFlexStart'),
      disabled: classes.getListItemAvatarUtilityClass('disabled'),
      mapRoot: classes.default.root,
    };
  } finally {
    generator.reset();
  }
})();
const value = {
  reference,
  utilitiesReference,
  renderer:
    'Original React DOM static markup and theme callbacks; no native or browser geometry evidence',
  fixtures,
  configured,
  classes: classes.default,
  utilities: Object.fromEntries(
    utilitySlots.map((slot) => [slot, classes.getListItemAvatarUtilityClass(slot)]),
  ),
};
const provenance = {
  schemaVersion: 1,
  description:
    'Full existing ListItemAvatar wrapper reference; native root/event adapters are independently authored.',
  reference,
  utilitiesReference,
  localFiles: [
    'packages/material/src/lists.tsx',
    'packages/material/src/listItemAvatarClasses.ts',
    'packages/material/src/ListItemAvatar/index.ts',
    'packages/material/src/classNameGenerator.ts',
  ],
  adaptations: [
    'View and native custom roots replace the DOM div and retain inherited native props/events/ref lifecycle.',
    'Original and configured class identifiers and authored classes participate in finite self selectors and custom-root metadata; external CSS is not rendered.',
    'Native text scopes preserve container text inheritance without placing raw strings under Views.',
    'Native inline inset shorthands replace computed edge declarations with the existing native control merger, preserving native array semantics, inherited direction and CSS text metric provenance.',
  ],
};
for (const [file, data] of [
  ['tests/fixtures/mui-list-item-avatar-9.5.0.json', value],
  ['upstream/list-item-avatar.json', provenance],
]) {
  const output = await format(JSON.stringify(data), {
    ...(await resolveConfig(file)),
    parser: 'json',
  });
  if (process.argv.includes('--check'))
    assert.equal(await readFile(file, 'utf8'), output, `Pinned ListItemAvatar drift: ${file}`);
  else await writeFile(file, output);
}
console.log(
  `Pinned ListItemAvatar: ${fixtures.length} root/context/default/class cases and ${utilitySlots.length} utility identifiers passed.`,
);
