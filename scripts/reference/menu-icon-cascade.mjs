// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as prettier from 'prettier';
// Keep the formatter's real ESM boundary visible to Node and IDE resolution.
const formatter =
  /** @type {{format(source:string,options:Record<string,unknown>):Promise<string>,resolveConfig(file:string):Promise<Record<string,unknown>|null>}} */ (
    prettier
  );
async function serialize(value, path) {
  return formatter.format(JSON.stringify(value), {
    ...(await formatter.resolveConfig(path)),
    filepath: path,
    parser: 'json',
  });
}
import { loadReference } from './load.mjs';
import { createMenuIconBrowserHtml } from './menu-icon-cascade-browser.mjs';
const { reference, require } = await loadReference('@mui/material', [
  'MenuItem/MenuItem.js',
  'MenuItem/MenuItem.d.ts',
  'MenuItem/menuItemClasses.js',
  'ListItemIcon/ListItemIcon.js',
  'ListItemIcon/ListItemIcon.d.ts',
  'SvgIcon/SvgIcon.js',
  'ButtonBase/ButtonBase.js',
]);
const { reference: systemReference } = await loadReference('@mui/system', [
  'createStyled/createStyled.js',
  'styleFunctionSx/styleFunctionSx.js',
]);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const {
  MenuItem,
  MenuList,
  ListItemIcon,
  SvgIcon,
  ThemeProvider,
  createTheme,
  styled,
} = require('@mui/material');
const css = {
  '& .MuiListItemIcon-root': { minWidth: 61, color: 'green' },
  '& .MuiListItemIcon-root svg': { fontSize: '31px' },
};
const cases = [
  { name: 'base', expected: { minWidth: 36, fontSize: 24 } },
  { name: 'dense16', dense: true, expected: { minWidth: 36, fontSize: 20 } },
  { name: 'dense20', dense: true, htmlFontSize: 20, expected: { minWidth: 36, fontSize: 25 } },
  {
    name: 'parent override child sx',
    override: css,
    iconSx: { minWidth: 80, color: 'purple' },
    svgSx: { fontSize: 45 },
    expected: { minWidth: 61, fontSize: 31, color: 'green' },
  },
  {
    name: 'parent sx child sx',
    sx: css,
    iconSx: { minWidth: 80 },
    svgSx: { fontSize: 45 },
    expected: { minWidth: 61, fontSize: 31 },
  },
  {
    name: 'parent variant child sx',
    variant: css,
    iconSx: { minWidth: 80 },
    svgSx: { fontSize: 45 },
    expected: { minWidth: 61, fontSize: 31 },
  },
  {
    name: 'custom classes',
    sx: { '& .custom-icon': { minWidth: 67 }, '& .custom-icon .custom-svg': { fontSize: 33 } },
    iconClasses: { root: 'custom-icon' },
    svgClasses: { root: 'custom-svg' },
    expected: { minWidth: 67, fontSize: 33 },
  },
  {
    name: 'selected parent self prefix',
    selected: true,
    sx: { '&.Mui-selected .MuiListItemIcon-root': { minWidth: 65 } },
    expected: { minWidth: 65 },
  },
  {
    name: 'unselected prefix does not match',
    sx: { '&.Mui-selected .MuiListItemIcon-root': { minWidth: 65 } },
    expected: { minWidth: 36 },
  },
  {
    name: 'child compound specificity tie',
    sx: { '& .MuiListItemIcon-root': { minWidth: 61 } },
    iconSx: { '&.MuiListItemIcon-root': { minWidth: 82 } },
    expected: { minWidth: 82 },
  },
  {
    name: 'parent compound specificity',
    sx: { '& .MuiListItemIcon-root.custom-icon': { minWidth: 62 } },
    iconClasses: { root: 'custom-icon' },
    iconSx: { '&.MuiListItemIcon-root': { minWidth: 82 } },
    expected: { minWidth: 62 },
  },
  {
    name: 'native inline remains final',
    sx: css,
    iconStyle: { minWidth: 83, color: 'blue' },
    svgStyle: { fontSize: 47 },
    expected: { minWidth: 83, fontSize: 47, color: 'blue' },
  },
  {
    name: 'parent native inline does not become descendant css',
    style: { minWidth: 99, fontSize: 37 },
    expected: { minWidth: 36, fontSize: 24 },
  },
  {
    name: 'icon own descendant css',
    iconSx: { '& .MuiSvgIcon-root': { fontSize: 35, color: 'orange' } },
    expected: { minWidth: 36, fontSize: 35, color: 'orange' },
  },
  {
    name: 'icon own tag equal specificity loses parent class',
    sx: { '& .MuiListItemIcon-root svg': { fontSize: 31 } },
    iconSx: { '& svg': { fontSize: 35 } },
    expected: { minWidth: 36, fontSize: 31 },
  },
  {
    name: 'parent tag breaks equal class specificity tie',
    sx: { '& .MuiListItemIcon-root svg': { fontSize: 31 } },
    iconSx: { '& .MuiSvgIcon-root': { fontSize: 35 } },
    expected: { minWidth: 36, fontSize: 31 },
  },
  {
    name: 'styled default native style',
    wrapped: true,
    defaultStyle: { opacity: 0.3 },
    expected: { minWidth: 36, fontSize: 24 },
  },
  {
    name: 'styled explicit undefined selects default',
    wrapped: true,
    defaultStyle: { opacity: 0.3 },
    style: '$undefined',
    expected: { minWidth: 36, fontSize: 24 },
  },
  {
    name: 'styled null masks native default',
    wrapped: true,
    defaultStyle: { opacity: 0.3 },
    style: null,
    expected: { minWidth: 36, fontSize: 24 },
  },
  {
    name: 'styled authored native style',
    wrapped: true,
    defaultStyle: { opacity: 0.3 },
    style: { opacity: 0.5 },
    expected: { minWidth: 36, fontSize: 24 },
  },
  {
    name: 'nested styled native default',
    wrapped: true,
    nested: true,
    defaultStyle: { opacity: 0.3 },
    expected: { minWidth: 36, fontSize: 24 },
  },
  {
    name: 'styled merged native defaults',
    wrapped: true,
    merge: true,
    defaultStyle: { opacity: 0.3, paddingLeft: 2 },
    style: { paddingLeft: 7 },
    expected: { minWidth: 36, fontSize: 24 },
  },

  {
    name: 'equal specificity initial order',
    sx: { '& .MuiListItemIcon-root': { minWidth: 61 }, '& .custom-icon': { minWidth: 67 } },
    iconClasses: { root: 'custom-icon' },
    expected: { minWidth: 67, fontSize: 24 },
  },
  {
    name: 'equal specificity reversed order',
    sx: { '& .custom-icon': { minWidth: 67 }, '& .MuiListItemIcon-root': { minWidth: 61 } },
    iconClasses: { root: 'custom-icon' },
    expected: { minWidth: 61, fontSize: 24 },
  },

  {
    name: 'inherited dense does not invent an authored dense utility class',
    inheritedDense: true,
    sx: { '&.MuiMenuItem-dense .MuiListItemIcon-root': { minWidth: 99 } },
    expected: { minWidth: 36, fontSize: 20 },
  },
  {
    name: 'ButtonBase actual root class selector',
    baseOverride: { '&.MuiButtonBase-root .MuiListItemIcon-root': { minWidth: 75 } },
    expected: { minWidth: 75, fontSize: 24 },
  },
];
// This independent finite CSS reader checks declarations emitted by original
// Emotion, including specificity and authored inline values. It deliberately
// does not model browser layout, pseudo states, media evaluation or used paint.
function sourceDeclarations(markup, styles, id) {
  const nodes = [];
  const stack = [];
  for (const match of markup
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g)) {
    if (match[1]) {
      stack.pop();
      continue;
    }
    const attributes = Object.fromEntries(
      [...match[3].matchAll(/([a-zA-Z_:][a-zA-Z0-9_:-]*)="([^"]*)"/g)].map((entry) => [
        entry[1],
        entry[2],
      ]),
    );
    const node = { tag: match[2], attributes, parent: stack.at(-1) };
    nodes.push(node);
    if (!match[3].endsWith('/') && !['input', 'br', 'hr', 'img', 'meta', 'link'].includes(node.tag))
      stack.push(node);
  }
  const target = nodes.find((node) => node.attributes.id === id);
  assert(target);
  const atom = (node, selector) => {
    const match = selector.match(/^([a-zA-Z][a-zA-Z0-9-]*)?((?:\.[a-zA-Z_][a-zA-Z0-9_-]*)*)$/);
    return Boolean(
      match &&
        (!match[1] || match[1] === node.tag) &&
        match[2]
          .split('.')
          .slice(1)
          .every((name) => (node.attributes.class ?? '').split(/\s+/).includes(name)),
    );
  };
  const matches = (node, selector) => {
    const parts = selector.trim().split(/\s+/);
    if (!atom(node, parts.pop())) return false;
    let ancestor = node.parent;
    while (parts.length) {
      const part = parts.pop();
      while (ancestor && !atom(ancestor, part)) ancestor = ancestor.parent;
      if (!ancestor) return false;
      ancestor = ancestor.parent;
    }
    return true;
  };
  const resolve = (node) => {
    const result = {};
    let order = 0;
    for (const css of styles)
      for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const specificity = rule[1]
          .split(',')
          .filter((selector) => matches(node, selector))
          .map((selector) => [
            (selector.match(/\./g) ?? []).length,
            selector
              .trim()
              .split(/\s+/)
              .filter((part) => /^[a-zA-Z]/.test(part)).length,
          ])
          .sort((a, b) => b[0] - a[0] || b[1] - a[1])[0];
        order++;
        if (!specificity) continue;
        for (const entry of rule[2].split(';')) {
          const colon = entry.indexOf(':');
          if (colon < 0) continue;
          const property = entry.slice(0, colon).trim(),
            value = entry.slice(colon + 1).trim();
          const old = result[property];
          if (
            !old ||
            specificity[0] > old.specificity[0] ||
            (specificity[0] === old.specificity[0] && specificity[1] >= old.specificity[1])
          )
            result[property] = { value, specificity, order, selector: rule[1] };
        }
      }
    for (const entry of (node.attributes.style ?? '').split(';')) {
      const colon = entry.indexOf(':');
      if (colon >= 0)
        result[entry.slice(0, colon)] = {
          value: entry.slice(colon + 1),
          specificity: null,
          inline: true,
          order: order + 1,
          selector: 'native source style attribute',
        };
    }
    return result;
  };
  const declarations = resolve(target);
  let color = declarations.color?.value;
  let parent = target.parent;
  while ((!color || color === 'inherit') && parent) {
    color = resolve(parent).color?.value;
    parent = parent.parent;
  }
  return { declarations, color };
}
const fixtures = cases.map((input) => {
  let owner;
  const theme = createTheme({
    typography: { htmlFontSize: input.htmlFontSize ?? 16 },
    components: {
      mergeClassNameAndStyle: input.merge ?? false,
      MuiButtonBase: { styleOverrides: { root: input.baseOverride ?? {} } },
      MuiMenuItem: {
        defaultProps: Object.hasOwn(input, 'defaultStyle') ? { style: input.defaultStyle } : {},
        styleOverrides: {
          root: ({ ownerState }) => {
            owner = {
              hasStyle: Object.hasOwn(ownerState, 'style'),
              style: ownerState.style ?? null,
            };
            return input.override ?? {};
          },
        },
        variants: input.variant ? [{ props: { selected: true }, style: input.variant }] : [],
      },
    },
  });
  const Root = input.wrapped
    ? input.nested
      ? styled(styled(MenuItem)({ opacity: 0.6 }))({ opacity: 0.8 })
      : styled(MenuItem)({ opacity: 0.8 })
    : MenuItem;
  const element = React.createElement(
    ThemeProvider,
    { theme },
    React.createElement(
      MenuList,
      { dense: input.inheritedDense },
      React.createElement(
        Root,
        {
          id: 'menu-root',
          dense: input.dense,
          selected: input.selected ?? Boolean(input.variant),
          sx: input.sx,
          ...(Object.hasOwn(input, 'style')
            ? { style: input.style === '$undefined' ? undefined : input.style }
            : {}),
        },
        React.createElement(
          ListItemIcon,
          { id: 'icon-root', sx: input.iconSx, style: input.iconStyle, classes: input.iconClasses },
          React.createElement(
            SvgIcon,
            { id: 'svg-root', sx: input.svgSx, style: input.svgStyle, classes: input.svgClasses },
            React.createElement('path', { d: 'M0 0h24v24H0z' }),
          ),
        ),
      ),
    ),
  );
  const markup = renderToStaticMarkup(element);
  const styles = [...markup.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]);
  const tag = (id) => markup.match(new RegExp('<[^>]+id="' + id + '"[^>]*>'))?.[0];
  assert(tag('menu-root'));
  assert(tag('icon-root'));
  assert(tag('svg-root'));
  const iconCSS = sourceDeclarations(markup, styles, 'icon-root'),
    svgCSS = sourceDeclarations(markup, styles, 'svg-root');
  const usedLength = (value) =>
    Number.parseFloat(value) * (value.endsWith('rem') ? (input.htmlFontSize ?? 16) : 1);
  assert.equal(
    usedLength(iconCSS.declarations['min-width'].value),
    input.expected.minWidth,
    input.name + ' original minWidth',
  );
  assert.equal(
    usedLength(svgCSS.declarations['font-size'].value),
    input.expected.fontSize ?? 24,
    input.name + ' original fontSize',
  );
  if (input.expected.color)
    assert.equal(svgCSS.color, input.expected.color, input.name + ' original color');
  return {
    input,
    owner,
    originalSpecificity: { icon: iconCSS, svg: svgCSS },
    root: tag('menu-root'),
    icon: tag('icon-root'),
    svg: tag('svg-root'),
    styles,
    markup,
  };
});
assert(fixtures[0].styles.some((css) => /\.MuiListItemIcon-root\{min-width:36px;/.test(css)));
assert(
  fixtures[1].styles.some((css) => /\.MuiListItemIcon-root svg\{font-size:1.25rem;/.test(css)),
);
assert(fixtures[3].styles.some((css) => /\.MuiListItemIcon-root svg\{font-size:31px;/.test(css)));
const output = {
  schemaVersion: 1,
  reference,
  systemReference,
  renderer:
    'Pinned original React DOM static markup and emitted styles. Expected values describe CSS specificity and require independent browser/native checks; this record does not claim browser geometry.',
  fixtures,
};
const target = 'tests/fixtures/mui-menu-icon-cascade-9.5.0.json';
const serialized = await serialize(output, target);
if (process.argv.includes('--check')) assert.equal(await readFile(target, 'utf8'), serialized);
else await writeFile(target, serialized);
const provenance = {
  schemaVersion: 1,
  description:
    'Bounded existing MenuItem descendant cascade; finite native selectors use the existing Portal-aware physical style registry.',
  reference,
  systemReference,
  localFiles: [
    'packages/material/src/menuItem.tsx',
    'packages/material/src/lists.tsx',
    'packages/material/src/svgIcon.tsx',
    'packages/material/src/nativeStyleScope.tsx',
    'packages/material/src/buttonGroupContext.ts',
    'packages/system/src/sx.ts',
    'packages/system/src/nativeStyledMetadata.ts',
  ],
  sourceFixture: { path: target, sha256: createHash('sha256').update(serialized).digest('hex') },
  limits: [
    'Only participating Material roots expose class metadata.',
    'No arbitrary DOM selector engine or complete MenuItem focus/keyboard contract claim.',
    'Original static markup proves emitted selectors/declarations; browser used-style and native layout are separate gates.',
  ],
};
const record = await serialize(provenance, 'upstream/menu-icon-cascade.json');
if (process.argv.includes('--check'))
  assert.equal(await readFile('upstream/menu-icon-cascade.json', 'utf8'), record);
else await writeFile('upstream/menu-icon-cascade.json', record);
console.log(
  'Original MenuItem/Icon descendant reference: ' +
    fixtures.length +
    ' cases, archive/source/license verified.',
);

if (process.argv.includes('--browser-output')) {
  const path = '.cache/menu-icon-cascade-reference/browser.html';
  await mkdir('.cache/menu-icon-cascade-reference', { recursive: true });
  const html = createMenuIconBrowserHtml({ ...output, sourceFixture: provenance.sourceFixture });
  await writeFile(path, html);
  console.log(
    'Original used-style browser page: ' +
      path +
      ' · ' +
      createHash('sha256').update(html).digest('hex'),
  );
}
