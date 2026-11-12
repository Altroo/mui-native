// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  assertCacheObservations,
  assertStyledProgrammes,
  assertCssEmissions,
  assertClassMembership,
} from './button-group-cache-contract.mjs';
const fixture = JSON.parse(
  readFileSync(
    new URL('../../tests/fixtures/mui-button-group-cache-9.5.0.json', import.meta.url),
    'utf8',
  ),
);
const get = (name, rows = fixture.observations) => rows.find((row) => row.name === name);

test('cache observations retain their exact authored probe and contract source', () => {
  for (const [file, digest] of [
    ['./button-group-cache-browser.mjs', fixture.metadata.browserSha256],
    ['./button-group-cache-contract.mjs', fixture.metadata.contractSha256],
    ['./styled-cache-classes-browser.mjs', fixture.metadata.classBrowserSha256],
  ])
    assert.equal(
      createHash('sha256')
        .update(readFileSync(new URL(file, import.meta.url)))
        .digest('hex'),
      digest,
    );
  assertCacheObservations(fixture.observations);
});

test('original shared and independent caches demonstrate distinct settled border order', () => {
  const last = (name) => get(name).observations.at(-1);
  const transparent = 'rgba(0, 0, 0, 0)';
  const grey = 'rgba(0, 0, 0, 0.12)';
  assert.equal(last('target-first').buttons[0].rightBorder, grey);
  assert.equal(last('standalone-defaults-target').buttons[0].rightBorder, transparent);
  assert.equal(last('defaults-reset-target').buttons[0].rightBorder, grey);
  assert.equal(last('nested-button-cache-first').buttons[0].rightBorder, transparent);
  assert.equal(last('nested-existing-group-cache').buttons[0].rightBorder, grey);
  const switched = last('live-button-cache-switch');
  assert.equal(switched.immediateBorders[0], transparent);
  assert.equal(switched.buttons[0].rightBorder, grey);
  assert.equal(get('discarded-suspense-target').observations[0].inserted.length, 0);
});

for (const [name, corrupt] of [
  [
    'empty emission list',
    (rows) => {
      get('target-first', rows).observations[0].inserted = [];
    },
  ],
  [
    'empty tag placement',
    (rows) => {
      get('target-first', rows).observations[0].tagOwners = [];
    },
  ],
  [
    'empty cache rows',
    (rows) => {
      get('target-first', rows).observations[0].cacheInsertions = [];
    },
  ],
  [
    'empty per-cache names',
    (rows) => {
      get('target-first', rows).observations[0].cacheInsertions[0].names = [];
    },
  ],
  [
    'empty matching rule order',
    (rows) => {
      get('target-first', rows).observations[0].matchingBorderRules = [];
    },
  ],
  ['dropped warm-up', (rows) => get('standalone-defaults-target', rows).observations.shift()],
  [
    'wrong strict flag',
    (rows) => {
      get('strict-defaults-target', rows).strict = false;
    },
  ],
  [
    'missing emitted names',
    (rows) => {
      get('target-first', rows).observations[0].inserted = null;
    },
  ],
  [
    'discarded render insertion',
    (rows) => {
      get('discarded-suspense-target', rows).observations[0].inserted.push('discarded-css');
    },
  ],
  [
    'lost positional class',
    (rows) => {
      get('nested-fresh-caches', rows).observations[0].buttons[0].className = 'MuiButton-root';
    },
  ],
  [
    'missing settled button',
    (rows) => {
      get('live-button-cache-switch', rows).observations.at(-1).buttons.pop();
    },
  ],
])
  test('cache reference rejects ' + name, () => {
    const rows = structuredClone(fixture.observations);
    corrupt(rows);
    assert.throws(() => assertCacheObservations(rows));
  });

test('styled observations retain exact creation/render timing and shared constructor identity', () => {
  assertStyledProgrammes(fixture.styledPrograms);
  const staticCss = fixture.styledPrograms.find((row) => row.name === 'static-object').css;
  const dynamicCss = fixture.styledPrograms.find((row) => row.name === 'dynamic-object').css;
  assert.notEqual(staticCss, dynamicCss);
});
for (const [name, corrupt] of [
  ['dropped constructor', (rows) => rows.pop()],
  [
    'deferred static getter',
    (rows) => {
      rows[0].definitionTrace = [];
    },
  ],
  [
    'extra dynamic getter',
    (rows) => {
      rows[1].renderTrace.push('css:padding');
    },
  ],
  [
    'invented theme prop',
    (rows) => {
      rows[4].renderTrace[2] = 'predicate:true:true:ltr';
    },
  ],
  [
    'missing emitted CSS',
    (rows) => {
      delete rows[0].css;
    },
  ],
  [
    'changed shared class',
    (rows) => {
      rows[5].secondClassName = 'other';
    },
  ],
])
  test('styled reference rejects ' + name, () => {
    const rows = structuredClone(fixture.styledPrograms);
    corrupt(rows);
    assert.throws(() => assertStyledProgrammes(rows));
  });

test('original CSS insertion distinguishes empty labels/media from empty keyframes', () => {
  assertCssEmissions(fixture.cssEmissions);
  const get = (css) => fixture.cssEmissions.find((row) => row.css === css).hasRules;
  assert.equal(get('label:empty;'), false);
  assert.equal(get('@media(min-width:100px){}'), false);
  assert.equal(get('@keyframes empty{}'), true);
  assert.equal(get('--empty:;'), false);
});
test('CSS emission observations reject a lost input or contradictory rule count', () => {
  const rows = structuredClone(fixture.cssEmissions);
  assert.throws(() => assertCssEmissions(rows.slice(1)));
  rows[0].hasRules = !rows[0].hasRules;
  assert.throws(() => assertCssEmissions(rows));
});

test('Button source owner state stays genuine while Base owns focus changes', () => {
  const [ordinary, authored] = fixture.buttonSourceState;
  assert.deepEqual(ordinary.before.owners, [
    { hasPressed: false, pressed: null, hasFocusVisible: false, focusVisible: null },
  ]);
  assert.deepEqual(ordinary.after.owners, ordinary.before.owners);
  assert.deepEqual(ordinary.after.baseFocus, [false, true]);
  assert.deepEqual(ordinary.before.own, ordinary.after.own);
  assert.deepEqual(authored.before.owners, [
    { hasPressed: true, pressed: true, hasFocusVisible: false, focusVisible: null },
  ]);
  assert.notDeepEqual(authored.before.own, ordinary.before.own);
});

test('original rendered class registration and native target counterparts remain distinct', () => {
  assertClassMembership(fixture.classMembership);
  const rows = fixture.classMembership;
  assert.deepEqual(
    rows.slice(0, 6).map((row) => row.color),
    [
      'rgb(0, 0, 255)',
      'rgb(255, 0, 0)',
      'rgb(0, 0, 255)',
      'rgb(255, 0, 0)',
      'rgb(255, 0, 0)',
      'rgb(255, 0, 0)',
    ],
  );
  assert.deepEqual(
    rows.slice(0, 6).map((row) => row.incomingRetained),
    [true, true, true, false, false, true],
  );
  assert.deepEqual([rows[6].beforeColor, rows[6].afterColor], ['rgb(255, 0, 0)', 'rgb(0, 0, 255)']);
  assert.equal(rows[7].color, 'rgb(0, 0, 255)');
  assert.equal(rows[8].color, 'rgb(0, 0, 255)');
  assert.deepEqual(
    [rows[9].beforeColor, rows[9].registeredColor, rows[9].afterColor],
    ['rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(0, 0, 255)'],
  );
  assert.deepEqual(
    rows
      .slice(10, 13)
      .map((row) => [
        row.tag,
        row.forwardedAs,
        row.factoryCalls,
        Object.keys(row.registered).length,
      ]),
    [
      ['SPAN', null, [], 0],
      ['DIV', 'span', ['as'], 1],
      ['SPAN', null, ['as'], 0],
    ],
  );
  assert.deepEqual(
    [rows[15].tag, rows[15].forwardedAs, Object.keys(rows[15].registered).length],
    ['DIV', 'span', 1],
  );
  assert.deepEqual(rows[16].factoryCalls, ['as']);
  assert.equal(
    rows[16].receivers.every((value) => value === 'undefined'),
    true,
  );
  assert.equal(rows[16].renderCalls.includes('as'), false);
  assert.deepEqual(rows[13].factoryCalls, ['inner:as']);
  assert.deepEqual(rows[13].receivers, [
    'undefined',
    'inner',
    'inner',
    'undefined',
    'inner',
    'undefined',
  ]);
  assert.equal(
    rows[13].renderCalls.some((key) => key.endsWith(':as')),
    false,
  );
  assert.equal(rows[13].css, 'padding:2px;;color:blue;;');
  assert.deepEqual(
    [rows[14].beforeColor, rows[14].afterColor],
    ['rgb(255, 0, 0)', 'rgb(0, 0, 255)'],
  );
});
for (const [name, mutate] of [
  ['missing cases', (rows) => rows.pop()],
  ['missing original CSS', (rows) => (rows[0].calls[0].css = '')],
  ['lost registration dictionary', (rows) => (rows[3].after.b = [])],
  ['missing pending registration', (rows) => (rows[4].incomingRetained = null)],
  ['missing terminal dictionary', (rows) => delete rows[8].registeredBefore],
  ['lost constructor trace', (rows) => (rows[11].factoryCalls = null)],
  ['wrong predicate receiver', (rows) => (rows[13].receivers = ['internal-layer'])],
  ['missing Box reset paint', (rows) => delete rows[14].afterColor],
])
  test('class membership evidence rejects ' + name, () => {
    const rows = structuredClone(fixture.classMembership);
    mutate(rows);
    assert.throws(() => assertClassMembership(rows), /class membership/);
  });
