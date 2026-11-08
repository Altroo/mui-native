// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Structural facts stay bound to their physical target and current owner.
import {
  createTheme,
  resolveSx,
  componentStyle,
  componentRootStyle,
  createNativeStyledStyle,
  configureDiagnostics,
} from '../packages/system/src';
const theme = createTheme();
test('legacy descendant without physical path must not borrow the root lastChild fact', () => {
  const value = resolveSx({ '& .Target': { '&:last-child': { opacity: 0.3 } } }, theme, {
    classes: ['Owner'],
    lastChild: true,
    descendantClasses: ['Target'],
    descendantOnly: true,
  });
  expect(value.opacity).toBeUndefined();
});
test('ancestor prepared sheet must bind current owner fact without using child fact or rerunning callback', () => {
  const callback = jest.fn(() => ({ '&:last-child .Target': { opacity: 0.3 } }));
  const initial = componentRootStyle(theme, '', {}, undefined, undefined, {
    classes: ['Owner'],
    lastChild: false,
    baseStyle: callback,
  });
  const changed = componentRootStyle(theme, '', {}, undefined, undefined, {
    classes: ['Target'],
    lastChild: false,
    ancestors: [
      {
        theme,
        name: '',
        props: {},
        prepared: initial.prepared,
        context: {
          classes: ['Owner'],
          lastChild: true,
          descendantOnly: true,
          descendantPath: [{ classes: ['Target'], lastChild: false }],
        },
      },
    ],
  });
  expect(changed.computed.opacity).toBe(0.3);
  expect(callback).toHaveBeenCalledTimes(1);
});
test('a prepared owner true fact changing false must stop ancestor conditional descendant paint', () => {
  const initial = componentRootStyle(theme, '', {}, undefined, undefined, {
    classes: ['Owner'],
    lastChild: true,
    baseStyle: { '&:last-child .Target': { opacity: 0.3 } },
  });
  const changed = componentRootStyle(theme, '', {}, undefined, undefined, {
    classes: ['Target'],
    lastChild: true,
    ancestors: [
      {
        theme,
        name: '',
        props: {},
        prepared: initial.prepared,
        context: {
          classes: ['Owner'],
          lastChild: false,
          descendantOnly: true,
          descendantPath: [{ classes: ['Target'], lastChild: true }],
        },
      },
    ],
  });
  expect(changed.computed.opacity).toBeUndefined();
});
test('unknown own root binding removes a prior true prepared fact', () => {
  const style = createNativeStyledStyle(
    theme,
    '',
    {},
    undefined,
    { lastChild: true, baseStyle: { '&:last-child': { opacity: 0.3 } } },
    undefined,
  );
  expect(componentRootStyle(theme, '', {}, undefined, style, {}).computed.opacity).toBeUndefined();
});
test('root predicate and descendant predicate use separate physical path positions', () => {
  const style = { '&:last-child .A': { '&:last-child .B': { '&:last-child': { opacity: 0.3 } } } };
  for (const [owner, a, b, match] of [
    [true, true, true, true],
    [false, true, true, false],
    [true, false, true, false],
    [true, true, false, false],
  ] as const) {
    const got = resolveSx(style, theme, {
      lastChild: owner,
      descendantPath: [
        { classes: ['A'], lastChild: a },
        { classes: ['B'], lastChild: b },
      ],
    });
    expect(got.opacity).toBe(match ? 0.3 : undefined);
  }
});
test('selector list specificity is greatest matching branch, and root declarations stay lower', () => {
  expect(
    resolveSx({ '&.A:last-child, &.B': { opacity: 0.3 }, '&.A': { opacity: 0.7 } }, theme, {
      classes: ['A', 'B'],
      lastChild: true,
    }).opacity,
  ).toBe(0.3);
  expect(
    resolveSx({ '&.A:last-child, &.B': { opacity: 0.3 }, '&.A': { opacity: 0.7 } }, theme, {
      classes: ['A', 'B'],
      lastChild: false,
    }).opacity,
  ).toBe(0.7);
});
test('unsupported descendant pseudo class remains diagnostic/unmatched, never silently styled', () => {
  const messages: string[] = [];
  const restore = configureDiagnostics((value) => messages.push(value.code));
  try {
    expect(
      resolveSx({ '& .Target:last-child': { opacity: 0.3 } }, theme, {
        lastChild: true,
        descendantPath: [{ classes: ['Target'], lastChild: true }],
      }).opacity,
    ).toBeUndefined();
  } finally {
    restore();
  }
  expect(messages).toEqual(['selector']);
});
test('ordinary componentStyle does not force an unused nonenumerable structural getter', () => {
  const read = jest.fn(() => {
    throw Error('unrelated lastChild read');
  });
  const context = Object.defineProperty({ baseStyle: { opacity: 0.3 } }, 'lastChild', {
    get: read,
  });
  expect(componentStyle(theme, '', {}, undefined, context).opacity).toBe(0.3);
  expect(read).not.toHaveBeenCalled();
});

test('an enumerable structural accessor uses the first already copied value exactly once', () => {
  let reads = 0;
  const context = Object.defineProperty(
    { baseStyle: { '&:last-child': { opacity: 0.3 } } },
    'lastChild',
    {
      enumerable: true,
      get() {
        return ++reads === 1;
      },
    },
  );
  expect(componentRootStyle(theme, '', {}, undefined, undefined, context).computed.opacity).toBe(
    0.3,
  );
  expect(reads).toBe(1);
});
test('componentStyle retains the fact already read by its ordinary CSS mode copy', () => {
  let reads = 0;
  const context = Object.defineProperty(
    { baseStyle: { '&:last-child': { opacity: 0.3 } } },
    'lastChild',
    {
      enumerable: true,
      get() {
        return ++reads === 1;
      },
    },
  );
  expect(componentStyle(theme, '', {}, undefined, context).opacity).toBe(0.3);
  expect(reads).toBe(1);
});
