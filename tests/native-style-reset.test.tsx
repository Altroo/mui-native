import { render } from '@testing-library/react-native';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { createTheme, NativeTextScope } from '../packages/system/src';

const { diff } = jest.requireActual(
  'react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactNativeAttributePayload',
);
const attributes = jest.requireActual(
  'react-native/Libraries/Components/View/ReactNativeStyleAttributes',
).default;
const theme = createTheme();

// Use Fabric's real attribute processor: mocked host components do not process
// transform resets and otherwise miss the development-build crash.
test.each(['view', 'text'] as const)(
  '%s scopes safely reset transforms from the final style layer',
  (kind) => {
    const Component = kind === 'view' ? View : Text;
    const transformed: NonNullable<ViewStyle['transform']> = [{ rotate: '6deg' }, { scale: 0.92 }];
    const tree = render(
      <NativeTextScope theme={theme} kind={kind} style={{ transform: transformed }}>
        {(style) => <Component testID="root" style={style} />}
      </NativeTextScope>,
    );
    const before = StyleSheet.flatten(tree.getByTestId('root').props.style);
    for (const reset of [undefined, null]) {
      tree.rerender(
        <NativeTextScope
          theme={theme}
          kind={kind}
          style={[{ transform: transformed }, { transform: reset } as ViewStyle]}
        >
          {(style) => <Component testID="root" style={style} />}
        </NativeTextScope>,
      );
      const after = StyleSheet.flatten(tree.getByTestId('root').props.style);
      expect(() => diff({ style: before }, { style: after }, { style: attributes })).not.toThrow();
      expect(after.transform).toEqual([]);
    }
    tree.rerender(
      <NativeTextScope theme={theme} kind={kind} style={{ opacity: 0.5 }}>
        {(style) => <Component testID="root" style={style} />}
      </NativeTextScope>,
    );
    const absent = StyleSheet.flatten(tree.getByTestId('root').props.style);
    expect(Object.hasOwn(absent, 'transform')).toBe(false);
    expect(() => diff({ style: before }, { style: absent }, { style: attributes })).not.toThrow();
  },
);
