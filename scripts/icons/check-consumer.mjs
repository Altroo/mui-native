// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { access, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { compileFunction } from 'node:vm';
import { createRequire } from 'node:module';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { createNativeTsconfig } = require('../../packages/compat/index.cjs');
const output = resolve(root, '.cache/icons-consumer');
const pkg = resolve(root, 'packages/icons');
const manifest = JSON.parse(await readFile(join(pkg, 'package.json'), 'utf8'));
const provenance = JSON.parse(
  await readFile(resolve(root, 'upstream/material-icons.json'), 'utf8'),
);
const names = Object.keys(provenance.artworkHashes);
for (const name of [...names, 'index', 'utils/createSvgIcon']) {
  for (const path of [
    'dist/' + name + '/index.js',
    'dist/' + name + '/index.d.ts',
    'dist/esm/' + name + '/index.mjs',
    'src/' + name + '/index.ts',
  ])
    await access(join(pkg, path));
}
assert.equal(manifest.sideEffects, false);
assert.equal(manifest.exports['.'].import, './dist/esm/index.mjs');
assert.equal(manifest.exports['./*'].import, './dist/esm/*/index.mjs');
await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'node_modules/@altroo'), { recursive: true });
await symlink(pkg, join(output, 'node_modules/@altroo/mui-native-icons'), 'dir');
const base = JSON.parse(await readFile(resolve(root, 'tsconfig.json'), 'utf8'));
const originalPaths = createNativeTsconfig({ nodeModulesPath: join(output, 'node_modules') })
  .compilerOptions.paths;
const paths = Object.fromEntries(
  Object.entries(base.compilerOptions.paths).map(([name, targets]) => [
    name,
    targets.map((target) => resolve(root, target)),
  ]),
);
Object.assign(
  paths,
  Object.fromEntries(
    Object.entries(originalPaths).filter(([name]) => name.startsWith('@mui/icons-material')),
  ),
  {
    '@altroo/mui-native-icons': [join(pkg, 'dist/index.d.ts')],
    '@altroo/mui-native-icons/*': [join(pkg, 'dist/*/index.d.ts')],
    '@altroo/mui-native/*': [resolve(root, '.cache/icons-types/material/src/*/index.d.ts')],
  },
);
await writeFile(
  join(output, 'tsconfig.json'),
  JSON.stringify(
    {
      extends: resolve(root, 'tsconfig.json'),
      compilerOptions: {
        noEmit: true,
        declaration: false,
        paths,
        typeRoots: [resolve(root, 'node_modules/@types')],
      },
      include: [resolve(root, 'fixtures/icons-consumer/consumer.tsx')],
      exclude: [],
    },
    null,
    2,
  ),
);
execFileSync(
  process.execPath,
  [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', join(output, 'tsconfig.json')],
  { cwd: root, stdio: 'inherit' },
);

const cache = new Map();
let initialized = 0;
const react = {
  Fragment: Symbol.for('react.fragment'),
  createElement: (type, props, ...children) => ({ type, props, children }),
};
function load(file) {
  file = existsSync(file + '.js')
    ? file + '.js'
    : existsSync(join(file, 'index.js'))
      ? join(file, 'index.js')
      : file;
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  compileFunction(readFileSync(file, 'utf8'), ['module', 'exports', 'require'])(
    module,
    module.exports,
    (specifier) => {
      if (specifier.startsWith('.')) return load(resolve(dirname(file), specifier));
      if (specifier === 'react') return react;
      if (specifier === 'react-native-svg') return { Path: 'NativePath' };
      if (specifier === '@altroo/mui-native/SvgIcon') return { SvgIcon: function SvgIcon() {} };
      if (specifier === '@altroo/mui-native/utils/createSvgIcon')
        return {
          createSvgIcon: (artwork, displayName) => {
            initialized++;
            return { artwork, displayName };
          },
        };
      throw Error('Unexpected native icon runtime dependency: ' + specifier);
    },
  );
  return module.exports;
}
const deep = load(join(pkg, 'dist/Add/index.js')).default;
assert.equal(initialized, 1);
const beforeHeap = process.memoryUsage().heapUsed,
  started = performance.now();
const barrel = load(join(pkg, 'dist/index.js'));
const rootMetrics = {
  milliseconds: performance.now() - started,
  heapDeltaBytes: process.memoryUsage().heapUsed - beforeHeap,
};
assert.equal(barrel.Add, deep);
assert.equal(load(join(pkg, 'dist/index/index.js')).Add, deep);
assert.equal(initialized, names.length);
for (const name of names)
  assert.equal(barrel[name], load(join(pkg, 'dist', name, 'index.js')).default);
const esm = await build({
  stdin: {
    contents:
      'import Deep from "@altroo/mui-native-icons/Add"; import {Add} from "@altroo/mui-native-icons"; export const identical = Deep === Add; export const name = Add.displayName;',
    resolveDir: output,
  },
  format: 'esm',
  bundle: true,
  platform: 'node',
  write: false,
  metafile: true,
  external: ['react-native-svg'],
  plugins: [
    {
      name: 'native-factory-test-double',
      setup(builder) {
        builder.onResolve({ filter: /^@altroo\/mui-native\// }, (args) => ({
          path: args.path,
          namespace: 'native-stub',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'native-stub' }, () => ({
          contents:
            'export const SvgIcon = function SvgIcon() {}; export function createSvgIcon(artwork, displayName) { return {artwork, displayName}; }',
        }));
      },
    },
  ],
});
const imported = await import(
  'data:text/javascript;base64,' + Buffer.from(esm.outputFiles[0].text).toString('base64')
);
assert.equal(imported.identical, true);
assert.equal(imported.name, 'Add');
const emitted = Object.keys(Object.values(esm.metafile.outputs)[0].inputs).filter(
  (file) =>
    /dist\/esm\/[A-Z].*\/index\.mjs$/.test(file) &&
    Object.values(esm.metafile.outputs)[0].inputs[file].bytesInOutput > 0,
);
assert.equal(emitted.length, 1);
const report = {
  schemaVersion: 1,
  icons: names.length,
  nativeAndOriginalImportTypes: 'passed',
  cjsRootDeepIdentity: 'passed',
  esmRootDeepIdentity: 'passed',
  treeShakenGlyphs: emitted.length,
  initialization: {
    deepGlyphs: 1,
    unshakenRootGlyphs: initialized,
    mockedBackendRoot: rootMetrics,
    limitation:
      'Mocked local factory/React backend. Not a Metro, device, SVG renderer or application startup benchmark.',
  },
};
await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
