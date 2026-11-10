// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  inspectFormGroupEvents,
  summarizeFormGroupEvents,
} from './android-form-group-events-report.mjs';
import { run } from './android-popper.mjs';
const kinds = ['native', 'stock', 'custom', 'styled'];
function report(enabled = false) {
  const value = {
    schemaVersion: 1,
    scenario: 'form-group-events-v1',
    driver: 'native Instrumentation and UiAutomation',
    artifactDirectory: 'cache/mui-form-group-events-123',
    device: { sdk: 37, model: 'synthetic-collector-fixture', density: 2.625, fontScale: 1 },
    status: 'passed',
    keyEventsEnabled: enabled,
    stages: ['ready', ...kinds, 'released'],
    screenshots: ['form-group-events.png'],
    states: [],
  };
  const metadata = {
    schemaVersion: 1,
    ready: true,
    total: 0,
    entries: [],
    nodes: Object.fromEntries(kinds.map((kind, index) => [kind, 101 + index * 2])),
    refs: Object.fromEntries(kinds.map((kind) => [kind, { attached: 1, cleaned: 0 }])),
  };
  const append = (kind, type, phase, fields = {}) => {
    const tag = metadata.nodes[kind];
    const event = {
      sequence: ++metadata.total,
      eventId: 1,
      kind,
      type,
      phase,
      target: tag,
      currentTarget: tag,
      expectedTarget: tag,
      ...fields,
    };
    metadata.entries.push(event);
    return event;
  };
  const pair = (kind, type) =>
    ['capture', 'bubble'].map((phase) =>
      append(
        kind,
        type,
        phase,
        ['focus', 'blur'].includes(type)
          ? { nativeTarget: metadata.nodes[kind] }
          : {
              key: 'a',
              code: 'KeyA',
              altKey: false,
              ctrlKey: false,
              metaKey: false,
              shiftKey: false,
            },
      ),
    );
  value.baseline = structuredClone(metadata);
  for (const [index, kind] of kinds.entries()) {
    const focus = [...(index > 0 ? pair(kinds[index - 1], 'blur') : []), ...pair(kind, 'focus')];
    const input = [
      ...(enabled ? [...pair(kind, 'key-down'), ...pair(kind, 'key-up')] : []),
      append(kind, 'accessibility', 'direct', { actionName: 'inspect' }),
    ];
    value.states.push({
      name: kind,
      nativeId: metadata.nodes[kind],
      nativeClass: 'NativeFixtureRoot',
      bounds: { x: 20, y: 100, width: 300, height: 48 },
      focus,
      input,
      metadata: structuredClone(metadata),
    });
  }
  value.release = pair('styled', 'blur');
  value.released = structuredClone(metadata);
  return value;
}
const output = (value) =>
  'INSTRUMENTATION_RESULT: formGroupEventsReport=' +
  JSON.stringify(value) +
  '\nINSTRUMENTATION_CODE: -1\n';

for (const enabled of [false, true])
  test('authenticates actual native capability and ordered callbacks: keys=' + enabled, () => {
    const value = report(enabled);
    assert.deepEqual(summarizeFormGroupEvents(output(value)), value);
  });
test('pooled objects may be reused between distinct native dispatches', () => {
  const value = report(true);
  assert(value.released.entries.every((entry) => entry.eventId === 1));
  assert.deepEqual(summarizeFormGroupEvents(output(value)), value);
});
for (const [name, mutate] of [
  ['missing root state', (r) => r.states.pop()],
  ['wrong stage order', (r) => r.stages.reverse()],
  [
    'false native success',
    (r) => {
      r.status = 'failed';
      r.error = 'native assertion';
    },
  ],
  [
    'unknown key capability',
    (r) => {
      r.keyEventsEnabled = 'false';
    },
  ],
  [
    'invented keys while runtime disabled',
    (r) => {
      r.keyEventsEnabled = false;
    },
  ],
  [
    'missing keys while runtime enabled',
    (r) => {
      r.keyEventsEnabled = true;
    },
  ],
  [
    'unready baseline',
    (r) => {
      r.baseline.ready = false;
    },
  ],
  [
    'duplicate actual root tags',
    (r) => {
      r.baseline.nodes.stock = r.baseline.nodes.native;
    },
  ],
  [
    'remounted callback root',
    (r) => {
      r.states[0].metadata.refs.native.cleaned = 1;
    },
  ],
  [
    'lost actual target',
    (r) => {
      r.states[0].metadata.entries[0].target = null;
    },
  ],
  [
    'stale native root id',
    (r) => {
      r.states[0].nativeId += 2;
    },
  ],
  [
    'missing native frame',
    (r) => {
      r.states[0].bounds.width = 0;
    },
  ],
  [
    'truncated history',
    (r) => {
      r.states[0].metadata.total += 1;
    },
  ],
  [
    'rewritten previous history',
    (r) => {
      r.states[1].metadata.entries[0].eventId += 1;
    },
  ],
  [
    'missing final native blur',
    (r) => {
      r.release.pop();
    },
  ],
  [
    'actual enlarged scale under baseline claim',
    (r) => {
      r.device.fontScale = 2;
    },
  ],
])
  test('rejects ' + name, () => {
    const value = report(name === 'invented keys while runtime disabled');
    mutate(value);
    assert.throws(
      () => summarizeFormGroupEvents(output(value)),
      /Invalid native FormGroup event evidence/,
    );
  });
test('different capture/bubble objects cannot prove event identity', () => {
  const value = report();
  value.states[0].focus[1].eventId = 2;
  value.states[0].metadata.entries[1].eventId = 2;
  assert.throws(
    () => summarizeFormGroupEvents(output(value)),
    /ordered capture\/bubble object identity/,
  );
});
test('the real custom action name must survive dispatch', () => {
  const value = report();
  value.states[0].input[0].actionName = 'made-up';
  value.states[0].metadata.entries[2].actionName = 'made-up';
  assert.throws(
    () => summarizeFormGroupEvents(output(value)),
    /actual custom accessibility action/,
  );
});
test('the hardware key and modifiers must survive dispatch', () => {
  const value = report(true);
  value.states[0].input[0].ctrlKey = true;
  value.states[0].metadata.entries[2].ctrlKey = true;
  assert.throws(() => summarizeFormGroupEvents(output(value)), /actual native key\/modifiers/);
});
for (const path of [
  '../escape',
  '/cache/mui-form-group-events-123',
  'cache/mui-form-group-events-123/../escape',
])
  test('rejects unsafe artifact path ' + path, () => {
    const value = report();
    value.artifactDirectory = path;
    assert.throws(() => inspectFormGroupEvents(output(value)), /Unsafe or incomplete/);
  });
test('failed native reports remain readable for bounded diagnostic collection', () => {
  const value = report();
  value.status = 'failed';
  value.error = 'native assertion';
  value.screenshots = ['failure.png'];
  value.states = [];
  assert.deepEqual(inspectFormGroupEvents(output(value)), value);
  assert.throws(() => summarizeFormGroupEvents(output(value)), /native completion/);
});
for (const suffix of [
  'INSTRUMENTATION_CODE: -1\n',
  'INSTRUMENTATION_FAILED: abort\n',
  'INSTRUMENTATION_RESULT: shortMsg=crash\n',
])
  test('rejects contradictory instrumentation trailer ' + suffix.trim(), () => {
    assert.throws(
      () => summarizeFormGroupEvents(output(report()) + suffix),
      /failed native FormGroup event instrumentation/,
    );
  });
function fake(value, calls) {
  return (_file, args) => {
    calls.push(args);
    const command = args.slice(2);
    if (command[0] === 'get-state') return 'device\n';
    if (command[0] === 'exec-out') return Buffer.from('synthetic screenshot bytes');
    if (command[0] === 'shell' && command[1] === 'ps') return 'NAME\nsystem_server\n';
    if (command[0] === 'shell' && command[1] === 'am')
      return command[2] === 'instrument' ? output(value) : '';
    throw Error('Unexpected synthetic adb command ' + command);
  };
}
for (const failed of [false, true])
  test('runner routes and retains the event report, failed=' + failed, async (t) => {
    const folder = await mkdtemp(join(tmpdir(), 'mui-form-group-events-test-'));
    t.after(() => rm(folder, { recursive: true, force: true }));
    const value = report();
    if (failed) {
      value.status = 'failed';
      value.error = 'native assertion';
      value.screenshots = ['failure.png'];
    }
    const calls = [],
      operation = run(
        {
          adb: 'synthetic-adb',
          serial: 'emulator-5554',
          output: folder,
          scenario: 'form-group-events',
        },
        fake(value, calls),
      );
    if (failed) await assert.rejects(operation, /native completion/);
    else await operation;
    assert.deepEqual(JSON.parse(await readFile(join(folder, 'report.json'), 'utf8')), value);
    assert.equal(
      await readFile(join(folder, value.screenshots[0]), 'utf8'),
      'synthetic screenshot bytes',
    );
    assert(calls.every((args) => args[0] === '-s' && args[1] === 'emulator-5554'));
    const instrument = calls.find((args) => args.includes('instrument'));
    assert.deepEqual(instrument.slice(2), [
      'shell',
      'am',
      'instrument',
      '-w',
      '-r',
      '-e',
      'scenario',
      'form-group-events',
      'dev.altroo.muinative.catalog.test/dev.altroo.muinative.catalog.test.PopperInstrumentation',
    ]);
    assert.equal(calls.filter((args) => args.includes('force-stop')).length, failed ? 1 : 0);
    assert(calls.at(-1).includes('start'));
  });
