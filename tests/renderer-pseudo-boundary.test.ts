// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  createTheme,
  componentRootStyle,
  componentStyle,
  createNativeStyledStyle,
  configureDiagnostics,
  type NativePreparedStyle,
  type NativeStyleTarget,
} from '@altroo/mui-native-system';
const theme = createTheme();
function target(prepared: NativePreparedStyle, classes: string[], path: NativeStyleTarget[]) {
  return componentStyle(theme, '', {}, undefined, {
    ancestors: [
      {
        theme,
        name: '',
        props: {},
        prepared,
        context: {
          classes,
          descendantOnly: true,
          descendantPath: path,
        },
      },
    ],
  });
}
test('renderer rejection preserves descendant pseudo targets and splits mixed selector scopes', () => {
  const messages: { code: string }[] = [];
  const restore = configureDiagnostics((message) => messages.push(message));
  try {
    const owner = componentRootStyle(
      theme,
      '',
      {},
      {
        '&::before': { height: '7px' },
        '&.Mui-disabled, & .Child': { opacity: 0.4, '&::before': { height: '9px' } },
      },
      undefined,
      { classes: ['Root', 'Mui-disabled'], rejectPseudoElements: true },
    );
    expect(owner.computed.opacity).toBe(0.4);
    expect(
      target(owner.prepared, ['Root', 'Mui-disabled'], [{ classes: [], tag: '::before' }]).height,
    ).toBeUndefined();
    expect(
      target(
        owner.prepared,
        ['Root', 'Mui-disabled'],
        [{ classes: ['Child'] }, { classes: [], tag: '::before' }],
      ).height,
    ).toBe(9);
    expect(messages.filter((message) => message.code === 'selector')).toHaveLength(2);
  } finally {
    restore();
  }
});
test('rejecting one renderer does not mutate a shared prepared wrapper or replay its callbacks', () => {
  const callback = jest.fn(() => ({ '&::before': { height: '7px' } }));
  const wrapper = createNativeStyledStyle(theme, '', {}, callback, {}, undefined);
  const restore = configureDiagnostics(() => undefined);
  try {
    const rejected = componentRootStyle(theme, '', {}, undefined, wrapper, {
      classes: ['Root'],
      rejectPseudoElements: true,
    });
    const supported = componentRootStyle(theme, '', {}, undefined, wrapper, { classes: ['Root'] });
    const path = [{ classes: [], tag: '::before' }];
    expect(target(rejected.prepared, ['Root'], path).height).toBeUndefined();
    expect(target(supported.prepared, ['Root'], path).height).toBe(7);
    expect(callback).toHaveBeenCalledTimes(1);
  } finally {
    restore();
  }
});

test.each([false, true])(
  'split selectors retain declarations and cascade order with overlapping keys: laterMixed=%s',
  (laterMixed) => {
    const mixed = [
      '&.A, & .Child',
      { opacity: 0.4, paddingTop: '3px', '&::before': { height: '9px' } },
    ] as const;
    const standalone = ['&.A', { color: 'red' }] as const;
    const middle = ['&.B', { opacity: 0.7 }] as const;
    const styles = Object.fromEntries(
      laterMixed ? [standalone, middle, mixed] : [mixed, middle, standalone],
    );
    const restore = configureDiagnostics(() => undefined);
    try {
      const owner = componentRootStyle(theme, '', {}, styles, undefined, {
        classes: ['Root', 'A', 'B'],
        rejectPseudoElements: true,
      });
      expect(owner.computed).toMatchObject({
        color: 'red',
        paddingTop: 3,
        opacity: laterMixed ? 0.4 : 0.7,
      });
      expect(
        target(
          owner.prepared,
          ['Root', 'A', 'B'],
          [{ classes: ['Child'] }, { classes: [], tag: '::before' }],
        ).height,
      ).toBe(9);
    } finally {
      restore();
    }
  },
);
