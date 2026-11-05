// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Synthetic contract observations of the integrity-checked original packages.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import createCacheModule from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
const createCache = createCacheModule.default ?? createCacheModule;
import GroupModule from '../../.cache/palette-reference/node_modules/@mui/material/ButtonGroup/ButtonGroup.js';
import ContextModule from '../../.cache/palette-reference/node_modules/@mui/material/ButtonGroup/ButtonGroupContext.js';
import PositionModule from '../../.cache/palette-reference/node_modules/@mui/material/ButtonGroup/ButtonGroupButtonContext.js';
import ButtonModule from '../../.cache/palette-reference/node_modules/@mui/material/Button/Button.js';
import ClassesModule from '../../.cache/palette-reference/node_modules/@mui/material/ButtonGroup/buttonGroupClasses.js';
import {
  ThemeProvider,
  createTheme,
} from '../../.cache/palette-reference/node_modules/@mui/material/styles/index.js';
const Group = GroupModule.default ?? GroupModule,
  Button = ButtonModule.default ?? ButtonModule;
const Context = ContextModule.default ?? ContextModule,
  Position = PositionModule.default ?? PositionModule;
const classes = ClassesModule.default ?? ClassesModule;
const inputs = [
  { name: 'defaults' },
  ...['text', 'outlined', 'contained'].flatMap((variant) =>
    ['horizontal', 'vertical'].map((orientation) => ({
      name: variant + ' ' + orientation,
      props: { variant, orientation },
    })),
  ),
  ...['inherit', 'primary', 'secondary', 'error', 'info', 'success', 'warning'].map((color) => ({
    name: 'text color ' + color,
    props: { variant: 'text', color },
  })),
  { name: 'group disabled', props: { disabled: true } },
  { name: 'child reenabled', props: { disabled: true }, buttons: [{ disabled: false }, {}, {}] },
  { name: 'loading child', props: { variant: 'contained' }, buttons: [{}, { loading: true }, {}] },
  {
    name: 'child variant differs',
    props: { variant: 'contained' },
    buttons: [{ variant: 'text' }, { variant: 'outlined' }, {}],
  },
  {
    name: 'child color differs',
    props: { variant: 'text', color: 'primary' },
    buttons: [{ color: 'error' }, {}, {}],
  },
  { name: 'full width', props: { fullWidth: true } },
  {
    name: 'child full width differs',
    props: { fullWidth: true },
    buttons: [{ fullWidth: false }, {}, {}],
  },
  { name: 'small', props: { size: 'small' } },
  { name: 'large', props: { size: 'large' } },
  { name: 'disabled elevation', props: { variant: 'contained', disableElevation: true } },
  { name: 'single child', buttons: [{}] },
  { name: 'empty', buttons: [] },
  { name: 'filtered children', shape: 'filtered' },
  { name: 'fragment position', shape: 'fragment' },
  {
    name: 'custom classes',
    props: {
      classes: {
        root: 'my-root',
        grouped: 'my-group',
        firstButton: 'my-first',
        middleButton: 'my-middle',
        lastButton: 'my-last',
      },
    },
  },
  {
    name: 'theme defaults below group context',
    theme: {
      components: {
        MuiButton: {
          defaultProps: {
            variant: 'contained',
            color: 'error',
            size: 'large',
            disableRipple: true,
          },
        },
      },
    },
  },
  {
    name: 'theme group defaults',
    theme: {
      components: {
        MuiButtonGroup: {
          defaultProps: { variant: 'text', color: 'success', size: 'small', disabled: true },
        },
      },
    },
  },
  {
    name: 'explicit children beat group defaults',
    props: { color: 'secondary', size: 'small', disableRipple: true },
    buttons: [{ color: 'error', size: 'large', disableRipple: false }, {}, {}],
  },
  {
    name: 'undefined children inherit',
    props: { variant: 'contained', size: 'large' },
    buttons: [{ $undefined: ['variant', 'size'] }, {}, {}],
  },
  {
    name: 'native inline analog beats group selector',
    buttons: [{ style: { minWidth: 96, borderTopRightRadius: 7 } }, {}, {}],
  },
  {
    name: 'button sx loses to grouped specificity',
    buttons: [{ sx: { minWidth: 96, borderTopRightRadius: 7 } }, {}, {}],
  },
  {
    name: 'group child overrides',
    theme: {
      components: {
        MuiButtonGroup: {
          styleOverrides: {
            grouped: { minWidth: 57 },
            firstButton: { borderTopRightRadius: 9 },
            root: { '& .MuiButtonGroup-lastButton': { minWidth: 71 } },
          },
        },
      },
    },
  },
  {
    name: 'group sx and state selectors',
    props: {
      disabled: true,
      sx: {
        '& .MuiButtonGroup-grouped': { minWidth: 58, '&.Mui-disabled': { opacity: 0.4 } },
        '& .MuiButtonGroup-firstButton': { minWidth: 69 },
      },
    },
  },
  {
    name: 'RTL vertical',
    props: { orientation: 'vertical', variant: 'contained' },
    theme: { direction: 'rtl' },
  },
  ...[
    ['fullWidth', { fullWidth: true }],
    ['disableElevation', { disableElevation: true }],
    ['loadingPositionStart', { loading: true, loadingPosition: 'start' }],
    ['my-authored-root', { classes: { root: 'my-authored-root' } }],
  ].map(([name, button]) => ({
    name: 'root token ' + name,
    props: {
      sx: { ['& .' + (name.startsWith('my-') ? name : 'MuiButton-' + name)]: { minWidth: 83 } },
    },
    buttons: [button, {}, {}],
  })),
  {
    name: 'root selector',
    props: {
      orientation: 'vertical',
      classes: { root: 'my-group-root' },
      sx: { '&.MuiButtonGroup-vertical.my-group-root': { minWidth: 123 } },
    },
  },
  { name: 'radius shorthand', props: { sx: { '& .MuiButtonGroup-grouped': { borderRadius: 2 } } } },
  {
    name: 'zero border shorthand',
    props: { variant: 'text', sx: { '& .MuiButtonGroup-grouped': { border: 0 } } },
  },
  {
    name: 'authored foreground hover',
    hoverIndex: 0,
    buttons: [{ style: { color: 'red' } }, {}, {}],
  },
  {
    name: 'numeric border foreground',
    props: { variant: 'text', sx: { '& .MuiButtonGroup-grouped': { border: 1 } } },
    buttons: [{ color: 'error' }, {}, {}],
  },
  { name: 'inline radius shorthand', buttons: [{ style: { borderRadius: 7 } }, {}, {}] },
  {
    name: 'inline width shorthand',
    props: { variant: 'text' },
    buttons: [{ style: { borderWidth: 0 } }, {}, {}],
  },
  {
    name: 'inline color shorthand',
    props: { variant: 'text' },
    buttons: [{ style: { borderColor: 'purple' } }, {}, {}],
  },
  { name: 'RTL horizontal', props: { variant: 'outlined' }, theme: { direction: 'rtl' } },
];
let contexts = [];
function Probe({ index, ...props }) {
  const context = React.useContext(Context),
    position = React.useContext(Position);
  contexts[index] = { ...context, position };
  return React.createElement(Button, { ...props, 'data-probe': index }, 'Action ' + (index + 1));
}
const root = createRoot(document.querySelector('#root'));
const authored = ({ $undefined = [], ...props } = {}) => {
  for (const key of $undefined) props[key] = undefined;
  return props;
};
const cssKeys = [
  'display',
  'flexDirection',
  'width',
  'minWidth',
  'alignSelf',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'marginLeft',
  'marginTop',
  'boxShadow',
  'opacity',
  'fontSize',
  'color',
  'backgroundColor',
  'zIndex',
  'pointerEvents',
];
const observe = (node) => {
  const style = getComputedStyle(node);
  return {
    tag: node.tagName,
    classes: node.className.split(/\s+/).filter((c) => c.startsWith('Mui') || c.startsWith('my-')),
    computed: Object.fromEntries(cssKeys.map((key) => [key, style[key]])),
    disabled: node.disabled,
    role: node.getAttribute('role'),
  };
};
let cache;
function mount(input) {
  contexts = [];
  flushSync(() => root.render(null));
  // Each case owns a fresh sheet. Reused Emotion caches change equal-specificity
  // insertion order based on previously visited cases, which is a separate gate.
  cache?.sheet.flush();
  cache = createCache({ key: 'probe' });
  const buttons = (input.buttons ?? [{}, {}, {}]).map((props, index) =>
    React.createElement(Probe, { ...authored(props), index, key: index }),
  );
  const children =
    input.shape === 'filtered'
      ? [null, 'ignored', false, buttons[0], 17, buttons[1]]
      : input.shape === 'fragment'
        ? [
            React.createElement(React.Fragment, { key: 'fragment' }, buttons[0], buttons[1]),
            buttons[2],
          ]
        : buttons;
  flushSync(() =>
    root.render(
      React.createElement(
        CacheProvider,
        { value: cache },
        React.createElement(
          ThemeProvider,
          { theme: createTheme(input.theme ?? {}) },
          React.createElement(Group, { 'data-group': 'root', ...input.props }, children),
        ),
      ),
    ),
  );
  return {
    input,
    root: observe(document.querySelector('[data-group]')),
    buttons: [...document.querySelectorAll('[data-probe]')].map(observe),
    contexts,
  };
}
const fixtures = inputs.map(mount);
// Playwright supplies real hover input, then snapshots the same mounted case.
window.mountButtonGroupReference = (name) => mount(inputs.find((input) => input.name === name));
window.snapshotButtonGroupReference = (name) => {
  const fixture = fixtures.find((item) => item.input.name === name);
  fixture.root = observe(document.querySelector('[data-group]'));
  fixture.buttons = [...document.querySelectorAll('[data-probe]')].map(observe);
};
window.buttonGroupObservations = {
  metadata: window.buttonGroupReferenceMetadata,
  classes,
  fixtures,
};
document.querySelector('#status').textContent = `Recorded ${fixtures.length} ButtonGroup cases`;
