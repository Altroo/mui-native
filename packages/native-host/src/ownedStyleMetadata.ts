// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Internal immutable readiness only. No controller state, activation or React.
export type OwnedStyleProfile = Readonly<{
  schema: 1;
  rn: string;
  platform: 'ios' | 'android';
  styleKeys: string;
  nativeCSSParsing: boolean;
  cppPropsIteratorSetter: boolean;
  accumulatedRawPropsAndroid: boolean;
  exclusivePropsAndroid: boolean;
  propsReconciliationAndroid: boolean;
}>;
export type GeneratedTextOrigin = Readonly<{
  schema: 1;
  nativeIDPrefix: 'altroo:generated-paragraph:v1:';
}>;
type Metadata = Readonly<{
  schema: 1;
  service: 'owned-structural-style';
  host: 'AltrooMUIStructuralView';
  hostABI: 'owned-view-programme-v1';
  errorNotification: 'async-once-per-generation-v1';
  ownedProgrammeProfile: OwnedStyleProfile;
  generatedTextOrigin: GeneratedTextOrigin | undefined;
  structuralCases: boolean;
  parentStructuralCases: boolean;
}>;
type Outcome = Readonly<{ metadata: Metadata; error?: never } | { error: Error; metadata?: never }>;
export type OwnedStyleBootstrap = Readonly<{
  requireProfile(): OwnedStyleProfile;
  requireGeneratedTextOrigin(): GeneratedTextOrigin;
  supportsStructuralCases(): boolean;
  supportsParentStructuralCases(): boolean;
}>;
type Expected = Readonly<{ rn: string; platform: string; styleKeys: string }>;
// One canonical native module object has one immutable read for this JS runtime.
// Both success and failure are sticky; native hot registration/flag reset is unsupported.
const cache = new WeakMap<object, Outcome>();
const flags = [
  'nativeCSSParsing',
  'cppPropsIteratorSetter',
  'accumulatedRawPropsAndroid',
  'exclusivePropsAndroid',
  'propsReconciliationAndroid',
] as const;
const fail = (message: string) => Error('MUI owned View bootstrap: ' + message);
function toFailure(error: unknown): Error {
  try {
    if (error instanceof Error && error.message.startsWith('MUI owned View bootstrap: '))
      return error;
    return fail(String(error).slice(0, 256));
  } catch {
    return fail('native preflight failed without a readable error');
  }
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return (
    Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}
function parse(raw: unknown): Metadata {
  if (typeof raw !== 'string' || raw.length > 4096)
    throw fail('native metadata is not a bounded JSON string');
  const value: unknown = JSON.parse(raw);
  const baseKeys = [
    'schema',
    'service',
    'host',
    'hostABI',
    'errorNotification',
    'ownedProgrammeProfile',
  ];
  if (
    !record(value) ||
    !baseKeys.every((key) => Object.hasOwn(value, key)) ||
    Object.keys(value).some(
      (key) =>
        ![
          ...baseKeys,
          'literalRawText',
          'generatedTextOrigin',
          'structuralCases',
          'parentStructuralCases',
        ].includes(key),
    ) ||
    value.schema !== 1 ||
    value.service !== 'owned-structural-style' ||
    value.host !== 'AltrooMUIStructuralView' ||
    value.hostABI !== 'owned-view-programme-v1' ||
    value.errorNotification !== 'async-once-per-generation-v1'
  )
    throw fail('native host/runtime capabilities are unsupported; rebuild the native app');
  const profile = value.ownedProgrammeProfile;
  if (
    !record(profile) ||
    !keys(profile, ['schema', 'rn', 'platform', 'styleKeys', ...flags]) ||
    profile.schema !== 1 ||
    typeof profile.rn !== 'string' ||
    (profile.platform !== 'ios' && profile.platform !== 'android') ||
    typeof profile.styleKeys !== 'string' ||
    !/^[a-f0-9]{64}$/.test(profile.styleKeys) ||
    flags.some((key) => typeof profile[key] !== 'boolean')
  )
    throw fail('native parsing profile is malformed');
  const checked: OwnedStyleProfile = Object.freeze({
    schema: 1,
    rn: profile.rn,
    platform: profile.platform,
    styleKeys: profile.styleKeys,
    nativeCSSParsing: profile.nativeCSSParsing as boolean,
    cppPropsIteratorSetter: profile.cppPropsIteratorSetter as boolean,
    accumulatedRawPropsAndroid: profile.accumulatedRawPropsAndroid as boolean,
    exclusivePropsAndroid: profile.exclusivePropsAndroid as boolean,
    propsReconciliationAndroid: profile.propsReconciliationAndroid as boolean,
  });
  // Historical literalRawText keys are admitted only as inert metadata tolerance.
  // Never inspect or advertise that retired alias; the generated origin is separate.
  // Optional projection support does not invalidate a valid owned View profile.
  // Own-field admission avoids inherited getters. Snapshot once into our object.
  const origin = Object.hasOwn(value, 'generatedTextOrigin')
    ? value.generatedTextOrigin
    : undefined;
  const generatedTextOrigin: GeneratedTextOrigin | undefined =
    record(origin) &&
    keys(origin, ['schema', 'nativeIDPrefix']) &&
    origin.schema === 1 &&
    origin.nativeIDPrefix === 'altroo:generated-paragraph:v1:'
      ? Object.freeze({
          schema: 1,
          nativeIDPrefix: 'altroo:generated-paragraph:v1:',
        })
      : undefined;
  return Object.freeze({
    schema: 1,
    service: 'owned-structural-style',
    host: 'AltrooMUIStructuralView',
    hostABI: 'owned-view-programme-v1',
    errorNotification: 'async-once-per-generation-v1',
    ownedProgrammeProfile: checked,
    generatedTextOrigin,
    structuralCases:
      Object.hasOwn(value, 'structuralCases') && value.structuralCases === 'first-last-of-type-v1',
    parentStructuralCases:
      Object.hasOwn(value, 'parentStructuralCases') &&
      value.parentStructuralCases === 'parent-structural-facts-v1',
  });
}
function readOnce(native: unknown): Outcome {
  if ((typeof native !== 'object' && typeof native !== 'function') || native === null)
    return Object.freeze({
      error: fail('native module is unavailable; rebuild the native app'),
    });
  const previous = cache.get(native);
  if (previous) return previous;
  let result: Outcome;
  try {
    const method = (native as Record<string, unknown>).getStructuralStyleMetadata;
    if (typeof method !== 'function')
      throw fail('native metadata method is unavailable; rebuild the native app');
    result = Object.freeze({ metadata: parse(method.call(native)) });
  } catch (error) {
    result = Object.freeze({ error: toFailure(error) });
  }
  cache.set(native, result);
  return result;
}
/** Invoke once at module initialization, outside React render. Never eagerly throws. */
export function createOwnedStyleBootstrap(
  loadNative: () => unknown,
  expected: Expected,
): OwnedStyleBootstrap {
  let profile: OwnedStyleProfile | undefined;
  let failure: Error | undefined;
  let generatedTextOrigin: GeneratedTextOrigin | undefined;
  let structuralCases = false;
  let parentStructuralCases = false;
  const originFailure = fail(
    'generated paragraph origin is unavailable or unsupported; rebuild the matching native app',
  );
  try {
    if (expected.platform !== 'ios' && expected.platform !== 'android')
      throw fail('this owned host requires iOS or Android');
    const outcome = readOnce(loadNative());
    if (outcome.error) throw outcome.error;
    const observed = outcome.metadata.ownedProgrammeProfile;
    if (
      observed.rn !== expected.rn ||
      observed.platform !== expected.platform ||
      observed.styleKeys !== expected.styleKeys
    )
      throw fail('compiled JS/native parsing profile mismatch; rebuild the native app');
    profile = observed;
    structuralCases = outcome.metadata.structuralCases;
    parentStructuralCases = structuralCases && outcome.metadata.parentStructuralCases;
    generatedTextOrigin = outcome.metadata.generatedTextOrigin;
  } catch (error) {
    failure = toFailure(error);
  }
  return Object.freeze({
    supportsStructuralCases: () => structuralCases,
    supportsParentStructuralCases: () => parentStructuralCases,
    requireProfile() {
      if (failure) throw failure;
      // The only successful initialization branch publishes this immutable profile.
      if (!profile) throw fail('initialization did not produce a parsing profile');
      return profile;
    },
    requireGeneratedTextOrigin() {
      if (failure) throw failure;
      if (!profile) throw fail('initialization did not produce a parsing profile');
      if (!generatedTextOrigin) throw originFailure;
      return generatedTextOrigin;
    },
  });
}
