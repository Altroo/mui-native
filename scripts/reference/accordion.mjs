// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { writeFile } from 'node:fs/promises';
import prettier from 'prettier';
const { format, resolveConfig } = prettier;
import { loadReference } from './load.mjs';
const names = ['Accordion', 'AccordionSummary', 'AccordionDetails', 'AccordionActions'];
const sources = names.flatMap((name) => [
  `${name}/${name}.js`,
  `${name}/${name}.d.ts`,
  `${name}/${name[0].toLowerCase() + name.slice(1)}Classes.js`,
  `${name}/${name[0].toLowerCase() + name.slice(1)}Classes.d.ts`,
]);
const { reference, require, directory } = await loadReference('@mui/material', [
  ...sources,
  'Accordion/AccordionContext.js',
  'utils/useSlot.js',
  'utils/useControlled.js',
  'className/index.js',
  'Paper/Paper.js',
  'Paper/paperClasses.js',
  'Box/Box.js',
  'ButtonBase/ButtonBase.js',
  'ButtonBase/buttonBaseClasses.js',
  'styles/rootShouldForwardProp.js',
  'styles/slotShouldForwardProp.js',
]);
const React = require('react'),
  { create, act } = require('react-test-renderer');
const original = (name) =>
  require(`${directory}/node_modules/@mui/material/${name}/${name}.js`).default;
const Accordion = original('Accordion'),
  Summary = original('AccordionSummary');
const { ThemeProvider, createTheme } = require(
  `${directory}/node_modules/@mui/material/styles/index.js`,
);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.document = { querySelector: () => null };
const classes = Object.fromEntries(
  names.map((name) => [
    name,
    require(
      `${directory}/node_modules/@mui/material/${name}/${name[0].toLowerCase() + name.slice(1)}Classes.js`,
    ).default,
  ]),
);
const classUtils = await loadReference('@mui/utils', [
  'generateUtilityClass/generateUtilityClass.js',
  'ClassNameGenerator/ClassNameGenerator.js',
  'composeClasses/composeClasses.js',
  'mergeSlotProps/mergeSlotProps.js',
  'appendOwnerState/appendOwnerState.js',
]);
const { unstable_ClassNameGenerator: generator } = require(
  directory + '/node_modules/@mui/material/className',
);
const classHelpers = Object.fromEntries(
  names.map((name) => [
    name,
    require(directory + '/node_modules/@mui/material/' + name)['get' + name + 'UtilityClass'],
  ]),
);
const utilitySlots = [
  'root',
  'unknown',
  'active',
  'checked',
  'completed',
  'disabled',
  'error',
  'expanded',
  'focused',
  'focusVisible',
  'open',
  'readOnly',
  'required',
  'selected',
  'toString',
  'constructor',
  'valueOf',
  'hasOwnProperty',
  '__proto__',
];
const classUtility = Object.fromEntries(
  Object.entries(classHelpers).map(([name, helper]) => [
    name,
    Object.fromEntries(utilitySlots.map((slot) => [slot, helper(slot)])),
  ]),
);
const classContracts = [];
for (const input of [
  { expanded: false, disabled: false, square: false, disableGutters: false },
  { expanded: true, disabled: true, square: false, disableGutters: false },
  { expanded: true, disabled: false, square: true, disableGutters: true },
]) {
  const trace = [],
    observed = {};
  const cls = (family, names) =>
    Object.fromEntries(
      names.map((slot) => [
        slot,
        Object.defineProperty({}, 'value', {
          get() {
            trace.push(family + ':' + slot);
            return family + '-' + slot;
          },
        }),
      ]),
    );
  const getters = (family, names) =>
    Object.fromEntries(
      Object.entries(cls(family, names)).map(([key, v]) => [
        key,
        { enumerable: true, get: () => v.value },
      ]),
    );
  const classes = Object.defineProperties(
    {},
    getters('accordion', [
      'root',
      'rounded',
      'expanded',
      'disabled',
      'gutters',
      'heading',
      'region',
    ]),
  );
  const summaryClasses = Object.defineProperties(
    {},
    getters('summary', [
      'root',
      'expanded',
      'disabled',
      'gutters',
      'focusVisible',
      'content',
      'expandIconWrapper',
    ]),
  );
  const slot = (name) =>
    React.forwardRef(function Slot(props, ref) {
      observed[name] = {
        className: props.className ?? null,
        focusVisibleClassName: props.focusVisibleClassName ?? null,
        disabled: props.disabled ?? null,
      };
      return React.createElement(name, { ref }, props.children);
    });
  const aSlots = Object.fromEntries(
    ['root', 'heading', 'region', 'transition'].map((name) => [name, slot('a-' + name)]),
  );
  const sSlots = Object.fromEntries(
    ['root', 'content', 'expandIconWrapper'].map((name) => [name, slot('s-' + name)]),
  );
  const slotProps = (family, names) =>
    Object.fromEntries(
      names.map((name) => [
        name,
        () => {
          trace.push(family + ':callback:' + name);
          return { className: family + '-slot-' + name };
        },
      ]),
    );
  generator.configure((name) => 'Consumer' + name);
  let tree;
  await act(() => {
    tree = create(
      React.createElement(
        Accordion,
        {
          ...input,
          expanded: input.expanded,
          classes,
          className: 'authored-accordion',
          slots: aSlots,
          slotProps: slotProps('accordion', ['root', 'heading', 'transition', 'region']),
        },
        React.createElement(
          Summary,
          {
            classes: summaryClasses,
            className: 'authored-summary',
            focusVisibleClassName: 'authored-focus',
            expandIcon: 'Icon',
            slots: sSlots,
            slotProps: slotProps('summary', ['root', 'content', 'expandIconWrapper']),
          },
          'Summary',
        ),
        'Body',
      ),
    );
  });
  classContracts.push({ input, trace, observed });
  await act(() => tree.unmount());
  generator.reset();
}
const { renderToStaticMarkup } = require('react-dom/server');
const publicClass = (value) =>
  String(value ?? '')
    .split(/\s+/)
    .filter((token) => token && !token.startsWith('css-'))
    .join(' ');
const defaultClassContracts = [];
for (const expanded of [false, true]) {
  const leaves = {},
    callbacks = {};
  const leaf = (name) =>
    React.forwardRef(function Leaf(props, ref) {
      leaves[name] = publicClass(props.className);
      return React.createElement('div', { ref }, props.children);
    });
  const override = (name) => (props) => {
    const [component, slot] = name.split('.');
    const expected = component + '-' + slot;
    const className = publicClass(props.className);
    if (className.split(' ').includes(expected)) callbacks[name] = className;
    return {};
  };
  const components = Object.fromEntries(
    [
      ['MuiAccordion', ['root', 'heading', 'region']],
      ['MuiAccordionSummary', ['root', 'content', 'expandIconWrapper']],
      ['MuiPaper', ['root', 'rounded']],
      ['MuiButtonBase', ['root']],
    ].map(([name, slots]) => [
      name,
      {
        styleOverrides: Object.fromEntries(
          slots.map((slot) => [slot, override(name + '.' + slot)]),
        ),
      },
    ]),
  );
  const theme = createTheme({ components });
  const PanelLeaf = leaf('panel'),
    SummaryLeaf = leaf('summary');
  renderToStaticMarkup(
    React.createElement(
      ThemeProvider,
      { theme },
      React.createElement(
        Accordion,
        {
          expanded,
          component: PanelLeaf,
          classes: { root: 'custom-panel-root', rounded: 'custom-panel-rounded' },
          className: 'authored-panel',
        },
        React.createElement(
          Summary,
          {
            component: SummaryLeaf,
            classes: { root: 'custom-summary-root', content: 'custom-summary-content' },
            className: 'authored-summary',
            expandIcon: 'Icon',
          },
          'Summary',
        ),
        'Body',
      ),
    ),
  );
  defaultClassContracts.push({ expanded, leaves, callbacks });
}
const inputs = [
  { name: 'uncontrolled closed', props: {}, actions: ['click', 'click'] },
  { name: 'default expanded', props: { defaultExpanded: true }, actions: ['click', 'click'] },
  {
    name: 'controlled closed',
    props: { expanded: false },
    actions: ['click', 'click', true, 'click'],
  },
  { name: 'controlled expanded', props: { expanded: true }, actions: ['click', false, 'click'] },
  { name: 'disabled context', props: { disabled: true }, actions: [] },
  {
    name: 'disabled and expanded without gutters',
    props: { disabled: true, defaultExpanded: true, disableGutters: true },
    actions: [],
  },
  {
    name: 'root-slot summary override',
    props: { disabled: true },
    summarySlot: { disabled: false },
    actions: ['click'],
  },
  {
    name: 'summary prop override',
    props: { disabled: true },
    summaryProps: { disabled: false },
    actions: ['click'],
  },
  {
    name: 'explicit region links',
    props: {},
    region: { id: 'custom-region', 'aria-labelledby': 'custom-summary' },
    actions: ['click'],
  },
  {
    name: 'transition props override defaults',
    props: {},
    transition: { in: true, timeout: 17, unmountOnExit: true },
    actions: ['click'],
  },
  {
    name: 'theme expansion defaults',
    defaults: { defaultExpanded: true, disableGutters: true },
    props: {},
    actions: ['click'],
  },
  {
    name: 'prevented slot callback does not cancel expansion',
    props: {},
    prevent: true,
    actions: ['click'],
  },
];
// Encode explicit undefined values without losing their property presence in JSON fixtures.
function authored(input) {
  const { $undefined = [], ...props } = input ?? {};
  for (const key of $undefined) props[key] = undefined;
  return props;
}
inputs.push(
  {
    name: 'authored ARIA overrides generated state',
    props: { expanded: true },
    summaryProps: { 'aria-expanded': false },
    actions: ['click'],
  },
  {
    name: 'explicit undefined authored ARIA',
    props: { expanded: true },
    summaryProps: { $undefined: ['aria-expanded'] },
    actions: [],
  },
  {
    name: 'explicit undefined slot ARIA',
    props: { expanded: true },
    summarySlot: { $undefined: ['aria-expanded'] },
    actions: [],
  },
  {
    name: 'explicit undefined authored disabled',
    props: { disabled: true },
    summaryProps: { $undefined: ['disabled'] },
    actions: [],
  },
  {
    name: 'explicit undefined slot disabled',
    props: {},
    summaryProps: { disabled: true },
    summarySlot: { $undefined: ['disabled'] },
    actions: [],
  },
  {
    name: 'authored ripple defaults override generated defaults',
    props: {},
    summaryProps: { disableRipple: false, focusRipple: true },
    actions: [],
  },
);
const fixtures = [];
for (const input of inputs) {
  const trace = [],
    snapshots = [];
  let props = { ...input.props },
    tree;
  const Root = React.forwardRef(({ children }, ref) =>
    React.createElement('accordion-root', { ref }, children),
  );
  const Heading = ({ children }) => React.createElement('heading-slot', null, children);
  const Region = ({ children, ...props }) => React.createElement('region-slot', props, children);
  const Transition = ({ children, ...props }) =>
    React.createElement('transition-slot', props, children);
  const SummaryRoot = React.forwardRef(({ children, ...props }, ref) =>
    React.createElement('summary-root', { ...props, ref }, children),
  );
  const Content = ({ children, ...props }) =>
    React.createElement('summary-content', props, children);
  const Icon = ({ children, ...props }) => React.createElement('summary-icon', props, children);
  const node = () =>
    React.createElement(
      ThemeProvider,
      { theme: createTheme({ components: { MuiAccordion: { defaultProps: input.defaults } } }) },
      React.createElement(
        Accordion,
        {
          ...props,
          onChange: (_event, expanded) => trace.push(`change:${expanded}`),
          slots: { root: Root, heading: Heading, region: Region, transition: Transition },
          slotProps: { region: input.region, transition: input.transition },
        },
        React.createElement(
          Summary,
          {
            id: 'summary',
            'aria-controls': 'region',
            expandIcon: 'Expand',
            ...authored(input.summaryProps),
            onClick: () => trace.push('summary'),
            slots: { root: SummaryRoot, content: Content, expandIconWrapper: Icon },
            slotProps: {
              root: {
                ...authored(input.summarySlot),
                onClick: (event) => {
                  trace.push('slot');
                  if (input.prevent) event.preventDefault();
                },
              },
            },
          },
          'Account',
        ),
        React.createElement('body', null, 'Details'),
      ),
    );
  const snapshot = () => {
    const summary = tree.root.findByType('summary-root').props;
    const region = tree.root.findByType('region-slot').props;
    const transition = tree.root.findByType('transition-slot').props;
    snapshots.push({
      expanded: summary['aria-expanded'],
      disabled: summary.disabled,
      ripple: { disableRipple: summary.disableRipple, focusRipple: summary.focusRipple },
      owner: {
        expanded: summary.ownerState.expanded,
        disabled: summary.ownerState.disabled,
        disableGutters: summary.ownerState.disableGutters,
      },
      region: { id: region.id, labelledBy: region['aria-labelledby'], role: region.role },
      transition: {
        in: transition.in,
        timeout: transition.timeout,
        ...(transition.unmountOnExit === undefined
          ? {}
          : { unmountOnExit: transition.unmountOnExit }),
      },
    });
  };
  await act(async () => {
    tree = create(node());
  });
  snapshot();
  for (const action of input.actions) {
    await act(async () => {
      if (action === 'click')
        tree.root.findByType('summary-root').props.onClick({
          preventDefault() {
            this.defaultPrevented = true;
          },
        });
      else {
        props = { ...props, expanded: action };
        tree.update(node());
      }
    });
    snapshot();
  }
  await act(async () => tree.unmount());
  fixtures.push({ input, trace, snapshots });
}
// Capture the styled root's actual useSlot arguments, including property presence.
// Consumed Accordion controls belong to ownerState; generated slot children replace
// authored children before theme callbacks run.
const rootArguments = [];
for (const mode of ['defaults', 'authored', 'slot-overrides']) {
  const seen = [];
  const Component = React.forwardRef(function Component(props, ref) {
    return React.createElement('component', { ref }, props.children);
  });
  Component.displayName = 'Component';
  const snapshot = (args) => {
    const scalar = {};
    for (const key of [
      'disabled',
      'expanded',
      'disableGutters',
      'defaultExpanded',
      'onChange',
      'classes',
      'component',
      'style',
      'sx',
      'slots',
      'slotProps',
    ]) {
      const value = args[key];
      scalar[key] = {
        present: Object.hasOwn(args, key),
        value:
          key === 'component'
            ? (value?.displayName ?? value ?? null)
            : typeof value === 'function'
              ? 'function'
              : (value ?? null),
      };
    }
    return {
      keys: Object.keys(args).sort(),
      scalar,
      children: React.Children.toArray(args.children).map((child) => ({
        className: child.props?.className ?? null,
        expanded: child.props?.in ?? null,
        timeout: child.props?.timeout ?? null,
        ownerExpanded: child.props?.ownerState?.expanded ?? null,
      })),
      owner: { expanded: args.ownerState?.expanded, extra: args.ownerState?.extra ?? null },
    };
  };
  const theme = createTheme({
    components: {
      MuiAccordion: {
        styleOverrides: {
          root: (args) => {
            if (String(args.className).split(/\s+/).includes('MuiAccordion-root'))
              seen.push(snapshot(args));
            return {};
          },
        },
      },
    },
  });
  const props = {};
  if (mode !== 'defaults')
    Object.assign(props, {
      defaultExpanded: true,
      disabled: true,
      disableGutters: true,
      component: Component,
      classes: { root: 'authored-root' },
      style: { paddingTop: 7, paddingBottom: 11 },
      sx: { opacity: 0.8 },
      onChange() {},
    });
  if (mode === 'slot-overrides')
    props.slotProps = {
      root: {
        component: undefined,
        classes: { root: 'slot-root' },
        style: { paddingBottom: 13 },
        sx: undefined,
        disabled: false,
        ownerState: { extra: 'kept', expanded: false },
      },
    };
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(
        ThemeProvider,
        { theme },
        React.createElement(
          Accordion,
          props,
          React.createElement('summary', { id: 'summary', 'aria-controls': 'body' }, 'Summary'),
          React.createElement('section', null, 'Body'),
        ),
      ),
    );
  });
  rootArguments.push({ mode, seen });
  await act(async () => tree.unmount());
}

// Replacing a slot bypasses its named styled constructor. Using as changes
// only that constructor's terminal element, so its theme styling still runs.
const slotConstructorContracts = [];
for (const slot of ['heading', 'region']) {
  for (const mode of ['default', 'as', 'slot', 'slot-component']) {
    let calls = 0;
    let forwarded = null;
    const Leaf = React.forwardRef(function Leaf(props, ref) {
      return React.createElement('leaf', { ref }, props.children);
    });
    Leaf.displayName = 'Leaf';
    const Custom = React.forwardRef(function Custom(props, ref) {
      forwarded = {
        sxPresent: Object.hasOwn(props, 'sx'),
        sx: props.sx ?? null,
        ownerPresent: Object.hasOwn(props, 'ownerState'),
        ownerExpanded: props.ownerState?.expanded ?? null,
        asPresent: Object.hasOwn(props, 'as'),
        as: props.as?.displayName ?? null,
        classes: String(props.className)
          .split(/\s+/)
          .filter((name) => name.startsWith('Mui')),
      };
      return React.createElement('custom', { ref }, props.children);
    });
    const theme = createTheme({
      components: {
        MuiAccordion: {
          styleOverrides: {
            [slot]: (args) => {
              if (String(args.className).split(/\s+/).includes(classes.Accordion[slot])) calls++;
              return { paddingTop: 19 };
            },
          },
        },
      },
    });
    const slotProps = { [slot]: { sx: { paddingBottom: 2 } } };
    if (mode === 'as') slotProps[slot].as = Custom;
    if (mode === 'slot-component') slotProps[slot].component = Leaf;
    let tree;
    await act(async () => {
      tree = create(
        React.createElement(
          ThemeProvider,
          { theme },
          React.createElement(
            Accordion,
            {
              defaultExpanded: true,
              slots: mode.startsWith('slot') ? { [slot]: Custom } : {},
              slotProps,
            },
            React.createElement('summary', null, 'Summary'),
            React.createElement('section', null, 'Body'),
          ),
        ),
      );
    });
    slotConstructorContracts.push({ slot, mode, calls, forwarded });
    await act(async () => tree.unmount());
  }
}

// Read traces expose observable merge semantics independently of native code.
const slotReadContracts = [];
for (const slot of ['root', 'heading', 'region']) {
  const trace = [];
  const counts = {};
  let forwarded;
  const Leaf = React.forwardRef(function Leaf(props, ref) {
    return React.createElement('leaf', { ref }, props.children);
  });
  Leaf.displayName = 'Leaf';
  const Slot = React.forwardRef(function Slot(props, ref) {
    forwarded = {
      className: props.className,
      sx: props.sx,
      component: props.component?.displayName ?? null,
      as: props.as?.displayName ?? null,
      extra: props.ownerState?.extra ?? null,
      paddingTop: props.style?.paddingTop ?? null,
    };
    return React.createElement('slot', { ref }, props.children);
  });
  const authored = {};
  for (const key of ['sx', 'component', 'ownerState', 'className', 'style', 'ref'])
    Object.defineProperty(authored, key, {
      enumerable: true,
      get() {
        const count = (counts[key] = (counts[key] ?? 0) + 1);
        trace.push(key + ':' + count);
        if (['sx', 'component', 'ownerState'].includes(key) && count > 1)
          throw Error('Unexpected accessor replay: ' + key);
        return {
          sx: { opacity: 0.8 },
          component: Leaf,
          ownerState: { extra: 'kept' },
          className: 'slot-class-' + count,
          style: { paddingTop: count },
          ref: null,
        }[key];
      },
    });
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(
        Accordion,
        {
          slots: { [slot]: Slot },
          slotProps: { [slot]: authored },
        },
        React.createElement('summary', null, 'Summary'),
        React.createElement('section', null, 'Body'),
      ),
    );
  });
  slotReadContracts.push({ slot, trace, forwarded });
  await act(async () => tree.unmount());
}

const transitionClassContracts = [];
for (const kind of ['absent', 'empty-first', 'undefined-first', 'explicit-undefined']) {
  let reads = 0;
  let observed;
  const Transition = (props) => {
    observed = { present: Object.hasOwn(props, 'className'), value: props.className ?? null };
    return React.createElement('transition', null, props.children);
  };
  const slot = {};
  if (kind !== 'absent')
    Object.defineProperty(slot, 'className', {
      enumerable: true,
      get() {
        reads++;
        if (kind === 'explicit-undefined') return undefined;
        return reads === 1 ? (kind === 'empty-first' ? '' : undefined) : 'selected';
      },
    });
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(
        Accordion,
        {
          slots: { transition: Transition },
          slotProps: { transition: slot },
        },
        React.createElement('summary', null, 'Summary'),
        React.createElement('section', null, 'Body'),
      ),
    );
  });
  transitionClassContracts.push({ kind, reads, observed });
  await act(async () => tree.unmount());
}

const refOrderContracts = [];
for (const family of ['Accordion', 'AccordionSummary']) {
  const trace = [];
  const slot = React.createRef();
  const outer = (node) => {
    if (!node) {
      trace.push('outer-null:' + (slot.current === null));
      return;
    }
    trace.push('outer-attach:' + (slot.current === node));
    return () => trace.push('outer-cleanup:' + (slot.current === null));
  };
  const Root = React.forwardRef(function Root(props, ref) {
    return React.createElement('root', { ref }, props.children);
  });
  const Component = family === 'Accordion' ? Accordion : Summary;
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(
        Component,
        {
          ref: outer,
          slots: { root: Root },
          slotProps: { root: { ref: slot } },
        },
        React.createElement('summary', null, 'Summary'),
        React.createElement('section', null, 'Body'),
      ),
      { createNodeMock: (node) => (node.type === 'root' ? {} : null) },
    );
  });
  await act(async () => tree.unmount());
  refOrderContracts.push({ family, trace });
}

const styleValueReadContracts = [];
for (const slot of ['root', 'heading', 'region']) {
  let reads = 0;
  let selected;
  const style = Object.defineProperty({}, 'paddingTop', {
    enumerable: true,
    get() {
      reads++;
      if (reads > 1) throw Error('Native declaration accessor replayed');
      return 17;
    },
  });
  const Slot = React.forwardRef(function Slot(props, ref) {
    selected = props.style.paddingTop;
    return React.createElement('slot', { ref }, props.children);
  });
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(
        Accordion,
        { slots: { [slot]: Slot }, slotProps: { [slot]: { style } } },
        React.createElement('summary', null, 'Summary'),
        React.createElement('section', null, 'Body'),
      ),
    );
  });
  styleValueReadContracts.push({ slot, reads, selected });
  await act(async () => tree.unmount());
}

// Observe emitted source classes, rather than infer peer eligibility from
// utility classes or native shadow values. Both sides of nested & + & include
// the expanded state and the exact final constructor's generated class.
const SourceBox = original('Box');
const ForwardedView = React.forwardRef(function ForwardedView(props, ref) {
  return React.createElement('div', { ...props, ref });
});
const ForwardedBox = React.forwardRef(function ForwardedBox(props, ref) {
  return React.createElement(SourceBox, { ...props, ref });
});
const sourceClassContracts = [];
for (const [name, a, b] of [
  ['same source class', {}, {}],
  ['elevation is inline source paint', { props: { elevation: 1 } }, { props: { elevation: 5 } }],
  ['square changes constructor CSS', {}, { props: { square: true } }],
  ['gutters change constructor CSS', {}, { props: { disableGutters: true } }],
  ['sx changes emitted CSS', {}, { props: { sx: { paddingTop: '3px' } } }],
  [
    'inline paint keeps CSS identity',
    { props: { style: { opacity: 0.4 } } },
    { props: { style: { opacity: 0.8 } } },
  ],
  [
    'direction is inherited source CSS',
    { theme: { direction: 'ltr' } },
    { theme: { direction: 'rtl' } },
  ],
  ['dark palette changes constructor CSS', {}, { theme: { palette: { mode: 'dark' } } }],
  [
    'authored expanded class participates',
    { props: { expanded: false, className: 'Mui-expanded' } },
    {},
  ],
  ['collapsed current class does not participate', {}, { props: { expanded: false } }],
  ['same Box terminals', { root: 'Box' }, { root: 'Box' }],
  ['Box changes the final constructor', {}, { root: 'Box' }],
  ['opaque Box keeps the final Box identity', { root: 'Box' }, { root: 'ForwardedBox' }],
  ['opaque View keeps Paper identity', {}, { root: 'ForwardedView' }],
]) {
  const observe = (profile) => {
    const component =
      profile.root === 'Box'
        ? SourceBox
        : profile.root === 'ForwardedBox'
          ? ForwardedBox
          : profile.root === 'ForwardedView'
            ? ForwardedView
            : undefined;
    const html = renderToStaticMarkup(
      React.createElement(
        ThemeProvider,
        { theme: createTheme({ motion: { reducedMotion: 'always' }, ...profile.theme }) },
        React.createElement(
          Accordion,
          { expanded: true, ...profile.props, ...(component ? { component } : {}) },
          React.createElement('div', null, 'Summary'),
          React.createElement('div', null, 'Body'),
        ),
      ),
    );
    const classes = html.match(/<div class="(MuiPaper-root[^"]+)"/)[1].split(/\s+/);
    const cssClass = classes.find((token) => token.startsWith('css-'));
    const selector = `.${cssClass}.Mui-expanded+.${cssClass}.Mui-expanded::before`;
    if (!html.includes(selector)) throw Error('Changed original expanded adjacency selector');
    return { cssClass, expanded: classes.includes('Mui-expanded'), selector };
  };
  const left = observe(a),
    right = observe(b);
  sourceClassContracts.push({
    name,
    a,
    b,
    left,
    right,
    hidesBefore: left.expanded && right.expanded && left.cssClass === right.cssClass,
  });
}

const destination = 'tests/fixtures/mui-accordion-9.5.0.json';
await writeFile(
  destination,
  await format(
    JSON.stringify({
      reference,
      classes,
      classUtils: classUtils.reference,
      classUtility,
      classContracts,
      defaultClassContracts,
      rootArguments,
      slotConstructorContracts,
      slotReadContracts,
      transitionClassContracts,
      refOrderContracts,
      styleValueReadContracts,
      sourceClassContracts,
      fixtures,
    }),
    {
      ...(await resolveConfig(destination)),
      filepath: destination,
    },
  ),
);
const provenance = 'upstream/accordion.json';
await writeFile(
  provenance,
  await format(
    JSON.stringify({
      schemaVersion: 1,
      description:
        'Pinned MIT reference for native Accordion composition, callbacks, slots and utility vocabulary. No compatibility promotion.',
      reference,
      classUtils: classUtils.reference,
      localFiles: [
        'packages/material/src/accordion.tsx',
        'packages/material/src/accordionClasses.ts',
        'packages/material/src/accordionTypes.ts',
      ],
      adaptations: [
        'Paper/View wrappers replace DOM roots, headings and regions. ButtonBase supplies native touch/keyboard activation and Collapse retains one measured body subtree.',
        'Summary IDs and aria-controls link the native region through nativeID and aria-labelledby. Full platform screen-reader behavior requires device validation.',
        'Native theme slots/styles replace CSS. Browser sibling pseudo-elements, automatic first/last sibling rounding and animated margin/icon CSS require separate native policies.',
      ],
    }),
    { ...(await resolveConfig(provenance)), filepath: provenance },
  ),
);
console.log(
  `Wrote ${fixtures.length} pinned Accordion interaction fixtures and source provenance.`,
);
