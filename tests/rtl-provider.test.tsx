// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';
import { I18nManager, Text } from 'react-native';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { RtlProvider, useRtl } from '../packages/system/src';
import DeepProvider, { useRtl as deepUseRtl } from '../packages/system/src/RtlProvider';

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
function Direction({ name }: { name: string }) {
  return <Text testID={name}>{String(useRtl())}</Text>;
}
test.each([undefined, false, true])(
  'the root and deep provider share value %s and add no native host',
  (value) => {
    expect(DeepProvider).toBe(RtlProvider);
    expect(deepUseRtl).toBe(useRtl);
    const tree = render(
      <RtlProvider value={value}>
        <Direction name="direction" />
      </RtlProvider>,
    );
    expect(tree.getByTestId('direction')).toHaveTextContent(String(value ?? true));
    expect(tree.toJSON()).toMatchObject({ type: 'Text' });
  },
);
test('provider omission, nesting and unmount restore the nearest context', () => {
  const tree = render(
    <>
      <Direction name="outside" />
      <RtlProvider>
        <Direction name="outer" />
        <RtlProvider value={false}>
          <Direction name="inner" />
        </RtlProvider>
      </RtlProvider>
    </>,
  );
  expect(tree.getByTestId('outside')).toHaveTextContent('false');
  expect(tree.getByTestId('outer')).toHaveTextContent('true');
  expect(tree.getByTestId('inner')).toHaveTextContent('false');
  tree.rerender(<Direction name="outside" />);
  expect(tree.getByTestId('outside')).toHaveTextContent('false');
});
test('live context changes retain child state and never change global device direction', () => {
  const force = jest.spyOn(I18nManager, 'forceRTL');
  const allow = jest.spyOn(I18nManager, 'allowRTL');
  const swap = jest.spyOn(I18nManager, 'swapLeftAndRightInRTL');
  let mounts = 0,
    unmounts = 0;
  function Counter() {
    const direction = useRtl();
    const [count, setCount] = useState(0);
    useEffect(() => {
      mounts++;
      return () => {
        unmounts++;
      };
    }, []);
    return (
      <Text testID="counter" onPress={() => setCount((n) => n + 1)}>
        {String(direction)}:{count}
      </Text>
    );
  }
  const tree = render(
    <RtlProvider value={false}>
      <Counter />
    </RtlProvider>,
  );
  fireEvent.press(tree.getByTestId('counter'));
  for (const value of [true, undefined, false]) {
    tree.rerender(
      <RtlProvider value={value}>
        <Counter />
      </RtlProvider>,
    );
    expect(tree.getByTestId('counter')).toHaveTextContent(`${String(value ?? true)}:1`);
  }
  expect(mounts).toBe(1);
  expect(unmounts).toBe(0);
  expect(force).not.toHaveBeenCalled();
  expect(allow).not.toHaveBeenCalled();
  expect(swap).not.toHaveBeenCalled();
  tree.unmount();
  expect(unmounts).toBe(1);
});
