// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import prettier from 'prettier';
const { format, resolveConfig } = prettier;
import { loadReference } from './load.mjs';
const { reference, require, directory } = await loadReference('@mui/system', [
  'borders/borders.js',
  'styleFunctionSx/defaultSxConfig.js',
]);
const original = require(`${directory}/node_modules/@mui/system/borders/borders.js`);
const inputs = [
  0,
  1,
  2,
  '3px solid red',
  'red solid 3px',
  'none',
  '0.25rem dashed rgba(10, 20, 30, 0.5)',
  '2px dotted currentColor',
];
const fixture = {
  reference,
  scope:
    'Actual pinned MUI border transform/output declarations. These are not browser-used-style or native device observations.',
  cases: inputs.map((input) => ({ input, output: original.border({ border: input, theme: {} }) })),
};
const peer = JSON.parse(await readFile('node_modules/react-native/package.json', 'utf8'));
if (peer.version !== '0.88.1' || peer.license !== 'MIT')
  throw Error('The reviewed native border peer changed.');
const nativeFiles = ['LICENSE', 'ReactCommon/react/renderer/components/view/conversions.h'];
const hashes = Object.fromEntries(
  await Promise.all(
    nativeFiles.map(async (file) => [
      file,
      createHash('sha256')
        .update(await readFile(`node_modules/react-native/${file}`))
        .digest('hex'),
    ]),
  ),
);
const record = {
  schemaVersion: 1,
  description:
    'Bounded all-edge CSS/SX borders and retained declaration provenance for native none paint.',
  references: [reference],
  nativeReference: {
    name: 'react-native',
    version: peer.version,
    license: peer.license,
    sourceFiles: hashes,
  },
  fixture: 'tests/fixtures/mui-css-borders-9.5.0.json',
  localFiles: [
    'packages/system/src/borders.ts',
    'packages/system/src/sx.ts',
    'packages/system/src/index.ts',
    'packages/system/src/nativeText.ts',
    'packages/system/src/textScope.tsx',
    'packages/material/src/nativeInlineBorders.ts',
    'packages/material/src/nativeControlStyles.ts',
    'packages/material/src/buttonBase.tsx',
    'tests/css-borders.test.tsx',
  ],
  adaptations: [
    'Numeric MUI borders retain their px solid/currentColor meaning. Supported all-edge string declarations are parsed into native width/style/color without treating literal colors as palette tokens.',
    'CSS none retains declared widths in private weak metadata until final native paint. The payload uses valid solid/zero widths; later CSS declarations or explicit native borderStyle/reset can restore declared widths. Width-only native overrides retain CSS none.',
    'Prepared sheets retain raw CSS. Existing style mergers and text-metric clones preserve the none declaration without adding native payload properties, hosts, contexts or globals.',
  ],
  limits: [
    'Per-edge border shorthands, arbitrary CSS functions, inherited/global shorthand keywords and paint styles beyond solid/dotted/dashed/none are not implemented by this translation.',
    'This source record does not establish device border painting, assistive technology or performance. Divider-owned slot inheritance requires its coordinated helper integration.',
  ],
};
for (const [file, value] of [
  ['tests/fixtures/mui-css-borders-9.5.0.json', fixture],
  ['upstream/css-borders.json', record],
]) {
  const output = await format(JSON.stringify(value), {
    ...(await resolveConfig(file)),
    parser: 'json',
  });
  if (process.argv.includes('--check')) {
    if ((await readFile(file, 'utf8')) !== output)
      throw Error(`CSS border source record changed: ${file}`);
  } else await writeFile(file, output);
}
console.log(
  'Pinned MUI CSS-border declarations and native source/license record verified. No compatibility status promoted.',
);
