// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
'use strict';

// Inputs are shared with native tests; expectations come only from the original.
module.exports = function observeTransitionHelpers(helpers, mode) {
  const previousMode = process.env.NODE_ENV;
  const previousError = console.error;
  const previousWarn = console.warn;
  const observations = [];
  let diagnostics;
  const normalize = (value) => String(value).replace(/^MUI Native:/, 'MUI:');
  const encode = (_key, value) =>
    value === undefined
      ? { undefined: true }
      : typeof value === 'number' && !Number.isFinite(value)
        ? { number: String(value) }
        : value;
  const observe = (name, operation) => {
    diagnostics = [];
    const events = [];
    try {
      observations.push({ name, output: operation(events), diagnostics, events });
    } catch (error) {
      // Engine-generated TypeError text differs between compiler targets.
      observations.push({
        name,
        error: { name: error.name, ...(error.name !== 'TypeError' && { message: error.message }) },
        diagnostics,
        events,
      });
    }
  };
  process.env.NODE_ENV = mode;
  console.error = (...args) => diagnostics.push({ channel: 'error', args: args.map(normalize) });
  console.warn = (...args) => diagnostics.push({ channel: 'warn', args: args.map(normalize) });
  try {
    const { createTransitions, createMotion } = helpers;
    observe('factory and method identity', () => {
      const a = createTransitions(),
        b = createTransitions();
      return {
        arity: createTransitions.length,
        createArity: a.create.length,
        createName: a.create.name,
        autoName: a.getAutoHeightDuration.name,
        sharedAuto: a.getAutoHeightDuration === b.getAutoHeightDuration,
        ownCreate: a.create !== b.create,
        ownDuration: a.duration !== b.duration,
        ownEasing: a.easing !== b.easing,
      };
    });
    for (const input of [
      undefined,
      null,
      {},
      { duration: { standard: 42 } },
      { custom: 1 },
      { reducedMotion: 'always' },
    ])
      observe(`factory ${JSON.stringify(input, encode)}`, () => {
        const result = createTransitions(input);
        return {
          keys: Object.keys(result),
          duration: result.duration,
          easing: result.easing,
          value: result.create('opacity'),
        };
      });
    for (const value of [undefined, null, false, 0])
      observe(`callback overrides ${value}`, () => {
        const result = createTransitions({ create: value, getAutoHeightDuration: value });
        return {
          keys: Object.keys(result),
          create: result.create,
          auto: result.getAutoHeightDuration,
        };
      });
    observe('custom callbacks retain identity and argument forwarding', () => {
      const calls = [];
      const custom = (...args) => {
        calls.push(args);
        return 'custom';
      };
      const auto = (height) => height + 1;
      const result = createTransitions({ create: custom, getAutoHeightDuration: auto });
      return {
        sameCreate: result.create === custom,
        sameAuto: result.getAutoHeightDuration === auto,
        output: result.create(['opacity'], { duration: 4 }),
        height: result.getAutoHeightDuration(20),
        calls,
      };
    });
    observe('factory snapshot retains symbols and reads getters once', (events) => {
      const key = Symbol('custom');
      const input = {
        get duration() {
          events.push('duration');
          return { standard: 42 };
        },
        get easing() {
          events.push('easing');
          return { easeInOut: 'linear' };
        },
        get create() {
          events.push('create');
          return undefined;
        },
        [key]: 7,
      };
      const result = createTransitions(input);
      return {
        keys: Reflect.ownKeys(result).map(String),
        symbol: result[key],
        createType: typeof result.create,
      };
    });
    const base = createTransitions();
    for (const props of [undefined, null, 17, {}, [], ['opacity', 'transform'], 'height'])
      observe(`props ${JSON.stringify(props, encode)}`, () => base.create(props));
    for (const options of [
      undefined,
      null,
      5,
      'bad',
      { duration: null },
      { easing: null },
      { delay: null },
      { duration: NaN },
      { delay: NaN },
      { duration: 'invalid', easing: 'linear', delay: 'invalid' },
      { unknown: 1 },
      { duration: 1.6, delay: 2.4 },
      { duration: '1s', delay: '0.2s', easing: 'linear' },
    ])
      observe(`options ${JSON.stringify(options, encode)}`, () => base.create('opacity', options));
    observe('option getter evaluation order', (events) =>
      base.create('opacity', {
        get extra() {
          events.push('extra');
          return 1;
        },
        get delay() {
          events.push('delay');
          return 2;
        },
        get easing() {
          events.push('easing');
          return 'linear';
        },
        get duration() {
          events.push('duration');
          return 4;
        },
      }),
    );
    observe('unknown option getter throws in every build', (events) =>
      base.create('opacity', {
        duration: 1,
        get extra() {
          events.push('extra');
          throw Error('extra getter');
        },
      }),
    );
    observe('coercion order', (events) =>
      base.create('opacity', {
        duration: {
          [Symbol.toPrimitive](hint) {
            events.push('duration:' + hint);
            return 2.4;
          },
        },
        delay: {
          [Symbol.toPrimitive](hint) {
            events.push('delay:' + hint);
            return 1.6;
          },
        },
      }),
    );
    observe('create closure observes returned duration mutations', () => {
      const result = createTransitions({ duration: { standard: 42 } });
      result.duration.standard = 50;
      return result.create('opacity');
    });
    observe('returned defaults are isolated from constant mutation', () => {
      const result = createTransitions();
      const previous = helpers.duration.standard;
      try {
        helpers.duration.standard = 17;
        return { old: result.create('opacity'), fresh: createTransitions().create('opacity') };
      } finally {
        helpers.duration.standard = previous;
      }
    });
    for (const height of [undefined, null, 0, 1, 36, 100, 1e9, -1, NaN, Infinity])
      observe(`height ${height}`, () => base.getAutoHeightDuration(height));
    for (const input of [
      undefined,
      null,
      {},
      { reducedMotion: undefined },
      { reducedMotion: 'always' },
      { reducedMotion: 'system' },
      { reducedMotion: 'never', custom: 3 },
    ])
      observe(`motion ${JSON.stringify(input, encode)}`, () => ({
        output: createMotion(input),
        sameInput: createMotion(input) === input,
      }));
    return JSON.parse(JSON.stringify(observations, encode));
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    console.error = previousError;
    console.warn = previousWarn;
  }
};
