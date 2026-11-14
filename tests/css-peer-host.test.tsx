// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Host doubles verify stable metadata/ref/state and inert leases, not native paint.
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
  supportsPeerStyleIdentity: () => true,
  supportsStructuralCases: () => true,
  supportsParentStructuralCases: () => true,
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
import { Text, View, type ViewInstance, type StyleProp } from 'react-native';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { Accordion, AccordionSummary, Box, Paper } from '@altroo/mui-native';
import {
  styled,
  createNativeStyleCache,
  NativeStyleCacheProvider,
  type NativeStyle,
} from '@altroo/mui-native-system';
const Styled = styled(View)({ padding: 2 });
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <Text testID="peer-count" onPress={() => setCount((value) => value + 1)}>
      {count}
    </Text>
  );
}
afterEach(() => {
  cleanup();
  mockAcquire.mockClear();
});
for (const name of ['styled(View)', 'Box', 'Paper'] as const) {
  test(name + ' keeps native ref and body state as foreign CSS appears and disappears', () => {
    const emitterCache = createNativeStyleCache({ key: 'peer-source' });
    const receiverCache = createNativeStyleCache({ key: 'peer-target' });
    let captured: StyleProp<NativeStyle>;
    const Capture = ({ style }: { style?: StyleProp<NativeStyle> }) => {
      captured = style;
      return null;
    };
    const Emitter = styled(Capture)({ paddingTop: 3 });
    const emitter = render(
      <NativeStyleCacheProvider value={emitterCache}>
        <Emitter />
      </NativeStyleCacheProvider>,
    );
    emitter.unmount();
    const ref = createRef<ViewInstance>();
    const scene = (foreign: boolean) => {
      const props = {
        ref,
        testID: 'peer-root',
        className: 'Mui-expanded',
        style: foreign ? captured : undefined,
        children: <Counter />,
      };
      const root =
        name === 'styled(View)' ? (
          <Styled {...props} />
        ) : name === 'Box' ? (
          <Box {...props} />
        ) : (
          <Paper {...props} />
        );
      return <NativeStyleCacheProvider value={receiverCache}>{root}</NativeStyleCacheProvider>;
    };
    const host = {};
    const tree = render(scene(false), {
      createNodeMock: (node) =>
        (node.props as { testID?: string }).testID === 'peer-root' ? host : {},
    });
    try {
      const programme = () => tree.getByTestId('peer-root').props.ownedProgramme;
      expect(programme().schema).toBe(4);
      expect(programme().peer.expanded).toBe(true);
      expect(
        programme().peer.classes.every((token: { eligible: boolean }) => token.eligible === false),
      ).toBe(true);
      const original = programme().peer.classes;
      expect(ref.current).toBe(host);
      fireEvent.press(tree.getByTestId('peer-count'));
      tree.rerender(scene(true));
      expect(
        programme().peer.classes.some(
          (token: { cacheKey: string }) => token.cacheKey === 'peer-source',
        ),
      ).toBe(true);
      expect(ref.current).toBe(host);
      expect(tree.getByTestId('peer-count')).toHaveTextContent('1');
      tree.rerender(scene(false));
      expect(programme().peer.classes).toEqual(original);
      expect(ref.current).toBe(host);
      expect(tree.getByTestId('peer-count')).toHaveTextContent('1');
      expect(mockAcquire).not.toHaveBeenCalled();
    } finally {
      tree.unmount();
      emitterCache.dispose();
      receiverCache.dispose();
    }
  });
}

for (const Base of [Box, Paper]) {
  test('opaque marker forwarding changes retain the same native leaf: ' + String(Base), () => {
    let forwardMarker = true;
    const Root = forwardRef<ViewInstance, React.ComponentProps<typeof Box>>(function Root(
      { className, ...props },
      ref,
    ) {
      return <Base {...props} ref={ref} className={forwardMarker ? className : undefined} />;
    });
    const ref = createRef<ViewInstance>();
    const scene = (name: string) => (
      <Accordion component={Root} ref={ref} testID="mode-root" className={name} expanded>
        <AccordionSummary>Summary</AccordionSummary>
        <Counter />
      </Accordion>
    );
    let attaches = 0;
    const tree = render(scene('initial'), {
      createNodeMock: (node) =>
        (node.props as { testID?: string }).testID === 'mode-root' ? { identity: ++attaches } : {},
    });
    const original = ref.current;
    const programme = () => tree.getByTestId('mode-root').props.ownedProgramme;
    expect(programme().schema).toBe(2);
    fireEvent.press(tree.getByTestId('peer-count'));
    forwardMarker = false;
    tree.rerender(scene('filtered'));
    expect(programme().schema).toBe(4);
    expect(ref.current).toBe(original);
    expect(tree.getByTestId('peer-count')).toHaveTextContent('1');
    forwardMarker = true;
    tree.rerender(scene('restored'));
    expect(programme().schema).toBe(2);
    expect(ref.current).toBe(original);
    expect(tree.getByTestId('peer-count')).toHaveTextContent('1');
    expect(attaches).toBe(1);
  });
}

test('65 foreign classes become unknown identity without replacing the baseline host', () => {
  const source = createNativeStyleCache({ key: 'many-source' }),
    target = createNativeStyleCache({ key: 'many-target' });
  const captured: StyleProp<NativeStyle>[] = [];
  const Capture = ({ style }: { style?: StyleProp<NativeStyle>; paddingValue?: number }) => {
    captured.push(style);
    return null;
  };
  const Emitter = styled(Capture)(({ paddingValue = 0 }) => ({
    paddingTop: paddingValue,
  }));
  for (let i = 0; i < 65; i++) {
    const emitter = render(
      <NativeStyleCacheProvider value={source}>
        <Emitter paddingValue={i} />
      </NativeStyleCacheProvider>,
    );
    emitter.unmount();
  }
  const ref = createRef<ViewInstance>();
  const scene = (many: boolean) => (
    <NativeStyleCacheProvider value={target}>
      <Box ref={ref} testID="many-root" style={many ? captured : undefined}>
        <Counter />
      </Box>
    </NativeStyleCacheProvider>
  );
  let attaches = 0;
  const tree = render(scene(false), {
    createNodeMock: (node) =>
      (node.props as { testID?: string }).testID === 'many-root' ? { identity: ++attaches } : {},
  });
  try {
    const host = ref.current;
    fireEvent.press(tree.getByTestId('peer-count'));
    tree.rerender(scene(true));
    expect(tree.getByTestId('many-root').props.ownedProgramme.peer).toBeNull();
    expect(ref.current).toBe(host);
    expect(tree.getByTestId('peer-count')).toHaveTextContent('1');
    tree.rerender(scene(false));
    expect(tree.getByTestId('many-root').props.ownedProgramme.peer).not.toBeNull();
    expect(ref.current).toBe(host);
    expect(attaches).toBe(1);
  } finally {
    tree.unmount();
    source.dispose();
    target.dispose();
  }
});
