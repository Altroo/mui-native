// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
async function optional(path) {
  try {
    const entry = await lstat(path);
    if (!entry.isFile()) throw Error('Preserve non-regular generated Structure file: ' + path);
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
async function checkDirectories(project, target) {
  const parts = relative(project, dirname(target)).split(sep);
  let path = project;
  for (const part of ['', ...parts]) {
    if (part) path = join(path, part);
    try {
      const entry = await lstat(path);
      if (!entry.isDirectory() || entry.isSymbolicLink())
        throw Error('Preserve non-directory generated Structure ancestor: ' + path);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}
/** One generated source, exact ownership hashes, no source or asset-derived oracle. */
export async function prepareStructureSource(project) {
  if (typeof project !== 'string' || !project.trim())
    throw Error('Choose the generated Structure Android project');
  project = resolve(project);
  const source = await readFile(
    join(root, 'tests/native/android/StructuralObservationScenario.java'),
    'utf8',
  );
  const target = join(
    project,
    'app/src/androidTest/java/dev/altroo/muinative/catalog/test/StructuralObservationScenario.java',
  );
  const ownership = join(project, '.mui-native-structure-instrumentation.json');
  await checkDirectories(project, target);
  const [previous, journal] = await Promise.all([optional(target), optional(ownership)]);
  const hashes = journal === undefined ? undefined : JSON.parse(journal);
  if (
    hashes !== undefined &&
    (!record(hashes) ||
      Object.keys(hashes).sort().join('|') !== 'schemaVersion|sourceSha256' ||
      hashes.schemaVersion !== 1 ||
      typeof hashes.sourceSha256 !== 'string' ||
      hashes.sourceSha256.length !== 64 ||
      !/^[a-f0-9]{64}$/.test(hashes.sourceSha256))
  )
    throw Error('Preserve the modified Structure ownership record');
  if (previous !== undefined && previous !== source && hashes?.sourceSha256 !== digest(previous))
    throw Error('Preserve edits to generated Structure scenario source');
  // Verify source, journal and ancestors before the first write. This does not
  // claim an atomic guarantee against another process replacing a path mid-copy.
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, source);
  await writeFile(
    ownership,
    JSON.stringify({ schemaVersion: 1, sourceSha256: digest(source) }) + '\n',
  );
  return target;
}
