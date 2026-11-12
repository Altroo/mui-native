import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import { componentStyle, configureDiagnostics, createTheme } from '../packages/system/src';

test('embedded variants resolve inside override arrays before component variants and sx', () => {
  const theme = createTheme({
    components: {
      MuiClosure: {
        styleOverrides: {
          root: [
            { padding: 1, variants: [{ props: { active: true }, style: { padding: 2 } }] },
            () => [null, { padding: 3, variants: [{ props: {}, style: [{ padding: 4 }] }] }],
          ],
          active: { padding: 5, variants: [{ props: { active: true }, style: { padding: 6 } }] },
        },
        variants: [{ props: { active: true }, style: [{ padding: 7 }, { margin: 2 }] }],
      },
    },
  });
  const state = { active: true };
  expect(
    componentStyle(theme, 'MuiClosure', state, undefined, { overrideKeys: ['active'] }),
  ).toEqual({ padding: 7, margin: 2 });
  expect(
    componentStyle(theme, 'MuiClosure', state, { p: 2 }, { overrideKeys: ['active'] }),
  ).toEqual({ padding: 16, margin: 2 });
});

test('embedded predicates and styles use merged root props and owner state with theme', () => {
  const seen: unknown[] = [];
  const theme = createTheme({
    components: {
      MuiClosure: {
        styleOverrides: {
          root: (input) => {
            seen.push(['override', input]);
            return {
              variants: [
                {
                  props: (input) => {
                    seen.push(['predicate', input]);
                    return input.color === 'owner' && input.rootOnly === 3;
                  },
                  style: (input) => {
                    seen.push(['style', input]);
                    return [{ padding: input.spacing!(1) }, { opacity: input.active ? 0.5 : 1 }];
                  },
                },
                { props: { color: 'root' }, style: { margin: 2 } },
              ],
            };
          },
        },
      },
    },
  });
  const state = { color: 'owner', active: true };
  const rootProps = { color: 'root', rootOnly: 3 };
  expect(componentStyle(theme, 'MuiClosure', state, undefined, { rootProps })).toEqual({
    padding: 8,
    opacity: 0.5,
    margin: 2,
  });
  const override = (seen[0] as [string, Record<string, unknown>])[1];
  const predicate = (seen[1] as [string, Record<string, unknown>])[1];
  const style = (seen[2] as [string, Record<string, unknown>])[1];
  expect(override).toMatchObject({ color: 'root', rootOnly: 3, theme, ownerState: state });
  expect(predicate).toMatchObject({ color: 'owner', rootOnly: 3, theme, ownerState: state });
  expect(style).toBe(predicate);
  expect(predicate.theme).toBe(theme);
  expect(predicate.ownerState).toBe(state);
  expect(rootProps).toEqual({ color: 'root', rootOnly: 3 });
  expect(state).toEqual({ color: 'owner', active: true });
});

test('skipping component variants retains embedded slot variants and finite selectors', () => {
  const collect = jest.fn();
  const reset = configureDiagnostics(collect);
  try {
    const theme = createTheme({
      components: {
        MuiClosure: {
          styleOverrides: {
            label: {
              padding: 1,
              variants: [
                {
                  props: { active: true },
                  style: {
                    padding: 2,
                    '&.Mui-disabled': { padding: 3 },
                    '& .MuiClosure-label': { margin: 4 },
                  },
                },
              ],
            },
          },
          variants: [{ props: {}, style: { padding: 99 } }],
        },
      },
    });
    expect(
      componentStyle(
        theme,
        'MuiClosure',
        { active: true },
        { p: 1 },
        {
          rootSlot: 'label',
          skipVariants: true,
          states: ['disabled'],
          slot: 'MuiClosure-label',
        },
      ),
    ).toEqual({ padding: 3, margin: 4 });
    expect(collect).not.toHaveBeenCalled();
  } finally {
    reset();
  }
});

test('embedded variant arrays retain CSS text metrics through the complete cascade', () => {
  const theme = createTheme({
    components: {
      MuiClosure: {
        styleOverrides: {
          root: {
            fontSize: 10,
            variants: [
              { props: {}, style: [{ fontSize: 20, lineHeight: 5 }, { letterSpacing: '0.1em' }] },
            ],
          },
        },
      },
    },
  });
  expect(componentStyle(theme, 'MuiClosure', {}, { fontSize: 30 })).toEqual({
    fontSize: 30,
    lineHeight: 150,
    letterSpacing: 3,
  });
});

test('embedded base styles preserve the legacy theme callback and authored inputs', () => {
  const theme = createTheme();
  const style = { padding: 1, variants: [{ props: { active: true }, style: { padding: 2 } }] };
  const before = JSON.stringify(style);
  expect(
    componentStyle(theme, '', { active: true }, undefined, {
      baseStyle: (input) => ({ ...style, color: input.palette.primary.main }),
    }),
  ).toEqual({ padding: 2, color: theme.palette.primary.main });
  expect(JSON.stringify(style)).toBe(before);
});

test('separate embedded variant lists do not share callback mutation state', () => {
  const theme = createTheme({
    components: {
      MuiClosure: {
        styleOverrides: {
          root: [
            {
              variants: [
                {
                  props: (input) => {
                    input.transient = true;
                    return true;
                  },
                  style: (input) => ({ opacity: input.transient ? 0.5 : 1 }),
                },
              ],
            },
            {
              variants: [
                { props: (input) => input.transient === undefined, style: { padding: 4 } },
              ],
            },
          ],
        },
        variants: [{ props: (input) => input.transient === undefined, style: { margin: 2 } }],
      },
    },
  });
  expect(componentStyle(theme, 'MuiClosure', {})).toEqual({ opacity: 0.5, padding: 4, margin: 2 });
});

test('base style callbacks run before overrides and their embedded variant callbacks', () => {
  const seen: string[] = [];
  const theme = createTheme({
    components: {
      MuiClosure: {
        styleOverrides: {
          root: () => {
            seen.push('override');
            return {
              variants: [
                {
                  props: () => {
                    seen.push('embedded');
                    return true;
                  },
                  style: { padding: 2 },
                },
              ],
            };
          },
        },
        variants: [
          {
            props: () => {
              seen.push('component');
              return true;
            },
            style: { padding: 3 },
          },
        ],
      },
    },
  });
  expect(
    componentStyle(theme, 'MuiClosure', {}, undefined, {
      baseStyle: () => {
        seen.push('base');
        return { padding: 1 };
      },
    }),
  ).toEqual({ padding: 3 });
  expect(seen).toEqual(['base', 'override', 'embedded', 'component']);
});

test('callback members of variant style arrays receive the merged variant arguments', () => {
  const theme = createTheme({
    components: {
      MuiClosure: {
        styleOverrides: {
          root: {
            variants: [
              {
                props: { active: true },
                style: [
                  nativeStyleCallback(({ ownerState, theme, rootOnly }) => ({
                    opacity: ownerState.active ? 0.5 : 1,
                    padding: theme.spacing(Number(rootOnly)),
                  })),
                ],
              },
            ],
          },
        },
      },
    },
  });
  expect(
    componentStyle(theme, 'MuiClosure', { active: true }, undefined, {
      rootProps: { rootOnly: 2 },
    }),
  ).toEqual({ opacity: 0.5, padding: 16 });
});
