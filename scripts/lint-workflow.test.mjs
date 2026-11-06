import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ESLint } from 'eslint';

test('lint rejects unused imports and private functions but keeps public library exports', async () => {
  const lint = new ESLint({ cwd: process.cwd() });
  const [unused] = await lint.lintText(
    "import { readFile } from 'node:fs/promises'; function unusedPrivate() { return 1; }",
    { filePath: 'scripts/static-quality-probe.mjs' },
  );
  assert.equal(unused.errorCount, 2);
  assert(unused.messages.every((message) => message.ruleId === 'no-unused-vars'));
  const [api] = await lint.lintText('export function publicLibraryAPI() { return 1; }', {
    filePath: 'scripts/static-quality-probe.mjs',
  });
  assert.equal(api.errorCount, 0);
  assert.equal(api.warningCount, 0);
});

test('ESLint warning threshold returns a failing exit status', () => {
  const result = spawnSync(
    resolve('node_modules/.bin/eslint'),
    [
      '--stdin',
      '--stdin-filename',
      'scripts/static-quality-probe.mjs',
      '--rule',
      'no-unused-vars:warn',
      '--max-warnings=0',
    ],
    { cwd: process.cwd(), input: 'const unusedLocal = 1;', encoding: 'utf8' },
  );
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /warning/);
  assert.match(result.stderr, /too many warnings/);
});

for (const config of [
  'tsconfig.json',
  'apps/native-catalog/tsconfig.json',
  'apps/native-benchmark/tsconfig.json',
  'fixtures/native-consumer/tsconfig.json',
  'fixtures/typography-consumer/tsconfig.json',
]) {
  test(`TypeScript unused-code gate covers ${config} and preserves exports`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mui-native-quality-'));
    try {
      await writeFile(
        join(directory, 'tsconfig.json'),
        JSON.stringify({
          extends: resolve(config),
          compilerOptions: { noEmit: true, types: [], lib: ['ES2022'] },
          include: ['*.ts'],
          exclude: [],
        }),
      );
      await writeFile(join(directory, 'dependency.ts'), 'export const token = 1;\n');
      await writeFile(
        join(directory, 'index.ts'),
        "import { token } from './dependency';\nfunction unusedPrivate() { return 1; }\nexport const publicValue = 1;\n",
      );
      const run = () =>
        spawnSync(
          resolve('node_modules/.bin/tsc'),
          ['--project', join(directory, 'tsconfig.json'), '--pretty', 'false'],
          { cwd: process.cwd(), encoding: 'utf8' },
        );
      const unused = run();
      assert.notEqual(unused.status, 0);
      assert.match(unused.stdout, /'token'.*(never read|never used)/);
      assert.match(unused.stdout, /'unusedPrivate'.*(never read|never used)/);
      await writeFile(
        join(directory, 'index.ts'),
        "import { token } from './dependency';\nexport { token };\nexport function publicLibraryAPI(_nativeEvent?: unknown) { return 1; }\n",
      );
      const api = run();
      assert.equal(api.status, 0, api.stdout + api.stderr);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}
