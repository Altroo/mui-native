// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, useState } from 'react';
import { View, StyleSheet, type ViewInstance } from 'react-native';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import {
  Accordion,
  AccordionSummary,
  Box,
  Paper,
  ThemeProvider,
  Typography,
  createTheme,
} from '@altroo/mui-native';
import { nativeTextScopes } from '@altroo/mui-native-system';
const theme = createTheme({ motion: { reducedMotion: 'always' } });
afterEach(cleanup);
const BoxRoot = forwardRef<ViewInstance, Record<string, any>>(function BoxRoot(props, ref) {
  return (
    <Box {...props} ref={ref} sx={{ '&.MuiPaper-root': { opacity: 0.3, paddingTop: '3px' } }} />
  );
});
const ViewRoot = forwardRef<ViewInstance, Record<string, any>>(function ViewRoot(props, ref) {
  return <View {...props} ref={ref} />;
});
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <Typography testID="count" variant="inherit" onPress={() => setCount(count + 1)}>
      {count}
    </Typography>
  );
}
for (const Component of [Paper, Accordion]) {
  test(`${Component === Paper ? 'Paper' : 'Accordion'} preserves higher-specificity custom Box root CSS`, () => {
    const ref = createRef<ViewInstance>();
    const scene = (font: number) => (
      <ThemeProvider theme={theme}>
        <Box sx={{ fontSize: font }}>
          <Component
            testID="root"
            component={BoxRoot}
            {...(Component === Accordion ? { expanded: true } : {})}
            ref={ref}
            sx={{ opacity: 0.9, paddingTop: '11px', fontSize: '2em', lineHeight: 1.5 }}
          >
            {Component === Accordion ? <AccordionSummary>Summary</AccordionSummary> : null}
            <Counter />
          </Component>
        </Box>
      </ThemeProvider>
    );
    const tree = render(scene(10), { createNodeMock: () => ({}) });
    const host = ref.current!;
    expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.3, paddingTop: 3 });
    expect(tree.getByTestId('count')).toHaveStyle({ fontSize: 20, lineHeight: 30 });
    expect(nativeTextScopes.at(host)?.style).toMatchObject({ fontSize: 20, lineHeight: 30 });
    fireEvent.press(tree.getByTestId('count'));
    tree.rerender(scene(12));
    expect(tree.getByTestId('count')).toHaveTextContent('1');
    expect(tree.getByTestId('count')).toHaveStyle({ fontSize: 24, lineHeight: 36 });
    expect(ref.current).toBe(host);
    tree.unmount();
    expect(nativeTextScopes.at(host)).toBeUndefined();
  });
}
test.each([BoxRoot, ViewRoot])(
  'genuine native inline values remain last across the Paper terminal',
  (Root) => {
    const tree = render(
      <ThemeProvider theme={theme}>
        <Box sx={{ fontSize: 10 }}>
          <Accordion
            component={Root}
            testID="root"
            expanded
            sx={{ opacity: 0.9, fontSize: '2em' }}
            style={{ opacity: 0.7, fontSize: 30 }}
          >
            <AccordionSummary>Summary</AccordionSummary>
            <Typography testID="copy" variant="inherit">
              Copy
            </Typography>
          </Accordion>
        </Box>
      </ThemeProvider>,
    );
    expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.7 });
    expect(tree.getByTestId('copy')).toHaveStyle({ fontSize: 30 });
  },
);

test('plain custom-root sx keeps the pinned source registered-class priority', () => {
  const Root = forwardRef<ViewInstance, Record<string, any>>(function Root(props, ref) {
    return <Box {...props} ref={ref} sx={{ opacity: 0.3, paddingTop: '3px' }} />;
  });
  const tree = render(
    <Paper component={Root} testID="root" sx={{ opacity: 0.9, paddingTop: '11px' }}>
      Copy
    </Paper>,
  );
  expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.9, paddingTop: 11 });
});

test('collapsed Accordion keeps Paper theme margins when its own source defines no margin', () => {
  const selected = createTheme({
    motion: { reducedMotion: 'always' },
    components: {
      MuiPaper: { styleOverrides: { root: { marginTop: '23px', marginBottom: '31px' } } },
    },
  });
  const tree = render(
    <ThemeProvider theme={selected}>
      <Accordion testID="root">
        <AccordionSummary>Summary</AccordionSummary>
        <Typography>Body</Typography>
      </Accordion>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('root')).toHaveStyle({ marginTop: 23, marginBottom: 31 });
});

test('a dark Paper overlay survives a custom Box terminal without an authored style', () => {
  const dark = createTheme({ palette: { mode: 'dark' } });
  const tree = render(
    <ThemeProvider theme={dark}>
      <Paper component={Box} testID="root">
        Copy
      </Paper>
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('root').props.style).backgroundImage).toEqual([
    {
      type: 'linear-gradient',
      colorStops: [
        { color: 'rgba(255, 255, 255, 0.051)' },
        { color: 'rgba(255, 255, 255, 0.051)' },
      ],
    },
  ]);
});
test('generated overlay stays below higher-specificity custom-root CSS', () => {
  const Root = forwardRef<ViewInstance, Record<string, any>>(function Root(props, ref) {
    return <Box {...props} ref={ref} sx={{ '&.MuiPaper-root': { backgroundImage: 'none' } }} />;
  });
  const dark = createTheme({ palette: { mode: 'dark' } });
  const tree = render(
    <ThemeProvider theme={dark}>
      <Paper component={Root} testID="root">
        Copy
      </Paper>
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('root').props.style).backgroundImage).toBe('none');
});
test('a custom Box terminal native legacy image reset clears generated modern paint', () => {
  const Root = forwardRef<ViewInstance, Record<string, any>>(function Root(
    { style, ...props },
    ref,
  ) {
    return <Box {...props} ref={ref} style={[style, { experimental_backgroundImage: [] }]} />;
  });
  const dark = createTheme({ palette: { mode: 'dark' } });
  const tree = render(
    <ThemeProvider theme={dark}>
      <Paper component={Root} testID="root">
        Copy
      </Paper>
    </ThemeProvider>,
  );
  const style = StyleSheet.flatten(tree.getByTestId('root').props.style);
  expect(style.backgroundImage).toBeUndefined();
  expect(style.experimental_backgroundImage).toEqual([]);
});
