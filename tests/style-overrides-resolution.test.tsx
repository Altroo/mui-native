// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import {
  componentStyle,
  componentRootStyle,
  createNativeStyledStyle,
  configureDiagnostics,
  createTheme,
  styled,
  ThemeProvider,
  type SharedComponentStyleArgs,
  type ComponentStyleArgs,
  type ComponentStyle,
  type ComponentVariant,
} from '../packages/system/src';
import original from './fixtures/mui-style-overrides-9.5.0.json';

type Trace = unknown[];
function run(
  index: number,
  configure: (
    trace: Trace,
    args: (input: ComponentStyleArgs) => unknown[],
    ownerState: { color: string; active: boolean },
  ) => {
    overrides: Record<string, ComponentStyle>;
    variants?: ComponentVariant[];
    selected?: string[];
  },
) {
  const trace: Trace = [];
  const theme = createTheme();
  const ownerState = { color: 'owner', active: true };
  const args = nativeStyleCallback((input: ComponentStyleArgs) => [
    input.color,
    input.rootOnly,
    input.ownerState === ownerState,
    input.theme.spacing(1),
  ]);
  const { overrides, variants = [], selected = ['root'] } = configure(trace, args, ownerState);
  theme.components.MuiSlotProbe = { styleOverrides: overrides, variants };
  let error: string | null = null;
  try {
    componentStyle(theme, 'MuiSlotProbe', ownerState, undefined, {
      rootProps: { color: 'root', rootOnly: 3 },
      rootSlot: selected[0],
      overrideKeys: selected.slice(1),
    });
  } catch (caught) {
    error = (caught as Error).message;
  }
  // Native's fixed selected-key resolver has no public callback at this boundary.
  const expected = original.observations[index];
  expect({ trace, error }).toEqual({
    trace: expected.trace.filter((value) => value !== 'select'),
    error: expected.error,
  });
}
test('all enumerable slots resolve in source order, including inherited and recursive arrays', () => {
  run(0, (trace, args) => {
    const overrides = Object.create({
      inherited: nativeStyleCallback((input: ComponentStyleArgs) => {
        trace.push(['inherited', ...args(input)]);
        return {};
      }),
    });
    Object.defineProperties(overrides, {
      root: {
        enumerable: true,
        get() {
          trace.push('get-root');
          return nativeStyleCallback((input: ComponentStyleArgs) => {
            trace.push(['root', ...args(input)]);
            return {};
          });
        },
      },
      unused: {
        enumerable: true,
        get() {
          trace.push('get-unused');
          return [
            () => {
              trace.push('array-one');
              return [
                () => {
                  trace.push('array-two');
                  return {};
                },
              ];
            },
          ];
        },
      },
      hidden: {
        enumerable: false,
        get() {
          throw new Error('non-enumerable');
        },
      },
    });
    return { overrides };
  });
});
test('unused ordinary CSS and variant-array member callbacks are never prepared', () => {
  const collect = jest.fn();
  const reset = configureDiagnostics(collect);
  try {
    run(1, (trace, args) => ({
      overrides: {
        root: {},
        unused: {
          get padding() {
            throw new Error('unused-css');
          },
          '&::unsupported': { position: 'fixed' },
        },
        embedded: {
          variants: [
            {
              props: nativeStyleCallback((input) => {
                trace.push(['predicate', ...args(input)]);
                return true;
              }),
              style: nativeStyleCallback((input) => {
                trace.push(['style', ...args(input)]);
                return [
                  () => {
                    throw new Error('deferred-array');
                  },
                ];
              }),
            },
          ],
        },
      },
    }));
    expect(collect).not.toHaveBeenCalled();
  } finally {
    reset();
  }
});
test('embedded getters and variant method calls follow original access order', () => {
  run(2, (trace, args) => {
    const variant = {
      get props() {
        trace.push('get-props');
        return { color: 'root' };
      },
      get style() {
        trace.push('get-style');
        return nativeStyleCallback(function (this: unknown, input: ComponentStyleArgs) {
          trace.push(['style-call', this === variant, ...args(input)]);
          return {};
        });
      },
    };
    return {
      overrides: {
        root: {},
        unused: {
          get padding() {
            trace.push('spread-padding');
            return 2;
          },
          get variants() {
            trace.push('get-variants');
            return [variant];
          },
        },
      },
    };
  });
});
test('inherited variant props participate in matching before root-versus-owner fallback', () => {
  run(3, (trace) => ({
    overrides: {
      root: {},
      unused: {
        variants: [
          {
            props: Object.create({ inherited: 'no-match' }),
            style: () => {
              throw new Error('inherited-mismatch');
            },
          },
          {
            props: { color: 'root' },
            style: () => {
              trace.push('root-match');
              return {};
            },
          },
        ],
      },
    },
  }));
});
test('an unused callback throw aborts later override and component variant evaluation', () => {
  run(4, (trace) => ({
    overrides: {
      root: () => {
        trace.push('root');
        return {};
      },
      unused: () => {
        trace.push('unused');
        throw new Error('unused-slot');
      },
      later: () => {
        trace.push('later');
        return {};
      },
    },
    variants: [
      {
        props: () => {
          trace.push('component');
          return true;
        },
        style: {},
      },
    ],
  }));
});
test('repeated selected keys reuse the source-resolved callback result', () => {
  run(5, (trace) => ({
    overrides: {
      root: () => {
        trace.push('root');
        return { padding: 2 };
      },
      unused: () => {
        trace.push('unused');
        return {};
      },
    },
    selected: ['root', 'root'],
    variants: [
      {
        props: () => {
          trace.push('component');
          return true;
        },
        style: {},
      },
    ],
  }));
});
test.each(['component', 'styled'] as const)(
  'normal %s styling evaluates unused overrides without applying their CSS',
  (kind) => {
    const unused = jest.fn((input: SharedComponentStyleArgs) => {
      if (kind === 'component') expect(input.theme).toBe(theme);
      expect(input.theme.spacing(1)).toBe(theme.spacing(1));
      if (kind === 'component') expect(input.ownerState).toMatchObject({ testID: 'probe' });
      else {
        expect(input.ownerState).toBeUndefined();
        expect(input.testID).toBe('probe');
      }
      return { padding: 99, '&::unsupported': { position: 'fixed' } };
    });
    const theme = createTheme({
      components: { MuiProbe: { styleOverrides: { root: { padding: 2 }, unused } } },
    });
    const diagnostics = jest.fn();
    const reset = configureDiagnostics(diagnostics);
    try {
      if (kind === 'component') {
        expect(componentStyle(theme, 'MuiProbe', { testID: 'probe' })).toEqual({ padding: 2 });
      } else {
        const Styled = styled(View, { name: 'MuiProbe' })({ opacity: 0.5 });
        const tree = render(
          <ThemeProvider theme={theme}>
            <Styled testID="probe" />
          </ThemeProvider>,
        );
        expect(tree.getByTestId('probe')).toHaveStyle({ padding: 2, opacity: 0.5 });
      }
      expect(unused).toHaveBeenCalledTimes(1);
      expect(diagnostics).not.toHaveBeenCalled();
    } finally {
      reset();
    }
  },
);

test('selected CSS getters run after all slot callbacks and before component variants', () => {
  run(6, (trace) => ({
    overrides: {
      root: () => {
        trace.push('root');
        return {
          get padding() {
            trace.push('selected-css');
            throw new Error('selected-css');
          },
        };
      },
      unused: () => {
        trace.push('unused');
        return {};
      },
    },
    variants: [
      {
        props: () => {
          trace.push('component');
          return true;
        },
        style: {},
      },
    ],
  }));
});
test('a non-enumerable selected slot is not looked up or called', () => {
  run(7, (trace) => {
    const overrides = {
      unused: () => {
        trace.push('unused');
        return {};
      },
    };
    Object.defineProperty(overrides, 'root', {
      get() {
        throw new Error('hidden-root');
      },
    });
    return { overrides };
  });
});
test('root-first static matching avoids an owner-state getter when it already matches', () => {
  run(8, (_trace, _args, ownerState) => {
    Object.defineProperty(ownerState, 'color', {
      get() {
        throw new Error('owner-fallback');
      },
    });
    return {
      overrides: { root: {}, unused: { variants: [{ props: { color: 'root' }, style: {} }] } },
    };
  });
});
test('later unused variants see mutation of the shared source override arguments', () => {
  run(9, (trace, args) => ({
    overrides: {
      root: (input) => {
        input.rootOnly = 7;
        trace.push('root');
        return {};
      },
      unused: {
        variants: [
          {
            props: nativeStyleCallback((input) => {
              trace.push(['predicate', ...args(input)]);
              return input.rootOnly === 7;
            }),
            style: nativeStyleCallback((input) => {
              trace.push(['style', ...args(input)]);
              return {};
            }),
          },
        ],
      },
    },
  }));
});

test('retained prepared ancestor sheets do not resolve unused callbacks again for descendants', () => {
  const unused = jest.fn(() => ({}));
  const theme = createTheme({
    components: {
      MuiOuter: {
        styleOverrides: {
          root: { '& .MuiInner-root': { padding: 3 } },
          unused,
        },
      },
    },
  });
  const outer = componentRootStyle(theme, 'MuiOuter', {}, undefined, undefined, {
    classes: ['MuiOuter-root'],
  });
  const ancestor = {
    theme,
    name: 'MuiOuter',
    props: {},
    context: { descendantClasses: ['MuiInner-root'] },
    prepared: outer.prepared,
  };
  for (let i = 0; i < 2; i += 1)
    expect(
      componentRootStyle(theme, 'MuiInner', {}, undefined, undefined, {
        classes: ['MuiInner-root'],
        ancestors: [ancestor],
      }).computed,
    ).toEqual({ padding: 3 });
  expect(unused).toHaveBeenCalledTimes(1);
  const styledUnused = jest.fn(() => ({}));
  theme.components.MuiStyled = { styleOverrides: { unused: styledUnused } };
  const style = createNativeStyledStyle(theme, 'MuiStyled', {}, undefined, {}, undefined);
  componentRootStyle(theme, 'MuiInner', {}, undefined, style);
  expect(styledUnused).toHaveBeenCalledTimes(1);
});

test('deferred override selection runs once after every configured slot resolves', () => {
  const trace: string[] = [];
  const theme = createTheme();
  theme.components.MuiSlotProbe = {
    styleOverrides: {
      root: () => {
        trace.push('root');
        return { opacity: 0.2 };
      },
      active: () => {
        trace.push('active');
        return { opacity: 0.6 };
      },
      unused: () => {
        trace.push('unused');
        return {};
      },
    },
  };
  const select = jest.fn(() => {
    trace.push('select');
    return ['active'];
  });
  const result = componentRootStyle(theme, 'MuiSlotProbe', {}, undefined, undefined, {
    baseStyle: () => {
      trace.push('base');
      return { opacity: 0.1 };
    },
    overrideKeys: select,
  });
  expect(trace).toEqual(['base', 'root', 'active', 'unused', 'select']);
  expect(select).toHaveBeenCalledTimes(1);
  expect(result.computed.opacity).toBe(0.6);
});
test('deferred override selection is skipped without configured style overrides', () => {
  const select = jest.fn(() => {
    throw Error('No resolver without overrides');
  });
  const result = componentRootStyle(createTheme(), 'MuiSlotProbe', {}, undefined, undefined, {
    baseStyle: { opacity: 0.4 },
    overrideKeys: select,
  });
  expect(select).not.toHaveBeenCalled();
  expect(result.computed.opacity).toBe(0.4);
});
