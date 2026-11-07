// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as prettier from 'prettier';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  ...['Box', 'boxClasses', 'index'].flatMap((name) =>
    ['js', 'd.ts', 'd.mts'].map((ext) => `Box/${name}.${ext}`),
  ),
  'className/index.js',
  'className/index.d.ts',
  'styles/identifier.js',
  'OverridableComponent/index.d.ts',
]);
const system = await loadReference('@mui/system', [
  'createBox/createBox.js',
  'createBox/createBox.d.ts',
  'Box/Box.d.ts',
  'Box/Box.d.mts',
  'styleFunctionSx/styleFunctionSx.js',
  'styleFunctionSx/defaultSxConfig.js',
  'createStyled/createStyled.js',
]);
const utils = await loadReference('@mui/utils', [
  'ClassNameGenerator/ClassNameGenerator.js',
  'ClassNameGenerator/ClassNameGenerator.d.ts',
  'generateUtilityClass/generateUtilityClass.js',
  'generateUtilityClasses/generateUtilityClasses.js',
]);
const React = material.require('react'),
  { renderToStaticMarkup } = material.require('react-dom/server');
const Box = material.require('@mui/material/Box').default,
  { boxClasses } = material.require('@mui/material/Box');
const { ThemeProvider, createTheme, useTheme, styled } = material.require('@mui/material/styles');
const { unstable_ClassNameGenerator: generator } = material.require('@mui/material/className');
assert.equal(Box, material.require('@mui/material').Box);
assert.equal(boxClasses, material.require('@mui/material').boxClasses);
const publicClasses = (value) =>
  value
    .split(/\s+/)
    .filter((x) => x && !x.startsWith('css-'))
    .join(' ');
function observe(html, id = 'box') {
  const tag = html.match(new RegExp('<(div|section|article)[^>]*\\bid="' + id + '"[^>]*>'))?.[0];
  assert(tag, html);
  const classes = tag.match(/class="([^"]*)"/)?.[1] ?? '';
  const generated = classes.split(/\s+/).find((x) => x.startsWith('css-'));
  return {
    tag: tag.match(/^<(\w+)/)[1],
    className: publicClasses(classes),
    style: tag.match(/ style="([^"]*)"/)?.[1] ?? null,
    css: generated
      ? (html.match(new RegExp('\\.' + generated + '\\{([^}]+)\\}'))?.[1] ?? null)
      : null,
  };
}
const render = (props, theme) =>
  renderToStaticMarkup(
    React.createElement(
      ThemeProvider,
      { theme: theme ?? createTheme() },
      React.createElement(Box, { id: 'box', ...props }),
    ),
  );
const roots = [
  ['default', {}],
  ['undefined-root', { component: undefined }],
  ['section', { component: 'section' }],
  ['class', { className: 'chosen' }],
  ['sx', { sx: { p: 2, m: 1, color: 'primary.main' } }],
  ['inline', { sx: { paddingLeft: 20 }, style: { padding: 0 } }],
  ['top-level-system', { p: 2, m: 3 }],
].map(([name, props]) => ({ name, ...observe(render(props)) }));
const forwards = [];
const Custom = React.forwardRef((props, ref) => {
  forwards.push({
    keys: Object.keys(props).sort(),
    className: publicClasses(props.className),
    p: props.p ?? null,
    ownerState: props.ownerState ?? null,
    hasSx: Object.hasOwn(props, 'sx'),
    hasTheme: Object.hasOwn(props, 'theme'),
    hasAs: Object.hasOwn(props, 'as'),
    style: props.style ?? null,
    refSame: ref === forwarded,
  });
  const { ownerState: _owner, ...host } = props;
  return React.createElement('section', host);
});
const forwarded = React.createRef();
render({
  component: Custom,
  ref: forwarded,
  p: 7,
  ownerState: { chosen: true },
  sx: { opacity: 0.6 },
  style: { padding: 0 },
});
const generatorCases = [];
for (const mode of ['prefix', 'reset']) {
  if (mode === 'prefix') generator.configure((name) => 'custom-' + name);
  else generator.reset();
  generatorCases.push({ mode, ...observe(render({ className: 'chosen' })) });
}
generator.reset();
const themeCases = [];
for (const scoped of [false, true])
  for (const override of ['absent', 'undefined', 'null', 'explicit']) {
    let observed = null;
    const base = createTheme({ boxAccent: 0.3 }),
      explicit = createTheme({ boxAccent: 0.7 });
    const props = {
      component: Custom,
      sx: (theme) => {
        observed = {
          accent: theme.boxAccent ?? null,
          scopedAccent: theme.$$material?.boxAccent ?? null,
          isExplicit: theme === explicit,
        };
        return { opacity: observed.accent ?? 0.1 };
      },
    };
    if (override !== 'absent')
      props.theme = override === 'explicit' ? explicit : override === 'null' ? null : undefined;
    const result = observe(render(props, scoped ? { $$material: base } : base));
    themeCases.push({ scoped, override, observed, ...result });
  }
let unusedComponents = { error: null, reads: 0 };
function Armed() {
  const theme = useTheme();
  Object.defineProperty(theme, 'components', {
    configurable: true,
    get() {
      unusedComponents.reads++;
      throw Error('unused-components');
    },
  });
  return React.createElement(Box, { id: 'box', sx: { opacity: 0.4 } });
}
try {
  unusedComponents = {
    ...unusedComponents,
    ...observe(
      renderToStaticMarkup(
        React.createElement(ThemeProvider, { theme: createTheme() }, React.createElement(Armed)),
      ),
    ),
  };
} catch (error) {
  unusedComponents.error = error.message;
}
const Styled = styled(Box)({
  opacity: 0.2,
  '&.MuiBox-root': { opacity: 0.7 },
  '& .MuiBox-root': { letterSpacing: 2 },
});
const styledHtml = renderToStaticMarkup(
  React.createElement(
    Styled,
    { id: 'box', sx: { opacity: 0.8 }, style: { opacity: 0.9 } },
    React.createElement(Box, { id: 'inner' }, 'Nested'),
  ),
);
const data = {
  references: [material.reference, system.reference, utils.reference],
  classes: boxClasses,
  roots,
  forwards: forwards.slice(0, 1),
  generatorCases,
  themeCases,
  unusedComponents,
  styled: { root: observe(styledHtml), inner: observe(styledHtml, 'inner') },
};
const fixture = 'tests/fixtures/mui-box-9.5.0.json';
const format = { ...(await prettier.resolveConfig(fixture)), parser: 'json' };
const bytes = await prettier.format(JSON.stringify(data), format);
const provenance = {
  schemaVersion: 1,
  references: data.references,
  fixture: { path: fixture, sha256: createHash('sha256').update(bytes).digest('hex') },
  boundary:
    'Finite Material Box native source/software contract; no DOM or full native certification.',
  localFiles: [
    'packages/material/src/nativeBox.tsx',
    'packages/material/src/boxTypes.ts',
    'packages/material/src/boxClasses.ts',
    'packages/material/src/classNameGenerator.ts',
    'packages/material/src/className/index.ts',
  ],
  adaptations: [
    'Native View/div alias and native root refs replace DOM roots.',
    'Pinned9.5 Box does not consume top-level system props or MuiBox defaults/overrides.',
    'Native prop/ref/type-map helpers preserve root requirements; known custom-root spreads are checked more strictly than the original fallback overload. Reserved overrides require a complete native Theme; scoped raw null/undefined overrides diagnose only in development and retain the selected native theme.',
    'Box participates in the canonical class generator facade. Additional participating families are recorded in their own source/software contracts.',
  ],
};
const reuse = JSON.parse(await readFile('upstream/reuse.json', 'utf8'));
const localReferences = [
  ['packages/material/src/nativeBox.tsx', system.reference, ['createBox/createBox.js']],
  [
    'packages/material/src/nativeBox.tsx',
    material.reference,
    ['Box/Box.js', 'styles/identifier.js'],
  ],
  [
    'packages/material/src/className/index.ts',
    material.reference,
    ['className/index.js', 'className/index.d.ts'],
  ],
  ['packages/material/src/boxTypes.ts', material.reference, ['Box/Box.d.ts', 'Box/Box.d.mts']],
  ['packages/material/src/boxTypes.ts', system.reference, ['Box/Box.d.ts', 'Box/Box.d.mts']],
  [
    'packages/material/src/boxClasses.ts',
    material.reference,
    ['Box/boxClasses.js', 'Box/boxClasses.d.ts'],
  ],
  [
    'packages/material/src/classNameGenerator.ts',
    utils.reference,
    ['ClassNameGenerator/ClassNameGenerator.js', 'ClassNameGenerator/ClassNameGenerator.d.ts'],
  ],
  [
    'packages/system/src/sx.ts',
    system.reference,
    ['createBox/createBox.js', 'createStyled/createStyled.js'],
  ],
];
// Other shared-resolver adaptations keep their own provenance entries.
reuse.entries = reuse.entries.filter(
  (entry) => !entry.adaptations?.some((note) => note.startsWith('Box source/software contract:')),
);
for (const [localFile, reference, files] of localReferences)
  reuse.entries.push({
    localFile,
    reference: {
      ...reference,
      sourceFiles: Object.fromEntries(files.map((file) => [file, reference.sourceFiles[file]])),
    },
    adaptations: [
      'Box source/software contract: finite native root/classes/filtering/type behavior is recorded in upstream/box.json. Anonymous roots skip component configuration; named-root ordering is unchanged. No native device, DOM or full compatibility certification.',
    ],
  });
for (const [name, value] of [
  [fixture, bytes],
  ['upstream/box.json', await prettier.format(JSON.stringify(provenance), format)],
  ['upstream/reuse.json', await prettier.format(JSON.stringify(reuse), format)],
]) {
  if (process.argv.includes('--check')) assert.equal(await readFile(name, 'utf8'), value);
  else await writeFile(name, value);
}
console.log(
  'Pinned Box: root/classes/filtering/generator/scoped-theme/unused-components observations verified.',
);
