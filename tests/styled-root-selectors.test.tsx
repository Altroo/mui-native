// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { createContext, forwardRef, useContext, useState } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewInstance } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import {
  styled,
  componentRootStyle,
  createNativeStyledStyle,
  createTheme,
  ThemeProvider,
  configureDiagnostics,
  resolveSx,
  useTheme,
  useComponentRootStyle,
  NativeTextScope,
  useNativeTextContext,
  nativeTextStyleContext,
  type NativeStyle,
  type SxProps,
} from '../packages/system/src';
const State = createContext({ error: false, align: false });
interface RootProps {
  row?: boolean;
  sx?: SxProps;
  style?: StyleProp<NativeStyle>;
  testID?: string;
  children?: React.ReactNode;
  onPress?: () => void;
}
const Root = forwardRef<ViewInstance, RootProps>(function Root(props, ref) {
  const { error, align } = useContext(State);
  const theme = useTheme(),
    parent = useNativeTextContext();
  const classes = [
    'MuiProbe-root',
    ...(props.row ? ['MuiProbe-row'] : []),
    ...(error ? ['Mui-error'] : []),
    ...(align ? ['MuiProbe-alignItemsFlexStart'] : []),
  ];
  const { computed, authored } = useComponentRootStyle(
    'MuiProbe',
    { ...props, error, align },
    props.sx,
    props.style,
    {
      ...nativeTextStyleContext(parent, props.style, theme),
      classes,
      states: error ? ['error'] : [],
      baseStyle: { opacity: 1 },
    },
  );
  return (
    <NativeTextScope theme={theme} style={[computed, authored]} content={props.children}>
      {(style, children) => (
        <View ref={ref} testID={props.testID} onTouchEnd={props.onPress} style={style}>
          {children}
        </View>
      )}
    </NativeTextScope>
  );
});
test('styled selectors use final row and inherited error classes', () => {
  const Styled = styled(Root)({
    '&.MuiProbe-row': { opacity: 0.6 },
    '&.Mui-error': { paddingLeft: 9 },
  });
  const tree = render(
    <State.Provider value={{ error: true, align: false }}>
      <Styled testID="root" row />
    </State.Provider>,
  );
  expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.6, paddingLeft: 9 });
});
test('styled selectors use final contextual alignment classes', () => {
  const Styled = styled(Root)({ '&.MuiProbe-alignItemsFlexStart': { marginTop: 12 } });
  const tree = render(
    <State.Provider value={{ error: false, align: true }}>
      <Styled testID="root" />
    </State.Provider>,
  );
  expect(tree.getByTestId('root')).toHaveStyle({ marginTop: 12 });
});

test('context and row classes update without leaking to a nested root', () => {
  const Styled = styled(Root)({ '&.MuiProbe-row.Mui-error': { opacity: 0.4, paddingLeft: 7 } });
  const tree = render(
    <State.Provider value={{ error: true, align: false }}>
      <Styled testID="outer" row>
        <Root testID="inner" />
      </Styled>
    </State.Provider>,
  );
  expect(tree.getByTestId('outer')).toHaveStyle({ opacity: 0.4, paddingLeft: 7 });
  expect(tree.getByTestId('inner')).toHaveStyle({ opacity: 1 });
  expect(StyleSheet.flatten(tree.getByTestId('inner').props.style).paddingLeft).toBeUndefined();
  tree.rerender(
    <State.Provider value={{ error: false, align: false }}>
      <Styled testID="outer" row>
        <Root testID="inner" />
      </Styled>
    </State.Provider>,
  );
  expect(tree.getByTestId('outer')).toHaveStyle({ opacity: 1 });
  expect(StyleSheet.flatten(tree.getByTestId('outer').props.style).paddingLeft).toBeUndefined();
});
test('nested wrappers share specificity and equal-specificity source order', () => {
  const Inner = styled(Root)({
    '&.MuiProbe-root.MuiProbe-row': { opacity: 0.3, marginTop: 3 },
    '&.MuiProbe-root': { paddingLeft: 4 },
  });
  const Outer = styled(Inner)({
    opacity: 0.8,
    '&.MuiProbe-root': { opacity: 0.7, paddingLeft: 6 },
  });
  const tree = render(<Outer testID="root" row sx={{ opacity: 0.9, paddingLeft: 8 }} />);
  expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.3, paddingLeft: 6, marginTop: 3 });
});
test('outer sx follows equal-specificity CSS, and genuine inline stays last', () => {
  const Styled = styled(Root)({ opacity: 0.3, paddingLeft: 3, '&.MuiProbe-row': { marginTop: 6 } });
  const registered = StyleSheet.create({
    inline: { opacity: 0.9, paddingLeft: 12, marginTop: 17 },
  });
  const native = Object.freeze([
    false as const,
    Object.freeze({ opacity: 0.8 }),
    [registered.inline],
  ]);
  const tree = render(
    <Styled testID="root" row sx={{ opacity: 0.5, paddingLeft: 1 }} style={native} />,
  );
  expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.9, paddingLeft: 12, marginTop: 17 });
  expect(native[1]).toEqual({ opacity: 0.8 });
  tree.rerender(<Styled testID="root" row sx={{ opacity: 0.5, paddingLeft: 1 }} />);
  expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.5, paddingLeft: 8, marginTop: 6 });
});
test('preparation evaluates outer callbacks and variants once, preserving outer arguments', () => {
  const base = jest.fn((props: { row?: boolean; ownerState?: unknown }) => {
    expect(props.row).toBe(true);
    expect(props.ownerState).toBeUndefined();
    expect('error' in props).toBe(false);
    return { '&.Mui-error': { opacity: 0.4 } };
  });
  const predicate = jest.fn((props) => {
    expect(props.ownerState.row).toBe(true);
    expect(props.ownerState.error).toBeUndefined();
    return true;
  });
  const variant = jest.fn(() => ({ '&.MuiProbe-row': { marginTop: 5 } }));
  const sx = jest.fn(() => ({ paddingLeft: 2 }));
  const theme = createTheme({
    components: { MuiStyled: { variants: [{ props: predicate, style: variant }] } },
  });
  const Styled = styled(Root, { name: 'MuiStyled' })(base);
  const tree = render(
    <ThemeProvider theme={theme}>
      <State.Provider value={{ error: true, align: false }}>
        <Styled testID="root" row sx={sx} />
      </State.Provider>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.4, marginTop: 5, paddingLeft: 16 });
  for (const callback of [base, predicate, variant, sx]) expect(callback).toHaveBeenCalledTimes(1);
});
test('late collection retains prepared owner media width, modes and theme aliases', () => {
  const theme = createTheme({ spacing: 10 });
  const style = createNativeStyledStyle(
    theme,
    '',
    {},
    { paddingLeft: 2 },
    {
      width: 320,
      baseStyle: {
        paddingTop: 2,
        '@media (min-width:500px)': { opacity: 0.2 },
        '&.MuiProbe-row': { marginTop: 3 },
      },
    },
    undefined,
  );
  const { computed } = componentRootStyle(theme, '', {}, undefined, style, {
    width: 800,
    classes: ['MuiProbe-row'],
    baseStyle: { '@media (min-width:500px)': { opacity: 0.7 } },
  });
  expect(computed).toMatchObject({ opacity: 0.7, paddingTop: 2, paddingLeft: 20, marginTop: 3 });
});
test('ancestor sheets retain their own root and descendant matching contexts', () => {
  const theme = createTheme();
  const style = createNativeStyledStyle(
    theme,
    '',
    {},
    undefined,
    {
      classes: ['Before'],
      baseStyle: { '&.MuiProbe-row': { opacity: 0.6 } },
      ancestors: [
        {
          theme,
          name: '',
          props: {},
          context: {
            classes: ['Ancestor'],
            descendantClasses: ['Target'],
            baseStyle: {
              '&.Ancestor': { paddingTop: 4 },
              '&.MuiProbe-row': { paddingLeft: 99 },
              '& .Target': { marginTop: 5 },
            },
          },
        },
      ],
    },
    undefined,
  );
  const { computed } = componentRootStyle(theme, '', {}, undefined, style, {
    classes: ['MuiProbe-row'],
  });
  expect(computed).toMatchObject({ opacity: 0.6, paddingTop: 4, marginTop: 5 });
  expect(computed.paddingLeft).toBeUndefined();
});
test('unsupported selectors diagnose once per prepared sheet', () => {
  const diagnostics = jest.fn(),
    restore = configureDiagnostics(diagnostics);
  try {
    const theme = createTheme();
    const style = createNativeStyledStyle(
      theme,
      '',
      {},
      undefined,
      { baseStyle: { '&:hover': { opacity: 0.4 }, '&.MuiProbe-row': { paddingLeft: 8 } } },
      undefined,
    );
    expect(diagnostics).toHaveBeenCalledTimes(1);
    expect(
      componentRootStyle(theme, '', {}, undefined, style, { classes: ['MuiProbe-row'] }).computed,
    ).toMatchObject({ paddingLeft: 8 });
    expect(diagnostics).toHaveBeenCalledTimes(1);
  } finally {
    restore();
  }
});
function SmallText() {
  const theme = useTheme(),
    parent = useNativeTextContext();
  const computed = resolveSx(
    { fontSize: 5 },
    theme,
    nativeTextStyleContext(parent, undefined, theme),
  );
  return (
    <Text testID="small" style={computed}>
      Small
    </Text>
  );
}
test('relative root metrics resolve once and preserve the inherited line ratio', () => {
  const Styled = styled(Root)({ fontSize: '2em', lineHeight: 2 });
  const theme = createTheme();
  const scopes: unknown[] = [];
  function Probe() {
    scopes.push(useNativeTextContext()?.style);
    return <SmallText />;
  }
  const tree = render(
    <NativeTextScope theme={theme} style={{ fontSize: 10 }}>
      {() => (
        <Styled>
          <Probe />
        </Styled>
      )}
    </NativeTextScope>,
  );
  expect(scopes.at(-1)).toMatchObject({ fontSize: 20, lineHeight: 40 });
  expect(tree.getByTestId('small')).toHaveStyle({ fontSize: 5, lineHeight: 10 });
});
test('native absolute font metrics remain final through nested wrappers', () => {
  const Inner = styled(Root)({ fontSize: '2em', lineHeight: 2 });
  const Outer = styled(Inner)({ '&.MuiProbe-row': { letterSpacing: '0.1em' } });
  const scopes: unknown[] = [];
  function Probe() {
    scopes.push(useNativeTextContext()?.style);
    return <Text>Text</Text>;
  }
  render(
    <Outer row style={{ fontSize: 30, lineHeight: 37 }}>
      <Probe />
    </Outer>,
  );
  expect(scopes.at(-1)).toMatchObject({ fontSize: 30, lineHeight: 37, letterSpacing: 3 });
});
test('currentColor paint binds after late selectors and native foreground', () => {
  const theme = createTheme();
  const style = createNativeStyledStyle(
    theme,
    '',
    {},
    undefined,
    {
      baseStyle: { border: 1, boxShadow: '0 0 2px currentColor', '&.Mui-error': { color: 'red' } },
    },
    [{ color: 'blue' }],
  );
  const { computed } = componentRootStyle(theme, '', {}, undefined, style, {
    classes: ['Mui-error'],
  });
  expect(computed).toMatchObject({
    borderColor: 'blue',
    boxShadow: '0 0 2px blue',
  });
});
test('late direction participates in logical inset and text alignment resolution', () => {
  const theme = createTheme();
  const style = createNativeStyledStyle(
    theme,
    '',
    {},
    undefined,
    { baseStyle: { '&.MuiProbe-row': { direction: 'rtl', marginStart: 3, textAlign: 'start' } } },
    undefined,
  );
  const { computed } = componentRootStyle(theme, '', {}, undefined, style, {
    classes: ['MuiProbe-row'],
    logicalInsets: { parentDirection: 'ltr' },
  });
  expect(computed).toMatchObject({ direction: 'rtl', marginRight: 3, textAlign: 'right' });
});
test('frozen source styles, refs, local children and native payload shape stay intact', () => {
  const rules = Object.freeze({ '&.MuiProbe-row': Object.freeze({ opacity: 0.5 }) });
  const inline = Object.freeze({ marginTop: 4 });
  const Styled = styled(Root)(rules);
  const ref = React.createRef<ViewInstance>();
  function Child() {
    const [count, set] = useState(0);
    return (
      <Text testID="counter" onPress={() => set(count + 1)}>
        {count}
      </Text>
    );
  }
  const tree = render(
    <Styled ref={ref} row testID="root" style={inline}>
      <Child />
    </Styled>,
  );
  const host = ref.current;
  expect(host).toBeTruthy();
  fireEvent.press(tree.getByTestId('counter'));
  tree.rerender(
    <Styled ref={ref} testID="root" style={inline}>
      <Child />
    </Styled>,
  );
  expect(ref.current).toBe(host);
  expect(tree.getByTestId('counter').props.children).toBe(1);
  expect(rules).toEqual({ '&.MuiProbe-row': { opacity: 0.5 } });
  expect(inline).toEqual({ marginTop: 4 });
  expect(Object.keys(StyleSheet.flatten(tree.getByTestId('root').props.style))).toEqual([
    'opacity',
    'marginTop',
  ]);
});
test('styled native View and Text and unaware custom roots retain eager fallback', () => {
  const NativeView = styled(View)({ padding: 3, fontSize: 20, lineHeight: 2 });
  const NativeText = styled(Text)({ color: 'red', fontSize: 15 });
  const Legacy = forwardRef<ViewInstance, RootProps>((props, ref) => (
    <View ref={ref} testID={props.testID} style={props.style}>
      {props.children}
    </View>
  ));
  const Custom = styled(Legacy)({ paddingLeft: 5 });
  const tree = render(
    <>
      <NativeView testID="view">Literal</NativeView>
      <NativeText testID="text">Native</NativeText>
      <Custom testID="legacy" style={{ marginTop: 3 }} />
    </>,
  );
  expect(tree.getByTestId('view')).toHaveStyle({ padding: 3 });
  expect(tree.getByText('Literal')).toHaveStyle({ fontSize: 20, lineHeight: 40 });
  expect(tree.getByTestId('text')).toHaveStyle({ color: 'red', fontSize: 15 });
  expect(tree.getByTestId('legacy')).toHaveStyle({ paddingLeft: 5, marginTop: 3 });
});

test('prepared rem metrics retain their owning theme calibration', () => {
  const owner = createTheme({ cssRootFontSize: 10 }),
    root = createTheme({ cssRootFontSize: 20 });
  const style = createNativeStyledStyle(
    owner,
    '',
    {},
    undefined,
    { baseStyle: { fontSize: '1rem', lineHeight: '1.5rem', letterSpacing: '0.1rem' } },
    undefined,
  );
  expect(componentRootStyle(root, '', {}, undefined, style).computed).toMatchObject({
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 1,
  });
});
test('unsupported media diagnoses once before late root collection', () => {
  const diagnostics = jest.fn(),
    restore = configureDiagnostics(diagnostics);
  try {
    const theme = createTheme();
    const style = createNativeStyledStyle(
      theme,
      '',
      {},
      undefined,
      { baseStyle: { '@media (orientation:portrait)': { opacity: 0.4 } } },
      undefined,
    );
    expect(diagnostics).toHaveBeenCalledTimes(1);
    componentRootStyle(theme, '', {}, undefined, style);
    expect(diagnostics).toHaveBeenCalledTimes(1);
  } finally {
    restore();
  }
});

test('an inner context update rebinds a stable styled element without replaying its callback', () => {
  const callback = jest.fn(() => ({ '&.Mui-error': { opacity: 0.4 } }));
  const Styled = styled(Root)(callback);
  const stable = <Styled testID="stable" />;
  function Owner() {
    const [error, setError] = useState(false);
    return (
      <State.Provider value={{ error, align: false }}>
        <Text testID="toggle" onPress={() => setError(!error)}>
          Toggle
        </Text>
        {stable}
      </State.Provider>
    );
  }
  const tree = render(<Owner />);
  expect(tree.getByTestId('stable')).toHaveStyle({ opacity: 1 });
  fireEvent.press(tree.getByTestId('toggle'));
  expect(tree.getByTestId('stable')).toHaveStyle({ opacity: 0.4 });
  fireEvent.press(tree.getByTestId('toggle'));
  expect(tree.getByTestId('stable')).toHaveStyle({ opacity: 1 });
  expect(callback).toHaveBeenCalledTimes(1);
});
test('own contextual component selectors remain in the same specificity cascade', () => {
  const theme = createTheme({
    components: {
      MuiProbe: { styleOverrides: { root: { '&.MuiProbe-row.Mui-error': { opacity: 0.2 } } } },
    },
  });
  const Styled = styled(Root)({ opacity: 0.8 });
  const tree = render(
    <ThemeProvider theme={theme}>
      <State.Provider value={{ error: true, align: false }}>
        <Styled testID="root" row sx={{ opacity: 0.7 }} />
      </State.Provider>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.2 });
});

test('the same retained invalid text declaration reports once across eager and final resolution', () => {
  const diagnostics = jest.fn(),
    restore = configureDiagnostics(diagnostics);
  try {
    const theme = createTheme();
    const style = createNativeStyledStyle(
      theme,
      '',
      {},
      undefined,
      { baseStyle: { fontSize: 'banana' } },
      undefined,
    );
    expect(diagnostics).toHaveBeenCalledTimes(1);
    componentRootStyle(theme, '', {}, undefined, style);
    expect(diagnostics).toHaveBeenCalledTimes(1);
    componentRootStyle(theme, '', {}, undefined, undefined, { baseStyle: { fontSize: 'banana' } });
    expect(diagnostics).toHaveBeenCalledTimes(2);
    expect(diagnostics.mock.calls.map(([entry]) => entry.message)).toEqual([
      'Unsupported native fontSize: banana',
      'Unsupported native fontSize: banana',
    ]);
  } finally {
    restore();
  }
});
test('a newly matched late selector reports its own invalid text without replaying earlier warnings', () => {
  const diagnostics = jest.fn(),
    restore = configureDiagnostics(diagnostics);
  try {
    const theme = createTheme();
    const style = createNativeStyledStyle(
      theme,
      '',
      {},
      undefined,
      { baseStyle: { fontSize: 'banana', '&.Mui-error': { fontSize: 'papaya' } } },
      undefined,
    );
    expect(diagnostics).toHaveBeenCalledTimes(1);
    componentRootStyle(theme, '', {}, undefined, style, { classes: ['Mui-error'] });
    expect(diagnostics.mock.calls.map(([entry]) => entry.message)).toEqual([
      'Unsupported native fontSize: banana',
      'Unsupported native fontSize: papaya',
    ]);
    componentRootStyle(theme, '', {}, undefined, style, { classes: [] });
    componentRootStyle(theme, '', {}, undefined, style, { classes: ['Mui-error'] });
    expect(diagnostics).toHaveBeenCalledTimes(2);
  } finally {
    restore();
  }
});
test('distinct retained declarations and properties keep their independent diagnostics', () => {
  const diagnostics = jest.fn(),
    restore = configureDiagnostics(diagnostics);
  try {
    const theme = createTheme();
    const inner = createNativeStyledStyle(
      theme,
      '',
      {},
      undefined,
      { baseStyle: { fontSize: 'banana' } },
      undefined,
    );
    const outer = createNativeStyledStyle(
      theme,
      '',
      {},
      undefined,
      { baseStyle: { fontSize: 'banana', fontWeight: 'banana' } },
      inner,
    );
    expect(diagnostics).toHaveBeenCalledTimes(3);
    componentRootStyle(theme, '', {}, undefined, outer);
    expect(diagnostics).toHaveBeenCalledTimes(3);
  } finally {
    restore();
  }
});
