// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { I18nManager, Platform } from 'react-native';
import {
  componentRootStyle,
  createTheme,
  resolveSx,
  type NativeStyle,
  type StyleContext,
} from '../packages/system/src';

type Direction = 'ltr' | 'rtl';
const theme = createTheme();
afterEach(() => jest.restoreAllMocks());
function host(globalRTL: boolean, swap: boolean, platform: 'ios' | 'android' = 'android') {
  jest.replaceProperty(I18nManager, 'isRTL', globalRTL);
  jest.replaceProperty(I18nManager, 'doLeftAndRightSwapInRTL', swap);
  jest.replaceProperty(Platform, 'OS', platform);
}
// RN0.88.1 YogaLayoutableShadowNode.cpp:641,971-1002 copies physical
// position/padding/margin into Start/End only for global RTL + enabled swap.
// Yoga Style.h computeLeftEdge/computeRightEdge then gives logical edges
// precedence using the actual local node direction. These are backend props,
// not a claim of measured native layout or pixels.
function backendEdges(
  style: NativeStyle,
  kind: 'padding' | 'margin' | 'position',
  local: Direction,
) {
  const prefix = kind === 'position' ? '' : kind;
  const physical = (side: 'Left' | 'Right') => (prefix ? prefix + side : side.toLowerCase());
  const logical = (side: 'Start' | 'End') => (prefix ? prefix + side : side.toLowerCase());
  const props: Record<string, unknown> = { ...style };
  if (I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL) {
    for (const [side, edge] of [
      ['Left', 'Start'],
      ['Right', 'End'],
    ] as const) {
      if (props[physical(side)] != null) props[logical(edge)] = props[physical(side)];
      delete props[physical(side)];
    }
  }
  const value = (side: 'Left' | 'Right') => {
    const edge = (side === 'Left') !== (local === 'rtl') ? 'Start' : 'End';
    return (
      props[logical(edge)] ??
      props[physical(side)] ??
      (prefix ? (props[prefix + 'Horizontal'] ?? props[prefix]) : undefined)
    );
  };
  return { left: value('Left'), right: value('Right') };
}
const hosts = (['ios', 'android'] as const).flatMap((platform) =>
  [false, true].flatMap((globalRTL) =>
    [false, true].flatMap((swap) =>
      (['ltr', 'rtl'] as const).map((direction) => ({ platform, globalRTL, swap, direction })),
    ),
  ),
);
test.each(hosts)(
  'protected CSS physical layout edges survive actual host policy: %j',
  ({ platform, globalRTL, swap, direction }) => {
    host(globalRTL, swap, platform);
    const input = Object.freeze({
      position: 'absolute',
      left: 10,
      right: 20,
      paddingLeft: 13,
      paddingRight: 7,
      marginLeft: 72,
      marginRight: 9,
    });
    const result = resolveSx(input, theme, {
      mode: 'css',
      parentDirection: direction,
      protectPhysicalGeometry: true,
    });
    expect(backendEdges(result, 'position', direction)).toEqual({ left: 10, right: 20 });
    expect(backendEdges(result, 'padding', direction)).toEqual({ left: 13, right: 7 });
    expect(backendEdges(result, 'margin', direction)).toEqual({ left: 72, right: 9 });
    expect(result.direction).toBe(direction);
    expect(input).toEqual({
      position: 'absolute',
      left: 10,
      right: 20,
      paddingLeft: 13,
      paddingRight: 7,
      marginLeft: 72,
      marginRight: 9,
    });
  },
);
test.each(hosts)(
  'CSS logical/physical declaration order resolves once in final native direction: %j',
  ({ platform, globalRTL, swap, direction }) => {
    host(globalRTL, swap, platform);
    const physical = direction === 'ltr' ? 'Left' : 'Right';
    const other = direction === 'ltr' ? 'Right' : 'Left';
    const side = direction === 'ltr' ? 'left' : 'right';
    const otherSide = direction === 'ltr' ? 'right' : 'left';
    for (const logicalLast of [false, true]) {
      const logical = { paddingStart: 13, marginStart: 17, start: 10 };
      const edge = { ['padding' + physical]: 7, ['margin' + physical]: 9, [side]: 20 };
      const result = resolveSx(
        [
          { direction: direction === 'ltr' ? 'rtl' : 'ltr' },
          ...(logicalLast ? [edge, logical] : [logical, edge]),
          { ['padding' + other]: 3, ['margin' + other]: 4, [otherSide]: 5 },
        ],
        theme,
        {
          mode: 'css',
          parentDirection: direction === 'ltr' ? 'rtl' : 'ltr',
          nativeStyle: { direction },
          protectPhysicalGeometry: true,
        },
      );
      expect(backendEdges(result, 'padding', direction)).toEqual({
        [side]: logicalLast ? 13 : 7,
        [otherSide]: 3,
      });
      expect(backendEdges(result, 'margin', direction)).toEqual({
        [side]: logicalLast ? 17 : 9,
        [otherSide]: 4,
      });
      expect(backendEdges(result, 'position', direction)).toEqual({
        [side]: logicalLast ? 10 : 20,
        [otherSide]: 5,
      });
    }
  },
);
test.each(
  (['ltr', 'rtl'] as const).flatMap((parent) =>
    [undefined, null, 'inherit'].map((reset) => ({ parent, reset })),
  ),
)(
  'own native direction reset uses inherited $parent rather than computed CSS: $reset',
  ({ parent, reset }) => {
    host(true, true);
    const input = Object.freeze({
      direction: parent === 'ltr' ? 'rtl' : 'ltr',
      paddingStart: 13,
      marginStart: 17,
      start: 10,
    });
    // Null is accepted by RN's RawValue reset path even though TextStyle only
    // declares undefined; exercise the runtime boundary without widening it.
    const inline = Object.freeze({ direction: reset }) as NativeStyle;
    const result = componentRootStyle(theme, '', {}, input, inline, {
      mode: 'css',
      parentDirection: parent,
      protectPhysicalGeometry: true,
    });
    expect(result.computed.direction).toBe(parent);
    const expected =
      parent === 'ltr' ? { left: 13, right: undefined } : { left: undefined, right: 13 };
    expect(backendEdges(result.computed, 'padding', parent)).toEqual(expected);
    const physicalStart = parent === 'ltr' ? 'left' : 'right';
    expect(backendEdges(result.computed, 'margin', parent)[physicalStart]).toBe(17);
    expect(backendEdges(result.computed, 'position', parent)[physicalStart]).toBe(10);
    expect(result.authored).toContain(inline);
    expect(Object.hasOwn(inline, 'direction')).toBe(true);
    expect(inline.direction).toBe(reset);
  },
);
test.each(['ltr', 'rtl'] as const)(
  'absent native direction preserves CSS %s and original style identity',
  (direction) => {
    host(true, true);
    const inline = Object.freeze({ opacity: 0.7 });
    const result = componentRootStyle(
      theme,
      '',
      {},
      {
        direction,
        paddingStart: 13,
        marginStart: 17,
        start: 10,
      },
      inline,
      {
        mode: 'css',
        parentDirection: direction === 'ltr' ? 'rtl' : 'ltr',
        protectPhysicalGeometry: true,
      },
    );
    expect(result.computed.direction).toBe(direction);
    const side = direction === 'ltr' ? 'left' : 'right';
    expect(backendEdges(result.computed, 'padding', direction)[side]).toBe(13);
    expect(backendEdges(result.computed, 'position', direction)[side]).toBe(10);
    expect(result.authored).toContain(inline);
  },
);
test.each(['ltr', 'rtl', 'inherit'] as const)(
  'explicit logicalInsets direction keeps existing caller priority: %s',
  (direction) => {
    host(true, true);
    const context: StyleContext = {
      mode: 'css',
      protectPhysicalGeometry: true,
      parentDirection: 'rtl',
      logicalInsets: { parentDirection: 'ltr', direction },
      nativeStyle: { direction: 'rtl' },
    };
    const result = resolveSx({ direction: 'rtl', paddingStart: 13, start: 10 }, theme, context);
    const actual = direction === 'inherit' ? 'ltr' : direction;
    expect(result.direction).toBe(actual);
    const side = actual === 'ltr' ? 'left' : 'right';
    expect(backendEdges(result, 'padding', actual)[side]).toBe(13);
    expect(backendEdges(result, 'position', actual)[side]).toBe(10);
  },
);
test('legacy logicalInsets undefined remains a fallback, not a synthesized native reset', () => {
  host(false, false);
  const result = resolveSx({ direction: 'rtl', marginStart: 17, paddingStart: 13 }, theme, {
    mode: 'css',
    logicalInsets: { parentDirection: 'ltr', direction: undefined },
  });
  expect(result).toMatchObject({ direction: 'rtl', marginRight: 17, paddingRight: 13 });
});
test('native reset still takes effect when logicalInsets has only an undefined optional direction', () => {
  host(true, true);
  const result = resolveSx({ direction: 'rtl', paddingStart: 13, start: 10 }, theme, {
    mode: 'css',
    protectPhysicalGeometry: true,
    logicalInsets: { parentDirection: 'ltr', direction: undefined },
    nativeStyle: { direction: undefined },
  });
  expect(result.direction).toBe('ltr');
  expect(backendEdges(result, 'padding', 'ltr')).toEqual({ left: 13, right: undefined });
  expect(backendEdges(result, 'position', 'ltr')).toEqual({ left: 10, right: undefined });
});
test('protection is opt-in and never rewrites genuine native fields or unrelated styles', () => {
  host(true, true);
  const native = Object.freeze({ direction: 'rtl' as const, paddingLeft: 13, left: 10 });
  const result = componentRootStyle(theme, '', {}, { paddingLeft: 7, left: 3 }, native, {
    mode: 'css',
  });
  expect(result.computed).toMatchObject({ paddingLeft: 7, left: 3 });
  expect(result.authored).toContain(native);
  expect(native).toEqual({ direction: 'rtl', paddingLeft: 13, left: 10 });
});
test.each([false, true])(
  'late CSS padding shorthand resets logical edges before global protection: %s',
  (globalRTL) => {
    host(globalRTL, true);
    const result = resolveSx(
      [{ direction: 'rtl', paddingStart: 13, paddingEnd: 7 }, { padding: 2 }],
      theme,
      { mode: 'css', parentDirection: 'rtl', protectPhysicalGeometry: true },
    );
    expect(backendEdges(result, 'padding', 'rtl')).toEqual({ left: 2, right: 2 });
  },
);

test.each(
  (['ltr', 'rtl'] as const).flatMap((parent) =>
    [undefined, null].map((reset) => ({ parent, reset })),
  ),
)(
  'a final native array reset inherits $parent without mutating authored layers: $reset',
  ({ parent, reset }) => {
    host(true, true);
    const first = Object.freeze({ direction: parent === 'ltr' ? 'rtl' : 'ltr' }) as NativeStyle;
    const last = Object.freeze({ direction: reset }) as NativeStyle;
    const authored = Object.freeze([first, Object.freeze([last])]);
    const result = componentRootStyle(
      theme,
      '',
      {},
      {
        direction: parent === 'ltr' ? 'rtl' : 'ltr',
        paddingStart: 13,
        start: 10,
      },
      authored,
      { mode: 'css', parentDirection: parent, protectPhysicalGeometry: true },
    );
    expect(result.computed.direction).toBe(parent);
    const side = parent === 'ltr' ? 'left' : 'right';
    expect(backendEdges(result.computed, 'padding', parent)[side]).toBe(13);
    expect(backendEdges(result.computed, 'position', parent)[side]).toBe(10);
    expect(result.authored).toEqual([first, last]);
    expect(result.authored).toContain(first);
    expect(result.authored).toContain(last);
    expect(last.direction).toBe(reset);
  },
);
