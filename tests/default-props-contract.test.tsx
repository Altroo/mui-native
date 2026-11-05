// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { memo, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import SystemProvider, {
  useDefaultProps as useSystemDefaults,
} from '../packages/system/src/DefaultPropsProvider';
import MaterialProvider, {
  useDefaultProps as useMaterialDefaults,
} from '../packages/material/src/DefaultPropsProvider';
import {
  resolveDefaultProps,
  joinClassNames,
  getThemeProps,
} from '../packages/system/src/defaultProps';
import reference from './fixtures/mui-default-props-contract-9.5.0.json';

// Keep the public pure-context dependency on the same source context in Jest.
jest.mock(
  '@altroo/mui-native-system/DefaultPropsProvider',
  () => require('../packages/system/src/DefaultPropsProvider'),
  { virtual: true },
);

afterEach(cleanup);

const providers = [SystemProvider, MaterialProvider];
const hooks = [useSystemDefaults, useMaterialDefaults];
test.each(reference.cases.map((input, index) => ({ input, index })))(
  'both provider barrels match original: $input.name',
  ({ input, index }) => {
    for (let module = 0; module < providers.length; module++) {
      const Provider = providers[module];
      let output: unknown;
      function Probe() {
        output = hooks[module]({ props: input.props, name: 'Probe' });
        return null;
      }
      const tree = render(
        <Provider value={input.value}>
          <Probe />
        </Provider>,
      );
      const expected = reference.providers[module][index];
      expect(output).toEqual(expected.output);
      expect(output === input.props).toBe(expected.sameProps);
      if (output && typeof output === 'object' && 'style' in output)
        expect(Array.isArray(output.style)).toBe(expected.styleArray);
      tree.unmount();
    }
  },
);

test.each(reference.primitives)(
  'System unconstrained props retain source runtime behavior: $props',
  (input) => {
    let output: unknown;
    function Probe() {
      output = Reflect.apply(useSystemDefaults, undefined, [{ props: input.props, name: 'Probe' }]);
      return null;
    }
    render(
      <SystemProvider value={{ Probe: { value: 'default' } }}>
        <Probe />
      </SystemProvider>,
    );
    expect(output).toEqual(input.output);
  },
);

test('ordinary supplied getters are read once while copying props', () => {
  const trace: string[] = [];
  const props = {
    get value() {
      trace.push('get supplied');
      return undefined;
    },
  };
  expect(resolveDefaultProps({ value: 'default' }, props)).toEqual(reference.getter.output);
  expect(trace).toEqual(reference.getter.trace);
});

test('context entry and default getters retain original lookup order', () => {
  const trace: string[] = [];
  const config = {
    get defaultProps() {
      trace.push('defaultProps');
      return { value: 'default' };
    },
  };
  const value = {
    get Probe() {
      trace.push('entry');
      return config;
    },
  };
  let output: unknown;
  function Probe() {
    output = useSystemDefaults({ props: {}, name: 'Probe' });
    return null;
  }
  render(
    <SystemProvider value={value}>
      <Probe />
    </SystemProvider>,
  );
  expect(output).toEqual(reference.lookup.output);
  expect(trace).toEqual(reference.lookup.trace);
});

test('function configurations keep their enumerable defaults', () => {
  let output: unknown;
  function Probe() {
    output = useSystemDefaults({ props: {}, name: 'Probe' });
    return null;
  }
  const value = Object.assign(function configuration() {}, { value: 'function' });
  render(
    <SystemProvider value={{ Probe: value }}>
      <Probe />
    </SystemProvider>,
  );
  expect(output).toEqual(reference.functionOutput);
});

test('class-name merging follows clsx enumerable prototype behavior', () => {
  const className = Object.create({ inherited: true });
  className.own = true;
  expect(joinClassNames('theme', className)).toBe(reference.inheritedClassName);
});

test('Material keeps distinct public forwarding functions and shares System context', () => {
  expect(SystemProvider !== MaterialProvider).toBe(reference.distinctProviders);
  expect(useSystemDefaults !== useMaterialDefaults).toBe(reference.distinctHooks);
  function Probe() {
    const first = useSystemDefaults({ props: { value: '' }, name: 'Probe' });
    const second = useMaterialDefaults({ props: {}, name: 'Probe' });
    return <Text>{JSON.stringify([first, second])}</Text>;
  }
  const tree = render(
    <MaterialProvider value={{ Probe: { value: 'material' } }}>
      <Probe />
    </MaterialProvider>,
  );
  expect(tree.getByText(JSON.stringify([{ value: '' }, { value: 'material' }]))).toBeTruthy();
});

test('nested providers replace, live changes preserve child state, and undefined clears defaults', () => {
  function Probe() {
    const [count, setCount] = useState(0);
    const props = useSystemDefaults({ props: {} as { value?: string }, name: 'Probe' });
    return <Text onPress={() => setCount(count + 1)}>{`${props.value}/${count}`}</Text>;
  }
  const content = (value: Parameters<typeof SystemProvider>[0]['value']) => (
    <SystemProvider value={{ Probe: { value: 'outer', extra: true } }}>
      <SystemProvider value={value}>
        <Probe />
      </SystemProvider>
    </SystemProvider>
  );
  const tree = render(content({ Probe: { value: 'first' } }));
  fireEvent.press(tree.getByText('first/0'));
  tree.rerender(content({ Probe: { value: 'second' } }));
  expect(tree.getByText('second/1')).toBeTruthy();
  tree.rerender(content(undefined));
  expect(tree.getByText('undefined/1')).toBeTruthy();
});

test('native style arrays and callbacks remain an ordered adapter extension', () => {
  const trace: unknown[] = [];
  const owner = { disabled: false };
  const merged = resolveDefaultProps(
    {
      style: (...args: unknown[]) => {
        trace.push(['default', ...args]);
        return { opacity: 0.5 };
      },
    },
    {
      style: (...args: unknown[]) => {
        trace.push(['external', ...args]);
        return [{ padding: 4 }];
      },
    },
    true,
  );
  expect(StyleSheet.flatten(merged.style(owner))).toEqual({ opacity: 0.5, padding: 4 });
  expect(trace).toEqual([
    ['default', owner],
    ['external', owner],
  ]);
});

test.each(['slotProps', 'componentsProps'] as const)(
  'deferred %s merges preserve arguments, order and handler replacement',
  (key) => {
    const trace: unknown[] = [];
    const fallbackHandler = () => 'fallback';
    const externalHandler = () => 'external';
    const defaults = {
      [key]: {
        root: (...args: unknown[]) => {
          trace.push(['default', ...args]);
          return {
            fallback: true,
            onPress: fallbackHandler,
            style: { color: 'red' },
            className: 'theme',
          };
        },
      },
    };
    const props = {
      [key]: {
        root: (...args: unknown[]) => {
          trace.push(['external', ...args]);
          return { onPress: externalHandler, style: { padding: 4 }, className: 'app' };
        },
      },
    };
    const merged = resolveDefaultProps(defaults, props, true);
    expect(trace).toEqual([]);
    const owner = Object.freeze({ disabled: false });
    const extra = Object.freeze({ reason: 'live' });
    const value = merged[key].root(owner, extra);
    expect(trace).toEqual([
      ['default', owner, extra],
      ['external', owner, extra],
    ]);
    expect(value.onPress).toBe(externalHandler);
    expect(value).toMatchObject({
      fallback: true,
      style: { color: 'red', padding: 4 },
      className: 'theme app',
    });
  },
);

test.each(['slotProps', 'componentsProps'] as const)(
  'unopposed %s containers retain reference identity',
  (key) => {
    const fallback = Object.freeze({ root: Object.freeze({ id: 'theme' }) });
    const supplied = Object.freeze({ root: Object.freeze({ id: 'app' }) });
    expect(resolveDefaultProps({ [key]: fallback }, { [key]: null })[key]).toBe(fallback);
    expect(resolveDefaultProps({ [key]: null }, { [key]: supplied })[key]).toBe(supplied);
  },
);

test('value identity controls context subscriptions without adding native wrappers', () => {
  let calls = 0;
  const Probe = memo(function Probe() {
    calls++;
    const props = useSystemDefaults({ props: {} as { value?: string }, name: 'Probe' });
    return <Text>{props.value}</Text>;
  });
  const first = { Probe: { value: 'first' } };
  const tree = render(
    <SystemProvider value={first}>
      <Probe />
    </SystemProvider>,
  );
  expect(calls).toBe(1);
  expect(tree.toJSON()).toMatchObject({ type: 'Text', children: ['first'] });
  tree.rerender(
    <SystemProvider value={first}>
      <Probe />
    </SystemProvider>,
  );
  expect(calls).toBe(1);
  tree.rerender(
    <SystemProvider value={{ Probe: { value: 'second' } }}>
      <Probe />
    </SystemProvider>,
  );
  expect(calls).toBe(2);
  expect(tree.getByText('second')).toBeTruthy();
});

test('getThemeProps keeps its separate v5-only and non-merging helper semantics', () => {
  const props = { style: { padding: 4 } };
  const raw = getThemeProps({
    props,
    name: 'Probe',
    theme: { components: { Probe: { value: 'raw' } } },
  });
  const wrapped = getThemeProps({
    props,
    name: 'Probe',
    theme: {
      components: {
        mergeClassNameAndStyle: true,
        Probe: { defaultProps: { value: 'wrapped', style: { color: 'red' } } },
      },
    },
  });
  expect(raw).toEqual(reference.themeHelper.raw);
  expect(raw === props).toBe(reference.themeHelper.rawSame);
  expect(wrapped).toEqual(reference.themeHelper.wrapped);
  expect(wrapped.style === props.style).toBe(reference.themeHelper.styleSame);
});
