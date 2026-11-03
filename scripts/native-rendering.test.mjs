import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
test('Portal native adaptation retains its locked source and license provenance', async () => {
  const record = JSON.parse(await readFile('upstream/native-rendering.json', 'utf8'));
  const manifest = JSON.parse(await readFile('node_modules/react-native/package.json', 'utf8'));
  assert.equal(manifest.name, record.package.name);
  assert.equal(manifest.version, record.package.version);
  assert.equal(manifest.license, 'MIT');
  assert.equal(
    digest(await readFile('node_modules/react-native/LICENSE')),
    record.package.licenseSha256,
  );
  assert.equal(
    digest(await readFile('upstream/licenses/react-native-0.88.1.txt')),
    record.package.licenseSha256,
  );
  for (const [file, hash] of Object.entries(record.package.sourceFiles))
    assert.equal(digest(await readFile('node_modules/react-native/' + file)), hash, file);
  for (const file of record.localFiles) await access(file);
});
