import React from 'react';
import { Platform, UIManager, type TextInputInstance } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { NativeTextInput } from '@altroo/mui-native-host';
import { assertNativeInputBaseline } from '../packages/native-host/src/nativeInputAssertions';
const { EditorCommands: Commands } = jest.requireMock<{
  EditorCommands: { setTextAndSelection: jest.Mock };
}>('../packages/native-host/src/nativeTextInputNativeComponent');

jest.mock('../packages/native-host/src/nativeTextInputNativeComponent', () => ({
  __esModule: true,
  default: require('@react-native/jest-preset/jest/mockNativeComponent').default(
    'AltrooMUITextInput',
  ),
  EditorCommands: { setTextAndSelection: jest.fn(), focus: jest.fn(), blur: jest.fn() },
}));

beforeEach(() => {
  jest.spyOn(UIManager, 'hasViewManagerConfig').mockReturnValue(true);
  jest.replaceProperty(Platform.constants, 'reactNativeVersion', {
    major: 0,
    minor: 88,
    patch: 1,
    prerelease: undefined,
  });
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test('editor baseline rejects stale binaries and unreviewed versions with rebuild guidance', () => {
  const current = { major: 0, minor: 88, patch: 1 };
  expect(() => assertNativeInputBaseline('0.88.1', current, true)).not.toThrow();
  for (const version of ['0.88.0', '0.88.2', '0.89.0'])
    expect(() => assertNativeInputBaseline(version, current, true)).toThrow(/Upgrade MUI Native/);
  expect(() => assertNativeInputBaseline('0.88.1', { ...current, patch: 2 }, true)).toThrow(
    /rebuild/,
  );
  expect(() =>
    assertNativeInputBaseline('0.88.1', { ...current, prerelease: 'rc.1' }, true),
  ).toThrow(/reviewed/);
  expect(() => assertNativeInputBaseline('0.88.1', current, false)).toThrow(
    /missing.*binary.*Rebuild/,
  );
});

test('native editor preserves callback event identity and controlled text authority', () => {
  const changed = jest.fn(),
    textChanged = jest.fn(),
    key = jest.fn(),
    selection = jest.fn();
  const ref = React.createRef<TextInputInstance>();
  const { rerender } = render(
    <NativeTextInput
      ref={ref}
      testID="editor"
      value="controlled"
      onChange={changed}
      onChangeText={textChanged}
      onKeyPress={key}
      onSelectionChange={selection}
    />,
  );
  const editor = screen.getByTestId('editor');
  const change = { nativeEvent: { text: 'native draft', eventCount: 7, target: 1 } };
  fireEvent(editor, 'change', change);
  expect(changed).toHaveBeenCalledTimes(1);
  expect(changed).toHaveBeenCalledWith(change);
  expect(textChanged).toHaveBeenCalledWith('native draft');
  expect(Commands.setTextAndSelection).toHaveBeenLastCalledWith(
    ref.current,
    7,
    'controlled',
    -1,
    -1,
  );
  const press = { nativeEvent: { key: 'Backspace' } };
  fireEvent(editor, 'keyPress', press);
  expect(key).toHaveBeenCalledWith(press);
  const caret = { nativeEvent: { selection: { start: 2, end: 2 } } };
  fireEvent(editor, 'selectionChange', caret);
  expect(selection).toHaveBeenCalledWith(caret);
  rerender(
    <NativeTextInput
      ref={ref}
      testID="editor"
      value="parent value"
      selection={{ start: 3, end: 3 }}
    />,
  );
  expect(Commands.setTextAndSelection).toHaveBeenLastCalledWith(
    ref.current,
    7,
    'parent value',
    3,
    3,
  );
});

test('forwarded editor ref retains imperative methods and releases on unmount', () => {
  const ref = React.createRef<TextInputInstance>();
  const { unmount } = render(
    <NativeTextInput ref={ref} testID="editor" defaultValue="initial" multiline />,
  );
  const node = ref.current!;
  expect(node.getNativeRef()).toBe(node);
  act(() => {
    node.clear();
    node.setSelection(1, 2);
  });
  expect(Commands.setTextAndSelection).toHaveBeenCalledWith(node, 0, '', 0, 0);
  expect(Commands.setTextAndSelection).toHaveBeenLastCalledWith(node, 0, null, 1, 2);
  fireEvent(screen.getByTestId('editor'), 'focus', { nativeEvent: {} });
  expect(node.isFocused()).toBe(true);
  unmount();
  expect(ref.current).toBeNull();
  expect(node.blur).toHaveBeenCalledTimes(1);
});

test('iOS multiline changes remount the native host while Android retains it', () => {
  const ref = React.createRef<TextInputInstance>();
  const { rerender } = render(<NativeTextInput ref={ref} defaultValue="draft" autoFocus />);
  const first = ref.current;
  rerender(<NativeTextInput ref={ref} defaultValue="draft" autoFocus multiline />);
  if (Platform.OS === 'ios') expect(ref.current).not.toBe(first);
  else expect(ref.current).toBe(first);
});
