import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
await rm('.cache/types', { recursive: true, force: true });
execFileSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.build.json'], { stdio: 'inherit' });
async function runtimeSources(directory) {
  const files = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name, 'en'),
  )) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await runtimeSources(file)));
    else if (/\.(tsx?|js)$/.test(file) && !file.endsWith('.d.ts')) files.push(file);
  }
  return files;
}
for (const directory of await readdir('packages')) {
  const folder = `packages/${directory}`;
  const pkg = JSON.parse(await readFile(`${folder}/package.json`, { encoding: 'utf8' }));
  if (!pkg.exports?.['.']?.['react-native']) continue;
  await rm(`${folder}/dist`, { recursive: true, force: true });
  await mkdir(`${folder}/dist`, { recursive: true });
  const entries = Object.keys(pkg.exports)
    .filter((key) => key !== './package.json')
    .map((key) => (key === '.' ? 'index' : key.slice(2) + '/index'));
  await build({
    entryPoints: await runtimeSources(`${folder}/src`),
    outbase: `${folder}/src`,
    outdir: `${folder}/dist`,
    platform: 'neutral',
    format: 'cjs',
    // Keep one module instance for context-owning internals across public entry points.
    bundle: false,
    sourcemap: true,
  });
  await cp(`.cache/types/${directory}/src`, `${folder}/dist`, { recursive: true });
  for (const file of ['LICENSE', 'NOTICE']) await cp(file, path.join(folder, file));
  console.log(`Built ${pkg.name}: ${entries.length} entry points`);
}
