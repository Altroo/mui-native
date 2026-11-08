// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// The Jest host model verifies prepared scope publication, not native layout.
import { useRef, useSyncExternalStore } from 'react';
import { View, type ViewInstance } from 'react-native';
import { render, cleanup } from '@testing-library/react-native';
import { createTheme, componentRootStyle } from '../packages/system/src';
import { NativeStyleScope } from '../packages/material/src/nativeStyleScope';
import { nativeStyleTree } from '../packages/material/src/nativeStyleAncestry';
const theme = createTheme();
const classes = ['Owner'];
afterEach(cleanup);
function Fixture({
  fact,
  structural = false,
}: {
  fact?: boolean | undefined;
  structural?: boolean;
}) {
  useSyncExternalStore(nativeStyleTree.subscribe, nativeStyleTree.snapshot);
  const root = useRef<ViewInstance | null>(null);
  const result = componentRootStyle(theme, '', {}, undefined, undefined, {
    classes,
    lastChild: fact,
    baseStyle: structural ? { '&:last-child': { opacity: 0.3 } } : { opacity: 0.3 },
  });
  return (
    <NativeStyleScope root={root} theme={theme} classes={classes} prepared={result.prepared}>
      <View testID="target" style={result.computed} />
    </NativeStyleScope>
  );
}
test('ordinary prepared scope with its real style-tree subscription terminates', () => {
  const tree = render(<Fixture />);
  expect(tree.getByTestId('target')).toHaveStyle({ opacity: 0.3 });
});
test('resolved fact changes publish while equal repeated facts stay stable', () => {
  const tree = render(<Fixture structural fact={false} />);
  let revision = nativeStyleTree.snapshot();
  tree.rerender(<Fixture structural fact={false} />);
  expect(nativeStyleTree.snapshot()).toBe(revision);
  for (const fact of [true, false, undefined, true]) {
    tree.rerender(<Fixture structural fact={fact} />);
    expect(nativeStyleTree.snapshot()).toBeGreaterThan(revision);
    revision = nativeStyleTree.snapshot();
    expect(tree.getByTestId('target').props.style.opacity).toBe(fact === true ? 0.3 : undefined);
    tree.rerender(<Fixture structural fact={fact} />);
    expect(nativeStyleTree.snapshot()).toBe(revision);
  }
});

const other = ['Other'],
  chosen = ['Chosen'];
function LazyFixture({
  read,
  match = false,
}: {
  read: () => boolean | undefined;
  match?: boolean;
}) {
  useSyncExternalStore(nativeStyleTree.subscribe, nativeStyleTree.snapshot);
  const root = useRef<ViewInstance | null>(null);
  const tokens = match ? chosen : other;
  const context = Object.defineProperty(
    { classes: tokens, baseStyle: { '&.Chosen:last-child': { opacity: 0.3 } } },
    'lastChild',
    { get: read },
  );
  const result = componentRootStyle(theme, '', {}, undefined, undefined, context);
  return (
    <NativeStyleScope root={root} theme={theme} classes={tokens} prepared={result.prepared}>
      <View testID="target" style={result.computed} />
    </NativeStyleScope>
  );
}
test('scope equality never observes unused caller getters and observes facts once selectors match', () => {
  const first = jest.fn(() => true),
    second = jest.fn(() => false);
  const tree = render(<LazyFixture read={first} />);
  let revision = nativeStyleTree.snapshot();
  tree.rerender(<LazyFixture read={second} />);
  expect(nativeStyleTree.snapshot()).toBe(revision);
  expect(first).not.toHaveBeenCalled();
  expect(second).not.toHaveBeenCalled();
  tree.rerender(<LazyFixture read={second} match />);
  expect(nativeStyleTree.snapshot()).toBeGreaterThan(revision);
  revision = nativeStyleTree.snapshot();
  const reads = second.mock.calls.length;
  tree.rerender(<LazyFixture read={second} match />);
  expect(nativeStyleTree.snapshot()).toBe(revision);
  expect(second.mock.calls.length - reads).toBe(1);
});
