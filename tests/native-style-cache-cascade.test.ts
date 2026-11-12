// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { componentRootStyle, createTheme, type NativePreparedStyle } from '../packages/system/src';
import {
  nativeStyleInsertions,
  reevaluateNativeStyle,
  nativeCssProgram,
} from '../packages/system/src/internal/prepared-style';
import {
  createNativeStyleCache,
  nativeStyleCacheRegistry as registry,
  type NativeStyleCache,
} from '../packages/system/src/nativeStyleCache';
import {
  buttonConstructorCss,
  buttonGroupConstructorCss,
  buttonBaseConstructorCss,
  buttonGroupOverrideCss,
  buttonOverrideCss,
  buttonBaseOverrideCss,
} from '../packages/material/src/nativeButtonCss';
import original from './fixtures/mui-button-group-cache-9.5.0.json';

const caches: NativeStyleCache[] = [];
const make = (key: string) => {
  const cache = createNativeStyleCache({ key });
  caches.push(cache);
  return cache;
};
afterEach(() => {
  for (const cache of caches.splice(0)) cache.dispose();
});
const owner = {
  variant: 'outlined',
  color: 'primary',
  orientation: 'horizontal',
  disabled: false,
  disableElevation: false,
  fullWidth: false,
  size: 'medium',
};
const theme = createTheme();
const targetSx = {
  '& .MuiButtonGroup-grouped': { minWidth: 58, '&.Mui-disabled': { opacity: 0.4 } },
  '& .MuiButtonGroup-firstButton': { minWidth: 69 },
};
const selectors = Object.fromEntries(
  ['grouped', 'firstButton', 'lastButton', 'middleButton'].map((key) => [
    key,
    '& .MuiButtonGroup-' + key,
  ]),
);
const group = (cache: NativeStyleCache) =>
  componentRootStyle(theme, 'MuiButtonGroup', owner, targetSx, undefined, {
    styleCache: cache,
    baseProgramme: buttonGroupConstructorCss(theme, owner),
    overrideProgramme: buttonGroupOverrideCss,
    overrideSelectors: selectors,
    overrideKeys: ['outlined'],
    classes: ['MuiButtonGroup-root'],
    baseStyle: { '& .MuiButtonGroup-firstButton': { borderRightColor: 'transparent' } },
  });
function button(cache: NativeStyleCache, parent?: NativePreparedStyle, disabled = true) {
  const baseOwner = { disabled, internalDisabledThemeFocusVisible: false };
  const actualOwner = { ...owner, disabled };
  const classes = [
    'MuiButton-root',
    'MuiButtonBase-root',
    'MuiButtonGroup-firstButton',
    ...(disabled ? ['Mui-disabled'] : []),
  ];
  const base = componentRootStyle(theme, 'MuiButtonBase', baseOwner, undefined, undefined, {
    styleCache: cache,
    baseProgramme: buttonBaseConstructorCss(theme, baseOwner),
    overrideProgramme: buttonBaseOverrideCss,
  });
  return componentRootStyle(theme, 'MuiButton', actualOwner, undefined, undefined, {
    styleCache: cache,
    baseProgramme: buttonConstructorCss(theme, actualOwner),
    overrideProgramme: buttonOverrideCss,
    overrideKeys: ['outlined', 'sizeMedium'],
    classes,
    states: disabled ? ['disabled'] : [],
    baseStyle: {
      borderColor: 'rgba(0, 0, 0, 0.12)',
      '&.Mui-disabled': { borderColor: 'rgba(0, 0, 0, 0.12)' },
    },
    ancestors: [
      {
        theme,
        name: 'MuiButtonBase',
        props: baseOwner,
        context: {},
        sameRoot: true,
        prepared: base.prepared,
      },
      ...(parent
        ? [
            {
              theme,
              name: 'MuiButtonGroup',
              props: owner,
              prepared: parent,
              context: {
                classes: ['MuiButtonGroup-root'],
                descendantClasses: classes,
                descendantOnly: true,
              },
            },
          ]
        : []),
    ],
  });
}
const border = (value: ReturnType<typeof button>['computed']) =>
  value.borderRightColor ?? value.borderColor;
const expected = (name: string) => {
  const color = original.observations.find((row) => row.name === name)!.observations.at(-1)!
    .buttons[0].rightBorder;
  return color === 'rgba(0, 0, 0, 0)' ? 'transparent' : color;
};
function commit(grouped: ReturnType<typeof group>, action: ReturnType<typeof button>) {
  registry.commit([
    ...nativeStyleInsertions(grouped.computed),
    ...nativeStyleInsertions(action.computed),
  ]);
}

test('fresh projection and committed native cascade match original target-first ordering', () => {
  const cache = make('fresh');
  const before = registry.snapshot();
  const grouped = group(cache),
    action = button(cache, grouped.prepared);
  expect(registry.snapshot()).toBe(before);
  expect(border(action.computed)).toBe(expected('target-first'));
  commit(grouped, action);
  expect(border(reevaluateNativeStyle(action.computed))).toBe(expected('target-first'));
  expect(nativeStyleInsertions(action.computed).every((entry) => entry.hasRules)).toBe(true);
});

test('retained standalone CSS changes a later Group join without changing its programme identity', () => {
  const cache = make('warm');
  const warm = button(cache, undefined, false);
  registry.commit(nativeStyleInsertions(warm.computed));
  const grouped = group(cache),
    action = button(cache, grouped.prepared);
  expect(nativeCssProgram(warm.prepared.sheets)).toBe(nativeCssProgram(action.prepared.sheets));
  expect(border(action.computed)).toBe(expected('standalone-defaults-target'));
  commit(grouped, action);
  expect(border(reevaluateNativeStyle(action.computed))).toBe(
    expected('standalone-defaults-target'),
  );
  cache.reset();
  const freshGroup = group(cache),
    freshButton = button(cache, freshGroup.prepared);
  expect(border(freshButton.computed)).toBe(expected('defaults-reset-target'));
});

test('warm B remains before a fresh A block, while later A programmes stay before an existing B block', () => {
  const a = make('a'),
    b = make('b');
  registry.commit(nativeStyleInsertions(button(b).computed));
  const freshA = group(a),
    actionB = button(b, freshA.prepared);
  commit(freshA, actionB);
  expect(border(reevaluateNativeStyle(actionB.computed))).toBe(
    expected('nested-button-cache-first'),
  );
  a.reset();
  b.reset();
  registry.commit(
    nativeStyleInsertions(
      componentRootStyle(theme, 'MuiButtonGroup', owner, undefined, undefined, {
        styleCache: a,
        baseProgramme: buttonGroupConstructorCss(theme, owner),
        overrideProgramme: buttonGroupOverrideCss,
      }).computed,
    ),
  );
  registry.commit(nativeStyleInsertions(button(b).computed));
  const existingA = group(a),
    laterB = button(b, existingA.prepared);
  commit(existingA, laterB);
  expect(border(reevaluateNativeStyle(laterB.computed))).toBe(
    expected('nested-existing-group-cache'),
  );
});

test('order reevaluation does not run owning callbacks or reserve discarded render history', () => {
  const a = make('retained-a'),
    b = make('retained-b');
  let calls = 0;
  const prepared = componentRootStyle(
    theme,
    'MuiCacheCounter',
    {},
    () => {
      calls++;
      return { color: 'red' };
    },
    undefined,
    { styleCache: a },
  );
  const revision = registry.snapshot();
  for (let n = 0; n < 5; n++) reevaluateNativeStyle(prepared.computed);
  expect(registry.snapshot()).toBe(revision);
  registry.commit(nativeStyleInsertions(button(b).computed));
  registry.commit(nativeStyleInsertions(prepared.computed));
  for (let n = 0; n < 5; n++) expect(reevaluateNativeStyle(prepared.computed).color).toBe('red');
  expect(calls).toBe(1);
});
