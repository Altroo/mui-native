import * as RN from 'react-native';
import { act, cleanup } from '@testing-library/react-native';
import {
  Radio,
  RadioGroup,
  ThemeProvider,
  createTheme,
  configureDiagnostics,
  decomposeColor,
} from '../packages/material/src';
import { getNativeFocusedView } from '../packages/native-host/src';
import { clearNativeFocus } from '../packages/native-host/src/nativeFocus';
import { nativeInsets } from '../packages/material/src/nativeInsets';
import { NativeCheckedModel } from './helpers/nativeCheckedModel';
import reference from './fixtures/mui-checked-styles-browser-9.5.0.json';
let restore: () => void;
beforeEach(() => {
  restore = configureDiagnostics(() => {});
  jest
    .spyOn(RN.Dimensions, 'get')
    .mockReturnValue({ ...reference.viewport, scale: 1, fontScale: 1 });
});
afterEach(() => {
  cleanup();
  clearNativeFocus(getNativeFocusedView());
  jest.restoreAllMocks();
  restore();
});
const rgba = (value: string) => {
  const color = decomposeColor(value);
  return [...color.values.slice(0, 3).map(Math.round), color.values[3] ?? 1];
};
test.each(reference.fixtures)('original checked styling: $input.name', async (fixture: any) => {
  const test = fixture.input,
    model = new NativeCheckedModel();
  model.kind = test.kind;
  model.props = test.props ?? {};
  model.inputProps = test.input ?? {};
  const makeRoot = (owner?: any) => ({
    ...test.root,
    testID: 'root',
    ...(test.rootUndefined
      ? { sx: undefined }
      : test.rootCallback
        ? { sx: { mt: owner.color === 'primary' ? 2 : 3 } }
        : test.rootThemeFunction
          ? { sx: (theme: any) => ({ mt: theme.spacing(2) }) }
          : {}),
  });
  model.rootProps = test.rootCallback ? (makeRoot as any) : makeRoot();
  model.wrapper = (node) => (
    <ThemeProvider
      theme={createTheme({
        components: {
          ['Mui' + test.kind]: { defaultProps: test.defaults, styleOverrides: test.overrides },
        },
      })}
    >
      {node}
    </ThemeProvider>
  );
  await model.mount();
  const snapshot = () => {
    const style = RN.StyleSheet.flatten(model.tree!.getByTestId('root').props.style),
      padding = nativeInsets(style, 'padding'),
      margin = nativeInsets(style, 'margin');
    return {
      checked: model.handles.get('a')!.checked,
      styles: Object.fromEntries(
        [
          'marginTop',
          'marginRight',
          'marginBottom',
          'marginLeft',
          'paddingTop',
          'paddingRight',
          'paddingBottom',
          'paddingLeft',
        ]
          .map((key) => [
            key,
            `${String((key.startsWith('padding') ? padding : margin)[key as keyof typeof padding] ?? 0)}px`,
          ])
          .concat([['color', rgba(style.color) as any]]),
      ),
    };
  };
  const expected = (state: any) => ({
    ...state,
    styles: { ...state.styles, color: rgba(state.styles.color) },
  });
  expect(snapshot()).toEqual(expected(fixture.states[0]));
  for (const [index, action] of (test.actions ?? []).entries()) {
    if (action.props) {
      model.props = { ...model.props, ...action.props };
      await act(async () => model.tree!.rerender(model.element()));
    }
    if (action.click) await model.press();
    expect(snapshot()).toEqual(expected(fixture.states[index + 1]));
  }
});

test.each(['Checkbox', 'Radio'])(
  '%s disabled input cannot activate despite source root color',
  async (kind) => {
    const model = new NativeCheckedModel();
    model.kind = kind;
    model.props = { checked: true };
    model.inputProps = { disabled: true };
    await model.mount();
    await model.press();
    expect(model.changeTrace).toEqual([]);
    expect(model.handles.get('a')!.disabled).toBe(true);
  },
);
test.each(['Checkbox', 'Radio'])(
  '%s root sx merges native physical styles in final direction',
  async (kind) => {
    const model = new NativeCheckedModel();
    model.kind = kind;
    model.props = { edge: 'start', sx: { ml: 9 }, style: () => ({ marginLeft: 5 }) };
    model.rootProps = {
      testID: 'root',
      sx: { ml: 1 },
      style: () => ({ direction: 'rtl', marginLeft: 6 }),
    };
    await model.mount();
    const style = RN.StyleSheet.flatten(model.tree!.getByTestId('root').props.style);
    expect(style.marginEnd).toBe(6);
    expect(style.marginStart).toBe(-12);
  },
);
test.each(['Checkbox', 'Radio'])(
  '%s root horizontal sx clears the default logical edge',
  async (kind) => {
    const model = new NativeCheckedModel();
    model.kind = kind;
    model.props = { edge: 'start', sx: { mx: 9 } };
    model.rootProps = { testID: 'root', sx: { mx: 0 } };
    model.wrapper = (node) => (
      <ThemeProvider theme={createTheme({ direction: 'rtl' })}>{node}</ThemeProvider>
    );
    await model.mount();
    const style = RN.StyleSheet.flatten(model.tree!.getByTestId('root').props.style);
    expect(style.marginStart).toBe(0);
    expect(style.marginEnd).toBe(0);
  },
);
test.each(['Checkbox', 'Radio'])(
  '%s root theme callback receives the resolved provider theme',
  (kind) => {
    const { render } = require('@testing-library/react-native'),
      library = require('../packages/material/src'),
      Control = library[kind],
      theme = createTheme(),
      seen: any[] = [];
    let resolved: any;
    function Probe() {
      resolved = library.useTheme();
      return (
        <Control
          slotProps={{
            root: {
              sx: (value: any) => {
                seen.push(value);
                return { mt: 1 };
              },
            },
          }}
        />
      );
    }
    render(
      <ThemeProvider theme={theme}>
        <Probe />
      </ThemeProvider>,
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((value) => value === resolved)).toBe(true);
  },
);

// Keep group direction on the group: copying group props onto each child masks inheritance.
test.each([
  ['ltr', 'rtl', undefined, 'c'],
  ['rtl', 'ltr', undefined, 'b'],
  ['ltr', 'rtl', 'ltr', 'b'],
  ['ltr', 'rtl', 'inherit', 'c'],
] as const)(
  'radio group direction inherits theme=%s group=%s child=%s',
  async (themeDirection, groupDirection, childDirection, next) => {
    const model = new NativeCheckedModel();
    model.items = ['a', 'b', 'c'].map((id) => ({ id, label: id }));
    for (const item of model.items) model.parents.set(item.id, null);
    model.element = () => (
      <ThemeProvider theme={createTheme({ direction: themeDirection })}>
        <RadioGroup defaultValue="a" style={{ direction: groupDirection }}>
          {model.items.map(({ id }) => (
            <Radio
              key={id}
              value={id}
              inputRef={(handle) => {
                if (handle) model.handles.set(id, handle);
              }}
              style={childDirection ? { direction: childDirection } : undefined}
              slotProps={{
                root: { testID: id + '-root' },
                input: { ref: model.attach(id) },
              }}
            />
          ))}
        </RadioGroup>
      </ThemeProvider>
    );
    await model.mount();
    const style = RN.StyleSheet.flatten(model.tree!.getByTestId('a-root').props.style);
    expect(style.direction).toBe(childDirection ?? groupDirection);
    await model.nativeKey('a', 'ArrowRight');
    expect(model.handles.get(next)!.checked).toBe(true);
    expect(model.current === model.nodes.get(next)).toBe(true);
  },
);
