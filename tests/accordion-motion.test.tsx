// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(actual),
      View: { value: 'View', enumerable: true, configurable: true },
      findNodeHandle: { value: () => null, enumerable: true },
    },
  );
});
import { createRef, forwardRef, memo, useState } from 'react';
import { act, cleanup, renderHook, render, fireEvent } from '@testing-library/react-native';
import { Text, View, StyleSheet, PlatformColor, type ViewInstance } from 'react-native';
import { createTheme, type NativeStyle, type Theme } from '@altroo/mui-native-system';
import { Accordion, AccordionSummary, Box, Paper, ThemeProvider } from '@altroo/mui-native';
import { useAccordionMotion } from '../packages/material/src/accordionMotion';
import {
  AccordionRootMotionScope,
  AccordionRootMotionBoundary,
} from '../packages/material/src/accordionRootMotion';
import { nativeStyleTree } from '../packages/material/src/nativeStyleAncestry';
import { Commands } from '../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';
import { NativePressable } from '@altroo/mui-native-host';
const theme = createTheme({
  motion: { reducedMotion: 'never' },
  transitions: {
    duration: { shortest: 100 },
    easing: { easeInOut: 'linear' },
  },
});
function useStyle(
  style: NativeStyle,
  selected: Theme,
  property: Parameters<typeof useAccordionMotion>[2],
) {
  return { ...style, ...useAccordionMotion(style, selected, property) };
}
beforeEach(() => {
  jest.useFakeTimers();
  // The renderer supplies identity-only hosts, so native commands have no target.
  jest.spyOn(Commands, 'setPressed').mockImplementation(() => {});
  // The RN Jest preset uses epoch Date.now for rAF. Real JSTimers supplies
  // performance.now, so keep the controlled frame clock in that same domain.
  jest
    .spyOn(globalThis, 'requestAnimationFrame')
    .mockImplementation(
      (callback) => setTimeout(() => callback(performance.now()), 16) as unknown as number,
    );
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => clearTimeout(id));
});
afterEach(() => {
  cleanup();
  jest.useRealTimers();
  jest.restoreAllMocks();
});
const advance = (milliseconds: number) => act(() => jest.advanceTimersByTime(milliseconds));
const turn = (style: NativeStyle) =>
  Number.parseFloat((style.transform as { rotate: string }[])[0].rotate);
test('the first mounted value is an endpoint and schedules no animation', () => {
  const raf = jest.spyOn(globalThis, 'requestAnimationFrame');
  const hook = renderHook(() =>
    useStyle({ transform: [{ rotate: '180deg' }] }, theme, 'transform'),
  );
  expect(turn(hook.result.current)).toBe(180);
  expect(raf).not.toHaveBeenCalled();
});
test('source duration produces intermediate native margins and an exact endpoint', () => {
  const hook = renderHook(
    ({ margin }: { margin: number }) =>
      useStyle({ marginTop: margin, marginBottom: margin }, theme, 'margin'),
    { initialProps: { margin: 12 } },
  );
  hook.rerender({ margin: 20 });
  expect(hook.result.current.marginTop).toBe(12);
  advance(50);
  expect(hook.result.current.marginTop).toBeGreaterThan(12);
  expect(hook.result.current.marginTop).toBeLessThan(20);
  expect(hook.result.current.marginBottom).toBe(hook.result.current.marginTop);
  advance(100);
  expect(hook.result.current).toMatchObject({ marginTop: 20, marginBottom: 20 });
});
test('rapid reversal starts at the currently presented rotation and cancels the old endpoint', () => {
  const hook = renderHook(
    ({ degrees }: { degrees: number }) =>
      useStyle({ transform: [{ rotate: `${degrees}deg` }] }, theme, 'transform'),
    { initialProps: { degrees: 0 } },
  );
  hook.rerender({ degrees: 180 });
  advance(50);
  const mid = turn(hook.result.current);
  expect(mid).toBeGreaterThan(0);
  expect(mid).toBeLessThan(180);
  hook.rerender({ degrees: 0 });
  expect(turn(hook.result.current)).toBe(mid);
  advance(20);
  expect(turn(hook.result.current)).toBeGreaterThan(0);
  expect(turn(hook.result.current)).toBeLessThan(mid);
  advance(200);
  expect(turn(hook.result.current)).toBe(0);
});
test('theme transition factories control the delay and timing', () => {
  const factory = jest.fn(() => 'transform 200ms linear 80ms');
  const selected = createTheme({
    motion: { reducedMotion: 'never' },
    transitions: { create: factory },
  });
  const hook = renderHook(
    ({ degrees }: { degrees: number }) =>
      useStyle({ transform: [{ rotate: `${degrees}deg` }] }, selected, 'transform'),
    { initialProps: { degrees: 0 } },
  );
  hook.rerender({ degrees: 180 });
  expect(factory).toHaveBeenCalledTimes(1);
  expect(factory).toHaveBeenCalledWith('transform', { duration: 150 });
  advance(60);
  expect(turn(hook.result.current)).toBe(0);
  advance(80);
  expect(turn(hook.result.current)).toBeGreaterThan(0);
  expect(turn(hook.result.current)).toBeLessThan(180);
  advance(200);
  expect(turn(hook.result.current)).toBe(180);
});
test('reduced motion interrupts immediately and leaves no pending frame', () => {
  const reduced = createTheme({ motion: { reducedMotion: 'always' } });
  const hook = renderHook(
    ({ degrees, selected }: { degrees: number; selected: Theme }) =>
      useStyle({ transform: [{ rotate: `${degrees}deg` }] }, selected, 'transform'),
    { initialProps: { degrees: 0, selected: theme } },
  );
  hook.rerender({ degrees: 180, selected: theme });
  advance(40);
  expect(turn(hook.result.current)).toBeLessThan(180);
  hook.rerender({ degrees: 180, selected: reduced });
  expect(turn(hook.result.current)).toBe(180);
  expect(jest.getTimerCount()).toBe(0);
});
test('unmount releases the active frame', () => {
  const hook = renderHook(
    ({ margin }: { margin: number }) => useStyle({ marginTop: margin }, theme, 'margin'),
    { initialProps: { margin: 12 } },
  );
  hook.rerender({ margin: 20 });
  expect(jest.getTimerCount()).toBeGreaterThan(0);
  hook.unmount();
  expect(jest.getTimerCount()).toBe(0);
});
test('other transforms retain their order and values', () => {
  const hook = renderHook(
    ({ degrees }: { degrees: number }) =>
      useStyle(
        { transform: [{ scale: 2 }, { rotate: `${degrees}deg` }, { translateX: 7 }] },
        theme,
        'transform',
      ),
    { initialProps: { degrees: 0 } },
  );
  hook.rerender({ degrees: 180 });
  advance(40);
  const transforms = hook.result.current.transform as unknown[];
  expect(transforms[0]).toEqual({ scale: 2 });
  expect(transforms[2]).toEqual({ translateX: 7 });
  advance(100);
  expect(transforms[1]).not.toEqual({ rotate: '180deg' });
  expect((hook.result.current.transform as unknown[])[1]).toEqual({ rotate: '180deg' });
});
test('Summary animates content and icon without replaying source callbacks', () => {
  const callback = jest.fn(() => ({}));
  const selected = createTheme({
    ...theme,
    components: { MuiAccordionSummary: { styleOverrides: { content: callback } } },
  });
  const scene = (expanded: boolean) => (
    <ThemeProvider theme={selected}>
      <Accordion expanded={expanded}>
        <AccordionSummary
          testID="summary"
          expandIcon={<Text>Expand</Text>}
          slotProps={{
            content: { testID: 'content' },
            expandIconWrapper: { testID: 'icon' },
          }}
        >
          Summary
        </AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    </ThemeProvider>
  );
  const tree = render(scene(false), { createNodeMock: () => ({}) });
  tree.rerender(scene(true));
  const calls = callback.mock.calls.length;
  advance(50);
  const content = StyleSheet.flatten(tree.getByTestId('content').props.style);
  const icon = StyleSheet.flatten(tree.getByTestId('icon').props.style);
  expect(content.marginTop).toBeGreaterThan(12);
  expect(content.marginTop).toBeLessThan(20);
  expect(turn(icon)).toBeGreaterThan(0);
  expect(turn(icon)).toBeLessThan(180);
  advance(150);
  expect(tree.getByTestId('content')).toHaveStyle({ marginTop: 20, marginBottom: 20 });
  expect(turn(StyleSheet.flatten(tree.getByTestId('icon').props.style))).toBe(180);
  expect(callback).toHaveBeenCalledTimes(calls);
});
test('native inline margin overrides remain the presentation target', () => {
  const scene = (expanded: boolean) => (
    <ThemeProvider theme={theme}>
      <Accordion expanded={expanded}>
        <AccordionSummary
          slotProps={{ content: { testID: 'content', style: { marginVertical: 6 } } }}
        >
          Summary
        </AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    </ThemeProvider>
  );
  const tree = render(scene(false), { createNodeMock: () => ({}) });
  tree.rerender(scene(true));
  advance(50);
  expect(tree.getByTestId('content')).toHaveStyle({ marginTop: 6, marginBottom: 6 });
});

test('an explicitly disabled theme transition applies the endpoint without a frame', () => {
  const selected = createTheme({
    motion: { reducedMotion: 'never' },
    transitions: { create: () => 'none' },
  });
  const hook = renderHook(
    ({ margin }: { margin: number }) => useStyle({ marginTop: margin }, selected, 'margin'),
    { initialProps: { margin: 12 } },
  );
  hook.rerender({ margin: 20 });
  expect(hook.result.current.marginTop).toBe(20);
  expect(jest.getTimerCount()).toBe(0);
});
test('a margin becoming nonnumeric cancels the clock and preserves its native endpoint', () => {
  const hook = renderHook(
    ({ margin }: { margin: number | 'auto' }) => useStyle({ marginTop: margin }, theme, 'margin'),
    { initialProps: { margin: 12 as number | 'auto' } },
  );
  hook.rerender({ margin: 20 });
  advance(32);
  hook.rerender({ margin: 'auto' });
  expect(hook.result.current.marginTop).toBe('auto');
  expect(jest.getTimerCount()).toBe(0);
});

test('separator opacity and color follow independent source transition tracks', () => {
  const create = jest.fn(() => 'opacity 80ms linear 0ms, background-color 200ms linear 40ms');
  const selected = createTheme({ motion: { reducedMotion: 'never' }, transitions: { create } });
  const hook = renderHook(
    ({ opacity, color }: { opacity: number; color: string }) =>
      useStyle({ opacity, backgroundColor: color }, selected, 'before'),
    { initialProps: { opacity: 1, color: '#ff0000' } },
  );
  hook.rerender({ opacity: 0, color: '#0000ff' });
  expect(hook.result.current).toMatchObject({ opacity: 1, backgroundColor: 'rgba(255, 0, 0, 1)' });
  advance(32);
  expect(hook.result.current.opacity).toBeGreaterThan(0);
  expect(hook.result.current.opacity).toBeLessThan(1);
  expect(hook.result.current.backgroundColor).toBe('rgba(255, 0, 0, 1)');
  advance(64);
  expect(hook.result.current.opacity).toBe(0);
  expect(hook.result.current.backgroundColor).not.toBe('#0000ff');
  advance(200);
  expect(hook.result.current).toMatchObject({ opacity: 0, backgroundColor: '#0000ff' });
  expect(create).toHaveBeenCalledWith(['opacity', 'background-color'], { duration: 150 });
  expect(create).toHaveBeenCalledTimes(1);
});
test('separator color uses premultiplied alpha and preserves exact authored endpoints', () => {
  const hook = renderHook(
    ({ color }: { color: string }) =>
      useStyle({ opacity: 1, backgroundColor: color }, theme, 'before'),
    { initialProps: { color: 'transparent' } },
  );
  hook.rerender({ color: 'red' });
  advance(48);
  const color = String(hook.result.current.backgroundColor);
  expect(color).toMatch(/^rgba\(255, 0, 0, 0\./);
  advance(100);
  expect(hook.result.current.backgroundColor).toBe('red');
});
test('separator reversal starts at the current opacity and color sample', () => {
  const hook = renderHook(
    ({ open }: { open: boolean }) =>
      useStyle({ opacity: open ? 0 : 1, backgroundColor: open ? 'blue' : 'red' }, theme, 'before'),
    { initialProps: { open: false } },
  );
  hook.rerender({ open: true });
  advance(48);
  const mid = hook.result.current;
  hook.rerender({ open: false });
  expect(hook.result.current).toEqual(mid);
  advance(16);
  expect(hook.result.current.opacity).toBeGreaterThan(mid.opacity!);
  advance(150);
  expect(hook.result.current).toMatchObject({ opacity: 1, backgroundColor: 'red' });
});
test('reduced motion applies separator opacity and color immediately', () => {
  const selected = createTheme({ motion: { reducedMotion: 'always' } });
  const hook = renderHook(
    ({ open }: { open: boolean }) =>
      useStyle(
        { opacity: open ? 0 : 1, backgroundColor: open ? 'blue' : 'red' },
        selected,
        'before',
      ),
    { initialProps: { open: false } },
  );
  hook.rerender({ open: true });
  expect(hook.result.current).toMatchObject({ opacity: 0, backgroundColor: 'blue' });
  expect(jest.getTimerCount()).toBe(0);
});
test('the native separator fades without replaying Accordion source callbacks', () => {
  const root = jest.fn(() => ({}));
  const selected = createTheme({
    ...theme,
    components: { MuiAccordion: { styleOverrides: { root } } },
  });
  const scene = (expanded: boolean) => (
    <ThemeProvider theme={selected}>
      <Accordion expanded={expanded}>
        <AccordionSummary>Summary</AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    </ThemeProvider>
  );
  const tree = render(scene(false), { createNodeMock: () => ({}) });
  tree.rerender(scene(true));
  const calls = root.mock.calls.length;
  advance(48);
  const style = StyleSheet.flatten(
    tree.getByTestId('mui-accordion-before', { includeHiddenElements: true }).props.style,
  );
  expect(style.opacity).toBeGreaterThan(0);
  expect(style.opacity).toBeLessThan(1);
  advance(150);
  expect(tree.getByTestId('mui-accordion-before', { includeHiddenElements: true })).toHaveStyle({
    opacity: 0,
  });
  expect(root).toHaveBeenCalledTimes(calls);
});

test('an opacity change does not restart an in-flight color clock or its delay', () => {
  const selected = createTheme({
    motion: { reducedMotion: 'never' },
    transitions: {
      create: () => 'opacity 100ms linear 0ms, background-color 200ms linear 0ms',
    },
  });
  const hook = renderHook(
    ({ opacity, color }: { opacity: number; color: string }) =>
      useStyle({ opacity, backgroundColor: color }, selected, 'before'),
    { initialProps: { opacity: 1, color: 'red' } },
  );
  hook.rerender({ opacity: 1, color: 'blue' });
  advance(112);
  hook.rerender({ opacity: 0, color: 'blue' });
  advance(96);
  expect(hook.result.current.backgroundColor).toBe('blue');
  expect(hook.result.current.opacity).toBeGreaterThan(0);
  expect(hook.result.current.opacity).toBeLessThan(1);
  advance(40);
  expect(hook.result.current.opacity).toBe(0);
});
test('a dynamic color becoming finite does not finish an unrelated opacity fade', () => {
  const dynamic = PlatformColor('labelColor');
  const hook = renderHook(
    ({ opacity, color }: { opacity: number; color: NativeStyle['backgroundColor'] }) =>
      useStyle({ opacity, backgroundColor: color }, theme, 'before'),
    { initialProps: { opacity: 1, color: dynamic } },
  );
  hook.rerender({ opacity: 0, color: dynamic });
  advance(32);
  const sample = hook.result.current.opacity;
  hook.rerender({ opacity: 0, color: 'blue' });
  expect(hook.result.current.opacity).toBe(sample);
  expect(hook.result.current.backgroundColor).toBe('blue');
  advance(32);
  expect(hook.result.current.opacity).toBeGreaterThan(0);
  expect(hook.result.current.opacity).toBeLessThan(sample!);
  advance(100);
  expect(hook.result.current.opacity).toBe(0);
});

test('a separator hidden during expansion reveals its endpoint rather than a stale fade', () => {
  const scene = (expanded: boolean, hidden: boolean) => (
    <ThemeProvider theme={theme}>
      <Accordion
        expanded={expanded}
        disableGutters
        sx={{ '&::before': { display: hidden ? 'none' : 'flex' } }}
      >
        <AccordionSummary>Summary</AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    </ThemeProvider>
  );
  const tree = render(scene(false, true));
  tree.rerender(scene(true, true));
  advance(48);
  tree.rerender(scene(true, false));
  expect(tree.getByTestId('mui-accordion-before', { includeHiddenElements: true })).toHaveStyle({
    display: 'flex',
    opacity: 0,
  });
});

const OpaqueBox = forwardRef<ViewInstance, Record<string, any>>(function OpaqueBox(props, ref) {
  return <Box {...props} ref={ref} />;
});
const OpaqueView = forwardRef<ViewInstance, Record<string, any>>(function OpaqueView(props, ref) {
  return <View {...props} ref={ref} />;
});
const OpaquePaper = forwardRef<ViewInstance, Record<string, any>>(function OpaquePaper(props, ref) {
  return <Paper {...props} ref={ref} />;
});
for (const [label, Root] of [
  ['default Paper', undefined],
  ['Box', Box],
  ['opaque Box', OpaqueBox],
  ['opaque View', OpaqueView],
  ['opaque Paper', OpaquePaper],
  ['memo Box', memo(OpaqueBox)],
] as const) {
  test(`root margin motion resolves at the final ${label} host`, () => {
    const parent = { children: [] as object[] };
    const host = { parentElement: parent, tagName: 'View', isConnected: true };
    parent.children = [{ tagName: 'View' }, host, { tagName: 'View' }];
    const scene = (expanded: boolean) => (
      <ThemeProvider theme={theme}>
        <Accordion component={Root} expanded={expanded} testID="panel">
          <AccordionSummary>Summary</AccordionSummary>
          <Text>Body</Text>
        </Accordion>
      </ThemeProvider>
    );
    const tree = render(scene(false), {
      createNodeMock: (node) =>
        (node.props as { testID?: string }).testID === 'panel' ? host : {},
    });
    tree.rerender(scene(true));
    advance(48);
    const mid = StyleSheet.flatten(tree.getByTestId('panel').props.style);
    expect(mid.marginTop).toBeGreaterThan(0);
    expect(mid.marginTop).toBeLessThan(16);
    expect(mid.marginBottom).toBe(mid.marginTop);
    advance(150);
    expect(tree.getByTestId('panel')).toHaveStyle({ marginTop: 16, marginBottom: 16 });
    tree.rerender(scene(false));
    advance(48);
    expect(StyleSheet.flatten(tree.getByTestId('panel').props.style).marginTop).toBeLessThan(16);
    advance(150);
    expect(tree.getByTestId('panel')).toHaveStyle({ marginTop: 0, marginBottom: 0 });
  });
}
test('root frames preserve custom terminal CSS, native inline priority and source callback counts', () => {
  const css = jest.fn(() => ({ marginTop: '7px', marginBottom: '9px' }));
  const root = jest.fn(() => ({}));
  const selected = createTheme({
    ...theme,
    components: { MuiPaper: { styleOverrides: { root } } },
  });
  const Custom = forwardRef<ViewInstance, Record<string, any>>(function Custom(props, ref) {
    return <Box {...props} ref={ref} sx={css} />;
  });
  const parent = { children: [] as object[] };
  const host = { parentElement: parent, tagName: 'View', isConnected: true };
  parent.children = [{ tagName: 'View' }, host, { tagName: 'View' }];
  const scene = (expanded: boolean) => (
    <ThemeProvider theme={selected}>
      <Accordion component={Custom} expanded={expanded} testID="panel" style={{ marginBottom: 3 }}>
        <AccordionSummary>Summary</AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    </ThemeProvider>
  );
  const tree = render(scene(false), {
    createNodeMock: (node) => ((node.props as { testID?: string }).testID === 'panel' ? host : {}),
  });
  tree.rerender(scene(true));
  const calls = [css.mock.calls.length, root.mock.calls.length];
  advance(48);
  const mid = StyleSheet.flatten(tree.getByTestId('panel').props.style);
  expect(mid.marginTop).toBeGreaterThan(7);
  expect(mid.marginTop).toBeLessThan(16);
  expect(mid.marginBottom).toBe(3);
  advance(150);
  expect(tree.getByTestId('panel')).toHaveStyle({ marginTop: 16, marginBottom: 3 });
  expect([css.mock.calls.length, root.mock.calls.length]).toEqual(calls);
});

test('a same-candidate host retarget resets only motion and preserves body state', () => {
  const root = createRef<ViewInstance>();
  const candidate = createRef<ViewInstance>();
  const first = {} as ViewInstance,
    second = {} as ViewInstance;
  root.current = candidate.current = first;
  function Counter() {
    const [value, setValue] = useState(0);
    return (
      <Text testID="motion-count" onPress={() => setValue(value + 1)}>
        {value}
      </Text>
    );
  }
  const scene = (margin: number) => (
    <AccordionRootMotionScope
      root={root}
      theme={theme}
      ready
      timing={{ declaration: 'margin 100ms linear 0ms' }}
    >
      {(scope) => (
        <AccordionRootMotionBoundary
          scope={scope}
          root={candidate}
          style={{ marginTop: margin, marginBottom: margin }}
        >
          {(style) => (
            <View testID="motion-root" style={style}>
              <Counter />
            </View>
          )}
        </AccordionRootMotionBoundary>
      )}
    </AccordionRootMotionScope>
  );
  const tree = render(scene(0));
  fireEvent.press(tree.getByTestId('motion-count'));
  tree.rerender(scene(16));
  advance(48);
  expect(StyleSheet.flatten(tree.getByTestId('motion-root').props.style).marginTop).toBeLessThan(
    16,
  );
  act(() => {
    root.current = candidate.current = second;
    nativeStyleTree.changed();
  });
  expect(tree.getByTestId('motion-root')).toHaveStyle({ marginTop: 16, marginBottom: 16 });
  expect(tree.getByTestId('motion-count')).toHaveTextContent('1');
  expect(jest.getTimerCount()).toBe(0);
  advance(150);
  expect(tree.getByTestId('motion-root')).toHaveStyle({ marginTop: 16, marginBottom: 16 });
  tree.unmount();
});
test('an initially expanded first/last native root starts at its structural endpoint', () => {
  const parent = { children: [] as object[] };
  const host = { parentElement: parent, tagName: 'View', isConnected: true };
  parent.children = [host];
  const tree = render(
    <ThemeProvider theme={theme}>
      <Accordion testID="panel" expanded>
        <AccordionSummary>Summary</AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    </ThemeProvider>,
    {
      createNodeMock: (node) =>
        (node.props as { testID?: string }).testID === 'panel' ? host : {},
    },
  );
  expect(tree.getByTestId('panel')).toHaveStyle({ marginTop: 0, marginBottom: 0 });
  advance(48);
  expect(tree.getByTestId('panel')).toHaveStyle({ marginTop: 0, marginBottom: 0 });
});

for (const Root of [undefined, OpaqueBox])
  test(`hidden ${Root ? 'opaque Box' : 'Paper'} root reveals its margin endpoint`, () => {
    const parent = { children: [] as object[] };
    const host = { parentElement: parent, tagName: 'View', isConnected: true };
    parent.children = [{ tagName: 'View' }, host, { tagName: 'View' }];
    const scene = (expanded: boolean, hidden: boolean) => (
      <ThemeProvider theme={theme}>
        <Accordion
          component={Root}
          expanded={expanded}
          testID="panel"
          style={{ display: hidden ? 'none' : 'flex' }}
        >
          <AccordionSummary>Summary</AccordionSummary>
          <Text>Body</Text>
        </Accordion>
      </ThemeProvider>
    );
    const tree = render(scene(false, true), {
      createNodeMock: (node) =>
        (node.props as { testID?: string }).testID === 'panel' ? host : {},
    });
    tree.rerender(scene(true, true));
    advance(48);
    tree.rerender(scene(true, false));
    expect(tree.getByTestId('panel')).toHaveStyle({
      display: 'flex',
      marginTop: 16,
      marginBottom: 16,
    });
  });

test('root frames in simultaneous themes do not re-enter source transition factories', () => {
  const aBase = createTheme({
    motion: { reducedMotion: 'never' },
    transitions: { duration: { shortest: 100 } },
  });
  const bBase = createTheme({
    motion: { reducedMotion: 'never' },
    transitions: { duration: { shortest: 200 } },
  });
  const aCreate = jest.fn(aBase.transitions.create),
    bCreate = jest.fn(bBase.transitions.create);
  const aTheme = createTheme({ ...aBase, transitions: { create: aCreate } });
  const bTheme = createTheme({ ...bBase, transitions: { create: bCreate } });
  const parent = { children: [] as object[] };
  const a = { parentElement: parent, tagName: 'View', isConnected: true };
  const b = { parentElement: parent, tagName: 'View', isConnected: true };
  parent.children = [a, b];
  const scene = (expanded: boolean) => (
    <>
      <ThemeProvider theme={aTheme}>
        <Accordion testID="a" expanded={expanded}>
          <AccordionSummary>A</AccordionSummary>
          <Text>Body</Text>
        </Accordion>
      </ThemeProvider>
      <ThemeProvider theme={bTheme}>
        <Accordion testID="b" expanded={expanded}>
          <AccordionSummary>B</AccordionSummary>
          <Text>Body</Text>
        </Accordion>
      </ThemeProvider>
    </>
  );
  const tree = render(scene(false), {
    createNodeMock: (node) => {
      const id = (node.props as { testID?: string }).testID;
      return id === 'a' ? a : id === 'b' ? b : {};
    },
  });
  tree.rerender(scene(true));
  const counts = [aCreate.mock.calls.length, bCreate.mock.calls.length];
  advance(48);
  expect(StyleSheet.flatten(tree.getByTestId('a').props.style).marginBottom).toBeGreaterThan(0);
  expect(StyleSheet.flatten(tree.getByTestId('b').props.style).marginTop).toBeGreaterThan(0);
  advance(300);
  expect([aCreate.mock.calls.length, bCreate.mock.calls.length]).toEqual(counts);
});

test('captured source timing does not reread transition factory, duration or easing getters', () => {
  const unexpected = jest.fn(() => {
    throw Error('captured timing reread theme');
  });
  const transitions = Object.defineProperties(
    {},
    {
      create: { get: unexpected },
      duration: { get: unexpected },
      easing: { get: unexpected },
    },
  );
  const selected = Object.create(theme, { transitions: { value: transitions } }) as Theme;
  const timing = { declaration: 'margin 100ms linear 0ms' };
  const hook = renderHook(
    ({ margin }: { margin: number }) => {
      const style = { marginTop: margin, marginBottom: margin };
      return { ...style, ...useAccordionMotion(style, selected, 'root', undefined, timing) };
    },
    { initialProps: { margin: 0 } },
  );
  hook.rerender({ margin: 16 });
  advance(48);
  expect(hook.result.current.marginTop).toBeGreaterThan(0);
  expect(hook.result.current.marginTop).toBeLessThan(16);
  advance(150);
  expect(hook.result.current.marginTop).toBe(16);
  expect(unexpected).not.toHaveBeenCalled();
});

test('Summary height animates without replaying its source style callbacks', () => {
  const rootStyle = jest.fn(() => ({}));
  const selected = createTheme({
    ...theme,
    components: { MuiAccordionSummary: { styleOverrides: { root: rootStyle } } },
  });
  const scene = (expanded: boolean) => (
    <ThemeProvider theme={selected}>
      <Accordion expanded={expanded}>
        <AccordionSummary testID="summary">Summary</AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    </ThemeProvider>
  );
  const tree = render(scene(false), { createNodeMock: () => ({}) });
  tree.rerender(scene(true));
  const calls = rootStyle.mock.calls.length;
  advance(50);
  const height = StyleSheet.flatten(tree.getByTestId('summary').props.style).minHeight;
  expect(height).toBeGreaterThan(48);
  expect(height).toBeLessThan(64);
  advance(150);
  expect(tree.getByTestId('summary')).toHaveStyle({ minHeight: 64 });
  expect(rootStyle).toHaveBeenCalledTimes(calls);
});

for (const [name, Root] of [
  ['Box', Box],
  ['Paper', Paper],
  ['opaque Box', OpaqueBox],
  ['opaque Paper', OpaquePaper],
  ['memo opaque Box', memo(OpaqueBox)],
  ['memo Paper', memo(Paper)],
] as const) {
  test(`Summary ${name} terminal animates final content CSS rather than dropping motion`, () => {
    const scene = (expanded: boolean) => (
      <ThemeProvider theme={theme}>
        <Accordion expanded={expanded}>
          <AccordionSummary slotProps={{ content: { component: Root, testID: 'content' } }}>
            Summary
          </AccordionSummary>
          <Text>Body</Text>
        </Accordion>
      </ThemeProvider>
    );
    const tree = render(scene(false), { createNodeMock: () => ({}) });
    tree.rerender(scene(true));
    advance(50);
    const margin = StyleSheet.flatten(tree.getByTestId('content').props.style).marginTop;
    expect(margin).toBeGreaterThan(12);
    expect(margin).toBeLessThan(20);
    advance(150);
    expect(tree.getByTestId('content')).toHaveStyle({ marginTop: 20, marginBottom: 20 });
  });
}

test('Summary height and background use independent source timings and reverse from their samples', () => {
  const selected = createTheme({
    motion: { reducedMotion: 'never' },
    transitions: {
      create: () => 'min-height 100ms linear 0ms, background-color 200ms linear 80ms',
    },
  });
  const hook = renderHook(
    ({ height, color }: { height: number; color: string }) =>
      useStyle({ minHeight: height, backgroundColor: color }, selected, 'summary'),
    { initialProps: { height: 48, color: 'rgba(0, 0, 0, 0)' } },
  );
  hook.rerender({ height: 64, color: 'rgba(0, 0, 0, 0.12)' });
  advance(48);
  expect(hook.result.current.minHeight).toBeGreaterThan(48);
  expect(hook.result.current.minHeight).toBeLessThan(64);
  expect(hook.result.current.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  advance(80);
  expect(hook.result.current.minHeight).toBe(64);
  const intermediate = hook.result.current.backgroundColor;
  expect(intermediate).not.toBe('rgba(0, 0, 0, 0)');
  expect(intermediate).not.toBe('rgba(0, 0, 0, 0.12)');
  hook.rerender({ height: 48, color: 'rgba(0, 0, 0, 0)' });
  expect(hook.result.current.backgroundColor).toBe(intermediate);
  advance(320);
  expect(hook.result.current).toMatchObject({ minHeight: 48, backgroundColor: 'rgba(0, 0, 0, 0)' });
});

test('Summary forced native pressed state agrees between host paint and text context', () => {
  const tree = render(
    <ThemeProvider theme={theme}>
      <AccordionSummary
        testID="summary"
        testOnly_pressed
        style={(state) => ({ minHeight: state.pressed ? 80 : 48 })}
      >
        Summary
      </AccordionSummary>
    </ThemeProvider>,
    { createNodeMock: () => ({}) },
  );
  expect(tree.getByTestId('summary')).toHaveStyle({ minHeight: 80 });
});

test('replacing a pressed Summary host resets presentation interaction state', () => {
  const Alternate = forwardRef<ViewInstance, import('@altroo/mui-native').ButtonBaseRootProps>(
    function Alternate({ style, children, ...props }, ref) {
      return (
        <View
          {...props}
          ref={ref}
          style={typeof style === 'function' ? style({ pressed: false }) : style}
        >
          {typeof children === 'function' ? children({ pressed: false }) : children}
        </View>
      );
    },
  );
  const scene = (alternate: boolean) => (
    <ThemeProvider theme={theme}>
      <AccordionSummary
        testID="summary"
        component={alternate ? Alternate : undefined}
        style={(state) => ({ minHeight: state.pressed ? 80 : 48 })}
      >
        Summary
      </AccordionSummary>
    </ThemeProvider>
  );
  const tree = render(scene(false), { createNodeMock: () => ({}) });
  fireEvent(tree.getByTestId('summary'), 'responderGrant', {
    persist() {},
    currentTarget: 1,
    nativeEvent: { pageX: 1, pageY: 1 },
  });
  advance(150);
  expect(tree.getByTestId('summary')).toHaveStyle({ minHeight: 80 });
  tree.rerender(scene(true));
  tree.rerender(scene(false));
  expect(tree.getByTestId('summary')).toHaveStyle({ minHeight: 48 });
});

test('disabling and re-enabling a held Summary preserves native pressed state until release', () => {
  const scene = (disabled: boolean) => (
    <ThemeProvider theme={theme}>
      <AccordionSummary
        testID="summary"
        disabled={disabled}
        style={(state) => ({ minHeight: state.pressed ? 80 : 48 })}
      >
        Summary
      </AccordionSummary>
    </ThemeProvider>
  );
  const tree = render(scene(false), { createNodeMock: () => ({}) });
  fireEvent(tree.getByTestId('summary'), 'responderGrant', {
    persist() {},
    currentTarget: 1,
    nativeEvent: { pageX: 1, pageY: 1 },
  });
  advance(150);
  tree.rerender(scene(true));
  advance(150);
  tree.rerender(scene(false));
  expect(tree.getByTestId('summary')).toHaveStyle({ minHeight: 80 });
  fireEvent(tree.getByTestId('summary'), 'responderRelease', {
    persist() {},
    currentTarget: 1,
    nativeEvent: { pageX: 1, pageY: 1 },
  });
  advance(150);
  expect(tree.getByTestId('summary')).toHaveStyle({ minHeight: 48 });
});

test('opaque content and icon terminals animate final styles without repeating their CSS callbacks', () => {
  const css = jest.fn(() => ({ paddingLeft: '7px' }));
  const Terminal = forwardRef<ViewInstance, Record<string, any>>(function Terminal(props, ref) {
    return <Box {...props} ref={ref} sx={css} />;
  });
  const scene = (expanded: boolean) => (
    <ThemeProvider theme={theme}>
      <Accordion expanded={expanded}>
        <AccordionSummary
          expandIcon={<Text>Icon</Text>}
          slotProps={{
            content: { component: Terminal, testID: 'content' },
            expandIconWrapper: { component: Terminal, testID: 'icon' },
          }}
        >
          Summary
        </AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    </ThemeProvider>
  );
  const tree = render(scene(false), { createNodeMock: () => ({}) });
  tree.rerender(scene(true));
  const calls = css.mock.calls.length;
  advance(48);
  const content = StyleSheet.flatten(tree.getByTestId('content').props.style);
  const icon = StyleSheet.flatten(tree.getByTestId('icon').props.style);
  expect(content.marginTop).toBeGreaterThan(12);
  expect(content.marginTop).toBeLessThan(20);
  expect(turn(icon)).toBeGreaterThan(0);
  expect(turn(icon)).toBeLessThan(180);
  expect(content.paddingLeft).toBe(7);
  expect(css).toHaveBeenCalledTimes(calls);
  advance(150);
  expect(tree.getByTestId('content')).toHaveStyle({ marginTop: 20, marginBottom: 20 });
  expect(turn(StyleSheet.flatten(tree.getByTestId('icon').props.style))).toBe(180);
  expect(css).toHaveBeenCalledTimes(calls);
});

for (const [name, Root] of [
  ['View', undefined],
  ['opaque Box', OpaqueBox],
] as const) {
  test(`changing gutters preserves ${name} Summary content state and native ref`, () => {
    function Counter() {
      const [count, setCount] = useState(0);
      return (
        <Text testID="gutters-count" onPress={() => setCount(count + 1)}>
          {count}
        </Text>
      );
    }
    const ref = createRef<ViewInstance>();
    const scene = (disableGutters: boolean) => (
      <ThemeProvider theme={theme}>
        <Accordion expanded disableGutters={disableGutters}>
          <AccordionSummary slotProps={{ content: { component: Root, ref, testID: 'content' } }}>
            <Counter />
          </AccordionSummary>
          <Text>Body</Text>
        </Accordion>
      </ThemeProvider>
    );
    const tree = render(scene(false), { createNodeMock: () => ({}) });
    const host = ref.current;
    expect(host).not.toBeNull();
    fireEvent.press(tree.getByTestId('gutters-count'));
    tree.rerender(scene(true));
    expect(tree.getByTestId('gutters-count')).toHaveTextContent('1');
    expect(ref.current).toBe(host);
    expect(tree.getByTestId('content')).toHaveStyle({ marginTop: 12, marginBottom: 12 });
    tree.rerender(scene(false));
    expect(tree.getByTestId('gutters-count')).toHaveTextContent('1');
    expect(ref.current).toBe(host);
    advance(48);
    const margin = StyleSheet.flatten(tree.getByTestId('content').props.style).marginTop;
    expect(margin).toBeGreaterThan(12);
    expect(margin).toBeLessThan(20);
    advance(150);
    expect(tree.getByTestId('content')).toHaveStyle({ marginTop: 20, marginBottom: 20 });
  });
}

test('a transparent custom Summary terminal retains the named constructor height transition', () => {
  const Terminal = forwardRef<ViewInstance, import('@altroo/mui-native').ButtonBaseRootProps>(
    function Terminal(props, ref) {
      return <NativePressable {...props} ref={ref} />;
    },
  );
  const scene = (expanded: boolean) => (
    <ThemeProvider theme={theme}>
      <Accordion expanded={expanded}>
        <AccordionSummary testID="summary" component={Terminal}>
          Summary
        </AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    </ThemeProvider>
  );
  const tree = render(scene(false), { createNodeMock: () => ({}) });
  tree.rerender(scene(true));
  advance(48);
  const height = StyleSheet.flatten(tree.getByTestId('summary').props.style).minHeight;
  expect(height).toBeGreaterThan(48);
  expect(height).toBeLessThan(64);
  advance(150);
  expect(tree.getByTestId('summary')).toHaveStyle({ minHeight: 64 });
});
