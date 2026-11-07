// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, cp, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

test('the separate prepare runner installs pinned dependencies before importing the publisher', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/upstream.yml', import.meta.url),
    'utf8',
  );
  const prepare = workflow.split('\n  prepare:\n')[1];
  assert(prepare);
  const setup = prepare.indexOf('uses: pnpm/action-setup@'),
    node = prepare.indexOf('uses: actions/setup-node@'),
    install = prepare.indexOf('run: pnpm install --frozen-lockfile --ignore-scripts'),
    publish = prepare.indexOf('run: node scripts/upstream/publish-report.mjs');
  assert(
    setup >= 0 && setup < node && node < install && install < publish,
    'Prepare must bootstrap its own locked dependencies; jobs never share node_modules',
  );
  assert.match(prepare, /cache: pnpm/);
  assert.match(prepare, /PREPARE_DRAFT_PRS: 'false'/);
  assert.doesNotMatch(prepare, /^\s+(?:pull-requests|actions): write$/m);
  const directory = await mkdtemp(join(tmpdir(), 'mui-upstream-runtime-'));
  try {
    for (const name of ['publish-report.mjs', 'config.mjs', 'http.mjs', 'tracking.mjs'])
      await cp(new URL(name, import.meta.url), join(directory, name));
    const source =
      'await import(' +
      JSON.stringify(pathToFileURL(join(directory, 'publish-report.mjs')).href) +
      ');';
    const run = () =>
      spawnSync(process.execPath, ['--input-type=module', '-e', source], {
        encoding: 'utf8',
        timeout: 10000,
      });
    const missing = run();
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /ERR_MODULE_NOT_FOUND/);
    assert.match(missing.stderr, /semver/);
    await mkdir(join(directory, 'node_modules'));
    await cp(
      dirname(fileURLToPath(import.meta.resolve('semver/package.json'))),
      join(directory, 'node_modules/semver'),
      { recursive: true, dereference: true },
    );
    const installed = run();
    assert.equal(installed.status, 0, installed.stderr);
    assert.equal(installed.stdout, '');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
