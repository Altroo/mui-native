// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import {
  assertCacheObservations,
  assertStyledProgrammes,
  assertCssEmissions,
  assertClassMembership,
} from './button-group-cache-contract.mjs';
import { resolve, dirname } from 'node:path';
import { build } from 'esbuild';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
const { reference } = await loadReference('@mui/material', [
  'ButtonGroup/ButtonGroup.js',
  'Button/Button.js',
  'ButtonBase/ButtonBase.js',
  'styles/styled.js',
  'Box/Box.js',
]);
const { reference: systemReference } = await loadReference('@mui/system', [
  'styleFunctionSx/styleFunctionSx.js',
  'styleFunctionSx/defaultSxConfig.js',
  'style/style.js',
  'preprocessStyles.js',
  'createStyled/createStyled.js',
  'styled/styled.js',
  'createBox/createBox.js',
]);
const browserSource = 'scripts/reference/button-group-cache-browser.mjs';
const browserSha256 = createHash('sha256')
  .update(await readFile(browserSource))
  .digest('hex');
const contractSource = 'scripts/reference/button-group-cache-contract.mjs';
const contractSha256 = createHash('sha256')
  .update(await readFile(contractSource))
  .digest('hex');
const classBrowserSource = 'scripts/reference/styled-cache-classes-browser.mjs';
const classBrowserSha256 = createHash('sha256')
  .update(await readFile(classBrowserSource))
  .digest('hex');
const lock = JSON.parse(await readFile('.cache/palette-reference/package-lock.json', 'utf8'));
const supporting = await Promise.all(
  [
    '@emotion/cache',
    '@emotion/react',
    '@emotion/styled',
    '@emotion/serialize',
    '@emotion/utils',
    'stylis',
  ].map(async (name) => {
    const short = name.split('/').at(-1);
    const entry = lock.packages['node_modules/' + name];
    const root = '.cache/palette-reference/node_modules/' + name;
    const manifest = JSON.parse(await readFile(root + '/package.json', 'utf8'));
    if (manifest.name !== name || manifest.version !== entry.version || manifest.license !== 'MIT')
      throw Error('Incorrect supporting reference: ' + name);
    const url = new URL(entry.resolved);
    if (
      url.origin !== 'https://registry.npmjs.org' ||
      url.pathname !== '/' + name + '/-/' + short + '-' + entry.version + '.tgz'
    )
      throw Error('Unexpected supporting archive URL');
    const artifact =
      '.cache/upstream/' + name.replace('@', '').replace('/', '-') + '-' + entry.version + '.tgz';
    let bytes;
    try {
      bytes = await readFile(artifact);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const response = await fetch(url);
      if (!response.ok)
        throw new Error('Supporting archive HTTP ' + response.status, { cause: error });
      bytes = Buffer.from(await response.arrayBuffer());
      await writeFile(artifact, bytes);
    }
    const [algorithm, expected] = entry.integrity.split('-');
    if (
      !['sha512', 'sha256'].includes(algorithm) ||
      createHash(algorithm).update(bytes).digest('base64') !== expected
    )
      throw Error('Supporting archive integrity mismatch');
    // Compare all packaged JavaScript and the license without extracting archives.
    const verified = JSON.parse(
      execFileSync(
        'python3',
        [
          '-c',
          'import sys,tarfile,pathlib,hashlib,json; t=tarfile.open(sys.argv[1]); root=pathlib.Path(sys.argv[2]); out={};\nfor m in t.getmembers():\n if m.isfile() and (m.name.endswith(".js") or m.name=="package/LICENSE"):\n  rel=pathlib.PurePosixPath(m.name).relative_to("package"); assert ".." not in rel.parts; expected=t.extractfile(m).read(); actual=(root/str(rel)).read_bytes(); assert expected==actual, "Modified supporting reference: "+str(rel); out[str(rel)]=hashlib.sha256(actual).hexdigest()\nassert "LICENSE" in out; print(json.dumps(out))',
          artifact,
          root,
        ],
        { encoding: 'utf8' },
      ),
    );
    return { name, version: entry.version, integrity: entry.integrity, sourceFiles: verified };
  }),
);
const renderer = Object.fromEntries(
  ['react', 'react-dom'].map((name) => {
    const entry = lock.packages['node_modules/' + name];
    return [name, { version: entry.version, integrity: entry.integrity }];
  }),
);
const metadata = {
  reference,
  systemReference,
  renderer,
  supporting,
  browserSource,
  browserSha256,
  contractSource,
  contractSha256,
  classBrowserSource,
  classBrowserSha256,
};
const output = '.cache/button-group-cache-reference';
const action = process.argv[2] ?? 'prepare';
async function json(file, data) {
  await writeFile(
    file,
    await format(JSON.stringify(data), { ...(await resolveConfig(file)), filepath: file }),
  );
}
if (action === 'prepare' && process.argv.length <= 3) {
  await mkdir(output, { recursive: true });
  const require = createRequire(resolve('.cache/palette-reference/package.json'));
  const alias = Object.fromEntries(
    ['react', 'react-dom'].map((name) => [name, dirname(require.resolve(name + '/package.json'))]),
  );
  for (const name of ['@emotion/react', '@emotion/cache']) alias[name] = require.resolve(name);
  await build({
    entryPoints: [browserSource],
    outfile: output + '/bundle.js',
    bundle: true,
    platform: 'browser',
    format: 'iife',
    tsconfigRaw: { compilerOptions: {} },
    alias,
    define: { 'process.env.NODE_ENV': '"development"' },
    banner: { js: 'window.buttonGroupCacheMetadata=' + JSON.stringify(metadata) + ';' },
  });
  await writeFile(
    output + '/index.html',
    '<!doctype html><html><head><title>Pinned ButtonGroup cache</title></head><body><h1>Original cache order</h1><p id="status">Collecting</p><div id="root"></div><script src="./bundle.js"></script></body></html>',
  );
  await json(output + '/metadata.json', metadata);
  console.log('Prepared original cache sequences in ' + output);
} else if (action === 'record' && process.argv.length === 4) {
  const data = JSON.parse(await readFile(process.argv[3], 'utf8'));
  if (JSON.stringify(data.metadata) !== JSON.stringify(metadata))
    throw Error('Stale cache reference metadata');
  assertCacheObservations(data.observations);
  const comparisons = [
    'spacing-alias',
    'unitless-number-string',
    'different-css-units',
    'array-versus-flat',
    'repeated-declaration',
    'inactive-media',
    'unsupported-native-css',
    'shadow-token-literal',
    'numeric-border',
    'responsive-null-reset',
    'css-fallback-array',
    'css-literal-alias',
    'css-literal-palette',
    'shadow-token-miss-literal',
    'shadow-token-miss-absent',
    'css-array-single',
    'css-unitless-number-string',
    'css-shorthand-versus-edges',
    'css-native-normalized-length',
    'shadow-theme-change',
    'shadow-falsy-token',
  ];
  if (
    JSON.stringify(data.programComparisons?.map((item) => item.name)) !==
      JSON.stringify(comparisons) ||
    data.programComparisons.some(
      (item) =>
        !['sx', 'css'].includes(item.mode) ||
        typeof item.leftCss !== 'string' ||
        typeof item.rightCss !== 'string' ||
        item.equal !== (item.leftCss === item.rightCss),
    )
  )
    throw Error('Incomplete original CSS identity comparisons');
  if (
    typeof data.overridePresence?.absent !== 'string' ||
    typeof data.overridePresence.empty !== 'string' ||
    data.overridePresence.equal !== (data.overridePresence.absent === data.overridePresence.empty)
  )
    throw Error('Missing actual overrides-resolver presence observation');
  assertStyledProgrammes(data.styledPrograms);
  assertCssEmissions(data.cssEmissions);
  assertClassMembership(data.classMembership);
  if (
    !Array.isArray(data.buttonSourceState) ||
    data.buttonSourceState.length !== 2 ||
    data.buttonSourceState.some(
      (row, index) =>
        row.authoredPressed !== (index === 1) ||
        row.before?.owners?.length !== 1 ||
        row.after?.owners?.length !== 1 ||
        row.before?.own?.length !== 1 ||
        row.after?.own?.length !== 1 ||
        typeof row.before.own[0].css !== 'string' ||
        !row.before.own[0].css ||
        JSON.stringify(row.before.own) !== JSON.stringify(row.after.own) ||
        row.before.owners[0].hasPressed !== (index === 1) ||
        row.before.owners[0].pressed !== (index === 1 ? true : null) ||
        row.before.owners[0].hasFocusVisible !== false ||
        row.before.owners[0].focusVisible !== null ||
        JSON.stringify(row.after.baseFocus) !==
          JSON.stringify(index === 0 ? [false, true] : [false]),
    )
  )
    throw Error('Invalid original source owner-state observations');

  const { serializeStyles } = createRequire(resolve('.cache/palette-reference/package.json'))(
    '@emotion/serialize',
  );
  for (const row of data.styledPrograms)
    if (row.className !== 'constructor-css-' + serializeStyles([row.css]).name)
      throw Error('Original CSS body does not match its generated class: ' + row.name);
  await json('tests/fixtures/mui-button-group-cache-9.5.0.json', data);
  console.log('Recorded pinned original cache sequences');
} else throw Error('Use prepare or record <observations.json>');
