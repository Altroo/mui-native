// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './android-popper.mjs';
import {
  inspectFormGroupEditor,
  summarizeFormGroupEditor,
} from './android-form-group-editor-report.mjs';
const controls = [
  'stock-native',
  'stock-field',
  'custom-native',
  'custom-field',
  'styled-native',
  'styled-field',
];
const policies = ['observe', 'prevent', 'stop'];
const keys = ['ArrowDown', 'Enter', 'a'];
function fixture(
  framework = false,
  ordinaryPhases = ['down', 'up'],
  groupedPhases = ordinaryPhases,
) {
  const ids = [
    ...controls.flatMap((control) => ['', '-input', '-owner'].map((suffix) => control + suffix)),
    'baseline',
    'baseline-input',
  ];
  const nodes = Object.fromEntries(ids.map((id, index) => [id, 101 + index * 2]));
  const refs = Object.fromEntries(ids.map((id) => [id, { attached: 1, cleaned: 0 }]));
  const value = (policy, entries, focused, values, baselineValue = 'Rabata') =>
    structuredClone({
      schemaVersion: 1,
      fontScale: 1,
      ready: true,
      policy,
      total: entries.length,
      entries,
      focused,
      values,
      baselineValue,
      submissions: {},
      nodes,
      refs,
    });
  const report = {
    schemaVersion: 1,
    scenario: 'form-group-editor-v1',
    driver: 'native Instrumentation and UiAutomation',
    artifactDirectory: 'cache/mui-form-group-editor-123',
    device: { sdk: 37, model: 'synthetic-collector-fixture', fontScale: 1, density: 2.625 },
    status: 'passed',
    error: null,
    keyEventsEnabled: framework,
    gaps: [],
    screenshots: [
      'form-group-editor-baseline.png',
      ...policies.map((policy) => 'form-group-editor-' + policy + '.png'),
    ],
    stages: ['ready', 'framework-baseline'],
    states: [],
    initial: value('observe', [], null, {}, 'Rabat'),
  };
  const baselinePhases = framework ? ordinaryPhases : [];
  const baselineEntries = baselinePhases.flatMap((phase, index) =>
    ['capture', 'bubble'].map((scope, offset) => ({
      sequence: index * 2 + offset + 1,
      control: 'baseline',
      scope,
      phase,
      key: 'a',
      code: 'KeyA',
      source: null,
      target: nodes['baseline-input'],
      nativeTarget: nodes['baseline-input'],
      currentTarget: nodes.baseline,
      targetKind: 'object',
      eventId: index + 1,
      payloadId: index + 1,
      prevented: false,
      stopped: false,
    })),
  );
  report.frameworkBaseline = {
    nativeInputId: nodes['baseline-input'],
    nativeInputClass: 'com.facebook.react.views.textinput.ReactEditText',
    nativeRootId: nodes.baseline,
    nativeFocused: true,
    showSoftInputOnFocus: false,
    nativeTextBefore: 'Rabat',
    nativeTextAfter: 'Rabata',
    phases: baselinePhases,
    metadata: value('observe', baselineEntries, nodes['baseline-input'], {}),
  };
  const text = Object.fromEntries(controls.map((control) => [control, 'Rabat'])),
    values = {};
  for (const policy of policies)
    for (const key of keys)
      for (const control of controls) {
        const nativeInputId = nodes[control + '-input'],
          nativeRootId = nodes[control],
          nativeOwnerId = nodes[control + '-owner'];
        const claimed = key !== 'a',
          stopped = claimed && policy === 'stop',
          prevented = claimed && policy === 'prevent',
          entries = [];
        for (const [index, phase] of (claimed ? ['down', 'up'] : groupedPhases).entries()) {
          const scopes = claimed
            ? stopped
              ? ['capture']
              : ['capture', 'input', 'owner', 'bubble']
            : framework
              ? control.startsWith('custom')
                ? ['input']
                : ['capture', 'input', 'bubble']
              : [];
          for (const scope of scopes)
            entries.push({
              sequence: entries.length + 1,
              control,
              scope,
              phase,
              key,
              code: key === 'a' ? 'KeyA' : key,
              source: claimed ? 'hardware' : null,
              target: nativeInputId,
              nativeTarget: nativeInputId,
              currentTarget:
                scope === 'input'
                  ? nativeInputId
                  : scope === 'owner'
                    ? nativeOwnerId
                    : nativeRootId,
              targetKind: 'object',
              eventId: index + 1,
              payloadId: index + 1,
              prevented,
              stopped,
              editable: claimed ? true : null,
              composing: claimed ? false : null,
              canceled: claimed ? false : null,
              keySequence: claimed ? 'native-generation-' + report.states.length : null,
            });
        }
        const before = text[control];
        if (key === 'a') values[control] = text[control] += 'a';
        const name = policy + '-' + control + '-' + key;
        report.states.push({
          name,
          control,
          key,
          policy,
          nativeInputId,
          nativeRootId,
          nativeOwnerId,
          nativeFocused: true,
          showSoftInputOnFocus: false,
          nativeTextBefore: before,
          nativeTextAfter: text[control],
          metadata: value(policy, entries, nativeInputId, values),
        });
        report.stages.push(name);
      }
  return report;
}
const output = (report, code = -1) =>
  'INSTRUMENTATION_RESULT: formGroupEditorReport=' +
  JSON.stringify(report) +
  '\nINSTRUMENTATION_CODE: ' +
  code +
  '\n';
for (const enabled of [false, true])
  test('validates54 native editor cases with actual framework flag=' + enabled, () => {
    const report = fixture(enabled);
    assert.deepEqual(summarizeFormGroupEditor(output(report)), report);
  });
const mutations = {
  'unsupported API29 viewport': (r) => (r.device.sdk = 29),
  'lost previous text acknowledgement': (r) => delete r.states[13].metadata.values['stock-native'],
  'reused physical generation across cases': (r) =>
    r.states[1].metadata.entries.forEach(
      (e) => (e.keySequence = r.states[0].metadata.entries[0].keySequence),
    ),
  'native failure': (r) => (r.status = 'failed'),
  'native gaps': (r) => r.gaps.push('missing callback'),
  'missing actual flag': (r) => delete r.keyEventsEnabled,
  'missing state': (r) => r.states.pop(),
  'missing stage': (r) => r.stages.pop(),
  'missing screenshot': (r) => r.screenshots.pop(),
  'duplicate screenshot': (r) => r.screenshots.push(r.screenshots[0]),
  'unsafe artifact traversal': (r) => (r.artifactDirectory = 'cache/../private'),
  'unsafe screenshot traversal': (r) => (r.screenshots[0] = '../private.png'),
  'wrong OS scale': (r) => (r.device.fontScale = 2),
  'missing known ref': (r) => delete r.initial.refs['stock-native-input'],
  'aliased native hosts': (r) =>
    (r.initial.nodes['stock-native'] = r.initial.nodes['stock-native-input']),
  'group remount': (r) => {
    r.states[0].metadata.refs['stock-native'].attached++;
    r.states[0].metadata.refs['stock-native'].cleaned++;
  },
  'dead input ref': (r) => r.states[0].metadata.refs['stock-native-input'].cleaned++,
  'changed actual host': (r) => r.states[0].metadata.nodes['stock-native-input']++,
  'wrong independent input tag': (r) => r.states[0].nativeInputId++,
  'wrong independent group tag': (r) => r.states[0].nativeRootId++,
  'wrong independent owner tag': (r) => r.states[0].nativeOwnerId++,
  'lost actual native focus': (r) => (r.states[0].nativeFocused = false),
  'wrong observed focus': (r) => (r.states[0].metadata.focused = null),
  'native command changes text': (r) => (r.states[0].nativeTextAfter += 'x'),
  'claimed Enter submits': (r) => (r.states[6].metadata.submissions['stock-native'] = 1),
  'ordinary edit missing': (r) => (r.states[12].nativeTextAfter = 'Rabat'),
  'ordinary edit not acknowledged': (r) => delete r.states[12].metadata.values['stock-native'],
  'lost previous text history': (r) => (r.states[13].metadata.values['stock-native'] = 'Rabat'),
  'lost callback count': (r) => r.states[0].metadata.total++,
  'wrong callback target': (r) => r.states[0].metadata.entries[0].target++,
  'wrong callback currentTarget': (r) => r.states[0].metadata.entries[1].currentTarget++,
  'wrong native target': (r) => r.states[0].metadata.entries[0].nativeTarget++,
  'wrong target facade kind': (r) => (r.states[0].metadata.entries[0].targetKind = 'number'),
  'wrong actual native code': (r) => (r.states[0].metadata.entries[0].code = 'KeyA'),
  'cloned original event': (r) => r.states[0].metadata.entries[1].eventId++,
  'cloned original payload': (r) => r.states[0].metadata.entries[1].payloadId++,
  'missing editable provenance': (r) => (r.states[0].metadata.entries[0].editable = false),
  'composition delivered as command': (r) => (r.states[0].metadata.entries[0].composing = true),
  'canceled native delivery': (r) => (r.states[0].metadata.entries[0].canceled = true),
  'missing owned generation': (r) => (r.states[0].metadata.entries[0].keySequence = ''),
  'mismatched native generation': (r) =>
    (r.states[0].metadata.entries.at(-1).keySequence = 'different'),
  'reused down-up payload': (r) =>
    r.states[0].metadata.entries.filter((e) => e.phase === 'up').forEach((e) => (e.payloadId = 1)),
  'lost capture preventDefault': (r) => (r.states[18].metadata.entries[1].prevented = false),
  'lost capture stopPropagation': (r) => (r.states[36].metadata.entries[0].stopped = false),
};
for (const [name, mutate] of Object.entries(mutations))
  test('rejects ' + name, () => {
    const report = fixture();
    mutate(report);
    assert.throws(() => summarizeFormGroupEditor(output(report)));
  });
test('React input ref rebinding can retain the same actual native host', () => {
  const report = fixture();
  const ref = report.states[0].metadata.refs['stock-native-input'];
  ref.attached = 2;
  ref.cleaned = 1;
  assert.equal(summarizeFormGroupEditor(output(report)).status, 'passed');
});
test('enabled ordinary framework copies must remain separate from owned editable commands', () => {
  const report = fixture(true);
  report.states[12].metadata.entries[0].source = 'hardware';
  assert.throws(() => summarizeFormGroupEditor(output(report)));
});
test('failed reports retain safe diagnostics without passing incomplete evidence', () => {
  const report = fixture();
  report.status = 'failed';
  report.error = 'native assertion';
  report.screenshots = ['failure.png'];
  assert.equal(inspectFormGroupEditor(output(report, 0)).status, 'failed');
  assert.throws(() => summarizeFormGroupEditor(output(report, 0)));
});
test('ambiguous reports and failure trailers are rejected', () => {
  const text = output(fixture());
  assert.throws(() => inspectFormGroupEditor(text + text));
  for (const suffix of [
    'INSTRUMENTATION_CODE: -1\n',
    'INSTRUMENTATION_ABORTED: bad\n',
    'INSTRUMENTATION_RESULT: Error=bad\n',
  ])
    assert.throws(() => summarizeFormGroupEditor(text + suffix));
});

for (const failed of [false, true])
  test(
    'runner preserves editor diagnostics and restores the selected catalog; failed=' + failed,
    async (t) => {
      const folder = await mkdtemp(join(tmpdir(), 'mui-form-group-editor-test-'));
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
          scenario: 'form-group-editor',
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
      assert(calls.find((args) => args.includes('instrument')).includes('form-group-editor'));
      assert(calls.some((args) => args.includes('start')));
    },
  );

test('an original RN up-only baseline permits exactly forwarded up-only editor phases', () => {
  const report = fixture(true, ['up']);
  assert.equal(summarizeFormGroupEditor(output(report)).status, 'passed');
});
test('grouped down-up delivery remains visible when the independent RN baseline only receives up', () => {
  const report = fixture(true, ['up'], ['down', 'up']);
  assert.equal(summarizeFormGroupEditor(output(report)).status, 'passed');
});
test('missing grouped down that the independent RN baseline received remains unverified', () => {
  assert.throws(() => summarizeFormGroupEditor(output(fixture(true, ['down', 'up'], ['up']))));
});
for (const [name, mutate] of Object.entries({
  'missing independent RN baseline': (r) => delete r.frameworkBaseline,
  'wrong independent RN native input': (r) => r.frameworkBaseline.nativeInputId++,
  'baseline did not edit native text': (r) => (r.frameworkBaseline.nativeTextAfter = 'Rabat'),
  'baseline original native edit acknowledgement lost': (r) =>
    (r.states[0].metadata.baselineValue = 'Rabat'),
  'baseline lacks real up': (r) => (r.frameworkBaseline.phases = ['down']),
  'baseline duplicates phases': (r) => (r.frameworkBaseline.phases = ['up', 'up']),
  'baseline lost capture': (r) => (r.frameworkBaseline.metadata.entries[0].scope = 'bubble'),
  'baseline private MUI provenance': (r) =>
    (r.frameworkBaseline.metadata.entries[0].source = 'hardware'),
  'baseline cloned original payload': (r) => r.frameworkBaseline.metadata.entries[1].payloadId++,
}))
  test('rejects ' + name, () => {
    const report = fixture(true);
    mutate(report);
    assert.throws(() => summarizeFormGroupEditor(output(report)));
  });

test('a custom MUI input cannot substitute for the independent original RN native baseline', () => {
  const report = fixture(true);
  report.frameworkBaseline.nativeInputClass = 'com.altroo.muinativehost.AltrooMUITextInput';
  assert.throws(() => summarizeFormGroupEditor(output(report)));
});

test('native focus keyboard policy cannot be lost during editor updates', () => {
  const report = fixture();
  report.states[12].showSoftInputOnFocus = true;
  assert.throws(() => summarizeFormGroupEditor(output(report)));
});
