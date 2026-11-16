// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Progress peers retain their actual animated/layout View host and accepted CSS.
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
import { createRef } from 'react';
import { type ViewInstance } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import { CircularProgress, LinearProgress, ThemeProvider, createTheme } from '@altroo/mui-native';
const theme = createTheme({ motion: { reducedMotion: 'always' } });
afterEach(() => {
  cleanup();
  mockAcquire.mockClear();
});
for (const [name, Peer] of Object.entries({ CircularProgress, LinearProgress })) {
  test(name + ' preserves the stock View and native ref on a legacy binary', () => {
    const ref = createRef<ViewInstance>();
    const scene = (opacity: number) => (
      <ThemeProvider theme={theme}>
        <Peer
          ref={ref}
          testID="legacy-progress"
          variant="determinate"
          value={25}
          style={{ opacity }}
        />
      </ThemeProvider>
    );
    let attaches = 0;
    const tree = render(scene(0.7), {
      createNodeMock: (node) =>
        (node.props as { testID?: string }).testID === 'legacy-progress'
          ? { identity: ++attaches, setNativeProps: jest.fn() }
          : {},
    });
    const host = ref.current;
    tree.rerender(scene(0.8));
    expect(tree.getByTestId('legacy-progress')).toHaveStyle({ opacity: 0.8 });
    for (const key of ['ownedProgramme', 'prepared', 'classNames'])
      expect(tree.getByTestId('legacy-progress').props).not.toHaveProperty(key);
    expect(ref.current).toBe(host);
    expect(attaches).toBe(1);
    expect(mockAcquire).not.toHaveBeenCalled();
  });
}
