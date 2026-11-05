import React, { useState } from 'react';
import { Text, View, StyleSheet, processColor, type ViewInstance } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  Box,
  Paper,
  Stack,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  ThemeProvider,
  createTheme,
  Typography,
  Button,
  Modal,
} from '../packages/material/src';
import { styled } from '../packages/system/src';

test('native containers render literal strings, zero and bigint through Text hosts', () => {
  render(
    <Box>
      Hello {0}
      {1n}
    </Box>,
  );
  expect(screen.getByText('Hello 01')).toBeTruthy();
});
test('container text scope inherits styles and unitless metrics through nested views', () => {
  render(
    <Box sx={{ color: '#123456', fontSize: 40, lineHeight: 1.5, letterSpacing: '0.1em' }}>
      <Box sx={{ fontSize: '50%' }}>
        <Typography variant="inherit" testID="nested">
          Nested
        </Typography>
        Raw
      </Box>
    </Box>,
  );
  expect(screen.getByTestId('nested')).toHaveStyle({
    color: '#123456',
    fontSize: 20,
    lineHeight: 30,
    letterSpacing: 4,
  });
  expect(screen.getByText('Raw')).toHaveStyle({ color: '#123456', fontSize: 20, lineHeight: 30 });
});
test('Paper resets text color like pinned MUI while caller overrides win', () => {
  const theme = createTheme({ palette: { mode: 'dark' } });
  render(
    <ThemeProvider theme={theme}>
      <Box sx={{ color: 'red' }}>
        <Paper>Paper</Paper>
        <Paper sx={{ color: 'primary.main' }}>Custom</Paper>
      </Box>
    </ThemeProvider>,
  );
  expect(screen.getByText('Paper')).toHaveStyle({ color: theme.palette.text.primary });
  expect(screen.getByText('Custom')).toHaveStyle({ color: theme.palette.primary.main });
});
test('raw container text ignores MuiTypography defaults and overrides', () => {
  const theme = createTheme({
    components: {
      MuiTypography: {
        defaultProps: { variant: 'h1', noWrap: true },
        styleOverrides: { root: { fontSize: 99, color: 'red' } },
      },
    },
  });
  render(
    <ThemeProvider theme={theme}>
      <Box sx={{ fontSize: 20, color: 'blue' }}>
        Raw<Typography>Styled</Typography>
      </Box>
    </ThemeProvider>,
  );
  expect(screen.getByText('Raw')).toHaveStyle({ fontSize: 20, color: 'blue' });
  expect(screen.getByText('Raw').props.numberOfLines).toBeUndefined();
  expect(screen.getByText('Styled')).toHaveStyle({ fontSize: 99, color: 'red' });
});
test('arrays, keyed fragments and composed containers keep literal children valid', () => {
  render(
    <Card>
      <CardContent>
        <Stack divider={<Text>|</Text>}>
          {[<React.Fragment key="a">First</React.Fragment>, 0, <Box key="b">Last</Box>]}
        </Stack>
      </CardContent>
    </Card>,
  );
  expect(screen.getByText('First')).toBeTruthy();
  expect(screen.getByText('0')).toBeTruthy();
  expect(screen.getByText('Last')).toBeTruthy();
});
test('Dialog content accepts literal text with inherited paper styles', () => {
  render(
    <Dialog
      open
      disablePortal
      slotProps={{
        transition: { appear: false },
        paper: { sx: { color: '#456789', fontSize: 22 } },
      }}
    >
      <DialogContent>Dialog copy</DialogContent>
    </Dialog>,
  );
  expect(screen.getByText('Dialog copy')).toHaveStyle({ color: '#456789', fontSize: 22 });
});
test('styled native View preserves literal text and native root refs', () => {
  const Surface = styled(View)({ color: '#112233', fontSize: 30, lineHeight: 2 });
  const ref = React.createRef<ViewInstance>();
  render(<Surface ref={ref}>Styled raw</Surface>);
  expect(screen.getByText('Styled raw')).toHaveStyle({
    color: '#112233',
    fontSize: 30,
    lineHeight: 60,
  });
  expect(ref.current !== null).toBe(true);
});

test('native literal line height stays absolute across descendants and stylesheet arrays', () => {
  const styles = StyleSheet.create({ absolute: { lineHeight: 29 } });
  render(
    <Box sx={{ fontSize: 40, lineHeight: 2 }}>
      <Box style={[styles.absolute, { fontSize: 20 }]}>
        <Box sx={{ fontSize: 10 }}>Absolute</Box>
      </Box>
      <Box sx={{ fontSize: 20 }}>Ratio</Box>
    </Box>,
  );
  expect(screen.getByText('Absolute')).toHaveStyle({ fontSize: 10, lineHeight: 29 });
  expect(screen.getByText('Ratio')).toHaveStyle({ fontSize: 20, lineHeight: 40 });
});
test('percentage line heights and inherited letter spacing remain computed lengths', () => {
  render(
    <Box sx={{ fontSize: 40, lineHeight: '150%', letterSpacing: '0.1em' }}>
      <Box sx={{ fontSize: 20 }}>Lengths</Box>
    </Box>,
  );
  expect(screen.getByText('Lengths')).toHaveStyle({
    fontSize: 20,
    lineHeight: 60,
    letterSpacing: 4,
  });
});
test('explicit native Text overrides reset relative metrics before nested Typography', () => {
  render(
    <Box sx={{ fontSize: 40, lineHeight: 2, color: 'red' }}>
      <Text style={{ fontSize: 10, lineHeight: 12, color: 'blue' }}>
        <Typography variant="inherit" sx={{ fontSize: '50%' }} testID="child">
          Small
        </Typography>
      </Text>
    </Box>,
  );
  expect(screen.getByTestId('child')).toHaveStyle({ fontSize: 5 });
  const style = StyleSheet.flatten(screen.getByTestId('child').props.style);
  expect(style.color).toBeUndefined();
  expect(style.lineHeight).toBeUndefined();
});
test('button content scope keeps its own palette and resolves inherit color from the container', () => {
  const theme = createTheme();
  render(
    <Box sx={{ fontSize: 40, color: 'red' }}>
      <Button variant="contained">
        <Typography variant="inherit" testID="contained">
          Contained
        </Typography>
      </Button>
      <Button color="inherit">Inherited</Button>
    </Box>,
  );
  // The authored Typography stays a native root so its font-scaling policy is
  // effective. Inherited computed color is explicit across the View boundary.
  expect(screen.getByTestId('contained')).toHaveStyle({
    color: theme.palette.primary.contrastText,
    fontSize: 14,
  });
  expect(screen.getByText('Inherited')).toHaveStyle({ color: 'red' });
  let label = screen.getByText('Contained').parent;
  while (label && StyleSheet.flatten(label.props.style)?.fontSize !== 14) label = label.parent;
  expect(StyleSheet.flatten(label?.props.style)).toMatchObject({
    color: theme.palette.primary.contrastText,
    fontSize: 14,
  });
});
test('keyed children retain state and native refs when text or inherited styles change', () => {
  const native = React.createRef<ViewInstance>();
  const mounted = jest.fn(),
    detached = jest.fn();
  function Counter() {
    const [n, set] = useState(0);
    React.useEffect(() => {
      mounted();
      return detached;
    }, []);
    return <Text onPress={() => set(n + 1)}>Count {n}</Text>;
  }
  const field = (color: string, reverse = false) => (
    <Box sx={{ color }}>
      {reverse
        ? [
            <View key="native" ref={native}>
              <Counter />
            </View>,
            'Suffix',
          ]
        : [
            'Prefix',
            <View key="native" ref={native}>
              <Counter />
            </View>,
          ]}
    </Box>
  );
  const { rerender, unmount } = render(field('red'));
  const before = native.current;
  fireEvent.press(screen.getByText('Count 0'));
  rerender(field('blue', true));
  expect(screen.getByText('Count 1')).toBeTruthy();
  expect(mounted).toHaveBeenCalledTimes(1);
  expect(detached).not.toHaveBeenCalled();
  expect(native.current === before).toBe(true);
  unmount();
  expect(native.current).toBeNull();
  expect(detached).toHaveBeenCalledTimes(1);
});
test('native root styles exclude text properties and Paper custom roots retain refs', () => {
  const ref = React.createRef<ViewInstance>();
  const Root = React.forwardRef<ViewInstance, any>(function Root(props, forwarded) {
    return <View {...props} ref={forwarded} testID="root" />;
  });
  render(
    <Paper component={Root} ref={ref} sx={{ fontSize: 22, color: '#123456', p: 2 }}>
      Custom root
    </Paper>,
  );
  const style = StyleSheet.flatten(screen.getByTestId('root').props.style);
  expect(style.color).toBeUndefined();
  expect(style.fontSize).toBeUndefined();
  expect(style.padding).toBe(16);
  expect(ref.current !== null).toBe(true);
  expect(screen.getByText('Custom root')).toHaveStyle({ fontSize: 22, color: '#123456' });
});

test('root relative text metrics use the actual root font rather than body1 variant defaults', () => {
  const theme = createTheme({ typography: { body1: { fontSize: 30 } } });
  render(
    <ThemeProvider theme={theme}>
      <Box sx={{ lineHeight: 1.5, letterSpacing: '0.1em' }}>Root metrics</Box>
    </ThemeProvider>,
  );
  expect(screen.getByText('Root metrics')).toHaveStyle({
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 1.6,
  });
});
test('native text-only styles reach literal hosts while layout fields do not inherit across containers', () => {
  render(
    <Box
      testID="view"
      style={{
        fontVariant: ['tabular-nums'],
        writingDirection: 'rtl',
        textShadowColor: 'red',
        textShadowRadius: 2,
        includeFontPadding: false,
        textAlignVertical: 'center',
      }}
    >
      Direct<Box>Nested text</Box>
    </Box>,
  );
  expect(screen.getByText('Direct')).toHaveStyle({
    fontVariant: ['tabular-nums'],
    writingDirection: 'rtl',
    textShadowColor: 'red',
    textShadowRadius: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  });
  expect(screen.getByText('Nested text')).toHaveStyle({
    fontVariant: ['tabular-nums'],
    writingDirection: 'rtl',
    textShadowColor: 'red',
  });
  expect(
    StyleSheet.flatten(screen.getByText('Nested text').props.style).includeFontPadding,
  ).toBeUndefined();
  const style = StyleSheet.flatten(screen.getByTestId('view').props.style);
  for (const key of [
    'fontVariant',
    'writingDirection',
    'textShadowColor',
    'includeFontPadding',
    'textAlignVertical',
  ])
    expect(style[key]).toBeUndefined();
});
test('native modal windows reset text scope while inline overlays inherit their parent', () => {
  const { rerender } = render(
    <Box sx={{ color: 'red', fontSize: 40 }}>
      <Modal open disableAutoFocus>
        <View>
          <Typography variant="inherit" testID="modal-text">
            Window
          </Typography>
        </View>
      </Modal>
    </Box>,
  );
  expect(screen.getByTestId('modal-text')).toHaveStyle({
    fontSize: 16,
    color: createTheme().palette.text.primary,
  });
  rerender(
    <Box sx={{ color: 'red', fontSize: 40 }}>
      <Modal open disablePortal disableAutoFocus>
        <View>
          <Typography variant="inherit" testID="modal-text">
            Inline
          </Typography>
        </View>
      </Modal>
    </Box>,
  );
  expect(screen.getByTestId('modal-text')).toHaveStyle({ fontSize: 40, color: 'red' });
});

describe('pinned browser-observed MUI text contracts', () => {
  const reference = require('./fixtures/mui-text-containers-9.5.0.json') as {
    cases: Array<any>;
    computed: Array<any>;
  };
  const components: Record<string, React.ElementType> = {
    Box,
    Paper,
    Typography,
    NativeText: Text,
    NativeView: View,
  };
  function build(node: any): React.ReactNode {
    if (typeof node !== 'object' || node === null) return node;
    if (Array.isArray(node))
      return node.map((child, index) => (
        <React.Fragment key={index}>{build(child)}</React.Fragment>
      ));
    return React.createElement(
      components[node.type],
      { ...node.props, sx: node.sx, style: node.nativeStyle ?? node.style },
      build(node.children),
    );
  }
  test.each(
    reference.cases.map((input, index) => ({ ...input, expected: reference.computed[index] })),
  )('$name', (input) => {
    render(
      <ThemeProvider theme={createTheme(input.theme ?? {})}>{build(input.tree)}</ThemeProvider>,
    );
    const chain: Array<any> = [];
    let current = screen.getByText(input.label);
    while (current) {
      if (typeof current.type === 'string' && String(current.type) !== 'Text') break;
      chain.unshift(StyleSheet.flatten(current.props.style));
      current = current.parent!;
    }
    const actual = Object.assign({}, ...chain);
    for (const metric of ['fontSize', 'lineHeight', 'letterSpacing'])
      if (input.expected[metric] !== 'normal')
        expect(actual[metric]).toBeCloseTo(parseFloat(input.expected[metric]), 4);
    expect(processColor(actual.color)).toBe(processColor(input.expected.color));
  });
});

test('custom container roots retain single-child shape and native element type', () => {
  const Root = React.forwardRef<ViewInstance, any>(function Root({ children, ...props }, ref) {
    const only = React.Children.only(children);
    if (!React.isValidElement(only) || only.type !== View)
      throw new Error('Expected the original single View child');
    return (
      <View {...props} ref={ref}>
        {only}
      </View>
    );
  });
  render(
    <Box component={Root}>
      <View>
        <Typography>Single native child</Typography>
      </View>
    </Box>,
  );
  expect(screen.getByText('Single native child')).toBeTruthy();
});
test('a keyed child retains its state when adjacent literal text is inserted', () => {
  function Child() {
    const [n, set] = useState(0);
    return <Text onPress={() => set(n + 1)}>Stable {n}</Text>;
  }
  const field = (extra: boolean) => (
    <Box>{extra ? ['Prefix', <Child key="child" />] : <Child key="child" />}</Box>
  );
  const { rerender } = render(field(false));
  fireEvent.press(screen.getByText('Stable 0'));
  rerender(field(true));
  expect(screen.getByText('Stable 1')).toBeTruthy();
});
