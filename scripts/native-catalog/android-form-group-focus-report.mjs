// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const kinds = ['native', 'host', 'stock', 'custom', 'styled'];
const ids = kinds.flatMap((kind) => [kind, kind + '-button']);
const pictures = [...kinds, 'released'].map((kind) => 'form-group-focus-' + kind + '.png');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const positive = (value) => Number.isInteger(value) && value > 0;
function requireEvidence(ok, message) {
  if (!ok) throw Error('Invalid native FormGroup focus evidence: ' + message);
}
export function inspectFormGroupFocus(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: formGroupFocusReport=([^\r\n]+)\r?$/gm),
  ];
  if (matches.length !== 1) throw Error('No unambiguous native FormGroup focus report');
  const report = JSON.parse(matches[0][1]);
  requireEvidence(
    report?.schemaVersion === 1 &&
      report.scenario === 'form-group-focus-v1' &&
      report.driver === 'native Instrumentation and UiAutomation' &&
      ['passed', 'failed'].includes(report.status) &&
      /^cache\/mui-form-group-focus-\d+$/.test(report.artifactDirectory ?? '') &&
      Number.isInteger(report.device?.sdk) &&
      report.device.sdk >= 29 &&
      typeof report.device.model === 'string' &&
      report.device.model.length > 0 &&
      Number.isFinite(report.device.density) &&
      report.device.density > 0 &&
      Number.isFinite(report.device.fontScale) &&
      report.device.fontScale > 0 &&
      Array.isArray(report.screenshots) &&
      new Set(report.screenshots).size === report.screenshots.length &&
      report.screenshots.every((name) => [...pictures, 'failure.png'].includes(name)),
    'safe native diagnostic metadata',
  );
  return report;
}
function receipt(value, initial, previous) {
  requireEvidence(
    value?.schemaVersion === 1 &&
      value.ready === true &&
      (value.focused === null || positive(value.focused)) &&
      Number.isInteger(value.total) &&
      value.total >= 0 &&
      value.total <= 64 &&
      Array.isArray(value.entries) &&
      value.entries.length === value.total &&
      same(Object.keys(value.nodes ?? {}).sort(), [...ids].sort()) &&
      same(Object.keys(value.refs ?? {}).sort(), [...ids].sort()) &&
      Number.isFinite(value.fontScale) &&
      value.fontScale > 0,
    'complete bounded receipt',
  );
  const tags = ids.map((id) => value.nodes[id]);
  requireEvidence(
    tags.every(positive) && new Set(tags).size === 10,
    'ten distinct actual host tags',
  );
  for (const id of ids)
    requireEvidence(same(value.refs[id], { attached: 1, cleaned: 0 }), 'retained ref ' + id);
  if (initial)
    requireEvidence(
      same(value.nodes, initial.nodes) && value.fontScale === initial.fontScale,
      'unchanged tags and actual font scale',
    );
  if (previous)
    requireEvidence(
      value.total >= previous.total &&
        same(value.entries.slice(0, previous.total), previous.entries),
      'append-only native history',
    );
  for (const [index, event] of value.entries.entries()) {
    requireEvidence(
      kinds.includes(event?.kind) &&
        ['focus', 'blur'].includes(event.type) &&
        ['capture', 'child', 'bubble'].includes(event.phase) &&
        event.sequence === index + 1 &&
        positive(event.eventId) &&
        positive(event.payloadId) &&
        event.targetKind === 'object' &&
        event.target === value.nodes[event.kind + '-button'] &&
        event.nativeTarget === event.target &&
        event.currentTarget ===
          value.nodes[event.kind + (event.phase === 'child' ? '-button' : '')],
      'original callback and native target/currentTarget',
    );
  }
}
function ownedPair(events, type) {
  requireEvidence(
    events.length === 3 &&
      same(
        events.map((event) => event.type + '/' + event.phase),
        [type + '/capture', type + '/child', type + '/bubble'],
      ) &&
      events.every(
        (event) =>
          event.focusSource === 'owned' &&
          event.eventId === events[0].eventId &&
          event.payloadId === events[0].payloadId,
      ),
    'ordered original owned focus payload across root and child',
  );
}
function frame(value) {
  return (
    value &&
    ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(value[key])) &&
    value.width > 0 &&
    value.height > 0
  );
}
export function summarizeFormGroupFocus(output) {
  requireEvidence(
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length === 1 &&
      /^INSTRUMENTATION_CODE: -1\r?$/m.test(output) &&
      !/^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output),
    'native command completion',
  );
  const report = inspectFormGroupFocus(output);
  requireEvidence(
    report.status === 'passed' &&
      report.error == null &&
      same(report.gaps, []) &&
      same(report.screenshots, pictures) &&
      same(report.stages, ['ready', ...kinds, 'released', 'cleared']) &&
      Array.isArray(report.states) &&
      same(
        report.states.map((state) => state?.kind),
        kinds,
      ),
    'all focus states and native completion',
  );
  receipt(report.initial);
  requireEvidence(
    report.initial.total === 0 && same(report.initial.requests, {}),
    'empty initial state',
  );
  requireEvidence(
    Math.abs(report.initial.fontScale - report.device.fontScale) < 0.01,
    'actual OS font scale',
  );
  let previous = report.initial;
  for (const [index, state] of report.states.entries()) {
    const kind = kinds[index],
      value = state.metadata;
    receipt(value, report.initial, previous);
    requireEvidence(
      state.name === kind &&
        state.nativeRootId === value.nodes[kind] &&
        state.nativeChildId === value.nodes[kind + '-button'] &&
        state.nativeFocused === true &&
        value.focused === state.nativeChildId &&
        frame(state.rootFrame) &&
        frame(state.childFrame) &&
        same(
          value.requests,
          Object.fromEntries(kinds.slice(0, index + 1).map((name) => [name, 1])),
        ),
      'actual independent focused child and one ref request',
    );
    previous = value;
  }
  receipt(report.released, report.initial, previous);
  requireEvidence(
    same(report.released.requests, previous.requests) &&
      same(report.releasedNativeFocusedChildren, []) &&
      !ids.some((id) => report.released.focused === report.initial.nodes[id]),
    'no observed native child retains focus',
  );
  for (const kind of kinds) {
    const events = report.released.entries.filter((event) => event.kind === kind),
      child = events.filter((event) => event.phase === 'child');
    requireEvidence(
      same(
        child.map((event) => event.type),
        ['focus', 'blur'],
      ) && child.every((event) => event.focusSource === 'owned'),
      'actual native child focus and blur',
    );
    if (kind === 'native') {
      // The Android baseline must demonstrate the ordinary framework copies
      // that the owned adapter filters, separately from the child's MUI event.
      const parent = events.filter((event) => event.phase !== 'child');
      requireEvidence(
        parent.length === 4 && parent.every((event) => event.focusSource === null),
        'real framework focus baseline',
      );
      for (const type of ['focus', 'blur']) {
        const pair = parent.filter((event) => event.type === type),
          own = child.find((event) => event.type === type);
        requireEvidence(
          same(
            pair.map((event) => event.phase),
            ['capture', 'bubble'],
          ) &&
            pair[0].eventId === pair[1].eventId &&
            pair[0].payloadId === pair[1].payloadId &&
            pair[0].payloadId !== own.payloadId,
          'separate framework capture/bubble payload',
        );
      }
    } else {
      requireEvidence(events.length === 6, 'no duplicate owned focus callbacks');
      ownedPair(events.slice(0, 3), 'focus');
      ownedPair(events.slice(3), 'blur');
      requireEvidence(
        events[0].payloadId !== events[3].payloadId,
        'distinct focus and blur payloads',
      );
    }
  }
  receipt(report.cleared, report.initial);
  requireEvidence(
    report.cleared.total === 0 &&
      same(report.cleared.requests, report.released.requests) &&
      same(report.clearedNativeFocusedChildren, []) &&
      !ids.some((id) => report.cleared.focused === report.initial.nodes[id]),
    'clear retains state and releases observed focus',
  );
  return report;
}
