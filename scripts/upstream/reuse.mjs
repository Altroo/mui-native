import { assertSourceEligible } from './config.mjs';

export function reusedFiles(reuse, name) {
  if (!reuse || reuse.schemaVersion !== 1 || !Array.isArray(reuse.entries))
    throw new Error('Invalid source reuse record');
  const files = new Map();
  for (const entry of reuse.entries) {
    assertSourceEligible(entry.reference?.name);
    if (entry.reference.name !== name) continue;
    if (!entry.localFile || !entry.reference.sourceFiles)
      throw new Error('Incomplete source reuse record');
    for (const [path, sha256] of Object.entries(entry.reference.sourceFiles)) {
      if (
        path.startsWith('/') ||
        path.includes('\\') ||
        path.split('/').some((part) => part === '..' || part === '.') ||
        !/^[a-f0-9]{64}$/.test(sha256)
      )
        throw new Error('Invalid reused source path or hash');
      const previous = files.get(path);
      if (previous && previous.sha256 !== sha256)
        throw new Error(`Conflicting reused source: ${path}`);
      files.set(path, {
        path,
        sha256,
        localFiles: [...new Set([...(previous?.localFiles ?? []), entry.localFile])],
      });
    }
  }
  return [...files.values()];
}
export function compareReusedFiles(expected, actual) {
  if (expected.length && (!actual || typeof actual !== 'object'))
    throw new Error('Missing adapted-source hash evidence');
  return expected
    .filter((file) => actual[file.path] !== file.sha256)
    .map((file) => ({
      path: file.path,
      sha256: actual[file.path] ?? null,
      status: actual[file.path] ? 'changed' : 'removed',
      localFiles: file.localFiles,
    }));
}
