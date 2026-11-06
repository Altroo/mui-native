// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { I18nManager, Platform, StyleSheet, type StyleProp } from 'react-native';
import type { NativeStyle } from '../packages/system/src';
import {
  nativeInlineBorderBase,
  nativeInlineSideMapper,
} from '../packages/material/src/nativeInlineBorders';
import { mergeNativeButtonStyle } from '../packages/material/src/buttonBase';
type MutableStyle = { -readonly [Key in keyof NativeStyle]: NativeStyle[Key] };
import { mergeNativeStyles } from '../packages/material/src/nativeControlStyles';

test('native border shorthands replace computed corners and edge channels', () => {
  const computed = { borderTopLeftRadius: 0, borderLeftWidth: 3, borderLeftColor: 'red' };
  const authored = { borderRadius: 7, borderWidth: 0, borderColor: 'blue' };
  const merged = mergeNativeStyles(
    'ltr',
    nativeInlineBorderBase(computed, authored, 'ltr'),
    authored,
  );
  expect(StyleSheet.flatten(merged)).toEqual(authored);
});

afterEach(() => jest.restoreAllMocks());
const cornerNames = [
  'TopLeft',
  'TopRight',
  'BottomLeft',
  'BottomRight',
  'TopStart',
  'TopEnd',
  'BottomStart',
  'BottomEnd',
  'StartStart',
  'StartEnd',
  'EndStart',
  'EndEnd',
] as const;
test('the owned base clears every computed corner and color/width edge but leaves authored unmerged', () => {
  const computed: MutableStyle = {
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'red',
    opacity: 0.5,
  };
  for (const corner of cornerNames) computed[`border${corner}Radius`] = 0;
  for (const channel of ['Width', 'Color'] as const)
    for (const edge of ['Top', 'Right', 'Bottom', 'Left', 'Start', 'End'] as const)
      if (channel === 'Width') computed[`border${edge}${channel}`] = 3;
      else computed[`border${edge}${channel}`] = 'red';
  Object.freeze(computed);
  const authored = Object.freeze({ borderRadius: 7, borderWidth: 0, borderColor: 'blue' });
  const base = nativeInlineBorderBase(computed, authored);
  expect(base).not.toBe(computed);
  expect(base).toEqual({ borderRadius: 4, borderWidth: 2, borderColor: 'red', opacity: 0.5 });
  expect(authored).toEqual({ borderRadius: 7, borderWidth: 0, borderColor: 'blue' });
  expect(computed.borderTopLeftRadius).toBe(0);
});
const policies = [
  { platform: 'ios', global: false, swap: false, direction: 'ltr', clear: ['Left', 'Start'] },
  { platform: 'ios', global: false, swap: false, direction: 'rtl', clear: ['Left', 'End'] },
  { platform: 'ios', global: false, swap: true, direction: 'ltr', clear: ['Left', 'Start'] },
  { platform: 'ios', global: false, swap: true, direction: 'rtl', clear: ['Left', 'End'] },
  { platform: 'ios', global: true, swap: false, direction: 'ltr', clear: ['Left', 'Start'] },
  { platform: 'ios', global: true, swap: false, direction: 'rtl', clear: ['Left', 'End'] },
  { platform: 'ios', global: true, swap: true, direction: 'ltr', clear: ['Left', 'Start'] },
  { platform: 'ios', global: true, swap: true, direction: 'rtl', clear: ['Left', 'Start'] },
  { platform: 'android', global: false, swap: false, direction: 'ltr', clear: ['Left', 'Start'] },
  { platform: 'android', global: false, swap: false, direction: 'rtl', clear: ['Left', 'End'] },
  { platform: 'android', global: false, swap: true, direction: 'ltr', clear: ['Left', 'Start'] },
  { platform: 'android', global: false, swap: true, direction: 'rtl', clear: ['Left', 'Start'] },
  { platform: 'android', global: true, swap: false, direction: 'ltr', clear: ['Left', 'Start'] },
  { platform: 'android', global: true, swap: false, direction: 'rtl', clear: ['Left', 'End'] },
  { platform: 'android', global: true, swap: true, direction: 'ltr', clear: ['Left', 'Start'] },
  { platform: 'android', global: true, swap: true, direction: 'rtl', clear: ['Left', 'Start'] },
] as const;
test.each(policies)(
  'specific border aliases follow native paint policy %j',
  ({ platform, global, swap, direction, clear }) => {
    jest.replaceProperty(Platform, 'OS', platform);
    jest.replaceProperty(I18nManager, 'isRTL', global);
    jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', swap);
    const computed: MutableStyle = { direction, opacity: 0.5 };
    for (const corner of cornerNames) computed[`border${corner}Radius`] = 2;
    for (const edge of ['Left', 'Right', 'Start', 'End'] as const) {
      computed[`border${edge}Width`] = 3;
      computed[`border${edge}Color`] = 'red';
    }
    const base = nativeInlineBorderBase(computed, {
      borderTopLeftRadius: 7,
      borderLeftWidth: 0,
      borderLeftColor: 'blue',
    });
    for (const edge of ['Left', 'Right', 'Start', 'End'] as const) {
      expect(base[`border${edge}Width`]).toBe(clear.some((item) => item === edge) ? undefined : 3);
      expect(base[`border${edge}Color`]).toBe(
        clear.some((item) => item === edge) ? undefined : 'red',
      );
      expect(base[`borderTop${edge}Radius`]).toBe(
        clear.some((item) => item === edge) ? undefined : 2,
      );
    }
    expect(base.borderStartStartRadius).toBe(
      clear.some((item) => item === 'Start') ? undefined : 2,
    );
    expect(base.borderStartEndRadius).toBe(clear.some((item) => item === 'End') ? undefined : 2);
    expect(base.borderBottomLeftRadius).toBe(2);
    expect(base.borderBottomRightRadius).toBe(2);
    expect(base.borderEndStartRadius).toBe(2);
    expect(base.borderEndEndRadius).toBe(2);
  },
);
test('modern corner aliases remove their equivalent physical and legacy logical corners only', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  jest.replaceProperty(I18nManager, 'isRTL', false);
  jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', false);
  const computed: MutableStyle = {
    direction: 'rtl',
    borderTopRightRadius: 1,
    borderTopStartRadius: 2,
    borderStartStartRadius: 3,
    borderTopLeftRadius: 4,
    borderBottomRightRadius: 5,
  };
  expect(nativeInlineBorderBase(computed, { borderStartStartRadius: 7 })).toEqual({
    direction: 'rtl',
    borderTopLeftRadius: 4,
    borderBottomRightRadius: 5,
  });
});
test('registered nested style arrays and null holes preserve genuine native specificity', () => {
  const registered = StyleSheet.create({
    reset: { borderRadius: 7, borderWidth: 0, borderColor: 'blue' },
    edge: { borderTopLeftRadius: 9 },
  });
  const authored: StyleProp<NativeStyle> = [
    null,
    false,
    [registered.reset, undefined],
    registered.edge,
  ];
  const computed = Object.freeze({
    borderTopLeftRadius: 0,
    borderLeftWidth: 3,
    borderLeftColor: 'red',
  });
  const base = nativeInlineBorderBase(computed, authored);
  expect(base).toEqual({});
  expect(StyleSheet.flatten([base, authored])).toEqual({
    borderRadius: 7,
    borderWidth: 0,
    borderColor: 'blue',
    borderTopLeftRadius: 9,
  });
  expect(computed).toEqual({ borderTopLeftRadius: 0, borderLeftWidth: 3, borderLeftColor: 'red' });
});
test('the optional parent direction handles inherited roots without changing ButtonBase fallback', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  jest.replaceProperty(I18nManager, 'isRTL', false);
  jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', false);
  const computed = { borderTopLeftRadius: 0, borderTopEndRadius: 2, borderTopStartRadius: 3 };
  expect(nativeInlineBorderBase(computed, { borderTopLeftRadius: 7 }, 'rtl')).toEqual({
    borderTopStartRadius: 3,
  });
  expect(nativeInlineBorderBase(computed, { borderTopLeftRadius: 7 })).toEqual({
    borderTopEndRadius: 2,
  });
  expect(
    nativeInlineBorderBase(
      { ...computed, direction: 'rtl' },
      { direction: 'inherit', borderTopLeftRadius: 7 },
      'ltr',
    ),
  ).toEqual({ direction: 'rtl', borderTopEndRadius: 2 });
});
test('native layout margins remain separate from Android local paint swapping', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.replaceProperty(I18nManager, 'isRTL', false);
  jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', true);
  const side = nativeInlineSideMapper({ direction: 'rtl' }, undefined);
  expect(side('Left')).toBe('Right');
  expect(side('Left', false)).toBe('Left');
  const computed = {
    direction: 'rtl' as const,
    borderStartWidth: 3,
    marginStart: -1,
    marginEnd: -2,
  };
  expect(mergeNativeButtonStyle(computed, { borderLeftWidth: 0, marginLeft: 0 })).toEqual({
    direction: 'rtl',
    marginStart: -1,
    borderLeftWidth: 0,
    marginLeft: 0,
  });
});
test('absent and false authored layers still return an owned computed clone', () => {
  const computed = Object.freeze({ borderTopLeftRadius: 0, borderLeftWidth: 3 });
  for (const authored of [undefined, null, false] as const) {
    const base = nativeInlineBorderBase(computed, authored);
    expect(base).toEqual(computed);
    expect(base).not.toBe(computed);
  }
});
