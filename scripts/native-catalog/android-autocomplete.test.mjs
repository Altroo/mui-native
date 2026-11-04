import test from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeAutocomplete,
  autocompleteStages,
  autocompletePictures,
} from './android-autocomplete.mjs';
const report = () => ({
  schemaVersion: 1,
  status: 'passed',
  driver: 'native Instrumentation and UiAutomation',
  device: { sdk: 37, model: 'emulator', os: '17' },
  artifactDirectory: 'cache/mui-autocomplete-1',
  stages: [...autocompleteStages],
  screenshots: [...autocompletePictures],
  tagEntryRelease: { focusChangedBeforeUp: true, callbackRestored: true, editorUps: 0, chipUps: 0 },
  softwareRequests: [
    'surrounding',
    'codepoints',
    'key-unflagged',
    'key-soft',
    'key-system',
    'nested-batch',
    'commit',
    'composing',
    'commit-modern',
    'composing-modern',
    'region-modern',
    'replace-modern',
    'retired',
    'queued-retired',
    'covered-window',
  ].map((method) => ({
    method,
    status: 'passed',
    downs: 1,
    keyPresses: method === 'codepoints' ? 0 : 1,
    result: true,
    ...(method.endsWith('-modern')
      ? { downs: 0, nativeText: method === 'region-modern' ? 'x' : '' }
      : {}),
    ...(method === 'nested-batch' ? { requests: 2, committedValues: 1 } : {}),
    ...(method === 'retired' ? { ordinaryTextEdited: true, downs: 0, keyPresses: 1 } : {}),
  })),
  freeSoloBursts: Array.from({ length: 8 }, (_, index) => ({
    index,
    status: 'passed',
    nativeText: 'New city',
    editorStable: true,
    traceTruncated: false,
    changes: [
      ['before', '', 0, 0, 8, 0, 0],
      ['change', 'New city', 0, 0, 8, 8, 8],
    ],
  })),
  touches: Array.from({ length: 10 }, () => ({ id: 'autocomplete-editor', x: 100, y: 200 })),
});
const raw = (value = report(), code = -1) =>
  'INSTRUMENTATION_RESULT: autocompleteReport=' +
  JSON.stringify(value) +
  '\nINSTRUMENTATION_CODE: ' +
  code +
  '\n';
test('complete native Autocomplete assertions are required independently of adb exit status', () => {
  assert.equal(summarizeAutocomplete(raw()).status, 'passed');
  assert.throws(() => summarizeAutocomplete(raw(report(), 0)));
  assert.throws(() => summarizeAutocomplete(raw() + raw()));
  assert.throws(() => summarizeAutocomplete(raw() + 'INSTRUMENTATION_FAILED: stopped\n'));
});
test('missing/reordered stages, stale errors, escaped artifact paths and incomplete pictures are rejected', () => {
  for (const change of [
    (value) => value.stages.pop(),
    (value) => value.stages.reverse(),
    (value) => value.screenshots.pop(),
    (value) => {
      value.error = 'failed';
    },
    (value) => {
      value.artifactDirectory = '/private/path';
    },
    (value) => {
      value.device.sdk = '37';
    },
  ]) {
    const value = report();
    change(value);
    assert.throws(() => summarizeAutocomplete(raw(value)));
  }
});
test('native touch evidence must contain finite, nonnegative coordinates and scene targets', () => {
  for (const patch of [{ x: null }, { y: -1 }, { id: 'other-app' }, { id: null }]) {
    const value = report();
    Object.assign(value.touches[0], patch);
    assert.throws(() => summarizeAutocomplete(raw(value)));
  }
});

test('all eight ordered complete native typing bursts are required, including retained edit evidence', () => {
  for (const corrupt of [
    (value) => {
      delete value.freeSoloBursts;
    },
    (value) => value.freeSoloBursts.pop(),
    (value) => value.freeSoloBursts.push(value.freeSoloBursts[0]),
    (value) => value.freeSoloBursts.reverse(),
    (value) => {
      value.freeSoloBursts[0].status = 'failed';
    },
    (value) => {
      value.freeSoloBursts[0].error = 'typing failed';
    },
    (value) => {
      value.freeSoloBursts[0].nativeText = 'ew city';
    },
    (value) => {
      value.freeSoloBursts[0].editorStable = false;
    },
    (value) => {
      value.freeSoloBursts[0].changes = [];
    },
    (value) => {
      value.freeSoloBursts[0].changes = Array(257).fill(['change', 'New city', 0, 0, 8, 8, 8]);
    },
    (value) => {
      value.freeSoloBursts[0].traceTruncated = true;
    },
    (value) => {
      value.freeSoloBursts[0].traceTruncated = null;
    },
    (value) => {
      value.freeSoloBursts[0].changes[1][1] = 'prefix';
    },
    (value) => {
      value.freeSoloBursts[0].changes[1][2] = '0';
    },
    (value) => {
      value.freeSoloBursts[0].changes[1][5] = -2;
    },
  ]) {
    const value = report();
    corrupt(value);
    assert.throws(() => summarizeAutocomplete(raw(value)), /burst evidence/);
  }
  const legacyComplete = report();
  legacyComplete.freeSoloBursts.forEach((burst) => {
    delete burst.traceTruncated;
  });
  assert.equal(summarizeAutocomplete(raw(legacyComplete)).freeSoloBursts.length, 8);
});

test('the earlier 17-stage APK cannot satisfy Dialog Escape release coverage', () => {
  const previous = report();
  previous.stages = previous.stages.filter(
    (stage) =>
      !stage.includes('escape') &&
      !stage.startsWith('tag-') &&
      !stage.startsWith('editor-') &&
      stage !== 'software-requests',
  );
  previous.screenshots = previous.screenshots.filter(
    (name) => !name.includes('escape') && !name.startsWith('tag-') && name !== 'editor-empty.png',
  );
  assert.equal(previous.stages.length, 17);
  assert.equal(previous.screenshots.length, 5);
  assert.throws(() => summarizeAutocomplete(raw(previous)));
});

test('the earlier 21-stage APK cannot satisfy native tag/caret coverage', () => {
  const previous = report();
  previous.stages = previous.stages.filter(
    (stage) =>
      !stage.startsWith('tag-') && !stage.startsWith('editor-') && stage !== 'software-requests',
  );
  previous.screenshots = previous.screenshots.filter(
    (name) => !name.startsWith('tag-') && name !== 'editor-empty.png',
  );
  assert.equal(previous.stages.length, 21);
  assert.equal(previous.screenshots.length, 7);
  assert.throws(() => summarizeAutocomplete(raw(previous)));
});

test('the earlier 25-stage APK cannot certify native editor Backspace or held tag Delete', () => {
  const previous = report();
  previous.stages = previous.stages.filter(
    (stage) =>
      !['tag-delete-held', 'tag-delete-release', 'software-requests'].includes(stage) &&
      !stage.startsWith('editor-') &&
      stage !== 'software-requests',
  );
  assert.equal(previous.stages.length, 25);
  assert.throws(() => summarizeAutocomplete(raw(previous)));
});

test('native focus transfer requires a retired lease and no release to either stale target', () => {
  for (const release of [
    undefined,
    {},
    { focusChangedBeforeUp: false, callbackRestored: true, editorUps: 0, chipUps: 0 },
    { focusChangedBeforeUp: true, callbackRestored: false, editorUps: 0, chipUps: 0 },
    { focusChangedBeforeUp: true, callbackRestored: true, editorUps: 1, chipUps: 0 },
    { focusChangedBeforeUp: true, callbackRestored: true, editorUps: 0, chipUps: 1 },
  ]) {
    const value = report();
    value.tagEntryRelease = release;
    assert.throws(() => summarizeAutocomplete(raw(value)), /release ownership/);
  }
});

test('software editing checks reject an older report or duplicate deletion callbacks', () => {
  const missing = report();
  delete missing.softwareRequests;
  assert.throws(() => summarizeAutocomplete(raw(missing)), /software editing/);
  for (const field of ['downs', 'keyPresses']) {
    const duplicate = report();
    duplicate.softwareRequests[2][field] = 2;
    assert.throws(() => summarizeAutocomplete(raw(duplicate)), /software editing/);
  }
});

test('modern native overload evidence follows platform availability and rejects synthetic deletion', () => {
  const older = report();
  older.device.sdk = 32;
  older.softwareRequests = older.softwareRequests.filter((row) => !row.method.endsWith('-modern'));
  assert.equal(summarizeAutocomplete(raw(older)).status, 'passed');
  for (const patch of [{ downs: 1 }, { nativeText: 'wrong' }, { result: null }]) {
    const value = report();
    Object.assign(
      value.softwareRequests.find((row) => row.method === 'commit-modern'),
      patch,
    );
    assert.throws(() => summarizeAutocomplete(raw(value)), /software editing/);
  }
  const missing = report();
  missing.softwareRequests = missing.softwareRequests.filter(
    (row) => row.method !== 'replace-modern',
  );
  assert.throws(() => summarizeAutocomplete(raw(missing)), /software editing/);
});

test('code-point deletion retains its exact stock zero-keyPress contract', () => {
  const value = report();
  value.softwareRequests.find((row) => row.method === 'codepoints').keyPresses = 1;
  assert.throws(() => summarizeAutocomplete(raw(value)), /software editing/);
});
