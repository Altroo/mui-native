// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inspectFormGroupAccessibility,
  summarizeFormGroupAccessibility,
} from './android-form-group-accessibility-report.mjs';

const stages = ['initial', 'updated', 'restored'];
const keys = ['inherited', 'own-false', 'custom', 'styled'];
const result = (value, code = -1) =>
  `INSTRUMENTATION_RESULT: formGroupAccessibilityReport=${JSON.stringify(value)}\nINSTRUMENTATION_CODE: ${code}\n`;
function receipt() {
  return {
    schemaVersion: 1,
    scenario: 'form-group-accessibility-v1',
    driver: 'native Instrumentation and UiAutomation',
    artifactDirectory: 'cache/mui-form-group-accessibility-42',
    status: 'passed',
    device: { sdk: 37, fontScale: 1 },
    stages,
    screenshots: stages.map((name) => `group-tree-${name}.png`),
    states: stages.map((name, index) => ({
      name,
      updated: index === 1,
      groups: keys.map((group, id) => {
        const leaf = (text) => ({
          id: `form-group-contract-${text ? 'text' : 'child'}-${group}`,
          role: `android.widget.${text ? 'TextView' : 'Button'}`,
          label: text ? 'Inherited text' : `Choice ${index === 0 ? 0 : 1}`,
          matches: 1,
          visibleToUser: true,
          enabled: true,
          clickAction: !text,
          bounds: text ? [10, 80, 90, 100] : [10, 10, 100, 60],
          groupBounds: [0, 0, 110, 110],
        });
        return {
          group,
          rootTag: id + 1,
          refs: { attached: 1, cleaned: 0 },
          button: leaf(false),
          text: leaf(true),
        };
      }),
    })),
  };
}

test('accepts a complete native tree report and one instrumentation success', () => {
  assert.equal(summarizeFormGroupAccessibility(result(receipt())).states.length, 3);
  assert.throws(
    () => summarizeFormGroupAccessibility(result(receipt(), 0)),
    /successful instrumentation/,
  );
});

test('rejects leaf duplicates, hidden text, changed root identity and out-of-group frames', () => {
  for (const corrupt of [
    (value) => (value.states[1].groups[0].button.matches = 2),
    (value) => (value.states[1].groups[0].text.visibleToUser = false),
    (value) => (value.states[2].groups[0].rootTag = 99),
    (value) => (value.states[1].groups[0].button.bounds = [120, 10, 180, 60]),
    (value) => (value.states[1].groups[0].button.clickAction = false),
  ]) {
    const value = receipt();
    corrupt(value);
    assert.throws(
      () => summarizeFormGroupAccessibility(result(value)),
      /FormGroup accessibility evidence/,
    );
  }
});

test('retains safe failure evidence and refuses untrusted artifact names', () => {
  const failed = { ...receipt(), status: 'failed', screenshots: ['failure.png'], states: [] };
  assert.equal(inspectFormGroupAccessibility(result(failed, 0)).status, 'failed');
  assert.throws(
    () => summarizeFormGroupAccessibility(result(failed, 0)),
    /successful instrumentation/,
  );
  assert.throws(
    () => inspectFormGroupAccessibility(result({ ...failed, screenshots: ['../failure.png'] }, 0)),
    /safe diagnostic paths/,
  );
});
