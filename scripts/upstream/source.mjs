import { request, commitForTag } from './http.mjs';

export function releaseResolver({ read = request, commit = commitForTag } = {}) {
  const commits = new Map();
  const manifests = new Map();
  async function source(repository, tag) {
    const key = `${repository}/${tag}`;
    if (!commits.has(key)) commits.set(key, commit(repository, tag));
    return commits.get(key);
  }
  return async (config, change, releases) => {
    const published = releases.filter((release) => !release.draft);
    if (config.channel === 'stable') {
      const release = published.find((release) => release.tag_name === `v${change.version}`);
      if (release)
        return { release, sourceCommit: await source(config.repository, release.tag_name) };
    } else {
      // Release notes sometimes omit an unchanged preview package. Check immutable source
      // manifests, prioritizing explicit notes and then releases closest to publication.
      const mention = `${config.name}@${change.version}`;
      const mentions = (release) => (release.body ?? '').split(/[\s`]+/).includes(mention);
      const distance = (release) =>
        Math.abs(Date.parse(release.published_at) - Date.parse(change.publishedAt));
      const candidates = published.sort(
        (a, b) => Number(mentions(b)) - Number(mentions(a)) || distance(a) - distance(b),
      );
      // Bound a missing publication's API cost. Failure leaves detection state unchanged.
      for (const release of candidates.slice(0, 10)) {
        const sourceCommit = await source(config.repository, release.tag_name);
        const url = `https://raw.githubusercontent.com/${config.repository}/${sourceCommit}/${config.directory}/package.json`;
        if (!manifests.has(url))
          manifests.set(
            url,
            read(url).catch((error) => {
              if (error.message.startsWith('HTTP 404 ')) return null;
              throw error;
            }),
          );
        const manifest = await manifests.get(url);
        if (manifest?.name === config.name && manifest.version === change.version)
          return { release, sourceCommit };
      }
    }
    throw new Error(
      `Published version has no verified GitHub release: ${config.name}@${change.version}`,
    );
  };
}
