// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
const { reference, require, directory } = await loadReference('@mui/material', [
  'Fade/Fade.js',
  'Fade/Fade.d.ts',
  'internal/Transition.js',
  'internal/Transition.d.ts',
  'transitions/types.d.ts',
  'transitions/utils.js',
  'transitions/useReducedMotion.js',
  'styles/createTransitions.js',
  'styles/createTransitions.d.ts',
  'styles/createMotion.js',
  'styles/createMotion.d.ts',
  'styles/createThemeNoVars.js',
  'Backdrop/Backdrop.js',
  'Backdrop/Backdrop.d.ts',
  'Dialog/Dialog.js',
  'Dialog/Dialog.d.ts',
]);
const load = (file) => require(`${directory}/node_modules/@mui/material/${file}`);
const createTransitions = load('styles/createTransitions.js').default;
const createMotion = load('styles/createMotion.js').default;
const { createTheme, ThemeProvider } = load('styles/index.js');
const calls = [
  [],
  ['opacity'],
  [['opacity', 'transform'], { duration: 151.6, delay: 2.4 }],
  ['height', { duration: '0.2s', easing: 'linear', delay: '10ms' }],
  [[], { duration: 0 }],
];
const heights = [0, 1, 36, 100, 1000, 1000000000];
const summarize = (theme) => ({
  duration: theme.transitions.duration,
  easing: theme.transitions.easing,
  motion: theme.motion,
  legacyMotion: Object.hasOwn(theme.transitions, 'reducedMotion'),
  calls: calls.map((args) => theme.transitions.create(...args)),
  heights: heights.map((height) => theme.transitions.getAutoHeightDuration(height)),
});
const themes = [
  { name: 'defaults', options: {} },
  {
    name: 'partial timing and system motion',
    options: {
      transitions: {
        duration: { standard: 123, enteringScreen: 40 },
        easing: { easeInOut: 'linear' },
      },
      motion: { reducedMotion: 'system' },
    },
  },
  {
    name: 'legacy transition motion removed',
    options: { transitions: { reducedMotion: 'always' }, motion: { reducedMotion: 'always' } },
  },
  {
    name: 'additional arguments preserve initial factory closure',
    options: { transitions: { duration: { standard: 80 } } },
    extra: {
      transitions: { duration: { standard: 90 }, reducedMotion: 'system' },
      motion: { reducedMotion: 'always' },
    },
  },
].map((input) => ({
  ...input,
  output: summarize(createTheme(input.options, ...(input.extra ? [input.extra] : []))),
}));
const helpers = [
  {},
  { duration: { standard: 42 }, easing: { easeInOut: 'linear' } },
  { reducedMotion: 'always' },
].map((input) => ({
  input,
  output: summarize({ transitions: createTransitions(input), motion: {} }),
}));
const motions = [
  {},
  { reducedMotion: 'system' },
  { reducedMotion: 'always' },
  { reducedMotion: 'never', custom: 3 },
].map((input) => ({ input, output: createMotion(input) }));
const React = require('react');
const { create, act } = require('react-test-renderer');
const Fade = load('Fade/Fade.js').default;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// The original provider's layer effect queries a document head. A null head
// avoids CSS injection; these are lifecycle/ref cases, not browser geometry.
globalThis.document = { querySelector: () => null };
const lifecycleInputs = [
  {
    name: 'appear deadlines',
    initial: true,
    props: { timeout: { appear: 10, enter: 20, exit: 30 } },
    actions: [{ tick: 9 }, { tick: 1 }, { open: false }, { tick: 29 }, { tick: 1 }],
  },
  {
    name: 'skip initial appear and later phases',
    initial: true,
    props: { appear: false, enter: false, exit: false },
    actions: [{ open: false }, { open: true }],
  },
  {
    name: 'mount and unmount on exit',
    initial: false,
    props: { mountOnEnter: true, unmountOnExit: true, timeout: 5 },
    actions: [{ open: true }, { tick: 5 }, { open: false }, { tick: 5 }],
  },
  {
    name: 'interrupted phases',
    initial: true,
    props: { timeout: 20 },
    actions: [
      { tick: 7 },
      { open: false },
      { tick: 4 },
      { open: true },
      { tick: 20 },
      { tick: 40 },
    ],
  },
  {
    name: 'listener races timeout',
    initial: true,
    listener: true,
    props: { timeout: 20 },
    actions: [
      { done: 0 },
      { tick: 20 },
      { open: false },
      { open: true },
      { done: 1 },
      { done: 2 },
      { tick: 40 },
    ],
  },
  {
    name: 'style timing does not replace fallback',
    initial: true,
    props: {
      timeout: 20,
      style: {
        transitionDuration: '0.1s',
        transitionDelay: '5ms',
        transitionTimingFunction: 'linear',
      },
    },
    actions: [{ tick: 19 }, { tick: 1 }, { open: false }, { tick: 20 }],
  },
  {
    name: 'only enter completion authored',
    initial: false,
    props: { timeout: { enter: 10 } },
    actions: [{ open: true }, { tick: 10 }, { open: false }, { tick: 0 }],
  },
  {
    name: 'enter false still appears initially',
    initial: true,
    props: { enter: false, timeout: 5 },
    actions: [{ tick: 5 }, { open: false }, { tick: 5 }, { open: true }],
  },
  {
    name: 'reduced motion completes asynchronously',
    initial: true,
    reduced: true,
    props: { timeout: 100 },
    actions: [{ tick: 0 }, { open: false }, { tick: 0 }],
  },
  {
    name: 'component reduced motion override',
    initial: true,
    reduced: true,
    props: { timeout: 7, disablePrefersReducedMotion: true },
    actions: [{ tick: 6 }, { tick: 1 }],
  },
];
async function lifecycle(input) {
  const savedSet = globalThis.setTimeout,
    savedClear = globalThis.clearTimeout;
  let now = 0,
    id = 0,
    open = input.initial;
  const timers = new Map(),
    trace = [],
    done = [],
    snapshots = [];
  globalThis.setTimeout = (callback, delay = 0) => {
    const key = ++id;
    timers.set(key, { at: now + Math.max(0, Number(delay) || 0), callback });
    return key;
  };
  globalThis.clearTimeout = (key) => timers.delete(key);
  let renderer;
  const node = { nodeType: 1, scrollTop: 0, style: {} };
  const callbacks = Object.fromEntries(
    ['Enter', 'Entering', 'Entered', 'Exit', 'Exiting', 'Exited'].map((phase) => [
      'on' + phase,
      (target, appearing) =>
        trace.push(
          phase.toLowerCase() +
            (phase.startsWith('Enter') ? ':' + appearing : '') +
            (target === node ? '' : ':invalid-ref'),
        ),
    ]),
  );
  const theme = createTheme({ motion: { reducedMotion: input.reduced ? 'always' : 'never' } });
  const element = () =>
    React.createElement(
      ThemeProvider,
      { theme },
      React.createElement(
        Fade,
        {
          ...input.props,
          ...callbacks,
          in: open,
          ...(input.listener ? { addEndListener: (_node, next) => done.push(next) } : {}),
        },
        React.createElement('div', { 'data-surface': true }),
      ),
    );
  const snapshot = () => {
    const mounted = renderer.toJSON() !== null;
    const surface = mounted ? renderer.root.findByProps({ 'data-surface': true }) : undefined;
    snapshots.push({
      trace: [...trace],
      mounted,
      hidden: mounted ? surface.props.style?.visibility === 'hidden' : false,
    });
  };
  try {
    await act(() => {
      renderer = create(element(), { createNodeMock: () => node });
    });
    snapshot();
    for (const action of input.actions) {
      if ('open' in action) {
        open = action.open;
        await act(() => renderer.update(element()));
      }
      if ('done' in action) await act(() => done[action.done]());
      if ('tick' in action) {
        const end = now + action.tick;
        let count = 0;
        while (true) {
          const next = [...timers]
            .filter(([, value]) => value.at <= end)
            .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
          if (!next) break;
          if (++count > 1000) throw new Error('Reference timer loop');
          now = next[1].at;
          timers.delete(next[0]);
          await act(() => next[1].callback());
        }
        now = end;
      }
      snapshot();
    }
    return { ...input, snapshots };
  } finally {
    try {
      if (renderer) await act(() => renderer.unmount());
    } finally {
      globalThis.setTimeout = savedSet;
      globalThis.clearTimeout = savedClear;
    }
  }
}
const lifecycles = [];
for (const input of lifecycleInputs) lifecycles.push(await lifecycle(input));
const filename = 'tests/fixtures/mui-transitions-9.5.0.json';
const output = await format(
  JSON.stringify({ reference, calls, heights, themes, helpers, motions, lifecycles }),
  { ...(await resolveConfig(filename)), filepath: filename },
);
if (process.argv.includes('--check')) {
  if ((await readFile(filename, 'utf8')) !== output) throw new Error('Transition reference drift');
  console.log(
    `Pinned transitions: ${themes.length} themes, ${helpers.length} helpers, ${motions.length} motion and ${lifecycles.length} Fade lifecycle cases passed.`,
  );
} else await writeFile(filename, output);
