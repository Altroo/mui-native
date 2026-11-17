// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import prettier from 'prettier';
const { format: prettierFormat } = prettier;
import { loadReference } from './load.mjs';

const system = await loadReference('@mui/system', ['createStyled/createStyled.js']);
const React = system.require('react');
const { renderToStaticMarkup } = system.require('react-dom/server');
const { createTheme, ThemeProvider, createStyled } = system.require('@mui/system');
const styled = createStyled();
const observations = [];
function observe(name, configure) {
  const trace = [];
  const theme = createTheme();
  const ownerState = { color: 'owner', active: true };
  const args = (input) => [
    input.color,
    input.rootOnly,
    input.ownerState === ownerState,
    input.theme.spacing(1),
  ];
  const { overrides, selected = ['root'], variants = [] } = configure(trace, args, ownerState);
  // Assign after theme construction so its merge does not consume the getters.
  theme.components.MuiSlotProbe = { styleOverrides: overrides, variants };
  const Root = styled('div', {
    name: 'MuiSlotProbe',
    slot: 'Root',
    skipSx: true,
    shouldForwardProp: (key) => key === 'children',
    overridesResolver: (_props, styles) => {
      trace.push('select');
      return selected.map((key) => styles[key]);
    },
  })({});
  let error = null;
  try {
    renderToStaticMarkup(
      React.createElement(
        ThemeProvider,
        { theme },
        React.createElement(Root, { ownerState, color: 'root', rootOnly: 3 }),
      ),
    );
  } catch (caught) {
    error = caught.message;
  }
  observations.push({ name, trace, error });
}
observe('inherited slots and callback arrays resolve before selection', (trace, args) => {
  const inherited = {
    inherited: (input) => {
      trace.push(['inherited', ...args(input)]);
      return {};
    },
  };
  const overrides = Object.create(inherited);
  Object.defineProperties(overrides, {
    root: {
      enumerable: true,
      get() {
        trace.push('get-root');
        return (input) => {
          trace.push(['root', ...args(input)]);
          return {};
        };
      },
    },
    unused: {
      enumerable: true,
      get() {
        trace.push('get-unused');
        return [
          () => {
            trace.push('array-one');
            return [
              () => {
                trace.push('array-two');
                return {};
              },
            ];
          },
        ];
      },
    },
    hidden: {
      enumerable: false,
      get() {
        throw new Error('non-enumerable');
      },
    },
  });
  return { overrides };
});
observe('unused ordinary CSS and nested variant array callbacks stay deferred', (trace, args) => {
  const unused = {
    get padding() {
      throw new Error('unused-css');
    },
  };
  return {
    overrides: {
      root: {},
      unused,
      embedded: {
        variants: [
          {
            props: (input) => {
              trace.push(['predicate', ...args(input)]);
              return true;
            },
            style: (input) => {
              trace.push(['style', ...args(input)]);
              return [
                () => {
                  throw new Error('deferred-array');
                },
              ];
            },
          },
        ],
      },
    },
  };
});
observe('unused embedded spread getters and variant accessors resolve in order', (trace, args) => {
  const variant = {
    get props() {
      trace.push('get-props');
      return { color: 'root' };
    },
    get style() {
      trace.push('get-style');
      return function (input) {
        trace.push(['style-call', this === variant, ...args(input)]);
        return {};
      };
    },
  };
  const input = {
    get padding() {
      trace.push('spread-padding');
      return 2;
    },
    get variants() {
      trace.push('get-variants');
      return [variant];
    },
  };
  return { overrides: { root: {}, unused: input } };
});
observe('inherited variant props and root-first matching reject mismatch', (trace) => {
  const props = Object.create({ inherited: 'no-match' });
  return {
    overrides: {
      root: {},
      unused: {
        variants: [
          {
            props,
            style: () => {
              throw new Error('inherited-mismatch');
            },
          },
          {
            props: { color: 'root' },
            style: () => {
              trace.push('root-match');
              return {};
            },
          },
        ],
      },
    },
  };
});
observe('unused throw stops later slots and component variants', (trace) => ({
  overrides: {
    root: () => {
      trace.push('root');
      return {};
    },
    unused: () => {
      trace.push('unused');
      throw new Error('unused-slot');
    },
    later: () => {
      trace.push('later');
      return {};
    },
  },
  variants: [
    {
      props: () => {
        trace.push('component');
        return true;
      },
      style: {},
    },
  ],
}));
observe('selected callback is resolved once for repeated keys', (trace) => ({
  overrides: {
    root: () => {
      trace.push('root');
      return { padding: 2 };
    },
    unused: () => {
      trace.push('unused');
      return {};
    },
  },
  selected: ['root', 'root'],
  variants: [
    {
      props: () => {
        trace.push('component');
        return true;
      },
      style: {},
    },
  ],
}));
observe('selected CSS preparation follows all slots and precedes component variants', (trace) => ({
  overrides: {
    root: () => {
      trace.push('root');
      return {
        get padding() {
          trace.push('selected-css');
          throw new Error('selected-css');
        },
      };
    },
    unused: () => {
      trace.push('unused');
      return {};
    },
  },
  variants: [
    {
      props: () => {
        trace.push('component');
        return true;
      },
      style: {},
    },
  ],
}));
observe('non-enumerable selected slots are not resolved', (trace) => {
  const overrides = {
    unused: () => {
      trace.push('unused');
      return {};
    },
  };
  Object.defineProperty(overrides, 'root', {
    get() {
      throw new Error('hidden-root');
    },
  });
  return { overrides };
});
observe('static root match does not read owner-state fallback', (_trace, _args, ownerState) => {
  Object.defineProperty(ownerState, 'color', {
    get() {
      throw new Error('owner-fallback');
    },
  });
  return {
    overrides: { root: {}, unused: { variants: [{ props: { color: 'root' }, style: {} }] } },
  };
});
observe('one slot callback mutation reaches later slot variants', (trace, args) => ({
  overrides: {
    root: (input) => {
      input.rootOnly = 7;
      trace.push('root');
      return {};
    },
    unused: {
      variants: [
        {
          props: (input) => {
            trace.push(['predicate', ...args(input)]);
            return input.rootOnly === 7;
          },
          style: (input) => {
            trace.push(['style', ...args(input)]);
            return {};
          },
        },
      ],
    },
  },
}));
assert.equal(observations[1].error, null);
assert.equal(observations[4].error, 'unused-slot');
const report = {
  reference: system.reference,
  boundary:
    'Actual pinned createStyled rendering with native CSS conversion excluded; no modular CSS layers or general Emotion serialization parity is claimed.',
  observations,
};
const file = 'tests/fixtures/mui-style-overrides-9.5.0.json';
const bytes = await prettierFormat(JSON.stringify(report), { parser: 'json' });
const provenance = {
  schemaVersion: 1,
  description:
    'Finite shared style-override resolution contract. No native rendering or general CSS certification.',
  reference: system.reference,
  fixture: {
    path: file,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    observations: observations.length,
    renderer:
      'Actual pinned React DOM SSR using original createStyled and a slot-selecting overridesResolver.',
  },
  localFiles: ['packages/system/src/sx.ts'],
  adaptations: [
    'Resolve every enumerable override slot before preparing selected native CSS. Preserve callback arrays, embedded variants, source getter/matching/throw order and callback receiver/arguments.',
    'Prepared native sheets retain resolved styles for descendant recollection without new callback invocations.',
    'Direct theme fields and deferred callback members of selected variant-style arrays remain native extensions. General Emotion serialization, processed Emotion CSS, modular CSS layers, arbitrary selectors and renderer-wide invocation counts are not certified.',
  ],
};
for (const [target, content] of [
  [file, bytes],
  [
    'upstream/style-overrides.json',
    await prettierFormat(JSON.stringify(provenance), { parser: 'json' }),
  ],
]) {
  if (process.argv.includes('--check'))
    assert.equal(
      await readFile(target, 'utf8'),
      content,
      'Pinned style-override reference changed: ' + target,
    );
  else await writeFile(target, content);
}
console.log(
  `${observations.length} pinned createStyled override-resolution observations verified.`,
);
