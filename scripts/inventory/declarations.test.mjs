// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  compareSymbols,
  createGraph,
  publicEntries,
  readModule,
  symbolsAt,
} from './declarations.mjs';
import { verifyArtifact, verifyIntegrity } from './generate.mjs';

// Export conditions are deliberately untrusted input, including null/native cases.
/**
 * @param {Record<string, string>} files
 * @param {unknown} [exports]
 */
const pkg = (files, exports = { '.': { types: './index.d.ts' } }) => ({
  manifest: { exports },
  files: new Map(Object.entries(files)),
});
const names = (graph, name = 'example') =>
  symbolsAt(graph, name, graph.packageEntries.get(name).get('.')).map((item) => item.name);

test('declarations distinguish real members, callbacks and nested slot members from comments and strings', () => {
  const module = readModule(
    `
    // export interface FakeProps { madeUp: true }
    export interface ButtonProps extends ExternalProps {
      disabled?: boolean;
      onChange?: (value: string) => void;
      slots?: { root?: Element; input: Element };
      slotProps?: { root?: { tabIndex: number } };
      label: 'onClick?: fake';
    }
    export type ModeProps = { small: true } | { large: true };
  `,
    'index.d.ts',
  );
  assert.equal(module.contracts.length, 2);
  const contract = module.contracts[0];
  assert.equal(contract.inheritanceResolved, false);
  assert.ok(contract.references.includes('ExternalProps'));
  assert.ok(contract.members.some((item) => item.name === 'onChange' && item.kind === 'event'));
  assert.ok(
    contract.members.some(
      (item) => item.name === 'slots.input' && item.kind === 'slot' && !item.optional,
    ),
  );
  assert.ok(contract.members.some((item) => item.name === 'slotProps.root.tabIndex'));
  assert.ok(!contract.members.some((item) => item.name === 'onClick'));
  assert.deepEqual(
    module.contracts[1].members.map((item) => item.name),
    ['small', 'large'],
  );
});

test('barrels resolve aliases, default declared functions, type-only exports and circular stars', () => {
  const graph = createGraph(
    new Map([
      [
        'example',
        pkg({
          'index.d.ts': `export * from './a.js'; export { default as Button } from './button.js'; export type { Result as Alias } from './b.js';`,
          'a.d.ts': `export * from './b.js'; export interface A { a: true }`,
          'b.d.ts': `export * from './a.js'; export interface Result { ok: true }`,
          'button.d.ts': `declare function Button(): void; export default Button;`,
        }),
      ],
    ]),
  );
  assert.deepEqual(names(graph), ['A', 'Alias', 'Button', 'Result']);
  const symbols = symbolsAt(graph, 'example', graph.packageEntries.get('example').get('.'));
  assert.equal(symbols.find((item) => item.name === 'Alias').origins[0].kind, 'type');
  assert.equal(
    symbols.find((item) => item.name === 'Button').origins[0].module,
    'example:button.d.ts',
  );
  assert.deepEqual(graph.unresolved, []);
});

test('an explicit export overrides a conflicting star and unresolved external exports stay visible', () => {
  const graph = createGraph(
    new Map([
      [
        'example',
        pkg({
          'index.d.ts': `export * from './a.js'; export { Thing } from './b.js'; export * from 'missing-dependency';`,
          'a.d.ts': 'export declare const Thing: number;',
          'b.d.ts': 'export declare const Thing: string;',
        }),
      ],
    ]),
  );
  const symbol = symbolsAt(graph, 'example', graph.packageEntries.get('example').get('.'))[0];
  assert.deepEqual(
    symbol.origins.map((origin) => origin.module),
    ['example:b.d.ts'],
  );
  assert.deepEqual(
    graph.unresolved.map((item) => item.source),
    ['missing-dependency'],
  );
});

test('conditional import paths and wildcard exclusions never invent .d pseudo-subpaths', () => {
  const files = new Map([
    ['index.d.ts', ''],
    ['index.d.mts', ''],
    ['Add.d.ts', ''],
    ['Add.d.mts', ''],
    ['private.d.ts', ''],
    ['private/Nested.d.ts', ''],
  ]);
  const entries = publicEntries(
    {
      exports: {
        '.': { require: './index.js', import: './index.mjs' },
        './*': { require: './*.js', import: './*.mjs' },
        './private': null,
        './private/*': null,
      },
    },
    files,
  );
  assert.deepEqual([...entries.keys()], ['.', './Add', './index']);
  assert.deepEqual(entries.get('./Add'), [
    { condition: 'require', file: 'Add.d.ts' },
    { condition: 'import', file: 'Add.d.mts' },
  ]);
});

test('native source and cross-package re-exports resolve without executing implementations', () => {
  const graph = createGraph(
    new Map([
      [
        'native',
        pkg(
          {
            'src/index.ts': `export * from 'system'; export const Button = dangerousSideEffect();`,
          },
          { '.': { 'react-native': './src/index.ts' } },
        ),
      ],
      [
        'system',
        pkg(
          {
            'src/index.ts': `export function createTheme() { throw new Error('Do not execute'); }`,
          },
          { '.': { 'react-native': './src/index.ts' } },
        ),
      ],
    ]),
  );
  assert.deepEqual(names(graph, 'native'), ['Button', 'createTheme']);
});

test('matching native names cannot promote a compatibility or verification claim', () => {
  const result = compareSymbols(
    [
      { name: 'Button', origins: [] },
      { name: 'Missing', origins: [] },
    ],
    [{ name: 'Button' }],
  );
  assert.equal(result[0].native, 'declared-unverified');
  assert.equal(result[1].native, 'not-declared');
  assert.ok(result.every((item) => item.verified === false));
});

test('integrity, identity, license and declaration snapshots must all match', () => {
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  const bytes = Buffer.from('pinned tarball');
  const integrity = 'sha512-' + createHash('sha512').update(bytes).digest('base64');
  verifyIntegrity(bytes, integrity, 'fixture');
  assert.throws(() => verifyIntegrity(Buffer.from('tampered'), integrity, 'fixture'), /Integrity/);
  const snapshot = JSON.stringify([{ path: 'index.d.ts', sha256: 'example' }]);
  const baseline = {
    version: '1.0.0',
    license: 'MIT',
    licensePath: 'LICENSE',
    licenseSha256: hash('MIT fixture'),
    apiSnapshotSha256: hash(snapshot),
  };
  const artifact = {
    manifest: { name: 'fixture', version: '1.0.0', license: 'MIT' },
    licenses: { LICENSE: 'MIT fixture' },
    hashes: JSON.parse(snapshot),
  };
  verifyArtifact(artifact, baseline, 'fixture', snapshot);
  assert.throws(
    () => verifyArtifact(artifact, { ...baseline, version: '2.0.0' }, 'fixture', snapshot),
    /identity/,
  );
  assert.throws(
    () => verifyArtifact(artifact, { ...baseline, licenseReview: 'hold' }, 'fixture', snapshot),
    /License/,
  );
  assert.throws(
    () =>
      verifyArtifact(
        { ...artifact, licenses: { LICENSE: 'changed' } },
        baseline,
        'fixture',
        snapshot,
      ),
    /License/,
  );
  assert.throws(
    () => verifyArtifact({ ...artifact, hashes: [] }, baseline, 'fixture', snapshot),
    /snapshot/,
  );
});

test('contract candidates keep absent direct members distinct from unsupported or inherited behavior', async () => {
  const { compareContracts } = await import('./declarations.mjs');
  const upstream = readModule(
    'export interface ButtonOwnProps { disabled?: boolean; loadingPosition?: string; }',
    'Button.d.ts',
  ).contracts;
  const native = readModule(
    'export interface ButtonProps extends NativeProps { disabled?: boolean; }',
    'buttons.ts',
  ).contracts;
  const [result] = compareContracts(upstream, native);
  assert.equal(result.nativeCandidates[0].name, 'ButtonProps');
  assert.equal(result.members[0].native, 'declared-unverified');
  assert.equal(result.members[1].native, 'not-declared-directly');
  assert.ok(result.members.every((member) => member.verified === false));
  assert.equal(result.inheritanceResolved, false);
});

test('members preserve signatures, modifiers, computed keys and literal whitespace', () => {
  const [contract] = readModule(
    `export interface Contract {
    readonly label: 'two  spaces';
    [token]: boolean;
    run(value: string, count?: number): Promise<void>;
    (value: number): string;
    new(value: string): Contract;
    [key: string]: unknown;
  }`,
    'index.d.ts',
  ).contracts;
  assert.equal(contract.members.length, 6);
  assert.equal(contract.members[0].type, "'two  spaces'");
  assert.equal(contract.members[0].readonly, true);
  assert.equal(contract.members[1].name, '[token]');
  assert.equal(contract.members[1].computed, true);
  assert.match(contract.members[2].type, /value: string, count\?: number/);
  assert.deepEqual(
    contract.members.slice(3).map((item) => item.memberKind),
    ['TSCallSignatureDeclaration', 'TSConstructSignatureDeclaration', 'TSIndexSignature'],
  );
  assert.ok(contract.members.every((item) => item.declaration && item.line));
});

test('type-only imports remain type-only when re-exported, including namespaces', () => {
  const graph = createGraph(
    new Map([
      [
        'example',
        pkg({
          'index.d.ts': `import type { A } from './a.js'; import { type A as B } from './a.js'; import type * as NS from './a.js'; export { A, B, NS };`,
          'a.d.ts': 'export declare class A {}',
        }),
      ],
    ]),
  );
  const symbols = symbolsAt(graph, 'example', graph.packageEntries.get('example').get('.'));
  assert.deepEqual(
    symbols.map((symbol) => symbol.name),
    ['A', 'B', 'NS'],
  );
  assert.ok(symbols.every((symbol) => symbol.origins.every((origin) => origin.kind === 'type')));
});

test('ambiguous star exports remain unresolved through aliases and cycles; diamonds are valid', () => {
  const graph = createGraph(
    new Map([
      [
        'example',
        pkg({
          'index.d.ts': `export * from './barrel.js'; export { Same as Alias } from './barrel.js'; export * from './diamond.js';`,
          'barrel.d.ts': `export * from './a.js'; export * from './b.js'; export * from './cycle.js';`,
          'cycle.d.ts': `export * from './barrel.js';`,
          'a.d.ts': 'export declare const Same: number;',
          'b.d.ts': 'export declare const Same: string;',
          'diamond.d.ts': `export * from './left.js'; export * from './right.js';`,
          'left.d.ts': `export { Good } from './shared.js';`,
          'right.d.ts': `export { Good } from './shared.js';`,
          'shared.d.ts': 'export declare const Good: true;',
        }),
      ],
    ]),
  );
  assert.deepEqual(names(graph), ['Good']);
  assert.ok(
    graph.unresolved.some(
      (item) =>
        item.from === 'example:index.d.ts' &&
        item.imported === 'Alias' &&
        item.reason === 'ambiguous-export',
    ),
  );
});

test('public entry resolution picks one declaration and never falls back to a directory for .js', () => {
  const files = new Map([
    ['entry.d.ts', ''],
    ['entry/index.d.ts', ''],
    ['other/index.d.ts', ''],
    ['Native.ts', ''],
    ['Native.d.ts', ''],
  ]);
  const entries = publicEntries(
    { exports: { '.': './entry.js', './other': './other.js', './*': './*.js' } },
    files,
  );
  assert.deepEqual(entries.get('.'), [{ condition: 'default', file: 'entry.d.ts' }]);
  assert.equal(entries.has('./other'), false);
  assert.deepEqual(entries.get('./Native'), [{ condition: 'default', file: 'Native.ts' }]);
});

test('import-equals is an explicit semantic gap, never a fabricated local export', () => {
  const graph = createGraph(
    new Map([
      [
        'example',
        pkg({
          'index.d.ts': `import Model = require('missing-dependency'); export { Model };`,
        }),
      ],
    ]),
  );
  assert.deepEqual(names(graph), []);
  assert.ok(
    graph.modules
      .get('example:index.d.ts')
      .unhandled.some((item) => item.kind === 'TSImportEqualsDeclaration'),
  );
  assert.ok(graph.unresolved.some((item) => item.imported === 'Model'));
});

test('cross-package resolution selects import or require using module format', () => {
  for (const [type, entry, expected] of [
    ['module', 'index.d.ts', 'Imported'],
    ['commonjs', 'index.d.ts', 'Required'],
    ['module', 'index.d.cts', 'Required'],
    ['commonjs', 'index.d.mts', 'Imported'],
  ]) {
    const main = pkg({ [entry]: `export * from 'dep';` }, { '.': { types: './' + entry } });
    main.manifest.type = type;
    const graph = createGraph(
      new Map([
        ['example', main],
        [
          'dep',
          pkg(
            {
              'require.d.ts': 'export interface Required {}',
              'import.d.ts': 'export interface Imported {}',
            },
            { '.': { require: { types: './require.d.ts' }, import: { types: './import.d.ts' } } },
          ),
        ],
      ]),
    );
    assert.deepEqual(names(graph), [expected]);
  }
});

test('conditional dependency resolution honors object order and skips inactive conditions', () => {
  for (const conditions of [
    { types: './shared.d.ts', import: './import.js', default: './fallback.js' },
    { browser: './browser.d.ts', default: './shared.d.ts', import: './import.js' },
  ]) {
    const graph = createGraph(
      new Map([
        ['example', pkg({ 'index.d.mts': `export * from 'dep';` }, { '.': './index.d.mts' })],
        [
          'dep',
          pkg(
            {
              'shared.d.ts': 'export type Shared = true;',
              'import.d.ts': 'export type Imported = true;',
              'browser.d.ts': 'export type Browser = true;',
            },
            { '.': conditions },
          ),
        ],
      ]),
    );
    assert.deepEqual(names(graph), ['Shared']);
  }
});

test('parenthesized object members remain visible without inventing method return properties', () => {
  const module = readModule(
    `export type P = ({ value: string });
    export interface C { get(): { onDone(): void; value: string }; slots?: ({ root?: Element }); }`,
    'index.d.ts',
  );
  assert.deepEqual(
    module.contracts[0].members.map((member) => member.name),
    ['value'],
  );
  assert.deepEqual(
    module.contracts[1].members.map((member) => member.name),
    ['get', 'slots', 'slots.root'],
  );
});

test('active null conditions block dependency fallback resolution', () => {
  for (const conditions of [
    { import: null, default: './fallback.d.ts' },
    { types: null, default: './fallback.d.ts' },
  ]) {
    const graph = createGraph(
      new Map([
        ['example', pkg({ 'index.d.mts': `export * from 'dep';` }, { '.': './index.d.mts' })],
        ['dep', pkg({ 'fallback.d.ts': 'export type Fallback = true;' }, { '.': conditions })],
      ]),
    );
    assert.deepEqual(names(graph), []);
    assert.ok(graph.unresolved.some((edge) => edge.source === 'dep'));
  }
  assert.equal(
    publicEntries({ exports: null, types: './index.d.ts' }, new Map([['index.d.ts', '']])).size,
    1,
  );
  assert.equal(publicEntries({ exports: { '.': null } }, new Map([['index.d.ts', '']])).size, 0);
});

test('full check refuses an option combination that would fetch and write missing cache', async () => {
  const { generate } = await import('./generate.mjs');
  await assert.rejects(generate({ check: true, fetchMissing: true }), /cannot fetch or write/);
});

test('native graphs select source conditions when published types point to unloaded build output', () => {
  const exports = {
    '.': {
      types: './dist/index.d.ts',
      'react-native': './src/index.ts',
      default: './dist/index.js',
    },
  };
  const graph = createGraph(
    new Map([
      [
        'example',
        pkg({ 'src/index.ts': `export { createTheme, type Theme } from 'system';` }, exports),
      ],
      [
        'system',
        pkg(
          {
            'src/index.ts':
              'export interface Theme { palette: object } export function createTheme(): Theme { throw 0; }',
          },
          exports,
        ),
      ],
    ]),
  );
  assert.deepEqual(names(graph), ['createTheme', 'Theme']);
  assert.deepEqual(graph.unresolved, []);
});
