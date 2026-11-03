jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { act, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Switch } from '../packages/material/src';
import { PopperExamples } from '../apps/native-catalog/PopperExamples';

test('the catalog transform toggle resets through the actual Fabric style diff', () => {
  const { diff } = jest.requireActual(
    'react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactNativeAttributePayload',
  );
  const attributes = jest.requireActual(
    'react-native/Libraries/Components/View/ReactNativeStyleAttributes',
  ).default;
  const tree = render(<PopperExamples />);
  const frameStyle = () => StyleSheet.flatten(tree.getByTestId('delivery-frame').props.style);
  const off = frameStyle();
  act(() => tree.UNSAFE_getAllByType(Switch)[1].props.onChange?.({} as any, true));
  const on = frameStyle();
  expect(on.transform).toEqual([{ rotate: '6deg' }, { scale: 0.92 }]);
  act(() => tree.UNSAFE_getAllByType(Switch)[1].props.onChange?.({} as any, false));
  const reset = frameStyle();
  expect(() => diff({ style: on }, { style: reset }, { style: attributes })).not.toThrow();
  expect(reset.transform).toEqual(off.transform);
});
