// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewInstance, type ViewProps } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import {
  AccordionActions,
  ThemeProvider,
  accordionActionsClasses,
  createTheme,
  getAccordionActionsUtilityClass,
  styled,
} from '@altroo/mui-native';
import { unstable_ClassNameGenerator } from '../packages/material/src/className';
import reference from './fixtures/mui-accordion-actions-9.5.0.json';

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
        MuiAccordionActions: {
          ...('defaults' in input ? { defaultProps: { disableSpacing: input.defaults } } : {}),
          styleOverrides: {
            root: ({ ownerState, ...rootProps }) => {
              nativeOwner = ownerState.disableSpacing;
              nativeRootHasSpacing = Object.hasOwn(rootProps, 'disableSpacing');
              return { opacity: 0.8 };
            },
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
          <AccordionActions
            {...spacing}
            classes={classes}
            className="authored"
            component={Root}
            id="actions-probe"
            testID="actions"
          >
            <Text>Apply</Text>
            <Text>Cancel</Text>
          </AccordionActions>
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
        justifyContent: 'flex-end',
        columnGap: observation.siblingMargin ? 8 : 0,
        opacity: 0.8,
      });
      expect(style.paddingBottom ?? style.padding).toBe(observation.spacingOverride ? 9 : 8);
      expect(getAccordionActionsUtilityClass('root')).toBe(observation.liveRoot);
      expect(getAccordionActionsUtilityClass('disabled')).toBe(observation.globalState);
      expect(accordionActionsClasses.root).toBe(observation.classMapRoot);
    } finally {
      unstable_ClassNameGenerator.reset();
    }
  },
);

test('styled class updates preserve a custom root, caller state and the native style layer', () => {
  const Styled = styled(AccordionActions)({
    '&.MuiAccordionActions-spacing': { opacity: 0.5 },
    '&.MuiAccordionActions-root': { paddingBottom: '12px' },
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

test('retains native as routing, reserves owner state and honors an explicit empty id', () => {
  const Alternate = forwardRef<ViewInstance, ViewProps>((props, ref) => (
    <View {...props} ref={ref} />
  ));
  const LegacyRoot = forwardRef<
    ViewInstance,
    ViewProps & { as?: typeof Alternate; ownerState?: { disableSpacing: boolean } }
  >(({ as: _as, ownerState: _owner, ...native }, ref) => <View {...native} ref={ref} />);
  const oldProps = { as: Alternate, ownerState: { disableSpacing: true } };
  const tree = render(<AccordionActions {...oldProps} id="" nativeID="fallback" testID="route" />);
  expect(tree.UNSAFE_getByType(Alternate).props.nativeID).toBe('');
  expect(tree.UNSAFE_getByType(Alternate).props.ownerState.disableSpacing).toBe(false);
  tree.rerender(<AccordionActions {...oldProps} component={View} testID="route" />);
  expect(tree.UNSAFE_getByType(Alternate)).toBeTruthy();
  tree.rerender(<AccordionActions {...oldProps} component={LegacyRoot} testID="route" />);
  expect(tree.UNSAFE_queryByType(Alternate)).toBeNull();
  expect(tree.UNSAFE_getByType(LegacyRoot).props.as).toBe(Alternate);
  expect(tree.UNSAFE_getByType(LegacyRoot).props.ownerState.disableSpacing).toBe(false);
  const stockProps = { ownerState: oldProps.ownerState };
  tree.rerender(<AccordionActions {...stockProps} testID="route" />);
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
      MuiAccordionActions: {
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
      <AccordionActions
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
        typeof import('../packages/material/src/accordionClasses')
      >('../packages/material/src/accordionClasses');
      expect(classes.accordionActionsClasses).toEqual({
        root: 'EarlyMuiAccordionActions-root',
        spacing: 'EarlyMuiAccordionActions-spacing',
      });
      expect(classes.getAccordionActionsUtilityClass('disabled')).toBe('Mui-disabled');
      generator.reset();
      expect(classes.getAccordionActionsUtilityClass('root')).toBe('MuiAccordionActions-root');
      expect(classes.accordionActionsClasses.root).toBe('EarlyMuiAccordionActions-root');
    } finally {
      generator.reset();
    }
  });
});

test('preserves the legacy single-class root selector', () => {
  const tree = render(<AccordionActions testID="legacy" sx={{ '& .root': { opacity: 0.4 } }} />);
  expect(tree.getByTestId('legacy')).toHaveStyle({ opacity: 0.4 });
});

test('matches spacing variants through owner state and keeps sx and native style last', () => {
  const theme = createTheme({
    components: {
      MuiAccordionActions: {
        variants: [{ props: { disableSpacing: true }, style: { opacity: 0.4 } }],
      },
    },
  });
  const view = (spacing: boolean, opacity?: number, inline?: number) => (
    <ThemeProvider theme={theme}>
      <AccordionActions
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
