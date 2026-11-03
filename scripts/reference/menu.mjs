import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'Menu/Menu.js',
  'Menu/Menu.d.ts',
  'Menu/menuClasses.js',
  'Menu/menuClasses.d.ts',
  'Popover/Popover.js',
  'MenuList/MenuList.js',
  'utils/useSlot.js',
]);
const utils = await loadReference('@mui/utils', ['generateUtilityClass/generateUtilityClass.js']);
const system = await loadReference('@mui/system', ['RtlProvider/index.js']);
const { require, directory } = material,
  React = require('react'),
  { create, act } = require('react-test-renderer');
const original = require(`${directory}/node_modules/@mui/material/Menu/Menu.js`),
  Menu = original.default;
const RtlProvider = require(`${directory}/node_modules/@mui/system/RtlProvider`).default;
const classes = require(`${directory}/node_modules/@mui/material/Menu/menuClasses.js`);
const { renderToStaticMarkup } = require('react-dom/server');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const window = {
  innerWidth: 400,
  innerHeight: 800,
  navigator: { userAgent: 'controlled Menu reference' },
  addEventListener() {},
  removeEventListener() {},
};
const document = {
  defaultView: window,
  querySelector: () => null,
  body: { getBoundingClientRect: () => ({ top: 0, left: 0, width: 400, height: 800 }) },
};
globalThis.window = window;
globalThis.document = document;
const cases = [
  { name: 'default selected menu' },
  { name: 'RTL default attachment', rtl: true },
  { name: 'closed retained menu', props: { open: false, keepMounted: true } },
  { name: 'caller manages focus', props: { autoFocus: false } },
  { name: 'focus list instead of active item', props: { disableAutoFocusItem: true } },
  { name: 'menu variant', props: { variant: 'menu' } },
  { name: 'explicit Popover autofocus override', props: { disableAutoFocus: false } },
  {
    name: 'authored origins override RTL defaults',
    rtl: true,
    props: {
      anchorOrigin: { vertical: 'center', horizontal: 'left' },
      transformOrigin: { vertical: 'bottom', horizontal: 'center' },
    },
  },
  {
    name: 'list slot overrides initial policy',
    list: { autoFocus: false, autoFocusItem: false, variant: 'menu' },
  },
  { name: 'slot owner callbacks', callbacks: true },
  { name: 'numeric transition', props: { transitionDuration: 31 } },
  { name: 'automatic duration support', auto: true },
  { name: 'Tab closes before external handler', key: 'Tab' },
  { name: 'Shift Tab closes', key: 'Tab', shiftKey: true },
  { name: 'preprevented Tab still requests closure', key: 'Tab', prevented: true },
  { name: 'ordinary list key remains external', key: 'ArrowDown' },
  { name: 'root close slot precedence', rootClose: true },
];
function run(input) {
  const trace = [],
    nodes = {
      root: { nodeType: 1, ownerDocument: document, style: {} },
      paper: {
        nodeType: 1,
        ownerDocument: document,
        offsetWidth: 120,
        offsetHeight: 80,
        style: {
          setProperty(k, v) {
            this[k] = v;
          },
        },
      },
      list: { nodeType: 1 },
    };
  let root, paper, list, transition, renderer;
  const owner = (value) => ({
    autoFocus: value?.autoFocus ?? null,
    disableAutoFocusItem: value?.disableAutoFocusItem ?? null,
    variant: value?.variant ?? null,
    transitionDuration: value?.transitionDuration ?? null,
    open: value?.open ?? null,
  });
  const Root = React.forwardRef((props, ref) => {
    root = props;
    return React.createElement('div', { ref }, props.children);
  });
  const Paper = React.forwardRef((props, ref) => {
    paper = props;
    return React.createElement('div', { ref, 'data-paper': true }, props.children);
  });
  const List = React.forwardRef((props, ref) => {
    list = props;
    React.useImperativeHandle(props.actions, () => ({
      adjustStyleForScrollbar(node, options) {
        trace.push(`adjust:${node === nodes.paper}:${options.direction}`);
      },
      focusInitialTarget() {
        trace.push('focus');
      },
    }));
    return React.createElement('ul', { ref, 'data-list': true }, props.children);
  });
  const Transition = (props) => {
    transition = props;
    return props.children;
  };
  if (input.auto) Transition.muiSupportAuto = true;
  const listSlot = {
    ...input.list,
    onKeyDown: (event) => trace.push(`external:${event.key}:${event.defaultPrevented}`),
  };
  const slotProps = {
    root: input.rootClose ? { onClose: (_event, reason) => trace.push('rootClose:' + reason) } : {},
    paper: {},
    list: listSlot,
    transition: { onEntering: () => trace.push('entering') },
    backdrop: { invisible: false },
  };
  if (input.callbacks)
    for (const key of Object.keys(slotProps)) {
      const props = slotProps[key];
      slotProps[key] = (state) => ({ ...props, 'data-owner': owner(state) });
    }
  try {
    act(() => {
      renderer = create(
        React.createElement(
          RtlProvider,
          { value: input.rtl ?? false },
          React.createElement(
            Menu,
            {
              open: true,
              anchorEl: {
                nodeType: 1,
                ownerDocument: document,
                getBoundingClientRect: () => ({ top: 200, left: 100, width: 40, height: 20 }),
              },
              onClose: (_event, reason) => trace.push('close:' + reason),
              slots: { root: Root, paper: Paper, list: List, transition: Transition },
              slotProps,
              ...input.props,
            },
            'Content',
          ),
        ),
        {
          createNodeMock: (element) =>
            element.props['data-paper']
              ? nodes.paper
              : element.props['data-list']
                ? nodes.list
                : nodes.root,
        },
      );
    });
    const snapshot = {
      root: {
        disableAutoFocus: root.disableAutoFocus,
        open: root.open,
        keepMounted: root.keepMounted ?? false,
      },
      list: { autoFocus: list.autoFocus, autoFocusItem: list.autoFocusItem, variant: list.variant },
      paper: {
        top: parseFloat(nodes.paper.style.top),
        left: parseFloat(nodes.paper.style.left),
        origin: nodes.paper.style.transformOrigin,
      },
      timeout: transition.timeout ?? null,
      owner: owner(list.ownerState),
    };
    if (input.callbacks)
      snapshot.callbacks = {
        root: root['data-owner'],
        paper: paper['data-owner'],
        list: list['data-owner'],
      };
    act(() => transition.onEntering(nodes.paper, true));
    if (input.key) {
      let prevented = input.prevented ?? false;
      const event = {
        key: input.key,
        shiftKey: input.shiftKey ?? false,
        get defaultPrevented() {
          return prevented;
        },
        preventDefault() {
          prevented = true;
        },
      };
      act(() => list.onKeyDown(event));
    }
    if (input.rootClose) act(() => root.onClose({}, 'backdropClick'));
    return { input, snapshot, trace };
  } finally {
    act(() => renderer?.unmount());
  }
}
const fixtures = cases.map(run);
const html = renderToStaticMarkup(React.createElement(original.MenuPaper, null, 'Standalone'));
const helpers = {
  classes: classes.default,
  utility: ['root', 'paper', 'list', 'selected', 'focusVisible', 'custom'].map((slot) => [
    slot,
    classes.getMenuUtilityClass(slot),
  ]),
  paperHasHeightReservation: /max-height:calc\(100% - 96px\)/.test(html),
};
if (!helpers.paperHasHeightReservation)
  throw new Error('Original MenuPaper height reservation changed');
const file = 'tests/fixtures/mui-menu-9.5.0.json',
  output = await format(
    JSON.stringify({
      references: [material.reference, utils.reference, system.reference],
      renderer:
        'Actual original Menu and Popover with controlled DOM geometry and slot probes; no CSS layout or native-device proof',
      helpers,
      fixtures,
    }),
    { ...(await resolveConfig(file)), parser: 'json' },
  );
if (process.argv.includes('--check')) {
  if ((await readFile(file, 'utf8')) !== output) throw new Error('Pinned Menu fixture drift');
  console.log(
    `Pinned original Menu passed ${fixtures.length} composition/focus/dismissal cases and helper contracts.`,
  );
} else {
  await writeFile(file, output);
  console.log(`Recorded ${fixtures.length} original Menu cases and helper contracts.`);
}
