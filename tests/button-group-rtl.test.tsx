// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useState } from 'react';
import { I18nManager, Platform, StyleSheet, processColor } from 'react-native';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import {
  Box,
  Button,
  ButtonBase,
  ButtonGroup,
  ThemeProvider,
  createTheme,
  Typography,
} from '../packages/material/src';
import { RtlProvider, type NativeStyle } from '../packages/system/src';
import type { StyleProp } from 'react-native';
import original from './fixtures/mui-button-group-rtl-9.5.0.json';

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
const flat = (value: StyleProp<NativeStyle>) => StyleSheet.flatten(value) ?? {};
const actionStyle = (tree: ReturnType<typeof render>, index = 0) =>
  flat(
    tree
      .UNSAFE_getAllByType(ButtonBase)
      [index].props.style({ pressed: false, focusVisible: false }),
  );

test.each(['text', 'outlined', 'contained'] as const)(
  'RTL %s groups publish native ordering and mirror their horizontal joins',
  (variant) => {
    const tree = render(
      <ThemeProvider theme={createTheme({ direction: 'rtl' })}>
        <ButtonGroup testID="group" variant={variant}>
          <Button>First</Button>
          <Button>Last</Button>
        </ButtonGroup>
      </ThemeProvider>,
    );
    expect(flat(tree.getByTestId('group').props.style)).toMatchObject({
      direction: 'rtl',
      flexDirection: 'row',
    });
    const first = actionStyle(tree),
      last = actionStyle(tree, 1);
    expect(first.borderTopLeftRadius).toBe(0);
    expect(first.borderTopRightRadius ?? first.borderRadius).toBe(4);
    expect(last.borderTopRightRadius).toBe(0);
    expect(last.borderTopLeftRadius ?? last.borderRadius).toBe(4);
    if (variant === 'outlined') {
      expect(first.borderLeftColor).toBe('transparent');
      expect(last.marginRight).toBe(-1);
      expect(last.marginLeft ?? 0).toBe(0);
    } else {
      expect(first.borderLeftWidth).toBe(1);
      expect(first.borderRightWidth ?? first.borderWidth).toBe(0);
    }
  },
);

test('a stateful action and joined edges follow live theme direction changes', () => {
  function Counter() {
    const [count, setCount] = useState(0);
    return (
      <Button testID="counter" onClick={() => setCount((value) => value + 1)}>
        Count {count}
      </Button>
    );
  }
  const group = (direction: 'ltr' | 'rtl') => (
    <ThemeProvider theme={createTheme({ direction })}>
      <ButtonGroup testID="group">
        <Counter />
        <Button>Last</Button>
      </ButtonGroup>
    </ThemeProvider>
  );
  const tree = render(group('ltr'));
  fireEvent.press(tree.getByTestId('counter'));
  tree.rerender(group('rtl'));
  expect(tree.getByText('Count 1')).toBeTruthy();
  expect(actionStyle(tree).borderTopLeftRadius).toBe(0);
  expect(actionStyle(tree, 1).marginRight).toBe(-1);
  tree.rerender(group('ltr'));
  expect(tree.getByText('Count 1')).toBeTruthy();
  expect(actionStyle(tree).borderTopRightRadius).toBe(0);
  expect(actionStyle(tree, 1).marginLeft).toBe(-1);
});

test('explicit provider and native inline direction select geometry independently from theme tokens', () => {
  const tree = render(
    <ThemeProvider theme={createTheme({ direction: 'rtl' })}>
      <RtlProvider value={false}>
        <ButtonGroup testID="ltr">
          <Button>A</Button>
          <Button>B</Button>
        </ButtonGroup>
        <ButtonGroup testID="inline" sx={{ direction: 'ltr' }} style={{ direction: 'rtl' }}>
          <Button>C</Button>
          <Button>D</Button>
        </ButtonGroup>
      </RtlProvider>
    </ThemeProvider>,
  );
  expect(flat(tree.getByTestId('ltr').props.style).direction).toBe('ltr');
  expect(flat(tree.getByTestId('inline').props.style).direction).toBe('rtl');
  expect(actionStyle(tree).borderTopRightRadius).toBe(0);
  expect(actionStyle(tree, 2).borderTopLeftRadius).toBe(0);
});

test('inherited direction and start alignment use a participating physical parent scope', () => {
  const tree = render(
    <ThemeProvider theme={createTheme({ direction: 'ltr' })}>
      <Box sx={{ direction: 'rtl' }}>
        <ButtonGroup testID="inherit" style={{ direction: 'inherit' }}>
          <Button sx={{ textAlign: 'start' }}>A</Button>
          <Button>B</Button>
        </ButtonGroup>
        <Typography testID="start" sx={{ textAlign: 'start' }}>
          Start
        </Typography>
      </Box>
    </ThemeProvider>,
  );
  expect(flat(tree.getByTestId('inherit').props.style).direction).toBe('rtl');
  expect(actionStyle(tree).textAlign).toBe('right');
  expect(flat(tree.getByTestId('start').props.style).textAlign).toBe('right');
});

test('host RTL configuration is read without changing global native settings', () => {
  const flags = [I18nManager.isRTL, I18nManager.doLeftAndRightSwapInRTL];
  render(
    <RtlProvider>
      <ButtonGroup>
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>
    </RtlProvider>,
  );
  expect([I18nManager.isRTL, I18nManager.doLeftAndRightSwapInRTL]).toEqual(flags);
});

const hosts = [
  { isRTL: false, swap: false },
  { isRTL: false, swap: true },
  { isRTL: true, swap: false },
  { isRTL: true, swap: true },
];
function host(input: (typeof hosts)[number]) {
  jest.replaceProperty(I18nManager, 'isRTL', input.isRTL);
  jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', input.swap);
}
// React Native 0.88.1 YogaLayoutableShadowNode.cpp:957-1060 first
// logicalizes physical edges for a globally RTL tree. primitives.h:147-237
// then resolves physical-before-logical borders using each node's direction.
function painted(input: NativeStyle, parent: 'ltr' | 'rtl'): Record<string, unknown> {
  const value: Record<string, unknown> = { ...input };
  const direction =
    input.direction === 'rtl' || input.direction === 'ltr' ? input.direction : parent;
  const pairs = [
    ['borderTopLeftRadius', 'borderTopStartRadius'],
    ['borderTopRightRadius', 'borderTopEndRadius'],
    ['borderBottomLeftRadius', 'borderBottomStartRadius'],
    ['borderBottomRightRadius', 'borderBottomEndRadius'],
    ['borderLeftColor', 'borderStartColor'],
    ['borderRightColor', 'borderEndColor'],
    ['borderLeftWidth', 'borderStartWidth'],
    ['borderRightWidth', 'borderEndWidth'],
    ['marginLeft', 'marginStart'],
    ['marginRight', 'marginEnd'],
  ] as const;
  if (I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL)
    for (const [physical, logical] of pairs)
      if (Object.hasOwn(value, physical)) {
        value[logical] = value[physical];
        delete value[physical];
      }
  for (const [left, right, start, end] of [
    ['borderTopLeftRadius', 'borderTopRightRadius', 'borderTopStartRadius', 'borderTopEndRadius'],
    [
      'borderBottomLeftRadius',
      'borderBottomRightRadius',
      'borderBottomStartRadius',
      'borderBottomEndRadius',
    ],
    ['borderLeftColor', 'borderRightColor', 'borderStartColor', 'borderEndColor'],
    ['borderLeftWidth', 'borderRightWidth', 'borderStartWidth', 'borderEndWidth'],
    ['marginLeft', 'marginRight', 'marginStart', 'marginEnd'],
  ] as const) {
    const leading = value[direction === 'rtl' ? end : start];
    const trailing = value[direction === 'rtl' ? start : end];
    if (leading != null && (value[left] == null || left.startsWith('margin')))
      value[left] = leading;
    if (trailing != null && (value[right] == null || right.startsWith('margin')))
      value[right] = trailing;
  }
  return value;
}
// Android keeps a second, local-direction paint resolver. The pinned
// BorderRadiusStyle.kt:156-216, BorderColors.kt:65-135 and BorderInsets.kt:51-120
// prefer logical values and swap physical fallbacks in a local RTL view when
// left/right swapping is enabled, independently of the global app direction.
function androidPainted(input: NativeStyle, parent: 'ltr' | 'rtl'): Record<string, unknown> {
  const value: Record<string, unknown> = { ...input };
  const direction =
    input.direction === 'rtl' || input.direction === 'ltr' ? input.direction : parent;
  const globalSwap = I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL;
  if (globalSwap)
    for (const [physical, logical] of [
      ['borderTopLeftRadius', 'borderTopStartRadius'],
      ['borderTopRightRadius', 'borderTopEndRadius'],
      ['borderBottomLeftRadius', 'borderBottomStartRadius'],
      ['borderBottomRightRadius', 'borderBottomEndRadius'],
      ['borderLeftColor', 'borderStartColor'],
      ['borderRightColor', 'borderEndColor'],
    ] as const)
      if (Object.hasOwn(value, physical)) {
        value[logical] = value[physical];
        delete value[physical];
      }
  const rtl = direction === 'rtl';
  const swapPhysical = rtl && I18nManager.doLeftAndRightSwapInRTL;
  const result = painted(input, parent);
  for (const row of ['Top', 'Bottom'] as const)
    for (const side of ['Left', 'Right'] as const) {
      const logical = (side === 'Left') !== rtl ? 'Start' : 'End';
      const modernRow = row === 'Top' ? 'Start' : 'End';
      const physical = swapPhysical ? (side === 'Left' ? 'Right' : 'Left') : side;
      result[`border${row}${side}Radius`] =
        value[`border${modernRow}${logical}Radius`] ??
        value[`border${row}${logical}Radius`] ??
        value[`border${row}${physical}Radius`] ??
        value.borderRadius ??
        0;
    }
  for (const channel of ['Color', 'Width'] as const)
    for (const side of ['Left', 'Right'] as const) {
      const logical = (side === 'Left') !== rtl ? 'Start' : 'End';
      const physical = swapPhysical ? (side === 'Left' ? 'Right' : 'Left') : side;
      result[`border${side}${channel}`] =
        value[`border${logical}${channel}`] ??
        value[`border${physical}${channel}`] ??
        value[`border${channel}`] ??
        (channel === 'Width' ? 0 : 'black');
    }
  return result;
}

test.each(
  hosts.flatMap((native) =>
    (['ios', 'android'] as const).flatMap((platform) =>
      (['ltr', 'rtl'] as const).map((direction) => ({ native, platform, direction })),
    ),
  ),
)(
  'Group root inline shorthands replace computed physical and logical edges: %j',
  ({ native, platform, direction }) => {
    jest.replaceProperty(Platform, 'OS', platform);
    host(native);
    const style = Object.freeze({
      borderRadius: 7,
      borderWidth: 0,
      borderColor: 'purple',
      margin: 0,
    });
    const tree = render(
      <ThemeProvider theme={createTheme({ direction })}>
        <ButtonGroup
          testID="root-inline"
          sx={{ borderTopLeftRadius: 0, borderLeftWidth: 3, marginLeft: -1, marginTop: -2 }}
          style={style}
        >
          <Button>First</Button>
          <Button>Last</Button>
        </ButtonGroup>
      </ThemeProvider>,
    );
    const actual = (platform === 'android' ? androidPainted : painted)(
      flat(tree.getByTestId('root-inline').props.style),
      direction,
    );
    for (const corner of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'])
      expect(actual[`border${corner}Radius`] ?? actual.borderRadius).toBe(7);
    for (const edge of ['Top', 'Right', 'Bottom', 'Left']) {
      expect(actual[`border${edge}Width`] ?? actual.borderWidth).toBe(0);
      expect(actual[`border${edge}Color`] ?? actual.borderColor).toBe('purple');
      expect(actual[`margin${edge}`] ?? actual.margin).toBe(0);
    }
    expect(style).toEqual({ borderRadius: 7, borderWidth: 0, borderColor: 'purple', margin: 0 });
  },
);

test('Group root inline merging preserves authored identity and relative text metrics', () => {
  const style = Object.freeze({ borderRadius: 7, fontSize: 30, margin: 0 });
  const received: unknown[] = [];
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: {
          root: (args) => {
            received.push(args.style);
            return { borderTopLeftRadius: 0, marginLeft: -1 };
          },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <ButtonGroup style={style} sx={{ fontSize: 20, lineHeight: 2, letterSpacing: '0.1em' }}>
        <Typography testID="root-metrics" variant="inherit">
          Inherited metrics
        </Typography>
      </ButtonGroup>
    </ThemeProvider>,
  );
  expect(received.length).toBeGreaterThan(0);
  expect(received.every((entry) => entry === style)).toBe(true);
  expect(flat(tree.getByTestId('root-metrics').props.style)).toMatchObject({
    fontSize: 30,
    lineHeight: 60,
    letterSpacing: 3,
  });
});
const configurations = hosts.flatMap((native) =>
  (['ltr', 'rtl'] as const).flatMap((groupDirection) =>
    (['ltr', 'rtl'] as const).flatMap((childDirection) =>
      (['text', 'outlined', 'contained'] as const).map((variant) => ({
        native,
        groupDirection,
        childDirection,
        variant,
      })),
    ),
  ),
);
test.each(configurations)(
  'physical joins survive native host and opposite child direction: %j',
  ({ native, groupDirection, childDirection, variant }) => {
    host(native);
    const joined = groupDirection === 'rtl' ? 'Left' : 'Right';
    const leading = groupDirection === 'rtl' ? 'Right' : 'Left';
    const tree = render(
      <ThemeProvider theme={createTheme({ direction: groupDirection })}>
        <ButtonGroup variant={variant}>
          <Button
            sx={{ [`borderTop${leading}Radius`]: 9, textAlign: 'start' }}
            style={{ direction: childDirection }}
          >
            First
          </Button>
          <Button style={{ direction: childDirection }}>Last</Button>
        </ButtonGroup>
      </ThemeProvider>,
    );
    const first = painted(actionStyle(tree), groupDirection);
    const last = painted(actionStyle(tree, 1), groupDirection);
    expect(first[`borderTop${joined}Radius`]).toBe(0);
    expect(first[`borderTop${leading}Radius`]).toBe(9);
    expect(last[`borderTop${leading}Radius`]).toBe(0);
    expect(first.textAlign).toBe(childDirection === 'rtl' ? 'right' : 'left');
    if (variant === 'outlined') {
      expect(first[`border${joined}Color`]).toBe('transparent');
      expect(last[`margin${leading}`]).toBe(-1);
    } else expect(first[`border${joined}Width`]).toBe(1);
  },
);

test.each(configurations)(
  'Android backend paint keeps outer corners and joined borders physical: %j',
  ({ native, groupDirection, childDirection, variant }) => {
    jest.replaceProperty(Platform, 'OS', 'android');
    host(native);
    const joined = groupDirection === 'rtl' ? 'Left' : 'Right';
    const leading = groupDirection === 'rtl' ? 'Right' : 'Left';
    const tree = render(
      <ThemeProvider theme={createTheme({ direction: groupDirection })}>
        <ButtonGroup variant={variant}>
          <Button style={{ direction: childDirection }}>First</Button>
          <Button style={{ direction: childDirection }}>Last</Button>
        </ButtonGroup>
      </ThemeProvider>,
    );
    const roots = tree.getAllByRole('button');
    const first = androidPainted(flat(roots[0].props.style), groupDirection);
    const last = androidPainted(flat(roots[1].props.style), groupDirection);
    for (const row of ['Top', 'Bottom']) {
      expect(first[`border${row}${joined}Radius`]).toBe(0);
      expect(first[`border${row}${leading}Radius`]).toBe(4);
      expect(last[`border${row}${leading}Radius`]).toBe(0);
      expect(last[`border${row}${joined}Radius`]).toBe(4);
    }
    if (variant === 'outlined') {
      expect(first[`border${joined}Color`]).toBe('transparent');
      expect(last[`margin${leading}`]).toBe(-1);
    } else expect(first[`border${joined}Width`]).toBe(1);
  },
);

test.each(hosts)('Android native inline border shorthands clear protected paint: %j', (native) => {
  jest.replaceProperty(Platform, 'OS', 'android');
  host(native);
  const tree = render(
    <RtlProvider>
      <ButtonGroup variant="text">
        <Button style={{ borderRadius: 7, borderWidth: 0, borderColor: 'purple' }}>First</Button>
        <Button>Last</Button>
      </ButtonGroup>
    </RtlProvider>,
  );
  const style = androidPainted(actionStyle(tree), 'rtl');
  for (const corner of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'])
    expect(style[`border${corner}Radius`]).toBe(7);
  for (const side of ['Left', 'Right']) {
    expect(style[`border${side}Width`]).toBe(0);
    expect(style[`border${side}Color`]).toBe('purple');
  }
});

test.each(
  hosts.flatMap((native) =>
    (['ltr', 'rtl'] as const).flatMap((direction) =>
      (['Left', 'Start'] as const).map((side) => ({ native, direction, side })),
    ),
  ),
)(
  'Android native inline physical/logical edges retain backend precedence: %j',
  ({ native, direction, side }) => {
    jest.replaceProperty(Platform, 'OS', 'android');
    host(native);
    const tree = render(
      <RtlProvider>
        <ButtonGroup variant="text">
          <Button
            style={{
              direction,
              [`borderTop${side}Radius`]: 7,
              [`border${side}Width`]: 3,
              [`border${side}Color`]: 'purple',
            }}
          >
            First
          </Button>
          <Button>Last</Button>
        </ButtonGroup>
      </RtlProvider>,
    );
    const style = androidPainted(actionStyle(tree), 'rtl');
    const physical = direction === 'rtl' && (side === 'Start' || native.swap) ? 'Right' : 'Left';
    expect(style[`borderTop${physical}Radius`]).toBe(7);
    expect(style[`border${physical}Width`]).toBe(3);
    expect(style[`border${physical}Color`]).toBe('purple');
  },
);

test.each(hosts)('Android paint follows live direction and orientation changes: %j', (native) => {
  jest.replaceProperty(Platform, 'OS', 'android');
  host(native);
  const group = (direction: 'ltr' | 'rtl', orientation: 'horizontal' | 'vertical') => (
    <ThemeProvider theme={createTheme({ direction })}>
      <ButtonGroup orientation={orientation}>
        <Button>First</Button>
        <Button>Last</Button>
      </ButtonGroup>
    </ThemeProvider>
  );
  const tree = render(group('ltr', 'horizontal'));
  for (const [direction, orientation] of [
    ['rtl', 'horizontal'],
    ['rtl', 'vertical'],
    ['ltr', 'vertical'],
    ['ltr', 'horizontal'],
  ] as const) {
    tree.rerender(group(direction, orientation));
    const first = androidPainted(actionStyle(tree), direction);
    const last = androidPainted(actionStyle(tree, 1), direction);
    for (const row of ['Top', 'Bottom'])
      for (const side of ['Left', 'Right']) {
        const leading = direction === 'rtl' ? 'Right' : 'Left';
        expect(first[`border${row}${side}Radius`]).toBe(
          orientation === 'vertical' ? (row === 'Top' ? 4 : 0) : side === leading ? 4 : 0,
        );
        expect(last[`border${row}${side}Radius`]).toBe(
          orientation === 'vertical' ? (row === 'Bottom' ? 4 : 0) : side === leading ? 0 : 4,
        );
      }
  }
});

test.each(
  hosts.flatMap((native) =>
    (['ios', 'android'] as const).flatMap((platform) =>
      (['ltr', 'rtl'] as const).flatMap((direction) =>
        (['horizontal', 'vertical'] as const).flatMap((orientation) =>
          (['all', 'axis'] as const).map((reset) => ({
            native,
            platform,
            direction,
            orientation,
            reset,
          })),
        ),
      ),
    ),
  ),
)(
  'native inline margin reset replaces outlined overlap: %j',
  ({ native, platform, direction, orientation, reset }) => {
    jest.replaceProperty(Platform, 'OS', platform);
    host(native);
    const style =
      reset === 'all'
        ? { margin: 0 }
        : orientation === 'horizontal'
          ? { marginHorizontal: 0 }
          : { marginVertical: 0 };
    const tree = render(
      <ThemeProvider theme={createTheme({ direction })}>
        <ButtonGroup orientation={orientation}>
          <Button>First</Button>
          <Button style={style}>Last</Button>
        </ButtonGroup>
      </ThemeProvider>,
    );
    const value = (platform === 'android' ? androidPainted : painted)(
      flat(tree.getAllByRole('button')[1].props.style),
      direction,
    );
    const edge = orientation === 'vertical' ? 'Top' : direction === 'rtl' ? 'Right' : 'Left';
    expect(
      value[`margin${edge}`] ??
        value[orientation === 'vertical' ? 'marginVertical' : 'marginHorizontal'] ??
        value.margin ??
        0,
    ).toBe(0);
  },
);

test.each(hosts)(
  'native inline shorthand resets remain last with logical protected joins: %j',
  (native) => {
    host(native);
    const tree = render(
      <RtlProvider>
        <ButtonGroup variant="text">
          <Button style={{ borderRadius: 7, borderWidth: 0, borderColor: 'purple' }}>First</Button>
          <Button>Last</Button>
        </ButtonGroup>
      </RtlProvider>,
    );
    const style = painted(actionStyle(tree), 'rtl');
    for (const corner of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'])
      expect(style[`border${corner}Radius`] ?? style.borderRadius).toBe(7);
    for (const side of ['Left', 'Right']) {
      expect(style[`border${side}Width`] ?? style.borderWidth).toBe(0);
      expect(style[`border${side}Color`] ?? style.borderColor).toBe('purple');
    }
  },
);

test.each(hosts)(
  'logical native inline corners and edges override only their actual physical side: %j',
  (native) => {
    host(native);
    const tree = render(
      <RtlProvider>
        <ButtonGroup variant="text">
          <Button style={{ direction: 'ltr', borderTopStartRadius: 7, borderStartWidth: 0 }}>
            First
          </Button>
          <Button>Last</Button>
        </ButtonGroup>
      </RtlProvider>,
    );
    const style = painted(actionStyle(tree), 'rtl');
    expect(style.borderTopLeftRadius).toBe(7);
    expect(style.borderLeftWidth ?? style.borderWidth).toBe(0);
  },
);

test.each(hosts)(
  'physical native inline corners retain RN host semantics after protected CSS: %j',
  (native) => {
    host(native);
    const tree = render(
      <RtlProvider>
        <ButtonGroup>
          <Button style={{ borderTopLeftRadius: 7 }}>First</Button>
          <Button>Last</Button>
        </ButtonGroup>
      </RtlProvider>,
    );
    const style = painted(actionStyle(tree), 'rtl');
    expect(
      style[native.isRTL && native.swap ? 'borderTopRightRadius' : 'borderTopLeftRadius'],
    ).toBe(7);
  },
);

test('late geometry protection does not rewrite an unrelated standalone authored style', () => {
  host({ isRTL: true, swap: true });
  const tree = render(<Button sx={{ borderTopLeftRadius: 9 }}>Standalone</Button>);
  expect(actionStyle(tree).borderTopLeftRadius).toBe(9);
  expect(actionStyle(tree).borderTopStartRadius).toBeUndefined();
});

test('nested groups honor explicit provider boundaries and opt-in physical inheritance', () => {
  const tree = render(
    <ThemeProvider theme={createTheme({ direction: 'rtl' })}>
      <ButtonGroup orientation="vertical" style={{ direction: 'ltr' }}>
        <ButtonGroup testID="provider">
          <Button>A</Button>
          <Button>B</Button>
        </ButtonGroup>
        <ButtonGroup testID="inherited" style={{ direction: 'inherit' }}>
          <Button>C</Button>
          <Button>D</Button>
        </ButtonGroup>
        <RtlProvider value={false}>
          <ButtonGroup testID="false">
            <Button>E</Button>
            <Button>F</Button>
          </ButtonGroup>
        </RtlProvider>
      </ButtonGroup>
    </ThemeProvider>,
  );
  expect(flat(tree.getByTestId('provider').props.style).direction).toBe('rtl');
  expect(flat(tree.getByTestId('inherited').props.style).direction).toBe('ltr');
  expect(flat(tree.getByTestId('false').props.style).direction).toBe('ltr');
});

test.each(['text', 'outlined', 'contained'] as const)(
  'vertical %s joins retain their original top/bottom geometry',
  (variant) => {
    const group = (direction: 'ltr' | 'rtl') => (
      <ThemeProvider theme={createTheme({ direction })}>
        <ButtonGroup orientation="vertical" variant={variant}>
          <Button>A</Button>
          <Button>B</Button>
        </ButtonGroup>
      </ThemeProvider>
    );
    const tree = render(group('ltr'));
    const before = [actionStyle(tree), actionStyle(tree, 1)];
    tree.rerender(group('rtl'));
    const after = [actionStyle(tree), actionStyle(tree, 1)];
    for (let index = 0; index < 2; index++)
      for (const key of [
        'borderTopLeftRadius',
        'borderTopRightRadius',
        'borderBottomLeftRadius',
        'borderBottomRightRadius',
        'borderBottomWidth',
        'borderBottomColor',
        'marginTop',
      ] as const)
        expect(after[index][key]).toEqual(before[index][key]);
  },
);

test('RTL hover paint and disabled divider colors stay on the joined physical edge', () => {
  const tree = render(
    <RtlProvider>
      <ButtonGroup>
        <Button style={{ color: 'red' }}>A</Button>
        <Button>B</Button>
      </ButtonGroup>
    </RtlProvider>,
  );
  fireEvent(tree.UNSAFE_getAllByType(ButtonBase)[0], 'hoverIn', {});
  expect(actionStyle(tree).borderLeftColor).toBe('red');
  tree.rerender(
    <RtlProvider>
      <ButtonGroup variant="text" disabled>
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>
    </RtlProvider>,
  );
  expect(actionStyle(tree).borderLeftColor).toBe(createTheme().palette.action.disabled);
});

test('inherited logical text alignment resolves again after a nested native direction override', () => {
  const tree = render(
    <ThemeProvider theme={createTheme()}>
      <Box sx={{ direction: 'ltr', textAlign: 'start' }}>
        <Box sx={{ direction: 'rtl' }}>
          <Typography testID="logical">Inherited start</Typography>
        </Box>
        <Box sx={{ direction: 'rtl' }} style={{ textAlign: 'left' }}>
          <Typography testID="literal">Literal left</Typography>
        </Box>
      </Box>
    </ThemeProvider>,
  );
  expect(flat(tree.getByTestId('logical').props.style).textAlign).toBe('right');
  expect(flat(tree.getByTestId('literal').props.style).textAlign).toBe('left');
});

function expectOriginalGeometry(actual: Record<string, unknown>, expected: Record<string, string>) {
  for (const corner of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'] as const)
    expect(actual[`border${corner}Radius`] ?? actual.borderRadius).toBe(
      parseFloat(expected[`border${corner}Radius`]),
    );
  for (const edge of ['Left', 'Right', 'Bottom'] as const) {
    const width = actual[`border${edge}Width`] ?? actual.borderWidth ?? 0;
    expect(width).toBe(parseFloat(expected[`border${edge}Width`]));
    if (Number(width) > 0) {
      const color = actual[`border${edge}Color`] ?? actual.borderColor ?? actual.color;
      if (typeof color !== 'string')
        throw new Error('Pinned border colors must resolve to concrete strings.');
      expect(processColor(color)).toEqual(processColor(expected[`border${edge}Color`]));
    }
  }
  for (const margin of ['marginLeft', 'marginRight', 'marginTop'] as const)
    expect(
      actual[margin] ??
        actual[margin === 'marginTop' ? 'marginVertical' : 'marginHorizontal'] ??
        actual.margin ??
        0,
    ).toBe(parseFloat(expected[margin]));
}

test.each(
  original.fixtures
    .filter((fixture) => 'nativeDirection' in fixture.input)
    .flatMap((fixture) => (['ios', 'android'] as const).map((platform) => ({ fixture, platform }))),
)(
  'configured original RTL stylesheet and DOM comparison: $platform $fixture.input.name',
  ({ fixture, platform }) => {
    jest.replaceProperty(Platform, 'OS', platform);
    const input = fixture.input;
    const direction = input.nativeDirection === 'rtl' ? 'rtl' : 'ltr';
    const variant =
      input.variant === 'text' || input.variant === 'contained' ? input.variant : 'outlined';
    const orientation = input.orientation === 'vertical' ? 'vertical' : 'horizontal';
    const inlineDirection =
      input.style?.direction === 'ltr' || input.style?.direction === 'rtl'
        ? input.style.direction
        : input.style?.direction === 'inherit'
          ? 'inherit'
          : undefined;
    const tree = render(
      <ThemeProvider
        theme={createTheme({ direction: input.themeDirection === 'rtl' ? 'rtl' : 'ltr' })}
      >
        <Box sx={{ direction: input.domDirection }}>
          <ButtonGroup
            testID="reference-root"
            variant={variant}
            orientation={orientation}
            sx={input.sx}
            style={input.style ? { ...input.style, direction: inlineDirection } : undefined}
          >
            <Button style={input.childDirection === 'ltr' ? { direction: 'ltr' } : undefined}>
              First
            </Button>
            <Button style={input.nativeChildStyle}>Last</Button>
          </ButtonGroup>
        </Box>
      </ThemeProvider>,
    );
    expect(flat(tree.getByTestId('reference-root').props.style).direction).toBe(
      fixture.root.computed.direction,
    );
    expect(flat(tree.getByTestId('reference-root').props.style).flexDirection).toBe(
      fixture.root.computed.flexDirection,
    );
    if (orientation === 'horizontal')
      expect(fixture.buttons[0].rect.left > fixture.buttons[1].rect.left).toBe(direction === 'rtl');
    const paint = platform === 'android' ? androidPainted : painted;
    expectOriginalGeometry(
      paint(flat(tree.getByTestId('reference-root').props.style), direction),
      fixture.root.computed,
    );
    for (let index = 0; index < 2; index++) {
      expectOriginalGeometry(
        paint(actionStyle(tree, index), direction),
        fixture.buttons[index].computed,
      );
    }
  },
);

test.each(original.alignments)('original used logical alignment: %j', ({ input, inkSide }) => {
  const direction = input.direction === 'rtl' ? 'rtl' : 'ltr';
  const childDirection =
    input.childDirection === 'rtl' || input.childDirection === 'ltr'
      ? input.childDirection
      : direction;
  const text = (
    <Typography
      testID="aligned"
      style={{ direction: childDirection }}
      sx={{ width: 160, ...(input.inherited ? {} : { textAlign: input.align }) }}
    >
      Start
    </Typography>
  );
  const tree = render(
    <ThemeProvider theme={createTheme({ direction })}>
      <ButtonGroup>
        {input.inherited ? <Typography sx={{ textAlign: input.align }}>{text}</Typography> : text}
      </ButtonGroup>
    </ThemeProvider>,
  );
  expect(flat(tree.getByTestId('aligned').props.style).textAlign).toBe(inkSide);
});

test('original controls distinguish DOM direction, theme/provider context and RTL stylesheet processing', () => {
  const themeOnly = original.fixtures.find(
    (fixture) => fixture.input.name === 'theme-only negative control',
  )!;
  const domOnly = original.fixtures.find(
    (fixture) => fixture.input.name === 'DOM-only negative control',
  )!;
  const provider = original.fixtures.find(
    (fixture) => fixture.input.name === 'provider false does not change source CSS',
  )!;
  expect(themeOnly.root.computed.direction).toBe('ltr');
  expect(domOnly.root.computed.direction).toBe('rtl');
  expect(domOnly.buttons[0].computed.borderTopRightRadius).toBe('0px');
  expect(provider.root.computed.direction).toBe('rtl');
  expect(provider.buttons[0].computed.borderTopLeftRadius).toBe('0px');
});
