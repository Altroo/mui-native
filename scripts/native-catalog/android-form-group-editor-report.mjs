// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
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
const ids = [
  ...controls.flatMap((control) => ['', '-input', '-owner'].map((suffix) => control + suffix)),
  'baseline',
  'baseline-input',
];
const pictures = [
  'form-group-editor-baseline.png',
  ...policies.map((policy) => 'form-group-editor-' + policy + '.png'),
];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const positive = (value) => Number.isInteger(value) && value > 0;
function requireEvidence(value, message) {
  if (!value) throw Error('Invalid native FormGroup editor evidence: ' + message);
}
export function inspectFormGroupEditor(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: formGroupEditorReport=([^\r\n]+)\r?$/gm),
  ];
  requireEvidence(matches.length === 1, 'one unambiguous native report');
  const report = JSON.parse(matches[0][1]);
  requireEvidence(
    report?.schemaVersion === 1 &&
      report.scenario === 'form-group-editor-v1' &&
      report.driver === 'native Instrumentation and UiAutomation' &&
      ['passed', 'failed'].includes(report.status) &&
      /^cache\/mui-form-group-editor-\d+$/.test(report.artifactDirectory ?? '') &&
      Number.isInteger(report.device?.sdk) &&
      report.device.sdk >= 29 &&
      typeof report.device.model === 'string' &&
      report.device.model.length > 0 &&
      Number.isFinite(report.device.fontScale) &&
      report.device.fontScale > 0 &&
      Number.isFinite(report.device.density) &&
      report.device.density > 0 &&
      Array.isArray(report.screenshots) &&
      new Set(report.screenshots).size === report.screenshots.length &&
      report.screenshots.every((name) => [...pictures, 'failure.png'].includes(name)),
    'safe native diagnostics',
  );
  return report;
}
function receipt(value, initial, scale) {
  requireEvidence(
    value?.schemaVersion === 1 &&
      value.ready === true &&
      Number.isInteger(value.total) &&
      value.total >= 0 &&
      value.total <= 64 &&
      Array.isArray(value.entries) &&
      value.total === value.entries.length &&
      same(Object.keys(value.nodes ?? {}).sort(), [...ids].sort()) &&
      same(Object.keys(value.refs ?? {}).sort(), [...ids].sort()) &&
      Number.isFinite(value.fontScale) &&
      Math.abs(value.fontScale - scale) < 0.01,
    'complete bounded receipt and actual OS scale',
  );
  const tags = ids.map((id) => value.nodes[id]);
  requireEvidence(
    tags.every(positive) && new Set(tags).size === 20,
    'twenty distinct native hosts',
  );
  if (initial) requireEvidence(same(value.nodes, initial.nodes), 'retained native hosts');
  for (const id of ids) {
    const ref = value.refs[id];
    requireEvidence(
      positive(ref?.attached) &&
        Number.isInteger(ref.cleaned) &&
        ref.cleaned === ref.attached - 1 &&
        (id.endsWith('-input') || ref.attached === 1),
      'one live ref per host',
    );
  }
  requireEvidence(
    value.focused === null || tags.includes(value.focused),
    'known observed focus or null',
  );
  for (const property of ['values', 'submissions'])
    requireEvidence(
      value[property] &&
        typeof value[property] === 'object' &&
        !Array.isArray(value[property]) &&
        Object.keys(value[property]).every((id) => controls.includes(id)),
      'bounded observed state ' + property,
    );
  requireEvidence(
    Object.values(value.values).every((value) => typeof value === 'string'),
    'native observed text values',
  );
}
export function summarizeFormGroupEditor(output) {
  requireEvidence(
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length === 1 &&
      /^INSTRUMENTATION_CODE: -1\r?$/m.test(output) &&
      !/^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output),
    'native command completion',
  );
  const report = inspectFormGroupEditor(output);
  const names = policies.flatMap((policy) =>
    keys.flatMap((key) => controls.map((control) => policy + '-' + control + '-' + key)),
  );
  requireEvidence(
    report.status === 'passed' &&
      report.device.sdk >= 30 &&
      report.error == null &&
      same(report.gaps, []) &&
      typeof report.keyEventsEnabled === 'boolean' &&
      same(report.screenshots, pictures) &&
      same(report.stages, ['ready', 'framework-baseline', ...names]) &&
      Array.isArray(report.states) &&
      same(
        report.states.map((state) => state?.name),
        names,
      ),
    'all54 native cases and explicit runtime flag',
  );
  receipt(report.initial, null, report.device.fontScale);
  requireEvidence(
    report.initial.total === 0 &&
      same(report.initial.values, {}) &&
      same(report.initial.submissions, {}) &&
      report.initial.policy === 'observe' &&
      report.initial.baselineValue === 'Rabat',
    'empty initial native observations',
  );
  const baseline = report.frameworkBaseline;
  requireEvidence(
    baseline &&
      baseline.nativeInputClass === 'com.facebook.react.views.textinput.ReactEditText' &&
      baseline.nativeFocused === true &&
      baseline.showSoftInputOnFocus === false &&
      baseline.nativeTextBefore === 'Rabat' &&
      baseline.nativeTextAfter === 'Rabata' &&
      Array.isArray(baseline.phases),
    'independent original RN native editing/focus',
  );
  receipt(baseline.metadata, report.initial, report.device.fontScale);
  requireEvidence(
    baseline.nativeInputId === baseline.metadata.nodes['baseline-input'] &&
      baseline.nativeRootId === baseline.metadata.nodes.baseline &&
      baseline.metadata.focused === baseline.nativeInputId &&
      baseline.metadata.baselineValue === 'Rabata' &&
      same(baseline.metadata.values, {}) &&
      same(baseline.metadata.submissions, {}),
    'actual original RN baseline tags and observations',
  );
  requireEvidence(
    report.keyEventsEnabled
      ? same(baseline.phases, ['up']) || same(baseline.phases, ['down', 'up'])
      : same(baseline.phases, []),
    'unique actual original RN phases with enabled key-up',
  );
  const baselineExpected = baseline.phases.flatMap((phase) => [
    ['capture', phase],
    ['bubble', phase],
  ]);
  requireEvidence(
    baseline.metadata.entries.length === baselineExpected.length,
    'complete original RN capture/bubble pairs',
  );
  for (const [index, event] of baseline.metadata.entries.entries()) {
    const [scope, phase] = baselineExpected[index];
    requireEvidence(
      event.control === 'baseline' &&
        event.scope === scope &&
        event.phase === phase &&
        event.sequence === index + 1 &&
        event.key === 'a' &&
        event.code === 'KeyA' &&
        event.source === null &&
        event.targetKind === 'object' &&
        event.target === baseline.nativeInputId &&
        event.nativeTarget === baseline.nativeInputId &&
        event.currentTarget === baseline.nativeRootId &&
        positive(event.eventId) &&
        positive(event.payloadId) &&
        event.prevented === false &&
        event.stopped === false,
      'independent original RN callback provenance and actual targets',
    );
    if (index % 2) {
      const capture = baseline.metadata.entries[index - 1];
      requireEvidence(
        event.eventId === capture.eventId && event.payloadId === capture.payloadId,
        'original RN baseline capture/bubble identity',
      );
    }
  }
  if (baseline.phases.length === 2)
    requireEvidence(
      baseline.metadata.entries[0].payloadId !== baseline.metadata.entries[2].payloadId,
      'original RN down/up payload separation',
    );
  const text = Object.fromEntries(controls.map((control) => [control, 'Rabat']));
  const observed = {},
    generations = new Set();
  for (const [index, state] of report.states.entries()) {
    const control = controls[index % controls.length],
      key = keys[Math.floor(index / controls.length) % keys.length],
      policy = policies[Math.floor(index / (controls.length * keys.length))],
      value = state.metadata;
    receipt(value, report.initial, report.device.fontScale);
    requireEvidence(value.baselineValue === 'Rabata', 'retain independent baseline native edit');
    const before = text[control],
      after = before + (key === 'a' ? 'a' : '');
    text[control] = after;
    if (key === 'a') observed[control] = after;
    requireEvidence(
      same(value.values, observed),
      'exact cumulative native text acknowledgement history',
    );
    requireEvidence(
      state.control === control &&
        state.key === key &&
        state.policy === policy &&
        value.policy === policy &&
        state.nativeInputId === value.nodes[control + '-input'] &&
        state.nativeRootId === value.nodes[control] &&
        state.nativeOwnerId === value.nodes[control + '-owner'] &&
        state.nativeFocused === true &&
        state.showSoftInputOnFocus === false &&
        value.focused === state.nativeInputId &&
        state.nativeTextBefore === before &&
        state.nativeTextAfter === after &&
        same(value.submissions, {}) &&
        (key !== 'a' || value.values[control] === after),
      'independent actual editor identity/focus/text and no submission',
    );
    for (const [id, observed] of Object.entries(value.values))
      requireEvidence(
        observed === text[id],
        'observed value agrees with actual native edit history',
      );
    const claimed = key !== 'a',
      stopped = claimed && policy === 'stop',
      prevented = claimed && policy === 'prevent',
      expected = [];
    const inputPhases = claimed
      ? ['down', 'up']
      : report.keyEventsEnabled
        ? value.entries.filter((event) => event.scope === 'input').map((event) => event.phase)
        : [];
    if (!claimed && report.keyEventsEnabled)
      requireEvidence(
        (same(inputPhases, ['up']) || same(inputPhases, ['down', 'up'])) &&
          (!baseline.phases.includes('down') || inputPhases.includes('down')),
        'positive ordinary input key-up and retained baseline key-down capability',
      );
    for (const phase of inputPhases) {
      if (claimed) {
        expected.push(['capture', phase]);
        if (!stopped) expected.push(['input', phase], ['owner', phase], ['bubble', phase]);
      } else if (report.keyEventsEnabled) {
        if (!control.startsWith('custom')) expected.push(['capture', phase]);
        expected.push(['input', phase]);
        if (!control.startsWith('custom')) expected.push(['bubble', phase]);
      }
    }
    requireEvidence(value.entries.length === expected.length, 'exact editable callback count');
    const phases = new Map();
    let generation;
    for (const [offset, event] of value.entries.entries()) {
      const [scope, phase] = expected[offset];
      requireEvidence(
        event.sequence === offset + 1 &&
          event.control === control &&
          event.scope === scope &&
          event.phase === phase &&
          event.key === key &&
          event.code === (key === 'a' ? 'KeyA' : key) &&
          event.targetKind === 'object' &&
          event.target === state.nativeInputId &&
          event.nativeTarget === state.nativeInputId &&
          event.currentTarget ===
            (scope === 'input'
              ? state.nativeInputId
              : scope === 'owner'
                ? state.nativeOwnerId
                : state.nativeRootId) &&
          positive(event.eventId) &&
          positive(event.payloadId) &&
          event.prevented === prevented &&
          event.stopped === stopped,
        'original editable callback order, target and cancellation',
      );
      const first = phases.get(phase);
      if (!first) phases.set(phase, event);
      else
        requireEvidence(
          event.eventId === first.eventId && event.payloadId === first.payloadId,
          'same original event/payload per dispatch',
        );
      if (claimed) {
        requireEvidence(
          event.source === 'hardware' &&
            event.editable === true &&
            event.composing === false &&
            event.canceled === false &&
            typeof event.keySequence === 'string' &&
            event.keySequence.length > 0,
          'owned editable native provenance',
        );
        if (generation === undefined) generation = event.keySequence;
        requireEvidence(event.keySequence === generation, 'same native down/up generation');
      } else requireEvidence(event.source === null, 'separate ordinary framework transport');
    }
    if (claimed) {
      requireEvidence(
        !generations.has(generation),
        'distinct physical native generations across cases',
      );
      generations.add(generation);
    }
    if (phases.has('down') && phases.has('up'))
      requireEvidence(
        phases.get('down').payloadId !== phases.get('up').payloadId,
        'distinct down/up payloads',
      );
  }
  return report;
}
