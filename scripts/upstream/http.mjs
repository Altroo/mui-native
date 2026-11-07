// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
async function responseFor(
  url,
  { token = process.env.GITHUB_TOKEN, json = true, ...options } = {},
) {
  const endpoint = new URL(url);
  const github = endpoint.origin === 'https://api.github.com';
  const headers = new Headers(options.headers);
  if (!headers.has('User-Agent')) headers.set('User-Agent', 'altroo-mui-native-upstream');
  if (!headers.has('Accept'))
    headers.set(
      'Accept',
      github ? 'application/vnd.github+json' : json ? 'application/json' : 'text/plain',
    );
  if (token && github) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok)
    throw Object.assign(
      new Error(`HTTP ${response.status} for ${endpoint.origin}${endpoint.pathname}`),
      { status: response.status },
    );
  return response;
}
export async function request(url, options = {}) {
  const response = await responseFor(url, options);
  if (response.status === 204 || response.status === 205) return null;
  return options.json === false ? response.text() : response.json();
}
export async function pages(url, options) {
  const first = new URL(url);
  first.searchParams.set('per_page', '100');
  let next = first.href;
  const seen = new Set();
  const items = [];
  for (let page = 0; page < 100; page++) {
    if (seen.has(next)) throw new Error('Repeated pagination link; cursor not advanced');
    seen.add(next);
    const response = await responseFor(next, options);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Expected a paginated array');
    items.push(...data);
    const link = response.headers.get('link')?.match(/<([^>]+)>;\s*rel="next"/);
    if (!link) return items;
    const target = new URL(link[1], next);
    if (target.origin !== first.origin) throw new Error('Unexpected pagination host');
    next = target.href;
  }
  throw new Error('Pagination limit exceeded; cursor not advanced');
}
export async function commitForTag(repository, tag) {
  let value = await request(
    `https://api.github.com/repos/${repository}/git/ref/tags/${encodeURIComponent(tag)}`,
  );
  let object = value.object;
  for (let n = 0; n < 5 && object.type === 'tag'; n++) object = (await request(object.url)).object;
  if (object.type !== 'commit' || !/^[a-f0-9]{40}$/.test(object.sha))
    throw new Error(`Unresolved immutable source for ${repository}/${tag}`);
  return object.sha;
}
