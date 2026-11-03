import reference from './fixtures/mui-select-9.5.0.json';
import React from 'react';
import { Commands } from '../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';
import { TextInput, Text, View, I18nManager } from 'react-native';
import { act, cleanup, fireEvent } from '@testing-library/react-native';
import {
  configureDiagnostics,
  Select,
  Menu,
  MenuItem,
  ButtonBase,
  Modal,
  Input,
  OutlinedInput,
  FormControl,
  InputLabel,
  useFormControl,
  ThemeProvider,
  createTheme,
  SelectProps,
  TextField,
  selectClasses,
  getSelectUtilityClasses,
} from '../packages/material/src';
import { getNativeFocusedView } from '../packages/native-host/src';
import { clearNativeFocus } from '../packages/native-host/src/nativeFocus';
import { NativeSelectModel } from './helpers/nativeSelectModel';
let restore: () => void;
beforeEach(() => {
  jest.useFakeTimers();
  restore = configureDiagnostics(() => {});
});
afterEach(() => {
  cleanup();
  clearNativeFocus(getNativeFocusedView());
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  restore();
});
function menu(model: NativeSelectModel) {
  return model.tree!.UNSAFE_getByType(Menu).props;
}
test('single uncontrolled selection retains a native event, original option and value/name target', async () => {
  const change = jest.fn(),
    close = jest.fn(),
    model = new NativeSelectModel();
  model.props = { name: 'choice', onChange: change, onClose: close };
  await model.mount();
  expect(model.display()).toBe('Alpha');
  expect(model.tree!.UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
  await model.press();
  const source = await model.press('b');
  expect(model.display()).toBe('Beta');
  expect(menu(model).open).toBe(false);
  const [event, child] = change.mock.calls[0];
  expect(event.target).toEqual({ value: 'b', name: 'choice' });
  expect(event.nativeEvent).toBe(source.nativeEvent);
  expect(source.target).toBe(model.nodes.get('b'));
  expect(child.props.value).toBe('b');
  expect(close).toHaveBeenCalledTimes(1);
});
test('controlled value/open request changes without changing authored state', async () => {
  const change = jest.fn(),
    close = jest.fn(),
    model = new NativeSelectModel();
  model.props = { value: 'a', open: true, onChange: change, onClose: close };
  await model.mount();
  await model.press('b');
  expect(model.display()).toBe('Alpha');
  expect(menu(model).open).toBe(true);
  expect(change.mock.calls[0][0].target.value).toBe('b');
  expect(close).toHaveBeenCalledTimes(1);
});
test('multiple selection toggles strict identity, preserves source arrays and stays open', async () => {
  const original = ['b'],
    change = jest.fn(),
    model = new NativeSelectModel();
  model.props = { multiple: true, defaultValue: original, onChange: change };
  await model.mount();
  await model.press();
  await model.press('a');
  expect(change.mock.calls[0][0].target.value).toEqual(['b', 'a']);
  expect(original).toEqual(['b']);
  expect(model.display()).toBe('Alpha, Beta');
  expect(menu(model).open).toBe(true);
  await model.press('b');
  expect(model.display()).toBe('Alpha');
});
test('single matching stringifies primitives while objects require identity', async () => {
  const one = { id: 1 },
    two = { id: 1 },
    model = new NativeSelectModel([
      { id: 'a', label: 'Number', value: 1 },
      { id: 'b', label: 'Object', value: one },
    ]);
  model.props = { value: '1' };
  await model.mount();
  expect(model.display()).toBe('Number');
  model.props = { value: one };
  await model.update();
  expect(model.display()).toBe('Object');
  model.props = { value: two };
  await model.update();
  expect(model.display()).toBe('');
});
test.each(['Enter', ' ', 'ArrowUp', 'ArrowDown'])('keyboard %s opens once', async (key) => {
  const open = jest.fn(),
    model = new NativeSelectModel();
  model.props = { onOpen: open };
  await model.mount();
  await model.key(key);
  expect(menu(model).open).toBe(true);
  expect(open).toHaveBeenCalledTimes(1);
});
test.each([{ disabled: true }, { readOnly: true }])(
  'inactive trigger cannot open %j',
  async (props) => {
    const open = jest.fn(),
      change = jest.fn(),
      model = new NativeSelectModel();
    model.props = { ...props, onOpen: open, onChange: change };
    await model.mount();
    await model.press();
    await model.key('Enter');
    await model.key('b');
    expect(open).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
    expect(model.nodes.get('trigger').props.accessibilityState.disabled).toBe('disabled' in props);
    expect(model.nodes.get('trigger').props.nativeFocusable).toBe(!('disabled' in props));
  },
);
test('composition/canceled/foreign-target opening keys stay inert', async () => {
  const open = jest.fn(),
    model = new NativeSelectModel();
  model.props = { onOpen: open };
  await model.mount();
  await model.key('Enter', { isComposing: true });
  await model.key('Enter', { isCanceled: true });
  const node = model.nodes.get('trigger'),
    event = model.event({ isConnected: true }, 'Enter');
  event.currentTarget = node;
  act(() => node.props.onMUIKeyDown(event));
  expect(open).not.toHaveBeenCalled();
});
test('closed typeahead matches labels, cycles repeats and resets at 750ms', async () => {
  const model = new NativeSelectModel([
    { id: 'a', label: 'Alpha', value: 'a' },
    { id: 'b', label: 'Beta', value: 'b' },
    { id: 'c', label: 'Bravo', value: 'c' },
  ]);
  await model.mount();
  await model.key('b');
  expect(model.display()).toBe('Beta');
  expect(menu(model).open).toBe(false);
  await model.key('b');
  expect(model.display()).toBe('Bravo');
  act(() => jest.advanceTimersByTime(750));
  await model.key('a');
  expect(model.display()).toBe('Alpha');
});
test('repeated prefix handles doubled initials rather than cycling', async () => {
  const model = new NativeSelectModel([
    { id: 'a', label: 'Alpha', value: 'a' },
    { id: 'b', label: 'Bali', value: 'b' },
    { id: 'c', label: 'Bbad', value: 'c' },
  ]);
  await model.mount();
  await model.key('b');
  expect(model.display()).toBe('Bali');
  await model.key('b');
  expect(model.display()).toBe('Bbad');
});
test('multiple and modified keys do not change a closed value', async () => {
  const model = new NativeSelectModel();
  model.props = { multiple: true, defaultValue: [] };
  await model.mount();
  await model.key('b');
  expect(model.display()).toBe('');
  await model.key('b', { ctrlKey: true });
  expect(model.display()).toBe('');
});
test('Space selects on key-down, ignores repeats and suppresses the opening key-up', async () => {
  const change = jest.fn(),
    model = new NativeSelectModel();
  model.props = { multiple: true, defaultValue: [], onChange: change };
  await model.mount();
  await model.key(' ');
  await model.key(' ', {}, 'a', true);
  expect(change).not.toHaveBeenCalled();
  await model.key(' ', {}, 'a');
  expect(change).toHaveBeenCalledTimes(1);
  await model.key(' ', { repeat: true }, 'a');
  await model.key(' ', {}, 'a', true);
  expect(change).toHaveBeenCalledTimes(1);
});
test('stale option callbacks cannot select after closure or option removal', async () => {
  const change = jest.fn(),
    model = new NativeSelectModel();
  model.props = { open: true, onChange: change };
  await model.mount();
  const callback = model
    .tree!.UNSAFE_getAllByType(MenuItem)
    .find((item) => item.props.testID === 'b')!.props.onPress;
  const source = model.event(model.nodes.get('b'));
  model.props = { open: false, onChange: change };
  await model.update();
  act(() => callback(source));
  expect(change).not.toHaveBeenCalled();
  model.props = { open: true, onChange: change };
  model.options = model.options.slice(0, 1);
  await model.update();
  act(() => callback(source));
  expect(change).not.toHaveBeenCalled();
});
test('displayEmpty/renderValue can show placeholder without marking an empty value filled', async () => {
  const model = new NativeSelectModel();
  model.props = {
    defaultValue: '',
    displayEmpty: true,
    renderValue: (value) => (value === '' ? 'Choose an option' : String(value)),
  };
  await model.mount();
  expect(model.display()).toBe('Choose an option');
});
test('menu width follows anchor layout and autoWidth releases its minimum', async () => {
  const model = new NativeSelectModel();
  model.props = { open: true };
  await model.mount();
  expect(menu(model).slotProps.paper.style[0]).toEqual({ minWidth: 200 });
  model.anchorWidth = 280;
  act(() =>
    model.nodes
      .get('anchor')
      .props.onLayout({ nativeEvent: { layout: { width: 280, height: 56, x: 0, y: 0 } } }),
  );
  await model.update();
  expect(menu(model).slotProps.paper.style[0]).toEqual({ minWidth: 280 });
  model.props = { open: true, autoWidth: true };
  await model.update();
  expect(menu(model).slotProps.paper.style[0]).toEqual({ minWidth: undefined });
});
test('select paper slot callbacks receive Select owner state and authored width wins', async () => {
  const paper = jest.fn((owner: any) => ({ style: { minWidth: 317 } })),
    model = new NativeSelectModel();
  model.props = {
    variant: 'filled',
    open: true,
    multiple: true,
    defaultValue: ['a'],
    MenuProps: { slotProps: { paper } },
  };
  await model.mount();
  expect(paper.mock.calls.at(-1)?.[0]).toMatchObject({
    variant: 'filled',
    value: ['a'],
    open: true,
    multiple: true,
  });
  expect(menu(model).slotProps.paper.style.at(-1)).toEqual({ minWidth: 317 });
  expect(model.nodes.get('list').props.role).toBe('list');
});
test('inputProps and a custom input preserve pinned override precedence', async () => {
  const model = new NativeSelectModel();
  model.props = {
    value: 'a',
    inputProps: { value: 'b' },
    input: <Input inputProps={{ value: 'a' }} />,
  };
  await model.mount();
  expect(model.display()).toBe('Alpha');
});
test('TextField select composes label/helper and generic changes without TextInput', async () => {
  const change = jest.fn(),
    model = new NativeSelectModel();
  model.field = true;
  model.fieldProps = { helperText: 'Choose carefully', onChange: change };
  await model.mount();
  const trigger = model.tree!.getByTestId('trigger');
  expect(trigger.props.accessibilityLabel).toBe('Choice');
  expect(trigger.props.accessibilityHint).toBe('Choose carefully');
  expect(model.tree!.UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
  await model.press();
  await model.press('b');
  expect(model.display()).toBe('Beta');
  expect(change.mock.calls[0][0].target.value).toBe('b');
});
test('TextField select slot replaces legacy props and sees select owner state', async () => {
  const model = new NativeSelectModel();
  model.field = true;
  model.fieldProps = {
    SelectProps: { displayEmpty: true, renderValue: () => 'Legacy' },
    slotProps: {
      select: (owner: any) => ({ renderValue: () => (owner.select ? 'Slot' : 'Wrong') }),
    },
  };
  await model.mount();
  expect(model.display()).toBe('Slot');
});
test('selected native options expose selection to accessibility after a multiple toggle', async () => {
  const model = new NativeSelectModel();
  model.props = { multiple: true, defaultValue: ['a'], open: true };
  await model.mount();
  expect(model.nodes.get('a').props.accessibilityState.selected).toBe(true);
  expect(model.nodes.get('b').props.accessibilityState.selected).toBe(false);
  await model.press('b');
  expect(model.nodes.get('b').props.accessibilityState.selected).toBe(true);
});
test.each(['legacy', 'slot'])(
  'TextField %s Select defaultValue overrides the input default',
  async (kind) => {
    const model = new NativeSelectModel();
    model.field = true;
    model.fieldProps =
      kind === 'legacy'
        ? { SelectProps: { defaultValue: 'b' } }
        : { slotProps: { select: { defaultValue: 'b' } } };
    await model.mount();
    expect(model.display()).toBe('Beta');
  },
);
test('Select named slot styles apply without root style leakage', async () => {
  let icon: any;
  const model = new NativeSelectModel();
  model.props = {
    multiple: true,
    defaultValue: ['a'],
    IconComponent: (props) => {
      icon = props;
      return <View />;
    },
  };
  const element = model.element.bind(model);
  model.element = () => (
    <ThemeProvider
      theme={createTheme({
        components: {
          MuiSelect: {
            styleOverrides: {
              root: { minWidth: 401 },
              select: { paddingRight: 42 },
              multiple: { opacity: 0.6 },
              icon: { color: '#224466' },
            },
          },
        },
      })}
    >
      {element()}
    </ThemeProvider>
  );
  await model.mount();
  expect(model.tree!.getByTestId('trigger')).toHaveStyle({
    paddingRight: 42,
    opacity: 0.6,
    minWidth: 0,
  });
  expect(require('react-native').StyleSheet.flatten(icon.style).color).toBe('#224466');
  const flat = require('react-native').StyleSheet.flatten(
    model.tree!.getByTestId('trigger').props.style,
  );
  // Yoga gives logical edge declarations priority over physical ones.
  expect(flat.paddingEnd ?? flat.paddingRight).toBe(42);
});

for (const fixture of reference.fixtures)
  test(`pinned Select: ${fixture.input.name}`, async () => {
    const input: any = fixture.input,
      objects = { one: { id: 1 } };
    const decode = (value: any): any =>
      Array.isArray(value)
        ? value.map(decode)
        : value && typeof value === 'object'
          ? value.$undefined
            ? undefined
            : value.$ref
              ? objects[value.$ref as 'one']
              : value.$copy
                ? { ...objects[value.$copy as 'one'] }
                : value
          : value;
    const encode = (value: any): any =>
      Array.isArray(value)
        ? value.map(encode)
        : value && typeof value === 'object'
          ? value === objects.one
            ? 'ref:one'
            : value.id === 1
              ? 'copy:one'
              : value
          : value;
    const options = (
      input.options ?? [
        { id: 'a', label: 'Alpha', value: 'a' },
        { id: 'b', label: 'Beta', value: 'b' },
        { id: 'c', label: 'Bravo', value: 'c' },
      ]
    ).map((option: any) => ({ ...option, value: decode(option.value) }));
    const handle = React.createRef<import('../packages/material/src').SelectInputHandle<any>>();
    const trace: string[] = [],
      model = new NativeSelectModel(options);
    const id = (node: any) => [...model.nodes].find(([, target]) => target === node)?.[0];
    model.itemProps = {
      onClick: (event) => {
        trace.push(`child:${id(event.currentTarget)}`);
        if (input.preventChild) event.preventDefault();
      },
      onKeyDown: (event) => trace.push(`itemKey:${id(event.currentTarget)}:${event.key}`),
      onKeyUp: (event) => trace.push(`itemUp:${id(event.currentTarget)}:${event.key}`),
    };
    model.props = {
      name: 'choice',
      inputRef: handle,
      ...Object.fromEntries(
        Object.entries(input.props ?? {}).map(([key, value]) => [key, decode(value)]),
      ),
      ...(input.render
        ? { renderValue: () => (input.render === 'whitespace' ? '   ' : 'Custom') }
        : {}),
      onOpen: () => trace.push('open'),
      onClose: () => trace.push('close'),
      onKeyDown: (event) => trace.push(`key:${event.key}`),
      onChange: (event, child: any) => {
        trace.push(
          `change:${JSON.stringify(encode(event.target.value))}:${child.props.testID}:${event.target.name}`,
        );
        if (input.mutableTarget) {
          event.target = { value: 'changed by consumer', name: 'other' };
          trace.push('targetMutable:' + (event.target.value === 'changed by consumer'));
        }
      },
      MenuProps: {
        ...(input.forceMenu ? { open: true } : {}),
        ...(input.menuClose ? { onClose: () => trace.push('menuClose') } : {}),
        ...(input.paperWidth
          ? { slotProps: { paper: () => ({ style: { minWidth: input.paperWidth } }) } }
          : {}),
      },
    } as SelectProps<any>;
    await model.mount();
    const snapshot = () => ({
      value: handle.current?.value === undefined ? 'value:undefined' : encode(handle.current.value),
      display: model.display(),
      open: menu(model).open,
      selected: React.Children.toArray(menu(model).children)
        .filter(React.isValidElement)
        .filter((child: any) => child.props.selected)
        .map((child: any) => child.props.testID),
      minWidth:
        require('react-native').StyleSheet.flatten(menu(model).slotProps.paper.style)?.minWidth ??
        null,
    });
    const states = [snapshot()];
    for (const action of input.actions ?? []) {
      if (action.wait !== undefined) act(() => jest.advanceTimersByTime(action.wait));
      else if (action.press) await model.press();
      else if (action.click) await model.press(action.click);
      else if (action.itemKey) await model.key(action.key, action, action.itemKey);
      else if (action.itemUp) await model.key(action.key, action, action.itemUp, true);
      else if (action.close)
        act(() => menu(model).onClose(model.event(model.nodes.get('trigger'))));
      else if (action.key) await model.key(action.key, action);
      states.push(snapshot());
    }
    expect({ states, trace }).toEqual({ states: fixture.states, trace: fixture.trace });
  });
test.each(reference.wrappers)('pinned Select wrapper: $input.name', async (fixture) => {
  const input: any = fixture.input;
  let actual: any;
  const Probe = React.forwardRef<any, any>((props, _ref) => {
    actual = props;
    return null;
  });
  const model = new NativeSelectModel();
  model.props = {
    value: input.value,
    input: <Probe inputProps={input.inputValue ? { value: input.inputValue } : undefined} />,
    inputProps: input.wrapperValue ? { value: input.wrapperValue } : undefined,
    displayEmpty: input.displayEmpty,
  };
  await model.mount();
  expect({ inputValue: actual.inputProps.value ?? null, notched: actual.notched ?? null }).toEqual(
    fixture.output,
  );
});
test('pinned Select class helpers retain the original identifiers', () => {
  expect(selectClasses).toEqual(reference.classes);
  expect(getSelectUtilityClasses('focusVisible')).toBe(reference.helper);
});
test.each([
  { defaultOpen: true },
  { defaultOpen: true, autoFocus: true },
  { open: true, autoFocus: true },
])('initial focus stays in the presented menu %j', async (props) => {
  const model = new NativeSelectModel();
  model.props = props;
  await model.mount();
  expect(model.current).toBe(model.nodes.get('a'));
});
test('change events retain native payload after the source event is released', async () => {
  const change = jest.fn(),
    model = new NativeSelectModel();
  model.props = { onChange: change };
  await model.mount();
  await model.press();
  const event = await model.press('b'),
    payload = event.nativeEvent;
  event.nativeEvent = null;
  expect(change.mock.calls[0][0].nativeEvent).toBe(payload);
});
test('native inputRef exposes actual trigger focus and the current generic value', async () => {
  const input = React.createRef<import('../packages/material/src').SelectInputHandle<string[]>>(),
    model = new NativeSelectModel();
  model.props = { multiple: true, defaultValue: [], inputRef: input };
  await model.mount();
  expect(input.current?.node).toBe(model.nodes.get('trigger'));
  expect(input.current?.value).toEqual([]);
  await model.press();
  await model.press('b');
  expect(input.current?.value).toEqual(['b']);
  model.tree!.unmount();
  expect(input.current).toBeNull();
});
test('explicit TextField values take precedence over Select defaults', async () => {
  const model = new NativeSelectModel();
  model.field = true;
  model.fieldProps = { value: 'a', slotProps: { select: { defaultValue: 'b' } } };
  await model.mount();
  expect(model.display()).toBe('Alpha');
});
test('nested InputBase in a custom rendered value retains its text event contract', async () => {
  const change = jest.fn(),
    model = new NativeSelectModel();
  model.props = {
    renderValue: () => <Input inputProps={{ testID: 'nested-input' }} onChange={change} />,
  };
  await model.mount();
  fireEvent(model.tree!.getByTestId('nested-input'), 'change', { nativeEvent: { text: 'Typed' } });
  expect(change.mock.calls[0][0].target.value).toBe('Typed');
});
test('stacked TextField labels keep their closed outline with displayEmpty', async () => {
  let outline: any;
  const model = new NativeSelectModel();
  model.field = true;
  model.props = { defaultValue: '' };
  model.fieldProps = {
    labelDisplay: 'stacked',
    SelectProps: { displayEmpty: true, renderValue: () => 'Choose' },
    slotProps: {
      input: {
        slots: {
          notchedOutline: (props: any) => {
            outline = props;
            return <View />;
          },
        },
      },
    },
  };
  await model.mount();
  expect(outline.notched).toBe(false);
});

test('open menu width can shrink to a measured zero without retaining stale minimum', async () => {
  const model = new NativeSelectModel();
  model.props = { open: true };
  await model.mount();
  model.anchorWidth = 0;
  act(() =>
    model.nodes
      .get('anchor')
      .props.onLayout({ nativeEvent: { layout: { width: 0, height: 56, x: 0, y: 0 } } }),
  );
  await model.update();
  expect(menu(model).slotProps.paper.style[0]).toEqual({ minWidth: 0 });
});

test.each(['press', 'space'])(
  'covered menu options cannot activate through a late %s callback',
  async (kind) => {
    const change = jest.fn(),
      model = new NativeSelectModel();
    model.props = { open: true, onChange: change };
    let covered = false;
    const element = model.element.bind(model);
    model.element = () => (
      <>
        {element()}
        {covered ? (
          <Modal open disablePortal>
            <View />
          </Modal>
        ) : null}
      </>
    );
    await model.mount();
    const callback =
      kind === 'press'
        ? model.tree!.UNSAFE_getAllByType(ButtonBase).find((item) => item.props.testID === 'b')!
            .props.onPress
        : model.nodes.get('b').props.onMUIKeyDown;
    const event = model.event(model.nodes.get('b'), ' ');
    covered = true;
    await model.update();
    act(() => callback(event));
    expect(change).not.toHaveBeenCalled();
  },
);
test('an unmounted field ignores late option and trigger callbacks', async () => {
  const change = jest.fn(),
    open = jest.fn(),
    model = new NativeSelectModel();
  model.props = { open: true, onChange: change, onOpen: open };
  await model.mount();
  const callback = model
    .tree!.UNSAFE_getAllByType(MenuItem)
    .find((item) => item.props.testID === 'b')!.props.onPress;
  const key = model.nodes.get('trigger').props.onMUIKeyDown,
    event = model.event(model.nodes.get('b')),
    triggerEvent = model.event(model.nodes.get('trigger'), 'Enter');
  model.tree!.unmount();
  act(() => {
    callback(event);
    key(triggerEvent);
  });
  expect(change).not.toHaveBeenCalled();
  expect(open).not.toHaveBeenCalled();
});

test.each(['legacy', 'slot'])(
  'explicit undefined %s value preserves the authored TextField default',
  async (kind) => {
    const model = new NativeSelectModel();
    model.field = true;
    model.fieldProps =
      kind === 'legacy'
        ? { SelectProps: { value: undefined } }
        : { slotProps: { select: { value: undefined } } };
    await model.mount();
    expect(model.display()).toBe('Alpha');
  },
);
const annotatedTextProps: import('../packages/material/src').TextFieldProps = {
  defaultValue: 12,
  onChange: (event) => acceptString(event.target.value),
};
function acceptString(value: string) {
  return value;
}
void annotatedTextProps;

test('uncontrolled Select and TextField stay uncontrolled through their first empty-value choice', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  for (const field of [false, true]) {
    const model = new NativeSelectModel([
      { id: 'a', label: 'None', value: '' },
      { id: 'b', label: 'Beta', value: 'b' },
    ]);
    model.props = { defaultValue: undefined };
    model.field = field;
    await model.mount();
    await model.press();
    await model.press('a');
    model.tree!.unmount();
  }
  expect(warn.mock.calls.flat().some((value) => String(value).includes('Do not switch'))).toBe(
    false,
  );
});

test('close restores the trigger when the initial native focus request was delayed', async () => {
  const model = new NativeSelectModel();
  await model.mount();
  let first = true;
  jest.mocked(Commands.focus).mockImplementation((node: any) => {
    if (node === model.nodes.get('trigger') && first) {
      first = false;
      return;
    }
    model.focus(node);
  });
  await model.press();
  await model.press('b');
  await act(async () => {
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
  });
  expect(model.current === model.nodes.get('trigger')).toBe(true);
});

test('Select slot owners retain forwarded flags and custom render information', async () => {
  const owner = jest.fn(),
    model = new NativeSelectModel();
  model.props = {
    autoWidth: true,
    displayEmpty: true,
    readOnly: true,
    labelId: 'external-label',
    MenuProps: {
      slotProps: {
        paper: (state) => {
          owner(state);
          return {};
        },
      },
    },
  };
  await model.mount();
  expect(owner.mock.calls.at(-1)?.[0]).toMatchObject({
    autoWidth: true,
    displayEmpty: true,
    readOnly: true,
    labelId: 'external-label',
  });
});

test.each(['standard', 'outlined', 'filled'] as const)(
  'Select %s reserves the source caret inset and truncates literal text',
  async (variant) => {
    const model = new NativeSelectModel();
    model.props = { variant };
    await model.mount();
    expect(model.tree!.getByTestId('trigger')).toHaveStyle({
      paddingRight: variant === 'standard' ? 24 : 32,
    });
    const label = model
      .tree!.UNSAFE_getAllByType(Text)
      .find((node) => node.props.children === 'Alpha');
    expect(label?.props.numberOfLines).toBe(1);
    expect(label?.props.ellipsizeMode).toBe('tail');
  },
);
test.each([true, false])(
  'Select native RTL inset respects left/right swapping: %s',
  async (swap) => {
    const descriptors = Object.getOwnPropertyDescriptors(I18nManager);
    Object.defineProperties(I18nManager, {
      isRTL: { value: true, configurable: true },
      doLeftAndRightSwapInRTL: { value: swap, configurable: true },
    });
    try {
      const model = new NativeSelectModel();
      await model.mount();
      expect(model.tree!.getByTestId('trigger')).toHaveStyle(
        swap ? { paddingRight: 32 } : { paddingLeft: 32 },
      );
    } finally {
      for (const key of ['isRTL', 'doLeftAndRightSwapInRTL']) {
        if (descriptors[key]) Object.defineProperty(I18nManager, key, descriptors[key]);
        else Reflect.deleteProperty(I18nManager, key);
      }
    }
  },
);

test.each(['inputProps', 'slotProps'])(
  'Select preserves authored %s display padding',
  async (kind) => {
    const model = new NativeSelectModel();
    model.props =
      kind === 'inputProps'
        ? { inputProps: { style: { paddingRight: 64 } } }
        : { slotProps: { input: { style: { paddingRight: 64 } } } };
    await model.mount();
    expect(model.tree!.getByTestId('trigger')).toHaveStyle({ paddingRight: 64 });
  },
);
