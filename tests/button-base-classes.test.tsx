// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import { forwardRef } from 'react';
import { Text, View, type ViewInstance } from 'react-native';
import { act, cleanup, render, screen } from '@testing-library/react-native';
import { NativePressable } from '@altroo/mui-native-host';
import { componentStyle, componentRootStyle } from '../packages/system/src';
import {
  ButtonBase,
  buttonBaseClasses,
  getButtonBaseUtilityClass,
  ThemeProvider,
  createTheme,
  styled,
  type ButtonBaseProps,
} from '@altroo/mui-native';
import Canonical, {
  buttonBaseClasses as CanonicalClasses,
  getButtonBaseUtilityClass as canonicalHelper,
} from '../packages/material/src/ButtonBase/index';
import { unstable_ClassNameGenerator as generator } from '../packages/material/src/className';
import { NativeButtonModel } from './helpers/nativeButtonModel';
import reference from './fixtures/mui-button-base-9.5.0.json';

afterEach(() => {
  cleanup();
  generator.reset();
});
const Leaf = forwardRef<ViewInstance, Record<string, any>>(function Leaf(
  { className: _className, ...props },
  ref,
) {
  return <NativePressable {...props} ref={ref} />;
});
class Model extends NativeButtonModel {
  baseProps: Partial<ButtonBaseProps> = {};
  element() {
    return (
      <ButtonBase
        {...this.baseProps}
        ref={this.attach('trigger')}
        testID="trigger"
        component={Leaf}
      >
        Action
      </ButtonBase>
    );
  }
}

test('root/canonical public helpers and complete fixed vocabulary match the original', () => {
  expect(Canonical).toBe(ButtonBase);
  expect(CanonicalClasses).toBe(buttonBaseClasses);
  expect(canonicalHelper).toBe(getButtonBaseUtilityClass);
  expect(buttonBaseClasses).toEqual(reference.classes);
  for (const [slot, expected] of Object.entries(reference.classUtilities))
    expect(getButtonBaseUtilityClass(slot)).toBe(expected);
});

test.each(reference.classContracts)(
  'source ordered active classes and focus/blur metadata: $input',
  async ({ input, initial, focused, blurred }) => {
    const reads: string[] = [];
    const classes = Object.defineProperties(
      {},
      Object.fromEntries(
        ['root', 'disabled', 'focusVisible'].map((key) => [
          key,
          {
            enumerable: true,
            get() {
              reads.push(key);
              return 'custom-' + key;
            },
          },
        ]),
      ),
    );
    const model = new Model();
    model.baseProps = {
      classes,
      disabled: input.disabled,
      suppressFocusVisible: input.suppress,
      disableRipple: true,
      className: 'authored-root',
      focusVisibleClassName: 'authored-focus',
    };
    await model.mount();
    expect(screen.UNSAFE_getByType(Leaf).props.className).toBe(initial.className);
    expect(reads).toEqual(initial.reads);
    reads.length = 0;
    await model.nativeKey('Tab');
    await model.action({ focus: 'trigger' });
    expect(screen.UNSAFE_getByType(Leaf).props.className).toBe(focused.className);
    if (!input.disabled) expect(reads).toEqual(focused.reads);
    await act(async () => model.focusEvent('Blur', model.nodes.get('trigger')));
    expect(screen.UNSAFE_getByType(Leaf).props.className).toBe(blurred.className);
  },
);

test('live generator configuration leaves imported maps fixed and reset updates rendered self selectors', () => {
  expect(buttonBaseClasses.root).toBe(reference.classConfiguration.before);
  generator.configure((name) => 'Consumer' + name);
  expect(getButtonBaseUtilityClass('root')).toBe(reference.classConfiguration.configured.root);
  expect(getButtonBaseUtilityClass('disabled')).toBe(
    reference.classConfiguration.configured.disabled,
  );
  expect(buttonBaseClasses.root).toBe(reference.classConfiguration.configured.mapRoot);
  const tree = render(
    <ButtonBase testID="configured" sx={{ '&.ConsumerMuiButtonBase-root': { opacity: 0.4 } }}>
      Action
    </ButtonBase>,
  );
  expect(tree.getByTestId('configured')).toHaveStyle({ opacity: 0.4 });
  generator.reset();
  tree.rerender(
    <ButtonBase testID="configured" sx={{ '&.ConsumerMuiButtonBase-root': { opacity: 0.4 } }}>
      Action
    </ButtonBase>,
  );
  expect(getButtonBaseUtilityClass('root')).toBe(reference.classConfiguration.after);
  expect(tree.getByTestId('configured')).not.toHaveStyle({ opacity: 0.4 });
});

test('early configuration determines only maps created in that module instance', () => {
  jest.isolateModules(() => {
    const isolated = require('../packages/material/src/className').unstable_ClassNameGenerator;
    isolated.configure((name: string) => 'Early' + name);
    const classes = require('../packages/material/src/buttonBaseClasses');
    expect(classes.buttonBaseClasses.root).toBe('EarlyMuiButtonBase-root');
    isolated.reset();
    expect(classes.getButtonBaseUtilityClass('root')).toBe('MuiButtonBase-root');
    expect(classes.buttonBaseClasses.root).toBe('EarlyMuiButtonBase-root');
  });
});

test.each(['static', 'callback'] as const)(
  'native %s styles retain precedence over prepared class selectors and root callback metadata',
  (kind) => {
    const seen: string[] = [];
    const Control = styled(ButtonBase)({ '&.custom-root': { opacity: 0.4, padding: 3 } });
    render(
      <ThemeProvider
        theme={createTheme({
          components: {
            MuiButtonBase: {
              styleOverrides: {
                root: (args) => {
                  seen.push(String(args.className));
                  return { '&.custom-root': { borderTopWidth: 2 } };
                },
              },
            },
          },
        })}
      >
        <Control
          className="custom-root"
          testID="styled"
          style={kind === 'static' ? { opacity: 0.8 } : () => ({ opacity: 0.8 })}
        >
          Action
        </Control>
      </ThemeProvider>,
    );
    expect(screen.getByTestId('styled')).toHaveStyle({
      opacity: 0.8,
      padding: 3,
      borderTopWidth: 2,
    });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((name) => name.includes('MuiButtonBase-root custom-root'))).toBe(true);
  },
);

test('authored disabled class blocks pointer targeting while actual enabled keyboard activation survives', async () => {
  const pressed = jest.fn();
  const model = new Model();
  model.baseProps = { className: 'Mui-disabled', pointerEvents: 'auto', onPress: pressed };
  await model.mount();
  expect(screen.UNSAFE_getByType(Leaf).props.pointerEvents).toBe('none');
  expect(screen.UNSAFE_getByType(Leaf).props.disabled).toBe(false);
  await model.nativeKey('Enter');
  expect(pressed).toHaveBeenCalledTimes(1);
});

test('class-aware native text inheritance retains relative and absolute line-height layers', () => {
  const tree = render(
    <ButtonBase sx={{ fontSize: 20, lineHeight: 1.5 }}>
      <Text testID="small" style={{ fontSize: 10 }}>
        Small
      </Text>
    </ButtonBase>,
  );
  expect(tree.getByTestId('small')).toHaveStyle({ fontSize: 10, lineHeight: 15 });
  tree.rerender(
    <ButtonBase sx={{ fontSize: 20, lineHeight: 1.5 }} style={{ lineHeight: 32 }}>
      <Text testID="small" style={{ fontSize: 10 }}>
        Small
      </Text>
    </ButtonBase>,
  );
  expect(tree.getByTestId('small')).toHaveStyle({ fontSize: 10, lineHeight: 32 });
});

test('the stock native View root filters CSS metadata and retains native children', () => {
  render(
    <ButtonBase component={View} className="custom-root" testID="stock">
      Action
    </ButtonBase>,
  );
  expect(screen.getByTestId('stock').props.className).toBeUndefined();
  expect(screen.getByText('Action')).toBeTruthy();
});

test('composite stylesheet callbacks retain public Base classes and theme callback arguments', () => {
  const seen: string[] = [];
  render(
    <ThemeProvider
      theme={createTheme({
        components: {
          MuiButtonBase: {
            styleOverrides: {
              root: (args) => {
                seen.push(String(args.className));
                return { '&.custom-composite': { borderWidth: 2 } };
              },
            },
          },
        },
      })}
    >
      <ButtonBase
        testID="composite"
        className="custom-composite"
        sx={{ '&.custom-composite': { opacity: 0.7 } }}
        _muiNativeStyle={(_state, sheet) => ({
          computed: componentStyle(sheet.theme, '', {}, undefined, {
            classes: sheet.context.classes,
            ancestors: [sheet],
          }),
          authored: { marginTop: 9 },
        })}
      >
        Action
      </ButtonBase>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('composite')).toHaveStyle({
    opacity: 0.7,
    borderWidth: 2,
    marginTop: 9,
  });
  expect(seen.length).toBeGreaterThan(0);
  expect(seen.every((name) => name === 'MuiButtonBase-root custom-composite')).toBe(true);
});

test('prepared outer class rules survive the internal composite stylesheet path with native inline priority', () => {
  const Control = styled(ButtonBase)({ '&.custom-composite': { opacity: 0.4, borderTopWidth: 3 } });
  render(
    <Control
      testID="prepared-composite"
      className="custom-composite"
      _muiNativeStyle={(_state, sheet) => ({
        computed: componentStyle(sheet.theme, '', {}, undefined, {
          classes: sheet.context.classes,
          ancestors: [sheet],
        }),
        authored: { opacity: 0.8 },
      })}
    >
      Action
    </Control>,
  );
  expect(screen.getByTestId('prepared-composite')).toHaveStyle({ opacity: 0.8, borderTopWidth: 3 });
});

test.each([undefined, false, true])(
  'normalized suppression=%s reaches callbacks and default-false variants',
  (suppress) => {
    const values: unknown[] = [];
    render(
      <ThemeProvider
        theme={createTheme({
          components: {
            MuiButtonBase: {
              styleOverrides: {
                root: nativeStyleCallback((args) => {
                  values.push(args.ownerState.suppressFocusVisible);
                  return {};
                }),
              },
              variants: [{ props: { suppressFocusVisible: false }, style: { opacity: 0.6 } }],
            },
          },
        })}
      >
        <ButtonBase
          testID="suppression"
          {...(suppress === undefined ? {} : { suppressFocusVisible: suppress })}
        >
          Action
        </ButtonBase>
      </ThemeProvider>,
    );
    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => value === (suppress ?? false))).toBe(true);
    if (suppress === true)
      expect(screen.getByTestId('suppression')).not.toHaveStyle({ opacity: 0.6 });
    else expect(screen.getByTestId('suppression')).toHaveStyle({ opacity: 0.6 });
  },
);

test('retained same-root sheets match both Base aliases and final composite tokens without enabling true ancestor self rules', () => {
  const theme = createTheme();
  const prepared = componentRootStyle(
    theme,
    '',
    {},
    { '&.BaseAlias.CompositeRoot': { borderTopWidth: 4 } },
    undefined,
    { classes: ['BaseAlias'] },
  ).prepared;
  const sheet = { theme, name: '', props: {}, context: { classes: ['BaseAlias'] }, prepared };
  const shared = componentStyle(theme, '', {}, undefined, {
    classes: ['CompositeRoot'],
    ancestors: [{ ...sheet, sameRoot: true }],
  });
  expect(shared).toMatchObject({ borderTopWidth: 4 });
  const ancestor = componentStyle(theme, '', {}, undefined, {
    classes: ['CompositeRoot'],
    ancestors: [sheet],
  });
  expect(ancestor.borderTopWidth).toBeUndefined();
});

test('configured Base names survive a composite with a distinct final class list', () => {
  generator.configure((name) => 'Configured' + name);
  const Control = styled(ButtonBase)({
    '&.ConfiguredMuiButtonBase-root.CompositeRoot': { borderTopWidth: 3 },
  });
  render(
    <Control
      testID="configured-composite"
      _muiNativeStyle={(_state, sheet) => ({
        computed: componentStyle(sheet.theme, '', {}, undefined, {
          classes: ['CompositeRoot'],
          ancestors: [sheet],
        }),
        authored: { opacity: 0.8 },
      })}
    >
      Action
    </Control>,
  );
  expect(screen.getByTestId('configured-composite')).toHaveStyle({
    borderTopWidth: 3,
    opacity: 0.8,
  });
});

test('true ancestor sheets retained inside a shared-root bundle never become root rules', () => {
  const theme = createTheme();
  const original = componentRootStyle(
    theme,
    '',
    {},
    { '&.AncestorRoot': { borderLeftWidth: 7 } },
    undefined,
    { classes: ['AncestorRoot'] },
  ).prepared;
  const prepared = { sheets: original.sheets.map((sheet) => ({ ...sheet, ancestor: true })) };
  const result = componentStyle(theme, '', {}, undefined, {
    classes: ['AncestorRoot'],
    ancestors: [
      {
        theme,
        name: '',
        props: {},
        context: { classes: ['AncestorRoot'] },
        prepared,
        sameRoot: true,
      },
    ],
  });
  expect(result.borderLeftWidth).toBeUndefined();
});

test('true ancestor descendant selectors retain their original target context inside a shared-root bundle', () => {
  const theme = createTheme();
  const original = componentRootStyle(
    theme,
    '',
    {},
    { '&.AncestorRoot': { borderLeftWidth: 7 }, '& .Leaf': { borderRightWidth: 5 } },
    undefined,
    {
      classes: ['AncestorRoot'],
      descendantOnly: true,
      descendantClasses: ['Leaf'],
      descendantPath: [{ classes: ['Leaf'] }],
    },
  ).prepared;
  const prepared = { sheets: original.sheets.map((sheet) => ({ ...sheet, ancestor: true })) };
  const result = componentStyle(theme, '', {}, undefined, {
    classes: ['Leaf'],
    ancestors: [
      { theme, name: '', props: {}, context: { classes: ['BaseAlias'] }, prepared, sameRoot: true },
    ],
  });
  expect(result.borderLeftWidth).toBeUndefined();
  expect(result.borderRightWidth).toBe(5);
});

test('retained true ancestors preserve resolved last-child readers without reading unused caller facts', () => {
  const theme = createTheme();
  const last = jest.fn(() => true);
  const context = {
    classes: ['AncestorRoot'],
    descendantOnly: true,
    descendantClasses: ['Leaf'],
    descendantPath: [{ classes: ['Leaf'] }],
    get lastChild() {
      return last();
    },
  };
  const original = componentRootStyle(
    theme,
    '',
    {},
    { '&:last-child .Leaf': { borderBottomWidth: 6 } },
    undefined,
    context,
  ).prepared;
  expect(last).toHaveBeenCalledTimes(1);
  const prepared = { sheets: original.sheets.map((sheet) => ({ ...sheet, ancestor: true })) };
  const result = componentStyle(theme, '', {}, undefined, {
    classes: ['Leaf'],
    ancestors: [
      { theme, name: '', props: {}, context: { classes: ['BaseAlias'] }, prepared, sameRoot: true },
    ],
  });
  expect(result.borderBottomWidth).toBe(6);
  expect(last).toHaveBeenCalledTimes(1);
  const unused = jest.fn(() => true);
  const plain = componentRootStyle(theme, '', {}, { '& .Leaf': { marginTop: 2 } }, undefined, {
    ...context,
    get lastChild() {
      return unused();
    },
  }).prepared;
  // Isolate recollection from the existing preparation-time context snapshot.
  unused.mockClear();
  componentStyle(theme, '', {}, undefined, {
    classes: ['Leaf'],
    ancestors: [
      {
        theme,
        name: '',
        props: {},
        context: {},
        prepared: { sheets: plain.sheets.map((sheet) => ({ ...sheet, ancestor: true })) },
        sameRoot: true,
      },
    ],
  });
  expect(unused).not.toHaveBeenCalled();
});
