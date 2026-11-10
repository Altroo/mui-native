// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './android-popper.mjs';
import {
  inspectFormGroupKeyboard,
  summarizeFormGroupKeyboard,
} from './android-form-group-keyboard-report.mjs';
const kinds = ['native', 'host', 'stock', 'custom', 'styled'];
function fixture() {
  const report = {
    schemaVersion: 1,
    scenario: 'form-group-keyboard-v1',
    driver: 'native Instrumentation and UiAutomation',
    artifactDirectory: 'cache/mui-form-group-keyboard-123',
    device: { sdk: 37, model: 'synthetic-collector-fixture', density: 2.625, fontScale: 1 },
    status: 'passed',
    keyEventsEnabled: false,
    gaps: [],
    stages: [],
    states: [],
    screenshots: ['observe', 'prevent', 'stop'].map(
      (policy) => 'form-group-keyboard-' + policy + '.png',
    ),
  };
  const ids = kinds.flatMap((kind) => [kind, kind + '-button']);
  const nodes = Object.fromEntries(ids.map((id, index) => [id, 101 + index * 2]));
  const refs = Object.fromEntries(ids.map((id) => [id, { attached: 1, cleaned: 0 }]));
  for (const policy of ['observe', 'prevent', 'stop'])
    for (const key of ['Enter', ' ', 'a'])
      for (const kind of kinds) {
        const state = {
          name: policy + '-' + kind + '-' + (key === ' ' ? 'Space' : key),
          policy,
          key,
          kind,
          rootId: nodes[kind],
          buttonId: nodes[kind + '-button'],
          rootClass: 'SyntheticNativeRoot',
          parent: [],
          child: [],
          clicks: key !== 'a' && (kind === 'native' || policy === 'observe') ? 1 : 0,
        };
        const entries = [];
        for (const [offset, phase] of ['down', 'up'].entries()) {
          const activation = key !== 'a' && phase === (key === 'Enter' ? 'down' : 'up');
          const stopped = activation && policy === 'stop' && kind !== 'native';
          const prevented = activation && policy === 'prevent' && kind !== 'native';
          const append = (scope, name, eventId, prevented, stopped) =>
            entries.push({
              sequence: entries.length + 1,
              kind,
              scope,
              phase: name,
              key,
              code: key === ' ' ? 'Space' : key === 'a' ? 'KeyA' : 'Enter',
              target: state.buttonId,
              currentTarget: scope === 'root' ? state.rootId : state.buttonId,
              eventId,
              payloadId: offset + 1,
              prevented,
              stopped,
              targetKind: 'object',
              source: 'hardware',
            });
          if (kind !== 'native')
            append('root', phase + '-capture', offset * 2 + 1, prevented, stopped);
          if (!stopped) {
            append('button', phase, offset * 2 + 2, prevented, false);
            if (kind !== 'native')
              append(
                'root',
                phase,
                offset * 2 + 1,
                prevented || (phase === 'down' && key !== 'a'),
                false,
              );
          }
        }
        state.parent = entries.filter((event) => event.scope === 'root');
        state.child = entries.filter((event) => event.scope === 'button');
        state.metadata = {
          schemaVersion: 1,
          policy,
          ready: true,
          total: entries.length,
          entries,
          clicks: state.clicks ? { [kind]: state.clicks } : {},
          nodes: structuredClone(nodes),
          refs: structuredClone(refs),
        };
        report.stages.push(state.name);
        report.states.push(state);
      }
  return report;
}
const output = (report, code = -1) =>
  'INSTRUMENTATION_RESULT: formGroupKeyboardReport=' +
  JSON.stringify(report) +
  '\nINSTRUMENTATION_CODE: ' +
  code +
  '\n';
test('complete native keyboard evidence validates forty-five cases without inferring framework support', () => {
  const report = fixture();
  assert.deepEqual(summarizeFormGroupKeyboard(output(report)), report);
});
const mutations = {
  'native failure': (r) => (r.status = 'failed'),
  'native gaps': (r) => r.gaps.push('missing callbacks'),
  'runtime flag absent': (r) => delete r.keyEventsEnabled,
  'wrong actual OS text scale': (r) => (r.device.fontScale = 2),
  'omitted state': (r) => r.states.pop(),
  'omitted stage': (r) => r.stages.pop(),
  'omitted screenshot': (r) => r.screenshots.pop(),
  'duplicate screenshot': (r) => r.screenshots.push(r.screenshots[0]),
  'unsafe artifact traversal': (r) => (r.artifactDirectory = 'cache/../private'),
  'unsafe screenshot traversal': (r) => (r.screenshots[0] = '../private.png'),
  'root remount': (r) => (r.states[1].metadata.refs.stock.attached = 2),
  'child remount': (r) => (r.states[1].metadata.refs['stock-button'].cleaned = 1),
  'changed original host': (r) => (r.states[2].metadata.nodes.stock += 1000),
  'aliased root and child': (r) =>
    (r.states[1].metadata.nodes.host = r.states[1].metadata.nodes['host-button']),
  'wrong independent root tag': (r) => (r.states[1].rootId += 1),
  'wrong independent child tag': (r) => (r.states[1].buttonId += 1),
  'missing capture': (r) => (r.states[1].metadata.entries[0].phase = 'down'),
  'reordered child and bubble': (r) =>
    ([r.states[1].metadata.entries[1], r.states[1].metadata.entries[2]] = [
      r.states[1].metadata.entries[2],
      r.states[1].metadata.entries[1],
    ]),
  'wrong target': (r) => (r.states[1].metadata.entries[0].target = r.states[1].rootId),
  'wrong currentTarget': (r) =>
    (r.states[1].metadata.entries[1].currentTarget = r.states[1].rootId),
  'cloned original root event': (r) => (r.states[1].metadata.entries[2].eventId = 99),
  'cloned child payload': (r) => (r.states[1].metadata.entries[1].payloadId = 99),
  'fake keyboard provenance': (r) => (r.states[1].metadata.entries[0].source = 'command'),
  'lost preventDefault': (r) => (r.states[16].metadata.entries[1].prevented = false),
  'lost stopPropagation': (r) => (r.states[31].metadata.entries[0].stopped = false),
  'extra activation after cancellation': (r) => (r.states[16].clicks = 1),
  'missing native baseline input': (r) => r.states[0].child.pop(),
  'extra callbacks after reset': (r) => (r.states[1].metadata.total += 1),
};
for (const [name, mutate] of Object.entries(mutations))
  test('rejects ' + name, () => {
    const report = fixture();
    mutate(report);
    assert.throws(() => summarizeFormGroupKeyboard(output(report)));
  });
test('failed native report can retain safe diagnostics but cannot become a pass', () => {
  const report = fixture();
  report.status = 'failed';
  report.error = 'expected diagnostic';
  assert.equal(inspectFormGroupKeyboard(output(report, 0)).status, 'failed');
  assert.throws(() => summarizeFormGroupKeyboard(output(report, 0)));
});
test('ambiguous native report and instrumentation statuses are rejected', () => {
  const report = fixture(),
    text = output(report);
  assert.throws(() => inspectFormGroupKeyboard(text + text));
  for (const suffix of [
    'INSTRUMENTATION_CODE: -1\n',
    'INSTRUMENTATION_RESULT: Error=bad\n',
    'INSTRUMENTATION_ABORTED: bad\n',
  ])
    assert.throws(() => summarizeFormGroupKeyboard(text + suffix));
});

function enabledFixture() {
  const report = fixture();
  report.keyEventsEnabled = true;
  for (const state of report.states.filter(
    (state) => state.kind === 'native' && state.key === 'a',
  )) {
    const entries = state.child
      .flatMap((original, index) => {
        const framework = {
          ...original,
          scope: 'root',
          currentTarget: state.rootId,
          eventId: 1 + index * 2,
          payloadId: 1 + index * 2,
          source: null,
        };
        return [
          { ...framework, phase: original.phase + '-capture' },
          framework,
          { ...original, eventId: 2 + index * 2, payloadId: 2 + index * 2 },
        ];
      })
      .map((event, index) => ({ ...event, sequence: index + 1 }));
    state.metadata.entries = entries;
    state.metadata.total = entries.length;
    state.parent = entries.filter((event) => event.scope === 'root');
    state.child = entries.filter((event) => event.scope === 'button');
  }
  return report;
}
test('enabled configuration requires actual ordinary framework copies in the native baseline', () => {
  const report = enabledFixture();
  assert.deepEqual(summarizeFormGroupKeyboard(output(report)), report);
  const missing = fixture();
  missing.keyEventsEnabled = true;
  assert.throws(() => summarizeFormGroupKeyboard(output(missing)), /enabled framework baseline/);
  report.states.find(
    (state) => state.kind === 'native' && state.key === 'a',
  ).metadata.entries[0].source = 'hardware';
  assert.throws(() => summarizeFormGroupKeyboard(output(report)), /separate real transports/);
});

for (const failed of [false, true])
  test('runner routes keyboard evidence and restores catalog, failed=' + failed, async (t) => {
    const folder = await mkdtemp(join(tmpdir(), 'mui-form-group-keyboard-test-'));
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
        scenario: 'form-group-keyboard',
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
    const instrument = calls.find((args) => args.includes('instrument'));
    assert.deepEqual(instrument.slice(2), [
      'shell',
      'am',
      'instrument',
      '-w',
      '-r',
      '-e',
      'scenario',
      'form-group-keyboard',
      'dev.altroo.muinative.catalog.test/dev.altroo.muinative.catalog.test.PopperInstrumentation',
    ]);
    assert(calls.at(-1).includes('start'));
  });
