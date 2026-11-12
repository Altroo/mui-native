// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import { createRef, forwardRef, useState } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import {
  I18nManager,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
  type ViewInstance,
  type ViewProps,
} from 'react-native';
import {
  Divider,
  ThemeProvider,
  createTheme,
  styled,
  Box,
  Typography,
  Stack,
  dividerClasses,
  getDividerUtilityClass,
  configureDiagnostics,
  type ComponentStyleArgs,
} from '../packages/material/src';
import Canonical, {
  Box as CanonicalBox,
  Typography as CanonicalTypography,
  Stack as CanonicalStack,
  dividerClasses as CanonicalClasses,
  getDividerUtilityClass as canonicalUtility,
} from '../packages/material/src/Divider/index';
import original from './fixtures/mui-divider-9.5.0.json';
import {
  createTheme as systemCreateTheme,
  nativeStyleBorderDeclarations,
  nativeStyleBorderStyle,
  type NativeStyle,
} from '../packages/system/src';
import { createTheme as styleCreateTheme } from '../packages/material/src/styles';
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
const flat = (style: unknown) => StyleSheet.flatten(style as any) ?? {};
const decoration = (tree: ReturnType<typeof render>) =>
  tree
    .UNSAFE_getAllByType(View)
    .filter((node) => node.props.importantForAccessibility === 'no-hide-descendants');
const label = (tree: ReturnType<typeof render>) =>
  tree
    .UNSAFE_getAllByType(View)
    .find(
      (node) =>
        flat(node.props.style).paddingLeft != null &&
        node.props.importantForAccessibility !== 'no-hide-descendants',
    )!;
const Root = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  (props, ref) => <View {...props} ref={ref} />,
);

test('root/canonical identity and all source class utilities, including inherited global keys', () => {
  expect(createTheme).toBe(systemCreateTheme);
  expect(styleCreateTheme).toBe(systemCreateTheme);
  expect(Canonical).toBe(Divider);
  expect(CanonicalBox).toBe(Box);
  expect(CanonicalTypography).toBe(Typography);
  expect(CanonicalStack).toBe(Stack);
  expect(CanonicalClasses).toBe(dividerClasses);
  expect(canonicalUtility).toBe(getDividerUtilityClass);
  expect(dividerClasses).toEqual(original.classes);
  for (const [slot, value] of Object.entries(original.utilities))
    expect(getDividerUtilityClass(slot)).toBe(value);
});
test.each([undefined, Root])(
  'authored native accessibility roles keep native precedence for %p',
  (component) => {
    const tree = render(
      <Divider component={component} testID="role-root" accessibilityRole="none" />,
    );
    expect(tree.getByTestId('role-root').props.role).toBeUndefined();
    expect(tree.getByTestId('role-root').props.accessibilityRole).toBe('none');
    tree.rerender(
      <Divider
        component={component}
        testID="role-root"
        role="presentation"
        accessibilityRole="none"
      />,
    );
    expect(tree.getByTestId('role-root').props.role).toBe('presentation');
    expect(tree.getByTestId('role-root').props.accessibilityRole).toBe('none');
    tree.rerender(<Divider component={component} testID="role-root" />);
    expect(tree.getByTestId('role-root').props.role).toBe('separator');
  },
);
test.each([false, true])(
  'explicit undefined theme components render default Divider after late clear=%s',
  (late) => {
    const theme = late
      ? createTheme(
          {
            components: {
              MuiDivider: {
                defaultProps: { variant: 'inset' },
                styleOverrides: { root: { opacity: 0.4 } },
              },
            },
          },
          { components: undefined },
        )
      : createTheme({ components: undefined });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Divider component={Root} testID="undefined-components" />
      </ThemeProvider>,
    );
    expect(tree.UNSAFE_getByType(Root).props.className).toBe(
      original.fixtures.find((entry) => entry.name === 'default')!.className,
    );
    expect(tree.getByTestId('undefined-components')).toHaveStyle({
      margin: 0,
      borderBottomWidth: 1,
    });
    expect(flat(tree.getByTestId('undefined-components').props.style).opacity).toBeUndefined();
  },
);
test('default border semantics and sx stay below genuine final native styles', () => {
  const tree = render(<Divider testID="root" />);
  expect(tree.getByTestId('root')).toHaveStyle({
    borderBottomWidth: 1,
    borderWidth: 0,
    margin: 0,
    flexShrink: 0,
  });
  expect(tree.getByTestId('root').props.role).toBe('separator');
  expect(flat(tree.getByTestId('root').props.style).backgroundColor).toBeUndefined();
  tree.rerender(
    <Divider
      testID="root"
      sx={{ height: 7, bgcolor: 'red', borderBottomWidth: 5 }}
      style={[{ height: 9 }, { height: 8, borderWidth: 2 }]}
    />,
  );
  expect(tree.getByTestId('root')).toHaveStyle({
    height: 8,
    backgroundColor: 'red',
    borderWidth: 2,
  });
  expect(flat(tree.getByTestId('root').props.style).borderBottomWidth).toBeUndefined();
});
test.each(original.fixtures)(
  'source public classes and truthy child structure: $name',
  ({ input, className, wrapperClass, renderedZero }) => {
    const tree = render(<Divider {...(input as any)} component={Root} testID="root" />);
    expect(tree.UNSAFE_getByType(Root).props.className).toBe(className);
    expect(decoration(tree)).toHaveLength(wrapperClass ? 2 : 0);
    if (renderedZero) expect(tree.getByText('0')).toBeTruthy();
    else if (input.children === 0) expect(tree.queryByText('0')).toBeNull();
  },
);
test('absolute/inset/middle/orientation/flexItem styles use source values and live theme spacing', () => {
  const tree = render(
    <ThemeProvider theme={createTheme()}>
      <Divider testID="root" absolute variant="inset" />
    </ThemeProvider>,
  );
  expect(tree.getByTestId('root')).toHaveStyle({
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    marginLeft: 72,
  });
  tree.rerender(
    <ThemeProvider theme={createTheme({ spacing: 10 })}>
      <Divider testID="root" variant="middle" orientation="vertical" flexItem />
    </ThemeProvider>,
  );
  expect(tree.getByTestId('root')).toHaveStyle({
    height: 'auto',
    alignSelf: 'stretch',
    borderRightWidth: 1,
    borderBottomWidth: 0,
    marginTop: 10,
    marginBottom: 10,
  });
});
test('text dividers reset root borders and own two decorative lines, with source ratios and wrapper padding', () => {
  const tree = render(
    <ThemeProvider theme={createTheme()}>
      <Divider testID="root" textAlign="left">
        Notes
      </Divider>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('root')).toHaveStyle({ borderWidth: 0, flexDirection: 'row' });
  expect(flat(tree.getByTestId('root').props.style).borderBottomWidth).toBeUndefined();
  expect(decoration(tree).map((node) => flat(node.props.style).flexGrow)).toEqual([1, 9]);
  expect(flat(label(tree).props.style)).toMatchObject({
    paddingLeft: 9.6,
    paddingRight: 9.6,
    flexShrink: 0,
  });
  expect(tree.getByText('Notes').props.numberOfLines).toBe(1);
  tree.rerender(
    <ThemeProvider theme={createTheme({ spacing: 10 })}>
      <Divider orientation="vertical" textAlign="right">
        Notes
      </Divider>
    </ThemeProvider>,
  );
  expect(decoration(tree).map((node) => flat(node.props.style).flexGrow)).toEqual([1, 1]);
  expect(decoration(tree).every((node) => flat(node.props.style).borderLeftWidth === 1)).toBe(true);
  expect(flat(label(tree).props.style)).toMatchObject({
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
  });
});
test.each(['text', 'vertical-text'])(
  'default child-wrapper alignment keeps the source flex stretch policy: %s',
  (name) => {
    const fixture = original.fixtures.find((entry) => entry.name === name)!;
    // The original flex root leaves cross-axis alignment to the default stretch
    // policy. Only the two decorative lines explicitly center themselves.
    expect(fixture.rootCss).toContain('display:flex');
    expect(fixture.rootCss).not.toContain('align-items:');
    const tree = render(<Divider {...(fixture.input as any)} testID="root" />);
    expect(flat(tree.getByTestId('root').props.style).alignItems).toBeUndefined();
    for (const line of decoration(tree)) expect(flat(line.props.style).alignSelf).toBe('center');
  },
);
test.each(original.fixtures.filter((fixture) => fixture.name.startsWith('centered-')))(
  'source decorative lines center independently of root alignment: $name',
  ({ input, decorationCss }) => {
    expect(decorationCss).toContain('align-self:center');
    const tree = render(<Divider {...(input as any)} testID="root" />);
    expect(tree.getByTestId('root')).toHaveStyle({ height: 40 });
    expect(flat(tree.getByTestId('root').props.style).alignItems).toBe(input.sx?.alignItems);
    expect(decoration(tree)).toHaveLength(2);
    for (const line of decoration(tree)) expect(flat(line.props.style).alignSelf).toBe('center');
  },
);
test('root and wrapper theme callbacks receive source owner/root args and scoped class overrides', () => {
  const calls: { slot: string; args: ComponentStyleArgs }[] = [];
  const theme = createTheme({
    spacing: 10,
    components: {
      MuiDivider: {
        defaultProps: { className: 'default-root' },
        styleOverrides: {
          root: nativeStyleCallback((args) => {
            calls.push({ slot: 'root', args });
            return { opacity: 0.7, '& .MuiDivider-wrapper': { paddingLeft: '19px' } };
          }),
          wrapper: nativeStyleCallback((args) => {
            calls.push({ slot: 'wrapper', args });
            return { paddingLeft: 13 };
          }),
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Divider testID="root" orientation="vertical" flexItem textAlign="left">
        Notes
      </Divider>
    </ThemeProvider>,
  );
  const sample = original.themed[1].calls;
  expect(calls.map((call) => call.slot)).toEqual(sample.map((call) => call.slot));
  for (const [index, { args }] of calls.entries()) {
    const expected = sample[index];
    expect(args.className).toBe(expected.className);
    for (const key of [
      'absolute',
      'component',
      'orientation',
      'flexItem',
      'textAlign',
      'variant',
      'role',
    ])
      expect(args.ownerState[key] ?? null).toEqual(expected[key as keyof typeof expected] ?? null);
  }
  expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.7 });
  expect(flat(label(tree).props.style).paddingLeft).toBe(19);
});
test('external styled CSS, classes, themed variants and genuine inline declarations keep their priority', () => {
  const Wrapped = styled(Divider)({ height: 11, '&.MuiDivider-inset': { opacity: 0.3 } });
  const theme = createTheme({
    components: {
      MuiDivider: {
        styleOverrides: { root: { height: 4 }, inset: { height: 5 } },
        variants: [{ props: { variant: 'inset' }, style: { height: 6 } }],
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Wrapped testID="root" variant="inset" sx={{ height: 9 }} style={{ height: 8 }} />
    </ThemeProvider>,
  );
  expect(tree.getByTestId('root')).toHaveStyle({ height: 8, opacity: 0.3 });
  tree.rerender(
    <ThemeProvider theme={theme}>
      <Wrapped testID="root" variant="inset" sx={{ height: 9 }} />
    </ThemeProvider>,
  );
  expect(original.styledFixture.rootCss).toContain('height:11px;height:9px;');
  expect(tree.getByTestId('root')).toHaveStyle({ height: 9, opacity: 0.3 });
});
test('native custom root filters private props and preserves attributes/events/ref cleanup and raw style identity in callbacks', () => {
  let raw: unknown, owner: unknown;
  const ref = createRef<ViewInstance>(),
    onTouchEnd = jest.fn(),
    onLayout = jest.fn(),
    originalStyle = { padding: 0 };
  const theme = createTheme({
    components: {
      MuiDivider: {
        styleOverrides: {
          root: nativeStyleCallback((args) => {
            raw = args.style;
            owner = args.ownerState.style;
            return { paddingLeft: 15 };
          }),
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Divider
        component={Root}
        ref={ref}
        testID="root"
        nativeID="line"
        accessibilityLabel="Section"
        onTouchEnd={onTouchEnd}
        onLayout={onLayout}
        style={originalStyle}
        classes={{ root: 'chosen' }}
      />
    </ThemeProvider>,
  );
  const props = tree.UNSAFE_getByType(Root).props;
  expect(props.className).toBe('MuiDivider-root chosen MuiDivider-fullWidth');
  for (const key of [
    'ownerState',
    'classes',
    'sx',
    'component',
    'absolute',
    'orientation',
    'variant',
    'textAlign',
    'flexItem',
  ])
    expect(props).not.toHaveProperty(key);
  expect(props.nativeID).toBe('line');
  expect(props.accessibilityLabel).toBe('Section');
  expect(raw).toBe(originalStyle);
  expect(owner).toBe(originalStyle);
  expect(ref.current).not.toBeNull();
  const first = ref.current;
  fireEvent(tree.getByTestId('root'), 'touchEnd', { nativeEvent: { pageX: 10 } });
  fireEvent(tree.getByTestId('root'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 50, height: 1 } },
  });
  expect(onTouchEnd).toHaveBeenCalledTimes(1);
  expect(onLayout).toHaveBeenCalledTimes(1);
  tree.rerender(
    <ThemeProvider theme={theme}>
      <Divider component={Root} ref={ref} testID="root" orientation="vertical" />
    </ThemeProvider>,
  );
  expect(ref.current).toBe(first);
  tree.unmount();
  expect(ref.current).toBeNull();
});
test('keyed native child state/type and text metrics survive orientation/class/theme updates', () => {
  function Child() {
    const [count, setCount] = useState(0);
    return (
      <Text testID="child" onPress={() => setCount((value) => value + 1)}>
        {count}
      </Text>
    );
  }
  const scene = (vertical: boolean) => (
    <Box sx={{ fontSize: 20, lineHeight: 1.5 }}>
      <Divider orientation={vertical ? 'vertical' : 'horizontal'}>
        <Child key="state" />
        <Typography variant="inherit" testID="small" sx={{ fontSize: '.5em' }}>
          Small
        </Typography>
      </Divider>
    </Box>
  );
  const tree = render(scene(false));
  fireEvent.press(tree.getByTestId('child'));
  tree.rerender(scene(true));
  expect(tree.getByTestId('child')).toHaveTextContent('1');
  expect(tree.UNSAFE_getByType(Child)).toBeTruthy();
  expect(tree.getByTestId('small')).toHaveStyle({ fontSize: 10, lineHeight: 15 });
});
test.each([false, true])(
  'native direction and authored inline fields are retained with global RTL=%s',
  (globalRTL) => {
    jest.replaceProperty(I18nManager, 'isRTL', globalRTL);
    jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', true);
    jest.replaceProperty(Platform, 'OS', 'android');
    const tree = render(
      <Box sx={{ direction: 'rtl' }}>
        <Divider testID="root" variant="inset" orientation="vertical" style={{ marginLeft: 3 }} />
      </Box>,
    );
    const native = flat(tree.getByTestId('root').props.style);
    expect(native.direction).toBe('rtl');
    expect(native.marginLeft).toBe(3);
    expect(I18nManager.isRTL).toBe(globalRTL);
  },
);
test('arbitrary pseudo-element and adjacent-sibling authored rules remain explicit diagnosed software exits', () => {
  const messages: { code: string; message: string }[] = [];
  const restore = configureDiagnostics((message) => messages.push(message));
  try {
    const tree = render(
      <Divider
        sx={{ '&::before': { borderTopWidth: 7 }, '& + .MuiDivider-root': { marginTop: 9 } }}
      >
        Notes
      </Divider>,
    );
    expect(messages.filter((message) => message.code === 'selector')).toHaveLength(2);
    expect(decoration(tree).every((node) => flat(node.props.style).borderTopWidth === 1)).toBe(
      true,
    );
  } finally {
    restore();
  }
});

test('explicit undefined selects configured defaults and responsive sx updates with the real Dimensions event', () => {
  const window = Dimensions.get('window');
  const screen = Dimensions.get('screen');
  const theme = createTheme({
    components: {
      MuiDivider: {
        defaultProps: {
          variant: 'middle',
          absolute: true,
          orientation: 'vertical',
          flexItem: true,
          textAlign: 'left',
        },
      },
    },
  });
  try {
    act(() => Dimensions.set({ window: { ...window, width: 360 }, screen }));
    const tree = render(
      <ThemeProvider theme={theme}>
        <Divider
          testID="root"
          variant={undefined}
          absolute={undefined}
          orientation={undefined}
          flexItem={undefined}
          textAlign={undefined}
          sx={{ width: { xs: 50, sm: 90 } }}
        />
      </ThemeProvider>,
    );
    expect(tree.getByTestId('root')).toHaveStyle({
      position: 'absolute',
      height: 'auto',
      borderRightWidth: 1,
      width: 50,
      marginTop: 8,
      marginBottom: 8,
    });
    act(() => Dimensions.set({ window: { ...window, width: 900 }, screen }));
    expect(tree.getByTestId('root')).toHaveStyle({ width: 90 });
  } finally {
    act(() => Dimensions.set({ window, screen }));
  }
});
test('callback ref cleanups are retained without a native host replacement on supported updates', () => {
  const released = jest.fn(),
    attach = jest.fn((node: ViewInstance | null) => (node ? released : undefined));
  const tree = render(
    <Divider component={Root} ref={attach}>
      Notes
    </Divider>,
  );
  expect(attach).toHaveBeenCalledTimes(1);
  tree.rerender(
    <Divider component={Root} ref={attach} variant="middle" orientation="vertical">
      Notes
    </Divider>,
  );
  expect(attach).toHaveBeenCalledTimes(1);
  expect(released).not.toHaveBeenCalled();
  tree.unmount();
  expect(released).toHaveBeenCalledTimes(1);
});
test.each(original.unrelatedSlotErrors)(
  'unused $configuredSlot callback throws while rendering $renderedSlot like the source',
  ({ configuredSlot, error }) => {
    const unused = jest.fn(
      nativeStyleCallback((args: ComponentStyleArgs) => {
        if (configuredSlot === 'wrapper' || String(args.className).startsWith('MuiDivider-wrapper'))
          throw new Error(error);
        return {};
      }),
    );
    expect(() =>
      render(
        <ThemeProvider
          theme={createTheme({
            components: {
              MuiDivider: {
                styleOverrides: { [configuredSlot]: unused },
              },
            },
          })}
        >
          <Divider>{configuredSlot === 'root' ? 'Notes' : undefined}</Divider>
        </ThemeProvider>,
      ),
    ).toThrow(error);
    expect(unused).toHaveBeenCalled();
  },
);

const borderOrientations = ['horizontal', 'vertical'] as const;
function expectDecorativePaint(
  tree: ReturnType<typeof render>,
  orientation: 'horizontal' | 'vertical',
  suppressed: boolean,
  borderStyle: 'solid' | 'dotted' | 'dashed' = 'solid',
) {
  const lines = decoration(tree);
  expect(lines).toHaveLength(2);
  for (const line of lines) {
    const native = flat(line.props.style);
    // CSS none is represented by valid native solid/zero paint. The semantic
    // declaration must survive the style array used by the owned decoration.
    expect(native.borderStyle).toBe(suppressed ? 'solid' : borderStyle);
    expect(native[orientation === 'vertical' ? 'borderLeftWidth' : 'borderTopWidth']).toBe(
      suppressed ? 0 : 1,
    );
    expect(nativeStyleBorderStyle(nativeStyleBorderDeclarations(line.props.style))).toBe(
      suppressed ? 'none' : borderStyle,
    );
  }
}

test.each(
  borderOrientations.flatMap((orientation) =>
    (['sx', 'theme', 'styled'] as const).map((source) => ({ orientation, source })),
  ),
)(
  'owned lines inherit root CSS none from $source in $orientation orientation',
  ({ orientation, source }) => {
    const theme = createTheme({
      components:
        source === 'theme'
          ? { MuiDivider: { styleOverrides: { root: { borderStyle: 'none' } } } }
          : {},
    });
    const None = styled(Divider)({ borderStyle: 'none' });
    const tree = render(
      <ThemeProvider theme={theme}>
        {source === 'styled' ? (
          <None orientation={orientation}>Notes</None>
        ) : (
          <Divider
            orientation={orientation}
            sx={source === 'sx' ? { borderStyle: 'none' } : undefined}
          >
            Notes
          </Divider>
        )}
      </ThemeProvider>,
    );
    expectDecorativePaint(tree, orientation, true);
  },
);

test.each(borderOrientations)(
  'native width-only layers retain CSS none for %s decorative lines',
  (orientation) => {
    const authored = Object.freeze({ borderWidth: 9 });
    const tree = render(
      <Divider orientation={orientation} sx={{ borderStyle: 'none' }} style={authored}>
        Notes
      </Divider>,
    );
    expectDecorativePaint(tree, orientation, true);
    expect(authored).toEqual({ borderWidth: 9 });
  },
);

test.each(
  borderOrientations.flatMap((orientation) =>
    ([undefined, null, 'solid', 'dashed'] as const).map((borderStyle) => ({
      orientation,
      borderStyle,
    })),
  ),
)(
  'a final native borderStyle=$borderStyle resets inherited none for $orientation lines',
  ({ orientation, borderStyle }) => {
    const registered = StyleSheet.create({ dotted: { borderStyle: 'dotted' } });
    // Runtime RN callers can clear a native property with null. Keep that case
    // explicit without widening the component's native style declaration type.
    const reset = Object.freeze({ borderStyle }) as unknown as NativeStyle;
    const tree = render(
      <Divider
        orientation={orientation}
        sx={{ borderStyle: 'none' }}
        style={[registered.dotted, { borderWidth: 9 }, reset]}
      >
        Notes
      </Divider>,
    );
    expectDecorativePaint(tree, orientation, false, borderStyle ?? 'solid');
    expect(Object.hasOwn(reset, 'borderStyle')).toBe(true);
    expect(reset.borderStyle).toBe(borderStyle);
  },
);

test.each(borderOrientations)(
  'later CSS solid restores the default owned line paint for %s',
  (orientation) => {
    const None = styled(Divider)({ borderStyle: 'none' });
    const tree = render(
      <None orientation={orientation} sx={{ borderStyle: 'solid' }}>
        Notes
      </None>,
    );
    expectDecorativePaint(tree, orientation, false);
  },
);
