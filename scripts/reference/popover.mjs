// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import prettier from 'prettier';
const { format, resolveConfig } = prettier;
import { loadReference } from './load.mjs';
const { reference, require, directory } = await loadReference('@mui/material', [
  'Popover/Popover.js',
  'Popover/Popover.d.ts',
  'utils/useSlot.js',
]);
const React = require('react');
const { create, act } = require('react-test-renderer');
const original = require(`${directory}/node_modules/@mui/material/Popover/Popover.js`);
const Popover = original.default;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const viewport = { width: 400, height: 800 };
const window = {
  innerWidth: viewport.width,
  innerHeight: viewport.height,
  navigator: { userAgent: 'jsdom reference geometry' },
  addEventListener() {},
  removeEventListener() {},
};
const document = {
  defaultView: window,
  querySelector: () => null,
  body: { getBoundingClientRect: () => ({ top: 0, left: 0, ...viewport }) },
};
globalThis.document = document;
globalThis.window = window;
const inputs = [
  { name: 'default anchor and paper origin' },
  {
    name: 'centered attachment',
    anchorOrigin: { vertical: 'center', horizontal: 'center' },
    transformOrigin: { vertical: 'center', horizontal: 'center' },
  },
  {
    name: 'bottom right attachment',
    anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
    transformOrigin: { vertical: 'bottom', horizontal: 'right' },
  },
  {
    name: 'fractional numeric origins round only coordinates',
    anchor: { top: 200.25, left: 100.125, width: 40, height: 20 },
    anchorOrigin: { vertical: 3.125, horizontal: 7.75 },
    transformOrigin: { vertical: 2.25, horizontal: 4.5 },
  },
  {
    name: 'top and left viewport correction',
    anchor: { top: 2, left: 3, width: 40, height: 20 },
    transformOrigin: { vertical: 'bottom', horizontal: 'right' },
  },
  {
    name: 'bottom and right viewport correction',
    anchor: { top: 790, left: 395, width: 40, height: 20 },
  },
  {
    name: 'null margin retains pinned horizontal correction',
    marginThreshold: null,
    anchor: { top: 790, left: 395, width: 40, height: 20 },
  },
  {
    name: 'zero margin clips at viewport',
    marginThreshold: 0,
    anchor: { top: 790, left: 395, width: 40, height: 20 },
  },
  {
    name: 'position reference ignores anchor origin',
    anchorReference: 'anchorPosition',
    anchorPosition: { top: 130, left: 170 },
    anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
  },
  {
    name: 'none only writes transform origin',
    anchorReference: 'none',
    transformOrigin: { vertical: 'bottom', horizontal: 'right' },
  },
  {
    name: 'missing anchor uses body',
    missingAnchor: true,
    anchorOrigin: { vertical: 'center', horizontal: 'center' },
  },
  {
    name: 'negative numeric origins',
    anchorOrigin: { vertical: -10, horizontal: -7 },
    transformOrigin: { vertical: -3, horizontal: -2 },
  },
  {
    name: 'oversize top branch takes precedence',
    size: { width: 600, height: 1000 },
    anchor: { top: -200, left: -100, width: 40, height: 20 },
  },
  { name: 'zero sized paper', size: { width: 0, height: 0 } },
];
async function run(input) {
  const size = input.size ?? { width: 120, height: 80 };
  const anchorRect = input.anchor ?? { top: 200, left: 100, width: 40, height: 20 };
  const anchor = { nodeType: 1, ownerDocument: document, getBoundingClientRect: () => anchorRect };
  const style = {
    setProperty(name, value) {
      this[name] = value;
    },
  };
  const paperNode = {
    nodeType: 1,
    ownerDocument: document,
    offsetWidth: size.width,
    offsetHeight: size.height,
    style,
  };
  const rootNode = { nodeType: 1, ownerDocument: document, style: {} };
  let rootProps, paperProps, transitionProps, renderer;
  const Root = React.forwardRef(function Root(props, ref) {
    rootProps = props;
    return React.createElement('div', { ref }, props.children);
  });
  const Paper = React.forwardRef(function Paper(props, ref) {
    paperProps = props;
    return React.createElement('div', { ref, 'data-paper': true }, props.children);
  });
  const Transition = function Transition(props) {
    transitionProps = props;
    return props.children;
  };
  const action = React.createRef();
  const { name, size: _size, anchor: _anchor, missingAnchor, ...props } = input;
  try {
    await act(() => {
      renderer = create(
        React.createElement(
          Popover,
          {
            open: true,
            anchorEl: missingAnchor ? undefined : anchor,
            action,
            slots: { root: Root, paper: Paper, transition: Transition },
            ...props,
          },
          'Content',
        ),
        { createNodeMock: (element) => (element.props['data-paper'] ? paperNode : rootNode) },
      );
    });
    return {
      ...input,
      viewport,
      resolvedAnchor: missingAnchor ? { top: 0, left: 0, ...viewport } : anchorRect,
      resolvedSize: size,
      result: {
        top: style.top ?? null,
        left: style.left ?? null,
        transformOrigin: style.transformOrigin,
      },
      routing: {
        open: rootProps.open,
        disableAutoFocus: rootProps.disableAutoFocus,
        invisibleBackdrop: rootProps.slotProps.backdrop.invisible,
        elevation: paperProps.elevation,
        appear: transitionProps.appear,
        in: transitionProps.in,
        timeout: transitionProps.timeout ?? null,
        action: typeof action.current?.updatePosition === 'function',
      },
    };
  } finally {
    if (renderer) await act(() => renderer.unmount());
  }
}
const fixtures = [];
for (const input of inputs) fixtures.push(await run(input));
const offsets = [0, 1, 37.5].map((length) => ({
  length,
  vertical: ['top', 'center', 'bottom', -2.25].map((value) => [
    value,
    original.getOffsetTop({ height: length }, value),
  ]),
  horizontal: ['left', 'center', 'right', 4.75].map((value) => [
    value,
    original.getOffsetLeft({ width: length }, value),
  ]),
}));
const filename = 'tests/fixtures/mui-popover-9.5.0.json';
const output = await format(
  JSON.stringify({
    reference,
    renderer:
      'react-test-renderer 19.3.0 with controlled DOM geometry; no CSS/native frame evidence',
    fixtures,
    offsets,
  }),
  { ...(await resolveConfig(filename)), filepath: filename },
);
if (process.argv.includes('--check')) {
  if ((await readFile(filename, 'utf8')) !== output) throw new Error('Popover reference drift');
  console.log(`Pinned original Popover positioning and routing passed ${fixtures.length} cases.`);
} else await writeFile(filename, output);
