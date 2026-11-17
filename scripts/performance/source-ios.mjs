// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const hostName = 'AltrooMuiNativeHost';
const required = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'babel.config.cjs',
  'tsconfig.json',
];
const scope = [
  'packages',
  'apps/native-catalog',
  'apps/native-benchmark',
  'scripts/performance',
  ...required,
  '.nvmrc',
  ':(top,glob)*.config.*',
  ':(top,glob)tsconfig*.json',
];
const excluded = new Set([
  'node_modules',
  'dist',
  'build',
  'deriveddata',
  'pods',
  'xcuserdata',
  '.git',
  '.cache',
  '.expo',
  'coverage',
  'artifacts',
  '.ds_store',
]);
const sha = (data) => createHash('sha256').update(data).digest('hex');
const portable = (path) => path.split(sep).join('/');
const ensure = (condition, message) => {
  if (!condition) throw Error(message);
};
const allowed = (path) =>
  !portable(path)
    .split('/')
    .some(
      (part) =>
        excluded.has(part.toLowerCase()) ||
        /^(?:\.env|\.xcode\.env|\.npmrc)/i.test(part) ||
        /\.(?:app|dSYM|xcresult|ipa|o|a|jsbundle|hbc|map|log|xcactivitylog|p12|p8|pfx|pem|key|keychain(?:-db)?|keystore|jks|mobileprovision)$/i.test(
          part,
        ),
    );

/** Actual inputs, not HEAD alone. Keep this raw local manifest outside public evidence artifacts.
 * buildSettings is a sanitized caller-retained Xcode preflight record, not authenticated by this helper.
 * Environment files are never read: supply the actual resolved ENTRY_FILE/PROJECT_ROOT explicitly.
 */
export async function catalogIosSourceManifest(workspace, iosProject, options = {}) {
  ensure(
    workspace && iosProject && options.entryFile && options.projectRoot,
    'workspace, project, entryFile and projectRoot are required',
  );
  workspace = await realpath(workspace);
  iosProject = await realpath(iosProject);
  /**
   * Read Git metadata as UTF-8 text, never as native binary input.
   * @param {readonly string[]} args
   * @returns {string}
   */
  const git = (args) =>
    execFileSync('git', args, {
      cwd: workspace,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024, // The complete icon catalog exceeds Node's default Git-output limit.
    });
  ensure(
    (await realpath(git(['rev-parse', '--show-toplevel']).trim())) === workspace,
    'workspace must be its Git root',
  );
  const settings = options.buildSettings;
  const expected = {
    CONFIGURATION: 'Release',
    SWIFT_OPTIMIZATION_LEVEL: '-O',
    GCC_OPTIMIZATION_LEVEL: 's',
  };
  ensure(
    settings &&
      Object.keys(settings).length === 3 &&
      Object.entries(expected).every(
        ([key, value]) => Object.hasOwn(settings, key) && settings[key] === value,
      ),
    'buildSettings must contain only Release, Swift -O and C s optimization fields',
  );
  const projectRoot = await realpath(resolve(workspace, options.projectRoot));
  const entryFile = await realpath(resolve(workspace, options.entryFile));
  ensure(
    projectRoot === join(workspace, 'apps/native-catalog'),
    'PROJECT_ROOT must select this workspace catalog',
  );
  const entry = relative(projectRoot, entryFile);
  ensure(
    entry && entry !== '..' && !entry.startsWith('..' + sep),
    'ENTRY_FILE must be inside PROJECT_ROOT',
  );

  const files = new Map();
  async function inputPath(base, path, directory = false) {
    const inside = (candidate) => {
      const part = relative(base, candidate);
      return !isAbsolute(part) && part !== '..' && !part.startsWith('..' + sep);
    };
    const absolute = resolve(base, path);
    ensure(inside(absolute), 'Build input escapes its resolved anchor: ' + path);
    const components = relative(base, absolute).split(sep).filter(Boolean);
    let current = base;
    ensure((await lstat(current)).isDirectory(), 'Build input anchor must remain a real directory');
    for (const [index, component] of components.entries()) {
      current = join(current, component);
      const stat = await lstat(current);
      ensure(!stat.isSymbolicLink(), 'Build input symlinks are unsupported: ' + path);
      ensure(
        index < components.length - 1 || directory ? stat.isDirectory() : stat.isFile(),
        'Build input must use regular files and directories: ' + path,
      );
    }
    const canonical = await realpath(absolute);
    ensure(inside(canonical), 'Build input escapes its resolved anchor: ' + path);
    return canonical;
  }
  /**
   * Read exact build-input bytes after resolving the validated anchor.
   * @param {string} base
   * @param {string} path
   * @returns {Promise<import('node:buffer').Buffer>}
   */
  const readInput = async (base, path) => readFile(await inputPath(base, path));
  async function add(base, path, group) {
    ensure(allowed(path), 'Excluded build input: ' + path);
    const key = group + ':' + portable(path);
    files.set(key, {
      scope: group,
      path: portable(path),
      sha256: sha(await readInput(base, path)),
    });
  }
  /**
   * @param {string} base
   * @param {string} directory
   * @param {string} group
   * @param {(path: string) => boolean} [filter]
   * @returns {Promise<number>}
   */
  async function walk(base, directory, group, filter = () => true) {
    let count = 0;
    for (const entry of await readdir(await inputPath(base, directory, true), {
      withFileTypes: true,
    })) {
      const path = join(directory, entry.name);
      if (!allowed(path)) continue;
      if (entry.isDirectory()) count += await walk(base, path, group, filter);
      else {
        ensure(entry.isFile(), 'Build input symlinks/special files are unsupported: ' + path);
        if (filter(path)) {
          await add(base, path, group);
          count++;
        }
      }
    }
    return count;
  }
  const maintained = git([
    'ls-files',
    '-z',
    '--cached',
    '--others',
    '--exclude-standard',
    '--',
    ...scope,
  ])
    .split('\0')
    .filter((path) => path && allowed(path));
  for (const directory of ['packages/', 'apps/native-catalog/', 'apps/native-benchmark/'])
    ensure(
      maintained.some((path) => path.startsWith(directory)),
      'Missing maintained inputs: ' + directory,
    );
  for (const path of new Set([...maintained, ...required, relative(workspace, entryFile)]))
    await add(workspace, path, 'workspace');

  const installed = (path) => readInput(iosProject, path);
  const lock = await installed('Podfile.lock');
  ensure(
    lock.equals(await installed('Pods/Manifest.lock')),
    'Installed Pods/Manifest.lock does not match Podfile.lock',
  );
  const sections = lock.toString().split(/^EXTERNAL SOURCES:\r?\n/m);
  ensure(sections.length === 2, 'Podfile.lock must contain one EXTERNAL SOURCES section');
  const external = sections[1].split(/^\S/m)[0];
  const paths = [
    ...(external ?? '').matchAll(
      new RegExp(`^  ${hostName}:\\r?\\n    :path: ([^\\r\\n]+)$`, 'gm'),
    ),
  ];
  ensure(paths.length === 1, 'Podfile.lock must resolve one local ' + hostName);
  const raw = paths[0][1].trim();
  ensure(
    raw.startsWith('"') ||
      (raw.startsWith("'") && raw.endsWith("'")) ||
      /^[^\s#{}[\]'"~]+$/.test(raw),
    'Unsupported native-host pod path',
  );
  const podPath = raw.startsWith('"')
    ? JSON.parse(raw)
    : raw.startsWith("'")
      ? raw.slice(1, -1).replaceAll("''", "'")
      : raw;
  ensure(
    typeof podPath === 'string' && podPath && !/[\r\n]/.test(podPath),
    'Invalid native-host pod path',
  );
  const nativeHost = await realpath(resolve(iosProject, podPath));
  if (options.nativeHost)
    ensure(
      (await realpath(resolve(workspace, options.nativeHost))) === nativeHost,
      'nativeHost differs from the installed Podfile.lock route',
    );
  const specPath = `Pods/Local Podspecs/${hostName}.podspec.json`;
  const spec = JSON.parse((await installed(specPath)).toString());
  ensure(
    spec.name === hostName &&
      Array.isArray(spec.source_files) &&
      spec.source_files.length === 2 &&
      ['ios/**/*.{h,m,mm,cpp}', 'common/cpp/**/*.{h,cpp}'].every((path) =>
        spec.source_files.includes(path),
      ),
    'Unsupported installed native-host source layout',
  );
  ensure(
    JSON.parse((await readInput(nativeHost, 'package.json')).toString()).name ===
      '@altroo/mui-native-host',
    'Invalid native-host package',
  );
  const properties = JSON.parse((await installed('Podfile.properties.json')).toString());
  ensure(
    properties && typeof properties === 'object' && !Array.isArray(properties),
    'Podfile.properties.json must be an object',
  );
  const projects = (await readdir(await inputPath(iosProject, '', true))).filter((name) =>
    name.endsWith('.xcodeproj'),
  );
  ensure(projects.length === 1, 'Expected one generated catalog Xcode project');
  ensure(
    (await installed(join(projects[0], 'project.pbxproj'))).length > 0,
    'Empty catalog Xcode project',
  );
  for (const path of [
    'Podfile',
    'Podfile.lock',
    'Podfile.properties.json',
    'Pods/Manifest.lock',
    specPath,
    'Pods/Pods.xcodeproj/project.pbxproj',
  ]) {
    // Required installed-Pod definitions are deliberately separate from the excluded Pods tree.
    if (path.startsWith('Pods/')) {
      const data = await installed(path);
      ensure(data.length > 0, 'Empty installed Pod input: ' + path);
      files.set('installed-pods:' + path, { scope: 'installed-pods', path, sha256: sha(data) });
    } else await add(iosProject, path, 'ios-project');
  }
  await walk(iosProject, '', 'ios-project');
  ensure(
    [...files.values()].some(
      (file) => file.scope === 'ios-project' && /\.(swift|m|mm|cpp)$/.test(file.path),
    ),
    'Missing generated native app sources',
  );
  // Installed target settings affect the actual compiled host, not merely the workspace JS copy.
  const target = `Pods/Target Support Files/${hostName}`;
  let targetSettings = 0;
  for (const entry of await readdir(await inputPath(iosProject, target, true), {
    withFileTypes: true,
  }))
    if (/\.(xcconfig|sh|xcfilelist|modulemap|pch|h|m|mm|plist)$/.test(entry.name)) {
      ensure(entry.isFile(), 'Installed native-host target inputs must be regular files');
      const path = target + '/' + entry.name;
      files.set('installed-pods:' + path, {
        scope: 'installed-pods',
        path,
        sha256: sha(await installed(path)),
      });
      if (/\.release\.xcconfig$/.test(entry.name)) targetSettings++;
    }
  ensure(targetSettings > 0, 'Missing installed native-host Release target settings');
  for (const path of [
    'package.json',
    `${hostName}.podspec`,
    'react-native.config.js',
    'native-input-baseline.json',
  ])
    await add(nativeHost, path, 'native-host');
  for (const directory of ['ios', 'common'])
    ensure(
      (await walk(nativeHost, directory, 'native-host', (path) => /\.(h|m|mm|cpp)$/.test(path))) >
        0,
      'Missing native-host sources: ' + directory,
    );
  await walk(nativeHost, 'scripts', 'native-host');
  await walk(nativeHost, 'src', 'native-host');
  const inputs = [...files.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, file]) => file);
  const preflight = {
    ...expected,
    ENTRY_FILE: portable(relative(workspace, entryFile)),
    PROJECT_ROOT: portable(relative(workspace, projectRoot)),
  };
  return {
    schemaVersion: 1,
    sourceId: sha(JSON.stringify({ files: inputs, preflight })),
    baseCommit: git(['rev-parse', 'HEAD']).trim(),
    files: inputs,
    preflight,
    local: { workspace, iosProject, nativeHost, entryFile, projectRoot },
  };
}

if (
  process.argv[1] &&
  (await realpath(process.argv[1])) === (await realpath(fileURLToPath(import.meta.url)))
) {
  try {
    const { values } = parseArgs({
      options: Object.fromEntries(
        ['project', 'workspace', 'native-host', 'entry-file', 'project-root', 'build-settings'].map(
          (key) => [key, { type: 'string' }],
        ),
      ),
    });
    ensure(
      values.project && values['entry-file'] && values['project-root'] && values['build-settings'],
      'Required: --project IOS --entry-file ENTRY --project-root CATALOG --build-settings SANITIZED_JSON [--workspace ROOT] [--native-host HOST]',
    );
    console.log(
      JSON.stringify(
        await catalogIosSourceManifest(values.workspace ?? root, values.project, {
          nativeHost: values['native-host'],
          entryFile: values['entry-file'],
          projectRoot: values['project-root'],
          buildSettings: JSON.parse(await readFile(values['build-settings'], 'utf8')),
        }),
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
