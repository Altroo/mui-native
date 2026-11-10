// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const kinds = ['native', 'stock', 'custom', 'styled'];
const stages = ['ready', ...kinds, 'released'];
const pictures = ['form-group-events.png'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const positive = (value) => Number.isInteger(value) && value > 0;
function requireEvidence(ok, message) {
  if (!ok) throw Error('Invalid native FormGroup event evidence: ' + message);
}
/** Validate paths before retaining diagnostics from either successful or failed runs. */
export function inspectFormGroupEvents(output) {
  const matches = [
    ...output.matchAll(/^INSTRUMENTATION_RESULT: formGroupEventsReport=([^\r\n]+)\r?$/gm),
  ];
  if (matches.length !== 1) throw Error('No unambiguous native FormGroup event report');
  const report = JSON.parse(matches[0][1]);
  if (
    report?.schemaVersion !== 1 ||
    report.scenario !== 'form-group-events-v1' ||
    report.driver !== 'native Instrumentation and UiAutomation' ||
    !['passed', 'failed'].includes(report.status) ||
    !/^cache\/mui-form-group-events-\d+$/.test(report.artifactDirectory ?? '') ||
    !Number.isInteger(report.device?.sdk) ||
    report.device.sdk < 29 ||
    typeof report.device.model !== 'string' ||
    !report.device.model ||
    !Number.isFinite(report.device.density) ||
    report.device.density <= 0 ||
    !Number.isFinite(report.device.fontScale) ||
    report.device.fontScale <= 0 ||
    !Array.isArray(report.screenshots) ||
    new Set(report.screenshots).size !== report.screenshots.length ||
    !report.screenshots.every((name) => [...pictures, 'failure.png'].includes(name))
  )
    throw Error('Unsafe or incomplete native FormGroup event diagnostic metadata');
  return report;
}
function receipt(value, previous) {
  requireEvidence(
    value?.schemaVersion === 1 &&
      value.ready === true &&
      Number.isInteger(value.total) &&
      value.total >= 0 &&
      value.total <= 64 &&
      Array.isArray(value.entries) &&
      value.entries.length === value.total,
    'complete bounded receipt',
  );
  const tags = kinds.map((kind) => value.nodes?.[kind]);
  requireEvidence(
    tags.every(positive) && new Set(tags).size === kinds.length,
    'distinct actual native root tags',
  );
  for (const kind of kinds)
    requireEvidence(
      same(value.refs?.[kind], { attached: 1, cleaned: 0 }),
      'retained actual root ref ' + kind,
    );
  for (const [index, event] of value.entries.entries()) {
    const tag = value.nodes[event?.kind];
    requireEvidence(
      kinds.includes(event?.kind) &&
        event.sequence === index + 1 &&
        positive(event.eventId) &&
        ['focus', 'blur', 'key-down', 'key-up', 'accessibility'].includes(event.type) &&
        ['capture', 'bubble', 'direct'].includes(event.phase) &&
        event.target === tag &&
        event.currentTarget === tag &&
        event.expectedTarget === tag,
      'sequence and actual target for every callback',
    );
  }
  if (previous)
    requireEvidence(
      value.total >= previous.total &&
        same(value.nodes, previous.nodes) &&
        same(value.entries.slice(0, previous.total), previous.entries),
      'append-only history on original roots',
    );
}
function target(event, kind, type, phase, tag) {
  requireEvidence(
    event?.kind === kind &&
      event.type === type &&
      event.phase === phase &&
      event.target === tag &&
      event.currentTarget === tag &&
      event.expectedTarget === tag,
    'actual callback type/phase/target ' + kind + '/' + type,
  );
}
function pair(events, offset, kind, type, tag) {
  const capture = events[offset],
    bubble = events[offset + 1];
  target(capture, kind, type, 'capture', tag);
  target(bubble, kind, type, 'bubble', tag);
  // Pooled event objects may be reused between dispatches. Only the two phases
  // of this one dispatch must have the same observed object identity.
  requireEvidence(
    positive(capture.eventId) &&
      capture.eventId === bubble.eventId &&
      bubble.sequence === capture.sequence + 1,
    'ordered capture/bubble object identity',
  );
  if (['focus', 'blur'].includes(type))
    requireEvidence(
      capture.nativeTarget === tag && bubble.nativeTarget === tag,
      'native focus payload target',
    );
}
/** Verify dispatch without promoting disabled runtime key events to tested coverage. */
export function summarizeFormGroupEvents(output) {
  if (
    [...output.matchAll(/^INSTRUMENTATION_CODE:/gm)].length !== 1 ||
    !/^INSTRUMENTATION_CODE: -1\r?$/m.test(output) ||
    /^INSTRUMENTATION_(FAILED|ABORTED|RESULT: (Error|shortMsg)=|STATUS_CODE: -2)/m.test(output)
  )
    throw Error('Missing or failed native FormGroup event instrumentation');
  const report = inspectFormGroupEvents(output);
  requireEvidence(report.status === 'passed' && report.error == null, 'native completion');
  requireEvidence(
    Math.abs(report.device.fontScale - 1) < 0.01 && typeof report.keyEventsEnabled === 'boolean',
    'actual OS scale and native key capability',
  );
  requireEvidence(
    same(report.stages, stages) &&
      same(report.screenshots, pictures) &&
      Array.isArray(report.states) &&
      same(
        report.states.map((state) => state?.name),
        kinds,
      ),
    'complete states/screenshots',
  );
  receipt(report.baseline);
  let previous = report.baseline;
  for (const [index, state] of report.states.entries()) {
    const kind = kinds[index],
      tag = previous.nodes[kind];
    requireEvidence(
      state.nativeId === tag &&
        typeof state.nativeClass === 'string' &&
        state.nativeClass.length > 0 &&
        ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(state.bounds?.[key])) &&
        state.bounds.width > 0 &&
        state.bounds.height > 0,
      'actual native root/frame ' + kind,
    );
    receipt(state.metadata, previous);
    requireEvidence(
      Array.isArray(state.focus) &&
        state.focus.length === (index === 0 ? 2 : 4) &&
        Array.isArray(state.input) &&
        state.input.length === (report.keyEventsEnabled ? 5 : 1) &&
        same(state.metadata.entries.slice(previous.total), [...state.focus, ...state.input]),
      'complete controlled callback sequence ' + kind,
    );
    if (index > 0) pair(state.focus, 0, kinds[index - 1], 'blur', previous.nodes[kinds[index - 1]]);
    pair(state.focus, index === 0 ? 0 : 2, kind, 'focus', tag);
    if (report.keyEventsEnabled) {
      pair(state.input, 0, kind, 'key-down', tag);
      pair(state.input, 2, kind, 'key-up', tag);
      for (const event of state.input.slice(0, 4))
        requireEvidence(
          event.key === 'a' &&
            event.code === 'KeyA' &&
            ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'].every((name) => event[name] === false),
          'actual native key/modifiers',
        );
    }
    const action = state.input.at(-1);
    target(action, kind, 'accessibility', 'direct', tag);
    requireEvidence(action.actionName === 'inspect', 'actual custom accessibility action');
    previous = state.metadata;
  }
  receipt(report.released, previous);
  requireEvidence(
    Array.isArray(report.release) &&
      report.release.length === 2 &&
      same(report.released.entries.slice(previous.total), report.release),
    'final native blur without remount',
  );
  pair(report.release, 0, 'styled', 'blur', previous.nodes.styled);
  return report;
}
