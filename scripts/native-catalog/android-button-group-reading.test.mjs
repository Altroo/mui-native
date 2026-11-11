// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readingPhases,
  readingPictures,
  inspectReadingReport,
  summarizeReadingReport,
} from './android-button-group-reading-report.mjs';
const box = (x, y, width, height) => ({ x, y, width, height });
function complete(globalRTL = false, fontScale = 1) {
  return {
    schemaVersion: 3,
    scenario: 'button-group-reading-v3',
    driver: 'native Instrumentation and UiAutomation',
    artifactDirectory: 'cache/mui-button-group-reading-123',
    expectedGlobalRTL: globalRTL,
    device: { sdk: 37, model: 'test-device', fontScale, density: 2 },
    status: 'passed',
    screenshots: readingPictures,
    states: readingPhases.map((phase, stateIndex) => {
      const rtl = stateIndex === 1 || stateIndex === 2,
        vertical = stateIndex === 2 || stateIndex === 3;
      const height = fontScale > 1 ? 64 : 44;
      const actions = [0, 1, 2].map((index) => {
        const x = vertical ? 0 : (rtl ? 2 - index : index) * 99,
          y = vertical ? index * (height - 1) : 0;
        const fontPx =
          fontScale === 1 ? 28 : stateIndex === 5 ? 48 : index === 1 ? 28 : index === 2 ? 34 : 48;
        return {
          index,
          count: index === 0 || stateIndex >= 5 ? 1 : 0,
          paint: {
            direction: rtl ? 'rtl' : 'ltr',
            drawableDirection: rtl ? 'rtl' : 'ltr',
            drawableClass: 'com.facebook.react.uimanager.drawable.BorderDrawable',
            rawCorners: {},
            cornerAlpha: Object.fromEntries(
              ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map((name, cornerIndex) => {
                const outer = vertical
                  ? cornerIndex < 2
                    ? index === 0
                    : index === 2
                  : cornerIndex % 2 === 0
                    ? index === (rtl ? 2 : 0)
                    : index === (rtl ? 0 : 2);
                return [name, outer ? 0 : 100];
              }),
            ),
            corners: Object.fromEntries(
              ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map((name, cornerIndex) => {
                const outer = vertical
                  ? cornerIndex < 2
                    ? index === 0
                    : index === 2
                  : cornerIndex % 2 === 0
                    ? index === (rtl ? 2 : 0)
                    : index === (rtl ? 0 : 2);
                return [name, { x: outer ? 10 : 0, y: outer ? 10 : 0 }];
              }),
            ),
          },
          bounds: box(x, y, vertical ? 298 : 100, height),
          label: box(x + 4, y + 4, 70, height - 8),
          fontPx,
          expectedFontPx: fontPx,
          lineCount: 1,
          lines: [{ left: 0, right: 65, width: 65, top: 0, bottom: height - 10, ellipsis: 0 }],
        };
      });
      return {
        phase,
        direction: rtl ? 'rtl' : 'ltr',
        orientation: vertical ? 'vertical' : 'horizontal',
        count: 1,
        root: box(0, 0, 298, vertical ? height * 3 - 2 : height),
        container: box(0, 0, 298, 900),
        actions,
        metadata: {
          schemaVersion: 1,
          globalRTL,
          leftRightSwap: true,
          fontScale,
          direction: rtl ? 'rtl' : 'ltr',
          orientation: vertical ? 'vertical' : 'horizontal',
          followSystem: stateIndex === 5,
          uncapped: stateIndex === 5,
          metrics: Object.fromEntries(
            actions.map(({ index }) => [
              String(index),
              [
                {
                  text: `${['Save', 'Review', 'Send'][index]} ${index === 0 || stateIndex >= 5 ? 1 : 0}`,
                  x: 0,
                  y: 0,
                  width: 65,
                  height: height - 10,
                  capHeight: 10,
                },
              ],
            ]),
          ),
        },
      };
    }),
    mixed: {
      count: 1,
      root: box(0, 0, 220, 90),
      first: box(4, 4, 80, 40),
      last: box(4, 45, 120, 40),
    },
    portal: {
      text: 'Independent window text',
      fontPx: 28,
      expectedFontPx: 28,
      bounds: box(16, 300, 280, 60),
    },
  };
}
const output = (data) =>
  `INSTRUMENTATION_RESULT: buttonGroupReadingReport=${JSON.stringify(data)}\nINSTRUMENTATION_CODE: -1\n`;
test('reading collector requires both actual global profiles and real baseline/large glyph evidence', () => {
  for (const globalRTL of [false, true])
    for (const scale of [1, 2]) {
      const data = complete(globalRTL, scale);
      assert.deepEqual(summarizeReadingReport(output(data), { globalRTL }), data);
      assert.throws(() => summarizeReadingReport(output(data), { globalRTL: !globalRTL }));
    }
});
test('missing, forged, clipped and stale native reading receipts cannot pass', () => {
  const changes = [
    (x) => {
      x.schemaVersion = 2;
    },
    (x) => {
      delete x.states[1].actions[0].paint.cornerAlpha;
    },
    (x) => {
      // Correct reconstructed styles cannot excuse an old, reversed drawing path.
      x.states[1].actions[0].paint.cornerAlpha.topLeft = 0;
      x.states[1].actions[0].paint.cornerAlpha.topRight = 100;
    },
    (x) => {
      x.states[1].actions[0].paint.drawableClass = 'other';
    },
    (x) => {
      x.states[1].actions[0].paint.corners.topLeft.x = 10;
    },
    (x) => {
      delete x.states[1].actions[0].paint;
    },
    (x) => {
      x.states.pop();
    },
    (x) => {
      x.screenshots.pop();
    },
    (x) => {
      x.artifactDirectory = '../../private';
    },
    (x) => {
      x.states[1].metadata.globalRTL = true;
    },
    (x) => {
      x.states[1].metadata.direction = 'ltr';
    },
    (x) => {
      x.states[2].count = 0;
    },
    (x) => {
      x.states[0].actions[0].label.width = 200;
    },
    (x) => {
      x.states[0].actions[0].lines[0].ellipsis = 1;
    },
    (x) => {
      x.states[0].actions[0].lines[0].bottom = 100;
    },
    (x) => {
      x.states[0].actions[1].fontPx = 50;
    },
    (x) => {
      x.states[0].actions[2].expectedFontPx = '28';
    },
    (x) => {
      x.states[1].actions[2].bounds.x = 198;
    },
    (x) => {
      delete x.states[0].metadata.metrics['2'];
    },
    (x) => {
      x.states[5].metadata.metrics['1'][0].text = 'Review 0';
    },
    (x) => {
      x.states[0].metadata.metrics['0'][0].text = 'Sav 1';
    },
    (x) => {
      x.states[0].metadata.metrics['0'][0].width = 69;
    },
    (x) => {
      x.states[0].metadata.metrics['0'][0].width = 0;
    },
    (x) => {
      x.states[0].metadata.metrics['0'][0].x = -3;
    },
    (x) => {
      x.states[0].metadata.metrics['0'][0].width = 1000;
    },
    (x) => {
      x.states[0].metadata.metrics['0'][0].y = 1000;
    },
    (x) => {
      x.states[0].metadata.metrics['0'][0].capHeight = 1000;
    },
    (x) => {
      x.portal.fontPx = 60;
    },
    (x) => {
      x.device.fontScale = 0;
    },
  ];
  for (const change of changes) {
    const data = structuredClone(complete());
    change(data);
    assert.throws(() => summarizeReadingReport(output(data), { globalRTL: false }));
  }
  const data = complete();
  for (const raw of [
    '',
    output(data) + output(data),
    output(data).replace('CODE: -1', 'CODE: 0'),
    output(data) + 'INSTRUMENTATION_ABORTED: interrupted\n',
  ])
    assert.throws(() => summarizeReadingReport(raw, { globalRTL: false }));
});
test('failure artifacts remain readable without passing the native gate', () => {
  const data = {
    ...complete(),
    status: 'failed',
    error: 'AssertionError',
    states: [],
    screenshots: ['failure.png'],
  };
  assert.deepEqual(inspectReadingReport(output(data)), data);
  assert.throws(() => summarizeReadingReport(output(data), { globalRTL: false }));
});
