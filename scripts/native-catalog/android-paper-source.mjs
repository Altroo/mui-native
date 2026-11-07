// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { paperReferenceFromFixture } from './android-paper-report.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
async function optional(path) {
  try {
    const file = await lstat(path);
    if (!file.isFile()) throw Error('Preserve non-regular generated Paper file: ' + path);
    return await readFile(path, { encoding: 'utf8' });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
/** Reduce the pinned original SSR fixture; never derive an oracle from app output. */
export const buildPaperReference = paperReferenceFromFixture;
/** Preserve manual edits to both generated source and its small source-backed asset. */
export async function preparePaperSource(project) {
  const [source, fixture, provenance] = await Promise.all([
    readFile(join(root, 'tests/native/android/PaperScenario.java'), 'utf8'),
    readFile(join(root, 'tests/fixtures/mui-paper-9.5.0.json'), 'utf8'),
    readFile(join(root, 'upstream/paper.json'), 'utf8'),
  ]);
  const reference = JSON.stringify(buildPaperReference(fixture, provenance)) + '\n';
  const target = join(
    project,
    'app/src/androidTest/java/dev/altroo/muinative/catalog/test/PaperScenario.java',
  );
  const asset = join(project, 'app/src/androidTest/assets/mui-paper-reference.json');
  const ownership = join(project, '.mui-native-paper-instrumentation.json');
  const [previous, previousAsset, previousRecord] = await Promise.all([
    optional(target),
    optional(asset),
    optional(ownership),
  ]);
  const hashes = previousRecord === undefined ? undefined : JSON.parse(previousRecord);
  if (
    hashes !== undefined &&
    (!record(hashes) ||
      hashes.schemaVersion !== 1 ||
      Object.keys(hashes).sort().join('|') !== 'referenceSha256|schemaVersion|sourceSha256' ||
      ![hashes.sourceSha256, hashes.referenceSha256].every(
        (value) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value),
      ))
  )
    throw Error('Preserve the modified Paper ownership record');
  if (previous !== undefined && previous !== source && hashes?.sourceSha256 !== digest(previous))
    throw Error('Preserve edits to generated Paper scenario source');
  if (
    previousAsset !== undefined &&
    previousAsset !== reference &&
    hashes?.referenceSha256 !== digest(previousAsset)
  )
    throw Error('Preserve edits to generated Paper reference asset');
  // Validate every owned output before the first write; one edited asset must
  // not silently update the Java source or its ownership journal.
  await mkdir(dirname(target), { recursive: true });
  await mkdir(dirname(asset), { recursive: true });
  await writeFile(target, source);
  await writeFile(asset, reference);
  await writeFile(
    ownership,
    JSON.stringify({
      schemaVersion: 1,
      sourceSha256: digest(source),
      referenceSha256: digest(reference),
    }) + '\n',
  );
  return { source: target, reference: asset };
}
