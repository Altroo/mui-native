// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { isDeepStrictEqual } from 'node:util';
// Independent authored inputs. These are not metadata-derived native geometry.
export const structureInputs = Object.freeze(
  [
    { name: 'initial', order: ['target', 'a', 'b'], width: 40 },
    { name: 'zero-tail', order: ['target', 'a', 'b', 'c'], width: 40 },
    { name: 'pure-reorder', order: ['b', 'a', 'c', 'target'], width: 40 },
    { name: 'hidden-tail', order: ['b', 'a', 'c', 'target', 'hidden'], width: 40 },
    { name: 'remove-hidden', order: ['b', 'a', 'c', 'target'], width: 40 },
    { name: 'layout-only', order: ['b', 'a', 'c', 'target'], width: 48 },
    { name: 'restored', order: ['target', 'a', 'b'], width: 40 },
  ].map((input) => Object.freeze({ ...input, order: Object.freeze(input.order) })),
);
export const structurePictures = Object.freeze([
  ...structureInputs.map((x) => x.name + '.png'),
  'final-stopped.png',
]);
const record = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const integer = (x, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(x) && x >= min && x <= max;
const finite = (x) => typeof x === 'number' && Number.isFinite(x);
const ensure = (ok, message) => {
  if (!ok) throw Error('Invalid native structure evidence: ' + message);
};
const rect = (x) =>
  record(x) &&
  ['x', 'y', 'width', 'height'].every((k) => finite(x[k]) && Math.abs(x[k]) <= 1e6) &&
  x.width > 0 &&
  x.height > 0;
function diagnostics(metadata, active) {
  const value = metadata.nativeDiagnostics;
  ensure(
    record(value) &&
      metadata.active === active &&
      Array.isArray(metadata.errors) &&
      metadata.errors.length === 0 &&
      metadata.error === undefined,
    'active/error state',
  );
  for (const key of ['connected', 'commitHookRegistered', 'mountHookRegistered'])
    ensure(value[key] === active, 'owned hook ' + key);
  ensure(
    value.subscriptions === (active ? 1 : 0) &&
      value.observedRoots === (active ? 1 : 0) &&
      value.pendingRecords === 0 &&
      value.notificationPending === false,
    'owned subscription/pending diagnostics',
  );
}
function metadata(value, stage, active) {
  const expected = structureInputs[stage];
  ensure(
    record(value) &&
      value.schemaVersion === 1 &&
      value.scenario === 'native-structure-observation-probe-v1' &&
      value.stage === stage &&
      integer(value.request, 1) &&
      integer(value.targetLayouts, 1),
    'current scene identity/request/layout',
  );
  ensure(isDeepStrictEqual(value.authored, expected), 'authored state');
  diagnostics(value, active);
  const actual = value.actual;
  ensure(
    record(actual) &&
      actual.parentMatchesForwardedRef === true &&
      actual.targetIsCanonicalChild === true &&
      isDeepStrictEqual(actual.order, expected.order) &&
      actual.count === expected.order.length &&
      actual.index === expected.order.indexOf('target'),
    'canonical logical public-ref order',
  );
  const target = value.leases?.target;
  ensure(
    record(target) &&
      integer(target.attached, 1, 1e6) &&
      integer(target.cleaned, 0, 1e6) &&
      target.attached - target.cleaned === 1,
    'retained target lease',
  );
  ensure(Array.isArray(value.events) && value.events.length <= 128, 'bounded event history');
  let revision = 0,
    id;
  for (const event of value.events) {
    ensure(
      record(event) &&
        integer(event.subscriptionId, 1) &&
        integer(event.revision, 1) &&
        event.revision > revision &&
        event.lease === 'structure-probe:1' &&
        event.closed === false &&
        integer(event.committedStage, 0, stage),
      'native retained lease/revision',
    );
    id ??= event.subscriptionId;
    ensure(event.subscriptionId === id, 'one subscription identity');
    revision = event.revision;
  }
  if (active) ensure(value.events.length > 0, 'active initial notification');
  return { target, revision, id };
}
function frame(value, stage, density, baseline) {
  ensure(
    record(value) &&
      integer(value.targetId, -2147483648, 2147483647) &&
      value.targetId !== 0 &&
      integer(value.parentId, -2147483648, 2147483647) &&
      value.parentId !== 0 &&
      typeof value.targetClass === 'string' &&
      value.targetClass.length > 0 &&
      typeof value.parentClass === 'string' &&
      value.parentClass.length > 0 &&
      rect(value.targetFrame) &&
      rect(value.parentFrame),
    'actual native identities/frames',
  );
  if (baseline)
    for (const key of ['targetId', 'parentId', 'targetClass', 'parentClass'])
      ensure(value[key] === baseline[key], 'retained native ' + key);
  const near = (actual, expected) =>
    ensure(
      Math.abs(actual - expected) * density <= 1.01,
      'authored native frame with one physical-pixel rounding',
    );
  near(value.targetFrame.width, structureInputs[stage].width);
  near(value.targetFrame.height, 40);
  near(value.parentFrame.width, 240);
  near(value.parentFrame.height, 120);
  near(value.targetFrame.x, value.parentFrame.x);
  near(value.targetFrame.y, value.parentFrame.y);
}
/** Failed reports may supply safe diagnostics, but do not gain a pass here. */
export function inspectStructureReport(output) {
  ensure(typeof output === 'string', 'instrumentation output');
  const packets = [...output.matchAll(/^INSTRUMENTATION_RESULT: structureReport=([^\r\n]+)\r?$/gm)];
  ensure(packets.length === 1, 'one unambiguous report');
  const value = JSON.parse(packets[0][1]);
  ensure(
    record(value) &&
      value.schemaVersion === 1 &&
      value.scenario === 'structure-native-observation-v1' &&
      value.driver === 'native Instrumentation and UiAutomation' &&
      ['passed', 'failed'].includes(value.status),
    'report identity',
  );
  ensure(
    typeof value.artifactDirectory === 'string' &&
      /^cache\/mui-structure-\d{1,20}$/.test(value.artifactDirectory) &&
      !/[\r\n]/.test(value.artifactDirectory),
    'safe artifact directory',
  );
  ensure(
    Array.isArray(value.screenshots) &&
      value.screenshots.length <= 9 &&
      new Set(value.screenshots).size === value.screenshots.length &&
      value.screenshots.every((x) => [...structurePictures, 'failure.png'].includes(x)),
    'safe screenshots',
  );
  const device = value.device;
  ensure(
    record(device) &&
      device.package === 'dev.altroo.muinative.catalog' &&
      integer(device.sdk, 29, 100) &&
      finite(device.density) &&
      device.density >= 0.25 &&
      device.density <= 16 &&
      finite(device.fontScale) &&
      device.fontScale > 0 &&
      device.fontScale <= 5,
    'actual device bounds',
  );
  return value;
}
/** Logical ref order and independently sampled native frames, not a CSS/paint proof. */
export function summarizeStructure(output) {
  const value = inspectStructureReport(output);
  ensure(
    [...output.matchAll(/^INSTRUMENTATION_CODE:\s*(-?\d+)\s*$/gm)].length === 1 &&
      /^INSTRUMENTATION_CODE:\s*-1\s*$/m.test(output) &&
      !/^INSTRUMENTATION_(?:FAILED|ABORTED):/m.test(output) &&
      !/^INSTRUMENTATION_RESULT: shortMsg=/m.test(output) &&
      value.status === 'passed' &&
      value.error === undefined,
    'completed native instrumentation',
  );
  ensure(
    isDeepStrictEqual(
      value.stages,
      structureInputs.map((x) => x.name),
    ) &&
      Array.isArray(value.states) &&
      value.states.length === 7 &&
      isDeepStrictEqual(value.screenshots, structurePictures),
    'complete finite stages/pictures',
  );
  metadata(value.idle, 0, false);
  ensure(value.idle.events.length === 0, 'idle has no notifications');
  let request = value.idle.request,
    previous,
    baseline,
    baselineFrame;
  for (let stage = 0; stage < 7; stage++) {
    const sample = value.states[stage],
      expected = structureInputs[stage];
    ensure(record(sample) && sample.name === expected.name, 'stage name');
    const m = sample.metadata,
      checked = metadata(m, stage, true);
    ensure(m.request > request, 'fresh explicit request');
    request = m.request;
    frame(sample.native, stage, value.device.density, baselineFrame);
    if (!baseline) {
      baseline = m;
      baselineFrame = sample.native;
      ensure(
        isDeepStrictEqual(m.leases.target, value.idle.leases.target),
        'initial ref lease retained through registration',
      );
      ensure(m.events.length === 1 && checked.revision === 1, 'initial native revision1');
    } else {
      ensure(
        isDeepStrictEqual(m.leases.target, baseline.leases.target),
        'retained target ref counts',
      );
      ensure(
        isDeepStrictEqual(m.events.slice(0, previous.events.length), previous.events),
        'immutable history prefix',
      );
      if (stage === 5)
        ensure(
          m.events.length === previous.events.length &&
            checked.revision === previous.events.at(-1).revision &&
            m.targetLayouts > previous.targetLayouts,
          'layout-only acknowledgment without dirty event',
        );
      else {
        ensure(
          m.events.length > previous.events.length &&
            checked.revision > previous.events.at(-1).revision,
          'fresh structural dirty hint',
        );
        if (stage < 5)
          ensure(m.targetLayouts === baseline.targetLayouts, 'structure without target onLayout');
        else
          ensure(m.targetLayouts > previous.targetLayouts, 'restored width layout acknowledgment');
      }
    }
    ensure(
      m.events.at(-1).committedStage === (stage === 5 ? 4 : stage),
      'current structural callback stage',
    );
    previous = m;
  }
  for (const stopped of [value.stopped, value.finalStopped?.metadata]) {
    metadata(stopped, 6, false);
    ensure(stopped.request > request, 'fresh stopped request');
    request = stopped.request;
    ensure(
      isDeepStrictEqual(stopped.events, previous.events) &&
        isDeepStrictEqual(stopped.leases.target, baseline.leases.target) &&
        stopped.targetLayouts === previous.targetLayouts,
      'no callbacks/ref/layout changes after stop',
    );
  }
  frame(value.finalStopped.native, 6, value.device.density, baselineFrame);
  ensure(
    record(value.cleanup) &&
      value.cleanup.observedStopped === true &&
      value.cleanup.error === undefined,
    'confirmed cleanup',
  );
  return value;
}
