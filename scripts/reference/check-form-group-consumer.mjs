// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(root, '.cache/form-group-contract-consumer');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const json = (path, value) =>
  writeFile(resolve(output, path), JSON.stringify(value, null, 2) + '\n');
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
    resolve(root, 'packages/material/src/FormGroup/index.ts'),
    resolve(root, 'packages/material/src/FormGroup/formGroupClasses/index.ts'),
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
  '@mui/material': [resolve(output, 'types/material/src/index.d.ts')],
  '@mui/material/FormGroup': [resolve(output, 'types/material/src/FormGroup/index.d.ts')],
  '@mui/material/styles': [resolve(output, 'types/material/src/styles/index.d.ts')],
  '@altroo/mui-native': [resolve(output, 'types/material/src/index.d.ts')],
  '@altroo/mui-native/*': [resolve(output, 'types/material/src/*/index.d.ts')],
  '@altroo/mui-native-system': [resolve(output, 'types/system/src/index.d.ts')],
  '@altroo/mui-native-system/DefaultPropsProvider': [
    resolve(output, 'types/system/src/DefaultPropsProvider/index.d.ts'),
  ],
  '@altroo/mui-native-host': [resolve(output, 'types/native-host/src/index.d.ts')],
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
  include: [resolve(root, 'fixtures/form-group-contract-consumer/consumer.tsx')],
  exclude: [],
});
compile('consumer.json');
console.log(
  'Strict emitted FormGroup consumer passed: host attributes, events, refs, canonical augmentation and exact optional props.',
);
