// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// A previous native binary supports root cases but not parent pseudo selection.
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
    profile: {},
    parentSelectors: false,
    activation: { acquire: () => () => {} },
    Native: require('react-native').View,
    encode: (_profile: unknown, cases: unknown[]) => cases,
  },
}));
import { cleanup, render } from '@testing-library/react-native';
import { Accordion, AccordionSummary } from '@altroo/mui-native';
afterEach(cleanup);
test('old binaries receive no owner projection and retain their ordinary ornament', () => {
  const tree = render(
    <Accordion testID="old-panel">
      <AccordionSummary>Summary</AccordionSummary>
    </Accordion>,
    { createNodeMock: () => ({}) },
  );
  expect(tree.getByTestId('old-panel').props.ownedProgramme.owner).toBeUndefined();
  expect(
    tree.getByTestId('mui-accordion-before', { includeHiddenElements: true }).props.ownedProgramme,
  ).toBeUndefined();
});
