// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Real readiness parser/factory/compiler with explicit native metadata/service doubles.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(actual),
      View: { value: 'View', enumerable: true, configurable: true },
    },
  );
});
import {
  forwardRef,
  createRef,
  StrictMode,
  memo,
  createElement,
  createContext,
  useContext,
  useState,
  startTransition,
  Suspense,
  type ComponentType,
  type ComponentProps,
} from 'react';
import { View, Text, StyleSheet, type ViewInstance } from 'react-native';
import { cleanup, render, act } from '@testing-library/react-native';
import { prepareRuntimeCardContent } from '../packages/material/src/cardContentRuntimeBackend';
import {
  type OwnedStyleProfile,
  type StructuralProps,
} from '@altroo/mui-native-host/internal/owned-view';
import { GENERATED_TEXT_ORIGIN_CONTRACT } from '@altroo/mui-native-system/internal/generated-paragraph';
const profile: OwnedStyleProfile = Object.freeze({
  schema: 1,
  rn: '0.88.1',
  platform: 'ios',
  styleKeys: 'a7c54eb9011d822990f62b846cc6f333e1fbce23343e2426611925edcacac578',
  nativeCSSParsing: false,
  cppPropsIteratorSetter: false,
  accumulatedRawPropsAndroid: false,
  exclusivePropsAndroid: false,
  propsReconciliationAndroid: false,
});
const Native = forwardRef<ViewInstance, StructuralProps>((props, ref) => (
  <View {...props} ref={ref} />
));
function model() {
  const events: string[] = [];
  let active = false,
    generation = '0';
  const metadata: Record<string, unknown> = {
    schema: 1,
    service: 'owned-structural-style',
    host: 'AltrooMUIStructuralView',
    hostABI: 'owned-view-programme-v1',
    errorNotification: 'async-once-per-generation-v1',
    ownedProgrammeProfile: { ...profile },
    generatedTextOrigin: GENERATED_TEXT_ORIGIN_CONTRACT,
  };
  const native = {
    getStructuralStyleMetadata: jest.fn(function (this: unknown) {
      expect(this).toBe(native);
      events.push('metadata');
      return JSON.stringify(metadata);
    }),
    getStructuralStyleRuntimeStatus: jest.fn(() => {
      events.push('status');
      return JSON.stringify({
        schema: 1,
        service: 'owned-structural-style',
        errorNotification: 'async-once-per-generation-v1',
        active,
        hookRegistered: active,
        owner: active ? 'mui-owned-structural-style' : '',
        generation,
        degraded: false,
        errors: '0',
        lastErrorCode: 'none',
        lastError: '',
        attempts: '0',
        returnedCandidates: '0',
        changedCandidates: '0',
        cancelledCandidates: '0',
        ownedProgrammeProfile: { ...profile },
        scope: 'controlled-view-resolver',
        errorPolicy: 'original-candidate-returned-status-degraded',
      });
    }),
    enableStructuralStyleRuntime: jest.fn((_owner: string, next: string, _notify: () => void) => {
      events.push('enable');
      active = true;
      generation = next;
    }),
    disableStructuralStyleRuntime: jest.fn((_owner: string, _generation: string) => {
      events.push('disable');
      active = false;
      return true;
    }),
  };
  return { metadata, native, events };
}
function prepare(m: ReturnType<typeof model>) {
  return prepareRuntimeCardContent({
    native: m.native,
    StructuralView: Native,
    profile,
  });
}

import { styled, ThemeProvider, createTheme, componentRootStyle } from '@altroo/mui-native-system';
import { Box } from '../packages/material/src/nativeBox';
import { compileCooperatingCandidates } from '../packages/material/src/cardContentCandidates';
import type { CardContentBackendInput } from '../packages/material/src/cardContentRuntime';
import { ThemeProvider as MaterialThemeProvider } from '../packages/material/src/themeProvider';
import {
  NativeRootHandoffContext,
  nativeStyledStyles,
  isNativeCooperatingRoot,
  nativeCooperatingRootTarget,
} from '@altroo/mui-native-system/internal/prepared-style';
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
function selected() {
  const m = model();
  return { ...m, Card: prepare(m).CardContent };
}
function pair(tree: ReturnType<typeof render>, id = 'card') {
  return tree.getByTestId(id).props.ownedProgramme;
}
test('exact styled(View) participates without a second native root; inline data and callbacks stay genuine', () => {
  const m = selected(),
    inline = { paddingBottom: 9, opacity: 0.4 },
    click = jest.fn(),
    calls: unknown[] = [];
  const Root = styled(View)((props) => {
    calls.push(props);
    return { paddingTop: 5, '&:last-child': { opacity: 0.7 } };
  });
  const tree = render(
    <m.Card
      component={Root}
      testID="card"
      nativeID="user-id"
      id="dom-id"
      style={inline}
      onTouchEnd={click}
    >
      <View testID="child" />
    </m.Card>,
  );
  expect(calls).toHaveLength(1);
  expect((calls[0] as { style: unknown }).style).toBe(inline);
  expect(pair(tree).normal).toMatchObject({
    padding: 16,
    paddingBottom: 9,
    opacity: 0.4,
  });
  expect(pair(tree).last).toMatchObject({
    padding: 16,
    paddingBottom: 9,
    opacity: 0.4,
  });
  const root = tree.getByTestId('card');
  expect(root.props.nativeID).toBe('user-id');
  expect(root.props.id).toBe('dom-id');
  expect(root.props.onTouchEnd).toBe(click);
  expect(tree.UNSAFE_getAllByType(Native)).toHaveLength(1);
  expect(tree.getByTestId('child').props.ownedProgramme).toBeUndefined();
  expect(m.native.getStructuralStyleMetadata).toHaveBeenCalledTimes(1);
  expect(m.native.getStructuralStyleRuntimeStatus).toHaveBeenCalledTimes(2);
  tree.unmount();
  expect(m.native.disableStructuralStyleRuntime).toHaveBeenCalledTimes(1);
});
test.each(['absent', 'undefined', 'null'] as const)(
  'styled callback sees genuine %s style presence',
  (mode) => {
    const m = selected(),
      seen: unknown[] = [];
    const Root = styled(View)((props) => {
      seen.push([Object.hasOwn(props, 'style'), props.style]);
      return {};
    });
    const authored = mode === 'absent' ? {} : { style: mode === 'undefined' ? undefined : null };
    render(<m.Card component={Root} testID="card" {...authored} />);
    expect(seen).toEqual([[mode !== 'absent', mode === 'null' ? null : undefined]]);
  },
);
test('pinned MUI CardContent CSS follows selected-root CSS and preserves conditional specificity', () => {
  const m = selected(),
    Root = styled(View)({ padding: 6, paddingBottom: 8 });
  const tree = render(<m.Card component={Root} testID="card" />);
  expect(pair(tree).normal).toMatchObject({ padding: 16 });
  expect(pair(tree).last).toMatchObject({ padding: 16, paddingBottom: 24 });
});
test('pinned MUI CardContent last-child follows root last-child and native null resets remain last', () => {
  const m = selected(),
    Root = styled(View)({ '&:last-child': { paddingBottom: 31 } });
  const tree = render(<m.Card component={Root} testID="card" />);
  expect(pair(tree).normal.padding).toBe(16);
  expect(pair(tree).last.paddingBottom).toBe(24);
  tree.rerender(<m.Card component={Root} testID="card" style={{ paddingBottom: null }} />);
  expect(pair(tree).normal.paddingBottom).toBeNull();
  expect(pair(tree).last.paddingBottom).toBeNull();
});
test('Box default handoff preserves anonymous class filtering and ordinary descendant styling', () => {
  const m = selected();
  const tree = render(
    <m.Card component={Box} testID="card" nativeID="box-id">
      <Box testID="desc" sx={{ p: 1 }} />
    </m.Card>,
  );
  expect(pair(tree).normal.padding).toBe(16);
  expect(pair(tree).last.paddingBottom).toBe(24);
  expect(tree.getByTestId('card').props.className).toBeUndefined();
  expect(tree.getByTestId('card').props.nativeID).toBe('box-id');
  expect(tree.getByTestId('desc').props.ownedProgramme).toBeUndefined();
  expect(tree.getByTestId('desc')).toHaveStyle({ padding: 8 });
});
test('forwarded native ref is genuine and retained across rerenders, cleanup returned exactly once', () => {
  const m = selected(),
    Root = styled(View)({}),
    node = { identity: 'real-mock' },
    releases = jest.fn(),
    attach = jest.fn(() => releases);
  const tree = render(<m.Card component={Root} ref={attach} testID="card" />, {
    createNodeMock: () => node,
  });
  expect(attach).toHaveBeenCalledTimes(1);
  expect(attach).toHaveBeenLastCalledWith(node);
  tree.rerender(<m.Card component={Root} ref={attach} testID="card" style={{ opacity: 0.5 }} />);
  expect(attach).toHaveBeenCalledTimes(1);
  tree.unmount();
  expect(releases).toHaveBeenCalledTimes(1);
});
test('styled shouldForwardProp is still owned by the actual root', () => {
  const m = selected(),
    Root = styled(View, { shouldForwardProp: (key) => key !== 'nativeID' })({});
  const tree = render(<m.Card component={Root} testID="card" nativeID="filtered" id="kept" />);
  expect(tree.getByTestId('card').props.nativeID).toBeUndefined();
  expect(tree.getByTestId('card').props.id).toBe('kept');
});
test('descendant styled roots consume no ancestor handoff', () => {
  const m = selected(),
    Root = styled(View)({ paddingTop: 3 }),
    Child = styled(View)({ opacity: 0.2 });
  const tree = render(
    <m.Card component={Root} testID="card">
      <Child testID="child" />
    </m.Card>,
  );
  expect(tree.UNSAFE_getAllByType(Native)).toHaveLength(1);
  expect(tree.getByTestId('child').props.ownedProgramme).toBeUndefined();
  expect(tree.getByTestId('child')).toHaveStyle({ opacity: 0.2 });
});
test.each(['opaque', 'text'] as const)('%s roots fail closed without acquiring', (kind) => {
  const m = selected(),
    Opaque = forwardRef<ViewInstance>((props, ref) => <View {...props} ref={ref} />);
  const Root =
    kind === 'opaque' ? Opaque : kind === 'text' ? styled(Text)({}) : styled(styled(View)({}))({});
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => render(<m.Card component={Root as typeof View} />)).toThrow(
    /cooperating root|requires View/,
  );
  expect(m.native.enableStructuralStyleRuntime).not.toHaveBeenCalled();
  consoleError.mockRestore();
});
test('ordinary text uses the terminal scope once and View candidates exclude text keys', () => {
  const m = selected(),
    Root = styled(View)({ fontSize: 19, color: '#1565c0' });
  const tree = render(
    <m.Card component={Root} testID="card">
      Copy
    </m.Card>,
  );
  expect(tree.getAllByText('Copy')).toHaveLength(1);
  expect(tree.getByText('Copy')).toHaveStyle({
    fontSize: 19,
    color: '#1565c0',
  });
  expect(pair(tree).normal.fontSize).toBeUndefined();
  expect(pair(tree).last.color).toBeUndefined();
});
test('conditional root text rejects without acquiring', () => {
  const m = selected(),
    Root = styled(View)({ '&:last-child': { fontSize: 21 } });
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => render(<m.Card component={Root} />)).toThrow(/Conditional.*text/);
  expect(m.native.enableStructuralStyleRuntime).not.toHaveBeenCalled();
  consoleError.mockRestore();
});
test('default View retains baseline pair and no custom-root props', () => {
  const m = selected(),
    tree = render(<m.Card testID="card" />);
  expect(pair(tree).normal.padding).toBe(16);
  expect(pair(tree).last.paddingBottom).toBe(24);
  expect(tree.getByTestId('card').props.cooperation).toBeUndefined();
});
test('ordinary componentRootStyle keeps original result keys without opt-in', () => {
  expect(Object.keys(componentRootStyle(createTheme(), '', {}, undefined))).toEqual([
    'computed',
    'authored',
    'prepared',
  ]);
});
test('styled and Box ordinary paths remain unowned', () => {
  const Root = styled(View)({ padding: 3 });
  const ref = createRef<ViewInstance>();
  const tree = render(
    <>
      <Root testID="styled" ref={ref} />
      <Box testID="box" sx={{ p: 2 }} />
    </>,
    { createNodeMock: () => ({}) },
  );
  expect(tree.getByTestId('styled')).toHaveStyle({ padding: 3 });
  expect(tree.getByTestId('box')).toHaveStyle({ padding: 16 });
  expect(tree.getByTestId('styled').props.ownedProgramme).toBeUndefined();
  expect(tree.getByTestId('box').props.ownedProgramme).toBeUndefined();
  expect(isNativeCooperatingRoot(Root)).toBe(true);
  expect(isNativeCooperatingRoot(Box)).toBe(true);
  expect(isNativeCooperatingRoot(View)).toBe(false);
});
test('canonical Material theme is used without a replacement provider', () => {
  const m = selected(),
    theme = createTheme({
      components: {
        MuiCardContent: { styleOverrides: { root: { paddingTop: 11 } } },
      },
    }),
    Root = styled(View)({ opacity: 0.5 });
  const tree = render(
    <MaterialThemeProvider theme={theme}>
      <m.Card component={Root} testID="card" />
    </MaterialThemeProvider>,
  );
  expect(pair(tree).normal.paddingTop).toBe(11);
  expect(pair(tree).normal.opacity).toBe(0.5);
});
test('StrictMode retains one active generation and releases the final lease', () => {
  const m = selected(),
    Root = styled(View)({});
  const tree = render(
    <StrictMode>
      <ThemeProvider theme={createTheme()}>
        <m.Card component={Root} testID="card" />
      </ThemeProvider>
    </StrictMode>,
  );
  expect(m.native.enableStructuralStyleRuntime).toHaveBeenCalledTimes(1);
  tree.unmount();
  expect(m.native.disableStructuralStyleRuntime).toHaveBeenCalledTimes(1);
});

test('prepared CSS functions execute once, including CardContent overrides, variants and sx', () => {
  const m = selected(),
    override = jest.fn(() => ({ opacity: 0.4 })),
    variant = jest.fn(() => ({ paddingLeft: 7 })),
    sx = jest.fn(() => ({ '&:last-child': { paddingBottom: 35 } })),
    evaluate = jest.fn(() => ({ paddingBottom: 3 }));
  const theme = createTheme({
    components: {
      MuiCardContent: {
        styleOverrides: { root: override },
        variants: [{ props: { id: 'matched' }, style: variant }],
      },
    },
  });
  const Root = styled(View)(evaluate);
  const tree = render(
    <MaterialThemeProvider theme={theme}>
      <m.Card component={Root} testID="card" id="matched" sx={sx} />
    </MaterialThemeProvider>,
  );
  expect(override).toHaveBeenCalledTimes(1);
  expect(variant).toHaveBeenCalledTimes(1);
  expect(sx).toHaveBeenCalledTimes(1);
  expect(evaluate).toHaveBeenCalledTimes(1);
  expect(pair(tree).normal).toMatchObject({ opacity: 0.4, paddingLeft: 7 });
  expect(pair(tree).last.paddingBottom).toBe(280);
});
test('ancestor CSS is rebound to the final root classes without a fictional extra ancestor', () => {
  const m = selected(),
    Root = styled(View)({ opacity: 0.5 });
  const tree = render(
    <Box sx={{ '& .chosen': { paddingLeft: '9px' } }}>
      <m.Card component={Root} className="chosen" testID="card" />
    </Box>,
  );
  expect(pair(tree).normal.paddingLeft).toBe(9);
  expect(pair(tree).last.paddingBottom).toBe(24);
});
test('same-root rules propagate to real descendant Box exactly once', () => {
  const m = selected(),
    Root = styled(View)({ '& .descendant': { opacity: 0.65 } });
  const tree = render(
    <m.Card component={Root} testID="card">
      <Box className="descendant" testID="child" />
    </m.Card>,
  );
  expect(tree.getByTestId('child')).toHaveStyle({ opacity: 0.65 });
});
test('required custom props remain visible to a registered styled(View) callback and filter', () => {
  const m = selected(),
    calls: unknown[] = [];
  const Root = styled(
    View as ComponentType<ComponentProps<typeof View> & { requiredToken: string }>,
    { shouldForwardProp: (key) => key !== 'requiredToken' },
  )((props) => {
    calls.push(props.requiredToken);
    return {};
  });
  const tree = render(<m.Card component={Root} requiredToken="genuine" testID="card" />);
  expect(calls).toEqual(['genuine']);
  expect(tree.getByTestId('card').props.requiredToken).toBeUndefined();
});
test('two counterfactuals plus ordinary scope snapshot authored native getter only once', () => {
  let reads = 0;
  const native = {
    get opacity() {
      reads++;
      return 0.42;
    },
  };
  const programme = [native],
    theme = createTheme();
  nativeStyledStyles.set(programme, { sheets: [], authored: native, hasAuthoredStyle: true });
  const input = {
    styleProgram: programme,
    styleContext: { classes: ['card'] },
  } as unknown as CardContentBackendInput;
  const result = compileCooperatingCandidates(input, {
    theme,
    programme: undefined,
    context: {},
    parentDirection: 'ltr',
  });
  expect(reads).toBe(1);
  expect(result.normal.opacity).toBe(0.42);
  expect(result.last.opacity).toBe(0.42);
  expect(result.presentation.opacity).toBe(0.42);
});
test('ordinary styled and Box retain only the baseline style-carrier registrations', () => {
  const calls = jest.spyOn(nativeStyledStyles, 'set');
  const Root = styled(View)({ padding: 3 });
  const tree = render(<Root testID="a" />);
  expect(calls).toHaveBeenCalledTimes(1);
  tree.unmount();
  calls.mockClear();
  const box = render(<Box testID="b" />);
  expect(calls).not.toHaveBeenCalled();
  box.unmount();
});
test('root component replacement changes host ownership cleanly, current descendants remain ordinary', () => {
  const m = selected(),
    A = styled(View)({ opacity: 0.3 }),
    B = styled(View)({ opacity: 0.7 });
  const tree = render(
    <m.Card component={A} testID="card">
      <Box testID="child" />
    </m.Card>,
  );
  tree.rerender(
    <m.Card component={B} testID="card">
      <Box testID="child" />
    </m.Card>,
  );
  expect(pair(tree).normal.opacity).toBe(0.7);
  expect(tree.getByTestId('child').props.ownedProgramme).toBeUndefined();
  tree.unmount();
  expect(m.native.disableStructuralStyleRuntime).toHaveBeenCalledTimes(
    m.native.enableStructuralStyleRuntime.mock.calls.length,
  );
});

test.each(['div', View] as const)(
  'pure handoff permits only the actual Box terminal choice %s',
  (component) => {
    const prepare = jest.fn(() => ({
      presentation: {},
      normal: {},
      last: {},
      prepared: { sheets: [] },
    }));
    const finish = jest.fn((output) => <View {...output.hostProps} ref={output.nativeRef} />);
    const tree = render(
      <NativeRootHandoffContext.Provider value={{ target: Box, prepare, render: finish }}>
        <Box component={component} testID="terminal" nativeID="owned-by-user" />
      </NativeRootHandoffContext.Provider>,
    );
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(finish).toHaveBeenCalledTimes(1);
    expect(tree.getByTestId('terminal').props.nativeID).toBe('owned-by-user');
  },
);
test('pure Box handoff rejects an opaque selected host before preparation', () => {
  const Custom = forwardRef<ViewInstance>((props, ref) => <View {...props} ref={ref} />),
    prepare = jest.fn(),
    finish = jest.fn();
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(() =>
    render(
      <NativeRootHandoffContext.Provider value={{ target: Box, prepare, render: finish }}>
        <Box component={Custom} />
      </NativeRootHandoffContext.Provider>,
    ),
  ).toThrow('Box requires View/div');
  expect(prepare).not.toHaveBeenCalled();
  expect(finish).not.toHaveBeenCalled();
  error.mockRestore();
});
test('one combined text cascade resolves relative metrics and inherited direction', () => {
  const m = selected(),
    Root = styled(View)({ letterSpacing: '0.1em', lineHeight: 2 });
  const tree = render(
    <m.Card component={Root} testID="card" sx={{ fontSize: 20, direction: 'rtl' }}>
      Copy
    </m.Card>,
  );
  expect(tree.getByText('Copy')).toHaveStyle({ fontSize: 20, lineHeight: 40, letterSpacing: 2 });
  expect(pair(tree).normal.direction).toBe('rtl');
  expect(pair(tree).last.direction).toBe('rtl');
});

test('qualified styled root descendant selector uses final root classes', () => {
  const m = selected(),
    Root = styled(View)({ '&.chosen .desc': { opacity: 0.65 } });
  const tree = render(
    <m.Card component={Root} className="chosen" testID="card">
      <Box className="desc" testID="child" />
    </m.Card>,
  );
  expect(tree.getByTestId('child')).toHaveStyle({ opacity: 0.65 });
});
test('Card-owned descendant selector can address terminal Box class', () => {
  const m = selected();
  const tree = render(
    <m.Card component={Box} testID="card" sx={{ '&.MuiBox-root .desc': { opacity: 0.57 } }}>
      <Box className="desc" testID="child" />
    </m.Card>,
  );
  expect(tree.getByTestId('child')).toHaveStyle({ opacity: 0.57 });
});

test.each(['styled-styled', 'styled-box'] as const)(
  'known %s chain preserves one terminal owned host and final CSS order',
  (kind) => {
    const m = selected(),
      events: string[] = [];
    const Inner =
      kind === 'styled-box'
        ? Box
        : styled(View)(() => {
            events.push('inner');
            return { width: 93, opacity: 0.2, '&:last-child': { paddingBottom: 30 } };
          });
    const Root = styled(Inner)(() => {
      events.push('outer');
      return { width: 96, opacity: 0.4, '&:last-child': { paddingBottom: 33 } };
    });
    const tree = render(
      <m.Card
        component={Root}
        testID="card"
        nativeID="user-native"
        id="user-id"
        sx={{ width: '80px', opacity: 0.6 }}
        style={{ width: 88, opacity: 0.8 }}
      >
        <View testID="child" />
      </m.Card>,
    );
    expect(events).toEqual(kind === 'styled-box' ? ['outer'] : ['inner', 'outer']);
    expect(pair(tree).normal).toMatchObject({ width: 88, opacity: 0.8, padding: 16 });
    expect(pair(tree).last.paddingBottom).toBe(24);
    expect(tree.UNSAFE_getAllByType(Native)).toHaveLength(1);
    expect(tree.getByTestId('card').props.nativeID).toBe('user-native');
    expect(tree.getByTestId('card').props.id).toBe('user-id');
    tree.rerender(<m.Card component={Root} testID="card" sx={{ width: '80px', opacity: 0.6 }} />);
    expect(pair(tree).normal).toMatchObject({ width: 80, opacity: 0.6 });
    expect(m.native.enableStructuralStyleRuntime).toHaveBeenCalledTimes(1);
    tree.unmount();
    expect(m.native.disableStructuralStyleRuntime).toHaveBeenCalledTimes(1);
  },
);
test('three styled layers retain every callback/filter and genuine style carrier', () => {
  const m = selected(),
    calls: unknown[] = [],
    inline = { opacity: 0.9 };
  const Inner = styled(View, { shouldForwardProp: (key) => key !== 'secret' })((props) => {
    calls.push(['inner', props.style]);
    return { opacity: 0.1 };
  });
  const Middle = styled(Inner)((props) => {
    calls.push(['middle', props.style]);
    return { opacity: 0.3 };
  });
  const Outer = styled(Middle)((props) => {
    calls.push(['outer', props.style]);
    return { opacity: 0.5 };
  });
  const tree = render(<m.Card component={Outer} testID="card" style={inline} />);
  expect(calls).toHaveLength(3);
  expect(calls.map((value) => (value as unknown[])[0])).toEqual(['inner', 'middle', 'outer']);
  expect((calls[0] as unknown[])[1]).toBe(inline);
  expect((calls[1] as unknown[])[1]).toBe(inline);
  expect((calls[2] as unknown[])[1]).toBe(inline);
  expect(pair(tree).normal.opacity).toBe(0.9);
});
test.each(['styled-styled', 'styled-box'] as const)(
  'nested %s preserves qualified owner selectors on descendants',
  (kind) => {
    const m = selected();
    const Inner =
      kind === 'styled-box' ? Box : styled(View)({ '&.chosen .desc': { opacity: 0.25 } });
    const Root = styled(Inner)({ '&.chosen .desc': { opacity: 0.65 } });
    const tree = render(
      <m.Card
        component={Root}
        className="chosen"
        testID="card"
        sx={kind === 'styled-box' ? { '&.MuiBox-root .desc': { opacity: 0.57 } } : undefined}
      >
        <Box className="desc" testID="desc" />
      </m.Card>,
    );
    expect(tree.getByTestId('desc')).toHaveStyle({ opacity: kind === 'styled-box' ? 0.57 : 0.65 });
    expect(tree.getByTestId('desc').props.ownedProgramme).toBeUndefined();
  },
);
test('nested terminal text scope preserves relative metrics without duplicating generated paragraph', () => {
  const m = selected(),
    Inner = styled(View)({ lineHeight: 2 }),
    Root = styled(Inner)({ letterSpacing: '0.1em' });
  const tree = render(
    <m.Card component={Root} testID="card" sx={{ fontSize: 20 }}>
      Copy
    </m.Card>,
  );
  expect(tree.getAllByText('Copy')).toHaveLength(1);
  expect(tree.getByText('Copy')).toHaveStyle({ fontSize: 20, lineHeight: 40, letterSpacing: 2 });
  expect(pair(tree).normal.fontSize).toBeUndefined();
});
test('known nested native ref is retained and callback cleanup executes once', () => {
  const m = selected(),
    Root = styled(styled(View)({}))({}),
    node = {},
    release = jest.fn(),
    attach = jest.fn(() => release);
  const tree = render(<m.Card component={Root} testID="card" ref={attach} />, {
    createNodeMock: () => node,
  });
  expect(attach).toHaveBeenCalledTimes(1);
  expect(attach).toHaveBeenCalledWith(node);
  tree.rerender(<m.Card component={Root} testID="card" ref={attach} sx={{ opacity: 0.5 }} />);
  expect(attach).toHaveBeenCalledTimes(1);
  tree.unmount();
  expect(release).toHaveBeenCalledTimes(1);
});
test.each(['styled', 'box'] as const)(
  'genuine memo(%s) retains comparator/refs and one owned terminal',
  (kind) => {
    const m = selected(),
      Known = kind === 'box' ? Box : styled(styled(View)({}))({}),
      compare = jest.fn(() => false),
      Root = memo(Known, compare),
      node = {},
      release = jest.fn(),
      attach = jest.fn(() => release);
    const tree = render(<m.Card component={Root} testID="card" ref={attach} />, {
      createNodeMock: () => node,
    });
    expect(pair(tree).last.paddingBottom).toBe(24);
    expect(tree.UNSAFE_getAllByType(Native)).toHaveLength(1);
    tree.rerender(<m.Card component={Root} testID="card" ref={attach} style={{ opacity: 0.4 }} />);
    expect(compare).toHaveBeenCalled();
    expect(attach).toHaveBeenCalledTimes(1);
    tree.unmount();
    expect(release).toHaveBeenCalledTimes(1);
  },
);
test('memo of opaque root rejects; a public type accessor is never evaluated by admission', () => {
  const m = selected(),
    Opaque = forwardRef<ViewInstance>((props, ref) => <View {...props} ref={ref} />),
    Root = memo(Opaque),
    error = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => render(<m.Card component={Root} />)).toThrow(/cooperating root/);
  let reads = 0;
  const Fake = forwardRef<ViewInstance>((props, ref) => <View {...props} ref={ref} />);
  Object.defineProperty(Fake, 'type', {
    get() {
      reads++;
      return Box;
    },
  });
  expect(() => render(<m.Card component={Fake} />)).toThrow(/cooperating root/);
  expect(reads).toBe(0);
  expect(m.native.enableStructuralStyleRuntime).not.toHaveBeenCalled();
  error.mockRestore();
});

test.each(['memo-memo-styled', 'styled-memo-box', 'styled-memo-memo-styled'] as const)(
  'canonical %s chain preserves actual elements and terminal output',
  (kind) => {
    const m = selected(),
      events: string[] = [],
      compare = jest.fn(() => false);
    const Inner = styled(View)(() => {
      events.push('inner');
      return { opacity: 0.2 };
    });
    const Root =
      kind === 'memo-memo-styled'
        ? memo(memo(Inner, compare), compare)
        : kind === 'styled-memo-box'
          ? styled(memo(Box, compare))({ opacity: 0.5 })
          : styled(memo(memo(Inner, compare), compare))(() => {
              events.push('outer');
              return { opacity: 0.5 };
            });
    const release = jest.fn(),
      ref = jest.fn(() => release),
      node = {};
    const tree = render(<m.Card component={Root} testID="card" ref={ref} nativeID="preserved" />, {
      createNodeMock: () => node,
    });
    expect(pair(tree).normal.padding).toBe(16);
    expect(pair(tree).last.paddingBottom).toBe(24);
    expect(tree.UNSAFE_getAllByType(Native)).toHaveLength(1);
    expect(ref).toHaveBeenCalledWith(node);
    expect(tree.getByTestId('card').props.nativeID).toBe('preserved');
    expect(events).toEqual(
      kind === 'memo-memo-styled'
        ? ['inner']
        : kind === 'styled-memo-box'
          ? []
          : ['outer', 'inner'],
    );
    tree.rerender(
      <m.Card
        component={Root}
        testID="card"
        ref={ref}
        nativeID="preserved"
        style={{ opacity: 0.8 }}
      />,
    );
    expect(pair(tree).normal.opacity).toBe(0.8);
    expect(compare).toHaveBeenCalled();
    expect(ref).toHaveBeenCalledTimes(1);
    tree.unmount();
    expect(release).toHaveBeenCalledTimes(1);
  },
);
test('canonical chain admission never observes defaultProps/displayName or user prop getters', () => {
  const Root = styled(View)({}),
    a = memo(Root),
    b = memo(a);
  let defaults = 0,
    names = 0,
    props = 0;
  for (const value of [a, b]) {
    Object.defineProperty(value, 'displayName', {
      configurable: true,
      get() {
        names++;
        return 'test';
      },
    });
    Object.defineProperty(value, 'defaultProps', {
      configurable: true,
      get() {
        defaults++;
        return {
          get test() {
            props++;
            return 1;
          },
        };
      },
    });
  }
  expect(nativeCooperatingRootTarget(b)).toBe(Root);
  expect(isNativeCooperatingRoot(b)).toBe(true);
  expect([defaults, names, props]).toEqual([0, 0, 0]);
});
test('memo kind/type accessors, opaque leaves, cycles and over-bound chains reject without activation', () => {
  const Root = styled(View)({});
  let reads = 0;
  const kind = memo(Root);
  Object.defineProperty(kind, '$$typeof', {
    get() {
      reads++;
      throw Error('kind getter');
    },
  });
  const type = memo(Root);
  Object.defineProperty(type, 'type', {
    get() {
      reads++;
      throw Error('type getter');
    },
  });
  expect(nativeCooperatingRootTarget(kind)).toBeUndefined();
  expect(nativeCooperatingRootTarget(type)).toBeUndefined();
  expect(reads).toBe(0);
  const cycle = memo(Root);
  Reflect.set(cycle, 'type', cycle);
  expect(nativeCooperatingRootTarget(cycle)).toBeUndefined();
  let exact = Root;
  for (let i = 0; i < 128; i++) exact = memo(exact);
  expect(nativeCooperatingRootTarget(exact)).toBe(Root);
  expect(nativeCooperatingRootTarget(memo(exact))).toBeUndefined();
  const Opaque = forwardRef<ViewInstance>((props, ref) => <View {...props} ref={ref} />);
  expect(nativeCooperatingRootTarget(memo(memo(Opaque)))).toBeUndefined();
});
test('freezing canonical memo objects does not revoke their data-field identity', () => {
  const Root = styled(View)({}),
    a = Object.freeze(memo(Root)),
    b = Object.freeze(memo(a));
  expect(nativeCooperatingRootTarget(b)).toBe(Root);
});

test.each(['ordinary', 'cooperating'] as const)(
  'source %s adjacent callback/style/owner/filter order is inner then outer',
  (mode) => {
    const m = selected(),
      events: string[] = [],
      inline = { opacity: 0.7 },
      owner = { state: 'genuine' };
    const Inner = styled(View, {
      shouldForwardProp: (key) => {
        if (key === 'nativeID') events.push('inner-filter');
        return true;
      },
    })((props) => {
      events.push('inner');
      expect(props.style).toBe(inline);
      expect(props.ownerState).toBe(mode === 'ordinary' ? owner : undefined);
      return { opacity: 0.2 };
    });
    const Root = styled(Inner, {
      shouldForwardProp: (key) => {
        if (key === 'nativeID') events.push('outer-filter');
        return true;
      },
    })((props) => {
      events.push('outer');
      expect(props.style).toBe(inline);
      expect(props.ownerState).toBe(mode === 'ordinary' ? owner : undefined);
      return { opacity: 0.5 };
    });
    const tree =
      mode === 'ordinary'
        ? render(<Root testID="card" nativeID="preserved" ownerState={owner} style={inline} />)
        : render(
            <m.Card
              component={Root}
              testID="card"
              nativeID="preserved"
              ownerState={owner}
              style={inline}
            />,
          );
    expect(events).toEqual(['inner', 'outer', 'inner-filter', 'outer-filter']);
    expect(tree.getByTestId('card').props.nativeID).toBe('preserved');
  },
);
test('ordinary adjacent names/overrides/variants/sx callbacks evaluate once in source expression order', () => {
  const events: string[] = [],
    inline = { opacity: 0.8 };
  const theme = createTheme({
    components: {
      Inner: {
        styleOverrides: {
          root: () => {
            events.push('inner-override');
            return { paddingLeft: 2 };
          },
        },
        variants: [
          {
            props: { id: 'match' },
            style: () => {
              events.push('inner-variant');
              return { paddingRight: 3 };
            },
          },
        ],
      },
      Outer: {
        styleOverrides: {
          root: () => {
            events.push('outer-override');
            return { paddingTop: 4 };
          },
        },
        variants: [
          {
            props: { id: 'match' },
            style: () => {
              events.push('outer-variant');
              return { paddingBottom: 5 };
            },
          },
        ],
      },
    },
  });
  const Inner = styled(View, { name: 'Inner' })((props) => {
    events.push('inner');
    expect(props.style).toBe(inline);
    return { opacity: 0.2 };
  });
  const Root = styled(Inner, { name: 'Outer' })((props) => {
    events.push('outer');
    expect(props.style).toBe(inline);
    return { opacity: 0.4 };
  });
  const sx = () => {
    events.push('sx');
    return { opacity: 0.6 };
  };
  const tree = render(
    <ThemeProvider theme={theme}>
      <Root testID="card" id="match" style={inline} sx={sx} />
    </ThemeProvider>,
  );
  expect(events).toEqual([
    'inner',
    'inner-override',
    'inner-variant',
    'outer',
    'outer-override',
    'outer-variant',
    'sx',
  ]);
  expect(tree.getByTestId('card')).toHaveStyle({
    opacity: 0.8,
    paddingLeft: 2,
    paddingRight: 3,
    paddingTop: 4,
    paddingBottom: 5,
  });
});
test('adjacent construction snapshots source defaults once, before both callbacks', () => {
  const inline = { opacity: 0.4 },
    owner = { defaulted: true },
    seen: unknown[] = [];
  let reads = 0;
  const Inner = styled(View)((props) => {
    seen.push([props.style, props.ownerState]);
    return {};
  });
  Object.defineProperty(Inner, 'defaultProps', {
    configurable: true,
    get() {
      reads++;
      return { style: inline, ownerState: owner, nativeID: 'from-default' };
    },
  });
  const Root = styled(Inner)((props) => {
    seen.push([props.style, props.ownerState]);
    return {};
  });
  expect(reads).toBe(1);
  const tree = render(createElement(Root, { testID: 'card' }));
  expect(reads).toBe(1);
  expect(seen).toEqual([
    [inline, owner],
    [inline, owner],
  ]);
  expect(tree.getByTestId('card').props.nativeID).toBe('from-default');
});
test('real memo boundary retains callback order but never exposes prepared style through props', () => {
  const m = selected(),
    inline = { opacity: 0.7 },
    events: string[] = [];
  const Inner = styled(View)((props) => {
    events.push('inner');
    expect(props.style).toBe(inline);
    return { opacity: 0.2 };
  });
  const Root = styled(memo(memo(Inner)))((props) => {
    events.push('outer');
    expect(props.style).toBe(inline);
    return { opacity: 0.4 };
  });
  const tree = render(<m.Card component={Root} testID="card" style={inline} />);
  expect(events).toEqual(['outer', 'inner']);
  expect(pair(tree).normal.opacity).toBe(0.7);
});

test.each(['single', 'adjacent'] as const)(
  'selected %s root defaults supply genuine inline values after Card CSS',
  (kind) => {
    const m = selected(),
      inline = { opacity: 0.73, paddingBottom: 11 },
      seen: unknown[] = [];
    const Inner = styled(View)((props) => {
      seen.push(props.style);
      return { opacity: 0.2 };
    });
    (Inner as { defaultProps?: unknown }).defaultProps = {
      style: inline,
      nativeID: 'default-root',
    };
    const Root =
      kind === 'single'
        ? Inner
        : styled(Inner)((props) => {
            seen.push(props.style);
            return { opacity: 0.4 };
          });
    const tree = render(<m.Card component={Root} testID="card" />);
    expect(seen).toEqual(kind === 'single' ? [inline] : [inline, inline]);
    expect(pair(tree).normal).toMatchObject({ opacity: 0.73, paddingBottom: 11 });
    expect(pair(tree).last.paddingBottom).toBe(11);
    expect(tree.getByTestId('card').props.nativeID).toBe('default-root');
  },
);

test('readonly memo type tampering cannot introduce a recursive known styled graph', () => {
  const m = selected(),
    Inner = styled(View)({}),
    base = memo(Inner),
    Root = styled(base)({});
  Reflect.set(base, 'type', Root);
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => render(<m.Card component={Root} />)).toThrow(/original first-party terminal/);
  expect(m.native.enableStructuralStyleRuntime).not.toHaveBeenCalled();
  error.mockRestore();
});

test.each(['ordinary', 'cooperating'] as const)(
  'known memo/Box CSS is consumed at %s terminal rather than descendant',
  (mode) => {
    const m = selected(),
      Root = styled(memo(Box))({ width: 96, opacity: 0.4 });
    const content = <Box testID="desc" sx={{ p: 1 }} />;
    const tree =
      mode === 'ordinary'
        ? render(<Root testID="card">{content}</Root>)
        : render(
            <m.Card component={Root} testID="card">
              {content}
            </m.Card>,
          );
    expect(StyleSheet.flatten(tree.getByTestId('desc').props.style).width).toBeUndefined();
    expect(tree.getByTestId('desc')).toHaveStyle({ padding: 8 });
    expect(tree.getByTestId('desc').props.ownedProgramme).toBeUndefined();
  },
);

test('ordinary adjacent CSS follows source inner then outer then sx then native inline', () => {
  const Root = styled(styled(View)({ width: 93, opacity: 0.2 }))({ width: 96, opacity: 0.4 });
  const tree = render(
    <Root testID="card" sx={{ width: '80px', opacity: 0.6 }} style={{ width: 88, opacity: 0.8 }} />,
  );
  expect(tree.getByTestId('card')).toHaveStyle({ width: 88, opacity: 0.8 });
  tree.rerender(<Root testID="card" sx={{ width: '80px', opacity: 0.6 }} />);
  expect(tree.getByTestId('card')).toHaveStyle({ width: 80, opacity: 0.6 });
  tree.rerender(<Root testID="card" />);
  expect(tree.getByTestId('card')).toHaveStyle({ width: 96, opacity: 0.4 });
});

test.each(['ordinary', 'cooperating'] as const)(
  'adjacent %s callbacks share their genuine source props object',
  (mode) => {
    const m = selected(),
      inline = { opacity: 0.6 };
    let first: unknown;
    const Inner = styled(View)((props) => {
      first = props;
      return {};
    });
    const Root = styled(Inner)((props) => {
      expect(props).toBe(first);
      expect(props.style).toBe(inline);
      return {};
    });
    if (mode === 'ordinary') render(<Root style={inline} />);
    else render(<m.Card component={Root} style={inline} />);
  },
);

test.each(['ordinary', 'cooperating'] as const)(
  'default memo %s keeps equivalent CSS token and accepts changed CSS with same ordinary props',
  (mode) => {
    const m = selected();
    let opacity = 0.2,
      innerCalls = 0;
    const Inner = styled(View)(() => {
      innerCalls++;
      return {};
    });
    const Root = styled(memo(Inner))(() => ({ opacity }));
    const element = () =>
      mode === 'ordinary' ? (
        <Root testID="memo-semantic" id="same" />
      ) : (
        <m.Card component={Root} testID="memo-semantic" id="same" />
      );
    const tree = render(element());
    expect(innerCalls).toBe(1);
    tree.rerender(element());
    expect(innerCalls).toBe(1);
    opacity = 0.7;
    tree.rerender(element());
    expect(innerCalls).toBe(2);
    if (mode === 'ordinary')
      expect(tree.getByTestId('memo-semantic')).toHaveStyle({ opacity: 0.7 });
    else expect(pair(tree, 'memo-semantic').normal.opacity).toBe(0.7);
    tree.rerender(element());
    expect(innerCalls).toBe(2);
  },
);
test('memo comparator is invoked only by React once for one committed props update', () => {
  const compare = jest.fn(() => true),
    Root = styled(memo(Box, compare))((props: { id?: string }) => ({
      opacity: props.id === 'one' ? 0.2 : 0.7,
    }));
  const tree = render(<Root testID="memo-call" id="one" />);
  expect(compare).not.toHaveBeenCalled();
  tree.rerender(<Root testID="memo-call" id="two" />);
  expect(compare).toHaveBeenCalledTimes(1);
  expect(tree.getByTestId('memo-call').props.id).toBe('one');
  expect(tree.getByTestId('memo-call')).toHaveStyle({ opacity: 0.2 });
});
test('theme context updates inner styles across comparator bailout while old outer CSS remains accepted', () => {
  let innerCalls = 0;
  const Inner = styled(View)(({ theme }) => {
    innerCalls++;
    return { paddingTop: theme.spacing(1) };
  });
  const Root = styled(memo(Inner, () => true))((props: { id?: string }) => ({
    opacity: props.id === 'one' ? 0.2 : 0.7,
  }));
  const first = createTheme({ spacing: 8 }),
    second = createTheme({ spacing: 10 });
  const tree = render(
    <ThemeProvider theme={first}>
      <Root testID="memo-theme" id="one" />
    </ThemeProvider>,
  );
  expect(tree.getByTestId('memo-theme')).toHaveStyle({ paddingTop: 8, opacity: 0.2 });
  tree.rerender(
    <ThemeProvider theme={second}>
      <Root testID="memo-theme" id="two" />
    </ThemeProvider>,
  );
  expect(innerCalls).toBe(2);
  expect(tree.getByTestId('memo-theme').props.id).toBe('one');
  expect(tree.getByTestId('memo-theme')).toHaveStyle({ paddingTop: 10, opacity: 0.2 });
});
test('descendant ordinary context updates independently of retained memo props and CSS', () => {
  const Context = createContext('first');
  function Child() {
    return <Text testID="memo-context-child">{useContext(Context)}</Text>;
  }
  const Root = styled(memo(Box, () => true))((props: { id?: string }) => ({
    opacity: props.id === 'one' ? 0.2 : 0.7,
  }));
  const tree = render(
    <Context.Provider value="first">
      <Root testID="memo-context" id="one">
        <Child />
      </Root>
    </Context.Provider>,
  );
  tree.rerender(
    <Context.Provider value="second">
      <Root testID="memo-context" id="two">
        <Child />
      </Root>
    </Context.Provider>,
  );
  expect(tree.getByTestId('memo-context').props.id).toBe('one');
  expect(tree.getByTestId('memo-context')).toHaveStyle({ opacity: 0.2 });
  expect(tree.getByText('second')).toBeDefined();
});

test.each([true, false])(
  'pending/aborted render never changes accepted memo snapshot, comparatorAlways=%s',
  async (always) => {
    const Root = styled(memo(Box, always ? () => true : undefined))((props: { id?: string }) => ({
      opacity: props.id === 'one' ? 0.2 : props.id === 'two' ? 0.7 : 0.9,
    }));
    let update: ((value: string) => void) | undefined, release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let wait = true;
    function Gate({ id }: { id: string }) {
      if (id === 'two' && wait) throw pending;
      return null;
    }
    function App() {
      const [id, set] = useState('one');
      update = set;
      return (
        <Suspense fallback={<Text>pending fixture</Text>}>
          <Root testID="memo-abort" id={id} />
          <Gate id={id} />
        </Suspense>
      );
    }
    const tree = render(<App />, { concurrentRoot: true });
    await act(async () => {
      startTransition(() => update!('two'));
    });
    expect(tree.getByTestId('memo-abort').props.id).toBe('one');
    expect(tree.getByTestId('memo-abort')).toHaveStyle({ opacity: 0.2 });
    await act(async () => {
      update!('three');
    });
    expect(tree.getByTestId('memo-abort').props.id).toBe(always ? 'one' : 'three');
    expect(tree.getByTestId('memo-abort')).toHaveStyle({ opacity: always ? 0.2 : 0.9 });
    wait = false;
    await act(async () => {
      release!();
      startTransition(() => update!('two'));
    });
    expect(tree.getByTestId('memo-abort').props.id).toBe(always ? 'one' : 'two');
    expect(tree.getByTestId('memo-abort')).toHaveStyle({ opacity: always ? 0.2 : 0.7 });
  },
);

// Exact native reviewer regressions; original-MUI controls remain private.
test('review ordinary styled memo Box comparator retains the previous root CSS on bailout', () => {
  const compare = jest.fn(() => true);
  const Root = styled(memo(Box, compare))((props: { id?: string }) => ({
    opacity: props.id === 'one' ? 0.2 : 0.7,
  }));
  const tree = render(<Root testID="review-card" id="one" />);
  expect(tree.getByTestId('review-card')).toHaveStyle({ opacity: 0.2 });
  tree.rerender(<Root testID="review-card" id="two" />);
  expect(compare).toHaveBeenCalled();
  expect(tree.getByTestId('review-card').props.id).toBe('one');
  expect(tree.getByTestId('review-card')).toHaveStyle({ opacity: 0.2 });
});

test('review styled memo root defaults are visible to its outer style callback', () => {
  const Base = memo(Box);
  (Base as { defaultProps?: unknown }).defaultProps = { id: 'from-default' };
  const seen: unknown[] = [];
  const Root = styled(Base)((props: { id?: string }) => {
    seen.push(props.id);
    return { width: props.id === 'from-default' ? 93 : 96 };
  });
  const tree = render(createElement(Root, { testID: 'default-card' }));
  expect(tree.getByTestId('default-card').props.id).toBe('from-default');
  expect({
    seen,
    width: StyleSheet.flatten(tree.getByTestId('default-card').props.style).width,
  }).toEqual({ seen: ['from-default'], width: 93 });
});

test('review Card CSS handoff also respects a memo root comparator bailout', () => {
  const m = selected();
  const compare = jest.fn(() => true);
  const Root = memo(styled(View)({ opacity: 0.2 }), compare);
  const tree = render(
    <m.Card component={Root} testID="memo-card" id="one" sx={{ opacity: 0.4 }} />,
  );
  expect(pair(tree, 'memo-card').normal.opacity).toBe(0.4);
  tree.rerender(<m.Card component={Root} testID="memo-card" id="two" sx={{ opacity: 0.7 }} />);
  expect(compare).toHaveBeenCalled();
  expect(tree.getByTestId('memo-card').props.id).toBe('one');
  expect(pair(tree, 'memo-card').normal.opacity).toBe(0.4);
});
