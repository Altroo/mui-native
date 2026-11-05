// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readdir, mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export async function iconSources(directory = resolve(root, 'packages/icons/src')) {
  const files = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await iconSources(file)));
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) files.push(file);
  }
  return files;
}
/** Preserve independent ESM modules and explicit Node-compatible relative imports. */
export async function buildIconEsm(folder = resolve(root, 'packages/icons'), sources) {
  const sourceRoot = resolve(folder, 'src'),
    destination = resolve(folder, 'dist/esm');
  sources ??= await iconSources(sourceRoot);
  sources = sources.map((file) => resolve(file));
  const known = new Set(sources);
  const result = await build({
    entryPoints: sources,
    outbase: sourceRoot,
    outdir: destination,
    outExtension: { '.js': '.mjs' },
    platform: 'neutral',
    format: 'esm',
    bundle: false,
    write: false,
  });
  for (const output of result.outputFiles) {
    const sourceDirectory = resolve(sourceRoot, dirname(relative(destination, output.path)));
    const text = output.text.replace(
      /(from\s+["'])(\.[^"']+)(["'])/g,
      (_match, before, specifier, after) => {
        const target = resolve(sourceDirectory, specifier);
        const source = ['.ts', '.tsx', '/index.ts', '/index.tsx']
          .map((suffix) => target + suffix)
          .find((file) => known.has(file));
        if (!source) throw Error('Unresolved icon ESM dependency: ' + specifier);
        const emitted = resolve(
          destination,
          relative(sourceRoot, source).replace(/\.tsx?$/, '.mjs'),
        );
        const path = relative(dirname(output.path), emitted).replaceAll('\\', '/');
        return before + (path.startsWith('.') ? path : './' + path) + after;
      },
    );
    await mkdir(dirname(output.path), { recursive: true });
    await writeFile(output.path, text);
  }
}
export async function buildIcons() {
  const folder = resolve(root, 'packages/icons');
  execFileSync(
    process.execPath,
    [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', 'scripts/icons/tsconfig.build.json'],
    {
      cwd: root,
      stdio: 'inherit',
    },
  );
  await rm(join(folder, 'dist'), { recursive: true, force: true });
  await mkdir(join(folder, 'dist'), { recursive: true });
  const sources = await iconSources();
  await build({
    entryPoints: sources,
    outbase: join(folder, 'src'),
    outdir: join(folder, 'dist'),
    platform: 'neutral',
    format: 'cjs',
    bundle: false,
    sourcemap: true,
  });
  await cp(resolve(root, '.cache/icons-types/icons/src'), join(folder, 'dist'), {
    recursive: true,
  });
  await buildIconEsm(folder, sources);
  return { modules: sources.length, formats: ['CommonJS', 'ESM'] };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 2) throw Error('Use node scripts/icons/build.mjs');
  console.log(JSON.stringify(await buildIcons()));
}
