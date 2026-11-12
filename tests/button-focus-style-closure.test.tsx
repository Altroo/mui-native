import { StyleSheet } from 'react-native';
import { act, cleanup, fireEvent } from '@testing-library/react-native';
import {
  ButtonBase,
  ThemeProvider,
  createTheme,
  configureDiagnostics,
  type ButtonBaseState,
  type Shadows,
} from '../packages/material/src';
import { nativeButtonModality } from '../packages/material/src/nativeButtonModality';
import { clearNativeFocus } from '../packages/native-host/src/nativeFocus';
import { getNativeFocusedView } from '../packages/native-host/src';
import { NativeButtonModel } from './helpers/nativeButtonModel';

class FocusModel extends NativeButtonModel {
  base = false;
  element() {
    return this.base
      ? this.wrapper(
          <ButtonBase {...this.props} ref={this.attach('trigger')} testID="trigger">
            Action
          </ButtonBase>,
        )
      : super.element();
  }
}
let restore: () => void;
beforeEach(() => {
  restore = configureDiagnostics(() => {});
  nativeButtonModality.keyboard();
});
afterEach(() => {
  cleanup();
  clearNativeFocus(getNativeFocusedView());
  jest.restoreAllMocks();
  restore();
});
const nativeStyle = (model: FocusModel) => StyleSheet.flatten(model.native().style);
const buttonStyle = (model: FocusModel, state: Partial<ButtonBaseState> = {}) =>
  StyleSheet.flatten(
    model
      .tree!.UNSAFE_getByType(ButtonBase)
      .props.style({ pressed: false, focusVisible: false, disabled: false, ...state }),
  );
async function focus(model: FocusModel) {
  await act(async () => {
    model.focus(model.nodes.get('trigger'));
  });
}

test('opt-in theme focus applies to actual ButtonBase focus independently of ripple flags', async () => {
  const theme = createTheme({
    focusVisible: {
      outlineColor: '#123456',
      outlineWidth: 4,
      outlineOffset: 3,
      boxShadow: '0 0 3px red',
    },
  });
  const model = new FocusModel();
  model.base = true;
  model.props = { disableRipple: true, focusRipple: false };
  model.wrapper = (node) => <ThemeProvider theme={theme}>{node}</ThemeProvider>;
  await model.mount();
  expect(nativeStyle(model)?.outlineWidth).toBeUndefined();
  nativeButtonModality.pointer();
  await focus(model);
  expect(nativeStyle(model)?.outlineWidth).toBeUndefined();
  nativeButtonModality.keyboard();
  await focus(model);
  expect(nativeStyle(model)).toMatchObject({
    outlineColor: '#123456',
    outlineWidth: 4,
    outlineOffset: 3,
    outlineStyle: 'solid',
    boxShadow: '0 0 3px red',
  });
  model.props = { ...model.props, suppressFocusVisible: true };
  await model.update();
  expect(nativeStyle(model)?.outlineWidth).toBeUndefined();
});

test('opt-in focus styles yield to native inline values and bind a live callback foreground', async () => {
  const theme = createTheme({
    focusVisible: { outlineWidth: 4, boxShadow: '0 0 3px currentColor' },
  });
  const model = new FocusModel();
  model.base = true;
  model.props = {
    focusRipple: true,
    style: (state: ButtonBaseState) => ({
      color: state.focusVisible ? '#123456' : '#abcdef',
      outlineWidth: 7,
    }),
  };
  model.wrapper = (node) => <ThemeProvider theme={theme}>{node}</ThemeProvider>;
  await model.mount();
  await focus(model);
  expect(nativeStyle(model)).toMatchObject({ outlineWidth: 7, boxShadow: '0 0 3px #123456' });
});

test('virtual item focus does not grant the actual native theme focus ring', async () => {
  const model = new FocusModel();
  model.base = true;
  model.props = {
    _muiNativeItemState: { focused: true, focusVisible: true, selected: false },
    disableRipple: true,
  };
  model.wrapper = (node) => (
    <ThemeProvider theme={createTheme({ focusVisible: true })}>{node}</ThemeProvider>
  );
  await model.mount();
  expect(nativeStyle(model)?.outlineWidth).toBeUndefined();
  await focus(model);
  expect(nativeStyle(model)?.outlineWidth).toBe(2);
  model.props = { ...model.props, disabled: true };
  await model.update();
  expect(nativeStyle(model)?.outlineWidth).toBeUndefined();
});

test('legacy focus feedback remains bounded to focusRipple when no theme ring is opted in', async () => {
  const model = new FocusModel();
  model.base = true;
  model.props = { focusRipple: true };
  await model.mount();
  await focus(model);
  expect(nativeStyle(model)?.outlineWidth).toBe(2);
  model.props = { focusRipple: false };
  await model.update();
  expect(nativeStyle(model)?.outlineWidth).toBeUndefined();
});

test('contained native shadows follow source state order and theme tokens without legacy elevation', async () => {
  const theme = createTheme();
  const model = new FocusModel();
  model.props = { variant: 'contained' };
  model.wrapper = (node) => <ThemeProvider theme={theme}>{node}</ThemeProvider>;
  await model.mount();
  expect(buttonStyle(model)).toMatchObject({ boxShadow: theme.shadows[2] });
  expect(buttonStyle(model)?.elevation ?? 0).toBe(0);
  fireEvent(model.tree!.getByTestId('trigger'), 'hoverIn', {});
  expect(buttonStyle(model)?.boxShadow).toBe(theme.shadows[4]);
  expect(buttonStyle(model, { pressed: true })?.boxShadow).toBe(theme.shadows[8]);
  expect(buttonStyle(model, { pressed: true, focusVisible: true })?.boxShadow).toBe(
    theme.shadows[6],
  );
});

test('custom contained shadows and focus rings compose while disabled/loading reset them', async () => {
  const shadows: Shadows = [...createTheme().shadows];
  for (const level of [2, 4, 6, 8]) shadows[level] = `0 ${level}px 1px #123456`;
  const theme = createTheme({ shadows, focusVisible: { boxShadow: '0 0 0 3px currentColor' } });
  const model = new FocusModel();
  model.props = { variant: 'contained', style: { color: '#abcdef' } };
  model.wrapper = (node) => <ThemeProvider theme={theme}>{node}</ThemeProvider>;
  await model.mount();
  expect(buttonStyle(model)?.boxShadow).toBe(shadows[2]);
  expect(buttonStyle(model, { focusVisible: true })?.boxShadow).toBe(
    `${shadows[6]}, 0 0 0 3px #abcdef`,
  );
  model.props = { ...model.props, disabled: true };
  await model.update();
  expect(buttonStyle(model)?.boxShadow).toBe('none');
  model.props = { variant: 'contained', loading: true };
  await model.update();
  expect(buttonStyle(model)?.boxShadow).toBe('none');
});

test.each(['text', 'outlined', 'contained'] as const)(
  'disableElevation preserves only an opted-in custom focus shadow for %s',
  async (variant) => {
    const theme = createTheme({ focusVisible: { boxShadow: '0 0 4px red' } });
    const model = new FocusModel();
    model.props = { variant, disableElevation: true };
    model.wrapper = (node) => <ThemeProvider theme={theme}>{node}</ThemeProvider>;
    await model.mount();
    expect(buttonStyle(model)?.boxShadow).toBe('none');
    expect(buttonStyle(model, { pressed: true })?.boxShadow).toBe('none');
    expect(buttonStyle(model, { focusVisible: true })?.boxShadow).toBe('0 0 4px red');
    expect(buttonStyle(model, { pressed: true, focusVisible: true })?.boxShadow).toBe('none');
  },
);

test('contained shadow selectors retain specificity over plain sx while inline styles remain final', async () => {
  const theme = createTheme();
  const model = new FocusModel();
  model.props = { variant: 'contained', sx: { boxShadow: 3 } };
  model.wrapper = (node) => <ThemeProvider theme={theme}>{node}</ThemeProvider>;
  await model.mount();
  expect(buttonStyle(model)?.boxShadow).toBe(theme.shadows[3]);
  expect(buttonStyle(model, { focusVisible: true })?.boxShadow).toBe(theme.shadows[6]);
  model.props = { ...model.props, style: { boxShadow: '0 0 2px red' } };
  await model.update();
  expect(buttonStyle(model, { focusVisible: true })?.boxShadow).toBe('0 0 2px red');
});

test.each(['text', 'outlined'] as const)(
  'Base focus selectors outrank plain %s CSS while true native inline remains final',
  async (variant) => {
    const theme = createTheme({ focusVisible: { boxShadow: '0 0 4px red' } });
    const model = new FocusModel();
    model.props = { variant, sx: { boxShadow: 2 } };
    model.wrapper = (node) => <ThemeProvider theme={theme}>{node}</ThemeProvider>;
    await model.mount();
    await focus(model);
    expect(nativeStyle(model)?.boxShadow).toBe('0 0 4px red');
    model.props = { ...model.props, style: { boxShadow: '0 0 2px blue' } };
    await model.update();
    expect(nativeStyle(model)?.boxShadow).toBe('0 0 2px blue');
  },
);

test('resolved private focus ownership defaults participate in theme variants and do not reach native props', async () => {
  const theme = createTheme({
    focusVisible: true,
    components: {
      MuiButtonBase: {
        variants: [
          {
            props: { internalDisabledThemeFocusVisible: false },
            style: { borderWidth: 3 },
          },
        ],
      },
    },
  });
  const model = new FocusModel();
  model.base = true;
  model.wrapper = (node) => <ThemeProvider theme={theme}>{node}</ThemeProvider>;
  await model.mount();
  await focus(model);
  expect(nativeStyle(model)?.borderWidth).toBe(3);
  model.props = { internalDisabledThemeFocusVisible: true };
  await model.update();
  expect(nativeStyle(model)?.borderWidth).toBe(0);
  expect(nativeStyle(model)?.outlineWidth).toBeUndefined();
  expect(model.native().internalDisabledThemeFocusVisible).toBeUndefined();
});

test.each(['Button', 'IconButton'] as const)(
  '%s keeps Base focus typography provenance and authored native metrics on its label',
  async (kind) => {
    const theme = createTheme({
      focusVisible: { color: '#123456', fontSize: '2em', lineHeight: 1.5 },
    });
    const model = new FocusModel();
    model.kind = kind;
    model.props = { style: { fontSize: 20 } };
    model.wrapper = (node) => <ThemeProvider theme={theme}>{node}</ThemeProvider>;
    await model.mount();
    await focus(model);
    expect(model.tree!.getByText('Action')).toHaveStyle({
      color: '#123456',
      fontSize: 20,
      lineHeight: 30,
    });
  },
);
