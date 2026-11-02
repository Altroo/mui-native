import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request, pages } from './http.mjs';
import { detect } from './detect.mjs';
import { monitoredPackages as packages } from './config.mjs';
test('GitHub workflow dispatch accepts an empty 204 response', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204 });
  try {
    assert.equal(await request('https://api.github.com/test', { method: 'POST' }), null);
  } finally {
    globalThis.fetch = original;
  }
});
test('npm version metadata uses JSON Accept without the GitHub token', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://registry.npmjs.org/%40mui%2Fx-data-grid/8.29.5');
    assert.equal(options.headers.get('accept'), 'application/json');
    assert.equal(options.headers.get('authorization'), null);
    return Response.json({ name: '@mui/x-data-grid', version: '8.29.5' });
  };
  try {
    assert.equal(
      (
        await request('https://registry.npmjs.org/%40mui%2Fx-data-grid/8.29.5', {
          token: 'test-token',
        })
      ).version,
      '8.29.5',
    );
  } finally {
    globalThis.fetch = original;
  }
});
test('GitHub keeps its media type and token while raw sources use text', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const github = new URL(url).origin === 'https://api.github.com';
    assert.equal(
      options.headers.get('accept'),
      github ? 'application/vnd.github+json' : 'text/plain',
    );
    assert.equal(options.headers.get('authorization'), github ? 'Bearer test-token' : null);
    return github ? Response.json({ sha: 'source' }) : new Response('source text');
  };
  try {
    assert.deepEqual(await request('https://api.github.com/test', { token: 'test-token' }), {
      sha: 'source',
    });
    assert.equal(
      await request('https://raw.githubusercontent.com/mui/material-ui/main/LICENSE', {
        token: 'test-token',
        json: false,
      }),
      'source text',
    );
  } finally {
    globalThis.fetch = original;
  }
});
test('explicit request headers override defaults without duplicate Accept values', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.get('accept'), 'application/vnd.github.raw+json');
    return new Response('raw');
  };
  try {
    assert.equal(
      await request('https://api.github.com/test', {
        json: false,
        headers: { accept: 'application/vnd.github.raw+json' },
      }),
      'raw',
    );
  } finally {
    globalThis.fetch = original;
  }
});
test('pagination follows numbered and advisory cursor links, even on short pages', async () => {
  const original = globalThis.fetch;
  try {
    for (const query of ['page=2', 'after=advisory-cursor']) {
      const urls = [];
      const next = `https://api.github.com/test?ecosystem=npm&per_page=100&${query}`;
      globalThis.fetch = async (url) => {
        urls.push(url);
        return Response.json([urls.length], {
          headers:
            urls.length === 1 ? { link: `<${next}>; rel="next", <${next}>; rel="last"` } : {},
        });
      };
      assert.deepEqual(await pages('https://api.github.com/test?ecosystem=npm'), [1, 2]);
      assert.deepEqual(urls, ['https://api.github.com/test?ecosystem=npm&per_page=100', next]);
    }
  } finally {
    globalThis.fetch = original;
  }
});
test('pagination stops without a next link and rejects loops or a foreign host', async () => {
  const original = globalThis.fetch;
  const url = 'https://api.github.com/test?per_page=100';
  try {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return Response.json(Array(100).fill(1));
    };
    assert.equal((await pages(url)).length, 100);
    assert.equal(calls, 1);
    for (const [next, error] of [
      [url, /Repeated pagination link/],
      ['https://example.com/test', /Unexpected pagination host/],
    ]) {
      globalThis.fetch = async () =>
        Response.json([1], { headers: { link: `<${next}>; rel="next"` } });
      await assert.rejects(pages(url), error);
    }
    globalThis.fetch = async () => new Response('{}', { status: 403 });
    await assert.rejects(request(url), /HTTP 403/);
    await assert.rejects(pages(url), /HTTP 403/);
  } finally {
    globalThis.fetch = original;
  }
});
test('partial registry checks cannot be confused with a complete successful check', async () => {
  const state = {
    packages: Object.fromEntries(
      packages.map((p) => [
        p.name,
        {
          baseline: { version: '9.5.0' },
          observedVersions: ['9.5.0'],
          portedAndVerified: null,
          releasedSupport: null,
        },
      ]),
    ),
    lastSuccessfulCheck: null,
  };
  const report = await detect({
    state,
    enrich: false,
    fetchRegistry: async (name) => ({
      name,
      'dist-tags': { latest: '9.5.0' },
      versions: { '9.5.0': { license: 'MIT' } },
      time: { '9.5.0': '2026-01-01' },
    }),
  });
  assert.equal(report.complete, false);
  assert.equal(state.lastSuccessfulCheck, null);
  await assert.rejects(
    detect({
      state,
      enrich: false,
      fetchRegistry: async () => {
        throw new Error('rate limited');
      },
    }),
    /rate limited/,
  );
  assert.equal(state.lastSuccessfulCheck, null);
});
