// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Finite root selectors use retained CSS and the incoming native candidate.
// No callback replay or mutable latest-render data crosses an opaque wrapper.
import {
  createContext,
  useContext,
  useId,
  type ReactNode,
  type Ref,
  type ComponentProps,
} from 'react';
import { type StyleProp, type ViewInstance, type ViewProps } from 'react-native';
import {
  NativeTextScope,
  componentRootStyle,
  diagnostic,
  applyNativeTextMetrics,
  isNativeTextStyleProperty,
  nativeStyleTextMetrics,
  type NativeStyle,
  type StyleContext,
  type Theme,
  type NativePreparedStyle,
  type NativeTextScopeValue,
} from '@altroo/mui-native-system';
import {
  OwnedStructuralHost,
  ownedStructuralCases,
  prepareNativeTextColorBank,
  supportsNativeTextColors,
  supportsNativeTextMetrics,
  prepareNativeMetricBank,
  type OwnedMetricBank,
  type NativeMetricStep,
  type OwnedTextColorBank,
} from '@altroo/mui-native-host/internal/structural-root';
import type { CSSPeerObservation, OwnedProgramme } from '@altroo/mui-native-host/internal/css-peer';
import { mergeNativeRootStyle } from './nativeControlStyles';
import { snapshotNativeStyleProgramme } from './cardContentCandidates';
import {
  NativeCssPeerView,
  nativeColorSource,
  nativeTextColorBinding,
  retainNativeRootPreparation,
  nativeMetricViewPlan,
  nativeMetricBasis,
  nativeMetricBinding,
  nativeMetricState,
} from '@altroo/mui-native-system/internal/prepared-style';

const reportRuntimeError: Parameters<
  NonNullable<typeof ownedStructuralCases>['activation']['acquire']
>[0] = (error) =>
  diagnostic(
    'structural-resolver',
    `Structural resolver failed in generation ${error.generation} (${error.code}): ${error.lastError}. Original candidate retained; runtime status is degraded.`,
  );
const runtime = ownedStructuralCases;
const activation = runtime
  ? Object.freeze({ acquire: () => runtime.activation.acquire(reportRuntimeError) })
  : undefined;

export const AccordionStructuralRootContext = createContext<string | null>(null);
/** Stable identity only. All style input stays bound to the actual forwarded props. */
export function useAccordionStructuralRootMarker(): string | undefined {
  const id = useId();
  return ownedStructuralCases
    ? 'altroo-accordion-root-' +
        Array.from(id, (char) => char.codePointAt(0)!.toString(16)).join('_')
    : undefined;
}
export function useAccordionStructuralRoot(className: unknown): boolean {
  const marker = useContext(AccordionStructuralRootContext);
  return (
    !!ownedStructuralCases &&
    marker !== null &&
    typeof className === 'string' &&
    className.split(/\s+/).includes(marker)
  );
}
type Input = Readonly<{
  theme: Theme;
  programme: StyleProp<NativeStyle>;
  context: StyleContext;
  direction: 'ltr' | 'rtl';
  parent?: NativeTextScopeValue | undefined;
}>;
function textFacet(style: NativeStyle, metrics: Record<string, unknown>) {
  return {
    style: Object.fromEntries(
      // Color stays in the text scope but cannot invalidate View layout cases.
      Object.entries(style).filter(([key]) => key !== 'color' && isNativeTextStyleProperty(key)),
    ),
    metrics,
    direction: style.direction,
  };
}
function sameFacet(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]))
  );
}
const colorBanks = new WeakMap<object, OwnedTextColorBank>();
const metricBanks = new WeakMap<object, OwnedMetricBank>();
const metricKeys = new Set(['fontSize', 'lineHeight', 'letterSpacing']);
function withoutMetrics(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !metricKeys.has(key)));
}
function onlyMetrics(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => metricKeys.has(key)));
}
const colorBarriers = new WeakMap<object, number>();
/** Only evaluate prepared declarations. Genuine native inline values remain last. */
export function prepareAccordionStructuralCases(input: Input): readonly NativeStyle[] {
  const { baseStyle: _base, rootProps: _props, ancestors: _ancestors, ...context } = input.context;
  const programme = snapshotNativeStyleProgramme(input.programme);
  // Match NativeTextScope's View inheritance basis, including a colorless
  // explicit parent versus the default scope at the top of the tree.
  const inheritedColor = input.parent ? input.parent.style.color : input.theme.palette.text.primary;
  const resolve = (facts?: number) => {
    const { computed, authored } = componentRootStyle(input.theme, '', {}, undefined, programme, {
      ...context,
      captureMetricPlan: supportsNativeTextMetrics,
      ...(facts === undefined
        ? {}
        : { lastChild: !!(facts & 1), firstOfType: !!(facts & 2), lastOfType: !!(facts & 4) }),
    });
    const merged = mergeNativeRootStyle(input.direction, computed, authored);
    const metrics = nativeStyleTextMetrics([computed, authored]);
    const presentation = applyNativeTextMetrics(merged, computed, metrics) ?? merged;
    const basis = nativeMetricBasis(computed);
    return {
      metricBasis: basis,
      metricInput: { presentation, metrics },
      color: presentation.color ?? inheritedColor,
      colorBarrier: nativeColorSource(presentation) === 'authored' && presentation.color != null,
      text: textFacet(presentation, metrics),
      view: Object.fromEntries(
        Object.entries(presentation).filter(([key]) => !isNativeTextStyleProperty(key)),
      ),
    };
  };
  const ordinary = resolve();
  const cases = Array.from({ length: 8 }, (_, facts) => resolve(facts));
  const differentMetrics = cases.some(
    (value) =>
      !sameFacet(onlyMetrics(ordinary.text.style), onlyMetrics(value.text.style)) ||
      !sameFacet(onlyMetrics(ordinary.text.metrics), onlyMetrics(value.text.metrics)),
  );
  const parentMetrics = nativeMetricBinding(input.parent);
  const baseMetrics = input.parent
    ? nativeMetricState(input.parent)
    : ordinary.metricBasis
      ? ([ordinary.metricBasis.rootSize, null, null, null] as const)
      : undefined;
  const metricPlan = (value: typeof ordinary) =>
    value.metricBasis
      ? nativeMetricViewPlan(
          value.metricInput.presentation,
          value.metricInput.metrics,
          value.metricBasis,
        )
      : undefined;
  const plans =
    supportsNativeTextMetrics && (differentMetrics || parentMetrics)
      ? [ordinary, ...cases].map(metricPlan)
      : undefined;
  const metricsBank =
    supportsNativeTextMetrics &&
    (differentMetrics || parentMetrics) &&
    baseMetrics &&
    plans?.[0] &&
    plans.every((value) => value)
      ? prepareNativeMetricBank(
          plans.slice(1) as NativeMetricStep[],
          plans[0],
          baseMetrics,
          parentMetrics,
        )
      : undefined;
  const facet = metricsBank ? withoutMetrics : (value: Record<string, unknown>) => value;
  const differentText = cases.some(
    (value) =>
      ordinary.text.direction !== value.text.direction ||
      !sameFacet(facet(ordinary.text.style), facet(value.text.style)) ||
      !sameFacet(facet(ordinary.text.metrics), facet(value.text.metrics)),
  );
  if (differentText) {
    // Preserve the same owned host/ref and descendant state. Ordinary text
    // scopes retain their JS behavior; no native conditional-text claim is made.
    return Array(8).fill(ordinary.view) as NativeStyle[];
  }
  const views = cases.map((value) => value.view);
  if (metricsBank) metricBanks.set(views, metricsBank);
  const barriers = [...cases, ordinary].reduce(
    (mask, value, index) => mask | (value.colorBarrier ? 1 << index : 0),
    0,
  );
  if (supportsNativeTextColors) colorBarriers.set(views, barriers);
  const bank = prepareNativeTextColorBank(
    cases.map((value) => value.color),
    ordinary.color,
    barriers,
    nativeTextColorBinding(input.parent),
  );
  if (bank) colorBanks.set(views, bank);
  return views;
}
/** Snapshot genuine inline data once; cache epochs only re-evaluate retained CSS.
 * Keep the projection outside component render closures so it cannot retain
 * children, prop callbacks or a newer render's input through a mutable channel.
 */
export function createAccordionStructuralPreparation(input: Input) {
  const { baseStyle: _base, rootProps: _props, ancestors: _ancestors, ...context } = input.context;
  const captured: Input = {
    theme: input.theme,
    parent: input.parent,
    direction: input.direction,
    context,
    programme: snapshotNativeStyleProgramme(input.programme),
  };
  const project = (): readonly NativeStyle[] =>
    retainNativeRootPreparation(Object.freeze(prepareAccordionStructuralCases(captured)), project);
  return project();
}

/** Bind only at the actual cooperating root, after its final CSS/native merge. */
export function AccordionRootTextScope({
  cases,
  owner,
  ...props
}: ComponentProps<typeof NativeTextScope> & {
  cases?: readonly NativeStyle[] | undefined;
  owner?: string | undefined;
}) {
  const marker = useContext(AccordionStructuralRootContext);
  const bank = cases ? colorBanks.get(cases) : undefined;
  const metrics = cases ? metricBanks.get(cases) : undefined;
  const source = owner ?? marker;
  return (
    <NativeTextScope
      {...props}
      colorBinding={source && bank ? { owner: source, key: bank.key } : undefined}
      metricBinding={source && metrics ? { owner: source, key: metrics.key, steps: [] } : undefined}
    />
  );
}

export function AccordionStructuralView({
  cases,
  basis,
  presentation,
  style,
  nativeRef,
  children,
  prepared,
  classNames,
  observation,
  ...props
}: ViewProps & {
  cases?: readonly NativeStyle[] | undefined;
  prepared?: NativePreparedStyle | undefined;
  classNames?: readonly string[] | undefined;
  basis?: 'parent' | undefined;
  observation?: CSSPeerObservation | null | undefined;
  presentation?: NativeStyle | undefined;
  nativeRef: Ref<ViewInstance>;
  children: ReactNode;
}) {
  const marker = useContext(AccordionStructuralRootContext);
  if (cases && (!ownedStructuralCases || !activation))
    throw Error('Native Accordion selector support is unavailable');
  const owner = ownedStructuralCases?.parentSelectors && marker ? marker : undefined;
  if (basis && !owner) throw Error('Native Accordion parent selection requires its source owner');
  // The source clock owns its animated fields even at a resting endpoint.
  // Deferring them avoids a native endpoint followed by a delayed JS snap-back.
  // Non-animated structural fields remain eligible for pre-layout selection.
  const encoded =
    cases && ownedStructuralCases
      ? (cases.length === 16 ? ownedStructuralCases.encodeAdjacent : ownedStructuralCases.encode)(
          ownedStructuralCases.profile,
          cases.map((value) => ({ ...value, ...presentation })),
        )
      : undefined;
  if (cases?.length === 16 && (!owner || basis !== 'parent'))
    throw Error('Adjacent cases require their source parent');
  const programme: OwnedProgramme | undefined =
    encoded && ownedStructuralCases
      ? cases?.length === 16
        ? {
            schema: 3,
            profile: ownedStructuralCases.profile,
            cases: encoded,
            basis: 'parent',
            owner: owner!,
            observation: observation ?? null,
          }
        : {
            schema: 2,
            profile: ownedStructuralCases.profile,
            cases: encoded,
            ...(basis ? { basis } : {}),
            ...(owner ? { owner } : {}),
            ...(!basis && owner && cases && colorBarriers.has(cases)
              ? { textColorBarriers: colorBarriers.get(cases)! }
              : {}),
            ...(!basis && owner && cases && metricBanks.has(cases)
              ? { textMetrics: metricBanks.get(cases)! }
              : {}),
            ...(!basis && owner && cases && colorBanks.has(cases)
              ? { textColors: colorBanks.get(cases)! }
              : {}),
          }
      : undefined;
  // A constant leaf component preserves body state if an opaque root changes
  // which classes it forwards. Mode changes are props on the same v2 host.
  if (prepared)
    return (
      <NativeCssPeerView
        {...props}
        ref={nativeRef}
        style={style}
        prepared={prepared}
        classNames={classNames ?? []}
        selector={
          programme && ownedStructuralCases && activation
            ? {
                Host: OwnedStructuralHost,
                Native: ownedStructuralCases.Native,
                activation,
                programme,
              }
            : undefined
        }
      >
        {children}
      </NativeCssPeerView>
    );
  if (!programme || !ownedStructuralCases || !activation)
    throw Error('A selector-only native root requires its cases');
  return (
    <OwnedStructuralHost
      {...props}
      Native={ownedStructuralCases.Native}
      activation={activation}
      ref={nativeRef}
      style={style}
      normalPaddingBottom={0}
      lastPaddingBottom={0}
      ownedProgramme={programme}
    >
      {children}
    </OwnedStructuralHost>
  );
}

/** Immutable binary readiness; an older app keeps its existing ordinary ornament. */
export const hasAccordionParentSelectors = ownedStructuralCases?.parentSelectors === true;
