// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { transformSync } = require('esbuild');
const folder = await mkdtemp(join(tmpdir(), 'mui-structural-client-'));
const source = await readFile(
  new URL('../src/structuralObserverClient.ts', import.meta.url),
  'utf8',
);
const compiled = join(folder, 'client.cjs');
await writeFile(compiled, transformSync(source, { loader: 'ts', format: 'cjs' }).code);
const { createStructuralObserverClient } = require(compiled);
after(() => rm(folder, { recursive: true, force: true }));
class Native {
  calls = [];
  entries = new Map();
  records = [];
  next = 0;
  connect(notify) {
    this.calls.push(['connect']);
    if ('connectError' in this) throw this.connectError;
    this.notify = notify;
  }
  observe(tag, lease, mode) {
    this.calls.push(['observe', tag, lease, mode]);
    if ('observeError' in this) throw this.observeError;
    const id = 'forcedId' in this ? this.forcedId : ++this.next;
    this.entries.set(id, lease);
    this.records.push({ subscriptionId: id, lease, revision: 1, closed: false });
    return id;
  }
  unobserve(id, lease) {
    this.calls.push(['unobserve', id, lease]);
    if ('unobserveError' in this) throw this.unobserveError;
    if (this.entries.get(id) !== lease) return false;
    return this.entries.delete(id);
  }
  takeRecords() {
    if ('recordsError' in this) throw this.recordsError;
    const records = this.records;
    this.records = [];
    return records;
  }
  disconnect() {
    this.calls.push(['disconnect']);
    this.notify = undefined;
    this.entries.clear();
    this.records = [];
    if ('disconnectError' in this) throw this.disconnectError;
  }
  emit(records) {
    if (records) this.records.push(...records);
    this.notify?.();
  }
}
const change = (id, lease, revision, closed = false) => ({
  subscriptionId: id,
  lease,
  revision,
  closed,
});
function caught(fn) {
  let thrown = false,
    value;
  try {
    fn();
  } catch (error) {
    thrown = true;
    value = error;
  }
  assert.equal(thrown, true, 'expected a thrown value');
  return value;
}
test('transport stays inert before watching and shares one native connection', () => {
  const native = new Native(),
    client = createStructuralObserverClient(native),
    seen = [];
  assert.deepEqual(native.calls, []);
  const one = client.watch(11, 'one', 'siblings', (x) => seen.push(x));
  const two = client.watch(12, 'two', 'children', (x) => seen.push(x));
  assert.equal(native.calls.filter((c) => c[0] === 'connect').length, 1);
  native.emit();
  assert.equal(seen.length, 2);
  one();
  one();
  assert.equal(native.calls.filter((c) => c[0] === 'unobserve').length, 1);
  assert.equal(native.calls.filter((c) => c[0] === 'disconnect').length, 0);
  two();
  assert.equal(native.entries.size, 0);
  assert.equal(native.calls.filter((c) => c[0] === 'disconnect').length, 1);
});
test('late IDs, lease ABA and duplicate revisions cannot notify the current owner', () => {
  const native = new Native(),
    client = createStructuralObserverClient(native),
    seen = [];
  const one = client.watch(11, 'old', 'siblings', (x) => seen.push(x));
  native.emit();
  one();
  const two = client.watch(11, 'new', 'siblings', (x) => seen.push(x));
  native.emit();
  seen.length = 0;
  native.emit([
    change(1, 'old', 99),
    change(2, 'old', 99),
    change(2, 'new', 1),
    change(2, 'new', 1),
  ]);
  assert.equal(seen.length, 0);
  native.emit([change(2, 'new', 2)]);
  assert.equal(seen.length, 1);
  two();
  client.dispose();
});
test('cleanup cannot release a later reentrant subscription', () => {
  const native = new Native(),
    client = createStructuralObserverClient(native);
  let later;
  const old = client.watch(11, 'old', 'siblings', () => {
    old();
    later = client.watch(12, 'new', 'children', () => {});
  });
  native.emit();
  old();
  assert.equal(native.entries.size, 1);
  later();
  assert.equal(native.entries.size, 0);
});
test('surface closure releases only its lease before notifying', () => {
  const native = new Native(),
    client = createStructuralObserverClient(native),
    seen = [];
  const one = client.watch(11, 'one', 'siblings', (x) => seen.push(x)),
    two = client.watch(12, 'two', 'siblings', (x) => seen.push(x));
  native.emit();
  seen.length = 0;
  native.emit([change(1, 'one', 2, true)]);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].closed, true);
  assert.equal(native.entries.has(1), false);
  assert.equal(native.entries.has(2), true);
  one();
  two();
});
test('throwing opaque callbacks do not prevent another observer notification', () => {
  const native = new Native(),
    client = createStructuralObserverClient(native);
  let second = 0;
  client.watch(11, 'one', 'siblings', () => {
    throw undefined;
  });
  client.watch(12, 'two', 'children', () => second++);
  const error = caught(() => native.emit());
  assert(error instanceof AggregateError);
  assert.deepEqual(error.errors, [undefined]);
  assert.equal(second, 1);
  client.dispose();
});
test('reentrant notifications drain after the current batch', () => {
  const native = new Native(),
    client = createStructuralObserverClient(native),
    seen = [];
  const end = client.watch(11, 'one', 'siblings', (x) => {
    seen.push(x.revision);
    if (x.revision === 1) native.emit([change(1, 'one', 2)]);
  });
  native.emit();
  assert.deepEqual(seen, [1, 2]);
  end();
});
test('observe failure closes only the newly empty connection', () => {
  const native = new Native(),
    client = createStructuralObserverClient(native);
  native.observeError = 0;
  assert.equal(
    caught(() => client.watch(11, 'one', 'siblings', () => {})),
    0,
  );
  assert.equal(native.calls.at(-1)[0], 'disconnect');
  delete native.observeError;
  const end = client.watch(11, 'one', 'siblings', () => {});
  native.observeError = false;
  assert.equal(
    caught(() => client.watch(12, 'two', 'children', () => {})),
    false,
  );
  assert.equal(native.entries.size, 1);
  end();
});
test('registration and cleanup preserve both opaque failures', () => {
  const native = new Native(),
    client = createStructuralObserverClient(native);
  native.observeError = false;
  native.disconnectError = null;
  const error = caught(() => client.watch(11, 'one', 'siblings', () => {}));
  assert(error instanceof AggregateError);
  assert.deepEqual(error.errors, [false, null]);
});
test('failed lease cleanup invalidates the entire uncertain native connection', () => {
  const native = new Native(),
    client = createStructuralObserverClient(native);
  const one = client.watch(11, 'one', 'siblings', () => {}),
    two = client.watch(12, 'two', 'children', () => {});
  native.unobserveError = false;
  assert.equal(caught(one), false);
  assert.equal(native.entries.size, 0);
  assert.throws(() => client.watch(13, 'three', 'siblings', () => {}), /disposed/);
  two();
  assert.equal(native.calls.filter((c) => c[0] === 'unobserve').length, 1);
});
test('lease cleanup and disconnect preserve both opaque failures', () => {
  const native = new Native(),
    client = createStructuralObserverClient(native);
  const end = client.watch(11, 'one', 'siblings', () => {});
  native.unobserveError = 0;
  native.disconnectError = undefined;
  const error = caught(end);
  assert(error instanceof AggregateError);
  assert.deepEqual(error.errors, [0, undefined]);
  end();
});
for (const malformed of [
  null,
  {},
  [change(1, 'one', NaN)],
  [change(1, '', 2)],
  [{ ...change(1, 'one', 2), closed: 1 }],
]) {
  test('malformed records close the native connection ' + JSON.stringify(malformed), () => {
    const native = new Native(),
      client = createStructuralObserverClient(native);
    client.watch(11, 'one', 'siblings', () => assert.fail('malformed batch never notifies'));
    native.records = malformed;
    const error = caught(() => native.emit());
    assert(error instanceof AggregateError);
    assert.match(String(error.errors[0]), /Malformed/);
    assert.equal(native.entries.size, 0);
    assert.throws(() => client.watch(12, 'two', 'children', () => {}), /disposed/);
  });
}
test('native read failure is retained with uncertain cleanup failure', () => {
  const native = new Native(),
    client = createStructuralObserverClient(native);
  client.watch(11, 'one', 'siblings', () => {});
  native.recordsError = false;
  native.disconnectError = 0;
  const error = caught(() => native.emit());
  assert(error instanceof AggregateError);
  assert.deepEqual(error.errors, [false, 0]);
});
for (const tag of [0, -1, 0.5, NaN, Infinity, 0x80000000]) {
  test('invalid root tag never connects ' + tag, () => {
    const native = new Native(),
      client = createStructuralObserverClient(native);
    assert.throws(() => client.watch(tag, 'one', 'siblings', () => {}), TypeError);
    assert.deepEqual(native.calls, []);
  });
}
for (const [lease, mode, listener] of [
  ['', 'siblings', () => {}],
  ['a'.repeat(257), 'siblings', () => {}],
  ['ok', 'layout', () => {}],
  ['ok', 'children', null],
]) {
  test('invalid lease, mode or callback stays inert ' + lease.length + '/' + mode, () => {
    const native = new Native(),
      client = createStructuralObserverClient(native);
    assert.throws(() => client.watch(11, lease, mode, listener), TypeError);
    assert.deepEqual(native.calls, []);
  });
}
test('invalid or duplicate native IDs fail closed', () => {
  for (const id of [0.5, 0, Infinity]) {
    const native = new Native(),
      client = createStructuralObserverClient(native);
    native.forcedId = id;
    assert.throws(() => client.watch(11, 'one', 'siblings', () => {}), /invalid/);
    assert.equal(native.entries.size, 0);
  }
  const native = new Native(),
    client = createStructuralObserverClient(native);
  client.watch(11, 'one', 'siblings', () => {});
  native.forcedId = 1;
  assert.throws(() => client.watch(12, 'two', 'children', () => {}), /duplicate/);
  assert.equal(native.entries.size, 0);
});
test('dispose invalidates pending notifications and is idempotent', () => {
  const native = new Native(),
    client = createStructuralObserverClient(native);
  let calls = 0;
  const end = client.watch(11, 'one', 'siblings', () => calls++),
    notify = native.notify;
  client.dispose();
  client.dispose();
  end();
  notify();
  assert.equal(calls, 0);
  assert.equal(native.calls.filter((c) => c[0] === 'disconnect').length, 1);
});
