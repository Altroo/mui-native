// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import { cleanup, render, fireEvent, act } from '@testing-library/react-native';
import { StyleSheet, Text, type StyleProp } from 'react-native';
import {
  Button,
  ButtonBase,
  IconButton,
  MenuItem,
  MenuList,
  AccordionSummary,
  ThemeProvider,
  DefaultPropsProvider,
  createTheme,
  createNativeStyleCache,
  NativeStyleCacheProvider,
  type NativeStyleCache,
  type NativeStyle,
  type ButtonBaseActions,
  type ButtonBaseState,
  alpha,
  componentRootStyle,
  styled,
} from '../packages/material/src';
import { nativeStyleCacheRegistry as registry } from '../packages/system/src/nativeStyleCache';
import { NativeCssInsertionScope } from '../packages/system/src/internal/prepared-style';
import { NativeButtonGroupRules } from '../packages/material/src/buttonGroupContext';
import { Commands } from '../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';
const caches: NativeStyleCache[] = [];
const cache = (key: string) => {
  const value = createNativeStyleCache({ key });
  caches.push(value);
  return value;
};
beforeEach(() => {
  for (const key of ['focus', 'blur', 'setPressed', 'setHotspot'] as const)
    jest.spyOn(Commands, key).mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  jest.useRealTimers();
  for (const value of caches.splice(0)) value.dispose();
});
const style = (
  props: {
    style?: StyleProp<NativeStyle> | ((state: { pressed: boolean }) => StyleProp<NativeStyle>);
  },
  pressed = false,
) =>
  StyleSheet.flatten(typeof props.style === 'function' ? props.style({ pressed }) : props.style) ??
  {};

test('native hover changes paint without preparing Button/Base callbacks, variants, sx or source defaults again', () => {
  const counts = { button: 0, base: 0, variant: 0, sx: 0, defaults: 0, baseDefaults: 0 };
  const theme = createTheme({
    components: {
      MuiButton: {
        defaultProps: {},
        styleOverrides: {
          root: () => {
            counts.button++;
            return { '&:hover': { backgroundColor: '#112233' } };
          },
        },
        variants: [
          {
            props: () => {
              counts.variant++;
              return true;
            },
            style: { marginTop: 1 },
          },
        ],
      },
      MuiButtonBase: {
        styleOverrides: {
          root: () => {
            counts.base++;
            return {};
          },
        },
      },
    },
  });
  const buttonConfig = theme.components.MuiButton;
  if (!buttonConfig || typeof buttonConfig !== 'object') throw Error('Missing test Button config');
  buttonConfig.defaultProps = {
    get color() {
      counts.defaults++;
      return 'primary';
    },
  };
  const baseConfig = theme.components.MuiButtonBase;
  if (!baseConfig || typeof baseConfig !== 'object') throw Error('Missing test Base config');
  baseConfig.defaultProps = {
    get disableRipple() {
      counts.baseDefaults++;
      return true;
    },
  };
  const tree = render(
    <NativeStyleCacheProvider value={cache('hover')}>
      <ThemeProvider theme={theme}>
        <Button
          testID="hover"
          sx={() => {
            counts.sx++;
            return { minWidth: 64 };
          }}
        >
          Hover
        </Button>
      </ThemeProvider>
    </NativeStyleCacheProvider>,
  );
  expect(counts).toEqual({ button: 1, base: 1, variant: 1, sx: 1, defaults: 1, baseDefaults: 1 });
  fireEvent(tree.getByTestId('hover'), 'hoverIn', { nativeEvent: {} });
  expect(style(tree.getByTestId('hover').props).backgroundColor).toBe('#112233');
  fireEvent(tree.getByTestId('hover'), 'hoverOut', { nativeEvent: {} });
  expect(style(tree.getByTestId('hover').props).backgroundColor).toBe('transparent');
  expect(counts).toEqual({ button: 1, base: 1, variant: 1, sx: 1, defaults: 1, baseDefaults: 1 });
});

test('genuine incoming props and DefaultPropsProvider changes refresh retained source preparation', () => {
  let calls = 0;
  const colors: unknown[] = [];
  const theme = createTheme({
    components: {
      MuiButton: {
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState }) => {
            calls++;
            colors.push(ownerState.color);
            return {};
          }),
        },
      },
    },
  });
  const value = cache('defaults');
  const element = <Button testID="defaults">Stable</Button>;
  const content = (color: 'primary' | 'secondary', child = element) => (
    <NativeStyleCacheProvider value={value}>
      <ThemeProvider theme={theme}>
        <DefaultPropsProvider value={{ MuiButton: { defaultProps: { color } } }}>
          {child}
        </DefaultPropsProvider>
      </ThemeProvider>
    </NativeStyleCacheProvider>
  );
  const tree = render(content('primary'));
  tree.rerender(content('secondary'));
  tree.rerender(content('secondary', <Button testID="defaults">Changed props</Button>));
  expect(calls).toBe(3);
  expect(colors).toEqual(['primary', 'secondary', 'secondary']);
});

test('slot source callbacks stay genuine and retained across cache epochs, presses and hover', () => {
  const snapshots: unknown[] = [];
  const theme = createTheme({
    components: {
      MuiButton: {
        styleOverrides: {
          startIcon: nativeStyleCallback(({ ownerState }) => {
            snapshots.push([ownerState.pressed, ownerState.focusVisible]);
            return { marginLeft: 3 };
          }),
        },
      },
    },
  });
  const tree = render(
    <NativeStyleCacheProvider value={cache('slots-a')}>
      <ThemeProvider theme={theme}>
        <Button disableRipple testID="slots" startIcon={<Text>+</Text>}>
          Action
        </Button>
      </ThemeProvider>
    </NativeStyleCacheProvider>,
  );
  // Root and the rendered startIcon each resolve original component overrides.
  expect(snapshots).toEqual([
    [undefined, undefined],
    [undefined, undefined],
  ]);
  const warm = render(
    <NativeStyleCacheProvider value={cache('slots-b')}>
      <Button>Other cache</Button>
    </NativeStyleCacheProvider>,
  );
  fireEvent(tree.getByTestId('slots'), 'responderGrant', {
    persist() {},
    currentTarget: 1,
    nativeEvent: { pageX: 1, pageY: 1 },
  });
  fireEvent(tree.getByTestId('slots'), 'hoverIn', { nativeEvent: {} });
  fireEvent(tree.getByTestId('slots'), 'hoverOut', { nativeEvent: {} });
  expect(snapshots).toEqual([
    [undefined, undefined],
    [undefined, undefined],
  ]);
  warm.unmount();
  tree.unmount();
});

test.each(['static', 'callback'] as const)(
  'ButtonBase %s native presentation evaluates retained active and hover selectors equally',
  (kind) => {
    jest.useFakeTimers();
    let calls = 0;
    const theme = createTheme({
      components: {
        MuiButtonBase: {
          styleOverrides: {
            root: () => {
              calls++;
              return { '&:active': { opacity: 0.4 }, '&:hover': { minWidth: 91 } };
            },
          },
        },
      },
    });
    const tree = render(
      <NativeStyleCacheProvider value={cache('base-' + kind)}>
        <ThemeProvider theme={theme}>
          <ButtonBase
            disableRipple
            testID="base"
            style={kind === 'callback' ? () => undefined : undefined}
          >
            Base
          </ButtonBase>
        </ThemeProvider>
      </NativeStyleCacheProvider>,
    );
    const event = { persist() {}, currentTarget: 1, nativeEvent: { pageX: 1, pageY: 1 } };
    fireEvent(tree.getByTestId('base'), 'responderGrant', event);
    expect(style(tree.getByTestId('base').props).opacity).toBe(0.4);
    fireEvent(tree.getByTestId('base'), 'responderRelease', event);
    act(() => jest.advanceTimersByTime(200));
    expect(style(tree.getByTestId('base').props).opacity).toBeUndefined();
    fireEvent(tree.getByTestId('base'), 'hoverIn', { nativeEvent: {} });
    expect(style(tree.getByTestId('base').props).minWidth).toBe(91);
    fireEvent(tree.getByTestId('base'), 'hoverOut', { nativeEvent: {} });
    expect(style(tree.getByTestId('base').props).minWidth).toBeUndefined();
    expect(calls).toBe(1);
  },
);

test.each([undefined, { flexShrink: 7, alignSelf: 'center' } as const])(
  'physical group membership rebases native geometry while retaining source and inline priority (%p)',
  (inline) => {
    let calls = 0;
    const theme = createTheme({
      components: {
        MuiButton: {
          styleOverrides: {
            root: () => {
              calls++;
              return {};
            },
          },
        },
      },
    });
    const value = cache(inline ? 'geometry-inline' : 'geometry');
    const button = (
      <Button testID="geometry" style={inline}>
        Geometry
      </Button>
    );
    const rule = { cascade: () => ({ theme, name: 'MuiButtonGroup', props: {}, context: {} }) };
    const content = (grouped: boolean) => (
      <NativeStyleCacheProvider value={value}>
        <ThemeProvider theme={theme}>
          <NativeButtonGroupRules.Provider value={grouped ? [rule] : []}>
            {button}
          </NativeButtonGroupRules.Provider>
        </ThemeProvider>
      </NativeStyleCacheProvider>
    );
    const tree = render(content(false));
    expect(style(tree.getByTestId('geometry').props)).toMatchObject(
      inline ?? { alignSelf: 'flex-start' },
    );
    tree.rerender(content(true));
    expect(style(tree.getByTestId('geometry').props)).toMatchObject(inline ?? { flexShrink: 1 });
    if (!inline) expect(style(tree.getByTestId('geometry').props).alignSelf).toBeUndefined();
    tree.rerender(content(false));
    expect(style(tree.getByTestId('geometry').props)).toMatchObject(
      inline ?? { alignSelf: 'flex-start' },
    );
    if (!inline) expect(style(tree.getByTestId('geometry').props).flexShrink).toBeUndefined();
    expect(calls).toBe(1);
  },
);

test.each(['MuiIconButton', 'MuiMenuItem', 'MuiAccordionSummary'] as const)(
  '%s source callbacks stay genuine while the native host paints hover and pressed inline styles',
  (name) => {
    const owners: unknown[] = [];
    let sxCalls = 0;
    const theme = createTheme({
      components: {
        [name]: {
          styleOverrides: {
            root: nativeStyleCallback(({ ownerState }: { ownerState: Record<string, unknown> }) => {
              owners.push([ownerState.pressed, ownerState.focusVisible]);
              return { '&:hover': { minHeight: 91 } };
            }),
          },
        },
      },
    });
    const Component =
      name === 'MuiIconButton' ? IconButton : name === 'MuiMenuItem' ? MenuItem : AccordionSummary;
    const element = (
      <Component
        testID="retained"
        sx={() => {
          sxCalls++;
          return { paddingLeft: 3 };
        }}
        style={(state) => ({ marginTop: state.pressed ? 9 : 3 })}
      >
        Action
      </Component>
    );
    const tree = render(
      <NativeStyleCacheProvider value={cache(name.toLowerCase())}>
        <ThemeProvider theme={theme}>
          {name === 'MuiMenuItem' ? <MenuList>{element}</MenuList> : element}
        </ThemeProvider>
      </NativeStyleCacheProvider>,
    );
    // Summary's rendered content slot also resolves the component's source overrides.
    const initialOwners =
      name === 'MuiAccordionSummary'
        ? [
            [undefined, undefined],
            [undefined, undefined],
          ]
        : [[undefined, undefined]];
    expect(owners).toEqual(initialOwners);
    expect(sxCalls).toBe(1);
    fireEvent(tree.getByTestId('retained'), 'hoverIn', { nativeEvent: {} });
    expect(style(tree.getByTestId('retained').props)).toMatchObject({
      minHeight: 91,
      marginTop: 3,
    });
    fireEvent(tree.getByTestId('retained'), 'hoverOut', { nativeEvent: {} });
    expect(style(tree.getByTestId('retained').props).minHeight).not.toBe(91);
    fireEvent(tree.getByTestId('retained'), 'responderGrant', {
      persist() {},
      currentTarget: 1,
      nativeEvent: { pageX: 1, pageY: 1 },
    });
    expect(style(tree.getByTestId('retained').props, true).marginTop).toBe(9);
    expect(owners).toEqual(initialOwners);
    expect(sxCalls).toBe(1);
  },
);

test.each(['base', 'plain-focus', 'compound-focus'] as const)(
  'selected MenuItem retains keyboard focus while hover paint follows compound source specificity (%s)',
  (kind) => {
    const theme = createTheme();
    const action: { current: ButtonBaseActions | null } = { current: null };
    const tree = render(
      <NativeStyleCacheProvider value={cache('selected-' + kind)}>
        <ThemeProvider theme={theme}>
          <MenuList>
            <MenuItem
              selected
              action={action}
              testID="selected"
              sx={
                kind === 'base'
                  ? undefined
                  : {
                      [kind === 'plain-focus'
                        ? '&.Mui-focusVisible'
                        : '&.Mui-selected.Mui-focusVisible']: { backgroundColor: 'purple' },
                    }
              }
            >
              Selected
            </MenuItem>
          </MenuList>
        </ThemeProvider>
      </NativeStyleCacheProvider>,
    );
    act(() => action.current!.focusVisible());
    const focused = alpha(
      theme.palette.primary.main,
      theme.palette.action.selectedOpacity + theme.palette.action.focusOpacity,
    );
    const hovered = alpha(
      theme.palette.primary.main,
      theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity,
    );
    expect(style(tree.getByTestId('selected').props).backgroundColor).toBe(
      kind === 'compound-focus' ? 'purple' : focused,
    );
    fireEvent(tree.getByTestId('selected'), 'hoverIn', { nativeEvent: {} });
    expect(style(tree.getByTestId('selected').props).backgroundColor).toBe(
      kind === 'compound-focus' ? 'purple' : hovered,
    );
    fireEvent(tree.getByTestId('selected'), 'hoverOut', { nativeEvent: {} });
    expect(style(tree.getByTestId('selected').props).backgroundColor).toBe(
      kind === 'compound-focus' ? 'purple' : focused,
    );
  },
);

test.each(['MuiMenuItem', 'MuiAccordionSummary'] as const)(
  '%s refreshes an idle native frame when a later same-key cache changes cascade order',
  (name) => {
    const theme = createTheme();
    const parentCache = cache('physical-parent');
    const targetCache = cache('target');
    const duplicateCache = cache('physical-parent');
    const parent = (value: NativeStyleCache) =>
      componentRootStyle(
        theme,
        'CacheParent',
        {},
        {
          ['& .' + name + '-root']: { opacity: 0.4 },
        },
        undefined,
        { styleCache: value, classes: ['CacheParent-root'] },
      );
    const first = parent(parentCache);
    const duplicate = parent(duplicateCache);
    const rule = {
      cascade: (classes: readonly string[]) => ({
        theme,
        name: 'CacheParent',
        props: {},
        prepared: first.prepared,
        context: {
          classes: ['CacheParent-root'],
          descendantClasses: classes,
          descendantOnly: true,
        },
      }),
    };
    let authoredCalls = 0;
    let sxCalls = 0;
    const Component = name === 'MuiMenuItem' ? MenuItem : AccordionSummary;
    const element = (
      <Component
        testID="idle"
        sx={() => {
          sxCalls++;
          return { ['&.' + name + '-root']: { opacity: 0.8 } };
        }}
        style={() => {
          authoredCalls++;
          return { marginTop: 7 };
        }}
      >
        Idle
      </Component>
    );
    const tree = render(
      <ThemeProvider theme={theme}>
        <NativeCssInsertionScope style={first.computed}>
          <NativeButtonGroupRules.Provider value={[rule]}>
            <NativeStyleCacheProvider value={targetCache}>
              {name === 'MuiMenuItem' ? <MenuList>{element}</MenuList> : element}
            </NativeStyleCacheProvider>
          </NativeButtonGroupRules.Provider>
        </NativeCssInsertionScope>
      </ThemeProvider>,
    );
    expect(style(tree.getByTestId('idle').props)).toMatchObject({ opacity: 0.8, marginTop: 7 });
    const callsBefore = { authoredCalls, sxCalls };
    const warm = render(
      <NativeCssInsertionScope style={duplicate.computed}>
        <Text>Warm duplicate</Text>
      </NativeCssInsertionScope>,
    );
    expect(style(tree.getByTestId('idle').props)).toMatchObject({ opacity: 0.4, marginTop: 7 });
    expect({ authoredCalls, sxCalls }).toEqual(callsBefore);
    warm.unmount();
  },
);

test.each(['MuiButton', 'MuiIconButton', 'MuiAccordionSummary'] as const)(
  '%s slots commit to their explicit cache and retain source callbacks across inherited native text changes',
  (name) => {
    const slot =
      name === 'MuiButton'
        ? 'startIcon'
        : name === 'MuiIconButton'
          ? 'loadingIndicator'
          : 'content';
    let calls = 0;
    const theme = createTheme({
      components: {
        [name]: {
          styleOverrides: {
            [slot]: () => {
              calls++;
              return { paddingTop: 137 };
            },
          },
        },
      },
    });
    const value = cache('owned-slots');
    const commit = jest.spyOn(registry, 'commit');
    const common = {
      testID: 'slot-owner',
      style: (state: ButtonBaseState) => ({
        color: state.pressed ? '#112233' : '#445566',
        fontSize: state.pressed ? 30 : 15,
      }),
      children: 'Owner',
    };
    const element =
      name === 'MuiButton' ? (
        <Button {...common} startIcon={<Text>+</Text>} />
      ) : name === 'MuiIconButton' ? (
        <IconButton {...common} loading={false} />
      ) : (
        <AccordionSummary {...common} />
      );
    const tree = render(
      <NativeStyleCacheProvider value={value}>
        <ThemeProvider theme={theme}>{element}</ThemeProvider>
      </NativeStyleCacheProvider>,
    );
    const slotInsertions = commit.mock.calls
      .flatMap(([chain]) => chain)
      .filter((item) => item.css.includes('padding-top:137px'));
    expect(slotInsertions.length).toBeGreaterThan(0);
    expect(slotInsertions.every((item) => item.cache === value)).toBe(true);
    const before = calls;
    fireEvent(tree.getByTestId('slot-owner'), 'responderGrant', {
      persist() {},
      currentTarget: 1,
      nativeEvent: { pageX: 1, pageY: 1 },
    });
    expect(StyleSheet.flatten(tree.getByText('Owner').props.style)).toMatchObject({
      color: '#112233',
      fontSize: 30,
    });
    fireEvent(tree.getByTestId('slot-owner'), 'hoverIn', { nativeEvent: {} });
    expect(calls).toBe(before);
    commit.mockRestore();
  },
);

test.each(['MuiButton', 'MuiIconButton'] as const)(
  '%s styled roots expose genuine authored style values and presence to source callbacks',
  (name) => {
    for (const kind of ['absent', 'undefined', 'inline', 'callback', 'merged'] as const) {
      const inline = { marginTop: 9 };
      let nativeCalls = 0;
      const callback = () => {
        nativeCalls++;
        return inline;
      };
      const supplied =
        kind === 'absent'
          ? {}
          : { style: kind === 'undefined' ? undefined : kind === 'callback' ? callback : inline };
      const defaults = { paddingTop: 3 };
      const observed: { present: boolean; style: unknown; nativeCalls: number }[] = [];
      const theme = createTheme({
        components: {
          [name]: {
            ...(kind === 'merged' ? { defaultProps: { style: defaults } } : {}),
            styleOverrides: {
              root: nativeStyleCallback(
                ({ ownerState }: { ownerState: Record<string, unknown> }) => {
                  observed.push({
                    present: Object.hasOwn(ownerState, 'style'),
                    style: ownerState.style,
                    nativeCalls,
                  });
                  return {};
                },
              ),
            },
          },
        },
      });
      const Component =
        name === 'MuiButton'
          ? styled(Button)({ minWidth: 91 })
          : styled(IconButton)({ minWidth: 91 });
      const tree = render(
        <NativeStyleCacheProvider value={cache('genuine-style')}>
          <ThemeProvider theme={theme}>
            <DefaultPropsProvider value={{ ...theme.components, mergeClassNameAndStyle: true }}>
              <Component testID="genuine" {...supplied}>
                Action
              </Component>
            </DefaultPropsProvider>
          </ThemeProvider>
        </NativeStyleCacheProvider>,
      );
      expect(observed).toHaveLength(1);
      expect(observed[0].present).toBe(kind !== 'absent');
      if (kind === 'merged') expect(observed[0].style).toEqual({ ...defaults, ...inline });
      else
        expect(observed[0].style).toBe(
          kind === 'callback' ? callback : kind === 'inline' ? inline : undefined,
        );
      expect(observed[0].nativeCalls).toBe(0);
      expect(style(tree.getByTestId('genuine').props).minWidth).toBe(91);
      if (kind === 'callback' || kind === 'inline' || kind === 'merged')
        expect(style(tree.getByTestId('genuine').props).marginTop).toBe(9);
      tree.unmount();
    }
  },
);

test.each(['class-alias', 'virtual-focus'] as const)(
  'composite frames retain Base source selectors for %s',
  (mode) => {
    const theme = createTheme({
      components: {
        MuiButtonBase: {
          defaultProps: mode === 'class-alias' ? { classes: { root: 'base-custom' } } : {},
          styleOverrides: {
            root: {
              [mode === 'class-alias' ? '&.base-custom' : '&.Mui-focused']: {
                opacity: 0.43,
              },
            },
          },
        },
      },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Button
          testID="base-source-selectors"
          {...(mode === 'virtual-focus'
            ? { _muiNativeItemState: { focused: true, focusVisible: true, selected: false } }
            : {})}
        >
          Retained Base selectors
        </Button>
      </ThemeProvider>,
    );
    expect(style(tree.getByTestId('base-source-selectors').props).opacity).toBe(0.43);
  },
);
