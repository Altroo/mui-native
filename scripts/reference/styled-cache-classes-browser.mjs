// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Synthetic original MIT MUI/Emotion observations; no native module aliases.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import cacheModule from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import ButtonModule from '../../.cache/palette-reference/node_modules/@mui/material/Button/Button.js';
import BoxModule from '../../.cache/palette-reference/node_modules/@mui/material/Box/Box.js';
import styledModule from '../../.cache/palette-reference/node_modules/@mui/material/styles/styled.js';
import {
  ThemeProvider,
  createTheme,
} from '../../.cache/palette-reference/node_modules/@mui/material/styles/index.js';
const createCache = cacheModule.default ?? cacheModule;
const Button = ButtonModule.default ?? ButtonModule;
const Box = BoxModule.default ?? BoxModule;
const styled = styledModule.default ?? styledModule;
export function classMembershipObservations() {
  const h = React.createElement,
    theme = createTheme();
  const scenarios = [
    { name: 'different-keys-cold', a: 'foreign-a', b: 'foreign-b' },
    { name: 'different-keys-b-first', a: 'first-a', b: 'first-b', warm: 'block' },
    { name: 'same-key-cold', a: 'shared-cold', b: 'shared-cold' },
    { name: 'same-key-registered', a: 'shared-warm', b: 'shared-warm', warm: 'registered' },
    {
      name: 'same-key-aborted-registration',
      a: 'shared-aborted',
      b: 'shared-aborted',
      warm: 'aborted',
    },
    { name: 'same-key-b-first-unregistered', a: 'shared-block', b: 'shared-block', warm: 'block' },
  ];
  const rows = [];
  for (const spec of scenarios) {
    const calls = [];
    const make = (name, key) => {
      const cache = createCache({ key });
      const insert = cache.insert;
      cache.insert = function (selector, serialized, sheet, shouldCache) {
        calls.push({ cache: name, selector, name: serialized.name, css: serialized.styles });
        return Reflect.apply(insert, this, [selector, serialized, sheet, shouldCache]);
      };
      return cache;
    };
    const a = make('a', spec.a),
      b = make('b', spec.b);
    const mount = document.createElement('section');
    document.body.append(mount);
    const root = createRoot(mount);
    let warming = true;
    const suspended = new Promise(() => {});
    const Shell = ({ children, ...props }) => {
      if (spec.warm === 'aborted' && warming) throw suspended;
      return h('div', props, children);
    };
    const Warm =
      spec.warm === 'registered' || spec.warm === 'aborted'
        ? styled(Shell)({ color: 'red' })
        : styled('div')({ padding: 1 });
    if (spec.warm) {
      flushSync(() =>
        root.render(
          h(
            CacheProvider,
            { value: b },
            h(React.Suspense, { fallback: h('span', null, 'Pending') }, h(Warm, null, 'Warm up')),
          ),
        ),
      );
      flushSync(() => root.render(null));
    }
    warming = false;
    const before = { a: Object.keys(a.registered), b: Object.keys(b.registered) };
    let incomingClass = '';
    const Bridge = ({ className, ...props }) => {
      incomingClass = className;
      return h(
        CacheProvider,
        { value: b },
        h(
          Button,
          { ...props, className, disableRipple: true, sx: { color: 'blue', transition: 'none' } },
          spec.name,
        ),
      );
    };
    const StyledBridge = styled(Bridge)({ color: 'red' });
    flushSync(() =>
      root.render(h(CacheProvider, { value: a }, h(ThemeProvider, { theme }, h(StyledBridge)))),
    );
    const button = mount.querySelector('button');
    const row = {
      name: spec.name,
      keys: { a: spec.a, b: spec.b },
      incomingClass,
      buttonClass: button.className,
      color: getComputedStyle(button).color,
      incomingRetained: button.classList.contains(incomingClass),
      before,
      after: { a: { ...a.registered }, b: { ...b.registered } },
      calls,
    };
    rows.push(row);
    flushSync(() => root.unmount());
    const label = document.createElement('p');
    label.textContent =
      spec.name + ': ' + row.color + ' / foreign class retained: ' + row.incomingRetained;
    document.body.append(label);
  }
  {
    const a = createCache({ key: 'reset-source' }),
      b = createCache({ key: 'reset-target' });
    const mount = document.createElement('section');
    document.body.append(mount);
    const root = createRoot(mount);
    const Warm = styled('div')({ padding: 1 });
    let incomingClass = '';
    const Producer = styled(({ className }) => {
      incomingClass = className;
      return null;
    })({ color: 'red' });
    flushSync(() => root.render(h(CacheProvider, { value: b }, h(Warm))));
    flushSync(() => root.render(null));
    flushSync(() => root.render(h(CacheProvider, { value: a }, h(Producer))));
    flushSync(() => root.render(null));
    flushSync(() =>
      root.render(
        h(
          CacheProvider,
          { value: b },
          h(
            ThemeProvider,
            { theme },
            h(
              Button,
              {
                className: incomingClass,
                disableRipple: true,
                sx: { color: 'blue', transition: 'none' },
              },
              'Reset receiver',
            ),
          ),
        ),
      ),
    );
    const button = mount.querySelector('button');
    const beforeColor = getComputedStyle(button).color;
    a.sheet.flush();
    a.inserted = {};
    a.registered = {};
    const afterColor = getComputedStyle(button).color;
    rows.push({
      name: 'foreign-emitter-reset',
      keys: { a: a.key, b: b.key },
      incomingClass,
      buttonClass: button.className,
      beforeColor,
      afterColor,
      incomingRetained: button.classList.contains(incomingClass),
    });
    flushSync(() => root.unmount());
    const label = document.createElement('p');
    label.textContent = 'foreign-emitter-reset: ' + beforeColor + ' -> ' + afterColor;
    document.body.append(label);
  }
  {
    const a = createCache({ key: 'multi-hop' }),
      b = createCache({ key: 'multi-hop' }),
      c = createCache({ key: 'multi-hop' }),
      d = createCache({ key: 'multi-hop' });
    const mount = document.createElement('section');
    document.body.append(mount);
    const root = createRoot(mount);
    const Shell = (props) => h('div', props);
    const Red = styled(Shell)({ color: 'red' }),
      Blue = styled(Shell)({ color: 'blue' });
    flushSync(() =>
      root.render(h(CacheProvider, { value: d }, h(React.Fragment, null, h(Red), h(Blue)))),
    );
    flushSync(() => root.render(null));
    const Third = styled((props) =>
      h(
        CacheProvider,
        { value: d },
        h(Button, { ...props, sx: { color: 'green', transition: 'none' } }),
      ),
    )({ padding: 2 });
    const Second = styled((props) => h(CacheProvider, { value: c }, h(Third, props)))({
      color: 'blue',
    });
    const First = styled((props) => h(CacheProvider, { value: b }, h(Second, props)))({
      color: 'red',
    });
    flushSync(() =>
      root.render(
        h(
          CacheProvider,
          { value: a },
          h(ThemeProvider, { theme }, h(First, null, 'Multi-hop receiver')),
        ),
      ),
    );
    const button = mount.querySelector('button');
    const color = getComputedStyle(button).color;
    rows.push({
      name: 'multiple-foreign-class-order',
      color,
      buttonClass: button.className,
      registeredReceiver: { ...d.registered },
    });
    flushSync(() => root.unmount());
    const label = document.createElement('p');
    label.textContent = 'multiple-foreign-class-order: ' + color;
    document.body.append(label);
  }
  {
    const a = createCache({ key: 'terminal-membership' }),
      b = createCache({ key: 'terminal-membership' });
    const mount = document.createElement('section');
    document.body.append(mount);
    const root = createRoot(mount);
    const Block = styled('div')({ padding: 1 }),
      TerminalRed = styled('div')({ color: 'red' });
    flushSync(() => root.render(h(CacheProvider, { value: a }, h(Block))));
    flushSync(() => root.render(null));
    flushSync(() => root.render(h(CacheProvider, { value: b }, h(TerminalRed))));
    flushSync(() => root.render(null));
    const registeredBefore = { ...b.registered };
    const Bridge = styled((props) =>
      h(
        CacheProvider,
        { value: b },
        h(Button, { ...props, sx: { color: 'blue', transition: 'none' } }),
      ),
    )({ color: 'red' });
    flushSync(() =>
      root.render(
        h(
          CacheProvider,
          { value: a },
          h(ThemeProvider, { theme }, h(Bridge, null, 'Terminal membership')),
        ),
      ),
    );
    const button = mount.querySelector('button');
    const color = getComputedStyle(button).color;
    rows.push({
      name: 'terminal-does-not-register',
      color,
      buttonClass: button.className,
      registeredBefore,
    });
    flushSync(() => root.unmount());
    const label = document.createElement('p');
    label.textContent = 'terminal-does-not-register: ' + color;
    document.body.append(label);
  }
  {
    const a = createCache({ key: 'focused-membership' }),
      b = createCache({ key: 'focused-membership' });
    const mount = document.createElement('section');
    document.body.append(mount);
    const root = createRoot(mount);
    const Warm = styled('div')({ padding: 1 });
    flushSync(() => root.render(h(CacheProvider, { value: b }, h(Warm))));
    flushSync(() => root.render(null));
    const focusAction = React.createRef();
    const Bridge = styled((props) =>
      h(
        CacheProvider,
        { value: b },
        h(Button, {
          ...props,
          action: focusAction,
          disableRipple: true,
          sx: { color: 'blue', transition: 'none' },
        }),
      ),
    )({ color: 'red' });
    flushSync(() =>
      root.render(
        h(
          CacheProvider,
          { value: a },
          h(ThemeProvider, { theme }, h(Bridge, null, 'Focused membership')),
        ),
      ),
    );
    const button = mount.querySelector('button');
    const beforeColor = getComputedStyle(button).color;
    const beforeClass = button.className;
    const warmMount = document.createElement('section');
    document.body.append(warmMount);
    const warmRoot = createRoot(warmMount);
    const Register = styled((props) => h('div', props))({ color: 'red' });
    flushSync(() => warmRoot.render(h(CacheProvider, { value: b }, h(Register))));
    flushSync(() => warmRoot.unmount());
    const registeredColor = getComputedStyle(button).color;
    flushSync(() => focusAction.current.focusVisible());
    const afterColor = getComputedStyle(button).color;
    rows.push({
      name: 'focus-resolves-new-class-membership',
      beforeColor,
      registeredColor,
      afterColor,
      beforeClass,
      afterClass: button.className,
      registered: { ...b.registered },
    });
    flushSync(() => root.unmount());
    const label = document.createElement('p');
    label.textContent =
      'focus-resolves-new-class-membership: ' +
      beforeColor +
      ' -> ' +
      registeredColor +
      ' -> ' +
      afterColor;
    document.body.append(label);
  }
  for (const mode of ['default', 'forwarded', 'consumed']) {
    const cache = createCache({ key: 'as-' + mode });
    const calls = [];
    let forwardedAs = null;
    const Shell = ({ as, ...props }) => {
      forwardedAs = as ?? null;
      return h('div', props);
    };
    const options =
      mode === 'default'
        ? undefined
        : {
            shouldForwardProp: (key) => {
              calls.push(key);
              return mode === 'forwarded' || key !== 'as';
            },
          };
    const constructor = styled(Shell, options);
    const factoryCalls = [...calls];
    const Root = constructor({ color: 'red' });
    const mount = document.createElement('section');
    document.body.append(mount);
    const root = createRoot(mount);
    flushSync(() =>
      root.render(
        h(
          CacheProvider,
          { value: cache },
          h(Root, { as: 'span', 'data-testid': 'as-' + mode }, 'As choice'),
        ),
      ),
    );
    const element = mount.querySelector('[data-testid]');
    rows.push({
      name: 'as-' + mode,
      tag: element.tagName,
      forwardedAs,
      factoryCalls,
      registered: { ...cache.registered },
      className: element.className,
    });
    flushSync(() => root.unmount());
    cache.sheet.flush();
    mount.remove();
    const label = document.createElement('p');
    label.textContent =
      'as-' +
      mode +
      ': ' +
      element.tagName +
      ' / registered: ' +
      Object.keys(cache.registered).length;
    document.body.append(label);
  }

  {
    const cache = createCache({ key: 'as-opaque' }),
      trace = [],
      receivers = [];
    let css = '';
    const originalInsert = cache.insert;
    cache.insert = function (selector, serialized, sheet, shouldCache) {
      css = serialized.styles;
      return Reflect.apply(originalInsert, this, [selector, serialized, sheet, shouldCache]);
    };
    const Shell = (props) => h('div', props);
    const Inner = styled(Shell, {
      shouldForwardProp: function (key) {
        'use strict';
        receivers.push(this);
        trace.push('inner:' + key);
        return key !== 'as';
      },
    })({ padding: 2 });
    trace.length = 0;
    const Outer = styled(Inner, {
      shouldForwardProp: function (key) {
        'use strict';
        receivers.push(this);
        trace.push('outer:' + key);
        return true;
      },
    })({ color: 'blue' });
    const factoryCalls = [...trace];
    trace.length = 0;
    const mount = document.createElement('section');
    document.body.append(mount);
    const root = createRoot(mount);
    flushSync(() =>
      root.render(
        h(
          CacheProvider,
          { value: cache },
          h(Outer, { as: 'span', 'data-testid': 'opaque-as' }, 'Opaque source'),
        ),
      ),
    );
    const element = mount.querySelector('span');
    rows.push({
      name: 'as-opaque-composition',
      tag: element.tagName,
      className: element.className,
      factoryCalls,
      renderCalls: [...trace],
      receivers: receivers.map((receiver) =>
        receiver === undefined
          ? 'undefined'
          : receiver === Inner
            ? 'inner'
            : receiver === Outer
              ? 'outer'
              : 'unexpected',
      ),
      css,
      registered: { ...cache.registered },
    });
    flushSync(() => root.unmount());
    cache.sheet.flush();
    mount.remove();
  }
  {
    const a = createCache({ key: 'box-reset-source' }),
      b = createCache({ key: 'box-reset-target' });
    const mount = document.createElement('section');
    document.body.append(mount);
    const root = createRoot(mount);
    const Warm = styled('div')({ padding: 1 });
    let incomingClass = '';
    const Producer = styled(({ className }) => {
      incomingClass = className;
      return null;
    })({ color: 'red' });
    flushSync(() => root.render(h(CacheProvider, { value: b }, h(Warm))));
    flushSync(() => root.render(null));
    flushSync(() => root.render(h(CacheProvider, { value: a }, h(Producer))));
    flushSync(() => root.render(null));
    flushSync(() =>
      root.render(
        h(
          CacheProvider,
          { value: b },
          h(Box, { className: incomingClass, sx: { color: 'blue' } }, 'Idle Box'),
        ),
      ),
    );
    const box = mount.querySelector('div');
    const beforeColor = getComputedStyle(box).color;
    a.sheet.flush();
    a.inserted = {};
    a.registered = {};
    const afterColor = getComputedStyle(box).color;
    rows.push({
      name: 'box-foreign-emitter-reset',
      incomingClass,
      buttonClass: box.className,
      beforeColor,
      afterColor,
      incomingRetained: box.classList.contains(incomingClass),
    });
    flushSync(() => root.unmount());
    b.sheet.flush();
    mount.remove();
  }
  {
    const cache = createCache({ key: 'as-explicit-undefined' });
    let forwardedAs = null;
    const Shell = ({ as, ...props }) => {
      forwardedAs = as ?? null;
      return h('div', props);
    };
    const Root = styled(Shell, { shouldForwardProp: undefined })({ color: 'red' });
    const mount = document.createElement('section');
    document.body.append(mount);
    const root = createRoot(mount);
    flushSync(() =>
      root.render(
        h(CacheProvider, { value: cache }, h(Root, { as: 'span' }, 'Explicit undefined')),
      ),
    );
    const element = mount.querySelector('div');
    rows.push({
      name: 'as-explicit-undefined',
      tag: element.tagName,
      forwardedAs,
      factoryCalls: [],
      registered: { ...cache.registered },
      className: element.className,
    });
    flushSync(() => root.unmount());
    cache.sheet.flush();
    mount.remove();
  }
  {
    const cache = createCache({ key: 'as-inherited-undefined' }),
      calls = [],
      receivers = [];
    let css = '';
    const originalInsert = cache.insert;
    cache.insert = function (selector, serialized, sheet, shouldCache) {
      css = serialized.styles;
      return Reflect.apply(originalInsert, this, [selector, serialized, sheet, shouldCache]);
    };
    const Shell = (props) => h('div', props);
    const Inner = styled(Shell, {
      shouldForwardProp: function (key) {
        'use strict';
        receivers.push(this);
        calls.push(key);
        return key !== 'as';
      },
    })({ padding: 2 });
    calls.length = 0;
    const Outer = styled(Inner, { shouldForwardProp: undefined })({ color: 'blue' });
    const factoryCalls = [...calls];
    calls.length = 0;
    const mount = document.createElement('section');
    document.body.append(mount);
    const root = createRoot(mount);
    flushSync(() =>
      root.render(
        h(
          CacheProvider,
          { value: cache },
          h(Outer, { as: 'span', 'data-testid': 'inherited-undefined' }, 'Direct inherited'),
        ),
      ),
    );
    const element = mount.querySelector('span');
    rows.push({
      name: 'as-inherited-undefined',
      tag: element.tagName,
      factoryCalls,
      renderCalls: [...calls],
      receivers: receivers.map((value) => (value === undefined ? 'undefined' : 'unexpected')),
      css,
      className: element.className,
      registered: { ...cache.registered },
    });
    flushSync(() => root.unmount());
    cache.sheet.flush();
    mount.remove();
  }
  return rows;
}
