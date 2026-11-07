// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as wait } from 'node:timers/promises';
import { assertSourceEligible } from './config.mjs';
import { request, pages } from './http.mjs';
import {
  trackingBranch,
  trackingPath,
  stateHash,
  readTracking,
  withTracking,
  trackingFromState,
  reviewedStateHash,
} from './tracking.mjs';
export async function publishReport({
  report,
  repository = process.env.GITHUB_REPOSITORY,
  token = process.env.GITHUB_TOKEN,
  prepareDrafts = false,
}) {
  if (!repository || !token) throw new Error('Repository and token required');
  if (prepareDrafts)
    throw new Error('Automatic draft preparation is disabled for detection-only telemetry');
  if (report.complete !== true)
    throw new Error('Partial reports cannot prepare candidates or advance state');
  const root = `https://api.github.com/repos/${repository}`;
  const api = (path, method = 'GET', body) =>
    request(root + path, { token, method, ...(body ? { body: JSON.stringify(body) } : {}) });
  async function maybe(path) {
    try {
      return await api(path);
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }
  const transient = (error) =>
    (error.status >= 500 && error.status <= 599) ||
    ['TimeoutError', 'AbortError'].includes(error.name) ||
    error instanceof TypeError;
  const repo = await api('');
  const main = repo.default_branch;
  if (main === trackingBranch) throw new Error('Detection branch must not be the default branch');
  const mainPath = `/contents/upstream/state.json?ref=${encodeURIComponent(main)}`;
  const before = await api(mainPath);
  const mainState = JSON.parse(Buffer.from(before.content, 'base64').toString());
  if (stateHash(mainState) !== report.baseStateHash)
    throw new Error('Baseline changed during detection; rerun without advancing state');
  const previousTracking = await readTracking({ repository, token });
  const state = withTracking(
    mainState,
    previousTracking.content === null ? null : JSON.parse(previousTracking.content),
  );
  if (
    previousTracking.sha !== report.baseTrackingSha ||
    stateHash(state) !== report.baseDetectionHash
  )
    throw new Error('Detection telemetry changed; rerun without overwriting its cursor');
  if (reviewedStateHash(report.nextState) !== reviewedStateHash(mainState))
    throw new Error('Detection report changes reviewed support; rerun without advancing state');
  const nextTelemetry = trackingFromState(report.nextState);
  const nextState = withTracking(mainState, nextTelemetry);

  async function ensureTrackingBranch() {
    const refPath = `/git/ref/heads/${trackingBranch}`;
    if (await maybe(refPath)) return;
    const base = await api(`/git/ref/heads/${main}`);
    try {
      await api('/git/refs', 'POST', { ref: `refs/heads/${trackingBranch}`, sha: base.object.sha });
    } catch (error) {
      // A completed ref creation can have a failed response, or another writer
      // can win creation. Never force/reset a pre-existing automation branch.
      if (!(transient(error) || error.status === 422) || !(await maybe(refPath))) throw error;
    }
  }
  async function writeTracking() {
    const content = JSON.stringify(nextTelemetry, null, 2) + '\n';
    await ensureTrackingBranch();
    let current = await readTracking({ repository, token });
    if (current.sha !== previousTracking.sha)
      throw new Error(
        'Detection telemetry changed before writing; rerun without overwriting its cursor',
      );
    for (let attempt = 0; attempt < 3; attempt++) {
      // Main's reviewed state remains authoritative even if it changes after
      // detection or while the update issues are being prepared.
      if ((await api(mainPath)).sha !== before.sha)
        throw new Error(
          'State changed while preparing updates; rerun without overwriting reviewed support',
        );
      if (current.content === content) return;
      try {
        await api(`/contents/${trackingPath}`, 'PUT', {
          message: 'chore(upstream): refresh detection telemetry',
          content: Buffer.from(content).toString('base64'),
          branch: trackingBranch,
          ...(previousTracking.sha === null ? {} : { sha: previousTracking.sha }),
        });
        return;
      } catch (error) {
        if (!transient(error)) throw error;
        // A failed PUT response does not prove the commit failed. Read back
        // before retrying the same conditional write, never a blind overwrite.
        current = await readTracking({ repository, token });
        if (current.content === content) return;
        if (current.sha !== previousTracking.sha)
          throw new Error(
            'Detection telemetry changed after a failed write; rerun without overwriting its cursor',
            { cause: error },
          );
        if (attempt === 2) throw error;
        await wait(250 * 2 ** attempt);
      }
    }
  }
  for (const change of report.changes) assertSourceEligible(change.name);
  // Search all issue states, including closed ones, to avoid duplicate release issues after outages.
  const issues = (await pages(root + '/issues?state=all', { token })).filter(
    (issue) => !issue.pull_request,
  );
  const labels = await pages(root + '/labels', { token });
  for (const name of [
    'upstream-update',
    'security',
    'license-review',
    'upstream-dashboard',
    ...new Set(report.changes.map((c) => c.family)),
  ])
    if (!labels.some((l) => l.name === name))
      await api('/labels', 'POST', { name, color: name === 'security' ? 'b60205' : '1d76db' });
  async function issue(marker, title, body, labelNames) {
    const existing = issues.find((i) => i.body?.includes(marker));
    if (existing) return existing;
    const created = await api('/issues', 'POST', {
      title,
      body: `${marker}\n${body}`,
      labels: labelNames,
    });
    issues.push(created);
    return created;
  }
  const releases = new Map();
  for (const change of report.changes) {
    const key = `${change.repository}/${change.sourceCommit}`;
    releases.set(key, [...(releases.get(key) ?? []), change]);
  }
  for (const [key, changes] of releases) {
    await issue(
      `<!-- upstream-release:${key} -->`,
      `Upstream: ${changes[0].repository} ${changes
        .map((c) => c.version)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(', ')}`,
      changes
        .map(
          (c) =>
            `- ${c.name}@${c.version}: ${c.classification}. [Release](${c.releaseUrl}) | [Source comparison](${c.compareUrl})` +
            (c.adaptedSourceChanges?.length
              ? `\n  Adapted source changed: ${c.adaptedSourceChanges.map((file) => `\`${file.path}\` (${file.status}; review ${file.localFiles.map((local) => `\`${local}\``).join(', ')})`).join('; ')}.`
              : ''),
        )
        .join('\n') +
        '\n\nAutomatic draft PR creation is disabled. Review the upstream-report workflow artifact and create candidate PRs manually.' +
        '\n\n- [ ] Review licensing and API changes\n- [ ] Implement eligible native changes\n- [ ] Validate native and web contracts\n- [ ] Update verified compatibility after review',
      [
        'upstream-update',
        ...new Set(changes.map((c) => c.family)),
        ...(changes.some((c) => c.blocked) ? ['license-review'] : []),
      ],
    );
  }
  for (const advisory of report.advisories) {
    await issue(
      `<!-- upstream-security:${advisory.ghsa_id} -->`,
      `Security review: ${advisory.ghsa_id}`,
      `Severity: ${advisory.severity}. [GitHub advisory](${advisory.html_url}). Review copied source and affected dependency ranges before release.`,
      ['upstream-update', 'security'],
    );
  }
  // All side effects above must succeed before advancing detection state.
  await writeTracking();
  const table = [
    '| Package | Latest detected | Candidate | Ported and verified | Released support |',
    '| --- | --- | --- | --- | --- |',
    ...Object.entries(nextState.packages).map(
      ([name, p]) =>
        `| ${name} | ${p.latestDetected} | ${p.candidate?.version ?? 'None'} | ${p.portedAndVerified ?? 'None'} | ${p.releasedSupport ?? 'None'} |`,
    ),
  ].join('\n');
  const dashboard = await issue('<!-- upstream-dashboard -->', 'Upstream Updates', table, [
    'upstream-dashboard',
  ]);
  await api(`/issues/${dashboard.number}`, 'PATCH', {
    body: `<!-- upstream-dashboard -->\nLast successful check: ${report.checkedAt}\n\n${table}\n\nDetection and update issues; candidate PRs are created manually. Human review is required before support advances. See Actions for failed checks and manual reruns.`,
  });
  if (!dashboard.pinned) {
    try {
      await request('https://api.github.com/graphql', {
        token,
        method: 'POST',
        body: JSON.stringify({
          query: 'mutation($id:ID!){pinIssue(input:{issueId:$id}){issue{id}}}',
          variables: { id: dashboard.node_id },
        }),
      });
    } catch (error) {
      console.warn('Dashboard created; pinning needs a maintainer:', error.message);
    }
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = JSON.parse(
    await readFile(process.argv[2] ?? 'artifacts/upstream/report.json', 'utf8'),
  );
  await publishReport({ report, prepareDrafts: process.env.PREPARE_DRAFT_PRS === 'true' });
  console.log('Upstream tracking synchronized. No merge or publication performed.');
}
