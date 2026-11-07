// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { trackingBranch, trackingPath, withTracking } from '../tracking.mjs';

export const hash = (value) => createHash('sha256').update(value).digest('hex');
const file = (content) => ({
  content: Buffer.from(content).toString('base64'),
  sha: hash(content),
});
export function simulatedGitHub(state, { telemetry = null, telemetrySha } = {}) {
  const repository = 'simulation/mui-native';
  const root = `/repos/${repository}`;
  const branches = new Map([
    ['main', new Map([['upstream/state.json', file(JSON.stringify(state))]])],
  ]);
  if (telemetry !== null) {
    branches.set(trackingBranch, structuredClone(branches.get('main')));
    const value = file(JSON.stringify(telemetry, null, 2) + '\n');
    if (telemetrySha) value.sha = telemetrySha;
    branches.get(trackingBranch).set(trackingPath, value);
  }
  const issues = [],
    pulls = [],
    labels = [],
    dispatches = [],
    calls = [],
    failures = [];
  const decoded = (value) => JSON.parse(Buffer.from(value.content, 'base64').toString());
  const remote = {
    repository,
    branches,
    issues,
    pulls,
    labels,
    dispatches,
    calls,
    failNext(predicate, status = 403, { committed = false } = {}) {
      failures.push({ predicate, status, committed });
    },
    state() {
      return decoded(branches.get('main').get('upstream/state.json'));
    },
    tracking() {
      const value = branches.get(trackingBranch)?.get(trackingPath);
      return value ? decoded(value) : null;
    },
    effectiveState() {
      return withTracking(remote.state(), remote.tracking());
    },
    async fetch(input, options = {}) {
      const url = new URL(input),
        method = options.method ?? 'GET';
      const body = options.body ? JSON.parse(options.body) : undefined;
      assert.equal(
        url.origin,
        'https://api.github.com',
        'Simulation must never reach another host',
      );
      assert.equal(new Headers(options.headers).get('authorization'), 'Bearer simulation-token');
      const call = { path: url.pathname, method, body };
      calls.push(call);
      let failedStatus;
      const failure = failures[0];
      if (failure?.predicate(call)) {
        failures.shift();
        if (!failure.committed)
          return Response.json({ message: 'Simulated failure' }, { status: failure.status });
        assert.ok(
          method === 'PUT' || url.pathname.endsWith('/git/refs'),
          'Committed failures simulate conditional content writes or ref creation only',
        );
        failedStatus = failure.status;
      }
      const path = url.pathname.slice(root.length);
      if (url.pathname === '/graphql' && method === 'POST') {
        assert.match(body.query, /pinIssue/);
        const issue = issues.find((item) => item.node_id === body.variables.id);
        assert.ok(issue);
        issue.pinned = true;
        return Response.json({ data: { pinIssue: { issue: { id: issue.node_id } } } });
      }
      assert.ok(url.pathname.startsWith(root), 'Only the simulated repository is accessible');
      if (!path && method === 'GET') return Response.json({ default_branch: 'main' });
      if (path.startsWith('/contents/')) {
        const name = decodeURIComponent(path.slice('/contents/'.length));
        const branch = method === 'GET' ? url.searchParams.get('ref') : body.branch;
        const files = branches.get(branch);
        if (!files) return Response.json({}, { status: 404 });
        const old = files.get(name);
        if (method === 'GET') return Response.json(old ?? {}, { status: old ? 200 : 404 });
        if (method === 'PUT') {
          // A protected main can never be an automation persistence fallback.
          if (branch === 'main') return Response.json({}, { status: 403 });
          assert.equal(branch, trackingBranch);
          assert.equal(name, trackingPath);
          if (old?.sha !== body.sha) return Response.json({}, { status: 409 });
          const next = file(Buffer.from(body.content, 'base64').toString());
          files.set(name, next);
          return Response.json({ content: next }, { status: failedStatus ?? 200 });
        }
      }
      if (path.startsWith('/git/ref/heads/') && method === 'GET') {
        const branch = decodeURIComponent(path.slice('/git/ref/heads/'.length));
        return Response.json(
          { object: { sha: hash(branch) } },
          { status: branches.has(branch) ? 200 : 404 },
        );
      }
      if (path === '/git/refs' && method === 'POST') {
        assert.equal(body.sha, hash('main'));
        assert.equal(body.ref, `refs/heads/${trackingBranch}`);
        if (branches.has(trackingBranch)) return Response.json({}, { status: 422 });
        branches.set(trackingBranch, structuredClone(branches.get('main')));
        return Response.json({ ref: body.ref }, { status: failedStatus ?? 201 });
      }
      if (path === '/labels') {
        if (method === 'GET') return Response.json(labels);
        if (method === 'POST') {
          labels.push(body);
          return Response.json(body, { status: 201 });
        }
      }
      if (path === '/issues') {
        if (method === 'GET') return Response.json(issues);
        if (method === 'POST') {
          const number = issues.length + 1;
          const issue = {
            ...body,
            number,
            node_id: `issue-${number}`,
            state: 'open',
            pinned: false,
          };
          issues.push(issue);
          return Response.json(issue, { status: 201 });
        }
      }
      if (/^\/issues\/\d+$/.test(path) && method === 'PATCH') {
        const issue = issues.find((item) => item.number === Number(path.split('/').pop()));
        assert.ok(issue);
        Object.assign(issue, body);
        return Response.json(issue);
      }
      throw new Error(`Unexpected simulated operation: ${method} ${url.pathname}`);
    },
  };
  return remote;
}
