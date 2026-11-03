import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { removeObsoleteArchives } from './packages-archives.mjs';
test('archive cleanup verifies package identity and preserves siblings, collisions and unreadable files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mui-archive-test-'));
  const staging = join(dir, 'staging');
  await mkdir(join(staging, 'package'), { recursive: true });
  const archives = [
    ['altroo-mui-native-0.0.0-dev.0.tgz', '@altroo/mui-native', '0.0.0-dev.0'],
    ['altroo-mui-native-0.0.1-dev.0.tgz', '@altroo/mui-native', '0.0.1-dev.0'],
    ['altroo-mui-native-host-0.0.1-dev.0.tgz', '@altroo/mui-native-host', '0.0.1-dev.0'],
    ['altroo-mui-native-host-0.0.2-dev.0.tgz', '@altroo/mui-native-host', '0.0.2-dev.0'],
    ['altroo-mui-native-1.2.3-0.0.1-dev.0.tgz', '@altroo/mui-native-1.2.3', '0.0.1-dev.0'],
    ['altroo-mui-native-0.0.3.tgz', 'altroo-mui-native', '0.0.3'],
    ['altroo-mui-native-0.0.4.tgz', '@altroo/mui-native', '0.0.5'],
  ];
  try {
    for (const [file, name, version] of archives) {
      await writeFile(join(staging, 'package/package.json'), JSON.stringify({ name, version }));
      execFileSync('tar', ['-czf', join(dir, file), '-C', staging, 'package/package.json']);
    }
    await writeFile(join(dir, 'altroo-mui-native-0.0.6.tgz'), 'unreadable');
    await writeFile(join(dir, 'notes.txt'), 'keep');
    await removeObsoleteArchives(dir, '@altroo/mui-native', '0.0.1-dev.0');
    await removeObsoleteArchives(dir, '@altroo/mui-native-host', '0.0.2-dev.0');
    const removed = ['altroo-mui-native-0.0.0-dev.0.tgz', 'altroo-mui-native-host-0.0.1-dev.0.tgz'];
    assert.deepEqual(
      (await readdir(dir)).sort(),
      [
        ...archives.map((x) => x[0]).filter((file) => !removed.includes(file)),
        'altroo-mui-native-0.0.6.tgz',
        'notes.txt',
        'staging',
      ].sort(),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
