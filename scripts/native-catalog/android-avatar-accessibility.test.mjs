// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inspectAvatarAccessibility,
  summarizeAvatarAccessibility,
} from './android-avatar-accessibility-report.mjs';

const output = (report, code = '-1') =>
  `INSTRUMENTATION_RESULT: avatarAccessibilityReport=${JSON.stringify(report)}\nINSTRUMENTATION_CODE: ${code}\n`;

function sample() {
  const stages = ['initial', 'updated', 'restored'];
  const image = {
    role: 'android.widget.ImageView',
    label: 'Account owner',
    visibleToUser: true,
    matches: 1,
    bounds: [2, 2, 20, 20],
    ownerBounds: [0, 0, 25, 25],
  };
  return {
    schemaVersion: 1,
    scenario: 'list-item-avatar-accessibility-v1',
    driver: 'native Instrumentation and UiAutomation',
    artifactDirectory: 'cache/mui-list-item-avatar-accessibility-187',
    device: { sdk: 37, fontScale: 1 },
    status: 'passed',
    includesNotImportantViews: false,
    screenshots: stages.map((name) => `avatar-tree-${name}.png`),
    stages,
    states: stages.map((name, index) => ({
      name,
      metadata: { top: index === 1, rtl: index === 1, customStyle: index === 1, fontScale: 1 },
      tags: { native: 40, custom: 60, portal: 80 },
      distinctImages: true,
      inline: { ...image },
      portal: { ...image, bounds: [42, 2, 60, 20], ownerBounds: [40, 0, 65, 25] },
      child: {
        ...image,
        role: 'android.widget.Button',
        label: `Avatar child count ${index === 0 ? 0 : 1}`,
        id: 'avatar-contract-child',
        enabled: true,
        clickAction: true,
        bounds: [82, 2, 100, 20],
        ownerBounds: [80, 0, 105, 25],
      },
    })),
  };
}

test('requires independent native images, unique button identity, and retained updates', () => {
  assert.deepEqual(summarizeAvatarAccessibility(output(sample())), sample());
  for (const mutate of [
    (report) => (report.includesNotImportantViews = true),
    (report) => (report.states[2].distinctImages = false),
    (report) => (report.states[1].portal.ownerBounds = [0, 0, 25, 25]),
    (report) => (report.states[0].child.matches = 2),
    (report) => (report.states[0].child.id = 'other-child'),
    (report) => (report.states[1].child.clickAction = false),
    (report) => (report.states[2].child.label = 'Avatar child count 0'),
    (report) => (report.states[2].tags.portal += 1),
  ]) {
    const report = sample();
    mutate(report);
    assert.throws(() => summarizeAvatarAccessibility(output(report)), /accessibility evidence/);
  }
});

test('routes only safe diagnostics for a failed run and rejects contradictory exit codes', () => {
  const report = { ...sample(), status: 'failed', screenshots: ['failure.png'], states: [] };
  assert.deepEqual(inspectAvatarAccessibility(output(report, '0')), report);
  assert.throws(() => summarizeAvatarAccessibility(output(report, '0')), /instrumentation/);
  assert.throws(() => summarizeAvatarAccessibility(output(sample(), '0')), /instrumentation/);
  for (const change of [
    { artifactDirectory: 'cache/../other' },
    { screenshots: ['../avatar-tree-initial.png'] },
    { screenshots: ['failure.png', 'failure.png'] },
  ]) {
    assert.throws(
      () => inspectAvatarAccessibility(output({ ...report, ...change })),
      /safe artifact/,
    );
  }
});
