// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setInterval, clearInterval } from 'node:timers';

const prefix = '[declaration compiler]';
const safeInteger = (value) =>
  /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;

/**
 * Read only numeric memory counters. Paths and arbitrary file contents stay private.
 * @param {(file: string, encoding: 'utf8') => string} [read]
 */
export function compilerMemorySnapshot(read = readFileSync) {
  const text = (file) => {
    try {
      return read(file, 'utf8');
    } catch {
      return '';
    }
  };
  const memory = text('/proc/meminfo');
  const kib = (key) =>
    safeInteger(memory.match(new RegExp('^' + key + ':\\s+(\\d+) kB$', 'm'))?.[1] ?? '');
  const snapshot = {
    memAvailableKiB: kib('MemAvailable'),
    swapFreeKiB: kib('SwapFree'),
    cgroupCurrentBytes: null,
    cgroupPeakBytes: null,
    cgroupMaxBytes: null,
    cgroupEvents: {},
  };
  // The compiler inherits this process's cgroup. Its peak/events may include
  // earlier checks or sibling processes; they are not compiler-only RSS values.
  const namespace = text('/proc/self/cgroup').match(/^0::(\/.*)$/m)?.[1];
  if (!namespace) return snapshot;
  const directory = resolve('/sys/fs/cgroup', '.' + namespace);
  if (directory !== '/sys/fs/cgroup' && !directory.startsWith('/sys/fs/cgroup/')) return snapshot;
  snapshot.cgroupCurrentBytes = safeInteger(text(directory + '/memory.current').trim());
  snapshot.cgroupPeakBytes = safeInteger(text(directory + '/memory.peak').trim());
  const maximum = text(directory + '/memory.max').trim();
  snapshot.cgroupMaxBytes = maximum === 'max' ? 'max' : safeInteger(maximum);
  const events = text(directory + '/memory.events');
  for (const key of ['high', 'max', 'oom', 'oom_kill', 'oom_group_kill']) {
    const value = events.match(new RegExp('^' + key + ' (\\d+)$', 'm'))?.[1];
    if (value !== undefined) snapshot.cgroupEvents[key] = safeInteger(value);
  }
  return snapshot;
}

/**
 * Scope diagnostics and Go's soft budget to declaration generation only.
 * @param {object} [options]
 * @param {string} [options.file]
 * @param {readonly string[]} [options.args]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @param {boolean} [options.diagnostics]
 * @param {(message: string) => void} [options.log]
 * @param {(file: string, encoding: 'utf8') => string} [options.read]
 * @param {boolean} [options.useTime]
 * @returns {Promise<void>}
 */
export async function runDeclarationCompiler({
  file = 'pnpm',
  args = ['exec', 'tsc', '-p', 'tsconfig.build.json'],
  env = process.env,
  diagnostics = env.CI === 'true' && process.platform === 'linux',
  log = console.error,
  read = readFileSync,
  useTime,
} = {}) {
  const compilerEnv = { ...env, GOMEMLIMIT: env.GOMEMLIMIT ?? '4GiB' };
  // Local builds retain the original synchronous behavior without monitors,
  // resource probes, timers or changes to the caller's environment.
  if (!diagnostics) {
    execFileSync(file, args, { stdio: 'inherit', env: compilerEnv });
    return;
  }
  const timed =
    useTime ?? spawnSync('/usr/bin/time', ['--version'], { stdio: 'ignore' }).status === 0;
  const started = Date.now();
  const snapshot = (phase, result = {}) =>
    log(
      prefix +
        ' ' +
        JSON.stringify({
          phase,
          timestamp: new Date().toISOString(),
          elapsedSeconds: (Date.now() - started) / 1000,
          ...compilerMemorySnapshot(read),
          ...result,
        }),
    );
  snapshot('start', {
    supervisor: timed ? 'gnu-time' : 'compiler',
    peakProcessRss: timed ? 'reported by GNU time' : 'unavailable',
  });
  // GNU time reports the maximum process RSS, not the simultaneous sum of a
  // process tree. It also reports a command killed by a signal independently
  // of the supervisor exit status below. No extra package is required.
  const child = spawn(
    timed ? '/usr/bin/time' : file,
    timed
      ? [
          '-f',
          prefix + ' resources peakProcessRssKiB=%M elapsedSeconds=%e exitStatus=%x',
          '--',
          file,
          ...args,
        ]
      : args,
    { stdio: 'inherit', env: compilerEnv },
  );
  let spawnError;
  child.once('error', (error) => {
    spawnError = error;
  });
  // Samples survive in the job log if the whole runner disappears before a
  // final callback. The timer exists only during a CI Linux compiler child.
  const monitor = setInterval(() => snapshot('sample'), 15000);
  monitor.unref();
  const result = await new Promise((resolve) =>
    child.once('close', (status, signal) => resolve({ status, signal })),
  );
  clearInterval(monitor);
  snapshot('finish', {
    supervisor: timed ? 'gnu-time' : 'compiler',
    ...result,
    errorCode: spawnError?.code ?? null,
  });
  if (spawnError || result.status !== 0 || result.signal) {
    throw Object.assign(
      spawnError ?? Error('Declaration compiler did not complete successfully'),
      result,
    );
  }
}
