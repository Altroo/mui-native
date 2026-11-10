// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const ciCommands = Object.freeze([
  'pnpm install --frozen-lockfile',
  'pnpm lint',
  'pnpm test',
  'pnpm coverage:verify',
  'pnpm build',
  'pnpm typecheck:consumer',
  'pnpm native-host:codegen',
  'pnpm test:consumer',
  'pnpm format:check',
]);
export const compilerBudget = '9GiB';

/** Refuse a stale local checklist before spending time on any checks. */
export function assertWorkflowMatches(workflow) {
  const document = parse(workflow, { merge: true });
  assert.deepEqual(
    Object.keys(document.jobs),
    ['contracts'],
    'Local preflight supports the contracts job only.',
  );
  const job = document.jobs.contracts;
  assert.equal(document.env, undefined, 'Workflow environment needs an explicit local equivalent.');
  assert.equal(
    document.defaults,
    undefined,
    'Workflow defaults need an explicit local equivalent.',
  );
  for (const key of ['if', 'uses', 'strategy', 'defaults'])
    assert.equal(job[key], undefined, `Unsupported CI job ${key}.`);
  assert.equal(job['continue-on-error'] ?? false, false, 'CI gates must fail on errors.');
  assert.deepEqual(job.env, { GOMEMLIMIT: compilerBudget });
  const actual = [],
    actions = [];
  for (const step of job.steps) {
    assert.equal(step.if, undefined, 'Local validation gates cannot be conditionally skipped.');
    assert.equal(step['continue-on-error'] ?? false, false, 'CI gates must fail on errors.');
    assert.equal(step['working-directory'], undefined, 'CI checks must use the repository root.');
    assert.equal(step.env, undefined, 'Step environment needs an explicit local equivalent.');
    assert.notEqual(
      step.run !== undefined,
      step.uses !== undefined,
      'Each CI step must have exactly one run or uses.',
    );
    if (step.run !== undefined) {
      assert.equal(typeof step.run, 'string');
      assert.equal(step.shell, undefined, 'Custom CI shells need an explicit local equivalent.');
      actual.push(step.run);
    } else {
      assert.equal(typeof step.uses, 'string', 'Unknown CI step.');
      actions.push(step.uses.split('@')[0]);
    }
  }
  assert.deepEqual(
    actions,
    ['actions/checkout', 'pnpm/action-setup', 'actions/setup-node'],
    'Unknown CI action may contain a validation gate.',
  );
  assert.deepEqual(actual, ciCommands, 'CI commands changed; update the local preflight.');
}

export function runLocalCI({ workflow, run = spawnSync, log = console.log }) {
  assertWorkflowMatches(workflow);
  for (const command of ciCommands) {
    const [file, ...args] = command.split(' ');
    // A warmed local cache verifies the same frozen lock without a network install.
    if (command === ciCommands[0]) args.push('--offline');
    log(`\n[local CI] ${command}`);
    const started = performance.now();
    const result = run(file, args, {
      stdio: 'inherit',
      env: { ...process.env, CI: 'true', GOMEMLIMIT: process.env.GOMEMLIMIT ?? compilerBudget },
    });
    if (result.error || result.status !== 0) {
      const error = new Error(`${command} failed${result.signal ? ` (${result.signal})` : ''}.`);
      error.exitCode = Number.isInteger(result.status) && result.status > 0 ? result.status : 1;
      throw error;
    }
    log(`[local CI] passed in ${((performance.now() - started) / 1000).toFixed(1)}s`);
  }
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.chdir(root);
    const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
    if (process.argv.slice(2).some((arg) => arg !== '--list'))
      throw new Error('Unknown preflight option.');
    if (process.argv.includes('--list')) {
      assertWorkflowMatches(workflow);
      console.log(ciCommands.join('\n'));
    } else runLocalCI({ workflow });
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.exitCode ?? 1;
  }
}
