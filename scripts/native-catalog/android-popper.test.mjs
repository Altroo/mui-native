import test from 'node:test';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, chmod, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import {
  prepare,
  parseReport,
  run,
  catalogPackage,
  component,
  requiredMilestones,
} from './android-popper.mjs';

const nativeReport = {
  schemaVersion: 1,
  scenario: 'popper-native-anchor-lifecycle-v3',
  package: catalogPackage,
  status: 'passed',
  directory: 'popper-checks/run-1793712000000',
  milestones: [...requiredMilestones],
  steps: Array.from({ length: 20 }, (_, index) => 'touch-' + index),
  screenshots: [
    'window-popup.png',
    'inline-popup.png',
    'transformed-inline-popup.png',
    'bounded-transformed-popup.png',
    'reset-inline-popup.png',
    'transformed-window-popup.png',
    'reset-window-popup.png',
    'closed-popup.png',
    ...['window', 'inline'].flatMap((mode) => [
      'scrolled-' + mode + '-popup.png',
      'returned-' + mode + '-popup.png',
      'clipped-' + mode + '-anchor.png',
      'restored-' + mode + '-popup.png',
    ]),
    ...['window', 'inline'].flatMap((mode) => [
      'shared-' + mode + '-a.png',
      'shared-' + mode + '-b.png',
      'detached-shared-' + mode + '.png',
      'recovered-shared-' + mode + '.png',
      'returned-shared-' + mode + '.png',
      'shared-' + mode + '-closed.png',
    ]),
  ],
};
const completion = (report = nativeReport, code = -1) =>
  'INSTRUMENTATION_RESULT: report=' +
  JSON.stringify(report) +
  '\nINSTRUMENTATION_CODE: ' +
  code +
  '\n';

test('native completion requires one passing report, the chosen scenario and successful instrumentation code', () => {
  assert.deepEqual(parseReport(completion()), nativeReport);
  for (const output of [
    '',
    completion() + completion(),
    completion(nativeReport, 0),
    completion({ ...nativeReport, status: 'failed', error: 'Popup unavailable' }),
    completion({ ...nativeReport, package: 'unrelated.app' }),
    completion({ ...nativeReport, scenario: 'older-smaller-test' }),
    completion({ ...nativeReport, steps: [] }),
    completion({ ...nativeReport, milestones: ['arbitrary'] }),
    completion({ ...nativeReport, screenshots: Array(8).fill('window-popup.png') }),
    completion() + 'INSTRUMENTATION_FAILED: aborted\n',
    completion({ ...nativeReport, directory: '../../private' }),
    completion({ ...nativeReport, screenshots: ['../foreign.png'] }),
  ])
    assert.throws(() => parseReport(output));
});

test('preparation is repeatable and preserves unrelated runners and manually edited source', async () => {
  const project = await mkdtemp(join(tmpdir(), 'mui-android-prepare-'));
  try {
    const gradle = join(project, 'app/build.gradle');
    await mkdir(dirname(gradle), { recursive: true });
    await writeFile(gradle, "android { defaultConfig { applicationId 'unrelated.app' } }\n");
    await assert.rejects(prepare(project), /Expected the generated/);
    await writeFile(
      gradle,
      "android { defaultConfig { applicationId 'dev.altroo.muinative.catalog'; testInstrumentationRunner 'existing.Runner' } }\n",
    );
    await assert.rejects(prepare(project), /existing instrumentation/);
    await writeFile(
      gradle,
      "android { defaultConfig { applicationId 'dev.altroo.muinative.catalog' } }\n",
    );
    const first = await prepare(project);
    await prepare(project);
    assert.equal(
      (await readFile(gradle, { encoding: 'utf8' })).match(/testInstrumentationRunner/g).length,
      1,
    );
    await writeFile(
      first.source,
      (await readFile(first.source, { encoding: 'utf8' })) + '\n// contributor edit\n',
    );
    await assert.rejects(prepare(project), /Preserve edits/);
    assert.match(await readFile(first.source, { encoding: 'utf8' }), /contributor edit/);
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});

test('runner targets only the explicit ready device, collects scoped artifacts and restores only the catalog', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mui-android-run-'));
  const calls = [];
  const execute = (binary, args) => {
    calls.push({ binary, args });
    if (args[2] === 'get-state') return Buffer.from('device\n');
    if (args.includes('instrument')) return Buffer.from(completion());
    if (args.includes('exec-out')) return Buffer.from('test screenshot bytes');
    return Buffer.from('Starting: catalog');
  };
  try {
    // Deliberately omit the typed required field to verify runtime validation.
    // noinspection JSCheckFunctionSignatures
    const missingDevice = run({ adb: 'adb', output }, execute);
    await assert.rejects(missingDevice, /explicit --serial/);
    assert.equal(calls.length, 0);
    const report = await run({ adb: 'adb', serial: 'emulator-5554', output }, execute);
    assert.deepEqual(report, nativeReport);
    assert(
      calls.every(
        ({ binary, args }) => binary === 'adb' && args[0] === '-s' && args[1] === 'emulator-5554',
      ),
    );
    assert.deepEqual(calls[1].args.slice(2), ['shell', 'am', 'instrument', '-w', '-r', component]);
    assert.deepEqual(calls.at(-1).args.slice(2), [
      'shell',
      'am',
      'start',
      '-n',
      catalogPackage + '/.MainActivity',
    ]);
    assert.equal((await readdir(output)).length, 30);
    assert(
      calls
        .filter(({ args }) => args.includes('exec-out'))
        .every(({ args }) => args[3] === 'run-as' && args[4] === catalogPackage),
    );
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('an instrumentation failure remains a failure after successful catalog restoration', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mui-android-failure-'));
  const calls = [];
  try {
    await assert.rejects(
      run({ adb: 'adb', serial: 'one-device', output }, (_, args) => {
        calls.push(args);
        if (args.includes('get-state')) return 'device';
        if (args.includes('instrument'))
          return completion({ ...nativeReport, status: 'failed', error: 'Missing popup' }, 0);
        return 'Starting catalog';
      }),
      /Missing popup/,
    );
    assert(calls.at(-1).includes('start'));
    assert.match(
      await readFile(join(output, 'instrumentation.txt'), { encoding: 'utf8' }),
      /Missing popup/,
    );
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('failed native reports retain failure screenshots before stopping and restoring the catalog', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mui-android-artifacts-'));
  const calls = [];
  try {
    await assert.rejects(
      run({ adb: 'adb', serial: 'chosen', output }, (_, args) => {
        calls.push(args);
        if (args.includes('get-state')) return 'device';
        if (args.includes('instrument'))
          return completion(
            {
              ...nativeReport,
              status: 'failed',
              error: 'Boundary overflow',
              screenshots: ['failure.png'],
            },
            0,
          );
        if (args.includes('exec-out')) return Buffer.from('failure capture');
        return 'NAME\n';
      }),
      /Boundary overflow/,
    );
    assert.equal(
      await readFile(join(output, 'failure.png'), { encoding: 'utf8' }),
      'failure capture',
    );
    const stop = calls.findIndex((args) => args.includes('force-stop'));
    assert(stop > calls.findIndex((args) => args.includes('exec-out')));
    assert(calls[stop + 1].includes('ps'));
    assert(calls.at(-1).includes('start'));
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('a command abort retains output and cannot restore controls until native termination is confirmed', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mui-android-abort-'));
  const calls = [];
  const controller = new AbortController();
  try {
    await assert.rejects(
      run(
        { adb: 'adb', serial: 'chosen', output, signal: controller.signal },
        async (_, args, options) => {
          calls.push(args);
          if (args.includes('get-state')) return 'device';
          if (args.includes('instrument')) {
            assert.equal(options.signal, controller.signal);
            controller.abort();
            throw Object.assign(Error('aborted'), {
              stdout: 'partial native output',
              stderr: 'connection interrupted',
            });
          }
          assert.equal(options.signal, undefined, 'Abort must not cancel cleanup commands');
          if (args.includes('force-stop')) throw Error('transport lost');
          return 'NAME\n';
        },
      ),
      /termination unconfirmed/,
    );
    assert(!calls.some((args) => args.includes('start')));
    assert.equal(
      await readFile(join(output, 'instrumentation.txt'), { encoding: 'utf8' }),
      'partial native output',
    );
    assert.match(
      await readFile(join(output, 'command-error.txt'), { encoding: 'utf8' }),
      /aborted\nconnection interrupted/,
    );
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

// Exercise the actual async child-process abort path against a local stand-in,
// never adb or an Android device. Function mocks alone miss signal handling.
test(
  'the real child-process abort path cancels a running client and performs scoped cleanup',
  { skip: process.platform === 'win32' },
  async () => {
    const folder = await mkdtemp(join(tmpdir(), 'mui-android-process-'));
    const controller = new AbortController();
    let pending;
    try {
      const executable = join(folder, 'fake-adb.mjs');
      const calls = join(folder, 'calls.jsonl'),
        started = join(folder, 'started');
      await writeFile(
        executable,
        '#!/usr/bin/env node\n' +
          `
import {appendFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2);
appendFileSync(${JSON.stringify(calls)},JSON.stringify(args)+'\\n');
if(args.includes('get-state')) console.log('device');
else if(args.includes('instrument')) {
 process.stdout.write('native in progress\\n',()=>writeFileSync(${JSON.stringify(started)},'started'));
 setInterval(()=>{},1000);
} else if(args.includes('ps')) console.log('NAME');
else console.log('completed');
`,
      );
      await chmod(executable, 0o755);
      pending = run({
        adb: executable,
        serial: 'one-device',
        output: join(folder, 'result'),
        signal: controller.signal,
      });
      // Register rejection observation before abort to avoid an unhandled promise.
      let abortError;
      const rejected = assert.rejects(pending, (error) => {
        abortError =
          error instanceof AggregateError &&
          error.errors.find((entry) => entry.name === 'AbortError');
        return !!abortError;
      });
      const deadline = Date.now() + 10000;
      for (;;) {
        try {
          await access(started);
          break;
        } catch (error) {
          if (error.code !== 'ENOENT' || Date.now() > deadline) throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      controller.abort();
      await rejected;
      const commands = (await readFile(calls, { encoding: 'utf8' }))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
      assert(commands.every((args) => args[0] === '-s' && args[1] === 'one-device'));
      const stopIndex = commands.findIndex((args) => args.includes('force-stop'));
      const confirmIndex = commands.findIndex((args) => args.includes('ps'));
      const restoreIndex = commands.findIndex((args) => args.includes('start'));
      assert(stopIndex >= 0 && confirmIndex > stopIndex && restoreIndex > confirmIndex);
      // Aborting can beat the parent's pipe read. Require every byte Node
      // observed, rather than assuming the child readiness marker means read.
      assert.equal(
        await readFile(join(folder, 'result/instrumentation.txt'), { encoding: 'utf8' }),
        String(abortError.stdout ?? ''),
      );
      assert.match(
        await readFile(join(folder, 'result/command-error.txt'), { encoding: 'utf8' }),
        /AbortError/,
      );
    } finally {
      controller.abort();
      await pending?.catch(() => {});
      await rm(folder, { recursive: true, force: true });
    }
  },
);

test('existing output evidence is never mixed with a later native run', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mui-android-existing-'));
  const calls = [];
  try {
    await writeFile(join(output, 'report.json'), 'previous evidence');
    await assert.rejects(
      run({ adb: 'adb', serial: 'chosen', output }, (_, args) => {
        calls.push(args);
        return 'device';
      }),
      /empty output directory/,
    );
    assert(!calls.some((args) => args.includes('instrument')));
    assert.equal(
      await readFile(join(output, 'report.json'), { encoding: 'utf8' }),
      'previous evidence',
    );
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('a passed report requires every transform, scrolling, child-tap and reopen milestone', () => {
  for (const omitted of requiredMilestones) {
    const milestones = [...nativeReport.milestones].filter((stage) => stage !== omitted);
    assert.throws(() => parseReport(completion({ ...nativeReport, milestones })));
  }
});

test(
  'repeated CLI interrupts leave cleanup active until scoped restoration finishes',
  { skip: process.platform === 'win32' },
  async () => {
    const folder = await mkdtemp(join(tmpdir(), 'mui-android-cli-'));
    let child, closed;
    try {
      const executable = join(folder, 'fake-adb.mjs'),
        calls = join(folder, 'calls.jsonl');
      const started = join(folder, 'started'),
        stopping = join(folder, 'stopping');
      await writeFile(
        executable,
        '#!/usr/bin/env node\n' +
          `
import {appendFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2);appendFileSync(${JSON.stringify(calls)},JSON.stringify(args)+'\\n');
if(args.includes('get-state')) console.log('device');
else if(args.includes('instrument')) {writeFileSync(${JSON.stringify(started)},'yes');console.log('native started');setInterval(()=>{},1000);}
else if(args.includes('force-stop')) {writeFileSync(${JSON.stringify(stopping)},'yes');setTimeout(()=>console.log('stopped'),300);}
else console.log('NAME');
`,
      );
      await chmod(executable, 0o755);
      child = spawn(
        process.execPath,
        [
          fileURLToPath(new URL('./android-popper.mjs', import.meta.url)),
          'run',
          '--adb',
          executable,
          '--serial',
          'chosen',
          '--output',
          join(folder, 'result'),
        ],
        { stdio: 'ignore' },
      );
      closed = new Promise((resolve, reject) => {
        child.once('close', (code, signal) => resolve({ code, signal }));
        child.once('error', reject);
      });
      const waitFile = async (path) => {
        const deadline = Date.now() + 10000;
        for (;;) {
          try {
            await access(path);
            return;
          } catch (error) {
            if (error.code !== 'ENOENT' || Date.now() > deadline) throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      };
      await waitFile(started);
      child.kill('SIGINT');
      await waitFile(stopping);
      child.kill('SIGINT');
      const ending = await closed;
      const commands = (await readFile(calls, { encoding: 'utf8' }))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
      assert(
        commands.some((args) => args.includes('ps')),
        'Second interrupt interrupted termination confirmation',
      );
      assert(commands.at(-1).includes('start'), 'Second interrupt interrupted catalog restoration');
      assert.equal(ending.code, 1);
      assert.equal(ending.signal, null);
    } finally {
      if (child && child.exitCode === null && child.signalCode === null) {
        child.kill('SIGTERM');
        await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 1500))]);
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        await closed;
      }
      await rm(folder, { recursive: true, force: true });
    }
  },
);

test('empty stderr does not discard command error identity or captured stdout', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mui-android-empty-stderr-'));
  try {
    await assert.rejects(
      run({ adb: 'adb', serial: 'chosen', output }, (_, args) => {
        if (args.includes('get-state')) return 'device';
        if (args.includes('instrument'))
          throw Object.assign(Error('connection aborted'), {
            stdout: 'captured bytes',
            stderr: '',
          });
        return 'NAME\n';
      }),
    );
    assert.equal(
      await readFile(join(output, 'instrumentation.txt'), { encoding: 'utf8' }),
      'captured bytes',
    );
    assert.match(
      await readFile(join(output, 'command-error.txt'), { encoding: 'utf8' }),
      /Error: connection aborted/,
    );
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('opaque falsy cleanup failures never permit catalog restoration', async () => {
  for (const reason of [undefined, null, false, 0, '']) {
    const output = await mkdtemp(join(tmpdir(), 'mui-android-opaque-cleanup-'));
    const calls = [];
    try {
      await assert.rejects(
        run({ adb: 'adb', serial: 'chosen', output }, async (_, args) => {
          calls.push(args);
          if (args.includes('get-state')) return 'device';
          if (args.includes('instrument')) throw Error('native test failed');
          if (args.includes('force-stop')) throw reason;
          return 'NAME\n';
        }),
        (error) =>
          error instanceof AggregateError &&
          error.cause === reason &&
          /termination unconfirmed/.test(error.message),
      );
      assert(!calls.some((args) => args.includes('start')));
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  }
});
