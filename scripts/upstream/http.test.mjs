import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request, pages } from './http.mjs';
import { detect } from './detect.mjs';
import { packages } from './config.mjs';
test('GitHub workflow dispatch accepts an empty 204 response', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204 });
  try {
    assert.equal(await request('https://api.github.com/test', { method: 'POST' }), null);
  } finally {
    globalThis.fetch = original;
  }
});
test('pagination consumes every page and API errors are not swallowed', async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    return new Response(JSON.stringify(url.endsWith('page=1') ? Array(100).fill(1) : [2]), {
      status: 200,
    });
  };
  try {
    assert.equal((await pages('https://api.github.com/test')).length, 101);
    assert.equal(urls.length, 2);
    globalThis.fetch = async () => new Response('{}', { status: 403 });
    await assert.rejects(request('https://api.github.com/test'), /HTTP 403/);
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
