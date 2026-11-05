// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { compileFunction } from 'node:vm';
import { parseSync } from '@babel/core';
import { format, resolveConfig } from 'prettier';
const sourceFiles = [
  'createTheme/createSpacing.js',
  'createTheme/createSpacing.d.ts',
  'spacing/spacing.js',
  'createBreakpoints/createBreakpoints.js',
  'createBreakpoints/createBreakpoints.d.ts',
  'createBreakpoints/index.js',
  'createBreakpoints/index.d.ts',
];
const state = JSON.parse(await readFile('upstream/state.json', 'utf8'));
const baseline = state.packages['@mui/system'].baseline;
const archive = `.cache/upstream/system-${baseline.version}.tgz`;
const bytes = await readFile(archive);
if ('sha512-' + createHash('sha512').update(bytes).digest('base64') !== baseline.integrity)
  throw Error('System helper archive integrity mismatch');
const extracted = JSON.parse(
  execFileSync(
    'python3',
    [
      '-c',
      'import tarfile,json,sys;f=tarfile.open(sys.argv[1]);print(json.dumps({n:f.extractfile("package/"+n).read().decode() for n in json.loads(sys.argv[2])}))',
      archive,
      JSON.stringify([...sourceFiles, 'LICENSE', 'package.json']),
    ],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
  ),
);
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const manifest = JSON.parse(extracted['package.json']);
if (
  baseline.version !== '9.5.0' ||
  baseline.license !== 'MIT' ||
  baseline.licenseReview ||
  manifest.name !== '@mui/system' ||
  manifest.version !== baseline.version ||
  manifest.license !== 'MIT' ||
  sha256(extracted.LICENSE) !== baseline.licenseSha256
)
  throw Error('Pinned helper identity/license mismatch');
function declaration(source, name) {
  const ast = parseSync(source, { configFile: false, babelrc: false }).program.body;
  const fn = ast.find((node) => node.type === 'FunctionDeclaration' && node.id.name === name);
  if (!fn) throw Error('Missing original helper: ' + name);
  return source.slice(fn.start, fn.end);
}
let warnings = [];
const console = { error: (...args) => warnings.push(args.map(String).join(' ')) };
// createSpacing supplies exactly {spacing: input}; this path lookup is its own key.
const unary = compileFunction(
  'const _style = {getPath: (theme, key) => theme[key]};' +
    declaration(extracted['spacing/spacing.js'], 'createUnaryUnit') +
    declaration(extracted['spacing/spacing.js'], 'createUnarySpacing') +
    ';return createUnarySpacing;',
  ['process', 'console'],
)({ env: { NODE_ENV: 'development' } }, console);
const createSpacing = compileFunction(
  'const _spacing = {createUnarySpacing};' +
    declaration(extracted['createTheme/createSpacing.js'], 'createSpacing') +
    ';return createSpacing;',
  ['createUnarySpacing', 'process', 'console'],
)(unary, { env: { NODE_ENV: 'development' } }, console);
const exported = {};
compileFunction(extracted['createBreakpoints/createBreakpoints.js'], ['exports'])(exported);
const createBreakpoints = exported.default;
const unset = { undefined: true };
const decode = (value) =>
  value && typeof value === 'object' && value.undefined === true ? undefined : value;
const spacingSpecs = [
  { name: 'default', args: [] },
  { name: 'explicit undefined scale', input: unset, args: [1] },
  ...[8, 0, 2.5, '0.5rem', 'var(--space)', [0, 4, 'var(--space)', '1rem']].flatMap((input) =>
    [[], [0], [1], [-2], [0.5], [-0.5], ['auto', 1], [undefined], [null], [1, 2, 3, 4, 5]].map(
      (args) => ({
        name: JSON.stringify(input) + '/' + String(args),
        input,
        args: args.map((arg) => (arg === undefined ? unset : arg)),
      }),
    ),
  ),
  { name: 'function receives strings', kind: 'function', args: [2, 'auto', -0.5] },
  { name: 'number-only function rejects strings', kind: 'number-only', args: ['auto'] },
  {
    name: 'explicit transform replaces numeric scale',
    input: 8,
    transform: 'custom',
    args: [1, 'auto'],
  },
  {
    name: 'explicit undefined transform uses default',
    input: 4,
    transform: 'undefined',
    args: [2],
  },
  {
    name: 'undefined transform outputs retain separators',
    input: 8,
    transform: 'empty',
    args: [1, 2],
  },
  { name: 'marked function identity', kind: 'marked-function', args: [2] },
  { name: 'marked array identity', kind: 'marked-array', args: [] },
  { name: 'null scale errors at creation', input: null, args: [1] },
  { name: 'invalid boolean scale', input: true, args: ['auto', 1] },
  { name: 'invalid array-like object scale', input: { 0: '4px', length: 1 }, args: [0, 'auto'] },
];
function inputs(spec) {
  let input = decode(spec.input);
  if (spec.kind === 'function')
    input = (value) => (typeof value === 'number' ? value * 3 : 'fn:' + String(value));
  if (spec.kind === 'number-only')
    input = (value) => {
      if (typeof value !== 'number') throw TypeError('number-only');
      return value * 3;
    };
  if (spec.kind === 'marked-function')
    input = Object.assign((value) => `${value}px`, { mui: true });
  if (spec.kind === 'marked-array') input = Object.assign([0, 4], { mui: true });
  const transform =
    spec.transform === 'custom'
      ? (value) => 'custom:' + String(value)
      : spec.transform === 'empty'
        ? () => undefined
        : undefined;
  return { input, transform };
}
const spacing = spacingSpecs.map((spec) => {
  warnings = [];
  let stage = 'create';
  const { input, transform } = inputs(spec);
  try {
    const result = createSpacing(input, transform);
    const observation = { helperType: typeof result, sameInput: result === input, mui: result.mui };
    stage = 'call';
    if (typeof result === 'function') observation.output = result(...spec.args.map(decode));
    return { ...spec, observation, diagnostics: warnings.length };
  } catch (error) {
    return { ...spec, error: { name: error.name, stage }, diagnostics: warnings.length };
  }
});
const breakpointSpecs = [
  { name: 'defaults', input: {} },
  { name: 'undefined defaults', input: { values: unset, unit: unset, step: unset } },
  { name: 'numeric named keys', input: { values: { xs: 0, 640: 1000, sm: 600 } } },
  {
    name: 'custom sorted and tied values',
    input: { values: { desktop: 75, tablet: 40, phone: 0, equal: 40 }, unit: 'em', step: 10 },
  },
  { name: 'zero step', input: { step: 0 } },
  { name: 'explicit undefined methods', input: { up: unset, only: unset } },
  { name: 'empty values', input: { values: {} } },
  { name: 'null options', input: null },
];
const breakpoints = breakpointSpecs.map((spec) => {
  try {
    const input =
      spec.input === null
        ? null
        : Object.fromEntries(
            Object.entries(spec.input).map(([key, value]) => [key, decode(value)]),
          );
    const result = createBreakpoints(input),
      calls = [];
    for (const method of ['up', 'down', 'only', 'not'])
      for (const key of [...result.keys, 640, '10']) {
        try {
          calls.push({ method, args: [key], output: result[method](key) });
        } catch (error) {
          calls.push({ method, args: [key], error: error.name });
        }
      }
    for (const args of [
      ['xs', 640],
      ['xs', '640'],
      [0, 640],
      ['phone', 'tablet'],
      ['xs', undefined],
    ]) {
      try {
        calls.push({
          method: 'between',
          args: args.map((value) => (value === undefined ? unset : value)),
          output: result.between(...args),
        });
      } catch (error) {
        calls.push({ method: 'between', args, error: error.name });
      }
    }
    return {
      ...spec,
      observation: {
        keys: result.keys,
        values: result.values,
        unit: result.unit,
        mediaKeys: result.internal_mediaKeys,
      },
      calls,
    };
  } catch (error) {
    return { ...spec, error: error.name };
  }
});
function observeEvaluationOrder() {
  const trace = [];
  let armed = false,
    end = 600;
  const values = {
    get xs() {
      if (armed) {
        trace.push('xs');
        end = 800;
      }
      return 0;
    },
    get sm() {
      if (armed) trace.push('sm');
      return end;
    },
    md: 900,
    lg: 1200,
    xl: 1536,
  };
  const result = createBreakpoints({ values });
  armed = true;
  return { output: result.between('xs', 'sm'), trace };
}
function observeConstructionKeys() {
  const values = {
    get xs() {
      Object.defineProperty(values, 'sm', { enumerable: false });
      return 0;
    },
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  };
  const result = createBreakpoints({ values });
  return {
    keys: result.keys,
    values: result.values,
    mediaKeys: result.internal_mediaKeys,
    inputKeys: Object.keys(values),
  };
}
const output = await format(
  JSON.stringify({
    reference: {
      name: '@mui/system',
      version: baseline.version,
      integrity: baseline.integrity,
      sourceCommit: baseline.sourceCommit,
      licenseSha256: baseline.licenseSha256,
      sourceFiles: Object.fromEntries(sourceFiles.map((file) => [file, sha256(extracted[file])])),
    },
    spacing,
    breakpoints,
    evaluationOrder: observeEvaluationOrder(),
    constructionKeys: observeConstructionKeys(),
  }),
  { ...(await resolveConfig('.prettierrc.json')), parser: 'json' },
);
const target = 'tests/fixtures/mui-helper-contract-9.5.0.json';
if (process.argv.includes('--check')) {
  if ((await readFile(target, 'utf8')) !== output) throw Error('Helper contract fixture drifted');
} else await writeFile(target, output);
process.stdout.write(
  `${spacing.length} spacing and ${breakpoints.length} breakpoint source configurations checked.\n`,
);
