import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'MenuList/MenuList.js',
  'MenuList/MenuList.d.ts',
  'MenuList/MenuListContext.js',
  'MenuItem/MenuItem.js',
  'MenuItem/MenuItem.d.ts',
  'utils/useRovingTabIndex.js',
  'utils/focusWithVisible.js',
  'Select/utils/SelectFocusSourceContext.js',
  'ButtonBase/ButtonBase.js',
  'ButtonBase/useButtonBase.js',
  'utils/useFocusableWhenDisabled.js',
  'SvgIcon/SvgIcon.js',
]);
const utils = await loadReference('@mui/utils', [
  'useRovingTabIndex/useRovingTabIndex.js',
  'useRovingTabIndex/useRovingTabIndex.d.ts',
  'useRovingTabIndex/RovingTabIndexContext.js',
]);
const { require, directory } = material,
  React = require('react'),
  { create, act } = require('react-test-renderer');
const MenuList = require(`${directory}/node_modules/@mui/material/MenuList/MenuList.js`).default,
  MenuItem = require(`${directory}/node_modules/@mui/material/MenuItem/MenuItem.js`).default;
const { SelectFocusSourceProvider } = require(
  `${directory}/node_modules/@mui/material/Select/utils/SelectFocusSourceContext.js`,
);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.Node = {
  DOCUMENT_POSITION_DISCONNECTED: 1,
  DOCUMENT_POSITION_PRECEDING: 2,
  DOCUMENT_POSITION_FOLLOWING: 4,
  DOCUMENT_POSITION_CONTAINS: 8,
  DOCUMENT_POSITION_CONTAINED_BY: 16,
};
const base = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Amber' },
  { id: 'c', label: 'Beta' },
];
const cases = [
  {
    name: 'container arrows boundaries and wrapping',
    items: [base[0], { ...base[1], disabled: true }, base[2]],
    actions: [
      { focus: 'list' },
      { key: 'ArrowDown' },
      { key: 'ArrowDown' },
      { key: 'ArrowDown' },
      { key: 'ArrowUp' },
      { key: 'Home' },
      { key: 'End' },
    ],
  },
  {
    name: 'selected item owns initial focus and tab stop',
    items: [base[0], { ...base[1], selected: true }, base[2]],
    autoFocus: true,
    autoFocusItem: true,
    actions: [{ key: 'ArrowUp' }],
  },
  {
    name: 'menu variant ignores selection and suppresses the initial handoff',
    nativeInitialHandoffFix: true,
    items: [base[0], { ...base[1], selected: true }, base[2]],
    variant: 'menu',
    autoFocus: true,
    autoFocusItem: true,
    actions: [{ key: 'ArrowDown' }],
  },
  {
    name: 'disabled selected item is skipped',
    items: [base[0], { ...base[1], selected: true, disabled: true }, base[2]],
    autoFocusItem: true,
    actions: [{ key: 'End' }, { key: 'Home' }],
  },
  {
    name: 'focusable disabled items preserve navigation',
    items: [base[0], { ...base[1], disabled: true }, base[2]],
    disabledItemsFocusable: true,
    autoFocusItem: true,
    actions: [{ key: 'ArrowDown' }, { key: 'ArrowDown' }],
  },
  {
    name: 'arrow wrapping can be disabled',
    items: base,
    disableListWrap: true,
    autoFocusItem: true,
    actions: [{ key: 'ArrowUp' }, { key: 'End' }, { key: 'ArrowDown' }],
  },
  {
    name: 'typeahead repeats cycles and resets after timeout',
    items: base,
    autoFocusItem: true,
    actions: [{ key: 'a' }, { key: 'a' }, { wait: 501 }, { key: 'b' }, { key: 'e' }],
  },
  {
    name: 'failed prefix latches until timeout',
    items: base,
    autoFocusItem: true,
    actions: [{ key: 'x' }, { key: 'a' }, { wait: 501 }, { key: 'a' }],
  },
  {
    name: 'typeahead wraps despite disabled arrow wrapping',
    items: base,
    disableListWrap: true,
    autoFocusItem: true,
    actions: [{ key: 'End' }, { key: 'a' }],
  },
  {
    name: 'modifier and shifted navigation remain external',
    items: base,
    autoFocusItem: true,
    actions: [
      { key: 'ArrowDown', shiftKey: true },
      { key: 'a', ctrlKey: true },
      { key: 'ArrowDown', altKey: true },
    ],
  },
  {
    name: 'capture prevention cancels roving navigation',
    items: base,
    autoFocusItem: true,
    cancelCapture: true,
    actions: [{ key: 'ArrowDown' }],
  },
  {
    name: 'Enter and Space activation do not double dispatch',
    items: base,
    autoFocusItem: true,
    actions: [{ key: 'Enter' }, { keyUp: 'Enter' }, { key: ' ' }, { keyUp: ' ' }],
  },
  {
    name: 'keyed reorder uses current native tree order',
    items: base,
    autoFocusItem: true,
    actions: [{ focus: 'b' }, { reorder: ['c', 'b', 'a'] }, { key: 'ArrowDown' }],
  },
  {
    name: 'removing focused registration recovers the tab stop',
    items: base,
    autoFocusItem: true,
    actions: [{ focus: 'b' }, { remove: 'b' }, { key: 'ArrowDown' }],
  },
  {
    name: 'all disabled items fall back to the container',
    items: base.map((item) => ({ ...item, disabled: true })),
    autoFocus: true,
    autoFocusItem: true,
    actions: [{ key: 'ArrowDown' }, { key: 'Home' }, { key: 'End' }],
  },
  {
    name: 'empty menus keep bounded navigation',
    items: [],
    autoFocus: true,
    autoFocusItem: true,
    actions: [{ key: 'ArrowDown' }, { key: 'ArrowUp' }],
  },
  {
    name: 'keyboard focus source preserves focus indication',
    items: base,
    variant: 'menu',
    focusSource: 'keyboard',
    autoFocusItem: true,
    actions: [{ key: 'ArrowDown' }],
  },
  {
    name: 'pointer focus source suppresses focus indication',
    items: base,
    focusSource: 'pointer',
    autoFocusItem: true,
    actions: [],
  },
];
function run(input) {
  let items = input.items.map((item) => ({ ...item })),
    renderer,
    time = 0;
  const trace = [],
    snapshots = [],
    nodes = new Map();
  const doc = { activeElement: null, querySelector: () => null };
  globalThis.document = doc;
  const now = performance.now;
  performance.now = () => time;
  function event(target, key, extra = {}) {
    let prevented = false,
      stopped = false;
    return {
      key,
      target,
      currentTarget: target,
      ...extra,
      get defaultPrevented() {
        return prevented;
      },
      preventDefault() {
        prevented = true;
      },
      stopPropagation() {
        stopped = true;
      },
      isPropagationStopped: () => stopped,
    };
  }
  function node(id) {
    if (nodes.has(id)) return nodes.get(id);
    const value = {
      id,
      props: {},
      isConnected: true,
      ownerDocument: doc,
      tagName: id === 'list' ? 'UL' : 'LI',
      style: {},
      visible: true,
      get innerText() {
        return items.find((item) => item.id === id)?.label ?? '';
      },
      get textContent() {
        return this.innerText;
      },
      contains(other) {
        return this === other || (id === 'list' && other?.id !== 'list' && other?.isConnected);
      },
      compareDocumentPosition(other) {
        if (this === other) return 0;
        if (id === 'list') return 20;
        if (other.id === 'list') return 10;
        return items.findIndex((item) => item.id === id) <
          items.findIndex((item) => item.id === other.id)
          ? 4
          : 2;
      },
      getAttribute(name) {
        const key = name === 'tabindex' ? 'tabIndex' : name;
        const value = this.props[key];
        return value == null ? null : String(value);
      },
      hasAttribute(name) {
        const value = this.getAttribute(name);
        return value != null && value !== 'false';
      },
      matches() {
        return doc.activeElement === this && this.visible;
      },
      focus(options) {
        if (!this.isConnected) return;
        if (options?.focusVisible !== undefined) this.visible = options.focusVisible;
        const old = doc.activeElement;
        doc.activeElement = this;
        if (old && old !== this) {
          const e = event(old);
          old.props.onBlur?.(e);
        }
        const e = event(this);
        this.props.onFocus?.(e);
        if (id !== 'list') {
          e.currentTarget = node('list');
          node('list').props.onFocus?.(e);
        }
      },
      click() {
        this.props.onClick?.(event(this));
      },
    };
    nodes.set(id, value);
    return value;
  }
  const Root = React.forwardRef(function Root(props, ref) {
    node('list').props = props;
    return React.createElement('ul', { ...props, ref, 'data-case': 'list' }, props.children);
  });
  const Item = React.forwardRef(function Item(props, ref) {
    const id = props['data-case'];
    node(id).props = props;
    return React.createElement('li', { ...props, ref }, props.children);
  });
  const render = () =>
    React.createElement(
      SelectFocusSourceProvider,
      { value: input.focusSource ?? null },
      React.createElement(
        MenuList,
        {
          component: Root,
          variant: input.variant,
          autoFocus: input.autoFocus,
          autoFocusItem: input.autoFocusItem,
          disabledItemsFocusable: input.disabledItemsFocusable,
          disableListWrap: input.disableListWrap,
          onKeyDownCapture: (e) => {
            if (input.cancelCapture) e.preventDefault();
          },
          onKeyDown: (e) => trace.push(`key:${e.key}:${Boolean(e.defaultPrevented)}`),
        },
        items.map((item) =>
          React.createElement(
            MenuItem,
            {
              key: item.id,
              'data-case': item.id,
              component: Item,
              disabled: item.disabled,
              selected: item.selected,
              disableRipple: true,
              onClick: () => trace.push('click:' + item.id),
            },
            item.label,
          ),
        ),
      ),
    );
  const snapshot = () => ({
    focus: doc.activeElement?.id ?? null,
    items: items.map((item) => {
      const current = node(item.id);
      return {
        id: item.id,
        tabIndex: current.props.tabIndex ?? null,
        disabled: current.props['aria-disabled'] === true,
        focusVisible: current.props.className?.split(' ').includes('Mui-focusVisible') ?? false,
      };
    }),
    trace: [...trace],
  });
  try {
    act(() => {
      renderer = create(render(), {
        createNodeMock: (element) => node(element.props['data-case']),
      });
    });
    snapshots.push(snapshot());
    for (const action of input.actions) {
      act(() => {
        if (action.wait != null) {
          time += action.wait;
          return;
        }
        if (action.reorder) {
          items = action.reorder.map((id) => items.find((item) => item.id === id));
          renderer.update(render());
          return;
        }
        if (action.remove) {
          node(action.remove).isConnected = false;
          items = items.filter((item) => item.id !== action.remove);
          renderer.update(render());
          return;
        }
        if (action.focus) {
          node(action.focus).focus();
          return;
        }
        const target = doc.activeElement ?? node('list'),
          e = event(target, action.key ?? action.keyUp, action);
        if (action.key) {
          e.currentTarget = node('list');
          node('list').props.onKeyDownCapture?.(e);
          e.currentTarget = target;
          target.props.onKeyDown?.(e);
          if (target !== node('list') && !e.isPropagationStopped()) {
            e.currentTarget = node('list');
            node('list').props.onKeyDown?.(e);
          }
        } else {
          target.props.onKeyUp?.(e);
        }
      });
      snapshots.push(snapshot());
    }
    return { input, snapshots };
  } finally {
    act(() => renderer?.unmount());
    performance.now = now;
  }
}
const fixtures = cases.map(run),
  file = 'tests/fixtures/mui-menu-list-9.5.0.json';
const output = await format(
  JSON.stringify({
    references: [material.reference, utils.reference],
    renderer:
      'Original React test renderer with controlled connected DOM nodes, focus, clock and keyboard propagation; no CSS frames or native-device proof',
    fixtures,
  }),
  { ...(await resolveConfig(file)), parser: 'json' },
);
if (process.argv.includes('--check')) {
  if ((await readFile(file, 'utf8')) !== output) throw new Error('Pinned menu fixture drift');
  console.log(`Pinned original MenuList/MenuItem passed ${fixtures.length} interaction cases.`);
} else {
  await writeFile(file, output);
  console.log(`Recorded ${fixtures.length} original menu interaction cases.`);
}
