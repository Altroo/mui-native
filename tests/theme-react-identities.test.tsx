// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { createContext, createElement, forwardRef, lazy, memo, useState } from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react-native';
import { View, Text, Pressable, type ViewInstance, type ViewProps } from 'react-native';
import { merge } from '../packages/system/src/merge';
import { createTheme } from '../packages/system/src';
import { ThemeProvider } from '../packages/material/src/themeProvider';
import { Card } from '../packages/material/src/card';
import reference from './fixtures/mui-theme-react-identities-9.5.0.json';
const context = createContext(null),
  load = jest.fn(async () => ({ default: () => null }));
const values = {
  forwardRef: forwardRef(() => null),
  memo: memo(() => null),
  lazy: lazy(load),
  element: createElement('View', { id: 'x' }),
  context,
  consumer: context.Consumer,
  client: { $$typeof: Symbol.for('react.client.reference') },
  module: {
    getModuleId() {
      throw Error('must not call');
    },
  },
};
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
test.each(reference.cases)('pinned original identity leaf: $name', ({ name, same }) => {
  const value = values[name as keyof typeof values];
  expect(merge({ value: undefined as unknown }, { value }).value === value).toBe(same);
  expect(load).not.toHaveBeenCalled();
});
test.each(reference.accessors)(
  'React identity guards follow original selected lookup order: $symbols',
  ({ symbols, same, trace }) => {
    const reads: string[] = [];
    let index = 0;
    const value = Object.defineProperties(
      {},
      {
        $$typeof: {
          get() {
            reads.push('tag');
            return Symbol.for(symbols[Math.min(index++, symbols.length - 1)]!);
          },
        },
        getModuleId: {
          get() {
            reads.push('module');
            return undefined;
          },
        },
      },
    );
    expect(merge({ value: undefined as unknown }, { value }).value === value).toBe(same);
    // MUI deepClone repeats this guard for a rejected ordinary object. Keep
    // native merge's existing recursion rather than add duplicate checks.
    expect(reads).toEqual(same ? trace : trace.slice(0, trace.length / 2));
  },
);
test('nested valid React values are not cloned or traversed under repeated composition', () => {
  const render = jest.fn(() => null),
    compare = jest.fn(() => true);
  const root = memo(forwardRef(render), compare);
  const element = createElement(root);
  const value = {
    components: { MuiCardContent: { defaultProps: { component: root, children: element } } },
  };
  const result = merge({} as typeof value, value);
  expect(result.components.MuiCardContent.defaultProps.component === root).toBe(true);
  expect(result.components.MuiCardContent.defaultProps.children === element).toBe(true);
  expect(result).not.toBe(value);
  expect(result.components).not.toBe(value.components);
  expect(render).not.toHaveBeenCalled();
  expect(compare).not.toHaveBeenCalled();
});
test('ordinary records retain merge values, nonmutation and array replacement identity', () => {
  const array = [{ value: 1 }, values.element],
    base = { nested: { keep: 1, value: 2 }, array: [0] as unknown[], clear: 'before' };
  const result = merge(base, { nested: { value: 3, extra: 4 }, array, clear: undefined });
  expect(result).toEqual({ nested: { keep: 1, value: 3, extra: 4 }, array, clear: undefined });
  expect(result.array === array).toBe(true);
  expect(base).toEqual({ nested: { keep: 1, value: 2 }, array: [0] as unknown[], clear: 'before' });
  expect(merge(base, undefined)).toBe(base);
  expect(merge(base, null)).toBe(null);
  expect(merge(base, false)).toBe(false);
  expect(merge(base, array)).toBe(array);
});
test('existing eager value snapshot and base-getter ordering remain unchanged', () => {
  const trace: string[] = [];
  const base = Object.defineProperty({}, 'base', {
    enumerable: true,
    get() {
      trace.push('base');
      return 1;
    },
  });
  const value = Object.defineProperties(
    {},
    {
      first: {
        enumerable: true,
        get() {
          trace.push('first');
          return { x: 2 };
        },
      },
      second: {
        enumerable: true,
        get() {
          trace.push('second');
          return 3;
        },
      },
    },
  );
  expect(merge(base, value)).toEqual({ base: 1, first: { x: 2 }, second: 3 });
  expect(trace).toEqual(['base', 'first', 'second']);
});
test('React identity does not eagerly observe payloads or execute component callbacks', () => {
  const danger = jest.fn(() => {
    throw Error('payload traversed');
  });
  const root = Object.defineProperty({ $$typeof: Symbol.for('react.lazy') }, '_payload', {
    enumerable: true,
    get: danger,
  });
  expect(merge({ root: undefined as unknown }, { root }).root === root).toBe(true);
  expect(danger).not.toHaveBeenCalled();
});
test('ordinary objects with an unsupported tag still merge and dangerous property keys stay excluded', () => {
  const value = JSON.parse(
    '{"nested":{"$$typeof":"ordinary","x":2},"__proto__":{"polluted":1},"constructor":{"polluted":2},"prototype":{"polluted":3}}',
  );
  const result = merge({ nested: { keep: 1 } }, value);
  expect(result).toEqual({ nested: { keep: 1, $$typeof: 'ordinary', x: 2 } });
  expect(({} as any).polluted).toBeUndefined();
});
test('native theme reconstruction retains the default custom root state and public ref', () => {
  const Root = forwardRef<ViewInstance, ViewProps>((props, ref) => {
    const [count, set] = useState(0);
    return (
      <View {...props} ref={ref}>
        <Pressable testID="increment" onPress={() => set((n) => n + 1)}>
          <Text testID="count">{count}</Text>
        </Pressable>
        {props.children}
      </View>
    );
  });
  const theme = () =>
    createTheme({ components: { MuiCard: { defaultProps: { component: Root } } } });
  const first = theme(),
    second = theme(),
    ref = React.createRef<ViewInstance>();
  const scene = (value: typeof first) => (
    <ThemeProvider theme={value}>
      <Card ref={ref} />
    </ThemeProvider>
  );
  const tree = render(scene(first));
  const initial = ref.current;
  fireEvent.press(tree.getByTestId('increment'));
  expect(tree.getByTestId('count').props.children).toBe(1);
  tree.rerender(scene(second));
  expect({
    firstSame: (first.components.MuiCard as any).defaultProps.component === Root,
    secondSame: (second.components.MuiCard as any).defaultProps.component === Root,
    retained: tree.getByTestId('count').props.children,
    sameRef: ref.current === initial,
  }).toEqual({ firstSame: true, secondSame: true, retained: 1, sameRef: true });
});

test('a throwing React brand getter propagates without inspecting its payload', () => {
  const payload = jest.fn(() => {
    throw Error('not payload');
  });
  const value = Object.defineProperties(
    {},
    {
      $$typeof: {
        get() {
          throw Error('brand getter');
        },
      },
      payload: { enumerable: true, get: payload },
    },
  );
  expect(() => merge({}, { value })).toThrow('brand getter');
  expect(payload).not.toHaveBeenCalled();
});
test('existing ordinary property snapshot observes mutation before descending', () => {
  const trace: string[] = [];
  const value: any = { second: { after: 0 } };
  Object.defineProperty(value, 'first', {
    enumerable: true,
    get() {
      trace.push('first');
      value.second = { after: 1 };
      return { nested: 2 };
    },
  });
  // Object insertion order observes second first, then snapshots first's mutation.
  const result = merge({}, value);
  expect(result).toEqual({ second: { after: 0 }, first: { nested: 2 } });
  expect(value.second).toEqual({ after: 1 });
  expect(trace).toEqual(['first']);
});
