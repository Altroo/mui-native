// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { compilerMemorySnapshot, runDeclarationCompiler } from './compiler-diagnostics.mjs';

const unavailable = () => {
  throw Error('Diagnostic data is unavailable');
};
const decode = (line) => JSON.parse(line.slice(line.indexOf('{')));
const compiler = (source, options) =>
  runDeclarationCompiler({ file: process.execPath, args: ['-e', source], ...options });

// These tiny child programs verify supervisor behavior, never compile packages.
test('default local path adds no memory probe, monitor or output and preserves the Go budget', async () => {
  const env = { ...process.env, CI: 'false' };
  delete env.GOMEMLIMIT;
  const lines = [],
    activeTimers = process.getActiveResourcesInfo().filter((name) => name === 'Timeout').length;
  await compiler('if (process.env.GOMEMLIMIT !== "4GiB") process.exit(4)', {
    env,
    log: (line) => lines.push(line),
    read: () => assert.fail('Local builds must not read Linux diagnostics'),
  });
  assert.equal(env.GOMEMLIMIT, undefined);
  assert.deepEqual(lines, []);
  assert.equal(
    process.getActiveResourcesInfo().filter((name) => name === 'Timeout').length,
    activeTimers,
  );
  await compiler('if (process.env.GOMEMLIMIT !== "128MiB") process.exit(4)', {
    env: { ...env, GOMEMLIMIT: '128MiB' },
  });
});

test('CI start and final receipts survive unavailable Linux counters without blocking success', async () => {
  const lines = [];
  await compiler('if (process.env.GOMEMLIMIT !== "128MiB") process.exit(4)', {
    env: { ...process.env, GOMEMLIMIT: '128MiB' },
    diagnostics: true,
    useTime: false,
    read: unavailable,
    log: (line) => lines.push(decode(line)),
  });
  assert.deepEqual(
    lines.map((line) => line.phase),
    ['start', 'finish'],
  );
  assert.equal(lines[0].peakProcessRss, 'unavailable');
  assert.equal(lines[1].supervisor, 'compiler');
  assert.equal(lines[1].status, 0);
  assert.equal(lines[1].signal, null);
  assert.equal(lines[1].errorCode, null);
  assert.equal(lines[1].cgroupCurrentBytes, null);
  assert(lines.every((line) => Number.isFinite(line.elapsedSeconds) && line.elapsedSeconds >= 0));
});

for (const [label, source, status, signal] of [
  ['nonzero exit', 'process.exit(7)', 7, null],
  ['signal termination', 'process.kill(process.pid, "SIGTERM")', null, 'SIGTERM'],
])
  test('CI records ' + label + ' and removes its monitor', async () => {
    const lines = [],
      activeTimers = process.getActiveResourcesInfo().filter((name) => name === 'Timeout').length;
    await assert.rejects(
      compiler(source, {
        diagnostics: true,
        useTime: false,
        read: unavailable,
        log: (line) => lines.push(decode(line)),
      }),
      (error) => error.status === status && error.signal === signal,
    );
    assert.equal(lines.at(-1).phase, 'finish');
    assert.equal(lines.at(-1).status, status);
    assert.equal(lines.at(-1).signal, signal);
    assert.equal(
      process.getActiveResourcesInfo().filter((name) => name === 'Timeout').length,
      activeTimers,
    );
  });

test('a compiler spawn error remains a failure with a final receipt', async () => {
  const lines = [];
  await assert.rejects(
    runDeclarationCompiler({
      file: '/does-not-exist/mui-native-compiler',
      diagnostics: true,
      useTime: false,
      read: unavailable,
      log: (line) => lines.push(decode(line)),
    }),
    (error) => error.code === 'ENOENT',
  );
  assert.equal(lines.at(-1).phase, 'finish');
  assert.equal(lines.at(-1).errorCode, 'ENOENT');
  assert.notEqual(lines.at(-1).status, 0);
});

test('Linux memory diagnostics expose only whitelisted numeric fields and distinguish shared cgroup peak', () => {
  const directory = '/sys/fs/cgroup/user.slice/example';
  const files = {
    '/proc/meminfo': 'MemAvailable:   4096 kB\nSwapFree:   512 kB\nPrivate: DO_NOT_LOG\n',
    '/proc/self/cgroup': '0::/user.slice/example\n',
    [directory + '/memory.current']: '2048\n',
    [directory + '/memory.peak']: '8192\n',
    [directory + '/memory.max']: 'max\n',
    [directory + '/memory.events']:
      'high 2\nmax 3\noom 1\noom_kill 1\noom_group_kill 0\nPrivate DO_NOT_LOG\n',
  };
  const snapshot = compilerMemorySnapshot((file) => files[file] ?? '');
  assert.deepEqual(snapshot, {
    memAvailableKiB: 4096,
    swapFreeKiB: 512,
    cgroupCurrentBytes: 2048,
    cgroupPeakBytes: 8192,
    cgroupMaxBytes: 'max',
    cgroupEvents: { high: 2, max: 3, oom: 1, oom_kill: 1, oom_group_kill: 0 },
  });
  assert(!JSON.stringify(snapshot).includes('DO_NOT_LOG'));
  assert(!JSON.stringify(snapshot).includes('user.slice'));
  files[directory + '/memory.max'] = '16384\n';
  assert.equal(compilerMemorySnapshot((file) => files[file] ?? '').cgroupMaxBytes, 16384);
});

test('missing, unsupported, malformed and unsafe diagnostic sources produce bounded unknown values', () => {
  const empty = {
    memAvailableKiB: null,
    swapFreeKiB: null,
    cgroupCurrentBytes: null,
    cgroupPeakBytes: null,
    cgroupMaxBytes: null,
    cgroupEvents: {},
  };
  assert.deepEqual(compilerMemorySnapshot(unavailable), empty);
  for (const namespace of ['5:memory:/legacy', '0::/../../private']) {
    const paths = [];
    assert.deepEqual(
      compilerMemorySnapshot((file) => {
        paths.push(file);
        return file === '/proc/self/cgroup' ? namespace : 'not numeric';
      }),
      empty,
    );
    assert(!paths.some((file) => !file.startsWith('/proc/')));
  }
  assert.deepEqual(
    compilerMemorySnapshot((file) =>
      file === '/proc/self/cgroup' ? '0::/\n' : '9007199254740993',
    ),
    empty,
  );
});

const gnuTime =
  process.platform === 'linux' &&
  spawnSync('/usr/bin/time', ['--version'], { stdio: 'ignore' }).status === 0;
test(
  'GNU time provides actual peak RSS and command-signal text while status stays supervisor-labelled',
  { skip: !gnuTime },
  () => {
    const helper = new URL('./compiler-diagnostics.mjs', import.meta.url).href;
    for (const source of ['process.exit(7)', 'process.kill(process.pid, "SIGTERM")']) {
      const script =
        'import { runDeclarationCompiler } from ' +
        JSON.stringify(helper) +
        '; await runDeclarationCompiler({ file: process.execPath, args: ["-e", ' +
        JSON.stringify(source) +
        '], diagnostics: true });';
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
        encoding: 'utf8',
      });
      assert.notEqual(result.status, 0);
      assert.match(
        result.stderr,
        /resources peakProcessRssKiB=\d+ elapsedSeconds=[0-9.]+ exitStatus=\d+/,
      );
      assert.match(result.stderr, /"phase":"finish".*"supervisor":"gnu-time"/);
      if (source.includes('SIGTERM'))
        assert.match(result.stderr, /Command terminated by signal 15/);
      else assert.match(result.stderr, /"status":7,"signal":null/);
    }
  },
);
