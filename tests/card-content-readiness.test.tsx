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
import { forwardRef } from 'react';
import { View, type ViewInstance } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import { prepareRuntimeCardContent } from '../packages/material/src/cardContentRuntimeBackend';
import {
  createOwnedStyleBootstrap,
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
  return prepareRuntimeCardContent({ native: m.native, StructuralView: Native, profile });
}
function noActivation(m: ReturnType<typeof model>) {
  expect(m.native.getStructuralStyleRuntimeStatus).not.toHaveBeenCalled();
  expect(m.native.enableStructuralStyleRuntime).not.toHaveBeenCalled();
  expect(m.native.disableStructuralStyleRuntime).not.toHaveBeenCalled();
}
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
test('provided controller is checked once before status; render/update/cleanup never reread metadata', () => {
  const m = model(),
    prepared = prepare(m);
  expect(m.events).toEqual(['metadata', 'status']);
  expect(Object.isFrozen(prepared.profile)).toBe(true);
  expect(m.native.enableStructuralStyleRuntime).not.toHaveBeenCalled();
  const tree = render(<prepared.CardContent testID="card">A</prepared.CardContent>);
  tree.rerender(<prepared.CardContent testID="card">B</prepared.CardContent>);
  expect(tree.getByTestId('card').props.ownedProgramme.last.paddingBottom).toBe(24);
  expect(m.native.enableStructuralStyleRuntime).toHaveBeenCalledTimes(1);
  tree.unmount();
  expect(m.native.disableStructuralStyleRuntime).toHaveBeenCalledTimes(1);
  expect(m.native.getStructuralStyleMetadata).toHaveBeenCalledTimes(1);
});
test('bootstrap and two preparations share the canonical per-native readOnce cache', () => {
  const m = model(),
    bootstrap = createOwnedStyleBootstrap(() => m.native, profile);
  const origin = bootstrap.requireGeneratedTextOrigin();
  expect(origin).toEqual(GENERATED_TEXT_ORIGIN_CONTRACT);
  expect(Object.isFrozen(origin)).toBe(true);
  prepare(m);
  prepare(m);
  expect(m.native.getStructuralStyleMetadata).toHaveBeenCalledTimes(1);
  expect(m.native.getStructuralStyleRuntimeStatus).toHaveBeenCalledTimes(2);
  expect(m.native.enableStructuralStyleRuntime).not.toHaveBeenCalled();
});
test.each(['absent', 'historical-raw-only'])(
  '%s old metadata keeps ordinary View profile valid but cannot prepare new CardContent',
  (mode) => {
    const m = model();
    delete m.metadata.generatedTextOrigin;
    if (mode === 'historical-raw-only')
      m.metadata.literalRawText = {
        schema: 1,
        componentName: 'AltrooMUILiteralRawText',
        abi: 'raw-text-derived-v1',
      };
    expect(createOwnedStyleBootstrap(() => m.native, profile).requireProfile()).toEqual(profile);
    expect(() => prepare(m)).toThrow(/generated.*origin|generated.*paragraph/i);
    expect(m.native.getStructuralStyleMetadata).toHaveBeenCalledTimes(1);
    noActivation(m);
  },
);
test.each([
  ['null', null],
  ['wrong-schema', { schema: 2, nativeIDPrefix: GENERATED_TEXT_ORIGIN_CONTRACT.nativeIDPrefix }],
  ['wrong-prefix', { schema: 1, nativeIDPrefix: 'altroo:generated-paragraph:v2:' }],
  [
    'boolean-schema',
    { schema: true, nativeIDPrefix: GENERATED_TEXT_ORIGIN_CONTRACT.nativeIDPrefix },
  ],
  ['extra-field', { ...GENERATED_TEXT_ORIGIN_CONTRACT, trusted: true }],
])('unsupported own capability %s fails before status/activation', (_name, capability) => {
  const m = model();
  m.metadata.generatedTextOrigin = capability;
  expect(() => prepare(m)).toThrow(/generated.*origin|generated.*paragraph/i);
  noActivation(m);
});
test.each(['value', 'getter', 'throwing-getter'])(
  'inherited %s capability is ignored without a getter read',
  (mode) => {
    const m = model();
    delete m.metadata.generatedTextOrigin;
    let reads = 0;
    Object.defineProperty(Object.prototype, 'generatedTextOrigin', {
      configurable: true,
      ...(mode === 'value'
        ? { value: GENERATED_TEXT_ORIGIN_CONTRACT }
        : {
            get() {
              reads++;
              if (mode === 'throwing-getter') throw Error('must not read inherited capability');
              return GENERATED_TEXT_ORIGIN_CONTRACT;
            },
          }),
    });
    try {
      expect(createOwnedStyleBootstrap(() => m.native, profile).requireProfile()).toEqual(profile);
      expect(() => prepare(m)).toThrow(/generated.*origin|generated.*paragraph/i);
      expect(reads).toBe(0);
      noActivation(m);
    } finally {
      Reflect.deleteProperty(Object.prototype, 'generatedTextOrigin');
    }
  },
);
test('an invalid provided controller is not rescued by another valid native metadata cache', () => {
  const valid = model(),
    missing = model();
  prepare(valid);
  delete missing.metadata.generatedTextOrigin;
  expect(() => prepare(missing)).toThrow(/generated.*origin|generated.*paragraph/i);
  expect(valid.native.getStructuralStyleMetadata).toHaveBeenCalledTimes(1);
  expect(missing.native.getStructuralStyleMetadata).toHaveBeenCalledTimes(1);
  noActivation(missing);
});
test('a failed provided controller read is sticky even if its later payload is repaired', () => {
  const m = model();
  delete m.metadata.generatedTextOrigin;
  expect(() => prepare(m)).toThrow();
  m.metadata.generatedTextOrigin = GENERATED_TEXT_ORIGIN_CONTRACT;
  expect(() => prepare(m)).toThrow();
  expect(m.native.getStructuralStyleMetadata).toHaveBeenCalledTimes(1);
  noActivation(m);
});
test.each([
  'nativeCSSParsing',
  'cppPropsIteratorSetter',
  'accumulatedRawPropsAndroid',
  'exclusivePropsAndroid',
  'propsReconciliationAndroid',
] as const)('metadata %s mismatch cannot be hidden by matching status flags', (flag) => {
  const m = model();
  (m.metadata.ownedProgrammeProfile as Record<string, unknown>)[flag] = true;
  expect(() => prepare(m)).toThrow('profile mismatch');
  noActivation(m);
});
test('missing native metadata method fails closed before status', () => {
  const m = model();
  Object.defineProperty(m.native, 'getStructuralStyleMetadata', { value: undefined });
  expect(() => prepare(m)).toThrow(/metadata method.*unavailable/i);
  noActivation(m);
});
test('native metadata exceptions are sticky and do not activate', () => {
  const m = model();
  m.native.getStructuralStyleMetadata.mockImplementation(() => {
    throw Error('metadata unavailable');
  });
  expect(() => prepare(m)).toThrow('metadata unavailable');
  expect(() => prepare(m)).toThrow('metadata unavailable');
  expect(m.native.getStructuralStyleMetadata).toHaveBeenCalledTimes(1);
  noActivation(m);
});

test('a mismatched System contract fails before activation even with valid provided-native capability', () => {
  const m = model();
  jest.isolateModules(() => {
    jest.doMock('@altroo/mui-native-system/internal/generated-paragraph', () => ({
      GENERATED_TEXT_ORIGIN_CONTRACT: Object.freeze({
        schema: 1,
        nativeIDPrefix: 'altroo:generated-paragraph:v2:',
      }),
    }));
    try {
      const backend =
        require('../packages/material/src/cardContentRuntimeBackend') as typeof import('../packages/material/src/cardContentRuntimeBackend');
      expect(() =>
        backend.prepareRuntimeCardContent({ native: m.native, StructuralView: Native, profile }),
      ).toThrow('System/native generated paragraph origin contract mismatch');
      noActivation(m);
    } finally {
      jest.dontMock('@altroo/mui-native-system/internal/generated-paragraph');
    }
  });
});
