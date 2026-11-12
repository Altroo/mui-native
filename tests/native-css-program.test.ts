// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  componentRootStyle,
  createTheme,
  type SxProps,
  type ThemeOptions,
  type ComponentStyleValue,
} from '../packages/system/src';
import {
  nativeCssProgram,
  rebaseNativeComponentStyle,
  reevaluateNativeStyle,
} from '../packages/system/src/internal/prepared-style';
import original from './fixtures/mui-button-group-cache-9.5.0.json';

afterEach(() => jest.restoreAllMocks());
function compile(input: unknown, mode: string, options: ThemeOptions = {}) {
  const theme = createTheme(options);
  if (mode === 'css')
    theme.components.MuiButtonGroup = { styleOverrides: { root: input as ComponentStyleValue } };
  return componentRootStyle(
    theme,
    'MuiButtonGroup',
    {},
    mode === 'sx' ? (input as SxProps) : undefined,
    undefined,
    { width: 400 },
  ).prepared;
}

test.each(original.programComparisons)('programme equality matches original $name', (row) => {
  if (
    row.name === 'unsupported-native-css' ||
    row.name.startsWith('shadow-token-miss') ||
    row.name === 'shadow-falsy-token'
  )
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  const options = 'rightTheme' in row ? (row.rightTheme as unknown as ThemeOptions) : undefined;
  const leftOptions = 'leftTheme' in row ? (row.leftTheme as unknown as ThemeOptions) : undefined;
  const left = nativeCssProgram(compile(row.left, row.mode, leftOptions).sheets);
  const right = nativeCssProgram(compile(row.right, row.mode, options).sheets);
  expect(left === right).toBe(row.equal);
  expect(left).not.toBe('');
  expect(right).not.toBe('');
});

test('an empty override resolver keeps its original serialized presence', () => {
  const absent = nativeCssProgram(compile(undefined, 'sx').sheets);
  const empty = nativeCssProgram(
    componentRootStyle(
      createTheme({ components: { MuiButtonGroup: { styleOverrides: {} } } }),
      'MuiButtonGroup',
      {},
      undefined,
      undefined,
    ).prepared.sheets,
  );
  expect(absent === empty).toBe(original.overridePresence.equal);
});

test.each(['css', 'sx'])('inherited enumerable %s values are observed once', (mode) => {
  let reads = 0;
  const inherited = Object.create({
    get color() {
      reads++;
      return 'red';
    },
  }) as SxProps;
  const actual = compile(inherited, mode);
  expect(reads).toBe(1);
  expect(nativeCssProgram(actual.sheets)).toContain('color:red;');
  expect(nativeCssProgram(actual.sheets)).toBe(
    nativeCssProgram(compile({ color: 'red' }, mode).sheets),
  );
});

test('CSS capture and native geometry share one read of a nested native extension', () => {
  let reads = 0;
  const theme = createTheme();
  const prepared = componentRootStyle(
    theme,
    'MuiButtonGroup',
    {},
    {
      transform: [
        {
          get scale() {
            reads++;
            return 1;
          },
        },
      ],
    },
    undefined,
  ).prepared;
  const before = nativeCssProgram(prepared.sheets);
  expect(reads).toBe(1);
  expect(nativeCssProgram(prepared.sheets)).toBe(before);
  expect(reads).toBe(1);
});

test.each([
  [[], { margin: 5 }],
  [{ margin: 2 }, []],
  [[], []],
])(
  'empty constructor rebasing retains exactly one source programme (%j -> %j)',
  (before, after) => {
    let calls = 0;
    const theme = createTheme({
      components: {
        MuiButtonGroup: {
          styleOverrides: {
            root: () => {
              calls++;
              return { minHeight: 48 };
            },
          },
        },
      },
    });
    const prepared = componentRootStyle(theme, 'MuiButtonGroup', {}, undefined, undefined, {
      baseStyle: before,
    }).prepared;
    const replacement = componentRootStyle(theme, '', {}, undefined, undefined, {
      baseStyle: after,
    }).prepared;
    const rebased = rebaseNativeComponentStyle(prepared, replacement);
    const expectedTheme = createTheme({
      components: { MuiButtonGroup: { styleOverrides: { root: { minHeight: 48 } } } },
    });
    const expected = componentRootStyle(expectedTheme, 'MuiButtonGroup', {}, undefined, undefined, {
      baseStyle: after,
    }).prepared;
    expect(nativeCssProgram(rebased.sheets)).toBe(nativeCssProgram(expected.sheets));
    expect(rebased.sheets.filter((sheet) => sheet.emissionStart)).toHaveLength(1);
    expect(calls).toBe(1);
  },
);

test('same-root programme boundaries survive adjacent repetition', () => {
  const prepared = compile({ color: 'red' }, 'sx');
  const once = nativeCssProgram(prepared.sheets);
  expect(nativeCssProgram([...prepared.sheets, ...prepared.sheets])).toBe(once + once);
});

test('pure retained evaluation preserves callbacks, lazy selectors and native inline separation', () => {
  const calls = { root: 0, variant: 0, sx: 0, last: 0 };
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: {
          root: () => {
            calls.root++;
            return { padding: 3, '&:last-child': { margin: 7 } };
          },
        },
        variants: [
          {
            props: {},
            style: () => {
              calls.variant++;
              return { minHeight: 48 };
            },
          },
        ],
      },
    },
  });
  const prepared = componentRootStyle(
    theme,
    'MuiButtonGroup',
    {},
    () => {
      calls.sx++;
      return { color: 'red' };
    },
    { margin: 12 },
    {
      get lastChild() {
        calls.last++;
        return true;
      },
    },
  );
  const first = { ...calls };
  for (let n = 0; n < 4; n++) {
    expect(reevaluateNativeStyle(prepared.computed)).toEqual(prepared.computed);
    expect(prepared.authored).toEqual([{ margin: 12 }]);
  }
  expect(calls).toEqual(first);
  expect(calls).toMatchObject({ root: 1, variant: 1, sx: 1, last: 1 });
  expect(() => reevaluateNativeStyle({})).toThrow('owned prepared');
});
