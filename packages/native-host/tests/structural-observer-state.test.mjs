// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Keep the coalescing, lease and threaded lifecycle policy in the normal test
// command. This compiles production state code, without loading a mobile SDK.
test('production structural state retains its lease, ordering and teardown invariants', async (t) => {
  const folder = await mkdtemp(join(tmpdir(), 'mui-structural-state-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  const output = join(folder, 'state');
  const args = ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pthread'];
  if (process.platform === 'darwin' && process.env.SDKROOT)
    args.push('-isysroot', process.env.SDKROOT);
  args.push(
    fileURLToPath(new URL('./StructuralObservationStateTest.cpp', import.meta.url)),
    '-o',
    output,
  );
  const compile = spawnSync(process.env.CXX ?? 'c++', args, { encoding: 'utf8', timeout: 30000 });
  assert.equal(compile.status, 0, compile.error?.message ?? compile.stderr);
  const run = spawnSync(output, [], { encoding: 'utf8', timeout: 10000 });
  assert.equal(run.status, 0, run.error?.message ?? run.stderr);
  assert.match(run.stdout, /^33 structural state checks passed\n$/);
});
