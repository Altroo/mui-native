// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

test('theme initialization and typography have an acyclic runtime import graph', async () => {
  // Use the transpiler's graph so type-only imports do not create false cycles.
  const { metafile } = await build({
    entryPoints: ['packages/system/src/theme.ts', 'packages/system/src/typography.ts'],
    bundle: true,
    treeShaking: false,
    packages: 'external',
    platform: 'node',
    write: false,
    outdir: '.cache/theme-import-check',
    metafile: true,
    logLevel: 'silent',
  });
  const graph = new Map(
    Object.entries(metafile.inputs).map(([name, value]) => [
      name,
      value.imports.filter((entry) => !entry.external).map((entry) => entry.path),
    ]),
  );
  const visited = new Set();
  const stack = [];
  function visit(name) {
    assert(!stack.includes(name), `Runtime import cycle: ${[...stack, name].join(' -> ')}`);
    if (visited.has(name)) return;
    stack.push(name);
    for (const dependency of graph.get(name) ?? []) visit(dependency);
    stack.pop();
    visited.add(name);
  }
  for (const entry of graph.keys()) visit(entry);
});

test('System declaration isolation rejects imported, inferred and augmented Material dependencies', async () => {
  const { assertSystemDeclarationIsolation } = await import('./system-declarations.mjs');
  for (const source of [
    'import type { Theme } from "@altroo/mui-native"; export type T = Theme;',
    'export declare function root(): import("@altroo/mui-native").NativeRootStyleResult;',
    'export type { Theme } from "@mui/material/styles";',
    'declare module "@altroo/mui-native" { interface Theme { example: string } }',
    'import Material = require("@altroo/mui-native"); export type T = Material.NativeRootStyleResult;',
    '/// <reference types="@mui/material" />',
  ])
    assert.throws(
      () => assertSystemDeclarationIsolation(new Map([['provider.d.ts', source]])),
      /System declaration depends on Material/,
    );
});
test('System declaration isolation permits owned types and nondependency text', async () => {
  const { assertSystemDeclarationIsolation } = await import('./system-declarations.mjs');
  assert.doesNotThrow(() =>
    assertSystemDeclarationIsolation(
      new Map([
        [
          'provider.d.ts',
          `
      import type { NativeRootStyleResult } from './sx';
      export declare function root(): NativeRootStyleResult;
      export type PackageName = '@altroo/mui-native';
      // Documentation may mention @mui/material without creating a dependency.
      // <reference types="@mui/material" /> is ordinary prose here.
      /*
      /// <reference types="@mui/material" />
      */
      export { createTheme } from '@altroo/mui-native-system/createTheme';
      /// <reference types="@mui/material" /> is ignored after the first declaration.
    `,
        ],
      ]),
    ),
  );
});
