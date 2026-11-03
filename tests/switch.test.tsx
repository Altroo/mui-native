import { StyleSheet } from 'react-native';
import { cleanup } from '@testing-library/react-native';
import { configureDiagnostics, decomposeColor } from '../packages/material/src';
import { getNativeFocusedView } from '../packages/native-host/src';
import { clearNativeFocus } from '../packages/native-host/src/nativeFocus';
import { NativeSwitchModel } from './helpers/nativeSwitchModel';
import reference from './fixtures/mui-switch-browser-9.5.0.json';
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
const color = (value: any) => decomposeColor(value).values.slice(0, 3).map(Math.round);
test.each(reference.fixtures)('original Switch: $input.name', async (fixture) => {
  const model = new NativeSwitchModel();
  model.test = fixture.input;
  await model.mount();
  const snapshot = (expected: any) => {
    const rootStyle = StyleSheet.flatten(model.tree!.getByTestId('root').props.style),
      baseStyle = StyleSheet.flatten(model.tree!.getByTestId('base').props.style);
    expect(rootStyle.marginTop ?? rootStyle.margin ?? 0).toBe(
      parseFloat(expected.styles.root.marginTop),
    );
    expect(rootStyle.opacity ?? 1).toBe(parseFloat(expected.styles.root.opacity));
    expect(baseStyle.opacity ?? 1).toBe(parseFloat(expected.styles.base.opacity));
    const handle = model.handle!,
      target = model.tree!.getByTestId('a').props;
    expect({
      checked: handle.checked,
      name: handle.name,
      value: handle.value,
      disabled: handle.disabled,
      required: handle.required,
      readOnly: handle.readOnly,
      role: target.accessibilityRole,
    }).toEqual({
      checked: fixture.input.props?.readOnly ? expected.modelChecked : expected.checked,
      name: expected.name,
      value: expected.value,
      disabled: expected.disabled,
      required: expected.required,
      readOnly: expected.readOnly,
      role: expected.role,
    });
    const thumb = model.tree!.queryByTestId('thumb', { includeHiddenElements: true }),
      track = model.tree!.getByTestId('track', { includeHiddenElements: true });
    expect(Boolean(thumb)).toBe(Boolean(expected.styles.thumb));
    if (thumb) {
      const style = StyleSheet.flatten(thumb.props.style);
      expect(color(style.backgroundColor)).toEqual(color(expected.styles.thumb.backgroundColor));
      expect(style.width).toBe(parseFloat(expected.styles.thumb.width));
      expect(style.height).toBe(parseFloat(expected.styles.thumb.height));
    }
    const trackStyle = StyleSheet.flatten(track.props.style);
    expect(color(trackStyle.backgroundColor)).toEqual(color(expected.styles.track.backgroundColor));
    expect(trackStyle.opacity).toBe(parseFloat(expected.styles.track.opacity));
  };
  snapshot(fixture.states[0]);
  for (const [index, action] of (fixture.input.actions ?? []).entries()) {
    if ('label' in action) await model.label();
    else await model.press();
    snapshot(fixture.states[index + 1]);
  }
  expect(model.changeTrace).toEqual(fixture.trace);
});
test('Switch Space activates once and Enter does not activate', async () => {
  const model = new NativeSwitchModel();
  await model.mount();
  await model.nativeKey('Enter');
  await model.nativeKey('Enter', true);
  expect(model.handle!.checked).toBe(false);
  await model.nativeKey(' ');
  expect(model.handle!.checked).toBe(false);
  await model.nativeKey(' ', true);
  expect(model.handle!.checked).toBe(true);
});

import keyboardReference from './fixtures/mui-switch-keyboard-9.5.0.json';
import { act } from '@testing-library/react-native';
test.each(keyboardReference.fixtures)(
  'original trusted Switch keyboard: $input.name',
  async (fixture) => {
    const model = new NativeSwitchModel();
    model.test = fixture.input.cancelSpace
      ? {
          input: {
            onKeyDown: (event: any) => {
              if (event.key === ' ') event.preventDefault();
            },
          },
        }
      : {};
    await model.mount();
    await act(async () => model.nodes.get('a').focus());
    const snapshot = () => ({
      active: model.current === model.nodes.get('a') ? 'a' : '',
      controls: [
        {
          id: 'a',
          checked: model.handle!.checked,
          value: model.handle!.value,
          name: model.handle!.name,
          disabled: model.handle!.disabled,
        },
      ],
      trace: model.changeTrace
        .filter((item) => item.kind === 'change')
        .map(({ checked, value, name }) => ({ id: 'a', checked, value, name })),
    });
    expect(snapshot()).toEqual(fixture.states[0]);
    for (const [index, key] of fixture.input.keys.entries()) {
      await model.nativeKey(key === 'Space' ? ' ' : key);
      await model.nativeKey(key === 'Space' ? ' ' : key, true);
      expect(snapshot()).toEqual(fixture.states[index + 1]);
    }
  },
);
