// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { componentRootStyle, createTheme, createNativeStyleCache } from '@altroo/mui-native-system';
import {
  prepareAccordionStructuralCases as compileAccordionStructuralCases,
  createAccordionStructuralPreparation,
} from '../packages/material/src/accordionStructuralRoot';
import { refreshNativeRootPreparation } from '@altroo/mui-native-system/internal/prepared-style';
import { nativeStyleCacheRegistry } from '../packages/system/src/nativeStyleCache';
const theme = createTheme();
const context = {
  classes: ['MuiAccordion-root'],
  width: 400,
  firstOfType: false,
  lastOfType: false,
  lastChild: false,
};
function compile(programme: Parameters<typeof compileAccordionStructuralCases>[0]['programme']) {
  return compileAccordionStructuralCases({ theme, programme, context, direction: 'ltr' });
}
test('retained Accordion CSS selects all structural combinations without callback replay', () => {
  const source = jest.fn(() => ({
    minHeight: 48,
    '&:first-of-type': { minHeight: 80, borderTopLeftRadius: 4 },
    '&:last-of-type': { minHeight: 100, borderBottomLeftRadius: 4 },
    '&:last-child': { opacity: 0.6 },
  }));
  const prepared = componentRootStyle(theme, 'MuiAccordion', {}, source, undefined, context, true);
  expect(source).toHaveBeenCalledTimes(1);
  const cases = compile(prepared.programme);
  expect(source).toHaveBeenCalledTimes(1);
  expect(cases.map((value) => value.minHeight)).toEqual([48, 48, 80, 80, 100, 100, 100, 100]);
  expect(cases[0].borderTopLeftRadius).toBeUndefined();
  expect(cases[2].borderTopLeftRadius).toBe(4);
  expect(cases[4].borderBottomLeftRadius).toBe(4);
  expect(cases[7]).toMatchObject({
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    opacity: 0.6,
  });
});
test('genuine native shorthand wins in every case and getters are captured once', () => {
  const prepared = componentRootStyle(
    theme,
    '',
    {},
    {
      '&:first-of-type': { minHeight: 80, borderTopLeftRadius: 4 },
      '&:last-of-type': { minHeight: 100, borderBottomLeftRadius: 4 },
    },
    undefined,
    context,
    true,
  );
  let reads = 0;
  const inline = {
    get minHeight() {
      reads++;
      return 90;
    },
    borderRadius: 7,
  };
  const cases = compile([prepared.programme, inline]);
  expect(reads).toBe(1);
  for (const value of cases) {
    expect(value.minHeight).toBe(90);
    expect(value.borderTopLeftRadius ?? value.borderRadius).toBe(7);
    expect(value.borderBottomLeftRadius ?? value.borderRadius).toBe(7);
  }
});
test('View programmes omit text fields while guarding conditional inherited text', () => {
  const ordinary = componentRootStyle(
    theme,
    '',
    {},
    { color: 'red', minHeight: 48 },
    undefined,
    context,
    true,
  );
  for (const value of compile(ordinary.programme)) expect(value).not.toHaveProperty('color');
  const conditional = componentRootStyle(
    theme,
    '',
    {},
    { '&:first-of-type': { color: 'red' } },
    undefined,
    context,
    true,
  );
  expect(new Set(compile(conditional.programme).map((value) => JSON.stringify(value))).size).toBe(
    1,
  );
});
test('a conditional direction cannot be hidden by equal physical heights', () => {
  const prepared = componentRootStyle(
    theme,
    '',
    {},
    { '&:first-of-type': { direction: 'rtl', minHeight: 48 } },
    undefined,
    context,
    true,
  );
  expect(compile(prepared.programme).every((value) => value.direction !== 'rtl')).toBe(true);
});

test('cache projection snapshots genuine inline getters once and reuses its epoch result', () => {
  const cache = createNativeStyleCache({ key: 'case-projection-getter' });
  try {
    nativeStyleCacheRegistry.commit([{ cache, css: 'padding:1px;', hasRules: true }]);
    let reads = 0;
    const preparation = createAccordionStructuralPreparation({
      theme,
      context,
      direction: 'ltr',
      programme: {
        get opacity() {
          reads++;
          return 0.3;
        },
      },
    });
    expect(reads).toBe(1);
    cache.reset();
    const refreshed = refreshNativeRootPreparation(preparation);
    expect(refreshed).not.toBe(preparation);
    expect(refreshed.every((value) => value.opacity === 0.3)).toBe(true);
    expect(refreshNativeRootPreparation(preparation)).toBe(refreshed);
    expect(reads).toBe(1);
  } finally {
    cache.dispose();
  }
});

test('conditional inherited color preserves independent native corners and geometry', () => {
  const source = jest.fn(() => ({
    minHeight: 48,
    '&:first-of-type': { color: 'red', minHeight: 80, borderTopLeftRadius: 4 },
    '&:last-of-type': { minHeight: 100, borderBottomLeftRadius: 4 },
  }));
  const prepared = componentRootStyle(theme, 'MuiAccordion', {}, source, undefined, context, true);
  const cases = compile(prepared.programme);
  expect(cases.map((value) => value.minHeight)).toEqual([48, 48, 80, 80, 100, 100, 100, 100]);
  expect(cases[2].borderTopLeftRadius).toBe(4);
  expect(cases[4].borderBottomLeftRadius).toBe(4);
  expect(cases.every((value) => !Object.hasOwn(value, 'color'))).toBe(true);
  expect(source).toHaveBeenCalledTimes(1);
});
