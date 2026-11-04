import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as prettier from 'prettier';
import { monitoredPackages as scope, assertSourceEligible } from '../upstream/config.mjs';
import { inspectArtifact } from '../upstream/artifact.mjs';
import { createGraph, symbolsAt, compareSymbols, compareContracts } from './declarations.mjs';
import { collectInputs, writeOutputs } from './freshness.mjs';

// Keep the formatter boundary explicit for Node's package export resolution.
const formatter =
  /** @type {{format(source: string, options: {parser: string}): Promise<string>}} */ (prettier);

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export function verifyIntegrity(bytes, integrity, label) {
  const [algorithm, expected] = integrity.split('-');
  if (
    !['sha256', 'sha512'].includes(algorithm) ||
    createHash(algorithm).update(bytes).digest('base64') !== expected
  )
    throw new Error(`Integrity mismatch: ${label}`);
}
export function verifyArtifact(artifact, baseline, name, snapshot) {
  if (artifact.manifest.name !== name || artifact.manifest.version !== baseline.version)
    throw new Error(`Package identity mismatch: ${name}`);
  if (baseline.license !== 'MIT' || artifact.manifest.license !== 'MIT' || baseline.licenseReview)
    throw new Error(`License review required: ${name}`);
  const license = artifact.licenses[baseline.licensePath];
  if (!license || sha256(license) !== baseline.licenseSha256)
    throw new Error(`License snapshot mismatch: ${name}`);
  if (sha256(snapshot) !== baseline.apiSnapshotSha256)
    throw new Error(`Declaration manifest mismatch: ${name}`);
  if (JSON.stringify(artifact.hashes) !== JSON.stringify(JSON.parse(snapshot)))
    throw new Error(`Declaration snapshot mismatch: ${name}`);
}
async function filesBelow(directory, prefix = '') {
  const files = new Map();
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name, 'en'),
  )) {
    const key = prefix + entry.name;
    if (entry.isDirectory())
      for (const [file, content] of await filesBelow(path.join(directory, entry.name), key + '/'))
        files.set(file, content);
    else if (entry.isFile() && /\.[cm]?(?:tsx?|js)$/.test(key))
      files.set(key, await readFile(path.join(directory, entry.name), { encoding: 'utf8' }));
  }
  return files;
}
export async function generate({ fetchMissing = false, check = false } = {}) {
  if (check && fetchMissing) throw new Error('Check mode cannot fetch or write cached artifacts.');
  const initialInputs = await collectInputs();
  const state = JSON.parse(await readFile('upstream/state.json', { encoding: 'utf8' }));
  /** @type {Record<string, { target: string, subpaths: string[] }>} */
  const aliases = JSON.parse(
    await readFile('packages/compat/supported.json', { encoding: 'utf8' }),
  );
  const upstream = new Map();
  const native = new Map();
  const provenance = new Map();
  const blocked = [];
  for (const config of scope) {
    assertSourceEligible(config.name);
    const baseline = state.packages[config.name]?.baseline;
    if (!baseline) throw new Error(`Missing pinned baseline: ${config.name}`);
    if (baseline.licenseReview || baseline.license !== 'MIT') {
      if (config.role === 'reference-dependency')
        throw new Error(`Supporting source dependency is blocked: ${config.name}`);
      blocked.push({
        name: config.name,
        channel: config.channel,
        version: baseline.version,
        reason: baseline.licenseReview ?? baseline.license,
      });
      continue;
    }
    const file = `.cache/upstream/${config.name.replace('@mui/', '')}-${baseline.version}.tgz`;
    let bytes;
    try {
      bytes = await readFile(file);
    } catch (error) {
      if (error.code !== 'ENOENT' || !fetchMissing)
        throw Object.assign(
          new Error(
            `Missing cached artifact ${file}. Run pnpm coverage:generate --fetch to download the pinned package.`,
          ),
          { cause: error },
        );
      await inspectArtifact({
        name: config.name,
        version: baseline.version,
        dist: { tarball: baseline.tarball, integrity: baseline.integrity },
      });
      bytes = await readFile(file);
    }
    verifyIntegrity(bytes, baseline.integrity, config.name);
    const artifact = JSON.parse(
      execFileSync('python3', ['scripts/inventory/read-artifact.py', file], {
        encoding: 'utf8',
        maxBuffer: 128 * 1024 * 1024,
      }),
    );
    verifyArtifact(
      artifact,
      baseline,
      config.name,
      await readFile(baseline.apiSnapshot, { encoding: 'utf8' }),
    );
    upstream.set(config.name, {
      manifest: artifact.manifest,
      files: new Map(Object.entries(artifact.files)),
    });
    provenance.set(config.name, {
      version: baseline.version,
      sourceCommit: baseline.sourceCommit,
      integrity: baseline.integrity,
      apiSnapshotSha256: baseline.apiSnapshotSha256,
      licenseSha256: baseline.licenseSha256,
      channel: config.channel,
    });
  }
  for (const directory of await readdir('packages')) {
    const manifest = JSON.parse(
      await readFile(`packages/${directory}/package.json`, { encoding: 'utf8' }),
    );
    if (!manifest.exports?.['.']?.['react-native']) continue;
    const source = await filesBelow(`packages/${directory}/src`, 'src/');
    native.set(manifest.name, { manifest, files: source, directory });
  }
  const upstreamGraph = createGraph(upstream);
  const nativeGraph = createGraph(native);
  const outputs = new Map();
  const summary = [];
  for (const [name, pkg] of upstream) {
    if (scope.find((config) => config.name === name)?.role === 'reference-dependency') continue;
    const nativeName = aliases[name]?.target;
    const nativePkg = native.get(nativeName);
    const nativeEntryPoints = nativeGraph.packageEntries.get(nativeName) ?? new Map();
    const rootNative = symbolsAt(nativeGraph, nativeName, nativeEntryPoints.get('.') ?? []);
    const imports = [...upstreamGraph.packageEntries.get(name)].map(([subpath, conditions]) => ({
      path: subpath === '.' ? name : name + subpath.slice(1),
      conditions,
      native:
        nativeEntryPoints.has(subpath) &&
        (subpath === '.' || aliases[name]?.subpaths.includes(subpath.slice(2)))
          ? 'mapped-unverified'
          : 'not-mapped',
    }));
    const root = compareSymbols(
      symbolsAt(upstreamGraph, name, upstreamGraph.packageEntries.get(name).get('.') ?? []),
      rootNative,
    );
    const contracts = [...upstreamGraph.modules]
      .filter(([id]) => id.startsWith(name + ':'))
      .flatMap(([, module]) => module.contracts);
    const exportedNativeOrigins = new Set(
      rootNative.flatMap((symbol) =>
        symbol.origins.map((origin) => `${origin.module}:${origin.name}`),
      ),
    );
    const nativeContracts = nativePkg
      ? [...nativeGraph.modules].flatMap(([id, module]) =>
          module.contracts
            .filter(
              (contract) =>
                id.startsWith(nativeName + ':') ||
                exportedNativeOrigins.has(`${id}:${contract.name}`),
            )
            .map((contract) => ({ ...contract, package: module.package })),
        )
      : [];
    const nativeHash = nativePkg ? sha256(JSON.stringify([...nativePkg.files])) : null;
    const record = {
      schemaVersion: 1,
      package: name,
      provenance: provenance.get(name),
      scope:
        provenance.get(name).channel === 'preview' ? 'experimental-separate' : 'stable-community',
      support: 'unverified',
      nativePackage: nativeName ?? null,
      nativeSourceSha256: nativeHash,
      exportMap: pkg.manifest.exports ?? null,
      imports,
      rootExports: root,
      nativeOnlyExports: rootNative.filter(
        (symbol) => !root.some((upstreamSymbol) => upstreamSymbol.name === symbol.name),
      ),
      contracts: compareContracts(contracts, nativeContracts),
      nativeContracts,
      unresolvedExports: upstreamGraph.unresolved.filter((item) =>
        item.from.startsWith(name + ':'),
      ),
      syntaxReview: [...upstreamGraph.modules]
        .filter(([id]) => id.startsWith(name + ':'))
        .flatMap(([, module]) => module.unhandled.map((item) => ({ file: module.file, ...item }))),
      limits: [
        'Direct declaration members only. Generic instantiation, mapped types, inherited DOM/React props and conditional type expansion require semantic review.',
        'Property/event/slot categories are syntax-based labels. Inspect the containing contract and references before assigning a component behavior.',
        'Matching export names do not prove signatures, runtime behavior, accessibility, platform support or complete parity.',
        'Root exports and typed published import targets are recorded separately. Runtime-only wildcard targets without declarations require source review. Files reachable only through deep imports may contain contracts absent from the root barrel.',
        'Unresolved external and ambiguous re-exports are explicit gaps and are not included in resolved symbol counts.',
        'Computed names, declaration merging, namespace bodies, import-equals and export assignments require semantic review. Package root module format is used; nested package.json overrides and custom condition selection require review.',
      ],
    };
    const text = JSON.stringify(record, null, 2) + '\n';
    const output = `compatibility/inventory/${name.replace('@mui/', '')}.json`;
    outputs.set(output, text);
    const canonical = contracts.filter((contract) => contract.file.endsWith('.d.ts'));
    const members = canonical.flatMap((contract) => contract.members);
    summary.push({
      package: name,
      ...provenance.get(name),
      nativeSourceSha256: nativeHash,
      declarationFiles: pkg.files.size,
      publishedImportPaths: imports.length,
      resolvedRootExports: root.length,
      locallyDeclaredRootNames: root.filter((item) => item.native === 'declared-unverified').length,
      directMembers: members.length,
      eventDeclarations: members.filter((item) => item.kind === 'event').length,
      slotDeclarations: members.filter((item) => item.kind === 'slot').length,
      unresolvedExportEdges: record.unresolvedExports.length,
      syntaxReviewItems: record.syntaxReview.length,
      verifiedParity: 0,
      inventory: output,
      sha256: sha256(text),
    });
    console.log(
      `${name}: ${imports.length} import paths, ${root.length} resolved root names; ${record.unresolvedExports.length} unresolved export edges`,
    );
  }
  const rows = summary
    .map(
      (item) =>
        `| ${item.package} | ${item.version} | ${item.channel} | ${item.publishedImportPaths} | ${item.resolvedRootExports} | ${item.locallyDeclaredRootNames} | ${item.unresolvedExportEdges} |`,
    )
    .join('\n');
  const markdown = `# Generated declaration coverage\n\nGenerated by \`pnpm coverage:generate\` from integrity-checked pinned artifacts and the current native source. No hosted service or emulator is used. Source hashes are recorded in [the manifest](../compatibility/inventory/manifest.json).\n\n**No complete contract is verified by this inventory.** Locally declared names still require signature, behavior, platform, accessibility and performance evidence. Counts do not measure completion.\n\n| Package | Baseline | Track | Typed import paths | Resolved root names | Names also declared natively | Unresolved export edges |\n| --- | --- | --- | ---: | ---: | ---: | ---: |\n${rows}\n\n## Reading the records\n\nEach [package record](../compatibility/inventory) includes conditional import targets, root symbol provenance, direct type members, callbacks, slot members, type references and current native contracts, including root contracts re-exported from another native package. Both ESM and CommonJS declarations are parsed. MIT source dependencies such as @mui/utils are pinned and monitored separately, used to resolve re-exports, and do not create native import aliases or verified-support claims. Import counts cover targets with declarations, excluding package metadata; untyped runtime-only wildcard targets still need source review. Native-only exports are listed separately, and direct member matches are review candidates rather than type or behavior equivalence. Member summary counts use the .d.ts declaration files to avoid counting equivalent conditions twice. They include direct property, method, call, construct and index signatures, including overloads and nested literal members. Exact declaration text and syntax modifiers are retained; computed names and semantic type expansion still require review. Published \`internals\` paths remain visible for review; publication alone does not make them an agreed public compatibility contract.\n\nRe-exports from unavailable external dependencies and ambiguous exports remain explicit gaps. Package root module format selects import/require branches; nested package.json overrides, custom conditions, namespace bodies and import-equals require semantic review. Inherited properties, generic instantiation, mapped types, conditional types and declaration merging need semantic review. A name match is recorded as \`declared-unverified\`, never as supported or verified. The inventory does not modify upstream detection, candidate or released-support state.\n\nPreview packages are separate. ${blocked.map((item) => `${item.name}@${item.version} is blocked: ${item.reason}.`).join(' ')}\n\n## Reproduce\n\n\`pnpm coverage:generate\` uses existing pinned tarballs in \`.cache/upstream\`. On a new machine use \`pnpm coverage:generate --fetch\` to download missing immutable tarballs from npm, verify integrity and license/API snapshots, and generate the same records. Upstream code is never executed. \`pnpm coverage:check\` checks for drift without rewriting records. \`pnpm coverage:verify\` is the fast, offline CI freshness guard included in \`pnpm check\`: it verifies input and output hashes, the exact report set and unverified status without fetching tarballs or executing upstream code. It covers reviewed baselines, native source, package export maps, alias mappings, generators, immutable API snapshots and locked tools. Ordinary release-detection state changes do not invalidate it. Full regeneration remains the stronger provenance check. Update the declaration inventory when these inputs change.\n\nNext: resolve external export/type dependencies, map inherited component contracts, then attach explicit native/web test and device evidence to reviewed contracts. The full compatibility and release gates remain in [ROADMAP.md](../ROADMAP.md).\n`;
  outputs.set('docs/coverage.md', await formatter.format(markdown, { parser: 'markdown' }));
  const finalInputs = await collectInputs();
  if (JSON.stringify(initialInputs) !== JSON.stringify(finalInputs))
    throw new Error('Coverage inputs changed during generation. Retry against a stable checkout.');
  outputs.set(
    'compatibility/inventory/manifest.json',
    JSON.stringify(
      {
        schemaVersion: 1,
        status: 'declaration-inventory-not-parity',
        inputs: initialInputs,
        documentation: {
          path: 'docs/coverage.md',
          sha256: sha256(outputs.get('docs/coverage.md')),
        },
        referenceDependencies: scope
          .filter((config) => config.role === 'reference-dependency')
          .map((config) => ({ name: config.name, ...provenance.get(config.name) })),
        packages: summary,
        blocked,
      },
      null,
      2,
    ) + '\n',
  );
  // Prepare everything before writing, so parse/provenance failures cannot publish partial reports.
  await writeOutputs(outputs, { check });
  return summary;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generate({
    fetchMissing: process.argv.includes('--fetch'),
    check: process.argv.includes('--check'),
  });
}
