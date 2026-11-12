import { THEME_ID } from '../packages/material/src/themeProvider';
// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import { createRef, forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewInstance, type ViewProps } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import {
  CardActions,
  ThemeProvider,
  cardActionsClasses,
  createTheme,
  getCardActionsUtilityClass,
  styled,
  useTheme,
} from '@altroo/mui-native';
import { unstable_ClassNameGenerator } from '../packages/material/src/className';
import reference from './fixtures/mui-card-actions-9.5.0.json';

const Root = forwardRef<
  ViewInstance,
  ViewProps & { className?: string; ownerState?: { disableSpacing: boolean } }
>(({ className: _name, ownerState: _state, ...native }, ref) => <View {...native} ref={ref} />);

test.each(reference.observations)(
  'pinned root and spacing contract: $input.name',
  (observation) => {
    const { input } = observation;
    const accesses: string[] = [];
    const classes = {
      get root() {
        accesses.push('root');
        return 'own-root';
      },
      get spacing() {
        accesses.push('spacing');
        return 'own-spacing';
      },
    };
    let nativeOwner: unknown, nativeRootHasSpacing: boolean | undefined;
    const theme = createTheme({
      components: {
        MuiCardActions: {
          ...('defaults' in input ? { defaultProps: { disableSpacing: input.defaults } } : {}),
          styleOverrides: {
            root: nativeStyleCallback(({ ownerState, ...rootProps }) => {
              nativeOwner = ownerState.disableSpacing;
              nativeRootHasSpacing = Object.hasOwn(rootProps, 'disableSpacing');
              return { opacity: 0.8 };
            }),
            spacing: { paddingBottom: 9 },
          },
        },
      },
    });
    const spacing =
      input.prop === 'absent'
        ? {}
        : { disableSpacing: typeof input.prop === 'boolean' ? input.prop : undefined };
    if ('configured' in input) unstable_ClassNameGenerator.configure((name) => `Consumer${name}`);
    try {
      const tree = render(
        <ThemeProvider theme={theme}>
          <CardActions
            {...spacing}
            classes={classes}
            className="authored"
            component={Root}
            id="actions-probe"
            testID="actions"
          >
            <Text>Apply</Text>
            <Text>Cancel</Text>
          </CardActions>
        </ThemeProvider>,
      );
      const root = tree.UNSAFE_getByType(Root);
      expect(root.props.className).toBe(observation.className);
      expect(root.props.ownerState?.disableSpacing).toBe(observation.ownerDisableSpacing);
      expect(nativeOwner).toBe(observation.ownerDisableSpacing);
      expect(nativeRootHasSpacing).toBe(observation.rootHasDisableSpacing);
      expect(root.props.nativeID).toBe('actions-probe');
      expect(accesses).toEqual(observation.accesses);
      const style = StyleSheet.flatten(tree.getByTestId('actions').props.style);
      expect(style).toMatchObject({
        flexDirection: 'row',
        justifyContent: 'flex-start',
        columnGap: observation.siblingMargin ? 8 : 0,
        opacity: 0.8,
      });
      expect(style.paddingBottom ?? style.padding).toBe(observation.spacingOverride ? 9 : 8);
      expect(getCardActionsUtilityClass('root')).toBe(observation.liveRoot);
      expect(getCardActionsUtilityClass('disabled')).toBe(observation.globalState);
      expect(cardActionsClasses.root).toBe(observation.classMapRoot);
    } finally {
      unstable_ClassNameGenerator.reset();
    }
  },
);

test('styled class updates preserve a custom root, caller state and the native style layer', () => {
  const Styled = styled(CardActions)({
    '&.MuiCardActions-spacing': { opacity: 0.5 },
    '&.MuiCardActions-root': { paddingBottom: '12px' },
  });
  function Action() {
    const [count, setCount] = useState(0);
    return (
      <Pressable testID="action" onPress={() => setCount((value) => value + 1)}>
        <Text>Apply {count}</Text>
      </Pressable>
    );
  }
  const ref = createRef<ViewInstance>();
  const view = (disableSpacing: boolean) => (
    <Styled
      ref={ref}
      component={Root}
      disableSpacing={disableSpacing}
      testID="actions"
      style={{ paddingBottom: 14 }}
    >
      <Action />
    </Styled>
  );
  const tree = render(view(false));
  const initial = ref.current;
  expect(initial).not.toBeNull();
  fireEvent.press(tree.getByTestId('action'));
  expect(tree.getByText('Apply 1')).toBeTruthy();
  expect(tree.getByTestId('actions')).toHaveStyle({
    opacity: 0.5,
    paddingBottom: 14,
    columnGap: 8,
  });
  tree.rerender(view(true));
  expect(ref.current).toBe(initial);
  expect(tree.getByText('Apply 1')).toBeTruthy();
  expect(tree.getByTestId('actions')).toHaveStyle({ paddingBottom: 14, columnGap: 0 });
  expect(StyleSheet.flatten(tree.getByTestId('actions').props.style).opacity).toBeUndefined();
  tree.unmount();
  expect(ref.current).toBeNull();
});

test('retains native as precedence, authored owner state and an explicit empty id', () => {
  const Alternate = forwardRef<ViewInstance, ViewProps>((props, ref) => (
    <View {...props} ref={ref} />
  ));
  const LegacyRoot = forwardRef<
    ViewInstance,
    ViewProps & { as?: typeof Alternate; ownerState?: { disableSpacing: boolean } }
  >(({ as: _as, ownerState: _owner, ...native }, ref) => <View {...native} ref={ref} />);
  const oldProps = { as: Alternate, ownerState: { disableSpacing: true } };
  const tree = render(<CardActions {...oldProps} id="" nativeID="fallback" testID="route" />);
  expect(tree.UNSAFE_getByType(Alternate).props.nativeID).toBe('');
  expect(tree.UNSAFE_getByType(Alternate).props.ownerState.disableSpacing).toBe(true);
  tree.rerender(<CardActions {...oldProps} component={View} testID="route" />);
  expect(tree.UNSAFE_getByType(Alternate)).toBeTruthy();
  tree.rerender(<CardActions {...oldProps} component={LegacyRoot} testID="route" />);
  expect(tree.UNSAFE_getByType(Alternate)).toBeTruthy();
  expect(tree.UNSAFE_queryByType(LegacyRoot)).toBeNull();
  tree.rerender(<CardActions component={LegacyRoot} as={undefined} testID="route" />);
  expect(tree.UNSAFE_queryByType(LegacyRoot)).toBeNull();
  expect(tree.UNSAFE_queryByType(Alternate)).toBeNull();
  const stockProps = { ownerState: oldProps.ownerState };
  tree.rerender(<CardActions {...stockProps} testID="route" />);
  const stock = tree.getByTestId('route');
  expect(stock.props).not.toHaveProperty('ownerState');
  expect(stock.props).not.toHaveProperty('as');
  expect(stock.props).not.toHaveProperty('className');
});

test('retains both external and theme refs and native gap and padding precedence', () => {
  const external = createRef<ViewInstance>();
  const fromTheme = createRef<ViewInstance>();
  const theme = createTheme({
    components: {
      MuiCardActions: {
        defaultProps: {
          ref: (host: ViewInstance | null) => {
            fromTheme.current = host;
          },
        },
        styleOverrides: { root: { paddingBottom: '11px' } },
      },
    },
  });
  const view = (disableSpacing: boolean) => (
    <ThemeProvider theme={theme}>
      <CardActions
        ref={external}
        component={Root}
        testID="layers"
        disableSpacing={disableSpacing}
        style={[{ gap: 5, padding: 6 }, { gap: 7 }]}
      />
    </ThemeProvider>
  );
  const tree = render(view(false));
  const host = external.current;
  expect(host).not.toBeNull();
  expect(fromTheme.current).toBe(host);
  expect(tree.getByTestId('layers')).toHaveStyle({
    gap: 7,
    columnGap: 8,
    padding: 6,
    paddingBottom: 11,
  });
  tree.rerender(view(true));
  expect(external.current).toBe(host);
  expect(fromTheme.current).toBe(host);
  expect(tree.getByTestId('layers')).toHaveStyle({
    gap: 7,
    columnGap: 0,
    padding: 6,
    paddingBottom: 11,
  });
  tree.unmount();
  expect(external.current).toBeNull();
  expect(fromTheme.current).toBeNull();
});

test('initial class constants use configuration already present when the module loads', () => {
  jest.isolateModules(() => {
    const { unstable_ClassNameGenerator: generator } = jest.requireActual<
      typeof import('../packages/material/src/className')
    >('../packages/material/src/className');
    generator.configure((name) => `Early${name}`);
    try {
      const classes = jest.requireActual<
        typeof import('../packages/material/src/cardActionsClasses')
      >('../packages/material/src/cardActionsClasses');
      expect(classes.cardActionsClasses).toEqual({
        root: 'EarlyMuiCardActions-root',
        spacing: 'EarlyMuiCardActions-spacing',
      });
      expect(classes.getCardActionsUtilityClass('disabled')).toBe('Mui-disabled');
      generator.reset();
      expect(classes.getCardActionsUtilityClass('root')).toBe('MuiCardActions-root');
      expect(classes.cardActionsClasses.root).toBe('EarlyMuiCardActions-root');
    } finally {
      generator.reset();
    }
  });
});

test('preserves the legacy single-class root selector', () => {
  const tree = render(<CardActions testID="legacy" sx={{ '& .root': { opacity: 0.4 } }} />);
  expect(tree.getByTestId('legacy')).toHaveStyle({ opacity: 0.4 });
});

test('matches spacing variants through owner state and keeps sx and native style last', () => {
  const theme = createTheme({
    components: {
      MuiCardActions: {
        variants: [{ props: { disableSpacing: true }, style: { opacity: 0.4 } }],
      },
    },
  });
  const view = (spacing: boolean, opacity?: number, inline?: number) => (
    <ThemeProvider theme={theme}>
      <CardActions
        testID="variant"
        disableSpacing={spacing}
        sx={opacity === undefined ? undefined : { opacity }}
        style={inline === undefined ? undefined : { opacity: inline }}
      />
    </ThemeProvider>
  );
  const tree = render(view(false));
  expect(StyleSheet.flatten(tree.getByTestId('variant').props.style).opacity).toBeUndefined();
  tree.rerender(view(true));
  expect(tree.getByTestId('variant')).toHaveStyle({ opacity: 0.4 });
  tree.rerender(view(true, 0.6));
  expect(tree.getByTestId('variant')).toHaveStyle({ opacity: 0.6 });
  tree.rerender(view(true, 0.6, 0.8));
  expect(tree.getByTestId('variant')).toHaveStyle({ opacity: 0.8 });
});

test('the existing div component alias remains a native View', () => {
  const tree = render(
    <CardActions component="div" testID="alias">
      <Text>Share</Text>
    </CardActions>,
  );
  expect(tree.getByTestId('alias').type).toBe('View');
  expect(tree.getByTestId('alias')).toHaveStyle({ flexDirection: 'row', columnGap: 8 });
  expect(tree.UNSAFE_queryByType('div' as any)).toBeNull();
});

test.each(reference.reservedObservations.filter((item) => item.name.startsWith('owner-')))(
  'authored owner state $name selects styling without replacing class ownership',
  (observation) => {
    const disabled = observation.ownerDisableSpacing;
    const authored = observation.ownerHasDisableSpacing
      ? { disableSpacing: disabled ?? undefined, marker: 'caller' }
      : { marker: 'caller' };
    const Custom = forwardRef<
      ViewInstance,
      ViewProps & { ownerState?: typeof authored; className?: string }
    >(({ ownerState: _owner, className: _class, ...native }, ref) => (
      <View {...native} ref={ref} />
    ));
    let seen: unknown;
    const theme = createTheme({
      components: {
        MuiCardActions: {
          styleOverrides: {
            root: nativeStyleCallback(({ ownerState }) => {
              seen = ownerState;
              return { opacity: 0.6 };
            }),
            spacing: { paddingBottom: '13px' },
          },
        },
      },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <CardActions
          component={Custom}
          ownerState={authored}
          disableSpacing={!disabled}
          testID="authored-state"
        />
      </ThemeProvider>,
    );
    expect(seen).toBe(authored);
    expect(tree.UNSAFE_getByType(Custom).props.ownerState).toBe(authored);
    const classes = tree.UNSAFE_getByType(Custom).props.className.split(/\s+/);
    expect(classes.includes('MuiCardActions-spacing')).toBe(observation.spacingClass);
    expect(tree.getByTestId('authored-state')).toHaveStyle({
      columnGap: observation.siblingMargin ? 8 : 0,
    });
    const style = StyleSheet.flatten(tree.getByTestId('authored-state').props.style);
    expect(style.paddingBottom ?? style.padding).toBe(observation.spacingOverride ? 13 : 8);
  },
);

test.each(reference.reservedObservations.filter((item) => item.name.startsWith('theme-')))(
  'explicit native root $name styles locally while defaults and descendants retain provider context',
  (observation) => {
    let seen: unknown, sxTheme: unknown, descendantTheme: unknown, providerContext: unknown;
    const explicit = createTheme({
      shape: { borderRadius: 12 },
      components: {
        MuiCardActions: {
          defaultProps: { disableSpacing: true },
          styleOverrides: {
            root: nativeStyleCallback(({ theme }) => {
              seen = theme;
              return { opacity: 0.7 };
            }),
          },
        },
      },
    });
    const provider = createTheme({
      components: {
        MuiCardActions: {
          defaultProps: { disableSpacing: false },
          styleOverrides: { root: { opacity: 0.2 } },
        },
      },
    });
    const supplied =
      observation.name === 'theme-scoped' ? { ...provider, [THEME_ID]: explicit } : explicit;
    const Custom = forwardRef<
      ViewInstance,
      ViewProps & { theme?: typeof explicit; ownerState?: object; className?: string }
    >(({ theme: _theme, ownerState: _owner, className: _class, ...native }, ref) => (
      <View {...native} ref={ref} />
    ));
    function ProviderProbe() {
      providerContext = useTheme();
      return null;
    }
    function Descendant() {
      descendantTheme = useTheme();
      return <Text>Theme context</Text>;
    }
    const tree = render(
      <ThemeProvider theme={provider}>
        <ProviderProbe />
        <CardActions
          component={Custom}
          theme={supplied}
          testID="explicit-theme"
          sx={(theme) => {
            sxTheme = theme;
            return { paddingTop: '10px' };
          }}
        >
          <Descendant />
        </CardActions>
      </ThemeProvider>,
    );
    expect(seen).toBe(explicit);
    expect(sxTheme).toBe(explicit);
    expect((sxTheme as typeof explicit).shape.borderRadius).toBe(observation.sxThemeRadius);
    expect(descendantTheme).toBe(providerContext);
    expect(descendantTheme).not.toBe(explicit);
    expect(tree.getByTestId('explicit-theme')).toHaveStyle({
      opacity: 0.7,
      columnGap: 8,
      paddingTop: 10,
    });
    expect(tree.UNSAFE_getByType(Custom).props).not.toHaveProperty('theme');
  },
);

test.each(reference.nullableOwnerObservations)(
  'explicit $input owner state renders without overrides, preserving the original variant decision',
  (observation) => {
    const owner = observation.input === 'null' ? null : undefined;
    const NullableRoot = forwardRef<
      ViewInstance,
      ViewProps & { ownerState?: object | null | undefined; className?: string }
    >(({ ownerState: _owner, className: _class, ...native }, ref) => (
      <View {...native} ref={ref} />
    ));
    const tree = render(
      <ThemeProvider theme={createTheme()}>
        <CardActions component={NullableRoot} ownerState={owner} testID="nullable-owner" />
      </ThemeProvider>,
    );
    const root = tree.UNSAFE_getByType(NullableRoot);
    expect(root.props.ownerState).toBe(owner);
    expect(root.props.className.split(/\s+/).includes('MuiCardActions-spacing')).toBe(
      observation.spacingClass,
    );
    expect(tree.getByTestId('nullable-owner')).toHaveStyle({
      columnGap: observation.siblingMargin ? 8 : 0,
    });
  },
);

test.each(reference.ownerGetterObservations)(
  'selected-owner getter stages begin with $first',
  (observation) => {
    const trace: string[] = [];
    let reads = 0;
    const owner = {
      get disableSpacing() {
        const value = reads++ === 0 ? observation.first : !observation.first;
        trace.push('read:' + value);
        return value;
      },
    };
    const Custom = forwardRef<
      ViewInstance,
      ViewProps & { ownerState?: typeof owner; className?: string }
    >(({ ownerState: _owner, className: _class, ...native }, ref) => (
      <View {...native} ref={ref} />
    ));
    const theme = createTheme({
      components: {
        MuiCardActions: {
          styleOverrides: {
            root: () => {
              trace.push('root');
              return { opacity: 0.7 };
            },
            spacing: () => {
              trace.push('spacing');
              return { paddingBottom: '13px' };
            },
          },
        },
      },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <CardActions
          component={Custom}
          ownerState={owner}
          disableSpacing={false}
          testID="owner-getter"
        />
      </ThemeProvider>,
    );
    expect(trace).toEqual(observation.trace);
    expect(tree.getByTestId('owner-getter')).toHaveStyle({
      columnGap: observation.siblingMargin ? 8 : 0,
    });
    const style = StyleSheet.flatten(tree.getByTestId('owner-getter').props.style);
    expect(style.paddingBottom ?? style.padding).toBe(observation.spacingOverride ? 13 : 8);
  },
);
