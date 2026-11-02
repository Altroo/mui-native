import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

export async function loadReference(name, files) {
  const directory = resolve('.cache/palette-reference');
  const require = createRequire(`${directory}/package.json`);
  const state = JSON.parse(await readFile('upstream/state.json', 'utf8'));
  const baseline = state.packages[name].baseline;
  const artifact = `.cache/upstream/${name.slice(5)}-${baseline.version}.tgz`;
  const bytes = await readFile(artifact);
  const [algorithm, expected] = baseline.integrity.split('-');
  if (
    !['sha512', 'sha256'].includes(algorithm) ||
    createHash(algorithm).update(bytes).digest('base64') !== expected
  )
    throw new Error(`Invalid pinned artifact: ${name}`);
  const installed = `${directory}/node_modules/${name}`;
  const manifest = JSON.parse(await readFile(`${installed}/package.json`, 'utf8'));
  if (
    manifest.name !== name ||
    manifest.version !== baseline.version ||
    manifest.license !== 'MIT' ||
    baseline.licenseReview
  )
    throw new Error(`Invalid reference package: ${name}`);
  const license = await readFile(`${installed}/${baseline.licensePath}`);
  if (createHash('sha256').update(license).digest('hex') !== baseline.licenseSha256)
    throw new Error(`License mismatch: ${name}`);
  const sourceFiles = {};
  for (const file of files) {
    const original = execFileSync('python3', [
      '-c',
      'import sys,tarfile; t=tarfile.open(sys.argv[1]); sys.stdout.buffer.write(t.extractfile("package/"+sys.argv[2]).read())',
      artifact,
      file,
    ]);
    const actual = await readFile(`${installed}/${file}`);
    if (!original.equals(actual)) throw new Error(`Modified reference: ${name}/${file}`);
    sourceFiles[file] = createHash('sha256').update(actual).digest('hex');
  }
  const reference = {
    name,
    version: baseline.version,
    sourceCommit: baseline.sourceCommit,
    integrity: baseline.integrity,
    licenseSha256: baseline.licenseSha256,
    sourceFiles,
  };
  return { reference, require, directory };
}
