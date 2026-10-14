export async function request(
  url,
  { token = process.env.GITHUB_TOKEN, json = true, ...options } = {},
) {
  const headers = {
    'User-Agent': 'altroo-mui-native-upstream',
    Accept: 'application/vnd.github+json',
    ...options.headers,
  };
  if (token && new URL(url).hostname === 'api.github.com')
    headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok)
    throw new Error(`HTTP ${response.status} for ${new URL(url).origin}${new URL(url).pathname}`);
  if (response.status === 204 || response.status === 205) return null;
  return json ? response.json() : response.text();
}
export async function pages(url, options) {
  const items = [];
  for (let page = 1; page <= 100; page++) {
    const data = await request(
      `${url}${url.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
      options,
    );
    if (!Array.isArray(data)) throw new Error('Expected a paginated array');
    items.push(...data);
    if (data.length < 100) return items;
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
