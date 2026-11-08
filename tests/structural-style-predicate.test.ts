// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { StyleSheet } from 'react-native';
import {
  createTheme,
  resolveSx,
  componentRootStyle,
  createNativeStyledStyle,
  configureDiagnostics,
} from '../packages/system/src';
import { mergeNativeRootStyle } from '../packages/material/src/nativeControlStyles';
const theme = createTheme();
const base = { padding: 16, '&:last-child': { paddingBottom: 24 } };
const content = (lastChild: boolean | undefined, sx?: Parameters<typeof componentRootStyle>[3]) =>
  componentRootStyle(theme, 'MuiCardContent', {}, sx, undefined, {
    baseStyle: base,
    classes: ['MuiCardContent-root'],
    lastChild,
  });
test('unknown and false structure never become last-child matches', () => {
  expect(content(undefined).computed.paddingBottom).toBeUndefined();
  expect(content(false).computed.paddingBottom).toBeUndefined();
  expect(content(false).computed.padding).toBe(16);
  expect(content(true).computed.paddingBottom).toBe(24);
});
test('the source pseudo-class retains priority over later root sx shorthands', () => {
  expect(content(true, { p: 0 }).computed).toMatchObject({ padding: 0, paddingBottom: 24 });
  expect(content(false, { p: 0 }).computed.paddingBottom).toBeUndefined();
  expect(content(true, { paddingBottom: 5 }).computed.paddingBottom).toBe(24);
  expect(content(false, { paddingBottom: 5 }).computed.paddingBottom).toBe(40);
});
test('an equally specific later last-child sx rule can replace the source default', () => {
  expect(content(true, { '&:last-child': { paddingBottom: 5 } }).computed.paddingBottom).toBe(40);
  expect(
    content(false, { '&:last-child': { paddingBottom: 5 } }).computed.paddingBottom,
  ).toBeUndefined();
});
test('genuine native inline declarations still override conditional CSS', () => {
  const computed = content(true).computed;
  const direct = StyleSheet.flatten(mergeNativeRootStyle('ltr', computed, { paddingBottom: 4 }));
  expect(direct?.paddingBottom).toBe(4);
  const shorthand = StyleSheet.flatten(mergeNativeRootStyle('ltr', computed, { padding: 4 }));
  expect(shorthand?.paddingBottom ?? shorthand?.paddingVertical ?? shorthand?.padding).toBe(4);
});
test('a matching self class and pseudo-class accumulate specificity', () => {
  const result = resolveSx(
    { '&.chosen:last-child': { paddingBottom: 2 }, '&:last-child': { paddingBottom: 5 } },
    theme,
    { classes: ['chosen'], lastChild: true },
  );
  expect(result.paddingBottom).toBe(16);
});
test('selector lists select their greatest matching specificity once', () => {
  const getter = jest.fn(() => 2);
  const declaration = Object.defineProperty({}, 'paddingBottom', { enumerable: true, get: getter });
  const result = resolveSx({ '&.chosen, &:last-child': declaration }, theme, {
    classes: ['chosen'],
    lastChild: true,
  });
  expect(result.paddingBottom).toBe(16);
  expect(getter).toHaveBeenCalledTimes(1);
});
test('retained branches rebind structure without rerunning owning callbacks', () => {
  const root = jest.fn(() => ({ padding: 3 }));
  const unused = jest.fn(() => ({ marginTop: 99 }));
  const selected = createTheme({
    components: { MuiCardContent: { styleOverrides: { root, unused } } },
  });
  const carrier = createNativeStyledStyle(
    selected,
    'MuiCardContent',
    {},
    undefined,
    { baseStyle: base, classes: ['MuiCardContent-root'], lastChild: false },
    undefined,
  );
  expect(root).toHaveBeenCalledTimes(1);
  expect(unused).toHaveBeenCalledTimes(1);
  const before = componentRootStyle(selected, '', {}, undefined, carrier, {
    classes: ['MuiCardContent-root'],
    lastChild: false,
  });
  const after = componentRootStyle(selected, '', {}, undefined, carrier, {
    classes: ['MuiCardContent-root'],
    lastChild: true,
  });
  expect(before.computed.paddingBottom).toBeUndefined();
  expect(after.computed.paddingBottom).toBe(24);
  expect(root).toHaveBeenCalledTimes(1);
  expect(unused).toHaveBeenCalledTimes(1);
});
test('nested physical targets use their own fact rather than the owner root fact', () => {
  const input = { '& .chosen': { '&:last-child': { marginTop: 2 } } };
  expect(
    resolveSx(input, theme, {
      lastChild: false,
      descendantPath: [{ classes: ['chosen'], lastChild: true }],
    }).marginTop,
  ).toBe(16);
  expect(
    resolveSx(input, theme, {
      lastChild: true,
      descendantPath: [{ classes: ['chosen'], lastChild: false }],
    }).marginTop,
  ).toBeUndefined();
});
test('other unsupported pseudo-classes retain the existing diagnostic', () => {
  const messages: string[] = [];
  const restore = configureDiagnostics((value) => messages.push(value.code));
  try {
    resolveSx({ '&:first-child': { marginTop: 2 } }, theme, { lastChild: true });
  } finally {
    restore();
  }
  expect(messages).toEqual(['selector']);
});

test('ordinary selectors do not observe an unrelated structural-fact accessor', () => {
  const lastChild = jest.fn(() => {
    throw Error('unrelated structural read');
  });
  const context = Object.defineProperty({ classes: ['chosen'] }, 'lastChild', { get: lastChild });
  expect(resolveSx({ '&.chosen': { paddingBottom: 2 } }, theme, context).paddingBottom).toBe(16);
  expect(lastChild).not.toHaveBeenCalled();
});
