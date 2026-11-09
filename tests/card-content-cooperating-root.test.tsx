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
import { forwardRef, createRef, StrictMode } from 'react';
import { View, Text, type ViewInstance } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
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
test.each(['opaque', 'text', 'nested'] as const)(
  '%s roots fail closed without acquiring',
  (kind) => {
    const m = selected(),
      Opaque = forwardRef<ViewInstance>((props, ref) => <View {...props} ref={ref} />);
    const Root =
      kind === 'opaque'
        ? Opaque
        : kind === 'text'
          ? styled(Text)({})
          : styled(styled(View)({}))({});
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<m.Card component={Root as typeof View} />)).toThrow(
      /cooperating root|requires View/,
    );
    expect(m.native.enableStructuralStyleRuntime).not.toHaveBeenCalled();
    consoleError.mockRestore();
  },
);
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
    View as React.ComponentType<React.ComponentProps<typeof View> & { requiredToken: string }>,
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
