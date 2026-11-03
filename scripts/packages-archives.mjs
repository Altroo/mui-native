import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import semver from 'semver';

/** Remove only obsolete versions of this exact package, after its new pack succeeds. */
export async function removeObsoleteArchives(destination, name, version) {
  const stem = name.replace(/^@/, '').replaceAll('/', '-');
  const current = `${stem}-${version}.tgz`;
  for (const file of await readdir(destination)) {
    if (!file.startsWith(`${stem}-`) || !file.endsWith('.tgz') || file === current) continue;
    const candidate = file.slice(stem.length + 1, -4);
    if (!semver.valid(candidate)) continue;
    let manifest;
    try {
      manifest = JSON.parse(
        execFileSync('tar', ['-xOf', join(destination, file), 'package/package.json'], {
          stdio: ['ignore', 'pipe', 'ignore'],
          maxBuffer: 1024 * 1024,
        }).toString('utf8'),
      );
    } catch {
      continue;
    }
    if (manifest?.name === name && manifest.version === candidate)
      await rm(join(destination, file));
  }
}
