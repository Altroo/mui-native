// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(root, '.cache/list-item-icon-consumer');
await mkdir(output, { recursive: true });
await rm(resolve(output, 'types'), { recursive: true, force: true });
const json = (file, data) => writeFile(resolve(output, file), JSON.stringify(data, null, 2) + '\n');
const compile = (config) =>
  execFileSync(
    process.execPath,
    [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', resolve(output, config)],
    { cwd: root, stdio: 'inherit' },
  );
await json('emit.json', {
  extends: resolve(root, 'tsconfig.build.json'),
  compilerOptions: { outDir: resolve(output, 'types') },
  include: [
    resolve(root, 'packages/material/src/index.ts'),
    resolve(root, 'packages/material/src/styles/index.ts'),
    resolve(root, 'packages/material/src/ListItemIcon/index.ts'),
  ],
  exclude: [resolve(root, 'node_modules'), '**/dist'],
});
compile('emit.json');
const base = JSON.parse(await readFile(resolve(root, 'tsconfig.json'), { encoding: 'utf8' }));
const paths = Object.fromEntries(
  Object.entries(base.compilerOptions.paths).map(([name, targets]) => [
    name,
    targets.map((target) => resolve(root, target)),
  ]),
);
Object.assign(paths, {
  '@altroo/mui-native-host': [resolve(output, 'types/native-host/src/index.d.ts')],
  '@altroo/mui-native-system': [resolve(output, 'types/system/src/index.d.ts')],
  '@mui/material': [resolve(output, 'types/material/src/index.d.ts')],
  '@altroo/mui-native': [resolve(output, 'types/material/src/index.d.ts')],
  '@mui/material/styles': [resolve(output, 'types/material/src/styles/index.d.ts')],
  '@mui/material/ListItemIcon': [resolve(output, 'types/material/src/ListItemIcon/index.d.ts')],
  '@altroo/mui-native/*': [resolve(output, 'types/material/src/*/index.d.ts')],
});
await json('consumer.json', {
  extends: resolve(root, 'tsconfig.json'),
  compilerOptions: {
    noEmit: true,
    declaration: false,
    exactOptionalPropertyTypes: true,
    typeRoots: [resolve(root, 'node_modules/@types')],
    paths,
  },
  include: [resolve(root, 'fixtures/list-item-icon-consumer/consumer.tsx')],
  exclude: [],
});
compile('consumer.json');
// Resolve the original package through its real published exports, with no path alias.
const originalFixture = resolve(root, '.cache/palette-reference/list-item-icon-consumer.tsx');
await writeFile(
  originalFixture,
  await readFile(resolve(root, 'fixtures/list-item-icon-consumer/original.tsx')),
);
await json('original.json', {
  extends: resolve(root, 'tsconfig.json'),
  compilerOptions: {
    noEmit: true,
    declaration: false,
    exactOptionalPropertyTypes: true,
    typeRoots: [resolve(root, 'node_modules/@types')],
    paths: {},
  },
  include: [originalFixture],
  exclude: [],
});
compile('original.json');
console.log(
  'Strict emitted ListItemIcon consumer passed: all native attributes/events, native refs/roots, classes/augmentation, optional undefined and original/direct imports.',
);
