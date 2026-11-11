// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { I18nManager, StyleSheet, View } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { LayoutRootBenchmark } from '../apps/native-benchmark/LayoutRootBenchmark';
import { backendEdges } from './helpers/nativeInsetEdges';
beforeEach(() => {
  jest.replaceProperty(I18nManager, 'isRTL', false);
  jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', false);
});
afterEach(cleanup);
const read = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('layout-root-receipt').props.accessibilityLabel);
const instances = (tree: ReturnType<typeof render>) =>
  tree
    .UNSAFE_getAllByType(View)
    .filter((node) => /^layout-root-row-/.test(node.props.testID ?? ''))
    .map((node) => node.instance);
function renderedText(node: ReactTestInstance): string {
  return node.children
    .map((child) => (typeof child === 'string' ? child : renderedText(child)))
    .join('');
}
const strings = (tree: ReturnType<typeof render>) =>
  tree.getAllByTestId(/^layout-root-(label|detail)-\d{3}$/).map(renderedText);

test.each(['form-group', 'list-item-avatar', 'button-group'] as const)(
  '%s uses identical baseline/material content and real commit/ref counts',
  (family) => {
    const observed: string[][] = [];
    for (const mode of ['rn', 'mui'] as const) {
      const tree = render(
        <LayoutRootBenchmark mode={mode} family={family} rowCount={4} operation="update" />,
      );
      observed.push(strings(tree));
      expect(read(tree)).toMatchObject({
        workload: 'layout-root-v1',
        mode,
        family,
        operation: 'update',
        rowCount: 4,
        updateEpoch: 0,
        mounts: 4,
        cleanups: 0,
        rootAttachments: 4,
        rootCleanups: 0,
        activeRows: 4,
        activeRoots: 4,
        rowEpochCommits: 4,
        rowUpdateCommits: 0,
        completedRows: 4,
        ready: true,
      });
      expect(read(tree).dev).toBe(__DEV__);
      expect(read(tree).hermes).toBe(
        Boolean((globalThis as { HermesInternal?: unknown }).HermesInternal),
      );
      tree.unmount();
    }
    expect(observed[0]).toEqual(observed[1]);
    expect(observed[0]).toHaveLength(8);
  },
);
test.each([
  ['rn', 'form-group'],
  ['mui', 'form-group'],
  ['rn', 'list-item-avatar'],
  ['mui', 'list-item-avatar'],
  ['rn', 'button-group'],
  ['mui', 'button-group'],
] as const)(
  '%s/%s keeps the exact roots and keys through row/error/theme/style updates',
  (mode, family) => {
    const tree = render(<LayoutRootBenchmark mode={mode} family={family} rowCount={3} />);
    const roots = instances(tree);
    const width = strings(tree).map((text) => text.length);
    for (let epoch = 1; epoch <= 8; epoch++) {
      fireEvent.press(tree.getByTestId('layout-root-advance'));
      expect(read(tree)).toMatchObject({
        updateEpoch: epoch,
        mounts: 3,
        cleanups: 0,
        rootAttachments: 3,
        rootCleanups: 0,
        rowUpdateCommits: epoch * 3,
        completedRows: 3,
        ready: true,
      });
      instances(tree).forEach((node, index) => expect(node).toBe(roots[index]));
      expect(strings(tree).map((text) => text.length)).toEqual(width);
    }
    expect(read(tree)).toMatchObject({
      row: false,
      error: false,
      alternateTheme: false,
      alternateStyle: true,
    });
    expect(StyleSheet.flatten(tree.getByTestId('layout-root-row-000').props.style)).toMatchObject({
      minHeight: family === 'button-group' ? 56 : 52,
      borderRadius: 8,
    });
    for (const kind of ['margin', 'padding'] as const)
      expect(
        backendEdges(tree.getByTestId('layout-root-row-000').props.style, kind, 'ltr', false),
      ).toEqual({
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      });
  },
);
test('mount operation holds an initial cohort, caps rendered rows and reports the real source identity', () => {
  const original = process.env.EXPO_PUBLIC_MUI_BENCHMARK_SOURCE_ID;
  process.env.EXPO_PUBLIC_MUI_BENCHMARK_SOURCE_ID = 'layout-test-source';
  try {
    const tree = render(
      <LayoutRootBenchmark mode="rn" family="form-group" operation="mount" rowCount={120} />,
    );
    expect(tree.getAllByTestId(/^layout-root-row-/)).toHaveLength(100);
    expect(tree.getAllByTestId(/^layout-root-label-/)).toHaveLength(100);
    expect(read(tree)).toMatchObject({
      sourceId: 'layout-test-source',
      rowCount: 100,
      mounts: 100,
      rootAttachments: 100,
      updateEpoch: 0,
      operation: 'mount',
      ready: true,
    });
    fireEvent.press(tree.getByTestId('layout-root-advance'));
    expect(read(tree)).toMatchObject({ updateEpoch: 0, rowUpdateCommits: 0, cleanups: 0 });
  } finally {
    if (original === undefined) delete process.env.EXPO_PUBLIC_MUI_BENCHMARK_SOURCE_ID;
    else process.env.EXPO_PUBLIC_MUI_BENCHMARK_SOURCE_ID = original;
  }
});
test('removing rows exposes actual effect/ref cleanups rather than resetting counters', () => {
  const tree = render(<LayoutRootBenchmark rowCount={4} />);
  tree.rerender(<LayoutRootBenchmark rowCount={1} />);
  expect(read(tree)).toMatchObject({
    rowCount: 1,
    mounts: 4,
    cleanups: 3,
    rootAttachments: 4,
    rootCleanups: 3,
    activeRows: 1,
    activeRoots: 1,
    completedRows: 1,
    ready: true,
  });
});

// These are real actions in both modes, with child-owned state and inherited
// disabled behavior, rather than inert labels standing in for Button controls.
test.each(['rn', 'mui'] as const)(
  '%s grouped actions retain local state through all workload updates',
  (mode) => {
    const tree = render(<LayoutRootBenchmark mode={mode} family="button-group" rowCount={2} />);
    const first = tree.getByTestId('layout-root-label-000-action');
    const second = tree.getByTestId('layout-root-detail-000-action');
    fireEvent.press(first);
    fireEvent.press(second);
    expect(tree.getByLabelText('Row 001 presses 1')).toBeTruthy();
    for (let epoch = 1; epoch <= 16; epoch++) {
      fireEvent.press(tree.getByTestId('layout-root-advance'));
      const action = tree.getByTestId('layout-root-label-000-action');
      expect(action).toBe(first);
      expect(tree.getByTestId('layout-root-detail-000-action')).toBe(second);
      expect(tree.getByLabelText('Row 001 presses 1')).toBeTruthy();
      expect(
        tree.getByLabelText(`Stage ${String(epoch % 16).padStart(2, '0')} presses 1`),
      ).toBeTruthy();
      const disabled = Math.floor(epoch / 2) % 2 === 1;
      expect(action.props.accessibilityState.disabled).toBe(disabled);
      if (disabled) {
        fireEvent.press(action);
        expect(tree.getByLabelText('Row 001 presses 1')).toBeTruthy();
      }
      expect(read(tree)).toMatchObject({
        activeRows: 2,
        activeRoots: 2,
        cleanups: 0,
        rootCleanups: 0,
        ready: true,
      });
    }
  },
);

test.each(['rn', 'mui'] as const)(
  '%s names each native cohort and uses identical authored typography',
  (mode) => {
    const tree = render(
      <LayoutRootBenchmark
        mode={mode}
        family="button-group"
        cohortId="owned-cohort"
        rowCount={2}
      />,
    );
    expect(tree.queryByTestId('layout-root-row-000')).toBeNull();
    expect(tree.getByTestId('owned-cohort::layout-root-row-000')).toBeTruthy();
    const label = tree.getByTestId('owned-cohort::layout-root-label-000');
    expect(StyleSheet.flatten(label.props.style)).toMatchObject({
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '400',
      textTransform: 'none',
      letterSpacing: 0,
      textAlign: 'left',
    });
    const receipt = () =>
      JSON.parse(tree.getByTestId('owned-cohort::layout-root-receipt').props.accessibilityLabel);
    expect(receipt()).toMatchObject({ cohortId: 'owned-cohort', ready: true, updateEpoch: 0 });
    fireEvent.press(tree.getByTestId('owned-cohort::layout-root-label-000-action'));
    fireEvent.press(tree.getByTestId('owned-cohort::layout-root-advance'));
    expect(receipt()).toMatchObject({
      cohortId: 'owned-cohort',
      ready: true,
      updateEpoch: 1,
      rootCleanups: 0,
    });
    expect(tree.getByLabelText('Row 001 presses 1')).toBeTruthy();
  },
);
