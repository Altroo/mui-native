// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import * as prettier from 'prettier';
import { loadReference } from './load.mjs';
import { replaceUniqueLocalFileEntries } from '../upstream/reuse.mjs';
const jsonFormat = {
  ...(await prettier.resolveConfig('tests/fixtures/mui-paper-9.5.0.json')),
  parser: 'json',
};
const material = await loadReference('@mui/material', [
  ...['Paper', 'paperClasses', 'index'].flatMap((name) =>
    ['js', 'd.ts', 'd.mts'].map((ext) => `Paper/${name}.${ext}`),
  ),
  'styles/getOverlayAlpha.js',
  'styles/getOverlayAlpha.d.ts',
  'transitions/utils.js',
  'styles/components.d.ts',
  'styles/props.d.ts',
  'styles/overrides.d.ts',
  'Accordion/Accordion.d.ts',
  'Dialog/Dialog.d.ts',
  'zero-styled/index.js',
  'styles/styled.js',
  'styles/rootShouldForwardProp.js',
  'utils/memoTheme.js',
  'DefaultPropsProvider/DefaultPropsProvider.js',
]);
const utils = await loadReference('@mui/utils', [
  'composeClasses/composeClasses.js',
  'generateUtilityClass/generateUtilityClass.js',
  'generateUtilityClasses/generateUtilityClasses.js',
]);
const system = await loadReference('@mui/system', [
  'createStyled/createStyled.js',
  'styleFunctionSx/styleFunctionSx.js',
  'styleFunctionSx/defaultSxConfig.js',
  'style/style.js',
]);
const React = material.require('react'),
  { renderToStaticMarkup } = material.require('react-dom/server');
const canonical = material.require('@mui/material/Paper'),
  Paper = canonical.default;
const { createTheme, ThemeProvider, styled, useTheme } = material.require('@mui/material/styles');
assert.equal(material.require('@mui/material').Paper, Paper);
assert.equal(material.require('@mui/material').paperClasses, canonical.paperClasses);
const getOverlayAlpha = material.require(
  resolve(material.directory, 'node_modules/@mui/material/styles/getOverlayAlpha.js'),
).default;
const pub = (text) =>
  text
    .split(/\s+/)
    .filter((value) => value && !value.startsWith('css-'))
    .join(' ');
function observation(html) {
  const tag = html.match(/<(div|section)\b[^>]*\bid="paper"[^>]*>/)?.[0];
  assert(tag, html);
  const classes = tag.match(/class="([^"]*)"/)?.[1] ?? '';
  const cssClass = classes.split(/\s+/).find((name) => name.startsWith('css-'));
  const inline = tag.match(/ style="([^"]*)"/)?.[1] ?? null;
  return {
    tag: tag.match(/^<(\w+)/)[1],
    className: pub(classes),
    css: cssClass
      ? (html.match(new RegExp('\\.' + cssClass + '\\{([^}]+)\\}'))?.[1] ?? null)
      : null,
    style: inline,
    shadow: inline?.match(/--Paper-shadow:([^;]*)/)?.[1] ?? null,
  };
}
const render = (input, theme) =>
  renderToStaticMarkup(
    theme
      ? React.createElement(
          ThemeProvider,
          { theme },
          React.createElement(Paper, { ...input, id: 'paper' }),
        )
      : React.createElement(Paper, { ...input, id: 'paper' }),
  );
const inputs = [
  ['default', {}],
  ['outlined', { variant: 'outlined' }],
  ['square', { square: true }],
  ['outlined-square', { variant: 'outlined', square: true }],
  ['custom-variant', { variant: 'glass' }],
  ['empty-variant', { variant: '' }],
  [
    'classes',
    {
      elevation: 3,
      className: 'authored',
      classes: { root: 'chosen', rounded: 'round', elevation: 'depth', elevation3: 'three' },
    },
  ],
  ...Array.from({ length: 25 }, (_, elevation) => ['elevation' + elevation, { elevation }]),
];
const fixtures = inputs.map(([name, input]) => ({ name, input, ...observation(render(input)) }));
const dark = Array.from({ length: 25 }, (_, elevation) => ({
  elevation,
  alpha: getOverlayAlpha(elevation),
  ...observation(render({ elevation }, createTheme({ palette: { mode: 'dark' } }))),
}));
const args = (input) => ({
  className: pub(input.className),
  component: typeof input.ownerState.component === 'string' ? input.ownerState.component : 'custom',
  elevation: input.ownerState.elevation,
  square: input.ownerState.square,
  variant: input.ownerState.variant,
  rootStyle: input.style ?? null,
  ownerStyle: input.ownerState.style ?? null,
  rootHasElevation: Object.hasOwn(input, 'elevation'),
  as: typeof input.as === 'string' ? input.as : 'custom',
});
const themed = [];
for (const input of [
  {},
  { square: true },
  { variant: 'outlined', elevation: 3 },
  { elevation: 3, style: { padding: 0 } },
]) {
  const calls = [];
  const styles = Object.fromEntries(
    ['root', 'rounded', 'elevation', 'outlined', 'elevation3'].map((slot, index) => [
      slot,
      (p) => {
        calls.push({ slot, args: args(p) });
        return { opacity: (index + 1) / 10 };
      },
    ]),
  );
  const theme = createTheme({
    components: {
      MuiPaper: {
        styleOverrides: styles,
        variants: [{ props: { elevation: 3 }, style: { padding: 7 } }],
      },
    },
  });
  themed.push({ input, calls, ...observation(render(input, theme)) });
}
const defaultsTheme = createTheme({
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 3,
        square: true,
        variant: 'outlined',
        classes: { root: 'default-root' },
      },
    },
  },
});
const defaults = observation(render({}, defaultsTheme));
const Styled = styled(Paper)({
  opacity: 0.2,
  '&.MuiPaper-elevation3': { opacity: 0.7 },
  '& .MuiTypography-root': { letterSpacing: 2 },
});
const styledFixture = observation(
  renderToStaticMarkup(
    React.createElement(Styled, {
      id: 'paper',
      elevation: 3,
      sx: { opacity: 0.8 },
      style: { opacity: 0.9 },
    }),
  ),
);
let customRoot;
const ref = React.createRef();
const Custom = React.forwardRef((props, forwarded) => {
  customRoot = {
    className: pub(props.className),
    style: props.style,
    refSame: forwarded === ref,
    hasOwnerState: Object.hasOwn(props, 'ownerState'),
    hasSx: Object.hasOwn(props, 'sx'),
    hasClasses: Object.hasOwn(props, 'classes'),
  };
  return React.createElement('section', props);
});
render({ component: Custom, ref, elevation: 3, style: { padding: 0 } });
const utilitySlots = [
  ...Object.keys(canonical.paperClasses),
  'disabled',
  'selected',
  '',
  'custom',
  '__proto__',
  'constructor',
  'toString',
  'hasOwnProperty',
];
// Retain the native API path as source evidence; actual parser equivalence is tested
// with the installed RN implementation, independently of original MUI SSR.
const require = createRequire(import.meta.url),
  rnRoot = resolve(require.resolve('react-native/package.json'), '..');
const rn = JSON.parse(await readFile(resolve(rnRoot, 'package.json'), 'utf8'));
assert.equal(rn.version, '0.88.1');
const nativeFiles = [
  'types_generated/Libraries/StyleSheet/StyleSheetTypes.d.ts',
  'Libraries/Components/View/ReactNativeStyleAttributes.js',
  'Libraries/StyleSheet/processBackgroundImage.js',
  'ReactCommon/react/renderer/components/view/BaseViewProps.cpp',
  'ReactCommon/react/renderer/components/view/BackgroundImagePropsConversions.h',
  'ReactCommon/react/renderer/components/view/BackgroundImagePropsConversions.cpp',
  'LICENSE',
];
const nativeSource = Object.fromEntries(
  await Promise.all(
    nativeFiles.map(async (file) => [
      file,
      createHash('sha256')
        .update(await readFile(resolve(rnRoot, file)))
        .digest('hex'),
    ]),
  ),
);
// Arm accessors after theme construction/provider setup so merge cannot consume
// them. These observations exercise the actual original Paper, not a restatement.
const shadowAccess = [];
for (const mode of ['production', 'development']) {
  for (const [variant, behavior] of [
    ['outlined', 'throw-first'],
    ['glass', 'throw-first'],
    ['elevation', 'change'],
    ['elevation', 'throw-second'],
  ]) {
    let reads = 0,
      error = null,
      html = null,
      metadata = null;
    function Armed() {
      const theme = useTheme(),
        shadows = Array(25).fill('none');
      Object.defineProperty(shadows, '1', {
        get() {
          reads++;
          if (behavior === 'throw-first') throw new Error('unused-shadow');
          if (behavior === 'throw-second' && reads > 1) throw new Error('shadow-read-again');
          return reads === 1 ? '0 0 4px red' : '0 0 8px blue';
        },
      });
      Object.defineProperty(theme, 'shadows', {
        value: shadows,
        writable: true,
        configurable: true,
      });
      theme.components.MuiPaper = {
        styleOverrides: {
          root: (args) => {
            metadata = args.style['--Paper-shadow'] ?? null;
            return {};
          },
        },
      };
      return React.createElement(Paper, { id: 'paper', variant, children: 'Body' });
    }
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = mode;
    try {
      html = renderToStaticMarkup(
        React.createElement(ThemeProvider, { theme: createTheme() }, React.createElement(Armed)),
      );
    } catch (caught) {
      error = caught.message;
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
    shadowAccess.push({
      mode,
      variant,
      behavior,
      reads,
      error,
      metadata,
      inlineShadow: html?.match(/--Paper-shadow:([^;"]*)/)?.[1] ?? null,
    });
  }
}
// Observe the table property itself, separately from an indexed token getter.
// Successful output must use the same selected shadow as the root callback.
const shadowTableAccess = [];
for (const mode of ['production', 'development']) {
  let reads = 0,
    error = null,
    html = null,
    metadata = null;
  function Armed() {
    const theme = useTheme(),
      shadows = Array(25).fill('none');
    shadows[1] = '0 0 4px red';
    Object.defineProperty(theme, 'shadows', {
      configurable: true,
      get() {
        reads++;
        if (reads > (mode === 'production' ? 1 : 2)) throw new Error('shadow-table-read-again');
        return shadows;
      },
    });
    theme.components.MuiPaper = {
      styleOverrides: {
        root: (args) => {
          metadata = args.style['--Paper-shadow'] ?? null;
          return {};
        },
      },
    };
    return React.createElement(Paper, { id: 'paper', children: 'Body' });
  }
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = mode;
  try {
    html = renderToStaticMarkup(
      React.createElement(ThemeProvider, { theme: createTheme() }, React.createElement(Armed)),
    );
  } catch (caught) {
    error = caught.message;
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
  shadowTableAccess.push({
    mode,
    reads,
    error,
    metadata,
    inlineShadow: html?.match(/--Paper-shadow:([^;"]*)/)?.[1] ?? null,
  });
}
// CSS declarations bypass System token lookup; sx reads its configured theme
// table even when a literal is eventually returned unchanged. Numeric CSS is
// retained as source evidence, not equated to the native numeric extension.
const systemShadowAccess = [];
const styleFunctionSx = system.require('@mui/system/styleFunctionSx').default;
for (const path of ['css', 'sx']) {
  for (const value of ['0 0 4px red', 1, '1']) {
    for (const throwing of [false, true]) {
      let reads = 0,
        error = null,
        output = null;
      const Component = styled('div')({ boxShadow: value });
      function Armed() {
        const theme = useTheme(),
          shadows = Array(25).fill('none');
        shadows[1] = '0 0 8px blue';
        Object.defineProperty(theme, 'shadows', {
          configurable: true,
          get() {
            reads++;
            if (throwing) throw new Error('unused-shadow-table');
            return shadows;
          },
        });
        if (path === 'sx') {
          output = styleFunctionSx({ theme, sx: { boxShadow: value } }).boxShadow;
          return null;
        }
        return React.createElement(Component, { id: 'shadow' });
      }
      try {
        const html = renderToStaticMarkup(
          React.createElement(ThemeProvider, { theme: createTheme() }, React.createElement(Armed)),
        );
        if (path === 'css') output = html.match(/box-shadow:([^;}]*)/)?.[1] ?? null;
      } catch (caught) {
        error = caught.message;
      }
      systemShadowAccess.push({ path, value, throwing, reads, error, output });
    }
  }
}
// A plain static Proxy is valid source CSS. Classifying native base styles
// must not introduce a new `has("variants")` operation before normal reads.
const staticProxyAccess = { has: [], error: null, padding: null };
try {
  const input = new Proxy(
    { padding: 1 },
    {
      has(target, key) {
        staticProxyAccess.has.push(String(key));
        if (key === 'variants') throw new Error('unexpected-variants-has');
        return Reflect.has(target, key);
      },
    },
  );
  const Component = styled('div')(input);
  const html = renderToStaticMarkup(React.createElement(Component));
  staticProxyAccess.padding = html.match(/padding:([^;}]*)/)?.[1] ?? null;
} catch (caught) {
  staticProxyAccess.error = caught.message;
}
const data = {
  references: [material.reference, utils.reference, system.reference],
  classes: canonical.paperClasses,
  utilities: Object.fromEntries(
    utilitySlots.map((slot) => [slot, canonical.getPaperUtilityClass(slot)]),
  ),
  fixtures,
  dark,
  themed,
  defaults,
  styledFixture,
  customRoot,
  shadowAccess,
  shadowTableAccess,
  systemShadowAccess,
  staticProxyAccess,
};
const fixture = 'tests/fixtures/mui-paper-9.5.0.json';
const bytes = await prettier.format(JSON.stringify(data), jsonFormat);
const provenance = {
  schemaVersion: 1,
  description:
    'Finite Paper source/software contract. No native paint, device, DOM or full compatibility certification.',
  references: data.references,
  fixture: {
    path: fixture,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    rootCases: fixtures.length,
    darkOverlayCases: dark.length,
    shadowAccessObservations: shadowAccess.length,
    shadowTableAccessObservations: shadowTableAccess.length,
    systemShadowAccessObservations: systemShadowAccess.length,
  },
  nativeBackgroundImage: {
    name: rn.name,
    version: rn.version,
    license: rn.license,
    sourceFiles: nativeSource,
    boundary:
      'Installed RN type/attribute/processor/native-prop source evidence; actual compiled device paint is a separate gate.',
  },
  localFiles: [
    'packages/material/src/paper.tsx',
    'packages/material/src/paperTypes.ts',
    'packages/material/src/paperClasses.ts',
  ],
  adaptations: [
    'Native View replaces the div alias; custom native roots retain their declared props and refs. Genuine native styles keep final precedence.',
    'Concrete native shadow tokens and typed constant-white gradient stops replace private CSS variables. No additional native host or flattened surface color is introduced.',
    'Source-ordered diagnostic/selected shadow access retains the same captured callback/output value, including production unused-slot and changing-accessor observations. The legacy native adapter reuses a descriptor overlay without mutating the caller theme or enumerating other depths.',
    'CSS literal shadows skip unused token-table access. Default and explicit sx retain source lookup behavior; numeric CSS shadow lookup remains a native extension. Ordinary static base styles avoid enumerating unused theme fields without new Proxy traps. Function/array native callback snapshots retain their prior timing; static embedded-variant snapshots are resolved after the existing first variants read. Direct theme fields remain a native extension.',
    'Existing shared style/default/ancestor/text/ref boundaries are reused. Paper does not implement browser shadow transitions, DOM element refs, CSS variable themes or arbitrary background-image CSS authoring.',
  ],
};
const reuse = JSON.parse(await readFile('upstream/reuse.json', 'utf8'));
const localReferences = [
  [
    'packages/material/src/paper.tsx',
    material.reference,
    ['Paper/Paper.js', 'styles/getOverlayAlpha.js'],
  ],
  [
    'packages/material/src/paperClasses.ts',
    material.reference,
    ['Paper/paperClasses.js', 'Paper/paperClasses.d.ts'],
  ],
  [
    'packages/material/src/paperTypes.ts',
    material.reference,
    ['Paper/Paper.d.ts', 'Paper/index.d.ts'],
  ],
];
const replacements = localReferences.map(([localFile, reference, files]) => ({
  localFile,
  reference: {
    ...reference,
    sourceFiles: Object.fromEntries(files.map((file) => [file, reference.sourceFiles[file]])),
  },
  adaptations: [
    'Paper native adaptation and finite source observations are recorded in upstream/paper.json. No browser, native paint or full compatibility certification.',
  ],
}));
reuse.entries = replaceUniqueLocalFileEntries(reuse.entries, replacements);
for (const [file, value] of [
  [fixture, bytes],
  ['upstream/paper.json', await prettier.format(JSON.stringify(provenance), jsonFormat)],
  ['upstream/reuse.json', await prettier.format(JSON.stringify(reuse), jsonFormat)],
]) {
  if (process.argv.includes('--check'))
    assert.equal(await readFile(file, 'utf8'), value, 'Paper source reference changed: ' + file);
  else await writeFile(file, value);
}
console.log(
  `Pinned Paper: ${fixtures.length} root cases, ${dark.length} dark overlays, ${themed.length} callback traces and ${Object.keys(canonical.paperClasses).length} utilities and ${shadowAccess.length} indexed-shadow, ${shadowTableAccess.length} shadow-table and ${systemShadowAccess.length} CSS/sx lookup observations verified.`,
);
