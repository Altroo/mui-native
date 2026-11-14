// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Finite root selectors use retained CSS and the incoming native candidate.
// No callback replay or mutable latest-render data crosses an opaque wrapper.
import { createContext, useContext, useId, type ReactNode, type Ref } from 'react';
import { type StyleProp, type ViewInstance, type ViewProps } from 'react-native';
import {
  componentRootStyle,
  diagnostic,
  applyNativeTextMetrics,
  isNativeTextStyleProperty,
  nativeStyleTextMetrics,
  type NativeStyle,
  type StyleContext,
  type Theme,
} from '@altroo/mui-native-system';
import {
  OwnedStructuralHost,
  ownedStructuralCases,
} from '@altroo/mui-native-host/internal/structural-root';
import { mergeNativeRootStyle } from './nativeControlStyles';
import { snapshotNativeStyleProgramme } from './cardContentCandidates';
import { retainNativeRootPreparation } from '@altroo/mui-native-system/internal/prepared-style';

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
}>;
function textFacet(style: NativeStyle, metrics: Record<string, unknown>) {
  return {
    style: Object.fromEntries(
      Object.entries(style).filter(([key]) => isNativeTextStyleProperty(key)),
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
/** Only evaluate prepared declarations. Genuine native inline values remain last. */
export function prepareAccordionStructuralCases(input: Input): readonly NativeStyle[] {
  const { baseStyle: _base, rootProps: _props, ancestors: _ancestors, ...context } = input.context;
  const programme = snapshotNativeStyleProgramme(input.programme);
  const resolve = (facts?: number) => {
    const { computed, authored } = componentRootStyle(input.theme, '', {}, undefined, programme, {
      ...context,
      ...(facts === undefined
        ? {}
        : { lastChild: !!(facts & 1), firstOfType: !!(facts & 2), lastOfType: !!(facts & 4) }),
    });
    const merged = mergeNativeRootStyle(input.direction, computed, authored);
    const metrics = nativeStyleTextMetrics([computed, authored]);
    const presentation = applyNativeTextMetrics(merged, computed, metrics) ?? merged;
    return {
      text: textFacet(presentation, metrics),
      view: Object.fromEntries(
        Object.entries(presentation).filter(([key]) => !isNativeTextStyleProperty(key)),
      ),
    };
  };
  const ordinary = resolve();
  const cases = Array.from({ length: 8 }, (_, facts) => resolve(facts));
  const differentText = cases.some(
    (value) =>
      ordinary.text.direction !== value.text.direction ||
      !sameFacet(ordinary.text.style, value.text.style) ||
      !sameFacet(ordinary.text.metrics, value.text.metrics),
  );
  if (differentText) {
    // Preserve the same owned host/ref and descendant state. Ordinary text
    // scopes retain their JS behavior; no native conditional-text claim is made.
    return Array(8).fill(ordinary.view) as NativeStyle[];
  }
  return cases.map((value) => value.view);
}
/** Snapshot genuine inline data once; cache epochs only re-evaluate retained CSS.
 * Keep the projection outside component render closures so it cannot retain
 * children, prop callbacks or a newer render's input through a mutable channel.
 */
export function createAccordionStructuralPreparation(input: Input) {
  const { baseStyle: _base, rootProps: _props, ancestors: _ancestors, ...context } = input.context;
  const captured: Input = {
    theme: input.theme,
    direction: input.direction,
    context,
    programme: snapshotNativeStyleProgramme(input.programme),
  };
  const project = (): readonly NativeStyle[] =>
    retainNativeRootPreparation(Object.freeze(prepareAccordionStructuralCases(captured)), project);
  return project();
}

export function AccordionStructuralView({
  cases,
  presentation,
  style,
  nativeRef,
  children,
  ...props
}: ViewProps & {
  cases: readonly NativeStyle[];
  presentation?: NativeStyle | undefined;
  nativeRef: Ref<ViewInstance>;
  children: ReactNode;
}) {
  if (!ownedStructuralCases || !activation)
    throw Error('Native Accordion selector support is unavailable');
  // The source clock owns its animated fields even at a resting endpoint.
  // Deferring them avoids a native endpoint followed by a delayed JS snap-back.
  // Non-animated structural fields remain eligible for pre-layout selection.
  const encoded = ownedStructuralCases.encode(
    ownedStructuralCases.profile,
    cases.map((value) => ({ ...value, ...presentation })),
  );
  return (
    <OwnedStructuralHost
      {...props}
      Native={ownedStructuralCases.Native}
      activation={activation}
      ref={nativeRef}
      style={style}
      normalPaddingBottom={0}
      lastPaddingBottom={0}
      ownedProgramme={{ schema: 2, profile: ownedStructuralCases.profile, cases: encoded }}
    >
      {children}
    </OwnedStructuralHost>
  );
}
