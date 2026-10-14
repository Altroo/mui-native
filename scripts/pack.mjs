import { readdir, mkdir, readFile, cp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const destination = resolve('artifacts/packages');
await mkdir(destination, { recursive: true });
for (const folder of await readdir('packages')) {
  const dir = resolve('packages', folder);
  const pkg = JSON.parse(await readFile(`${dir}/package.json`, 'utf8'));
  if (!pkg.name.startsWith('@altroo/')) continue;
  for (const name of ['LICENSE', 'NOTICE']) await cp(name, `${dir}/${name}`);
  execFileSync('pnpm', ['pack', '--pack-destination', destination], { cwd: dir, stdio: 'pipe' });
  console.log(`Packed ${pkg.name}`);
}
