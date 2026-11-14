// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Host double verifies the prepared programme/clock handoff. Native pre-layout
// and paint are exercised separately by the maintained Release fixture.
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
jest.mock('../packages/native-host/src/ownedStructuralCases', () => ({
  ownedStructuralCases: {
    profile: {
      schema: 1,
      rn: '0.88.1',
      platform: 'ios',
      styleKeys: require('../packages/native-host/src/ownedStyleVocabulary').ownedStyleVocabulary
        .sha256,
      nativeCSSParsing:
        require('react-native/Libraries/Components/View/ReactNativeStyleAttributes')
          .colorAttribute === true,
      cppPropsIteratorSetter: false,
      accumulatedRawPropsAndroid: false,
      exclusivePropsAndroid: false,
      propsReconciliationAndroid: false,
    },
    activation: { acquire: () => () => {} },
    Native: require('react-native').View,
    encode: require('../packages/native-host/src/ownedStyleEncoding').encodeStructuralCases,
  },
}));
import { createRef, forwardRef, useState } from 'react';
import { Text, type ViewInstance } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { Accordion, AccordionSummary, Box, ThemeProvider, createTheme } from '@altroo/mui-native';
import { nativeStyleTree } from '../packages/material/src/nativeStyleAncestry';
const Opaque = forwardRef<ViewInstance, Record<string, unknown>>(function Opaque(props, ref) {
  return <Box {...props} ref={ref} />;
});
afterEach(() => {
  cleanup();
  jest.useRealTimers();
  jest.restoreAllMocks();
});
for (const Root of [undefined, Box, Opaque]) {
  test(
    'final root forwards prepared structural cases and preserves native inline priority: ' +
      (Root?.displayName ?? String(Root)),
    () => {
      const ref = createRef<ViewInstance>();
      const tree = render(
        <Accordion
          component={Root}
          ref={ref}
          testID="panel"
          sx={{ '&:first-of-type': { minHeight: 80 }, '&:last-of-type': { minHeight: 100 } }}
          style={{ minHeight: 90 }}
        >
          <AccordionSummary>Summary</AccordionSummary>
          <Box testID="body" />
        </Accordion>,
        { createNodeMock: () => ({}) },
      );
      const programme = tree.getByTestId('panel').props.ownedProgramme;
      expect(programme.schema).toBe(2);
      expect(programme.cases).toHaveLength(8);
      expect(
        programme.cases.every((value: Record<string, unknown>) => value.minHeight === 90),
      ).toBe(true);
      expect(
        tree.getByTestId('body', { includeHiddenElements: true }).props.ownedProgramme,
      ).toBeUndefined();
      expect(ref.current).not.toBeNull();
    },
  );
}
test('expanded reorder keeps the resting and moving margin on its one source clock', () => {
  jest.useFakeTimers();
  jest
    .spyOn(globalThis, 'requestAnimationFrame')
    .mockImplementation(
      (callback) => setTimeout(() => callback(performance.now()), 16) as unknown as number,
    );
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => clearTimeout(id));
  const theme = createTheme({
    motion: { reducedMotion: 'never' },
    transitions: { duration: { shortest: 100 }, easing: { easeInOut: 'linear' } },
  });
  const parent = { children: [] as object[] };
  const host = { parentElement: parent, tagName: 'RN:AltrooMUIStructuralView', isConnected: true };
  const tail = { tagName: 'RN:View' };
  parent.children = [{ tagName: 'RN:View' }, host, tail];
  const tree = render(
    <ThemeProvider theme={theme}>
      <Accordion expanded testID="panel">
        <AccordionSummary>Summary</AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    </ThemeProvider>,
    {
      createNodeMock: (node) =>
        (node.props as { testID?: string }).testID === 'panel' ? host : {},
    },
  );
  const margins = () =>
    tree
      .getByTestId('panel')
      .props.ownedProgramme.cases.map((value: Record<string, unknown>) => value.marginTop);
  expect(margins()).toEqual(Array(8).fill(16));
  parent.children = [host, tail];
  act(() => nativeStyleTree.changed());
  // The new first-of-type endpoint cannot pre-empt the resting presentation.
  expect(margins()).toEqual(Array(8).fill(16));
  act(() => jest.advanceTimersByTime(48));
  expect(margins()[0]).toBeGreaterThan(0);
  expect(margins()[0]).toBeLessThan(16);
  expect(new Set(margins()).size).toBe(1);
  act(() => jest.advanceTimersByTime(150));
  expect(margins()).toEqual(Array(8).fill(0));
});

function RetainedCounter() {
  const [count, setCount] = useState(0);
  return (
    <Text testID="retained-count" onPress={() => setCount((value) => value + 1)}>
      {count}
    </Text>
  );
}
for (const Root of [undefined, Box, Opaque]) {
  test(
    'toggling conditional text keeps the owned host, ref and descendant state: ' + String(Root),
    () => {
      const ref = createRef<ViewInstance>();
      const scene = (conditional: boolean) => (
        <Accordion
          component={Root}
          ref={ref}
          testID="panel"
          sx={conditional ? { '&:first-of-type': { color: 'red' } } : undefined}
        >
          <AccordionSummary>
            <RetainedCounter />
          </AccordionSummary>
        </Accordion>
      );
      const tree = render(scene(false), { createNodeMock: () => ({}) });
      const host = ref.current;
      fireEvent.press(tree.getByTestId('retained-count'));
      tree.rerender(scene(true));
      const programme = tree.getByTestId('panel').props.ownedProgramme;
      expect(programme.schema).toBe(2);
      expect(
        new Set(programme.cases.map((value: Record<string, unknown>) => JSON.stringify(value)))
          .size,
      ).toBe(1);
      expect(tree.getByTestId('retained-count')).toHaveTextContent('1');
      expect(ref.current).toBe(host);
      tree.rerender(scene(false));
      expect(tree.getByTestId('panel').props.ownedProgramme.schema).toBe(2);
      expect(tree.getByTestId('retained-count')).toHaveTextContent('1');
      expect(ref.current).toBe(host);
    },
  );
}
