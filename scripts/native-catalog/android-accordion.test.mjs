// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { summarizeAccordion, accordionStages, accordionPictures } from './android-accordion.mjs';
import { prepareAccordionSource } from './android-accordion-source.mjs';
import { inspectAccordionReport } from './android-accordion-report.mjs';
import { run } from './android-popper.mjs';
const complete = {
  schemaVersion: 1,
  scenario: 'accordion-v1',
  driver: 'native Instrumentation and UiAutomation',
  status: 'passed',
  artifactDirectory: 'cache/mui-accordion-123',
  device: { sdk: 37, model: 'test-device' },
  stages: accordionStages,
  screenshots: accordionPictures,
  samples: [
    { name: 'delivery-initial', actual: 220, natural: 220 },
    { name: 'delivery-closed', actual: 0, natural: 220 },
    { name: 'payment-open', actual: 180, natural: 180 },
    { name: 'delivery-reopened', actual: 220, natural: 220 },
  ],
};
const output = (report) =>
  'INSTRUMENTATION_RESULT: accordionReport=' +
  JSON.stringify(report) +
  '\nINSTRUMENTATION_CODE: -1\n';
test('native Accordion receipt rejects missing, failed, duplicate, partial and inconsistent evidence', () => {
  assert.deepEqual(summarizeAccordion(output(complete)), complete);
  for (const raw of [
    '',
    output(complete) + output(complete),
    output(complete).replace('-1', '0'),
    output({ ...complete, status: 'failed' }),
    output({ ...complete, artifactDirectory: '../../private' }),
    output({ ...complete, stages: accordionStages.slice(1) }),
    output({ ...complete, screenshots: [] }),
    output({ ...complete, samples: complete.samples.slice(1) }),
    output({
      ...complete,
      samples: complete.samples.map((s, i) => (i === 1 ? { ...s, actual: 10 } : s)),
    }),
    output({
      ...complete,
      samples: complete.samples.map((s, i) => (i === 0 ? { ...s, natural: 0 } : s)),
    }),
    output(complete) + 'INSTRUMENTATION_FAILED: stopped\n',
  ])
    assert.throws(() => summarizeAccordion(raw));
});
test('Accordion native-source preparation preserves manual edits and is repeatable', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-accordion-prepare-'));
  try {
    await mkdir(directory, { recursive: true });
    const file = await prepareAccordionSource(directory);
    await prepareAccordionSource(directory);
    const source = await readFile(file, 'utf8');
    await writeFile(file, source + '\n// contributor change\n');
    await assert.rejects(prepareAccordionSource(directory), /Preserve edits/);
    assert.equal(await readFile(file, 'utf8'), source + '\n// contributor change\n');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Accordion failures retain safe diagnostic metadata but never pass completion', () => {
  const failed = {
    ...complete,
    status: 'failed',
    error: 'Native assertion',
    stages: [],
    screenshots: ['failure.png'],
    samples: [],
  };
  assert.deepEqual(inspectAccordionReport(output(failed)), failed);
  assert.throws(() => summarizeAccordion(output(failed)));
  assert.throws(() => inspectAccordionReport(output({ ...failed, screenshots: ['../private'] })));
  assert.throws(() =>
    inspectAccordionReport(output({ ...failed, artifactDirectory: ['cache/mui-accordion-123'] })),
  );
  assert.throws(() =>
    summarizeAccordion(
      output({
        ...complete,
        samples: complete.samples.map((sample, index) =>
          index === 0 ? { ...sample, actual: 0, natural: 1 } : sample,
        ),
      }),
    ),
  );
});
test('shared runner selects Accordion, collects its safe artifacts and restores only the catalog', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-accordion-run-')),
    calls = [];
  try {
    const execute = async (_file, args) => {
      calls.push(args);
      if (args.includes('get-state')) return 'device';
      if (args.includes('instrument')) return output(complete);
      if (args.includes('exec-out')) return Buffer.from('native-image');
      if (args.includes('start')) return 'Starting';
      throw Error('Unexpected adb call ' + args.join(' '));
    };
    assert.deepEqual(
      await run(
        { adb: 'adb', serial: 'chosen-device', output: directory, scenario: 'accordion' },
        execute,
      ),
      complete,
    );
    assert.ok(calls.some((args) => args.join(' ').includes('-e scenario accordion')));
    assert.ok(calls.every((args) => args[0] === '-s' && args[1] === 'chosen-device'));
    assert.equal(calls.filter((args) => args.includes('start')).length, 1);
    assert.deepEqual(
      JSON.parse(await readFile(join(directory, 'report.json'), { encoding: 'utf8' })),
      complete,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('qualified Accordion input rejects covered, missing and reordered touches', () => {
  const targets = [
    'catalog-tab-Accordion',
    'accordion-note',
    'accordion-payment-summary',
    'accordion-delivery-summary',
    'accordion-save',
    'accordion-disabled-summary',
    'accordion-help-summary',
    'accordion-help-summary',
  ];
  const qualified = {
    ...complete,
    inputQualification: 'unobstructed-logbox-v1',
    screenshots: [...accordionPictures, 'help-input.png'],
    touches: targets.map((target) => ({
      target,
      x: 10,
      y: 20,
      imeVisible: false,
      diagnosticClear: true,
    })),
  };
  assert.deepEqual(summarizeAccordion(output(qualified)), qualified);
  for (const bad of [
    { ...qualified, inputQualification: 'guessed' },
    { ...qualified, touches: qualified.touches.slice(1) },
    { ...qualified, touches: [...qualified.touches].reverse() },
    {
      ...qualified,
      touches: qualified.touches.map((t, i) => (i === 5 ? { ...t, diagnosticClear: false } : t)),
    },
    { ...qualified, touches: qualified.touches.map((t, i) => (i === 6 ? { ...t, x: null } : t)) },
    { ...qualified, screenshots: accordionPictures },
  ])
    assert.throws(() => summarizeAccordion(output(bad)));
});
