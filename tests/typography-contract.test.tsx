// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import {
  forwardRef,
  useEffect,
  useState,
  type ComponentProps,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Text, StyleSheet, I18nManager, type TextInstance, type TextProps } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { nativeStyleTree } from '../packages/material/src/nativeStyleAncestry';
import {
  Typography,
  ThemeProvider,
  createTheme,
  styled,
  Box,
  MenuItem,
  MenuList,
  configureDiagnostics,
  typographyClasses,
  getTypographyUtilityClass,
  type ComponentStyleArgs,
} from '../packages/material/src';
import Canonical, {
  typographyClasses as canonicalClasses,
} from '../packages/material/src/Typography/index';
import reference from './fixtures/mui-typography-contract-9.5.0.json';
afterEach(cleanup);
const publicClass = (value: unknown) =>
  value == null
    ? null
    : String(value)
        .split(/\s+/)
        .filter((token) => token && !token.startsWith('css-'))
        .join(' ') || null;
const observe = nativeStyleCallback((args: ComponentStyleArgs) => ({
  ownerClass: publicClass(args.ownerState.className),
  rootClass: publicClass(args.className),
  ownerStyle: args.ownerState.style ?? null,
  hasOwnerStyle: Object.hasOwn(args.ownerState, 'style'),
  ownerSx: args.ownerState.sx ?? null,
  hasOwnerSx: Object.hasOwn(args.ownerState, 'sx'),
  align: args.ownerState.align,
  color: args.ownerState.color ?? null,
  gutterBottom: args.ownerState.gutterBottom,
  noWrap: args.ownerState.noWrap,
  variant: args.ownerState.variant,
  variantMapping: args.ownerState.variantMapping,
  hasColor: Object.hasOwn(args.ownerState, 'color'),
  hasComponent: Object.hasOwn(args.ownerState, 'component'),
  ownerComponent: args.ownerState.component ?? null,
  rootStyle: args.style,
  rootAs: args.as,
  id: args.id,
}));
const decode = (props: object = {}) =>
  Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, value === '$undefined' ? undefined : value]),
  );
test('all original utility identifiers and canonical exports retain their identities', () => {
  expect(Canonical).toBe(Typography);
  expect(canonicalClasses).toBe(typographyClasses);
  expect(typographyClasses).toEqual(reference.classes);
  expect(typeof getTypographyUtilityClass).toBe('function');
  for (const [slot, value] of Object.entries(reference.utilities))
    expect(getTypographyUtilityClass(slot)).toBe(value);
});
test.each(reference.cases)(
  'actual original root props, owner defaults and classes: $input.name',
  ({ input, observation, classReads, tag, declarations }) => {
    const value = input as {
      props?: object;
      defaults?: Record<string, unknown>;
      theme?: object;
      merge?: boolean;
      classGetter?: boolean;
    };
    const reads: string[] = [];
    const classes = value.classGetter
      ? Object.fromEntries(
          ['root', 'body1', 'alignCenter', 'gutterBottom', 'noWrap'].map((slot) => [slot, null]),
        )
      : undefined;
    if (classes)
      for (const slot of Object.keys(classes))
        Object.defineProperty(classes, slot, {
          enumerable: true,
          get() {
            reads.push(slot);
            return slot + '-' + reads.length;
          },
        });
    let actual: unknown;
    const theme = createTheme({
      ...value.theme,
      components: {
        mergeClassNameAndStyle: value.merge ?? false,
        MuiTypography: {
          defaultProps: value.defaults,
          styleOverrides: {
            root: nativeStyleCallback((args) => {
              actual = observe(args);
              return {};
            }),
          },
        },
      },
    });
    const reset = configureDiagnostics(() => {});
    try {
      const tree = render(
        <ThemeProvider theme={theme}>
          <Typography
            {...decode(value.props)}
            {...(classes ? { classes } : {})}
            id="type-probe"
            testID="text"
          >
            Text
          </Typography>
        </ThemeProvider>,
      );
      expect(actual).toEqual(observation);
      expect(reads).toEqual(classReads);
      expect(tree.getByTestId('text').props.accessibilityRole).toBe(
        /^h[1-6]$/.test(tag) ? 'header' : tag === 'a' ? 'link' : undefined,
      );
      if ('color' in declarations)
        expect(tree.getByTestId('text')).toHaveStyle({ color: declarations.color });
    } finally {
      reset();
    }
  },
);
test.each(reference.styledDefaults)(
  'prepared CSS preserves genuine style/default callback props: $input.name',
  ({ input, observation }) => {
    let actual: unknown;
    const theme = createTheme({
      components: {
        mergeClassNameAndStyle: 'merge' in input && input.merge,
        MuiTypography: {
          defaultProps: input.defaults,
          styleOverrides: {
            root: nativeStyleCallback((args) => {
              actual = observe(args);
              return {};
            }),
          },
        },
      },
    });
    const Wrapped =
      'nested' in input && input.nested
        ? styled(styled(Typography)({ opacity: 0.6 }))({ opacity: 0.8 })
        : styled(Typography)({ opacity: 0.8 });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Wrapped {...decode('props' in input ? input.props : {})} id="type-probe">
          Text
        </Wrapped>
      </ThemeProvider>,
    );
    expect(actual).toEqual(observation);
    if (observation.ownerStyle && 'opacity' in observation.ownerStyle)
      expect(tree.getByText('Text')).toHaveStyle({ opacity: observation.ownerStyle.opacity });
  },
);
test.each(
  reference.cases.filter(
    ({ input }) => input.name.startsWith('variant ') && input.name !== 'variant inherit',
  ),
)(
  'each rendered variant keeps actual original font metrics: $input.name',
  ({ input, declarations }) => {
    const variant = input.name.slice('variant '.length) as NonNullable<
      ComponentProps<typeof Typography>['variant']
    >;
    const sourceSize = declarations['font-size'];
    const sourceHeight = declarations['line-height'];
    if (!sourceSize || !sourceHeight)
      throw new Error('Original variant fixture lacks font metrics.');
    const fontSize = Number.parseFloat(sourceSize) * 16;
    const tree = render(
      <Typography variant={variant} testID="text">
        Text
      </Typography>,
    );
    expect(tree.getByTestId('text')).toHaveStyle({
      fontSize,
      lineHeight: Number.parseFloat(sourceHeight) * fontSize,
    });
    expect(StyleSheet.flatten(tree.getByTestId('text').props.style).fontWeight).toBe(
      declarations['font-weight'],
    );
  },
);
test('composed root classes select actual text styles and only custom roots receive class metadata', () => {
  const Root = forwardRef<TextInstance, TextProps & { className?: string | undefined }>(
    ({ className: _className, ...props }, ref) => <Text {...props} ref={ref} />,
  );
  const tree = render(
    <Typography
      component={Root}
      testID="text"
      classes={{ root: 'custom-root', h2: 'custom-heading' }}
      className="authored"
      variant="h2"
      gutterBottom
      noWrap
      sx={{
        '&.MuiTypography-h2.custom-heading.authored': { fontSize: 30 },
        '&.MuiTypography-gutterBottom': { lineHeight: 2 },
      }}
    >
      Heading
    </Typography>,
  );
  expect(tree.UNSAFE_getByType(Root).props.className).toBe(
    'MuiTypography-root custom-root MuiTypography-h2 custom-heading MuiTypography-gutterBottom MuiTypography-noWrap authored',
  );
  expect(tree.getByTestId('text')).toHaveStyle({
    fontSize: 30,
    lineHeight: 60,
    marginBottom: 10.5,
  });
  for (const key of ['classes', 'className', 'sx', 'ownerState', 'component'])
    expect(tree.getByTestId('text').props).not.toHaveProperty(key);
});
test('inline margin/padding shorthands reset computed gutter and theme edges', () => {
  const theme = createTheme({
    components: { MuiTypography: { styleOverrides: { root: { paddingLeft: 7, marginTop: 9 } } } },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Typography gutterBottom testID="text" style={{ margin: 0, padding: 0 }}>
        Text
      </Typography>
    </ThemeProvider>,
  );
  const native = StyleSheet.flatten(tree.getByTestId('text').props.style);
  expect(native).toMatchObject({ margin: 0, padding: 0 });
  // No computed edge may outrank these genuine native all-edge resets.
  for (const kind of ['margin', 'padding'])
    for (const edge of ['Top', 'Bottom', 'Left', 'Right', 'Start', 'End', 'Horizontal', 'Vertical'])
      expect(native).not.toHaveProperty(`${kind}${edge}`);
});
test('native inline physical edges use actual global direction rather than a theme-only RTL hint', () => {
  const globalDirection = jest.replaceProperty(I18nManager, 'isRTL', false);
  try {
    const tree = render(
      <ThemeProvider theme={createTheme({ direction: 'rtl' })}>
        <Typography testID="text" style={{ marginLeft: 5 }}>
          Text
        </Typography>
      </ThemeProvider>,
    );
    expect(tree.getByTestId('text')).toHaveStyle({ marginLeft: 5, margin: 0 });
    const native = StyleSheet.flatten(tree.getByTestId('text').props.style);
    expect(native).not.toHaveProperty('marginStart');
    expect(native).not.toHaveProperty('marginEnd');
  } finally {
    globalDirection.restore();
  }
});
test.each([false, true])(
  'participating Material ancestor CSS reaches Typography with native inline last, inline=%s',
  (inline) => {
    const theme = createTheme({
      components: {
        MuiMenuItem: {
          styleOverrides: { root: { '& .MuiTypography-root': { color: '#123456' } } },
        },
      },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <MenuList>
          <MenuItem>
            <Typography
              testID="descendant"
              sx={{ color: 'red' }}
              style={inline ? { color: 'blue' } : undefined}
            >
              Menu text
            </Typography>
          </MenuItem>
        </MenuList>
      </ThemeProvider>,
    );
    expect(tree.getByTestId('descendant')).toHaveStyle({ color: inline ? 'blue' : '#123456' });
  },
);
test('Typography publishes its supported descendant CSS without inserting a native wrapper', () => {
  const tree = render(
    <Typography
      component="span"
      testID="parent"
      sx={{ '& .MuiTypography-body2': { color: '#123456' } }}
    >
      <Typography component="span" variant="body2" sx={{ color: 'red' }} testID="descendant">
        Nested
      </Typography>
    </Typography>,
  );
  expect(tree.getByTestId('descendant')).toHaveStyle({ color: '#123456' });
  expect(tree.UNSAFE_getAllByType(Text)).toHaveLength(2);
});
test('ancestor declarations prepare once for multiple virtual Text descendants and retained child updates', () => {
  const declarations = jest.fn(() => ({ '& .MuiTypography-body2': { color: '#123456' } }));
  const Parent = styled(Typography)(declarations);
  function Child() {
    const [count, setCount] = useState(0);
    return (
      <Text testID="counter" onPress={() => setCount(count + 1)}>
        Count {count}
      </Text>
    );
  }
  const tree = render(
    <Parent component="span">
      <Typography component="span" variant="body2">
        <Child />
      </Typography>
      <Typography component="span" variant="body2" testID="second">
        Second
      </Typography>
    </Parent>,
  );
  expect(tree.getByTestId('second')).toHaveStyle({ color: '#123456' });
  expect(declarations).toHaveBeenCalledTimes(1);
  fireEvent.press(tree.getByTestId('counter'));
  expect(tree.getByTestId('counter')).toHaveTextContent('Count 1');
  expect(declarations).toHaveBeenCalledTimes(1);
});
test('a custom Text host replacement updates style ownership and each React19 ref lease', () => {
  let replace: Dispatch<SetStateAction<number>> | undefined;
  const Changing = forwardRef<TextInstance, TextProps & { className?: string | undefined }>(
    ({ className: _className, ...props }, ref) => {
      const [revision, setRevision] = useState(0);
      replace = setRevision;
      return <Text key={revision} {...props} ref={ref} />;
    },
  );
  const attached: TextInstance[] = [],
    cleanups: jest.Mock[] = [];
  const ref = (node: TextInstance | null) => {
    if (node) attached.push(node);
    const release = jest.fn();
    cleanups.push(release);
    return release;
  };
  const tree = render(
    <Typography component={Changing} ref={ref}>
      Text
    </Typography>,
  );
  expect(replace).toBeDefined();
  const changed = jest.spyOn(nativeStyleTree, 'changed');
  try {
    act(() => replace!((value) => value + 1));
    expect(attached).toHaveLength(2);
    expect(attached[1]).not.toBe(attached[0]);
    expect(changed).toHaveBeenCalledTimes(2);
    expect(cleanups[0]).toHaveBeenCalledTimes(1);
    expect(cleanups[1]).not.toHaveBeenCalled();
    expect(nativeStyleTree.groupRulesAt(attached[0])).toHaveLength(0);
    expect(nativeStyleTree.groupRulesAt(attached[1])).toHaveLength(1);
    tree.unmount();
    expect(cleanups[1]).toHaveBeenCalledTimes(1);
    expect(nativeStyleTree.groupRulesAt(attached[1])).toHaveLength(0);
  } finally {
    changed.mockRestore();
  }
});
const textEvents = [
  'onPress',
  'onLongPress',
  'onPressIn',
  'onPressOut',
  'onLayout',
  'onTextLayout',
  'onPointerEnter',
  'onPointerLeave',
  'onPointerMove',
  'onResponderGrant',
  'onResponderMove',
  'onResponderRelease',
  'onResponderTerminate',
  'onResponderTerminationRequest',
  'onStartShouldSetResponder',
  'onMoveShouldSetResponder',
  'onAccessibilityAction',
] as const;
test.each(textEvents)('native %s retains its event, callback identity and result', (name) => {
  const callback = jest.fn(() => false);
  const tree = render(
    <Typography testID="text" {...{ [name]: callback }}>
      Text
    </Typography>,
  );
  const event = { nativeEvent: { target: 1, actionName: 'activate', lines: [{ text: 'Text' }] } };
  expect(tree.getByTestId('text').props[name]).toBe(callback);
  expect(tree.getByTestId('text').props[name](event)).toBe(false);
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith(event);
});
test('styled relative metrics resolve once using final variant/default/inline values', () => {
  const Wrapped = styled(Typography)({ fontSize: '2em', lineHeight: 1.5, letterSpacing: '0.1em' });
  const theme = createTheme({
    components: { MuiTypography: { defaultProps: { style: { fontSize: 30, opacity: 0.2 } } } },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Box sx={{ fontSize: 10 }}>
        <Wrapped gutterBottom testID="text">
          <Typography variant="inherit" testID="child" sx={{ fontSize: '50%' }} style={null}>
            Child
          </Typography>
        </Wrapped>
      </Box>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('text')).toHaveStyle({
    fontSize: 30,
    lineHeight: 45,
    letterSpacing: 3,
    marginBottom: 10.5,
    opacity: 0.2,
  });
  expect(tree.getByTestId('child')).toHaveStyle({
    fontSize: 15,
    lineHeight: 22.5,
  });
});
test('literal color and paragraph remain documented native extensions, with source negatives', () => {
  const original = reference.cases.find((entry) => entry.input.name === 'color #ff0000');
  expect(original?.declarations).not.toHaveProperty('color');
  const tree = render(
    <Typography color="#ff0000" paragraph gutterBottom testID="text">
      Text
    </Typography>,
  );
  expect(tree.getByTestId('text')).toHaveStyle({ color: '#ff0000', marginBottom: 16 });
});
test('CSS alignment uses actual paragraph encoding while genuine native inline keeps RN semantics', () => {
  const scene = (native: boolean) => (
    <Typography
      testID="text"
      sx={{ direction: 'rtl', textAlign: 'left' }}
      style={native ? { textAlign: 'left' } : undefined}
    >
      Dock 3.
    </Typography>
  );
  const tree = render(scene(false));
  // RN0.88.1 iOS and Android mirror explicit left/right for an RTL paragraph.
  // CSS left must therefore be encoded as native right; native inline is literal.
  expect(tree.getByTestId('text')).toHaveStyle({ direction: 'rtl', textAlign: 'right' });
  tree.rerender(scene(true));
  expect(tree.getByTestId('text')).toHaveStyle({ direction: 'rtl', textAlign: 'left' });
});
test('text events, native policy updates, refs and keyed child state remain on one actual host', () => {
  const release = jest.fn(),
    mounted = jest.fn(),
    unmounted = jest.fn();
  let instance: TextInstance | null = null;
  const ref = jest.fn((node: TextInstance | null) => {
    instance = node;
    return release;
  });
  function Child() {
    const [count, setCount] = useState(0);
    useEffect(() => {
      mounted();
      return unmounted;
    }, []);
    return (
      <Text testID="counter" onPress={() => setCount(count + 1)}>
        Count {count}
      </Text>
    );
  }
  const onTextLayout = jest.fn(() => false),
    onLongPress = jest.fn(() => false);
  const content = (alternate: boolean) => (
    <Typography
      ref={ref}
      testID="text"
      variant={alternate ? 'h4' : 'body1'}
      align={alternate ? 'right' : 'left'}
      allowFontScaling={!alternate}
      maxFontSizeMultiplier={alternate ? 1.2 : 0}
      onTextLayout={onTextLayout}
      onLongPress={onLongPress}
    >
      <Child key="retained" />
    </Typography>
  );
  const tree = render(content(false));
  const first = instance;
  fireEvent.press(tree.getByTestId('counter'));
  tree.rerender(content(true));
  expect(instance).toBe(first);
  expect(ref).toHaveBeenCalledTimes(1);
  expect(release).not.toHaveBeenCalled();
  expect(tree.getByTestId('text').props.allowFontScaling).toBe(false);
  expect(tree.getByTestId('text').props.maxFontSizeMultiplier).toBe(1.2);
  expect(tree.getByTestId('counter')).toHaveTextContent('Count 1');
  expect(mounted).toHaveBeenCalledTimes(1);
  const event = { nativeEvent: { lines: [{ text: 'native' }] } };
  expect(tree.getByTestId('text').props.onTextLayout).toBe(onTextLayout);
  expect(tree.getByTestId('text').props.onTextLayout(event)).toBe(false);
  expect(onTextLayout).toHaveBeenCalledWith(event);
  expect(tree.getByTestId('text').props.onLongPress).toBe(onLongPress);
  tree.unmount();
  expect(release).toHaveBeenCalledTimes(1);
  expect(unmounted).toHaveBeenCalledTimes(1);
});
