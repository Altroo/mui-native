// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { writeFile, readFile } from 'node:fs/promises';
import * as prettier from 'prettier';
import { loadReference } from './load.mjs';
const loaded = await loadReference('@mui/utils', ['deepmerge/deepmerge.js']);
const merge = loaded.require('@mui/utils/deepmerge').default,
  React = loaded.require('react');
const Context = React.createContext(null);
let calls = 0;
const values = {
  forwardRef: React.forwardRef(() => null),
  memo: React.memo(() => null),
  lazy: React.lazy(() => {
    calls++;
    return Promise.resolve({ default: () => null });
  }),
  element: React.createElement('div', { id: 'x' }),
  context: Context,
  consumer: Context.Consumer,
  client: { $$typeof: Symbol.for('react.client.reference') },
  module: {
    getModuleId() {
      throw Error('never invoke module id');
    },
  },
};
const cases = Object.entries(values).map(([name, value]) => ({
  name,
  same: merge({}, { value }).value === value,
}));
const accessors = [];
for (const symbols of [
  ['react.forward_ref'],
  ['react.lazy'],
  ['not-react', 'not-react', 'react.memo'],
  ['not-react'],
]) {
  const trace = [];
  let reads = 0;
  const value = Object.defineProperties(
    {},
    {
      $$typeof: {
        get() {
          trace.push('tag');
          return Symbol.for(symbols[Math.min(reads++, symbols.length - 1)]);
        },
      },
      getModuleId: {
        get() {
          trace.push('module');
          return undefined;
        },
      },
    },
  );
  accessors.push({ symbols, same: merge({}, { value }).value === value, trace });
}
const material = await loadReference('@mui/material', [
  'styles/createTheme.js',
  'styles/createThemeNoVars.js',
]);
const { createTheme } = material.require('@mui/material/styles');
class Token {
  constructor(value) {
    this.value = value;
  }
  read() {
    return this.value;
  }
}
const foreign = runInNewContext(`({
  date: new Date('2026-11-08T12:00:00Z'),
  token: new (class ForeignToken { constructor() { this.value = 9; } read() { return this.value; } })(),
  plain: { own: 2 },
  nullPlain: Object.assign(Object.create(null), { own: 2 })
})`);
const nonplain = {
  date: new Date('2026-11-08T12:00:00Z'),
  map: new Map([['k', 3]]),
  set: new Set([3]),
  regexp: /x/gi,
  typed: new Uint8Array([2, 4]),
  token: new Token(7),
  foreignDate: foreign.date,
  foreignToken: foreign.token,
};
nonplain.regexp.lastIndex = 2;
function observeValue(name, value) {
  if (name === 'date' || name === 'foreignDate') return value.getTime();
  if (name === 'map') return [...value.entries()];
  if (name === 'set') return [...value.values()];
  if (name === 'regexp')
    return { source: value.source, flags: value.flags, lastIndex: value.lastIndex };
  if (name === 'typed') return [...value];
  return value.read();
}
const selectedDefault = (value) =>
  createTheme({ components: { MuiCard: { defaultProps: { recordValue: value } } } }).components
    .MuiCard.defaultProps.recordValue;
const nonplainRows = Object.entries(nonplain).map(([name, value]) => {
  const merged = merge({}, { value }).value,
    themed = selectedDefault(value);
  return {
    name,
    mergeSame: merged === value,
    themeSame: themed === value,
    replacesPlain: merge({ value: { before: 1 } }, { value }).value === value,
    mergedValue: observeValue(name, merged),
    themedValue: observeValue(name, themed),
  };
});
const plainValues = {
  plain: { own: 2 },
  nullPlain: Object.assign(Object.create(null), { own: 2 }),
  foreignPlain: foreign.plain,
  foreignNullPlain: foreign.nullPlain,
  nullAncestor: Object.assign(Object.create(Object.assign(Object.create(null), { inherited: 3 })), {
    own: 2,
  }),
};
const plainRows = Object.entries(plainValues).map(([name, value]) => {
  const merged = merge({}, { value }).value,
    themed = selectedDefault(value);
  return {
    name,
    mergeSame: merged === value,
    themeSame: themed === value,
    mergedKeys: Object.keys(merged),
    themedKeys: Object.keys(themed),
    mergedOwn: merged.own,
    themedOwn: themed.own,
    withBase: merge({ value: { keep: 1 } }, { value }).value,
  };
});
const taggedValues = {
  customPrototype: Object.assign(Object.create({ inherited: 3 }), { own: 2 }),
  tagUndefined: Object.defineProperty({ own: 2 }, Symbol.toStringTag, { value: undefined }),
  iteratorUndefined: Object.defineProperty({ own: 2 }, Symbol.iterator, { value: undefined }),
  inheritedIterator: Object.assign(Object.create({ [Symbol.iterator]: undefined }), { own: 2 }),
};
const rejectedRows = Object.entries(taggedValues).map(([name, value]) => ({
  name,
  mergeSame: merge({}, { value }).value === value,
  themeSame: selectedDefault(value) === value,
}));
const replacements = [];
for (const [name, value] of Object.entries({ ...nonplain, array: [1, 2] })) {
  const base = { value },
    result = merge(base, { value: { fresh: 4 } });
  replacements.push({ name, result: result.value, originalSame: base.value === value });
}
const getterControls = [];
for (const [name, symbol] of [
  ['tag', Symbol.toStringTag],
  ['iterator', Symbol.iterator],
]) {
  let reads = 0;
  const value = Object.defineProperty({ own: 2 }, symbol, {
    get() {
      reads++;
      throw Error('symbol getter must stay unread');
    },
  });
  const merged = merge({}, { value }).value,
    themed = selectedDefault(value);
  getterControls.push({ name, mergeSame: merged === value, themeSame: themed === value, reads });
}
const guardErrors = [];
for (const kind of ['prototype', 'symbol']) {
  let payloadReads = 0;
  const target = Object.defineProperty({}, 'payload', {
    enumerable: true,
    get() {
      payloadReads++;
      return 2;
    },
  });
  const value = new Proxy(target, {
    getPrototypeOf(item) {
      if (kind === 'prototype') throw Error('prototype guard');
      return Reflect.getPrototypeOf(item);
    },
    has(item, key) {
      if (typeof key === 'symbol') throw Error('symbol guard');
      return Reflect.has(item, key);
    },
  });
  let message;
  try {
    merge({}, { value });
  } catch (error) {
    message = error.message;
  }
  guardErrors.push({ kind, message, payloadReads });
}
const fixture = 'tests/fixtures/mui-theme-react-identities-9.5.0.json';
const data = {
  reference: loaded.reference,
  cases,
  lazyCalls: calls,
  accessors,
  materialReference: material.reference,
  nonplainRows,
  plainRows,
  rejectedRows,
  replacements,
  getterControls,
  guardErrors,
};
const bytes = await prettier.format(JSON.stringify(data), {
  ...(await prettier.resolveConfig(fixture)),
  parser: 'json',
});
if (process.argv.includes('--check'))
  assert.equal(await readFile(fixture, 'utf8'), bytes, 'Theme React identity reference changed');
else await writeFile(fixture, bytes);
console.log(
  `Pinned MUI React identity leaves: ${cases.length} React types, ${accessors.length} brand controls, ${nonplainRows.length} nonplain defaults, ${plainRows.length} plain boundaries, ${rejectedRows.length} excluded records, ${replacements.length} replacement directions and ${getterControls.length} unread symbol controls.`,
);
