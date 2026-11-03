import React from 'react';
import { View, TextInput, Text } from 'react-native';
import { act, cleanup } from '@testing-library/react-native';
import { NativeSelectionControlModel } from './helpers/nativeSelectionControlModel';
import {
  NativeSelect,
  NativeSelectInputHandle,
  FormControl,
  InputLabel,
  useFormControl,
  Modal,
  ThemeProvider,
  createTheme,
  configureDiagnostics,
} from '../packages/material/src';
import { nativeModalManager as manager } from '../packages/material/src/nativeModalManager';
import { clearNativeFocus, getNativeFocusedView } from '../packages/native-host/src/nativeFocus';
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
test.each(['standalone', 'select', 'field'] as const)(
  '%s mounts one native control and retains a raw native selection event',
  async (kind) => {
    const change = jest.fn(),
      model = new NativeSelectionControlModel();
    model.kind = kind;
    model.props = { name: 'choice', onChange: change };
    await model.mount();
    expect(model.handle?.value).toBe('a');
    expect(model.tree!.UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
    await model.press();
    expect(model.native().active).toBe(true);
    const source = await model.choose('b');
    expect(model.handle?.value).toBe('b');
    expect(change).toHaveBeenCalledTimes(1);
    expect(change.mock.calls[0]).toHaveLength(1);
    const event = change.mock.calls[0][0];
    expect(event.nativeEvent === source.nativeEvent).toBe(true);
    expect(source.target).toBe(101);
    expect(event.target.value).toBe('b');
    expect(event.target.name).toBe('choice');
    expect(event.currentTarget === event.target).toBe(true);
    expect(event.target.selectedOptions.item(0).label).toBe('Beta');
    expect(event.target.options.item(0).selected).toBe(false);
    await model.dismiss('selected');
    expect(manager.top()).toBeDefined();
    await model.phase('dismissed', true, 'selected');
    expect(manager.top()).toBeUndefined();
  },
);
test('controlled selection publishes a proposal then restores its authored state and ref', async () => {
  let during = '';
  const change = jest.fn((_event: any) => {
      during = model.handle!.value;
    }),
    model = new NativeSelectionControlModel();
  model.props = { value: 'a', onChange: change };
  await model.mount();
  await model.press();
  await model.choose('b');
  expect(during).toBe('b');
  expect(change.mock.calls[0][0].target.value).toBe('b');
  expect(model.handle?.value).toBe('a');
  expect(model.native().options.find((x: any) => x.label === 'Alpha').selected).toBe(true);
});
test('multiple native changes expose the first string and selectedOptions in option order', async () => {
  const change = jest.fn(),
    model = new NativeSelectionControlModel();
  model.props = { defaultValue: ['b'], inputProps: { multiple: true }, onChange: change };
  await model.mount();
  await model.press();
  await model.choose('a');
  expect(model.handle?.value).toBe('a');
  expect(model.handle?.selectedOptions.map((option) => option.value)).toEqual(['a', 'b']);
  expect(change.mock.calls[0][0].target.value).toBe('a');
  await model.choose('b', false);
  expect(model.handle?.selectedOptions.map((option) => option.value)).toEqual(['a']);
});
test('parent overlay stays suspended until actual native dismissal acknowledgement', async () => {
  const model = new NativeSelectionControlModel();
  model.parents.set('trigger', 'parent');
  model.parents.set('parent', null);
  model.wrapper = (node) => (
    <Modal open disablePortal ref={model.attach('parent')}>
      <View>{node}</View>
    </Modal>
  );
  await model.mount();
  const parent = manager.top();
  await model.press();
  const picker = manager.top();
  expect(picker === parent).toBe(false);
  act(() => {
    model.current = null;
    model.focusEvent('Blur', model.nodes.get('trigger'));
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(model.current).toBeNull();
  await model.dismiss();
  expect(manager.top() === picker).toBe(true);
  expect(model.current).toBeNull();
  await model.phase('dismissed', true, 'cancel');
  expect(manager.top() === parent).toBe(true);
  expect(model.current === model.nodes.get('trigger')).toBe(true);
});
test.each(['disabled', 'readOnly'])(
  '%s closes the picker but retains its lease until actual closure',
  async (flag) => {
    const model = new NativeSelectionControlModel();
    await model.mount();
    await model.press();
    const layer = manager.top();
    model.props = { [flag]: true };
    await model.update();
    expect(model.native().active).toBe(false);
    expect(manager.top() === layer).toBe(true);
    await model.phase('dismissed', true, 'programmatic');
    expect(manager.top()).toBeUndefined();
  },
);
test('native initial fallback and empty selection update form filled state', async () => {
  let filled: any;
  function Status() {
    filled = useFormControl()?.filled;
    return null;
  }
  const model = new NativeSelectionControlModel();
  model.wrapper = (node) => (
    <FormControl>
      <InputLabel>Choice</InputLabel>
      {node}
      <Status />
    </FormControl>
  );
  await model.mount();
  expect(filled).toBe(true);
  expect(model.handle?.value).toBe('a');
  model.options = <option value="">None</option>;
  await model.update();
  expect(filled).toBe(false);
});
test.each(['Enter', ' ', 'ArrowUp', 'ArrowDown'])(
  'native keyboard %s opens once with a current target',
  async (key) => {
    const model = new NativeSelectionControlModel();
    await model.mount();
    await model.key(key);
    expect(model.native().active).toBe(true);
  },
);
test('composing and canceled opening keys are ignored', async () => {
  const model = new NativeSelectionControlModel();
  await model.mount();
  await model.key('Enter', { isComposing: true });
  expect(model.native().active).toBe(false);
  await model.key('Enter', { isCanceled: true });
  expect(model.native().active).toBe(false);
});

test('native inline input styles win over named selection overrides', async () => {
  const model = new NativeSelectionControlModel();
  model.props = { inputProps: { style: { paddingRight: 64 } } };
  model.wrapper = (node) => (
    <ThemeProvider
      theme={createTheme({
        components: { MuiNativeSelect: { styleOverrides: { select: { paddingRight: 42 } } } },
      })}
    >
      {node}
    </ThemeProvider>
  );
  await model.mount();
  expect(model.tree!.getByTestId('trigger')).toHaveStyle({ paddingRight: 64 });
});

test('a batched press then imperative blur never retains an unpresented native lease', async () => {
  const model = new NativeSelectionControlModel();
  await model.mount();
  const { fireEvent } = require('@testing-library/react-native');
  await act(async () => {
    fireEvent.press(model.tree!.getByTestId('trigger'), model.event(model.nodes.get('trigger')));
    model.handle!.blur();
    await Promise.resolve();
  });
  expect(model.native().active).toBe(false);
  expect(manager.top()).toBeUndefined();
});
test('explicit blur while open closes without requesting focus restoration and delivers actual blur', async () => {
  const blurred = jest.fn(),
    model = new NativeSelectionControlModel();
  model.props = { onBlur: blurred };
  await model.mount();
  await model.press();
  act(() => model.handle!.blur());
  expect(model.current).toBeNull();
  expect(blurred).not.toHaveBeenCalled();
  await model.phase('dismissed', true, 'programmatic');
  expect(model.current).toBeNull();
  expect(blurred).toHaveBeenCalledTimes(1);
  expect(blurred.mock.calls[0][0].target.value).toBe('a');
});
test.each(['standalone', 'select', 'field'] as const)(
  '%s native autofocus focuses the actual selection control',
  async (kind) => {
    const model = new NativeSelectionControlModel();
    model.kind = kind;
    model.props = { autoFocus: true };
    await model.mount();
    expect(model.current === model.nodes.get('trigger')).toBe(true);
  },
);
const nativeKeyboardProps: import('../packages/material/src').NativeSelectProps = {
  onKeyDown: (event) => event.key,
  onKeyUp: (event) => event.key,
};
void nativeKeyboardProps;

test('empty option labels preserve metadata and display their text', async () => {
  const model = new NativeSelectionControlModel();
  model.options = (
    <option value="a" label="">
      Alpha
    </option>
  );
  await model.mount();
  expect(model.handle!.options[0].label).toBe('');
  expect(model.tree!.getByText('Alpha')).toBeTruthy();
  expect(model.native().options[0].label).toBe('Alpha');
});
test('enabling autofocus after mount focuses an idle control', async () => {
  const model = new NativeSelectionControlModel();
  await model.mount();
  model.props = { autoFocus: true };
  await model.update();
  expect(model.current === model.nodes.get('trigger')).toBe(true);
});
test('enabling autofocus does not steal observed focus from another input', async () => {
  const model = new NativeSelectionControlModel();
  await model.mount();
  const other = {};
  jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(other as any);
  model.props = { autoFocus: true };
  await model.update();
  expect(model.current).toBeNull();
});
test.each(['standalone', 'select'] as const)(
  '%s end adornment reserves root caret space and keeps one accessible control',
  async (kind) => {
    const { NativePressable } = require('../packages/native-host/src');
    const { fireEvent } = require('@testing-library/react-native');
    const model = new NativeSelectionControlModel();
    model.kind = kind;
    model.props = { variant: 'outlined', testID: 'input-root', endAdornment: <Text>kg</Text> };
    await model.mount();
    expect(model.tree!.getByTestId('input-root')).toHaveStyle({ paddingRight: 32 });
    expect(model.tree!.getByTestId('trigger')).toHaveStyle({ paddingRight: 0 });
    const caret = model
      .tree!.UNSAFE_getAllByType(NativePressable)
      .find((node: any) => node.props.accessible === false && node.props.onPress);
    expect(caret).toBeDefined();
    expect(caret!.props.focusable).toBe(false);
    expect(model.tree!.getAllByRole('combobox')).toHaveLength(1);
    await act(async () => {
      fireEvent.press(caret!, model.event(model.nodes.get('trigger')));
    });
    expect(model.native().active).toBe(true);
  },
);

test('option records expose ordered item and namedItem lookups', async () => {
  const model = new NativeSelectionControlModel();
  model.options = (
    <>
      <option id="first" value="a">
        Alpha
      </option>
      <option id="second" value="b">
        Beta
      </option>
    </>
  );
  await model.mount();
  expect(model.handle!.options.item(-1)).toBeNull();
  expect(model.handle!.options.item(3)).toBeNull();
  expect(model.handle!.options.namedItem('second')?.value).toBe('b');
  expect(model.handle!.options.namedItem('')).toBeNull();
});
test('supplied input props keep final native input precedence', async () => {
  const { OutlinedInput } = require('../packages/material/src');
  const model = new NativeSelectionControlModel();
  model.props = {
    inputProps: { defaultValue: 'a' },
    input: <OutlinedInput inputProps={{ defaultValue: 'b', testID: 'trigger' }} />,
  };
  await model.mount();
  expect(model.handle!.value).toBe('b');
});
test('native TextField current select slot replaces legacy selection settings', async () => {
  const model = new NativeSelectionControlModel();
  model.kind = 'field';
  model.fieldProps = {
    SelectProps: { defaultValue: 'a' },
    slotProps: {
      select: {
        native: true,
        defaultValue: 'b',
        inputProps: { testID: 'trigger' },
        nativePickerProps: { testID: 'native-picker' },
      },
    },
  };
  await model.mount();
  expect(model.handle!.value).toBe('b');
  await model.press();
  expect(model.native().active).toBe(true);
});
test('a callback retained before an option value change cannot select its replacement', async () => {
  const change = jest.fn(),
    model = new NativeSelectionControlModel();
  model.props = { onChange: change };
  await model.mount();
  await model.press();
  const old = model.native();
  const option = old.options.find((option: any) => JSON.parse(option.id)[1] === 'b');
  model.options = (
    <>
      <option value="a">Alpha</option>
      <option value="changed">Beta</option>
    </>
  );
  await model.update();
  const event = model.event(101);
  event.nativeEvent = {
    sessionId: old.sessionId,
    revision: old.revision,
    optionId: option.id,
    selected: true,
  };
  await act(async () => old.onPickerSelection(event));
  expect(change).not.toHaveBeenCalled();
  expect(model.handle!.value).toBe('a');
});
test('a retained callback after unmount cannot publish a native selection', async () => {
  const change = jest.fn(),
    model = new NativeSelectionControlModel();
  model.props = { onChange: change };
  await model.mount();
  await model.press();
  const old = model.native(),
    option = old.options[1];
  model.tree!.unmount();
  const event = model.event(101);
  event.nativeEvent = {
    sessionId: old.sessionId,
    revision: old.revision,
    optionId: option.id,
    selected: true,
  };
  await act(async () => old.onPickerSelection(event));
  expect(change).not.toHaveBeenCalled();
  expect(manager.top()).toBeUndefined();
});
