// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { execFile, spawn } from 'node:child_process';
import { mkdir, open, realpath, stat, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs, promisify } from 'node:util';

const checkout = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const execFileAsync = promisify(execFile);
export const iosTextSizes = Object.freeze([
  'extra-small',
  'small',
  'medium',
  'large',
  'extra-large',
  'extra-extra-large',
  'extra-extra-extra-large',
  'accessibility-medium',
  'accessibility-large',
  'accessibility-extra-large',
  'accessibility-extra-extra-large',
  'accessibility-extra-extra-extra-large',
]);
const usage =
  'Use --platform android|ios --device ID --size VALUE --outputDir PATH -- COMMAND ARG...';

function optionsFor(options) {
  const { platform, size, outputDir, command } = options;
  let { device } = options;
  if (!['android', 'ios'].includes(platform)) throw Error(usage);
  if (typeof device !== 'string' || !device || device.trim() !== device || /^-|[\s\0]/.test(device))
    throw Error('An explicit device identifier is required');
  if (platform === 'ios') {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(device))
      throw Error('iOS requires a concrete simulator UUID; moving device aliases are unsupported');
    device = device.toLowerCase();
  }
  if (typeof size !== 'string' || !size || size.trim() !== size)
    throw Error('A text size is required');
  if (platform === 'ios' && !iosTextSizes.includes(size))
    throw Error('Unsupported iOS content size: ' + size);
  if (
    platform === 'android' &&
    (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(size) ||
      !Number.isFinite(Number(size)) ||
      Number(size) <= 0)
  )
    throw Error('Android font_scale must be a finite positive number');
  if (typeof outputDir !== 'string' || !outputDir || outputDir.includes('\0'))
    throw Error('An explicit outputDir is required');
  if (
    !Array.isArray(command) ||
    !command.length ||
    !command[0] ||
    command.some((arg) => typeof arg !== 'string' || arg.includes('\0'))
  )
    throw Error('A test command and its argv are required after --');
  return { platform, device, size, outputDir: resolve(outputDir), command: [...command] };
}

export function parseProfileArgs(argv) {
  const separator = argv.indexOf('--');
  if (separator < 0) throw Error(usage);
  const { values } = parseArgs({
    args: argv.slice(0, separator),
    strict: true,
    allowPositionals: false,
    options: Object.fromEntries(
      ['platform', 'device', 'size', 'outputDir'].map((key) => [key, { type: 'string' }]),
    ),
  });
  return optionsFor({ ...values, command: argv.slice(separator + 1) });
}

function inside(path, parent) {
  const part = relative(parent, path);
  return part === '' || (!part.startsWith('..' + sep) && part !== '..' && !isAbsolute(part));
}
/** Complete a durable JSON write before permitting any profile mutation. */
export async function writeReceiptData(file, receipt) {
  const data = Buffer.from(JSON.stringify(receipt, null, 2) + '\n');
  let offset = 0;
  while (offset < data.length) {
    const { bytesWritten } = await file.write(data, offset, data.length - offset, offset);
    if (!Number.isInteger(bytesWritten) || bytesWritten <= 0 || bytesWritten > data.length - offset)
      throw Error('JSON receipt write did not make valid progress');
    offset += bytesWritten;
  }
  await file.truncate(data.length);
  await file.sync();
}

async function acquireDeviceLease(options, directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const key = createHash('sha256')
    .update(options.platform + '\0' + options.device)
    .digest('hex');
  const path = resolve(directory, options.platform + '-' + key + '.json');
  let file;
  try {
    file = await open(path, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST')
      throw Error(
        'Device text-profile lease already exists; inspect recovery evidence before retrying: ' +
          path,
        { cause: error },
      );
    throw error;
  }
  const identity = await file.stat();
  const metadata = {
    schemaVersion: 1,
    token: randomUUID(),
    pid: process.pid,
    platform: options.platform,
    device: options.device,
    requested: options.size,
    receiptPath: resolve(options.outputDir, 'text-profile.json'),
    status: 'held',
  };
  const update = async (next) => {
    Object.assign(metadata, next);
    await writeReceiptData(file, metadata);
  };
  const release = async () => {
    const current = await stat(path);
    if (current.dev !== identity.dev || current.ino !== identity.ino)
      throw Error('Device lease identity changed externally; replacement lease was preserved');
    await unlink(path);
  };
  try {
    await update({});
  } catch (error) {
    try {
      await release();
    } finally {
      await file.close();
    }
    throw error;
  }
  return { path, update, release, close: () => file.close() };
}

async function receiptFile(outputDir) {
  const root = await realpath(checkout);
  if (inside(outputDir, checkout))
    throw Error('Text-profile receipts must be outside the checkout');
  // Resolve existing ancestors before mkdir so a symlink cannot create evidence in Git.
  let ancestor = outputDir;
  for (;;) {
    try {
      const destination = resolve(await realpath(ancestor), relative(ancestor, outputDir));
      if (inside(destination, root))
        throw Error('Text-profile receipts must be outside the checkout');
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      ancestor = dirname(ancestor);
    }
  }
  await mkdir(outputDir, { recursive: true });
  if (inside(await realpath(outputDir), root))
    throw Error('Text-profile receipts must be outside the checkout');
  const path = resolve(outputDir, 'text-profile.json');
  const file = await open(path, 'wx');
  return {
    path,
    write: (receipt) => writeReceiptData(file, receipt),
    close: () => file.close(),
  };
}

async function execute(file, args) {
  const { stdout } = await execFileAsync(file, args, {
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  });
  return stdout;
}

// A private POSIX session owns this group. Descendants must drain before the
// profile can be restored, even when the direct child has already closed.
export function startOwnedJob(
  argv,
  { spawnChild = spawn, signalProcess = process.kill.bind(process), wait = () => delay(100) } = {},
) {
  const child = spawnChild(argv[0], argv.slice(1), { stdio: 'inherit', detached: true });
  let failure;
  const closed = new Promise((done) => {
    child.once('error', (error) => {
      failure = error;
    });
    child.once('close', (code, signal) => done({ code, signal }));
  });
  const group = Number.isInteger(child.pid) && child.pid > 0 ? child.pid : undefined;
  const completed = closed.then(async (result) => {
    if (failure) result.error = failure.message;
    if (!group) return { ...result, terminationConfirmed: true };
    for (;;) {
      try {
        signalProcess(-group, 0);
      } catch (error) {
        if (error.code === 'ESRCH')
          return { ...result, processGroup: group, terminationConfirmed: true };
        return {
          ...result,
          processGroup: group,
          terminationConfirmed: false,
          error: 'Could not confirm owned process-group termination: ' + error.message,
        };
      }
      await wait();
    }
  });
  return {
    completed,
    signal(signal) {
      if (!group) return;
      try {
        signalProcess(-group, signal);
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    },
  };
}

function profileAdapter({ platform, device }, exec) {
  const file = platform === 'android' ? 'adb' : 'xcrun';
  const prefix =
    platform === 'android'
      ? ['-s', device, 'shell', 'settings']
      : ['simctl', 'ui', device, 'content_size'];
  return {
    async read() {
      const raw = String(
        await exec(
          file,
          platform === 'android' ? [...prefix, 'get', 'system', 'font_scale'] : prefix,
        ),
      ).trim();
      if (platform === 'android' && raw === 'null') return null;
      optionsFor({ platform, device, size: raw, outputDir: '/', command: ['read'] });
      return raw;
    },
    write(value) {
      return exec(
        file,
        platform === 'android'
          ? [
              ...prefix,
              value === null ? 'delete' : 'put',
              'system',
              'font_scale',
              ...(value === null ? [] : [value]),
            ]
          : [...prefix, value],
      );
    },
    same(a, b) {
      return a === null || b === null
        ? a === b
        : platform === 'android'
          ? Number(a) === Number(b)
          : a === b;
    },
  };
}

/** Run a child under a verified OS profile. No font/line-height author units are changed. */
export async function runTextProfile(
  input,
  {
    exec = execute,
    job = startOwnedJob,
    signals = process,
    now = () => new Date().toISOString(),
    leaseDirectory = resolve(homedir(), '.cache/mui-native-text-profiles/leases'),
  } = {},
) {
  const options = optionsFor(input);
  if (job === startOwnedJob && process.platform === 'win32')
    throw Error('Owned process-group termination requires a POSIX host');
  const profile = profileAdapter(options, exec);
  const receipt = {
    schemaVersion: 1,
    ...options,
    startedAt: now(),
    status: 'running',
    phase: 'starting',
    errors: [],
    restoration: { status: 'not-needed' },
  };
  let output,
    lease,
    activeJob,
    original,
    attempted = false,
    confirmed = false,
    childTerminationConfirmed = true,
    cancellation;
  const errorAt = (stage, error) =>
    receipt.errors.push({ stage, message: error instanceof Error ? error.message : String(error) });
  const onSignal = (signal) => {
    if (cancellation) return;
    cancellation = { signal, forwarded: false };
    receipt.cancellation = cancellation;
    if (activeJob) {
      try {
        activeJob.signal(signal);
        cancellation.forwarded = true;
      } catch (error) {
        errorAt('forward-signal', error);
      }
    }
  };
  const onInt = () => onSignal('SIGINT'),
    onTerm = () => onSignal('SIGTERM');
  signals.on('SIGINT', onInt);
  signals.on('SIGTERM', onTerm);
  const save = async (phase) => {
    receipt.phase = phase;
    await output.write(receipt);
  };
  try {
    output = await receiptFile(options.outputDir);
    receipt.receiptPath = output.path;
    await save('acquiring-lease');
    if (cancellation) return receipt;
    lease = await acquireDeviceLease(options, leaseDirectory);
    receipt.lease = { path: lease.path, status: 'held' };
    await save('reading-original');
    if (cancellation) return receipt;
    original = await profile.read();
    receipt.original = original;
    await lease.update({ original });
    await save('original-recorded');
    if (cancellation) return receipt;
    const before = await profile.read();
    receipt.beforeApply = before;
    if (!profile.same(before, original))
      throw Error('Profile changed externally before apply; no setting was overwritten');
    if (cancellation) return receipt;
    // OS settings offer no compare-and-swap. Recheck directly before each owned
    // write, without an intervening receipt write, and report observed conflicts.
    if (!profile.same(original, options.size)) {
      receipt.phase = 'applying';
      attempted = true;
      await profile.write(options.size);
    }
    if (cancellation) return receipt;
    receipt.applied = await profile.read();
    if (!profile.same(receipt.applied, options.size))
      throw Error('Requested text profile did not verify');
    confirmed = true;
    await save('profile-verified');
    if (cancellation) return receipt;
    activeJob = job(options.command);
    childTerminationConfirmed = false;
    receipt.child = { startedAt: now() };
    await save('running-child');
    const result = await activeJob.completed;
    childTerminationConfirmed = result.terminationConfirmed === true;
    activeJob = undefined;
    receipt.child = { ...receipt.child, ...result, finishedAt: now() };
    if (!childTerminationConfirmed)
      errorAt(
        'child-termination',
        Error('Owned child termination was not confirmed; profile restoration is blocked'),
      );
    if (!cancellation && (result.code !== 0 || result.signal || result.error))
      errorAt(
        'child',
        Error(result.error ?? `Test child exited with ${result.signal ?? result.code}`),
      );
  } catch (error) {
    if (!output) throw error;
    errorAt(receipt.phase, error);
    // Even a receipt write failure after spawn must not restore under a live test.
    if (activeJob) {
      try {
        const result = await activeJob.completed;
        childTerminationConfirmed = result.terminationConfirmed === true;
        receipt.child = { ...receipt.child, ...result, finishedAt: now() };
      } catch (failure) {
        errorAt('await-child', failure);
      }
      activeJob = undefined;
    }
  } finally {
    try {
      if (output && !childTerminationConfirmed) {
        receipt.restoration.status = 'blocked';
        errorAt(
          'restore-blocked',
          Error('Profile retained until owned child termination can be confirmed'),
        );
      } else if (output && attempted) {
        try {
          await save('restoring');
        } catch (error) {
          errorAt('receipt-before-restore', error);
        }
        try {
          const before = await profile.read();
          receipt.restoration.before = before;
          if (
            !profile.same(before, options.size) &&
            (confirmed || !profile.same(before, original))
          ) {
            receipt.restoration.status = 'conflict';
            errorAt(
              'restore',
              Error('Profile changed externally; original setting was not blindly restored'),
            );
          } else {
            if (!profile.same(before, original)) {
              try {
                await profile.write(original);
              } catch (error) {
                errorAt('restore-command', error);
              }
            }
            const after = await profile.read();
            receipt.restoration.after = after;
            if (!profile.same(after, original)) {
              receipt.restoration.status = 'failed';
              errorAt('restore', Error('Original text profile did not verify after restoration'));
            } else receipt.restoration.status = 'restored';
          }
        } catch (error) {
          if (receipt.restoration.status !== 'conflict') receipt.restoration.status = 'failed';
          errorAt('restore', error);
        }
      } else if (output && confirmed) {
        try {
          receipt.restoration.after = await profile.read();
          if (!profile.same(receipt.restoration.after, original)) {
            receipt.restoration.status = 'conflict';
            errorAt(
              'verify-unchanged',
              Error('Unmodified profile changed externally; no setting was overwritten'),
            );
          }
        } catch (error) {
          if (receipt.restoration.status !== 'conflict') receipt.restoration.status = 'failed';
          errorAt('verify-unchanged', error);
        }
      }
      if (lease) {
        const retain =
          !childTerminationConfirmed ||
          ['failed', 'conflict', 'blocked'].includes(receipt.restoration.status);
        receipt.lease.status = 'retained';
        try {
          if (retain)
            await lease.update({
              status: 'recovery-required',
              original,
              restoration: receipt.restoration,
              errors: receipt.errors,
            });
          else {
            await lease.release();
            receipt.lease.status = 'released';
          }
        } catch (error) {
          errorAt('lease-cleanup', error);
        }
      }
      if (output) {
        receipt.status = receipt.errors.length ? 'failed' : cancellation ? 'cancelled' : 'passed';
        receipt.exitCode = 1;
        if (receipt.status === 'passed') receipt.exitCode = 0;
        else if (receipt.status === 'cancelled')
          receipt.exitCode = cancellation.signal === 'SIGINT' ? 130 : 143;
        else if (
          receipt.errors.every((error) => error.stage === 'child') &&
          Number.isInteger(receipt.child?.code) &&
          receipt.child.code > 0 &&
          receipt.child.code < 126
        )
          receipt.exitCode = receipt.child.code;
        receipt.finishedAt = now();
        await save('finished');
      }
    } finally {
      try {
        try {
          await lease?.close();
        } finally {
          await output?.close();
        }
      } finally {
        signals.removeListener('SIGINT', onInt);
        signals.removeListener('SIGTERM', onTerm);
      }
    }
  }
  return receipt;
}

if (
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const receipt = await runTextProfile(parseProfileArgs(process.argv.slice(2)));
    console.error(`Text profile ${receipt.status}: ${receipt.receiptPath}`);
    process.exitCode = receipt.exitCode;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
