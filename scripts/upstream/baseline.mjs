import { mkdir, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { packages } from './config.mjs';
import { request, pages, commitForTag } from './http.mjs';
import { inspectArtifact } from './artifact.mjs';
try {
  await access('upstream/state.json');
  throw new Error('Baseline already exists. Review a migration instead of resetting provenance.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const manifest = { schemaVersion: 1, createdAt: new Date().toISOString(), packages: {} };
const cache = new Map();
for (const config of packages) {
  const registry = await request(`https://registry.npmjs.org/${encodeURIComponent(config.name)}`);
  const version = registry['dist-tags'].latest;
  const pkg = registry.versions[version];
  if (pkg.license !== 'MIT') throw new Error(`Baseline license review required: ${config.name}`);
  const releases =
    config.channel === 'preview'
      ? await pages(`https://api.github.com/repos/${config.repository}/releases`)
      : [];
  const tag =
    config.channel === 'preview'
      ? releases.find((r) => !r.draft && r.body?.includes(`${config.name}@${version}`))?.tag_name
      : `v${version}`;
  if (!tag) throw new Error(`No source release found for ${config.name}@${version}`);
  const key = `${config.repository}/${tag}`;
  let sha = cache.get(key);
  if (!sha) {
    sha = await commitForTag(config.repository, tag);
    cache.set(key, sha);
  }
  const sourcePackage = await request(
    `https://raw.githubusercontent.com/${config.repository}/${sha}/${config.directory}/package.json`,
  );
  if (sourcePackage.version !== version)
    throw new Error(`Source/package version mismatch: ${config.name}`);
  const artifact = await inspectArtifact(pkg);
  const license = artifact.license;
  if (license && !license.includes('Permission is hereby granted'))
    throw new Error(`Unexpected MIT text: ${config.name}`);
  const baseline = {
    version,
    publishedAt: registry.time[version],
    sourceCommit: sha,
    tag,
    license: pkg.license,
    licensePath: artifact.licensePath,
    licenseSource: 'npm-artifact',
    licenseReview: license ? null : 'Missing published license text; source reuse is blocked',
    licenseSha256: license ? createHash('sha256').update(license).digest('hex') : null,
    apiSnapshot: `upstream/api/${config.name.replace('@mui/', '')}.hashes.json`,
    apiSnapshotSha256: createHash('sha256')
      .update(JSON.stringify(artifact.apiFiles, null, 2) + '\n')
      .digest('hex'),
    integrity: pkg.dist.integrity,
    tarball: pkg.dist.tarball,
    repository: config.repository,
    directory: config.directory,
    copiedFiles: [],
  };
  await mkdir('upstream/api', { recursive: true });
  await writeFile(baseline.apiSnapshot, JSON.stringify(artifact.apiFiles, null, 2) + '\n');
  if (license)
    await writeFile(`upstream/api/${config.name.replace('@mui/', '')}.d.ts.txt`, artifact.index);
  manifest.packages[config.name] = {
    baseline,
    latestDetected: version,
    candidate: null,
    portedAndVerified: null,
    releasedSupport: null,
    observedVersions: [version],
  };
  await mkdir('upstream/licenses', { recursive: true });
  if (license)
    await writeFile(`upstream/licenses/${config.name.replace('@mui/', '')}.txt`, license);
  console.log(
    `${config.name}@${version}: ${license ? 'MIT license verified' : 'LICENSE REVIEW REQUIRED'}, source ${sha.slice(0, 12)}`,
  );
}
await mkdir('upstream', { recursive: true });
await writeFile(
  'upstream/state.json',
  JSON.stringify({ ...manifest, lastSuccessfulCheck: null }, null, 2) + '\n',
);
