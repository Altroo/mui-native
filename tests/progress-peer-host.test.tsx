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
  supportsInheritedTextColors: () => false,
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
import { createRef } from 'react';
import {
  Animated,
  StyleSheet,
  processColor,
  type ViewInstance,
  type StyleProp,
} from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { CircularProgress, LinearProgress, ThemeProvider, createTheme } from '@altroo/mui-native';
import {
  styled,
  createNativeStyleCache,
  NativeStyleCacheProvider,
  type NativeStyle,
} from '@altroo/mui-native-system';
const theme = createTheme({ motion: { reducedMotion: 'always' } });
afterEach(() => {
  cleanup();
  mockAcquire.mockClear();
  jest.restoreAllMocks();
});
for (const [name, Peer] of Object.entries({ CircularProgress, LinearProgress })) {
  test(name + ' retains its native host while accepted peer classes change', () => {
    const source = createNativeStyleCache({ key: 'progress-source' });
    const target = createNativeStyleCache({ key: 'progress-target' });
    let captured: StyleProp<NativeStyle> = undefined;
    const Producer = styled(({ style }: { style?: StyleProp<NativeStyle> }) => {
      captured = style;
      return null;
    })({ paddingTop: '3px' });
    const emitter = render(
      <NativeStyleCacheProvider value={source}>
        <Producer />
      </NativeStyleCacheProvider>,
    );
    emitter.unmount();
    const ref = createRef<ViewInstance>();
    const scene = (foreign: boolean, expanded = true) => (
      <ThemeProvider theme={theme}>
        <NativeStyleCacheProvider value={target}>
          <Peer
            ref={ref}
            testID="progress-peer-root"
            variant="determinate"
            value={25}
            className={expanded ? 'Mui-expanded' : undefined}
            style={foreign ? captured : undefined}
          />
        </NativeStyleCacheProvider>
      </ThemeProvider>
    );
    let attaches = 0;
    const tree = render(scene(false), {
      createNodeMock: (node) =>
        (node.props as { testID?: string }).testID === 'progress-peer-root'
          ? { identity: ++attaches, setNativeProps: jest.fn() }
          : {},
    });
    try {
      const host = ref.current;
      expect(host).not.toBeNull();
      const programme = () => tree.getByTestId('progress-peer-root').props.ownedProgramme;
      expect(programme().schema).toBe(4);
      expect(programme().peer.expanded).toBe(true);
      tree.rerender(scene(true));
      expect(
        programme().peer.classes.some(
          (token: { cacheKey: string }) => token.cacheKey === 'progress-source',
        ),
      ).toBe(true);
      expect(ref.current).toBe(host);
      tree.rerender(scene(false, false));
      expect(programme().peer.expanded).toBe(false);
      expect(
        programme().peer.classes.every(
          (token: { cacheKey: string }) => token.cacheKey === 'progress-target',
        ),
      ).toBe(true);
      expect(ref.current).toBe(host);
      expect(attaches).toBe(1);
      expect(mockAcquire).not.toHaveBeenCalled();
    } finally {
      tree.unmount();
      source.dispose();
      target.dispose();
    }
  });
  test(name + ' refreshes foreign root paint without replaying sx', () => {
    const source = createNativeStyleCache({ key: 'progress-reset-source' });
    const target = createNativeStyleCache({ key: 'progress-reset-target' });
    const Warm = styled(LinearProgress)({ opacity: 0.8 });
    const warm = render(
      <ThemeProvider theme={theme}>
        <NativeStyleCacheProvider value={target}>
          <Warm />
        </NativeStyleCacheProvider>
      </ThemeProvider>,
    );
    warm.unmount();
    let captured: StyleProp<NativeStyle> = undefined;
    const Producer = styled(({ style }: { style?: StyleProp<NativeStyle> }) => {
      captured = style;
      return null;
    })({ backgroundColor: 'red' });
    const emitter = render(
      <NativeStyleCacheProvider value={source}>
        <Producer />
      </NativeStyleCacheProvider>,
    );
    emitter.unmount();
    const sx = jest.fn(() => ({ backgroundColor: 'blue' }));
    const tree = render(
      <ThemeProvider theme={theme}>
        <NativeStyleCacheProvider value={target}>
          <Peer variant="determinate" value={25} testID="progress-paint" style={captured} sx={sx} />
        </NativeStyleCacheProvider>
      </ThemeProvider>,
    );
    try {
      const color = () =>
        processColor(
          StyleSheet.flatten(tree.getByTestId('progress-paint').props.style)?.backgroundColor,
        );
      expect(color()).toBe(processColor('red'));
      act(() => source.reset());
      expect(color()).toBe(processColor('blue'));
      expect(sx).toHaveBeenCalledTimes(1);
    } finally {
      tree.unmount();
      source.dispose();
      target.dispose();
    }
  });
}

test('CircularProgress refreshes em dimensions when foreign font CSS resets', () => {
  const source = createNativeStyleCache({ key: 'progress-font-source' });
  const target = createNativeStyleCache({ key: 'progress-font-target' });
  const warm = render(
    <ThemeProvider theme={theme}>
      <NativeStyleCacheProvider value={target}>
        <LinearProgress />
      </NativeStyleCacheProvider>
    </ThemeProvider>,
  );
  warm.unmount();
  let captured: StyleProp<NativeStyle> = undefined;
  const Producer = styled(({ style }: { style?: StyleProp<NativeStyle> }) => {
    captured = style;
    return null;
  })({ fontSize: '32px' });
  const emitter = render(
    <NativeStyleCacheProvider value={source}>
      <Producer />
    </NativeStyleCacheProvider>,
  );
  emitter.unmount();
  const sx = jest.fn(() => ({ fontSize: '16px' }));
  const tree = render(
    <ThemeProvider theme={theme}>
      <NativeStyleCacheProvider value={target}>
        <CircularProgress
          testID="progress-font"
          size="1em"
          variant="determinate"
          value={25}
          sx={sx}
          style={captured}
        />
      </NativeStyleCacheProvider>
    </ThemeProvider>,
  );
  try {
    expect(tree.getByTestId('progress-font')).toHaveStyle({ width: 32, height: 32 });
    act(() => source.reset());
    expect(tree.getByTestId('progress-font')).toHaveStyle({ width: 16, height: 16 });
    expect(sx).toHaveBeenCalledTimes(1);
  } finally {
    tree.unmount();
    source.dispose();
    target.dispose();
  }
});

function foreignProgressPaint(key: string) {
  const source = createNativeStyleCache({ key });
  let style: StyleProp<NativeStyle> = undefined;
  const Producer = styled(({ style: value }: { style?: StyleProp<NativeStyle> }) => {
    style = value;
    return null;
  })({ backgroundColor: 'red' });
  const emitter = render(
    <NativeStyleCacheProvider value={source}>
      <Producer />
    </NativeStyleCacheProvider>,
  );
  emitter.unmount();
  return { source, style };
}

test('CircularProgress keeps one v2 host and running loops across stylesheet refresh', () => {
  const loops: Array<{ start: jest.Mock; stop: jest.Mock; reset: jest.Mock }> = [];
  const timing = jest.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  jest.spyOn(Animated, 'loop').mockImplementation(() => {
    const loop = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
    loops.push(loop);
    return loop;
  });
  const cache = createNativeStyleCache({ key: 'progress-motion-target' });
  const foreign = foreignProgressPaint('progress-motion-source');
  const moving = createTheme({ motion: { reducedMotion: 'never' } });
  const ref = createRef<ViewInstance>();
  const scene = (determinate: boolean) => (
    <ThemeProvider theme={moving}>
      <NativeStyleCacheProvider value={cache}>
        <CircularProgress
          ref={ref}
          testID="progress-motion"
          variant={determinate ? 'determinate' : 'indeterminate'}
          style={foreign.style}
          sx={{ backgroundColor: 'blue' }}
          value={50}
        />
      </NativeStyleCacheProvider>
    </ThemeProvider>
  );
  let attaches = 0;
  const tree = render(scene(false), {
    createNodeMock: (node) =>
      (node.props as { testID?: string }).testID === 'progress-motion'
        ? { identity: ++attaches, setNativeProps: jest.fn() }
        : {},
  });
  try {
    const host = ref.current;
    expect(host).not.toBeNull();
    expect(loops).toHaveLength(2);
    expect(loops.every((loop) => loop.start.mock.calls.length === 1)).toBe(true);
    act(() => foreign.source.reset());
    expect(tree.getByTestId('progress-motion')).toHaveStyle({ backgroundColor: 'blue' });
    expect(ref.current).toBe(host);
    expect(loops).toHaveLength(2);
    expect(loops.every((loop) => loop.stop.mock.calls.length === 0)).toBe(true);
    expect(tree.getByTestId('progress-motion').props.ownedProgramme.schema).toBe(4);
    tree.rerender(scene(true));
    expect(loops.every((loop) => loop.stop.mock.calls.length === 1)).toBe(true);
    expect(StyleSheet.flatten(tree.getByTestId('progress-motion').props.style).transform).toEqual([
      { rotate: '-90deg' },
    ]);
    tree.rerender(scene(false));
    expect(loops).toHaveLength(4);
    expect(loops.slice(2).every((loop) => loop.start.mock.calls.length === 1)).toBe(true);
    expect(ref.current).toBe(host);
    expect(attaches).toBe(1);
    for (const [, config] of timing.mock.calls)
      expect(config).toMatchObject({ useNativeDriver: true, isInteraction: false });
    expect(mockAcquire).not.toHaveBeenCalled();
  } finally {
    tree.unmount();
    cache.dispose();
    foreign.source.dispose();
  }
  expect(loops.every((loop) => loop.stop.mock.calls.length === 1)).toBe(true);
});

test('LinearProgress retains measured geometry and forwards each layout across v2 CSS refresh', () => {
  const cache = createNativeStyleCache({ key: 'progress-layout-target' });
  const foreign = foreignProgressPaint('progress-layout-source');
  const onLayout = jest.fn();
  const sx = jest.fn(() => ({ backgroundColor: 'blue' }));
  const ref = createRef<ViewInstance>();
  let attaches = 0;
  const tree = render(
    <ThemeProvider theme={theme}>
      <NativeStyleCacheProvider value={cache}>
        <LinearProgress
          ref={ref}
          testID="progress-layout"
          variant="determinate"
          value={25}
          onLayout={onLayout}
          style={foreign.style}
          sx={sx}
        />
      </NativeStyleCacheProvider>
    </ThemeProvider>,
    {
      createNodeMock: (node) =>
        (node.props as { testID?: string }).testID === 'progress-layout'
          ? { identity: ++attaches, setNativeProps: jest.fn() }
          : {},
    },
  );
  const translation = () => {
    const style = StyleSheet.flatten(tree.UNSAFE_getAllByType(Animated.View)[0].props.style);
    return (style.transform[0].translateX as { __getValue(): number }).__getValue();
  };
  const measure = (width: number) =>
    fireEvent(tree.getByTestId('progress-layout'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 4 } },
    });
  try {
    const host = ref.current;
    expect(host).not.toBeNull();
    measure(240);
    expect(translation()).toBe(-180);
    expect(onLayout).toHaveBeenCalledTimes(1);
    act(() => foreign.source.reset());
    expect(tree.getByTestId('progress-layout')).toHaveStyle({ backgroundColor: 'blue' });
    expect(translation()).toBe(-180);
    expect(onLayout).toHaveBeenCalledTimes(1);
    measure(320);
    expect(translation()).toBe(-240);
    expect(onLayout).toHaveBeenCalledTimes(2);
    expect(ref.current).toBe(host);
    expect(attaches).toBe(1);
    expect(sx).toHaveBeenCalledTimes(1);
    expect(tree.getByTestId('progress-layout').props.ownedProgramme.schema).toBe(4);
    expect(mockAcquire).not.toHaveBeenCalled();
  } finally {
    tree.unmount();
    cache.dispose();
    foreign.source.dispose();
  }
});
