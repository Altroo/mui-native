// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { forwardRef, useState } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewInstance } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import {
  createTheme,
  ThemeProvider,
  DefaultPropsProvider,
  styled,
  useNativeRootProps,
  useComponentRootStyle,
  useTheme,
  useNativeTextContext,
  nativeTextStyleContext,
  NativeTextScope,
  createNativeStyledStyle,
  componentRootStyle,
  getThemeProps,
  type NativeStyle,
  type SxProps,
} from '../packages/system/src';
import {
  separateNativeRootProps,
  restoreNativeRootStyle,
} from '../packages/system/src/nativeStyledMetadata';
import original from './fixtures/mui-list-item-icon-9.5.0.json';
interface Props {
  style?: StyleProp<NativeStyle> | undefined;
  sx?: SxProps | undefined;
  children?: React.ReactNode;
  testID?: string;
}
const Root = forwardRef<ViewInstance, Props>(function Root(inProps, ref) {
  const { props, style } = useNativeRootProps({ props: inProps, name: 'MuiProbe' });
  const theme = useTheme(),
    parent = useNativeTextContext();
  const { computed, authored } = useComponentRootStyle('MuiProbe', props, props.sx, style, {
    ...nativeTextStyleContext(parent, props.style, theme),
  });
  return (
    <NativeTextScope theme={theme} style={[computed, authored]} content={props.children}>
      {(style, children) => (
        <View ref={ref} testID={props.testID} style={style}>
          {children}
        </View>
      )}
    </NativeTextScope>
  );
});
function observe(input: unknown) {
  const spec = input as {
    defaultStyle?: Record<string, unknown>;
    defaultSx?: SxProps;
    style?: StyleProp<NativeStyle> | '$undefined';
    sx?: SxProps | '$undefined';
    nested?: boolean;
    merge?: boolean;
  };
  let actual: unknown;
  const theme = createTheme({
    components: {
      mergeClassNameAndStyle: spec.merge ?? false,
      MuiProbe: {
        defaultProps: {
          ...(Object.hasOwn(spec, 'defaultStyle') ? { style: spec.defaultStyle } : {}),
          ...(Object.hasOwn(spec, 'defaultSx') ? { sx: spec.defaultSx } : {}),
        },
        styleOverrides: {
          root: ({ ownerState }) => {
            actual = {
              hasStyle: Object.hasOwn(ownerState, 'style'),
              style: ownerState.style ?? null,
              hasSx: Object.hasOwn(ownerState, 'sx'),
              sx: ownerState.sx ?? null,
            };
            return {};
          },
        },
      },
    },
  });
  const Styled = spec.nested
    ? styled(styled(Root)({ opacity: 0.6 }))({ opacity: 0.8 })
    : styled(Root)({ opacity: 0.8 });
  const style = spec.style === '$undefined' ? undefined : spec.style;
  const sx = spec.sx === '$undefined' ? undefined : spec.sx;
  const tree = render(
    <ThemeProvider theme={theme}>
      <Styled
        testID="root"
        {...(Object.hasOwn(spec, 'style') ? { style } : {})}
        {...(Object.hasOwn(spec, 'sx') ? { sx } : {})}
      />
    </ThemeProvider>,
  );
  return { actual, tree };
}
test.each(original.styledDefaults)(
  'generic participating root preserves source defaults: $input.name',
  ({ input, observation, cssOpacity }) => {
    const { actual, tree } = observe(input);
    expect(actual).toEqual(observation);
    const opacity =
      typeof observation.style?.opacity === 'number' ? observation.style.opacity : cssOpacity;
    expect(tree.getByTestId('root')).toHaveStyle({ opacity });
  },
);
test('registered frozen native arrays remain genuine owner props and keep their identity', () => {
  const registered = StyleSheet.create({ edge: { paddingLeft: 3 } });
  const style = Object.freeze([
    registered.edge,
    false as const,
    Object.freeze([null, { borderRadius: 7 }]),
  ]);
  let observed: unknown;
  const theme = createTheme({
    components: {
      MuiProbe: {
        defaultProps: { style: { opacity: 0.2 } },
        styleOverrides: {
          root: ({ ownerState }) => {
            observed = ownerState.style;
            return {};
          },
        },
      },
    },
  });
  const Inner = styled(Root)({ paddingTop: 4 }),
    Outer = styled(Inner)({ opacity: 0.8 });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Outer testID="root" style={style} />
    </ThemeProvider>,
  );
  expect(observed).toBe(style);
  expect(tree.getByTestId('root')).toHaveStyle({
    paddingTop: 4,
    paddingLeft: 3,
    borderRadius: 7,
    opacity: 0.8,
  });
  expect(style).toEqual([registered.edge, false, [null, { borderRadius: 7 }]]);
});
test('default context updates preserve outer callback counts, native root and child state', () => {
  const evaluate = jest.fn(() => ({ opacity: 0.8 }));
  const Styled = styled(Root)(evaluate);
  function Child() {
    const [count, setCount] = useState(0);
    return (
      <Text testID="child" onPress={() => setCount((value) => value + 1)}>
        {count}
      </Text>
    );
  }
  const release = jest.fn(),
    ref = jest.fn((_node: ViewInstance | null) => release);
  const stable = (
    <Styled testID="root" ref={ref}>
      <Child />
    </Styled>
  );
  const content = (opacity: number) => (
    <DefaultPropsProvider value={{ MuiProbe: { defaultProps: { style: { opacity } } } }}>
      {stable}
    </DefaultPropsProvider>
  );
  const tree = render(content(0.2));
  const node = ref.mock.calls[0]?.[0];
  expect(node).toBeTruthy();
  expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.2 });
  fireEvent.press(tree.getByTestId('child'));
  tree.rerender(content(0.4));
  expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.4 });
  expect(tree.getByTestId('child')).toHaveTextContent('1');
  expect(ref).toHaveBeenCalledTimes(1);
  expect(ref.mock.calls[0]?.[0]).toBe(node);
  expect(evaluate).toHaveBeenCalledTimes(1);
  tree.unmount();
  expect(release).toHaveBeenCalledTimes(1);
});
test('splitting observes style once and leaves other accessors lazy for default resolution', () => {
  const theme = createTheme(),
    events: string[] = [];
  const authored = Object.freeze({ paddingLeft: 3 });
  const prepared = createNativeStyledStyle(
    theme,
    '',
    { style: authored },
    undefined,
    { baseStyle: { opacity: 0.8 } },
    authored,
  );
  const input = Object.freeze({
    get style() {
      events.push('style');
      return prepared;
    },
    get id() {
      events.push('id');
      return 'public-id';
    },
  });
  const before = Object.getOwnPropertyDescriptors(input);
  const separated = separateNativeRootProps(input);
  expect(events).toEqual(['style']);
  const resolved = getThemeProps({
    theme: { components: { MuiProbe: { defaultProps: { style: { opacity: 0.2 } } } } },
    name: 'MuiProbe',
    props: separated.props,
  });
  expect(events).toEqual(['style', 'id']);
  expect(resolved.style).toBe(authored);
  expect(resolved.id).toBe('public-id');
  const result = restoreNativeRootStyle(separated, resolved);
  expect(result).not.toBe(prepared);
  expect(Object.getOwnPropertyDescriptors(input)).toEqual(before);
});
test('ordinary native style props keep identity without creating a prepared layer', () => {
  const style = Object.freeze({ opacity: 0.4 }),
    props = Object.freeze({ style });
  const input = separateNativeRootProps(props);
  expect(input.props).toBe(props);
  expect(restoreNativeRootStyle(input, props)).toBe(style);
});

test('genuine default native metrics bind prepared CSS lengths once at the final root', () => {
  let scope: unknown;
  function Probe() {
    scope = useNativeTextContext()?.style;
    return <Text>Metrics</Text>;
  }
  const Styled = styled(Root)({ fontSize: '2em', lineHeight: 2, letterSpacing: '0.1em' });
  const theme = createTheme({
    components: { MuiProbe: { defaultProps: { style: { fontSize: 30, lineHeight: 37 } } } },
  });
  render(
    <ThemeProvider theme={theme}>
      <NativeTextScope theme={theme} style={{ fontSize: 10 }}>
        {() => (
          <Styled>
            <Probe />
          </Styled>
        )}
      </NativeTextScope>
    </ThemeProvider>,
  );
  expect(scope).toMatchObject({ fontSize: 30, lineHeight: 37, letterSpacing: 3 });
});

test('an ordinary style accessor is observed once before default spread', () => {
  const theme = { components: { MuiProbe: { defaultProps: {} } } };
  let baselineReads = 0;
  const baseline = getThemeProps({
    theme,
    name: 'MuiProbe',
    props: {
      get style() {
        return { opacity: ++baselineReads };
      },
    },
  });
  expect(baselineReads).toBe(1);
  let reads = 0;
  const props = Object.freeze({
    get style() {
      return { opacity: ++reads };
    },
  });
  const input = separateNativeRootProps(props);
  const resolved = getThemeProps({ theme, name: 'MuiProbe', props: input.props });
  expect(reads).toBe(baselineReads);
  expect(resolved.style).toEqual(baseline.style);
});
test('a non-enumerable prepared style is ignored without retaining CSS sheets', () => {
  const theme = createTheme();
  const prepared = createNativeStyledStyle(
    theme,
    '',
    { style: { opacity: 0.9 } },
    undefined,
    { baseStyle: { opacity: 0.8 } },
    { opacity: 0.9 },
  );
  const props: { style?: StyleProp<NativeStyle>; id: string } = { id: 'public' };
  Object.defineProperty(props, 'style', { value: prepared, enumerable: false });
  Object.freeze(props);
  const before = Object.getOwnPropertyDescriptors(props);
  const input = separateNativeRootProps(props);
  expect(Object.hasOwn(input.props, 'style')).toBe(false);
  expect(input.prepared).toBeUndefined();
  const resolved = getThemeProps({
    theme: { components: { MuiProbe: { defaultProps: { style: { opacity: 0.2 } } } } },
    name: 'MuiProbe',
    props: input.props,
  });
  expect(resolved.style).toEqual({ opacity: 0.2 });
  const restored = restoreNativeRootStyle(input, resolved);
  expect(restored).toBe(resolved.style);
  expect(componentRootStyle(theme, '', {}, undefined, restored).computed.opacity).toBeUndefined();
  expect(Object.getOwnPropertyDescriptors(props)).toEqual(before);
});

test('a hidden throwing style getter is never observed by root default preparation', () => {
  let reads = 0;
  const props: { id: string; style?: StyleProp<NativeStyle> } = { id: 'public' };
  Object.defineProperty(props, 'style', {
    enumerable: false,
    get() {
      reads++;
      throw new Error('hidden style must be ignored');
    },
  });
  Object.freeze(props);
  const before = Object.getOwnPropertyDescriptors(props);
  const theme = { components: { MuiProbe: { defaultProps: { style: { opacity: 0.2 } } } } };
  expect(getThemeProps({ theme, name: 'MuiProbe', props }).style).toEqual({ opacity: 0.2 });
  expect(reads).toBe(0);
  const input = separateNativeRootProps(props);
  expect(input.props.id).toBe('public');
  expect(input.prepared).toBeUndefined();
  expect(restoreNativeRootStyle(input, input.props)).toBeUndefined();
  expect(getThemeProps({ theme, name: 'MuiProbe', props: input.props }).style).toEqual({
    opacity: 0.2,
  });
  expect(reads).toBe(0);
  expect(Object.getOwnPropertyDescriptors(props)).toEqual(before);
});
