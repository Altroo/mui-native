// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
  parseProfileArgs,
  runTextProfile,
  startOwnedJob,
  writeReceiptData,
} from './text-profile.mjs';

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
/**
 * @param {import('node:test').TestContext} t
 * @param {object} [options]
 * @param {'android' | 'ios'} [options.platform]
 * @param {string | null} [options.initial]
 * @param {string} [options.size]
 */
async function fixture(t, { platform = 'android', initial = '1.0', size = '1.5' } = {}) {
  const outputDir = await mkdtemp(join(tmpdir(), 'mui-text-profile-'));
  t.after(() => rm(outputDir, { recursive: true, force: true }));
  const signals = new EventEmitter(),
    started = deferred();
  /** @typedef {{code: number | null, signal: NodeJS.Signals | null}} ChildExit */
  /** @type {{promise: Promise<ChildExit>, resolve: (result: ChildExit) => void}} */
  const finished = deferred();
  const events = [],
    reads = [],
    writes = [],
    forwarded = [];
  let value = initial,
    onRead,
    onWrite;
  const input = {
    platform,
    device: platform === 'android' ? 'emulator-5554' : '12345678-abcd-abcd-abcd-123456789abc',
    size,
    outputDir,
    command: ['test-runner', 'literal argument', '$(never executed)'],
  };
  const dependencies = {
    signals,
    leaseDirectory: join(outputDir, 'leases'),
    async exec(file, args) {
      events.push({ file, args: [...args] });
      assert.equal(signals.listenerCount('SIGINT'), 1);
      assert.equal(signals.listenerCount('SIGTERM'), 1);
      const read = platform === 'android' ? args[4] === 'get' : args.length === 4;
      if (read) {
        reads.push(value);
        await onRead?.(reads.length);
        return value === null ? 'null\n' : value + '\n';
      }
      const next = platform === 'android' ? (args[4] === 'delete' ? null : args[7]) : args[4];
      writes.push(next);
      await onWrite?.(next, writes.length);
      value = next;
      return '';
    },
    /**
     * @param {readonly string[]} argv
     * @returns {import('./text-profile.mjs').OwnedJob}
     */
    job(argv) {
      assert.equal(value, size, 'The child must start under the requested, verified profile');
      assert.deepEqual(argv, input.command);
      events.push('child-start');
      started.resolve();
      return {
        completed: finished.promise.then((result) => {
          events.push('child-closed');
          return { terminationConfirmed: true, ...result };
        }),
        signal(signal) {
          forwarded.push(signal);
          events.push('child-signal');
        },
      };
    },
  };
  return {
    input,
    dependencies,
    events,
    reads,
    writes,
    forwarded,
    started,
    /** @param {ChildExit} [result] */
    finish(result = { code: 0, signal: null }) {
      finished.resolve(result);
    },
    get value() {
      return value;
    },
    set value(next) {
      value = next;
    },
    set onRead(fn) {
      onRead = fn;
    },
    set onWrite(fn) {
      onWrite = fn;
    },
    receipt: async () => JSON.parse(await readFile(join(outputDir, 'text-profile.json'), 'utf8')),
    assertListenersRemoved() {
      assert.equal(signals.listenerCount('SIGINT'), 0);
      assert.equal(signals.listenerCount('SIGTERM'), 0);
    },
  };
}

test('CLI keeps command argv literal and requires explicit known profile options', () => {
  const prefix = [
    '--platform',
    'android',
    '--device',
    'emulator-5554',
    '--size',
    '1.25',
    '--outputDir',
    '/tmp/profiles',
  ];
  assert.deepEqual(parseProfileArgs([...prefix, '--', 'node', 'a b', '--platform=other']).command, [
    'node',
    'a b',
    '--platform=other',
  ]);
  for (const args of [
    prefix,
    [...prefix, '--'],
    [...prefix, '--extra', 'x', '--', 'test'],
    [...prefix.slice(2), '--', 'test'],
    [...prefix.slice(0, 6), '--', 'test'],
  ])
    assert.throws(() => parseProfileArgs(args));
  for (const size of ['0', '-1', 'NaN', 'Infinity', '0x10', 'wrong'])
    assert.throws(() =>
      parseProfileArgs([...prefix.slice(0, 5), size, ...prefix.slice(6), '--', 'test']),
    );
  assert.throws(
    () =>
      parseProfileArgs([
        '--platform',
        'ios',
        '--device',
        '12345678-abcd-abcd-abcd-123456789abc',
        '--size',
        'unknown',
        '--outputDir',
        '/tmp/result',
        '--',
        'test',
      ]),
    /Unsupported iOS/,
  );
  assert.equal(
    parseProfileArgs([
      '--platform',
      'ios',
      '--device',
      '12345678-abcd-abcd-abcd-123456789abc',
      '--size',
      'accessibility-extra-extra-extra-large',
      '--outputDir',
      '/tmp/result',
      '--',
      'test',
    ]).size,
    'accessibility-extra-extra-extra-large',
  );
});

test('Android preserves the profile for the entire child lifetime and records verified restoration', async (t) => {
  const f = await fixture(t);
  const running = runTextProfile(f.input, f.dependencies);
  await f.started.promise;
  assert.equal(f.value, '1.5');
  assert.deepEqual(f.writes, ['1.5']);
  const active = await f.receipt();
  assert.equal(active.original, '1.0');
  assert.equal(active.applied, '1.5');
  f.finish();
  const receipt = await running;
  assert.equal(receipt.status, 'passed');
  assert.equal(receipt.exitCode, 0);
  assert.equal(f.value, '1.0');
  assert.equal(receipt.restoration.status, 'restored');
  assert.equal(receipt.restoration.after, '1.0');
  const restored = f.events.findIndex((event) => event?.args?.[7] === '1.0');
  assert(f.events.indexOf('child-closed') < restored);
  assert.deepEqual(f.events.find((event) => event?.args)?.args, [
    '-s',
    'emulator-5554',
    'shell',
    'settings',
    'get',
    'system',
    'font_scale',
  ]);
  assert.deepEqual(await f.receipt(), receipt);
  f.assertListenersRemoved();
});

test('iOS uses only explicit simctl content_size reads and allowed size writes', async (t) => {
  const f = await fixture(t, {
    platform: 'ios',
    initial: 'large',
    size: 'accessibility-extra-large',
  });
  const running = runTextProfile(f.input, f.dependencies);
  await f.started.promise;
  f.finish();
  const receipt = await running;
  assert.equal(receipt.original, 'large');
  assert.equal(receipt.restoration.after, 'large');
  assert.deepEqual(f.writes, ['accessibility-extra-large', 'large']);
  for (const event of f.events.filter((event) => event?.args)) {
    assert.equal(event.file, 'xcrun');
    assert.deepEqual(event.args.slice(0, 4), [
      'simctl',
      'ui',
      '12345678-abcd-abcd-abcd-123456789abc',
      'content_size',
    ]);
    assert(event.args.length === 4 || event.args.length === 5);
  }
});

test('restoration uses the recorded Android value rather than assuming a baseline', async (t) => {
  const f = await fixture(t, { initial: '1.15', size: '1.8' });
  const running = runTextProfile(f.input, f.dependencies);
  await f.started.promise;
  f.finish();
  const receipt = await running;
  assert.equal(receipt.original, '1.15');
  assert.equal(receipt.restoration.after, '1.15');
  assert.deepEqual(f.writes, ['1.8', '1.15']);
});

test('an absent Android setting is restored by deletion and verified as null', async (t) => {
  const f = await fixture(t, { initial: null });
  const running = runTextProfile(f.input, f.dependencies);
  await f.started.promise;
  f.finish();
  const receipt = await running;
  assert.equal(receipt.original, null);
  assert.equal(receipt.restoration.after, null);
  assert.equal(f.value, null);
  assert.deepEqual(f.events.find((event) => event?.args?.[4] === 'delete')?.args, [
    '-s',
    'emulator-5554',
    'shell',
    'settings',
    'delete',
    'system',
    'font_scale',
  ]);
});

test('a failing child preserves its exit code and restores the original profile', async (t) => {
  const f = await fixture(t);
  const running = runTextProfile(f.input, f.dependencies);
  await f.started.promise;
  f.finish({ code: 7, signal: null });
  const receipt = await running;
  assert.equal(receipt.status, 'failed');
  assert.equal(receipt.exitCode, 7);
  assert.equal(receipt.child.code, 7);
  assert.equal(receipt.restoration.status, 'restored');
  assert.equal(f.value, '1.0');
});

/** @type {NodeJS.Signals[]} */
const terminatingSignals = ['SIGINT', 'SIGTERM'];
for (const first of terminatingSignals)
  test(`${first} and repeated signals await child cleanup and cannot interrupt restoration`, async (t) => {
    const f = await fixture(t);
    const restoring = deferred(),
      restoreAllowed = deferred();
    f.onWrite = async (_value, count) => {
      if (count === 2) {
        restoring.resolve();
        await restoreAllowed.promise;
      }
    };
    const running = runTextProfile(f.input, f.dependencies);
    await f.started.promise;
    f.dependencies.signals.emit(first);
    f.dependencies.signals.emit(first === 'SIGINT' ? 'SIGTERM' : 'SIGINT');
    assert.deepEqual(f.forwarded, [first]);
    assert.deepEqual(f.writes, ['1.5']);
    assert.equal(f.value, '1.5');
    f.finish({ code: null, signal: first });
    await restoring.promise;
    f.dependencies.signals.emit('SIGINT');
    f.dependencies.signals.emit('SIGTERM');
    assert.deepEqual(f.forwarded, [first]);
    assert.equal(f.value, '1.5');
    restoreAllowed.resolve();
    const receipt = await running;
    assert.equal(receipt.status, 'cancelled');
    assert.equal(receipt.exitCode, first === 'SIGINT' ? 130 : 143);
    assert.equal(receipt.restoration.status, 'restored');
    assert.deepEqual(f.writes, ['1.5', '1.0']);
    assert(
      f.events.indexOf('child-closed') < f.events.findIndex((event) => event?.args?.[7] === '1.0'),
    );
    f.assertListenersRemoved();
  });

test('cancellation during apply waits for that command to settle and never starts a test', async (t) => {
  const f = await fixture(t),
    applying = deferred(),
    applyAllowed = deferred();
  f.onWrite = async (_value, count) => {
    if (count === 1) {
      applying.resolve();
      await applyAllowed.promise;
    }
  };
  const running = runTextProfile(f.input, f.dependencies);
  await applying.promise;
  f.dependencies.signals.emit('SIGTERM');
  f.dependencies.signals.emit('SIGINT');
  assert.deepEqual(f.writes, ['1.5']);
  assert.equal(f.value, '1.0');
  applyAllowed.resolve();
  const receipt = await running;
  assert.equal(receipt.exitCode, 143);
  assert(!f.events.includes('child-start'));
  assert.equal(f.value, '1.0');
  assert.equal(receipt.restoration.status, 'restored');
});

test('signal handlers exist at the first profile read and early cancellation does not mutate', async (t) => {
  const f = await fixture(t);
  f.onRead = async (count) => {
    if (count === 1) f.dependencies.signals.emit('SIGINT');
  };
  const receipt = await runTextProfile(f.input, f.dependencies);
  assert.equal(receipt.status, 'cancelled');
  assert.deepEqual(f.writes, []);
  assert(!f.events.includes('child-start'));
  f.assertListenersRemoved();
});

test('a concurrent setting change during the test is preserved and reported as a conflict', async (t) => {
  const f = await fixture(t);
  const running = runTextProfile(f.input, f.dependencies);
  await f.started.promise;
  f.value = '1.8';
  f.finish();
  const receipt = await running;
  assert.equal(receipt.status, 'failed');
  assert.equal(receipt.exitCode, 1);
  assert.equal(receipt.restoration.status, 'conflict');
  assert.equal(receipt.restoration.before, '1.8');
  assert.equal(f.value, '1.8');
  assert.deepEqual(f.writes, ['1.5']);
});

test('a concurrent change before apply is not overwritten', async (t) => {
  const f = await fixture(t);
  f.onRead = async (count) => {
    if (count === 2) f.value = '1.8';
  };
  const receipt = await runTextProfile(f.input, f.dependencies);
  assert.equal(receipt.status, 'failed');
  assert.match(receipt.errors[0].message, /changed externally before apply/);
  assert.deepEqual(f.writes, []);
  assert.equal(f.value, '1.8');
  assert(!f.events.includes('child-start'));
});

test('an already requested profile requires no write and still detects external changes', async (t) => {
  const f = await fixture(t, { size: '1.00' });
  f.dependencies.job = () => ({
    completed: Promise.resolve({ code: 0, signal: null, terminationConfirmed: true }),
    signal() {},
  });
  const receipt = await runTextProfile(f.input, f.dependencies);
  assert.equal(receipt.status, 'passed');
  assert.deepEqual(f.writes, []);
  assert.equal(receipt.restoration.after, '1.0');
  const other = await fixture(t, { size: '1.0' });
  const running = runTextProfile(other.input, other.dependencies);
  await other.started.promise;
  other.value = '1.7';
  other.finish();
  const changed = await running;
  assert.equal(changed.restoration.status, 'conflict');
  assert.equal(other.value, '1.7');
  assert.deepEqual(other.writes, []);
});

test('unverified apply never starts a child and does not overwrite an unexpected new value', async (t) => {
  const f = await fixture(t);
  f.onRead = async (count) => {
    if (count === 3) f.value = '1.9';
  };
  const receipt = await runTextProfile(f.input, f.dependencies);
  assert.equal(receipt.status, 'failed');
  assert.equal(receipt.restoration.status, 'conflict');
  assert(!f.events.includes('child-start'));
  assert.equal(f.value, '1.9');
});

test('failed apply that changed the setting still restores it without starting the child', async (t) => {
  const f = await fixture(t);
  f.onWrite = async (value, count) => {
    if (count === 1) {
      f.value = value;
      throw Error('adb connection ended after write');
    }
  };
  const receipt = await runTextProfile(f.input, f.dependencies);
  assert.equal(receipt.status, 'failed');
  assert.equal(receipt.restoration.status, 'restored');
  assert.equal(f.value, '1.0');
  assert(!f.events.includes('child-start'));
});

test('restore command failure still verifies the observed state and retains child failure evidence', async (t) => {
  const f = await fixture(t);
  f.onWrite = async (_value, count) => {
    if (count === 2) throw Error('restore transport failed');
  };
  const running = runTextProfile(f.input, f.dependencies);
  await f.started.promise;
  f.finish({ code: 9, signal: null });
  const receipt = await running;
  assert.equal(receipt.status, 'failed');
  assert.equal(receipt.exitCode, 1);
  assert.equal(receipt.child.code, 9);
  assert.equal(receipt.original, '1.0');
  assert.equal(receipt.restoration.status, 'failed');
  assert.equal(receipt.restoration.after, '1.5');
  assert(receipt.errors.some((error) => error.message === 'restore transport failed'));
  assert(receipt.errors.some((error) => /did not verify after restoration/.test(error.message)));
  assert.deepEqual(await f.receipt(), receipt);
});

test('a restore command that reports failure after applying is still verified and reported honestly', async (t) => {
  const f = await fixture(t);
  f.onWrite = async (value, count) => {
    if (count === 2) {
      f.value = value;
      throw Error('late transport failure');
    }
  };
  const running = runTextProfile(f.input, f.dependencies);
  await f.started.promise;
  f.finish();
  const receipt = await running;
  assert.equal(receipt.restoration.status, 'restored');
  assert.equal(receipt.restoration.after, '1.0');
  assert.equal(receipt.status, 'failed');
  assert(receipt.errors.some((error) => error.stage === 'restore-command'));
});

test('unsupported iOS read values fail before any profile write or child launch', async (t) => {
  const f = await fixture(t, {
    platform: 'ios',
    initial: 'unrecognized-system-value',
    size: 'large',
  });
  const receipt = await runTextProfile(f.input, f.dependencies);
  assert.equal(receipt.status, 'failed');
  assert.match(receipt.errors[0].message, /Unsupported iOS/);
  assert.deepEqual(f.writes, []);
  assert(!f.events.includes('child-start'));
});

test('a closed failed spawn still restores the profile', async (t) => {
  const f = await fixture(t);
  f.dependencies.job = () => ({
    completed: Promise.resolve({
      code: null,
      signal: null,
      error: 'test-runner ENOENT',
      terminationConfirmed: true,
    }),
    signal() {},
  });
  const receipt = await runTextProfile(f.input, f.dependencies);
  assert.equal(receipt.status, 'failed');
  assert.equal(receipt.child.error, 'test-runner ENOENT');
  assert.equal(receipt.restoration.status, 'restored');
  assert.equal(f.value, '1.0');
});

test('existing evidence is preserved and receipt collisions prevent all native commands', async (t) => {
  const f = await fixture(t);
  const path = join(f.input.outputDir, 'text-profile.json');
  await writeFile(path, 'previous receipt');
  await writeFile(join(f.input.outputDir, 'stdout.log'), 'previous stdout');
  await assert.rejects(runTextProfile(f.input, f.dependencies), { code: 'EEXIST' });
  assert.equal(await readFile(path, 'utf8'), 'previous receipt');
  assert.equal(await readFile(join(f.input.outputDir, 'stdout.log'), 'utf8'), 'previous stdout');
  assert.deepEqual(f.events, []);
  f.assertListenersRemoved();
});

test('receipts cannot be written into the checkout', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    runTextProfile(
      { ...f.input, outputDir: resolve('forbidden-native-profile-evidence') },
      f.dependencies,
    ),
    /outside the checkout/,
  );
  assert.deepEqual(f.events, []);
  f.assertListenersRemoved();
});

test('iOS rejects moving aliases and canonicalizes concrete UUID case', () => {
  const args = (device) => [
    '--platform',
    'ios',
    '--device',
    device,
    '--size',
    'large',
    '--outputDir',
    '/tmp/profile',
    '--',
    'test',
  ];
  for (const alias of ['booted', 'all', 'iPhone-16'])
    assert.throws(() => parseProfileArgs(args(alias)), /concrete simulator UUID/);
  assert.equal(
    parseProfileArgs(args('12345678-ABCD-ABCD-ABCD-123456789ABC')).device,
    '12345678-abcd-abcd-abcd-123456789abc',
  );
});

for (const platform of ['android', 'ios'])
  test(`${platform} same-device lease excludes a competing output before its first OS read`, async (t) => {
    const first = await fixture(
      t,
      platform === 'ios' ? { platform, initial: 'large', size: 'extra-large' } : {},
    );
    const running = runTextProfile(first.input, first.dependencies);
    await first.started.promise;
    const second = await fixture(
      t,
      platform === 'ios'
        ? { platform, initial: 'large', size: 'accessibility-large' }
        : { size: '2' },
    );
    second.dependencies.leaseDirectory = first.dependencies.leaseDirectory;
    if (platform === 'ios') second.input.device = second.input.device.toUpperCase();
    second.dependencies.job = () => ({
      completed: Promise.resolve({ code: 0, signal: null, terminationConfirmed: true }),
      signal() {},
    });
    const blocked = await runTextProfile(second.input, second.dependencies);
    assert.equal(blocked.status, 'failed');
    assert.match(blocked.errors[0].message, /lease already exists/);
    assert.deepEqual(second.events, []);
    assert.equal(first.value, first.input.size);
    first.finish();
    const done = await running;
    assert.equal(done.lease.status, 'released');
    await assert.rejects(readFile(done.lease.path), { code: 'ENOENT' });
    const third = await fixture(
      t,
      platform === 'ios' ? { platform, initial: 'large', size: 'extra-large' } : {},
    );
    third.dependencies.leaseDirectory = first.dependencies.leaseDirectory;
    third.dependencies.job = () => ({
      completed: Promise.resolve({ code: 0, signal: null, terminationConfirmed: true }),
      signal() {},
    });
    const retried = await runTextProfile(third.input, third.dependencies);
    assert.equal(retried.status, 'passed');
  });

test('unconfirmed restoration keeps the per-device lease and recorded recovery evidence', async (t) => {
  const f = await fixture(t);
  f.onWrite = async (_value, count) => {
    if (count === 2) throw Error('restore failed');
  };
  const running = runTextProfile(f.input, f.dependencies);
  await f.started.promise;
  f.finish();
  const receipt = await running;
  assert.equal(receipt.lease.status, 'retained');
  const recovery = JSON.parse(await readFile(receipt.lease.path, 'utf8'));
  assert.equal(recovery.original, '1.0');
  assert.equal(recovery.requested, '1.5');
  assert.equal(recovery.receiptPath, receipt.receiptPath);
  assert.equal(recovery.status, 'recovery-required');
  assert.equal(recovery.restoration.status, 'failed');
  const retry = await fixture(t);
  retry.dependencies.leaseDirectory = f.dependencies.leaseDirectory;
  const blocked = await runTextProfile(retry.input, retry.dependencies);
  assert.equal(blocked.status, 'failed');
  assert.deepEqual(retry.events, []);
});

test('owned group signaling waits for descendants after leader close before restoring or releasing the lease', async (t) => {
  const f = await fixture(t),
    child = new EventEmitter(),
    checked = deferred(),
    drained = deferred();
  child.pid = 4242;
  const calls = [];
  let alive = true;
  f.dependencies.job = (argv) => {
    const job = startOwnedJob(argv, {
      spawnChild(file, args, options) {
        assert.equal(file, f.input.command[0]);
        assert.deepEqual(args, f.input.command.slice(1));
        assert.deepEqual(options, { stdio: 'inherit', detached: true });
        f.started.resolve();
        return child;
      },
      signalProcess(pid, signal) {
        assert.equal(pid, -4242, 'Only the explicitly owned process group may be probed/signaled');
        calls.push(signal);
        if (signal === 0) {
          checked.resolve();
          if (!alive) throw Object.assign(Error('group gone'), { code: 'ESRCH' });
        }
      },
      wait: () => drained.promise,
    });
    return job;
  };
  const running = runTextProfile(f.input, f.dependencies);
  await f.started.promise;
  child.emit('close', 0, null);
  await checked.promise;
  assert.equal(f.value, '1.5');
  assert.deepEqual(f.writes, ['1.5']);
  const current = await f.receipt();
  assert.equal(current.lease.status, 'held');
  assert.equal(JSON.parse(await readFile(current.lease.path, 'utf8')).status, 'held');
  f.dependencies.signals.emit('SIGTERM');
  f.dependencies.signals.emit('SIGINT');
  assert.deepEqual(
    calls.filter((signal) => signal !== 0),
    ['SIGTERM'],
  );
  assert.equal(f.value, '1.5');
  alive = false;
  drained.resolve();
  const receipt = await running;
  assert.equal(receipt.child.terminationConfirmed, true);
  assert.equal(receipt.child.processGroup, 4242);
  assert.equal(receipt.restoration.status, 'restored');
  assert.equal(receipt.lease.status, 'released');
  assert.equal(receipt.exitCode, 143);
});

test('inability to confirm group termination blocks restore and retains the recovery lease', async (t) => {
  const f = await fixture(t),
    child = new EventEmitter();
  child.pid = 4242;
  f.dependencies.job = (argv) => {
    const job = startOwnedJob(argv, {
      spawnChild: () => child,
      signalProcess() {
        throw Object.assign(Error('group probe denied'), { code: 'EPERM' });
      },
      wait() {
        assert.fail('A failed group probe must not silently continue as confirmed');
      },
    });
    f.started.resolve();
    return job;
  };
  const running = runTextProfile(f.input, f.dependencies);
  await f.started.promise;
  child.emit('close', 0, null);
  const receipt = await running;
  assert.equal(receipt.status, 'failed');
  assert.equal(receipt.child.terminationConfirmed, false);
  assert.equal(receipt.restoration.status, 'blocked');
  assert.equal(receipt.lease.status, 'retained');
  assert.deepEqual(f.writes, ['1.5']);
  assert.equal(f.value, '1.5');
});

test('a failed spawn without an owned group confirms that no descendant lifetime exists', async () => {
  const child = new EventEmitter();
  const job = startOwnedJob(['missing'], {
    spawnChild: () => child,
    signalProcess() {
      assert.fail('No group was spawned');
    },
  });
  child.emit('error', Error('ENOENT'));
  child.emit('close', -2, null);
  const result = await job.completed;
  assert.equal(result.terminationConfirmed, true);
  assert.equal(result.error, 'ENOENT');
});

test('short receipt writes finish all original bytes before truncate, sync and mutation permission', async () => {
  const original = { original: null, requested: '1.5', phase: 'original-recorded' };
  const target = Buffer.alloc(1024),
    calls = [];
  let length;
  await writeReceiptData(
    {
      async write(data, offset, remaining, position) {
        const count = Math.min(3, remaining);
        data.copy(target, position, offset, offset + count);
        calls.push('write');
        return { bytesWritten: count };
      },
      async truncate(size) {
        length = size;
        calls.push('truncate');
      },
      async sync() {
        assert.deepEqual(JSON.parse(target.subarray(0, length).toString()), original);
        calls.push('sync');
      },
    },
    original,
  );
  assert(calls.filter((call) => call === 'write').length > 1);
  assert.deepEqual(calls.slice(-2), ['truncate', 'sync']);
});

test('a stalled receipt write fails without claiming a durable original record', async () => {
  await assert.rejects(
    writeReceiptData(
      {
        async write() {
          return { bytesWritten: 0 };
        },
        async truncate() {
          assert.fail('Incomplete receipt cannot be truncated as complete');
        },
        async sync() {
          assert.fail('Incomplete receipt cannot be synced as complete');
        },
      },
      { original: '1.0' },
    ),
    /did not make valid progress/,
  );
});
