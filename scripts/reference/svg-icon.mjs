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
  'SvgIcon/SvgIcon.js',
  'SvgIcon/SvgIcon.d.ts',
  'SvgIcon/index.js',
  'SvgIcon/index.d.ts',
  'SvgIcon/createSvgIcon.js',
  'SvgIcon/createSvgIcon.d.ts',
  'SvgIcon/svgIconClasses.js',
  'SvgIcon/svgIconClasses.d.ts',
  'utils/createSvgIcon.js',
  'utils/createSvgIcon.d.ts',
];
const { reference } = await loadReference('@mui/material', sources);
const { reference: styleReference } = await loadReference('@mui/system', [
  'createStyled/createStyled.js',
]);
const browserSource = 'scripts/reference/svg-icon-browser.mjs';
const browserSha256 = createHash('sha256')
  .update(await readFile(browserSource))
  .digest('hex');
const action = process.argv[2] ?? 'prepare';
const metadata = { reference, browserSource, browserSha256 };
const output = '.cache/svg-icon-reference';
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
  await build({
    entryPoints: [browserSource],
    outfile: output + '/bundle.js',
    bundle: true,
    platform: 'browser',
    format: 'iife',
    alias,
    define: { 'process.env.NODE_ENV': '"development"' },
    banner: { js: 'window.svgIconReferenceMetadata=' + JSON.stringify(metadata) + ';' },
  });
  await writeFile(
    output + '/index.html',
    '<!doctype html><html><head><title>Pinned SvgIcon reference</title></head><body><h1>Pinned SvgIcon reference</h1><p>Synthetic contract observations. This is not the native catalog.</p><div id="root"></div><script src="/bundle.js"></script></body></html>',
  );
  await json(output + '/metadata.json', metadata);
  console.log('Prepared integrity-checked SvgIcon browser probe in ' + output);
} else if (
  action === 'record' &&
  typeof process.argv[3] === 'string' &&
  process.argv.length === 4
) {
  const data = JSON.parse(await readFile(process.argv[3], { encoding: 'utf8' }));
  if (
    JSON.stringify(data.metadata) !== JSON.stringify(metadata) ||
    data.fixtures?.length !== 53 ||
    !data.classes ||
    !data.factory
  )
    throw Error('Stale or incomplete original-browser observation');
  await json('tests/fixtures/mui-svg-icon-9.5.0.json', {
    reference,
    styleReference,
    browserProbe: { source: browserSource, sha256: browserSha256 },
    classes: data.classes,
    factory: data.factory,
    fixtures: data.fixtures,
  });
  await json('upstream/svg-icon.json', {
    schemaVersion: 1,
    description:
      'Pinned MIT SvgIcon/factory/class reference; browser observations do not promote native compatibility.',
    reference,
    styleReference,
    localFiles: [
      'packages/material/src/svgIcon.tsx',
      'packages/material/src/svgIconTypes.ts',
      'packages/material/src/svgIconClasses.ts',
      'packages/material/src/createSvgIcon.tsx',
    ],
    adaptations: [
      'Native SVG nodes replace DOM SVG. Known authored SVG elements map to the existing MIT react-native-svg backend without invoking custom components.',
      'CSS paint/layout/theme priority resolves at the native SVG boundary; browser shape-rendering hints and arbitrary CSS/classes require native equivalents.',
      'Native SVG refs and accessibility names replace DOM refs/title nodes. Physical screen-reader and performance validation remain separate.',
    ],
  });
  console.log(
    'Recorded ' + data.fixtures.length + ' original-browser SvgIcon observations and provenance.',
  );
} else throw Error('Use prepare | record OBSERVATIONS_JSON');
