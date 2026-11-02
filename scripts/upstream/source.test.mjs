import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseResolver } from './source.mjs';
const config = {
  name: '@mui/x-chat',
  channel: 'preview',
  repository: 'mui/mui-x',
  directory: 'packages/x-chat',
};
const change = { version: '9.0.0-alpha.21', publishedAt: '2026-10-30T15:00:00Z' };
const release = {
  tag_name: 'v9.17.0',
  published_at: '2026-10-30T15:22:49Z',
  body: 'Chat version omitted',
};
const sha = 'a'.repeat(40);
test('an omitted preview heading resolves only through an exact immutable manifest', async () => {
  let commits = 0;
  let manifests = 0;
  const resolve = releaseResolver({
    commit: async () => {
      commits++;
      return sha;
    },
    read: async (url) => {
      manifests++;
      assert.equal(
        url,
        `https://raw.githubusercontent.com/mui/mui-x/${sha}/packages/x-chat/package.json`,
      );
      return { name: config.name, version: change.version };
    },
  });
  assert.deepEqual(await resolve(config, change, [release]), { release, sourceCommit: sha });
  await resolve(config, change, [release]);
  assert.equal(commits, 1);
  assert.equal(manifests, 1);
});
test('preview notes cannot override an absent, wrong-name or wrong-version source manifest', async () => {
  for (const manifest of [
    null,
    { name: '@mui/x-chat-headless', version: change.version },
    { name: config.name, version: '9.0.0-alpha.2' },
  ]) {
    const resolve = releaseResolver({ commit: async () => sha, read: async () => manifest });
    await assert.rejects(
      resolve(config, change, [{ ...release, body: `#### \`${config.name}@${change.version}\`` }]),
      /no verified GitHub release/,
    );
  }
});
test('source HTTP errors fail the scan and draft releases are excluded', async () => {
  const resolve = releaseResolver({
    commit: async () => sha,
    read: async () => {
      throw new Error('HTTP 403 for source');
    },
  });
  await assert.rejects(resolve(config, change, [release]), /HTTP 403/);
  await assert.rejects(
    resolve(config, change, [{ ...release, draft: true }]),
    /no verified GitHub release/,
  );
});
test('missing preview publications have a bounded source search', async () => {
  let reads = 0;
  const resolve = releaseResolver({
    commit: async (repo, tag) => tag,
    read: async () => {
      reads++;
      throw new Error('HTTP 404 for source');
    },
  });
  await assert.rejects(
    resolve(
      config,
      change,
      Array.from({ length: 20 }, (_, i) => ({ ...release, tag_name: `v9.${i}.0` })),
    ),
    /no verified GitHub release/,
  );
  assert.equal(reads, 10);
});
