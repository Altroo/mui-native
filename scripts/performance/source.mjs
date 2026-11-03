// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const scope = [
  'apps/native-benchmark',
  'packages',
  'scripts/performance',
  'tests/native/performance',
  'pnpm-lock.yaml',
  'package.json',
  'pnpm-workspace.yaml',
  'babel.config.cjs',
];
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/** Fingerprint actual build inputs, including unpublished changes, independently of HEAD. */
export async function sourceManifest(project = root) {
  const git = (args) => execFileSync('git', args, { cwd: project, encoding: 'utf8' }).trim();
  const paths = [
    ...new Set(
      git(['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...scope])
        .split('\0')
        .filter(Boolean),
    ),
  ].sort();
  const native = 'apps/native-benchmark/android';
  const nativeInputs = [
    'build.gradle',
    'settings.gradle',
    'gradle.properties',
    'gradle/wrapper/gradle-wrapper.properties',
    'app/build.gradle',
    'app/proguard-rules.pro',
  ];
  async function nativeSources(directory) {
    for (const entry of await readdir(join(project, directory), { withFileTypes: true })) {
      const path = directory + '/' + entry.name;
      if (entry.isDirectory()) await nativeSources(path);
      else if (entry.isFile()) paths.push(path);
      else throw Error('Native inputs must be regular files: ' + path);
    }
  }
  // Generated projects are ignored by Git but their actual build settings and
  // entry points affect the installed binary. Exclude build outputs and keys.
  for (const path of nativeInputs) paths.push(native + '/' + path);
  await nativeSources(native + '/app/src');
  const files = [];
  for (const path of [...new Set(paths)].sort())
    files.push({ path, sha256: sha256(await readFile(join(project, path))) });
  return {
    schemaVersion: 1,
    sourceId: sha256(JSON.stringify(files)),
    baseCommit: git(['rev-parse', 'HEAD']),
    files,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  console.log(JSON.stringify(await sourceManifest(), null, 2));
