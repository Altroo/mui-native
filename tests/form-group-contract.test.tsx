// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, useEffect } from 'react';
import {
  I18nManager,
  Text,
  View,
  StyleSheet,
  type ViewInstance,
  type ViewProps,
} from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import {
  Box,
  FormControl,
  styled,
  FormGroup,
  ThemeProvider,
  Typography,
  configureDiagnostics,
  createTheme,
  formGroupClasses,
  getFormGroupUtilityClass,
} from '../packages/material/src';
import { nativeTextScopes } from '../packages/system/src';
import original from './fixtures/mui-form-group-contract-9.5.0.json';
import { backendEdges } from './helpers/nativeInsetEdges';

let restoreDiagnostics: () => void;
let diagnostics: string[];
beforeEach(() => {
  jest.replaceProperty(I18nManager, 'isRTL', false);
  jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', false);
  diagnostics = [];
  restoreDiagnostics = configureDiagnostics(({ message }) => diagnostics.push(message));
});
afterEach(() => {
  cleanup();
  restoreDiagnostics();
  jest.restoreAllMocks();
});

test('unscoped owner state preserves the original absent error value', () => {
  const observed: unknown[] = [];
  const theme = createTheme({
    components: {
      MuiFormGroup: {
        styleOverrides: {
          root: ({ ownerState }: { ownerState: Record<string, unknown> }) => {
            observed.push(ownerState.error);
            return {};
          },
        },
      },
    },
  });
  render(
    <ThemeProvider theme={theme}>
      <FormGroup />
    </ThemeProvider>,
  );
  expect(observed.length).toBeGreaterThan(0);
  expect(observed.every((error) => error === undefined)).toBe(true);
});

test('inherited and explicit error states update without replacing the native root', () => {
  const observed: unknown[] = [];
  const ref = createRef<ViewInstance>();
  const theme = createTheme({
    components: {
      MuiFormGroup: {
        styleOverrides: {
          root: ({ ownerState }: { ownerState: Record<string, unknown> }) => {
            observed.push(ownerState.error);
            return { opacity: ownerState.error ? 0.4 : 1 };
          },
        },
      },
    },
  });
  const content = (parent: boolean, own?: boolean) => (
    <ThemeProvider theme={theme}>
      <FormControl error={parent}>
        <FormGroup ref={ref} testID="group" error={own} />
      </FormControl>
    </ThemeProvider>
  );
  const tree = render(content(true));
  const first = ref.current;
  expect(tree.getByTestId('group')).toHaveStyle({ opacity: 0.4 });
  tree.rerender(content(true, false));
  expect(ref.current).toBe(first);
  expect(tree.getByTestId('group')).toHaveStyle({ opacity: 1 });
  expect(observed).toContain(true);
  expect(observed).toContain(false);
});

test('a single owned root supplies native text inheritance and wraps literal runs', () => {
  const ref = createRef<ViewInstance>();
  const tree = render(
    <FormGroup ref={ref} testID="group" style={{ color: '#123456', fontSize: 24, lineHeight: 30 }}>
      Literal <Typography variant="inherit">Descendant</Typography>
      <Typography>Body</Typography>
      {0}
    </FormGroup>,
  );
  expect(tree.getByText('Literal ')).toHaveStyle({
    color: '#123456',
    fontSize: 24,
    lineHeight: 30,
  });
  expect(tree.getByText('Descendant')).toHaveStyle({
    color: '#123456',
    fontSize: 24,
    lineHeight: 30,
  });
  expect(tree.getByText('Body')).toHaveStyle({ fontSize: 16, lineHeight: 24 });
  expect(tree.getByText('0')).toHaveStyle({ color: '#123456', fontSize: 24, lineHeight: 30 });
  expect(nativeTextScopes.at(ref.current!)).toMatchObject({
    style: { fontSize: 24, color: '#123456' },
  });
  expect(tree.getByTestId('group').findAll((node) => String(node.type) === 'View')).toHaveLength(1);
});

test('original and supplied class identifiers participate in native self selectors', () => {
  const theme = createTheme({
    components: {
      MuiFormGroup: {
        styleOverrides: {
          root: {
            '&.MuiFormGroup-root': { padding: 3 },
            '&.MuiFormGroup-row': { marginTop: 5 },
            '&.custom-root.custom-row.extra': { opacity: 0.6 },
          },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <FormGroup
        testID="group"
        row
        classes={{ root: 'custom-root', row: 'custom-row' }}
        className="extra"
      />
    </ThemeProvider>,
  );
  expect(tree.getByTestId('group')).toHaveStyle({ padding: 3, marginTop: 5, opacity: 0.6 });
  expect(diagnostics).toEqual([]);
});

test('custom roots receive composed class identifiers and the actual native ref', () => {
  const seen = jest.fn();
  const ref = createRef<ViewInstance>();
  const Root = forwardRef<ViewInstance, ViewProps & { className?: string }>(
    function Root(props, forwarded) {
      seen(props);
      const { className: _className, ...native } = props;
      return <View {...native} ref={forwarded} />;
    },
  );
  render(
    <FormGroup
      ref={ref}
      component={Root}
      row
      error
      classes={{ root: 'custom-root', row: 'custom-row', error: 'custom-error' }}
      className="extra"
    />,
  );
  expect(seen.mock.lastCall?.[0].className).toBe(
    `${formGroupClasses.root} custom-root ${formGroupClasses.row} custom-row ${formGroupClasses.error} custom-error extra`,
  );
  expect(ref.current).toBeTruthy();
});

test('root styles and text updates retain keyed children and callback-ref cleanup', () => {
  const mounted = jest.fn();
  const unmounted = jest.fn();
  const release = jest.fn();
  let host: ViewInstance | null = null;
  const ref = jest.fn((value: ViewInstance | null) => {
    host = value;
    return release;
  });
  function Child() {
    useEffect(() => {
      mounted();
      return unmounted;
    }, []);
    return <Text>Stable</Text>;
  }
  const child = <Child key="stable" />;
  const content = (row: boolean, color: string) => (
    <FormGroup ref={ref} row={row} style={{ color, fontSize: 22 }}>
      {child}
    </FormGroup>
  );
  const tree = render(content(false, '#123456'));
  const first = host;
  expect(nativeTextScopes.at(first!)?.style.color).toBe('#123456');
  tree.rerender(content(true, '#abcdef'));
  expect(host).toBe(first);
  expect(nativeTextScopes.at(first!)?.style.color).toBe('#abcdef');
  expect(ref).toHaveBeenCalledTimes(1);
  expect(mounted).toHaveBeenCalledTimes(1);
  expect(unmounted).not.toHaveBeenCalled();
  tree.unmount();
  expect(release).toHaveBeenCalledTimes(1);
  expect(ref).not.toHaveBeenCalledWith(null);
  expect(nativeTextScopes.at(first!)).toBeUndefined();
});

interface OriginalFormGroupCase {
  input: {
    name: string;
    kind?: string;
    props?: Record<string, unknown>;
    defaults?: Record<string, unknown>;
    form?: { error: boolean };
  };
  state: { row: boolean; error: boolean | string };
  classes: string[];
  classReads?: number;
}
const originalCases: readonly OriginalFormGroupCase[] = original.observations;

test.each(originalCases)(
  'original state/classes/defaults: $input.name',
  ({ input, state, classes, classReads: expectedReads }) => {
    const observed: unknown[] = [];
    let rootClass: string | undefined;
    const Root = forwardRef<ViewInstance, ViewProps & { className?: string }>(
      function Root(props, ref) {
        const { className, ...native } = props;
        rootClass = className;
        return <View {...native} ref={ref} />;
      },
    );
    const props = Object.fromEntries(
      Object.entries(input.props ?? {}).map(([key, value]) => [
        key,
        value === '$undefined' ? undefined : value,
      ]),
    );
    let classReads = 0;
    if (input.kind === 'class-getter')
      props.classes = Object.defineProperty({}, 'root', {
        enumerable: true,
        get() {
          return `custom-${++classReads}`;
        },
      });
    const theme = createTheme({
      components: {
        MuiFormGroup: {
          defaultProps: input.defaults,
          styleOverrides: {
            root: ({ ownerState }: { ownerState: Record<string, unknown> }) => {
              observed.push({
                row: ownerState.row,
                error: ownerState.error === undefined ? '$undefined' : ownerState.error,
              });
              return {};
            },
          },
        },
      },
    });
    let content = (
      <FormGroup {...props} component={Root}>
        Content
      </FormGroup>
    );
    if (input.form) content = <FormControl {...input.form}>{content}</FormControl>;
    const tree = render(<ThemeProvider theme={theme}>{content}</ThemeProvider>);
    expect(observed.length).toBeGreaterThan(0);
    expect(observed.every((value) => JSON.stringify(value) === JSON.stringify(state))).toBe(true);
    expect(rootClass?.split(/\s+/)).toEqual(classes);
    if (expectedReads !== undefined) expect(classReads).toBe(expectedReads);
    expect(tree.getByText('Content')).toBeTruthy();
  },
);

test.each(Object.entries(original.utility))('original class identifier: %s', (slot, expected) => {
  expect(getFormGroupUtilityClass(slot)).toBe(expected);
});

test('native root attributes and event objects retain caller identity', () => {
  const ref = createRef<ViewInstance>();
  const onLayout = jest.fn(),
    onTouchEnd = jest.fn();
  const tree = render(
    <FormGroup
      ref={ref}
      testID="group"
      nativeID="group-id"
      accessibilityLabel="Preferences"
      role="group"
      accessible={false}
      onLayout={onLayout}
      onTouchEnd={onTouchEnd}
    />,
  );
  const host = tree.getByTestId('group');
  expect(host.props.nativeID).toBe('group-id');
  expect(host.props.accessibilityLabel).toBe('Preferences');
  expect(host.props.role).toBe('group');
  expect(host.props.accessible).toBe(false);
  expect(host.props.onLayout).toBe(onLayout);
  expect(host.props.onTouchEnd).toBe(onTouchEnd);
  const layout = { nativeEvent: { layout: { x: 1, y: 2, width: 100, height: 40 } } };
  const touch = { nativeEvent: { pageX: 4, pageY: 5 } };
  host.props.onLayout(layout);
  host.props.onTouchEnd(touch);
  expect(onLayout).toHaveBeenCalledWith(layout);
  expect(onTouchEnd).toHaveBeenCalledWith(touch);
  expect(ref.current).toBeTruthy();
});

test.each(['stock', 'custom', 'styled'] as const)(
  '%s root preserves native focus/key/accessibility callbacks and original event objects',
  (kind) => {
    const CustomRoot = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
      ({ className: _className, ...props }, ref) => <View {...props} ref={ref} />,
    );
    const Root = kind === 'styled' ? styled(FormGroup)({ borderWidth: 1 }) : FormGroup;
    const handlers = {
      onFocus: jest.fn(),
      onFocusCapture: jest.fn(),
      onBlur: jest.fn(),
      onBlurCapture: jest.fn(),
      onKeyDown: jest.fn(),
      onKeyDownCapture: jest.fn(),
      onKeyUp: jest.fn(),
      onKeyUpCapture: jest.fn(),
      onAccessibilityAction: jest.fn(),
    };
    const actions = [{ name: 'inspect', label: 'Inspect group' }];
    const tree = render(
      <Root
        {...handlers}
        testID="native-events"
        component={kind === 'custom' ? CustomRoot : undefined}
        focusable
        accessibilityActions={actions}
      />,
    );
    const host = tree.getByTestId('native-events');
    expect(host.props.accessibilityActions).toBe(actions);
    expect(host.props.focusable).toBe(true);
    for (const [name, callback] of Object.entries(handlers)) {
      expect(host.props[name]).toBe(callback);
      const event = { nativeEvent: { target: 71, key: 'a', code: 'KeyA', actionName: 'inspect' } };
      host.props[name](event);
      expect(callback.mock.calls).toEqual([[event]]);
      expect(callback.mock.calls[0][0]).toBe(event);
    }
  },
);

test('root then row overrides, sx and native inline shorthands retain source priority', () => {
  const theme = createTheme({
    components: {
      MuiFormGroup: {
        styleOverrides: {
          root: { paddingLeft: 7, marginTop: 8, opacity: 0.2 },
          row: { opacity: 0.4 },
        },
        variants: [{ props: { row: true }, style: { opacity: 0.6 } }],
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <FormGroup
        testID="group"
        row
        sx={{ opacity: 0.8 }}
        style={{ opacity: 1, padding: 0, margin: 0 }}
      />
    </ThemeProvider>,
  );
  expect(tree.getByTestId('group')).toHaveStyle({
    opacity: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  });
  for (const kind of ['margin', 'padding'] as const)
    expect(backendEdges(tree.getByTestId('group').props.style, kind, 'ltr', false)).toEqual({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    });
});

// CSS ratios inherit with the child's font size; RN style numbers stay absolute.
test.each([false, true])('merged group preserves text metric provenance, native=%s', (native) => {
  const tree = render(
    <FormGroup sx={{ fontSize: 20, lineHeight: 2 }} style={native ? { lineHeight: 33 } : undefined}>
      <Typography variant="inherit" sx={{ fontSize: 10 }}>
        Small
      </Typography>
    </FormGroup>,
  );
  expect(tree.getByText('Small')).toHaveStyle({ fontSize: 10, lineHeight: native ? 33 : 20 });
});

test('styled group carries relative metrics exactly once to its native root', () => {
  const ref = createRef<ViewInstance>();
  const Styled = styled(FormGroup)({ fontSize: '2em', lineHeight: 2 });
  const tree = render(
    <Box sx={{ fontSize: 10 }}>
      <Styled ref={ref}>
        <Typography variant="inherit" sx={{ fontSize: 5 }}>
          Small styled
        </Typography>
      </Styled>
    </Box>,
  );
  expect(nativeTextScopes.at(ref.current!)?.style).toMatchObject({ fontSize: 20, lineHeight: 40 });
  expect(tree.getByText('Small styled')).toHaveStyle({ fontSize: 5, lineHeight: 10 });
});

test('styled group self selectors follow its final row and inherited error classes', () => {
  const Styled = styled(FormGroup)({
    '&.MuiFormGroup-row': { opacity: 0.6 },
    '&.Mui-error': { paddingLeft: 9 },
  });
  const tree = render(
    <FormControl error>
      <Styled testID="group" row />
    </FormControl>,
  );
  expect(tree.getByTestId('group')).toHaveStyle({ opacity: 0.6, paddingLeft: 9 });
});

test('inherited error rebinds a stable styled element without rerunning its callbacks', () => {
  const evaluate = jest.fn(() => ({ '&.Mui-error': { opacity: 0.4, paddingLeft: 9 } }));
  const Styled = styled(FormGroup)(evaluate);
  const ref = createRef<ViewInstance>();
  const child = <Styled testID="stable-styled" ref={ref} />;
  const content = (error: boolean) => <FormControl error={error}>{child}</FormControl>;
  const tree = render(content(false));
  const root = ref.current;
  expect(StyleSheet.flatten(tree.getByTestId('stable-styled').props.style).opacity).toBeUndefined();
  expect(evaluate).toHaveBeenCalledTimes(1);
  tree.rerender(content(true));
  expect(tree.getByTestId('stable-styled')).toHaveStyle({ opacity: 0.4, paddingLeft: 9 });
  expect(ref.current).toBe(root);
  expect(evaluate).toHaveBeenCalledTimes(1);
  tree.rerender(content(false));
  expect(StyleSheet.flatten(tree.getByTestId('stable-styled').props.style).opacity).toBeUndefined();
  expect(ref.current).toBe(root);
  expect(evaluate).toHaveBeenCalledTimes(1);
});

test('styled selector insets remain CSS while genuine native shorthands reset them', () => {
  const Inner = styled(FormGroup)({
    '&.MuiFormGroup-row': { paddingLeft: 13, paddingTop: 9, marginTop: 8 },
  });
  const Outer = styled(Inner)({ '&.MuiFormGroup-root': { paddingRight: 11 } });
  const tree = render(
    <Outer testID="styled-inline" row style={[{ paddingLeft: 17 }, { padding: 0, margin: 0 }]} />,
  );
  expect(
    backendEdges(tree.getByTestId('styled-inline').props.style, 'padding', 'ltr', false),
  ).toEqual({
    left: 17,
    right: 0,
    top: 0,
    bottom: 0,
  });
  expect(
    backendEdges(tree.getByTestId('styled-inline').props.style, 'margin', 'ltr', false),
  ).toEqual({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  });
  expect(diagnostics).toEqual([]);
});

test('theme callbacks and variants see original styled-root attributes and composed classes', () => {
  const originalCase = original.observations.find((test) => test.input.kind === 'root-props');
  if (!originalCase || !('rootArguments' in originalCase))
    throw Error('Missing original root argument case');
  const seen: unknown[] = [];
  const className = 'MuiFormGroup-root custom MuiFormGroup-row Mui-error authored';
  const theme = createTheme({
    components: {
      MuiFormGroup: {
        styleOverrides: {
          root: (props) => {
            seen.push({
              className: props.className,
              id: props.id,
              rowPresent: Object.hasOwn(props, 'row'),
              errorPresent: Object.hasOwn(props, 'error'),
            });
            return {};
          },
        },
        variants: [{ props: { className }, style: { opacity: 0.4 } }],
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <FormControl error>
        <FormGroup
          id="form-group-reference"
          testID="root-arguments"
          row
          className="authored"
          classes={{ root: 'custom' }}
        />
      </FormControl>
    </ThemeProvider>,
  );
  expect(seen).toContainEqual(originalCase.rootArguments);
  expect(tree.getByTestId('root-arguments')).toHaveStyle({ opacity: 0.4 });
});
