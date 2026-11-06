// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { run, catalogPackage, component } from './android-popper.mjs';
import {
  inspectTextAlignmentReport,
  summarizeTextAlignment,
  textAlignmentStates,
  textAlignmentPictures,
} from './android-text-alignment-report.mjs';
const frame = (x, y, width, height) => ({ x, y, width, height });
function fixture() {
  const states = textAlignmentStates.map((phase) => {
    const metadata = {
      large: phase.font === 24,
      rtl: phase.rtl,
      childCount: phase.count,
      spacing: 'source',
      inline: false,
      adjusted: false,
      fontScale: 1,
      refs: {},
      receipts: {},
      textFrames: {},
      metrics: {},
      touches: phase.count
        ? { custom: { count: 1, target: 71, pageX: 110, pageY: 440, timestamp: 100 } }
        : {},
    };
    const roots = ['stock', 'custom'].map((key, i) => {
      const height = phase.font * 1.25 * 1.5 + 4 + (key === 'custom' ? 48 : 0);
      const bounds = frame(10, 200 + i * 160, 340, height + 24),
        content = frame(26, bounds.y + 8, 308, height);
      const nativeId = 101 + i,
        contentId = 201 + i,
        refs = { attached: 1, cleaned: 0, sameRoot: true };
      const receipt = { local: frame(0, 0, bounds.width, bounds.height), window: { ...bounds } };
      metadata.refs[key] = refs;
      metadata.receipts[key] = receipt;
      const texts = ['primary', 'small'].map((kind, j) => {
        const authored = phase.font * (kind === 'small' ? 0.5 : 1),
          lineHeight = authored * 1.25;
        const actual = frame(
          content.x,
          content.y + (j ? phase.font * 1.25 + 4 : 0),
          content.width,
          lineHeight,
        );
        metadata.textFrames[`${kind}-${key}`] = frame(
          0,
          j ? phase.font * 1.25 + 4 : 0,
          actual.width,
          actual.height,
        );
        metadata.metrics[`${kind}-${key}`] = [
          { x: 0, y: 0, width: authored * 3, height: lineHeight, capHeight: authored * 0.7 },
        ];
        const advance = authored * 3;
        return {
          id: `details-contract-${kind}-${key}`,
          text:
            kind === 'primary'
              ? key === 'stock'
                ? 'Dock 3.'
                : 'Notes.'
              : key === 'stock'
                ? 'Keep dry.'
                : 'Fragile.',
          nativeId: 301 + i * 2 + j,
          class: 'com.facebook.react.views.text.PreparedLayoutTextView',
          backend: 'prepared-layout',
          bounds: actual,
          direction: phase.rtl ? 'rtl' : 'ltr',
          fontPx: Math.ceil(authored * 3),
          expectedFontPx: Math.ceil(authored * 3),
          lineHeight,
          advance,
          ink: {
            x: phase.rtl ? actual.width - advance : 1,
            y: 2,
            width: advance - 1,
            height: authored * 0.7,
            pixels: 100,
          },
        };
      });
      return {
        key,
        nativeId,
        bounds,
        direction: phase.rtl ? 'rtl' : 'ltr',
        refs,
        receipt,
        contentId,
        content,
        texts,
        screenshot: `${phase.name}-${key}.png`,
        physical: {
          mode: 'descendants',
          parentId: 999,
          parentClass: 'ReactViewGroup',
          rootChildren: 1,
          contentParentId: nativeId,
          contentAncestors: [nativeId, 999],
        },
        textPhysical: {
          mode: 'descendants',
          parentId: nativeId,
          parentClass: 'ReactViewGroup',
          rootChildren: 2,
          primaryParentId: contentId,
          primaryAncestors: [contentId, nativeId, 999],
          smallParentId: contentId,
          smallAncestors: [contentId, nativeId, 999],
        },
      };
    });
    return {
      name: phase.name,
      metadata,
      roots,
      child: { nativeId: 71, text: `MARK ${phase.count}` },
    };
  });
  return {
    schemaVersion: 1,
    scenario: 'text-alignment-v1',
    driver: 'native Instrumentation and UiAutomation',
    status: 'passed',
    artifactDirectory: 'cache/mui-text-alignment-123',
    device: { sdk: 37, model: 'test-emulator', density: 3, fontScale: 1 },
    states,
    stages: textAlignmentStates.map(({ name }) => name),
    screenshots: [...textAlignmentPictures],
  };
}
const output = (report = fixture(), code = -1) =>
  `INSTRUMENTATION_RESULT: textAlignmentReport=${JSON.stringify(report)}\nINSTRUMENTATION_CODE: ${code}\n`;

test('finite native evidence accepts the actual font/frame/ink state, including legacy text and intrinsic x0', () => {
  const report = fixture();
  assert.deepEqual(summarizeTextAlignment(output(report)), report);
  for (const state of report.states)
    for (const root of state.roots)
      for (const text of root.texts) {
        text.class = 'com.facebook.react.views.text.ReactTextView';
        text.backend = 'TextView';
      }
  assert.deepEqual(summarizeTextAlignment(output(report)), report);
});
const failures = [
  [
    'full-frame foreground in LTR cannot count as left-aligned glyphs',
    (r) => {
      const text = r.states[0].roots[0].texts[0];
      text.ink.x = 0;
      text.ink.width = text.bounds.width;
    },
  ],
  [
    'full-frame foreground in RTL cannot count as right-aligned glyphs',
    (r) => {
      const text = r.states[1].roots[0].texts[0];
      text.ink.x = 0;
      text.ink.width = text.bounds.width;
    },
  ],
  [
    'ink beyond native advance cannot count as aligned glyphs',
    (r) => {
      const text = r.states[0].roots[0].texts[0];
      text.ink.x = 0;
      text.ink.width = text.advance + 12;
    },
  ],
  [
    'wrong screenshot glyph edge despite correct RTL flags and fonts',
    (r) => {
      r.states[1].roots[0].texts[0].ink.x = 0;
    },
  ],
  [
    'no painted glyphs',
    (r) => {
      r.states[1].roots[0].texts[0].ink.pixels = 0;
    },
  ],
  [
    'paint outside the actual Text frame',
    (r) => {
      r.states[1].roots[0].texts[0].ink.width = 400;
    },
  ],
  [
    'empty native frame',
    (r) => {
      r.states[0].roots[0].texts[0].bounds.height = 0;
    },
  ],
  [
    'native font did not update',
    (r) => {
      r.states[1].roots[0].texts[0].fontPx = 60;
    },
  ],
  [
    'forged SP expectation',
    (r) => {
      r.states[1].roots[0].texts[0].expectedFontPx = 60;
    },
  ],
  [
    'native unitless line height did not update',
    (r) => {
      r.states[1].roots[0].texts[1].lineHeight = 12.5;
    },
  ],
  [
    'stale native line receipt',
    (r) => {
      r.states[1].metadata.metrics['primary-stock'][0].height = 25;
    },
  ],
  [
    'stale native text frame receipt',
    (r) => {
      r.states[1].metadata.textFrames['primary-stock'].height = 25;
    },
  ],
  [
    'stale root window measurement',
    (r) => {
      r.states[1].metadata.receipts.stock.window.width = 200;
    },
  ],
  [
    'wrong physical direction',
    (r) => {
      r.states[1].roots[0].texts[0].direction = 'ltr';
    },
  ],
  [
    'replaced host',
    (r) => {
      r.states[1].roots[0].nativeId = 500;
    },
  ],
  [
    'replaced Text',
    (r) => {
      r.states[1].roots[0].texts[0].nativeId = 500;
    },
  ],
  [
    'ref cleanup',
    (r) => {
      r.states[1].metadata.refs.stock.cleaned = 1;
    },
  ],
  [
    'sameRoot false',
    (r) => {
      r.states[1].metadata.refs.stock.sameRoot = false;
    },
  ],
  [
    'wrong source label',
    (r) => {
      r.states[1].roots[0].texts[0].text = 'Unrelated';
    },
  ],
  [
    'wrong source ID',
    (r) => {
      r.states[1].roots[0].texts[0].id = 'unrelated';
    },
  ],
  [
    'unsupported public text backend',
    (r) => {
      r.states[1].roots[0].texts[0].backend = 'unknown';
    },
  ],
  [
    'missing physical ancestry',
    (r) => {
      r.states[1].roots[0].textPhysical.primaryAncestors = [];
    },
  ],
  [
    'child escaped physical root',
    (r) => {
      r.states[1].roots[0].texts[0].bounds.x = 0;
    },
  ],
  [
    'JS state changed without native counter',
    (r) => {
      r.states[1].child.text = 'MARK 0';
    },
  ],
  [
    'native child replaced',
    (r) => {
      r.states[1].child.nativeId = 500;
    },
  ],
  [
    'no actual native touch receipt',
    (r) => {
      r.states[1].metadata.touches = {};
    },
  ],
  [
    'OS enlargement sneaks into baseline proof',
    (r) => {
      r.device.fontScale = 2;
    },
  ],
  [
    'incomplete stages',
    (r) => {
      r.stages.pop();
    },
  ],
  [
    'missing screenshot',
    (r) => {
      r.screenshots.pop();
    },
  ],
  [
    'reordered roots',
    (r) => {
      r.states[1].roots.reverse();
    },
  ],
  [
    'native failure',
    (r) => {
      r.status = 'failed';
      r.error = 'failed native assertion';
    },
  ],
];
for (const [name, corrupt] of failures)
  test('rejects ' + name, () => {
    const report = fixture();
    corrupt(report);
    assert.throws(() => summarizeTextAlignment(output(report)));
  });
test('diagnostics reject ambiguous/unsafe artifact paths and failed instrumentation', () => {
  for (const value of [
    '',
    output() + output(),
    output(fixture(), 0),
    output() + 'INSTRUMENTATION_FAILED: aborted\n',
  ])
    assert.throws(() => summarizeTextAlignment(value));
  for (const change of [
    (r) => {
      r.artifactDirectory = '../../foreign';
    },
    (r) => {
      r.screenshots = ['../foreign.png'];
    },
    (r) => {
      r.screenshots.push(r.screenshots[0]);
    },
  ]) {
    const report = fixture();
    change(report);
    assert.throws(() => inspectTextAlignmentReport(output(report)));
  }
  const failed = {
    ...fixture(),
    status: 'failed',
    error: 'Native assertion',
    states: [],
    stages: [],
    screenshots: ['failure.png'],
  };
  assert.deepEqual(inspectTextAlignmentReport(output(failed, 0)), failed);
});

test('runner routes the explicit emulator scenario, pulls real artifacts and restores only the catalog', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-android-alignment-run-')),
    calls = [];
  try {
    const report = await run(
      { adb: 'adb', serial: 'emulator-5554', output: directory, scenario: 'text-alignment' },
      async (_, args) => {
        calls.push(args);
        if (args.includes('get-state')) return 'device';
        if (args.includes('instrument')) return output();
        if (args.includes('exec-out')) return Buffer.from('native-png');
        return '';
      },
    );
    assert.equal(report.scenario, 'text-alignment-v1');
    assert(
      calls.some(
        (args) =>
          args.includes('instrument') &&
          args.includes('text-alignment') &&
          args.at(-1) === component,
      ),
    );
    assert.equal(calls.filter((args) => args.includes('exec-out')).length, 6);
    assert(calls.every((args) => args[0] === '-s' && args[1] === 'emulator-5554'));
    assert(
      calls.some(
        (args) => args.includes('start') && args.includes(catalogPackage + '/.MainActivity'),
      ),
    );
    assert.equal(
      JSON.parse(await readFile(join(directory, 'report.json'), 'utf8')).states.length,
      3,
    );
    assert.equal(await readFile(join(directory, textAlignmentPictures[0]), 'utf8'), 'native-png');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('alignment mode rejects physical or inferred device selection before calling adb', async () => {
  for (const serial of [undefined, '', 'physical-example', 'emulator-5556']) {
    let calls = 0;
    await assert.rejects(
      run({ adb: 'adb', serial, output: '/unused', scenario: 'text-alignment' }, async () => {
        calls++;
      }),
    );
    assert.equal(calls, 0);
  }
});
test('real CLI prepare writes the maintained alignment mode and dispatcher without overwriting edited generated source', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mui-android-alignment-prepare-'));
  const execute = promisify(execFile);
  try {
    await mkdir(join(directory, 'app'), { recursive: true });
    await writeFile(
      join(directory, 'app/build.gradle'),
      `android { defaultConfig { applicationId '${catalogPackage}' } }\n`,
    );
    const cli = fileURLToPath(new URL('./android-popper.mjs', import.meta.url));
    const { stdout } = await execute(process.execPath, [cli, 'prepare', '--project', '.'], {
      cwd: directory,
      timeout: 10000,
    });
    const prepared = JSON.parse(stdout),
      source = join(
        directory,
        'app/src/androidTest/java/dev/altroo/muinative/catalog/test/LayoutRootScenario.java',
      );
    const java = await readFile(source, 'utf8');
    assert.equal(
      java,
      await readFile(
        new URL('../../tests/native/android/LayoutRootScenario.java', import.meta.url),
        'utf8',
      ),
    );
    assert.match(java, /public static void runTextAlignment/);
    assert.match(java, /takeScreenshot|capture\(picture\)/);
    assert.match(
      await readFile(prepared.source, 'utf8'),
      /LayoutRootScenario\.runTextAlignment\(this\)/,
    );
    await writeFile(source, java + '\n// contributor edit\n');
    await assert.rejects(
      execute(process.execPath, [cli, 'prepare', '--project', '.'], {
        cwd: directory,
        timeout: 10000,
      }),
      /Preserve edits/,
    );
    assert.match(await readFile(source, 'utf8'), /contributor edit/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
