// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Host-tree doubles prove selector/state ownership. Installed simulator checks
// separately verify native host order, first-frame paint and presentation.
const mockObservers = new Set<() => void>();
const mockStop = jest.fn();
jest.mock('@altroo/mui-native-host/internal/structural-observation', () => ({
  createNativeStructuralObservation: () => ({
    watch: (_tag: number, _lease: string, _mode: string, notify: () => void) => {
      mockObservers.add(notify);
      return () => {
        mockObservers.delete(notify);
        mockStop();
      };
    },
    dispose: jest.fn(),
  }),
}));
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(actual),
      View: { value: 'View', enumerable: true, configurable: true },
      findNodeHandle: { value: (node: { tag?: number }) => node.tag ?? null, enumerable: true },
    },
  );
});
import { createRef, forwardRef, memo, useState, type ReactElement } from 'react';
import { Text, View, StyleSheet, type ViewInstance } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import {
  Accordion,
  AccordionSummary,
  Box,
  Paper,
  ThemeProvider,
  createTheme,
} from '@altroo/mui-native';
import { createNativeStyleCache, NativeStyleCacheProvider } from '@altroo/mui-native-system';
import { nativeStyleTree } from '../packages/material/src/nativeStyleAncestry';
import original from './fixtures/mui-accordion-9.5.0.json';
import {
  accordionStructureAt,
  accordionBeforeOrigin,
  type AccordionHost,
} from '../packages/material/src/accordionStructure';
import { GENERATED_TEXT_ORIGIN_CONTRACT } from '@altroo/mui-native-system/internal/generated-paragraph';
type Host = AccordionHost & {
  parentElement: Host | null;
  tag: number;
  tagName: string;
  isConnected: boolean;
  children: Host[];
};
function model(order: string[]) {
  const nodes = new Map<string, Host>();
  const parent: Host = {
    parentElement: null,
    children: [],
    tag: 99,
    tagName: 'View',
    isConnected: true,
  };
  for (const name of order)
    nodes.set(name, {
      parentElement: parent,
      children: [],
      tag: nodes.size + 100,
      tagName: name === 'text' ? 'Text' : 'View',
      isConnected: true,
    });
  const reorder = (next: string[]) => {
    parent.children = next.map((name) => nodes.get(name)!);
  };
  reorder(order);
  return {
    nodes,
    parent,
    reorder,
    createNodeMock: (element: ReactElement) => {
      const props = element.props as { testID?: unknown };
      return nodes.get(typeof props.testID === 'string' ? props.testID : '') ?? {};
    },
  };
}
afterEach(() => {
  cleanup();
  expect(mockObservers.size).toBe(0);
  jest.clearAllMocks();
});
test('native type boundaries differ from child boundaries and immediate adjacency', () => {
  const m = model(['a', 'text', 'b']);
  const expandedAt = (node: AccordionHost) => node === m.nodes.get('a');
  expect(accordionStructureAt(m.nodes.get('a')!, expandedAt)).toMatchObject({
    facts: { firstOfType: true, lastOfType: false, lastChild: false },
    previousExpanded: false,
  });
  expect(accordionStructureAt(m.nodes.get('b')!, expandedAt)).toMatchObject({
    facts: { firstOfType: false, lastOfType: true, lastChild: true },
    previousExpanded: false,
  });
  m.reorder(['a', 'b', 'text']);
  expect(accordionStructureAt(m.nodes.get('b')!, expandedAt)).toMatchObject({
    facts: { firstOfType: false, lastOfType: true, lastChild: false },
    previousExpanded: true,
  });
});
test.each([GENERATED_TEXT_ORIGIN_CONTRACT.nativeIDPrefix, accordionBeforeOrigin])(
  'owned native origin %s is absent from source element order',
  (origin) => {
    const m = model(['a', 'text', 'b']);
    Object.assign(m.nodes.get('text')!, {
      id: origin + 'test',
    });
    expect(
      accordionStructureAt(m.nodes.get('b')!, (node) => node === m.nodes.get('a')),
    ).toMatchObject({ previousExpanded: true });
  },
);
test('disconnected and stale parent snapshots keep structural predicates unknown', () => {
  const m = model(['a']);
  m.nodes.get('a')!.isConnected = false;
  expect(accordionStructureAt(m.nodes.get('a')!, () => true).facts).toEqual({});
  m.nodes.get('a')!.isConnected = true;
  m.reorder([]);
  expect(accordionStructureAt(m.nodes.get('a')!, () => true).facts).toEqual({});
});
const WrappedView = forwardRef<ViewInstance, Record<string, any>>((props, ref) => (
  <View {...props} ref={ref} />
));
const WrappedBox = forwardRef<ViewInstance, Record<string, any>>((props, ref) => (
  <Box {...props} ref={ref} />
));
const WrappedPaper = forwardRef<ViewInstance, Record<string, any>>((props, ref) => (
  <Paper {...props} ref={ref} />
));
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <Text testID="count" onPress={() => setCount(count + 1)}>
      {count}
    </Text>
  );
}
for (const [name, Root] of [
  ['default Paper', undefined],
  ['opaque View', WrappedView],
  ['memo Box', memo(Box)],
  ['opaque Box', WrappedBox],
  ['opaque Paper', WrappedPaper],
] as const) {
  test(`${name} follows physical reorder without replaying owner callbacks or losing body state`, async () => {
    const m = model(['a', 'b', 'c']);
    const source = jest.fn(() => ({
      '&:first-of-type .MuiAccordion-region': { paddingTop: '19px' },
    }));
    const rootSlot = jest.fn(() => ({ as: Root }));
    const theme = createTheme({
      motion: { reducedMotion: 'always' },
      components: {
        MuiAccordion: { styleOverrides: { root: source } },
      },
    });
    const ref = createRef<ViewInstance>();
    const tree = render(
      <ThemeProvider theme={theme}>
        {['a', 'b', 'c'].map((id) => (
          <Accordion
            key={id}
            testID={id}
            ref={id === 'b' ? ref : undefined}
            expanded
            slotProps={{ root: rootSlot, region: { testID: id + '-region' } }}
          >
            <AccordionSummary>{id}</AccordionSummary>
            {id === 'b' ? <Counter /> : <Text>body</Text>}
          </Accordion>
        ))}
      </ThemeProvider>,
      { createNodeMock: m.createNodeMock },
    );
    const initialCalls = source.mock.calls.length;
    expect(rootSlot).toHaveBeenCalledTimes(3);
    expect(tree.getByTestId('a')).toHaveStyle({
      borderTopLeftRadius: 4,
      marginTop: 0,
      marginBottom: 16,
    });
    expect(tree.getByTestId('b')).toHaveStyle({ borderRadius: 0, marginTop: 16, marginBottom: 16 });
    expect(tree.getByTestId('c')).toHaveStyle({
      borderBottomLeftRadius: 4,
      marginTop: 16,
      marginBottom: 0,
    });
    expect(tree.getByTestId('a-region')).toHaveStyle({ paddingTop: 19 });
    expect(tree.getByTestId('b-region').props.style).not.toMatchObject({ paddingTop: 19 });
    const host = ref.current;
    fireEvent.press(tree.getByTestId('count'));
    m.reorder(['b', 'c', 'a']);
    await act(async () => {
      for (const notify of [...mockObservers]) notify();
      await Promise.resolve();
    });
    expect(tree.getByTestId('b')).toHaveStyle({
      borderTopLeftRadius: 4,
      marginTop: 0,
      marginBottom: 16,
    });
    expect(tree.getByTestId('a')).toHaveStyle({
      borderBottomLeftRadius: 4,
      marginTop: 16,
      marginBottom: 0,
    });
    expect(tree.getByTestId('count')).toHaveTextContent('1');
    expect(tree.getByTestId('b-region')).toHaveStyle({ paddingTop: 19 });
    expect(tree.getByTestId('a-region').props.style).not.toMatchObject({ paddingTop: 19 });
    expect(ref.current).toBe(host);
    expect(source).toHaveBeenCalledTimes(initialCalls);
    expect(rootSlot).toHaveBeenCalledTimes(3);
  });
}
test('genuine inline corners and margins override the grouped source CSS', () => {
  const m = model(['a']);
  const tree = render(
    <Accordion testID="a" expanded style={{ borderRadius: 19, margin: 7 }}>
      <AccordionSummary>Summary</AccordionSummary>
      <Text>body</Text>
    </Accordion>,
    { createNodeMock: m.createNodeMock },
  );
  expect(tree.getByTestId('a')).toHaveStyle({ borderRadius: 19, margin: 7 });
  expect(tree.getByTestId('a').props.style).not.toMatchObject({ marginTop: 0 });
});
test('a non-Accordion View still determines the root type boundary', () => {
  const m = model(['a', 'boundary']);
  const tree = render(
    <ThemeProvider theme={createTheme({ motion: { reducedMotion: 'always' } })}>
      <Accordion testID="a" expanded>
        <AccordionSummary>Summary</AccordionSummary>
        <Text>body</Text>
      </Accordion>
      <View testID="boundary" />
    </ThemeProvider>,
    { createNodeMock: m.createNodeMock },
  );
  expect(tree.getByTestId('a')).toHaveStyle({ marginTop: 0, marginBottom: 16 });
  m.reorder(['boundary', 'a']);
  act(() => nativeStyleTree.changed());
  expect(tree.getByTestId('a')).toHaveStyle({ marginTop: 16, marginBottom: 0 });
});

test('one structural notification reads each physical parent once for all registered roots', async () => {
  const ids = Array.from({ length: 8 }, (_, index) => `item-${index}`);
  const m = model(ids);
  let siblings = m.parent.children;
  const readChildren = jest.fn(() => siblings);
  Object.defineProperty(m.parent, 'children', {
    get: readChildren,
    set: (value) => {
      siblings = value;
    },
  });
  render(
    <>
      {ids.map((id) => (
        <Accordion key={id} testID={id}>
          <AccordionSummary>{id}</AccordionSummary>
          <Text>body</Text>
        </Accordion>
      ))}
    </>,
    { createNodeMock: m.createNodeMock },
  );
  readChildren.mockClear();
  act(() => nativeStyleTree.changed());
  expect(readChildren).toHaveBeenCalledTimes(1);
  readChildren.mockClear();
  await act(async () => {
    for (const notify of [...mockObservers]) notify();
    await Promise.resolve();
  });
  expect(readChildren).toHaveBeenCalledTimes(1);
});

test('moving a retained host to another physical parent recomputes its type boundaries', async () => {
  const m = model(['a', 'b']);
  const tree = render(
    <ThemeProvider theme={createTheme({ motion: { reducedMotion: 'always' } })}>
      <Accordion testID="a" expanded>
        <AccordionSummary>Summary</AccordionSummary>
        <Counter />
      </Accordion>
      <View testID="b" />
    </ThemeProvider>,
    { createNodeMock: m.createNodeMock },
  );
  fireEvent.press(tree.getByTestId('count'));
  expect(tree.getByTestId('a')).toHaveStyle({ marginBottom: 16 });
  const moved = m.nodes.get('a')!;
  m.reorder(['b']);
  moved.parentElement = { ...m.parent, children: [moved] };
  await act(async () => {
    for (const notify of [...mockObservers]) notify();
    await Promise.resolve();
  });
  expect(tree.getByTestId('a')).toHaveStyle({
    marginTop: 0,
    marginBottom: 0,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  });
  expect(tree.getByTestId('count')).toHaveTextContent('1');
});

for (const [name, Root] of [
  ['Paper', undefined],
  ['opaque View', WrappedView],
  ['opaque Box', WrappedBox],
  ['opaque Paper', WrappedPaper],
  ['memo Box', memo(Box)],
] as const) {
  test(`${name} separator follows first/type and adjacent expanded panels without layout or hits`, async () => {
    const m = model(['a', 'b', 'c']);
    const selected = createTheme({ motion: { reducedMotion: 'always' } });
    const scene = (expanded: string | string[] | false) => (
      <ThemeProvider theme={selected}>
        {['a', 'b', 'c'].map((id) => (
          <Accordion
            key={id}
            testID={id}
            expanded={Array.isArray(expanded) ? expanded.includes(id) : expanded === id}
            slotProps={{ root: { as: Root } }}
          >
            <AccordionSummary>{id}</AccordionSummary>
            <Text>Body</Text>
          </Accordion>
        ))}
      </ThemeProvider>
    );
    const tree = render(scene(false), { createNodeMock: m.createNodeMock });
    const separators = () =>
      tree.getAllByTestId('mui-accordion-before', { includeHiddenElements: true });
    expect(separators()).toHaveLength(3);
    expect(separators()[0]).toHaveStyle({ display: 'none' });
    expect(separators()[1]).toHaveStyle({ position: 'absolute', top: -1, height: 1, opacity: 1 });
    expect(separators()[1].props).toMatchObject({
      pointerEvents: 'none',
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    });
    tree.rerender(scene('a'));
    expect(separators()[0]).toHaveStyle({ opacity: 0 });
    // Original nested & + & repeats the whole expanded selector. A following
    // collapsed panel keeps its divider, despite the expanded predecessor.
    expect(separators()[1]).toHaveStyle({ opacity: 1 });
    expect(StyleSheet.flatten(separators()[1].props.style).display).toBeUndefined();
    tree.rerender(scene(['a', 'b']));
    expect(separators()[1]).toHaveStyle({ display: 'none', opacity: 0 });
    expect(StyleSheet.flatten(separators()[2].props.style).display).toBeUndefined();
    m.reorder(['c', 'a', 'b']);
    await act(async () => {
      for (const notify of [...mockObservers]) notify();
      await Promise.resolve();
    });
    expect(separators()[2]).toHaveStyle({ display: 'none' });
    expect(separators()[1]).toHaveStyle({ display: 'none' });
  });
}
test('separator sx keeps pseudo/state specificity and the selected dark palette', () => {
  const m = model(['a', 'b']);
  const dark = createTheme({ palette: { mode: 'dark' }, motion: { reducedMotion: 'always' } });
  const scene = (expanded: boolean) => (
    <ThemeProvider theme={dark}>
      <View testID="a" />
      <Accordion
        testID="b"
        expanded={expanded}
        sx={{ '&::before': { height: '2px', opacity: 0.5 } }}
      >
        <AccordionSummary>Summary</AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    </ThemeProvider>
  );
  const tree = render(scene(false), { createNodeMock: m.createNodeMock });
  const separator = () => tree.getByTestId('mui-accordion-before', { includeHiddenElements: true });
  expect(separator()).toHaveStyle({
    height: 2,
    opacity: 0.5,
    backgroundColor: dark.palette.divider,
  });
  tree.rerender(scene(true));
  expect(separator()).toHaveStyle({ height: 2, opacity: 0 });
});

test('an outer Accordion pseudo-element does not style a nested panel ornament', () => {
  const m = model(['outer', 'inner', 'region', 'boundary']);
  m.reorder(['outer']);
  const inner = m.nodes.get('inner')!,
    region = m.nodes.get('region')!,
    boundary = m.nodes.get('boundary')!;
  inner.parentElement = region;
  boundary.parentElement = region;
  region.parentElement = m.nodes.get('outer')!;
  region.children = [boundary, inner];
  const selected = createTheme({ motion: { reducedMotion: 'always' } });
  const tree = render(
    <ThemeProvider theme={selected}>
      <Accordion testID="outer" expanded slotProps={{ region: { testID: 'region' } }}>
        <AccordionSummary>Outer</AccordionSummary>
        <View testID="boundary" />
        <Accordion testID="inner">
          <AccordionSummary>Inner</AccordionSummary>
          <Text>Body</Text>
        </Accordion>
      </Accordion>
    </ThemeProvider>,
    { createNodeMock: m.createNodeMock },
  );
  const before = tree.getAllByTestId('mui-accordion-before', { includeHiddenElements: true });
  // Nested body is visited before the outer root's trailing ornament.
  expect(before[0]).toHaveStyle({ height: 1, opacity: 1 });
  expect(StyleSheet.flatten(before[0].props.style).display).toBeUndefined();
  expect(before[1]).toHaveStyle({ display: 'none', opacity: 0 });
});
test('a surrounding Box before rule stays on Box while an explicit panel target reaches its ornament', () => {
  const m = model(['boundary', 'a']);
  const selected = createTheme({ motion: { reducedMotion: 'always' } });
  const tree = render(
    <ThemeProvider theme={selected}>
      <Box
        className="chosen"
        sx={{
          '&.chosen::before': { height: '9px', opacity: 0.1 },
          '&.chosen .MuiAccordion-root': { '&::before': { height: '3px' } },
        }}
      >
        <View testID="boundary" />
        <Accordion testID="a">
          <AccordionSummary>Summary</AccordionSummary>
          <Text>Body</Text>
        </Accordion>
      </Box>
    </ThemeProvider>,
    { createNodeMock: m.createNodeMock },
  );
  expect(tree.getByTestId('mui-accordion-before', { includeHiddenElements: true })).toHaveStyle({
    height: 3,
    opacity: 1,
  });
});

for (const [selector, display] of [
  ['&.Mui-expanded.Mui-expanded::before', 'none'],
  ['&.Mui-expanded.Mui-expanded.Mui-expanded::before', 'flex'],
] as const)
  test(`adjacent expanded source specificity competes correctly with ${selector}`, () => {
    const m = model(['a', 'b']);
    const selected = createTheme({ motion: { reducedMotion: 'always' } });
    const tree = render(
      <ThemeProvider theme={selected}>
        <Accordion testID="a" expanded sx={{ [selector]: { display: 'flex' } }}>
          <AccordionSummary>A</AccordionSummary>
          <Text>Body</Text>
        </Accordion>
        <Accordion testID="b" expanded sx={{ [selector]: { display: 'flex' } }}>
          <AccordionSummary>B</AccordionSummary>
          <Text>Body</Text>
        </Accordion>
      </ThemeProvider>,
      { createNodeMock: m.createNodeMock },
    );
    expect(
      tree.getAllByTestId('mui-accordion-before', { includeHiddenElements: true })[1],
    ).toHaveStyle({ display });
  });

for (const expected of original.sourceClassContracts)
  test(`native peer class eligibility matches original: ${expected.name}`, () => {
    const m = model(['a', 'b']);
    type Profile = {
      props?: Record<string, unknown>;
      root?: string;
      theme?: Record<string, unknown>;
    };
    const panel = (id: string, profile: Profile) => {
      const Root =
        profile.root === 'Box'
          ? Box
          : profile.root === 'ForwardedBox'
            ? WrappedBox
            : profile.root === 'ForwardedView'
              ? WrappedView
              : undefined;
      return (
        <ThemeProvider
          theme={createTheme({ motion: { reducedMotion: 'always' }, ...profile.theme })}
        >
          <Accordion expanded {...profile.props} {...(Root ? { component: Root } : {})} testID={id}>
            <AccordionSummary>{id}</AccordionSummary>
            <Text>Body</Text>
          </Accordion>
        </ThemeProvider>
      );
    };
    const tree = render(
      <>
        {panel('a', expected.a)}
        {panel('b', expected.b)}
      </>,
      { createNodeMock: m.createNodeMock },
    );
    const before = tree.getAllByTestId('mui-accordion-before', { includeHiddenElements: true })[1];
    expect(StyleSheet.flatten(before.props.style).display === 'none').toBe(expected.hidesBefore);
  });

test.each([true, false])(
  'peer CSS identity compares cache prefixes rather than cache instances: samePrefix=%s',
  (samePrefix) => {
    const m = model(['a', 'b']);
    const aCache = createNativeStyleCache({ key: 'peer-a' });
    const bCache = createNativeStyleCache({ key: samePrefix ? 'peer-a' : 'peer-b' });
    const selected = createTheme({ motion: { reducedMotion: 'always' } });
    const tree = render(
      <ThemeProvider theme={selected}>
        <NativeStyleCacheProvider value={aCache}>
          <Accordion testID="a" expanded>
            <AccordionSummary>A</AccordionSummary>
            <Text>Body</Text>
          </Accordion>
        </NativeStyleCacheProvider>
        <NativeStyleCacheProvider value={bCache}>
          <Accordion testID="b" expanded>
            <AccordionSummary>B</AccordionSummary>
            <Text>Body</Text>
          </Accordion>
        </NativeStyleCacheProvider>
      </ThemeProvider>,
      { createNodeMock: m.createNodeMock },
    );
    try {
      const before = tree.getAllByTestId('mui-accordion-before', {
        includeHiddenElements: true,
      })[1];
      expect(StyleSheet.flatten(before.props.style).display === 'none').toBe(samePrefix);
    } finally {
      tree.unmount();
      aCache.dispose();
      bCache.dispose();
    }
  },
);
test('an unrelated shared emitted class does not satisfy this Accordion adjacency rule', () => {
  const m = model(['a', 'b']);
  const selected = createTheme({ motion: { reducedMotion: 'always' } });
  const tree = render(
    <ThemeProvider theme={selected}>
      <Accordion testID="a" expanded>
        <AccordionSummary>A</AccordionSummary>
        <Text>Body</Text>
      </Accordion>
      <Accordion testID="b" expanded sx={{ paddingTop: '3px' }}>
        <AccordionSummary>B</AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    </ThemeProvider>,
    { createNodeMock: m.createNodeMock },
  );
  const a = nativeStyleTree.exactHostStyle(m.nodes.get('a')!)!;
  const b = nativeStyleTree.exactHostStyle(m.nodes.get('b')!)!;
  const shared = {
    cacheKey: 'css',
    css: 'unrelated-shared-class',
    sourceOwners: ['unrelated-owner'],
  };
  const releases: (() => void)[] = [];
  try {
    act(() => {
      for (const rule of [a, b])
        releases.push(
          nativeStyleTree.registerGroup({
            ...rule,
            scopeDepth: 1000,
            sourceClasses: [shared, ...rule.sourceClasses!],
          }),
        );
    });
    const before = tree.getAllByTestId('mui-accordion-before', { includeHiddenElements: true })[1];
    expect(StyleSheet.flatten(before.props.style).display).toBeUndefined();
  } finally {
    act(() => {
      for (const release of releases) release();
    });
    tree.unmount();
  }
});
test('a live constructor-class change refreshes peer eligibility and retains body edits', () => {
  const m = model(['a', 'b']);
  const selected = createTheme({ motion: { reducedMotion: 'always' } });
  const scene = (square: boolean) => (
    <ThemeProvider theme={selected}>
      <Accordion testID="a" expanded>
        <AccordionSummary>A</AccordionSummary>
        <Counter />
      </Accordion>
      <Accordion testID="b" expanded square={square}>
        <AccordionSummary>B</AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    </ThemeProvider>
  );
  const tree = render(scene(false), { createNodeMock: m.createNodeMock });
  const before = () =>
    tree.getAllByTestId('mui-accordion-before', { includeHiddenElements: true })[1];
  expect(before()).toHaveStyle({ display: 'none' });
  fireEvent.press(tree.getByTestId('count'));
  tree.rerender(scene(true));
  expect(StyleSheet.flatten(before().props.style).display).toBeUndefined();
  expect(tree.getByTestId('count')).toHaveTextContent('1');
  tree.rerender(scene(false));
  expect(before()).toHaveStyle({ display: 'none' });
  expect(tree.getByTestId('count')).toHaveTextContent('1');
});

test.each(['sx', 'theme', 'className'] as const)(
  'same-host peer %s changes and restoration refresh the source class snapshot',
  (kind) => {
    const m = model(['a', 'b']);
    const light = createTheme({ motion: { reducedMotion: 'always' } });
    const dark = createTheme({ palette: { mode: 'dark' }, motion: { reducedMotion: 'always' } });
    const scene = (changed: boolean) => (
      <ThemeProvider theme={light}>
        <Accordion
          testID="a"
          expanded={kind !== 'className'}
          className={kind === 'className' && !changed ? 'Mui-expanded' : undefined}
        >
          <AccordionSummary>A</AccordionSummary>
          <Text>Body</Text>
        </Accordion>
        <ThemeProvider theme={kind === 'theme' && changed ? dark : light}>
          <Accordion
            testID="b"
            expanded
            sx={kind === 'sx' && changed ? { paddingTop: '3px' } : undefined}
          >
            <AccordionSummary>B</AccordionSummary>
            <Counter />
          </Accordion>
        </ThemeProvider>
      </ThemeProvider>
    );
    const tree = render(scene(false), { createNodeMock: m.createNodeMock });
    const before = () =>
      tree.getAllByTestId('mui-accordion-before', { includeHiddenElements: true })[1];
    expect(before()).toHaveStyle({ display: 'none' });
    fireEvent.press(tree.getByTestId('count'));
    tree.rerender(scene(true));
    expect(StyleSheet.flatten(before().props.style).display).toBeUndefined();
    expect(tree.getByTestId('count')).toHaveTextContent('1');
    tree.rerender(scene(false));
    expect(before()).toHaveStyle({ display: 'none' });
    expect(tree.getByTestId('count')).toHaveTextContent('1');
  },
);

test('real RN-prefixed owned and ordinary Views share one structural selector type', () => {
  const m = model(['leading', 'a', 'b', 'trailing']);
  for (const name of ['leading', 'trailing']) m.nodes.get(name)!.tagName = 'RN:View';
  for (const name of ['a', 'b']) m.nodes.get(name)!.tagName = 'RN:AltrooMUIStructuralView';
  expect(accordionStructureAt(m.nodes.get('a')!, () => false).facts).toMatchObject({
    firstOfType: false,
    lastOfType: false,
  });
  expect(accordionStructureAt(m.nodes.get('b')!, () => false).facts).toMatchObject({
    firstOfType: false,
    lastOfType: false,
    lastChild: false,
  });
  m.reorder(['a', 'b']);
  expect(accordionStructureAt(m.nodes.get('a')!, () => false).facts).toMatchObject({
    firstOfType: true,
    lastOfType: false,
  });
  expect(accordionStructureAt(m.nodes.get('b')!, () => false).facts).toMatchObject({
    firstOfType: false,
    lastOfType: true,
    lastChild: true,
  });
});
