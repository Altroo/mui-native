// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { runInNewContext } from 'node:vm';
import { forwardRef } from 'react';
import { merge } from '../packages/system/src/merge';
import { createTheme } from '../packages/system/src/theme';
import original from './fixtures/mui-theme-react-identities-9.5.0.json';
class Token {
  constructor(public value: number) {}
  read() {
    return this.value;
  }
}
const foreign = runInNewContext(`({
 date:new Date('2026-11-08T12:00:00Z'),
 token:new (class ForeignToken {constructor(){this.value=9;} read(){return this.value;}})(),
 plain:{own:2},nullPlain:Object.assign(Object.create(null),{own:2})
})`);
const nonplain: Record<string, any> = {
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
const nested = (value: unknown) => merge({ value: undefined as unknown }, { value }).value;
const themed = (value: unknown) =>
  (
    createTheme({ components: { MuiCard: { defaultProps: { recordValue: value } } } }).components
      .MuiCard as any
  ).defaultProps.recordValue;
function observe(name: string, value: any): unknown {
  if (name === 'date' || name === 'foreignDate') return value.getTime();
  if (name === 'map') return [...value.entries()];
  if (name === 'set') return [...value.values()];
  if (name === 'regexp')
    return { source: value.source, flags: value.flags, lastIndex: value.lastIndex };
  if (name === 'typed') return [...value];
  return value.read();
}
test.each(original.nonplainRows)(
  'source nonplain methods/identity survive nested merge and actual defaultProps: $name',
  (row) => {
    const input = nonplain[row.name],
      merged = nested(input),
      configured = themed(input);
    expect(merged === input).toBe(row.mergeSame);
    expect(configured === input).toBe(row.themeSame);
    expect(observe(row.name, merged)).toEqual(row.mergedValue);
    expect(observe(row.name, configured)).toEqual(row.themedValue);
  },
);
const plain: Record<string, any> = {
  plain: { own: 2 },
  nullPlain: Object.assign(Object.create(null), { own: 2 }),
  foreignPlain: foreign.plain,
  foreignNullPlain: foreign.nullPlain,
  nullAncestor: Object.assign(Object.create(Object.assign(Object.create(null), { inherited: 3 })), {
    own: 2,
  }),
};
test.each(original.plainRows)(
  'source plain recursion handles null and foreign prototypes: $name',
  (row) => {
    const input = plain[row.name],
      merged = nested(input) as any,
      configured = themed(input);
    expect(merged === input).toBe(row.mergeSame);
    expect(configured === input).toBe(row.themeSame);
    expect(Object.keys(merged)).toEqual(row.mergedKeys);
    expect(Object.keys(configured)).toEqual(row.themedKeys);
    expect(merged.own).toBe(row.mergedOwn);
    expect(configured.own).toBe(row.themedOwn);
    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect(input.own).toBe(2);
    expect(merge({ value: { keep: 1 } }, { value: input })).toEqual({ value: row.withBase });
  },
);
const rejected: Record<string, object> = {
  customPrototype: Object.assign(Object.create({ inherited: 3 }), { own: 2 }),
  tagUndefined: Object.defineProperty({ own: 2 }, Symbol.toStringTag, { value: undefined }),
  iteratorUndefined: Object.defineProperty({ own: 2 }, Symbol.iterator, { value: undefined }),
  inheritedIterator: Object.assign(Object.create({ [Symbol.iterator]: undefined }), { own: 2 }),
};
test.each(original.rejectedRows)(
  'pinned plain eligibility preserves excluded records: $name',
  (row) => {
    const input = rejected[row.name];
    expect(nested(input) === input).toBe(row.mergeSame);
    expect(themed(input) === input).toBe(row.themeSame);
  },
);
test.each(original.replacements)(
  'incoming plain value replaces nonplain nested base: $name',
  (row) => {
    const value = row.name === 'array' ? [1, 2] : nonplain[row.name],
      base = { value };
    const result = merge(base, { value: { fresh: 4 } });
    expect(result.value).toEqual(row.result);
    expect(base.value === value).toBe(row.originalSame);
  },
);
test.each(original.getterControls)(
  'symbol presence excludes a leaf without reading the getter: $name',
  (row) => {
    let reads = 0;
    const symbol = row.name === 'tag' ? Symbol.toStringTag : Symbol.iterator;
    const value = Object.defineProperty({ own: 2 }, symbol, {
      get() {
        reads++;
        throw Error('symbol getter');
      },
    });
    expect(nested(value) === value).toBe(row.mergeSame);
    expect(themed(value) === value).toBe(row.themeSame);
    expect(reads).toBe(row.reads);
  },
);
test('incoming nonplain values replace existing nested records without mutation', () => {
  for (const row of original.nonplainRows) {
    const input = nonplain[row.name];
    const base = { value: { before: 1 } };
    expect(merge(base, { value: input }).value === input).toBe(row.replacesPlain);
    expect(base).toEqual({ value: { before: 1 } });
  }
});
test('an accepted React leaf bypasses all new prototype and symbol classification traps', () => {
  const root = forwardRef(() => null),
    trap = jest.fn(() => {
      throw Error('React identity must bypass plain classification');
    });
  const value = new Proxy(root, { getPrototypeOf: trap, has: trap });
  expect(nested(value) === value).toBe(true);
  expect(themed(value) === value).toBe(true);
  expect(trap).not.toHaveBeenCalled();
});
test.each(original.guardErrors)(
  'source $kind guard exception precedes payload traversal',
  (row) => {
    const payload = jest.fn(() => 2),
      target = Object.defineProperty({}, 'payload', { enumerable: true, get: payload });
    const value = new Proxy(target, {
      getPrototypeOf(t) {
        if (row.kind === 'prototype') throw Error('prototype guard');
        return Reflect.getPrototypeOf(t);
      },
      has(t, key) {
        if (typeof key === 'symbol') throw Error('symbol guard');
        return Reflect.has(t, key);
      },
    });
    expect(() => nested(value)).toThrow(row.message);
    expect(payload).toHaveBeenCalledTimes(row.payloadReads);
  },
);
test('ordinary payload getters run after eligibility and exactly once', () => {
  const trace: string[] = [];
  const target = Object.defineProperty({}, 'payload', {
    enumerable: true,
    get() {
      trace.push('payload');
      return 2;
    },
  });
  const value = new Proxy(target, {
    getPrototypeOf(t) {
      trace.push('prototype');
      return Reflect.getPrototypeOf(t);
    },
    has(t, key) {
      if (typeof key === 'symbol') trace.push('has:' + String(key));
      return Reflect.has(t, key);
    },
    ownKeys(t) {
      trace.push('keys');
      return Reflect.ownKeys(t);
    },
  });
  expect(nested(value)).toEqual({ payload: 2 });
  expect(trace.filter((x) => x === 'payload')).toHaveLength(1);
  expect(trace.indexOf('prototype')).toBeLessThan(trace.indexOf('keys'));
  expect(trace.indexOf('has:Symbol(Symbol.iterator)')).toBeLessThan(trace.indexOf('keys'));
});
test('frozen input records and nonplain values remain unmodified', () => {
  const token = Object.freeze(new Token(7)),
    base = Object.freeze({ nested: Object.freeze({ before: 1 }) }),
    input = Object.freeze({ nested: Object.freeze({ after: 2 }), token });
  expect(merge(base, input)).toEqual({ nested: { before: 1, after: 2 }, token });
  expect(merge({ token: null as unknown }, { token }).token === token).toBe(true);
});
test('native top-level, undefined and incoming-array policies remain separate from nested eligibility', () => {
  const token = new Token(7);
  expect(merge(token, { fresh: 4 })).toEqual({ value: 7, fresh: 4 });
  expect(merge({ keep: 1 }, token)).toEqual({ keep: 1, value: 7 });
  const array = [token];
  expect(merge({ value: 0 as unknown }, { value: array }).value === array).toBe(true);
  expect(merge({ keep: 1 }, undefined)).toEqual({ keep: 1 });
  expect(merge({ keep: 1 }, null)).toBe(null);
  const cleared = merge({ nested: { keep: 1 } }, { nested: { keep: undefined } });
  expect(cleared).toEqual({ nested: { keep: undefined } });
});
