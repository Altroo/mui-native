// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
'use strict';

// Shared inputs, never shared expected results. The fixture producer supplies
// integrity-checked original MUI helpers; Jest supplies our native helpers.
module.exports = function observeColorContract(helpers, mode) {
  const previousMode = process.env.NODE_ENV;
  const previousError = console.error;
  const previousWarn = console.warn;
  const observations = [];
  let diagnostics;
  const normalize = (value) => String(value).replace(/^MUI Native:/, 'MUI:');
  const observe = (name, operation) => {
    diagnostics = [];
    try {
      observations.push({ name, output: operation(), diagnostics });
    } catch (error) {
      // Production MUI uses minified browser-documentation URLs. Native keeps
      // readable branded errors; compare throw/fallback behavior in that mode.
      observations.push({
        name,
        error: {
          name: error.name,
          ...(mode !== 'production' && { message: normalize(error.message) }),
        },
        diagnostics,
      });
    }
  };
  process.env.NODE_ENV = mode;
  console.error = (...args) => diagnostics.push({ channel: 'error', args: args.map(normalize) });
  console.warn = (...args) => diagnostics.push({ channel: 'warn', args: args.map(normalize) });
  try {
    for (const color of ['rgbx', 'rgb', 'hslx', 'color', 'RGB(1, 2, 3)', 'var(--brand)', 'red'])
      observe(`decompose ${color}`, () => helpers.decomposeColor(color));
    for (const color of ['#', '#12345', '#1234567', '#123456789', '#fff ', '#ggg'])
      observe(`hex ${color}`, () => helpers.hexToRgb(color));
    for (const space of ['srgb', 'display-p3', 'a98-rgb', 'prophoto-rgb', 'rec-2020', 'unknown'])
      for (const alpha of ['', ' /0.4', ' / 0.4'])
        observe(`space ${space}${alpha}`, () =>
          helpers.decomposeColor(`color(${space} 0.2 0.4 0.6${alpha})`),
        );
    for (const operation of ['alpha', 'darken', 'lighten', 'emphasize'])
      for (const amount of [-0.5, 1.5, NaN, Infinity])
        observe(`${operation} coefficient ${amount}`, () =>
          helpers[operation]('rgb(12, 34, 56)', amount),
        );
    for (const operation of [
      'private_safeColorChannel',
      'private_safeAlpha',
      'private_safeDarken',
      'private_safeLighten',
      'private_safeEmphasize',
    ])
      for (const color of ['rgbx', 'var(--brand)', '#123456'])
        for (const warning of ['Cannot derive brand', ''])
          observe(`${operation} ${color} warning=${warning}`, () =>
            operation === 'private_safeColorChannel'
              ? helpers[operation](color, warning)
              : helpers[operation](color, 0.2, warning),
          );
    for (const type of ['rgb', 'rgba', 'hsl', 'hsla', 'color']) {
      observe(`recompose mutable ${type}`, () => {
        const color = {
          type,
          values: ['rgba', 'hsla'].includes(type) ? [12.8, 34.2, 56, 0.4] : [12.8, 34.2, 56],
          colorSpace: undefined,
        };
        return { output: helpers.recomposeColor(color), after: color };
      });
      observe(`recompose frozen ${type}`, () =>
        helpers.recomposeColor({ type, values: Object.freeze([12, 34, 56]) }),
      );
    }
    observe('recompose HSL repeated writes', () => {
      const color = { type: 'hsl', values: [220, 70, 40] };
      const first = helpers.recomposeColor(color);
      return { first, second: helpers.recomposeColor(color), after: color };
    });
    observe('recompose public getter order', () => {
      const calls = [];
      let channels = [10, 2, 3];
      const color = {
        get type() {
          calls.push('type');
          return 'rgb';
        },
        get colorSpace() {
          calls.push('colorSpace');
          channels = [20, 2, 3];
          return undefined;
        },
        get values() {
          calls.push('values');
          return channels;
        },
      };
      return { output: helpers.recomposeColor(color), calls };
    });
    observe('parsed runtime object identity', () => {
      const color = { type: 'rgb', values: [12, 34, 56] };
      return helpers.decomposeColor(color) === color;
    });
    for (const operation of ['alpha', 'darken', 'lighten', 'emphasize', 'hslToRgb', 'getLuminance'])
      observe(`parsed runtime ${operation}`, () => {
        const color = { type: 'hsl', values: [220, 70, 40] };
        return { output: helpers[operation](color, 0.2), after: color };
      });
    // JSON preserves non-finite/undefined observations explicitly, rather than
    // silently collapsing malformed numeric channels to null.
    return JSON.parse(
      JSON.stringify(observations, (_key, value) =>
        value === undefined
          ? { undefined: true }
          : typeof value === 'number' && !Number.isFinite(value)
            ? { number: String(value) }
            : value,
      ),
    );
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    console.error = previousError;
    console.warn = previousWarn;
  }
};
