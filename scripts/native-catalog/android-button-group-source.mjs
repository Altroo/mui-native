// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function optional(path) {
  try {
    return await readFile(path, { encoding: 'utf8' });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
/** Shared catalog scenario source. Manual edits remain application-owned. */
export async function prepareButtonGroupSource(project) {
  const source = await readFile(join(root, 'tests/native/android/ButtonGroupScenario.java'), {
    encoding: 'utf8',
  });
  const target = join(
    project,
    'app/src/androidTest/java/dev/altroo/muinative/catalog/test/ButtonGroupScenario.java',
  );
  const ownership = join(project, '.mui-native-button-group-instrumentation.json');
  const record = await optional(ownership);
  const previous = await optional(target);
  const hashes = record ? JSON.parse(record) : {};
  if (previous !== undefined && previous !== source && hashes.sourceSha256 !== digest(previous))
    throw Error('Preserve edits to generated button-group scenario source');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, source);
  await writeFile(ownership, JSON.stringify({ sourceSha256: digest(source) }) + '\n');
  return target;
}
