import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import React, { useContext, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, type ViewInstance, type ViewProps } from 'react-native';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import {
  Button,
  ButtonBase,
  ButtonGroup,
  ButtonGroupContext,
  ButtonGroupButtonContext,
  ThemeProvider,
  createTheme,
  configureDiagnostics,
  getButtonGroupUtilityClass,
  type ButtonGroupProps,
} from '../packages/material/src';
import reference from './fixtures/mui-button-group-9.5.0.json';

afterEach(cleanup);
const contracts = (reference as Record<string, any>).contracts;
const normalized = (value: unknown) => JSON.parse(JSON.stringify(value));
const style = (base: ReturnType<ReturnType<typeof render>['UNSAFE_getByType']>, focused = false) =>
  StyleSheet.flatten(base.props.style({ pressed: false, focusVisible: focused }));

test('recursive typed slot callbacks retain arguments through variant style callbacks', () => {
  const sameArgs: boolean[] = [];
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: {
          grouped: (first) => (second) => {
            sameArgs.push(first === second);
            return {
              variants: [
                {
                  props: { variant: 'outlined' },
                  style: (first) => (second) => {
                    sameArgs.push(first === second);
                    return { minWidth: 84 };
                  },
                },
              ],
            };
          },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <ButtonGroup>
        <Button>A</Button>
      </ButtonGroup>
    </ThemeProvider>,
  );
  expect(style(tree.UNSAFE_getByType(ButtonBase)).minWidth).toBe(84);
  expect(sameArgs.length).toBeGreaterThan(0);
  expect(sameArgs.every(Boolean)).toBe(true);
});

test('named slot embedded variants are processed before descendant scoping', () => {
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: {
          grouped: { variants: [{ props: { variant: 'outlined' }, style: { minWidth: 81 } }] },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <ButtonGroup>
        <Button>A</Button>
      </ButtonGroup>
    </ThemeProvider>,
  );
  expect(style(tree.UNSAFE_getByType(ButtonBase)).minWidth).toBe(
    parseFloat(contracts.slotVariants[0].buttons[0].computed.minWidth),
  );
});

test('named slot arrays and callback variants preserve original arguments and slot ordering', () => {
  const args: Record<string, any> = {};
  const variantArgs = (value: Record<string, any>) => ({
    role: value.role,
    size: value.size,
    ownerSize: value.ownerState.size,
    primary: value.theme.palette.primary.main,
  });
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: {
          root: { minWidth: 149 },
          grouped: [
            {
              minWidth: 51,
              variants: [{ props: { variant: 'outlined' }, style: { minWidth: 81 } }],
            },
            nativeStyleCallback((value) => {
              args.override = { role: value.role, size: value.ownerState.size };
              return {
                variants: [
                  {
                    props: (value) => {
                      args.predicate = variantArgs(value);
                      return value.size === 'large' && value.role === 'toolbar';
                    },
                    style: (value) => {
                      args.style = variantArgs(value);
                      return [{ minWidth: 82 }, { opacity: 0.6 }];
                    },
                  },
                ],
              };
            }),
          ],
          firstButton: () => [
            { variants: [{ props: { size: 'large' }, style: { minWidth: 92 } }] },
          ],
          middleButton: [
            { variants: [{ props: { variant: 'outlined' }, style: () => [{ minWidth: 87 }] }] },
          ],
          lastButton: () => ({
            variants: [{ props: { role: 'toolbar' }, style: [{ minWidth: 95 }] }],
          }),
        },
      },
    },
  });
  const diagnostics: string[] = [];
  const restore = configureDiagnostics((entry) => diagnostics.push(entry.code));
  try {
    const tree = render(
      <ThemeProvider theme={theme}>
        <ButtonGroup testID="slots" role="toolbar" size="large">
          <Button>A</Button>
          <Button>B</Button>
          <Button>C</Button>
        </ButtonGroup>
      </ThemeProvider>,
    );
    const expected = contracts.slotVariants[1];
    expect(normalized(args)).toEqual(expected.args);
    expect(StyleSheet.flatten(tree.getByTestId('slots').props.style).minWidth).toBe(
      parseFloat(expected.root.computed.minWidth),
    );
    for (const [index, base] of tree.UNSAFE_getAllByType(ButtonBase).entries()) {
      const actual = style(base);
      expect(actual.minWidth).toBe(parseFloat(expected.buttons[index].computed.minWidth));
      expect(actual.opacity).toBe(parseFloat(expected.buttons[index].computed.opacity));
    }
    expect(diagnostics).toEqual([]);
  } finally {
    restore();
  }
});

test('all original global state utility names retain the Mui prefix', () => {
  for (const [slot, expected] of Object.entries(contracts.utilityClasses))
    expect(getButtonGroupUtilityClass(slot)).toBe(expected);
});

test('custom roots receive source-facing props and native refs without styled internals', () => {
  let received: Record<string, any> = {};
  const instance = {} as ViewInstance;
  const Custom = React.forwardRef<ViewInstance, ViewProps & { title: string }>(
    function Custom(props, ref) {
      received = props;
      useImperativeHandle(ref, () => instance, []);
      return <View {...props} />;
    },
  );
  const first = React.createRef<ViewInstance>();
  const callbacks: string[] = [];
  const next: React.RefCallback<ViewInstance> = (node) => {
    expect(node).toBe(instance);
    callbacks.push('attach');
    return () => {
      callbacks.push('cleanup');
    };
  };
  const group = (ref: React.Ref<ViewInstance>) => (
    <ButtonGroup
      component={Custom}
      ref={ref}
      title="reviewable"
      role="toolbar"
      id="custom-group"
      sx={{ minWidth: 83 }}
    >
      <View />
    </ButtonGroup>
  );
  const tree = render(group(first));
  expect(first.current).toBe(instance);
  expect(received.role).toBe(contracts.customRoot.role);
  expect(received.title).toBe(contracts.customRoot.title);
  expect(received.nativeID).toBe(contracts.customRoot.id);
  expect(Object.hasOwn(received, 'ownerState')).toBe(contracts.customRoot.ownerState);
  expect(Object.hasOwn(received, 'sx')).toBe(contracts.customRoot.sx);
  expect(received.className.split(/\s+/)).toEqual(contracts.customRoot.root.classes);
  expect(StyleSheet.flatten(received.style).minWidth).toBe(
    parseFloat(contracts.customRoot.root.computed.minWidth),
  );
  tree.rerender(group(next));
  expect(first.current).toBeNull();
  expect(callbacks).toEqual(['attach']);
  tree.unmount();
  expect(callbacks).toEqual(['attach', 'cleanup']);
});

test('nested group roots consume outer selectors and children retain their nearest defaults', () => {
  const contexts: any[] = [];
  function Probe({ index }: { index: number }) {
    contexts[index] = {
      ...useContext(ButtonGroupContext),
      position: useContext(ButtonGroupButtonContext),
    };
    return <Button>{index}</Button>;
  }
  const tree = render(
    <ButtonGroup
      color="secondary"
      sx={{
        '& .MuiButtonGroup-root.MuiButtonGroup-text': { minWidth: 93 },
        '& .MuiButtonGroup-grouped.MuiButtonGroup-firstButton': { minWidth: 97 },
      }}
    >
      <ButtonGroup color="error" variant="text" testID="nested" sx={{ minWidth: 29 }}>
        <Probe index={0} />
        <Probe index={1} />
      </ButtonGroup>
    </ButtonGroup>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('nested').props.style).minWidth).toBe(
    parseFloat(contracts.nested.root.computed.minWidth),
  );
  expect(normalized(contexts)).toEqual(contracts.nested.contexts);
  for (const [index, base] of tree.UNSAFE_getAllByType(ButtonBase).entries())
    expect(style(base).minWidth).toBe(
      parseFloat(contracts.nested.buttons[index].computed.minWidth),
    );
});

test('same-instance prop updates refresh contexts, positions, layout and descendant styles', () => {
  let contexts: any[] = [];
  const mounts: object[] = [];
  function Probe({ index }: { index: number }) {
    const identity = useRef({});
    mounts[index] = identity.current;
    contexts[index] = {
      ...useContext(ButtonGroupContext),
      position: useContext(ButtonGroupButtonContext),
    };
    return <Button>{index}</Button>;
  }
  const group = ({ count, ...props }: ButtonGroupProps & { count: number }) => (
    <ButtonGroup {...props} testID="live">
      {Array.from({ length: count }, (_, index) => (
        <Probe key={index} index={index} />
      ))}
    </ButtonGroup>
  );
  const tree = render(group(contracts.live[0].props));
  const firstIdentity = mounts[0];
  for (const [index, expected] of contracts.live.entries()) {
    if (index) {
      contexts = [];
      tree.rerender(group(expected.props));
    }
    expect(mounts[0]).toBe(firstIdentity);
    expect(normalized(contexts)).toEqual(expected.contexts);
    expect(StyleSheet.flatten(tree.getByTestId('live').props.style).flexDirection).toBe(
      expected.root.computed.flexDirection,
    );
    const buttons = tree.UNSAFE_getAllByType(ButtonBase);
    expect(buttons).toHaveLength(expected.buttons.length);
    for (const [buttonIndex, base] of buttons.entries()) {
      const actual = style(base);
      const computed = expected.buttons[buttonIndex].computed;
      expect(actual.minWidth).toBe(parseFloat(computed.minWidth));
      expect(actual.marginLeft ?? 0).toBe(parseFloat(computed.marginLeft));
      expect(actual.marginTop ?? 0).toBe(parseFloat(computed.marginTop));
      for (const corner of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'] as const)
        expect(actual[`border${corner}Radius`] ?? actual.borderRadius ?? 0).toBe(
          parseFloat(computed[`border${corner}Radius`]),
        );
    }
  }
});

test('top-level theme variants and callbacks receive original root props, owner state and theme', () => {
  const args: Record<string, any> = {};
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: {
          root: nativeStyleCallback((value) => {
            args.override = {
              role: value.role,
              marker: value['data-callback'],
              as: value.as,
              variant: value.ownerState.variant,
              orientation: value.ownerState.orientation,
              color: value.ownerState.color,
            };
            return { minWidth: 53 };
          }),
        },
        variants: [
          { props: { role: 'toolbar' }, style: { minWidth: 61 } },
          {
            props: nativeStyleCallback((value) => {
              args.predicate = {
                role: value.role,
                orientation: value.orientation,
                ownerOrientation: value.ownerState.orientation,
                primary: value.theme.palette.primary.main,
              };
              return value.orientation === 'vertical' && value.role === 'toolbar';
            }),
            style: nativeStyleCallback((value) => {
              args.style = {
                role: value.role,
                orientation: value.orientation,
                ownerOrientation: value.ownerState.orientation,
                primary: value.theme.palette.primary.main,
              };
              return { minHeight: 37 };
            }),
          },
        ],
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <ButtonGroup
        testID="callbacks"
        role="toolbar"
        variant="text"
        orientation="vertical"
        color="secondary"
        data-callback="present"
        sx={(value) => {
          const radius = value.shape.borderRadius;
          if (typeof radius !== 'number')
            throw new Error('This original callback fixture uses the numeric default radius.');
          args.sxRadius = radius;
          return { maxWidth: radius * 26 };
        }}
      />
    </ThemeProvider>,
  );
  expect(normalized(args)).toEqual(contracts.callbacks.args);
  const actual = StyleSheet.flatten(tree.getByTestId('callbacks').props.style);
  for (const key of ['minWidth', 'minHeight', 'maxWidth'] as const)
    expect(actual[key]).toBe(parseFloat(contracts.callbacks.root.computed[key]));
});

test.each([0, 1, 2, 3, 4, 5, 6])(
  'group focus and custom elevation follow original theme case %i',
  (index) => {
    const expected = contracts.focus[index];
    const { focusVisible, ...props } = expected.input;
    const initial = createTheme();
    const shadows = [...initial.shadows] as typeof initial.shadows;
    shadows[2] = expected.shadow;
    const theme = createTheme({ focusVisible, shadows });
    const tree = render(
      <ThemeProvider theme={theme}>
        <ButtonGroup {...props} testID="focus">
          <Button>A</Button>
          <Button>B</Button>
        </ButtonGroup>
      </ThemeProvider>,
    );
    const rootStyle = StyleSheet.flatten(tree.getByTestId('focus').props.style);
    if (props.variant === 'contained')
      expect(rootStyle.boxShadow).toBe(props.disableElevation ? 'none' : expected.shadow);
    const buttons = tree.UNSAFE_getAllByType(ButtonBase);
    for (const [buttonIndex, base] of buttons.entries()) {
      const actual = style(base, buttonIndex === 0);
      const computed = expected.buttons[buttonIndex].computed;
      expect(actual.zIndex ?? 'auto').toBe(
        computed.zIndex === 'auto' ? 'auto' : Number(computed.zIndex),
      );
      if (props.variant === 'contained') {
        expect(actual.elevation ?? 0).toBe(0);
        expect(actual.boxShadow).toBe(
          buttonIndex !== 0
            ? 'none'
            : focusVisible
              ? (focusVisible.boxShadow ?? 'none')
              : expected.focusShadow,
        );
      }
    }
    if (props.variant === 'contained') {
      fireEvent(buttons[1], 'hoverIn', {});
      expect(style(tree.UNSAFE_getAllByType(ButtonBase)[1]).boxShadow).toBe('none');
    }
  },
);
