import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { assertEligible } from './config.mjs';
import { request, pages } from './http.mjs';
export async function publishReport({
  report,
  repository = process.env.GITHUB_REPOSITORY,
  token = process.env.GITHUB_TOKEN,
  prepareDrafts = false,
}) {
  if (!repository || !token) throw new Error('Repository and token required');
  if (!report.complete)
    throw new Error('Partial reports cannot prepare candidates or advance state');
  const root = `https://api.github.com/repos/${repository}`;
  const api = (path, method = 'GET', body) =>
    request(root + path, { token, method, ...(body ? { body: JSON.stringify(body) } : {}) });
  async function maybe(path) {
    try {
      return await api(path);
    } catch (error) {
      if (error.message.startsWith('HTTP 404 ')) return null;
      throw error;
    }
  }
  async function putFile(path, content, branch, expectedSha) {
    const old = await maybe(`/contents/${path}?ref=${encodeURIComponent(branch)}`);
    if (expectedSha && old?.sha !== expectedSha)
      throw new Error(
        'State changed while preparing candidates; rerun without overwriting reviewed support',
      );
    if (old && Buffer.from(old.content, 'base64').toString() === content) return;
    await api(`/contents/${path}`, 'PUT', {
      message: `chore(upstream): refresh ${path}`,
      content: Buffer.from(content).toString('base64'),
      branch,
      ...(old ? { sha: old.sha } : {}),
    });
  }
  const repo = await api('');
  const main = repo.default_branch;
  const before = await api(`/contents/upstream/state.json?ref=${main}`);
  const state = JSON.parse(Buffer.from(before.content, 'base64').toString());
  if (createHash('sha256').update(JSON.stringify(state)).digest('hex') !== report.baseStateHash)
    throw new Error('Baseline changed during detection; rerun without advancing state');
  for (const change of report.changes) assertEligible(change.name);
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
        (prepareDrafts
          ? ''
          : '\n\nAutomatic draft PR creation is disabled. Review the upstream-report workflow artifact and create candidate PRs manually.') +
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
  if (prepareDrafts) {
    const groups = new Map();
    for (const change of report.changes.filter((c) => !c.blocked)) {
      const key = `${change.family}/${change.channel}/v${change.version.split('.')[0]}`;
      groups.set(key, [...(groups.get(key) ?? []), change]);
    }
    const prs = await pages(root + '/pulls?state=open', { token });
    for (const [key, changes] of groups) {
      const branch = `upstream/${key}`;
      const ref = await maybe(`/git/ref/heads/${branch}`);
      if (!ref) {
        const base = await api(`/git/ref/heads/${main}`);
        await api('/git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: base.object.sha });
      }
      const candidatePath = `upstream/candidates/${key.replaceAll('/', '-')}.json`;
      const old = await maybe(`/contents/${candidatePath}?ref=${encodeURIComponent(branch)}`);
      const previous = old
        ? JSON.parse(Buffer.from(old.content, 'base64').toString())
        : { changes: [] };
      const cumulative = [
        ...new Map(
          [...previous.changes, ...changes].map((c) => [`${c.name}@${c.version}`, c]),
        ).values(),
      ];
      const candidate = {
        schemaVersion: 1,
        preparedAt: report.checkedAt,
        status: 'needs-native-port-and-review',
        changes: cumulative,
      };
      await putFile(candidatePath, JSON.stringify(candidate, null, 2) + '\n', branch);
      let pr = prs.find((p) => p.head.ref === branch);
      if (!pr)
        pr = await api('/pulls', 'POST', {
          title: `Upstream candidate: ${key}`,
          head: branch,
          base: main,
          draft: true,
          body: `Generated upstream source, license, and API impact report: \`${candidatePath}\`.\n\nThis draft does not claim native support.\n\n- [ ] Review API snapshots and source changes\n- [ ] Implement native changes and comparison fixtures\n- [ ] Validate iOS, Android, types, and original MUI web behavior\n- [ ] Approve licensing and compatibility status\n\nNo automatic merging or publishing.`,
        });
      // GITHUB_TOKEN writes do not reliably trigger pull_request CI. Dispatch explicitly.
      await api('/actions/workflows/ci.yml/dispatches', 'POST', {
        ref: main,
        inputs: { ref: branch },
      });
      for (const change of changes)
        report.nextState.packages[change.name].candidate = {
          version: change.version,
          branch,
          pullRequest: pr.html_url,
        };
    }
  }
  // All side effects above must succeed before advancing detection state.
  await putFile(
    'upstream/state.json',
    JSON.stringify(report.nextState, null, 2) + '\n',
    main,
    before.sha,
  );
  const table = [
    '| Package | Latest detected | Candidate | Ported and verified | Released support |',
    '| --- | --- | --- | --- | --- |',
    ...Object.entries(report.nextState.packages).map(
      ([name, p]) =>
        `| ${name} | ${p.latestDetected} | ${p.candidate?.version ?? 'None'} | ${p.portedAndVerified ?? 'None'} | ${p.releasedSupport ?? 'None'} |`,
    ),
  ].join('\n');
  const dashboard = await issue('<!-- upstream-dashboard -->', 'Upstream Updates', table, [
    'upstream-dashboard',
  ]);
  await api(`/issues/${dashboard.number}`, 'PATCH', {
    body: `<!-- upstream-dashboard -->\nLast successful check: ${report.checkedAt}\n\n${table}\n\n${prepareDrafts ? 'Detection and draft preparation' : 'Detection and update issues; candidate PRs are created manually'} only. Human review is required before support advances. See Actions for failed checks and manual reruns.`,
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
