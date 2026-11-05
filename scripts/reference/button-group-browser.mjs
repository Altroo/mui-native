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
import TypographyModule from '../../.cache/palette-reference/node_modules/@mui/material/Typography/Typography.js';
import PortalModule from '../../.cache/palette-reference/node_modules/@mui/material/Portal/Portal.js';
import ClassesModule from '../../.cache/palette-reference/node_modules/@mui/material/ButtonGroup/buttonGroupClasses.js';
import {
  ThemeProvider,
  createTheme,
} from '../../.cache/palette-reference/node_modules/@mui/material/styles/index.js';
const Group = GroupModule.default ?? GroupModule,
  Button = ButtonModule.default ?? ButtonModule,
  Portal = PortalModule.default ?? PortalModule,
  Typography = TypographyModule.default ?? TypographyModule;
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
  'minHeight',
  'maxWidth',
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
  'lineHeight',
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
// These cases retain original React props and same-instance updates in addition
// to computed CSS. A supplied focus class selects the CSS branch without
// pretending to establish real keyboard-focus or accessibility behavior.
function mountContract(element, theme = createTheme()) {
  contexts = [];
  flushSync(() => root.render(null));
  cache?.sheet.flush();
  cache = createCache({ key: 'probe' });
  flushSync(() =>
    root.render(
      React.createElement(
        CacheProvider,
        { value: cache },
        React.createElement(ThemeProvider, { theme }, element),
      ),
    ),
  );
}
const utilityClasses = Object.fromEntries(
  [
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
    'custom',
  ].map((slot) => [slot, ClassesModule.getButtonGroupUtilityClass(slot)]),
);
let customProps, customForwardedRef;
const customRef = React.createRef();
const CustomRoot = React.forwardRef(function CustomRoot(props, ref) {
  customProps = props;
  customForwardedRef = ref;
  return React.createElement('section', { ...props, ref });
});
mountContract(
  React.createElement(
    Group,
    {
      component: CustomRoot,
      ref: customRef,
      id: 'custom-group',
      title: 'reviewable',
      role: 'toolbar',
      sx: { minWidth: 83 },
    },
    React.createElement('span', null, 'child'),
  ),
);
const customRoot = {
  role: customProps.role,
  id: customProps.id,
  title: customProps.title,
  ownerState: Object.hasOwn(customProps, 'ownerState'),
  sx: Object.hasOwn(customProps, 'sx'),
  refForwarded: customForwardedRef === customRef,
  refAttached: customRef.current === document.querySelector('#custom-group'),
  root: observe(document.querySelector('#custom-group')),
};
mountContract(
  React.createElement(
    Group,
    {
      color: 'secondary',
      sx: {
        '& .MuiButtonGroup-root.MuiButtonGroup-text': { minWidth: 93 },
        '& .MuiButtonGroup-grouped.MuiButtonGroup-firstButton': { minWidth: 97 },
      },
    },
    React.createElement(
      Group,
      { color: 'error', variant: 'text', 'data-nested': true, sx: { minWidth: 29 } },
      React.createElement(Probe, { index: 0 }, 'first'),
      React.createElement(Probe, { index: 1 }, 'last'),
    ),
  ),
);
const nested = {
  root: observe(document.querySelector('[data-nested]')),
  buttons: [...document.querySelectorAll('[data-probe]')].map(observe),
  contexts,
};
const live = [];
const liveCache = createCache({ key: 'live' });
flushSync(() => root.render(null));
cache.sheet.flush();
cache = liveCache;
for (const props of [
  { variant: 'outlined', color: 'primary', orientation: 'horizontal', count: 3 },
  {
    variant: 'contained',
    color: 'secondary',
    orientation: 'vertical',
    fullWidth: true,
    disableRipple: false,
    count: 2,
    classes: { grouped: 'my-live-group', firstButton: 'my-live-first' },
  },
]) {
  contexts = [];
  const { count, ...groupProps } = props;
  flushSync(() =>
    root.render(
      React.createElement(
        CacheProvider,
        { value: cache },
        React.createElement(
          Group,
          { ...groupProps, 'data-live': true },
          Array.from({ length: count }, (_, index) =>
            React.createElement(Probe, { index, key: index }),
          ),
        ),
      ),
    ),
  );
  live.push({
    props,
    root: observe(document.querySelector('[data-live]')),
    buttons: [...document.querySelectorAll('[data-probe]')].map(observe),
    contexts,
  });
}
const callbackArgs = {};
const callbacksTheme = createTheme({
  components: {
    MuiButtonGroup: {
      styleOverrides: {
        root: (args) => {
          callbackArgs.override = {
            role: args.role,
            marker: args['data-callback'],
            as: args.as,
            variant: args.ownerState.variant,
            orientation: args.ownerState.orientation,
            color: args.ownerState.color,
          };
          return { minWidth: 53 };
        },
      },
      variants: [
        { props: { role: 'toolbar' }, style: { minWidth: 61 } },
        {
          props: (args) => {
            callbackArgs.predicate = {
              role: args.role,
              orientation: args.orientation,
              ownerOrientation: args.ownerState.orientation,
              primary: args.theme.palette.primary.main,
            };
            return args.orientation === 'vertical' && args.role === 'toolbar';
          },
          style: (args) => {
            callbackArgs.style = {
              role: args.role,
              orientation: args.orientation,
              ownerOrientation: args.ownerState.orientation,
              primary: args.theme.palette.primary.main,
            };
            return { minHeight: 37 };
          },
        },
      ],
    },
  },
});
mountContract(
  React.createElement(Group, {
    role: 'toolbar',
    variant: 'text',
    orientation: 'vertical',
    color: 'secondary',
    'data-callback': 'present',
    sx: (theme) => {
      callbackArgs.sxRadius = theme.shape.borderRadius;
      return { maxWidth: theme.shape.borderRadius * 26 };
    },
  }),
  callbacksTheme,
);
const callbacks = {
  args: callbackArgs,
  root: observe(document.querySelector('[data-callback]')),
};
const slotVariants = [];
for (const name of ['object', 'arrays and callbacks']) {
  const args = {};
  const variantArgs = (value) => ({
    role: value.role,
    size: value.size,
    ownerSize: value.ownerState.size,
    primary: value.theme.palette.primary.main,
  });
  const grouped =
    name === 'object'
      ? { variants: [{ props: { variant: 'outlined' }, style: { minWidth: 81 } }] }
      : [
          { minWidth: 51, variants: [{ props: { variant: 'outlined' }, style: { minWidth: 81 } }] },
          (value) => {
            args.override = { role: value.role, size: value.ownerState.size };
            return {
              variants: [
                {
                  props: (value) => {
                    args.predicate = variantArgs(value);
                    return value.size === 'large' && value.role === 'toolbar';
                  },
                  style: (value) => {
                    args.style = variantArgs(value);
                    return [{ minWidth: 82 }, { opacity: 0.6 }];
                  },
                },
              ],
            };
          },
        ];
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: {
          root: { minWidth: 149 },
          grouped,
          ...(name === 'object'
            ? {}
            : {
                firstButton: () => [
                  { variants: [{ props: { size: 'large' }, style: { minWidth: 92 } }] },
                ],
                middleButton: [
                  {
                    variants: [{ props: { variant: 'outlined' }, style: () => [{ minWidth: 87 }] }],
                  },
                ],
                lastButton: () => ({
                  variants: [{ props: { role: 'toolbar' }, style: [{ minWidth: 95 }] }],
                }),
              }),
        },
      },
    },
  });
  mountContract(
    React.createElement(
      Group,
      { 'data-slot-variants': true, role: 'toolbar', size: 'large' },
      Array.from({ length: 3 }, (_, index) => React.createElement(Probe, { index, key: index })),
    ),
    theme,
  );
  slotVariants.push({
    name,
    args,
    root: observe(document.querySelector('[data-slot-variants]')),
    buttons: [...document.querySelectorAll('[data-probe]')].map(observe),
  });
}
const focus = [];
for (const input of [
  { variant: 'text', focusVisible: false },
  { variant: 'text', focusVisible: true },
  { variant: 'contained', focusVisible: { boxShadow: '0px 0px 0px 3px rgb(255, 0, 0)' } },
  {
    variant: 'contained',
    disableElevation: true,
    focusVisible: { boxShadow: '0px 0px 0px 3px rgb(255, 0, 0)' },
  },
  { variant: 'contained' },
  { variant: 'contained', focusVisible: false },
  { variant: 'contained', focusVisible: true },
]) {
  const { focusVisible, ...props } = input;
  const theme = createTheme({ focusVisible });
  const shadows = [...theme.shadows];
  shadows[2] = '0px 2px 7px 0px rgb(0, 0, 255)';
  theme.shadows = shadows;
  mountContract(
    React.createElement(
      Group,
      { ...props, 'data-focus': true },
      React.createElement(
        Button,
        { 'data-focus-button': true, className: 'Mui-focusVisible' },
        'A',
      ),
      React.createElement(Button, { 'data-focus-button': true }, 'B'),
    ),
    theme,
  );
  focus.push({
    input,
    shadow: shadows[2],
    focusShadow: shadows[6],
    root: observe(document.querySelector('[data-focus]')),
    buttons: [...document.querySelectorAll('[data-focus-button]')].map(observe),
  });
}
const portalOwnership = [];
const outsideContainer = document.createElement('div');
outsideContainer.dataset.portalContainer = 'outside';
document.body.append(outsideContainer);
for (const name of ['default', 'inside', 'outside']) {
  const container =
    name === 'default'
      ? undefined
      : name === 'outside'
        ? () => outsideContainer
        : () => document.querySelector('[data-portal-container="inside"]');
  const props = { variant: 'contained', color: 'secondary', size: 'large' };
  mountContract(
    React.createElement(
      Group,
      {
        ...props,
        'data-portal-group': true,
        sx: {
          '& .MuiButtonGroup-grouped': {
            minWidth: 89,
            backgroundColor: 'rgb(0, 128, 0)',
          },
        },
      },
      React.createElement('div', { 'data-portal-container': 'inside' }),
      React.createElement(
        Portal,
        { container },
        React.createElement(Probe, { index: 0, 'data-portal-probe': true }),
      ),
    ),
  );
  const groupNode = document.querySelector('[data-portal-group]');
  const buttonNode = document.querySelector('[data-portal-probe]');
  portalOwnership.push({
    name,
    props,
    context: contexts[0],
    insideGroup: groupNode.contains(buttonNode),
    button: observe(buttonNode),
  });
}
mountContract(null);
outsideContainer.remove();
const portalDestinations = [];
for (const logicalGroup of [true, false]) {
  const portaled = React.createElement(
    Portal,
    { container: () => document.querySelector('[data-destination]') },
    React.createElement(Probe, { index: 0, 'data-destination-probe': true }),
  );
  mountContract(
    React.createElement(
      React.Fragment,
      null,
      logicalGroup
        ? React.createElement(
            Group,
            {
              variant: 'contained',
              color: 'secondary',
              size: 'large',
              sx: { '& .MuiButtonGroup-grouped': { minWidth: 89 } },
            },
            portaled,
          )
        : portaled,
      React.createElement(
        Group,
        {
          sx: {
            '& .MuiButtonGroup-grouped': { minWidth: 103 },
            '& .MuiButton-root': { backgroundColor: 'rgb(30, 80, 140)' },
          },
        },
        React.createElement('div', { 'data-destination': true }),
      ),
    ),
  );
  portalDestinations.push({
    logicalGroup,
    context: contexts[0],
    button: observe(document.querySelector('[data-destination-probe]')),
  });
}
mountContract(null);
const portalText = [];
const bodyTextStyle = { color: document.body.style.color, fontSize: document.body.style.fontSize };
document.body.style.color = 'rgba(0, 0, 0, 0.87)';
document.body.style.fontSize = '16px';
for (const mode of ['default', 'inside', 'sibling', 'raw']) {
  mountContract(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'div',
        { style: { color: '#008000', fontSize: 20, lineHeight: 1.25 } },
        React.createElement('div', {
          'data-text-sibling': true,
          style:
            mode === 'raw' ? { color: '#800080', fontSize: 18, lineHeight: '36px' } : undefined,
        }),
      ),
      React.createElement(
        Group,
        { sx: { color: '#ff0000', fontSize: 24, lineHeight: 1.5 } },
        React.createElement('div', { 'data-text-inside': true }),
        React.createElement(
          Portal,
          {
            container:
              mode === 'default'
                ? undefined
                : () =>
                    document.querySelector(
                      mode === 'inside' ? '[data-text-inside]' : '[data-text-sibling]',
                    ),
          },
          React.createElement(
            Typography,
            { variant: 'inherit', color: 'inherit', 'data-text-probe': true },
            'Physical text',
          ),
        ),
      ),
    ),
  );
  portalText.push({ mode, text: observe(document.querySelector('[data-text-probe]')) });
}
mountContract(null);
Object.assign(document.body.style, bodyTextStyle);
const contracts = {
  utilityClasses,
  customRoot,
  nested,
  live,
  callbacks,
  slotVariants,
  focus,
  portalOwnership,
  portalDestinations,
  portalText,
};
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
  contracts,
};
document.querySelector('#status').textContent = `Recorded ${fixtures.length} ButtonGroup cases`;
