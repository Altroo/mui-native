import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
export async function inspectArtifact(pkg, { sourceFiles = [] } = {}) {
  const url = new URL(pkg.dist.tarball);
  if (url.origin !== 'https://registry.npmjs.org')
    throw new Error('Unexpected package tarball host');
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Tarball HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const [algorithm, expected] = pkg.dist.integrity.split('-');
  if (
    !['sha512', 'sha256'].includes(algorithm) ||
    createHash(algorithm).update(bytes).digest('base64') !== expected
  )
    throw new Error(`Integrity mismatch: ${pkg.name}`);
  await mkdir('.cache/upstream', { recursive: true });
  const file = `.cache/upstream/${pkg.name.replace('@mui/', '')}-${pkg.version}.tgz`;
  await writeFile(file, bytes);
  return JSON.parse(
    execFileSync(
      'python3',
      ['scripts/upstream/inspect-artifact.py', file, JSON.stringify(sourceFiles)],
      {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      },
    ),
  );
}
