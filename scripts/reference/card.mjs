// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import * as prettier from 'prettier';
import { loadReference } from './load.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const material = await loadReference('@mui/material', [
  'Card/Card.js',
  'Card/Card.d.ts',
  'Card/Card.d.mts',
  'Card/cardClasses.js',
  'Card/cardClasses.d.ts',
  'Card/cardClasses.d.mts',
  'Card/index.js',
  'Card/index.d.ts',
  'Card/index.d.mts',
  'Paper/Paper.js',
  'Paper/Paper.d.ts',
  'styles/components.d.ts',
  'styles/props.d.ts',
  'styles/rootShouldForwardProp.js',
  'styles/styled.js',
  'DefaultPropsProvider/DefaultPropsProvider.js',
]);
const utils = await loadReference('@mui/utils', [
  'composeClasses/composeClasses.js',
  'generateUtilityClass/generateUtilityClass.js',
  'generateUtilityClasses/generateUtilityClasses.js',
  'ClassNameGenerator/ClassNameGenerator.js',
]);
const system = await loadReference('@mui/system', [
  'createStyled/createStyled.js',
  'DefaultPropsProvider/DefaultPropsProvider.js',
]);
const React = material.require('react'),
  { renderToStaticMarkup } = material.require('react-dom/server');
const canonical = material.require('@mui/material/Card'),
  Card = canonical.default;
const root = material.require('@mui/material'),
  { ThemeProvider, createTheme, styled } = material.require('@mui/material/styles');
assert.equal(root.Card, Card);
assert.equal(root.cardClasses, canonical.cardClasses);
const publicClass = (value) =>
  String(value ?? '')
    .split(/\s+/)
    .filter((x) => x && !x.startsWith('css-'))
    .join(' ');
const decode = (input) =>
  Object.fromEntries(
    Object.entries(input).map(([k, v]) => [k, v === '$undefined' ? undefined : v]),
  );
function observation(html) {
  const tag = html.match(/<(?:div|section|article)\b[^>]*\bid="card"[^>]*>/)?.[0];
  assert(tag, 'Card root missing');
  const inline = tag.match(/style="([^"]*)"/)?.[1] ?? '';
  return {
    className: publicClass(tag.match(/class="([^"]*)"/)?.[1]),
    shadow: inline.match(/--Paper-shadow:([^;]*)/)?.[1] ?? null,
    inline,
    css: [...html.matchAll(/<style[^>]*>(.*?)<\/style>/g)].map((x) => x[1]).join(''),
  };
}
const render = (props, theme = createTheme(), Component = Card) =>
  observation(
    renderToStaticMarkup(
      React.createElement(
        ThemeProvider,
        { theme },
        React.createElement(Component, { id: 'card', ...props }, 'Body'),
      ),
    ),
  );
// Separate processes retain the original React production/dev behavior. React's
// dev-frozen explicit-theme throw is evidence, not a required native crash.
if (process.argv.includes('--observe-reserved')) {
  const values = [];
  for (const name of [
    'explicit-theme',
    'owner-object',
    'owner-object-undefined-style',
    'owner-object-null-style',
    'owner-style-only',
    'owner-undefined-style-no-default',
    'owner-null',
    'owner-undefined',
    'as-native',
    'as-undefined',
    'combined',
  ]) {
    const calls = [],
      received = [];
    const authored =
      name === 'owner-null'
        ? null
        : name === 'owner-undefined'
          ? undefined
          : name === 'owner-style-only'
            ? { marker: 'authored', style: { paddingLeft: 7 } }
            : { marker: 'authored' };
    const capture = (layer, a) => ({
      layer,
      ownerIdentity: a.ownerState === authored,
      ownerNull: a.ownerState === null,
      ownerUndefined: a.ownerState === undefined,
      marker: a.ownerState?.marker ?? null,
      raised: a.ownerState?.raised ?? null,
      rootHasStyle: Object.hasOwn(a, 'style'),
      rootStyle: a.style ?? null,
      ownerHasStyle: a.ownerState != null && Object.hasOwn(a.ownerState, 'style'),
      ownerStyle: a.ownerState?.style ?? null,
    });
    let Custom;
    const host = (tag, kind) =>
      React.forwardRef((props, ref) => {
        received.push({
          kind,
          className: publicClass(props.className),
          componentIsCustom: props.component === Custom,
          elevation: props.elevation ?? null,
          hasOwnerState: Object.hasOwn(props, 'ownerState'),
          hasTheme: Object.hasOwn(props, 'theme'),
          hasAs: Object.hasOwn(props, 'as'),
          hasClasses: Object.hasOwn(props, 'classes'),
        });
        return React.createElement(tag, { ...props, ref, id: 'card' }, props.children);
      });
    Custom = host('section', 'custom');
    const Alternate = host('article', 'alternate');
    const provider = createTheme({
      components: {
        MuiCard: {
          styleOverrides: {
            root: (a) => {
              calls.push(capture('card-provider', a));
              return { opacity: 0.2 };
            },
          },
        },
        MuiPaper: {
          ...(name === 'owner-style-only' || name === 'owner-undefined-style-no-default'
            ? {}
            : { defaultProps: { style: { paddingLeft: 13 } } }),
          styleOverrides: {
            root: (a) => {
              calls.push(capture('paper-provider', a));
              return { backgroundColor: '#1565c0' };
            },
          },
        },
      },
    });
    const explicit = createTheme({
      components: {
        MuiCard: {
          styleOverrides: {
            root: (a) => {
              calls.push(capture('card-explicit', a));
              return { opacity: 0.7 };
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: (a) => {
              calls.push(capture('paper-explicit', a));
              return { backgroundColor: '#b71c1c' };
            },
          },
        },
      },
    });
    const props = {
      component: Custom,
      ...(name === 'explicit-theme' || name === 'combined' ? { theme: explicit } : {}),
      ...(name.startsWith('owner-') || name === 'combined'
        ? { raised: true, ownerState: authored }
        : {}),
      ...(name === 'owner-object-undefined-style' || name === 'owner-undefined-style-no-default'
        ? { style: undefined }
        : {}),
      ...(name === 'owner-object-null-style' ? { style: null } : {}),
      ...(name === 'as-native' || name === 'combined' ? { as: Alternate } : {}),
      ...(name === 'as-undefined' ? { as: undefined } : {}),
    };
    try {
      values.push({ name, ...render(props, provider), calls, received });
    } catch (error) {
      values.push({ name, error: error.message, calls, received });
    }
  }
  console.log(JSON.stringify(values));
  process.exit(0);
}
const reserved = Object.fromEntries(
  ['development', 'production'].map((mode) => [
    mode,
    JSON.parse(
      execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--observe-reserved'], {
        env: { ...process.env, NODE_ENV: mode },
        encoding: 'utf8',
      }),
    ),
  ]),
);
const inputs = [
  ['defaults', {}],
  ['raised', { raised: true }],
  ['raised explicit zero', { raised: true, elevation: 0 }],
  ['raised explicit three', { raised: true, elevation: 3 }],
  ['raised explicit undefined', { raised: true, elevation: '$undefined' }],
  ['outlined raised', { raised: true, variant: 'outlined' }],
  ['square', { square: true }],
  ['custom variant', { variant: 'glass' }],
  ['classes', { classes: { root: 'chosen' }, className: 'authored' }],
  [
    'sx then native inline',
    { sx: { p: 2, overflow: 'scroll' }, style: { paddingLeft: 7, overflow: 'visible' } },
  ],
];
const fixtures = inputs.map(([name, input]) => ({ name, input, ...render(decode(input)) }));
const args = (a) => ({
  className: publicClass(a.className),
  rootHasRaised: Object.hasOwn(a, 'raised'),
  rootElevation: a.elevation ?? null,
  ownerRaised: a.ownerState.raised ?? null,
  ownerHasElevation: Object.hasOwn(a.ownerState, 'elevation'),
  ownerElevation: a.ownerState.elevation ?? null,
  ownerClassName: publicClass(a.ownerState.className),
  ownerHasStyle: Object.hasOwn(a.ownerState, 'style'),
  ownerStyle: a.ownerState.style ?? null,
  rootStyle: a.style ?? null,
  direction: a.theme.direction,
});
const themed = [];
for (const input of [
  { raised: true },
  { raised: true, elevation: '$undefined' },
  { raised: true, elevation: 0 },
  { variant: 'outlined' },
  { raised: true, className: 'authored', classes: { root: 'chosen' }, style: { paddingLeft: 7 } },
  { raised: false, style: '$undefined' },
]) {
  const calls = [];
  const theme = createTheme({
    components: {
      MuiCard: {
        styleOverrides: {
          root: (a) => {
            calls.push({ name: 'card-root', ...args(a) });
            return { padding: 2 };
          },
          unused: (a) => {
            calls.push({ name: 'card-unused', ...args(a) });
            return { unsupportedUnused: 'resolved-only' };
          },
        },
        variants: [
          {
            props: (a) => {
              calls.push({ name: 'card-predicate', ...args(a) });
              return a.raised === true;
            },
            style: (a) => {
              calls.push({ name: 'card-variant', ...args(a) });
              return { marginTop: 3 };
            },
          },
        ],
      },
      MuiPaper: {
        defaultProps: { elevation: 5 },
        styleOverrides: {
          root: (a) => {
            calls.push({ name: 'paper-root', ...args(a) });
            return { padding: 1 };
          },
        },
      },
    },
  });
  themed.push({ input, calls, ...render(decode(input), theme) });
}
const defaults = [];
for (const input of [
  {},
  { raised: true },
  { raised: true, elevation: '$undefined' },
  { raised: false, elevation: 0 },
]) {
  const theme = createTheme({
    components: {
      MuiCard: { defaultProps: { raised: true, classes: { root: 'card-default' } } },
      MuiPaper: {
        defaultProps: {
          elevation: 5,
          classes: { root: 'paper-default' },
          style: { paddingLeft: 13 },
        },
      },
    },
  });
  defaults.push({ input, ...render(decode(input), theme) });
}
const priorityCalls = [];
const priorityTheme = createTheme({
  components: {
    MuiCard: {
      defaultProps: {
        sx: (t) => {
          priorityCalls.push('card-sx');
          return { p: t.spacing(2) };
        },
      },
      styleOverrides: {
        root: () => {
          priorityCalls.push('card-root');
          return { padding: 3 };
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        sx: (t) => {
          priorityCalls.push('paper-sx');
          return { p: t.spacing(4) };
        },
      },
      styleOverrides: {
        root: () => {
          priorityCalls.push('paper-root');
          return { padding: 1 };
        },
      },
    },
  },
});
const priority = { ...render({}, priorityTheme), calls: priorityCalls };
const styledCalls = [];
const Styled = styled(Card)((props) => {
  styledCalls.push({ raised: props.raised, hasStyle: Object.hasOwn(props, 'style') });
  return { padding: 4, '&.MuiCard-root': { minHeight: 66 } };
});
const styledFixture = {
  ...render(
    { raised: true },
    createTheme({ components: { MuiCard: { defaultProps: { style: { paddingLeft: 9 } } } } }),
    Styled,
  ),
  calls: styledCalls,
};
const layered = styled(Card)(() => ({ padding: 4, overflow: 'scroll' }));
const layeredFixture = render(
  {},
  createTheme({
    components: {
      MuiCard: {
        defaultProps: { sx: { p: 2 } },
        styleOverrides: { root: { padding: 3, overflow: 'visible' } },
      },
      MuiPaper: {
        defaultProps: { sx: { p: 4 } },
        styleOverrides: { root: { padding: 1, overflow: 'visible' } },
      },
    },
  }),
  layered,
);
let reads = 0;
const getterClasses = {};
Object.defineProperty(getterClasses, 'root', {
  enumerable: true,
  get() {
    reads++;
    return 'getter';
  },
});
const getter = { ...render({ classes: getterClasses }), reads };
let error = null;
try {
  render(
    {},
    createTheme({
      components: {
        MuiCard: {
          styleOverrides: {
            root: { padding: 1 },
            unused: () => {
              throw new Error('unused-card-slot');
            },
          },
        },
      },
    }),
  );
} catch (e) {
  error = e.message;
}
const utilitySlots = ['root', 'disabled', 'focusVisible', 'invented', 'constructor', 'toString'];
const data = {
  references: [material.reference, utils.reference, system.reference],
  reserved,
  classes: canonical.cardClasses,
  utilities: Object.fromEntries(utilitySlots.map((x) => [x, canonical.getCardUtilityClass(x)])),
  fixtures,
  themed,
  defaults,
  priority,
  styledFixture,
  layeredFixture,
  getter,
  unusedThrow: error,
};
const config = await prettier.resolveConfig('tests/fixtures/mui-card-9.5.0.json'),
  format = (value) => prettier.format(JSON.stringify(value), { ...config, parser: 'json' });
const bytes = await format(data),
  fixture = 'tests/fixtures/mui-card-9.5.0.json';
const provenance = {
  schemaVersion: 1,
  description:
    'Finite Card source/software contract; Paper inheritance is reused. No native paint, device, browser or full compatibility certification.',
  references: data.references,
  fixture: {
    path: fixture,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    rootCases: fixtures.length,
    themedCases: themed.length,
    reservedCasesPerMode: reserved.production.length,
  },
  localFiles: [
    'packages/material/src/card.tsx',
    'packages/material/src/cardTypes.ts',
    'packages/material/src/cardClasses.ts',
    'packages/system/src/sx.ts',
  ],
  adaptations: [
    'Native View/div-alias and custom native roots reuse the existing Paper ref/text/style boundary. CardContent/CardActions are unchanged and their structural semantics remain separate.',
    'The source spread order retains explicit elevation, including undefined, after the raised default. Card CSS is prepared privately before Paper and applied after Paper CSS; genuine native inline styles remain last.',
    'Native types adapt the original Card/Paper polymorphic surface to native refs/events/styles; CardPropsColorOverrides remains the source unused augmentation interface. Ordinary conditional spreads retain the original structural assignment boundary. Native View has no deprecated HTML color attribute.',
    'Explicit complete native themes style only the Card layer; Paper retains its provider theme. Exact authored ownerState, including null/own undefined, replaces CardRoot callback state. Native-compatible as replaces the styled base and bypasses Paper through existing native scopes.',
    'The existing private styled metadata helper accepts an optional supplied-style flag at its original body site. Omission preserves the old descriptor-read expression and order; explicit false does not fall back. Card uses it to separate authored style presence from selected owner state without cloning/mutation.',
    'Original explicit-theme observations are captured in separate production/development processes: production styles successfully, while React development frozen props throw. Native does not imitate that development-only original crash.',
    'The existing shared native System style vocabulary and Paper platform limitations remain unchanged; this records no browser-CSS, arbitrary selector, native paint or performance completion.',
  ],
};
const reuse = JSON.parse(await readFile('upstream/reuse.json', 'utf8'));
reuse.entries = reuse.entries.filter(
  (x) =>
    !x.adaptations?.some((note) => note.startsWith('Card source/software adaptation is recorded')),
);
const cardEntries = [];
for (const [localFile, reference, files] of [
  [provenance.localFiles[0], material.reference, ['Card/Card.js', 'Paper/Paper.js']],
  [provenance.localFiles[1], material.reference, ['Card/Card.d.ts', 'Paper/Paper.d.ts']],
  [provenance.localFiles[2], material.reference, ['Card/cardClasses.js', 'Card/cardClasses.d.ts']],
  [provenance.localFiles[0], utils.reference, ['composeClasses/composeClasses.js']],
  [provenance.localFiles[2], utils.reference, ['generateUtilityClass/generateUtilityClass.js']],
  [provenance.localFiles[3], system.reference, ['createStyled/createStyled.js']],
])
  cardEntries.push({
    localFile,
    reference: {
      ...reference,
      sourceFiles: Object.fromEntries(files.map((f) => [f, reference.sourceFiles[f]])),
    },
    adaptations: [
      'Card source/software adaptation is recorded in upstream/card.json. Native execution and full compatibility remain separate gates.',
    ],
  });
// Leave existing family records in their current order.
reuse.entries.unshift(...cardEntries);
for (const [file, value] of [
  [fixture, bytes],
  ['upstream/card.json', await format(provenance)],
  ['upstream/reuse.json', await format(reuse)],
]) {
  if (process.argv.includes('--check'))
    assert.equal(await readFile(file, 'utf8'), value, 'Card reference changed: ' + file);
  else await writeFile(file, value);
}
console.log(
  `Pinned Card: ${fixtures.length} roots, ${themed.length} callback traces, ${defaults.length} defaults cases, slot/throw/class/style observations verified.`,
);
