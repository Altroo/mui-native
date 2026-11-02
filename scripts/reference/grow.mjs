import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
const { reference, require, directory } = await loadReference('@mui/material', [
  'Grow/Grow.js',
  'Grow/Grow.d.ts',
  'internal/Transition.js',
  'transitions/utils.js',
  'transitions/useReducedMotion.js',
  'styles/createTransitions.js',
]);
const React = require('react');
const { create, act } = require('react-test-renderer');
const Grow = require(`${directory}/node_modules/@mui/material/Grow/Grow.js`).default;
const { ThemeProvider, createTheme } = require(
  `${directory}/node_modules/@mui/material/styles/index.js`,
);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// The provider's CSS-layer effect has no document head in these host/ref cases.
globalThis.document = { querySelector: () => null };
const lifecycleInputs = [
  {
    name: 'default auto enter and exit',
    initial: true,
    height: 36,
    props: {},
    actions: [{ tick: 191 }, { tick: 1 }, { open: false }, { tick: 192 }],
  },
  {
    name: 'auto height changes at the next phase',
    initial: true,
    height: 20,
    autoScale: true,
    props: {},
    actions: [{ tick: 10 }, { height: 50 }, { tick: 31 }, { open: false }, { tick: 101 }],
  },
  {
    name: 'appear completion differs from animation timing',
    initial: true,
    props: { timeout: { appear: 10, enter: 60, exit: 90 } },
    actions: [{ tick: 9 }, { tick: 1 }, { open: false }, { tick: 90 }],
  },
  {
    name: 'string timing preserves transform duration and zero string delay',
    initial: true,
    props: { timeout: 20, style: { transitionDuration: '120ms', transitionDelay: '0ms' } },
    actions: [{ tick: 20 }, { open: false }, { tick: 20 }],
  },
  {
    name: 'numeric zero exit delay uses the transform fallback',
    initial: true,
    props: { timeout: 60, style: { transitionDelay: 0 } },
    actions: [{ tick: 60 }, { open: false }, { tick: 60 }],
  },
  {
    name: 'opacity easing stays default while transform uses phase easing',
    initial: true,
    props: { timeout: 30, easing: { enter: 'linear', exit: 'ease-out' } },
    actions: [{ tick: 30 }, { open: false }, { tick: 30 }],
  },
  {
    name: 'auto ignores style duration but retains style delay and easing',
    initial: true,
    props: {
      style: {
        transitionDuration: '500ms',
        transitionDelay: '4ms',
        transitionTimingFunction: 'linear',
      },
    },
    actions: [{ tick: 192 }, { open: false }, { tick: 192 }],
  },
  {
    name: 'interrupted listener cycles reject old completions',
    initial: true,
    listener: true,
    props: { timeout: 50 },
    actions: [
      { done: 0 },
      { open: false },
      { open: true },
      { done: 1 },
      { done: 2 },
      { tick: 100 },
    ],
  },
  {
    name: 'mount/unmount with zero auto height',
    initial: false,
    height: 0,
    props: { mountOnEnter: true, unmountOnExit: true },
    actions: [{ open: true }, { tick: 0 }, { open: false }, { tick: 0 }],
  },
  {
    name: 'disabled later phases retain initial appear',
    initial: true,
    props: { enter: false, exit: false, timeout: 5 },
    actions: [{ tick: 5 }, { open: false }, { open: true }],
  },
  {
    name: 'reduced motion skips geometry and auto duration',
    initial: true,
    reduced: true,
    props: {},
    actions: [{ tick: 0 }, { open: false }, { tick: 0 }],
  },
  {
    name: 'component motion opt-out restores auto timing',
    initial: true,
    reduced: true,
    props: { disablePrefersReducedMotion: true },
    actions: [{ tick: 192 }],
  },
  {
    name: 'custom factory controls native timing but not auto deadline',
    initial: true,
    customFactory: true,
    props: {},
    actions: [{ tick: 191 }, { tick: 1 }, { open: false }, { tick: 192 }],
  },
  {
    name: 'Grow ignores component defaults like pinned source',
    initial: true,
    themeDefaults: true,
    props: {},
    actions: [{ tick: 192 }],
  },
];
function lifecycle(input) {
  const savedSet = globalThis.setTimeout,
    savedClear = globalThis.clearTimeout;
  let now = 0,
    id = 0,
    open = input.initial;
  const timers = new Map(),
    trace = [],
    done = [],
    snapshots = [],
    factoryCalls = [],
    autoHeights = [];
  let height = input.height ?? 36,
    heightReads = 0;
  globalThis.setTimeout = (callback, delay = 0) => {
    const key = ++id;
    timers.set(key, { at: now + Math.max(0, Number(delay) || 0), callback });
    return key;
  };
  globalThis.clearTimeout = (key) => timers.delete(key);
  let renderer;
  const node = {
    nodeType: 1,
    scrollTop: 0,
    style: {},
    get clientHeight() {
      heightReads++;
      return height;
    },
  };
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
  const theme = createTheme({
    motion: { reducedMotion: input.reduced ? 'always' : 'never' },
    ...(input.themeDefaults
      ? { components: { MuiGrow: { defaultProps: { timeout: 500, appear: false } } } }
      : {}),
  });
  const originalCreate = theme.transitions.create;
  theme.transitions.create = (property, options) => {
    const output = input.customFactory
      ? `${property} ${property === 'opacity' ? 7 : 11}ms linear ${property === 'opacity' ? 2 : 3}ms`
      : originalCreate(property, options);
    factoryCalls.push({ property, options, output });
    return output;
  };
  const originalAuto = theme.transitions.getAutoHeightDuration;
  theme.transitions.getAutoHeightDuration = (value) => {
    autoHeights.push(value);
    return input.autoScale ? value * 2 + 1 : originalAuto(value);
  };
  const element = () =>
    React.createElement(
      ThemeProvider,
      { theme },
      React.createElement(
        Grow,
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
      factoryCalls: JSON.parse(JSON.stringify(factoryCalls)),
      heightReads,
      autoHeights: [...autoHeights],
      mounted,
      hidden: mounted ? surface.props.style?.visibility === 'hidden' : false,
    });
  };
  try {
    act(() => {
      renderer = create(element(), { createNodeMock: () => node });
    });
    snapshot();
    for (const action of input.actions) {
      if ('height' in action) {
        height = action.height;
        act(() => renderer.update(element()));
      }
      if ('open' in action) {
        open = action.open;
        act(() => renderer.update(element()));
      }
      if ('done' in action) act(() => done[action.done]());
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
          act(() => next[1].callback());
        }
        now = end;
      }
      snapshot();
    }
    return { ...input, snapshots };
  } finally {
    if (renderer) act(() => renderer.unmount());
    globalThis.setTimeout = savedSet;
    globalThis.clearTimeout = savedClear;
  }
}

const fixtures = lifecycleInputs.map(lifecycle);
const filename = 'tests/fixtures/mui-grow-9.5.0.json';
const output = await format(
  JSON.stringify({ reference, muiSupportAuto: Grow.muiSupportAuto, fixtures }),
  { ...(await resolveConfig(filename)), filepath: filename },
);
if (process.argv.includes('--check')) {
  if ((await readFile(filename, 'utf8')) !== output) throw new Error('Grow reference drift');
  console.log(
    `Pinned Grow auto timing, factory arguments and lifecycle passed ${fixtures.length} cases.`,
  );
} else await writeFile(filename, output);
