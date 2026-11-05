// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buttonGroupStages,
  buttonGroupPictures,
  inspectButtonGroupReport,
  summarizeButtonGroup,
} from './android-button-group-report.mjs';
import { prepareButtonGroupSource } from './android-button-group-source.mjs';
const sample = (name, x, y, width, height) => ({ name, x, y, width, height });
const complete = {
  schemaVersion: 1,
  scenario: 'button-group-v1',
  driver: 'native Instrumentation and UiAutomation',
  status: 'passed',
  artifactDirectory: 'cache/mui-button-group-123',
  device: { sdk: 37, model: 'test-device' },
  stages: buttonGroupStages,
  screenshots: buttonGroupPictures,
  samples: [
    sample('horizontal:document-content', 0, 0, 298, 300),
    sample('horizontal:document-actions', 0, 0, 298, 44),
    ...['group-save', 'group-preview', 'group-send'].map((id, i) =>
      sample('horizontal:' + id, i * 99, 0, 100, 44),
    ),
    sample('vertical:document-content', 0, 0, 298, 300),
    sample('vertical:document-actions', 0, 0, 298, 130),
    ...['group-save', 'group-preview', 'group-send'].map((id, i) =>
      sample('vertical:' + id, 0, i * 43, 298, 44),
    ),
    sample('compact:document-content', 0, 0, 298, 300),
    sample('compact:document-actions', 0, 0, 298, 44),
    sample('compact:group-save', 0, 0, 149.5, 44),
    sample('compact:group-send', 148.5, 0, 149.5, 44),
  ],
};
const output = (report) =>
  'INSTRUMENTATION_RESULT: buttonGroupReport=' +
  JSON.stringify(report) +
  '\nINSTRUMENTATION_CODE: -1\n';
test('native group receipt requires exact completion, safe artifacts and consistent actual bounds', () => {
  assert.deepEqual(summarizeButtonGroup(output(complete)), complete);
  for (const raw of [
    '',
    output(complete) + output(complete),
    output(complete).replace('-1', '0'),
    output({ ...complete, status: 'failed' }),
    output({ ...complete, stages: buttonGroupStages.slice(1) }),
    output({ ...complete, screenshots: [] }),
    output({ ...complete, artifactDirectory: '../../private' }),
    output({ ...complete, artifactDirectory: ['cache/mui-button-group-123'] }),
    output({ ...complete, samples: complete.samples.slice(1) }),
    ...[2, 5, 13].map((index) =>
      output({
        ...complete,
        samples: complete.samples.map((s, i) => (i === index ? { ...s, width: s.width + 10 } : s)),
      }),
    ),
    output({
      ...complete,
      samples: complete.samples.map((s, i) => (i === 1 ? { ...s, height: 30 } : s)),
    }),
    output({
      ...complete,
      samples: complete.samples.map((s, i) =>
        i === 1
          ? { ...s, width: 268 }
          : i >= 2 && i <= 4
            ? { ...s, x: (i - 2) * 89, width: 90 }
            : s,
      ),
    }),
    output(complete) + 'INSTRUMENTATION_ABORTED: stopped\n',
  ])
    assert.throws(() => summarizeButtonGroup(raw));
});
test('failed group runs retain safe failure pictures without passing acceptance', () => {
  const failed = {
    ...complete,
    status: 'failed',
    error: 'AssertionError',
    screenshots: ['failure.png'],
    samples: [],
  };
  assert.deepEqual(inspectButtonGroupReport(output(failed)), failed);
  assert.throws(() => summarizeButtonGroup(output(failed)));
});
test('group source preparation preserves contributor edits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-button-group-prepare-'));
  try {
    const file = await prepareButtonGroupSource(directory);
    await prepareButtonGroupSource(directory);
    const source = await readFile(file, 'utf8');
    await writeFile(file, source + '\n// contributor edit\n');
    await assert.rejects(prepareButtonGroupSource(directory), /Preserve edits/);
    assert.equal(await readFile(file, 'utf8'), source + '\n// contributor edit\n');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
