// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { Suspense, createRef, Children, type ReactElement, type ElementType } from 'react';
import { cleanup, render, act } from '@testing-library/react-native';
import { View, Text, StyleSheet, processColor, type ViewProps, type StyleProp } from 'react-native';
import {
  Button,
  Box,
  styled,
  ThemeProvider,
  createTheme,
  createNativeStyleCache,
  NativeStyleCacheProvider,
  type NativeStyleCache,
  type ButtonProps,
  type ButtonBaseActions,
  type NativeStyle,
  configureDiagnostics,
} from '../packages/material/src';
import { nativeStyleCacheRegistry as registry } from '../packages/system/src/nativeStyleCache';
import { NativeRootHandoffContext } from '../packages/system/src/internal/prepared-style';
import original from './fixtures/mui-button-group-cache-9.5.0.json';
import { Commands } from '../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';
import { compileCooperatingCandidates } from '../packages/material/src/cardContentCandidates';
import type {
  NativeRootStyleInput,
  NativeRootOutput,
} from '../packages/system/src/internal/prepared-style';

const caches: NativeStyleCache[] = [];
let restoreDiagnostics: (() => void) | undefined;
const diagnostics: { code: string; message: string }[] = [];
beforeEach(() => {
  // Renderer tests exercise source transitions without dispatching device commands.
  jest.spyOn(Commands, 'focus').mockImplementation(() => {});
  diagnostics.length = 0;
  restoreDiagnostics = configureDiagnostics((value) => diagnostics.push(value));
});
const cache = (key: string) => {
  const value = createNativeStyleCache({ key });
  caches.push(value);
  return value;
};
afterEach(() => {
  cleanup();
  restoreDiagnostics?.();
  for (const value of caches.splice(0)) value.dispose();
  jest.restoreAllMocks();
});

// Controlled original MUI 9.5.0 browser observations distinguish unknown
// foreign classes from registered same-key classes. Class attribute order
// alone never determines the equal-specificity stylesheet winner.
const scenarios = [
  { name: 'different-keys-cold', a: 'foreign-a', b: 'foreign-b', color: 'blue' },
  { name: 'different-keys-b-first', a: 'first-a', b: 'first-b', warm: 'block', color: 'red' },
  { name: 'same-key-cold', a: 'shared-cold', b: 'shared-cold', color: 'blue' },
  {
    name: 'same-key-registered',
    a: 'shared-warm',
    b: 'shared-warm',
    warm: 'registered',
    color: 'red',
  },
  {
    name: 'same-key-aborted-registration',
    a: 'shared-aborted',
    b: 'shared-aborted',
    warm: 'aborted',
    color: 'red',
  },
  {
    name: 'same-key-b-first-unregistered',
    a: 'shared-block',
    b: 'shared-block',
    warm: 'block',
    color: 'red',
  },
] as const;

test.each(scenarios)('a styled cache bridge matches original $name', (spec) => {
  const commits = jest.spyOn(registry, 'commit');
  const a = cache(spec.a),
    b = cache(spec.b),
    theme = createTheme();
  let warming = true;
  const suspended = new Promise<never>(() => {});
  const Shell = (props: ViewProps) => {
    if ('warm' in spec && spec.warm === 'aborted' && warming) throw suspended;
    return <View {...props} />;
  };
  const Warm =
    'warm' in spec && (spec.warm === 'registered' || spec.warm === 'aborted')
      ? styled(Shell)({ color: 'red' })
      : styled(View)({ padding: 1 });
  if ('warm' in spec) {
    const warm = render(
      <NativeStyleCacheProvider value={b}>
        <Suspense fallback={null}>
          <Warm />
        </Suspense>
      </NativeStyleCacheProvider>,
    );
    warm.unmount();
  }
  warming = false;
  const Bridge = (props: ButtonProps) => (
    <NativeStyleCacheProvider value={b}>
      <Button {...props} sx={{ color: 'blue', transition: 'none' }} />
    </NativeStyleCacheProvider>
  );
  const StyledBridge = styled(Bridge)({ color: 'red' });
  const tree = render(
    <NativeStyleCacheProvider value={a}>
      <ThemeProvider theme={theme}>
        <StyledBridge>Action</StyledBridge>
      </ThemeProvider>
    </NativeStyleCacheProvider>,
  );
  const color = StyleSheet.flatten(tree.getByText('Action').props.style)?.color;
  expect(processColor(color)).toBe(processColor(spec.color));
  const source = original.classMembership.find((row) => row.name === spec.name);
  if (!source?.calls || !source.color) throw Error('Missing controlled original cache evidence');
  expect(processColor(color)).toBe(processColor(source.color));
  for (const [name, selected] of [
    ['a', a],
    ['b', b],
  ] as const) {
    const nativeCss = [
      ...new Set(
        commits.mock.calls.flatMap(([chain]) =>
          chain.filter((item) => item.cache === selected).map((item) => item.css),
        ),
      ),
    ].sort();
    const originalCss = [
      ...new Set(source.calls.filter((item) => item.cache === name).map((item) => item.css)),
    ].sort();
    expect(nativeCss).toEqual(originalCss);
  }

  expect(
    diagnostics.every(
      (value) => value.code === 'style' && value.message === 'Unsupported native style transition',
    ),
  ).toBe(true);
});

test('resetting an unmounted foreign emitter removes its class while the receiving root remains mounted', () => {
  const a = cache('reset-source'),
    b = cache('reset-target'),
    theme = createTheme();
  const Warm = styled(View)({ padding: 1 });
  const warm = render(
    <NativeStyleCacheProvider value={b}>
      <Warm />
    </NativeStyleCacheProvider>,
  );
  warm.unmount();
  let captured: StyleProp<NativeStyle> = undefined;
  const Capture = ({ style }: { style?: StyleProp<NativeStyle> }) => {
    captured = style;
    return null;
  };
  const Producer = styled(Capture)({ color: 'red' });
  const producer = render(
    <NativeStyleCacheProvider value={a}>
      <Producer />
    </NativeStyleCacheProvider>,
  );
  producer.unmount();
  const tree = render(
    <NativeStyleCacheProvider value={b}>
      <ThemeProvider theme={theme}>
        <Button style={captured} sx={{ color: 'blue' }}>
          Receiver
        </Button>
      </ThemeProvider>
    </NativeStyleCacheProvider>,
  );
  const color = () =>
    processColor(StyleSheet.flatten(tree.getByText('Receiver').props.style)?.color);
  expect(color()).toBe(processColor('red'));
  act(() => a.reset());
  expect(color()).toBe(processColor('blue'));
});

test.each(['reset', 'duplicate'] as const)(
  'an idle styled Text refreshes foreign CSS after %s without rerunning its source callback',
  (mode) => {
    const a = cache('terminal-source'),
      b = cache('terminal-target');
    if (mode === 'reset') {
      const Warm = styled(View)({ padding: 1 });
      const warm = render(
        <NativeStyleCacheProvider value={b}>
          <Warm />
        </NativeStyleCacheProvider>,
      );
      warm.unmount();
    }
    let captured: StyleProp<NativeStyle> = undefined;
    const Capture = ({ style }: { style?: StyleProp<NativeStyle> }) => {
      captured = style;
      return null;
    };
    const Producer = styled(Capture)({ color: 'red' });
    const producer = render(
      <NativeStyleCacheProvider value={a}>
        <Producer />
      </NativeStyleCacheProvider>,
    );
    producer.unmount();
    let calls = 0;
    const Receiver = styled(Text)(() => {
      calls++;
      return { color: 'blue' };
    });
    const tree = render(
      <NativeStyleCacheProvider value={b}>
        <Receiver style={captured}>Terminal receiver</Receiver>
      </NativeStyleCacheProvider>,
    );
    const color = () =>
      processColor(StyleSheet.flatten(tree.getByText('Terminal receiver').props.style)?.color);
    expect(color()).toBe(processColor(mode === 'reset' ? 'red' : 'blue'));
    if (mode === 'reset') act(() => a.reset());
    else {
      const duplicate = cache('terminal-source');
      const warm = render(
        <NativeStyleCacheProvider value={duplicate}>
          <Producer />
        </NativeStyleCacheProvider>,
      );
      warm.unmount();
    }
    expect(color()).toBe(processColor(mode === 'reset' ? 'blue' : 'red'));
    expect(calls).toBe(1);
  },
);

test('several cold styled bridges retain incoming class order for a receiver recognizing multiple tokens', () => {
  const a = cache('multi-hop'),
    b = cache('multi-hop'),
    c = cache('multi-hop'),
    d = cache('multi-hop');
  const Shell = (_props: ViewProps) => null;
  const Red = styled(Shell)({ color: 'red' }),
    Blue = styled(Shell)({ color: 'blue' });
  const warm = render(
    <NativeStyleCacheProvider value={d}>
      <Red />
      <Blue />
    </NativeStyleCacheProvider>,
  );
  warm.unmount();
  const Third = styled((props: ButtonProps) => (
    <NativeStyleCacheProvider value={d}>
      <Button {...props} sx={{ color: 'green' }} />
    </NativeStyleCacheProvider>
  ))({ padding: 2 });
  const Second = styled((props: ButtonProps) => (
    <NativeStyleCacheProvider value={c}>
      <Third {...props} />
    </NativeStyleCacheProvider>
  ))({ color: 'blue' });
  const First = styled((props: ButtonProps) => (
    <NativeStyleCacheProvider value={b}>
      <Second {...props} />
    </NativeStyleCacheProvider>
  ))({ color: 'red' });
  const tree = render(
    <NativeStyleCacheProvider value={a}>
      <First>Multi-hop receiver</First>
    </NativeStyleCacheProvider>,
  );
  expect(
    processColor(StyleSheet.flatten(tree.getByText('Multi-hop receiver').props.style)?.color),
  ).toBe(processColor('blue'));
});

test('a terminal red stylesheet does not register its class for a later same-key receiving component', () => {
  const a = cache('terminal-membership'),
    b = cache('terminal-membership');
  const Block = styled(View)({ padding: 1 });
  const early = render(
    <NativeStyleCacheProvider value={a}>
      <Block />
    </NativeStyleCacheProvider>,
  );
  early.unmount();
  const TerminalRed = styled(View)({ color: 'red' });
  const terminal = render(
    <NativeStyleCacheProvider value={b}>
      <TerminalRed />
    </NativeStyleCacheProvider>,
  );
  terminal.unmount();
  const Bridge = styled((props: ButtonProps) => (
    <NativeStyleCacheProvider value={b}>
      <Button {...props} sx={{ color: 'blue' }} />
    </NativeStyleCacheProvider>
  ))({ color: 'red' });
  const tree = render(
    <NativeStyleCacheProvider value={a}>
      <Bridge>Terminal membership</Bridge>
    </NativeStyleCacheProvider>,
  );
  expect(
    processColor(StyleSheet.flatten(tree.getByText('Terminal membership').props.style)?.color),
  ).toBe(processColor('blue'));
});

test('a genuine Base focus render resolves newly registered incoming classes', () => {
  const a = cache('focused-membership'),
    b = cache('focused-membership');
  const Warm = styled(View)({ padding: 1 });
  const warm = render(
    <NativeStyleCacheProvider value={b}>
      <Warm />
    </NativeStyleCacheProvider>,
  );
  warm.unmount();
  const action = createRef<ButtonBaseActions>();
  const Bridge = styled((props: ButtonProps) => (
    <NativeStyleCacheProvider value={b}>
      <Button {...props} action={action} sx={{ color: 'blue', transition: 'none' }} />
    </NativeStyleCacheProvider>
  ))({ color: 'red' });
  const tree = render(
    <NativeStyleCacheProvider value={a}>
      <ThemeProvider theme={createTheme()}>
        <Bridge>Focused membership</Bridge>
      </ThemeProvider>
    </NativeStyleCacheProvider>,
  );
  const color = () =>
    processColor(StyleSheet.flatten(tree.getByText('Focused membership').props.style)?.color);
  expect(color()).toBe(processColor('red'));
  const Register = styled((props: ViewProps) => <View {...props} />)({ color: 'red' });
  const registration = render(
    <NativeStyleCacheProvider value={b}>
      <Register />
    </NativeStyleCacheProvider>,
  );
  registration.unmount();
  expect(color()).toBe(processColor('red'));
  act(() => action.current!.focusVisible());
  expect(color()).toBe(processColor('blue'));
});

test('styled Box forwarding keeps source CSS in the selected explicit cache', () => {
  const selected = cache('box-forwarding');
  const order = jest.spyOn(registry, 'order');
  try {
    const Root = styled(Box)({ color: 'red' });
    render(
      <NativeStyleCacheProvider value={selected}>
        <Root testID="cache-box" sx={{ color: 'blue' }}>
          <Text>Box cache</Text>
        </Root>
      </NativeStyleCacheProvider>,
    );
    expect(order.mock.calls.length).toBeGreaterThan(0);
    expect(order.mock.calls.every(([insertion]) => insertion.cache === selected)).toBe(true);
  } finally {
    order.mockRestore();
  }
});

test.each(['default', 'forwarded', 'consumed'] as const)(
  'styled as follows original %s target and cache registration semantics',
  (mode) => {
    const selected = cache('as-' + mode);
    const filters: string[] = [];
    let forwardedAs: ElementType | undefined;
    const Shell = ({ as, ...props }: ViewProps & { as?: ElementType }) => {
      forwardedAs = as;
      return <View {...props} />;
    };
    const constructor = styled(
      Shell,
      mode === 'default'
        ? undefined
        : {
            shouldForwardProp(key) {
              filters.push(key);
              return mode === 'forwarded' || key !== 'as';
            },
          },
    );
    expect(filters).toEqual(mode === 'default' ? [] : ['as']);
    const Root = constructor({ color: 'red' });
    const tree = render(
      <NativeStyleCacheProvider value={selected}>
        <Root as={Text} testID="as-target">
          As choice
        </Root>
      </NativeStyleCacheProvider>,
    );
    expect(tree.UNSAFE_queryByType(Shell) !== null).toBe(mode === 'forwarded');
    expect(forwardedAs).toBe(mode === 'forwarded' ? Text : undefined);
    expect(
      registry.registered(selected, { cache: selected, css: 'color:red;;', hasRules: true }),
    ).toBe(mode === 'forwarded');
  },
);

test('adjacent opaque styled constructors retain source expressions and composed forwarding', () => {
  const selected = cache('as-opaque');
  const trace: string[] = [];
  const receivers: unknown[] = [];
  const Shell = (props: ViewProps) => <View {...props} />;
  const Inner = styled(Shell, {
    shouldForwardProp: function (key) {
      'use strict';
      receivers.push(this);
      trace.push('inner:' + key);
      return key !== 'as';
    },
  })({ padding: 2 });
  trace.length = 0;
  const Outer = styled(Inner, {
    shouldForwardProp: function (key) {
      'use strict';
      receivers.push(this);
      trace.push('outer:' + key);
      return true;
    },
  })({ color: 'blue' });
  expect(trace).toEqual(['inner:as']);
  const tree = render(
    <NativeStyleCacheProvider value={selected}>
      <Outer as={Text} testID="opaque-as">
        Opaque native text
      </Outer>
    </NativeStyleCacheProvider>,
  );
  expect(tree.UNSAFE_queryByType(Shell)).toBeNull();
  expect(StyleSheet.flatten(tree.getByTestId('opaque-as').props.style)).toMatchObject({
    padding: 2,
    color: 'blue',
  });
  expect(
    receivers.map((receiver) =>
      receiver === undefined ? 'undefined' : receiver === Inner ? 'inner' : 'unexpected',
    ),
  ).toEqual(['undefined', 'inner', 'inner', 'undefined', 'inner', 'undefined']);
  expect(trace.filter((key) => key.endsWith(':as'))).toEqual(['inner:as']);
});

test('an untyped DOM as target fails with a native component diagnostic', () => {
  const Root = styled(View)({ color: 'red' });
  expect(() => render(<Root {...({ as: 'span' } as unknown as { as: typeof View })} />)).toThrow(
    'Native styled as targets must be native components',
  );
});

test('a pending physical-root handoff rejects replacement before preparing or rendering descendants', () => {
  const Root = styled(View)({ padding: 2 });
  const child = jest.fn(() => ({ opacity: 0.5 }));
  const Child = styled(View)(child);
  const prepare = jest.fn();
  const renderRoot = jest.fn();
  expect(() =>
    render(
      <NativeRootHandoffContext.Provider value={{ target: Root, prepare, render: renderRoot }}>
        <Root as={Text}>
          <Child />
        </Root>
      </NativeRootHandoffContext.Provider>,
    ),
  ).toThrow('A cooperating native root cannot replace its physical target through styled as');
  expect(prepare).not.toHaveBeenCalled();
  expect(renderRoot).not.toHaveBeenCalled();
  expect(child).not.toHaveBeenCalled();
});

test('a plain Box commits and leases its own source programme', () => {
  const selected = cache('plain-box');
  const order = jest.spyOn(registry, 'order');
  try {
    const tree = render(
      <NativeStyleCacheProvider value={selected}>
        <Box sx={{ color: 'blue' }}>
          <Text>Leased Box</Text>
        </Box>
      </NativeStyleCacheProvider>,
    );
    const token = order.mock.calls
      .map(([value]) => value)
      .find((value) => value.cache === selected && value.css.includes('color:blue;'));
    expect(token).toBeDefined();
    expect(registry.committedOrder(token!)).toBeDefined();
    expect(() => selected.reset()).toThrow('Unmount the native style cache roots');
    tree.unmount();
    expect(() => selected.reset()).not.toThrow();
  } finally {
    order.mockRestore();
  }
});

test('an idle Box refreshes foreign CSS after emitter reset without rerunning sx', () => {
  const a = cache('box-reset-source'),
    b = cache('box-reset-target');
  const Warm = styled(View)({ padding: 1 });
  const warm = render(
    <NativeStyleCacheProvider value={b}>
      <Warm />
    </NativeStyleCacheProvider>,
  );
  warm.unmount();
  let captured: StyleProp<NativeStyle> = undefined;
  const Producer = styled(({ style }: { style?: StyleProp<NativeStyle> }) => {
    captured = style;
    return null;
  })({ color: 'red' });
  const producer = render(
    <NativeStyleCacheProvider value={a}>
      <Producer />
    </NativeStyleCacheProvider>,
  );
  producer.unmount();
  const sx = jest.fn(() => ({ color: 'blue' }));
  const tree = render(
    <NativeStyleCacheProvider value={b}>
      <Box style={captured} sx={sx}>
        <Text>Idle Box receiver</Text>
      </Box>
    </NativeStyleCacheProvider>,
  );
  const color = () =>
    processColor(StyleSheet.flatten(tree.getByText('Idle Box receiver').props.style)?.color);
  expect(color()).toBe(processColor('red'));
  act(() => a.reset());
  expect(color()).toBe(processColor('blue'));
  expect(sx).toHaveBeenCalledTimes(1);
});

test('explicit undefined forwarding uses the original plain component fallback', () => {
  let received: unknown;
  const Shell = ({ as, ...props }: ViewProps & { as?: ElementType }) => {
    received = as;
    return <View {...props} />;
  };
  const Root = styled(Shell, { shouldForwardProp: undefined })({ color: 'red' });
  render(<Root as={Text}>Forwarded as</Root>);
  expect(received).toBe(Text);
});

test('explicit undefined forwarding inherits the original predicate directly', () => {
  const trace: string[] = [],
    receivers: unknown[] = [];
  const Shell = (props: ViewProps) => <View {...props} />;
  const Inner = styled(Shell, {
    shouldForwardProp: function (key) {
      'use strict';
      receivers.push(this);
      trace.push(key);
      return key !== 'as';
    },
  })({ padding: 2 });
  trace.length = 0;
  const Outer = styled(Inner, { shouldForwardProp: undefined })({ color: 'blue' });
  expect(trace).toEqual(['as']);
  const tree = render(
    <Outer as={Text} testID="direct-inheritance">
      Direct inherited
    </Outer>,
  );
  expect(tree.UNSAFE_queryByType(Shell)).toBeNull();
  expect(receivers.every((receiver) => receiver === undefined)).toBe(true);
  expect(trace.filter((key) => key === 'as')).toEqual(['as']);
});

test.each([false, true])(
  'a Box custom bridge retains class specificity and genuine native inline=%s',
  (inline) => {
    const Inner = styled(View)({ '&.MuiBox-root': { color: 'blue' } });
    const Bridge = (props: ViewProps) => <Inner {...props} />;
    const tree = render(
      <Box component={Bridge} sx={{ color: 'red' }} style={inline ? { color: 'green' } : undefined}>
        <Text>Box bridge specificity</Text>
      </Box>,
    );
    expect(
      processColor(StyleSheet.flatten(tree.getByText('Box bridge specificity').props.style)?.color),
    ).toBe(processColor(inline ? 'green' : 'blue'));
  },
);

test('a Box physical handoff owns CSS and refreshes all prepared outputs without replaying its source', () => {
  const a = cache('handoff-source'),
    b = cache('handoff-target');
  const Warm = styled(View)({ padding: 1 });
  const warm = render(
    <NativeStyleCacheProvider value={b}>
      <Warm />
    </NativeStyleCacheProvider>,
  );
  warm.unmount();
  let captured: StyleProp<NativeStyle> = undefined;
  const Producer = styled(({ style }: { style?: StyleProp<NativeStyle> }) => {
    captured = style;
    return null;
  })({ backgroundColor: 'red' });
  const producer = render(
    <NativeStyleCacheProvider value={a}>
      <Producer />
    </NativeStyleCacheProvider>,
  );
  producer.unmount();
  const prepare = jest.fn((input: NativeRootStyleInput) =>
    compileCooperatingCandidates({ styleProgram: undefined, styleContext: { classes: [] } }, input),
  );
  const physical = jest.fn((output: NativeRootOutput) => (
    <View testID="box-physical-handoff" style={output.presentation}>
      {output.children}
    </View>
  ));
  const sx = jest.fn(() => ({ backgroundColor: 'blue' }));
  const tree = render(
    <NativeStyleCacheProvider value={b}>
      <NativeRootHandoffContext.Provider value={{ target: Box, prepare, render: physical }}>
        <Box style={captured} sx={sx} />
      </NativeRootHandoffContext.Provider>
    </NativeStyleCacheProvider>,
  );
  const paint = () =>
    StyleSheet.flatten(tree.getByTestId('box-physical-handoff').props.style)?.backgroundColor;
  expect(processColor(paint())).toBe(processColor('red'));
  expect(() => b.reset()).toThrow('Unmount the native style cache roots');
  act(() => a.reset());
  expect(processColor(paint())).toBe(processColor('blue'));
  const current = physical.mock.calls.at(-1)![0].preparation;
  expect(processColor(current.normal.backgroundColor)).toBe(processColor('blue'));
  expect(processColor(current.last.backgroundColor)).toBe(processColor('blue'));
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(sx).toHaveBeenCalledTimes(1);
});

test.each(['literal', 'text', 'native-inline', 'nested-view'] as const)(
  'custom Box root text inheritance rebinds %s at the actual styled root',
  (mode) => {
    const Inner = styled(View)({ '&.MuiBox-root': { color: 'blue' } });
    const Bridge = (props: ViewProps) => <Inner {...props} />;
    const content =
      mode === 'literal' ? (
        'Nearest text scope'
      ) : mode === 'nested-view' ? (
        <View>
          <Text>Nearest text scope</Text>
        </View>
      ) : (
        <Text style={mode === 'native-inline' ? { color: 'green' } : undefined}>
          Nearest text scope
        </Text>
      );
    const tree = render(
      <Box component={Bridge} sx={{ color: 'red' }}>
        {content}
      </Box>,
    );
    expect(
      processColor(StyleSheet.flatten(tree.getByText('Nearest text scope').props.style)?.color),
    ).toBe(processColor(mode === 'native-inline' ? 'green' : 'blue'));
  },
);

test.each(['literal', 'text'] as const)(
  'a custom root mutation of emitted %s style stays authored',
  (mode) => {
    const Inner = styled(View)({ color: 'blue' });
    const Bridge = (props: ViewProps) => {
      const child = Children.only(props.children) as ReactElement<{ style: NativeStyle }>;
      expect(Reflect.set(child.props.style, 'color', 'green')).toBe(true);
      return <Inner {...props} />;
    };
    const tree = render(
      <Box component={Bridge} sx={{ color: 'red' }}>
        {mode === 'literal' ? 'Mutated native style' : <Text>Mutated native style</Text>}
      </Box>,
    );
    expect(
      processColor(StyleSheet.flatten(tree.getByText('Mutated native style').props.style)?.color),
    ).toBe(processColor('green'));
  },
);
