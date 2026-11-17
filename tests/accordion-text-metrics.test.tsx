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
import type { TextStyle } from 'react-native';
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
  applyNativeMetricStep,
  prepareNativeMetricBank,
  type NativeMetricStep,
  type NativeMetricState,
} from '../packages/native-host/src/nativeTextMetricData';
const theme = createTheme({ motion: { reducedMotion: 'always' } });
afterEach(cleanup);
function source(tree: ReturnType<typeof render>) {
  return tree.getByTestId('panel').props.ownedProgramme;
}
function selected(tree: ReturnType<typeof render>, id: string, facts: number) {
  const programme = source(tree),
    bank = programme.textMetrics;
  expect(bank).toBeDefined();
  const payload = tree.getByTestId(id).findByType('ColorMarker' as never).props.metricProgramme;
  expect(payload.owner).toBe(programme.owner);
  expect(payload.key).toBe(bank.key);
  let state = applyNativeMetricStep(bank.base, bank.cases[facts])!;
  for (const step of payload.steps) state = applyNativeMetricStep(state, step)!;
  const fields = [state[0], state[1], state[3]];
  return fields.map((value, index) =>
    payload.resets & (1 << index) ? payload.ordinary[index] : value,
  );
}
function scene(children: React.ReactNode, css = {}) {
  return (
    <ThemeProvider theme={theme}>
      <Accordion
        testID="panel"
        sx={{
          fontSize: '16px',
          lineHeight: 1.5,
          minHeight: 48,
          '&:first-of-type': { fontSize: '24px', minHeight: 80 },
          ...css,
        }}
      >
        <AccordionSummary>{children}</AccordionSummary>
      </Accordion>
    </ThemeProvider>
  );
}
test('relative inherited metrics share structural cases while native sizes remain authored', () => {
  const tree = render(
    scene(
      <>
        <Typography testID="relative" variant="inherit" sx={{ fontSize: '0.5em' }}>
          Relative
        </Typography>
        <Typography testID="native" variant="inherit" style={{ fontSize: 16, lineHeight: 13 }}>
          Native
        </Typography>
        <Typography testID="inherit" variant="inherit">
          Inherited
        </Typography>
      </>,
    ),
  );
  expect(source(tree).cases.map((style: { minHeight?: number }) => style.minHeight)).toEqual([
    48, 48, 80, 80, 48, 48, 80, 80,
  ]);
  expect(selected(tree, 'relative', 0)).toEqual([8, 12, null]);
  expect(selected(tree, 'relative', 2)).toEqual([12, 18, null]);
  expect(selected(tree, 'inherit', 2)).toEqual([24, 36, null]);
  expect(selected(tree, 'native', 2)).toEqual([16, 13, null]);
});
test('inherited ratios react independently of a passive native font-size barrier', () => {
  const tree = render(
    scene(
      <Box style={{ fontSize: 10 }}>
        <Typography testID="glyph" variant="inherit">
          Glyph
        </Typography>
      </Box>,
      { '&:first-of-type': { fontSize: '24px', lineHeight: 2, minHeight: 80 } },
    ),
  );
  expect(selected(tree, 'glyph', 0)).toEqual([10, 15, null]);
  expect(selected(tree, 'glyph', 2)).toEqual([10, 20, null]);
});
test('native absolute line height remains fixed through a relative descendant', () => {
  const tree = render(
    scene(
      <Box style={{ lineHeight: 32 }}>
        <Typography testID="glyph" variant="inherit" sx={{ fontSize: '0.5em' }}>
          Glyph
        </Typography>
      </Box>,
    ),
  );
  expect(selected(tree, 'glyph', 0)).toEqual([8, 32, null]);
  expect(selected(tree, 'glyph', 2)).toEqual([12, 32, null]);
});
test('inherited spacing is computed at its owner; child em spacing uses its own font', () => {
  const tree = render(
    scene(
      <>
        <Typography testID="inherited" variant="inherit" sx={{ fontSize: '0.5em' }}>
          Inherited
        </Typography>
        <Typography
          testID="own"
          variant="inherit"
          sx={{ fontSize: '0.5em', letterSpacing: '0.1em' }}
        >
          Own
        </Typography>
        <Typography testID="native" variant="inherit" style={{ letterSpacing: 7 }}>
          Native
        </Typography>
      </>,
      { letterSpacing: '0.1em' },
    ),
  );
  expect(selected(tree, 'inherited', 0)).toEqual([8, 12, 1.6]);
  expect(selected(tree, 'inherited', 2)).toEqual([12, 18, 2.4000000000000004]);
  expect(selected(tree, 'own', 2)).toEqual([12, 18, 1.2000000000000002]);
  expect(selected(tree, 'native', 2)).toEqual([24, 36, 7]);
});
test('computed percentage height clears ratio metadata for relative descendants', () => {
  const tree = render(
    scene(
      <Typography testID="glyph" variant="inherit" sx={{ fontSize: '0.5em' }}>
        Glyph
      </Typography>,
      { lineHeight: '150%' },
    ),
  );
  expect(selected(tree, 'glyph', 0)).toEqual([8, 24, null]);
  expect(selected(tree, 'glyph', 2)).toEqual([12, 36, null]);
});
test('native null resets keep ordinary emitted props instead of selected context values', () => {
  const tree = render(
    scene(
      <Typography
        testID="glyph"
        variant="inherit"
        style={
          {
            fontSize: undefined,
            lineHeight: null,
            letterSpacing: undefined,
          } as unknown as TextStyle
        }
      >
        Glyph
      </Typography>,
    ),
  );
  expect(selected(tree, 'glyph', 2)).toEqual([null, null, null]);
});
test('operation model preserves an absent context font and uses rem for a relative child', () => {
  const state: NativeMetricState = [null, 24, 1.5, null];
  expect(applyNativeMetricStep(state, [0, 0, 0, 0, 0, 0, 0, 0, 20, 16])).toEqual(state);
  expect(applyNativeMetricStep(state, [2, 0.5, 2, 0, 0, 0, 0, 0, 20, 16])).toEqual([
    10,
    15,
    1.5,
    null,
  ]);
});

test('invalid or out-of-native-range recipes stay on ordinary fallback', () => {
  const base: NativeMetricState = [16, 24, 1.5, 0];
  const step: NativeMetricStep = [0, 0, 0, 0, 0, 0, 0, 0, 16, 16];
  expect(prepareNativeMetricBank(Array(8).fill(step), step, base)).toBeDefined();
  for (const [index, value] of [
    [0, 1.00000001],
    [1, -1],
    [3, -1],
    [5, -1],
    [7, Infinity],
    [8, 0],
    [9, -1],
    [9, 1e39],
  ]) {
    const invalid = [...step] as unknown as number[];
    invalid[index!] = value!;
    expect(
      prepareNativeMetricBank(Array(8).fill(invalid), invalid as unknown as NativeMetricStep, base),
    ).toBeUndefined();
  }
  expect(prepareNativeMetricBank(Array(8).fill(step), step, [-1, 24, 1.5, 0])).toBeUndefined();
  expect(
    prepareNativeMetricBank(Array(8).fill(step), step, base, {
      owner: 'source',
      key: 'key',
      steps: Array(129).fill(step),
    }),
  ).toBeUndefined();
  const huge: NativeMetricStep = [2, 3e38, 0, 0, 0, 0, 0, 0, 16, 16];
  expect(prepareNativeMetricBank(Array(8).fill(huge), huge, base)).toBeUndefined();
});
