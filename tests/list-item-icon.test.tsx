// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, type ViewInstance } from 'react-native';
import { cleanup, render, fireEvent } from '@testing-library/react-native';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ThemeProvider,
  Typography,
  createTheme,
  styled,
  listItemIconClasses,
  getListItemIconUtilityClass,
  nativeTextScopes,
  type ListItemIconProps,
  type ListItemIconRootProps,
} from '../packages/material/src';
import DeepIcon, {
  listItemIconClasses as deepClasses,
} from '../packages/material/src/ListItemIcon';
import reference from './fixtures/mui-list-item-icon-9.5.0.json';
import { NativePortalModel } from './helpers/nativePortalModel';

afterEach(cleanup);
test('alignment and authored class selectors participate in the actual root cascade', () => {
  const tree = render(
    <ListItem alignItems="flex-start">
      <ListItemIcon
        testID="icon"
        classes={{ root: 'custom-root', alignItemsFlexStart: 'custom-top' }}
        className="authored"
        sx={{
          '&.MuiListItemIcon-root': { opacity: 0.8 },
          '&.MuiListItemIcon-alignItemsFlexStart': { minWidth: 60 },
          '&.custom-root.custom-top.authored': { marginTop: '12px' },
        }}
      >
        A
      </ListItemIcon>
    </ListItem>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('icon').props.style)).toMatchObject({
    opacity: 0.8,
    minWidth: 60,
    marginTop: 12,
  });
});
test('custom roots receive original composed class metadata without styling internals', () => {
  const Root = forwardRef<ViewInstance, ListItemIconRootProps>(
    ({ className: _className, ...props }, ref) => <View {...props} ref={ref} />,
  );
  const tree = render(
    <ListItem alignItems="flex-start">
      <ListItemIcon
        component={Root}
        testID="icon"
        classes={{ root: 'custom-root', alignItemsFlexStart: 'custom-top' }}
        className="authored"
        sx={{ opacity: 0.7 }}
      >
        A
      </ListItemIcon>
    </ListItem>,
  );
  expect(tree.UNSAFE_getByType(Root).props.className).toBe(
    'MuiListItemIcon-root custom-root MuiListItemIcon-alignItemsFlexStart custom-top authored',
  );
  expect(tree.UNSAFE_getByType(Root).props).not.toHaveProperty('sx');
  expect(tree.UNSAFE_getByType(Root).props).not.toHaveProperty('ownerState');
});

test('root and canonical deep imports preserve identity and all pinned utility identifiers', () => {
  expect(DeepIcon).toBe(ListItemIcon);
  const renderFunction = Reflect.get(ListItemIcon, 'render');
  expect({
    kind: typeof ListItemIcon,
    forwardRef: String(ListItemIcon.$$typeof),
    renderName: renderFunction.name,
    renderArity: renderFunction.length,
  }).toEqual(reference.component);
  expect(deepClasses).toBe(listItemIconClasses);
  expect(listItemIconClasses).toEqual(reference.classes);
  for (const [slot, value] of Object.entries(reference.utilities))
    expect(getListItemIconUtilityClass(slot)).toBe(value);
});
test.each(reference.fixtures)('original complete wrapper composition: $input.name', (fixture) => {
  const input = fixture.input as {
    alignItems?: 'center' | 'flex-start';
    button?: boolean;
    list?: boolean;
    nestedList?: boolean;
    defaults?: Record<string, unknown>;
    classes?: ListItemIconProps['classes'];
    classesGetter?: boolean;
    className?: string;
    sx?: ListItemIconProps['sx'];
    style?: ListItemIconProps['style'];
    edges?: Record<string, unknown>;
    spacing?: number;
    activeColor?: string;
  };
  let actual: object | undefined;
  const classAccesses: string[] = [];
  const accessorClasses = input.classesGetter
    ? {
        get root() {
          classAccesses.push('root');
          return `custom-${classAccesses.length}`;
        },
        get alignItemsFlexStart() {
          classAccesses.push('alignItemsFlexStart');
          return `custom-${classAccesses.length}`;
        },
      }
    : input.classes;
  const theme = createTheme({
    ...(input.spacing ? { spacing: input.spacing } : {}),
    ...(input.activeColor ? { palette: { action: { active: input.activeColor } } } : {}),
    components: {
      MuiListItemIcon: {
        defaultProps: input.defaults,
        styleOverrides: {
          root: ({ ownerState, className, id, classes, ...rootProps }) => {
            actual = {
              alignItems: ownerState.alignItems ?? null,
              hasAlignment: Object.hasOwn(ownerState, 'alignItems'),
              className,
              id,
              classes: input.classesGetter ? '<accessor map>' : (classes ?? null),
              hasAs: Object.hasOwn(rootProps, 'as'),
            };
            return input.edges ?? {};
          },
        },
      },
    },
  });
  let body = (
    <ListItemIcon
      id="icon-probe"
      testID="icon"
      classes={accessorClasses}
      className={input.className}
      sx={input.sx}
      style={input.style}
    >
      Icon
    </ListItemIcon>
  );
  if (input.nestedList) body = <List>{body}</List>;
  if (input.alignItems) {
    const Item = input.button ? ListItemButton : ListItem;
    body = <Item alignItems={input.alignItems}>{body}</Item>;
  }
  if (input.list) body = <List>{body}</List>;
  const tree = render(<ThemeProvider theme={theme}>{body}</ThemeProvider>);
  expect(actual).toEqual(fixture.observation);
  expect(tree.getByText('Icon')).toHaveStyle({ color: fixture.declarations.color });
  expect(classAccesses).toEqual(fixture.classAccesses);
  if (input.style) {
    expect(fixture.inlineStyle).toMatch(/^margin:0/);
    expect(StyleSheet.flatten(tree.getByTestId('icon').props.style).marginTop).toBe(0);
  }
  expect(StyleSheet.flatten(tree.getByTestId('icon').props.style)).toMatchObject({
    minWidth: input.sx ? 72 : input.defaults ? 64 : input.spacing ? input.spacing * 4.5 : 36,
    flexShrink: 0,
  });
});
test('root/alignment overrides, embedded variants, component variants, sx and native inline retain source priority', () => {
  const theme = createTheme({
    components: {
      MuiListItemIcon: {
        styleOverrides: {
          root: ({ ownerState }) => [
            { minWidth: 57, opacity: 0.1 },
            {
              variants: [
                {
                  props: { alignItems: 'flex-start' },
                  style: ({ ownerState: state }) => ({
                    opacity: state.alignItems === ownerState.alignItems ? 0.2 : 0,
                  }),
                },
              ],
            },
          ],
          alignItemsFlexStart: { minWidth: 58, opacity: 0.3 },
        },
        variants: [
          {
            props: { alignItems: 'flex-start' },
            style: [
              { minWidth: 59, opacity: 0.4 },
              ({ ownerState }) => ({ opacity: ownerState.alignItems === 'flex-start' ? 0.5 : 0 }),
            ],
          },
        ],
      },
    },
  });
  const field = (inline: boolean) => (
    <ThemeProvider theme={theme}>
      <ListItem alignItems="flex-start">
        <ListItemIcon
          testID="icon"
          sx={{ minWidth: 60, opacity: 0.6 }}
          style={inline ? { minWidth: 61, opacity: 0.7 } : undefined}
        >
          A
        </ListItemIcon>
      </ListItem>
    </ThemeProvider>
  );
  const tree = render(field(false));
  expect(StyleSheet.flatten(tree.getByTestId('icon').props.style)).toMatchObject({
    minWidth: 60,
    opacity: 0.6,
    marginTop: 8,
  });
  tree.rerender(field(true));
  expect(StyleSheet.flatten(tree.getByTestId('icon').props.style)).toMatchObject({
    minWidth: 61,
    opacity: 0.7,
  });
});
test('inline margin shorthand resets the original flex-start edge inside List/ListItem', () => {
  const tree = render(
    <List>
      <ListItem alignItems="flex-start">
        <ListItemIcon testID="icon" style={{ margin: 0 }}>
          A
        </ListItemIcon>
      </ListItem>
    </List>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('icon').props.style)).toMatchObject({
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
  });
});
test('inline margin/padding shorthands reset theme edges after computed styles', () => {
  const theme = createTheme({
    components: {
      MuiListItemIcon: {
        styleOverrides: {
          root: { marginTop: 13, paddingLeft: 7, paddingTop: 9 },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <List>
        <ListItem alignItems="flex-start">
          <ListItemIcon testID="icon" style={{ margin: 0, padding: 0 }}>
            A
          </ListItemIcon>
        </ListItem>
      </List>
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('icon').props.style)).toMatchObject({
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginStart: 0,
    marginEnd: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingStart: 0,
    paddingEnd: 0,
  });
});
test('native inline arrays retain their edge semantics in the inherited RTL direction', () => {
  const offsets = StyleSheet.create({ offsets: { marginTop: 3, paddingLeft: 2 } });
  const tree = render(
    <ThemeProvider theme={createTheme({ direction: 'ltr' })}>
      <Box sx={{ direction: 'rtl' }}>
        <ListItemIcon
          testID="icon"
          style={[offsets.offsets, false, [{ margin: 0, padding: 0, marginEnd: 6 }]]}
        >
          A
        </ListItemIcon>
      </Box>
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('icon').props.style)).toMatchObject({
    marginTop: 3,
    marginBottom: 0,
    marginStart: 0,
    marginEnd: 6,
    paddingLeft: 2,
    paddingRight: 0,
    paddingStart: 0,
    paddingEnd: 2,
  });
});
test('inline direction overrides parent RTL for logical shorthand expansion', () => {
  const tree = render(
    <Box sx={{ direction: 'rtl' }}>
      <ListItemIcon testID="icon" style={{ direction: 'ltr', padding: 0, paddingLeft: 7 }}>
        A
      </ListItemIcon>
    </Box>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('icon').props.style)).toMatchObject({
    direction: 'ltr',
    paddingLeft: 7,
    paddingRight: 0,
    paddingStart: 7,
    paddingEnd: 0,
  });
});
test('inset merging preserves CSS relative text provenance for a smaller descendant', () => {
  const tree = render(
    <Box sx={{ fontSize: 10 }}>
      <ListItemIcon sx={{ fontSize: '2em', lineHeight: 1.5 }} style={{ margin: 0, padding: 0 }}>
        <Typography testID="smaller" variant="inherit" sx={{ fontSize: 10 }}>
          Small
        </Typography>
      </ListItemIcon>
    </Box>,
  );
  expect(tree.getByTestId('smaller')).toHaveStyle({ fontSize: 10, lineHeight: 15 });
});
test('class specificity outranks plain sx while true native inline remains last', () => {
  const theme = createTheme({
    components: {
      MuiListItemIcon: {
        styleOverrides: { root: { '&.MuiListItemIcon-root': { opacity: 0.3 } } },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <ListItemIcon testID="icon" sx={{ opacity: 0.6 }} />
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('icon').props.style).opacity).toBe(0.3);
  tree.rerender(
    <ThemeProvider theme={theme}>
      <ListItemIcon testID="icon" sx={{ opacity: 0.6 }} style={{ opacity: 0.9 }} />
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('icon').props.style).opacity).toBe(0.9);
});
test('inherited native attributes and accessibility aliases reach the actual selected root', () => {
  const Root = forwardRef<ViewInstance, ListItemIconRootProps>(
    ({ className: _className, ...props }, ref) => <View {...props} ref={ref} />,
  );
  const props: ListItemIconProps = {
    id: 'public-id',
    nativeID: 'native-id',
    testID: 'icon',
    accessible: true,
    accessibilityLabel: 'Account photo',
    accessibilityHint: 'Account owner',
    accessibilityRole: 'image',
    accessibilityState: { selected: true },
    'aria-label': 'Account alias',
    'aria-hidden': false,
    role: 'img',
    pointerEvents: 'box-none',
    collapsable: false,
    importantForAccessibility: 'yes',
    needsOffscreenAlphaCompositing: true,
    renderToHardwareTextureAndroid: false,
  };
  const tree = render(<ListItemIcon {...props} component={Root} />);
  expect(tree.UNSAFE_getByType(Root).props).toMatchObject(props);
  expect(tree.getByTestId('icon').props.pointerEvents).toBe('box-none');
  expect(tree.getByTestId('icon').props.className).toBeUndefined();
});
// All event props declared by pinned RN 0.88.1 ViewPropTypes, including capture variants.
const events = [
  'onAccessibilityAction',
  'onAccessibilityTap',
  'onLayout',
  'onMagicTap',
  'onAccessibilityEscape',
  'onMouseEnter',
  'onMouseLeave',
  'onClick',
  'onClickCapture',
  'onPointerEnter',
  'onPointerEnterCapture',
  'onPointerLeave',
  'onPointerLeaveCapture',
  'onPointerMove',
  'onPointerMoveCapture',
  'onPointerCancel',
  'onPointerCancelCapture',
  'onPointerDown',
  'onPointerDownCapture',
  'onPointerUp',
  'onPointerUpCapture',
  'onPointerOver',
  'onPointerOverCapture',
  'onPointerOut',
  'onPointerOutCapture',
  'onGotPointerCapture',
  'onGotPointerCaptureCapture',
  'onLostPointerCapture',
  'onLostPointerCaptureCapture',
  'onBlur',
  'onBlurCapture',
  'onFocus',
  'onFocusCapture',
  'onKeyDown',
  'onKeyDownCapture',
  'onKeyUp',
  'onKeyUpCapture',
  'onTouchCancel',
  'onTouchCancelCapture',
  'onTouchEnd',
  'onTouchEndCapture',
  'onTouchMove',
  'onTouchMoveCapture',
  'onTouchStart',
  'onTouchStartCapture',
  'onMoveShouldSetResponder',
  'onMoveShouldSetResponderCapture',
  'onResponderGrant',
  'onResponderMove',
  'onResponderReject',
  'onResponderRelease',
  'onResponderStart',
  'onResponderEnd',
  'onResponderTerminate',
  'onResponderTerminationRequest',
  'onStartShouldSetResponder',
  'onStartShouldSetResponderCapture',
] as const;
test.each(events)(
  'inherited %s preserves its callback, source event and return value without adding activation',
  (name) => {
    const callback = jest.fn(() => false);
    const tree = render(
      <ListItemIcon testID="icon" {...{ [name]: callback }}>
        A
      </ListItemIcon>,
    );
    const source = {
      nativeEvent: { target: 9, actionName: 'activate', timestamp: 123 },
      preventDefault: jest.fn(),
    };
    const view = tree.UNSAFE_getByType(View);
    expect(view.props[name]).toBe(callback);
    const args = ['onMagicTap', 'onAccessibilityTap', 'onAccessibilityEscape'].includes(name)
      ? []
      : [source];
    expect(view.props[name](...args)).toBe(false);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(...args);
  },
);
test.each([false, true])(
  'live contexts, refs, fragments and relative text metrics retain one child and host, custom=%s',
  (custom) => {
    const Root = forwardRef<ViewInstance, ListItemIconRootProps>(
      ({ className: _className, ...props }, ref) => <View {...props} ref={ref} />,
    );
    const release = jest.fn(),
      mounted = jest.fn(),
      unmounted = jest.fn();
    let node: ViewInstance | null = null;
    const ref = jest.fn((value: ViewInstance | null) => {
      node = value;
      return release;
    });
    function Child() {
      const [count, setCount] = useState(0);
      useEffect(() => {
        mounted();
        return unmounted;
      }, []);
      return (
        <Typography variant="inherit" testID="counter" onPress={() => setCount(count + 1)}>
          Count {count}
        </Typography>
      );
    }
    const child = (
      <>
        <Child key="stable" />
        <Text key="direct" testID="direct">
          Direct
        </Text>
        <Typography key="styled" allowFontScaling={false}>
          Styled
        </Typography>
      </>
    );
    const field = (top: boolean) => (
      <Box sx={{ fontSize: 10, color: '#123456' }}>
        <ListItem alignItems={top ? 'flex-start' : 'center'}>
          <ListItemIcon
            ref={ref}
            component={custom ? Root : undefined}
            testID="icon"
            sx={{ fontSize: '2em', lineHeight: 1.5, color: 'inherit' }}
            className={top ? 'top' : 'center'}
          >
            {child}
          </ListItemIcon>
        </ListItem>
      </Box>
    );
    const tree = render(field(false));
    const actual = node!;
    fireEvent.press(tree.getByTestId('counter'));
    expect(tree.getByTestId('counter')).toHaveTextContent('Count 1');
    expect(tree.getByTestId('direct')).toHaveStyle({
      fontSize: 20,
      lineHeight: 30,
      color: '#123456',
    });
    expect(tree.getByTestId('counter')).toHaveStyle({
      fontSize: 20,
      lineHeight: 30,
      color: '#123456',
    });
    expect(nativeTextScopes.at(actual)?.style).toMatchObject({ fontSize: 20, lineHeight: 30 });
    tree.rerender(field(true));
    expect(node).toBe(actual);
    expect(tree.getByTestId('counter')).toHaveTextContent('Count 1');
    expect(StyleSheet.flatten(tree.getByTestId('icon').props.style).marginTop).toBe(8);
    expect(ref).toHaveBeenCalledTimes(1);
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
    tree.unmount();
    expect(release).toHaveBeenCalledTimes(1);
    expect(nativeTextScopes.at(actual)).toBeUndefined();
  },
);
test('default native roots do not acquire grouping/focus semantics or leaked styling props', () => {
  const tree = render(
    <ListItemIcon
      testID="icon"
      className="custom"
      classes={{ root: 'root-custom' }}
      sx={{ opacity: 0.8 }}
    >
      Literal {0}
    </ListItemIcon>,
  );
  const props = tree.UNSAFE_getByType(View).props;
  for (const key of [
    'classes',
    'className',
    'sx',
    'component',
    'ownerState',
    'role',
    'accessible',
    'focusable',
    'onPress',
  ])
    expect(props).not.toHaveProperty(key);
  expect(tree.getByText('Literal 0')).toBeTruthy();
});
test('owned root and state remain stable through native Portal readiness and layout updates', async () => {
  const model = new NativePortalModel();
  const ref = createRef<ViewInstance>();
  const mount = jest.fn(),
    unmount = jest.fn();
  function Child() {
    useEffect(() => {
      mount();
      return unmount;
    }, []);
    return <Typography variant="inherit">Portaled icon</Typography>;
  }
  model.content = (
    <ListItemIcon ref={ref} sx={{ fontSize: 20, color: '#123456' }}>
      <Child />
    </ListItemIcon>
  );
  await model.mount();
  const actual = ref.current!;
  await model.layout();
  await model.layout({ width: 640, height: 480 });
  expect(ref.current).toBe(actual);
  expect(nativeTextScopes.at(actual)?.style).toMatchObject({ fontSize: 20, color: '#123456' });
  expect(model.tree!.getByText('Portaled icon')).toHaveStyle({ fontSize: 20, color: '#123456' });
  expect(mount).toHaveBeenCalledTimes(1);
  expect(unmount).not.toHaveBeenCalled();
  model.tree!.unmount();
  expect(unmount).toHaveBeenCalledTimes(1);
  expect(nativeTextScopes.at(actual)).toBeUndefined();
});

test('stable styled icons rebind contextual alignment without rerunning outer callbacks', () => {
  const evaluate = jest.fn(() => ({
    '&.MuiListItemIcon-alignItemsFlexStart': { marginTop: 12, opacity: 0.6 },
  }));
  const Styled = styled(ListItemIcon)(evaluate);
  const ref = createRef<ViewInstance>();
  const child = (
    <Styled testID="styled-icon" ref={ref}>
      AV
    </Styled>
  );
  const content = (top: boolean) => (
    <ListItem alignItems={top ? 'flex-start' : 'center'}>{child}</ListItem>
  );
  const tree = render(content(false));
  const root = ref.current;
  expect(StyleSheet.flatten(tree.getByTestId('styled-icon').props.style).marginTop).toBeUndefined();
  tree.rerender(content(true));
  expect(tree.getByTestId('styled-icon')).toHaveStyle({ marginTop: 12, opacity: 0.6 });
  expect(ref.current).toBe(root);
  expect(evaluate).toHaveBeenCalledTimes(1);
  tree.rerender(content(false));
  expect(StyleSheet.flatten(tree.getByTestId('styled-icon').props.style).marginTop).toBeUndefined();
  expect(ref.current).toBe(root);
  expect(evaluate).toHaveBeenCalledTimes(1);
});

test('nested styled icon rules retain specificity while native insets remain final', () => {
  const Inner = styled(ListItemIcon)({
    '&.MuiListItemIcon-root.MuiListItemIcon-alignItemsFlexStart': {
      paddingLeft: 13,
      marginTop: 8,
      opacity: 0.4,
    },
  });
  const Outer = styled(Inner)({ paddingLeft: 5, opacity: 0.8 });
  const tree = render(
    <ListItem alignItems="flex-start">
      <Outer testID="styled-inline-icon" style={{ padding: 0, margin: 0 }} />
    </ListItem>,
  );
  expect(tree.getByTestId('styled-inline-icon')).toHaveStyle({
    paddingLeft: 0,
    marginTop: 0,
    opacity: 0.4,
  });
});

test.each([null, undefined, false, '', 0, 7n])(
  'empty and literal child %s keeps the wrapper without inventing activation',
  (child) => {
    const tree = render(<ListItemIcon testID="empty">{child}</ListItemIcon>);
    expect(tree.getByTestId('empty')).toHaveStyle({ minWidth: 36, flexShrink: 0 });
    expect(tree.getByTestId('empty').props.onPress).toBeUndefined();
    if (child === 0 || typeof child === 'bigint')
      expect(tree.getByText(String(child))).toBeTruthy();
  },
);
