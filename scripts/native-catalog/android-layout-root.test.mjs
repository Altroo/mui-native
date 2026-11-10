// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { prepareLayoutRootSource } from './android-layout-root-source.mjs';
import {
  inspectLayoutRootReport,
  summarizeLayoutRoots,
  layoutRootStates,
  layoutRootStages,
  layoutRootPictures,
} from './android-layout-root-report.mjs';
import { run, catalogPackage, component } from './android-popper.mjs';

const rectangle = (x, y, width, height) => ({ x, y, width, height });
function report() {
  const states = layoutRootStates.map((expected) => {
    const group = expected.kind === 'group';
    const keys = group
      ? ['inherited', 'own-false', 'custom', 'styled']
      : ['native', 'custom', 'portal'];
    const metadata = group
      ? {
          schemaVersion: 1,
          row: expected.row,
          parentError: expected.parentError,
          themed: expected.themed,
          rtl: expected.rtl,
          fontSize: expected.fontSize,
          fontScale: 1,
          receipts: {},
          refs: {},
        }
      : {
          top: expected.top,
          rtl: expected.rtl,
          customStyle: expected.customStyle,
          fontScale: 1,
          receipts: {},
        };
    const roots = keys.map((key, i) => {
      const width = group ? 300 : expected.customStyle ? 64 : 56;
      const row = rectangle(10, 200 + i * 130, 320, 80);
      const bounds = group
        ? rectangle(10, 200 + i * 130, width, expected.row ? 40 : 100)
        : rectangle(
            expected.rtl ? 330 - width : 10,
            row.y + (expected.top ? (expected.customStyle ? 20 : 16) : key === 'custom' ? 18 : 20),
            width,
            key === 'custom' ? 44 : 40,
          );
      const receipt = {
        local: rectangle(0, 0, bounds.width, bounds.height),
        window: { ...bounds },
      };
      metadata.receipts[key] = receipt;
      const root = {
        key,
        nativeId: (group ? 100 : 200) + i,
        bounds,
        receipt,
        direction: expected.rtl ? 'rtl' : 'ltr',
        count: key === 'custom' ? expected.count : 0,
      };
      if (group) {
        metadata.refs[key] = { attached: 1, cleaned: 0 };
        Object.assign(root, {
          refs: metadata.refs[key],
          physical: {
            mode: 'descendants',
            parentId: 999,
            parentClass: 'com.facebook.react.views.view.ReactViewGroup',
            rootChildren: 3,
            literalParentId: root.nativeId,
            actionParentId: root.nativeId,
            textParentId: root.nativeId,
            literalAncestors: [root.nativeId, 999],
            actionAncestors: [root.nativeId, 999],
            textAncestors: [root.nativeId, 999],
          },
          textClass: 'com.facebook.react.views.text.PreparedLayoutTextView',
          textBackend: 'prepared-layout',
          textLayoutClass: 'android.text.StaticLayout',
          textLines: 1,
          literalTextClass: 'com.facebook.react.views.text.PreparedLayoutTextView',
          literalTextBackend: 'prepared-layout',
          actionTextClass: 'com.facebook.react.views.text.PreparedLayoutTextView',
          actionTextBackend: 'prepared-layout',
          literal: rectangle(
            expected.row && expected.rtl ? 200 : 11,
            bounds.y + 1,
            expected.row ? 100 : 298,
            22,
          ),
          action: rectangle(
            expected.row ? 112 : 11,
            bounds.y + (expected.row ? 1 : 23),
            expected.row ? 80 : 298,
            36,
          ),
          text: rectangle(
            expected.row ? (expected.rtl ? 11 : 210) : 11,
            bounds.y + (expected.row ? 1 : 59),
            90,
            18,
          ),
          unwrappedFitWidth: 200,
          fontPx: Math.ceil(expected.fontSize * 0.8 * 2),
          expectedFontPx: Math.ceil(expected.fontSize * 0.8 * 2),
          textColor:
            expected.parentError && key !== 'own-false'
              ? 0xffd32f2f
              : expected.themed
                ? 0xff505050
                : 0xff101010,
          borderColor: expected.parentError && key !== 'own-false' ? 0xffd32f2f : 0xffbbbbbb,
          borderWidth: expected.themed ? 2 : 1,
          borderRightWidth: key === 'styled' && expected.row ? 4 : null,
          alpha: key === 'styled' && expected.parentError ? 0.6 : 1,
        });
      } else
        Object.assign(root, {
          row,
          rowNativeId: 300 + i,
          rowClass: 'com.facebook.react.views.view.ReactViewGroup',
          rowPhysical: {
            mode: 'descendants',
            parentId: 998,
            parentClass: 'com.facebook.react.views.view.ReactViewGroup',
            rootChildren: 2,
            avatarParentId: 300 + i,
            primaryParentId: 300 + i,
            avatarAncestors: [300 + i, 998],
            primaryAncestors: [300 + i, 998],
          },
          primary: rectangle(expected.rtl ? 20 : 90, row.y + 8, 180, 20),
          primaryTextClass: 'com.facebook.react.views.text.PreparedLayoutTextView',
          primaryTextBackend: 'prepared-layout',
          rowDirection: expected.rtl ? 'rtl' : 'ltr',
          inScroll: key !== 'portal',
          sameWindow: true,
        });
      return root;
    });
    return {
      name: expected.name,
      metadata,
      roots,
      ...(!group
        ? {
            counterTextClass: 'com.facebook.react.views.text.PreparedLayoutTextView',
            counterTextBackend: 'prepared-layout',
          }
        : {}),
    };
  });
  return {
    schemaVersion: 1,
    scenario: 'layout-roots-v1',
    driver: 'native Instrumentation and UiAutomation',
    status: 'passed',
    artifactDirectory: 'cache/mui-layout-roots-123',
    device: { sdk: 37, model: 'test-emulator', density: 2, fontScale: 1 },
    stages: [...layoutRootStages],
    screenshots: [...layoutRootPictures],
    states,
  };
}
const output = (value, code = -1) =>
  'INSTRUMENTATION_RESULT: layoutRootReport=' +
  JSON.stringify(value) +
  '\nINSTRUMENTATION_CODE: ' +
  code +
  '\n';

test('complete wrapper collection requires native geometry, state, refs and glyph evidence', () => {
  const complete = report();
  assert.deepEqual(summarizeLayoutRoots(output(complete)), complete);
  for (const raw of [
    '',
    output(complete) + output(complete),
    output(complete, 0),
    output(complete) + 'INSTRUMENTATION_FAILED: aborted\n',
  ])
    assert.throws(() => summarizeLayoutRoots(raw));
});
const corruptions = [
  [
    'restored foreground is stale',
    (r) => {
      for (const root of r.states[7].roots) root.textColor = 0xff505050;
    },
  ],
  [
    'restored border is stale',
    (r) => {
      for (const root of r.states[7].roots) root.borderColor = 0xff111111;
    },
  ],
  [
    'custom badge loses its native touch height',
    (r) => {
      r.states[8].roots[1].bounds.height = 40;
      r.states[8].roots[1].receipt.local.height = r.states[8].roots[1].receipt.window.height = 40;
    },
  ],
  ['missing phase', (r) => r.states.pop()],
  ['reordered stage', (r) => r.stages.reverse()],
  ['missing screenshot', (r) => r.screenshots.pop()],
  [
    'wrong live flag',
    (r) => {
      r.states[5].metadata.rtl = false;
    },
  ],
  [
    'wrong native direction',
    (r) => {
      r.states[5].roots[0].direction = 'ltr';
    },
  ],
  [
    'remounted actual host',
    (r) => {
      r.states[1].roots[2].nativeId += 50;
    },
  ],
  [
    'duplicate native host',
    (r) => {
      r.states[0].roots[1].nativeId = r.states[0].roots[0].nativeId;
    },
  ],
  [
    'stale local dimensions',
    (r) => {
      r.states[2].metadata.receipts.custom.local.height += 10;
    },
  ],
  [
    'stale window dimensions',
    (r) => {
      r.states[2].metadata.receipts.custom.window.width += 10;
    },
  ],
  [
    'wrong receipt association',
    (r) => {
      r.states[2].roots[2].receipt = r.states[2].roots[0].receipt;
    },
  ],
  [
    'ref detached',
    (r) => {
      r.states[2].metadata.refs.custom.cleaned = 1;
    },
  ],
  [
    'ref reattached',
    (r) => {
      r.states[2].metadata.refs.custom.attached = 2;
    },
  ],
  [
    'counter reset',
    (r) => {
      r.states[7].roots[2].count = 0;
    },
  ],
  [
    'row not physically reordered',
    (r) => {
      r.states[5].roots[0].literal.x = 0;
    },
  ],
  [
    'column not physically stacked',
    (r) => {
      r.states[0].roots[0].action.y = 0;
    },
  ],
  [
    'wrong native glyph size',
    (r) => {
      r.states[6].roots[0].fontPx = 1;
    },
  ],
  [
    'wrong actual OS scale',
    (r) => {
      r.states[0].metadata.fontScale = 2;
    },
  ],
  [
    'wrong inherited error',
    (r) => {
      r.states[3].roots[0].textColor = r.states[3].roots[1].textColor;
    },
  ],
  [
    'wrong native theme border',
    (r) => {
      r.states[4].roots[0].borderWidth = 1;
    },
  ],
  [
    'missing wrapped state selector',
    (r) => {
      r.states[4].roots[3].borderRightWidth = 1;
    },
  ],
  [
    'wrong native error opacity',
    (r) => {
      r.states[4].roots[3].alpha = 1;
    },
  ],
  [
    'theme foreground never updated',
    (r) => {
      r.states[4].roots[1].textColor = r.states[3].roots[1].textColor;
    },
  ],
  [
    'Avatar min width did not update',
    (r) => {
      r.states[11].roots[0].bounds.width = 56;
    },
  ],
  [
    'Avatar top margin did not update',
    (r) => {
      r.states[11].roots[0].bounds.y += 4;
    },
  ],
  [
    'Avatar centered incorrectly',
    (r) => {
      r.states[8].roots[0].bounds.y += 4;
    },
  ],
  [
    'Avatar order did not mirror',
    (r) => {
      r.states[12].roots[0].primary.x = 500;
    },
  ],
  [
    'Portal remained in logical scroll parent',
    (r) => {
      r.states[8].roots[2].inScroll = true;
    },
  ],
  [
    'Portal moved to another native window',
    (r) => {
      r.states[8].roots[2].sameWindow = false;
    },
  ],
];
for (const [name, corrupt] of corruptions)
  test('rejects ' + name, () => {
    const value = report();
    corrupt(value);
    assert.throws(() => summarizeLayoutRoots(output(value)));
  });

test('native wrapping is accepted only when measured glyph/padding fit cannot require one row', () => {
  const value = report();
  for (const root of value.states[2].roots) {
    root.unwrappedFitWidth = 400;
    root.bounds.height = 100;
    root.receipt.local.height = root.receipt.window.height = 100;
    root.action.y = root.literal.y + root.literal.height;
    root.text.y = root.action.y + root.action.height;
  }
  assert.deepEqual(summarizeLayoutRoots(output(value)), value);
  value.states[2].roots[0].unwrappedFitWidth = 200;
  assert.throws(() => summarizeLayoutRoots(output(value)));
});

test('window origins remain diagnostics when a retained native wrapper scrolls', () => {
  const value = report();
  for (const state of value.states)
    for (const root of state.roots) {
      root.receipt.window.x -= 10;
      root.receipt.window.y -= 100;
    }
  assert.deepEqual(summarizeLayoutRoots(output(value)), value);
});
test('failed runs retain safe metadata without passing or accepting path injection', () => {
  const failed = {
    ...report(),
    status: 'failed',
    error: 'Native assertion',
    screenshots: ['failure.png'],
    stages: [],
    states: [],
  };
  assert.deepEqual(inspectLayoutRootReport(output(failed)), failed);
  assert.throws(() => summarizeLayoutRoots(output(failed)));
  for (const patch of [
    { artifactDirectory: '../../private' },
    { artifactDirectory: ['cache/mui-layout-roots-123'] },
    { screenshots: ['../private.png'] },
    { screenshots: ['failure.png', 'failure.png'] },
    { device: { sdk: 37, model: 'test', density: 2, fontScale: 0 } },
  ])
    assert.throws(() => inspectLayoutRootReport(output({ ...failed, ...patch })));
});

test('source preparation is repeatable and preserves both manual edits and unowned files', async () => {
  const project = await mkdtemp(join(tmpdir(), 'mui-layout-root-source-'));
  try {
    const source = await prepareLayoutRootSource(project);
    const original = await readFile(source, 'utf8');
    assert.equal(await prepareLayoutRootSource(project), source);
    const ownership = join(project, '.mui-native-layout-roots-instrumentation.json');
    assert.equal(
      JSON.parse(await readFile(ownership, 'utf8')).sourceSha256,
      createHash('sha256').update(original).digest('hex'),
    );
    await writeFile(source, original + '\n// contributor edit\n');
    await assert.rejects(prepareLayoutRootSource(project), /Preserve edits/);
    assert.match(await readFile(source, 'utf8'), /contributor edit/);
    await rm(ownership);
    await assert.rejects(prepareLayoutRootSource(project), /Preserve edits/);
    assert.match(await readFile(source, 'utf8'), /contributor edit/);
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});

test('collector uses only the selected emulator, retains artifacts and restores only the catalog', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-layout-root-run-')),
    calls = [],
    complete = { ...report(), fontProfile: 'normal' };
  try {
    const execute = async (_binary, args) => {
      calls.push(args);
      if (args.includes('get-state')) return 'device';
      if (args.includes('instrument')) return output(complete);
      if (args.includes('exec-out')) return Buffer.from('native-png');
      if (args.includes('start')) return 'Starting';
      throw Error('Unexpected command ' + args.join(' '));
    };
    assert.deepEqual(
      await run(
        {
          adb: 'adb',
          serial: 'emulator-5554',
          output: directory,
          scenario: 'layout-roots',
          fontProfile: 'normal',
        },
        execute,
      ),
      complete,
    );
    assert(calls.every((args) => args[0] === '-s' && args[1] === 'emulator-5554'));
    assert.deepEqual(calls[1].slice(2), [
      'shell',
      'am',
      'instrument',
      '-w',
      '-r',
      '-e',
      'scenario',
      'layout-roots',
      '-e',
      'fontProfile',
      'normal',
      component,
    ]);
    assert(
      calls
        .filter((args) => args.includes('exec-out'))
        .every(
          (args) =>
            args.slice(3, 6).join(' ') === 'run-as ' + catalogPackage + ' cat' &&
            /^cache\/mui-layout-roots-123\/[a-z-]+\.png$/.test(args[6]),
        ),
    );
    assert.deepEqual(calls.at(-1).slice(2), [
      'shell',
      'am',
      'start',
      '-n',
      catalogPackage + '/.MainActivity',
    ]);
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'report.json'), 'utf8')), complete);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('a native assertion retains its failure image before existing stop/restore handling', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-layout-root-failure-')),
    calls = [];
  try {
    const failed = {
      ...report(),
      status: 'failed',
      error: 'Actual Portal parent differs',
      screenshots: ['failure.png'],
      stages: [],
      states: [],
    };
    await assert.rejects(
      run(
        {
          adb: 'adb',
          serial: 'emulator-5554',
          output: directory,
          scenario: 'layout-roots',
          fontProfile: 'normal',
        },
        async (_binary, args) => {
          calls.push(args);
          if (args.includes('get-state')) return 'device';
          if (args.includes('instrument')) return output(failed, 0);
          if (args.includes('exec-out')) return Buffer.from('failure-image');
          if (args.includes('ps')) return 'NAME\n';
          return 'Catalog';
        },
      ),
    );
    assert.equal(await readFile(join(directory, 'failure.png'), 'utf8'), 'failure-image');
    assert(
      calls.findIndex((args) => args.includes('force-stop')) >
        calls.findIndex((args) => args.includes('exec-out')),
    );
    assert(calls.at(-1).includes('start'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('failed native phase diagnostics preserve their nested cause as a scalar', () => {
  const error =
    'java.lang.AssertionError: Native state did not settle: group-initial <- caused by java.lang.AssertionError: Native themed Group border differs: inherited allWidthDip=null expectedDip=1';
  const failed = {
    ...report(),
    status: 'failed',
    error,
    screenshots: ['failure.png'],
    stages: [],
    states: [],
  };
  const retained = inspectLayoutRootReport(output(failed, 0));
  assert.equal(typeof retained.error, 'string');
  assert.equal(retained.error, error);
  assert.throws(() => summarizeLayoutRoots(output(failed, 0)));
});

test('native text evidence accepts legacy TextView and prepared-layout backends without synthesized paint', () => {
  const value = report();
  for (const state of value.states) {
    if (state.counterTextBackend) {
      state.counterTextBackend = 'TextView';
      state.counterTextClass = 'com.facebook.react.views.text.ReactTextView';
    }
    for (const root of state.roots)
      for (const prefix of ['text', 'literalText', 'actionText', 'primaryText']) {
        if (root[prefix + 'Backend']) {
          root[prefix + 'Backend'] = 'TextView';
          root[prefix + 'Class'] = 'com.facebook.react.views.text.ReactTextView';
        }
      }
  }
  assert.deepEqual(summarizeLayoutRoots(output(value)), value);
});
for (const [name, corrupt] of [
  [
    'unknown glyph backend',
    (r) => {
      r.states[0].roots[0].textBackend = 'fabricated';
    },
  ],
  [
    'prepared-layout class mismatch',
    (r) => {
      r.states[0].roots[0].textClass = 'android.view.ViewGroup';
    },
  ],
  [
    'missing rendered Layout',
    (r) => {
      r.states[0].roots[0].textLayoutClass = '';
    },
  ],
  [
    'empty native Layout',
    (r) => {
      r.states[0].roots[0].textLines = 0;
    },
  ],
  [
    'unreadable badge backend',
    (r) => {
      r.states[8].counterTextBackend = 'unknown';
    },
  ],
  [
    'missing primary text backend',
    (r) => {
      delete r.states[8].roots[0].primaryTextBackend;
    },
  ],
])
  test('rejects ' + name, () => {
    const value = report();
    corrupt(value);
    assert.throws(() => summarizeLayoutRoots(output(value)));
  });
test('unreadable native text retains class/backend subtree diagnostics and fails completion', () => {
  const value = {
    ...report(),
    status: 'failed',
    error: 'Native state did not settle: group-initial <- Public native text getter failed',
    nativeTextDiagnostic:
      '0:com.facebook.react.views.text.PreparedLayoutTextView backend=prepared-layout <public text getter failed>',
    screenshots: ['failure.png'],
    stages: [],
    states: [],
  };
  assert.equal(
    inspectLayoutRootReport(output(value, 0)).nativeTextDiagnostic,
    value.nativeTextDiagnostic,
  );
  assert.throws(() => summarizeLayoutRoots(output(value, 0)));
});

test('painted Group roots may own flattened siblings only under the same immediate native parent', () => {
  const value = report();
  for (const state of value.states.slice(0, 8))
    for (const root of state.roots) {
      if (root.alpha !== 1) continue;
      root.physical.mode = 'flattened-siblings';
      root.physical.rootChildren = 0;
      for (const prefix of ['literal', 'action', 'text']) {
        root.physical[prefix + 'ParentId'] = 999;
        root.physical[prefix + 'Ancestors'] = [999];
      }
    }
  assert.deepEqual(summarizeLayoutRoots(output(value)), value);
  value.states[0].roots[0].physical.literalParentId = 998;
  value.states[0].roots[0].physical.literalAncestors = [998];
  assert.throws(() => summarizeLayoutRoots(output(value)));
});
for (const [name, corrupt] of [
  [
    'unanchored child ancestor',
    (r) => {
      r.states[0].roots[0].physical.literalAncestors = [888];
      r.states[0].roots[0].physical.literalParentId = 888;
    },
  ],
  [
    'descendant claim with empty native root',
    (r) => {
      r.states[0].roots[0].physical.rootChildren = 0;
    },
  ],
  [
    'child frame outside owning root',
    (r) => {
      r.states[0].roots[0].literal.x -= 10;
    },
  ],
  [
    'missing physical relation',
    (r) => {
      delete r.states[0].roots[0].physical;
    },
  ],
])
  test('rejects ' + name, () => {
    const value = report();
    corrupt(value);
    assert.throws(() => summarizeLayoutRoots(output(value)));
  });

test('Avatar row reserves its measured frame while avatar and exact primary are native flattened siblings', () => {
  const value = report();
  for (const state of value.states.slice(8))
    for (const root of state.roots) {
      root.rowPhysical.mode = 'flattened-siblings';
      root.rowPhysical.rootChildren = 0;
      for (const prefix of ['avatar', 'primary']) {
        root.rowPhysical[prefix + 'ParentId'] = 998;
        root.rowPhysical[prefix + 'Ancestors'] = [998];
      }
    }
  assert.deepEqual(summarizeLayoutRoots(output(value)), value);
  value.states[8].roots[0].rowPhysical.primaryParentId = 997;
  value.states[8].roots[0].rowPhysical.primaryAncestors = [997];
  assert.throws(() => summarizeLayoutRoots(output(value)));
});
for (const [name, corrupt] of [
  [
    'Avatar primary outside the actual row',
    (r) => {
      r.states[8].roots[0].primary.x += 400;
    },
  ],
  [
    'Avatar reservation outside the actual row',
    (r) => {
      r.states[8].roots[0].bounds.y += 400;
    },
  ],
  [
    'missing Avatar row native relation',
    (r) => {
      delete r.states[8].roots[0].rowPhysical;
    },
  ],
  [
    'Avatar row descendant claim without native ancestry',
    (r) => {
      r.states[8].roots[0].rowPhysical.avatarAncestors = [999];
      r.states[8].roots[0].rowPhysical.avatarParentId = 999;
    },
  ],
])
  test('rejects ' + name, () => {
    const value = report();
    corrupt(value);
    assert.throws(() => summarizeLayoutRoots(output(value)));
  });

test('an explicitly requested profile cannot be satisfied by unlabeled or mismatched evidence', () => {
  const legacy = report();
  assert.deepEqual(summarizeLayoutRoots(output(legacy)), legacy);
  assert.throws(
    () => summarizeLayoutRoots(output(legacy), { fontProfile: 'normal' }),
    /font profile/,
  );
  const normal = { ...report(), fontProfile: 'normal' };
  assert.deepEqual(summarizeLayoutRoots(output(normal), { fontProfile: 'normal' }), normal);
  assert.throws(
    () => summarizeLayoutRoots(output(normal), { fontProfile: 'enlarged' }),
    /font profile/,
  );
  const enlarged = structuredClone(normal);
  enlarged.fontProfile = 'enlarged';
  enlarged.device.fontScale = 2;
  for (const state of enlarged.states) state.metadata.fontScale = 2;
  assert.deepEqual(summarizeLayoutRoots(output(enlarged), { fontProfile: 'enlarged' }), enlarged);
  const stale = structuredClone(enlarged);
  stale.device.fontScale = 1;
  for (const state of stale.states) state.metadata.fontScale = 1;
  assert.throws(
    () => summarizeLayoutRoots(output(stale), { fontProfile: 'enlarged' }),
    /font profile/,
  );
  assert.throws(
    () => summarizeLayoutRoots(output(enlarged), { fontProfile: 'huge' }),
    /font profile/,
  );
});

test('layout-root runner rejects missing or invalid font profiles before contacting a device', async () => {
  for (const fontProfile of [undefined, 'huge']) {
    await assert.rejects(
      run(
        {
          adb: 'adb',
          serial: 'emulator-5554',
          output: 'unused',
          scenario: 'layout-roots',
          fontProfile,
        },
        () => {
          throw Error('Must not contact a device');
        },
      ),
      /Layout root checks require an explicit normal\/enlarged font profile/,
    );
  }
});

test('wrapped row classification ignores float residue but still rejects a real pixel overlap', () => {
  for (const name of ['group-row', 'group-text']) {
    const value = report();
    const state = value.states.find((entry) => entry.name === name);
    const root = state.roots[0];
    root.bounds.height = root.receipt.local.height = root.receipt.window.height = 100;
    root.literal = rectangle(20, root.bounds.y + 1, 80, 22);
    root.action = rectangle(
      20,
      root.literal.y + root.literal.height - 0.00005 / value.device.density,
      80,
      36,
    );
    root.unwrappedFitWidth = root.bounds.width + 1;
    assert.deepEqual(summarizeLayoutRoots(output(value)), value);
    const actualOverlap = structuredClone(value);
    const bad = actualOverlap.states.find((entry) => entry.name === name).roots[0];
    bad.action.y = bad.literal.y + bad.literal.height - 1 / actualOverlap.device.density;
    assert.throws(() => summarizeLayoutRoots(output(actualOverlap)), /physical row ordering/);
  }
});
