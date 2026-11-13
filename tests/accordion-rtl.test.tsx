// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef } from 'react';
import { Text, View, type ViewInstance } from 'react-native';
import { render, cleanup } from '@testing-library/react-native';
import {
  Accordion,
  AccordionSummary,
  Box,
  Paper,
  ThemeProvider,
  createTheme,
} from '@altroo/mui-native';
const theme = createTheme({ motion: { reducedMotion: 'always' } });
afterEach(cleanup);
const Plain = forwardRef<ViewInstance, Record<string, any>>(function Plain(props, ref) {
  return <View {...props} ref={ref} />;
});
const Styled = forwardRef<ViewInstance, Record<string, any>>(function Styled(props, ref) {
  return <Box {...props} ref={ref} />;
});
for (const [name, Root] of [
  ['default', undefined],
  ['Box', Box],
  ['Paper', Paper],
  ['opaque View', Plain],
  ['opaque Box', Styled],
] as const) {
  test(`Accordion ${name} and Summary inherit an authored RTL parent without changing the theme`, () => {
    const tree = render(
      <ThemeProvider theme={theme}>
        <Box sx={{ direction: 'rtl' }}>
          <Accordion testID="panel" component={Root} expanded>
            <AccordionSummary testID="summary" expandIcon={<Text>Icon</Text>}>
              Summary
            </AccordionSummary>
            <Text>Body</Text>
          </Accordion>
        </Box>
      </ThemeProvider>,
    );
    expect(tree.getByTestId('panel')).toHaveStyle({ direction: 'rtl' });
    expect(tree.getByTestId('summary')).toHaveStyle({ direction: 'rtl' });
  });
}
test('an authored Accordion direction overrides its inherited direction', () => {
  const tree = render(
    <ThemeProvider theme={theme}>
      <Box sx={{ direction: 'rtl' }}>
        <Accordion testID="panel" expanded sx={{ direction: 'ltr' }}>
          <AccordionSummary testID="summary">Summary</AccordionSummary>
          <Text>Body</Text>
        </Accordion>
      </Box>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('panel')).toHaveStyle({ direction: 'ltr' });
  expect(tree.getByTestId('summary')).toHaveStyle({ direction: 'ltr' });
});
test('a root with no authored parent direction uses the native theme direction', () => {
  const tree = render(
    <ThemeProvider theme={createTheme({ direction: 'rtl', motion: { reducedMotion: 'always' } })}>
      <Accordion testID="panel" expanded>
        <AccordionSummary testID="summary">Summary</AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('panel')).toHaveStyle({ direction: 'rtl' });
  expect(tree.getByTestId('summary')).toHaveStyle({ direction: 'rtl' });
});
