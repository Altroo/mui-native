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

// Accordion uses root-type boundaries, which are different from last-child:
// an intervening Text has a native type of its own but remains an element.
describe.each([
  ['first-of-type', 'firstOfType'],
  ['last-of-type', 'lastOfType'],
] as const)('%s physical predicate', (pseudo, key) => {
  test.each([undefined, false, true])('matches only a verified true fact: %s', (value) => {
    const result = resolveSx({ [`&:${pseudo}`]: { opacity: 0.3 } }, theme, { [key]: value });
    expect(result.opacity).toBe(value === true ? 0.3 : undefined);
  });
  test('contributes specificity and leaves genuine inline declarations last', () => {
    const input = {
      [`&.chosen:${pseudo}`]: { marginTop: '3px' },
      [`&:${pseudo}`]: { marginTop: '8px' },
    };
    const computed = resolveSx(input, theme, { classes: ['chosen'], [key]: true });
    expect(computed.marginTop).toBe(3);
    expect(mergeNativeRootStyle('ltr', computed, { margin: 7 }).margin).toBe(7);
    expect(mergeNativeRootStyle('ltr', computed, { margin: 7 }).marginTop).toBeUndefined();
  });
  test('a descendant uses its own type boundary, never the owner fact', () => {
    const input = { '& .Target': { [`&:${pseudo}`]: { opacity: 0.3 } } };
    expect(
      resolveSx(input, theme, {
        [key]: false,
        descendantPath: [{ classes: ['Target'], [key]: true }],
      }).opacity,
    ).toBe(0.3);
    expect(
      resolveSx(input, theme, {
        [key]: true,
        descendantPath: [{ classes: ['Target'] }],
      }).opacity,
    ).toBeUndefined();
  });
  test('rebinds retained CSS without replaying source callbacks', () => {
    const rule = jest.fn(() => ({ [`&:${pseudo}`]: { opacity: 0.3 } }));
    const carrier = createNativeStyledStyle(theme, '', {}, rule, { [key]: false }, undefined);
    expect(rule).toHaveBeenCalledTimes(1);
    expect(
      componentRootStyle(theme, '', {}, undefined, carrier, { [key]: false }).computed.opacity,
    ).toBeUndefined();
    expect(
      componentRootStyle(theme, '', {}, undefined, carrier, { [key]: true }).computed.opacity,
    ).toBe(0.3);
    expect(rule).toHaveBeenCalledTimes(1);
  });
  test('binds the current ancestor fact instead of the child fact', () => {
    const prepared = componentRootStyle(theme, '', {}, undefined, undefined, {
      [key]: true,
      baseStyle: { [`&:${pseudo} .Target`]: { opacity: 0.3 } },
    });
    const child = componentRootStyle(theme, '', {}, undefined, undefined, {
      ancestors: [
        {
          theme,
          name: '',
          props: {},
          prepared: prepared.prepared,
          context: {
            [key]: true,
            descendantClasses: ['Target'],
            descendantPath: [{ classes: ['Target'] }],
          },
          sameRoot: false,
        },
      ],
    });
    expect(child.computed.opacity).toBe(0.3);
  });
});
test('a singleton can be first and last of its type without being the last child', () => {
  expect(
    resolveSx(
      {
        '&:first-of-type:last-of-type': { opacity: 0.2 },
        '&:last-child': { opacity: 0.9 },
      },
      theme,
      { firstOfType: true, lastOfType: true, lastChild: false },
    ).opacity,
  ).toBe(0.2);
});
test('repeated structural predicates preserve CSS specificity', () => {
  expect(
    resolveSx(
      {
        '&:first-of-type:first-of-type': { opacity: 0.2 },
        '&:first-of-type': { opacity: 0.9 },
      },
      theme,
      { firstOfType: true },
    ).opacity,
  ).toBe(0.2);
});
test('unused type facts are lazy, and matching reads each requested fact once', () => {
  const firstOfType = jest.fn(() => true);
  const lastOfType = jest.fn(() => {
    throw Error('unrelated last-of-type read');
  });
  const context = Object.defineProperties(
    {},
    {
      firstOfType: { get: firstOfType },
      lastOfType: { get: lastOfType },
    },
  );
  const rootContext = Object.create(null, {
    ...Object.getOwnPropertyDescriptors(context),
    baseStyle: {
      value: {
        '&:first-of-type': { opacity: 0.3 },
        '&:first-of-type:first-of-type': { height: 5 },
      },
      enumerable: true,
    },
  });
  expect(
    componentRootStyle(theme, '', {}, undefined, undefined, rootContext).computed,
  ).toMatchObject({ opacity: 0.3, height: 5 });
  expect(firstOfType).toHaveBeenCalledTimes(1);
  expect(lastOfType).not.toHaveBeenCalled();
});

test('before declarations target the ornament without leaking into root geometry', () => {
  const input = {
    padding: 2,
    '&::before': { top: '-1px', height: '1px', opacity: 1 },
    '&:first-of-type': { '&::before': { display: 'none' } },
  };
  expect(resolveSx(input, theme)).toMatchObject({ padding: 16 });
  expect(resolveSx(input, theme).height).toBeUndefined();
  expect(
    resolveSx(input, theme, {
      firstOfType: true,
      descendantPath: [{ classes: [], tag: '::before' }],
    }),
  ).toMatchObject({ top: -1, height: 1, display: 'none' });
  expect(
    resolveSx(input, theme, { descendantPath: [{ classes: [], tag: '::before' }] }).padding,
  ).toBeUndefined();
});
