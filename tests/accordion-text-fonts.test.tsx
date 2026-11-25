// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Host doubles verify declaration/ancestry bindings. Release iOS verifies paint.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(actual),
      View: { value: 'View', enumerable: true, configurable: true },
      findNodeHandle: { value: () => null, enumerable: true },
    },
  );
});
jest.mock('../packages/native-host/src/AltrooMUITextColorMarkerNativeComponent', () => ({
  __esModule: true,
  default: 'ColorMarker',
}));
jest.mock('../packages/native-host/src/ownedStyleBootstrap', () => {
  const profile = {
    schema: 1,
    rn: '0.88.1',
    platform: 'ios',
    styleKeys: require('../packages/native-host/src/ownedStyleVocabulary').ownedStyleVocabulary
      .sha256,
    nativeCSSParsing:
      require('react-native/Libraries/Components/View/ReactNativeStyleAttributes')
        .colorAttribute === true,
    cppPropsIteratorSetter: false,
    accumulatedRawPropsAndroid: false,
    exclusivePropsAndroid: false,
    propsReconciliationAndroid: false,
  };
  return {
    supportsInheritedTextColors: () => true,
    supportsInheritedTextMetrics: () => true,
    supportsInheritedTextFonts: () => true,
    supportsPeerStyleIdentity: () => false,
    supportsStructuralCases: () => true,
    supportsParentStructuralCases: () => true,
    requireOwnedStyleProfile: () => profile,
  };
});
jest.mock('../packages/native-host/src/ownedStructuralCases', () => ({
  ownedStructuralCases: {
    parentSelectors: true,
    profile: require('../packages/native-host/src/ownedStyleBootstrap').requireOwnedStyleProfile(),
    activation: { acquire: () => () => {} },
    Native: require('react-native').View,
    encode: require('../packages/native-host/src/ownedStyleEncoding').encodeStructuralCases,
  },
}));
import { Text, StyleSheet, type TextStyle } from 'react-native';
import { render, cleanup } from '@testing-library/react-native';
import {
  Accordion,
  AccordionSummary,
  Typography,
  Box,
  ThemeProvider,
  createTheme,
} from '@altroo/mui-native';
import {
  nativeFontIdentityFits,
  prepareNativeFontBank,
  applyNativeFontStep,
  type NativeFontStep,
  type NativeFontState,
} from '../packages/native-host/src/nativeTextFontData';
import { nativeFontStep } from '../packages/system/src/nativeFontSources';
const theme = createTheme({ motion: { reducedMotion: 'always' } });
afterEach(cleanup);
function scene(children: React.ReactNode, extra = {}) {
  return (
    <ThemeProvider theme={theme}>
      <Accordion
        testID="panel"
        sx={{
          fontFamily: 'system-ui',
          fontWeight: 400,
          fontStyle: 'normal',
          minHeight: 48,
          '&:first-of-type': {
            fontFamily: 'serif',
            fontWeight: 700,
            fontStyle: 'italic',
            minHeight: 80,
          },
          ...extra,
        }}
      >
        <AccordionSummary>{children}</AccordionSummary>
      </Accordion>
    </ThemeProvider>
  );
}
function selected(tree: ReturnType<typeof render>, id: string, facts = 2) {
  const programme = tree.getByTestId('panel').props.ownedProgramme;
  const bank = programme.textFonts;
  expect(bank).toBeDefined();
  const packet = tree.getByTestId(id).findByType('ColorMarker' as never).props.fontProgramme;
  expect(packet.owner).toBe(programme.owner);
  expect(packet.key).toBe(bank.key);
  let state: NativeFontState = applyNativeFontStep(bank.base, bank.cases[facts]);
  for (const step of packet.steps as NativeFontStep[]) state = applyNativeFontStep(state, step);
  return state.values.slice(0, 3);
}
test('conditional fonts share native geometry cases while inherited Text retains its source binding', () => {
  const tree = render(
    scene(
      <Typography testID="glyph" variant="inherit">
        Glyph
      </Typography>,
    ),
  );
  expect(
    tree
      .getByTestId('panel')
      .props.ownedProgramme.cases.map((value: { minHeight: number }) => value.minHeight),
  ).toEqual([48, 48, 80, 80, 48, 48, 80, 80]);
  expect(selected(tree, 'glyph', 0)).toEqual(['System', '400', 'normal']);
  expect(selected(tree, 'glyph')).toEqual(['Times New Roman', '700', 'italic']);
});
test('same-valued CSS and genuine native authoring block only their own inherited fields', () => {
  const tree = render(
    scene(
      <>
        <Typography testID="css" variant="inherit" sx={{ fontStyle: 'normal' }}>
          CSS
        </Typography>
        <Typography
          testID="native"
          variant="inherit"
          style={{ fontFamily: 'System', fontWeight: 400 }}
        >
          Native
        </Typography>
      </>,
    ),
  );
  expect(selected(tree, 'css')).toEqual(['Times New Roman', '700', 'normal']);
  expect(selected(tree, 'native')).toEqual(['System', '400', 'italic']);
});
test('passive View native fonts block future source selection even when ordinary values match', () => {
  const tree = render(
    scene(
      <Box style={{ fontFamily: 'System' }}>
        <Typography testID="glyph" variant="inherit">
          Glyph
        </Typography>
      </Box>,
    ),
  );
  expect(selected(tree, 'glyph')).toEqual(['System', '700', 'italic']);
});
test('Typography native null and undefined emit resets instead of inheriting selected font fields', () => {
  const tree = render(
    scene(
      <Typography
        testID="glyph"
        variant="inherit"
        style={{ fontFamily: undefined, fontStyle: null } as unknown as TextStyle}
      >
        Glyph
      </Typography>,
    ),
  );
  expect(selected(tree, 'glyph')).toEqual([null, '700', null]);
});
test('nested native font values are barriers without an extra array or record traversal', () => {
  const reads = jest.fn(() => 'small-caps');
  const variants = Object.defineProperty([], '0', { enumerable: true, get: reads });
  const variationReads = jest.fn(() => 600);
  const variation = Object.defineProperty({}, 'wght', { enumerable: true, get: variationReads });
  const step = nativeFontStep({
    fontFamily: 'System',
    fontVariant: variants,
    fontVariationSettings: variation,
  });
  expect(step.values).toEqual(['System', null, null, null, null]);
  expect(step.owns).toBe(25);
  expect(step.blocked).toBe(24);
  expect(reads).not.toHaveBeenCalled();
  expect(variationReads).not.toHaveBeenCalled();
});

test.each(['inherit', 'unset'])(
  'passive View %s font keywords keep source inheritance',
  (keyword) => {
    const tree = render(
      scene(
        <Box style={{ fontFamily: keyword, fontStyle: keyword } as TextStyle}>
          <Typography testID="glyph" variant="inherit">
            Glyph
          </Typography>
        </Box>,
      ),
    );
    expect(selected(tree, 'glyph')).toEqual(['Times New Roman', '700', 'italic']);
  },
);
test('scalar variant and variation declarations reach structural font selection', () => {
  const tree = render(
    scene(
      <Typography testID="glyph" variant="inherit">
        Glyph
      </Typography>,
      {
        fontVariant: 'small-caps',
        fontVariationSettings: "'wght' 400",
        '&:first-of-type': {
          fontVariant: 'tabular-nums',
          fontVariationSettings: "'wght' 700",
          minHeight: 80,
        },
      },
    ),
  );
  const bank = tree.getByTestId('panel').props.ownedProgramme.textFonts;
  expect(bank).toBeDefined();
  expect(bank.cases[0].owns & 24).toBe(24);
  expect(bank.cases[2].owns & 24).toBe(24);
  expect(bank.cases[0].values[4]).toBe("'wght' 400");
  expect(bank.cases[2].values[4]).toBe("'wght' 700");
  expect(bank.cases[0].values[3]).not.toEqual(bank.cases[2].values[3]);
});

test('font identities use the same UTF-8 byte budget as native conversion', () => {
  expect(nativeFontIdentityFits('é'.repeat(128), 256)).toBe(true);
  expect(nativeFontIdentityFits('é'.repeat(129), 256)).toBe(false);
  expect(nativeFontIdentityFits('😀'.repeat(64), 256)).toBe(true);
  expect(nativeFontIdentityFits('😀'.repeat(65), 256)).toBe(false);
  const step = nativeFontStep({ fontFamily: 'é'.repeat(220) });
  const bank = prepareNativeFontBank(Array(8).fill(step), step, {
    values: [null, null, null, null, null],
    blocked: 0,
  });
  const unboundedKey = JSON.stringify([
    { values: [null, null, null, null, null], blocked: 0 },
    step,
    Array(8).fill(step),
    null,
  ]);
  expect(unboundedKey.length).toBeLessThan(4096);
  expect(Buffer.byteLength(unboundedKey, 'utf8')).toBeGreaterThan(4096);
  expect(bank).toBeUndefined();
  const small = nativeFontStep({ fontFamily: 'System' });
  const parent = { owner: 'é'.repeat(129), key: 'parent', steps: [] };
  expect(
    prepareNativeFontBank(
      Array(8).fill(small),
      small,
      { values: [null, null, null, null, null], blocked: 0 },
      parent,
    ),
  ).toBeUndefined();
});

const variantSource = {
  fontVariant: 'small-caps',
  fontVariationSettings: "'wght' 400",
  '&:first-of-type': {
    fontFamily: 'serif',
    fontWeight: 700,
    fontStyle: 'italic',
    fontVariant: 'tabular-nums',
    fontVariationSettings: "'wght' 700",
    minHeight: 80,
  },
};
test.each(['direct', 'view', 'text'] as const)(
  'genuine native variant arrays and records remain ordinary RN barriers through %s',
  (kind) => {
    const variants: TextStyle['fontVariant'] = ['small-caps'];
    const settings = { wght: 400 };
    const opaque = { fontVariant: variants, fontVariationSettings: settings };
    const glyph = (
      <Typography testID="glyph" variant="inherit" style={kind === 'direct' ? opaque : undefined}>
        123 Glyph
      </Typography>
    );
    const content =
      kind === 'view' ? (
        <Box style={opaque}>{glyph}</Box>
      ) : kind === 'text' ? (
        <Text style={opaque}>{glyph}</Text>
      ) : (
        glyph
      );
    const tree = render(scene(content, variantSource));
    expect(selected(tree, 'glyph')).toEqual(['Times New Roman', '700', 'italic']);
    const target = tree.getByTestId('glyph');
    const style = StyleSheet.flatten(target.props.style);
    const packet = target.findByType('ColorMarker' as never).props.fontProgramme;
    expect(packet.steps.some((step: NativeFontStep) => (step.blocked & 24) === 24)).toBe(true);
    if (kind === 'text') {
      expect(style.fontVariant).toBeUndefined();
      expect(style.fontVariationSettings).toBeUndefined();
      expect(packet.ordinary.blocked).toBe(0);
    } else {
      expect(style.fontVariant).toBe(variants);
      expect(style.fontVariationSettings).toBe(settings);
      expect(packet.ordinary.blocked).toBe(24);
    }
  },
);
test('retained opaque native font leaves update and return to scalar and cleared ownership', () => {
  const content = (style: TextStyle) =>
    scene(
      <Typography testID="glyph" variant="inherit" style={style}>
        123 Glyph
      </Typography>,
      variantSource,
    );
  const first: TextStyle = { fontVariant: ['small-caps'], fontVariationSettings: { wght: 400 } };
  const tree = render(content(first));
  const current = () => tree.getByTestId('glyph');
  const before = current().findByType('ColorMarker' as never).props.fontProgramme;
  const second: TextStyle = { fontVariant: ['lining-nums'], fontVariationSettings: { wght: 600 } };
  tree.rerender(content(second));
  const after = current().findByType('ColorMarker' as never).props.fontProgramme;
  expect(after.key).toBe(before.key);
  expect(after.ordinary.blocked).toBe(24);
  expect(StyleSheet.flatten(current().props.style).fontVariant).toBe(second.fontVariant);
  expect(StyleSheet.flatten(current().props.style).fontVariationSettings).toBe(
    second.fontVariationSettings,
  );
  tree.rerender(content({ fontVariant: 'lining-nums', fontVariationSettings: "'wght' 600" }));
  expect(current().findByType('ColorMarker' as never).props.fontProgramme.ordinary.blocked).toBe(0);
  tree.rerender(
    content({ fontVariant: undefined, fontVariationSettings: null } as unknown as TextStyle),
  );
  const reset = current().findByType('ColorMarker' as never).props.fontProgramme;
  expect(reset.ordinary.blocked).toBe(0);
  expect(reset.steps.at(-1).owns & 24).toBe(24);
  expect(reset.steps.at(-1).values.slice(3)).toEqual([null, null]);
});

test('unknown default font fields retain the real ordinary emission instead of assuming a platform family', () => {
  const custom = createTheme({
    motion: { reducedMotion: 'always' },
    typography: { fontFamily: '"Custom Family", sans-serif' },
  });
  const tree = render(
    <ThemeProvider theme={custom}>
      <Accordion
        testID="panel"
        sx={{
          fontWeight: 400,
          minHeight: 48,
          '&:first-of-type': { fontWeight: 700, minHeight: 80 },
        }}
      >
        <AccordionSummary>
          <Typography testID="glyph" variant="inherit">
            Glyph
          </Typography>
        </AccordionSummary>
      </Accordion>
    </ThemeProvider>,
  );
  const bank = tree.getByTestId('panel').props.ownedProgramme.textFonts;
  const packet = tree.getByTestId('glyph').findByType('ColorMarker' as never).props.fontProgramme;
  let state = applyNativeFontStep(bank.base, bank.cases[2]);
  for (const step of packet.steps as NativeFontStep[]) state = applyNativeFontStep(state, step);
  expect(state.blocked & 1).toBe(1);
  expect(packet.ordinary.values[0]).toBe('Custom Family');
  expect(state.values[1]).toBe('700');
});

test.each([
  { key: 'fontFamily', field: 0, value: 'serif', expected: 'Times New Roman' },
  { key: 'fontWeight', field: 1, value: 700, expected: '700' },
  { key: 'fontStyle', field: 2, value: 'italic', expected: 'italic' },
])(
  'conditional-only $key preserves native cases with an unknown inherited base',
  ({ key, field, value, expected }) => {
    const custom = createTheme({
      motion: { reducedMotion: 'always' },
      typography: { fontFamily: '"Custom Family", sans-serif' },
    });
    const tree = render(
      <ThemeProvider theme={custom}>
        <Accordion
          testID="panel"
          sx={{ minHeight: 48, '&:first-of-type': { [key]: value, minHeight: 80 } }}
        >
          <AccordionSummary>
            <Typography testID="glyph" variant="inherit">
              Glyph
            </Typography>
          </AccordionSummary>
        </Accordion>
      </ThemeProvider>,
    );
    const programme = tree.getByTestId('panel').props.ownedProgramme;
    expect(programme.cases.map((entry: { minHeight: number }) => entry.minHeight)).toEqual([
      48, 48, 80, 80, 48, 48, 80, 80,
    ]);
    const bank = programme.textFonts;
    expect(bank).toBeDefined();
    const packet = tree.getByTestId('glyph').findByType('ColorMarker' as never).props.fontProgramme;
    expect(packet.ordinary.values[0]).toBe('Custom Family');
    expect(applyNativeFontStep(bank.base, bank.cases[0]).blocked & (1 << field)).not.toBe(0);
    const selected = applyNativeFontStep(bank.base, bank.cases[2]);
    expect(selected.blocked & (1 << field)).toBe(0);
    expect(selected.values[field]).toBe(expected);
  },
);
