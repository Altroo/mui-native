// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { loadReference } from './load.mjs';
const formatter =
  /** @type {{format(source:string,options:Record<string,unknown>):Promise<string>,resolveConfig(file:string):Promise<Record<string,unknown>|null>}} */ (
    prettier
  );
const material = await loadReference('@mui/material', [
  'package.json',
  'index.js',
  'index.d.ts',
  'index.d.mts',
  ...['AccordionDetails', 'index', 'accordionDetailsClasses'].flatMap((name) =>
    ['js', 'd.ts', 'd.mts'].map((extension) => `AccordionDetails/${name}.${extension}`),
  ),
  'internal/index.d.ts',
  'internal/index.d.mts',
  'styles/styled.js',
  'styles/rootShouldForwardProp.js',
  'styles/slotShouldForwardProp.js',
  'utils/memoTheme.js',
  'zero-styled/index.js',
  'DefaultPropsProvider/DefaultPropsProvider.js',
]);
const utils = await loadReference('@mui/utils', [
  'generateUtilityClass/generateUtilityClass.js',
  'composeClasses/composeClasses.js',
  'resolveProps/resolveProps.js',
]);
const system = await loadReference('@mui/system', [
  'createStyled/createStyled.js',
  'createStyled/createStyled.d.ts',
  'createStyled/createStyled.d.mts',
  'DefaultPropsProvider/DefaultPropsProvider.js',
  'styleFunctionSx/styleFunctionSx.js',
]);
const React = material.require('react');
const { renderToStaticMarkup } = material.require('react-dom/server');
const canonical = material.require('@mui/material/AccordionDetails'),
  Details = canonical.default;
const root = material.require('@mui/material');
const { createTheme, ThemeProvider, styled } = material.require('@mui/material/styles');
const exportsMap = material.require('@mui/material/package.json').exports;
assert.equal(root.AccordionDetails, Details);
assert.equal(root.accordionDetailsClasses, canonical.accordionDetailsClasses);
assert.equal(root.getAccordionDetailsUtilityClass, canonical.getAccordionDetailsUtilityClass);
assert(exportsMap['./AccordionDetails']);
assert.equal(exportsMap['./AccordionDetails/accordionDetailsClasses'], undefined);
assert.throws(() => material.require('@mui/material/AccordionDetails/accordionDetailsClasses'), {
  code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
});
const decode = (props = {}) =>
  Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, value === '$undefined' ? undefined : value]),
  );
const publicClass = (value) =>
  value == null
    ? null
    : String(value)
        .split(/\s+/)
        .filter((token) => token && !token.startsWith('css-'))
        .join(' ');
const observe = (args) => ({
  ownerClass: publicClass(args.ownerState.className),
  rootClass: publicClass(args.className),
  id: args.id,
  hasOwnerStyle: Object.hasOwn(args.ownerState, 'style'),
  ownerStyle: args.ownerState.style ?? null,
  hasOwnerSx: Object.hasOwn(args.ownerState, 'sx'),
  ownerSx: args.ownerState.sx ?? null,
  rootStyle: args.style ?? null,
  direction: args.theme.direction,
});
function markupObservation(markup, id) {
  const tag = markup.match(new RegExp('<div\\b[^>]*\\bid="' + id + '"[^>]*>'))?.[0];
  assert(tag, 'Original Details root missing');
  const classes = tag.match(/class="([^"]*)"/)?.[1] ?? '',
    generated = classes.split(/\s+/).find((token) => token.startsWith('css-'));
  const css = markup.match(new RegExp('\\.' + generated + '\\{([^}]+)\\}'))?.[1];
  assert(css, 'Original Details CSS missing');
  return {
    className: publicClass(classes),
    declarations: Object.fromEntries(
      css
        .split(';')
        .filter(Boolean)
        .map((entry) => {
          const i = entry.indexOf(':');
          return [entry.slice(0, i), entry.slice(i + 1)];
        }),
    ),
    inlineStyle: tag.match(/style="([^"]*)"/)?.[1] ?? null,
  };
}
const inputs = [
  { name: 'source defaults' },
  { name: 'authored classes', props: { classes: { root: 'chosen' }, className: 'authored' } },
  { name: 'class getter timing', classGetter: true, className: ' authored ' },
  { name: 'numeric spacing', spacing: 10 },
  { name: 'array spacing', spacing: [0, 3, 7] },
  { name: 'rem spacing', spacing: 'rem' },
  {
    name: 'theme defaults',
    defaults: {
      className: 'theme',
      classes: { root: 'theme-root' },
      style: { opacity: 0.2 },
      sx: { paddingTop: 2 },
    },
  },
  {
    name: 'own values replace defaults',
    defaults: { className: 'theme', classes: { root: 'theme-root' }, style: { opacity: 0.2 } },
    props: { className: 'own', classes: { root: 'own-root' }, style: { paddingTop: 3 } },
  },
  {
    name: 'explicit undefined selects defaults',
    defaults: { className: 'theme', style: { opacity: 0.2 }, sx: { paddingTop: 2 } },
    props: { className: '$undefined', style: '$undefined', sx: '$undefined' },
  },
  {
    name: 'opt-in class and plain style merge',
    merge: true,
    defaults: { className: 'theme', style: { opacity: 0.2, paddingTop: 9 } },
    props: { className: 'own', style: { paddingTop: 3 } },
  },
  {
    name: 'root override then sx',
    overrides: { paddingTop: 7, opacity: 0.4 },
    props: { sx: { paddingTop: 2, opacity: 0.8 } },
  },
  {
    name: 'inline resets CSS edges',
    overrides: { paddingTop: 7, paddingLeft: 9 },
    props: { style: { padding: 0 } },
  },
  {
    name: 'predicate variant owner values override root collisions',
    variant: true,
    props: { className: 'authored', classes: { root: 'chosen' } },
  },
  { name: 'embedded root variants', embedded: true },
];
const fixtures = inputs.map((input) => {
  let observation;
  const variantArguments = [],
    classAccesses = [];
  const props = { id: 'details-reference', ...decode(input.props) };
  if (input.classGetter) {
    props.className = input.className;
    props.classes = Object.defineProperty({}, 'root', {
      enumerable: true,
      get() {
        classAccesses.push('root');
        return 'getter-' + classAccesses.length;
      },
    });
  }
  const theme = createTheme({
    spacing: input.spacing === 'rem' ? (value) => `${value * 0.25}rem` : (input.spacing ?? 8),
    components: {
      mergeClassNameAndStyle: input.merge ?? false,
      MuiAccordionDetails: {
        defaultProps: input.defaults,
        styleOverrides: {
          root: (args) => {
            observation = observe(args);
            return {
              ...input.overrides,
              ...(input.embedded
                ? {
                    variants: [
                      {
                        props: { id: 'details-reference' },
                        style: ({ ownerState }) => ({
                          minWidth: ownerState.id === 'details-reference' ? 37 : 0,
                        }),
                      },
                    ],
                  }
                : {}),
            };
          },
        },
        variants: input.variant
          ? [
              {
                props: (args) => {
                  variantArguments.push(observe(args));
                  return publicClass(args.className) === 'authored';
                },
                style: (args) => {
                  variantArguments.push(observe(args));
                  return { opacity: 0.45, minWidth: 33 };
                },
              },
            ]
          : [],
      },
    },
  });
  const markup = renderToStaticMarkup(
    React.createElement(ThemeProvider, { theme }, React.createElement(Details, props, 'Body')),
  );
  return {
    input,
    observation,
    variantArguments,
    classAccesses,
    ...markupObservation(markup, 'details-reference'),
  };
});
const styledInputs = [
  { name: 'no defaults or own style' },
  { name: 'default style absent own', defaultStyle: { opacity: 0.2 } },
  { name: 'default style own undefined', defaultStyle: { opacity: 0.2 }, style: '$undefined' },
  { name: 'default style own null', defaultStyle: { opacity: 0.2 }, style: null },
  { name: 'own style replaces default', defaultStyle: { opacity: 0.2 }, style: { opacity: 0.9 } },
  {
    name: 'unrelated own style replaces entire default',
    defaultStyle: { opacity: 0.2 },
    style: { paddingTop: 3 },
  },
  { name: 'default sx consumed by outer styled', defaultSx: { opacity: 0.2 } },
  {
    name: 'authored sx consumed by outer styled',
    defaultSx: { opacity: 0.2 },
    sx: { opacity: 0.9 },
  },
  { name: 'authored null sx', defaultSx: { opacity: 0.2 }, sx: null },
  { name: 'authored undefined sx', defaultSx: { opacity: 0.2 }, sx: '$undefined' },
  {
    name: 'nested styled with defaults',
    defaultStyle: { opacity: 0.2 },
    defaultSx: { paddingLeft: 1 },
    sx: { opacity: 0.9 },
    nested: true,
  },
  {
    name: 'opt-in merged style under styled',
    defaultStyle: { opacity: 0.2 },
    style: { paddingTop: 3 },
    merge: true,
  },
];
const styledDefaults = styledInputs.map((input) => {
  let observation;
  const theme = createTheme({
    components: {
      mergeClassNameAndStyle: input.merge ?? false,
      MuiAccordionDetails: {
        defaultProps: {
          ...(Object.hasOwn(input, 'defaultStyle') ? { style: input.defaultStyle } : {}),
          ...(Object.hasOwn(input, 'defaultSx') ? { sx: input.defaultSx } : {}),
        },
        styleOverrides: {
          root: (args) => {
            observation = observe(args);
            return {};
          },
        },
      },
    },
  });
  const Base = input.nested ? styled(Details)({ opacity: 0.6 }) : Details,
    Wrapped = styled(Base)({ opacity: 0.8 });
  const props = {
    id: 'styled-details',
    ...decode(
      Object.fromEntries(
        ['style', 'sx'].filter((key) => Object.hasOwn(input, key)).map((key) => [key, input[key]]),
      ),
    ),
  };
  const markup = renderToStaticMarkup(
    React.createElement(ThemeProvider, { theme }, React.createElement(Wrapped, props, 'Body')),
  );
  return { input, observation, ...markupObservation(markup, 'styled-details') };
});
let customRoot;
const requestedRef = React.createRef(),
  authoredStyle = { padding: 0 },
  click = () => {};
const Custom = React.forwardRef(function OriginalDetailsRoot(props, ref) {
  customRoot = {
    className: publicClass(props.className),
    refArgument: ref === requestedRef ? 'requested' : ref == null ? 'not supplied by SSR' : 'other',
    styleIdentity: props.style === authoredStyle,
    onClickIdentity: props.onClick === click,
    filtered: ['ownerState', 'sx', 'as', 'theme', 'classes'].filter((key) =>
      Object.hasOwn(props, key),
    ),
  };
  return React.createElement('div', props);
});
renderToStaticMarkup(
  React.createElement(
    Details,
    {
      as: Custom,
      ref: requestedRef,
      id: 'custom-details',
      classes: { root: 'chosen' },
      className: 'authored',
      style: authoredStyle,
      sx: { opacity: 0.7 },
      onClick: click,
    },
    'Body',
  ),
);
assert.deepEqual(customRoot.filtered, []);
assert.equal(customRoot.styleIdentity, true);
assert.equal(customRoot.onClickIdentity, true);
const slots = [
  'root',
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
const value = {
  references: [material.reference, utils.reference, system.reference],
  publicExports: {
    rootIdentity: true,
    canonical: true,
    originalClassLeafExport: false,
    nativeExistingClassLeafAlias: true,
  },
  classes: canonical.accordionDetailsClasses,
  utilities: Object.fromEntries(
    slots.map((slot) => [slot, canonical.getAccordionDetailsUtilityClass(slot)]),
  ),
  fixtures,
  styledDefaults,
  customRoot,
};
const target = fileURLToPath(
  new URL('../../tests/fixtures/mui-accordion-details-9.5.0.json', import.meta.url),
);
const bytes = await formatter.format(JSON.stringify(value), {
  ...(await formatter.resolveConfig(target)),
  parser: 'json',
});
const provenance = {
  schemaVersion: 1,
  description:
    'Finite existing AccordionDetails source contract; SSR observations are separate from renderer/device gates.',
  references: value.references,
  fixture: {
    path: 'tests/fixtures/mui-accordion-details-9.5.0.json',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    originalCases: fixtures.length,
    styledDefaultCases: styledDefaults.length,
    utilityIdentifiers: slots.length,
    customRootSpyCases: 1,
    renderer:
      'Actual pinned React DOM SSR, theme callbacks and forwarded-root spy. No DOM mount/ref attachment, browser computed geometry or native device certification.',
  },
  localFiles: [
    'packages/material/src/accordion.tsx',
    'packages/material/src/accordionTypes.ts',
    'packages/material/src/accordionClasses.ts',
  ],
  sharedNativeFiles: [
    'packages/system/src/nativeStyledMetadata.ts',
    'packages/system/src/provider.tsx',
    'packages/system/src/sx.ts',
    'packages/material/src/nativeControlStyles.ts',
  ],
  adaptations: [
    'Native View/native component replace DOM div/HTML refs; source as-based spy establishes metadata filtering, not a new native as prop.',
    'Only Details runtime/class/type changes; Accordion, Summary, Actions and generic Frame are preserved.',
    'Generated Emotion hash classes are excluded from public class observations; original MUI and authored classes select supported root styles.',
    'Native arrays and registered styles retain RN precedence; shared inline cleanup and text metric provenance remain bounded native adapters.',
    'Development propTypes, RSC/web metadata, arbitrary browser CSS and physical renderer/assistive/performance gates remain outside source-only validation.',
  ],
};
for (const [file, data] of [
  [target, bytes],
  [
    fileURLToPath(new URL('../../upstream/accordion-details.json', import.meta.url)),
    await formatter.format(JSON.stringify(provenance), { parser: 'json' }),
  ],
]) {
  if (process.argv.includes('--check'))
    assert.equal(
      await readFile(file, 'utf8'),
      data,
      'Pinned AccordionDetails reference changed: ' + file,
    );
  else await writeFile(file, data);
}
console.log(
  `Pinned AccordionDetails: ${fixtures.length} root/default/callback cases, ${styledDefaults.length} styled-default cases, ${slots.length} utility identifiers and one forwarded-root spy verified.`,
);
