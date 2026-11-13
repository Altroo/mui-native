// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { cleanup, fireEvent, render, within } from '@testing-library/react-native';
import { View } from 'react-native';
import { LayoutRootBenchmarkExample } from '../apps/native-catalog/LayoutRootBenchmarkExample';
afterEach(cleanup);
const controller = (tree: ReturnType<typeof render>) =>
  JSON.parse(tree.getByTestId('layout-root-controller-receipt').props.accessibilityLabel);
const receipt = (tree: ReturnType<typeof render>) =>
  JSON.parse(
    within(tree.getByTestId(controller(tree).cohortId)).getByTestId(
      `${controller(tree).cohortId}::layout-root-receipt`,
    ).props.accessibilityLabel,
  );
const root = (tree: ReturnType<typeof render>) =>
  tree
    .UNSAFE_getAllByType(View)
    .find((node) => node.props.testID === `${controller(tree).cohortId}::layout-root-row-000`)!
    .instance;

test('default bounded cohort passes through actual workload identity and 100 rows', () => {
  const tree = render(<LayoutRootBenchmarkExample />);
  const selected = controller(tree);
  expect(selected).toMatchObject({
    mode: 'rn',
    family: 'form-group',
    operation: 'update',
    rowCount: 100,
    sample: 0,
  });
  expect(tree.getByTestId(selected.cohortId).props.collapsable).toBe(false);
  expect(receipt(tree)).toMatchObject({
    workload: 'layout-root-v1',
    mode: 'rn',
    family: 'form-group',
    operation: 'update',
    rowCount: 100,
    mounts: 100,
    rootAttachments: 100,
    ready: true,
  });
  expect(receipt(tree).sourceId).toBe(
    process.env.EXPO_PUBLIC_MUI_BENCHMARK_SOURCE_ID ?? 'unidentified',
  );
  expect(receipt(tree).dev).toBe(__DEV__);
  expect(receipt(tree).hermes).toBe(
    Boolean((globalThis as { HermesInternal?: unknown }).HermesInternal),
  );
});
test('each configuration change remounts the cohort and never labels old counters as fresh', () => {
  const tree = render(<LayoutRootBenchmarkExample rowCount={3} />);
  let old = controller(tree).cohortId;
  let native = root(tree);
  fireEvent.press(tree.getByTestId(`${controller(tree).cohortId}::layout-root-advance`));
  expect(receipt(tree).updateEpoch).toBe(1);
  for (const [id, field, value] of [
    ['layout-root-controller-mode', 'mode', 'mui'],
    ['layout-root-controller-family', 'family', 'list-item-avatar'],
    ['layout-root-controller-operation', 'operation', 'mount'],
  ]) {
    fireEvent.press(tree.getByTestId(id));
    expect(controller(tree)[field]).toBe(value);
    expect(controller(tree).cohortId).not.toBe(old);
    expect(tree.queryByTestId(old)).toBeNull();
    expect(root(tree)).not.toBe(native);
    expect(receipt(tree)).toMatchObject({
      updateEpoch: 0,
      mounts: 3,
      cleanups: 0,
      rootAttachments: 3,
      rootCleanups: 0,
      ready: true,
    });
    old = controller(tree).cohortId;
    native = root(tree);
  }
  expect(
    tree.getByTestId(`${controller(tree).cohortId}::layout-root-advance`).props.accessibilityState
      .disabled,
  ).toBe(true);
  tree.rerender(<LayoutRootBenchmarkExample rowCount={2} />);
  expect(controller(tree).cohortId).not.toBe(old);
  expect(receipt(tree)).toMatchObject({
    rowCount: 2,
    mounts: 2,
    rootAttachments: 2,
    updateEpoch: 0,
  });
});
test('New sample resets a completed 16-epoch cohort while advances retain its exact roots', () => {
  const tree = render(<LayoutRootBenchmarkExample rowCount={2} />);
  const old = controller(tree).cohortId,
    native = root(tree);
  for (let epoch = 1; epoch <= 16; epoch++) {
    fireEvent.press(tree.getByTestId(`${controller(tree).cohortId}::layout-root-advance`));
    expect(root(tree)).toBe(native);
    expect(receipt(tree)).toMatchObject({
      updateEpoch: epoch,
      mounts: 2,
      cleanups: 0,
      rootAttachments: 2,
      rootCleanups: 0,
      ready: true,
    });
  }
  fireEvent.press(tree.getByTestId('layout-root-new-sample'));
  expect(controller(tree)).toMatchObject({
    sample: 1,
    mode: 'rn',
    family: 'form-group',
    operation: 'update',
  });
  expect(controller(tree).cohortId).not.toBe(old);
  expect(root(tree)).not.toBe(native);
  expect(receipt(tree)).toMatchObject({
    updateEpoch: 0,
    mounts: 2,
    cleanups: 0,
    rootAttachments: 2,
    rowUpdateCommits: 0,
    ready: true,
  });
});

test('family selection cycles through all real workloads with fresh cohorts', () => {
  const tree = render(<LayoutRootBenchmarkExample rowCount={2} />);
  for (const family of ['list-item-avatar', 'button-group', 'accordion', 'form-group']) {
    const previous = controller(tree).cohortId;
    fireEvent.press(tree.getByTestId('layout-root-controller-family'));
    expect(controller(tree).family).toBe(family);
    expect(controller(tree).cohortId).not.toBe(previous);
    expect(tree.queryByTestId(previous)).toBeNull();
    expect(receipt(tree)).toMatchObject({
      family,
      updateEpoch: 0,
      activeRows: 2,
      activeRoots: 2,
      ready: true,
    });
  }
});
