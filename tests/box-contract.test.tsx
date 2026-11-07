// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  createRef,
  forwardRef,
  useState,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { View, Text, StyleSheet, type ViewInstance, type ViewProps } from 'react-native';
import {
  Box,
  boxClasses,
  Paper,
  Typography,
  Stack,
  CardContent,
  ThemeProvider,
  createTheme,
  styled,
  configureDiagnostics,
  useTheme,
  type Theme,
} from '../packages/material/src';
import Canonical, {
  Box as Named,
  boxClasses as DeepClasses,
  type BoxProps,
} from '../packages/material/src/Box/index';
import { unstable_ClassNameGenerator as generator } from '../packages/material/src/className';
import { unstable_ClassNameGenerator as internalGenerator } from '../packages/material/src/classNameGenerator';
import original from './fixtures/mui-box-9.5.0.json';
import { DefaultPropsProvider } from '../packages/system/src';
const flat = (value: unknown) => StyleSheet.flatten(value as any) ?? {};
type RootProps = ViewProps & {
  className?: string;
  p?: number;
  ownerState?: unknown;
  theme?: Theme;
  as?: typeof View | ForwardRefExoticComponent<ViewProps & RefAttributes<ViewInstance>> | 'div';
};
const Root = forwardRef<ViewInstance, RootProps>((props, ref) => <View {...props} ref={ref} />);
afterEach(() => {
  cleanup();
  generator.reset();
});

test('Box diagnostics are development-only and scoped raw-theme adaptation is explicit/once', () => {
  const collected = jest.fn(),
    restore = configureDiagnostics(collected),
    before = process.env.NODE_ENV;
  const theme = createTheme(),
    scene = (
      <ThemeProvider theme={{ $$material: theme }}>
        <Box component={Root} theme={undefined as any} testID="box" />
      </ThemeProvider>
    );
  try {
    process.env.NODE_ENV = 'production';
    const tree = render(scene);
    expect(collected).not.toHaveBeenCalled();
    tree.unmount();
    process.env.NODE_ENV = 'development';
    const next = render(scene);
    next.rerender(scene);
    next.rerender(
      <ThemeProvider theme={{ $$material: theme }}>
        <Box component={Root} theme={null as any} />
      </ThemeProvider>,
    );
    expect(collected.mock.calls.filter(([value]) => value.code === 'box-theme')).toHaveLength(1);
    expect(collected).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'box-theme',
        message: expect.stringContaining('complete native Theme'),
      }),
    );
  } finally {
    process.env.NODE_ENV = before;
    restore();
  }
});
test('root/deep imports and the canonical generator share one implementation', () => {
  expect(Box).toBe(Canonical);
  expect(Box).toBe(Named);
  expect(boxClasses).toBe(DeepClasses);
  expect(generator).toBe(internalGenerator);
  expect(boxClasses).toEqual(original.classes);
  expect(Object.keys(boxClasses)).toEqual(['root']);
  const tree = render(
    <Box component="div" testID="box">
      Literal <Typography>child</Typography>
    </Box>,
  );
  expect(tree.UNSAFE_getAllByType(View).some((node) => node.props.testID === 'box')).toBe(true);
  expect(tree.getByTestId('box').props.className).toBeUndefined();
});
test.each(original.generatorCases)('source class order/configuration $mode', (expected) => {
  if (expected.mode === 'prefix') generator.configure((name) => 'custom-' + name);
  else generator.reset();
  const tree = render(<Box component={Root} className="chosen" testID="box" />);
  expect(tree.UNSAFE_getByType(Root).props.className).toBe(expected.className);
});
test('pre-import utility configuration uses the same canonical facade and root vocabulary', () => {
  jest.isolateModules(() => {
    const cold = require('../packages/material/src/className').unstable_ClassNameGenerator;
    const canonical =
      require('../packages/material/src/classNameGenerator').unstable_ClassNameGenerator;
    expect(cold).toBe(canonical);
    cold.configure((name: string) => `cold-${name}`);
    const classes = require('../packages/material/src/boxClasses').boxClasses;
    expect(classes).toEqual({ root: 'cold-MuiBox-root' });
    cold.reset();
    expect(classes.root).toBe('cold-MuiBox-root');
    expect(cold.generate(classes.root)).toBe('cold-MuiBox-root');
  });
});
test('Box captures default class and generator method once, while configure/reset stays live', () => {
  const root = boxClasses.root,
    generate = generator.generate;
  try {
    boxClasses.root = 'changed-object';
    generator.generate = () => 'changed-method';
    const tree = render(<Box component={Root} testID="box" />);
    expect(tree.UNSAFE_getByType(Root).props.className).toBe(root);
    generator.configure((name) => 'configured-' + name);
    tree.rerender(<Box component={Root} testID="box" />);
    expect(tree.UNSAFE_getByType(Root).props.className).toBe('configured-' + root);
    generator.reset();
    tree.rerender(<Box component={Root} testID="box" />);
    expect(tree.UNSAFE_getByType(Root).props.className).toBe(root);
  } finally {
    boxClasses.root = root;
    generator.generate = generate;
  }
});
test('only component/theme/sx/as are consumed; declared root data and native events are retained', () => {
  const ref = createRef<ViewInstance>(),
    touch = jest.fn(),
    ownerState = { chosen: true },
    theme = createTheme();
  const tree = render(
    <Box
      component={Root}
      testID="box"
      p={7}
      ownerState={ownerState}
      theme={theme}
      ref={ref}
      onTouchEnd={touch}
      sx={{ opacity: 0.6 }}
      style={{ padding: 0 }}
    />,
  );
  const root = tree.UNSAFE_getByType(Root);
  expect(root.props).toMatchObject({ p: 7, ownerState, className: original.forwards[0].className });
  for (const key of ['component', 'theme', 'sx', 'as'])
    expect(Object.hasOwn(root.props, key)).toBe(false);
  expect(flat(root.props.style)).toMatchObject({ opacity: 0.6, padding: 0 });
  expect(ref.current).toBe(
    tree.UNSAFE_getAllByType(View).find((node) => node.props.testID === 'box')!.instance,
  );
  const event = { nativeEvent: { target: 12, pageX: 4, pageY: 5 }, timeStamp: 23 };
  fireEvent(tree.getByTestId('box'), 'touchEnd', event);
  expect(touch).toHaveBeenCalledWith(event);
});
test('declared native as overrides component and explicit undefined chooses the default alias', () => {
  const Alternate = forwardRef<ViewInstance, RootProps>((props, ref) => (
    <View {...props} ref={ref} testID="alternate" />
  ));
  const tree = render(<Box component={Root} as={Alternate} />);
  expect(tree.UNSAFE_getByType(Alternate)).toBeTruthy();
  expect(tree.UNSAFE_queryAllByType(Root)).toHaveLength(0);
  tree.rerender(<Box component={Root} as={undefined} />);
  expect(tree.UNSAFE_queryAllByType(Root)).toHaveLength(0);
  expect(tree.UNSAFE_queryAllByType(Alternate)).toHaveLength(0);
});
test('p/m are forwarded custom data in9.5, not silently converted into system styling', () => {
  const tree = render(<Box component={Root} p={7} testID="box" />);
  expect(tree.UNSAFE_getByType(Root).props.p).toBe(7);
  expect(flat(tree.getByTestId('box').props.style).padding).toBeUndefined();
  tree.rerender(<Box testID="box" sx={{ p: 2, m: 1, color: 'primary.main' }} />);
  expect(tree.getByTestId('box')).toHaveStyle({ padding: 16, margin: 8 });
});
test.each(original.themeCases)('source selected/explicit theme $scoped/$override', (expected) => {
  const theme = createTheme({ boxAccent: 0.3 } as any),
    explicit = createTheme({ boxAccent: 0.7 } as any);
  let seen: unknown;
  const input: Record<string, unknown> = {
    component: Root,
    testID: 'box',
    sx: (value: Theme) => {
      const data = value as Theme & { boxAccent?: number; $$material?: { boxAccent?: number } };
      seen = {
        accent: data.boxAccent ?? null,
        scopedAccent: data.$$material?.boxAccent ?? null,
        isExplicit: value === explicit,
      };
      return { opacity: data.boxAccent ?? 0.1 };
    },
  };
  if (expected.override !== 'absent')
    input.theme =
      expected.override === 'explicit' ? explicit : expected.override === 'null' ? null : undefined;
  const tree = render(
    <ThemeProvider<Theme | { $$material: Theme }>
      theme={expected.scoped ? { $$material: theme } : theme}
    >
      <Box {...(input as BoxProps)} />
    </ThemeProvider>,
  );
  if (expected.scoped && ['null', 'undefined'].includes(expected.override)) {
    // The raw web envelope cannot serve native text/layout internals. This
    // rejected native override retains its selected scope and diagnoses above.
    expect(seen).toEqual({ accent: 0.3, scopedAccent: null, isExplicit: false });
    expect(expected.observed.accent).toBeNull();
  } else expect(seen).toEqual(expected.observed);
  expect(tree.UNSAFE_getByType(Root).props.theme).toBeUndefined();
});
test('anonymous Box never observes components or the invented MuiBox defaults/overrides entry', () => {
  let reads = 0;
  function Armed() {
    const theme = useTheme();
    Object.defineProperty(theme, 'components', {
      configurable: true,
      get() {
        reads++;
        throw Error('unused-components');
      },
    });
    return <Box testID="box" sx={{ opacity: 0.4 }} />;
  }
  const tree = render(
    <ThemeProvider theme={createTheme()}>
      <Armed />
    </ThemeProvider>,
  );
  expect(original.unusedComponents).toMatchObject({ error: null, reads: 0 });
  expect(reads).toBe(0);
  expect(tree.getByTestId('box')).toHaveStyle({ opacity: 0.4 });
  tree.unmount();
  const input = createTheme({
    components: {
      MuiBox: {
        defaultProps: { testID: 'invented', className: 'invented' },
        styleOverrides: { root: { opacity: 0.9 } },
        variants: [{ props: {}, style: { padding: 20 } }],
      },
    },
  } as any);
  const next = render(
    <ThemeProvider theme={input}>
      <Box testID="box" />
    </ThemeProvider>,
  );
  expect(next.queryByTestId('invented')).toBeNull();
  expect(flat(next.getByTestId('box').props.style)).not.toMatchObject({ opacity: 0.9 });
  expect(flat(next.getByTestId('box').props.style).padding).toBeUndefined();
});
test('styled class specificity/descendant scopes and native shorthand resets share the final root', () => {
  const Styled = styled(Box)({
    opacity: 0.2,
    '&.MuiBox-root': { opacity: 0.7 },
    '& .MuiBox-root': { letterSpacing: 2 },
  });
  const tree = render(
    <Styled
      testID="box"
      sx={{ opacity: 0.8, paddingLeft: 20 }}
      style={{ opacity: 0.9, padding: 0 }}
    >
      <Box>Nested</Box>
    </Styled>,
  );
  expect(tree.getByTestId('box')).toHaveStyle({ opacity: 0.9, padding: 0 });
  expect(flat(tree.getByTestId('box').props.style).paddingLeft).toBeUndefined();
  expect(tree.getByText('Nested')).toHaveStyle({ letterSpacing: 2 });
  tree.rerender(
    <Styled testID="box" sx={{ opacity: 0.8 }}>
      Self
    </Styled>,
  );
  expect(tree.getByTestId('box')).toHaveStyle({ opacity: 0.7 });
});
test('ancestor component sheets target actual Box roots without adding hosts or clearing native overrides', () => {
  const Parent = styled(Paper)({ '& .MuiBox-root': { paddingLeft: 20, color: '#123456' } });
  const tree = render(
    <Parent>
      <Box testID="box" sx={{ paddingLeft: 4 }}>
        Inherited
      </Box>
    </Parent>,
  );
  expect(tree.getByTestId('box')).toHaveStyle({ paddingLeft: 20 });
  expect(tree.getByText('Inherited')).toHaveStyle({ color: '#123456' });
  tree.rerender(
    <Parent>
      <Box testID="box" style={{ padding: 0, color: '#abcdef' }}>
        Inherited
      </Box>
    </Parent>,
  );
  expect(flat(tree.getByTestId('box').props.style).paddingLeft).toBeUndefined();
  expect(tree.getByText('Inherited')).toHaveStyle({ color: '#abcdef' });
});
test('actual host refs/cleanup and child state survive style/theme/class updates', () => {
  let attached: ViewInstance | null = null;
  const cleanupRef = jest.fn(),
    ref = jest.fn((value: ViewInstance | null) => {
      attached = value;
      return () => {
        attached = null;
        cleanupRef();
      };
    });
  function Child() {
    const [count, set] = useState(0);
    return (
      <Text testID="count" onPress={() => set((n) => n + 1)}>
        {count}
      </Text>
    );
  }
  const scene = (value: number) => (
    <ThemeProvider theme={createTheme({ palette: { mode: value ? 'dark' : 'light' } })}>
      <Box
        component={Root}
        testID="box"
        ref={ref}
        className={value ? 'changed' : undefined}
        sx={{ fontSize: value ? 20 : 16 }}
      >
        <Child />
      </Box>
    </ThemeProvider>
  );
  const tree = render(scene(0)),
    first = attached;
  fireEvent.press(tree.getByTestId('count'));
  tree.rerender(scene(1));
  expect(attached).toBe(first);
  expect(ref).toHaveBeenCalledTimes(1);
  expect(cleanupRef).not.toHaveBeenCalled();
  expect(tree.getByTestId('count').props.children).toBe(1);
  tree.unmount();
  expect(cleanupRef).toHaveBeenCalledTimes(1);
  expect(attached).toBeNull();
});
test('legacy layout wrappers retain their existing native geometry and public Box import', () => {
  const tree = render(
    <Stack testID="stack" direction="row" spacing={2}>
      <CardContent testID="content">Text</CardContent>
    </Stack>,
  );
  expect(tree.getByTestId('stack')).toHaveStyle({ flexDirection: 'row', gap: 16 });
  expect(tree.getByTestId('content')).toHaveStyle({ padding: 16, paddingBottom: 24 });
});

test('Box ignores invented DefaultPropsProvider entries while responsive sx stays active', () => {
  const onLayout = jest.fn();
  const tree = render(
    <DefaultPropsProvider
      value={{ MuiBox: { testID: 'invented', className: 'invented', sx: { opacity: 0 } } }}
    >
      <Box
        component={Root}
        testID="box"
        onLayout={onLayout}
        sx={[
          false,
          null,
          (theme) => ({ p: { xs: 1, sm: 2 }, color: theme.palette.primary.main }),
          { opacity: 0.4 },
        ]}
      />
    </DefaultPropsProvider>,
  );
  expect(tree.queryByTestId('invented')).toBeNull();
  expect(tree.UNSAFE_getByType(Root).props.className).toBe(original.classes.root);
  expect(tree.getByTestId('box')).toHaveStyle({ opacity: 0.4 });
  const event = { nativeEvent: { layout: { x: 0, y: 0, width: 42, height: 24 } } };
  fireEvent(tree.getByTestId('box'), 'layout', event);
  expect(onLayout).toHaveBeenCalledWith(event);
});
