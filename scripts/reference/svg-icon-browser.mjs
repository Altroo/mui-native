// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Synthetic observations of the integrity-checked original package.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import SvgIconModule from '../../.cache/palette-reference/node_modules/@mui/material/SvgIcon/SvgIcon.js';
import createSvgIconModule from '../../.cache/palette-reference/node_modules/@mui/material/SvgIcon/createSvgIcon.js';
import svgIconClassesModule, {
  getSvgIconUtilityClass,
} from '../../.cache/palette-reference/node_modules/@mui/material/SvgIcon/svgIconClasses.js';
import {
  ThemeProvider,
  createTheme,
} from '../../.cache/palette-reference/node_modules/@mui/material/styles/index.js';
// .mjs bundles retain Node's CJS default namespace for these pinned artifacts.
const SvgIcon = SvgIconModule.default ?? SvgIconModule;
const createSvgIcon = createSvgIconModule.default ?? createSvgIconModule;
const svgIconClasses = svgIconClassesModule.default ?? svgIconClassesModule;
if (!document.querySelector('h1')) {
  const heading = document.createElement('h1');
  heading.textContent = 'Pinned SvgIcon reference';
  document.body.prepend(heading);
}
const path = /* @__PURE__ */ React.createElement('path', { d: 'M4 4h16v16H4z' });
const Factory = createSvgIcon(path, 'Probe');
const inputs = [
  { name: 'defaults', props: {} },
  ...['inherit', 'small', 'medium', 'large'].map((fontSize) => ({
    name: 'size ' + fontSize,
    props: { fontSize },
  })),
  ...[
    'inherit',
    'primary',
    'secondary',
    'error',
    'warning',
    'info',
    'success',
    'action',
    'disabled',
  ].map((color) => ({ name: 'color ' + color, props: { color } })),
  { name: 'html presentation color', props: { htmlColor: '#135790' } },
  { name: 'CSS palette beats html color', props: { color: 'primary', htmlColor: '#135790' } },
  { name: 'titled', props: { titleAccess: 'Delivery status' } },
  {
    name: 'explicit accessibility',
    props: { titleAccess: 'Status', 'aria-hidden': true, role: 'presentation' },
  },
  { name: 'presentation dimensions', props: { width: 72, height: 48, fill: 'none' } },
  {
    name: 'style dimensions and presentation',
    props: {
      style: {
        width: 40,
        height: 32,
        fontSize: 18,
        color: '#246810',
        fill: 'none',
        stroke: 'currentColor',
      },
    },
  },
  {
    name: 'sx dimensions and paint',
    props: {
      sx: {
        fontSize: 30,
        color: 'error.main',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        width: '2em',
        height: '1em',
      },
    },
  },
  {
    name: 'svg child properties win',
    props: {
      viewBox: '0 0 24 24',
      color: 'primary',
      htmlColor: '#246810',
      id: 'parent',
      fill: '#123456',
    },
    child: {
      viewBox: '0 0 40 20',
      width: 60,
      height: 30,
      color: '#abcdef',
      fill: 'none',
      id: 'child',
    },
  },
  {
    name: 'svg child custom viewbox inheritance',
    props: { inheritViewBox: true, viewBox: '0 0 24 24' },
    child: { viewBox: '0 0 40 20', fill: 'none' },
  },
  { name: 'custom root viewbox', props: { viewBox: '0 0 30 15' }, customRoot: true },
  {
    name: 'custom root inherited viewbox',
    props: { inheritViewBox: true, viewBox: '0 0 30 15' },
    customRoot: true,
  },
  {
    name: 'theme defaults',
    props: {},
    theme: {
      components: {
        MuiSvgIcon: {
          defaultProps: { color: 'success', fontSize: 'large', titleAccess: 'Themed' },
        },
      },
    },
  },
  {
    name: 'named overrides and variant',
    props: { color: 'primary', fontSize: 'small' },
    theme: {
      components: {
        MuiSvgIcon: {
          styleOverrides: {
            root: { opacity: 0.8 },
            colorPrimary: { color: '#123abc' },
            fontSizeSmall: { fontSize: 19 },
          },
          variants: [{ props: { color: 'primary' }, style: { width: 33 } }],
        },
      },
    },
  },
  { name: 'factory default', props: {}, factory: true },
  { name: 'factory user test id', props: { 'data-testid': 'authored' }, factory: true },
  { name: 'factory replaces authored children', props: {}, factory: true, authoredChildren: true },
  {
    name: 'custom palette color',
    props: { color: 'brand' },
    theme: { palette: { brand: { main: '#893456' } } },
  },
  {
    name: 'changed typography scale',
    props: { fontSize: 'small' },
    theme: { typography: { fontSize: 20, htmlFontSize: 20 } },
  },
];
inputs.push({
  name: 'configured document root font',
  props: { fontSize: 'small' },
  rootFontSize: 20,
  theme: { cssRootFontSize: 20, typography: { fontSize: 20, htmlFontSize: 20 } },
});
inputs.push(
  {
    name: 'sx color inherit outranks html color',
    props: { color: 'primary', htmlColor: '#123456', sx: { color: 'inherit' } },
  },
  {
    name: 'sx color unset outranks html color',
    props: { color: 'primary', htmlColor: '#123456', sx: { color: 'unset' } },
  },
  {
    name: 'sx currentColor means inherited self color',
    props: { color: 'primary', htmlColor: '#123456', sx: { color: 'currentColor' } },
  },
  {
    name: 'inline color inherit',
    props: { color: 'primary', htmlColor: '#123456', style: { color: 'inherit' } },
  },
  { name: 'wrapped SVG currentColor attribute', props: {}, child: { color: 'currentColor' } },
  { name: 'nested Material color inheritance', props: { color: 'primary' }, nested: true },
  { name: 'nested presentation color inheritance', props: { htmlColor: '#123456' }, nested: true },
);
inputs.push(
  {
    name: 'child large joins owner small variant',
    props: { fontSize: 'small' },
    child: { fontSize: 'large' },
  },
  {
    name: 'owner large outranks child small variant',
    props: { fontSize: 'large' },
    child: { fontSize: 'small' },
  },
  {
    name: 'child secondary joins owner primary variant',
    props: { color: 'primary' },
    child: { color: 'secondary' },
  },
  {
    name: 'owner secondary outranks child primary variant',
    props: { color: 'secondary' },
    child: { color: 'primary' },
  },
  {
    name: 'child disabled joins owner primary variant',
    props: { color: 'primary' },
    child: { color: 'disabled' },
  },
  {
    name: 'named owner override follows joined size variants',
    props: { fontSize: 'small' },
    child: { fontSize: 'large' },
    theme: { components: { MuiSvgIcon: { styleOverrides: { fontSizeSmall: { fontSize: 19 } } } } },
  },
  {
    name: 'default root identity matches theme variant',
    props: {},
    theme: {
      components: {
        MuiSvgIcon: {
          variants: [{ props: { component: 'svg' }, style: { fontSize: 27, opacity: 0.7 } }],
        },
      },
    },
  },
  {
    name: 'child props match a theme object variant',
    props: { color: 'primary' },
    child: { color: 'secondary' },
    theme: {
      components: {
        MuiSvgIcon: { variants: [{ props: { color: 'secondary' }, style: { fontSize: 29 } }] },
      },
    },
  },
);
inputs.push(
  { name: 'default component reaches named style callback', props: {}, callbackCase: 'component' },
  {
    name: 'named callback sees root attributes and owner state',
    props: { color: 'primary' },
    child: { color: 'secondary' },
    callbackCase: 'root-props',
  },
  {
    name: 'function variant sees merged owner state',
    props: { color: 'primary' },
    child: { color: 'secondary' },
    callbackCase: 'predicate',
  },
  {
    name: 'function style sees source theme and owner state',
    props: { color: 'primary' },
    child: { color: 'secondary' },
    callbackCase: 'style',
  },
);
inputs.push({
  name: 'generated root fields reach style callbacks',
  props: {},
  callbackCase: 'generated-root',
});
const root = createRoot(document.getElementById('root'));
function Custom(props) {
  return /* @__PURE__ */ React.createElement('svg', { viewBox: '0 0 48 12', ...props });
}
window.svgIconInputs = inputs;
window.svgIconObservations = [];
for (const input of inputs) {
  // Cases are independent mounts. Reusing an SVG would sample a fill transition
  // from the preceding case instead of this input's initial computed style.
  flushSync(() => root.render(null));
  document.documentElement.style.fontSize = `${input.rootFontSize ?? 16}px`;
  let ref;
  let options = input.theme ?? {};
  if (input.callbackCase === 'component')
    options = {
      components: {
        MuiSvgIcon: {
          styleOverrides: {
            root: ({ ownerState }) => ({ opacity: ownerState.component === 'svg' ? 0.4 : 1 }),
          },
        },
      },
    };
  if (input.callbackCase === 'root-props')
    options = {
      components: {
        MuiSvgIcon: {
          styleOverrides: {
            root: ({ color, ownerState }) => ({
              fontSize: color === 'secondary' && ownerState.color === 'primary' ? 17 : 30,
            }),
          },
        },
      },
    };
  if (input.callbackCase === 'predicate')
    options = {
      components: {
        MuiSvgIcon: {
          variants: [
            {
              props: ({ component, color, ownerState }) =>
                component === 'svg' && color === 'primary' && ownerState.color === 'primary',
              style: { fontSize: 22, opacity: 0.6 },
            },
          ],
        },
      },
    };
  if (input.callbackCase === 'style')
    options = {
      components: {
        MuiSvgIcon: {
          variants: [
            {
              props: { color: 'secondary' },
              style: ({ theme, color, ownerState }) => ({
                fontSize: 26,
                color:
                  color === 'primary' && ownerState.color === 'primary'
                    ? theme.palette.success.main
                    : theme.palette.error.main,
              }),
            },
          ],
        },
      },
    };
  if (input.callbackCase === 'generated-root')
    options = {
      components: {
        MuiSvgIcon: {
          styleOverrides: {
            root: ({ viewBox, focusable, className, 'aria-hidden': hidden }) => ({
              opacity:
                viewBox === '0 0 24 24' &&
                focusable === 'false' &&
                hidden === true &&
                className.includes('MuiSvgIcon-root')
                  ? 0.35
                  : 1,
            }),
          },
        },
      },
    };
  const theme = createTheme(options);
  const C = input.factory ? Factory : SvgIcon;
  let child = input.authoredChildren
    ? /* @__PURE__ */ React.createElement('circle', { r: '3' })
    : path;
  if (input.nested) child = React.createElement(SvgIcon, null, path);
  if (input.child) child = /* @__PURE__ */ React.createElement('svg', { ...input.child }, path);
  flushSync(() =>
    root.render(
      /* @__PURE__ */ React.createElement(
        ThemeProvider,
        { theme },
        /* @__PURE__ */ React.createElement(
          'div',
          { style: { fontSize: 28, color: '#654321' } },
          /* @__PURE__ */ React.createElement(
            C,
            {
              ...input.props,
              component: input.customRoot ? Custom : void 0,
              ref: (node) => {
                ref = node;
              },
            },
            child,
          ),
        ),
      ),
    ),
  );
  const svg = document.querySelector('svg'),
    style = getComputedStyle(svg);
  window.svgIconObservations.push({
    input,
    attributes: Object.fromEntries(
      [
        'viewBox',
        'color',
        'fill',
        'width',
        'height',
        'role',
        'aria-hidden',
        'focusable',
        'id',
        'data-testid',
      ].map((k) => [k, svg.getAttribute(k)]),
    ),
    computed: Object.fromEntries(
      ['width', 'height', 'fontSize', 'color', 'fill', 'stroke', 'strokeWidth', 'opacity'].map(
        (k) => [k, style[k]],
      ),
    ),
    titles: [...svg.querySelectorAll('title')].map((n) => n.textContent),
    shapes: [...svg.children].map((n) => n.tagName),
    refTag: ref?.tagName,
    nestedColors: [...svg.querySelectorAll('svg')].map((node) => getComputedStyle(node).color),
    utilityTokens: svg
      .getAttribute('class')
      .split(/\s+/)
      .filter((k) => k.startsWith('Mui')),
  });
}
window.svgIconClassObservations = {
  classes: svgIconClasses,
  disabled: getSvgIconUtilityClass('disabled'),
  info: getSvgIconUtilityClass('colorInfo'),
};
window.svgIconFactoryMetadata = {
  muiName: Factory.muiName ?? null,
  renderMuiName: Factory.type.render.muiName,
  renderDisplayName: Factory.type.render.displayName,
};
window.svgIconDone = true;
