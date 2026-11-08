// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import {
  structureInputs,
  structurePictures,
  inspectStructureReport,
  summarizeStructure,
} from './android-structure-report.mjs';
import { prepareStructureSource } from './android-structure-source.mjs';
import { run } from './android-popper.mjs';
const require = createRequire(import.meta.url);
const { parseSync: parse } = require('@babel/core');
function fixture(watchMode = 'siblings') {
  let events = [],
    revision = 0;
  const diagnostics = (active) => ({
    connected: active,
    commitHookRegistered: active,
    mountHookRegistered: active,
    subscriptions: active ? 1 : 0,
    observedRoots: active ? 1 : 0,
    pendingRecords: 0,
    notificationPending: false,
  });
  const metadata = (stage, request, active, layouts) => ({
    schemaVersion: 1,
    scenario: 'native-structure-observation-probe-v1',
    watchMode,
    stage,
    request,
    authored: structuredClone(structureInputs[stage]),
    active,
    targetLayouts: layouts,
    actual: {
      parentMatchesForwardedRef: true,
      targetIsCanonicalChild: true,
      order: [...structureInputs[stage].order],
      count: structureInputs[stage].order.length,
      index: structureInputs[stage].order.indexOf('target'),
    },
    leases: { target: { attached: 2, cleaned: 1 } },
    events: structuredClone(events),
    nativeDiagnostics: diagnostics(active),
    errors: [],
  });
  const native = (stage) => ({
    targetId: 11,
    parentId: 12,
    targetClass: 'com.facebook.react.views.view.ReactViewGroup',
    parentClass: 'com.facebook.react.views.view.ReactViewGroup',
    targetFrame: { x: 10, y: 200, width: structureInputs[stage].width, height: 40 },
    parentFrame: { x: 10, y: 200, width: 240, height: 120 },
  });
  const idle = metadata(0, 1, false, 1);
  const states = structureInputs.map((input, stage) => {
    if (stage !== 5)
      events.push({
        subscriptionId: 1,
        lease: 'structure-probe:1',
        revision: ++revision,
        closed: false,
        committedStage: stage,
      });
    return {
      name: input.name,
      metadata: metadata(stage, stage + 2, true, stage < 5 ? 1 : stage - 3),
      native: native(stage),
    };
  });
  return {
    schemaVersion: 1,
    scenario: 'structure-native-observation-v1',
    watchMode,
    driver: 'native Instrumentation and UiAutomation',
    status: 'passed',
    artifactDirectory: 'cache/mui-structure-1234',
    device: { package: 'dev.altroo.muinative.catalog', sdk: 37, density: 2.625, fontScale: 1 },
    idle,
    states,
    stages: structureInputs.map((x) => x.name),
    screenshots: [...structurePictures],
    stopped: metadata(6, 9, false, 3),
    finalStopped: { metadata: metadata(6, 10, false, 3), native: native(6) },
    cleanup: { observedStopped: true },
  };
}
const output = (report) =>
  'INSTRUMENTATION_RESULT: structureReport=' +
  JSON.stringify(report) +
  '\nINSTRUMENTATION_CODE: -1\n';
test('finite synthetic control accepts both baseline ref-cleanup counts and physical rounding', () => {
  const report = fixture();
  assert.equal(summarizeStructure(output(report)).states.length, 7);
  report.states[3].native.targetFrame.width += 0.99 / report.device.density;
  assert.doesNotThrow(() => summarizeStructure(output(report)));
});
const negatives = [
  ['missing stage', (r) => r.states.pop()],
  ['wrong native bounds', (r) => (r.states[2].native.targetFrame.width = 48)],
  ['stale layout-only frame', (r) => (r.states[5].native.targetFrame.width = 40)],
  ['stale restored frame', (r) => (r.states[6].native.targetFrame.width = 48)],
  ['wrong parent geometry', (r) => (r.states[1].native.parentFrame.height = 40)],
  ['replaced native target', (r) => (r.states[2].native.targetId = 99)],
  ['replaced native parent', (r) => (r.states[2].native.parentId = 99)],
  ['wrong canonical child', (r) => (r.states[2].metadata.actual.targetIsCanonicalChild = false)],
  ['wrong logical parent', (r) => (r.states[2].metadata.actual.parentMatchesForwardedRef = false)],
  ['wrong logical order', (r) => r.states[2].metadata.actual.order.reverse()],
  ['hidden element omitted', (r) => r.states[3].metadata.actual.order.pop()],
  ['wrong authored width', (r) => (r.states[5].metadata.authored.width = 40)],
  ['stale request', (r) => (r.states[1].metadata.request = r.states[0].metadata.request)],
  ['fractional request', (r) => (r.states[1].metadata.request = 2.5)],
  [
    'ref lease replaced during registration',
    (r) => (r.idle.leases.target = { attached: 1, cleaned: 0 }),
  ],
  [
    'remounted target lease',
    (r) => (r.states[2].metadata.leases.target = { attached: 3, cleaned: 2 }),
  ],
  ['structure depends on layout', (r) => r.states[2].metadata.targetLayouts++],
  ['missing layout acknowledgment', (r) => (r.states[5].metadata.targetLayouts = 1)],
  ['missing restored layout acknowledgment', (r) => (r.states[6].metadata.targetLayouts = 2)],
  ['missing dirty event', (r) => r.states[2].metadata.events.pop()],
  [
    'layout creates dirty event',
    (r) =>
      r.states[5].metadata.events.push({
        ...r.states[5].metadata.events.at(-1),
        revision: 6,
        committedStage: 5,
      }),
  ],
  ['mutated event history', (r) => (r.states[2].metadata.events[0].revision = 2)],
  ['changed subscription', (r) => (r.states[2].metadata.events.at(-1).subscriptionId = 2)],
  ['stale lease', (r) => (r.states[2].metadata.events.at(-1).lease = 'structure-probe:0')],
  ['closed subscription', (r) => (r.states[2].metadata.events.at(-1).closed = true)],
  ['wrong callback stage', (r) => (r.states[2].metadata.events.at(-1).committedStage = 1)],
  ['scene error', (r) => r.states[2].metadata.errors.push('unavailable')],
  [
    'owned hook leaked',
    (r) => (r.finalStopped.metadata.nativeDiagnostics.commitHookRegistered = true),
  ],
  [
    'owned subscription leaked',
    (r) => (r.finalStopped.metadata.nativeDiagnostics.subscriptions = 1),
  ],
  [
    'pending callback leaked',
    (r) => (r.finalStopped.metadata.nativeDiagnostics.notificationPending = true),
  ],
  [
    'callback after stop',
    (r) =>
      r.finalStopped.metadata.events.push({
        ...r.finalStopped.metadata.events.at(-1),
        revision: 7,
      }),
  ],
  ['unconfirmed cleanup', (r) => (r.cleanup.observedStopped = false)],
  ['failed report with code minus1', (r) => (r.status = 'failed')],
  ['wrong package', (r) => (r.device.package = 'some.other.app')],
  ['invalid density', (r) => (r.device.density = 0)],
  ['unsafe artifact', (r) => (r.artifactDirectory = 'cache/mui-structure-1/../other')],
  ['newline artifact', (r) => (r.artifactDirectory = 'cache/mui-structure-1\n')],
  ['unsafe screenshot', (r) => (r.screenshots[0] = '../outside.png')],
  ['duplicate screenshot', (r) => (r.screenshots[1] = r.screenshots[0])],
];
for (const [name, mutate] of negatives)
  test('strict reader rejects ' + name, () => {
    const report = fixture();
    mutate(report);
    assert.throws(() => summarizeStructure(output(report)));
  });
test('ambiguous/failed native framing never grants a pass', () => {
  const text = output(fixture());
  for (const bad of [
    text + text,
    text.replace('-1', '0'),
    text + 'INSTRUMENTATION_FAILED: crashed\n',
    text + 'INSTRUMENTATION_RESULT: shortMsg=Process crashed\n',
  ])
    assert.throws(() => summarizeStructure(bad));
  const failed = fixture();
  failed.status = 'failed';
  assert.equal(inspectStructureReport(output(failed)).status, 'failed');
});
test('authored Node oracle matches the exact actual scene stage constants', async () => {
  const source = await readFile(
    new URL('../../apps/native-catalog/StructuralObservationProbe.tsx', import.meta.url),
    'utf8',
  );
  const ast = parse(source, {
    sourceType: 'module',
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['typescript', 'jsx'] },
  });
  const declaration = ast.program.body
    .filter((x) => x.type === 'VariableDeclaration')
    .flatMap((x) => x.declarations)
    .find((x) => x.id.name === 'stages');
  assert(declaration);
  const inputs = declaration.init.elements.map((element) =>
    Object.fromEntries(
      element.properties.map((prop) => [
        prop.key.name,
        prop.value.type === 'ArrayExpression'
          ? prop.value.elements.map((x) => x.value)
          : prop.value.value,
      ]),
    ),
  );
  assert.deepEqual(inputs, structureInputs);
});
async function directory(t) {
  const path = await mkdtemp(join(tmpdir(), 'mui-structure-prepare-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}
test('source preparation copies only owned Java and preserves later edits', async (t) => {
  const project = await directory(t),
    target = await prepareStructureSource(project),
    source = await readFile(target, 'utf8');
  assert.match(source, /public final class StructuralObservationScenario/);
  assert.equal(await prepareStructureSource(project), target);
  await writeFile(target, source + '\n// private change\n');
  await assert.rejects(prepareStructureSource(project), /Preserve edits/);
  assert.equal(await readFile(target, 'utf8'), source + '\n// private change\n');
});
test('source preparation rejects symlinks and malformed ownership before writing', async (t) => {
  const project = await directory(t),
    outside = await directory(t);
  await mkdir(join(project, 'app'));
  await symlink(outside, join(project, 'app/src'));
  await assert.rejects(prepareStructureSource(project), /Preserve non-directory/);
  const other = await directory(t);
  await prepareStructureSource(other);
  await writeFile(
    join(other, '.mui-native-structure-instrumentation.json'),
    JSON.stringify({ schemaVersion: 1, sourceSha256: 'a'.repeat(64) + '\n' }),
  );
  await assert.rejects(prepareStructureSource(other), /modified Structure ownership/);
});
test('additive structure driver routes actual packet inspection and safe artifact pulls', async (t) => {
  const outputDirectory = await directory(t),
    calls = [],
    text = output(fixture());
  const execute = async (_file, args) => {
    calls.push(args);
    if (args.includes('get-state')) return 'device';
    if (args.includes('instrument')) return text;
    return 'synthetic';
  };
  const report = await run(
    {
      adb: 'synthetic-adb',
      serial: 'emulator-5554',
      output: outputDirectory,
      scenario: 'structure',
    },
    execute,
  );
  assert.equal(report.status, 'passed');
  assert(calls.some((args) => args.includes('instrument') && args.includes('structure')));
  assert.equal(calls.filter((args) => args.includes('exec-out')).length, 8);
  assert(!calls.some((args) => args.includes('fontProfile') || args.includes('force-stop')));
});

test('compiled Java finite names/order match the independent scene protocol', async () => {
  const java = await readFile(
    new URL('../../tests/native/android/StructuralObservationScenario.java', import.meta.url),
    'utf8',
  );
  const names = java.match(/String\[\]\s+NAMES\s*=\s*(\{[\s\S]+?\});/);
  const orders = java.match(/String\[\]\[\]\s+ORDERS\s*=\s*(\{[\s\S]+?\});/);
  assert(names);
  assert(orders);
  const json = (literal) => JSON.parse(literal.replaceAll('{', '[').replaceAll('}', ']'));
  assert.deepEqual(
    json(names[1]),
    structureInputs.map((input) => input.name),
  );
  assert.deepEqual(
    json(orders[1]),
    structureInputs.map((input) => input.order),
  );
});

// Requested scenario is authoritative; a report cannot relabel a siblings run.
test('children report is accepted only with explicit requested children mode', () => {
  const report = fixture('children');
  assert.equal(summarizeStructure(output(report), { watchMode: 'children' }).watchMode, 'children');
  assert.throws(() => summarizeStructure(output(report)));
  assert.throws(() => summarizeStructure(output(fixture()), { watchMode: 'children' }));
});
for (const [name, mutate] of [
  [
    'top',
    (r) => {
      r.watchMode = 'siblings';
    },
  ],
  [
    'idle',
    (r) => {
      r.idle.watchMode = 'siblings';
    },
  ],
  [
    'initial',
    (r) => {
      r.states[0].metadata.watchMode = 'siblings';
    },
  ],
  [
    'layout-only',
    (r) => {
      r.states[5].metadata.watchMode = 'siblings';
    },
  ],
  [
    'restored',
    (r) => {
      r.states[6].metadata.watchMode = 'siblings';
    },
  ],
  [
    'stopped',
    (r) => {
      r.stopped.watchMode = 'siblings';
    },
  ],
  [
    'final',
    (r) => {
      r.finalStopped.metadata.watchMode = 'siblings';
    },
  ],
  [
    'missing',
    (r) => {
      delete r.states[2].metadata.watchMode;
    },
  ],
  [
    'invalid',
    (r) => {
      r.states[2].metadata.watchMode = 'subtree';
    },
  ],
])
  test('children reader rejects stale or missing selected mode: ' + name, () => {
    const report = fixture('children');
    mutate(report);
    assert.throws(() => summarizeStructure(output(report), { watchMode: 'children' }));
  });
for (const watchMode of [null, true, 'subtree', 'children\n'])
  test(
    'invalid requested watch mode rejects before granting evidence: ' + JSON.stringify(watchMode),
    () => {
      assert.throws(() => summarizeStructure(output(fixture()), { watchMode }));
    },
  );
test('existing siblings scenario rejects a children top-level relabel with stale metadata', () => {
  const report = fixture();
  report.watchMode = 'children';
  assert.throws(() => summarizeStructure(output(report)));
  assert.throws(() => summarizeStructure(output(report), { watchMode: 'children' }));
});
test('children driver sends alternate scenario without adding a mode or font CLI argument', async (t) => {
  const destination = await directory(t),
    calls = [],
    text = output(fixture('children'));
  const execute = async (_file, args) => {
    calls.push(args);
    if (args.includes('get-state')) return 'device';
    if (args.includes('instrument')) return text;
    return 'synthetic';
  };
  const report = await run(
    {
      adb: 'synthetic-adb',
      serial: 'emulator-5554',
      output: destination,
      scenario: 'structure-children',
    },
    execute,
  );
  assert.equal(report.watchMode, 'children');
  assert(calls.some((args) => args.includes('instrument') && args.includes('structure-children')));
  assert(
    !calls.some(
      (args) =>
        args.includes('watchMode') || args.includes('fontProfile') || args.includes('force-stop'),
    ),
  );
  assert.equal(calls.filter((args) => args.includes('exec-out')).length, 8);
});
for (const [scenario, actual] of [
  ['structure-children', 'siblings'],
  ['structure', 'children'],
])
  test('driver rejects mode from the wrong requested scenario: ' + scenario, async (t) => {
    const destination = await directory(t),
      calls = [];
    const execute = async (_file, args) => {
      calls.push(args);
      if (args.includes('get-state')) return 'device';
      if (args.includes('instrument')) return output(fixture(actual));
      if (args.includes('pidof')) return '';
      return 'synthetic';
    };
    await assert.rejects(
      run(
        { adb: 'synthetic-adb', serial: 'emulator-5554', output: destination, scenario },
        execute,
      ),
      /Invalid native structure evidence/,
    );
    assert(!calls.some((args) => args.includes('exec-out')));
    assert(calls.some((args) => args.includes('force-stop')));
  });
