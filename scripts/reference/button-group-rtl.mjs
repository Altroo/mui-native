// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { build } from 'esbuild';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';

const material = await loadReference('@mui/material', [
  'ButtonGroup/ButtonGroup.js',
  'Button/Button.js',
  'Typography/Typography.js',
]);
const system = await loadReference('@mui/system', [
  'RtlProvider/index.js',
  'ThemeProvider/ThemeProvider.js',
]);
const plugin = {
  name: '@mui/stylis-plugin-rtl',
  version: '9.5.0',
  integrity:
    'sha512-AyS9NC0FGhBTyH+IiCD8LnOlvHgJHckVHn74mjXbY97dKAaf7HlH5LXsbZFlPmSC0V0gXkyipqmMhliT99v+qg==',
  license: 'MIT',
  licenseSha256: '4c57cedbef546270e5648786682f633b2e6ae62c8862a45797bcb6d0bffda98d',
};
const action = process.argv[2] ?? 'prepare';
const cachedArtifact = '.cache/upstream/stylis-plugin-rtl-9.5.0.tgz';
const artifact =
  action === 'prepare' ? (process.argv[3] ?? cachedArtifact) : (process.argv[4] ?? cachedArtifact);
const bytes = await readFile(artifact);
if ('sha512-' + createHash('sha512').update(bytes).digest('base64') !== plugin.integrity)
  throw Error('Invalid pinned official RTL plugin artifact');
const installed = '.cache/palette-reference/node_modules/@mui/stylis-plugin-rtl';
const manifest = JSON.parse(await readFile(installed + '/package.json', 'utf8'));
if (
  manifest.name !== plugin.name ||
  manifest.version !== plugin.version ||
  manifest.license !== plugin.license
)
  throw Error('Invalid installed official RTL plugin');
const sourceFiles = {};
for (const file of ['index.js', 'index.mjs', 'LICENSE']) {
  const original = execFileSync('python3', [
    '-c',
    'import sys,tarfile; t=tarfile.open(sys.argv[1]); sys.stdout.buffer.write(t.extractfile("package/"+sys.argv[2]).read())',
    artifact,
    file,
  ]);
  const actual = await readFile(installed + '/' + file);
  if (!original.equals(actual)) throw Error('Modified RTL plugin source: ' + file);
  sourceFiles[file] = createHash('sha256').update(actual).digest('hex');
}
if (sourceFiles.LICENSE !== plugin.licenseSha256) throw Error('Invalid RTL plugin license');
const browserSource = 'scripts/reference/button-group-rtl-browser.mjs';
const metadata = {
  material: material.reference,
  system: system.reference,
  plugin: { ...plugin, sourceFiles },
  browserSource,
  browserSha256: createHash('sha256')
    .update(await readFile(browserSource))
    .digest('hex'),
  cachePolicy:
    'fresh Emotion cache per case; DOM direction and official RTL plugin configured independently',
};
const output = '.cache/button-group-reference/rtl';
async function json(file, value) {
  await writeFile(
    file,
    await format(JSON.stringify(value), { ...(await resolveConfig(file)), filepath: file }),
  );
}
if (action === 'prepare') {
  await mkdir(output, { recursive: true });
  await mkdir(dirname(cachedArtifact), { recursive: true });
  await writeFile(cachedArtifact, bytes);
  const alias = Object.fromEntries(
    ['react', 'react-dom'].map((name) => [
      name,
      dirname(material.require.resolve(name + '/package.json')),
    ]),
  );
  for (const name of ['@emotion/react', '@emotion/cache'])
    alias[name] = material.require.resolve(name);
  await build({
    entryPoints: [browserSource],
    outfile: output + '/bundle.js',
    bundle: true,
    platform: 'browser',
    format: 'iife',
    alias,
    define: { 'process.env.NODE_ENV': '"development"' },
    banner: { js: 'window.buttonGroupRtlMetadata=' + JSON.stringify(metadata) + ';' },
  });
  await writeFile(
    output + '/index.html',
    '<!doctype html><html dir="ltr"><head><title>Pinned ButtonGroup RTL</title></head><body><h1>Configured ButtonGroup RTL</h1><p id="status">Collecting</p><div id="root"></div><script src="/rtl/bundle.js"></script></body></html>',
  );
  await json(output + '/metadata.json', metadata);
  console.log(
    'Prepared verified ButtonGroup RTL probe at /rtl/ under the existing reference server',
  );
} else if (action === 'record' && process.argv[3]) {
  const data = JSON.parse(await readFile(process.argv[3], 'utf8'));
  if (
    JSON.stringify(data.metadata) !== JSON.stringify(metadata) ||
    data.fixtures?.length !== 33 ||
    data.alignments?.length !== 7
  )
    throw Error('Stale or incomplete configured RTL observation');
  await json('tests/fixtures/mui-button-group-rtl-9.5.0.json', data);
  await json('upstream/button-group-rtl.json', {
    schemaVersion: 1,
    description:
      'Configured original DOM/theme/official-plugin RTL observations, with independent negative controls. Native direction is an explicit adapter policy.',
    ...metadata,
  });
  console.log('Recorded 33 original Group RTL geometry cases and 7 logical text alignment cases');
} else throw Error('Use prepare [PLUGIN_TARBALL] | record OBSERVATIONS_JSON [PLUGIN_TARBALL]');
