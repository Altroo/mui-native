// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './android-popper.mjs';
import {
  inspectFormGroupFocus,
  summarizeFormGroupFocus,
} from './android-form-group-focus-report.mjs';
const kinds = ['native', 'host', 'stock', 'custom', 'styled'];
function fixture() {
  const ids = kinds.flatMap((kind) => [kind, kind + '-button']);
  const nodes = Object.fromEntries(ids.map((id, index) => [id, 101 + index * 2]));
  const refs = Object.fromEntries(ids.map((id) => [id, { attached: 1, cleaned: 0 }]));
  let entries = [],
    requests = {},
    focused = null,
    identity = 0;
  const receipt = () =>
    structuredClone({
      schemaVersion: 1,
      ready: true,
      total: entries.length,
      entries,
      requests,
      focused,
      nodes,
      refs,
      fontScale: 1,
    });
  const emit = (kind, type) => {
    const own = ++identity,
      framework = ++identity;
    const append = (phase, id, source) =>
      entries.push({
        sequence: entries.length + 1,
        kind,
        type,
        phase,
        eventId: id,
        payloadId: id,
        target: nodes[kind + '-button'],
        currentTarget: nodes[kind + (phase === 'child' ? '-button' : '')],
        nativeTarget: nodes[kind + '-button'],
        targetKind: 'object',
        focusSource: source,
      });
    if (kind === 'native') {
      append('capture', framework, null);
      append('bubble', framework, null);
      append('child', own, 'owned');
    } else {
      for (const phase of ['capture', 'child', 'bubble']) append(phase, own, 'owned');
    }
  };
  const report = {
    schemaVersion: 1,
    scenario: 'form-group-focus-v1',
    driver: 'native Instrumentation and UiAutomation',
    artifactDirectory: 'cache/mui-form-group-focus-123',
    device: { sdk: 37, model: 'synthetic-collector-fixture', density: 2.625, fontScale: 1 },
    status: 'passed',
    gaps: [],
    stages: ['ready', ...kinds, 'released', 'cleared'],
    states: [],
    screenshots: [...kinds, 'released'].map((kind) => 'form-group-focus-' + kind + '.png'),
    initial: receipt(),
  };
  for (const [index, kind] of kinds.entries()) {
    if (index) emit(kinds[index - 1], 'blur');
    emit(kind, 'focus');
    focused = nodes[kind + '-button'];
    requests[kind] = 1;
    report.states.push({
      kind,
      name: kind,
      metadata: receipt(),
      nativeRootId: nodes[kind],
      nativeChildId: focused,
      nativeFocused: true,
      rootFrame: { x: 1, y: 2, width: 300, height: 60 },
      childFrame: { x: 2, y: 3, width: 100, height: 40 },
    });
  }
  emit(kinds.at(-1), 'blur');
  focused = null;
  report.released = receipt();
  report.releasedNativeFocusedChildren = [];
  entries = [];
  report.cleared = receipt();
  report.clearedNativeFocusedChildren = [];
  return report;
}
const output = (report, code = -1) =>
  'INSTRUMENTATION_RESULT: formGroupFocusReport=' +
  JSON.stringify(report) +
  '\nINSTRUMENTATION_CODE: ' +
  code +
  '\n';
test('accepts complete independent native focus evidence and separate Android framework baseline', () => {
  const report = fixture();
  assert.deepEqual(summarizeFormGroupFocus(output(report)), report);
});
const mutations = {
  'native failure': (r) => (r.status = 'failed'),
  'native gaps': (r) => r.gaps.push('missing focus'),
  'missing state': (r) => r.states.pop(),
  'missing stage': (r) => r.stages.pop(),
  'missing screenshot': (r) => r.screenshots.pop(),
  'unsafe artifact directory': (r) => (r.artifactDirectory = 'cache/../private'),
  'unsafe screenshot': (r) => (r.screenshots[0] = '../private.png'),
  'duplicate screenshot': (r) => r.screenshots.push(r.screenshots[0]),
  'root remount': (r) => r.states[1].metadata.refs.stock.attached++,
  'child ref cleanup': (r) => r.states[1].metadata.refs['stock-button'].cleaned++,
  'missing known ref': (r) => delete r.states[1].metadata.refs.styled,
  'aliased host tags': (r) => (r.initial.nodes.stock = r.initial.nodes.host),
  'changed native tag': (r) => r.states[1].metadata.nodes.stock++,
  'wrong independent child tag': (r) => r.states[1].nativeChildId++,
  'wrong independent root tag': (r) => r.states[1].nativeRootId++,
  'native child not focused': (r) => (r.states[1].nativeFocused = false),
  'incorrect observed focus': (r) => (r.states[1].metadata.focused = null),
  'invalid independent frame': (r) => (r.states[1].childFrame.width = 0),
  'wrong OS text scale': (r) => (r.device.fontScale = 2),
  'extra ref request': (r) => r.states[1].metadata.requests.host++,
  'lost retained history': (r) => r.states[1].metadata.entries[0].eventId++,
  'missing callback count': (r) => r.released.total++,
  'wrong callback target': (r) => r.released.entries.at(-1).target++,
  'wrong callback currentTarget': (r) => r.released.entries.at(-1).currentTarget++,
  'missing event identity': (r) => (r.released.entries.at(-1).eventId = 0),
  'missing payload identity': (r) => (r.released.entries.at(-1).payloadId = 0),
  'fake owned focus provenance': (r) => (r.released.entries.at(-1).focusSource = null),
  'cloned owned event': (r) => r.released.entries.at(-1).eventId++,
  'cloned owned payload': (r) => r.released.entries.at(-1).payloadId++,
  'framework baseline absent': (r) => (r.released.entries[0].focusSource = 'owned'),
  'framework payload not distinct': (r) =>
    (r.released.entries[0].payloadId = r.released.entries[2].payloadId),
  'observed child still focused natively': (r) => r.releasedNativeFocusedChildren.push('styled'),
  'observed child still focused in JS': (r) =>
    (r.released.focused = r.initial.nodes['styled-button']),
  'release loses request state': (r) => {
    r.released.requests = {};
    r.cleared.requests = {};
  },
  'release omits focus': (r) => delete r.released.focused,
  'release malformed focus': (r) => (r.released.focused = 'unknown'),
  'clear omits focus': (r) => delete r.cleared.focused,
  'clear loses request state': (r) => (r.cleared.requests = {}),
  'clear retains callbacks': (r) => (r.cleared.total = 1),
  'clear leaves native focus': (r) => r.clearedNativeFocusedChildren.push('host'),
};
for (const [name, mutate] of Object.entries(mutations))
  test('rejects ' + name, () => {
    const report = fixture();
    mutate(report);
    assert.throws(() => summarizeFormGroupFocus(output(report)));
  });
test('failed report retains safe diagnostics but never validates as a pass', () => {
  const report = fixture();
  report.status = 'failed';
  report.error = 'native assertion';
  report.screenshots = ['failure.png'];
  assert.equal(inspectFormGroupFocus(output(report, 0)).status, 'failed');
  assert.throws(() => summarizeFormGroupFocus(output(report, 0)));
});
test('rejects ambiguous reports and failure trailers', () => {
  const text = output(fixture());
  assert.throws(() => inspectFormGroupFocus(text + text));
  for (const suffix of [
    'INSTRUMENTATION_CODE: -1\n',
    'INSTRUMENTATION_RESULT: Error=bad\n',
    'INSTRUMENTATION_ABORTED: bad\n',
  ])
    assert.throws(() => summarizeFormGroupFocus(text + suffix));
});
for (const failed of [false, true])
  test('runner routes focus diagnostics and restores catalog; failed=' + failed, async (t) => {
    const folder = await mkdtemp(join(tmpdir(), 'mui-form-group-focus-test-'));
    t.after(() => rm(folder, { recursive: true, force: true }));
    const report = fixture(),
      calls = [];
    if (failed) {
      report.status = 'failed';
      report.error = 'native assertion';
      report.screenshots = ['failure.png'];
    }
    const execute = (_file, args) => {
      calls.push(args);
      const command = args.slice(2);
      if (command[0] === 'get-state') return 'device\n';
      if (command[0] === 'exec-out') return Buffer.from('synthetic screenshot bytes');
      if (command[0] === 'shell' && command[1] === 'ps') return 'NAME\nsystem_server\n';
      if (command[0] === 'shell' && command[1] === 'am')
        return command[2] === 'instrument' ? output(report) : '';
      throw Error('Unexpected synthetic adb command ' + command);
    };
    const operation = run(
      {
        adb: 'synthetic-adb',
        serial: 'emulator-5554',
        output: folder,
        scenario: 'form-group-focus',
      },
      execute,
    );
    if (failed) await assert.rejects(operation);
    else await operation;
    assert.deepEqual(JSON.parse(await readFile(join(folder, 'report.json'), 'utf8')), report);
    assert.equal(
      await readFile(join(folder, report.screenshots[0]), 'utf8'),
      'synthetic screenshot bytes',
    );
    assert(calls.every((args) => args[0] === '-s' && args[1] === 'emulator-5554'));
    assert(calls.find((args) => args.includes('instrument')).includes('form-group-focus'));
    assert(calls.some((args) => args.includes('start')));
  });
