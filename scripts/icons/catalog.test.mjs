// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile, access, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildIconEsm } from './build.mjs';
import { compileFunction } from 'node:vm';
import test from 'node:test';
import { build } from 'esbuild';
import { loadCatalog, generateIcons, parseIcon, artworkHash, sha256 } from './generate.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { resolveMuiImport, createNativeTsconfig } = require('../../packages/compat/index.cjs');
const record = JSON.parse(await readFile('upstream/material-icons.json', { encoding: 'utf8' }));
const names = Object.keys(record.artworkHashes);
async function optionalCatalog(probe = access, load = loadCatalog) {
  try {
    await probe('.cache/upstream/icons-material-9.5.0.tgz');
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
  // A present archive makes the baseline and snapshot mandatory. Their failures
  // must not downgrade independent original-source comparisons to a skip.
  return load();
}
const catalog = await optionalCatalog();

function shape(type, input, key) {
  const { children, key: propKey, ...props } = input ?? {};
  return {
    type,
    props,
    children: children == null ? [] : Array.isArray(children) ? children : [children],
    ...(key === undefined && propKey === undefined ? {} : { key: key ?? propKey }),
  };
}
function captured(path, name) {
  return { name, path: Array.isArray(path) ? { type: '#array', props: {}, children: path } : path };
}
const runtime = { jsx: shape, jsxs: shape, Fragment: '#fragment' };
const react = {
  Fragment: '#fragment',
  createElement(type, props, ...children) {
    return shape(type, {
      ...props,
      ...(children.length ? { children: children.length === 1 ? children[0] : children } : {}),
    });
  },
};
function original(name) {
  const exports = {};
  compileFunction(catalog.archive.files[name + '.js'], ['exports', 'require'])(
    exports,
    (specifier) => {
      if (specifier === './utils/createSvgIcon') return captured;
      if (specifier === 'react/jsx-runtime') return runtime;
      if (specifier === 'react') return react;
      if (specifier === '@babel/runtime/helpers/interopRequireWildcard')
        return { default: (value) => value };
      if (specifier === '@babel/runtime/helpers/interopRequireDefault')
        return { default: (value) => ({ default: value }) };
      throw Error('Unexpected original require: ' + specifier);
    },
  );
  return JSON.parse(JSON.stringify(exports.default));
}
function generated(source) {
  const code = source.replace(/^import .*;\n/gm, '').replace(/^export .*;\n/gm, '');
  return JSON.parse(
    JSON.stringify(
      compileFunction(code + '\nreturn Icon;', ['React', 'createSvgIcon'])(react, captured),
    ),
  );
}

test('all 10,750 generated SVG trees match original captured hashes and available original modules', async () => {
  assert.equal(names.length, 10750);
  for (const name of names) {
    const source = await readFile(`packages/icons/src/${name}/index.ts`, { encoding: 'utf8' });
    const actual = generated(source);
    assert.equal(artworkHash(actual), record.artworkHashes[name], name);
    if (catalog) assert.deepEqual(actual, original(name), name);
  }
});
test('every original public glyph and factory deep import maps exactly on native', () => {
  const paths = createNativeTsconfig().compilerOptions.paths;
  for (const name of [...names, 'index', 'utils/createSvgIcon']) {
    assert.equal(
      resolveMuiImport('@mui/icons-material/' + name, 'ios'),
      '@altroo/mui-native-icons/' + name,
    );
    assert.equal(
      resolveMuiImport('@mui/icons-material/' + name, 'android'),
      '@altroo/mui-native-icons/' + name,
    );
    assert(paths['@mui/icons-material/' + name][0].endsWith(`/${name}/index.d.ts`));
  }
  assert.throws(
    () => resolveMuiImport('@mui/icons-material/NotAnOriginalIcon', 'ios'),
    /not implemented/,
  );
  assert.equal(resolveMuiImport('@mui/icons-material/Add', 'web'), '@mui/icons-material/Add');
});
test('deep modules depend on the factory without importing any barrel or another glyph', async () => {
  for (const name of names) {
    const source = await readFile(`packages/icons/src/${name}/index.ts`, { encoding: 'utf8' });
    assert.deepEqual(
      [...source.matchAll(/^import .*from '(.*)';$/gm)].map((match) => match[1]),
      ['react', '../utils/createSvgIcon'],
      name,
    );
  }
});
test(
  'generator is deterministic and check mode leaves generated output unchanged',
  {
    skip:
      !catalog && 'Place the pinned archive in the local cache to run source regeneration proof',
  },
  async () => {
    assert.equal((await generateIcons({ check: true })).icons, 10750);
  },
);
test('unsupported source primitives or expressions fail closed instead of substituting artwork', () => {
  assert.throws(
    () =>
      parseIcon(
        'import icon from "./utils/createSvgIcon.mjs"; import {jsx} from "react/jsx-runtime"; export default icon(jsx("futurePrimitive", {}), "Probe");',
        'Probe',
      ),
    /Missing native SVG primitive/,
  );
  assert.throws(
    () =>
      parseIcon(
        'import icon from "./utils/createSvgIcon.mjs"; import {jsx} from "react/jsx-runtime"; export default icon(jsx("path", {d: compute()}), "Probe");',
        'Probe',
      ),
    /Unsupported icon attribute/,
  );
});
test('ESM root named import tree-shakes all unused glyphs; unshaken root initialization is explicitly eager', async () => {
  const bundle = await build({
    stdin: {
      contents: "export { Add } from './packages/icons/src/index.ts';",
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    metafile: true,
    format: 'esm',
    platform: 'neutral',
    external: ['react', '@altroo/*', 'react-native-svg'],
    treeShaking: true,
  });
  const contributions = Object.entries(Object.values(bundle.metafile.outputs)[0].inputs).filter(
    ([path, details]) =>
      /packages\/icons\/src\/[A-Z].*\/index\.ts$/.test(path) && details.bytesInOutput > 0,
  );
  assert.deepEqual(
    contributions.map(([path]) => path),
    ['packages/icons/src/Add/index.ts'],
  );
  assert(bundle.outputFiles[0].text.length < 5000);
  // Metro need not perform ESM dead-code elimination. Its source root barrel
  // still exposes 10,750 live re-exports; use direct imports for bounded startup.
  const source = await readFile('packages/icons/src/index.ts', { encoding: 'utf8' });
  assert.equal([...source.matchAll(/^export \{ default as /gm)].length, 10750);
});

test('retained generator, native source and glyph license hashes stay current without an archive cache', async () => {
  for (const [path, expected] of Object.entries({
    ...record.generatorSources,
    ...record.generated,
    [record.glyphLicense.file]: record.glyphLicense.sha256,
  }))
    assert.equal(sha256(await readFile(path)), expected, path);
});

test('only an absent archive skips reference loading; missing tracked inputs propagate', async () => {
  const missingArchive = Object.assign(Error('archive absent'), { code: 'ENOENT' });
  const missingSnapshot = Object.assign(Error('tracked snapshot absent'), { code: 'ENOENT' });
  assert.equal(
    await optionalCatalog(
      async () => {
        throw missingArchive;
      },
      async () => {
        assert.fail('Missing archive must not load a reference');
      },
    ),
    undefined,
  );
  await assert.rejects(
    optionalCatalog(
      async () => {},
      async () => {
        throw missingSnapshot;
      },
    ),
    (error) => error === missingSnapshot,
  );
  const denied = Object.assign(Error('archive unreadable'), { code: 'EACCES' });
  await assert.rejects(
    optionalCatalog(async () => {
      throw denied;
    }),
    (error) => error === denied,
  );
});

test('emitted ESM imports preserve file and directory precedence and reject missing modules', async () => {
  await mkdir('.cache', { recursive: true });
  const directory = await mkdtemp(resolve('.cache/icons-esm-fixture-'), { encoding: 'utf8' });
  try {
    /** @type {Record<string, string>} */
    const files = {
      'entry.ts': `export {value as file} from './file';
        export {value as view} from './view';
        export {value as folder} from './folder';
        export {value as folderView} from './folder-view';`,
      'file.ts': 'export const value = "ts";',
      'file/index.ts': 'export const value = "shadowed-directory";',
      'view.tsx': 'export const value = "tsx";',
      'view/index.ts': 'export const value = "shadowed-view-directory";',
      'folder/index.ts': 'export const value = "index-ts";',
      'folder-view/index.tsx': 'export const value = "index-tsx";',
    };
    /** @type {string[]} */
    const sources = [];
    for (const [name, source] of Object.entries(files)) {
      const file = join(directory, 'src', name);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, source);
      sources.push(file);
    }
    await buildIconEsm(directory, sources);
    const result = await import(pathToFileURL(join(directory, 'dist/esm/entry.mjs')).href);
    assert.deepEqual(
      { ...result },
      {
        file: 'ts',
        view: 'tsx',
        folder: 'index-ts',
        folderView: 'index-tsx',
      },
    );
    const missing = join(directory, 'src/missing.ts');
    await writeFile(missing, "export {value} from './not-found';");
    await assert.rejects(
      buildIconEsm(directory, [missing]),
      /Unresolved icon ESM dependency: \.\/not-found/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
