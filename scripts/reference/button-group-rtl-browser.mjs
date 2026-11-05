// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
/* global window, document, getComputedStyle */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import createCacheModule from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { prefixer } from '../../.cache/palette-reference/node_modules/stylis/index.js';
import rtlModule from '../../.cache/palette-reference/node_modules/@mui/stylis-plugin-rtl/index.js';
import GroupModule from '../../.cache/palette-reference/node_modules/@mui/material/ButtonGroup/ButtonGroup.js';
import ButtonModule from '../../.cache/palette-reference/node_modules/@mui/material/Button/Button.js';
import TypographyModule from '../../.cache/palette-reference/node_modules/@mui/material/Typography/Typography.js';
import RtlModule from '../../.cache/palette-reference/node_modules/@mui/system/RtlProvider/index.js';
import {
  ThemeProvider,
  createTheme,
} from '../../.cache/palette-reference/node_modules/@mui/material/styles/index.js';
const Group = GroupModule.default ?? GroupModule;
const Button = ButtonModule.default ?? ButtonModule;
const Typography = TypographyModule.default ?? TypographyModule;
const RtlProvider = RtlModule.default ?? RtlModule;
const createCache = createCacheModule.default ?? createCacheModule;
const rtl = rtlModule.default ?? rtlModule;
const root = createRoot(document.querySelector('#root'));
let cache;
const inputs = ['text', 'outlined', 'contained'].flatMap((variant) =>
  ['horizontal', 'vertical'].flatMap((orientation) =>
    ['ltr', 'rtl'].map((direction) => ({
      name: `${variant} ${orientation} ${direction}`,
      variant,
      orientation,
      domDirection: direction,
      themeDirection: direction,
      rtlCache: direction === 'rtl',
      nativeDirection: direction,
    })),
  ),
);
inputs.push(
  {
    name: 'theme-only negative control',
    themeDirection: 'rtl',
    domDirection: 'ltr',
    rtlCache: false,
    referenceOnly: true,
  },
  {
    name: 'DOM-only negative control',
    themeDirection: 'ltr',
    domDirection: 'rtl',
    rtlCache: false,
    referenceOnly: true,
  },
  {
    name: 'provider false does not change source CSS',
    themeDirection: 'rtl',
    domDirection: 'rtl',
    rtlCache: true,
    provider: false,
    referenceOnly: true,
  },
  {
    name: 'inline LTR in RTL parent',
    themeDirection: 'rtl',
    domDirection: 'rtl',
    rtlCache: false,
    style: { direction: 'ltr' },
    nativeDirection: 'ltr',
  },
  {
    name: 'inline RTL in LTR parent',
    themeDirection: 'ltr',
    domDirection: 'ltr',
    rtlCache: true,
    style: { direction: 'rtl' },
    nativeDirection: 'rtl',
  },
  {
    name: 'inherit physical RTL parent',
    themeDirection: 'ltr',
    domDirection: 'rtl',
    rtlCache: true,
    style: { direction: 'inherit' },
    nativeDirection: 'rtl',
  },
  {
    name: 'opposite child direction',
    themeDirection: 'rtl',
    domDirection: 'rtl',
    rtlCache: true,
    childDirection: 'ltr',
    nativeDirection: 'rtl',
  },
);
inputs.push(
  ...['ltr', 'rtl'].flatMap((direction) =>
    ['horizontal', 'vertical'].flatMap((orientation) =>
      ['all', 'axis'].map((reset) => ({
        name: `inline margin ${reset} reset ${orientation} ${direction}`,
        variant: 'outlined',
        orientation,
        domDirection: direction,
        themeDirection: direction,
        rtlCache: direction === 'rtl',
        nativeDirection: direction,
        childStyle:
          reset === 'all'
            ? { margin: 0 }
            : orientation === 'horizontal'
              ? { marginLeft: 0, marginRight: 0 }
              : { marginTop: 0, marginBottom: 0 },
        nativeChildStyle:
          reset === 'all'
            ? { margin: 0 }
            : orientation === 'horizontal'
              ? { marginHorizontal: 0 }
              : { marginVertical: 0 },
      })),
    ),
  ),
);
inputs.push(
  ...['ltr', 'rtl'].flatMap((direction) =>
    [
      {
        reset: 'radius',
        sx: { borderTopLeftRadius: 0, borderBottomRightRadius: 0 },
        style: { borderRadius: 7 },
      },
      {
        reset: 'border',
        sx: { border: '3px solid red', borderLeftWidth: 5, borderLeftColor: 'blue' },
        style: { borderWidth: 0, borderColor: 'purple' },
      },
      {
        reset: 'margin',
        sx: { marginLeft: -1, marginTop: -2 },
        style: { margin: 0 },
      },
    ].map(({ reset, ...props }) => ({
      name: `root inline ${reset} reset ${direction}`,
      variant: 'outlined',
      domDirection: direction,
      themeDirection: direction,
      rtlCache: direction === 'rtl',
      nativeDirection: direction,
      ...props,
    })),
  ),
);
const keys = [
  'direction',
  'flexDirection',
  'textAlign',
  'minWidth',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderLeftWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftColor',
  'borderRightColor',
  'borderBottomColor',
  'marginLeft',
  'marginRight',
  'marginTop',
];
function observe(node) {
  const computed = getComputedStyle(node);
  const rect = node.getBoundingClientRect();
  return {
    computed: Object.fromEntries(keys.map((key) => [key, computed[key]])),
    rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
  };
}
function mount(input, children) {
  flushSync(() => root.render(null));
  cache?.sheet.flush();
  cache = createCache({
    key: 'group-rtl',
    stylisPlugins: input.rtlCache ? [prefixer, rtl] : [prefixer],
  });
  const group = React.createElement(
    Group,
    {
      variant: input.variant ?? 'outlined',
      orientation: input.orientation ?? 'horizontal',
      sx: input.sx,
      style: input.style,
      'data-group': true,
    },
    children,
  );
  const content =
    input.provider === undefined
      ? group
      : React.createElement(RtlProvider, { value: input.provider }, group);
  flushSync(() =>
    root.render(
      React.createElement(
        CacheProvider,
        { value: cache },
        React.createElement(
          'div',
          { dir: input.domDirection },
          React.createElement(
            ThemeProvider,
            { theme: createTheme({ direction: input.themeDirection }) },
            content,
          ),
        ),
      ),
    ),
  );
}
const fixtures = inputs.map((input) => {
  mount(
    input,
    [0, 1].map((index) =>
      React.createElement(
        Button,
        {
          key: index,
          'data-button': index,
          style:
            index === 0 && input.childDirection
              ? { direction: input.childDirection }
              : index === 1
                ? input.childStyle
                : undefined,
        },
        index === 0 ? 'First' : 'Last',
      ),
    ),
  );
  return {
    input,
    root: observe(document.querySelector('[data-group]')),
    buttons: [...document.querySelectorAll('[data-button]')].map(observe),
  };
});
const alignmentInputs = ['ltr', 'rtl'].flatMap((direction) =>
  ['start', 'end'].map((align) => ({ direction, align })),
);
alignmentInputs.push(
  { direction: 'rtl', childDirection: 'ltr', align: 'start' },
  { direction: 'ltr', childDirection: 'rtl', align: 'end' },
  { direction: 'ltr', childDirection: 'rtl', align: 'start', inherited: true },
);
const alignments = alignmentInputs.map((input) => {
  const ink = React.createElement('span', { 'data-ink': true }, 'Start');
  const text = React.createElement(
    Typography,
    {
      component: 'div',
      'data-text': true,
      style: { direction: input.childDirection ?? input.direction },
      sx: { width: 160, ...(input.inherited ? {} : { textAlign: input.align }) },
    },
    ink,
  );
  const child = input.inherited
    ? React.createElement(Typography, { component: 'div', sx: { textAlign: input.align } }, text)
    : text;
  mount(
    {
      domDirection: input.direction,
      themeDirection: input.direction,
      rtlCache: input.direction === 'rtl',
    },
    child,
  );
  const node = document.querySelector('[data-text]');
  const rect = node.getBoundingClientRect();
  const inkRect = document.querySelector('[data-ink]').getBoundingClientRect();
  return {
    input,
    text: observe(node),
    inkSide:
      Math.abs(inkRect.left - rect.left) < Math.abs(inkRect.right - rect.right) ? 'left' : 'right',
  };
});
window.buttonGroupRtlObservations = {
  metadata: window.buttonGroupRtlMetadata,
  fixtures,
  alignments,
};
document.querySelector('#status').textContent =
  `Recorded ${fixtures.length} geometry and ${alignments.length} alignment cases`;
