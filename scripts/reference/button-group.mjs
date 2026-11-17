// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import prettier from 'prettier';
const { format, resolveConfig } = prettier;
import { loadReference } from './load.mjs';
const sources = [
  'ButtonGroup/ButtonGroup.js',
  'ButtonGroup/ButtonGroup.d.ts',
  'ButtonGroup/index.js',
  'ButtonGroup/index.d.ts',
  'ButtonGroup/buttonGroupClasses.js',
  'ButtonGroup/buttonGroupClasses.d.ts',
  'ButtonGroup/ButtonGroupContext.js',
  'ButtonGroup/ButtonGroupContext.d.ts',
  'ButtonGroup/ButtonGroupButtonContext.js',
  'ButtonGroup/ButtonGroupButtonContext.d.ts',
  'Button/Button.js',
  'ButtonBase/ButtonBase.js',
  'Portal/Portal.js',
  'Typography/Typography.js',
];
const { reference } = await loadReference('@mui/material', sources);
const { reference: utilitiesReference } = await loadReference('@mui/utils', [
  'generateUtilityClass/generateUtilityClass.js',
]);
const browserSource = 'scripts/reference/button-group-browser.mjs';
const browserSha256 = createHash('sha256')
  .update(await readFile(browserSource))
  .digest('hex');
const action = process.argv[2] ?? 'prepare';
const metadata = {
  reference,
  utilitiesReference,
  browserSource,
  browserSha256,
  cachePolicy: 'fresh Emotion cache per independently mounted case',
};
const output = '.cache/button-group-reference';
async function json(file, data) {
  await writeFile(
    file,
    await format(JSON.stringify(data), { ...(await resolveConfig(file)), filepath: file }),
  );
}
if (
  (action === 'prepare' && process.argv.length === 3) ||
  (action === 'prepare' && process.argv.length === 2)
) {
  await mkdir(output, { recursive: true });
  const require = createRequire(resolve('.cache/palette-reference/package.json'));
  const alias = Object.fromEntries(
    ['react', 'react-dom'].map((name) => [name, dirname(require.resolve(name + '/package.json'))]),
  );
  // MUI's CJS entry and this client must share the same Emotion context.
  for (const name of ['@emotion/react', '@emotion/cache']) alias[name] = require.resolve(name);
  await build({
    entryPoints: [browserSource],
    outfile: output + '/bundle.js',
    bundle: true,
    platform: 'browser',
    format: 'iife',
    alias,
    define: { 'process.env.NODE_ENV': '"development"' },
    banner: { js: 'window.buttonGroupReferenceMetadata=' + JSON.stringify(metadata) + ';' },
  });
  await writeFile(
    output + '/index.html',
    '<!doctype html><html><head><title>Pinned ButtonGroup reference</title></head><body><h1>Pinned ButtonGroup reference</h1><p>Synthetic contract observations. This is not the native catalog.</p><p id="status">Collecting observations</p><div id="root"></div><script src="/bundle.js"></script></body></html>',
  );
  await json(output + '/metadata.json', metadata);
  console.log('Prepared integrity-checked ButtonGroup browser probe in ' + output);
} else if (
  action === 'record' &&
  typeof process.argv[3] === 'string' &&
  process.argv.length === 4
) {
  const data = JSON.parse(await readFile(process.argv[3], { encoding: 'utf8' }));
  if (
    JSON.stringify(data.metadata) !== JSON.stringify(metadata) ||
    data.fixtures?.length !== 51 ||
    !data.classes ||
    !data.contracts?.customRoot ||
    !data.contracts?.nested ||
    data.contracts?.live?.length !== 2 ||
    data.contracts?.focus?.length !== 7 ||
    data.contracts?.portalOwnership?.length !== 3 ||
    data.contracts?.portalDestinations?.length !== 2 ||
    data.contracts?.portalText?.length !== 4 ||
    data.contracts?.slotVariants?.length !== 2 ||
    !data.contracts?.callbacks ||
    Object.keys(data.contracts?.utilityClasses ?? {}).length !== 13
  )
    throw Error('Stale or incomplete original-browser observation');
  await json('tests/fixtures/mui-button-group-9.5.0.json', {
    reference,
    utilitiesReference,
    browserProbe: {
      source: browserSource,
      sha256: browserSha256,
      cachePolicy: metadata.cachePolicy,
    },
    classes: data.classes,
    fixtures: data.fixtures,
    contracts: data.contracts,
  });
  await json('upstream/button-group.json', {
    schemaVersion: 1,
    description:
      'Pinned MIT ButtonGroup/context/class reference; browser observations do not promote native compatibility.',
    reference,
    utilitiesReference,
    cachePolicy: metadata.cachePolicy,
    localFiles: [
      'packages/material/src/buttonGroup.tsx',
      'packages/material/src/buttonGroupTypes.ts',
      'packages/material/src/buttonGroupClasses.ts',
      'packages/material/src/buttonGroupContext.ts',
    ],
    adaptations: [
      'Native layout and scoped descendant styles replace DOM/CSS grouping. Context defaults and button positions retain original priority.',
      'Native Views and button hosts replace DOM roots. Physical accessibility and release performance remain separate gates.',
    ],
  });
  console.log(
    'Recorded ' +
      data.fixtures.length +
      ' original-browser ButtonGroup observations and provenance.',
  );
} else throw Error('Use prepare | record OBSERVATIONS_JSON');
