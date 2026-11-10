// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const kinds = ['native', 'host', 'stock', 'custom', 'styled'];
const policies = ['observe', 'prevent', 'stop'];
const keys = ['Enter', ' ', 'a'];
const pictures = policies.map((policy) => 'form-group-keyboard-' + policy + '.png');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const positive = (value) => Number.isInteger(value) && value > 0;
function requireEvidence(ok, message) {
  if (!ok) throw Error('Invalid native FormGroup keyboard evidence: ' + message);
}
/** Reject unsafe diagnostic paths even when native instrumentation failed. */
export function inspectFormGroupKeyboard(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: formGroupKeyboardReport=([^\r\n]+)\r?$/gm),
  ];
  if (matches.length !== 1) throw Error('No unambiguous native FormGroup keyboard report');
  const report = JSON.parse(matches[0][1]);
  requireEvidence(
    report?.schemaVersion === 1 &&
      report.scenario === 'form-group-keyboard-v1' &&
      report.driver === 'native Instrumentation and UiAutomation' &&
      ['passed', 'failed'].includes(report.status) &&
      /^cache\/mui-form-group-keyboard-\d+$/.test(report.artifactDirectory ?? '') &&
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
    'safe diagnostic metadata',
  );
  return report;
}
function checkReceipt(value, previous) {
  const ids = kinds.flatMap((kind) => [kind, kind + '-button']);
  requireEvidence(
    value?.schemaVersion === 1 &&
      value.ready === true &&
      policies.includes(value.policy) &&
      Array.isArray(value.entries) &&
      value.total === value.entries.length &&
      value.total <= 64,
    'complete bounded receipt',
  );
  const tags = ids.map((id) => value.nodes?.[id]);
  requireEvidence(
    tags.every(positive) && new Set(tags).size === ids.length,
    'ten distinct native hosts',
  );
  for (const id of ids)
    requireEvidence(same(value.refs?.[id], { attached: 1, cleaned: 0 }), 'retained ref ' + id);
  if (previous)
    requireEvidence(
      same(value.nodes, previous.nodes),
      'retained root and child tags across resets',
    );
}
function checkEvent(event, index, state, scope, phase) {
  requireEvidence(
    event?.sequence === index + 1 &&
      event.kind === state.kind &&
      event.key === state.key &&
      event.code === (state.key === ' ' ? 'Space' : state.key === 'a' ? 'KeyA' : 'Enter') &&
      event.scope === scope &&
      event.phase === phase &&
      positive(event.eventId) &&
      positive(event.payloadId) &&
      event.targetKind === 'object' &&
      event.target === state.buttonId &&
      event.currentTarget === (scope === 'root' ? state.rootId : state.buttonId) &&
      typeof event.prevented === 'boolean' &&
      typeof event.stopped === 'boolean',
    'ordered original event with native target/currentTarget',
  );
}
/** Check phase order and shared payloads, not only callback counts. */
function checkOwnedSequence(state) {
  const entries = state.metadata.entries;
  const expected = [];
  for (const phase of ['down', 'up']) {
    expected.push(['root', phase + '-capture']);
    if (
      !(
        state.policy === 'stop' &&
        state.key !== 'a' &&
        phase === (state.key === 'Enter' ? 'down' : 'up')
      )
    )
      expected.push(['button', phase], ['root', phase]);
  }
  requireEvidence(entries.length === expected.length, 'exact owned callback count');
  entries.forEach((event, index) => checkEvent(event, index, state, ...expected[index]));
  for (const phase of ['down', 'up']) {
    const group = entries.filter((event) => event.phase.startsWith(phase));
    const capture = group[0],
      child = group[1],
      bubble = group[2];
    const activation = state.key !== 'a' && phase === (state.key === 'Enter' ? 'down' : 'up');
    requireEvidence(
      group.every((event) => event.payloadId === capture.payloadId && event.source === 'hardware'),
      'one original native hardware payload per dispatch',
    );
    requireEvidence(
      capture.prevented === (activation && state.policy === 'prevent') &&
        capture.stopped === (activation && state.policy === 'stop'),
      'capture cancellation policy',
    );
    if (group.length === 3) {
      requireEvidence(
        capture.eventId === bubble.eventId && child.eventId !== capture.eventId,
        'same root event and distinct ButtonBase facade',
      );
      requireEvidence(
        !child.stopped &&
          !bubble.stopped &&
          child.prevented === capture.prevented &&
          bubble.prevented === (capture.prevented || (phase === 'down' && state.key !== 'a')),
        'cancellation survives actual child dispatch',
      );
    }
  }
  requireEvidence(
    entries[0].payloadId !== entries.find((event) => event.phase === 'up-capture').payloadId,
    'down and up are distinct native payloads',
  );
  requireEvidence(
    state.clicks === (state.policy === 'observe' && state.key !== 'a' ? 1 : 0),
    'one activation or actual capture cancellation',
  );
}
export function summarizeFormGroupKeyboard(output) {
  requireEvidence(
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length === 1 &&
      /^INSTRUMENTATION_CODE: -1\r?$/m.test(output) &&
      !/^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output),
    'native instrumentation completion',
  );
  const report = inspectFormGroupKeyboard(output);
  requireEvidence(
    report.status === 'passed' &&
      report.error == null &&
      same(report.gaps, []) &&
      Math.abs(report.device.fontScale - 1) < 0.01 &&
      typeof report.keyEventsEnabled === 'boolean',
    'native pass and actual runtime capability',
  );
  const names = policies.flatMap((policy) =>
    keys.flatMap((key) =>
      kinds.map((kind) => policy + '-' + kind + '-' + (key === ' ' ? 'Space' : key)),
    ),
  );
  requireEvidence(
    same(report.stages, names) &&
      same(report.screenshots, pictures) &&
      Array.isArray(report.states) &&
      same(
        report.states.map((state) => state?.name),
        names,
      ),
    'all forty-five native cases',
  );
  let previous;
  for (const [index, state] of report.states.entries()) {
    const kind = kinds[index % kinds.length],
      key = keys[Math.floor(index / kinds.length) % keys.length],
      policy = policies[Math.floor(index / (kinds.length * keys.length))];
    requireEvidence(
      state.kind === kind &&
        state.key === key &&
        state.policy === policy &&
        typeof state.rootClass === 'string' &&
        state.rootClass.length > 0,
      'native case identity',
    );
    checkReceipt(state.metadata, previous);
    requireEvidence(
      state.metadata.policy === policy &&
        state.rootId === state.metadata.nodes[kind] &&
        state.buttonId === state.metadata.nodes[kind + '-button'] &&
        same(
          state.parent,
          state.metadata.entries.filter((event) => event.scope === 'root'),
        ) &&
        same(
          state.child,
          state.metadata.entries.filter((event) => event.scope === 'button'),
        ) &&
        Number.isInteger(state.clicks) &&
        state.clicks === (state.metadata.clicks?.[kind] ?? 0) &&
        Object.keys(state.metadata.clicks).every((name) => name === kind),
      'actual host tags and complete reset receipt',
    );
    if (kind === 'native') {
      // The framework baseline is recorded separately. Its events are a different
      // transport from the ButtonBase child when framework key dispatch is enabled.
      requireEvidence(
        state.child.length === 2 && state.clicks === (key === 'a' ? 0 : 1),
        'native baseline child delivery',
      );
      for (const [offset, event] of state.metadata.entries.entries()) {
        requireEvidence(
          ['root', 'button'].includes(event.scope) &&
            (event.scope === 'button'
              ? ['down', 'up'].includes(event.phase)
              : ['down-capture', 'down', 'up-capture', 'up'].includes(event.phase)),
          'native baseline event scope and phase',
        );
        checkEvent(event, offset, state, event.scope, event.phase);
        if (event.scope === 'button')
          requireEvidence(event.source === 'hardware', 'native baseline child provenance');
      }
      requireEvidence(
        same(
          state.child.map((event) => event.phase),
          ['down', 'up'],
        ),
        'native baseline child sequence',
      );
      if (!report.keyEventsEnabled || (key !== 'a' && state.parent.length === 0)) {
        requireEvidence(state.parent.length === 0, 'disabled framework baseline');
      } else {
        const expected = [];
        for (const phase of ['down', 'up']) {
          expected.push(['root', phase + '-capture']);
          if (!(policy === 'stop' && key !== 'a' && phase === (key === 'Enter' ? 'down' : 'up')))
            expected.push(['root', phase]);
          expected.push(['button', phase]);
        }
        requireEvidence(
          state.metadata.entries.length === expected.length,
          'enabled framework baseline callback count',
        );
        state.metadata.entries.forEach((event, offset) =>
          checkEvent(event, offset, state, ...expected[offset]),
        );
        for (const phase of ['down', 'up']) {
          const events = state.metadata.entries.filter((event) => event.phase.startsWith(phase));
          const capture = events[0],
            child = events.at(-1);
          const activation = key !== 'a' && phase === (key === 'Enter' ? 'down' : 'up');
          requireEvidence(
            capture.source === null &&
              capture.prevented === (activation && policy === 'prevent') &&
              capture.stopped === (activation && policy === 'stop') &&
              child.source === 'hardware' &&
              child.payloadId !== capture.payloadId &&
              !child.prevented &&
              !child.stopped,
            'framework baseline and owned child are separate real transports',
          );
          if (events.length === 3) {
            const bubble = events[1];
            requireEvidence(
              bubble.source === null &&
                capture.eventId === bubble.eventId &&
                capture.payloadId === bubble.payloadId &&
                capture.prevented === bubble.prevented &&
                !bubble.stopped,
              'original framework capture and bubble payload',
            );
          }
        }
      }
    } else checkOwnedSequence(state);
    previous = state.metadata;
  }
  return report;
}
