// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const read = (file) => readFile(new URL('../../' + file, import.meta.url));
const json = async (file) => JSON.parse((await read(file)).toString('utf8'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
test('generated Accordion/Paper CSS retains its exact generator and output provenance', async () => {
  const record = await json('upstream/accordion-style-programmes.json');
  assert.equal(sha(await read(record.generator.source)), record.generator.sha256);
  assert.deepEqual(record.localFiles, ['packages/material/src/nativeAccordionCss.ts']);
  assert.equal(sha(await read(record.localFiles[0])), record.generatedSha256);
  const state = await json('upstream/state.json');
  const baseline = state.packages['@mui/material'].baseline;
  assert.equal(record.reference.version, baseline.version);
  assert.equal(record.reference.integrity, baseline.integrity);
  assert.equal(record.reference.licenseSha256, baseline.licenseSha256);
});
test('the original emitted-class fixture retains the required peer distinctions', async () => {
  const fixture = await json('tests/fixtures/mui-accordion-9.5.0.json');
  const rows = new Map(fixture.sourceClassContracts.map((row) => [row.name, row]));
  for (const [name, hides] of [
    ['same source class', true],
    ['elevation is inline source paint', true],
    ['square changes constructor CSS', false],
    ['gutters change constructor CSS', false],
    ['inline paint keeps CSS identity', true],
    ['direction is inherited source CSS', true],
    ['authored expanded class participates', true],
    ['collapsed current class does not participate', false],
    ['Box changes the final constructor', false],
    ['opaque Box keeps the final Box identity', true],
  ]) {
    assert.equal(rows.get(name)?.hidesBefore, hides, name);
  }
});
