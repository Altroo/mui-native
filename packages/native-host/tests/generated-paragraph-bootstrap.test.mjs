// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Exact proposal source, evaluated with explicit native doubles. No native execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)),
  root = process.env.MUI_NATIVE_TEST_ROOT ?? path.resolve(here, '../../..');
const req = createRequire(root + '/package.json'),
  deps = createRequire(root + '/node_modules/.pnpm/node_modules/package.json');
/**
 * Read a TypeScript module as source text for the isolated bootstrap evaluator.
 * @param {string} name
 * @returns {string}
 */
const source = (name) => fs.readFileSync(path.resolve(here, '../src', name + '.ts'), 'utf8');
const compile = (name) =>
  req('@babel/core').transformSync(source(name), {
    filename: root + '/' + name + '.ts',
    configFile: root + '/babel.config.cjs',
  }).code;
const helper = compile('ownedStyleMetadata'),
  wrapper = compile('ownedStyleBootstrap');
function evaluate(code, mocks = {}) {
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name) => (Object.hasOwn(mocks, name) ? mocks[name] : deps(name)),
  });
  return module.exports;
}
const fresh = () => evaluate(helper).createOwnedStyleBootstrap;
const flags = [
  'nativeCSSParsing',
  'cppPropsIteratorSetter',
  'accumulatedRawPropsAndroid',
  'exclusivePropsAndroid',
  'propsReconciliationAndroid',
];
const hash = 'a7c54eb9011d822990f62b846cc6f333e1fbce23343e2426611925edcacac578';
const expected = { rn: '0.88.1', platform: 'android', styleKeys: hash };
const metadata = () => ({
  schema: 1,
  service: 'owned-structural-style',
  host: 'AltrooMUIStructuralView',
  hostABI: 'owned-view-programme-v1',
  errorNotification: 'async-once-per-generation-v1',
  ownedProgrammeProfile: {
    schema: 1,
    ...expected,
    ...Object.fromEntries(flags.map((k) => [k, false])),
  },
});
const native = (data) => ({
  getStructuralStyleMetadata: () => JSON.stringify(data ?? metadata()),
});
function fails(fn) {
  let error;
  try {
    fn();
  } catch (e) {
    error = e;
  }
  assert.ok(error, 'must fail');
  assert.match(String(error), /MUI owned View bootstrap:/);
  return error;
}
test('read occurs at initialization; repeated use is native-free and immutable', () => {
  let calls = 0,
    phase = 'module';
  const module = {
    getStructuralStyleMetadata() {
      assert.equal(phase, 'module');
      calls++;
      return JSON.stringify(metadata());
    },
  };
  const boot = fresh()(() => module, expected);
  assert.equal(calls, 1);
  phase = 'render';
  const profile = boot.requireProfile();
  assert.equal(boot.requireProfile(), profile);
  assert.equal(calls, 1);
  assert.ok(Object.isFrozen(profile));
  assert.ok(Object.isFrozen(boot));
});
test('canonical module shares one read and profile; new module identity reads afresh', () => {
  let calls = 0;
  const make = () => ({
      getStructuralStyleMetadata() {
        calls++;
        return JSON.stringify(metadata());
      },
    }),
    module = make(),
    create = fresh();
  const a = create(() => module, expected),
    b = create(() => module, expected);
  assert.equal(a.requireProfile(), b.requireProfile());
  assert.equal(calls, 1);
  create(make, expected).requireProfile();
  assert.equal(calls, 2);
});
test('missing/old binary import is guarded and fails before createNode', () => {
  for (const module of [null, undefined, {}, { getStructuralStyleMetadata: 1 }]) {
    let boot,
      nodes = 0;
    assert.doesNotThrow(() => {
      boot = fresh()(() => module, expected);
    });
    fails(() => {
      boot.requireProfile();
      nodes++;
    });
    assert.equal(nodes, 0);
  }
});
test('native exception failure is sticky and thrown only on use', () => {
  let calls = 0;
  const module = {
      getStructuralStyleMetadata() {
        calls++;
        throw Error('binary failure');
      },
    },
    create = fresh();
  const boot = create(() => module, expected),
    error = fails(() => boot.requireProfile());
  assert.equal(
    fails(() => boot.requireProfile()),
    error,
  );
  fails(() => create(() => module, expected).requireProfile());
  assert.equal(calls, 1);
});
test('loader exception is cached and import remains safe', () => {
  let calls = 0,
    boot;
  assert.doesNotThrow(() => {
    boot = fresh()(() => {
      calls++;
      throw Error('module absent');
    }, expected);
  });
  fails(() => boot.requireProfile());
  fails(() => boot.requireProfile());
  assert.equal(calls, 1);
});
test('nonmobile initialization never loads native and throws only on use', () => {
  let calls = 0;
  const boot = fresh()(
    () => {
      calls++;
      throw Error('must not load');
    },
    { ...expected, platform: 'web' },
  );
  fails(() => boot.requireProfile());
  assert.equal(calls, 0);
});
test('only metadata method is read; status/activation/diagnostics/UIManager are untouched', () => {
  const reads = [],
    module = new Proxy(native(), {
      get(t, k, r) {
        reads.push(k);
        if (k !== 'getStructuralStyleMetadata') throw Error('mutable state touched');
        return Reflect.get(t, k, r);
      },
    });
  const boot = fresh()(() => module, expected);
  boot.requireProfile();
  boot.requireProfile();
  assert.deepEqual(reads, ['getStructuralStyleMetadata']);
});
test('metadata property is captured once and native receiver retained', () => {
  let gets = 0;
  const module = {
    get getStructuralStyleMetadata() {
      gets++;
      return function () {
        assert.equal(this, module);
        return JSON.stringify(metadata());
      };
    },
  };
  fresh()(() => module, expected).requireProfile();
  assert.equal(gets, 1);
});
for (let mask = 0; mask < 32; mask++)
  test('accept actual native flag branch ' + mask, () => {
    const data = metadata();
    flags.forEach((k, i) => {
      data.ownedProgrammeProfile[k] = Boolean(mask & (1 << i));
    });
    const profile = fresh()(() => native(data), expected).requireProfile();
    for (const k of flags) assert.equal(profile[k], data.ownedProgrammeProfile[k]);
  });
const corruptions = [
  [
    'schema',
    (d) => {
      d.schema = 2;
    },
  ],
  [
    'service',
    (d) => {
      d.service = 'other';
    },
  ],
  [
    'host',
    (d) => {
      d.host = 'View';
    },
  ],
  [
    'ABI',
    (d) => {
      d.hostABI = 'old';
    },
  ],
  [
    'notification',
    (d) => {
      d.errorNotification = 'poll';
    },
  ],
  [
    'mutable field',
    (d) => {
      d.owner = 'x';
    },
  ],
  [
    'no profile',
    (d) => {
      delete d.ownedProgrammeProfile;
    },
  ],
  [
    'profile schema bool',
    (d) => {
      d.ownedProgrammeProfile.schema = true;
    },
  ],
  [
    'missing flag',
    (d) => {
      delete d.ownedProgrammeProfile.nativeCSSParsing;
    },
  ],
  [
    'flag number',
    (d) => {
      d.ownedProgrammeProfile.cppPropsIteratorSetter = 0;
    },
  ],
  [
    'extra profile field',
    (d) => {
      d.ownedProgrammeProfile.active = false;
    },
  ],
  [
    'RN mismatch',
    (d) => {
      d.ownedProgrammeProfile.rn = '0.88.0';
    },
  ],
  [
    'platform mismatch',
    (d) => {
      d.ownedProgrammeProfile.platform = 'ios';
    },
  ],
  [
    'hash mismatch',
    (d) => {
      d.ownedProgrammeProfile.styleKeys = '0'.repeat(64);
    },
  ],
  [
    'invalid hash',
    (d) => {
      d.ownedProgrammeProfile.styleKeys = 'hash';
    },
  ],
];
for (const [name, mutate] of corruptions)
  test('reject ' + name + ' before host creation', () => {
    const data = metadata();
    mutate(data);
    const boot = fresh()(() => native(data), expected);
    let nodes = 0;
    fails(() => {
      boot.requireProfile();
      nodes++;
    });
    assert.equal(nodes, 0);
  });
for (const [i, raw] of ['', '{', 'null', '[]', 'true', '{}', 'x'.repeat(4097), 42, null].entries())
  test('malformed JSON/type ' + i, () => {
    fails(() =>
      fresh()(() => ({ getStructuralStyleMetadata: () => raw }), expected).requireProfile(),
    );
  });
function entry(module, platform = 'android') {
  return evaluate(wrapper, {
    'react-native': {
      Platform: { OS: platform },
      ReactNativeVersion: { getVersionString: () => '0.88.1' },
    },
    './ownedStyleMetadata': evaluate(helper),
    './NativeAltrooStructuralObserver': { default: module },
  });
}
test('real wrapper statically preflights and guards component use with no extra native reads', () => {
  let calls = 0;
  const result = entry({
    getStructuralStyleMetadata() {
      calls++;
      return JSON.stringify(metadata());
    },
  });
  assert.equal(calls, 1);
  result.requireOwnedStyleProfile();
  result.requireOwnedStyleProfile();
  assert.equal(calls, 1);
});
test('real wrapper imports unused with missing native binary, then fails on use', () => {
  let result;
  assert.doesNotThrow(() => {
    result = entry(null);
  });
  fails(() => result.requireOwnedStyleProfile());
});
test('web wrapper remains importable and does not load native spec', () => {
  let loads = 0;
  const module = { exports: {} },
    mocks = {
      'react-native': {
        Platform: { OS: 'web' },
        ReactNativeVersion: { getVersionString: () => '0.88.1' },
      },
      './ownedStyleMetadata': evaluate(helper),
    };
  vm.runInNewContext(wrapper, {
    module,
    exports: module.exports,
    require(name) {
      if (name === './NativeAltrooStructuralObserver') {
        loads++;
        throw Error('must not load');
      }
      return Object.hasOwn(mocks, name) ? mocks[name] : deps(name);
    },
  });
  assert.equal(loads, 0);
  fails(() => module.exports.requireOwnedStyleProfile());
});
test('public RN imports only and JS vocabulary matches actual native parser constant', () => {
  assert.ok(!source('ownedStyleMetadata').includes('src/private'));
  assert.ok(!source('ownedStyleBootstrap').includes('src/private'));
  assert.ok(
    fs
      .readFileSync(root + '/packages/native-host/common/cpp/OwnedProgramme.h', 'utf8')
      .includes('("styleKeys", "' + hash + '")'),
  );
});

for (const source of ['loader', 'metadata']) {
  for (const reason of [
    null,
    new Proxy(
      {},
      {
        get() {
          throw Error('unreadable');
        },
        getPrototypeOf() {
          throw Error('unreadable');
        },
      },
    ),
  ]) {
    test('unreadable ' + source + ' failure is cached without eager throw', () => {
      let boot,
        calls = 0;
      const load =
        source === 'loader'
          ? () => {
              calls++;
              throw reason;
            }
          : () => ({
              getStructuralStyleMetadata() {
                calls++;
                throw reason;
              },
            });
      assert.doesNotThrow(() => {
        boot = fresh()(load, expected);
      });
      fails(() => boot.requireProfile());
      fails(() => boot.requireProfile());
      assert.equal(calls, 1);
    });
  }
}

for (const nativeVersion of ['0.88.1', '0.89.0']) {
  test(
    'real wrapper rejects unsupported RN before native access, even if metadata says ' +
      nativeVersion,
    () => {
      let calls = 0;
      const data = metadata();
      data.ownedProgrammeProfile.rn = nativeVersion;
      const module = {
        getStructuralStyleMetadata() {
          calls++;
          return JSON.stringify(data);
        },
      };
      let result;
      assert.doesNotThrow(() => {
        result = evaluate(wrapper, {
          'react-native': {
            Platform: { OS: 'android' },
            ReactNativeVersion: { getVersionString: () => '0.89.0' },
          },
          './ownedStyleMetadata': evaluate(helper),
          './NativeAltrooStructuralObserver': { default: module },
        });
      });
      fails(() => result.requireOwnedStyleProfile());
      assert.equal(calls, 0);
    },
  );
}

const origin = () => ({
  schema: 1,
  nativeIDPrefix: 'altroo:generated-paragraph:v1:',
});
const literal = () => ({
  schema: 1,
  componentName: 'AltrooMUILiteralRawText',
  abi: 'raw-text-derived-v1',
});
for (const shape of ['base', 'raw', 'origin', 'both']) {
  test(
    'historical metadata combinations preserve owned View without alias support: ' + shape,
    () => {
      const data = metadata();
      if (shape === 'raw' || shape === 'both') data.literalRawText = literal();
      if (shape === 'origin' || shape === 'both') data.generatedTextOrigin = origin();
      const boot = fresh()(() => native(data), expected);
      assert.equal(boot.requireProfile().rn, '0.88.1');
      assert.equal(Object.hasOwn(boot, 'requireLiteralRawText'), false);
      assert.deepEqual(Object.keys(boot).sort(), [
        'requireGeneratedTextOrigin',
        'requireProfile',
        'supportsParentStructuralCases',
        'supportsStructuralCases',
      ]);
      if (shape === 'origin' || shape === 'both') {
        const contract = boot.requireGeneratedTextOrigin();
        assert.equal(contract.schema, 1);
        assert.equal(contract.nativeIDPrefix, origin().nativeIDPrefix);
        assert.ok(Object.isFrozen(contract));
        assert.equal(boot.requireGeneratedTextOrigin(), contract);
      } else fails(() => boot.requireGeneratedTextOrigin());
    },
  );
}
for (const bad of [
  null,
  undefined,
  false,
  1,
  [],
  {},
  { schema: true, nativeIDPrefix: origin().nativeIDPrefix },
  { schema: 2, nativeIDPrefix: origin().nativeIDPrefix },
  { schema: 1, nativeIDPrefix: 'altroo:generated-paragraph:v2:' },
  { schema: 1, nativeIDPrefix: 'altroo:generated-paragraph:v1' },
  { ...origin(), extra: 1 },
  { nativeIDPrefix: origin().nativeIDPrefix },
  { schema: 1 },
]) {
  test(
    'malformed origin is absent independently of the owned profile: ' + JSON.stringify(bad),
    () => {
      const data = { ...metadata(), generatedTextOrigin: bad };
      const boot = fresh()(() => native(data), expected);
      assert.equal(boot.requireProfile().rn, expected.rn);
      const first = fails(() => boot.requireGeneratedTextOrigin());
      assert.equal(
        fails(() => boot.requireGeneratedTextOrigin()),
        first,
      );
    },
  );
}
test('capability and profile share exact injected native-object cache and preserve receiver', () => {
  let calls = 0,
    forbidden = 0;
  const data = { ...metadata(), generatedTextOrigin: origin() };
  const mod = {
    getStructuralStyleMetadata() {
      assert.equal(this, mod);
      calls++;
      return JSON.stringify(data);
    },
    getStructuralStyleRuntimeStatus() {
      forbidden++;
    },
    enableStructuralStyleRuntime() {
      forbidden++;
    },
    disableStructuralStyleRuntime() {
      forbidden++;
    },
  };
  const create = fresh(),
    a = create(() => mod, expected),
    b = create(() => mod, expected);
  assert.equal(calls, 1);
  assert.equal(a.requireGeneratedTextOrigin(), b.requireGeneratedTextOrigin());
  data.generatedTextOrigin.nativeIDPrefix = 'changed';
  for (let i = 0; i < 5; i++)
    assert.equal(a.requireGeneratedTextOrigin().nativeIDPrefix, origin().nativeIDPrefix);
  assert.equal(calls, 1);
  assert.equal(forbidden, 0);
  const wrong = create(() => mod, { ...expected, platform: 'ios' });
  fails(() => wrong.requireGeneratedTextOrigin());
  assert.equal(calls, 1);
});
test('different native identities do not share optional capability', () => {
  const create = fresh(),
    a = create(() => native({ ...metadata(), generatedTextOrigin: origin() }), expected),
    b = create(() => native(metadata()), expected);
  a.requireGeneratedTextOrigin();
  fails(() => b.requireGeneratedTextOrigin());
});
for (const kind of ['value', 'getter', 'throw']) {
  test('inherited origin is never read: ' + kind, () => {
    // Install in the parser's own realm, so JSON.parse receives the polluted prototype.
    const context = { module: { exports: {} }, reads: 0, require: deps };
    context.exports = context.module.exports;
    vm.createContext(context);
    vm.runInContext(helper, context);
    const descriptor =
      kind === 'value'
        ? "{value:{schema:1,nativeIDPrefix:'altroo:generated-paragraph:v1:'}}"
        : kind === 'getter'
          ? "{get(){globalThis.reads++;return {schema:1,nativeIDPrefix:'altroo:generated-paragraph:v1:'}}}"
          : "{get(){globalThis.reads++;throw Error('polluted')}}";
    vm.runInContext(
      "Object.defineProperty(Object.prototype,'generatedTextOrigin'," + descriptor + ');',
      context,
    );
    const boot = context.module.exports.createOwnedStyleBootstrap(
      () => native(metadata()),
      expected,
    );
    boot.requireProfile();
    fails(() => boot.requireGeneratedTextOrigin());
    assert.equal(context.reads, 0);
  });
}
test('global wrapper exposes cached origin without another native read', () => {
  let calls = 0;
  const mod = {
    getStructuralStyleMetadata() {
      calls++;
      return JSON.stringify({ ...metadata(), generatedTextOrigin: origin() });
    },
  };
  const result = evaluate(wrapper, {
    'react-native': {
      Platform: { OS: 'android' },
      ReactNativeVersion: { getVersionString: () => '0.88.1' },
    },
    './ownedStyleMetadata': evaluate(helper),
    './NativeAltrooStructuralObserver': { default: mod },
  });
  assert.equal(calls, 1);
  result.requireOwnedStyleProfile();
  result.requireGeneratedTextOrigin();
  assert.equal(calls, 1);
});

for (const missing of ['schema', 'nativeIDPrefix']) {
  test('nested origin fields require own keys before inherited getter reads: ' + missing, () => {
    const context = { module: { exports: {} }, reads: 0, require: deps };
    context.exports = context.module.exports;
    vm.createContext(context);
    vm.runInContext(helper, context);
    vm.runInContext(
      'Object.defineProperty(Object.prototype,' +
        JSON.stringify(missing) +
        ",{get(){globalThis.reads++;throw Error('inherited nested field')}})",
      context,
    );
    const data = { ...metadata(), generatedTextOrigin: origin() };
    delete data.generatedTextOrigin[missing];
    const boot = context.module.exports.createOwnedStyleBootstrap(() => native(data), expected);
    boot.requireProfile();
    fails(() => boot.requireGeneratedTextOrigin());
    assert.equal(context.reads, 0);
  });
}

for (const [name, api] of [
  ['patch mismatch', { getVersionString: () => '0.88.2' }],
  ['prerelease mismatch', { getVersionString: () => '0.88.1-rc.0' }],
  ['missing public export', undefined],
  ['missing public method', {}],
  ['invalid version type', { getVersionString: () => 881 }],
])
  test('public JS version rejects ' + name + ' before native access', () => {
    let calls = 0;
    const result = evaluate(wrapper, {
      'react-native': { Platform: { OS: 'android' }, ReactNativeVersion: api },
      './ownedStyleMetadata': evaluate(helper),
      './NativeAltrooStructuralObserver': {
        default: {
          getStructuralStyleMetadata() {
            calls++;
            return JSON.stringify(metadata());
          },
        },
      },
    });
    fails(() => result.requireOwnedStyleProfile());
    assert.equal(calls, 0);
  });

test('public JS version is read once before native loading without a deprecated JSON import', () => {
  const module = { exports: {} },
    trace = [];
  vm.runInNewContext(wrapper, {
    module,
    exports: module.exports,
    require(name) {
      if (name === 'react-native')
        return {
          Platform: { OS: 'android' },
          ReactNativeVersion: {
            getVersionString() {
              trace.push('version');
              return '0.88.1';
            },
          },
        };
      if (name === './ownedStyleMetadata') return evaluate(helper);
      if (name === './NativeAltrooStructuralObserver') {
        trace.push('spec');
        return {
          default: {
            getStructuralStyleMetadata() {
              trace.push('metadata');
              return JSON.stringify(metadata());
            },
          },
        };
      }
      throw Error('Unexpected module load: ' + name);
    },
  });
  module.exports.requireOwnedStyleProfile();
  module.exports.requireOwnedStyleProfile();
  assert.deepEqual(trace, ['version', 'spec', 'metadata']);
});
for (const kind of ['value', 'getter', 'throw']) {
  test('retired own raw metadata is inert and never read: ' + kind, () => {
    const context = { module: { exports: {} }, reads: 0, require: deps };
    context.exports = context.module.exports;
    vm.createContext(context);
    vm.runInContext(helper, context);
    const descriptor =
      kind === 'value'
        ? '{enumerable:true,value:{unsupported:true}}'
        : kind === 'getter'
          ? '{enumerable:true,get(){globalThis.reads++;return {unsupported:true}}}'
          : "{enumerable:true,get(){globalThis.reads++;throw Error('retired capability read')}}";
    vm.runInContext(
      "const originalParse=JSON.parse; JSON.parse=(raw)=>{const value=originalParse(raw);Object.defineProperty(value,'literalRawText'," +
        descriptor +
        ');return value;};',
      context,
    );
    let calls = 0;
    const boot = context.module.exports.createOwnedStyleBootstrap(
      () => ({
        getStructuralStyleMetadata() {
          calls++;
          return JSON.stringify({ ...metadata(), generatedTextOrigin: origin() });
        },
      }),
      expected,
    );
    boot.requireProfile();
    boot.requireGeneratedTextOrigin();
    boot.requireProfile();
    assert.equal(Object.hasOwn(boot, 'requireLiteralRawText'), false);
    assert.equal(context.reads, 0);
    assert.equal(calls, 1);
  });
}
test('global wrapper no longer exposes retired raw readiness', () => {
  let calls = 0;
  const result = entry({
    getStructuralStyleMetadata() {
      calls++;
      return JSON.stringify({ ...metadata(), generatedTextOrigin: origin() });
    },
  });
  result.requireOwnedStyleProfile();
  result.requireGeneratedTextOrigin();
  assert.equal(Object.hasOwn(result, 'requireOwnedLiteralRawText'), false);
  assert.equal(calls, 1);
});

test('structural case capability is additive and remains native-free after initialization', () => {
  for (const capability of [undefined, 'unknown', 'first-last-of-type-v1']) {
    const data = metadata();
    if (capability !== undefined) data.structuralCases = capability;
    let calls = 0;
    const boot = fresh()(
      () => ({
        getStructuralStyleMetadata() {
          calls++;
          return JSON.stringify(data);
        },
      }),
      expected,
    );
    boot.requireProfile();
    assert.equal(boot.supportsStructuralCases(), capability === 'first-last-of-type-v1');
    assert.equal(boot.supportsStructuralCases(), capability === 'first-last-of-type-v1');
    assert.equal(calls, 1);
  }
  assert.equal(fresh()(() => null, expected).supportsStructuralCases(), false);
});

test('parent projection capability is additive and requires supported structural cases', () => {
  for (const base of [undefined, 'first-last-of-type-v1'])
    for (const parent of [undefined, 'unknown', 'parent-structural-facts-v1']) {
      const data = metadata();
      if (base !== undefined) data.structuralCases = base;
      if (parent !== undefined) data.parentStructuralCases = parent;
      const boot = fresh()(() => native(data), expected);
      boot.requireProfile();
      assert.equal(
        boot.supportsParentStructuralCases(),
        base === 'first-last-of-type-v1' && parent === 'parent-structural-facts-v1',
      );
    }
});
