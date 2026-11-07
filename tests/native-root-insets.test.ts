// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { I18nManager, Platform, StyleSheet, type StyleProp } from 'react-native';
import { createTheme, resolveSx, type NativeStyle } from '../packages/system/src';
import { mergeNativeRootStyle } from '../packages/material/src/nativeControlStyles';

import { backendEdges } from './helpers/nativeInsetEdges';

const profiles = (['ios', 'android'] as const).flatMap((os) =>
  [false, true].flatMap((globalRTL) =>
    [false, true].flatMap((swap) =>
      (['ltr', 'rtl'] as const).map((direction) => ({ os, globalRTL, swap, direction })),
    ),
  ),
);
afterEach(() => jest.restoreAllMocks());

describe.each(profiles)(
  'native root insets $os globalRTL=$globalRTL swap=$swap direction=$direction',
  (profile) => {
    test.each(['margin', 'padding'] as const)(
      '%s retains CSS protection and genuine native priority',
      (kind) => {
        jest.replaceProperty(Platform, 'OS', profile.os);
        jest.replaceProperty(I18nManager, 'isRTL', profile.globalRTL);
        jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', profile.swap);
        const swap = profile.globalRTL && profile.swap;
        const rtl = profile.direction === 'rtl';
        const computed = Object.freeze(
          resolveSx(
            {
              [kind]: 0,
              // The current CSS resolver protects physical margins. Exercise
              // logical padding at the merger boundary without claiming that
              // unrelated physical-padding conversion is implemented here.
              [kind === 'margin'
                ? 'marginLeft'
                : `padding${profile.direction === 'rtl' ? 'End' : 'Start'}`]: 72,
              [`${kind}Top`]: 9,
            },
            createTheme(),
            {
              parentDirection: profile.direction,
              protectPhysicalGeometry: true,
              mode: 'css',
            },
          ),
        );
        const base = { left: 72, right: 0, top: 9, bottom: 0 };
        expect(backendEdges(computed, kind, profile.direction, swap)).toEqual(base);
        const mirroredNativeLeft = swap && rtl;
        const registered = StyleSheet.create<{ sample: NativeStyle }>({
          sample: { [kind]: 0, [`${kind}Top`]: 2 },
        }).sample;
        const cases: {
          name: string;
          inline: StyleProp<NativeStyle>;
          expected: ReturnType<typeof backendEdges>;
        }[] = [
          { name: 'CSS without authored style', inline: undefined, expected: base },
          { name: 'empty authored object', inline: {}, expected: base },
          {
            name: 'native all-edge reset',
            inline: { [kind]: 0 },
            expected: { left: 0, right: 0, top: 0, bottom: 0 },
          },
          {
            name: 'native horizontal reset',
            inline: { [`${kind}Horizontal`]: 5 },
            expected: { ...base, left: 5, right: 5 },
          },
          {
            name: 'native vertical reset',
            inline: { [`${kind}Vertical`]: 5 },
            expected: { ...base, top: 5, bottom: 5 },
          },
          {
            name: 'native physical left alias',
            inline: { [`${kind}Left`]: 3 },
            expected: {
              ...base,
              left: mirroredNativeLeft ? 72 : 3,
              right: mirroredNativeLeft ? 3 : 0,
            },
          },
          {
            name: 'native logical end alias',
            inline: { [`${kind}End`]: 4 },
            expected: { ...base, left: rtl ? 4 : 72, right: rtl ? 0 : 4 },
          },
          {
            name: 'native logical start above horizontal',
            inline: { [`${kind}Horizontal`]: 5, [`${kind}Start`]: 3 },
            expected: { ...base, left: rtl ? 5 : 3, right: rtl ? 3 : 5 },
          },
          {
            name: 'specific native edge above later array shorthand',
            inline: [{ [`${kind}Left`]: 0 }, { [`${kind}Horizontal`]: 5 }],
            expected: {
              ...base,
              left: mirroredNativeLeft ? 5 : 0,
              right: mirroredNativeLeft ? 0 : 5,
            },
          },
          {
            name: 'registered native style in a sparse array',
            inline: [false, undefined, registered, null],
            expected: { left: 0, right: 0, top: 2, bottom: 0 },
          },
        ];
        cases.push(
          {
            name: 'native Inline axis reset',
            inline: { [`${kind}Inline`]: 5 },
            expected: { ...base, left: 5, right: 5 },
          },
          {
            name: 'native Block axis reset',
            inline: { [`${kind}Block`]: 5 },
            expected: { ...base, top: 5, bottom: 5 },
          },
          {
            name: 'native InlineStart above Start',
            inline: { [`${kind}Start`]: 7, [`${kind}InlineStart`]: 3 },
            expected: { ...base, left: rtl ? 72 : 3, right: rtl ? 3 : 0 },
          },
          {
            name: 'native InlineEnd',
            inline: { [`${kind}InlineEnd`]: 4 },
            expected: { ...base, left: rtl ? 4 : 72, right: rtl ? 0 : 4 },
          },
          {
            name: 'native Inline plus InlineStart',
            inline: { [`${kind}Inline`]: 5, [`${kind}InlineStart`]: 3 },
            expected: { ...base, left: rtl ? 5 : 3, right: rtl ? 3 : 5 },
          },
          {
            name: 'native physical edge follows InlineStart during Fabric swap',
            inline: { [`${kind}Left`]: 3, [`${kind}InlineStart`]: 5 },
            expected: {
              ...base,
              left: swap ? (rtl ? 72 : 3) : rtl ? 3 : 5,
              right: rtl ? (swap ? 3 : 5) : 0,
            },
          },
          {
            name: 'native BlockStart replaces computed top',
            inline: { [`${kind}BlockStart`]: 5 },
            expected: { ...base, top: 5 },
          },
          {
            name: 'native BlockEnd retains unrelated top',
            inline: { [`${kind}BlockEnd`]: 6 },
            expected: { ...base, bottom: 6 },
          },
          {
            name: 'native Top keeps precedence over BlockStart',
            inline: { [`${kind}Top`]: 2, [`${kind}BlockStart`]: 5 },
            expected: { ...base, top: 2 },
          },
          {
            name: 'native Inline above all-edge shorthand',
            inline: { [kind]: 0, [`${kind}Inline`]: 3 },
            expected: { left: 3, right: 3, top: 0, bottom: 0 },
          },
        );
        for (const entry of cases) {
          const authoredBefore = StyleSheet.flatten(entry.inline);
          const original = authoredBefore && { ...authoredBefore };
          const merged = mergeNativeRootStyle(profile.direction, computed, entry.inline);
          expect({
            case: entry.name,
            ...backendEdges(merged, kind, profile.direction, swap),
          }).toEqual({ case: entry.name, ...entry.expected });
          expect(StyleSheet.flatten(entry.inline)).toEqual(original);
          expect(backendEdges(computed, kind, profile.direction, swap)).toEqual(base);
        }
      },
    );
  },
);

// An own undefined is a real native reset; absence still preserves CSS direction.
test.each(['ltr', 'rtl'] as const)(
  'native direction reset inherits %s for overlap cleanup',
  (parent) => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.replaceProperty(I18nManager, 'isRTL', false);
    jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', false);
    const opposite = parent === 'ltr' ? 'rtl' : 'ltr';
    const computed = resolveSx({ direction: opposite, marginLeft: 72 }, createTheme(), {
      parentDirection: parent,
      protectPhysicalGeometry: true,
      mode: 'css',
    });
    const key = parent === 'ltr' ? 'marginEnd' : 'marginStart';
    const reset = mergeNativeRootStyle(parent, computed, { direction: undefined, [key]: 3 });
    expect(reset).toHaveProperty('direction', undefined);
    expect(backendEdges(reset, 'margin', parent, false)).toEqual({
      left: 72,
      right: 3,
      top: 0,
      bottom: 0,
    });
    const inherited = mergeNativeRootStyle(parent, computed, { direction: 'inherit', [key]: 3 });
    expect(backendEdges(inherited, 'margin', parent, false)).toEqual({
      left: 72,
      right: 3,
      top: 0,
      bottom: 0,
    });
    const absent = mergeNativeRootStyle(parent, computed, { [key]: 3 });
    expect(absent.direction).toBe(opposite);
    expect(backendEdges(absent, 'margin', opposite, false)).toEqual({
      left: 3,
      right: 0,
      top: 0,
      bottom: 0,
    });
  },
);
