// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
const { reference } = await loadReference('@mui/material', [
  'ButtonGroup/ButtonGroup.js',
  'Button/Button.js',
  'ButtonBase/ButtonBase.js',
  'styles/ThemeProvider.js',
]);
const { reference: systemReference } = await loadReference('@mui/system', [
  'createStyled/createStyled.js',
]);
const browserSource = 'scripts/reference/button-group-preparation-browser.mjs';
const browserSha256 = createHash('sha256')
  .update(await readFile(browserSource))
  .digest('hex');
const metadata = {
  reference,
  systemReference,
  browserSource,
  browserSha256,
  cachePolicy: 'fresh original Emotion cache per case, retained across each case update sequence',
};
const output = '.cache/button-group-preparation-reference';
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
    alias,
    define: { 'process.env.NODE_ENV': '"development"' },
    banner: { js: 'window.buttonGroupPreparationMetadata=' + JSON.stringify(metadata) + ';' },
  });
  await writeFile(
    output + '/index.html',
    '<!doctype html><html><head><title>Pinned ButtonGroup preparation</title></head><body><h1>ButtonGroup callback preparation</h1><p>Synthetic observations of original MUI 9.5.0</p><p id="status">Collecting observations</p><div id="root"></div><script src="/bundle.js"></script></body></html>',
  );
  await json(output + '/metadata.json', metadata);
  console.log('Prepared integrity-checked callback reference in ' + output);
} else if (
  action === 'record' &&
  typeof process.argv[3] === 'string' &&
  process.argv.length === 4
) {
  const data = JSON.parse(await readFile(process.argv[3], 'utf8'));
  const counts = [
    'root',
    'grouped',
    'firstButton',
    'middleButton',
    'lastButton',
    'sx',
    'variantProps',
    'variantStyle',
  ];
  const trace = (value) =>
    Array.isArray(value) && value.every((entry) => typeof entry === 'string');
  if (JSON.stringify(data.metadata) !== JSON.stringify(metadata))
    throw Error('Stale callback reference metadata');
  for (const kind of ['plain', 'strict']) {
    const value = data.observations?.[kind];
    if (!trace(value?.trace)) throw Error('Missing callback order: ' + kind);
    for (const phase of ['mount', 'childUpdate', 'groupUpdate'])
      if (
        !value[phase] ||
        Object.keys(value[phase]).length !== counts.length ||
        !counts.every((key) => Number.isInteger(value[phase][key]) && value[phase][key] >= 0)
      )
        throw Error('Incomplete callback counts: ' + kind + ' ' + phase);
  }
  for (const kind of ['accessors', 'rootDeferred', 'deferred']) {
    const value = data.observations?.[kind];
    if (
      !trace(value?.trace) ||
      typeof value.padding !== 'string' ||
      typeof value.minWidth !== 'string'
    )
      throw Error('Incomplete callback case: ' + kind);
  }
  if (
    !Array.isArray(data.observations.rootDeferred.sameArguments) ||
    !data.observations.rootDeferred.sameArguments.every((value) => typeof value === 'boolean') ||
    !Array.isArray(data.observations.deferred.sameArguments) ||
    !data.observations.deferred.sameArguments.every((value) => typeof value === 'boolean')
  )
    throw Error('Missing recursive argument observations');
  if (typeof data.observations.guarded?.padding !== 'string')
    throw Error('Missing guarded deferred CSS observation');
  await json('tests/fixtures/mui-button-group-preparation-9.5.0.json', {
    reference,
    systemReference,
    browserProbe: {
      source: browserSource,
      sha256: browserSha256,
      cachePolicy: metadata.cachePolicy,
    },
    observations: data.observations,
  });
  await json('upstream/button-group-preparation.json', {
    schemaVersion: 1,
    description:
      'Pinned MIT ButtonGroup callback evaluation and deferred CSS preparation observations.',
    reference,
    systemReference,
    browserProbe: { source: browserSource, sha256: browserSha256 },
    localFiles: [
      'packages/material/src/buttonGroup.tsx',
      'packages/system/src/sx.ts',
      'packages/system/src/nativePreparedComponent.ts',
      'packages/system/src/internal/prepared-style/index.ts',
    ],
    adaptations: [
      'Resolved named-slot output is scoped after source-order callbacks. Native joining geometry can rebind while retaining the owned theme/SX phases.',
    ],
  });
  console.log('Recorded original callback counts, order, arguments and provenance.');
} else throw Error('Use prepare | record OBSERVATIONS_JSON');
