// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Read-only source/codegen coherence. This does not inspect a compiled or installed binary.
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
const modulePath = realpathSync(fileURLToPath(import.meta.url));
const defaultRoot = resolve(dirname(modulePath), '../..');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const guidance =
  'Regenerate the actual application bindings with the pinned RN codegen before native build/test. Do not hand-edit or bypass generated output.';
function fail(message) {
  throw Error('Observer binding preflight: ' + message + '. ' + guidance);
}

/** Uses the same installed parser/generator as RN, rather than a method-name mirror or C++ regex. */
export function expectedObserverBindings(projectRoot = defaultRoot, platform) {
  const host = join(resolve(projectRoot), 'packages/native-host');
  const manifestPath = join(host, 'package.json');
  const manifestBytes = readFileSync(manifestPath);
  const config = JSON.parse(manifestBytes).codegenConfig;
  if (
    config?.type !== 'all' ||
    typeof config.name !== 'string' ||
    !/^[A-Za-z_]\w*$/.test(config.name) ||
    typeof config.jsSrcsDir !== 'string'
  )
    fail('unsupported native-host codegen config');
  const sourceRoot = resolve(host, config.jsSrcsDir);
  const sourceRelative = relative(host, sourceRoot);
  if (
    sourceRelative === '..' ||
    sourceRelative.startsWith('..' + sep) ||
    isAbsolute(sourceRelative)
  )
    fail('codegen source directory is outside native-host');
  const require = createRequire(manifestPath);
  // Existing peer source/ABI guard remains the authority for the installed RN adapter.
  const nativeRoot = require(
    join(host, 'scripts/verify-structural-input.cjs'),
  ).verifyStructuralInput();
  const nativeRequire = createRequire(join(nativeRoot, 'package.json'));
  const codegenRoot = dirname(nativeRequire.resolve('@react-native/codegen/package.json'));
  const rnVersion = JSON.parse(readFileSync(join(nativeRoot, 'package.json'))).version;
  const codegenVersion = JSON.parse(readFileSync(join(codegenRoot, 'package.json'))).version;
  if (codegenVersion !== rnVersion) fail('RN and installed codegen versions differ');
  const { TypeScriptParser } = nativeRequire(join(codegenRoot, 'lib/parsers/typescript/parser.js'));
  const { combineSchemasInFileList } = nativeRequire(
    join(codegenRoot, 'lib/cli/combine/combine-js-to-schema.js'),
  );
  const { unwrapNullable } = nativeRequire(join(codegenRoot, 'lib/parsers/parsers-commons.js'));
  const generator = nativeRequire(join(codegenRoot, 'lib/generators/modules/GenerateModuleH.js'));
  const specPath = join(sourceRoot, 'NativeAltrooStructuralObserver.ts');
  const specBytes = readFileSync(specPath);
  const parsed = new TypeScriptParser().parseFile(specPath);
  const modules = Object.entries(parsed?.modules ?? {});
  if (modules.length !== 1 || modules[0][1].type !== 'NativeModule')
    fail('Observer Spec did not parse as one native module');
  const [schemaName, observer] = modules[0];
  if (!Array.isArray(observer.spec?.methods) || !observer.spec.methods.length)
    fail('Observer schema has no methods');
  const methods = observer.spec.methods.map((method) => {
    const [type] = unwrapNullable(method.typeAnnotation);
    if (
      typeof method.name !== 'string' ||
      type.type !== 'FunctionTypeAnnotation' ||
      !Array.isArray(type.params)
    )
      fail('unsupported Observer method schema');
    return { name: method.name, arity: type.params.length };
  });
  if (new Set(methods.map((method) => method.name)).size !== methods.length)
    fail('duplicate Observer method schema');
  const schema = combineSchemasInFileList([sourceRoot], platform, undefined, config.name);
  // Fail closed if RN's file-discovery filter missed this otherwise parseable Spec.
  if (!isDeepStrictEqual(schema.modules?.[schemaName], observer))
    fail('combined library schema omitted or changed the actual Observer Spec');
  const fileName = config.name + 'JSI.h';
  const header = generator.generate(config.name, schema).get(fileName);
  if (typeof header !== 'string' || !header.length) fail('pinned generator returned no JSI header');
  if (
    !readFileSync(specPath).equals(specBytes) ||
    !readFileSync(manifestPath).equals(manifestBytes)
  )
    fail('Observer source/config changed during preflight');
  return {
    header,
    libraryName: config.name,
    fileName,
    specPath,
    specSHA256: sha256(specBytes),
    nativeRoot,
    rnVersion,
    codegenVersion,
    moduleName: observer.moduleName,
    methods,
  };
}

/** Canonical build paths under the selected project; no separate arbitrary-header override. */
export function verifyObserverBindings({ projectRoot = defaultRoot, platform = 'both' } = {}) {
  if (!['ios', 'android', 'both'].includes(platform)) fail('platform must be ios, android or both');
  const root = resolve(projectRoot);
  let common;
  const outputs = [];
  for (const key of platform === 'both' ? ['ios', 'android'] : [platform]) {
    const expected = expectedObserverBindings(root, key);
    if (
      common &&
      (common.specSHA256 !== expected.specSHA256 ||
        !isDeepStrictEqual(common.methods, expected.methods))
    )
      fail('Observer Spec changed between platform checks');
    common ??= expected;
    const path =
      key === 'ios'
        ? join(root, 'apps/native-catalog/ios/build/generated/ios/ReactCodegen', expected.fileName)
        : join(
            root,
            'packages/native-host/android/build/generated/source/codegen/jni/react/renderer/components',
            expected.libraryName,
            expected.fileName,
          );
    let actual;
    try {
      actual = readFileSync(path);
    } catch (cause) {
      fail(
        'missing/unreadable actual ' +
          key +
          ' generated JSI header at ' +
          path +
          ' (' +
          cause.code +
          ')',
      );
    }
    if (!actual.equals(Buffer.from(expected.header)))
      fail(
        'stale or noncanonical actual ' +
          key +
          ' generated JSI header at ' +
          path +
          '; expected SHA256 ' +
          sha256(expected.header) +
          ', got ' +
          sha256(actual),
      );
    outputs.push({ platform: key, path, sha256: sha256(actual) });
  }
  return {
    schema: 1,
    status: 'source-bindings-current',
    moduleName: common.moduleName,
    specPath: common.specPath,
    specSHA256: common.specSHA256,
    rnVersion: common.rnVersion,
    codegenVersion: common.codegenVersion,
    requiredMethods: common.methods,
    outputs,
    compiledOrInstalledBinaryProved: false,
  };
}

if (process.argv[1] && realpathSync(process.argv[1]) === modulePath) {
  try {
    const options = {};
    const flags = new Set();
    const names = { '--project-root': 'projectRoot', '--platform': 'platform' };
    for (let i = 2; i < process.argv.length; i += 2) {
      const flag = process.argv[i],
        value = process.argv[i + 1];
      if (!Object.hasOwn(names, flag) || flags.has(flag) || !value || value.startsWith('--'))
        fail('unknown, repeated or missing command argument ' + flag);
      flags.add(flag);
      options[names[flag]] = value;
    }
    process.stdout.write(JSON.stringify(verifyObserverBindings(options), null, 2) + '\n');
  } catch (error) {
    process.stderr.write(String(error) + '\n');
    process.exitCode = 1;
  }
}
