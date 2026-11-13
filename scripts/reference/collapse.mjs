// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import prettier from 'prettier';
const { format, resolveConfig } = prettier;
import { loadReference } from './load.mjs';
const { reference, require, directory } = await loadReference('@mui/material', [
  'Collapse/Collapse.js',
  'Collapse/Collapse.d.ts',
  'Collapse/collapseClasses.js',
  'Collapse/collapseClasses.d.ts',
  'internal/Transition.js',
  'transitions/utils.js',
  'transitions/useReducedMotion.js',
  'utils/useSlot.js',
]);
const React = require('react'),
  { create, act } = require('react-test-renderer');
const Collapse = require(`${directory}/node_modules/@mui/material/Collapse/Collapse.js`).default;
const { default: classes, getCollapseUtilityClass } = require(
  `${directory}/node_modules/@mui/material/Collapse/collapseClasses.js`,
);
const { ThemeProvider, createTheme } = require(
  `${directory}/node_modules/@mui/material/styles/index.js`,
);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.document = { querySelector: () => null };
const inputs = [
  {
    name: 'default vertical',
    initial: false,
    props: {},
    actions: [{ open: true }, { tick: 299 }, { tick: 1 }, { open: false }, { tick: 300 }],
  },
  {
    name: 'default initially expanded does not appear',
    initial: true,
    props: {},
    actions: [{ open: false }, { tick: 300 }],
  },
  {
    name: 'explicit appear',
    initial: true,
    props: { appear: true, timeout: { appear: 5, enter: 20, exit: 30 } },
    actions: [{ tick: 5 }, { open: false }, { tick: 30 }],
  },
  {
    name: 'horizontal natural size',
    initial: false,
    props: { orientation: 'horizontal', timeout: 20 },
    actions: [{ open: true }, { tick: 20 }, { open: false }, { tick: 20 }],
  },
  {
    name: 'nonzero collapsed numeric size',
    initial: false,
    props: { collapsedSize: 12, timeout: 10 },
    actions: [{ open: true }, { tick: 10 }, { open: false }, { tick: 10 }],
  },
  {
    name: 'zero string is not the hidden class',
    initial: false,
    props: { collapsedSize: '0', timeout: 1 },
    actions: [{ open: true }, { tick: 1 }, { open: false }, { tick: 1 }],
  },
  {
    name: 'vertical auto uses measured height',
    initial: false,
    props: { timeout: 'auto' },
    actions: [{ open: true }, { tick: 1000 }, { height: 72 }, { open: false }, { tick: 1000 }],
  },
  {
    name: 'horizontal auto uses measured width',
    initial: false,
    props: { timeout: 'auto', orientation: 'horizontal' },
    actions: [{ open: true }, { tick: 1000 }, { width: 200 }, { open: false }, { tick: 1000 }],
  },
  {
    name: 'style duration easing overrides phase timing',
    initial: false,
    props: {
      timeout: 40,
      easing: { enter: 'ease-in', exit: 'ease-out' },
      style: {
        transitionDuration: '120ms',
        transitionTimingFunction: 'linear',
        transitionDelay: '7ms',
      },
    },
    actions: [{ open: true }, { tick: 40 }, { open: false }, { tick: 40 }],
  },
  {
    name: 'interrupted listener generation',
    initial: false,
    listener: true,
    props: { timeout: 50 },
    actions: [
      { open: true },
      { open: false },
      { open: true },
      { done: 0 },
      { done: 1 },
      { done: 2 },
      { tick: 100 },
    ],
  },
  {
    name: 'mount and unmount',
    initial: false,
    props: { mountOnEnter: true, unmountOnExit: true, timeout: 10 },
    actions: [
      { open: true },
      { tick: 10 },
      { open: false },
      { tick: 10 },
      { open: true },
      { tick: 10 },
    ],
  },
  {
    name: 'disabled phases retain appear',
    initial: true,
    props: { appear: true, enter: false, exit: false, timeout: 5 },
    actions: [{ tick: 5 }, { open: false }, { open: true }],
  },
  {
    name: 'reduced motion clears auto deadline',
    initial: false,
    reduced: true,
    props: { timeout: 'auto' },
    actions: [{ open: true }, { tick: 0 }, { open: false }, { tick: 0 }],
  },
  {
    name: 'motion opt out retains auto duration',
    initial: false,
    reduced: true,
    props: { timeout: 'auto', disablePrefersReducedMotion: true },
    actions: [{ open: true }, { tick: 1000 }],
  },
  {
    name: 'theme defaults apply',
    initial: false,
    defaults: { timeout: 9, orientation: 'horizontal', collapsedSize: 4 },
    props: {},
    actions: [{ open: true }, { tick: 9 }, { open: false }, { tick: 9 }],
  },
];
async function observe(input) {
  const savedSet = globalThis.setTimeout,
    savedClear = globalThis.clearTimeout;
  let now = 0,
    id = 0,
    open = input.initial,
    height = 36,
    width = 120,
    state,
    renderer;
  const timers = new Map(),
    trace = [],
    done = [],
    autoSizes = [],
    slotOwners = [];
  const node = { nodeType: 1, style: {} },
    wrapper = {
      nodeType: 1,
      style: {},
      get clientHeight() {
        return height;
      },
      get clientWidth() {
        return width;
      },
    };
  const Root = React.forwardRef(function Root({ ownerState, ...props }, ref) {
    state = ownerState.state;
    return React.createElement('section', { ...props, ref, 'data-collapse-root': true });
  });
  const Wrapper = React.forwardRef(function Wrapper({ ownerState, ...props }, ref) {
    return React.createElement('section', { ...props, ref, 'data-collapse-wrapper': true });
  });
  globalThis.setTimeout = (callback, delay = 0) => {
    const key = ++id;
    timers.set(key, { at: now + Math.max(0, Number(delay) || 0), callback });
    return key;
  };
  globalThis.clearTimeout = (key) => timers.delete(key);
  const theme = createTheme({
    motion: { reducedMotion: input.reduced ? 'always' : 'never' },
    components: { MuiCollapse: { defaultProps: input.defaults ?? {} } },
  });
  const auto = theme.transitions.getAutoHeightDuration;
  theme.transitions.getAutoHeightDuration = (size) => {
    autoSizes.push(size);
    return auto(size);
  };
  const callbacks = Object.fromEntries(
    ['Enter', 'Entering', 'Entered', 'Exit', 'Exiting', 'Exited'].map((phase) => [
      'on' + phase,
      (target, appearing) =>
        trace.push(
          phase.toLowerCase() +
            (phase.startsWith('Enter') ? ':' + appearing : '') +
            (target === node ? '' : ':wrong-ref'),
        ),
    ]),
  );
  const element = () =>
    React.createElement(
      ThemeProvider,
      { theme },
      React.createElement(
        Collapse,
        {
          ...input.props,
          ...callbacks,
          in: open,
          slots: { root: Root, wrapper: Wrapper },
          slotProps: {
            root: (owner) => {
              slotOwners.push(owner.state ?? null);
              return { 'data-slot': 'root' };
            },
          },
          ...(input.listener
            ? {
                addEndListener: (target, next) => {
                  if (target !== node) throw new Error('Listener ref mismatch');
                  done.push(next);
                },
              }
            : {}),
        },
        'Content',
      ),
    );
  const snapshots = [];
  const snapshot = () => {
    const mounted = renderer.toJSON() !== null;
    const root = mounted ? renderer.root.findByProps({ 'data-collapse-root': true }) : null;
    snapshots.push({
      mounted,
      state: mounted ? state : 'unmounted',
      trace: [...trace],
      autoSizes: [...autoSizes],
      style: { ...node.style },
      classes: root?.props.className?.split(' ') ?? [],
      slotOwners: [...slotOwners],
    });
  };
  try {
    await act(() => {
      renderer = create(element(), {
        createNodeMock: (element) => (element.props['data-collapse-wrapper'] ? wrapper : node),
      });
    });
    snapshot();
    for (const action of input.actions) {
      if ('height' in action) height = action.height;
      if ('width' in action) width = action.width;
      if ('open' in action) {
        open = action.open;
        await act(() => renderer.update(element()));
      }
      if ('done' in action) await act(() => done[action.done]());
      if ('tick' in action) {
        const end = now + action.tick;
        let turns = 0;
        while (true) {
          const entry = [...timers]
            .filter(([, v]) => v.at <= end)
            .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
          if (!entry) break;
          if (++turns > 1000) throw new Error('Reference timer loop');
          now = entry[1].at;
          timers.delete(entry[0]);
          await act(() => entry[1].callback());
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
// Observe generic prop precedence and component/as routing in the original slots.
async function observeSlotComposition() {
  let renderer;
  const clicks = [];
  const Slot = React.forwardRef(function Slot({ as: Tag = 'div', ownerState, ...props }, ref) {
    return React.createElement(Tag, { ...props, ref });
  });
  try {
    await act(() => {
      renderer = create(
        React.createElement(
          ThemeProvider,
          { theme: createTheme() },
          React.createElement(
            Collapse,
            {
              in: true,
              component: 'nav',
              id: 'top-id',
              title: 'Top',
              onClick: () => clicks.push('top'),
              slots: { root: Slot, wrapper: Slot, wrapperInner: Slot },
              slotProps: {
                root: {
                  component: 'article',
                  id: 'slot-id',
                  title: 'Slot',
                  onClick: () => clicks.push('slot'),
                },
                wrapper: { component: 'aside' },
                wrapperInner: { component: 'section' },
              },
            },
            'Content',
          ),
        ),
        { createNodeMock: () => ({ nodeType: 1, style: {} }) },
      );
    });
    const root = renderer.root.findByType('article');
    await act(() => root.props.onClick());
    return {
      root: root.type,
      wrapper: renderer.root.findByType('aside').type,
      inner: renderer.root.findByType('section').type,
      id: root.props.id,
      title: root.props.title,
      clicks,
    };
  } finally {
    if (renderer) await act(() => renderer.unmount());
  }
}
const slotComposition = await observeSlotComposition();
const fixtures = [];
for (const input of inputs) fixtures.push(await observe(input));
const result = {
  reference,
  muiSupportAuto: Collapse.muiSupportAuto,
  classes,
  globalDisabled: getCollapseUtilityClass('disabled'),
  slotComposition,
  fixtures,
};
const filename = 'tests/fixtures/mui-collapse-9.5.0.json';
const output = await format(JSON.stringify(result), {
  ...(await resolveConfig(filename)),
  filepath: filename,
});
if (process.argv.includes('--check')) {
  if ((await readFile(filename, 'utf8')) !== output) throw new Error('Collapse reference drift');
  console.log(
    `Pinned Collapse lifecycle, refs, timing, slots and classes: ${inputs.length} cases.`,
  );
} else await writeFile(filename, output);
