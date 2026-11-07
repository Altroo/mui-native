import originalPaper from './fixtures/mui-paper-9.5.0.json';
import { Platform, PlatformColor } from 'react-native';
// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  componentStyle,
  configureDiagnostics,
  createTheme,
  resolveSx,
  type Shadows,
  type Theme,
} from '../packages/system/src';

afterEach(() => jest.restoreAllMocks());

test('theme defaults retain all 25 pinned shadow tokens and independent arrays', () => {
  const first = createTheme();
  const second = createTheme();
  expect(first.shadows).toHaveLength(25);
  expect(first.shadows[0]).toBe('none');
  expect(first.shadows[2]).toBe(
    '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)',
  );
  expect(first.shadows[24]).toBe(
    '0px 11px 15px -7px rgba(0,0,0,0.2),0px 24px 38px 3px rgba(0,0,0,0.14),0px 9px 46px 8px rgba(0,0,0,0.12)',
  );
  first.shadows[2] = 'none';
  expect(second.shadows[2]).not.toBe('none');
});

test('numeric shadows resolve source defaults and custom tuples without legacy double paint', () => {
  const theme = createTheme();
  expect(resolveSx({ boxShadow: 2 }, theme)).toEqual({ boxShadow: theme.shadows[2] });
  expect(resolveSx({ boxShadow: '2' }, theme)).toEqual({ boxShadow: theme.shadows[2] });
  const shadows: Shadows = [...theme.shadows];
  shadows[2] = 'inset 0px 1px 4px -2px #123456, 2px 3px 6px 1px rgba(3,4,5,0.4)';
  const custom = createTheme({ shadows });
  expect(resolveSx({ boxShadow: 2 }, custom)).toEqual({ boxShadow: shadows[2] });
  expect(resolveSx([{ boxShadow: 2 }, { boxShadow: 0 }], custom)).toEqual({ boxShadow: 'none' });
  expect(resolveSx({ boxShadow: 'none' }, custom)).toEqual({ boxShadow: 'none' });
});

test('rem shadows convert root lengths while keeping all layers, spread and color', () => {
  expect(
    resolveSx(
      { boxShadow: '#123456 0 0.5rem 1rem -0.25rem inset, 0 1px 2px red' },
      createTheme({ cssRootFontSize: 20 }),
    ),
  ).toEqual({ boxShadow: '#123456 0 10px 20px -5px inset, 0 1px 2px red' });
});

test('currentColor binds only after computed, inherited and final native foregrounds settle', () => {
  const theme = createTheme();
  const shadow = '0 1px 2px currentColor';
  expect(resolveSx([{ color: '#123456', boxShadow: shadow }, { color: '#abcdef' }], theme)).toEqual(
    { color: '#abcdef', boxShadow: '0 1px 2px #abcdef' },
  );
  expect(
    resolveSx({ boxShadow: shadow }, theme, { parentTextStyle: { color: '#123456' } }),
  ).toEqual({ boxShadow: '0 1px 2px #123456' });
  expect(
    resolveSx({ color: '#123456', boxShadow: shadow }, theme, {
      nativeStyle: { color: '#abcdef' },
    }),
  ).toEqual({ color: '#123456', boxShadow: '0 1px 2px #abcdef' });
  expect(resolveSx({ boxShadow: shadow }, theme)).toEqual({
    boxShadow: `0 1px 2px ${theme.palette.text.primary}`,
  });
});

test('semantic native currentColor retains a native color object rather than stringifying it', () => {
  const color = PlatformColor('labelColor');
  expect(
    resolveSx({ boxShadow: '0 1px 2px currentColor' }, createTheme(), { nativeStyle: { color } }),
  ).toEqual({
    boxShadow: [{ offsetX: 0, offsetY: 1, blurRadius: 2, spreadDistance: 0, color, inset: false }],
  });
});

test('invalid indices and unsupported shadow syntax diagnose without erasing earlier valid styling', () => {
  const collect = jest.fn();
  const reset = configureDiagnostics(collect);
  try {
    const theme = createTheme();
    const invalid = [
      NaN,
      Infinity,
      -1,
      1.5,
      25,
      '1px',
      '0 red 2px',
      '0 0 -1px red',
      '0 0 red blue',
      '0 0 inset inset',
      '0 0 var(--shadow)',
      '0 0 calc(2 * 1px)',
      '0 0 1em black',
      '0 0 red,',
    ];
    for (const boxShadow of invalid) {
      expect(resolveSx([{ boxShadow: 'none' }, { boxShadow }], theme)).toEqual({
        boxShadow: 'none',
      });
    }
    expect(collect.mock.calls).toHaveLength(invalid.length);
    expect(collect.mock.calls.every(([event]) => event.code === 'box-shadow')).toBe(true);
  } finally {
    reset();
  }
});

test('Android 28 preserves outset shadows and rejects the entire unsupported inset declaration', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(28);
  const collect = jest.fn();
  const reset = configureDiagnostics(collect);
  try {
    const theme = createTheme();
    expect(resolveSx({ boxShadow: 2 }, theme)).toEqual({ boxShadow: theme.shadows[2] });
    expect(resolveSx({ boxShadow: '0 1px 2px red, inset 0 0 1px blue' }, theme)).toEqual({});
    expect(collect.mock.calls[0][0].code).toBe('box-shadow-platform');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(29);
    expect(resolveSx({ boxShadow: 'inset 0 0 1px blue' }, theme)).toEqual({
      boxShadow: 'inset 0 0 1px blue',
    });
  } finally {
    reset();
  }
});

test('legacy Android exposes an explicit numeric approximation and never invents custom shadow parity', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(27);
  const collect = jest.fn();
  const reset = configureDiagnostics(collect);
  try {
    const theme = createTheme();
    expect(resolveSx({ boxShadow: 2 }, theme)).toEqual({
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
    });
    expect(resolveSx({ boxShadow: '0 1px 2px #123456' }, theme)).toEqual({});
    expect(resolveSx({ boxShadow: 0 }, theme)).toEqual({ elevation: 0, shadowOpacity: 0 });
    expect(collect.mock.calls).toHaveLength(2);
    expect(collect.mock.calls[0][0].message).toContain('approximate legacy');
    expect(collect.mock.calls[1][0].code).toBe('box-shadow-platform');
  } finally {
    reset();
  }
});

test('focus theme is opt-in and resolves defaults after the complete palette/options merge', () => {
  expect(createTheme().focusVisible).toBeUndefined();
  expect(createTheme({ focusVisible: false }).focusVisible).toBe(false);
  const theme = createTheme({ focusVisible: true }, { palette: { primary: { main: '#123456' } } });
  expect(theme.focusVisible).toEqual({
    outlineStyle: 'solid',
    outlineColor: '#123456',
    outlineWidth: 2,
    outlineOffset: 2,
  });
  const focusVisible = {
    outlineWidth: '0.25rem',
    outlineOffset: '-1px',
    boxShadow: '0 0 4px currentColor',
  };
  const custom = createTheme({ focusVisible }, { focusVisible: { outlineColor: '#abcdef' } });
  expect(custom.focusVisible).toEqual({
    outlineStyle: 'solid',
    outlineColor: '#abcdef',
    ...focusVisible,
  });
  expect(resolveSx(custom.focusVisible || {}, custom)).toEqual({
    outlineStyle: 'solid',
    outlineColor: '#abcdef',
    outlineWidth: 4,
    outlineOffset: -1,
    boxShadow: `0 0 4px ${custom.palette.text.primary}`,
  });
  expect(focusVisible).toEqual({
    outlineWidth: '0.25rem',
    outlineOffset: '-1px',
    boxShadow: '0 0 4px currentColor',
  });
  expect(createTheme({ focusVisible: true }, { focusVisible: false }).focusVisible).toBe(false);
});

test('native outline resets and currentColor use supported native style fields', () => {
  const theme = createTheme();
  expect(resolveSx({ outlineStyle: 'none', outlineWidth: 4 }, theme)).toEqual({ outlineWidth: 0 });
  expect(
    resolveSx(
      {
        color: '#123456',
        outlineColor: 'currentColor',
        outlineWidth: 2,
        outlineOffset: -2,
        outlineStyle: 'dashed',
      },
      theme,
    ),
  ).toEqual({
    color: '#123456',
    outlineColor: '#123456',
    outlineWidth: 2,
    outlineOffset: -2,
    outlineStyle: 'dashed',
  });
});

test('an unsupported final currentColor diagnoses rather than forwarding invalid shadow paint', () => {
  const collect = jest.fn();
  const reset = configureDiagnostics(collect);
  try {
    expect(
      resolveSx({ boxShadow: '0 0 2px currentColor' }, createTheme(), {
        nativeStyle: { color: 'var(--color)' },
      }),
    ).toEqual({});
    expect(collect.mock.calls[0][0].code).toBe('box-shadow');
  } finally {
    reset();
  }
});

test('omitted shadow paint inherits the final foreground including native semantic colors', () => {
  const theme = createTheme();
  expect(resolveSx({ boxShadow: '0 0 4px', color: '#123456' }, theme)).toEqual({
    boxShadow: '0 0 4px #123456',
    color: '#123456',
  });
  expect(
    resolveSx({ boxShadow: '0 0 4px' }, theme, { parentTextStyle: { color: '#abcdef' } }),
  ).toEqual({ boxShadow: '0 0 4px #abcdef' });
  const color = PlatformColor('labelColor');
  expect(resolveSx({ boxShadow: '0 0 4px' }, theme, { nativeStyle: { color } })).toEqual({
    boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 4, spreadDistance: 0, color, inset: false }],
  });
});

test.each(
  originalPaper.systemShadowAccess.filter(
    ({ path, value }) => path === 'sx' || (typeof value !== 'number' && value !== '1'),
  ),
)('source $path shadow-table access $value/throwing=$throwing', (expected) => {
  const theme = createTheme(),
    shadows = [...theme.shadows];
  shadows[1] = '0 0 8px blue';
  let reads = 0;
  Object.defineProperty(theme, 'shadows', {
    get() {
      reads++;
      if (expected.throwing) throw Error('unused-shadow-table');
      return shadows;
    },
  });
  // Undefined mode is the public resolveSx default and must retain sx lookup.
  for (const mode of expected.path === 'sx' ? ([undefined, 'sx'] as const) : (['css'] as const)) {
    reads = 0;
    let output: unknown = null,
      error: string | null = null;
    try {
      output = resolveSx({ boxShadow: expected.value }, theme, { mode }).boxShadow ?? null;
    } catch (caught) {
      error = (caught as Error).message;
    }
    expect({ reads, error, output }).toEqual({
      reads: expected.reads,
      error: expected.error,
      output: expected.output,
    });
  }
});
test.each([1, '1'])('numeric CSS extension still reads shadow tokens for %s', (value) => {
  const theme = createTheme(),
    shadows = [...theme.shadows];
  shadows[1] = '0 0 8px blue';
  const lookup = jest.fn(() => shadows);
  Object.defineProperty(theme, 'shadows', { get: lookup });
  expect(resolveSx({ boxShadow: value }, theme, { mode: 'css' })).toEqual({
    boxShadow: '0 0 8px blue',
  });
  expect(lookup).toHaveBeenCalledTimes(1);
});
test.each([undefined, null, { opacity: 0.4 }])(
  'static base style avoids unrelated theme getters: %s',
  (baseStyle) => {
    const theme = createTheme();
    Object.defineProperty(theme, 'shadows', {
      get() {
        throw Error('unused-static-theme-field');
      },
    });
    expect(componentStyle(theme, 'MuiProbe', {}, undefined, { baseStyle })).toEqual(
      baseStyle ?? {},
    );
  },
);
test.each(['function', 'array', 'variants'])(
  'base %s retains the native direct-theme callback extension',
  (kind) => {
    const theme = createTheme(),
      shadows = theme.shadows,
      events: string[] = [];
    Object.defineProperty(theme, 'shadows', {
      get() {
        events.push('theme');
        return shadows;
      },
    });
    const callback = (args: Theme) => {
      events.push('callback');
      expect(args.shadows).toBe(shadows);
      return { opacity: 0.4 };
    };
    const baseStyle =
      kind === 'function'
        ? callback
        : kind === 'array'
          ? [callback]
          : {
              get variants() {
                events.push('variants');
                return [{ props: {}, style: callback }];
              },
            };
    expect(componentStyle(theme, 'MuiProbe', {}, undefined, { baseStyle })).toEqual({
      opacity: 0.4,
    });
    expect(events).toEqual(
      kind === 'variants'
        ? ['variants', 'theme', 'variants', 'variants', 'theme', 'callback']
        : ['theme', 'callback'],
    );
  },
);

test('static Proxy base uses existing style reads without an added presence trap', () => {
  const has: string[] = [];
  const baseStyle = new Proxy(
    { padding: 1 },
    {
      has(target, key) {
        has.push(String(key));
        if (key === 'variants') throw Error('unexpected-variants-has');
        return Reflect.has(target, key);
      },
    },
  );
  const theme = createTheme();
  Object.defineProperty(theme, 'shadows', {
    get() {
      throw Error('unused-static-theme-field');
    },
  });
  expect(originalPaper.staticProxyAccess.error).toBeNull();
  expect(originalPaper.staticProxyAccess.padding).toBe('1px');
  expect(componentStyle(theme, 'MuiProbe', {}, undefined, { baseStyle })).toEqual({ padding: 1 });
  expect(has).toEqual([]);
});
test('static variants resolve the native direct-theme snapshot after their first existing getter', () => {
  const theme = createTheme({ direction: 'ltr' });
  let reads = 0,
    directDirection: unknown,
    nestedDirection: unknown;
  const baseStyle = {
    get variants() {
      reads++;
      theme.direction = 'rtl';
      return [
        {
          props: {},
          style: (args: Theme) => {
            directDirection = args.direction;
            expect(args).toEqual(expect.objectContaining({ theme }));
            nestedDirection = theme.direction;
            return { opacity: 0.4 };
          },
        },
      ];
    },
  };
  expect(componentStyle(theme, 'MuiProbe', {}, undefined, { baseStyle })).toEqual({ opacity: 0.4 });
  expect({ reads, directDirection, nestedDirection }).toEqual({
    reads: 3,
    directDirection: 'rtl',
    nestedDirection: 'rtl',
  });
});
