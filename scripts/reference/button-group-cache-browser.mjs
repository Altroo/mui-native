// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Synthetic cache-lifetime observations of the pinned original MIT packages.
import { classMembershipObservations } from './styled-cache-classes-browser.mjs';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import cacheModule from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { serializeStyles } from '../../.cache/palette-reference/node_modules/@emotion/serialize/dist/emotion-serialize.esm.js';
import sxModule from '../../.cache/palette-reference/node_modules/@mui/system/styleFunctionSx/styleFunctionSx.js';
import styledModule from '../../.cache/palette-reference/node_modules/@mui/system/styled/styled.js';
import GroupModule from '../../.cache/palette-reference/node_modules/@mui/material/ButtonGroup/ButtonGroup.js';
import ButtonModule from '../../.cache/palette-reference/node_modules/@mui/material/Button/Button.js';
import {
  ThemeProvider,
  createTheme,
} from '../../.cache/palette-reference/node_modules/@mui/material/styles/index.js';
const createCache = cacheModule.default ?? cacheModule;
const Group = GroupModule.default ?? GroupModule;
const Button = ButtonModule.default ?? ButtonModule;
const h = React.createElement;
const originalSx = sxModule.default ?? sxModule;
const WarmStyled = (styledModule.default ?? styledModule)('div')({ padding: 1 });
function programComparisons() {
  const theme = createTheme();
  const css = (value) => serializeStyles([value]).styles;
  const sx = (value) => css(originalSx({ sx: value, theme }));
  const cases = [
    ['spacing-alias', 'sx', { p: 1 }, { padding: 1 }],
    ['unitless-number-string', 'sx', { opacity: 1 }, { opacity: '1' }],
    ['different-css-units', 'sx', { width: '1rem' }, { width: '16px' }],
    ['array-versus-flat', 'sx', [{ padding: 1 }, { color: 'red' }], { padding: 1, color: 'red' }],
    ['repeated-declaration', 'sx', [{ padding: 1 }, { padding: 1 }], { padding: 1 }],
    [
      'inactive-media',
      'sx',
      { '@media (min-width: 2000px)': { color: 'red' } },
      { '@media (min-width: 2000px)': { color: 'blue' } },
    ],
    ['unsupported-native-css', 'sx', { cursor: 'pointer' }, { cursor: 'default' }],
    ['shadow-token-literal', 'sx', { boxShadow: 2 }, { boxShadow: theme.shadows[2] }],
    ['numeric-border', 'sx', { border: 1 }, { border: '1px solid' }],
    [
      'responsive-null-reset',
      'sx',
      { p: { xs: 1 }, padding: { xs: null } },
      { padding: { xs: null } },
    ],
    [
      'css-fallback-array',
      'css',
      { color: ['red', 'blue'] },
      { '@media (min-width:0px)': { color: 'red' }, '@media (min-width:600px)': { color: 'blue' } },
    ],
    ['css-literal-alias', 'css', { p: 1 }, { padding: 1 }],
    [
      'css-literal-palette',
      'css',
      { color: 'primary.main' },
      { color: theme.palette.primary.main },
    ],
    ['shadow-token-miss-literal', 'sx', { boxShadow: 100 }, { boxShadow: '100px' }],
    ['shadow-token-miss-absent', 'sx', { boxShadow: 100 }, {}],
    ['css-array-single', 'css', [{ padding: 1 }], { padding: 1 }],
    ['css-unitless-number-string', 'css', { fontWeight: 400 }, { fontWeight: '400' }],
    [
      'css-shorthand-versus-edges',
      'css',
      { margin: '1px 2px' },
      { marginTop: '1px', marginRight: '2px', marginBottom: '1px', marginLeft: '2px' },
    ],
    ['css-native-normalized-length', 'css', { fontSize: '1rem' }, { fontSize: 16 }],
  ];
  const observations = cases.map(([name, mode, left, right]) => {
    const serialize = mode === 'sx' ? sx : css;
    const leftCss = serialize(left),
      rightCss = serialize(right);
    return { name, mode, left, right, leftCss, rightCss, equal: leftCss === rightCss };
  });
  const shadows = [...theme.shadows];
  shadows[2] = '0px 1px 2px 0px red';
  const other = createTheme({ shadows });
  const input = { boxShadow: 2 };
  const leftCss = sx(input);
  const rightCss = css(originalSx({ sx: input, theme: other }));
  observations.push({
    name: 'shadow-theme-change',
    mode: 'sx',
    left: input,
    right: input,
    rightTheme: { shadows },
    leftCss,
    rightCss,
    equal: leftCss === rightCss,
  });
  const falsyShadows = [...theme.shadows];
  falsyShadows[2] = '';
  const falsyInput = { boxShadow: 2 },
    literalInput = { boxShadow: '2px' };
  const falsyCss = css(
    originalSx({ sx: falsyInput, theme: createTheme({ shadows: falsyShadows }) }),
  );
  const literalCss = sx(literalInput);
  observations.push({
    name: 'shadow-falsy-token',
    mode: 'sx',
    left: falsyInput,
    right: literalInput,
    leftTheme: { shadows: falsyShadows },
    leftCss: falsyCss,
    rightCss: literalCss,
    equal: falsyCss === literalCss,
  });
  return observations;
}
const targetSx = {
  '& .MuiButtonGroup-grouped': { minWidth: 58, '&.Mui-disabled': { opacity: 0.4 } },
  '& .MuiButtonGroup-firstButton': { minWidth: 69 },
};
import { cacheScenarios, cssEmissionInputs } from './button-group-cache-contract.mjs';

const never = new Promise(() => {});
function Suspend() {
  throw never;
}
function matchingBorderRules(node) {
  const result = [];
  const visit = (rules) => {
    for (const rule of rules) {
      if (rule.cssRules) visit(rule.cssRules);
      if (
        node &&
        rule.selectorText &&
        node.matches(rule.selectorText) &&
        (rule.style.borderColor || rule.style.borderRightColor)
      )
        result.push({
          selector: rule.selectorText,
          border: rule.style.borderColor,
          right: rule.style.borderRightColor,
        });
    }
  };
  for (const sheet of document.styleSheets) visit(sheet.cssRules);
  return result;
}
function CachedButton({ cache, ...props }) {
  return h(CacheProvider, { value: cache }, h(Button, props));
}
async function sequence({ name, steps, strict, retain }) {
  const section = document.createElement('section');
  const heading = document.createElement('h2');
  heading.textContent = name;
  const host = document.createElement('div');
  section.append(heading, host);
  document.getElementById('root').append(section);
  const root = createRoot(host);
  const caches = [];
  const fresh = (key = 'group-cache') => {
    const next = createCache({ key });
    caches.push(next);
    return next;
  };
  let cache = fresh();
  const a = fresh('group-cache-a');
  const b = fresh('group-cache-b');
  let theme = createTheme();
  const observations = [];
  const render = (content) => {
    const wrapped = h(CacheProvider, { value: cache }, h(ThemeProvider, { theme }, content));
    flushSync(() => root.render(strict ? h(React.StrictMode, null, wrapped) : wrapped));
  };
  for (const step of steps) {
    if (!retain || !step.startsWith('nested-target')) render(null);
    if (step === 'reset' || step === 'independent') {
      if (step === 'reset') cache.sheet.flush();
      cache = fresh();
      continue;
    }
    if (step === 'theme') {
      theme = createTheme();
      continue;
    }
    const buttons = (inner) =>
      [1, 2, 3].map((n) =>
        inner
          ? h(CachedButton, { key: n, cache: inner }, 'Action ' + n)
          : h(Button, { key: n }, 'Action ' + n),
      );
    const group = (target, inner) =>
      h(Group, { disabled: target, ...(target ? { sx: targetSx } : {}) }, buttons(inner));
    let content = step === 'target' ? group(true) : group(false);
    if (step.startsWith('standalone'))
      content = h(
        Button,
        { variant: 'outlined', disabled: step === 'standalone-disabled' },
        'Warm up',
      );
    if (step === 'suspended-defaults')
      content = h(React.Suspense, { fallback: h('p', null, 'Fallback') }, group(false), h(Suspend));
    if (step === 'warm-styled-b') {
      cache = b;
      content = h(WarmStyled, { 'data-testid': 'warm-style' });
    }
    if (step === 'warm-button-b') {
      cache = b;
      content = h(Button, { variant: 'outlined' }, 'Warm B');
    }
    if (step === 'warm-group-a') {
      cache = a;
      content = group(false);
    }
    if (step.startsWith('nested-target')) {
      cache = a;
      content = group(true, step === 'nested-target-a' ? a : b);
    }
    render(content);
    // Retained roots can transition border colours after a cache switch. Keep
    // the immediate value separate, then await actual browser animations.
    const immediateBorders = [...host.querySelectorAll('button')].map(
      (node) => getComputedStyle(node).borderRightColor,
    );
    await Promise.all(
      host.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {})),
    );
    const tagOwners = [...document.querySelectorAll('style[data-emotion]')]
      .map((tag) => tag.getAttribute('data-emotion').split(' ')[0])
      .filter((key, index, all) => index === 0 || key !== all[index - 1]);
    const groupRoot = host.querySelector('.MuiButtonGroup-root');
    observations.push({
      step,
      ...(step === 'warm-styled-b'
        ? { styledClass: host.querySelector('[data-testid="warm-style"]').className }
        : {}),
      immediateBorders,
      inserted: Object.keys(cache.inserted),
      cacheInsertions: caches
        .filter((item) => Object.keys(item.inserted).length)
        .map((item) => ({ key: item.key, names: Object.keys(item.inserted) })),
      tagOwners,
      matchingBorderRules: matchingBorderRules(host.querySelector('button')),
      rootClass: groupRoot?.className ?? null,
      buttons: [...host.querySelectorAll('button')].map((node) => {
        const css = getComputedStyle(node);
        return {
          className: node.className,
          rightBorder: css.borderRightColor,
          leftBorder: css.borderLeftColor,
          minWidth: css.minWidth,
          opacity: css.opacity,
        };
      }),
    });
  }
  root.unmount();
  for (const item of caches) item.sheet.flush();
  return { name, steps, strict: !!strict, observations };
}
function overridePresence() {
  const host = document.createElement('div');
  document.getElementById('root').append(host);
  const root = createRoot(host),
    cache = createCache({ key: 'presence-cache' });
  const observations = [];
  for (const components of [{}, { MuiButtonGroup: { styleOverrides: {} } }]) {
    flushSync(() =>
      root.render(
        h(
          CacheProvider,
          { value: cache },
          h(
            ThemeProvider,
            { theme: createTheme({ components }) },
            h(Group, null, h(Button, null, 'A')),
          ),
        ),
      ),
    );
    observations.push(host.querySelector('.MuiButtonGroup-root').className);
  }
  root.unmount();
  cache.sheet.flush();
  return {
    absent: observations[0],
    empty: observations[1],
    equal: observations[0] === observations[1],
  };
}
function styledPrograms() {
  const styled = styledModule.default ?? styledModule;
  const observations = [];
  for (const name of [
    'static-object',
    'dynamic-object',
    'static-variants',
    'dynamic-variants',
    'themed-variant-no-owner',
    'shared-static-variants',
  ]) {
    const trace = [];
    const rootStyle = {
      get padding() {
        trace.push('css:padding');
        return 2;
      },
    };
    if (name.endsWith('variants'))
      rootStyle.variants = [
        {
          props: { active: true },
          get style() {
            trace.push('get:variant-style');
            return { color: 'red' };
          },
          set style(value) {
            Object.defineProperty(this, 'style', { value, writable: true });
          },
        },
      ];
    const Probe = styled('div', { name: 'MuiCacheProbe' })(
      name.includes('static')
        ? rootStyle
        : () => {
            trace.push('call:base');
            return rootStyle;
          },
    );
    const Second =
      name === 'shared-static-variants'
        ? styled('div', { name: 'MuiCacheProbe' })(rootStyle)
        : undefined;
    const definitionTrace = [...trace];
    const host = document.createElement('div');
    document.getElementById('root').append(host);
    const root = createRoot(host),
      cache = createCache({ key: 'constructor-css' });
    const emitted = new Map();
    const insert = cache.insert;
    cache.insert = (...args) => {
      emitted.set(args[1].name, args[1].styles);
      return Reflect.apply(insert, cache, args);
    };
    const themed = name === 'themed-variant-no-owner';
    const theme = createTheme(
      themed
        ? {
            components: {
              MuiCacheProbe: {
                variants: [
                  {
                    props: (props) => {
                      trace.push(
                        'predicate:' +
                          String(props.ownerState === undefined) +
                          ':' +
                          String(props.row) +
                          ':' +
                          String(props.direction),
                      );
                      return props.direction === undefined;
                    },
                    style: (props) => {
                      trace.push(
                        'variant:' +
                          String(props.ownerState === undefined) +
                          ':' +
                          String(props.row) +
                          ':' +
                          String(props.direction),
                      );
                      return { color: 'red' };
                    },
                  },
                ],
              },
            },
          }
        : {},
    );
    flushSync(() =>
      root.render(
        h(
          CacheProvider,
          { value: cache },
          h(
            ThemeProvider,
            { theme },
            h(
              React.Fragment,
              null,
              h(Probe, {
                'data-cache-style-probe': true,
                ...(themed ? { row: true } : { ownerState: { active: true } }),
              }),
              Second && h(Second, { 'data-cache-style-probe': true, ownerState: { active: true } }),
            ),
          ),
        ),
      ),
    );
    const className = [...host.querySelector('[data-cache-style-probe]').classList].find((value) =>
      value.startsWith('constructor-css-'),
    );
    observations.push({
      name,
      definitionTrace,
      renderTrace: [...trace],
      css: cache.registered[className] ?? emitted.get(className.slice('constructor-css-'.length)),
      className,
      ...(Second
        ? { secondClassName: [...host.querySelectorAll('[data-cache-style-probe]')][1].className }
        : {}),
    });
    root.unmount();
    cache.sheet.flush();
    host.remove();
  }
  return observations;
}
function cssEmissions() {
  return cssEmissionInputs.map((css, index) => {
    const cache = createCache({ key: 'emission-rules' });
    cache.insert('.emission-probe', { name: 'probe' + index, styles: css }, cache.sheet, true);
    const ruleCount = cache.sheet.tags.reduce((count, tag) => count + tag.sheet.cssRules.length, 0);
    const hasRules = cache.sheet.tags.length > 0;
    cache.sheet.flush();
    return { css, hasRules, ruleCount };
  });
}
function buttonSourceState() {
  const run = (authoredPressed) => {
    const owners = [],
      baseFocus = [];
    const cache = createCache({ key: 'source-owner' });
    const programs = new Map(),
      insert = cache.insert;
    cache.insert = (...args) => {
      programs.set(args[1].name, args[1].styles);
      return Reflect.apply(insert, cache, args);
    };
    const theme = createTheme({
      components: {
        MuiButton: {
          styleOverrides: {
            root: ({ ownerState }) => {
              owners.push({
                hasPressed: Object.hasOwn(ownerState, 'pressed'),
                pressed: ownerState.pressed ?? null,
                hasFocusVisible: Object.hasOwn(ownerState, 'focusVisible'),
                focusVisible: ownerState.focusVisible ?? null,
              });
              return { padding: ownerState.pressed ? 11 : 99 };
            },
          },
        },
        MuiButtonBase: {
          styleOverrides: {
            root: ({ ownerState }) => {
              baseFocus.push(ownerState.focusVisible);
              return { marginTop: ownerState.focusVisible ? 2 : 1 };
            },
          },
        },
      },
    });
    const Root = React.forwardRef(function SourceRoot({ pressed: _pressed, ...props }, ref) {
      return h('button', { ...props, ref });
    });
    const action = { current: null };
    const host = document.createElement('div');
    document.getElementById('root').append(host);
    const root = createRoot(host);
    flushSync(() =>
      root.render(
        h(
          CacheProvider,
          { value: cache },
          h(
            ThemeProvider,
            { theme },
            h(
              Button,
              { component: Root, action, ...(authoredPressed ? { pressed: true } : {}) },
              'Source owner',
            ),
          ),
        ),
      ),
    );
    const own = () =>
      [...programs]
        .filter(([name]) => name.endsWith('-MuiButton-root') && !name.includes('MuiButtonBase'))
        .map(([name, css]) => ({ name, css }));
    const before = { owners: [...owners], baseFocus: [...baseFocus], own: own() };
    if (!authoredPressed) flushSync(() => action.current.focusVisible());
    const after = {
      owners: [...owners],
      baseFocus: [...baseFocus],
      own: own(),
      className: host.querySelector('button').className,
    };
    root.unmount();
    cache.sheet.flush();
    host.remove();
    return { authoredPressed, before, after };
  };
  return [run(false), run(true)];
}
async function collect() {
  const observations = [];
  for (const scenario of cacheScenarios) observations.push(await sequence(scenario));
  window.buttonGroupCacheObservations = {
    metadata: window.buttonGroupCacheMetadata,
    observations,
    programComparisons: programComparisons(),
    overridePresence: overridePresence(),
    styledPrograms: styledPrograms(),
    cssEmissions: cssEmissions(),
    buttonSourceState: buttonSourceState(),
    classMembership: classMembershipObservations(),
  };
  document.getElementById('status').textContent = 'Completed cache sequences';
}
collect().catch((error) => {
  document.getElementById('status').textContent = String(error);
});
