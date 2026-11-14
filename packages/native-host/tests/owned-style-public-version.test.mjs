// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Version admission only. Processor doubles do not establish native layout.
import test from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import vm from 'node:vm';
const require = createRequire(import.meta.url),
  { transformSync } = require('esbuild');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const vocabulary = { keys: ['width', 'opacity'], sha256: 'reviewed-vocabulary' };
const profile = (rn = '0.88.1') => ({
  rn,
  platform: 'ios',
  styleKeys: vocabulary.sha256,
  nativeCSSParsing: false,
});
function load(source, options = {}) {
  let reads = 0;
  const calls = [],
    api = Object.hasOwn(options, 'api')
      ? options.api
      : {
          getVersionString() {
            assert.equal(this, api);
            reads++;
            return Object.hasOwn(options, 'version') ? options.version : '0.88.1';
          },
        };
  const Platform = { OS: 'ios' };
  Object.defineProperty(Platform, 'constants', {
    get() {
      throw Error('Native version must not be read');
    },
  });
  const module = { exports: {} },
    context = {
      module,
      exports: module.exports,
      require(name) {
        if (name === 'react-native') return { Platform, ReactNativeVersion: api };
        if (name.endsWith('/ReactNativeStyleAttributes'))
          return {
            __esModule: true,
            default: { width: true, opacity: true },
            colorAttribute: { process: (v) => v },
          };
        if (name.endsWith('/ReactNativeAttributePayload'))
          return {
            create(payload) {
              calls.push(payload);
              options.process?.(payload, calls.length);
              return { ...payload.style };
            },
          };
        if (name === './ownedStyleVocabulary') return { ownedStyleVocabulary: vocabulary };
        if (name === './style-vocabulary.json') return options.catalogVocabulary ?? vocabulary;
        throw Error('Unexpected or deprecated runtime import: ' + name);
      },
    };
  vm.runInNewContext(
    transformSync(source, { loader: 'ts', format: 'cjs', target: 'esnext' }).code,
    context,
  );
  return {
    encode: module.exports.encodeStylePair,
    cases: module.exports.encodeStructuralCases,
    calls,
    reads: () => reads,
    api,
  };
}
for (const [name, path] of [
  ['library', 'packages/native-host/src/ownedStyleEncoding.ts'],
  ['catalog', 'apps/native-catalog/prelayoutOwnedStyle/dependencies/encodeStylePair.js'],
]) {
  const source = await readFile(join(root, path), 'utf8');
  test(name + ': public version admits encoding and processed resets', () => {
    const m = load(source),
      value = m.encode(profile(), { width: 80 }, { opacity: 0.5 });
    assert.deepEqual(JSON.parse(JSON.stringify(value)), {
      normal: { width: 80, opacity: null },
      last: { width: null, opacity: 0.5 },
    });
    assert.equal(m.calls.length, 2);
    assert.equal(m.reads(), 1);
  });
  test(name + ': cached version is not reread on the hot path', () => {
    const m = load(source);
    m.encode(profile(), {}, {});
    m.api.getVersionString = () => {
      throw Error('Version reread');
    };
    m.encode(profile(), {}, {});
    assert.equal(m.reads(), 1);
  });
  for (const version of ['0.88.2', '0.88.1-rc.0'])
    test(name + ': rejects full-version mismatch ' + version, () => {
      const m = load(source, { version });
      assert.throws(() => m.encode(profile(), {}, {}), /profile mismatch/);
      assert.equal(m.calls.length, 0);
    });
  test(name + ': preserves exact prerelease comparison', () => {
    const m = load(source, { version: '0.88.1-rc.0' });
    m.encode(profile('0.88.1-rc.0'), {}, {});
    assert.equal(m.calls.length, 2);
  });
  for (const [kind, api] of [
    ['object', undefined],
    ['method', {}],
  ])
    test(name + ': missing public ' + kind + ' rejects undefined rn too', () => {
      const m = load(source, { api }),
        p = profile();
      p.rn = undefined;
      assert.throws(() => m.encode(p, {}, {}), /profile mismatch/);
      assert.equal(m.calls.length, 0);
    });
  test(name + ': nonstring version is never coerced or processed', () => {
    for (const version of [
      null,
      881,
      {
        toString() {
          throw Error('Coercion');
        },
      },
    ]) {
      const m = load(source, { version });
      assert.throws(() => m.encode(profile(), {}, {}), /profile mismatch/);
      assert.equal(m.calls.length, 0);
    }
  });
  test(name + ': throwing public API has no deprecated fallback', () => {
    const expected = Error('Public API failure');
    assert.throws(
      () =>
        load(source, {
          api: {
            getVersionString() {
              throw expected;
            },
          },
        }),
      (e) => e === expected,
    );
  });
  test(name + ': actual installed peer version API needs no native constants', async () => {
    const text = await readFile(
      join(
        require.resolve('react-native/package.json'),
        '..',
        'Libraries/Core/ReactNativeVersion.js',
      ),
      'utf8',
    );
    const module = { exports: {} };
    vm.runInNewContext(transformSync(text, { loader: 'ts', format: 'cjs' }).code, {
      module,
      exports: module.exports,
    });
    const m = load(source, { api: module.exports.default });
    m.encode(profile(), {}, {});
    assert.equal(m.calls.length, 2);
  });
}

// Use real disk resolution here: the version-admission doubles above must not
// hide a missing catalog asset or a vocabulary that differs from the library.
const catalogEncoder = join(
  root,
  'apps/native-catalog/prelayoutOwnedStyle/dependencies/encodeStylePair.js',
);
test('catalog encoder resolves its real vocabulary and matches the library', async () => {
  const actual = createRequire(catalogEncoder)('./style-vocabulary.json');
  const module = { exports: {} };
  vm.runInNewContext(
    transformSync(
      await readFile(join(root, 'packages/native-host/src/ownedStyleVocabulary.ts'), 'utf8'),
      { loader: 'ts', format: 'cjs' },
    ).code,
    { module, exports: module.exports },
  );
  assert.deepEqual(
    { keys: actual.keys, sha256: actual.sha256 },
    JSON.parse(JSON.stringify(module.exports.ownedStyleVocabulary)),
  );
  assert.equal(
    createHash('sha256')
      .update(actual.keys.join('\n') + '\n')
      .digest('hex'),
    actual.sha256,
  );
  const m = load(await readFile(catalogEncoder, 'utf8'), { catalogVocabulary: actual });
  const value = m.encode(
    { ...profile(), styleKeys: actual.sha256 },
    { width: 80 },
    { opacity: 0.5 },
  );
  assert.deepEqual(JSON.parse(JSON.stringify(value)), {
    normal: { width: 80, opacity: null },
    last: { width: null, opacity: 0.5 },
  });
});
test('catalog vocabulary retains package-relative verified React Native sources', async () => {
  const actual = createRequire(catalogEncoder)('./style-vocabulary.json');
  assert.equal(actual.sources.length, 5);
  assert.equal(new Set(actual.sources.map((source) => source.path)).size, actual.sources.length);
  const peer = join(require.resolve('react-native/package.json'), '..');
  for (const source of actual.sources) {
    assert.match(source.path, /^(Libraries|ReactCommon)\/[A-Za-z0-9_./-]+$/);
    assert(!source.path.split('/').includes('..'));
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
    assert.equal(
      createHash('sha256')
        .update(await readFile(join(peer, source.path)))
        .digest('hex'),
      source.sha256,
      source.path,
    );
  }
});

const structuralSource = await readFile(
  join(root, 'packages/native-host/src/ownedStyleEncoding.ts'),
  'utf8',
);
test('structural encoding resets the union across all eight cases', () => {
  const m = load(structuralSource);
  const input = Array.from({ length: 8 }, (_, index) =>
    index === 2 ? { width: 80 } : index === 4 ? { opacity: 0.25 } : {},
  );
  const values = JSON.parse(JSON.stringify(m.cases(profile(), input)));
  assert.equal(m.calls.length, 8);
  for (let index = 0; index < 8; index++)
    assert.deepEqual(values[index], {
      width: index === 2 ? 80 : null,
      opacity: index === 4 ? 0.25 : null,
    });
});
test('structural encoding snapshots all branches before the first processor', () => {
  const input = Array.from({ length: 8 }, (_, width) => ({ width }));
  const m = load(structuralSource, {
    process(_payload, call) {
      if (call === 1) input[7].width = 999;
    },
  });
  assert.equal(m.cases(profile(), input)[7].width, 7);
});
test('structural encoding rejects incomplete or oversized truth tables before processing', () => {
  for (const size of [0, 2, 7, 9]) {
    const m = load(structuralSource);
    assert.throws(
      () =>
        m.cases(
          profile(),
          Array.from({ length: size }, () => ({})),
        ),
      /eight cases/,
    );
    assert.equal(m.calls.length, 0);
  }
});
