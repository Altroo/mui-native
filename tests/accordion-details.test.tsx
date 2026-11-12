// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import { createRef, forwardRef, useEffect, useState } from 'react';
import {
  I18nManager,
  View,
  Text,
  StyleSheet,
  type ViewInstance,
  type ViewProps,
} from 'react-native';
import { cleanup, render, fireEvent } from '@testing-library/react-native';
import {
  AccordionDetails,
  ThemeProvider,
  createTheme,
  styled,
  Box,
  Typography,
  configureDiagnostics,
  accordionDetailsClasses,
  getAccordionDetailsUtilityClass,
  nativeTextScopes,
  type ComponentStyleArgs,
} from '../packages/material/src';

import { backendEdges } from './helpers/nativeInsetEdges';
beforeEach(() => {
  jest.replaceProperty(I18nManager, 'isRTL', false);
  jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', false);
});
afterEach(cleanup);

test('canonical class configuration controls live Details metadata and self selectors', () => {
  const Root = forwardRef<
    ViewInstance,
    { className?: string | undefined; testID?: string | undefined }
  >(({ className: _name, ...native }, ref) => <View {...native} ref={ref} />);
  const node = () => (
    <AccordionDetails
      component={Root}
      className="chosen"
      testID="configured-details"
      sx={{ [`&.${reference.configured.root}`]: { opacity: 0.4 } }}
    >
      Details
    </AccordionDetails>
  );
  const tree = render(node());
  expect(
    StyleSheet.flatten(tree.getByTestId('configured-details').props.style).opacity,
  ).toBeUndefined();
  try {
    unstable_ClassNameGenerator.configure((name) => `Consumer${name}`);
    tree.rerender(node());
    expect(tree.UNSAFE_getByType(Root).props.className).toBe(reference.configured.className);
    expect(tree.getByTestId('configured-details')).toHaveStyle({ opacity: 0.4 });
    expect(getAccordionDetailsUtilityClass('root')).toBe(reference.configured.root);
    expect(getAccordionDetailsUtilityClass('disabled')).toBe(reference.configured.disabled);
    expect(accordionDetailsClasses.root).toBe(reference.configured.mapRoot);
  } finally {
    unstable_ClassNameGenerator.reset();
  }
  tree.rerender(node());
  expect(
    StyleSheet.flatten(tree.getByTestId('configured-details').props.style).opacity,
  ).toBeUndefined();
});
test('Details custom roots receive composed classes and source-filtered public props', () => {
  const Root = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
    (props, ref) => <View {...props} ref={ref} />,
  );
  const tree = render(
    <AccordionDetails
      component={Root}
      className="authored"
      classes={{ root: 'chosen' }}
      sx={{ opacity: 0.7 }}
    >
      Body
    </AccordionDetails>,
  );
  const props = tree.UNSAFE_getByType(Root).props;
  expect(props.className).toBe('MuiAccordionDetails-root chosen authored');
  for (const key of ['ownerState', 'classes', 'sx', 'component'])
    expect(props).not.toHaveProperty(key);
});
test('Details genuine native shorthands reset computed CSS edges and gap axes', () => {
  const theme = createTheme({
    components: {
      MuiAccordionDetails: {
        styleOverrides: {
          root: { borderTopLeftRadius: 0, rowGap: 8, columnGap: 9, paddingLeft: 17 },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <AccordionDetails testID="details" style={{ borderRadius: 7, gap: 0, padding: 0 }}>
        Body
      </AccordionDetails>
    </ThemeProvider>,
  );
  const style = StyleSheet.flatten(tree.getByTestId('details').props.style);
  expect(style).toMatchObject({ borderRadius: 7, gap: 0 });
  expect(backendEdges(style, 'padding', 'ltr', false)).toEqual({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  });
  expect(style.borderTopLeftRadius).toBeUndefined();
  expect(style.rowGap).toBeUndefined();
  expect(style.columnGap).toBeUndefined();
});
test('wrapped Details preserve genuine default styles and owner callback arguments', () => {
  const defaultStyle = { opacity: 0.2 };
  const styles: unknown[] = [];
  const theme = createTheme({
    components: {
      MuiAccordionDetails: {
        defaultProps: { style: defaultStyle },
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState }) => {
            styles.push(ownerState.style);
            return {};
          }),
        },
      },
    },
  });
  const Wrapped = styled(AccordionDetails)({ paddingLeft: '4px' });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Wrapped testID="details">Body</Wrapped>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('details')).toHaveStyle({ opacity: 0.2, paddingLeft: 4 });
  expect(styles.length).toBeGreaterThan(0);
  const config = theme.components?.MuiAccordionDetails;
  const resolvedDefault =
    config && typeof config === 'object' ? config.defaultProps?.style : undefined;
  expect(styles.every((value) => value === resolvedDefault)).toBe(true);
});
test('Details resolves the source multi-argument spacing shorthand', () => {
  const theme = createTheme();
  const spacing = jest
    .spyOn(theme, 'spacing')
    .mockImplementation((...args: unknown[]) => (args.length === 3 ? '5px 7px 9px' : '99px'));
  const tree = render(
    <ThemeProvider theme={theme}>
      <AccordionDetails testID="tuple-spacing">Body</AccordionDetails>
    </ThemeProvider>,
  );
  expect(spacing).toHaveBeenCalledWith(1, 2, 2);
  expect(tree.getByTestId('tuple-spacing')).toHaveStyle({
    paddingTop: 5,
    paddingRight: 7,
    paddingBottom: 9,
    paddingLeft: 7,
  });
});

import DetailsEntry, {
  accordionDetailsClasses as canonicalClasses,
} from '../packages/material/src/AccordionDetails';
import detailsLeaf from '../packages/material/src/AccordionDetails/accordionDetailsClasses';
import { unstable_ClassNameGenerator } from '../packages/material/src/className';
import reference from './fixtures/mui-accordion-details-9.5.0.json';
const publicClass = (value: unknown) =>
  value == null
    ? null
    : String(value)
        .split(/\s+/)
        .filter((token) => token && !token.startsWith('css-'))
        .join(' ');
const observe = nativeStyleCallback((args: ComponentStyleArgs) => ({
  ownerClass: publicClass(args.ownerState.className),
  rootClass: publicClass(args.className),
  id: args.id,
  hasOwnerStyle: Object.hasOwn(args.ownerState, 'style'),
  ownerStyle: args.ownerState.style ?? null,
  hasOwnerSx: Object.hasOwn(args.ownerState, 'sx'),
  ownerSx: args.ownerState.sx ?? null,
  rootStyle: args.style ?? null,
  direction: args.theme.direction,
}));
const decode = (props: Record<string, unknown> = {}) =>
  Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, value === '$undefined' ? undefined : value]),
  );
interface SourceInput {
  name: string;
  props?: Record<string, unknown>;
  classGetter?: boolean;
  className?: string;
  spacing?: number | number[] | string;
  merge?: boolean;
  defaults?: Record<string, unknown>;
  overrides?: Record<string, unknown>;
  variant?: boolean;
  embedded?: boolean;
}
function cssNumber(value: string) {
  return value.endsWith('rem') ? parseFloat(value) * 16 : parseFloat(value);
}
function expectedSourceStyle(
  declarations: Record<string, string | undefined>,
  inline: string | null,
) {
  const result: Record<string, number> = {};
  const apply = (key: string, value: string) => {
    if (key === 'padding') {
      const [top, right = top, bottom = top, left = right] = value
        .trim()
        .split(/\s+/)
        .map(cssNumber);
      Object.assign(result, {
        paddingTop: top,
        paddingRight: right,
        paddingBottom: bottom,
        paddingLeft: left,
      });
    } else if (
      [
        'padding-top',
        'padding-right',
        'padding-bottom',
        'padding-left',
        'min-width',
        'opacity',
      ].includes(key)
    )
      result[key.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase())] =
        cssNumber(value);
  };
  for (const [key, value] of Object.entries(declarations))
    if (typeof value === 'string') apply(key, value);
  for (const entry of inline?.split(';').filter(Boolean) ?? []) {
    const i = entry.indexOf(':');
    apply(entry.slice(0, i), entry.slice(i + 1));
  }
  return result;
}
test('Details canonical/root/native-existing-leaf identities and complete utility lookup match original', () => {
  expect(DetailsEntry).toBe(AccordionDetails);
  expect(canonicalClasses).toBe(accordionDetailsClasses);
  expect(detailsLeaf).toBe(accordionDetailsClasses);
  expect(accordionDetailsClasses).toEqual(reference.classes);
  for (const [slot, value] of Object.entries(reference.utilities))
    expect(getAccordionDetailsUtilityClass(slot)).toBe(value);
});
test.each(reference.fixtures)(
  'original Details root/default/callback contract: $input.name',
  (fixture) => {
    const input: SourceInput = fixture.input;
    let observation: ReturnType<typeof observe> | undefined;
    const variants: ReturnType<typeof observe>[] = [],
      classAccesses: string[] = [];
    const props: Record<string, unknown> = { id: 'details-reference', ...decode(input.props) };
    if (input.classGetter) {
      props.className = input.className;
      props.classes = Object.defineProperty({}, 'root', {
        enumerable: true,
        get() {
          classAccesses.push('root');
          return 'getter-' + classAccesses.length;
        },
      });
    }
    const theme = createTheme({
      spacing:
        input.spacing === 'rem'
          ? (value: number) => `${Number(value) * 0.25}rem`
          : (input.spacing ?? 8),
      components: {
        mergeClassNameAndStyle: input.merge ?? false,
        MuiAccordionDetails: {
          defaultProps: input.defaults,
          styleOverrides: {
            root: nativeStyleCallback((args) => {
              observation = observe(args);
              return {
                ...input.overrides,
                ...(input.embedded
                  ? {
                      variants: [
                        {
                          props: { id: 'details-reference' },
                          style: nativeStyleCallback(({ ownerState }: ComponentStyleArgs) => ({
                            minWidth: ownerState.id === 'details-reference' ? 37 : 0,
                          })),
                        },
                      ],
                    }
                  : {}),
              };
            }),
          },
          variants: input.variant
            ? [
                {
                  props: nativeStyleCallback((args) => {
                    variants.push(observe(args));
                    return publicClass(args.className) === 'authored';
                  }),
                  style: nativeStyleCallback((args) => {
                    variants.push(observe(args));
                    return { opacity: 0.45, minWidth: 33 };
                  }),
                },
              ]
            : [],
        },
      },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <AccordionDetails {...props} testID="details">
          Body
        </AccordionDetails>
      </ThemeProvider>,
    );
    expect(observation).toEqual(fixture.observation);
    expect(variants).toEqual(fixture.variantArguments);
    expect(classAccesses).toEqual(fixture.classAccesses);
    const { paddingTop, paddingRight, paddingBottom, paddingLeft, ...otherStyles } =
      expectedSourceStyle(fixture.declarations, fixture.inlineStyle);
    expect(tree.getByTestId('details')).toHaveStyle(otherStyles);
    expect(backendEdges(tree.getByTestId('details').props.style, 'padding', 'ltr', false)).toEqual({
      top: paddingTop,
      right: paddingRight,
      bottom: paddingBottom,
      left: paddingLeft,
    });
  },
);
interface StyledInput {
  name: string;
  defaultStyle?: Record<string, unknown>;
  defaultSx?: Record<string, unknown>;
  style?: unknown;
  sx?: unknown;
  nested?: boolean;
  merge?: boolean;
}
test.each(reference.styledDefaults)(
  'original styled Details default boundary: $input.name',
  (fixture) => {
    const input: StyledInput = fixture.input;
    let observation: ReturnType<typeof observe> | undefined;
    const theme = createTheme({
      components: {
        mergeClassNameAndStyle: input.merge ?? false,
        MuiAccordionDetails: {
          defaultProps: {
            ...(Object.hasOwn(input, 'defaultStyle') ? { style: input.defaultStyle } : {}),
            ...(Object.hasOwn(input, 'defaultSx') ? { sx: input.defaultSx } : {}),
          },
          styleOverrides: {
            root: nativeStyleCallback((args) => {
              observation = observe(args);
              return {};
            }),
          },
        },
      },
    });
    const Base = input.nested ? styled(AccordionDetails)({ opacity: 0.6 }) : AccordionDetails;
    const Wrapped = styled(Base)({ opacity: 0.8 });
    const props = {
      id: 'styled-details',
      ...decode(
        Object.fromEntries(
          ['style', 'sx']
            .filter((key) => Object.hasOwn(input, key))
            .map((key) => [key, input[key as 'style' | 'sx']]),
        ),
      ),
    };
    const tree = render(
      <ThemeProvider theme={theme}>
        <Wrapped {...props} testID="details">
          Body
        </Wrapped>
      </ThemeProvider>,
    );
    // Emotion-only generated class props have no native equivalent; authored public
    // class identifiers, root callbacks, style presence and sx values remain checked.
    const { ownerClass: _generated, ...expected } = fixture.observation;
    const { ownerClass: _native, ...actual } = observation!;
    expect(actual).toEqual(expected);
    const { paddingTop, paddingRight, paddingBottom, paddingLeft, ...otherStyles } =
      expectedSourceStyle(fixture.declarations, fixture.inlineStyle);
    expect(tree.getByTestId('details')).toHaveStyle(otherStyles);
    expect(backendEdges(tree.getByTestId('details').props.style, 'padding', 'ltr', false)).toEqual({
      top: paddingTop,
      right: paddingRight,
      bottom: paddingBottom,
      left: paddingLeft,
    });
  },
);
test('Details retains exact native attributes, event objects, original style callback references and custom root ref', () => {
  const ref = createRef<ViewInstance>(),
    onLayout = jest.fn(),
    onTouchEnd = jest.fn(),
    onAccessibilityAction = jest.fn();
  const Root = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
    ({ className: _className, ...native }, ref) => <View {...native} ref={ref} />,
  );
  const authored = { opacity: 0.95 };
  const observed: unknown[] = [];
  const theme = createTheme({
    components: {
      MuiAccordionDetails: {
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState, style }) => {
            observed.push(ownerState.style, style);
            return {};
          }),
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <AccordionDetails
        component={Root}
        ref={ref}
        style={authored}
        testID="details"
        nativeID="native-details"
        accessibilityLabel="Account details"
        onLayout={onLayout}
        onTouchEnd={onTouchEnd}
        onAccessibilityAction={onAccessibilityAction}
      >
        Body
      </AccordionDetails>
    </ThemeProvider>,
  );
  const props = tree.UNSAFE_getByType(Root).props;
  expect(ref.current).toBeTruthy();
  expect(props.nativeID).toBe('native-details');
  expect(props.accessibilityLabel).toBe('Account details');
  expect(props.onLayout).toBe(onLayout);
  expect(props.onTouchEnd).toBe(onTouchEnd);
  expect(props.onAccessibilityAction).toBe(onAccessibilityAction);
  expect(observed.every((value) => value === authored)).toBe(true);
  const layout = { nativeEvent: { layout: { x: 1, y: 2, width: 100, height: 50 } } },
    touch = { nativeEvent: { pageX: 3 } },
    action = { nativeEvent: { actionName: 'activate' } };
  fireEvent(tree.getByTestId('details'), 'layout', layout);
  fireEvent(tree.getByTestId('details'), 'touchEnd', touch);
  fireEvent(tree.getByTestId('details'), 'accessibilityAction', action);
  expect(onLayout.mock.calls[0][0]).toBe(layout);
  expect(onTouchEnd.mock.calls[0][0]).toBe(touch);
  expect(onAccessibilityAction.mock.calls[0][0]).toBe(action);
});
test('Details preserves one native host, React19 ref cleanup, keyed child state and inherited text metrics through live updates', () => {
  const mounts = jest.fn(),
    unmounts = jest.fn(),
    refs: string[] = [];
  const nativeRoots: ViewInstance[] = [];
  const old = (node: ViewInstance | null) => {
    expect(node).toBeTruthy();
    if (node) nativeRoots.push(node);
    refs.push('old attach');
    return () => {
      refs.push('old cleanup');
    };
  };
  const next = (node: ViewInstance | null) => {
    expect(node).toBeTruthy();
    if (node) nativeRoots.push(node);
    refs.push('new attach');
    return () => {
      refs.push('new cleanup');
    };
  };
  function Child() {
    const [count, setCount] = useState(0);
    useEffect(() => {
      mounts();
      return unmounts;
    }, []);
    return (
      <Typography
        variant="inherit"
        testID="child"
        sx={{ fontSize: '0.5em' }}
        onPress={() => setCount((value) => value + 1)}
      >
        Count {count}
      </Typography>
    );
  }
  const content = (size: number, ref: typeof old) => (
    <Box
      sx={{
        fontSize: size,
        lineHeight: 1.5,
        color: '#123456',
        direction: size === 20 ? 'ltr' : 'rtl',
      }}
    >
      <AccordionDetails ref={ref} testID="details">
        Literal
        <Child key="retained" />
      </AccordionDetails>
    </Box>
  );
  const tree = render(content(20, old));
  fireEvent.press(tree.getByTestId('child'));
  tree.rerender(content(24, next));
  expect(nativeRoots).toHaveLength(2);
  expect(nativeRoots[1]).toBe(nativeRoots[0]);
  expect(tree.getByTestId('child')).toHaveTextContent('Count 1');
  expect(tree.getByTestId('child')).toHaveStyle({ fontSize: 12, lineHeight: 18, color: '#123456' });
  expect(tree.getByText('Literal')).toHaveStyle({ fontSize: 24, lineHeight: 36 });
  expect(mounts).toHaveBeenCalledTimes(1);
  expect(unmounts).not.toHaveBeenCalled();
  expect(refs).toEqual(['old attach', 'old cleanup', 'new attach']);
  tree.unmount();
  expect(unmounts).toHaveBeenCalledTimes(1);
  expect(refs).toEqual(['old attach', 'old cleanup', 'new attach', 'new cleanup']);
});
test('Details finite class selectors retain CSS specificity while genuine native arrays retain RN precedence', () => {
  const diagnostics: string[] = [];
  const restore = configureDiagnostics(({ message }) => diagnostics.push(message));
  try {
    const theme = createTheme({
      components: {
        MuiAccordionDetails: {
          styleOverrides: {
            root: {
              '&.chosen.authored': { opacity: 0.3 },
              borderLeftWidth: 3,
              borderTopLeftRadius: 0,
              marginLeft: 9,
            },
          },
        },
      },
    });
    const Wrapped = styled(styled(AccordionDetails)({ opacity: 0.7 }))({ opacity: 0.8 });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Wrapped
          testID="details"
          classes={{ root: 'chosen' }}
          className="authored"
          sx={{ opacity: 0.9 }}
          style={[
            { borderTopLeftRadius: 2, borderLeftWidth: 4, marginLeft: 7 },
            { borderRadius: 8, borderWidth: 0, margin: 0 },
          ]}
        />
      </ThemeProvider>,
    );
    expect(tree.getByTestId('details')).toHaveStyle({
      opacity: 0.3,
      borderRadius: 8,
      borderTopLeftRadius: 2,
      borderWidth: 0,
      borderLeftWidth: 4,
      marginLeft: 7,
    });
    expect(diagnostics).toEqual([]);
  } finally {
    restore();
  }
});

test('Details live theme defaults rebind wrapped class selectors without replacing the native host', () => {
  const ref = createRef<ViewInstance>(),
    directions: unknown[] = [];
  const Wrapped = styled(AccordionDetails)({
    '&.first-default': { paddingTop: '3px' },
    '&.next-default': { paddingTop: '5px' },
  });
  const stable = (
    <Wrapped ref={ref} testID="details" id="account">
      Body
    </Wrapped>
  );
  const theme = (rtl: boolean) =>
    createTheme({
      direction: rtl ? 'rtl' : 'ltr',
      components: {
        MuiAccordionDetails: {
          defaultProps: { classes: { root: rtl ? 'next-default' : 'first-default' } },
          styleOverrides: {
            root: nativeStyleCallback((args) => {
              directions.push(args.theme.direction);
              return { opacity: args.ownerState.id === 'account' ? 0.6 : 1 };
            }),
          },
        },
      },
    });
  const tree = render(<ThemeProvider theme={theme(false)}>{stable}</ThemeProvider>);
  const root = ref.current;
  expect(root).toBeTruthy();
  expect(tree.getByTestId('details')).toHaveStyle({ paddingTop: 3, opacity: 0.6 });
  tree.rerender(<ThemeProvider theme={theme(true)}>{stable}</ThemeProvider>);
  expect(ref.current).toBe(root);
  expect(tree.getByTestId('details')).toHaveStyle({ paddingTop: 5, opacity: 0.6 });
  expect(directions).toContain('ltr');
  expect(directions).toContain('rtl');
});
test('Details publishes text inheritance on exactly its existing host and processes raw native text', () => {
  const ref = createRef<ViewInstance>();
  const tree = render(
    <AccordionDetails
      ref={ref}
      sx={{ fontSize: 20, lineHeight: 1.5, color: '#123456' }}
      testID="details"
    >
      Literal
      <Text style={{ fontSize: 8 }} testID="raw">
        Raw native
      </Text>
    </AccordionDetails>,
  );
  expect(tree.UNSAFE_getAllByType(View)).toHaveLength(1);
  expect(ref.current).toBeTruthy();
  const host = ref.current!;
  expect(nativeTextScopes.at(host)).toBeTruthy();
  expect(tree.getByText('Literal')).toHaveStyle({ fontSize: 20, lineHeight: 30, color: '#123456' });
  expect(tree.getByTestId('raw')).toHaveStyle({ fontSize: 8, lineHeight: 12, color: '#123456' });
  tree.unmount();
  expect(ref.current).toBeNull();
  expect(nativeTextScopes.at(host)).toBeUndefined();
});
