import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import {
  Chip,
  ButtonBase,
  ThemeProvider,
  createTheme,
  configureDiagnostics,
  decomposeColor,
  chipClasses,
  getChipUtilityClass,
} from '@altroo/mui-native';
import { clearNativeFocus } from '../packages/native-host/src/nativeFocus';
import { getNativeFocusedView } from '@altroo/mui-native-host';
import { NativeOverlayReadiness } from '../packages/material/src/nativeOverlayReadiness';
import { nativeModalManager } from '../packages/material/src/nativeModalManager';
import { NativeChipModel } from './helpers/nativeChipModel';
import reference from './fixtures/mui-chip-browser-9.5.0.json';
import keyboard from './fixtures/mui-chip-keyboard-9.5.0.json';
let restore: () => void;
beforeEach(() => {
  restore = configureDiagnostics(() => {});
});
afterEach(() => {
  cleanup();
  clearNativeFocus(getNativeFocusedView());
  jest.restoreAllMocks();
  restore();
});
const ownerFields = (owner: any) =>
  Object.fromEntries(
    ['disabled', 'clickable', 'onDelete', 'size', 'color', 'variant', 'iconColor'].map((key) => [
      key,
      owner[key] ?? null,
    ]),
  );
const rgba = (value: string) => {
  if (value === 'transparent') return [0, 0, 0, 0];
  const color = decomposeColor(value);
  return [...color.values.slice(0, 3).map(Math.round), color.values[3] ?? 1];
};
function configure(model: NativeChipModel, test: any) {
  model.props = {
    ...test.props,
    onClick: test.click ? () => model.trace.push('click') : undefined,
    onDelete: test.deletable ? () => model.trace.push('delete') : undefined,
    onKeyDown: (event: any) => model.trace.push('down:' + event.key + ':' + event.defaultPrevented),
    onKeyUp: (event: any) => model.trace.push('up:' + event.key + ':' + event.defaultPrevented),
    avatar: test.avatar ? <Text testID="avatar">A</Text> : undefined,
    icon: test.icon ? <Text testID="icon">I</Text> : undefined,
    deleteIcon: test.customDelete ? (
      <Text onPress={() => model.trace.push('old-delete')}>X</Text>
    ) : undefined,
    slotProps: {
      root: test.callbacks
        ? (owner: any) => {
            model.owner.root = ownerFields(owner);
            return {
              onClick: () => model.trace.push('root-click'),
              onKeyDown: (event: any) =>
                model.trace.push('root-down:' + event.key + ':' + event.defaultPrevented),
              onKeyUp: (event: any) =>
                model.trace.push('root-up:' + event.key + ':' + event.defaultPrevented),
            };
          }
        : test.root,
      label: test.callbacks
        ? (owner: any) => {
            model.owner.label = ownerFields(owner);
            return { testID: 'label' };
          }
        : { ...test.label, testID: 'label' },
    },
  };
  model.wrapper = (node) => (
    <ThemeProvider
      theme={createTheme({
        palette: { mode: test.dark ? 'dark' : 'light' },
        components: { MuiChip: { defaultProps: test.defaults, styleOverrides: test.overrides } },
      })}
    >
      {node}
    </ThemeProvider>
  );
}
test.each(reference.fixtures)('original Chip source: $input.name', async (fixture: any) => {
  const model = new NativeChipModel(),
    test = fixture.input;
  configure(model, test);
  await model.mount();
  const style = StyleSheet.flatten(model.tree!.getByTestId('chip').props.style),
    expected = fixture.states[0],
    label = StyleSheet.flatten(model.tree!.getByTestId('label').props.style),
    text = StyleSheet.flatten(model.tree!.getByText('Choice').props.style);
  for (const key of ['marginTop', 'marginRight', 'borderTopWidth'])
    expect(style[key === 'borderTopWidth' ? 'borderWidth' : key] ?? 0).toBe(
      parseFloat(expected.root.style[key]),
    );
  expect(rgba(style.backgroundColor)).toEqual(rgba(expected.root.style.backgroundColor));
  expect(style.opacity ?? 1).toBe(Number(expected.root.style.opacity));
  expect(label.paddingLeft).toBe(parseFloat(expected.label.paddingLeft));
  expect(label.paddingRight).toBe(parseFloat(expected.label.paddingRight));
  expect(text.fontSize).toBe(parseFloat(expected.label.fontSize));
  expect(text.lineHeight).toBe(parseFloat(expected.label.lineHeight));
  expect(rgba(text.color)).toEqual(rgba(expected.label.color));
  expect(
    model.tree!.queryByTestId('avatar', { includeHiddenElements: true })
      ? 'avatar'
      : model.tree!.queryByTestId('icon', { includeHiddenElements: true })
        ? 'icon'
        : null,
  ).toBe(expected.decoration);
  expect(model.owner).toEqual(expected.owners);
  expect(style.height).toBe(
    expected.root.role === 'button' ? 44 : parseFloat(expected.root.style.height),
  );
  await model.pressChip();
  if (test.deletable) await model.pressDelete();
  expect(model.trace).toEqual(test.props?.disabled ? [] : fixture.states.at(-1).trace);
});
test.each(keyboard.fixtures)(
  'original trusted Chip keyboard: $input.name',
  async (fixture: any) => {
    const model = new NativeChipModel();
    configure(model, fixture.input);
    await model.mount();
    for (const input of fixture.input.keys) {
      const key = input === 'Space' ? ' ' : input;
      await model.key(key);
      await model.key(key, true);
    }
    expect(model.trace).toEqual(fixture.input.props?.disabled ? [] : fixture.states.at(-1).trace);
  },
);
test('Chip utility helpers match original classes and global states', () => {
  expect(chipClasses).toEqual(reference.helpers.classes);
  for (const [key, value] of Object.entries(reference.helpers.states))
    expect(getChipUtilityClass(key)).toBe(value);
});
test.each(['Backspace', 'Delete'])(
  '%s deletes on keyup without stopping parent keyboard propagation',
  async (key) => {
    const remove = jest.fn(),
      model = new NativeChipModel();
    model.props = { onDelete: remove };
    await model.mount();
    await model.key(key);
    expect(remove).not.toHaveBeenCalled();
    await model.key(key, true);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0][0].isPropagationStopped()).toBe(false);
  },
);
test.each([{ isComposing: true }, { isCanceled: true }])(
  'Chip rejects composing/canceled deletion %j',
  async (extra) => {
    const remove = jest.fn(),
      model = new NativeChipModel();
    model.props = { onDelete: remove };
    await model.mount();
    await model.key('Delete', true, extra);
    expect(remove).not.toHaveBeenCalled();
  },
);
test('disabled Chip keeps focus by default and skipFocusWhenDisabled removes it', async () => {
  const model = new NativeChipModel();
  model.props = { disabled: true, onDelete: jest.fn() };
  await model.mount();
  expect(model.tree!.getByTestId('chip').props.nativeFocusable).toBe(true);
  model.props.skipFocusWhenDisabled = true;
  await act(async () => model.tree!.rerender(model.element()));
  expect(model.tree!.getByTestId('chip').props.nativeTabIndex).toBe(-1);
  expect(model.tree!.getByTestId('chip').props.nativeFocusable).toBe(false);
});
test('root and delete presses retain latest callbacks and ignore late unmount calls', async () => {
  const first = jest.fn(),
    second = jest.fn(),
    model = new NativeChipModel();
  model.props = { onDelete: first };
  await model.mount();
  const saved = model
    .tree!.UNSAFE_getAllByType(ButtonBase)
    .find((node) => node.props.testID === 'chip-delete')!.props.onClick;
  model.props = { onDelete: second };
  await act(async () => model.tree!.rerender(model.element()));
  await act(async () => saved(model.event(model.nodes.get('chip'))));
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
  await act(async () => model.tree!.unmount());
  saved(model.event(model.nodes.get('chip')));
  expect(second).toHaveBeenCalledTimes(1);
});
test('overlay readiness blocks click, delete and focus-visible actions', async () => {
  const remove = jest.fn(),
    click = jest.fn(),
    action = React.createRef<any>(),
    model = new NativeChipModel();
  model.props = { onDelete: remove, onClick: click, action };
  model.wrapper = (node) => (
    <NativeOverlayReadiness.Provider value={false}>{node}</NativeOverlayReadiness.Provider>
  );
  await model.mount();
  await model.pressChip();
  await model.pressDelete();
  await model.key('Delete', true);
  await act(async () => action.current.focusVisible());
  expect(remove).not.toHaveBeenCalled();
  expect(click).not.toHaveBeenCalled();
  expect(model.current).toBe(null);
});
test('covered Chip cannot delete through retained handlers', async () => {
  const remove = jest.fn(),
    model = new NativeChipModel();
  model.props = { onDelete: remove };
  await model.mount();
  jest.spyOn(nativeModalManager, 'top').mockReturnValue({ contains: () => false } as any);
  await model.pressDelete();
  await model.key('Delete', true);
  expect(remove).not.toHaveBeenCalled();
});
test('descendant Delete key does not delete the outer Chip', async () => {
  const remove = jest.fn(),
    model = new NativeChipModel();
  model.props = { onDelete: remove };
  await model.mount();
  const target = model.nodes.get('chip');
  await act(async () => target.props.onMUIKeyUp({ ...model.event(target, 'Delete'), target: {} }));
  expect(remove).not.toHaveBeenCalled();
});
test('delete accessibility action is named and follows current disabled ownership', async () => {
  const remove = jest.fn(),
    model = new NativeChipModel();
  model.props = { onDelete: remove };
  await model.mount();
  const root = model.tree!.getByTestId('chip');
  expect(root.props.accessibilityActions).toEqual([{ name: 'delete', label: 'Delete' }]);
  fireEvent(root, 'accessibilityAction', {
    nativeEvent: { actionName: 'delete' },
    stopPropagation: jest.fn(),
  });
  expect(remove).toHaveBeenCalledTimes(1);
  model.props.disabled = true;
  await act(async () => model.tree!.rerender(model.element()));
  fireEvent(model.tree!.getByTestId('chip'), 'accessibilityAction', {
    nativeEvent: { actionName: 'delete' },
    stopPropagation: jest.fn(),
  });
  expect(remove).toHaveBeenCalledTimes(1);
});
test('rich labels keep native View boundaries and decorative text is hidden', () => {
  const tree = render(
    <Chip
      label={
        <View testID="rich">
          <Text>Rich label</Text>
        </View>
      }
      icon={<Text>Icon text</Text>}
    />,
  );
  const rich = tree.getByTestId('rich');
  let parent = rich.parent;
  while (parent) {
    expect(parent.type).not.toBe(Text);
    parent = parent.parent;
  }
  expect(tree.queryByText('Icon text')).toBe(null);
  expect(tree.getByText('Icon text', { includeHiddenElements: true })).toBeTruthy();
});
test('root native style callback is evaluated once per render and root sx clears top sx', () => {
  const outer = jest.fn(() => ({ marginLeft: 3 })),
    root = jest.fn(() => ({ marginLeft: 5 }));
  const tree = render(
    <Chip
      label="Style"
      style={outer}
      sx={{ mt: 3 }}
      slotProps={{ root: { sx: undefined, style: root } }}
    />,
  );
  expect(outer).toHaveBeenCalledTimes(1);
  expect(root).toHaveBeenCalledTimes(1);
  expect(StyleSheet.flatten(tree.UNSAFE_getAllByType(View)[0].props.style).marginTop ?? 0).toBe(0);
});

test.each(['small', 'medium'] as const)(
  'review: default %s delete glyph is visible and has native geometry',
  async (size) => {
    const model = new NativeChipModel();
    model.props = { onDelete: jest.fn(), size };
    await model.mount();
    const icon = model.tree!.getByTestId('chip-delete-icon', { includeHiddenElements: true });
    const style = StyleSheet.flatten(icon.props.style);
    expect(style.width).toBe(size === 'small' ? 16 : 22);
    expect(style.height).toBe(style.width);
    expect(style.borderColor).toBeTruthy();
    const target = StyleSheet.flatten(
      model.tree!.getByTestId('chip-delete', { includeHiddenElements: true }).props.style,
    );
    expect(target.minHeight).toBeGreaterThanOrEqual(44);
    expect(target.minWidth).toBeGreaterThanOrEqual(44);
  },
);
test('review: primitive label truncates to one line inside its view boundary', () => {
  const tree = render(<Chip label="An exceptionally long filter label" sx={{ width: 120 }} />);
  const text = tree.getByText('An exceptionally long filter label');
  expect(text.props.numberOfLines).toBe(1);
  expect(text.props.ellipsizeMode).toBe('tail');
});
test('review: imperative focus visuals work after pointer modality and clear when disabled', async () => {
  const { nativeButtonModality } = require('../packages/material/src/nativeButtonModality');
  nativeButtonModality.pointer();
  const action = React.createRef<any>(),
    model = new NativeChipModel();
  model.props = { onDelete: jest.fn(), action };
  await model.mount();
  const background = () =>
      StyleSheet.flatten(model.tree!.getByTestId('chip').props.style).backgroundColor,
    initial = background();
  await act(async () => action.current.focusVisible());
  expect(background()).not.toBe(initial);
  model.props.disabled = true;
  await act(async () => model.tree!.rerender(model.element()));
  expect(background()).toBe(initial);
  model.props.disabled = false;
  await act(async () => model.tree!.rerender(model.element()));
  expect(background()).toBe(initial);
});
test('review: display Chip preserves Enter and Space activation inside a rich label', async () => {
  const { Button } = require('../packages/material/src'),
    click = jest.fn(),
    model = new NativeChipModel();
  model.parents.set('nested', null);
  model.props = {
    clickable: false,
    label: (
      <Button ref={model.attach('nested')} onClick={click}>
        Open
      </Button>
    ),
  };
  await model.mount();
  const node = model.nodes.get('nested');
  for (const key of ['Enter', ' '])
    for (const up of [false, true])
      await act(async () => node.props[up ? 'onMUIKeyUp' : 'onMUIKeyDown'](model.event(node, key)));
  expect(click).toHaveBeenCalledTimes(2);
});
test('review: generated literal labels preserve native text-only properties', () => {
  const tree = render(
    <Chip
      label="Native text"
      slotProps={{ label: { style: { includeFontPadding: false, textAlignVertical: 'center' } } }}
    />,
  );
  expect(StyleSheet.flatten(tree.getByText('Native text').props.style)).toMatchObject({
    includeFontPadding: false,
    textAlignVertical: 'center',
  });
});
test('Chip label line height inherits the CSS ratio rather than multiplying native dp again', () => {
  const tree = render(<Chip label="Metrics" />);
  expect(StyleSheet.flatten(tree.getByText('Metrics').props.style)).toMatchObject({
    fontSize: 13,
    lineHeight: 19.5,
  });
});
test('disabled display-only Chip does not acquire focus just because it has key callbacks', async () => {
  const model = new NativeChipModel();
  model.props = { disabled: true, clickable: false, onClick: jest.fn(), onKeyDown: jest.fn() };
  await model.mount();
  expect(model.tree!.getByTestId('chip').props.nativeFocusable).toBe(false);
});
test.each([false, true])(
  'root and label refs compose and clean up for interactive=%s',
  async (interactive) => {
    const root = React.createRef<any>(),
      label = React.createRef<any>(),
      model = new NativeChipModel();
    model.props = {
      onDelete: interactive ? jest.fn() : undefined,
      slotProps: { root: { ref: root }, label: { ref: label } },
    };
    await model.mount();
    expect(root.current === model.nodes.get('chip')).toBe(true);
    expect(label.current).toBeTruthy();
    await act(async () => model.tree!.unmount());
    expect(root.current).toBe(null);
    expect(label.current).toBe(null);
  },
);
test('invalid optional glyph elements are ignored and default deletion remains visible', async () => {
  const model = new NativeChipModel();
  model.props = { avatar: 'bad', icon: 7, deleteIcon: 'bad', onDelete: jest.fn() };
  await model.mount();
  expect(model.tree!.queryByText('bad', { includeHiddenElements: true })).toBe(null);
  expect(model.tree!.getByTestId('chip-delete-icon', { includeHiddenElements: true })).toBeTruthy();
});

test('clickable native hover changes color without unsupported selector warnings', () => {
  const messages: string[] = [],
    done = configureDiagnostics(({ code }) => messages.push(code));
  try {
    const theme = createTheme({ palette: { primary: { main: '#224488' } } });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Chip testID="hover-chip" label="Hover" clickable variant="outlined" color="primary" />
      </ThemeProvider>,
    );
    const before = StyleSheet.flatten(tree.getByTestId('hover-chip').props.style).backgroundColor;
    fireEvent(tree.getByTestId('hover-chip'), 'hoverIn', { nativeEvent: {} });
    const after = StyleSheet.flatten(tree.getByTestId('hover-chip').props.style).backgroundColor;
    expect(after).not.toBe(before);
    expect(decomposeColor(after).values.at(-1)).toBe(theme.palette.action.hoverOpacity);
    fireEvent(tree.getByTestId('hover-chip'), 'hoverOut', { nativeEvent: {} });
    expect(StyleSheet.flatten(tree.getByTestId('hover-chip').props.style).backgroundColor).toBe(
      before,
    );
    expect(messages).not.toContain('selector');
  } finally {
    done();
  }
});
