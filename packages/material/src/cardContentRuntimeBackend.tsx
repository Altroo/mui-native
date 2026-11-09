// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Internal explicit preparation adapter. Public CardContent is not switched here.
import { createElement, useMemo } from 'react';
import { View } from 'react-native';
import {
  createOwnedStyleActivation,
  createOwnedStyleBootstrap,
  OwnedStructuralHost,
  encodeStylePair,
  type StructuralStyleStatus,
  type StructuralStyleErrorReporter,
  type OwnedStyleNative as StructuralRuntimeNative,
  type StructuralView,
  type OwnedStyleProfile as OwnedProfile,
  type OwnedProgramme,
} from '@altroo/mui-native-host/internal/owned-view';
import {
  NativeRootHandoffContext,
  nativeCooperatingRootTarget,
  type NativeRootHandoff,
  type NativeRootHandoffSnapshot,
  useNativeRootSnapshotScope,
  snapshotNativeRootCss,
  sameNativeRootCss,
  nativeRootSnapshotClassName,
  retainNativeRootSnapshotProps,
  retainNativeRootSnapshotElement,
} from '@altroo/mui-native-system/internal/prepared-style';
import { NativeStyleScope } from './nativeStyleScope';
import { diagnostic } from '@altroo/mui-native-system';
import { GENERATED_TEXT_ORIGIN_CONTRACT } from '@altroo/mui-native-system/internal/generated-paragraph';
import { createCardContentRuntime, type CardContentBackendInput } from './cardContentRuntime';
import { compileCandidates, compileCooperatingCandidates } from './cardContentCandidates';
export type { StructuralRuntimeNative };
export type RuntimeStatus = StructuralStyleStatus &
  Readonly<{
    attempts: string;
    returnedCandidates: string;
    changedCandidates: string;
    cancelledCandidates: string;
    ownedProgrammeProfile: OwnedProfile;
    scope: 'controlled-view-resolver';
    errorPolicy: 'original-candidate-returned-status-degraded';
  }>;
const fields = [
  'schema',
  'rn',
  'platform',
  'styleKeys',
  'nativeCSSParsing',
  'cppPropsIteratorSetter',
  'accumulatedRawPropsAndroid',
  'exclusivePropsAndroid',
  'propsReconciliationAndroid',
] as const;
const maximum = 18446744073709551615n;
// A stable reporter deduplicates shared hosts without making NativeHost depend
// on System. Delivery uses the already-read native error, outside React render.
const reportRuntimeError: StructuralStyleErrorReporter = (error) => {
  diagnostic(
    'structural-resolver',
    `Structural resolver failed in generation ${error.generation} (${error.code}): ${error.lastError}. Original candidate retained; runtime status is degraded.`,
  );
};
function checkedProfile(value: unknown): Readonly<OwnedProfile> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Runtime parsing profile is missing');
  const keys = Object.keys(value);
  if (keys.length !== fields.length || fields.some((key) => !Object.hasOwn(value, key)))
    throw Error('Runtime parsing profile fields differ');
  const profile = Object.fromEntries(
    fields.map((key) => [key, (value as Record<string, unknown>)[key]]),
  );
  if (
    profile.schema !== 1 ||
    profile.rn !== '0.88.1' ||
    !['ios', 'android'].includes(profile.platform as string) ||
    typeof profile.styleKeys !== 'string' ||
    !/^[a-f0-9]{64}$/.test(profile.styleKeys) ||
    fields.slice(4).some((key) => typeof profile[key] !== 'boolean')
  )
    throw Error('Runtime parsing profile is unsupported');
  return Object.freeze(profile) as Readonly<OwnedProfile>;
}
function decimal(value: unknown): value is string {
  return (
    typeof value === 'string' && /^(0|[1-9][0-9]{0,19})$/.test(value) && BigInt(value) <= maximum
  );
}
function sameHandoffSnapshot(a: NativeRootHandoffSnapshot, b: NativeRootHandoffSnapshot): boolean {
  return (
    a.classes.length === b.classes.length &&
    a.classes.every((value, index) => value === b.classes[index]) &&
    sameNativeRootCss(a.programme, b.programme)
  );
}
/** Call during explicit preparation/effects or native-observation events, never render. */
export function prepareRuntimeCardContent({
  native,
  StructuralView: Native,
  profile,
}: {
  native: StructuralRuntimeNative;
  StructuralView: StructuralView;
  profile: OwnedProfile;
}) {
  const expected = checkedProfile(profile);
  // Validate the exact injected controller before status reads, leases or rendering.
  // The bootstrap shares its immutable readOnce cache with ordinary host readiness.
  const bootstrap = createOwnedStyleBootstrap(() => native, expected);
  const nativeProfile = bootstrap.requireProfile();
  if (fields.some((key) => nativeProfile[key] !== expected[key]))
    throw Error('Producer/native runtime profile mismatch');
  const origin = bootstrap.requireGeneratedTextOrigin();
  if (
    origin.schema !== GENERATED_TEXT_ORIGIN_CONTRACT.schema ||
    origin.nativeIDPrefix !== GENERATED_TEXT_ORIGIN_CONTRACT.nativeIDPrefix
  )
    throw Error('System/native generated paragraph origin contract mismatch');
  const activation = createOwnedStyleActivation(native);
  const hostActivation = Object.freeze({
    acquire: () => activation.acquire(reportRuntimeError),
  });
  const observeStatus = (): RuntimeStatus => {
    const status = activation.getStatus() as StructuralStyleStatus & Record<string, unknown>;
    const observed = checkedProfile(status.ownedProgrammeProfile);
    if (fields.some((key) => observed[key] !== expected[key]))
      throw Error('Producer/native runtime profile mismatch');
    if (
      status.scope !== 'controlled-view-resolver' ||
      status.errorPolicy !== 'original-candidate-returned-status-degraded' ||
      ['attempts', 'returnedCandidates', 'changedCandidates', 'cancelledCandidates'].some(
        (key) => !decimal(status[key]),
      )
    )
      throw Error('Runtime status counters/scope are unsupported');
    return Object.freeze({
      ...status,
      ownedProgrammeProfile: observed,
    }) as RuntimeStatus;
  };
  const initialStatus = observeStatus();
  // An inactive error is retained history. The next successful owned generation
  // resets it. An active degraded service cannot be advertised as healthy startup.
  if (initialStatus.active && initialStatus.degraded)
    throw Error('Active structural runtime is degraded: ' + initialStatus.lastError);
  // Isolate callbacks from the producer hook environment. Retained snapshot
  // props must not accidentally retain that environment's weak owner table.
  function createHandoff(
    target: object,
    compilerInput: Parameters<typeof compileCooperatingCandidates>[0],
    rootRef: CardContentBackendInput['rootRef'],
    classes: readonly string[],
  ): NativeRootHandoff {
    return Object.freeze({
      target,
      prepare: (root) => compileCooperatingCandidates(compilerInput, root),
      render: (output) => {
        const pair = encodeStylePair(
          expected,
          { ...output.preparation.normal },
          { ...output.preparation.last },
        );
        const programme: OwnedProgramme = {
          schema: 1,
          profile: expected,
          normal: pair.normal,
          last: pair.last,
        };
        return (
          <NativeStyleScope
            root={rootRef}
            theme={output.theme}
            classes={Array.from(new Set([...classes, ...output.classes]))}
            prepared={output.preparation.prepared}
          >
            <OwnedStructuralHost
              {...output.hostProps}
              activation={hostActivation}
              Native={Native}
              ref={output.nativeRef}
              style={output.presentation}
              normalPaddingBottom={0}
              lastPaddingBottom={0}
              ownedProgramme={programme}
            >
              {output.children}
            </OwnedStructuralHost>
          </NativeStyleScope>
        );
      },
    });
  }
  function CooperatingBackend(input: CardContentBackendInput) {
    const snapshots = useNativeRootSnapshotScope('handoff', sameHandoffSnapshot);
    const Root = input.Root;
    const target = nativeCooperatingRootTarget(Root);
    if (!input.cooperation || !target)
      throw Error('Runtime CardContent requires View/div or an exact first-party cooperating root');
    const classes = Object.freeze([...(input.styleContext.classes ?? [])]);
    const css = snapshotNativeRootCss(input.styleProgram);
    const rootRef = input.rootRef;
    const compilerInput = { styleProgram: css, styleContext: { classes } };
    const source = useMemo(() => Object.freeze({ target, snapshots }), [target, snapshots]);
    const handoff = createHandoff(target, compilerInput, rootRef, classes);
    const record = snapshots.publish(Object.freeze({ handoff, programme: css, classes }));
    const element = createElement(
      Root,
      {
        ...input.cooperation.props,
        ref: input.nativeRef,
        className: nativeRootSnapshotClassName(input.cooperation.props.className, record),
      },
      input.children,
    );
    retainNativeRootSnapshotProps(element.props as object, record);
    return retainNativeRootSnapshotElement(
      <NativeRootHandoffContext.Provider value={source}>
        {element}
      </NativeRootHandoffContext.Provider>,
      record,
    );
  }
  function Backend(input: CardContentBackendInput) {
    if (input.Root !== View) return <CooperatingBackend {...input} />;
    const candidates = compileCandidates(input);
    const pair = encodeStylePair(expected, { ...candidates.normal }, { ...candidates.last });
    const programme: OwnedProgramme = {
      schema: 1,
      profile: expected,
      normal: pair.normal,
      last: pair.last,
    };
    return (
      <OwnedStructuralHost
        {...input.hostProps}
        activation={hostActivation}
        Native={Native}
        ref={input.nativeRef}
        style={input.unselectedPresentation}
        normalPaddingBottom={0}
        lastPaddingBottom={0}
        ownedProgramme={programme}
      >
        {input.children}
      </OwnedStructuralHost>
    );
  }
  return Object.freeze({
    CardContent: createCardContentRuntime(Backend),
    profile: expected,
    observeStatus,
    initialStatus,
  });
}
export type PreparedRuntimeCardContent = ReturnType<typeof prepareRuntimeCardContent>;
