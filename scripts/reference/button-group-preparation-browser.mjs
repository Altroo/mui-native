// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Synthetic observations of the integrity-checked original MUI packages.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import createCacheModule from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import GroupModule from '../../.cache/palette-reference/node_modules/@mui/material/ButtonGroup/ButtonGroup.js';
import ButtonModule from '../../.cache/palette-reference/node_modules/@mui/material/Button/Button.js';
import {
  ThemeProvider,
  createTheme,
} from '../../.cache/palette-reference/node_modules/@mui/material/styles/index.js';
const Group = GroupModule.default ?? GroupModule;
const Button = ButtonModule.default ?? ButtonModule;
const createCache = createCacheModule.default ?? createCacheModule;
const h = React.createElement;
function container(name) {
  const section = document.createElement('section');
  const heading = document.createElement('h2');
  heading.textContent = name;
  const host = document.createElement('div');
  section.append(heading, host);
  document.getElementById('root').append(section);
  return { root: createRoot(host), host };
}
function wrap(content, theme, cache) {
  return h(CacheProvider, { value: cache }, h(ThemeProvider, { theme }, content));
}
function counterCase(strict) {
  const { root } = container(strict ? 'StrictMode' : 'Ordinary updates');
  const counts = {
    root: 0,
    grouped: 0,
    firstButton: 0,
    middleButton: 0,
    lastButton: 0,
    sx: 0,
    variantProps: 0,
    variantStyle: 0,
  };
  const trace = [];
  const slots = ['root', 'grouped', 'firstButton', 'middleButton', 'lastButton'];
  const overrides = Object.fromEntries(
    slots.map((slot) => [
      slot,
      () => {
        counts[slot]++;
        trace.push(slot);
        return slot === 'root' ? { padding: 3 } : { minWidth: 61 };
      },
    ]),
  );
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: overrides,
        variants: [
          {
            props: () => {
              counts.variantProps++;
              trace.push('variantProps');
              return true;
            },
            style: () => {
              counts.variantStyle++;
              trace.push('variantStyle');
              return { marginTop: 2 };
            },
          },
        ],
      },
    },
  });
  const sx = () => {
    counts.sx++;
    trace.push('sx');
    return { '& .MuiButtonGroup-grouped': { minHeight: 38 } };
  };
  let increment;
  function Counter() {
    const [n, setN] = React.useState(0);
    increment = () => setN((v) => v + 1);
    return h(Button, null, 'Count ' + n);
  }
  const cache = createCache({
    key: strict ? 'group-preparation-strict' : 'group-preparation-plain',
  });
  const group = (orientation) => {
    const content = h(
      Group,
      { orientation, sx },
      h(Counter, { key: 'a' }),
      h(Button, { key: 'b' }, 'B'),
      h(Button, { key: 'c' }, 'C'),
    );
    return wrap(strict ? h(React.StrictMode, null, content) : content, theme, cache);
  };
  flushSync(() => root.render(group('horizontal')));
  const mount = { ...counts };
  flushSync(() => increment());
  const childUpdate = { ...counts };
  flushSync(() => root.render(group('vertical')));
  const groupUpdate = { ...counts };
  return { mount, childUpdate, groupUpdate, trace };
}
function accessorCase() {
  const { root, host } = container('Inherited slots and getters');
  const trace = [];
  const overrides = Object.create({
    grouped() {
      trace.push('call:grouped');
      return {
        get minWidth() {
          trace.push('css:grouped');
          return 72;
        },
      };
    },
  });
  Object.defineProperties(overrides, {
    root: {
      enumerable: true,
      get() {
        trace.push('get:root');
        return () => {
          trace.push('call:root');
          return {
            get padding() {
              trace.push('css:root');
              return 7;
            },
          };
        };
      },
    },
    unused: {
      enumerable: true,
      get() {
        trace.push('get:unused');
        return () => {
          trace.push('call:unused');
          return {
            get marginTop() {
              trace.push('css:unused');
              return 999;
            },
          };
        };
      },
    },
  });
  const theme = createTheme();
  theme.components.MuiButtonGroup = { styleOverrides: overrides };
  flushSync(() =>
    root.render(
      wrap(
        h(Group, { 'data-accessor-group': true }, h(Button, null, 'Accessor')),
        theme,
        createCache({ key: 'group-preparation-accessor' }),
      ),
    ),
  );
  return {
    trace,
    padding: getComputedStyle(host.querySelector('[data-accessor-group]')).paddingTop,
    minWidth: getComputedStyle(host.querySelector('button')).minWidth,
  };
}
function deferredCase(recursiveNamed) {
  const { root, host } = container(
    recursiveNamed ? 'Recursive named-slot boundary' : 'Deferred root callback',
  );
  const trace = [],
    sameArguments = [];
  const overrides = {
    root: (first) => {
      trace.push('root:first');
      return (second) => {
        trace.push('root:second');
        sameArguments.push(first === second);
        return { padding: 8 };
      };
    },
    grouped: (first) => {
      trace.push('grouped:first');
      if (!recursiveNamed) return { minWidth: 83 };
      return (second) => {
        trace.push('grouped:second');
        sameArguments.push(first === second);
        return { minWidth: 83 };
      };
    },
  };
  const theme = createTheme({ components: { MuiButtonGroup: { styleOverrides: overrides } } });
  flushSync(() =>
    root.render(
      wrap(
        h(Group, { 'data-deferred-group': true }, h(Button, null, 'Deferred')),
        theme,
        createCache({ key: 'group-preparation-deferred' }),
      ),
    ),
  );
  return {
    trace,
    sameArguments,
    padding: getComputedStyle(host.querySelector('[data-deferred-group]')).paddingTop,
    minWidth: getComputedStyle(host.querySelector('button')).minWidth,
  };
}
function guardedRootCase() {
  const { root, host } = container('Deferred CSS property boundaries');
  const style = Object.defineProperties(
    { padding: 9 },
    Object.fromEntries(
      ['variants', 'isProcessed', 'style'].map((key) => [
        key,
        {
          get() {
            throw Error('Unexpected read: ' + key);
          },
        },
      ]),
    ),
  );
  const theme = createTheme({
    components: { MuiButtonGroup: { styleOverrides: { root: () => () => style } } },
  });
  flushSync(() =>
    root.render(
      wrap(
        h(Group, { 'data-guarded-group': true }, h(Button, null, 'Guarded')),
        theme,
        createCache({ key: 'group-preparation-guarded' }),
      ),
    ),
  );
  return { padding: getComputedStyle(host.querySelector('[data-guarded-group]')).paddingTop };
}
window.buttonGroupPreparationObservations = {
  metadata: window.buttonGroupPreparationMetadata,
  observations: {
    plain: counterCase(false),
    strict: counterCase(true),
    accessors: accessorCase(),
    rootDeferred: deferredCase(false),
    deferred: deferredCase(true),
    guarded: guardedRootCase(),
  },
};
document.getElementById('status').textContent =
  'Recorded original callback counts, order and arguments';
