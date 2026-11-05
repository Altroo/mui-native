import { readdir, mkdir, readFile, cp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { removeObsoleteArchives } from './packages-archives.mjs';
const destination = resolve('artifacts/packages');
await mkdir(destination, { recursive: true });
for (const folder of await readdir('packages')) {
  const dir = resolve('packages', folder);
  const pkg = JSON.parse(await readFile(`${dir}/package.json`, 'utf8'));
  if (!pkg.name.startsWith('@altroo/')) continue;
  for (const name of ['LICENSE', 'NOTICE']) await cp(name, `${dir}/${name}`);
  // Large generated catalogs exceed Node's buffered stdout limit with file listings.
  // Keep pack errors visible; print only the package summary below on success.
  execFileSync('pnpm', ['pack', '--pack-destination', destination], {
    cwd: dir,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  await removeObsoleteArchives(destination, pkg.name, pkg.version);
  console.log(`Packed ${pkg.name}`);
}
