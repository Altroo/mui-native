// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import * as prettier from 'prettier';
// Keep the formatter's real ESM boundary visible to Node and IDE resolution.
const formatter = /** @type {{
 * format(source: string, options: Record<string, unknown>): Promise<string>,
 * resolveConfig(file: string): Promise<Record<string, unknown> | null>
 * }} */ (prettier);
import { loadReference } from './load.mjs';
const files = [
  'package.json',
  'index.js',
  'index.d.ts',
  'index.d.mts',
  'ListItemIcon/ListItemIcon.js',
  'ListItemIcon/ListItemIcon.d.ts',
  'ListItemIcon/ListItemIcon.d.mts',
  'ListItemIcon/index.js',
  'ListItemIcon/index.d.ts',
  'ListItemIcon/index.d.mts',
  'ListItemIcon/listItemIconClasses.js',
  'ListItemIcon/listItemIconClasses.d.ts',
  'ListItemIcon/listItemIconClasses.d.mts',
  'List/ListContext.js',
  'List/List.js',
  'ListItem/ListItem.js',
  'ListItemButton/ListItemButton.js',
  'MenuItem/MenuItem.js',
  'MenuList/MenuList.js',
  'SvgIcon/SvgIcon.js',
  'DefaultPropsProvider/DefaultPropsProvider.js',
];
const { reference, require, directory } = await loadReference('@mui/material', files);
const { reference: utilitiesReference } = await loadReference('@mui/utils', [
  'generateUtilityClass/generateUtilityClass.js',
  'generateUtilityClasses/generateUtilityClasses.js',
  'composeClasses/composeClasses.js',
  'resolveProps/resolveProps.js',
]);
const { reference: stylingReference } = await loadReference('@mui/system', [
  'createStyled/createStyled.js',
  'styleFunctionSx/styleFunctionSx.js',
  'DefaultPropsProvider/DefaultPropsProvider.js',
]);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = (path) => require(`${directory}/node_modules/@mui/material/${path}`);
const canonical = require('@mui/material/ListItemIcon');
const Icon = canonical.default;
const originalRoot = require('@mui/material');
const List = load('List').default;
const Item = load('ListItem').default;
const Button = load('ListItemButton').default;
const { createTheme, ThemeProvider, styled } = load('styles');
const classes = load('ListItemIcon/listItemIconClasses');
const packageExports = load('package.json').exports;
assert.equal(originalRoot.ListItemIcon, Icon);
assert.equal(originalRoot.listItemIconClasses, canonical.listItemIconClasses);
assert.equal(originalRoot.getListItemIconUtilityClass, canonical.getListItemIconUtilityClass);
assert.equal(canonical.listItemIconClasses, classes.default);
assert(packageExports['./ListItemIcon']);
assert.equal(packageExports['./ListItemIcon/listItemIconClasses'], undefined);
assert.throws(() => require('@mui/material/ListItemIcon/listItemIconClasses'), {
  code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
});
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
  { name: 'custom spacing and foreground', spacing: 10, activeColor: '#123456' },
  { name: 'List only', list: true },
  { name: 'nested List resets outer row alignment', alignItems: 'flex-start', nestedList: true },
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
    ...(input.spacing ? { spacing: input.spacing } : {}),
    ...(input.activeColor ? { palette: { action: { active: input.activeColor } } } : {}),
    components: {
      MuiListItemIcon: {
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
    id: 'icon-probe',
    classes: accessorClasses,
    className: input.className,
    sx: input.sx,
    style: input.style,
  };
  let body = React.createElement(Icon, props, 'Icon');
  if (input.nestedList) body = React.createElement(List, null, body);
  if (input.alignItems)
    body = React.createElement(
      input.button ? Button : Item,
      { alignItems: input.alignItems },
      body,
    );
  if (input.list) body = React.createElement(List, null, body);
  const markup = renderToStaticMarkup(React.createElement(ThemeProvider, { theme }, body));
  const tag = markup.match(/<div[^>]*id="icon-probe"[^>]*>/)?.[0];
  assert(tag, 'Original icon root is missing');
  const className = tag
    .match(/class="([^"]*)"/)[1]
    .split(/\s+/)
    .filter((token) => !token.startsWith('css-'))
    .join(' ');
  assert.equal(className, observation.className.trim().split(/\s+/).join(' '));
  const generatedClass = tag
    .match(/class="([^"]*)"/)[1]
    .split(/\s+/)
    .find((token) => token.startsWith('css-'));
  const cssRule = markup.match(new RegExp('\\.' + generatedClass + '\\{([^}]+)\\}'));
  assert(cssRule, 'Original icon CSS rule is missing');
  const declarations = Object.fromEntries(
    cssRule[1]
      .split(';')
      .filter(Boolean)
      .map((entry) => {
        const colon = entry.indexOf(':');
        return [entry.slice(0, colon), entry.slice(colon + 1)];
      }),
  );
  const inlineStyle = tag.match(/style="([^"]*)"/)?.[1] ?? null;
  if (input.style)
    assert.equal(
      inlineStyle,
      Object.entries(input.style)
        .map(([key, value]) => `${key}:${value}`)
        .join(';'),
    );
  return { input, observation, className, inlineStyle, classAccesses, declarations };
});
const styledSpecs = [
  { name: 'no defaults or authored values' },
  { name: 'default style, absent own style', defaultStyle: { opacity: 0.2 } },
  {
    name: 'default style, explicit undefined own style',
    defaultStyle: { opacity: 0.2 },
    style: '$undefined',
  },
  { name: 'default style, explicit null own style', defaultStyle: { opacity: 0.2 }, style: null },
  { name: 'own style replaces default', defaultStyle: { opacity: 0.2 }, style: { opacity: 0.9 } },
  {
    name: 'own unrelated style replaces entire default',
    defaultStyle: { opacity: 0.2 },
    style: { paddingTop: 3 },
  },
  { name: 'default sx, absent own sx', defaultSx: { opacity: 0.2 } },
  { name: 'default sx with authored sx', defaultSx: { opacity: 0.2 }, sx: { opacity: 0.9 } },
  { name: 'default sx with authored null', defaultSx: { opacity: 0.2 }, sx: null },
  { name: 'default sx with explicit undefined', defaultSx: { opacity: 0.2 }, sx: '$undefined' },
  {
    name: 'nested styled default style and own sx',
    defaultStyle: { opacity: 0.2 },
    defaultSx: { paddingLeft: 1 },
    sx: { opacity: 0.9 },
    nested: true,
  },
  {
    name: 'merged default style with authored field',
    defaultStyle: { opacity: 0.2 },
    style: { paddingTop: 3 },
    merge: true,
  },
];
const styledDefaults = styledSpecs.map((input) => {
  let observation;
  const theme = createTheme({
    components: {
      mergeClassNameAndStyle: input.merge ?? false,
      MuiListItemIcon: {
        defaultProps: {
          ...(Object.hasOwn(input, 'defaultStyle') ? { style: input.defaultStyle } : {}),
          ...(Object.hasOwn(input, 'defaultSx') ? { sx: input.defaultSx } : {}),
        },
        styleOverrides: {
          root: ({ ownerState }) => {
            observation = {
              hasStyle: Object.hasOwn(ownerState, 'style'),
              style: ownerState.style ?? null,
              hasSx: Object.hasOwn(ownerState, 'sx'),
              sx: ownerState.sx ?? null,
            };
            return {};
          },
        },
      },
    },
  });
  const Base = input.nested ? styled(Icon)({ opacity: 0.6 }) : Icon;
  const Styled = styled(Base)({ opacity: 0.8 });
  const props = {
    id: 'styled-default',
    ...(Object.hasOwn(input, 'style')
      ? { style: input.style === '$undefined' ? undefined : input.style }
      : {}),
    ...(Object.hasOwn(input, 'sx') ? { sx: input.sx === '$undefined' ? undefined : input.sx } : {}),
  };
  const markup = renderToStaticMarkup(
    React.createElement(ThemeProvider, { theme }, React.createElement(Styled, props)),
  );
  const tag = markup.match(/<div[^>]*id="styled-default"[^>]*>/)?.[0];
  assert(tag);
  const generated = tag
    .match(/class="([^"]*)"/)[1]
    .split(/\s+/)
    .find((token) => token.startsWith('css-'));
  const css = markup.match(new RegExp('\\.' + generated + '\\{([^}]+)\\}'));
  assert(css);
  const declarations = Object.fromEntries(
    css[1]
      .split(';')
      .filter(Boolean)
      .map((entry) => {
        const i = entry.indexOf(':');
        return [entry.slice(0, i), entry.slice(i + 1)];
      }),
  );
  return {
    input,
    observation,
    cssOpacity: Number(declarations.opacity),
    inlineStyle: tag.match(/style="([^"]*)"/)?.[1] ?? null,
  };
});
const denseMarkup = renderToStaticMarkup(
  React.createElement(
    ThemeProvider,
    { theme: createTheme() },
    React.createElement(
      load('MenuList').default,
      { dense: true },
      React.createElement(
        load('MenuItem').default,
        null,
        React.createElement(
          Icon,
          null,
          React.createElement(
            load('SvgIcon').default,
            null,
            React.createElement('path', { d: 'M0 0h1v1z' }),
          ),
        ),
      ),
    ),
  ),
);
const denseFont = denseMarkup.match(/\.MuiListItemIcon-root svg\{font-size:([^;}]+)/)?.[1];
assert.equal(denseFont, '1.25rem');
const denseMenu = {
  fontSize: denseFont,
  renderer:
    'Executed original dense MenuItem descendant CSS; native size conversion is tested separately.',
};
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
  ...Object.getOwnPropertyNames(Object.prototype),
];
const value = {
  reference,
  utilitiesReference,
  stylingReference,
  styledDefaults,
  denseMenu,
  renderer:
    'Original React DOM static markup and theme callbacks; no native or browser geometry evidence',
  fixtures,
  component: {
    kind: typeof Icon,
    forwardRef: String(Icon.$$typeof),
    renderName: Icon.render.name,
    renderArity: Icon.render.length,
  },
  classes: classes.default,
  utilities: Object.fromEntries(
    utilitySlots.map((slot) => [slot, classes.getListItemIconUtilityClass(slot)]),
  ),
};
const provenance = {
  schemaVersion: 1,
  description:
    'Full existing ListItemIcon wrapper reference; native root/event adapters are independently authored.',
  reference,
  utilitiesReference,
  stylingReference,
  sharedNativeFiles: [
    'packages/system/src/nativeStyledMetadata.ts',
    'packages/system/src/provider.tsx',
    'packages/system/src/sx.ts',
  ],
  localFiles: [
    'packages/material/src/lists.tsx',
    'packages/material/src/listItemIconClasses.ts',
    'packages/material/src/ListItemIcon/index.ts',
  ],
  adaptations: [
    'View and native custom roots replace the DOM div and retain inherited native props/events/ref lifecycle.',
    'Original class identifiers and authored classes participate in finite self selectors and custom-root metadata; external CSS is not rendered.',
    'Native text scopes preserve container text inheritance without placing raw strings under Views; the wrapper supplies the source action.active foreground and theme.spacing(4.5) reservation.',
    'Prepared native CSS is kept separate while root defaults resolve against genuine style presence/values; sx consumption retains source behavior and callbacks see authored/default style.',
    'Native MenuItem reservation remains 36 authored units; dense SVG context converts the executed original 1.25rem rule using the authored CSS-root calibration without multiplying OS fontScale. Arbitrary parent descendant CSS and shared SvgIcon geometry are not certified by wrapper source fixtures.',
    'Native inline inset shorthands replace computed edge declarations with the existing native control merger, preserving native array semantics, inherited direction and CSS text metric provenance.',
  ],
};
for (const [file, data] of [
  ['tests/fixtures/mui-list-item-icon-9.5.0.json', value],
  ['upstream/list-item-icon.json', provenance],
]) {
  const output = await formatter.format(JSON.stringify(data), {
    ...(await formatter.resolveConfig(file)),
    parser: 'json',
  });
  if (process.argv.includes('--check'))
    assert.equal(
      await readFile(file, { encoding: 'utf8' }),
      output,
      `Pinned ListItemIcon drift: ${file}`,
    );
  else await writeFile(file, output);
}
console.log(
  `Pinned ListItemIcon: ${fixtures.length} root/context/default/class cases and ${utilitySlots.length} utility identifiers plus ${styledDefaults.length} styled/default observations passed.`,
);
