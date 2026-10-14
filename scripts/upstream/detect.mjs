import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { packages } from './config.mjs';
import { request, pages, commitForTag } from './http.mjs';
import { inspectArtifact } from './artifact.mjs';
import { detectPackage, mergeReport } from './model.mjs';
export async function detect({
  state,
  fetchRegistry = async (name) => request(`https://registry.npmjs.org/${encodeURIComponent(name)}`),
  now = new Date().toISOString(),
  enrich = true,
}) {
  const results = [];
  const changes = [];
  for (const config of packages) {
    const result = detectPackage(
      config,
      await fetchRegistry(config.name),
      state.packages[config.name],
    );
    results.push([config.name, result]);
    changes.push(...result.changes);
  }
  const releases = {};
  const advisories = [];
  if (enrich) {
    for (const repository of new Set(packages.map((p) => p.repository)))
      releases[repository] = await pages(`https://api.github.com/repos/${repository}/releases`);
    for (const config of packages)
      advisories.push(
        ...(await pages(
          `https://api.github.com/advisories?ecosystem=npm&affects=${encodeURIComponent(config.name)}`,
        )),
      );
    for (const change of changes) {
      const config = packages.find((p) => p.name === change.name);
      const base = state.packages[change.name].baseline;
      const release = releases[config.repository].find(
        (r) =>
          !r.draft &&
          (config.channel === 'preview'
            ? r.body?.includes(`${config.name}@${change.version}`)
            : r.tag_name === `v${change.version}`),
      );
      if (!release)
        throw new Error(
          `Published version has no matching GitHub release: ${change.name}@${change.version}`,
        );
      change.sourceCommit = await commitForTag(config.repository, release.tag_name);
      change.releaseUrl = release.html_url;
      change.releaseNotes = release.body ?? '';
      const pkg = await request(
        `https://registry.npmjs.org/${encodeURIComponent(config.name)}/${change.version}`,
      );
      const artifact = await inspectArtifact(pkg);
      const license = artifact.license;
      const snapshot = await readFile(base.apiSnapshot, 'utf8');
      if (createHash('sha256').update(snapshot).digest('hex') !== base.apiSnapshotSha256)
        throw new Error('API snapshot integrity mismatch');
      const baseApi = JSON.parse(snapshot);
      change.apiChanges = artifact.apiFiles.filter(
        (file) => baseApi.find((old) => old.path === file.path)?.sha256 !== file.sha256,
      );
      change.removedApiFiles = baseApi.filter(
        (file) => !artifact.apiFiles.some((next) => next.path === file.path),
      );
      change.licenseSha256 = license ? createHash('sha256').update(license).digest('hex') : null;
      if (!license || base.licenseReview || change.licenseSha256 !== base.licenseSha256) {
        change.blocked = true;
        change.classification = 'license-review';
      }
      change.compareUrl = `https://github.com/${config.repository}/compare/${base.sourceCommit}...${change.sourceCommit}`;
      const diff = await request(
        `https://api.github.com/repos/${config.repository}/compare/${base.sourceCommit}...${change.sourceCommit}`,
      );
      change.files = (diff.files ?? [])
        .filter(
          (file) =>
            file.filename.startsWith(config.directory + '/') ||
            /license|notice/i.test(file.filename),
        )
        .map((file) => ({ path: file.filename, status: file.status, sha: file.sha }));
      change.diffMayBeTruncated = (diff.files ?? []).length >= 300;
      if (change.diffMayBeTruncated) {
        change.blocked = true;
        change.classification = 'full-diff-review';
      }
      if (change.files.some((file) => /license|notice/i.test(file.path))) {
        change.blocked = true;
        change.classification = 'license-review';
      }
      change.copiedSourceChanges = [];
      for (const file of base.copiedFiles) {
        const content = await request(
          `https://raw.githubusercontent.com/${config.repository}/${change.sourceCommit}/${file.path}`,
          { json: false },
        );
        const hash = createHash('sha256').update(content).digest('hex');
        if (hash !== file.sha256)
          change.copiedSourceChanges.push({ path: file.path, sha256: hash });
      }
    }
  }
  return {
    schemaVersion: 1,
    complete: enrich,
    baseStateHash: createHash('sha256').update(JSON.stringify(state)).digest('hex'),
    checkedAt: now,
    changes,
    advisories: [...new Map(advisories.map((a) => [a.ghsa_id, a])).values()],
    nextState: mergeReport(state, results, now),
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const state = JSON.parse(await readFile('upstream/state.json', 'utf8'));
  await mkdir('artifacts/upstream', { recursive: true });
  try {
    const report = await detect({ state, enrich: !process.argv.includes('--registry-only') });
    await writeFile('artifacts/upstream/report.json', JSON.stringify(report, null, 2) + '\n');
    console.log(
      `Detected ${report.changes.length} upstream releases; supported versions unchanged.`,
    );
  } catch (error) {
    await writeFile(
      'artifacts/upstream/error.json',
      JSON.stringify(
        {
          failedAt: new Date().toISOString(),
          message: error.message,
          lastSuccessfulCheck: state.lastSuccessfulCheck,
        },
        null,
        2,
      ),
    );
    throw error;
  }
}
