// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { mkdir, readFile, writeFile, rm, realpath, symlink, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSystemDeclarationIsolation } from '../system-declarations.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(root, '.cache/card-consumer');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const json = (name, value) =>
  writeFile(resolve(output, name), JSON.stringify(value, null, 2) + '\n');
const compile = (name) =>
  execFileSync(
    process.execPath,
    [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', resolve(output, name)],
    { cwd: root, stdio: 'inherit' },
  );
await json('emit.json', {
  extends: resolve(root, 'tsconfig.build.json'),
  compilerOptions: { outDir: resolve(output, 'types') },
  include: ['index.ts', 'Card/index.ts', 'Paper/index.ts', 'styles/index.ts'].map((path) =>
    resolve(root, 'packages/material/src', path),
  ),
  exclude: [resolve(root, 'node_modules'), '**/dist'],
});
const graph = execFileSync(
  process.execPath,
  [
    resolve(root, 'node_modules/typescript/bin/tsc'),
    '-p',
    resolve(output, 'emit.json'),
    '--listFilesOnly',
  ],
  { cwd: root, encoding: 'utf8' },
);
if (graph.includes('/packages/icons/src/'))
  throw new Error('Card consumer graph unexpectedly includes the icon barrel.');
await writeFile(resolve(output, 'emit-inputs.txt'), graph);
compile('emit.json');
const systemDeclarations = resolve(output, 'types/system/src');
const files = (await readdir(systemDeclarations, { recursive: true })).filter((file) =>
  file.endsWith('.d.ts'),
);
assertSystemDeclarationIsolation(
  new Map(
    await Promise.all(
      files.map(async (file) => [file, await readFile(resolve(systemDeclarations, file), 'utf8')]),
    ),
  ),
);
const base = JSON.parse(await readFile(resolve(root, 'tsconfig.json'), 'utf8'));
const paths = Object.fromEntries(
  Object.entries(base.compilerOptions.paths).map(([name, targets]) => [
    name,
    targets.map((target) => resolve(root, target)),
  ]),
);
Object.assign(paths, {
  '@mui/material': [resolve(output, 'types/material/src/index.d.ts')],
  '@mui/material/Card': [resolve(output, 'types/material/src/Card/index.d.ts')],
  '@mui/material/Paper': [resolve(output, 'types/material/src/Paper/index.d.ts')],
  '@mui/material/className': [resolve(output, 'types/material/src/className/index.d.ts')],
  '@mui/material/styles': [resolve(output, 'types/material/src/styles/index.d.ts')],
  '@altroo/mui-native': [resolve(output, 'types/material/src/index.d.ts')],
  '@altroo/mui-native/*': [resolve(output, 'types/material/src/*/index.d.ts')],
  '@altroo/mui-native-system': [resolve(output, 'types/system/src/index.d.ts')],
  '@altroo/mui-native-system/DefaultPropsProvider': [
    resolve(output, 'types/system/src/DefaultPropsProvider/index.d.ts'),
  ],
  '@altroo/mui-native-host': [resolve(output, 'types/native-host/src/index.d.ts')],
});
const strict = {
  noEmit: true,
  declaration: false,
  exactOptionalPropertyTypes: true,
  typeRoots: [resolve(root, 'node_modules/@types')],
};
await json('native.json', {
  extends: resolve(root, 'tsconfig.json'),
  compilerOptions: { ...strict, paths },
  include: [resolve(root, 'fixtures/card-consumer/native.tsx')],
  exclude: [],
});
// Keep the original consumer in an owned cache project. Resolve the pinned
// package through its real public exports, without aliases or shared-cache writes.
const original = await realpath(
  resolve(root, '.cache/palette-reference/node_modules/@mui/material'),
);
const originalProject = resolve(output, 'original-public');
await mkdir(resolve(originalProject, 'node_modules/@mui'), { recursive: true });
await mkdir(resolve(originalProject, 'node_modules/@types'), { recursive: true });
await symlink(original, resolve(originalProject, 'node_modules/@mui/material'), 'dir');
await symlink(
  await realpath(resolve(root, '.cache/palette-reference/node_modules/@types/react')),
  resolve(originalProject, 'node_modules/@types/react'),
  'dir',
);
await writeFile(
  resolve(originalProject, 'package.json'),
  JSON.stringify({ private: true, type: 'module' }) + '\n',
);
await writeFile(
  resolve(originalProject, 'consumer.tsx'),
  await readFile(resolve(root, 'fixtures/card-consumer/original.tsx')),
);
await json('original.json', {
  extends: resolve(root, 'tsconfig.json'),
  compilerOptions: { ...strict, paths: {}, customConditions: [] },
  include: [resolve(originalProject, 'consumer.tsx')],
  exclude: [],
});
compile('original.json');
compile('native.json');
console.log(
  'Strict Card consumers passed: emitted native declarations, canonical class/theme augmentation, native roots/refs/exact optional props, required/discriminated roots and original 9.5.0 declaration counterexamples.',
);
