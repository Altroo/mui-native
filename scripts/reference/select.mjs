// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import prettier from 'prettier';
const { format, resolveConfig } = prettier;
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'Select/Select.js',
  'Select/Select.d.ts',
  'Select/SelectInput.js',
  'Select/SelectInput.d.ts',
  'NativeSelect/NativeSelectInput.js',
  'Select/selectClasses.js',
  'Select/selectClasses.d.ts',
  'Select/utils/closedTypeahead.js',
  'Select/utils/areEqualValues.js',
  'Select/utils/getOpenInteractionType.js',
  'InputBase/InputBase.js',
  'InputBase/utils.js',
  'TextField/TextField.js',
  'TextField/TextField.d.ts',
]);
const { require, directory } = material,
  React = require('react'),
  { create, act } = require('react-test-renderer');
const SelectInput = require(
  `${directory}/node_modules/@mui/material/Select/SelectInput.js`,
).default;
const Select = require(`${directory}/node_modules/@mui/material/Select/Select.js`).default;
const classes = require(`${directory}/node_modules/@mui/material/Select/selectClasses.js`);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const window = {
  innerWidth: 400,
  innerHeight: 800,
  navigator: { userAgent: 'controlled Select reference' },
  addEventListener() {},
  removeEventListener() {},
};
const document = {
  defaultView: window,
  body: {
    nodeType: 1,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 400, height: 800 }),
  },
  querySelector: () => null,
  getElementById: () => null,
  addEventListener() {},
  removeEventListener() {},
};
globalThis.window = window;
globalThis.document = document;
class NativeEvent {
  constructor(type, init = {}) {
    Object.assign(this, init);
    this.type = type;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopPropagation() {}
}
const defaults = [
  { id: 'a', label: 'Alpha', value: 'a' },
  { id: 'b', label: 'Beta', value: 'b' },
  { id: 'c', label: 'Bravo', value: 'c' },
];
const cases = [
  {
    name: 'change target remains mutable without changing selection',
    mutableTarget: true,
    actions: [{ press: true }, { click: 'b' }],
  },
  {
    name: 'undefined default changes when choosing an empty value',
    props: { defaultValue: { $undefined: true } },
    options: [
      { id: 'a', label: 'None', value: '' },
      { id: 'b', label: 'Beta', value: 'b' },
    ],
    actions: [{ press: true }, { click: 'a' }],
  },
  {
    name: 'MenuProps open override retains selection ownership',
    props: { open: false },
    forceMenu: true,
    actions: [{ click: 'b' }],
  },
  { name: 'controlled closed input retains its anchor minimum', props: { open: false } },
  { name: 'uncontrolled single selection', actions: [{ press: true }, { click: 'b' }] },
  { name: 'same selected value closes without change', actions: [{ press: true }, { click: 'a' }] },
  {
    name: 'controlled value and open request',
    props: { value: 'a', open: true },
    actions: [{ click: 'b' }],
  },
  {
    name: 'multiple preserves array order but display follows option order',
    props: { multiple: true, defaultValue: ['b'] },
    actions: [{ press: true }, { click: 'a' }, { click: 'b' }],
  },
  {
    name: 'primitive matching stringifies',
    options: [{ id: 'a', label: 'One', value: 1 }],
    props: { value: '1' },
  },
  {
    name: 'object reference matches',
    options: [{ id: 'a', label: 'Object', value: { $ref: 'one' } }],
    props: { value: { $ref: 'one' } },
  },
  {
    name: 'equal object without identity does not match',
    options: [{ id: 'a', label: 'Object', value: { $ref: 'one' } }],
    props: { value: { $copy: 'one' } },
  },
  { name: 'empty value has no display', props: { defaultValue: '' } },
  {
    name: 'displayEmpty shows the empty option',
    options: [{ id: 'a', label: 'Choose', value: '' }],
    props: { defaultValue: '', displayEmpty: true },
  },
  { name: 'renderValue has precedence', render: 'custom', props: { value: 'a' } },
  { name: 'empty renderValue whitespace is hidden', render: 'whitespace', props: { value: 'a' } },
  ...['Enter', ' ', 'ArrowUp', 'ArrowDown'].map((key) => ({
    name: `keyboard ${key} opens once`,
    actions: [{ key }],
  })),
  {
    name: 'readonly does not open or publish keys',
    props: { readOnly: true },
    actions: [{ press: true }, { key: 'Enter' }, { key: 'b' }],
  },
  {
    name: 'closed typeahead cycles repeated initial',
    actions: [{ key: 'b' }, { key: 'b' }, { key: 'b' }],
  },
  {
    name: 'closed typeahead doubled initial is a prefix',
    options: [
      { id: 'a', label: 'Alpha', value: 'a' },
      { id: 'b', label: 'Bali', value: 'b' },
      { id: 'c', label: 'Bbad', value: 'c' },
    ],
    actions: [{ key: 'b' }, { key: 'b' }],
  },
  {
    name: 'closed typeahead resets after 750ms',
    actions: [{ key: 'b' }, { wait: 750 }, { key: 'a' }],
  },
  {
    name: 'closed typeahead ignores disabled options',
    options: [
      { id: 'a', label: 'Alpha', value: 'a' },
      { id: 'b', label: 'Beta', value: 'b', disabled: true },
      { id: 'c', label: 'Bravo', value: 'c' },
    ],
    actions: [{ key: 'b' }],
  },
  { name: 'closed typeahead ignores modifier', actions: [{ key: 'b', ctrlKey: true }] },
  {
    name: 'multiple does not use closed typeahead',
    props: { multiple: true, defaultValue: [] },
    actions: [{ key: 'b' }],
  },
  {
    name: 'Space option keydown selects once before keyup',
    props: { multiple: true, defaultValue: [] },
    actions: [
      { key: ' ' },
      { itemUp: 'a', key: ' ' },
      { itemKey: 'a', key: ' ' },
      { itemKey: 'a', key: ' ', repeat: true },
      { itemUp: 'a', key: ' ' },
    ],
  },
  {
    name: 'option callback prevention preserves pinned selection order',
    preventChild: true,
    actions: [{ press: true }, { click: 'b' }],
  },
  {
    name: 'menu close requests reach Select',
    props: { defaultOpen: true },
    actions: [{ close: true }],
  },
  {
    name: 'MenuProps close override owns requests',
    props: { defaultOpen: true },
    menuClose: true,
    actions: [{ close: true }],
  },
  { name: 'autoWidth does not reserve anchor width', props: { open: true, autoWidth: true } },
  {
    name: 'paper owner and explicit minimum width',
    props: { open: true, variant: 'filled' },
    paperWidth: 317,
  },
];
async function run(input) {
  const objects = { one: { id: 1 } },
    decode = (value) =>
      Array.isArray(value)
        ? value.map(decode)
        : value && typeof value === 'object'
          ? value.$undefined
            ? undefined
            : value.$ref
              ? objects[value.$ref]
              : value.$copy
                ? { ...objects[value.$copy] }
                : value
          : value;
  const encode = (value) =>
    Array.isArray(value)
      ? value.map(encode)
      : value && typeof value === 'object'
        ? value === objects.one
          ? 'ref:one'
          : value.id === 1
            ? 'copy:one'
            : value
        : value;
  let renderer,
    root,
    paper,
    clock = 0,
    timerId = 0;
  const handle = React.createRef();
  const trace = [],
    timers = new Map(),
    oldSet = globalThis.setTimeout,
    oldClear = globalThis.clearTimeout;
  globalThis.setTimeout = (fn, delay) => {
    const id = ++timerId;
    timers.set(id, { fn, time: clock + delay });
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  const anchor = {
    nodeType: 1,
    clientWidth: 200,
    ownerDocument: document,
    getBoundingClientRect: () => ({ top: 100, left: 16, width: 200, height: 56 }),
  };
  const display = {
    nodeType: 1,
    parentNode: anchor,
    ownerDocument: document,
    focus: () => {},
    contains: (other) => other === display,
  };
  const optionNodes = new Map();
  function event(key = undefined, target = display, extra = {}) {
    const nativeEvent = new NativeEvent(key ? 'keydown' : 'click', { key, ...extra });
    return {
      type: key ? 'keydown' : 'click',
      button: 0,
      key,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      repeat: false,
      target,
      currentTarget: target,
      nativeEvent,
      get defaultPrevented() {
        return Boolean(nativeEvent.defaultPrevented);
      },
      preventDefault() {
        nativeEvent.preventDefault();
      },
      stopPropagation() {},
      ...extra,
    };
  }
  const Option = React.forwardRef((props, ref) => {
    const own = React.useRef(null);
    return React.createElement('div', { ...props, ref: ref ?? own }, props.children);
  });
  const Root = React.forwardRef((props, ref) => {
    root = props;
    return React.createElement('div', { ref }, props.children);
  });
  const Paper = React.forwardRef((props, ref) => {
    paper = props;
    return React.createElement('div', { ref }, props.children);
  });
  const List = React.forwardRef((props, ref) => {
    React.useImperativeHandle(props.actions, () => ({
      adjustStyleForScrollbar: () => null,
      focusInitialTarget: () => null,
    }));
    return React.createElement('div', { ref }, props.children);
  });
  const options = (input.options ?? defaults).map((option) => ({
    ...option,
    value: decode(option.value),
  }));
  const props = {
    variant: 'outlined',
    defaultValue: 'a',
    defaultOpen: false,
    displayEmpty: false,
    name: 'choice',
    autoWidth: false,
    multiple: false,
    ...Object.fromEntries(
      Object.entries(input.props ?? {}).map(([key, value]) => [key, decode(value)]),
    ),
  };
  const propsDisplay = () =>
    renderer.root.find((node) => typeof node.type === 'string' && node.props.role === 'combobox')
      .props;
  const optionProps = (id) =>
    renderer.root.find((node) => typeof node.type === 'string' && node.props['data-case'] === id)
      .props;
  const text = (node) =>
    typeof node === 'string' || typeof node === 'number'
      ? String(node)
      : node.children.map(text).join('');
  const states = [];
  const snapshot = () => {
    const node = renderer.root.find(
      (node) => typeof node.type === 'string' && node.props.role === 'combobox',
    );
    return {
      value: handle.current?.value === undefined ? 'value:undefined' : encode(handle.current.value),
      display: text(node).replace(/\u200b/g, ''),
      open: root.open,
      selected: renderer.root
        .findAll(
          (node) =>
            typeof node.type === 'string' &&
            node.props.role === 'option' &&
            node.props['aria-selected'] === 'true',
        )
        .map((node) => node.props['data-case']),
      minWidth: paper.style?.minWidth ?? null,
    };
  };
  try {
    await act(() => {
      renderer = create(
        React.createElement(
          SelectInput,
          {
            ...props,
            ref: handle,
            ...(input.render
              ? { renderValue: () => (input.render === 'whitespace' ? '   ' : 'Custom') }
              : {}),
            onOpen: () => trace.push('open'),
            onClose: () => trace.push('close'),
            onKeyDown: (event) => trace.push(`key:${event.key}`),
            onChange: (event, child) => {
              trace.push(
                `change:${JSON.stringify(encode(event.target.value))}:${child.props['data-case']}:${event.target.name}`,
              );
              if (input.mutableTarget) {
                event.target = { value: 'changed by consumer', name: 'other' };
                trace.push(`targetMutable:${event.target.value === 'changed by consumer'}`);
              }
            },
            MenuProps: {
              ...(input.forceMenu ? { open: true } : {}),
              slots: { root: Root, paper: Paper, list: List },
              ...(input.menuClose ? { onClose: () => trace.push('menuClose') } : {}),
              ...(input.paperWidth
                ? {
                    slotProps: {
                      paper: (owner) => ({
                        style: { minWidth: input.paperWidth },
                        'data-owner': JSON.stringify({
                          variant: owner.variant,
                          open: owner.open,
                          value: encode(owner.value),
                        }),
                      }),
                    },
                  }
                : {}),
            },
          },
          options.map((option) =>
            React.createElement(
              Option,
              {
                key: option.id,
                value: option.value,
                disabled: option.disabled,
                'data-case': option.id,
                onClick: (event) => {
                  trace.push(`child:${option.id}`);
                  if (input.preventChild) event.preventDefault();
                },
                onKeyDown: (event) => trace.push(`itemKey:${option.id}:${event.key}`),
                onKeyUp: (event) => trace.push(`itemUp:${option.id}:${event.key}`),
              },
              option.label,
            ),
          ),
        ),
        {
          createNodeMock: (element) => {
            if (element.props.role === 'combobox') return display;
            if (element.props['data-case']) {
              const id = element.props['data-case'];
              const node = {
                nodeType: 1,
                ownerDocument: document,
                hasAttribute: (name) => name === 'tabindex' && !element.props.disabled,
                click: () => optionProps(id).onClick(event(undefined, node)),
              };
              optionNodes.set(id, node);
              return node;
            }
            return {
              nodeType: 1,
              ownerDocument: document,
              style: {
                setProperty(key, value) {
                  this[key] = value;
                },
              },
              offsetWidth: 120,
              offsetHeight: 80,
            };
          },
        },
      );
    });
    states.push(snapshot());
    for (const action of input.actions ?? []) {
      await act(() => {
        if (action.wait !== undefined) {
          clock += action.wait;
          for (const [id, timer] of [...timers])
            if (timer.time <= clock) {
              timers.delete(id);
              timer.fn();
            }
        } else if (action.press) propsDisplay().onMouseDown?.(event());
        else if (action.click)
          optionProps(action.click).onClick(event(undefined, optionNodes.get(action.click)));
        else if (action.itemKey)
          optionProps(action.itemKey).onKeyDown(
            event(action.key, optionNodes.get(action.itemKey), action),
          );
        else if (action.itemUp)
          optionProps(action.itemUp).onKeyUp(
            event(action.key, optionNodes.get(action.itemUp), action),
          );
        else if (action.close) root.onClose?.(event());
        else if (action.key) propsDisplay().onKeyDown(event(action.key, display, action));
      });
      states.push(snapshot());
    }
    return { input, states, trace };
  } finally {
    try {
      if (renderer) await act(() => renderer.unmount());
    } finally {
      globalThis.setTimeout = oldSet;
      globalThis.clearTimeout = oldClear;
    }
  }
}
const fixtures = [];
for (const input of cases) fixtures.push(await run(input));
const wrappers = [];
for (const input of [
  { name: 'custom input props win', value: 'b', inputValue: 'a', wrapperValue: 'b' },
  { name: 'input props precede outer value', value: 'a', wrapperValue: 'b' },
  { name: 'outlined displayEmpty forces notch', displayEmpty: true },
]) {
  let actual, renderer;
  const Probe = React.forwardRef((props, _ref) => {
    actual = props;
    return null;
  });
  const custom = React.createElement(Probe, {
    inputProps: input.inputValue ? { value: input.inputValue } : undefined,
  });
  await act(() => {
    renderer = create(
      React.createElement(Select, {
        value: input.value,
        input: custom,
        inputProps: input.wrapperValue ? { value: input.wrapperValue } : undefined,
        displayEmpty: input.displayEmpty,
      }),
    );
  });
  wrappers.push({
    input,
    output: { inputValue: actual.inputProps.value ?? null, notched: actual.notched ?? null },
  });
  await act(() => renderer.unmount());
}
const result = {
  material: material.reference,
  scope:
    'Actual original SelectInput and Select wrapper with controlled DOM refs, clock and Menu slots; no browser layout or physical native input evidence.',
  fixtures,
  wrappers,
  classes: classes.default,
  helper: classes.getSelectUtilityClasses('focusVisible'),
};
const file = 'tests/fixtures/mui-select-9.5.0.json';
const output = await format(JSON.stringify(result), {
  ...(await resolveConfig(file)),
  filepath: file,
});
if (process.argv.includes('--check')) {
  if ((await readFile(file, 'utf8')) !== output) throw new Error('Pinned Select reference differs');
  console.log(
    `Pinned original Select passed ${fixtures.length} interaction and ${wrappers.length} wrapper cases plus class helpers.`,
  );
} else {
  await writeFile(file, output);
  console.log(
    `Recorded ${fixtures.length} original Select interaction and ${wrappers.length} wrapper cases.`,
  );
}
