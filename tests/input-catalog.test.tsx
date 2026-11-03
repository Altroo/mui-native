/* Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { act, fireEvent, render } from '@testing-library/react-native';
import { InputExamples } from '../apps/native-catalog/InputExamples';
import { Commands } from '../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';

afterEach(() => jest.restoreAllMocks());

test.each(['native', 'field', 'autocomplete', 'uncontrolled'])(
  '%s receipt comes from actual input, and a cold remount retains no earlier draft',
  (mode) => {
    for (const name of ['focus', 'blur', 'setPressed', 'setHotspot'] as const)
      jest.spyOn(Commands, name).mockImplementation(() => {});
    const tree = render(<InputExamples />);
    const receipt = () => JSON.parse(tree.getByTestId('typing-receipt').props.children);
    fireEvent.press(tree.getByTestId('typing-mode-' + mode));
    const firstGeneration = receipt().generation;
    expect(receipt()).toEqual({
      mode,
      generation: firstGeneration,
      value: '',
      count: 0,
      reason: 'initial',
    });
    act(() => {
      fireEvent(tree.getByTestId('typing-editor'), 'change', {
        nativeEvent: { text: 'N', eventCount: 1, target: 1 },
      });
      fireEvent(tree.getByTestId('typing-editor'), 'change', {
        nativeEvent: { text: 'New city', eventCount: 2, target: 1 },
      });
    });
    expect(receipt().value).toBe('New city');
    expect(receipt().count).toBe(2);
    expect(tree.getByTestId('typing-editor').props.value).toBe('New city');
    if (mode !== 'uncontrolled') {
      fireEvent.press(tree.getByTestId('typing-replace'));
      expect(tree.getByTestId('typing-editor').props.value).toBe('JS replacement');
      expect(receipt().value).toBe('New city');
      expect(receipt().count).toBe(2);
      fireEvent.press(tree.getByTestId('typing-replace'));
      expect(tree.getByTestId('typing-editor').props.value).toBe('');
      expect(receipt().value).toBe('New city');
    } else {
      expect(tree.getByTestId('typing-replace').props.accessibilityState.disabled).toBe(true);
    }
    fireEvent.press(tree.getByTestId('typing-mode-' + mode));
    expect(receipt()).toEqual({
      mode,
      generation: firstGeneration + 1,
      value: '',
      count: 0,
      reason: 'initial',
    });
    expect(tree.getByTestId('typing-editor').props.value).toBe('');
  },
);
