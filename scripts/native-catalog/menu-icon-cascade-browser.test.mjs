// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import test from 'node:test';
import { createMenuIconBrowserHtml } from '../reference/menu-icon-cascade-browser.mjs';
const source = JSON.parse(
  await readFile(
    new URL('../../tests/fixtures/mui-menu-icon-cascade-9.5.0.json', import.meta.url),
    { encoding: 'utf8' },
  ),
);
const spec = {
  ...source,
  sourceFixture: {
    path: 'tests/fixtures/mui-menu-icon-cascade-9.5.0.json',
    sha256: 'retained-source-fixture',
  },
};
const decode = (value) =>
  value
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
test('offline browser output retains all original DOM roots in isolated srcdoc frames plus one explicit rem calibration', () => {
  const html = createMenuIconBrowserHtml(spec);
  const frames = [...html.matchAll(/<iframe[^>]+srcdoc="([^"]+)"/g)].map((match) =>
    decode(match[1]),
  );
  assert.equal(source.fixtures.length, 26);
  assert.equal(frames.length, 27);
  source.fixtures.forEach((fixture, index) => {
    const id = String(index).padStart(2, '0');
    const frame = frames[index];
    for (const slot of ['root', 'icon', 'svg'])
      assert(frame.includes(`id="menu-style-case-${id}-${slot}"`));
    assert(frame.includes(`font-size:${fixture.input.htmlFontSize ?? 16}px`));
    assert(frame.includes('<style'));
    assert(frame.includes('<svg'));
  });
  assert(frames[26].includes('font-size:24px'));
  assert.equal((html.match(/sandbox="allow-same-origin"/g) ?? []).length, 27);
  assert(!/<script[^>]+src=|<link[^>]+href=/.test(html));
  const code = html.match(/<script id="menu-style-observer">([\s\S]+)<\/script>/)?.[1];
  assert(code);
  new Script(code);
  assert(code.includes('getComputedStyle'));
  assert(code.includes('getBoundingClientRect'));
});
test('missing or ambiguous original target IDs fail instead of emitting a blank reference page', () => {
  const fixture = { ...source.fixtures[0], markup: '<div id="menu-root"></div>' };
  assert.throws(
    () => createMenuIconBrowserHtml({ ...spec, fixtures: [fixture] }),
    /exactly one icon-root/,
  );
  assert.throws(
    () =>
      createMenuIconBrowserHtml({
        ...spec,
        fixtures: [
          {
            ...source.fixtures[0],
            markup: source.fixtures[0].markup + '<div id="menu-root"></div>',
          },
        ],
      }),
    /exactly one menu-root/,
  );
});
for (const [label, name] of [
  ['whole match', '$&'],
  ['prefix', '$`'],
  ['suffix', "$'"],
  [
    'combined script-sensitive text',
    '$& / $` / $\' </script><img src=x onerror="bad">\u2028\u2029',
  ],
]) {
  test('fixture names preserve literal replacement tokens and script context: ' + label, () => {
    const fixture = {
      ...source.fixtures[0],
      input: { ...source.fixtures[0].input, name },
    };
    const html = createMenuIconBrowserHtml({ ...spec, fixtures: [fixture] });
    assert.equal((html.match(/<script id=/g) ?? []).length, 1);
    assert(!html.includes('</script><img'));
    const code = html.match(/<script id="menu-style-observer">([\s\S]+)<\/script>/)?.[1];
    assert(code);
    new Script(code);
    const literal = code.match(/const manifest=([\s\S]*?);\n const status=/)?.[1];
    assert(literal);
    const manifest = JSON.parse(literal);
    assert.equal(manifest.cases[0].input.name, name);
  });
}
