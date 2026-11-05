// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { transform } from 'esbuild';
import { loadReference } from './load.mjs';

const material = await loadReference('@mui/material', [
  'Paper/Paper.js',
  'styles/shadows.js',
  'styles/shadows.d.ts',
  'styles/focusVisible.js',
  'styles/createThemeNoVars.js',
  'styles/createThemeNoVars.d.ts',
]);
const system = await loadReference('@mui/system', [
  'styleFunctionSx/styleFunctionSx.js',
  'createStyled/createStyled.js',
  'createStyled/createStyled.d.ts',
  'createTheme/shape.d.ts',
  'borders/borders.js',
  'spacing/spacing.js',
]);
const originalShadows = material.require(
  `${material.directory}/node_modules/@mui/material/styles/shadows.js`,
).default;
const originalTheme = material.require(
  `${material.directory}/node_modules/@mui/material/styles/createThemeNoVars.js`,
).default;
const originalFocus = material.require(
  `${material.directory}/node_modules/@mui/material/styles/focusVisible.js`,
);
const nativeSources = {};
async function nativeModule(file) {
  const source = await readFile(file, 'utf8');
  nativeSources[file] = createHash('sha256').update(source).digest('hex');
  const { code } = await transform(source, { loader: 'ts', format: 'cjs' });
  const module = { exports: {} };
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      require: (name) => {
        if (name === 'react-native') return { Platform: { OS: 'ios' } };
        if (name === './diagnostics') return {};
        throw new Error(`Unexpected native reference dependency: ${name}`);
      },
    },
    { filename: file },
  );
  return module.exports;
}
const nativeShadows = await nativeModule('packages/system/src/shadows.ts');
const nativeFocus = await nativeModule('packages/system/src/focusVisible.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));
assert.deepEqual(plain(nativeShadows.defaultShadows), originalShadows);

const focusCases = [
  [{}, []],
  [{ focusVisible: false }, []],
  [{ focusVisible: true }, []],
  [{ focusVisible: true }, [{ palette: { primary: { main: '#123456' } } }]],
  [{ focusVisible: { outlineWidth: 4, outlineOffset: '-1px' } }, []],
  [{ focusVisible: { boxShadow: '0 0 4px red' } }, [{ focusVisible: { outlineColor: '#abcdef' } }]],
  [{ focusVisible: true }, [{ focusVisible: false }]],
].map(([options, args]) => {
  const theme = originalTheme(options, ...args);
  const raw = originalFocus.mergeFocusVisibleInput(options.focusVisible, args);
  const expected = plain(theme.focusVisible ?? null);
  if (expected && typeof expected === 'object') {
    expected.outlineOffset = expected.outlineOffset.replace(
      /^calc\(var\(--_focusVisible-offset, 1\) \* (.+)\)$/,
      '$1',
    );
    if (
      typeof expected.outlineOffset === 'string' &&
      /^-?\d+(?:\.\d+)?px$/.test(expected.outlineOffset)
    )
      expected.outlineOffset = Number.parseFloat(expected.outlineOffset);
    if (!raw?.boxShadow) delete expected.boxShadow;
    else expected.boxShadow = expected.boxShadow.replace(/^var\(--_focusVisible-behavior, \) /, '');
  }
  const actual =
    raw == null ? null : nativeFocus.resolveFocusVisible(raw, theme.palette.primary.main);
  // Source numeric offsets are represented as concrete native points; authored
  // string offsets retain CSS units until the native style resolver runs.
  if (actual && typeof raw === 'object' && typeof raw.outlineOffset === 'string')
    expected.outlineOffset = raw.outlineOffset;
  assert.deepEqual(plain(actual), expected);
  return { options, args, original: theme.focusVisible ?? null, native: actual };
});

const styled = await readFile(
  `${system.directory}/node_modules/@mui/system/createStyled/createStyled.js`,
  'utf8',
);
const start = styled.indexOf('function processStyle(props, style, layerName)');
const end = styled.indexOf('function createStyled(input = {})', start);
assert(start >= 0 && end > start, 'Pinned processStyle functions were not found');
const context = vm.createContext({
  _styledEngine: { internal_serializeStyles: (value) => value },
});
const processStyle = vm.runInContext(`${styled.slice(start, end)}; processStyle;`, context);
const callbackTrace = [];
const props = {
  color: 'root',
  rootOnly: 3,
  theme: { token: 'theme' },
  ownerState: { color: 'owner', active: true },
};
const style = [
  { padding: 1, variants: [{ props: { color: 'root' }, style: { padding: 2 } }] },
  () => [
    null,
    {
      padding: 3,
      variants: [
        {
          props: (input) => {
            callbackTrace.push([
              'predicate',
              input.color,
              input.rootOnly,
              input.ownerState === props.ownerState,
              input.theme === props.theme,
            ]);
            return input.color === 'owner';
          },
          style: (input) => {
            callbackTrace.push([
              'style',
              input.color,
              input.rootOnly,
              input.ownerState === props.ownerState,
              input.theme === props.theme,
            ]);
            return [{ padding: 4 }, { margin: 2 }];
          },
        },
      ],
    },
  ],
];
const variantLayers = plain(processStyle(props, style));
assert.deepEqual(variantLayers, [
  { padding: 1 },
  { padding: 2 },
  null,
  { padding: 3 },
  [{ padding: 4 }, { margin: 2 }],
]);
assert.deepEqual(callbackTrace, [
  ['predicate', 'owner', 3, true, true],
  ['style', 'owner', 3, true, true],
]);

const originalBorderRadius = system.require(
  `${system.directory}/node_modules/@mui/system/borders/borders.js`,
).borderRadius;
const shapeCases = [4, '6px', '0.5rem', '10%'].map((radius) => {
  const theme = originalTheme({ shape: { borderRadius: radius } });
  const original = originalBorderRadius({ theme, borderRadius: 2 });
  assert.deepEqual(original, {
    borderRadius: typeof radius === 'number' ? 2 * radius : `calc(2 * ${radius})`,
  });
  return { radius, base: radius, original };
});

const originalSx = system.require(
  `${system.directory}/node_modules/@mui/system/styleFunctionSx/styleFunctionSx.js`,
).default;
const inheritedTypographyKeywords = originalSx({
  theme: originalTheme(),
  sx: { fontSize: 'inherit', fontFamily: 'inherit', fontWeight: 'inherit' },
});
assert.deepEqual(inheritedTypographyKeywords, {
  fontSize: 'inherit',
  fontFamily: 'inherit',
  fontWeight: 'inherit',
});

const initial = originalTheme({ focusVisible: true });
const recomposed = originalTheme(initial, { palette: { primary: { main: '#123456' } } });
const report = {
  references: [material.reference, system.reference],
  nativeSources,
  shadows: originalShadows,
  shapeCases,
  inheritedTypographyKeywords,
  focusCases,
  variantLayers,
  callbackTrace,
  noVarsRecomposition: {
    initialPrimary: initial.palette.primary.main,
    finalPrimary: recomposed.palette.primary.main,
    finalFocusColor: recomposed.focusVisible.outlineColor,
  },
};
const outputIndex = process.argv.indexOf('--output');
if (outputIndex !== -1) {
  const output = process.argv[outputIndex + 1];
  if (!output?.startsWith('/tmp/mui-native-system-style-closure-'))
    throw new Error('Reference reports must use the local /tmp output prefix.');
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
}
console.log(
  `25 original shadow tokens, ${focusCases.length} source focus configurations and original embedded variant/callback layers verified.`,
);
console.log(JSON.stringify(report.noVarsRecomposition));
