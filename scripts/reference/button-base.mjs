import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
const { reference, require, directory } = await loadReference('@mui/material', [
  'ButtonBase/ButtonBase.js',
  'ButtonBase/ButtonBase.d.ts',
  'ButtonBase/useButtonBase.js',
  'utils/useFocusableWhenDisabled.js',
]);
const React = require('react');
const { create, act } = require('react-test-renderer');
const ButtonBase = require(
  `${directory}/node_modules/@mui/material/ButtonBase/ButtonBase.js`,
).default;
const useButtonBase = require(
  `${directory}/node_modules/@mui/material/ButtonBase/useButtonBase.js`,
).default;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.document = { querySelector: () => null };
const cases = [
  {
    name: 'Enter activates on key down',
    actions: [
      { kind: 'down', key: 'Enter' },
      { kind: 'up', key: 'Enter' },
    ],
  },
  {
    name: 'Space activates on key up',
    actions: [
      { kind: 'down', key: ' ' },
      { kind: 'up', key: ' ' },
    ],
  },
  {
    name: 'nested keyboard target is not parent activation',
    actions: [
      { kind: 'down', key: 'Enter', nested: true },
      { kind: 'up', key: ' ', nested: true },
    ],
  },
  {
    name: 'canceled Space up does not activate',
    cancelUp: true,
    actions: [
      { kind: 'down', key: ' ' },
      { kind: 'up', key: ' ' },
    ],
  },
  {
    name: 'canceled Enter down still dispatches click',
    cancelDown: true,
    actions: [{ kind: 'down', key: 'Enter' }],
  },
  {
    name: 'activation cancellation is separate',
    cancelClick: true,
    actions: [{ kind: 'down', key: 'Enter' }],
  },
  {
    name: 'ordinary keys only call external handlers',
    actions: [
      { kind: 'down', key: 'a' },
      { kind: 'up', key: 'a' },
    ],
  },
  {
    name: 'Enter repeat remains activation',
    actions: [{ kind: 'down', key: 'Enter', repeat: true }],
  },
  {
    name: 'disabled drops key and click handlers',
    disabled: true,
    actions: [{ kind: 'down', key: 'Enter' }, { kind: 'up', key: ' ' }, { kind: 'click' }],
  },
  {
    name: 'focus callbacks and state',
    actions: [
      { kind: 'focus', visible: true },
      { kind: 'blur' },
      { kind: 'focus', visible: false },
    ],
  },
  { name: 'explicit focus action and cleanup', actions: [{ kind: 'action' }, { kind: 'blur' }] },
  {
    name: 'suppressed focus state and callback',
    suppressFocusVisible: true,
    actions: [{ kind: 'focus', visible: true }, { kind: 'action' }],
  },
];
function run(input) {
  const trace = [],
    snapshots = [],
    events = [],
    action = React.createRef();
  let rootProps,
    renderer,
    focusVisible = false,
    focuses = 0,
    activation;
  const node = {
    tagName: 'DIV',
    focus() {
      focuses++;
    },
    matches: () => focusVisible,
    click() {
      activation = event();
      rootProps.onClick(activation);
      trace.push('click-prevented:' + activation.defaultPrevented);
    },
  };
  function event(action = {}) {
    let prevented = false;
    return {
      key: action.key,
      repeat: action.repeat,
      target: action.nested ? {} : node,
      currentTarget: node,
      get defaultPrevented() {
        return prevented;
      },
      preventDefault() {
        prevented = true;
      },
      stopPropagation() {},
    };
  }
  const Root = React.forwardRef(function Root(props, ref) {
    rootProps = props;
    return React.createElement('div', { ref }, props.children);
  });
  try {
    act(() => {
      renderer = create(
        React.createElement(
          ButtonBase,
          {
            component: Root,
            disableRipple: true,
            disabled: input.disabled,
            suppressFocusVisible: input.suppressFocusVisible,
            action,
            onKeyDown(e) {
              trace.push('down:' + e.key);
              if (input.cancelDown) e.preventDefault();
            },
            onKeyUp(e) {
              trace.push('up:' + e.key);
              if (input.cancelUp) e.preventDefault();
            },
            onClick(e) {
              trace.push('click');
              if (input.cancelClick) e.preventDefault();
            },
            onFocusVisible() {
              trace.push('focus-visible');
            },
            onFocus() {
              trace.push('focus');
            },
            onBlur() {
              trace.push('blur');
            },
          },
          'Action',
        ),
        { createNodeMock: () => node },
      );
    });
    for (const actionInput of input.actions) {
      activation = undefined;
      const e = event(actionInput);
      act(() => {
        if (actionInput.kind === 'down') rootProps.onKeyDown(e);
        if (actionInput.kind === 'up') rootProps.onKeyUp(e);
        if (actionInput.kind === 'click') {
          activation = e;
          rootProps.onClick(e);
          trace.push('click-prevented:' + e.defaultPrevented);
        }
        if (actionInput.kind === 'focus') {
          focusVisible = actionInput.visible;
          rootProps.onFocus(e);
        }
        if (actionInput.kind === 'blur') {
          focusVisible = false;
          rootProps.onBlur(e);
        }
        if (actionInput.kind === 'action') action.current.focusVisible();
      });
      events.push(e.defaultPrevented);
      snapshots.push({
        trace: [...trace],
        eventPrevented: e.defaultPrevented,
        focuses,
        focusVisible: rootProps.className.split(' ').includes('Mui-focusVisible'),
        tabIndex: rootProps.tabIndex,
      });
    }
    return { ...input, snapshots };
  } finally {
    if (renderer) act(() => renderer.unmount());
  }
}
function focusable(disabled, allow) {
  let renderer, current;
  const node = { tagName: 'DIV', click() {} };
  function Harness() {
    const { getButtonProps, rootRef } = useButtonBase({
      nativeButton: false,
      disabled,
      focusableWhenDisabled: allow,
    });
    current = getButtonProps();
    return React.createElement('div', { ref: rootRef });
  }
  try {
    act(() => {
      renderer = create(React.createElement(Harness), { createNodeMock: () => node });
    });
    return {
      disabled,
      allow,
      tabIndex: current.tabIndex,
      ariaDisabled: current['aria-disabled'] ?? null,
      keys: ['Tab', 'Enter', 'ArrowDown'].map((key) => {
        let prevented = false;
        current.onKeyDown({
          key,
          target: node,
          currentTarget: node,
          preventDefault() {
            prevented = true;
          },
        });
        return { key, prevented };
      }),
    };
  } finally {
    if (renderer) act(() => renderer.unmount());
  }
}
const filename = 'tests/fixtures/mui-button-base-9.5.0.json';
const output = await format(
  JSON.stringify({
    reference,
    renderer:
      'react-test-renderer 19.3.0; controlled non-button host, focus matcher and events; no CSS/native input evidence',
    fixtures: cases.map(run),
    disabledFocus: [focusable(false, false), focusable(true, false), focusable(true, true)],
  }),
  { ...(await resolveConfig(filename)), filepath: filename },
);
if (process.argv.includes('--check')) {
  if ((await readFile(filename, 'utf8')) !== output) throw new Error('ButtonBase reference drift');
  console.log(
    `Pinned original ButtonBase passed ${cases.length} activation/focus cases and three disabled-focus hook cases.`,
  );
} else await writeFile(filename, output);
