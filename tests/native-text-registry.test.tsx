import { StrictMode, Suspense, startTransition, useRef, useState } from 'react';
import { View, type ViewInstance } from 'react-native';
import { render, act, cleanup } from '@testing-library/react-native';
import { Box } from '../packages/material/src';
import {
  nativeTextScopes,
  setNativeTextScopeParent,
  useNativeTextScopeRoot,
  type NativeTextScopeValue,
} from '../packages/system/src';
afterEach(cleanup);
const scope = (color: string): NativeTextScopeValue => ({
  style: { color, fontSize: 20 },
  nativeText: false,
});
test('nearest physical roots and deepest same-root scopes survive lease cleanup order', () => {
  const parent = {},
    child = { parentNode: parent },
    target = { parentNode: child };
  const outer = scope('red'),
    inner = scope('green');
  setNativeTextScopeParent(outer, undefined);
  setNativeTextScopeParent(inner, outer);
  const nested = nativeTextScopes.register(child, inner);
  const sameRoot = nativeTextScopes.register(child, outer);
  const ancestor = nativeTextScopes.register(parent, scope('blue'));
  try {
    expect(nativeTextScopes.at(target)).toBe(inner);
    nested.remove();
    expect(nativeTextScopes.at(target)).toBe(outer);
    sameRoot.remove();
    expect(nativeTextScopes.at(target)?.style.color).toBe('blue');
    sameRoot.remove();
  } finally {
    nested.remove();
    sameRoot.remove();
    ancestor.remove();
  }
});
test('semantic equality suppresses equivalent updates but retains literal and metric changes', () => {
  const root = {},
    calls = jest.fn(),
    stop = nativeTextScopes.subscribe(calls);
  const initial: NativeTextScopeValue = {
    ...scope('red'),
    style: { color: { semantic: ['labelColor'] } as any, fontSize: 20 },
    literalStyle: { includeFontPadding: false },
    lineHeight: 1.5,
  };
  const lease = nativeTextScopes.register(root, initial);
  try {
    calls.mockClear();
    lease.update({
      ...initial,
      style: { ...initial.style, color: { semantic: ['labelColor'] } as any },
      literalStyle: { includeFontPadding: false },
    });
    expect(calls).not.toHaveBeenCalled();
    lease.update({ ...initial, lineHeight: 1.8 });
    expect(calls).toHaveBeenCalledTimes(1);
    lease.update({ ...initial, lineHeight: 1.8, literalStyle: { includeFontPadding: true } });
    expect(calls).toHaveBeenCalledTimes(2);
    expect(nativeTextScopes.at(root)?.literalStyle?.includeFontPadding).toBe(true);
    lease.remove();
    calls.mockClear();
    lease.update(scope('blue'));
    expect(calls).not.toHaveBeenCalled();
    expect(nativeTextScopes.at(root)).toBeUndefined();
  } finally {
    lease.remove();
    stop();
  }
});
test('physical parent resolver rejects detached and cyclic destinations', () => {
  const root = {},
    canvas = { parentNode: root },
    target = { parentNode: canvas };
  const lease = nativeTextScopes.register(root, scope('red'));
  try {
    expect(nativeTextScopes.at(target)?.style.color).toBe('red');
    expect(nativeTextScopes.at(target, () => null)).toBeUndefined();
    expect(nativeTextScopes.at(target, () => target)).toBeUndefined();
    expect(nativeTextScopes.at({ parentNode: root, isConnected: false })).toBeUndefined();
  } finally {
    lease.remove();
  }
});
test('root replacement is observed with unchanged text values and StrictMode cleanup removes both roots', () => {
  const first = {},
    second = {},
    value = scope('red');
  function Harness({ node }: { node: object }) {
    const root = useRef<object | null>(node);
    root.current = node;
    useNativeTextScopeRoot(root, value);
    return null;
  }
  const tree = render(
    <StrictMode>
      <Harness node={first} />
    </StrictMode>,
  );
  expect(nativeTextScopes.at(first)).toBe(value);
  tree.rerender(
    <StrictMode>
      <Harness node={second} />
    </StrictMode>,
  );
  expect(nativeTextScopes.at(first)).toBeUndefined();
  expect(nativeTextScopes.at(second)).toBe(value);
  tree.unmount();
  expect(nativeTextScopes.at(second)).toBeUndefined();
});
test('owned raw View tracking preserves the original child type and callback-ref cleanup', async () => {
  let node: ViewInstance | null = null;
  const release = jest.fn();
  const ref = jest.fn((value: ViewInstance | null) => {
    node = value;
    return release;
  });
  const tree = render(
    <Box>
      <View ref={ref} style={{ color: 'green' } as any} />
    </Box>,
  );
  const actual = node!;
  expect(nativeTextScopes.at(actual)?.style.color).toBe('green');
  expect(ref).toHaveBeenCalledTimes(1);
  await act(async () => {
    tree.rerender(
      <Box>
        <View ref={ref} style={{ color: 'purple' } as any} />
      </Box>,
    );
  });
  expect(nativeTextScopes.at(actual)?.style.color).toBe('purple');
  expect(ref).toHaveBeenCalledTimes(1);
  expect(release).not.toHaveBeenCalled();
  tree.unmount();
  expect(release).toHaveBeenCalledTimes(1);
  expect(ref).not.toHaveBeenCalledWith(null);
  expect(nativeTextScopes.at(actual)).toBeUndefined();
});

test('a registered nearest scope cannot bypass complete destination cycle validation', () => {
  const target: { parentNode?: object } = {},
    canvas = { parentNode: target };
  target.parentNode = canvas;
  const lease = nativeTextScopes.register(target, scope('red'));
  try {
    expect(nativeTextScopes.at(target)).toBeUndefined();
  } finally {
    lease.remove();
  }
});
test('a suspended ref change does not detach the unchanged committed native child ref', async () => {
  const release = jest.fn(),
    first = jest.fn(() => release),
    second = jest.fn();
  const never = new Promise<void>(() => {});
  let update!: (state: { pending: boolean; version: number }) => void;
  function Pending({ active }: { active: boolean }) {
    if (active) throw never;
    return null;
  }
  function Harness() {
    const [state, setState] = useState({ pending: false, version: 0 });
    update = setState;
    return (
      <Suspense fallback={null}>
        <Box>
          <View ref={state.pending ? second : first} />
          <Pending active={state.pending} />
        </Box>
      </Suspense>
    );
  }
  render(<Harness />);
  expect(first).toHaveBeenCalledTimes(1);
  await act(async () => {
    startTransition(() => update({ pending: true, version: 1 }));
  });
  expect(second).not.toHaveBeenCalled();
  expect(release).not.toHaveBeenCalled();
  await act(async () => {
    update({ pending: false, version: 2 });
  });
  expect(first).toHaveBeenCalledTimes(1);
  expect(release).not.toHaveBeenCalled();
});
test('slash-containing React keys keep separate nested native-root ownership', () => {
  const first = { current: null as ViewInstance | null },
    second = { current: null as ViewInstance | null };
  render(
    <Box>
      <View key="a/.$b">
        <View key="c" ref={first} style={{ color: 'red' } as any} />
      </View>
      <View key="a">
        <View key="b/.$c" ref={second} style={{ color: 'green' } as any} />
      </View>
    </Box>,
  );
  expect(first.current).not.toBe(second.current);
  expect(nativeTextScopes.at(first.current)?.style.color).toBe('red');
  expect(nativeTextScopes.at(second.current)?.style.color).toBe('green');
});

test('valid React string keys with lone UTF16 surrogates remain distinct and renderable', () => {
  const first = { current: null as ViewInstance | null },
    second = { current: null as ViewInstance | null };
  render(
    <Box>
      <View key={String.fromCharCode(0xd800)} ref={first} style={{ color: 'red' } as any} />
      <View key={String.fromCharCode(0xd801)} ref={second} style={{ color: 'green' } as any} />
    </Box>,
  );
  expect(nativeTextScopes.at(first.current)?.style.color).toBe('red');
  expect(nativeTextScopes.at(second.current)?.style.color).toBe('green');
});
