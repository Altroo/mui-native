import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
test('native positioning retains its MIT source record, license and implemented files', async () => {
  const record = JSON.parse(await readFile('upstream/native-positioning.json', 'utf8'));
  assert.equal(record.core.name, '@popperjs/core');
  assert.equal(record.core.version, '2.11.8');
  assert.equal(record.core.license, 'MIT');
  assert.match(record.core.integrity, /^sha512-/);
  const license = await readFile('upstream/licenses/popper-core-2.11.8.txt');
  assert.equal(createHash('sha256').update(license).digest('hex'), record.core.licenseSha256);
  assert.equal(record.core.sourceFiles['LICENSE.md'], record.core.licenseSha256);
  assert((await readFile('NOTICE', 'utf8')).includes(license.toString()));
  const fixture = JSON.parse(
    await readFile('tests/fixtures/mui-popper-geometry-9.5.0.json', 'utf8'),
  );
  assert.deepEqual(fixture.core, record.core);
  for (const file of record.localFiles) await access(file);
});
