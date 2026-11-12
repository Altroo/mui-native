// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { Platform } from 'react-native';
import { alpha, configureDiagnostics } from '../packages/system/src';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { componentRootStyle, createTheme, type SxProps } from '../packages/system/src';
import { nativeCssProgram } from '../packages/system/src/internal/prepared-style';
import {
  buttonConstructorCss,
  buttonGroupConstructorCss,
  buttonBaseConstructorCss,
  buttonOverrideCss,
  buttonGroupOverrideCss,
  buttonBaseOverrideCss,
} from '../packages/material/src/nativeButtonCss';
import reference from './fixtures/mui-button-group-cache-9.5.0.json';
const { serializeStyles } = createRequire(resolve('packages/system/package.json'))(
  '@emotion/serialize',
) as {
  serializeStyles: (values: readonly unknown[]) => { name: string };
};
const owner = {
  variant: 'outlined',
  color: 'primary',
  orientation: 'horizontal',
  disabled: false,
  disableElevation: false,
  fullWidth: false,
  size: 'medium',
};
const selectors = Object.fromEntries(
  ['grouped', 'firstButton', 'lastButton', 'middleButton'].map((key) => [
    key,
    '& .MuiButtonGroup-' + key,
  ]),
);
const generated = (className: string, key = 'group-cache') =>
  className
    .split(/\s+/)
    .find((value) => value.startsWith(key + '-'))!
    .slice(key.length + 1);
function group(sx?: SxProps, emptyOverrides = false) {
  const theme = createTheme(
    emptyOverrides ? { components: { MuiButtonGroup: { styleOverrides: {} } } } : {},
  );
  return componentRootStyle(theme, 'MuiButtonGroup', owner, sx, undefined, {
    baseProgramme: buttonGroupConstructorCss(theme, owner),
    overrideProgramme: buttonGroupOverrideCss,
    overrideSelectors: selectors,
    overrideKeys: ['outlined'],
  }).prepared;
}

test('default Group programme hashes to the original generated class', () => {
  const original = reference.observations.find((row) => row.name === 'defaults-target')!
    .observations[0];
  expect(serializeStyles([nativeCssProgram(group().sheets)]).name).toBe(
    generated(original.rootClass!),
  );
});

test('target Group programme hashes to the original generated class', () => {
  const original = reference.observations[0].observations[0];
  const sx = {
    '& .MuiButtonGroup-grouped': { minWidth: 58, '&.Mui-disabled': { opacity: 0.4 } },
    '& .MuiButtonGroup-firstButton': { minWidth: 69 },
  };
  expect(serializeStyles([nativeCssProgram(group(sx).sheets)]).name).toBe(
    generated(original.rootClass!),
  );
});

test('the present empty resolver programme matches the original Group class', () => {
  expect(serializeStyles([nativeCssProgram(group(undefined, true).sheets)]).name).toBe(
    generated(reference.overridePresence.empty, 'presence-cache'),
  );
});

test('combined Base/Button programme hashes to the original native target counterpart', () => {
  const theme = createTheme();
  const baseOwner = { disabled: true, internalDisabledThemeFocusVisible: false };
  const base = componentRootStyle(theme, 'MuiButtonBase', baseOwner, undefined, undefined, {
    baseProgramme: buttonBaseConstructorCss(theme, baseOwner),
    overrideProgramme: buttonBaseOverrideCss,
  }).prepared;
  const button = componentRootStyle(
    theme,
    'MuiButton',
    { ...owner, disabled: true },
    undefined,
    undefined,
    {
      baseProgramme: buttonConstructorCss(theme, owner),
      overrideProgramme: buttonOverrideCss,
      overrideKeys: ['outlined', 'sizeMedium'],
      ancestors: [
        {
          theme,
          name: 'MuiButtonBase',
          props: baseOwner,
          context: {},
          sameRoot: true,
          prepared: base,
        },
      ],
    },
  ).prepared;
  const original = reference.observations[0].observations[0].buttons[0];
  expect(serializeStyles([nativeCssProgram(button.sheets)]).name).toBe(
    generated(original.className),
  );
});

test('standalone Button constructor matches the original pre-Base programme', () => {
  const theme = createTheme();
  const button = componentRootStyle(theme, 'MuiButton', owner, undefined, undefined, {
    baseProgramme: buttonConstructorCss(theme, owner),
    overrideProgramme: buttonOverrideCss,
    overrideKeys: ['outlined', 'sizeMedium'],
  }).prepared;
  const expected = reference.observations[0].observations[0].inserted.find(
    (name) => name.endsWith('-MuiButton-root') && !name.includes('MuiButtonBase'),
  );
  expect(serializeStyles([nativeCssProgram(button.sheets)]).name).toBe(expected);
});

test('complete source constructor identity preserves the legacy native shadow path', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(27);
  const reset = configureDiagnostics(() => {});
  try {
    const theme = createTheme(),
      contained = { ...owner, variant: 'contained' };
    const source = buttonGroupConstructorCss(theme, contained);
    const legacy = componentRootStyle(theme, 'MuiButtonGroup', contained, undefined, undefined, {
      baseProgramme: source,
      baseStyle: { boxShadow: 2 },
    });
    expect(legacy.computed).toMatchObject({ elevation: 2, shadowRadius: 2 });
    jest.replaceProperty(Platform, 'OS', 'ios');
    const modern = componentRootStyle(theme, 'MuiButtonGroup', contained, undefined, undefined, {
      baseProgramme: source,
      baseStyle: { boxShadow: 2 },
    });
    expect(nativeCssProgram(legacy.prepared.sheets)).toBe(nativeCssProgram(modern.prepared.sheets));
  } finally {
    reset();
    jest.restoreAllMocks();
  }
});

test('constructor alpha resolution preserves getter order, receiver and one read per call', () => {
  const trace: string[] = [];
  const receivers: unknown[] = [];
  const theme = createTheme();
  const color = theme.palette.primary.main;
  Object.defineProperty(theme.palette.primary, 'main', {
    enumerable: true,
    get() {
      trace.push('color');
      return color;
    },
  });
  const method = new Proxy(
    function (this: unknown, value: string, opacity: number) {
      trace.push('call');
      receivers.push(this);
      return alpha(value, opacity);
    },
    {
      get() {
        throw Error('Authored alpha function properties must not be read');
      },
    },
  );
  Object.defineProperty(theme, 'alpha', {
    get() {
      trace.push('alpha');
      return method;
    },
  });
  const actual = buttonConstructorCss(theme, owner);
  const first = trace.indexOf('alpha');
  expect(trace.slice(first, first + 3)).toEqual(['alpha', 'color', 'call']);
  expect(trace.filter((item) => item === 'alpha')).toHaveLength(receivers.length);
  expect(receivers.length).toBeGreaterThan(0);
  expect(receivers.every((receiver) => receiver === theme)).toBe(true);
  expect(actual).toBe(buttonConstructorCss(createTheme(), owner));
});

test('repeated selected override slots retain each emitted CSS getter result', () => {
  let reads = 0;
  const theme = createTheme();
  theme.components.MuiButtonGroup = {
    styleOverrides: {
      root: {
        get color() {
          return ++reads === 1 ? 'red' : 'blue';
        },
      },
    },
  };
  const css = nativeCssProgram(
    componentRootStyle(
      theme,
      'MuiButtonGroup',
      { ...owner, variant: 'root' },
      undefined,
      undefined,
      {
        baseProgramme: buttonGroupConstructorCss(theme, { ...owner, variant: 'root' }),
        overrideProgramme: buttonGroupOverrideCss,
        overrideSelectors: selectors,
        overrideKeys: ['root'],
      },
    ).prepared.sheets,
  );
  expect(reads).toBe(2);
  expect(css.match(/color:(?:red|blue);/g)).toEqual(['color:red;', 'color:blue;']);
});
