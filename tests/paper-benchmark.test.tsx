// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
jest.mock(
  '@mui/icons-material/NotificationsNoneRounded',
  () => jest.requireActual('../packages/icons/src/NotificationsNoneRounded'),
  { virtual: true },
);
jest.mock('@mui/icons-material/Check', () => jest.requireActual('../packages/icons/src/Check'), {
  virtual: true,
});
import { cleanup, fireEvent, render, within } from '@testing-library/react-native';
import { I18nManager, StyleSheet, Text, View, ScrollView } from 'react-native';
import { PaperBenchmark, paperBenchmarkStages } from '../apps/native-benchmark/PaperBenchmark';
import { PaperBenchmarkExample } from '../apps/native-catalog/PaperBenchmarkExample';
import { RootLayoutExamples } from '../apps/native-catalog/RootLayoutExamples';
import source from './fixtures/mui-paper-9.5.0.json';
import type { ReactTestInstance } from 'react-test-renderer';
function text(node: ReactTestInstance): string {
  return node.children.map((child) => (typeof child === 'string' ? child : text(child))).join('');
}
const receipt = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('paper-benchmark-receipt').props.accessibilityLabel);
const controller = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('paper-benchmark-controller').props.accessibilityLabel);
const roots = (tree: ReturnType<typeof render>) =>
  tree
    .UNSAFE_getAllByType(View)
    .filter((n) => /^paper-benchmark-row-/.test(n.props.testID ?? ''))
    .map((n) => n.instance);
const flat = (value: unknown) => StyleSheet.flatten(value as any) ?? {};
const advance = (tree: ReturnType<typeof render>) =>
  fireEvent.press(tree.getByTestId('paper-benchmark-advance'));
afterEach(cleanup);

test('default workload commits exactly100actual native roots with explicit build identity', () => {
  const tree = render(<PaperBenchmark />);
  expect(roots(tree)).toHaveLength(100);
  expect(receipt(tree)).toMatchObject({
    schemaVersion: 1,
    workload: 'paper-surface-v1',
    mode: 'rn',
    rowCount: 100,
    epoch: 0,
    mounts: 100,
    cleanups: 0,
    rootAttachments: 100,
    rootCleanups: 0,
    rootReplacements: 0,
    rowEpochCommits: 100,
    rowUpdateCommits: 0,
    completedRows: 100,
    ready: true,
    fontScale: expect.any(Number),
    scroll: { sequence: 0, offsetY: 0 },
  });
  expect(receipt(tree).globalRtl).toBe(I18nManager.isRTL);
  expect(receipt(tree).swapInRtl).toBe(I18nManager.doLeftAndRightSwapInRTL);
  expect(receipt(tree).dev).toBe(__DEV__);
  expect(receipt(tree).hermes).toBe(
    Boolean((globalThis as { HermesInternal?: unknown }).HermesInternal),
  );
  expect(receipt(tree).sourceId).toBe(
    process.env.EXPO_PUBLIC_MUI_BENCHMARK_SOURCE_ID ?? 'unidentified',
  );
});
test('native control and actual Paper retain equivalent paint/content through all8updates', () => {
  const runs: unknown[][] = [];
  for (const mode of ['rn', 'mui'] as const) {
    const tree = render(<PaperBenchmark mode={mode} rowCount={3} />),
      first = roots(tree),
      observed: unknown[] = [];
    for (const [epoch, stage] of paperBenchmarkStages.entries()) {
      const style = flat(tree.getByTestId('paper-benchmark-row-000').props.style);
      const dark = source.dark.find((r) => r.elevation === stage.elevation)!;
      const paint = {
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        backgroundImage: style.backgroundImage,
        borderRadius: style.borderRadius ?? 0,
        borderWidth: style.borderWidth ?? style.borderTopWidth ?? 0,
        borderColor: style.borderColor ?? style.borderTopColor,
        borderStyle: style.borderStyle,
      };
      expect(paint.backgroundColor).toBe(stage.dark ? '#121212' : '#fff');
      if (stage.variant === 'elevation') {
        expect(paint.boxShadow).toBe(dark.shadow);
        expect(paint.backgroundImage).toEqual(
          stage.dark
            ? [
                {
                  type: 'linear-gradient',
                  colorStops: [
                    { color: `rgba(255, 255, 255, ${dark.alpha})` },
                    { color: `rgba(255, 255, 255, ${dark.alpha})` },
                  ],
                },
              ]
            : undefined,
        );
      } else
        expect(paint).toMatchObject({
          borderWidth: 1,
          boxShadow: undefined,
          backgroundImage: undefined,
        });
      expect(style).toMatchObject({ width: '100%', padding: 12, minHeight: 72, margin: 0 });
      expect(text(tree.getByTestId('paper-benchmark-detail-000'))).toBe(
        `Epoch ${epoch} / ${stage.name}`,
      );
      expect(roots(tree)).toEqual(first);
      expect(receipt(tree)).toMatchObject({
        mode,
        epoch,
        stage,
        mounts: 3,
        cleanups: 0,
        rootAttachments: 3,
        rootCleanups: 0,
        rootReplacements: 0,
        rowEpochCommits: (epoch + 1) * 3,
        rowUpdateCommits: epoch * 3,
        completedRows: 3,
        ready: true,
      });
      observed.push({
        paint,
        text: tree
          .UNSAFE_getAllByType(Text)
          .filter((n) => /^paper-benchmark-(label|detail)-/.test(n.props.testID ?? ''))
          .map(text),
      });
      advance(tree);
    }
    expect(receipt(tree).epoch).toBe(8);
    expect(tree.getByTestId('paper-benchmark-advance').props.accessibilityState.disabled).toBe(
      true,
    );
    runs.push(observed);
    tree.unmount();
  }
  expect(runs[0]).toEqual(runs[1]);
});
test('fresh samples and even same-mode selection remount while internal advances retain roots', () => {
  const tree = render(<PaperBenchmarkExample rowCount={2} />);
  let native = roots(tree),
    id = controller(tree).cohortId;
  advance(tree);
  expect(roots(tree)).toEqual(native);
  for (const control of ['mode-rn', 'mode-mui', 'new-sample']) {
    fireEvent.press(tree.getByTestId('paper-benchmark-' + control));
    expect(controller(tree).cohortId).not.toBe(id);
    expect(tree.queryByTestId(id)).toBeNull();
    expect(roots(tree)[0]).not.toBe(native[0]);
    expect(
      within(tree.getByTestId(controller(tree).cohortId)).getByTestId('paper-benchmark-receipt'),
    ).toBeTruthy();
    expect(receipt(tree)).toMatchObject({
      epoch: 0,
      mounts: 2,
      cleanups: 0,
      rootAttachments: 2,
      rootCleanups: 0,
      rowUpdateCommits: 0,
      scroll: { sequence: 0, offsetY: 0 },
    });
    id = controller(tree).cohortId;
    native = roots(tree);
  }
  tree.rerender(<PaperBenchmarkExample rowCount={3} />);
  expect(controller(tree).cohortId).not.toBe(id);
  expect(receipt(tree).rowCount).toBe(3);
});
test('scroll end callbacks snapshot raw end offsets without new row commits', () => {
  const tree = render(<PaperBenchmark rowCount={3} />),
    before = receipt(tree),
    native = roots(tree);
  const scroll = tree.UNSAFE_getByType(ScrollView);
  expect(receipt(tree).scroll).toEqual({ sequence: 0, offsetY: 0 });
  fireEvent(scroll, 'scrollEndDrag', { nativeEvent: { contentOffset: { x: 0, y: 31 } } });
  expect(receipt(tree).scroll).toEqual({ sequence: 1, offsetY: 31 });
  fireEvent(scroll, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 0, y: 0 } } });
  expect(receipt(tree)).toMatchObject({ ...before, scroll: { sequence: 2, offsetY: 0 } });
  expect(roots(tree)).toEqual(native);
});
test('Paper workload owns one viewport and preserves existing root routes', () => {
  const tree = render(<RootLayoutExamples />);
  fireEvent.press(tree.getByTestId('root-layout-paper-benchmark'));
  expect(tree.queryByTestId('root-layout-scroll')).toBeNull();
  expect(tree.getByTestId('paper-benchmark-viewport')).toBeTruthy();
  expect(controller(tree).rowCount).toBe(100);
  fireEvent.press(tree.getByTestId('root-layout-benchmark'));
  expect(tree.queryByTestId('paper-benchmark-controller')).toBeNull();
  const cohortId = JSON.parse(
    tree.getByTestId('layout-root-controller-receipt').props.accessibilityLabel,
  ).cohortId;
  expect(tree.getByTestId(`${cohortId}::layout-root-viewport`)).toBeTruthy();
  fireEvent.press(tree.getByTestId('root-layout-paper'));
  expect(tree.getByTestId('root-layout-scroll')).toBeTruthy();
  expect(tree.getByTestId('paper-contract-receipt')).toBeTruthy();
});
test('the normal-font benchmark retains scaling and rejects invalid configuration', () => {
  const tree = render(<PaperBenchmark rowCount={101} />);
  expect(receipt(tree).rowCount).toBe(100);
  for (const node of tree.UNSAFE_getAllByType(Text)) {
    expect(node.props.allowFontScaling).not.toBe(false);
    expect(node.props.maxFontSizeMultiplier).toBeUndefined();
  }
  tree.unmount();
  for (const rowCount of [NaN, Infinity])
    expect(() => render(<PaperBenchmark rowCount={rowCount} />)).toThrow(RangeError);
  expect(() => render(<PaperBenchmark mode={'other' as any} />)).toThrow(RangeError);
});
