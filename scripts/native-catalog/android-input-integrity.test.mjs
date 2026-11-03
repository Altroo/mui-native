// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inputModes,
  inputRounds,
  inputText,
  inputIntegrityArtifact,
  summarizeInputIntegrity,
} from './android-input-integrity.mjs';
const raw = (status = 'passed', code = -1) =>
  `INSTRUMENTATION_RESULT: inputIntegrityDirectory=cache/mui-input-integrity-1\nINSTRUMENTATION_RESULT: inputIntegrityStatus=${status}\nINSTRUMENTATION_CODE: ${code}\n`;
function report() {
  const trials = Array.from({ length: inputRounds * inputModes.length }, (_, index) => {
    const mode = inputModes[index % inputModes.length],
      generation = index + 1;
    return {
      mode,
      round: Math.floor(index / inputModes.length),
      generation,
      reactTag: generation,
      finalReactTag: generation,
      sameEditor: true,
      matched: true,
      traceTruncated: false,
      nativeText: inputText,
      typedChangeCount: 2,
      typedReplacementCount: 1,
      filterAttached: true,
      filterRemoved: true,
      filtersTruncated: false,
      ...(mode === 'uncontrolled'
        ? {}
        : { authoredReplacement: 'JS replacement', authoredClear: '' }),
      replacements: [
        {
          source: inputText,
          destination: '',
          nativeBefore: '',
          start: 0,
          end: 0,
          time: 1,
          stack: [],
        },
        ...(mode === 'uncontrolled'
          ? []
          : [
              {
                source: 'JS replacement',
                destination: inputText,
                nativeBefore: inputText,
                start: 0,
                end: inputText.length,
                time: 2,
                stack: [],
              },
              {
                source: '',
                destination: '',
                nativeBefore: 'JS replacement',
                start: 0,
                end: 0,
                time: 3,
                stack: [],
              },
            ]),
      ],
      focus: { focused: true, windowFocused: true, attached: true, imeActive: true },
      receipt: { mode, generation, value: inputText, reason: 'input', count: 8 },
      changes: [
        {
          phase: 'before',
          text: '',
          start: 0,
          before: 0,
          after: 8,
          selectionStart: 0,
          selectionEnd: 0,
          time: 1,
        },
        {
          phase: 'change',
          text: inputText,
          start: 0,
          before: 0,
          after: 8,
          selectionStart: 8,
          selectionEnd: 8,
          time: 2,
          stack: [],
        },
      ],
    };
  });
  return {
    schemaVersion: 1,
    scenario: 'input-integrity-v1',
    artifactDirectory: 'cache/mui-input-integrity-1',
    expectedText: inputText,
    driver: 'Instrumentation.sendStringSync',
    status: 'passed',
    completed: true,
    device: { sdk: 37, model: 'emulator', os: '17' },
    trials,
    touches: [
      { id: 'catalog-tab-Inputs', x: 1, y: 1 },
      ...trials.flatMap((t) => [
        { id: 'typing-mode-' + t.mode, x: 1, y: 1 },
        { id: 'typing-editor', x: 1, y: 1 },
        ...(t.mode === 'uncontrolled'
          ? []
          : [
              { id: 'typing-replace', x: 1, y: 1 },
              { id: 'typing-replace', x: 1, y: 1 },
            ]),
      ]),
    ],
  };
}
test('all matched cold scenes, complete traces and actual native/React text are required', () => {
  assert.equal(summarizeInputIntegrity(raw(), report()).trials.length, 32);
  for (const mutate of [
    (r) => {
      r.trials[0].replacements = [];
    },
    (r) => {
      r.trials[0].filterAttached = false;
    },
    (r) => {
      r.trials[0].filterRemoved = false;
    },
    (r) => {
      r.trials[0].filtersTruncated = true;
    },
    (r) => {
      r.trials[0].typedChangeCount = 0;
    },
    (r) => {
      r.trials[0].typedReplacementCount = 0;
    },
    (r) => {
      r.trials[0].authoredClear = 'JS replacement';
    },
    (r) => {
      r.trials[0].replacements[1].source = 'other';
    },
    (r) => {
      r.trials[0].replacements[2].nativeBefore = '';
    },
    (r) => r.trials.pop(),
    (r) => r.trials.reverse(),
    (r) => {
      r.trials[1].generation = 1;
    },
    (r) => {
      r.trials[1].reactTag = 1;
    },
    (r) => {
      r.trials[0].finalReactTag = 2;
    },
    (r) => {
      r.trials[0].nativeText = 'ew city';
    },
    (r) => {
      r.trials[0].receipt.value = 'ew city';
    },
    (r) => {
      r.trials[0].matched = false;
    },
    (r) => {
      r.trials[0].sameEditor = false;
    },
    (r) => {
      r.trials[0].focus.focused = false;
    },
    (r) => {
      r.trials[0].focus.windowFocused = false;
    },
    (r) => {
      r.trials[0].receipt.generation = 2;
    },
    (r) => {
      r.trials[0].receipt.reason = 'reset';
    },
    (r) => {
      r.trials[0].changes = [];
    },
    (r) => {
      r.trials[0].traceTruncated = true;
    },
    (r) => {
      r.trials[0].changes.at(-1).text = 'prefix';
    },
    (r) => {
      r.trials[0].changes[0].start = -1;
    },
    (r) => {
      r.trials[0].changes[1].stack = [null];
    },
    (r) => {
      r.trials[0].changes[1].selectionEnd = null;
    },
    (r) => {
      r.trials[0].changes = Array(257).fill(r.trials[0].changes[1]);
    },
    (r) => {
      r.touches[0].x = null;
    },
    (r) => r.touches.pop(),
    (r) => {
      r.touches[1].id = 'typing-editor';
    },
    (r) => {
      r.device.sdk = '37';
    },
    (r) => {
      r.error = 'failed';
    },
    (r) => {
      r.completed = false;
    },
    (r) => {
      r.artifactDirectory = 'cache/mui-input-integrity-2';
    },
    (r) => {
      r.status = 'mismatch';
    },
  ]) {
    const value = report();
    mutate(value);
    assert.throws(() => summarizeInputIntegrity(raw(), value));
  }
});
test('failed or duplicate instrumentation cannot be turned into a passing comparison', () => {
  for (const output of [
    raw('mismatch', 0),
    raw('passed', 0),
    raw() + raw(),
    raw() + 'INSTRUMENTATION_FAILED: stopped\n',
    raw() + 'INSTRUMENTATION_RESULT: Error=failed\n',
  ])
    assert.throws(() => summarizeInputIntegrity(output, report()));
});
test('failure artifacts remain retrievable using one bounded relative directory', () => {
  assert.equal(inputIntegrityArtifact(raw('mismatch', 0)), 'cache/mui-input-integrity-1');
  for (const output of [
    '',
    raw() + raw(),
    raw().replace('cache/mui-input-integrity-1', '../other'),
    raw().replace('cache/mui-input-integrity-1', '/private/other'),
  ])
    assert.throws(() => inputIntegrityArtifact(output));
});

test('valid CRLF output retains a safe artifact path and complete evidence', () => {
  assert.equal(
    inputIntegrityArtifact(raw().replaceAll('\n', '\r\n')),
    'cache/mui-input-integrity-1',
  );
  assert.equal(summarizeInputIntegrity(raw().replaceAll('\n', '\r\n'), report()).trials.length, 32);
});

test('source preparation refreshes only its own generated driver and preserves foreign edits', async () => {
  const { mkdtemp, readFile, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { createHash } = await import('node:crypto');
  const { prepareInputIntegritySource } = await import('./android-input-integrity-source.mjs');
  const project = await mkdtemp(join(tmpdir(), 'mui-input-source-'));
  try {
    const target = await prepareInputIntegritySource(project);
    const source = await readFile(target, { encoding: 'utf8' });
    assert.equal(await prepareInputIntegritySource(project), target);
    await writeFile(target, 'previous owned source');
    await writeFile(
      join(project, '.mui-native-input-integrity-instrumentation.json'),
      JSON.stringify({
        sourceSha256: createHash('sha256').update('previous owned source').digest('hex'),
      }),
    );
    await prepareInputIntegritySource(project);
    assert.equal(await readFile(target, { encoding: 'utf8' }), source);
    await writeFile(target, 'foreign edits');
    await assert.rejects(prepareInputIntegritySource(project), /Preserve edits/);
    assert.equal(await readFile(target, { encoding: 'utf8' }), 'foreign edits');
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});
