// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'package.json',
  'index.js',
  'index.d.ts',
  ...['Divider', 'dividerClasses', 'index'].flatMap((name) =>
    ['js', 'd.ts', 'd.mts'].map((ext) => `Divider/${name}.${ext}`),
  ),
  'styles/components.d.ts',
  'styles/components.d.mts',
  'styles/createThemeNoVars.d.ts',
  'styles/createThemeNoVars.d.mts',
  'styles/createThemeNoVars.js',
  'styles/styled.js',
  'styles/rootShouldForwardProp.js',
  'styles/slotShouldForwardProp.js',
  'zero-styled/index.js',
  'utils/memoTheme.js',
  'DefaultPropsProvider/DefaultPropsProvider.js',
]);
const utils = await loadReference('@mui/utils', [
  'generateUtilityClass/generateUtilityClass.js',
  'generateUtilityClasses/generateUtilityClasses.js',
  'composeClasses/composeClasses.js',
]);
const system = await loadReference('@mui/system', ['createStyled/createStyled.js']);
const React = material.require('react'),
  { renderToStaticMarkup } = material.require('react-dom/server');
const canonical = material.require('@mui/material/Divider'),
  Divider = canonical.default;
const { createTheme, ThemeProvider, styled } = material.require('@mui/material/styles');
const root = material.require('@mui/material');
assert.equal(root.Divider, Divider);
assert.equal(root.dividerClasses, canonical.dividerClasses);
assert.equal(root.getDividerUtilityClass, canonical.getDividerUtilityClass);
assert.throws(() => material.require('@mui/material/Divider/dividerClasses'), {
  code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
});
const pub = (value) =>
  typeof value === 'string'
    ? value
        .split(/\s+/)
        .filter((token) => token && !token.startsWith('css-'))
        .join(' ')
    : null;
function tag(html, id) {
  return html.match(new RegExp('<(hr|div|span|section)\\b[^>]*\\bid="' + id + '"[^>]*>'))?.[0];
}
function observation(html) {
  const rootTag = tag(html, 'divider');
  assert(rootTag);
  const wrapper = html.match(/<span\b[^>]*class="([^"]*MuiDivider-wrapper[^"]*)"[^>]*>/)?.[0];
  const classes = rootTag.match(/class="([^"]*)"/)?.[1] ?? '';
  const wrapperClasses = wrapper?.match(/class="([^"]*)"/)?.[1] ?? '';
  const rule = (list) => {
    const generated = list.split(/\s+/).find((token) => token.startsWith('css-'));
    return generated
      ? (html.match(new RegExp('\\.' + generated + '\\{([^}]+)\\}'))?.[1] ?? null)
      : null;
  };
  return {
    tag: rootTag.match(/^<(\w+)/)[1],
    className: pub(classes),
    role: rootTag.match(/\brole="([^"]*)"/)?.[1] ?? null,
    ariaOrientation: rootTag.match(/aria-orientation="([^"]*)"/)?.[1] ?? null,
    rootCss: rule(classes),
    decorationCss: html.match(/::before,[^{}]*::after\{([^{}]*align-self:[^{}]*)\}/)?.[1] ?? null,
    wrapperClass: wrapper ? pub(wrapperClasses) : null,
    wrapperCss: wrapper ? rule(wrapperClasses) : null,
    before: html.includes('::before'),
    after: html.includes('::after'),
    renderedZero: html.includes('>0<'),
    inlineStyle: rootTag.match(/\bstyle="([^"]*)"/)?.[1] ?? null,
  };
}
const inputs = [
  ['default', {}],
  ['empty-variant', { variant: '' }],
  ['true', { children: true }],
  ['absolute', { absolute: true }],
  ['inset', { variant: 'inset' }],
  ['middle', { variant: 'middle' }],
  ['vertical', { orientation: 'vertical' }],
  ['vertical-middle', { orientation: 'vertical', variant: 'middle' }],
  ['vertical-flex', { orientation: 'vertical', flexItem: true }],
  ['horizontal-flex', { flexItem: true }],
  ['text', { children: 'Notes' }],
  ['text-left', { children: 'Notes', textAlign: 'left' }],
  ['text-right', { children: 'Notes', textAlign: 'right' }],
  ['vertical-text', { orientation: 'vertical', children: 'Notes' }],
  ...['horizontal', 'vertical'].flatMap((orientation) =>
    ['flex-start', 'flex-end'].map((alignItems) => [
      `centered-${orientation}-${alignItems}`,
      { orientation, children: 'Notes', sx: { height: '40px', alignItems } },
    ]),
  ),
  ['zero', { children: 0 }],
  ['false', { children: false }],
  ['empty-string', { children: '' }],
  ['empty-array', { children: [] }],
  ['array-zero', { children: [0] }],
  [
    'custom-classes',
    {
      children: 'Notes',
      variant: 'inset',
      className: 'authored',
      classes: { root: 'chosen', inset: 'edge', wrapper: 'label' },
    },
  ],
  ['presentation', { orientation: 'vertical', role: 'presentation' }],
  ['sx', { sx: { height: 7, bgcolor: 'red' } }],
  ['inline', { style: { margin: 0, borderWidth: 2 } }],
];
const fixtures = inputs.map(([name, props]) => ({
  name,
  input: props,
  ...observation(renderToStaticMarkup(React.createElement(Divider, { ...props, id: 'divider' }))),
}));
const callback = (args) => ({
  className: pub(args.className),
  component: typeof args.ownerState.component === 'string' ? args.ownerState.component : 'custom',
  absolute: args.ownerState.absolute,
  orientation: args.ownerState.orientation,
  flexItem: args.ownerState.flexItem,
  textAlign: args.ownerState.textAlign,
  variant: args.ownerState.variant,
  role: args.ownerState.role ?? null,
  rootRole: args.role ?? null,
  ariaOrientation: args['aria-orientation'] ?? null,
  childElement: React.isValidElement(args.children),
  childClass: React.isValidElement(args.children) ? pub(args.children.props.className) : null,
  ownerStyle: args.ownerState.style ?? null,
  rootStyle: args.style ?? null,
});
const themed = [];
for (const props of [
  {},
  { orientation: 'vertical', flexItem: true, children: 'Notes', textAlign: 'left' },
  { variant: 'middle', style: { padding: 0 }, children: 'Notes' },
]) {
  const calls = [];
  const theme = createTheme({
    spacing: 10,
    components: {
      MuiDivider: {
        defaultProps: { className: 'default-root' },
        styleOverrides: {
          root: (args) => {
            calls.push({ slot: 'root', ...callback(args) });
            return { opacity: 0.7 };
          },
          wrapper: (args) => {
            calls.push({ slot: 'wrapper', ...callback(args) });
            return { paddingLeft: 13 };
          },
        },
      },
    },
  });
  const html = renderToStaticMarkup(
    React.createElement(
      ThemeProvider,
      { theme },
      React.createElement(Divider, { ...props, id: 'divider' }),
    ),
  );
  themed.push({ input: props, ...observation(html), calls });
}
const Styled = styled(Divider)({ height: 11, '&.MuiDivider-inset': { opacity: 0.3 } });
const styledFixture = observation(
  renderToStaticMarkup(
    React.createElement(Styled, {
      id: 'divider',
      variant: 'inset',
      sx: { height: 9 },
      style: { height: 8 },
    }),
  ),
);
const ref = React.createRef();
let spy;
const Custom = React.forwardRef(function Custom(props, forwarded) {
  spy = {
    className: pub(props.className),
    role: props.role,
    ariaOrientation: props['aria-orientation'],
    refSame: forwarded === ref,
    hasOwnerState: Object.hasOwn(props, 'ownerState'),
    hasSx: Object.hasOwn(props, 'sx'),
    hasClasses: Object.hasOwn(props, 'classes'),
    style: props.style,
  };
  return React.createElement('section', props);
});
renderToStaticMarkup(
  React.createElement(Divider, {
    component: Custom,
    ref,
    children: 'Notes',
    style: { padding: 0 },
  }),
);
spy.refAttachedDuringSSR = ref.current !== null;
const unrelatedSlotErrors = [];
for (const slot of ['wrapper', 'root']) {
  const marker = 'unused-' + slot + '-slot';
  const theme = createTheme({
    components: {
      MuiDivider: {
        styleOverrides: {
          [slot]: (args) => {
            if (slot === 'wrapper' || pub(args.className)?.startsWith('MuiDivider-wrapper'))
              throw new Error(marker);
            return {};
          },
        },
      },
    },
  });
  assert.throws(
    () =>
      renderToStaticMarkup(
        React.createElement(
          ThemeProvider,
          { theme },
          React.createElement(Divider, slot === 'root' ? { children: 'Notes' } : {}),
        ),
      ),
    (error) => error.message === marker,
  );
  unrelatedSlotErrors.push({
    configuredSlot: slot,
    renderedSlot: slot === 'wrapper' ? 'root' : 'wrapper',
    error: marker,
  });
}
const slots = [
  ...Object.keys(canonical.dividerClasses),
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
  '',
  'custom',
  '__proto__',
  'constructor',
  'toString',
  'hasOwnProperty',
];
const data = {
  references: [material.reference, utils.reference, system.reference],
  publicExports: {
    rootIdentity: true,
    canonical: Object.keys(canonical).sort(),
    classLeafExport: false,
  },
  classes: canonical.dividerClasses,
  utilities: Object.fromEntries(
    slots.map((slot) => [slot, canonical.getDividerUtilityClass(slot)]),
  ),
  fixtures,
  themed,
  styledFixture,
  customRoot: spy,
  unrelatedSlotErrors,
};
const target = fileURLToPath(
  new URL('../../tests/fixtures/mui-divider-9.5.0.json', import.meta.url),
);
const bytes = await prettier.format(JSON.stringify(data), { parser: 'json' });
const provenance = {
  schemaVersion: 1,
  description:
    'Finite existing Divider source contract. Source SSR is separate from native geometry/paint/accessibility/performance gates.',
  references: data.references,
  fixture: {
    path: 'tests/fixtures/mui-divider-9.5.0.json',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    rootCases: fixtures.length,
    themeCases: themed.length,
    utilityIdentifiers: slots.length,
    styledCases: 1,
    customRootSpyCases: 1,
    unusedSlotErrorCases: unrelatedSlotErrors.length,
    renderer:
      'Actual pinned React DOM SSR and forwarded-ref argument spy. SSR does not attach refs; no mounted DOM/native paint is claimed.',
  },
  localFiles: [
    'packages/material/src/divider.tsx',
    'packages/material/src/dividerTypes.ts',
    'packages/material/src/dividerClasses.ts',
    'packages/material/src/Divider/index.ts',
    'packages/material/src/styles/createTheme.ts',
    'packages/material/src/styles/props.ts',
    'packages/material/src/styles/index.ts',
    'packages/material/src/index.ts',
  ],
  adaptations: [
    'Native View roots and owned before/after line Views replace DOM hr/div and CSS decoration. Native refs/events/inline arrays retain RN semantics.',
    'Literal text keeps one line; authored child elements keep native policy and identity. Native separator role is supported; DOM aria-orientation is not certified as a native AT property.',
    'Source physical CSS margins/borders use existing native physical-geometry protection. DOM direction, theme/RTL context and web RTL stylesheet transforms remain separate inputs.',
    'Arbitrary pseudo-element selectors and adjacent-sibling MenuItem selectors remain diagnosed unsupported software exits. No general CSS grammar expansion.',
    'Original createStyled evaluates unused slot callbacks too; native evaluates selected slots once. Unrelated-slot side effects/throws and exact invocation-count parity remain an explicit shared styling software gap.',
    'Development propTypes, RSC/web metadata, browser wrapping equivalence, renderer/device/physical AT and calibrated performance gates remain open.',
  ],
};
for (const [file, value] of [
  [target, bytes],
  [
    fileURLToPath(new URL('../../upstream/divider.json', import.meta.url)),
    await prettier.format(JSON.stringify(provenance), { parser: 'json' }),
  ],
]) {
  if (process.argv.includes('--check'))
    assert.equal(await readFile(file, 'utf8'), value, 'Pinned Divider reference changed: ' + file);
  else await writeFile(file, value);
}
console.log(
  `Pinned Divider: ${fixtures.length} root cases, ${themed.length} theme cases, ${slots.length} utilities, one styled and one SSR ref-argument spy verified.`,
);
