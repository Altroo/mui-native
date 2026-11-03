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
