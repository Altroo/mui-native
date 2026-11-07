// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef } from 'react';
import { render, cleanup } from '@testing-library/react-native';
import { I18nManager, Platform, StyleSheet, Text, View } from 'react-native';
import {
  createTheme,
  resolveSx,
  styled,
  configureDiagnostics,
  nativeStyleBorderStyle,
  nativeStyleTextMetrics,
  applyNativeTextMetrics,
} from '../packages/system/src';
import { Box, Button, ButtonBase, ButtonGroup, ThemeProvider } from '../packages/material/src';
import {
  mergeNativeRootStyle,
  mergeNativeStyles,
} from '../packages/material/src/nativeControlStyles';
import { mergeNativeButtonStyle } from '../packages/material/src/buttonBase';

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
const theme = createTheme();
const flat = (style: unknown) => StyleSheet.flatten(style as any) ?? {};
function observed(input: Parameters<typeof resolveSx>[0]) {
  const diagnostics: unknown[] = [];
  const restore = configureDiagnostics((value) => diagnostics.push(value));
  try {
    return { style: resolveSx(input, theme), diagnostics };
  } finally {
    restore();
  }
}

test.each([
  ['3px solid red', 3, 'solid', 'red'],
  ['1.5px solid red', 1.5, 'solid', 'red'],
  ['.25em solid red', 4, 'solid', 'red'],
  ['red solid 3px', 3, 'solid', 'red'],
  ['thin dotted red', 1, 'dotted', 'red'],
  ['medium dashed red', 3, 'dashed', 'red'],
  ['thick solid red', 5, 'solid', 'red'],
  ['solid red', 3, 'solid', 'red'],
  ['0.25rem dashed rgba(10, 20, 30, 0.5)', 4, 'dashed', 'rgba(10, 20, 30, 0.5)'],
  ['2px dotted currentColor', 2, 'dotted', theme.palette.text.primary],
  [0, 0, 'solid', theme.palette.text.primary],
  [2, 2, 'solid', theme.palette.text.primary],
])(
  'bounded CSS border %p resolves without unsupported-property diagnostics',
  (border, width, style, color) => {
    const actual = observed({ border });
    expect(actual.style).toMatchObject({
      borderWidth: width,
      borderStyle: style,
      borderColor: color,
    });
    expect(actual.diagnostics).toEqual([]);
  },
);

test.each([false, true])(
  'the retained ButtonGroup shorthand respects a native reset=%p',
  (reset) => {
    const diagnostics: unknown[] = [];
    const restore = configureDiagnostics((value) => diagnostics.push(value));
    try {
      const tree = render(
        <ButtonGroup
          testID="border"
          sx={{ border: '3px solid red', borderLeftWidth: 5, borderLeftColor: 'blue' }}
          style={reset ? { borderWidth: 0, borderColor: 'purple' } : undefined}
        >
          <Button>Action</Button>
        </ButtonGroup>,
      );
      const native = flat(tree.getByTestId('border').props.style);
      expect(native).toMatchObject({
        borderWidth: reset ? 0 : 3,
        borderColor: reset ? 'purple' : 'red',
        borderStyle: 'solid',
      });
      if (reset) {
        expect(native.borderLeftWidth).toBeUndefined();
        expect(native.borderLeftColor).toBeUndefined();
      } else expect(native).toMatchObject({ borderLeftWidth: 5, borderLeftColor: 'blue' });
      expect(diagnostics).toEqual([]);
    } finally {
      restore();
    }
  },
);

test.each([
  NaN,
  Infinity,
  -1,
  '-1px solid red',
  '3 solid red',
  '1px double red',
  '1px solid red blue',
  'inherit',
  'calc(1px + 1px) solid red',
])('unsupported border %p remains diagnosed', (border) => {
  const actual = observed({ border });
  expect(actual.style).toEqual({});
  expect(actual.diagnostics).toHaveLength(1);
});

test('border shorthand resets earlier edges and currentColor binds after the full foreground cascade', () => {
  expect(
    resolveSx(
      [{ borderLeftWidth: 9, borderLeftColor: 'blue' }, { border: '3px solid red' }],
      theme,
    ),
  ).toEqual({ borderWidth: 3, borderColor: 'red', borderStyle: 'solid' });
  expect(resolveSx([{ border: '3px solid red' }, { borderLeftWidth: 9 }], theme)).toMatchObject({
    borderWidth: 3,
    borderLeftWidth: 9,
  });
  expect(
    resolveSx({ border: '2px solid currentColor', color: 'green' }, theme, {
      nativeStyle: { color: 'blue' },
    }).borderColor,
  ).toBe('blue');
});

test('CSS none changes only used paint, preserving declarations for later CSS solid', () => {
  const css = Object.freeze({ borderWidth: '4px', borderStyle: 'none' });
  const none = resolveSx(css, theme);
  expect(none).toMatchObject({ borderWidth: 0, borderStyle: 'solid' });
  expect(nativeStyleBorderStyle(none)).toBe('none');
  expect(resolveSx([css, { borderStyle: 'solid' }], theme)).toMatchObject({
    borderWidth: 4,
    borderStyle: 'solid',
  });
  expect(css).toEqual({ borderWidth: '4px', borderStyle: 'none' });
  expect(Reflect.ownKeys(none)).toEqual(Object.keys(none));
});

test.each(['root', 'button', 'control'] as const)(
  '%s composition retains CSS none across native widths and clears it only for an owned native style/reset',
  (kind) => {
    const merge = (computed: ReturnType<typeof resolveSx>, inline: any) =>
      kind === 'root'
        ? mergeNativeRootStyle('ltr', computed, inline)
        : kind === 'button'
          ? mergeNativeButtonStyle(computed, inline)
          : mergeNativeStyles('ltr', computed, inline);
    const none = resolveSx(
      { border: '4px solid red', borderStyle: 'none', borderLeftWidth: 7 },
      theme,
    );
    const widthOnly = merge(none, { borderWidth: 9 });
    expect(widthOnly.borderWidth).toBe(0);
    expect(nativeStyleBorderStyle(widthOnly)).toBe('none');
    for (const borderStyle of ['solid', undefined, null]) {
      const result = merge(none, { borderStyle });
      expect(result.borderWidth).toBe(4);
      expect(result.borderLeftWidth).toBe(7);
      expect(result.borderStyle).toBe(borderStyle);
      expect(nativeStyleBorderStyle(result)).not.toBe('none');
    }
    expect(merge(widthOnly, { borderStyle: 'dotted' })).toMatchObject({
      borderWidth: 9,
      borderStyle: 'dotted',
    });
  },
);

test('registered native style arrays preserve final style resets and authored data', () => {
  const registered = StyleSheet.create({
    width: { borderWidth: 8 },
    solid: { borderStyle: 'solid' as const },
  });
  const source = Object.freeze({ borderStyle: undefined });
  const none = resolveSx({ border: '4px solid red', borderStyle: 'none' }, theme);
  expect(
    mergeNativeRootStyle('ltr', none, [registered.width, registered.solid, source]),
  ).toMatchObject({ borderWidth: 8, borderStyle: undefined });
  expect(source).toEqual({ borderStyle: undefined });
});

test('Box, styled host, styled component and Button keep the complete CSS cascade before native paint', () => {
  const NoneBox = styled(Box)({ border: '4px solid red', borderStyle: 'none' });
  const SolidBox = styled(NoneBox)({ borderStyle: 'solid' });
  const NoneView = styled(View)({ border: '4px solid red', borderStyle: 'none' });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Box
        testID="box"
        sx={{ border: '4px solid red', borderStyle: 'none' }}
        style={{ borderWidth: 8 }}
      />
      <NoneView testID="host" style={{ borderWidth: 8 }} />
      <NoneBox testID="component" style={{ borderWidth: 8 }} />
      <SolidBox testID="solid" />
      <Button testID="button" sx={{ borderStyle: 'none' }} style={{ borderWidth: 8 }}>
        Action
      </Button>
    </ThemeProvider>,
  );
  for (const id of ['box', 'host', 'component', 'button'])
    expect(flat(tree.getByTestId(id).props.style).borderWidth).toBe(0);
  expect(flat(tree.getByTestId('solid').props.style)).toMatchObject({
    borderWidth: 4,
    borderStyle: 'solid',
  });
});

test('CSS none metadata survives relative text-metric normalization without leaking onto native values', () => {
  const none = resolveSx(
    { border: '0.5em solid red', borderStyle: 'none', fontSize: '20px', lineHeight: 1.5 },
    theme,
  );
  expect(none.borderWidth).toBe(0);
  expect(nativeStyleTextMetrics(none).lineHeight).toBe(1.5);
  const adjusted = applyNativeTextMetrics(none, none, nativeStyleTextMetrics(none))!;
  expect(nativeStyleBorderStyle(adjusted)).toBe('none');
  expect(mergeNativeRootStyle('ltr', adjusted, { borderStyle: 'solid' }).borderWidth).toBe(10);
});

const hosts = (['ios', 'android'] as const).flatMap((platform) =>
  [false, true].flatMap((isRTL) =>
    [false, true].flatMap((swap) =>
      ['ltr', 'rtl'].map((direction) => ({ platform, isRTL, swap, direction })),
    ),
  ),
);
test.each(hosts)(
  'all-edge none/restore follows existing protected geometry %j',
  ({ platform, isRTL, swap, direction }) => {
    jest.replaceProperty(Platform, 'OS', platform);
    jest.replaceProperty(I18nManager, 'isRTL', isRTL);
    jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', swap);
    const input = { border: '4px solid red', borderLeftWidth: 7, direction };
    const context = { protectPhysicalGeometry: true, parentDirection: direction as 'ltr' | 'rtl' };
    const solid = resolveSx(input, theme, context);
    const none = resolveSx({ ...input, borderStyle: 'none' }, theme, context);
    for (const [key, value] of Object.entries(none))
      if (/^border.*Width$/.test(key)) expect(value).toBe(0);
    expect(mergeNativeRootStyle(context.parentDirection, none, { borderStyle: 'solid' })).toEqual(
      solid,
    );
  },
);

test('owned decorative slots can inherit CSS none while native payloads stay valid', () => {
  const root = mergeNativeRootStyle(
    'ltr',
    resolveSx({ border: '4px solid red', borderStyle: 'none' }, theme),
    { borderWidth: 9 },
  );
  const line = resolveSx({ borderStyle: nativeStyleBorderStyle(root), borderTopWidth: 1 }, theme, {
    mode: 'css',
  });
  expect(line).toMatchObject({ borderWidth: 0, borderTopWidth: 0, borderStyle: 'solid' });
  expect(nativeStyleBorderStyle(line)).toBe('none');
});

test('literal shorthand colors cannot be redirected by same-named custom palette entries', () => {
  const custom = { ...theme, palette: { ...theme.palette, red: 'blue', currentColor: 'purple' } };
  expect(resolveSx({ border: '3px solid red' }, custom).borderColor).toBe('red');
  expect(resolveSx({ border: 2, color: 'green' }, custom).borderColor).toBe('green');
});

test('a genuine native invalid none value is not silently rewritten as supported CSS', () => {
  const authored = Object.freeze({ borderWidth: 4, borderStyle: 'none' });
  expect(mergeNativeRootStyle('ltr', {}, authored as any)).toEqual(authored);
  expect(mergeNativeButtonStyle({}, authored as any)).toEqual(authored);
});

test('an explicit native direction reset preserves CSS none through root matching', () => {
  const css = resolveSx({ border: '4px solid red', borderStyle: 'none', direction: 'rtl' }, theme);
  const used = mergeNativeRootStyle('ltr', css, { direction: undefined, borderWidth: 9 });
  expect(used).toMatchObject({ borderWidth: 0, borderStyle: 'solid', direction: undefined });
  expect(nativeStyleBorderStyle(used)).toBe('none');
  expect(mergeNativeRootStyle('ltr', used, { borderStyle: 'solid' })).toMatchObject({
    borderWidth: 9,
    borderStyle: 'solid',
  });
});

test.each(['3.px', '3.rem', '3.em', '0.'])(
  'invalid trailing-dot width %p preserves an earlier valid shorthand',
  (width) => {
    const actual = observed([{ border: '4px solid green' }, { border: `${width} solid red` }]);
    expect(actual.style).toEqual({ borderWidth: 4, borderColor: 'green', borderStyle: 'solid' });
    expect(actual.diagnostics).toHaveLength(1);
  },
);

const nativeForegroundCases = [undefined, null, 'blue'] as const;
test.each([false, true])(
  'currentColor follows the final text scope with inherited parent=%p',
  (parent) => {
    for (const color of nativeForegroundCases) {
      const child = (
        <Box
          testID="reset-border"
          sx={{ border: '2px solid currentColor', color: 'red' }}
          style={{ color: color as any }}
        >
          <Text testID="reset-child">Child</Text>
        </Box>
      );
      const tree = render(
        <ThemeProvider theme={theme}>
          {parent ? <Box sx={{ color: 'purple' }}>{child}</Box> : child}
        </ThemeProvider>,
      );
      const expected = color ?? (parent ? 'purple' : theme.palette.text.primary);
      expect(flat(tree.getByTestId('reset-border').props.style).borderColor).toBe(expected);
      expect(flat(tree.getByTestId('reset-child').props.style).color).toBe(expected);
      tree.unmount();
    }
  },
);

test('an absent native color keeps the computed CSS foreground for currentColor', () => {
  const tree = render(
    <Box testID="absent-border" sx={{ border: '2px solid currentColor', color: 'red' }} style={{}}>
      <Text testID="absent-child">Child</Text>
    </Box>,
  );
  expect(flat(tree.getByTestId('absent-border').props.style).borderColor).toBe('red');
  expect(flat(tree.getByTestId('absent-child').props.style).color).toBe('red');
});

test('ButtonBase preserves CSS none declarations through its owned custom-root style filter', () => {
  let semanticStyle: unknown;
  const CustomRoot = forwardRef<any, any>(({ style, children, ...props }, ref) => {
    const state = { pressed: false, hovered: false, focused: false };
    const computed = typeof style === 'function' ? style(state) : style;
    semanticStyle = nativeStyleBorderStyle(computed);
    const restored = mergeNativeRootStyle('ltr', computed, { borderStyle: 'solid' });
    return (
      <View {...props} ref={ref} testID="restored-border" style={restored}>
        {typeof children === 'function' ? children(state) : children}
      </View>
    );
  });
  const tree = render(
    <ButtonBase
      component={CustomRoot}
      disableRipple
      sx={{ border: '4px solid red', borderStyle: 'none' }}
    >
      Child
    </ButtonBase>,
  );
  expect(semanticStyle).toBe('none');
  expect(flat(tree.getByTestId('restored-border').props.style)).toMatchObject({
    borderWidth: 4,
    borderStyle: 'solid',
    borderColor: 'red',
  });
});
