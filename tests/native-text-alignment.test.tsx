// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  StyleSheet,
  Text,
  View,
  I18nManager,
  unstable_TextAncestorContext as TextAncestorContext,
  type TextStyle,
} from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import {
  AccordionDetails,
  Box,
  ThemeProvider,
  Typography,
  createTheme,
} from '../packages/material/src';
import { NativeTextScope, resolveSx } from '../packages/system/src';

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
type Direction = 'ltr' | 'rtl';
type Side = 'left' | 'right';
type Alignment = Side | 'start' | 'end';
const flat = (style: TextStyle) => StyleSheet.flatten(style) ?? {};
// Exact finite rules from pinned RN0.88.1 RCTResolveTextAlignment and the Android
// TextLayoutManager normal/opposite+script gravity resolution. These model native
// consumption of emitted props; a JS value named "right" alone proves no ink side.
function iosInk(align: TextStyle['textAlign'], direction: Direction): Side | 'center' {
  if (align === 'center') return 'center';
  const right = align === 'right';
  return (direction === 'rtl' ? !right : right) ? 'right' : 'left';
}
function androidInk(
  align: TextStyle['textAlign'],
  direction: Direction,
  scriptRTL: boolean,
): Side | 'center' {
  if (align === 'center') return 'center';
  const swap = (direction === 'rtl') !== scriptRTL;
  const normal = align === 'right' ? swap : !swap;
  return (normal ? scriptRTL : !scriptRTL) ? 'right' : 'left';
}
function ink(style: TextStyle, direction: Direction, expected: Side) {
  expect(iosInk(style.textAlign, direction)).toBe(expected);
  expect(androidInk(style.textAlign, direction, false)).toBe(expected);
  expect(androidInk(style.textAlign, direction, true)).toBe(expected);
}
const desired = (align: Alignment, direction: Direction): Side =>
  align === 'left' || align === 'right'
    ? align
    : (align === 'start') === (direction === 'ltr')
      ? 'left'
      : 'right';

test.each(
  (['ltr', 'rtl'] as const).flatMap((direction) =>
    (['left', 'right', 'start', 'end'] as const).map((align) => ({ direction, align })),
  ),
)(
  'CSS $align paints the correct physical side in $direction paragraphs on both native backends',
  ({ direction, align }) => {
    const theme = createTheme({ direction });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Box sx={{ direction }}>
          <Typography testID="text" sx={{ textAlign: align }}>
            Dock 3.
          </Typography>
        </Box>
      </ThemeProvider>,
    );
    ink(flat(tree.getByTestId('text').props.style), direction, desired(align, direction));
    // Prepared CSS and callback-visible declarations retain semantic values.
    expect(resolveSx({ textAlign: align }, theme).textAlign).toBe(desired(align, direction));
  },
);

test.each(['left', 'right', 'start', 'end'] as const)(
  'inherited CSS %s re-resolves semantically while encoding uses the actual descendant paragraph',
  (align) => {
    const scene = (direction: Direction) => (
      <Box sx={{ direction: 'ltr', textAlign: align }}>
        <AccordionDetails sx={{ direction }}>
          <Typography testID="text" variant="inherit">
            Notes.
          </Typography>
        </AccordionDetails>
      </Box>
    );
    const tree = render(scene('ltr'));
    ink(flat(tree.getByTestId('text').props.style), 'ltr', desired(align, 'ltr'));
    tree.rerender(scene('rtl'));
    ink(flat(tree.getByTestId('text').props.style), 'rtl', desired(align, 'rtl'));
  },
);

test('literal and known raw Text children receive the same CSS encoding without replacing their hosts', () => {
  const tree = render(
    <Box sx={{ direction: 'rtl', textAlign: 'start' }}>
      Literal
      <Text testID="raw">Raw</Text>
      <View>
        <Text testID="nested">Nested</Text>
      </View>
    </Box>,
  );
  for (const label of ['Literal', 'Raw', 'Nested'])
    ink(flat(tree.getByText(label).props.style), 'rtl', 'right');
  expect(tree.UNSAFE_getAllByType(Text)).toHaveLength(3);
});

test('genuine native inline textAlign retains its RN semantics and clears inherited CSS provenance', () => {
  const tree = render(
    <Box sx={{ direction: 'rtl', textAlign: 'start' }}>
      <Typography
        testID="own"
        sx={{ textAlign: 'right' }}
        style={[{ textAlign: 'right' }, { textAlign: 'left' }]}
      >
        Own
      </Typography>
      <Box style={{ textAlign: 'left' }}>
        <Typography testID="inherited">Inherited native</Typography>
      </Box>
      <Text testID="raw" style={{ textAlign: 'left' }}>
        Native raw
      </Text>
    </Box>,
  );
  for (const id of ['own', 'inherited', 'raw']) {
    const style = flat(tree.getByTestId(id).props.style);
    expect(style.textAlign).toBe('left');
    ink(style, 'rtl', 'right');
  }
});

test('a virtual Text uses its owning paragraph direction rather than its unlayoutable span direction', () => {
  // RN Text.js provides this public context for nested NativeVirtualText; its
  // C++ TextProps has no Yoga direction. The outer Typography owns the paragraph.
  const tree = render(
    <Typography testID="paragraph" sx={{ direction: 'rtl', textAlign: 'left' }}>
      <TextAncestorContext.Provider value={true}>
        <Typography testID="span" sx={{ direction: 'ltr', textAlign: 'start' }}>
          Inline
        </Typography>
      </TextAncestorContext.Provider>
    </Typography>,
  );
  ink(flat(tree.getByTestId('paragraph').props.style), 'rtl', 'left');
  ink(flat(tree.getByTestId('span').props.style), 'rtl', 'left');
});

test('a real TextAncestor reset starts a new paragraph with its own layout direction', () => {
  const tree = render(
    <Typography sx={{ direction: 'rtl', textAlign: 'right' }}>
      <TextAncestorContext.Provider value={false}>
        <Typography testID="independent" sx={{ direction: 'ltr', textAlign: 'left' }}>
          Independent
        </Typography>
      </TextAncestorContext.Provider>
    </Typography>,
  );
  ink(flat(tree.getByTestId('independent').props.style), 'ltr', 'left');
});

test.each([false, true])(
  'standalone text uses actual global direction (%s), not a theme-only assumption',
  (rtl) => {
    jest.replaceProperty(I18nManager, 'isRTL', rtl);
    const direction = rtl ? 'rtl' : 'ltr';
    const tree = render(
      <ThemeProvider theme={createTheme({ direction: rtl ? 'ltr' : 'rtl' })}>
        <Typography testID="text" sx={{ textAlign: 'start' }}>
          Standalone
        </Typography>
      </ThemeProvider>,
    );
    ink(flat(tree.getByTestId('text').props.style), direction, desired('start', direction));
  },
);

test('a shared text leaf reprocesses generated CSS alignment without treating it as native inline', () => {
  const theme = createTheme();
  const css = resolveSx(
    { direction: 'rtl', textAlign: 'left', fontSize: '20px', lineHeight: 1.5 },
    theme,
  );
  const tree = render(
    <NativeTextScope theme={theme} style={css} kind="text">
      {(style) => (
        <Text testID="text" style={style}>
          Leaf
        </Text>
      )}
    </NativeTextScope>,
  );
  const style = flat(tree.getByTestId('text').props.style);
  ink(style, 'rtl', 'left');
  expect(style).toMatchObject({ fontSize: 20, lineHeight: 30 });
});

test('an explicit undefined native alignment clears CSS provenance for descendant text', () => {
  const tree = render(
    <Box sx={{ direction: 'rtl', textAlign: 'left' }}>
      <Box style={{ textAlign: undefined }}>
        <Typography testID="view-reset">View reset</Typography>
      </Box>
      <Typography sx={{ textAlign: 'left' }} style={{ textAlign: undefined }}>
        <TextAncestorContext.Provider value={true}>
          <Typography testID="text-reset" variant="inherit">
            Text reset
          </Typography>
        </TextAncestorContext.Provider>
      </Typography>
    </Box>,
  );
  for (const id of ['view-reset', 'text-reset'])
    ink(flat(tree.getByTestId(id).props.style), 'rtl', 'right');
});

test('known raw virtual Text preserves its owning paragraph and native inline override', () => {
  const theme = createTheme();
  const tree = render(
    <NativeTextScope
      theme={theme}
      kind="text"
      style={resolveSx({ direction: 'rtl', textAlign: 'left' }, theme)}
      content={
        <>
          <Text testID="raw-css-span" style={{ direction: 'ltr' }}>
            CSS span
          </Text>
          <Text testID="raw-native-span" style={{ direction: 'ltr', textAlign: 'left' }}>
            Native span
          </Text>
        </>
      }
    >
      {(style, content) => <Text style={style}>{content}</Text>}
    </NativeTextScope>,
  );
  ink(flat(tree.getByTestId('raw-css-span').props.style), 'rtl', 'left');
  const native = flat(tree.getByTestId('raw-native-span').props.style);
  expect(native.textAlign).toBe('left');
  ink(native, 'rtl', 'right');
});

test.each(
  (['ltr', 'rtl'] as const).flatMap((direction) =>
    (['left', 'right', 'start', 'end'] as const).map((align) => ({ direction, align })),
  ),
)(
  'a known View starts a new $direction paragraph for inherited CSS $align and raw literal text',
  ({ direction, align }) => {
    const outer = direction === 'ltr' ? 'rtl' : 'ltr';
    const tree = render(
      <Typography sx={{ direction: outer, textAlign: align }}>
        <View style={{ direction }}>
          <View>
            <Text testID="new-paragraph">Dock</Text>
            Literal below View
          </View>
        </View>
      </Typography>,
    );
    const side = desired(align, direction);
    ink(flat(tree.getByTestId('new-paragraph').props.style), direction, side);
    ink(flat(tree.getByText('Literal below View').props.style), direction, side);
  },
);

test.each(['ltr', 'rtl'] as const)(
  'a library View scope resets the actual enclosing paragraph before creating %s literal text',
  (direction) => {
    const tree = render(
      <Typography sx={{ direction: direction === 'ltr' ? 'rtl' : 'ltr', textAlign: 'left' }}>
        <TextAncestorContext.Provider value={true}>
          <Box sx={{ direction }}>Library View literal</Box>
        </TextAncestorContext.Provider>
      </Typography>,
    );
    ink(flat(tree.getByText('Library View literal').props.style), direction, 'left');
  },
);
