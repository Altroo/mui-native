// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { monitoredPackages as packages } from './config.mjs';
import { request, pages } from './http.mjs';
import { releaseResolver } from './source.mjs';
import { inspectArtifact } from './artifact.mjs';
import { detectPackage, mergeReport } from './model.mjs';
import { reusedFiles, compareReusedFiles } from './reuse.mjs';
import { stateHash, readTracking, withTracking } from './tracking.mjs';
export async function detect({
  state,
  mainState = state,
  trackingSha = null,
  tracking = null,
  reuse = { schemaVersion: 1, entries: [] },
  fetchRegistry = async (name) => request(`https://registry.npmjs.org/${encodeURIComponent(name)}`),
  now = new Date().toISOString(),
  enrich = true,
  fetchArtifact = inspectArtifact,
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
  const resolveRelease = releaseResolver();
  const comparisons = new Map();
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
      const { release, sourceCommit } = await resolveRelease(
        config,
        change,
        releases[config.repository],
      );
      change.sourceCommit = sourceCommit;
      change.releaseUrl = release.html_url;
      change.releaseNotes = release.body ?? '';
      const pkg = await request(
        `https://registry.npmjs.org/${encodeURIComponent(config.name)}/${change.version}`,
      );
      const adapted = reusedFiles(reuse, config.name);
      const artifact = await fetchArtifact(pkg, { sourceFiles: adapted.map((file) => file.path) });
      change.adaptedSourceChanges = compareReusedFiles(adapted, artifact.sourceFiles);
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
      const comparison = `https://api.github.com/repos/${config.repository}/compare/${base.sourceCommit}...${change.sourceCommit}`;
      if (!comparisons.has(comparison)) comparisons.set(comparison, request(comparison));
      const diff = await comparisons.get(comparison);
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
    baseStateHash: stateHash(mainState),
    baseDetectionHash: stateHash(state),
    baseTrackingSha: trackingSha,
    baseTracking: structuredClone(tracking),
    checkedAt: now,
    changes,
    advisories: [...new Map(advisories.map((a) => [a.ghsa_id, a])).values()],
    nextState: mergeReport(state, results, now),
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mainState = JSON.parse(await readFile('upstream/state.json', 'utf8'));
  let state = mainState;
  const reuse = JSON.parse(await readFile('upstream/reuse.json', 'utf8'));
  await mkdir('artifacts/upstream', { recursive: true });
  await rm('artifacts/upstream/report.json', { force: true });
  await rm('artifacts/upstream/error.json', { force: true });
  try {
    const tracking = process.env.GITHUB_REPOSITORY
      ? await readTracking({
          repository: process.env.GITHUB_REPOSITORY,
          token: process.env.GITHUB_TOKEN,
        })
      : { sha: null, content: null };
    const telemetry = tracking.content === null ? null : JSON.parse(tracking.content);
    state = withTracking(mainState, telemetry);
    const report = await detect({
      state,
      mainState,
      trackingSha: tracking.sha,
      tracking: telemetry,
      reuse,
      enrich: !process.argv.includes('--registry-only'),
    });
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
