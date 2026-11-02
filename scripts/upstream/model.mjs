import semver from 'semver';
import { assertSourceEligible } from './config.mjs';
export function detectPackage(config, registry, previous) {
  assertSourceEligible(config.name);
  if (registry.name !== config.name || !registry.versions || !registry.time)
    throw new Error(`Invalid registry response for ${config.name}`);
  const versions = Object.keys(registry.versions)
    .filter((v) => semver.valid(v) && (!semver.prerelease(v) || config.channel === 'preview'))
    .sort(semver.compare);
  const known = new Set(previous?.observedVersions ?? []);
  const baseline = previous?.baseline?.version;
  if (!baseline) throw new Error(`Missing baseline for ${config.name}`);
  const unseen = versions.filter(
    (v) =>
      !known.has(v) &&
      (semver.gt(v, baseline) ||
        Date.parse(registry.time[v]) > Date.parse(previous.baseline.publishedAt ?? '9999-01-01')),
  );
  const latest = registry['dist-tags']?.latest;
  if (!latest || !registry.versions[latest])
    throw new Error(`Inconsistent dist-tag for ${config.name}`);
  const changes = unseen.map((version) => {
    const pkg = registry.versions[version];
    if (!registry.time[version] || !pkg.dist?.integrity)
      throw new Error(`Incomplete publication metadata for ${config.name}@${version}`);
    return {
      name: config.name,
      version,
      repository: config.repository,
      family: config.family,
      channel: semver.prerelease(version) ? 'preview' : 'stable',
      publishedAt: registry.time[version],
      integrity: pkg.dist.integrity,
      license: pkg.license,
      blocked: pkg.license !== 'MIT',
      major: semver.major(version) !== semver.major(baseline),
      classification:
        pkg.license !== 'MIT'
          ? 'license-review'
          : semver.major(version) !== semver.major(baseline)
            ? 'major-migration'
            : 'needs-review',
    };
  });
  return {
    changes,
    next: {
      ...previous,
      latestDetected: latest,
      observedVersions: [...new Set([...(previous.observedVersions ?? []), ...versions])],
      candidate: previous.candidate ?? null,
      portedAndVerified: previous.portedAndVerified ?? null,
      releasedSupport: previous.releasedSupport ?? null,
    },
  };
}
export function mergeReport(state, results, checkedAt) {
  const next = structuredClone(state);
  for (const [name, result] of results) next.packages[name] = result.next;
  next.lastSuccessfulCheck = checkedAt;
  return next;
}
