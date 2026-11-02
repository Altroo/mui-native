import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { monitoredPackages as scope } from '../upstream/config.mjs';

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const inventoryDirectory = 'compatibility/inventory';
const manifestPath = `${inventoryDirectory}/manifest.json`;
const ordered = (values) => [...values].sort((a, b) => a.localeCompare(b, 'en'));
const reportPath = (name) => `${inventoryDirectory}/${name.replace('@mui/', '')}.json`;

function inside(root, file) {
  if (path.isAbsolute(file) || file.split('/').includes('..'))
    throw new Error(`Invalid inventory input path: ${file}`);
  return path.join(root, file);
}
async function filesBelow(root, directory, accept) {
  const files = [];
  for (const entry of await readdir(inside(root, directory), { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Unexpected inventory symlink: ${file}`);
    if (entry.isDirectory()) files.push(...(await filesBelow(root, file, accept)));
    else if (entry.isFile() && accept(file)) files.push(file);
  }
  return ordered(files);
}
export function baselineProjection(state, configs = scope) {
  return configs.map(({ name, channel, role = 'port' }) => {
    const baseline = state.packages[name]?.baseline;
    if (!baseline) throw new Error(`Missing pinned baseline: ${name}`);
    return { name, channel, role, baseline };
  });
}

// The mutable release detector state is deliberately excluded. Only reviewed baselines count.
export async function collectInputs(root = process.cwd(), configs = scope) {
  const state = JSON.parse(await readFile(inside(root, 'upstream/state.json'), 'utf8'));
  const baselines = baselineProjection(state, configs);
  const paths = new Set([
    'package.json',
    'pnpm-lock.yaml',
    '.nvmrc',
    '.prettierrc.json',
    'packages/compat/supported.json',
    ...(await filesBelow(root, 'scripts/inventory', (file) => /\.(mjs|py)$/.test(file))),
    ...(await filesBelow(root, 'scripts/upstream', (file) => /\.(mjs|py)$/.test(file))),
  ]);
  for (const { name, baseline } of baselines) {
    if (baseline.apiSnapshot) {
      if (!baseline.apiSnapshot.startsWith('upstream/api/'))
        throw new Error(`Unexpected declaration snapshot path: ${baseline.apiSnapshot}`);
      paths.add(baseline.apiSnapshot);
    }
    if (baseline.license === 'MIT' && !baseline.licenseReview) {
      const licenseFile = `upstream/licenses/${name.replace('@mui/', '')}.txt`;
      if (sha256(await readFile(inside(root, licenseFile))) !== baseline.licenseSha256)
        throw new Error(`Retained license snapshot mismatch: ${name}`);
      paths.add(licenseFile);
    }
  }
  for (const entry of await readdir(inside(root, 'packages'), { withFileTypes: true })) {
    if (!entry.isDirectory()) throw new Error(`Unexpected package entry: ${entry.name}`);
    const directory = `packages/${entry.name}`;
    const manifestFile = `${directory}/package.json`;
    paths.add(manifestFile);
    const manifest = JSON.parse(await readFile(inside(root, manifestFile), 'utf8'));
    if (manifest.exports?.['.']?.['react-native'])
      for (const file of await filesBelow(root, `${directory}/src`, (name) =>
        /\.[cm]?tsx?$/.test(name),
      ))
        paths.add(file);
  }
  const files = {};
  for (const file of ordered(paths)) files[file] = sha256(await readFile(inside(root, file)));
  return { baselinesSha256: sha256(JSON.stringify(baselines)), files };
}

async function existingReports(root) {
  try {
    return await filesBelow(root, inventoryDirectory, (file) => file.endsWith('.json'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}
function sameList(actual, expected) {
  return JSON.stringify(ordered(actual)) === JSON.stringify(ordered(expected));
}
export async function verifyInventory(root = process.cwd(), configs = scope) {
  const manifest = JSON.parse(await readFile(inside(root, manifestPath), 'utf8'));
  const inputs = await collectInputs(root, configs);
  if (JSON.stringify(inputs) !== JSON.stringify(manifest.inputs))
    throw new Error('Coverage inputs changed. Run pnpm coverage:generate.');
  if (manifest.status !== 'declaration-inventory-not-parity')
    throw new Error('Invalid inventory verification status.');
  const state = JSON.parse(await readFile(inside(root, 'upstream/state.json'), 'utf8'));
  const projection = baselineProjection(state, configs);
  const references = projection.filter((item) => item.role === 'reference-dependency');
  if (
    !sameList(
      (manifest.referenceDependencies ?? []).map((item) => item.name),
      references.map((item) => item.name),
    )
  )
    throw new Error('Supporting source reference set does not match reviewed baselines.');
  for (const { name, baseline } of references) {
    if (baseline.license !== 'MIT' || baseline.licenseReview)
      throw new Error(`Supporting source dependency is blocked: ${name}`);
    const recorded = manifest.referenceDependencies.find((item) => item.name === name);
    for (const key of [
      'version',
      'sourceCommit',
      'integrity',
      'apiSnapshotSha256',
      'licenseSha256',
    ])
      if (recorded[key] !== baseline[key])
        throw new Error(`Supporting source reference mismatch: ${name}`);
  }
  const baselines = projection.filter((item) => item.role !== 'reference-dependency');
  const eligible = baselines.filter(
    ({ baseline }) => baseline.license === 'MIT' && !baseline.licenseReview,
  );
  const blocked = baselines.filter(
    ({ baseline }) => baseline.license !== 'MIT' || baseline.licenseReview,
  );
  if (
    !sameList(
      manifest.packages.map((item) => item.package),
      eligible.map((item) => item.name),
    ) ||
    !sameList(
      manifest.blocked.map((item) => item.name),
      blocked.map((item) => item.name),
    )
  )
    throw new Error('Inventory scope does not match reviewed baselines.');
  const expected = [manifestPath];
  for (const entry of manifest.packages) {
    if (entry.inventory !== reportPath(entry.package) || entry.verifiedParity !== 0)
      throw new Error(`Invalid inventory report metadata: ${entry.package}`);
    expected.push(entry.inventory);
    const content = await readFile(inside(root, entry.inventory));
    if (sha256(content) !== entry.sha256)
      throw new Error(`Inventory report changed: ${entry.inventory}`);
    const report = JSON.parse(content);
    if (
      report.package !== entry.package ||
      report.support !== 'unverified' ||
      report.rootExports.some((symbol) => symbol.verified !== false) ||
      report.contracts.some((contract) =>
        contract.members.some((member) => member.verified !== false),
      )
    )
      throw new Error(`Inventory cannot verify compatibility: ${entry.package}`);
  }
  if (!sameList(await existingReports(root), expected))
    throw new Error('Inventory report set contains missing or obsolete reports.');
  if (
    manifest.documentation?.path !== 'docs/coverage.md' ||
    sha256(await readFile(inside(root, 'docs/coverage.md'))) !== manifest.documentation.sha256
  )
    throw new Error('Coverage documentation changed. Run pnpm coverage:generate.');
  return manifest.packages.length;
}

// Only reports recorded by a previous manifest are eligible for removal. Unknown files fail closed.
export async function writeOutputs(outputs, { root = process.cwd(), check = false } = {}) {
  const expected = [...outputs.keys()].filter(
    (file) => file.startsWith(inventoryDirectory + '/') && file.endsWith('.json'),
  );
  const existing = await existingReports(root);
  const obsolete = existing.filter((file) => !expected.includes(file));
  if (check) {
    if (!sameList(existing, expected))
      throw new Error('Inventory report set contains missing or obsolete reports.');
    for (const [file, content] of outputs)
      if ((await readFile(inside(root, file), 'utf8').catch(() => null)) !== content)
        throw new Error(`Coverage inventory is stale: ${file}. Run pnpm coverage:generate.`);
    return;
  }
  if (obsolete.length) {
    const previous = JSON.parse(await readFile(inside(root, manifestPath), 'utf8'));
    const known = new Set(
      previous.packages
        .map((item) => item.inventory)
        .filter(
          (file) =>
            /^compatibility\/inventory\/[a-z0-9-]+\.json$/.test(file) && file !== manifestPath,
        ),
    );
    for (const file of obsolete)
      if (!known.has(file))
        throw new Error(`Unrecognized inventory report: ${file}. Review it before regenerating.`);
  }
  // Preparation and orphan validation finish before any mutation. Write manifest last.
  for (const [file, content] of [...outputs].sort(
    ([a], [b]) => Number(a === manifestPath) - Number(b === manifestPath),
  )) {
    await mkdir(path.dirname(inside(root, file)), { recursive: true });
    await writeFile(inside(root, file), content);
  }
  for (const file of obsolete) await unlink(inside(root, file));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(
    `Offline inventory freshness verified for ${await verifyInventory()} packages. No compatibility claim is promoted.`,
  );
