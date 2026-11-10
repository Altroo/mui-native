// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { cleanup, render } from '@testing-library/react-native';
import { Text, type TextStyle } from 'react-native';
import { createTheme } from '../packages/system/src/theme';
import { createNativeStyledStyle, type NativeStyle } from '../packages/system/src/sx';
import { NativeTextScope, nativeTextStyleContext } from '../packages/system/src/textScope';
import {
  nativeTextElementProvenance,
  sealNativeTextElement,
  type NativeTextProvenance,
} from '../packages/system/src/nativeTextProvenance';

afterEach(cleanup);
function fixture(native: TextStyle | undefined) {
  const theme = createTheme();
  const style = createNativeStyledStyle(
    theme,
    '',
    {},
    { fontSize: 19, lineHeight: 1.2 },
    nativeTextStyleContext(undefined, native, theme),
    native,
  );
  function capture(input = style) {
    let observed: { frame: NativeTextProvenance; native: NativeStyle } | undefined;
    render(
      <NativeTextScope theme={theme} style={input} kind="text">
        {(resolved) => {
          const element = sealNativeTextElement(
            <Text style={resolved}>Source capture</Text>,
            resolved,
          );
          const receipt = nativeTextElementProvenance(element);
          if (!receipt) throw Error('Missing owned Text receipt');
          observed = { frame: receipt.provenance, native: resolved };
          return element;
        }}
      </NativeTextScope>,
    );
    if (!observed) throw Error('Missing scope render');
    return observed;
  }
  return { style, capture };
}
test.each([19, 21])(
  'late native property appearance (%s) cannot supply a source snapshot',
  (value) => {
    let armed = false,
      scans = 0;
    const reads: string[][] = [];
    const native = new Proxy(
      { fontSize: value },
      {
        ownKeys(target) {
          if (!armed) return Reflect.ownKeys(target);
          const keys = ++scans === 1 ? [] : ['fontSize'];
          reads.push(keys);
          return keys;
        },
      },
    );
    const f = fixture(native);
    armed = true;
    const result = f.capture();
    expect(reads).toEqual([[], ['fontSize']]);
    expect(result.frame.inputs?.nativeOwn).toBeUndefined();
    expect(result.native.fontSize).toBe(19);
    expect(result.frame.normalization.effectiveSize).toBe(value);
  },
);
test('inconsistent DATA Proxy values decline without another getter read', () => {
  let armed = false;
  const reads: number[] = [];
  const native = new Proxy(
    { fontSize: 19 },
    {
      get(target, key, receiver) {
        if (armed && key === 'fontSize') {
          const value = reads.length === 0 ? 19 : 21;
          reads.push(value);
          return value;
        }
        return Reflect.get(target, key, receiver);
      },
    },
  );
  const f = fixture(native);
  armed = true;
  const result = f.capture();
  expect(reads).toEqual([19, 21]);
  expect(result.frame.inputs?.nativeOwn).toBeUndefined();
  expect(result.native.fontSize).toBe(19);
  expect(result.frame.normalization.effectiveSize).toBe(21);
});
test('frozen inputs preserve original Proxy receivers and raw DATA identity', () => {
  let native: TextStyle;
  const receivers: unknown[] = [];
  native = new Proxy(Object.freeze({ fontSize: 19 }), {
    get(target, key, receiver) {
      receivers.push(receiver);
      return Reflect.get(target, key, receiver);
    },
  });
  const f = fixture(native);
  Object.freeze(f.style);
  const result = f.capture();
  expect(result.frame.inputs?.nativeOwn?.fontSize).toBe(19);
  expect(receivers.length).toBeGreaterThan(0);
  expect(receivers.every((value) => value === native)).toBe(true);
});
