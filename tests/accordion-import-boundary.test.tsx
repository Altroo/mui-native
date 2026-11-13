// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// An ordinary Accordion must not initialize optional native compiler internals.
jest.mock('../packages/native-host/src/ownedStyleEncoding', () => {
  throw Error('Accordion eagerly loaded the unrelated native style compiler');
});
import { render, cleanup } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Accordion, AccordionSummary } from '../packages/material/src/accordion';
afterEach(cleanup);
test('Accordion imports and renders through its observation-only dependency', () => {
  const tree = render(
    <Accordion>
      <AccordionSummary>Summary</AccordionSummary>
      <Text>Body</Text>
    </Accordion>,
  );
  expect(tree.getByText('Summary')).toBeOnTheScreen();
});
