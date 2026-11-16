// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// A legacy structural binary must keep stock View props, refs and child state.
const mockAcquire = jest.fn(() => () => {});
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(actual),
      View: { value: 'View', enumerable: true, configurable: true },
      findNodeHandle: { value: () => null, enumerable: true },
    },
  );
});
jest.mock('../packages/native-host/src/ownedStyleBootstrap', () => ({
  supportsInheritedTextColors: () => false,
  supportsPeerStyleIdentity: () => false,
  supportsStructuralCases: () => true,
  supportsParentStructuralCases: () => false,
  requireGeneratedTextOrigin: () => ({
    schema: 1,
    nativeIDPrefix: 'altroo:generated-paragraph:v1:',
  }),
  requireOwnedStyleProfile: () => ({
    schema: 1,
    rn: '0.88.1',
    platform: 'ios',
    styleKeys: require('../packages/native-host/src/ownedStyleVocabulary').ownedStyleVocabulary
      .sha256,
    nativeCSSParsing:
      require('react-native/Libraries/Components/View/ReactNativeStyleAttributes')
        .colorAttribute === true,
    cppPropsIteratorSetter: false,
    accumulatedRawPropsAndroid: false,
    exclusivePropsAndroid: false,
    propsReconciliationAndroid: false,
  }),
}));
jest.mock('../packages/native-host/src/AltrooMUIStructuralViewNativeComponent', () => ({
  __esModule: true,
  default: 'View',
}));
jest.mock('../packages/native-host/src/NativeAltrooStructuralObserver', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../packages/native-host/src/structuralStyleActivation', () => ({
  structuralStyleActivation: () => ({ acquire: () => mockAcquire(), getStatus: jest.fn() }),
}));
import { createRef, forwardRef, useState } from 'react';
import { Text, View, type ViewInstance } from 'react-native';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import {
  AccordionSummary,
  AccordionDetails,
  AccordionActions,
  Card,
  CardActions,
  DialogActions,
  Divider,
  ListItemIcon,
  Box,
  Paper,
} from '@altroo/mui-native';
import { styled } from '@altroo/mui-native-system';

type PeerProps = Pick<
  React.ComponentProps<typeof Box>,
  'children' | 'testID' | 'className' | 'style'
> &
  React.RefAttributes<ViewInstance>;
const peers: Record<string, React.ComponentType<PeerProps>> = {
  'styled(View)': styled(View)({ padding: 2 }),
  Box,
  Paper,
  CardActions,
  DialogActions,
  Divider,
  ListItemIcon,
  AccordionDetails,
  AccordionActions,
  'AccordionSummary content': forwardRef<ViewInstance, PeerProps>(
    function SummaryContent(props, ref) {
      return (
        <AccordionSummary slotProps={{ content: { ...props, ref } }}>
          {props.children}
        </AccordionSummary>
      );
    },
  ),
  'Card (div)': forwardRef<ViewInstance, PeerProps>(function AlternateCard(props, ref) {
    return <Card {...props} {...{ as: 'div' as const }} ref={ref} />;
  }),
};
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <Text testID="fallback-count" onPress={() => setCount((value) => value + 1)}>
      {count}
    </Text>
  );
}
afterEach(() => {
  cleanup();
  mockAcquire.mockClear();
});
for (const [name, Peer] of Object.entries(peers)) {
  test(name + ' keeps a stock View leaf on the legacy structural capability', () => {
    const ref = createRef<ViewInstance>();
    const layout = jest.fn();
    const scene = (expanded: boolean) => (
      <Peer
        ref={ref}
        testID="fallback-root"
        className={expanded ? 'Mui-expanded' : undefined}
        style={{ opacity: expanded ? 0.7 : 0.8 }}
        {...{ onLayout: layout }}
      >
        <Counter />
      </Peer>
    );
    let attaches = 0;
    const tree = render(scene(true), {
      createNodeMock: (node) =>
        (node.props as { testID?: string }).testID === 'fallback-root'
          ? { identity: ++attaches }
          : {},
    });
    const original = ref.current;
    fireEvent.press(tree.getByTestId('fallback-count'));
    tree.rerender(scene(false));
    const host = tree.getByTestId('fallback-root');
    for (const key of ['ownedProgramme', 'identity', 'prepared', 'classNames'])
      expect(host.props).not.toHaveProperty(key);
    expect(host.props.className).toBeUndefined();
    expect(host).toHaveStyle({ opacity: 0.8 });
    expect(host.props.onLayout).toBe(layout);
    expect(ref.current).toBe(original);
    expect(attaches).toBe(1);
    expect(tree.getByTestId('fallback-count')).toHaveTextContent('1');
    expect(mockAcquire).not.toHaveBeenCalled();
  });
}
