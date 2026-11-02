import { parseSync } from '@babel/core';
import path from 'node:path';

const nameOf = (node) => node?.name ?? node?.value;
const ordered = (items) => [...items].sort((a, b) => a.localeCompare(b, 'en'));
const typeKinds = new Set(['TSInterfaceDeclaration', 'TSTypeAliasDeclaration']);
const ignoredNodes = new Set([
  'leadingComments',
  'innerComments',
  'trailingComments',
  'loc',
  'tokens',
]);
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (typeof node.type === 'string') visit(node);
  for (const [key, value] of Object.entries(node)) if (!ignoredNodes.has(key)) walk(value, visit);
}

export function readModule(source, file) {
  const ast = parseSync(source, {
    filename: file,
    configFile: false,
    babelrc: false,
    parserOpts: {
      sourceType: 'module',
      plugins: [
        ['typescript', { dts: /\.d\.[cm]?ts$/.test(file) }],
        ...(/\.tsx$/.test(file) ? ['jsx'] : []),
      ],
    },
  });
  const module = {
    file,
    declarations: new Map(),
    imports: new Map(),
    exports: [],
    contracts: [],
    unhandled: [],
  };
  const snippet = (node) => (node ? source.slice(node.start, node.end).trim() : '');
  const declaration = (node, exported = false) => {
    if (!node) return;
    const declarations = node.type === 'VariableDeclaration' ? node.declarations : [node];
    for (const item of declarations) {
      const name = nameOf(item.id);
      if (!name) {
        module.unhandled.push({ kind: item.type, line: item.loc.start.line });
        continue;
      }
      const kind =
        item.type === 'TSModuleDeclaration'
          ? 'namespace'
          : typeKinds.has(item.type)
            ? 'type'
            : ['ClassDeclaration', 'TSEnumDeclaration'].includes(item.type)
              ? 'both'
              : 'value';
      if (module.declarations.has(name))
        module.unhandled.push({ kind: 'declaration-merge', name, line: item.loc.start.line });
      module.declarations.set(name, { name, kind, file, line: item.loc.start.line });
      if (item.type === 'TSModuleDeclaration')
        module.unhandled.push({ kind: item.type, namespace: name, line: item.loc.start.line });
      if (exported) module.exports.push({ exported: name, local: name });
      if (!typeKinds.has(item.type)) continue;
      const members = [];
      const visitMembers = (body, prefix = '') => {
        if (!body) return;
        if (body.type === 'TSParenthesizedType') return visitMembers(body.typeAnnotation, prefix);
        if (body.type === 'TSUnionType' || body.type === 'TSIntersectionType') {
          for (const branch of body.types) visitMembers(branch, prefix);
        }
        const fields =
          body.type === 'TSInterfaceBody'
            ? body.body
            : body.type === 'TSTypeLiteral'
              ? body.members
              : [];
        for (const member of fields) {
          const signatureNames = {
            TSCallSignatureDeclaration: '[[call]]',
            TSConstructSignatureDeclaration: '[[construct]]',
            TSIndexSignature: '[[index]]',
          };
          if (
            !['TSPropertySignature', 'TSMethodSignature', ...Object.keys(signatureNames)].includes(
              member.type,
            )
          ) {
            module.unhandled.push({
              kind: member.type,
              contract: name,
              line: member.loc.start.line,
            });
            continue;
          }
          const key =
            signatureNames[member.type] ??
            (member.computed
              ? `[${snippet(member.key)}]`
              : (nameOf(member.key) ?? `[${snippet(member.key)}]`));
          const memberPath = prefix ? `${prefix}.${key}` : key;
          const annotation = member.typeAnnotation?.typeAnnotation;
          members.push({
            name: memberPath,
            optional: Boolean(member.optional),
            readonly: Boolean(member.readonly),
            computed: Boolean(member.computed),
            memberKind: member.type,
            declaration: snippet(member),
            line: member.loc.start.line,
            kind: signatureNames[member.type]
              ? 'signature'
              : /^on[A-Z]/.test(String(key))
                ? 'event'
                : /slots?|slotProps/i.test(`${name}.${memberPath}`)
                  ? 'slot'
                  : 'property',
            type: snippet(member.type === 'TSPropertySignature' ? (annotation ?? member) : member),
          });
          if (member.type === 'TSPropertySignature') visitMembers(annotation, memberPath);
        }
      };
      visitMembers(item.body ?? item.typeAnnotation);
      const references = new Set();
      walk(item, (child) => {
        if (child.type === 'TSTypeReference') references.add(snippet(child.typeName));
        if (child.type === 'TSExpressionWithTypeArguments')
          references.add(snippet(child.expression));
      });
      module.contracts.push({
        name,
        file,
        line: item.loc.start.line,
        kind,
        members,
        references: ordered(references),
        inheritanceResolved: false,
      });
    }
  };
  for (const statement of ast.program.body) {
    if (statement.type === 'ImportDeclaration') {
      for (const specifier of statement.specifiers)
        module.imports.set(specifier.local.name, {
          source: statement.source.value,
          typeOnly: statement.importKind === 'type' || specifier.importKind === 'type',
          imported:
            specifier.type === 'ImportDefaultSpecifier'
              ? 'default'
              : specifier.type === 'ImportNamespaceSpecifier'
                ? '*'
                : nameOf(specifier.imported),
        });
    } else if (statement.type === 'ExportAllDeclaration') {
      module.exports.push({
        source: statement.source.value,
        star: true,
        typeOnly: statement.exportKind === 'type',
      });
    } else if (statement.type === 'ExportNamedDeclaration') {
      declaration(statement.declaration, true);
      for (const specifier of statement.specifiers)
        module.exports.push({
          exported: nameOf(specifier.exported),
          local: nameOf(specifier.local),
          source: statement.source?.value,
          imported: specifier.type === 'ExportNamespaceSpecifier' ? '*' : nameOf(specifier.local),
          typeOnly: statement.exportKind === 'type' || specifier.exportKind === 'type',
        });
    } else if (statement.type === 'ExportDefaultDeclaration') {
      const node = statement.declaration;
      if (node.type !== 'Identifier') declaration(node);
      const local = node.type === 'Identifier' ? node.name : nameOf(node.id);
      if (local) module.exports.push({ exported: 'default', local });
      else {
        module.declarations.set('default', {
          name: 'default',
          kind: 'value',
          file,
          line: statement.loc.start.line,
        });
        module.exports.push({ exported: 'default', local: 'default' });
      }
    } else if (statement.type === 'TSImportEqualsDeclaration') {
      module.unhandled.push({
        kind: statement.type,
        name: statement.id.name,
        line: statement.loc.start.line,
      });
    } else if (statement.type === 'TSExportAssignment') {
      module.unhandled.push({ kind: statement.type, line: statement.loc.start.line });
    } else if (statement.type.endsWith('Declaration') || statement.type === 'TSDeclareFunction')
      declaration(statement);
  }
  return module;
}

function declarationCandidates(target) {
  if (/\.[cm]?tsx?$/.test(target)) return [target];
  if (target.endsWith('.mjs'))
    return [target.slice(0, -4) + '.mts', target.slice(0, -4) + '.d.mts'];
  if (target.endsWith('.cjs'))
    return [target.slice(0, -4) + '.cts', target.slice(0, -4) + '.d.cts'];
  const explicit = target.endsWith('.js');
  const stem = explicit ? target.slice(0, -3) : target;
  const candidates = [stem + '.ts', stem + '.tsx', stem + '.d.ts'];
  return explicit
    ? candidates
    : [...candidates, `${stem}/index.ts`, `${stem}/index.tsx`, `${stem}/index.d.ts`];
}
function leaves(value, condition = []) {
  if (value === null || typeof value === 'string')
    return [{ target: value, condition: condition.join('/') || 'default' }];
  if (Array.isArray(value))
    return value.flatMap((child, index) => leaves(child, [...condition, String(index)]));
  return value && typeof value === 'object'
    ? Object.entries(value).flatMap(([key, child]) => leaves(child, [...condition, key]))
    : [];
}

function exportMap(manifest) {
  return manifest.exports &&
    typeof manifest.exports === 'object' &&
    Object.keys(manifest.exports).some((key) => key.startsWith('.'))
    ? manifest.exports
    : { '.': manifest.exports ?? manifest.types ?? './index.d.ts' };
}
function exportValue(manifest, subpath) {
  const map = exportMap(manifest);
  if (Object.hasOwn(map, subpath)) return map[subpath];
  const pattern = Object.keys(map)
    .filter((key) => {
      const star = key.indexOf('*');
      return (
        star >= 0 && subpath.startsWith(key.slice(0, star)) && subpath.endsWith(key.slice(star + 1))
      );
    })
    .sort((a, b) => b.indexOf('*') - a.indexOf('*') || b.length - a.length)[0];
  return map[pattern];
}

// Preserve import/require/type/native conditions. Wildcards expose only files they actually match.
export function publicEntries(manifest, files) {
  const map = exportMap(manifest);
  const entries = new Map();
  for (const [key, value] of Object.entries(map)) {
    if (value === null || key === './package.json') continue;
    const targets = leaves(value);
    for (const { target, condition } of targets) {
      if (target === null) continue;
      const candidates = declarationCandidates(target.replace(/^\.\//, ''));
      const resolvedPaths = new Set();
      for (const candidate of candidates) {
        const star = candidate.indexOf('*');
        const matches =
          star < 0
            ? files.has(candidate)
              ? [[candidate, '']]
              : []
            : [...files.keys()]
                .filter(
                  (file) =>
                    file.startsWith(candidate.slice(0, star)) &&
                    file.endsWith(candidate.slice(star + 1)) &&
                    (!/\.d\.[cm]?ts$/.test(file) || /\.d\.[cm]?ts$/.test(candidate)),
                )
                .map((file) => [
                  file,
                  file.slice(
                    star,
                    candidate.length - star - 1 ? -(candidate.length - star - 1) : undefined,
                  ),
                ]);
        for (const [file, substitution] of matches) {
          const publicPath = key.replace('*', substitution);
          if (key.includes('*')) {
            const patterns = Object.keys(map)
              .filter((pattern) => {
                const index = pattern.indexOf('*');
                return (
                  index >= 0 &&
                  publicPath.startsWith(pattern.slice(0, index)) &&
                  publicPath.endsWith(pattern.slice(index + 1))
                );
              })
              .sort((a, b) => b.indexOf('*') - a.indexOf('*') || b.length - a.length);
            if (Object.hasOwn(map, publicPath) || patterns[0] !== key) continue;
          }
          if (resolvedPaths.has(publicPath)) continue;
          resolvedPaths.add(publicPath);
          if (!entries.has(publicPath)) entries.set(publicPath, []);
          const bindings = entries.get(publicPath);
          if (!bindings.some((item) => item.file === file && item.condition === condition))
            bindings.push({ condition, file });
        }
      }
    }
  }
  return new Map([...entries].sort(([a], [b]) => a.localeCompare(b, 'en')));
}

export function createGraph(packages) {
  const modules = new Map();
  const packageEntries = new Map();
  const unresolved = new Map();
  const issue = (from, source, imported) =>
    unresolved.set(`${from}:${source}:${imported}`, { from, source, imported });
  for (const [name, pkg] of packages) {
    packageEntries.set(name, publicEntries(pkg.manifest, pkg.files));
    for (const [file, source] of pkg.files)
      modules.set(`${name}:${file}`, { ...readModule(source, file), package: name });
  }
  const resolve = (from, specifier) => {
    const module = modules.get(from);
    if (specifier.startsWith('.')) {
      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(module.file), specifier),
      );
      const found = declarationCandidates(target).find((file) =>
        modules.has(`${module.package}:${file}`),
      );
      return found ? `${module.package}:${found}` : null;
    }
    const name = ordered(packages.keys())
      .sort((a, b) => b.length - a.length)
      .find((pkg) => specifier === pkg || specifier.startsWith(pkg + '/'));
    if (!name) return null;
    const subpath = specifier === name ? '.' : '.' + specifier.slice(name.length);
    const bindings = packageEntries.get(name).get(subpath) ?? [];
    const esm =
      /\.[m]tsx?$/.test(module.file) ||
      (!/\.[c]tsx?$/.test(module.file) && packages.get(module.package).manifest.type === 'module');
    const preferred = esm ? 'import' : 'require';
    const active = new Set([
      preferred,
      'default',
      ...(/\.d\.[cm]?ts$/.test(module.file) ? ['types', 'node'] : ['react-native']),
    ]);
    // A matching null branch blocks later fallbacks. Do not erase it when finding typed files.
    const decision = leaves(exportValue(packages.get(name).manifest, subpath)).find((item) =>
      item.condition
        .split('/')
        .every((condition) => active.has(condition) || /^\d+$/.test(condition)),
    );
    const binding =
      decision?.target === null
        ? null
        : bindings.find((item) => item.condition === decision?.condition);
    return binding ? `${name}:${binding.file}` : null;
  };
  const exports = new Map([...modules.keys()].map((key) => [key, new Map()]));
  const dependents = new Map();
  const edges = new Map();
  for (const [id, module] of modules) {
    edges.set(
      id,
      module.exports.map((entry) => {
        const imported = entry.source
          ? { source: entry.source, imported: entry.imported }
          : module.imports.get(entry.local);
        const target = imported ? resolve(id, imported.source) : null;
        if (imported && !target) issue(id, imported.source, imported.imported ?? '*');
        if (target) {
          if (!dependents.has(target)) dependents.set(target, new Set());
          dependents.get(target).add(id);
        }
        return {
          ...entry,
          typeOnly: Boolean(entry.typeOnly || imported?.typeOnly),
          imported: imported?.imported,
          target,
        };
      }),
    );
  }
  // Monotone worklist reaches a fixed point even when barrels have circular re-exports.
  const queue = [...modules.keys()];
  const queued = new Set(queue);
  const add = (map, name, sources, typeOnly) => {
    if (!map.has(name)) map.set(name, new Map());
    const bucket = map.get(name);
    let changed = false;
    for (const source of sources) {
      const item = { ...source, kind: typeOnly ? 'type' : source.kind };
      const key = `${item.module}:${item.name}:${item.kind}`;
      if (!bucket.has(key)) {
        bucket.set(key, item);
        changed = true;
      }
    }
    return changed;
  };
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    queued.delete(id);
    const module = modules.get(id);
    const output = exports.get(id);
    let changed = false;
    const explicit = new Set(
      module.exports.filter((edge) => !edge.star).map((edge) => edge.exported),
    );
    for (const edge of edges.get(id)) {
      const target = edge.target ? exports.get(edge.target) : null;
      if (edge.star) {
        if (target)
          for (const [name, bucket] of target)
            if (name !== 'default' && !explicit.has(name))
              changed = add(output, name, bucket.values(), edge.typeOnly) || changed;
      } else if (edge.imported === '*') {
        if (edge.target)
          changed =
            add(
              output,
              edge.exported,
              [{ module: edge.target, name: '*', kind: 'namespace', line: 1 }],
              edge.typeOnly,
            ) || changed;
      } else if (edge.target) {
        const source = target.get(edge.imported);
        if (source) changed = add(output, edge.exported, source.values(), edge.typeOnly) || changed;
      } else if (!edge.source && module.declarations.has(edge.local)) {
        const source = module.declarations.get(edge.local);
        changed =
          add(
            output,
            edge.exported,
            [{ module: id, name: source.name, kind: source.kind, line: source.line }],
            edge.typeOnly,
          ) || changed;
      }
    }
    if (changed)
      for (const parent of dependents.get(id) ?? [])
        if (!queued.has(parent)) {
          queue.push(parent);
          queued.add(parent);
        }
  }
  for (const [id, output] of exports)
    for (const [name, bucket] of output)
      if (isAmbiguous(bucket))
        unresolved.set(`${id}:ambiguous:${name}`, {
          from: id,
          source: id,
          imported: name,
          reason: 'ambiguous-export',
          origins: [...bucket.values()],
        });
  for (const [id, relations] of edges)
    for (const edge of relations) {
      if (
        edge.target &&
        !edge.star &&
        edge.imported !== '*' &&
        !exports.get(edge.target).has(edge.imported)
      )
        issue(id, edge.target, edge.imported);
      if (
        !edge.star &&
        !edge.target &&
        !edge.source &&
        !modules.get(id).declarations.has(edge.local) &&
        !modules.get(id).imports.has(edge.local)
      )
        issue(id, id, edge.local);
    }
  return { modules, exports, packageEntries, unresolved: [...unresolved.values()] };
}

function isAmbiguous(bucket) {
  return new Set([...bucket.values()].map((origin) => `${origin.module}:${origin.name}`)).size > 1;
}

export function symbolsAt(graph, packageName, bindings) {
  const combined = new Map();
  for (const binding of bindings)
    for (const [name, bucket] of graph.exports.get(`${packageName}:${binding.file}`) ?? []) {
      if (isAmbiguous(bucket)) continue;
      if (!combined.has(name)) combined.set(name, []);
      for (const origin of bucket.values())
        if (
          !combined
            .get(name)
            .some(
              (item) =>
                item.module === origin.module &&
                item.name === origin.name &&
                item.kind === origin.kind,
            )
        )
          combined.get(name).push(origin);
    }
  return [...combined]
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([name, origins]) => ({
      name,
      origins: origins.sort((a, b) => a.module.localeCompare(b.module, 'en')),
    }));
}

export function compareSymbols(upstream, native) {
  const local = new Set(native.map((symbol) => symbol.name));
  return upstream.map((symbol) => ({
    ...symbol,
    native: local.has(symbol.name) ? 'declared-unverified' : 'not-declared',
    verified: false,
  }));
}

// These are review candidates, not semantic type matches. Inheritance remains explicit.
export function compareContracts(contracts, nativeContracts) {
  return contracts.map((contract) => {
    const names = new Set([contract.name, contract.name.replace(/OwnProps$/, 'Props')]);
    const candidates = nativeContracts.filter((candidate) => names.has(candidate.name));
    const memberNames = new Set(
      candidates.flatMap((candidate) => candidate.members.map((member) => member.name)),
    );
    return {
      ...contract,
      nativeCandidates: candidates.map(({ name, file, line, package: packageName }) => ({
        name,
        file,
        line,
        ...(packageName ? { package: packageName } : {}),
      })),
      members: contract.members.map((member) => ({
        ...member,
        native: memberNames.has(member.name) ? 'declared-unverified' : 'not-declared-directly',
        verified: false,
      })),
    };
  });
}
