// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  createNativeStyleCache,
  nativeStyleCacheRegistry as registry,
  type NativeStyleCache,
  type NativeCssInsertion,
} from '../packages/system/src/nativeStyleCache';
const caches: NativeStyleCache[] = [];
const make = (key = 'probe', prepend = false) => {
  const cache = createNativeStyleCache({ key, prepend });
  caches.push(cache);
  return cache;
};
const program = (cache: NativeStyleCache, css: string, hasRules = true): NativeCssInsertion => ({
  cache,
  css,
  hasRules,
});
afterEach(() => {
  for (const cache of caches.splice(0)) cache.dispose();
});

test('render projections and aborted work do not reserve insertion order', () => {
  const a = make('a'),
    b = make('b');
  const revision = registry.snapshot();
  for (let n = 0; n < 30; n++) registry.order(program(a, 'discarded'));
  expect(registry.snapshot()).toBe(revision);
  registry.commit([program(b, 'button')]);
  registry.commit([program(a, 'group')]);
  expect(registry.order(program(b, 'button'))![0]).toBeLessThan(
    registry.order(program(a, 'group'))![0],
  );
});

test('logical dependencies commit ancestor CSS before child CSS in another cache', () => {
  const a = make('a'),
    b = make('b');
  registry.commit([program(a, 'group'), program(b, 'button')]);
  expect(registry.order(program(a, 'group'))![0]).toBeLessThan(
    registry.order(program(b, 'button'))![0],
  );
});

test('new CSS stays inside an existing cache block before a later independent cache', () => {
  const a = make('a'),
    b = make('b');
  registry.commit([program(a, 'old-group'), program(b, 'button')]);
  const projected = registry.order(program(a, 'new-group'));
  registry.commit([program(a, 'new-group')]);
  expect(registry.order(program(a, 'new-group'))).toEqual(projected);
  expect(projected![0]).toBeLessThan(registry.order(program(b, 'button'))![0]);
});

test('unmount leases retain CSS and StrictMode commits are idempotent', () => {
  const cache = make();
  const release = registry.bind(cache);
  registry.commit([program(cache, 'button')]);
  const revision = registry.snapshot(),
    order = registry.order(program(cache, 'button'));
  release();
  release();
  registry.commit([program(cache, 'button')]);
  expect(registry.snapshot()).toBe(revision);
  expect(registry.order(program(cache, 'button'))).toEqual(order);
});

test('empty CSS records no stylesheet block, while prepend projects actual placement', () => {
  const a = make('a'),
    b = make('b'),
    first = make('first', true);
  registry.commit([program(a, 'label-only', false), program(b, 'button')]);
  registry.commit([program(a, 'group')]);
  expect(registry.order(program(b, 'button'))![0]).toBeLessThan(
    registry.order(program(a, 'group'))![0],
  );
  expect(registry.order(program(first, 'prepend'))![0]).toBeLessThan(
    registry.order(program(b, 'button'))![0],
  );
  registry.commit([program(first, 'prepend')]);
  expect(registry.order(program(first, 'prepend'))![0]).toBeLessThan(
    registry.order(program(b, 'button'))![0],
  );
});

test('duplicate selector identities use the later retained matching cache block', () => {
  const a = make(),
    b = make();
  registry.commit([program(a, 'group'), program(b, 'group')]);
  expect(registry.order(program(a, 'group'))).toEqual(registry.order(program(b, 'group')));
  b.dispose();
  expect(registry.order(program(a, 'group'))![0]).toBeGreaterThanOrEqual(0);
});

test('reset and disposal require released roots, and disposal cannot be revived', () => {
  const cache = make();
  const release = registry.bind(cache);
  expect(() => cache.reset()).toThrow('Unmount');
  expect(() => cache.dispose()).toThrow('Unmount');
  registry.commit([program(cache, 'a'), program(cache, 'b')]);
  release();
  cache.reset();
  registry.commit([program(cache, 'b')]);
  expect(registry.order(program(cache, 'b'))![1]).toBe(0);
  cache.dispose();
  cache.dispose();
  expect(() => cache.reset()).toThrow('disposed');
  expect(() => registry.commit([program(cache, 'a')])).toThrow('disposed');
});

test('an invalid dependency cannot partially publish another cache programme', () => {
  const a = make('a'),
    b = make('b');
  b.dispose();
  const revision = registry.snapshot();
  expect(() => registry.commit([program(a, 'group'), program(b, 'button')])).toThrow();
  expect(registry.snapshot()).toBe(revision);
  registry.commit([program(a, 'other')]);
  expect(registry.order(program(a, 'group'))![1]).toBe(1);
});

test('conflicting programme flags cannot partially mutate a commit batch', () => {
  const cache = make();
  const revision = registry.snapshot();
  expect(() =>
    registry.commit([program(cache, 'same', true), program(cache, 'same', false)]),
  ).toThrow('Inconsistent');
  expect(registry.snapshot()).toBe(revision);
  registry.commit([program(cache, 'other')]);
  expect(registry.order(program(cache, 'same'))![1]).toBe(1);
});
