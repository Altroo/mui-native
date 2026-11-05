import { createRef, useEffect } from 'react';
import { Text, View, Dimensions, StyleSheet, type TextInstance } from 'react-native';
import { cleanup, render, act } from '@testing-library/react-native';
import {
  Button,
  IconButton,
  Typography,
  ThemeProvider,
  createTheme,
} from '../packages/material/src';

afterEach(cleanup);

test.each(['Typography', 'Text'] as const)(
  'Button preserves the authored %s root font-scaling policy',
  (kind) => {
    const label =
      kind === 'Typography' ? (
        <Typography
          testID="authored"
          variant="inherit"
          allowFontScaling={false}
          maxFontSizeMultiplier={1.25}
        >
          Label
        </Typography>
      ) : (
        <Text testID="authored" allowFontScaling={false} maxFontSizeMultiplier={1.25}>
          Label
        </Text>
      );
    const tree = render(<Button sx={{ fontSize: 24 }}>{label}</Button>);
    const authored = tree
      .UNSAFE_getAllByType(Text)
      .find((node) => node.props.testID === 'authored')!;
    expect(authored).toBeDefined();
    // RN 0.88 Text.js applies allowFontScaling only at a root Text. An added
    // ancestor would turn this node into VirtualText and ignore its public false.
    for (let parent = authored.parent; parent; parent = parent.parent)
      expect(parent.type).not.toBe(Text);
    expect(authored.props.allowFontScaling).toBe(false);
    expect(authored.props.maxFontSizeMultiplier).toBe(1.25);
  },
);

test('authored font and line-height units remain unscaled when native fontScale changes', () => {
  const window = Dimensions.get('window'),
    screen = Dimensions.get('screen');
  const tree = render(
    <Typography
      testID="scaled"
      allowFontScaling
      maxFontSizeMultiplier={1.5}
      sx={{ fontSize: 24, lineHeight: 1.5 }}
    >
      Scale
    </Typography>,
  );
  try {
    act(() =>
      Dimensions.set({
        window: { ...window, fontScale: 2.5 },
        screen: { ...screen, fontScale: 2.5 },
      }),
    );
    expect(tree.getByTestId('scaled')).toHaveStyle({ fontSize: 24, lineHeight: 36 });
    expect(tree.getByTestId('scaled').props).toMatchObject({
      allowFontScaling: true,
      maxFontSizeMultiplier: 1.5,
    });
  } finally {
    act(() => Dimensions.set({ window, screen }));
  }
});

test.each(['Button', 'IconButton'] as const)(
  'Typography theme scaling defaults retain a native text root inside %s',
  (kind) => {
    const theme = createTheme({
      components: {
        MuiTypography: { defaultProps: { allowFontScaling: false, maxFontSizeMultiplier: 1.25 } },
      },
    });
    const label = <Typography testID="authored">Theme label</Typography>;
    const tree = render(
      <ThemeProvider theme={theme}>
        {kind === 'Button' ? <Button>{label}</Button> : <IconButton>{label}</IconButton>}
      </ThemeProvider>,
    );
    const authored = tree
      .UNSAFE_getAllByType(Text)
      .find((node) => node.props.testID === 'authored')!;
    for (let parent = authored.parent; parent; parent = parent.parent)
      expect(parent.type).not.toBe(Text);
    expect(authored.props).toMatchObject({ allowFontScaling: false, maxFontSizeMultiplier: 1.25 });
  },
);

test('mixed authored policies keep separate native text roots and explicit zero remains uncapped', () => {
  const tree = render(
    <Button>
      <Text testID="fixed" allowFontScaling={false}>
        Fixed
      </Text>
      <Typography testID="fluid" allowFontScaling maxFontSizeMultiplier={0}>
        Fluid
      </Typography>
    </Button>,
  );
  for (const testID of ['fixed', 'fluid']) {
    const authored = tree.UNSAFE_getAllByType(Text).find((node) => node.props.testID === testID)!;
    for (let parent = authored.parent; parent; parent = parent.parent)
      expect(parent.type).not.toBe(Text);
  }
  expect(tree.getByTestId('fixed').props.allowFontScaling).toBe(false);
  expect(tree.getByTestId('fluid').props).toMatchObject({
    allowFontScaling: true,
    maxFontSizeMultiplier: 0,
  });
});

test('live scaling policy changes and clearing preserve authored label state', () => {
  const mounted = jest.fn(),
    unmounted = jest.fn();
  function Stateful() {
    useEffect(() => {
      mounted();
      return unmounted;
    }, []);
    return <Text>Stateful</Text>;
  }
  const child = <Stateful />;
  const field = (allowFontScaling: boolean | undefined, maxFontSizeMultiplier?: number) => (
    <Button>
      <Typography
        testID="authored"
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      >
        {child}
      </Typography>
    </Button>
  );
  const tree = render(field(false, 1.25));
  tree.rerender(field(true, 0));
  tree.rerender(field(undefined));
  tree.rerender(field(false, 1.5));
  expect(mounted).toHaveBeenCalledTimes(1);
  expect(unmounted).not.toHaveBeenCalled();
});

test('relative Button label metrics resolve once and unitless line height follows the authored root', () => {
  const tree = render(
    <Button sx={{ fontSize: 20, lineHeight: 1.5 }}>
      <Typography
        testID="relative"
        variant="inherit"
        allowFontScaling
        maxFontSizeMultiplier={1.2}
        sx={{ fontSize: '1.5em' }}
      >
        Relative
      </Typography>
    </Button>,
  );
  expect(tree.getByTestId('relative')).toHaveStyle({ fontSize: 30, lineHeight: 45 });
});

test('long mixed literal and fragment labels preserve roots, refs and separate caps', () => {
  const fixed = createRef<TextInstance>(),
    capped = createRef<TextInstance>();
  const mounted = jest.fn(),
    unmounted = jest.fn();
  function Stateful() {
    useEffect(() => {
      mounted();
      return unmounted;
    }, []);
    return <>persistent detail</>;
  }
  const child = <Stateful />;
  const field = (allowFontScaling: boolean | undefined, maxFontSizeMultiplier?: number) => (
    <Button>
      <>
        Prefix{' '}
        <Text ref={fixed} testID="fixed" allowFontScaling={false}>
          A long fixed-size authored label with several words
        </Text>
        <Typography
          ref={capped}
          testID="capped"
          variant="inherit"
          allowFontScaling={allowFontScaling}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          A long independently capped authored label {child}
        </Typography>{' '}
        suffix
      </>
    </Button>
  );
  const tree = render(field(true, 1.2));
  const beforeFixed = fixed.current,
    beforeCapped = capped.current;
  expect(beforeFixed).not.toBeNull();
  expect(beforeCapped).not.toBeNull();
  expect(tree.getByTestId('fixed').props.allowFontScaling).toBe(false);
  expect(tree.getByTestId('capped').props).toMatchObject({
    allowFontScaling: true,
    maxFontSizeMultiplier: 1.2,
  });
  for (const testID of ['fixed', 'capped']) {
    const authored = tree.UNSAFE_getAllByType(Text).find((node) => node.props.testID === testID)!;
    for (let parent = authored.parent; parent; parent = parent.parent)
      expect(parent.type).not.toBe(Text);
  }
  expect(
    tree.UNSAFE_getAllByType(View).some((node) => {
      const style = StyleSheet.flatten(node.props.style);
      return (
        style?.flexDirection === 'row' &&
        style?.flexWrap === 'wrap' &&
        style?.alignItems === 'baseline'
      );
    }),
  ).toBe(true);
  expect(tree.getByText('Prefix ')).toHaveStyle({ fontSize: 14 });
  tree.rerender(field(undefined));
  tree.rerender(field(false, 1.5));
  expect(fixed.current).toBe(beforeFixed);
  expect(capped.current).toBe(beforeCapped);
  expect(mounted).toHaveBeenCalledTimes(1);
  expect(unmounted).not.toHaveBeenCalled();
  tree.unmount();
  expect(fixed.current).toBeNull();
  expect(capped.current).toBeNull();
  expect(unmounted).toHaveBeenCalledTimes(1);
});
