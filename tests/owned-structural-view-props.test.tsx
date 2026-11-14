// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// The owned View must preserve the pinned stock JS-to-native prop contract.
import { createRef, useContext } from 'react';
import {
  Text,
  unstable_TextAncestorContext as TextAncestorContext,
  type ViewInstance,
  type ViewProps,
} from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import {
  OwnedStructuralHost,
  type StructuralView,
} from '../packages/native-host/src/ownedStructuralHost';
const StockView = jest.requireActual('react-native/Libraries/Components/View/View')
  .default as StructuralView;
const RawNative = 'View' as unknown as StructuralView;
const activation = { acquire: () => () => {} };
afterEach(cleanup);

const scenarios: readonly [string, ViewProps][] = [
  [
    'aliases',
    {
      id: 'alias-id',
      nativeID: 'fallback-id',
      'aria-label': 'Alias label',
      accessibilityLabel: 'Fallback label',
      'aria-labelledby': 'first, second',
      'aria-live': 'off',
      accessibilityLiveRegion: 'polite',
      'aria-hidden': true,
      importantForAccessibility: 'auto',
      tabIndex: -1,
    },
  ],
  [
    'false and zero aliases',
    {
      accessibilityState: {
        busy: true,
        checked: true,
        disabled: true,
        expanded: true,
        selected: true,
      },
      'aria-busy': false,
      'aria-checked': 'mixed',
      'aria-disabled': false,
      'aria-expanded': false,
      'aria-selected': false,
      accessibilityValue: { min: 5, max: 10, now: 8, text: 'Fallback value' },
      'aria-valuemin': 0,
      'aria-valuemax': 0,
      'aria-valuenow': 0,
      'aria-valuetext': '',
      'aria-hidden': false,
      accessibilityElementsHidden: true,
      tabIndex: 0,
    },
  ],
  [
    'native props',
    {
      nativeID: 'native-id',
      accessibilityLabel: 'Native label',
      accessibilityState: { expanded: true },
      accessibilityValue: { text: 'Native value' },
      accessibilityLabelledBy: ['native-label'],
      accessibilityElementsHidden: false,
    },
  ],
];
for (const [name, props] of scenarios) {
  test('owned native attributes match stock View: ' + name, () => {
    const tree = render(
      <>
        <StockView {...props} testID="stock" normalPaddingBottom={0} lastPaddingBottom={0} />
        <OwnedStructuralHost
          {...props}
          testID="owned"
          Native={RawNative}
          activation={activation}
          normalPaddingBottom={0}
          lastPaddingBottom={0}
        />
      </>,
    );
    const stock = tree.getByTestId('stock', { includeHiddenElements: true }).props;
    const owned = tree.getByTestId('owned', { includeHiddenElements: true }).props;
    for (const key of [
      'nativeID',
      'accessibilityLabel',
      'accessibilityLabelledBy',
      'accessibilityLiveRegion',
      'accessibilityElementsHidden',
      'importantForAccessibility',
      'focusable',
      'accessibilityState',
      'accessibilityValue',
    ]) {
      expect(owned[key]).toEqual(stock[key]);
    }
    for (const key of Object.keys(props).filter(
      (key) => key.startsWith('aria-') || key === 'id' || key === 'tabIndex',
    )) {
      expect(owned).not.toHaveProperty(key);
    }
  });
}
function ReadAncestor() {
  const inside = useContext(TextAncestorContext);
  return <Text testID="ancestor-result">{String(inside)}</Text>;
}
test('owned View resets text ancestry without replacing its native ref or metadata', () => {
  const ref = createRef<ViewInstance>();
  const marker = {
    schema: 1 as const,
    profile: {
      schema: 1 as const,
      rn: '0.88.1',
      platform: 'ios' as const,
      styleKeys: 'a7c54eb9011d822990f62b846cc6f333e1fbce23343e2426611925edcacac578',
      nativeCSSParsing: false,
      cppPropsIteratorSetter: false,
      accumulatedRawPropsAndroid: false,
      exclusivePropsAndroid: false,
      propsReconciliationAndroid: false,
    },
    normal: {},
    last: {},
  };
  const node = {};
  const tree = render(
    <TextAncestorContext.Provider value={true}>
      <OwnedStructuralHost
        ref={ref}
        testID="owned"
        Native={RawNative}
        activation={activation}
        normalPaddingBottom={0}
        lastPaddingBottom={0}
        ownedProgramme={marker}
      >
        <ReadAncestor />
      </OwnedStructuralHost>
    </TextAncestorContext.Provider>,
    { createNodeMock: () => node },
  );
  expect(tree.getByTestId('ancestor-result')).toHaveTextContent('false');
  expect(ref.current).toBe(node);
  expect(tree.getByTestId('owned', { includeHiddenElements: true }).props.ownedProgramme).toBe(
    marker,
  );
});
