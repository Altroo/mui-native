// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { useContext } from 'react';
import { StyleSheet, processColor } from 'react-native';
import { render, cleanup, fireEvent } from '@testing-library/react-native';
import {
  ButtonGroup,
  Button,
  ButtonBase,
  ButtonGroupContext,
  ButtonGroupButtonContext,
  ThemeProvider,
  createTheme,
  buttonGroupClasses,
  getButtonGroupUtilityClass,
  configureDiagnostics,
  type ThemeOptions,
} from '../packages/material/src';
import { resolveSx, NativeTextStyleContext, RtlProvider } from '../packages/system/src';
import reference from './fixtures/mui-button-group-9.5.0.json';
afterEach(cleanup);
const authored = ({ $undefined = [], ...props }: Record<string, any> = {}) => {
  for (const key of $undefined) props[key] = undefined;
  return props;
};
const normalized = (value: unknown) => JSON.parse(JSON.stringify(value));
const color = (value: any) => processColor(value);
test('original ButtonGroup utility identifiers are exported without invented slots', () => {
  expect(buttonGroupClasses).toEqual(reference.classes);
  expect(getButtonGroupUtilityClass('disabled')).toBe('Mui-disabled');
  expect(getButtonGroupUtilityClass('custom')).toBe('MuiButtonGroup-custom');
});
test.each(reference.fixtures)('original ButtonGroup contract: $input.name', (fixture) => {
  const input = fixture.input as Record<string, any>,
    contexts: any[] = [],
    owners: any[] = [];
  function Probe({ index, ...props }: Record<string, any>) {
    contexts[index] = {
      ...useContext(ButtonGroupContext),
      position: useContext(ButtonGroupButtonContext),
    };
    return (
      <Button {...props} testID={'button-' + index}>
        {'Action ' + (index + 1)}
      </Button>
    );
  }
  const options: ThemeOptions = {
    ...input.theme,
    components: {
      ...input.theme?.components,
      MuiButton: {
        ...input.theme?.components?.MuiButton,
        styleOverrides: {
          root: ({ ownerState }) => {
            owners[Number(String(ownerState.testID).split('-')[1])] = ownerState;
            return {};
          },
        },
      },
    },
  };
  const theme = createTheme(options);
  const buttons = (input.buttons ?? [{}, {}, {}]).map((props: any, index: number) => (
    <Probe {...authored(props)} index={index} key={index} />
  ));
  const children =
    input.shape === 'filtered'
      ? [null, 'ignored', false, buttons[0], 17, buttons[1]]
      : input.shape === 'fragment'
        ? [
            <React.Fragment key="fragment">
              {buttons[0]}
              {buttons[1]}
            </React.Fragment>,
            buttons[2],
          ]
        : buttons;
  const tree = render(
    <ThemeProvider theme={theme}>
      {/* This original probe used an LTR DOM/cache, even for theme.direction=rtl.
          Configured RTL comparisons have their own independently pinned probe. */}
      <RtlProvider value={false}>
        {/* Match the reference document's inherited body color and 16px root. */}
        <NativeTextStyleContext.Provider
          value={{ style: { color: '#000', fontSize: 16 }, nativeText: false }}
        >
          <ButtonGroup {...input.props} testID="group">
            {children}
          </ButtonGroup>
        </NativeTextStyleContext.Provider>
      </RtlProvider>
    </ThemeProvider>,
  );
  if (typeof input.hoverIndex === 'number')
    fireEvent(tree.UNSAFE_getAllByType(ButtonBase)[input.hoverIndex], 'hoverIn', {});
  expect(normalized(contexts)).toEqual(fixture.contexts);
  const root = StyleSheet.flatten(tree.getByTestId('group').props.style);
  if (input.name === 'root selector')
    expect(root.minWidth).toBe(parseFloat(fixture.root.computed.minWidth));
  expect(root.flexDirection).toBe(fixture.root.computed.flexDirection);
  expect(root.borderRadius).toBe(parseFloat(fixture.root.computed.borderTopLeftRadius));
  const bases = tree.UNSAFE_queryAllByType(ButtonBase);
  expect(bases).toHaveLength(fixture.buttons.length);
  for (const [index, expected] of fixture.buttons.entries()) {
    const base = bases[index].props,
      style = StyleSheet.flatten(base.style({ pressed: false, focusVisible: false }));
    expect(base.disabled).toBe(expected.disabled);
    expect(tree.getByTestId('button-' + index).props.pointerEvents ?? 'auto').toBe(
      expected.computed.pointerEvents,
    );
    expect(owners[index].variant).toBe(input.buttons?.[index]?.variant ?? contexts[index].variant);
    expect(style.minWidth).toBe(parseFloat(expected.computed.minWidth));
    expect(style.opacity ?? 1).toBe(parseFloat(expected.computed.opacity));
    for (const edge of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'] as const)
      expect(style[`border${edge}Radius`] ?? style.borderRadius ?? 0).toBe(
        parseFloat(expected.computed[`border${edge}Radius`]),
      );
    for (const key of ['marginLeft', 'marginTop'] as const)
      expect(style[key] ?? 0).toBe(parseFloat(expected.computed[key]));
    for (const edge of ['Top', 'Right', 'Bottom', 'Left'] as const) {
      const width = style[`border${edge}Width`] ?? style.borderWidth ?? 0;
      expect(width).toBe(parseFloat(expected.computed[`border${edge}Width`]));
      if (width > 0)
        expect(color(style[`border${edge}Color`] ?? style.borderColor ?? style.color)).toEqual(
          color(expected.computed[`border${edge}Color`]),
        );
    }
    expect(color(style.color)).toEqual(color(expected.computed.color));
    expect(color(style.backgroundColor)).toEqual(color(expected.computed.backgroundColor));
  }
});
test('scoped descendant specificity and CSS border shorthands preserve ordered edges', () => {
  const theme = createTheme();
  expect(resolveSx([{ borderRightColor: 'red' }, { borderColor: 'blue' }], theme)).toEqual({
    borderColor: 'blue',
  });
  expect(resolveSx([{ borderColor: 'blue' }, { borderRightColor: 'red' }], theme)).toEqual({
    borderColor: 'blue',
    borderRightColor: 'red',
  });
  const rules = {
    p: 9,
    '& .MuiButtonGroup-grouped, & .MuiButtonGroup-firstButton': {
      minWidth: 40,
      '&.Mui-disabled': { opacity: 0.4 },
    },
    '& .MuiButtonGroup-grouped.Mui-disabled': { minWidth: 57 },
  };
  expect(
    resolveSx(rules, theme, {
      descendantOnly: true,
      descendantClasses: ['MuiButtonGroup-grouped', 'Mui-disabled'],
      states: ['disabled'],
    }),
  ).toEqual({ minWidth: 57, opacity: 0.4 });
  expect(resolveSx(rules, theme)).toMatchObject({ padding: 72 });
});
test('generated group classes do not produce unsupported-class diagnostics', () => {
  const messages: string[] = [];
  const restore = configureDiagnostics((entry) => messages.push(entry.code));
  try {
    render(
      <ButtonGroup>
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>,
    );
    expect(messages).toEqual([]);
  } finally {
    restore();
  }
});

// Source CSS still blocks pointer targeting when the group supplies Mui-disabled,
// even when an individual child explicitly keeps its disabled property false.
test('a reenabled child retains its prop semantics but rejects inherited disabled pointer targeting', () => {
  const tree = render(
    <ButtonGroup disabled>
      <Button disabled={false} testID="enabled-child">
        A
      </Button>
    </ButtonGroup>,
  );
  const base = tree.UNSAFE_getByType(ButtonBase).props;
  expect(base.disabled).toBe(false);
  expect(tree.getByTestId('enabled-child').props.pointerEvents).toBe('none');
});
test.each([
  ['fullWidth', { fullWidth: true }],
  ['disableElevation', { disableElevation: true }],
  ['loadingPositionStart', { loading: true, loadingPosition: 'start' }],
  ['authored-root', { classes: { root: 'authored-root' } }],
] as const)('group selectors recognize the complete Button root token %s', (name, props) => {
  const token = name === 'authored-root' ? name : 'MuiButton-' + name;
  const tree = render(
    <ButtonGroup sx={{ ['& .' + token]: { minWidth: 83 } }}>
      <Button {...props}>A</Button>
    </ButtonGroup>,
  );
  const base = tree.UNSAFE_getByType(ButtonBase).props;
  expect(StyleSheet.flatten(base.style({ pressed: false, focusVisible: false })).minWidth).toBe(83);
});
test('group root selectors recognize orientation and authored root classes', () => {
  const tree = render(
    <ButtonGroup
      orientation="vertical"
      classes={{ root: 'group-root' }}
      testID="root"
      sx={{ '&.MuiButtonGroup-vertical.group-root': { minWidth: 123 } }}
    >
      <Button>A</Button>
    </ButtonGroup>,
  );
  expect(StyleSheet.flatten(tree.getByTestId('root').props.style).minWidth).toBe(123);
});
test('later descendant shorthands reset grouped corners and dividers', () => {
  const tree = render(
    <ButtonGroup
      variant="text"
      sx={{ '& .MuiButtonGroup-grouped': { borderRadius: 2, border: 0 } }}
    >
      <Button>A</Button>
      <Button>B</Button>
    </ButtonGroup>,
  );
  for (const base of tree.UNSAFE_getAllByType(ButtonBase)) {
    const style = StyleSheet.flatten(base.props.style({ pressed: false, focusVisible: false }));
    for (const corner of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'] as const)
      expect(style['border' + corner + 'Radius'] ?? style.borderRadius).toBe(8);
    expect(style.borderRightWidth ?? style.borderWidth).toBe(0);
  }
});
test('outlined hover borders bind currentColor to the final authored foreground', () => {
  const tree = render(
    <ButtonGroup>
      <Button style={{ color: 'red' }}>A</Button>
      <Button>B</Button>
    </ButtonGroup>,
  );
  fireEvent(tree.UNSAFE_getAllByType(ButtonBase)[0], 'hoverIn', {});
  const base = tree.UNSAFE_getAllByType(ButtonBase)[0].props;
  const style = StyleSheet.flatten(base.style({ pressed: false, focusVisible: false }));
  expect(style.color).toBe('red');
  expect(style.borderRightColor).toBe('red');
});

test('finite group root selectors do not warn about supported authored identities', () => {
  const messages: string[] = [];
  const restore = configureDiagnostics((entry) => messages.push(entry.code));
  try {
    const tree = render(
      <ButtonGroup sx={{ '& .my-root.my-button': { minWidth: 89 } }}>
        <Button classes={{ root: 'my-root' }} className="my-button">
          A
        </Button>
      </ButtonGroup>,
    );
    const base = tree.UNSAFE_getByType(ButtonBase).props;
    expect(StyleSheet.flatten(base.style({ pressed: false, focusVisible: false })).minWidth).toBe(
      89,
    );
    expect(messages).toEqual([]);
  } finally {
    restore();
  }
});
test('numeric border shorthand resets old divider paint to the child foreground', () => {
  const theme = createTheme();
  const tree = render(
    <ButtonGroup variant="text" sx={{ '& .MuiButtonGroup-grouped': { border: 1 } }}>
      <Button color="error">A</Button>
      <Button>B</Button>
    </ButtonGroup>,
  );
  const style = StyleSheet.flatten(
    tree.UNSAFE_getAllByType(ButtonBase)[0].props.style({ pressed: false, focusVisible: false }),
  );
  expect(style.borderRightColor ?? style.borderColor).toBe(theme.palette.error.main);
  expect(style.borderRightWidth ?? style.borderWidth).toBe(1);
});

test('inline native shorthands replace grouped corners and divider edges', () => {
  const tree = render(
    <ButtonGroup variant="text">
      <Button style={{ borderRadius: 7, borderWidth: 0 }}>A</Button>
      <Button>B</Button>
    </ButtonGroup>,
  );
  const style = StyleSheet.flatten(
    tree.UNSAFE_getAllByType(ButtonBase)[0].props.style({ pressed: false, focusVisible: false }),
  );
  expect(style.borderTopRightRadius ?? style.borderRadius).toBe(7);
  expect(style.borderRightWidth ?? style.borderWidth).toBe(0);
});
