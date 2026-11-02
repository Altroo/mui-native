import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const hash = (value) => createHash('sha256').update(value).digest('hex');
export function simulatedGitHub(state) {
  const repository = 'simulation/mui-native';
  const root = `/repos/${repository}`;
  const file = (content) => ({
    content: Buffer.from(content).toString('base64'),
    sha: hash(content),
  });
  const branches = new Map([
    ['main', new Map([['upstream/state.json', file(JSON.stringify(state))]])],
  ]);
  const issues = [];
  const pulls = [];
  const labels = [];
  const dispatches = [];
  const calls = [];
  let failure;
  const remote = {
    repository,
    branches,
    issues,
    pulls,
    labels,
    dispatches,
    calls,
    failNext(predicate, status = 403) {
      failure = { predicate, status };
    },
    state() {
      return JSON.parse(
        Buffer.from(branches.get('main').get('upstream/state.json').content, 'base64').toString(),
      );
    },
    async fetch(input, options = {}) {
      const url = new URL(input);
      const method = options.method ?? 'GET';
      const body = options.body ? JSON.parse(options.body) : undefined;
      assert.equal(
        url.origin,
        'https://api.github.com',
        'Simulation must never reach another host',
      );
      assert.equal(new Headers(options.headers).get('authorization'), 'Bearer simulation-token');
      const call = { path: url.pathname, method, body };
      calls.push(call);
      if (failure?.predicate(call)) {
        const status = failure.status;
        failure = undefined;
        return Response.json({ message: 'Simulated failure' }, { status });
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
        assert.ok(files, `Missing simulated branch ${branch}`);
        const old = files.get(name);
        if (method === 'GET') return Response.json(old ?? {}, { status: old ? 200 : 404 });
        if (method === 'PUT') {
          if (old?.sha !== body.sha) return Response.json({}, { status: 409 });
          const next = file(Buffer.from(body.content, 'base64').toString());
          files.set(name, next);
          return Response.json({ content: next });
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
        const branch = body.ref.replace('refs/heads/', '');
        assert.ok(!branches.has(branch));
        branches.set(branch, structuredClone(branches.get('main')));
        return Response.json({ ref: body.ref }, { status: 201 });
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
      if (path === '/pulls') {
        if (method === 'GET') return Response.json(pulls.filter((item) => item.state === 'open'));
        if (method === 'POST') {
          assert.equal(body.draft, true);
          assert.equal(body.base, 'main');
          assert.ok(branches.has(body.head));
          const pr = {
            ...body,
            state: 'open',
            head: { ref: body.head },
            html_url: `https://github.com/${repository}/pull/${pulls.length + 1}`,
          };
          pulls.push(pr);
          return Response.json(pr, { status: 201 });
        }
      }
      if (path === '/actions/workflows/ci.yml/dispatches' && method === 'POST') {
        assert.equal(body.ref, 'main');
        assert.ok(branches.has(body.inputs.ref));
        dispatches.push(body);
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected simulated operation: ${method} ${url.pathname}`);
    },
  };
  return remote;
}
