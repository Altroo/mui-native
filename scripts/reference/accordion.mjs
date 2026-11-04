// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
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
const destination = 'tests/fixtures/mui-accordion-9.5.0.json';
await writeFile(
  destination,
  await format(JSON.stringify({ reference, classes, fixtures }), {
    ...(await resolveConfig(destination)),
    filepath: destination,
  }),
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
