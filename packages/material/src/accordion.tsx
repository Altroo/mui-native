/* Accordion composition, event ordering and slots adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/accordion.json.
 * Native layout and interaction: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
 * Details contract observations: upstream/accordion-details.json. */
import React, { createContext, forwardRef, useCallback, useContext, useMemo } from 'react';
import {
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
  type ViewInstance,
  type StyleProp,
} from 'react-native';
import {
  NativeTextScope,
  NativeTextStyleContext,
  useNativeTextRootRef,
  useNativeTextContext,
  nativeTextStyleContext,
  useNativeRootProps,
  joinClassNames,
  applyNativeTextMetrics,
  nativeStyleTextMetrics,
  nativeStyleBorderDeclarations,
  copyNativeBorderStyle,
  resolveSlotProps,
  componentRootStyle,
  componentStyle,
  type NativeTextScopeValue,
  type NativeStyle,
  type Theme,
  type SxProps,
} from '@altroo/mui-native-system';
import {
  NativeCssInsertionScope,
  nativeCooperatingRootTarget,
  nativeMemoType,
  retainNativeRootCss,
  refreshNativeStyle,
  prepareNativeCompositeSource,
  nativeInlineStyle,
  useNativeStyleCache,
  useNativeStyleCacheRevision,
  useNativeDefaultPropsSource,
} from '@altroo/mui-native-system/internal/prepared-style';
import { NativeStructuralFactsContext } from '@altroo/mui-native-system/internal/prepared-style';
import {
  useAccordionStructure,
  accordionBeforeOrigin,
  AccordionPeerObservationContext,
  type AccordionStructure,
} from './accordionStructure';
import { useAccordionMotion } from './accordionMotion';
import { accordionBeforeStyle, accordionBeforeCases } from './accordionBeforeStyles';
import { ownedStructuralCases } from '@altroo/mui-native-host/internal/structural-root';
import {
  AccordionStructuralRootContext,
  AccordionStructuralView,
  useAccordionStructuralRootMarker,
  prepareAccordionStructuralCases,
  hasAccordionParentSelectors,
} from './accordionStructuralRoot';
import {
  accordionConstructorCss,
  accordionOverrideCss,
  accordionMotionTiming,
} from './nativeAccordionCss';
import { AccordionRootMotionScope, AccordionRootMotionBoundary } from './accordionRootMotion';
import { NativeButtonGroupRules } from './buttonGroupContext';
import { NativeStyleScope, nativeStyleAncestors, useNativeStyleRef } from './nativeStyleScope';
import { Paper } from './layout';
import { NativeRootTextBoundary } from './nativeRootTextBoundary';
import {
  ButtonBase,
  type ButtonBaseState,
  type NativeButtonBaseStyleSheet,
  type ButtonBaseActivationEvent,
} from './buttonBase';
import { Collapse } from './collapse';
import { useControlled } from './formState';
import { useTheme, useNativeStyledTheme, useComponentRootStyle } from './themeProvider';
import { useForkRef } from './utils';
import {
  accordionClasses,
  getAccordionActionsUtilityClass,
  getAccordionUtilityClass,
  getAccordionSummaryUtilityClass,
  getAccordionDetailsUtilityClass,
} from './accordionClasses';
import { mergeNativeRootStyle } from './nativeControlStyles';
import type {
  AccordionProps,
  NativeAccordionComponent,
  AccordionRootSlotProps,
  AccordionOwnerState,
  AccordionSummaryProps,
  AccordionSummaryOwnerState,
  AccordionSummaryRootSlotProps,
  NativeAccordionSlotProps,
  AccordionDetailsProps,
  AccordionActionsProps,
} from './accordionTypes';
export * from './accordionTypes';
export * from './accordionClasses';

interface ExpansionContext {
  expanded: boolean;
  disabled: boolean;
  disableGutters: boolean;
  toggle: (event: ButtonBaseActivationEvent) => void;
}
// Only the summary receives this scope. A nested body accordion owns its own state.
const AccordionContext = createContext<ExpansionContext | null>(null);
// Preserve source slot order and the two reads of a truthy authored class getter.
function slotClasses<Slots extends Record<string, readonly (string | false | undefined)[]>>(
  slots: Slots,
  utility: (slot: string) => string,
  supplied?: object,
): Record<keyof Slots, string> {
  const custom = supplied as Record<string, string | undefined> | undefined;
  return Object.fromEntries(
    Object.entries(slots).map(([key, names]) => [
      key,
      names
        .filter((name): name is string => !!name)
        .map((name) => {
          const generated = utility(name);
          return custom?.[name] ? generated + ' ' + custom[name] : generated;
        })
        .join(' '),
    ]),
  ) as Record<keyof Slots, string>;
}
// Adapt useSlot's layout-only merge order. className is read before copying;
// style may be read again for the optional shallow merge, and ref is read last.
// All other accessors are observed only by the copy, keeping callback inputs and
// the selected native presentation on the same authored values.
function mergeLayoutSlot<
  P extends {
    className?: string | undefined;
    style?: StyleProp<NativeStyle>;
    ref?: React.Ref<ViewInstance> | undefined;
  },
>(slot: P, externalStyle?: StyleProp<NativeStyle>) {
  const className = slot.className;
  const props = { ...slot };
  let inline = props.style;
  if (externalStyle || slot.style) {
    const slotStyle = slot.style;
    // Source spreads native declarations once. Keep the selected slot layer
    // as owned data, so later text/border normalization cannot replay getters.
    let snapshot: NativeStyle | undefined;
    if (Array.isArray(slotStyle)) snapshot = nativeStyleBorderDeclarations(slotStyle);
    else {
      const flat = StyleSheet.flatten(slotStyle);
      if (flat) snapshot = copyNativeBorderStyle(flat, { ...flat });
    }
    const selected = applyNativeTextMetrics(
      snapshot,
      snapshot ?? {},
      nativeStyleTextMetrics(slotStyle),
    );
    const merged = { ...StyleSheet.flatten(externalStyle), ...selected };
    if (Object.keys(merged).length) {
      props.style = merged;
      inline = selected;
    }
  }
  return { props, className, inline, ref: slot.ref };
}
function frameSlot<P extends Parameters<typeof mergeLayoutSlot>[0]>(
  slot: P,
  generatedClass = true,
) {
  const merged = mergeLayoutSlot(slot);
  return {
    ...merged.props,
    // Transition has no generated class. An empty first getter read must not
    // replace the copied value or introduce an absent className property.
    ...(generatedClass || joinClassNames(merged.className) ? { className: merged.className } : {}),
    ref: merged.ref,
  };
}
interface FrameProps {
  name: string;
  className?: string;
  slot?: string;
  ownerState: object;
  resolved?: NativeAccordionSlotProps<any>;
  component?: React.ComponentType<any>;
  base?: SxProps;
  states?: string[];
  overrideKeys?: string[];
  children?: React.ReactNode;
}
const EMPTY_SLOT_PROPS: NonNullable<FrameProps['resolved']> = Object.freeze({});
const Frame = forwardRef<ViewInstance, FrameProps>(function Frame(
  {
    name,
    className,
    slot = 'root',
    ownerState: canonicalOwner,
    resolved = EMPTY_SLOT_PROPS,
    component: Component,
    base,
    states,
    overrideKeys,
    children,
  },
  forwarded,
) {
  const parent = useNativeTextContext();
  const {
    sx,
    style,
    className: slotClassName,
    component,
    as,
    ownerState: suppliedOwner,
    ref: slotRef,
    children: _children,
    id,
    ...native
  } = resolved;
  const hostProps: Record<string, unknown> = { ...native };
  const theme = useNativeStyledTheme(hostProps.theme as Theme | undefined);
  const owner = useMemo(
    () => ({ ...suppliedOwner, ...canonicalOwner }),
    [suppliedOwner, canonicalOwner],
  );
  const ref = useForkRef(slotRef, forwarded);
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
  const nativeRef = useNativeStyleRef(scopeRoot, scopeRef);
  const styledSlot = !Component;
  const selected = Component || component || as || View;
  const Element = typeof selected === 'string' ? View : selected;
  const cooperatingRoot = Element === Paper || nativeCooperatingRootTarget(Element) !== undefined;
  const fullClassName = joinClassNames(className, slotClassName);
  const ancestry = useContext(NativeButtonGroupRules);
  const styleCache = useNativeStyleCache();
  const { width } = useWindowDimensions();
  useNativeStyleCacheRevision();
  // A custom slot replaces the named constructor; as/component only replace
  // its terminal host. Keep raw sx for custom slots and run named CSS solely
  // for the default constructor, preserving useSlot's ownership boundary.
  const arguments_ = {
    ...resolved,
    ...(component ? { as: component } : {}),
    className: fullClassName,
    ref: nativeRef,
    ownerState: owner,
    children,
    theme,
  };
  delete arguments_.component;
  const source = useMemo(
    () =>
      componentRootStyle(
        theme,
        styledSlot ? name : '',
        owner,
        styledSlot ? sx : undefined,
        style,
        {
          styleCache,
          slot,
          rootSlot: slot,
          width,
          classes: fullClassName.split(/\s+/).filter(Boolean),
          styledProps: arguments_,
          skipVariants: slot !== 'root',
          states,
          overrideKeys: styledSlot ? overrideKeys : [],
          baseStyle: styledSlot ? base : undefined,
        },
        true,
      ),
    [
      theme,
      styledSlot,
      name,
      owner,
      sx,
      style,
      styleCache,
      slot,
      width,
      fullClassName,
      cooperatingRoot,
      states,
      overrideKeys,
      base,
      resolved,
      nativeRef,
      children,
      component,
    ],
  );
  const computed = componentStyle(theme, styledSlot ? name : '', owner, undefined, {
    preparedRoot: source.prepared,
    styleCache,
    width,
    classes: fullClassName.split(/\s+/).filter(Boolean),
    ancestors: nativeStyleAncestors(ancestry, {
      classes: fullClassName.split(/\s+/).filter(Boolean),
    }),
    states,
    ...nativeTextStyleContext(parent, source.authored, theme),
  });
  const motionProperty =
    styledSlot && name === 'MuiAccordionSummary'
      ? slot === 'expandIconWrapper'
        ? 'transform'
        : slot === 'content'
          ? 'margin'
          : undefined
      : undefined;
  const motionDisabled = slot === 'content' && 'disableGutters' in owner && owner.disableGutters;
  // Resolve presentation on the final physical host, including styling-aware
  // terminals hidden behind memo/forwardRef wrappers. The outer boundary is
  // only a fallback when no deeper Box/Paper claims that same element.
  const terminalTiming = useMemo(
    () =>
      motionProperty
        ? {
            // Preserve the host and its last numeric endpoint when the source
            // removes this transition, so re-enabling gutters can animate again.
            declaration: motionDisabled
              ? 'none'
              : theme.transitions.create(
                  motionProperty === 'margin' ? ['margin'] : motionProperty,
                  {
                    duration: theme.transitions.duration.shortest,
                  },
                ),
          }
        : undefined,
    [theme, motionProperty, motionDisabled],
  );
  const renderElement = (viewStyle: StyleProp<NativeStyle>, fallback?: NativeTextScopeValue) => (
    <Element
      {...hostProps}
      nativeID={id ?? native.nativeID}
      ref={cooperatingRoot ? scopeRef : nativeRef}
      {...(Element === View || Element === Text ? {} : { className: fullClassName })}
      {...(!styledSlot && Element !== View && Element !== Text
        ? {
            ownerState: owner,
            ...(Object.hasOwn(resolved, 'sx') ? { sx } : {}),
            ...(component || Object.hasOwn(resolved, 'as') ? { as: component || as } : {}),
          }
        : {})}
      style={viewStyle}
    >
      {fallback ? (
        <NativeRootTextBoundary
          parent={parent}
          fallback={fallback}
          rootRef={scopeRoot}
          theme={theme}
        >
          {children}
        </NativeRootTextBoundary>
      ) : (
        children
      )}
    </Element>
  );
  if (styledSlot) {
    delete hostProps.theme;
    // Non-root styled slots forward classes to authored terminals. Physical
    // View/Text hosts consume that metadata locally rather than receiving it.
    if (slot === 'root' || Element === View || Element === Text) delete hostProps.classes;
  }
  // Cooperating roots evaluate retained CSS on their own host. Opaque wrappers
  // start from the physical parent's text context and publish their own result
  // when available; the fallback boundary covers a plain native View wrapper.
  const renderResult = (presentation: StyleProp<NativeStyle>) =>
    cooperatingRoot ? (
      renderElement(source.programme)
    ) : (
      <NativeStyleScope
        root={scopeRoot}
        theme={theme}
        classes={fullClassName.split(/\s+/).filter(Boolean)}
        prepared={source.prepared}
      >
        <NativeTextScope theme={theme} style={presentation}>
          {(viewStyle, _content, fallback) => (
            <NativeTextStyleContext.Provider value={parent}>
              {renderElement(
                retainNativeRootCss(
                  source.authored,
                  source.programme,
                  Object.hasOwn(resolved, 'style'),
                  viewStyle,
                ),
                fallback,
              )}
            </NativeTextStyleContext.Provider>
          )}
        </NativeTextScope>
      </NativeStyleScope>
    );
  const merged = mergeNativeRootStyle(
    parent?.direction ?? theme.direction,
    computed,
    source.authored,
  );
  const frameStyle =
    applyNativeTextMetrics(merged, computed, nativeStyleTextMetrics([computed, source.authored])) ??
    merged;
  return (
    <NativeCssInsertionScope
      style={source.computed}
      registerClass={Element !== View && Element !== Text}
    >
      {motionProperty ? (
        <AccordionRootMotionScope
          root={scopeRoot}
          theme={theme}
          ready
          timing={terminalTiming}
          property={motionProperty}
        >
          {(motion) => (
            <AccordionRootMotionBoundary scope={motion} root={scopeRoot} style={frameStyle}>
              {renderResult}
            </AccordionRootMotionBoundary>
          )}
        </AccordionRootMotionScope>
      ) : (
        renderResult(frameStyle)
      )}
    </NativeCssInsertionScope>
  );
});

// Native has no browser pseudo-elements. This ornament consumes retained
// ancestor CSS, including Paper/custom-root overrides, while taking no layout,
// pointer, or accessibility space. Its reserved origin is not a source sibling.
function AccordionBefore({
  sourceTheme,
  timing,
}: {
  sourceTheme: Theme;
  timing: Readonly<{ declaration: unknown }> | undefined;
}) {
  const theme = useTheme();
  const parent = useNativeTextContext();
  const rules = useContext(NativeButtonGroupRules);
  const styleCache = useNativeStyleCache();
  const { width } = useWindowDimensions();
  useNativeStyleCacheRevision();
  const marker = useContext(AccordionStructuralRootContext);
  const observation = useContext(AccordionPeerObservationContext);
  const context = { styleCache, width, ...nativeTextStyleContext(parent, undefined, theme) };
  const style = accordionBeforeStyle(theme, rules, context);
  const cases =
    hasAccordionParentSelectors && marker
      ? accordionBeforeCases(
          theme,
          rules,
          context,
          marker,
          ownedStructuralCases?.peerSelectors === true,
        )
      : undefined;
  // CSS cancels transitions under display:none. A later structural reveal
  // starts at its current endpoint instead of exposing a hidden stale sample.
  const presentation = useAccordionMotion(
    style,
    sourceTheme,
    !timing || style.display === 'none' || !Object.keys(style).length ? undefined : 'before',
    undefined,
    timing,
  );
  if (!Object.keys(style).length && !cases?.some((value) => Object.keys(value).length)) return null;
  const native = {
    nativeID: accordionBeforeOrigin,
    testID: 'mui-accordion-before',
    pointerEvents: 'none' as const,
    accessible: false,
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants' as const,
  };
  return cases ? (
    <AccordionStructuralView
      {...native}
      nativeRef={null}
      cases={cases}
      basis="parent"
      observation={observation}
      style={[style, presentation]}
      presentation={presentation}
    >
      {null}
    </AccordionStructuralView>
  ) : (
    <View {...native} style={[style, presentation]} />
  );
}

// Cache readiness is separate from physical text handoff registration. Only
// canonical memo metadata reveals Paper here; opaque roots are never executed.
function hasPaperCacheBoundary(root: unknown): boolean {
  let candidate = root;
  const seen = new Set<object>();
  for (let depth = 0; depth < 128; depth++) {
    if (candidate === Paper) return true;
    if (!candidate || (typeof candidate !== 'object' && typeof candidate !== 'function'))
      return false;
    if (seen.has(candidate)) return false;
    seen.add(candidate);
    candidate = nativeMemoType(candidate);
  }
  return false;
}

// Structural notifications repaint retained CSS in this small boundary. They
// must not rerun caller slot getters, owner callbacks, or recreate body children.
function AccordionStructureBoundary({
  root,
  expanded,
  sourceCss,
  observeCache,
  children,
}: {
  root: React.RefObject<ViewInstance | null>;
  expanded: boolean;
  sourceCss: string | undefined;
  observeCache: boolean;
  children(structure: AccordionStructure): React.ReactNode;
}) {
  // Rebind accepted CSS here, without replaying the outer caller's preparation.
  // Direct/opaque View roots lack Paper/Box's boundary. Subscribing known
  // cooperating roots here would replay their own source style callbacks.
  useNativeStyleCacheRevision(observeCache);
  const structure = useAccordionStructure(root, expanded, sourceCss);
  return (
    <NativeStructuralFactsContext.Provider value={structure}>
      <AccordionPeerObservationContext.Provider value={structure.peerObservation ?? null}>
        {children(structure)}
      </AccordionPeerObservationContext.Provider>
    </NativeStructuralFactsContext.Provider>
  );
}

const AccordionImpl: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<AccordionProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, AccordionProps>(function Accordion(inProps, forwarded) {
  const { props, style: preparedStyle } = useNativeRootProps({
    props: inProps,
    name: 'MuiAccordion',
  });
  const {
    children,
    defaultExpanded = false,
    disabled = false,
    disableGutters = false,
    expanded: expandedProp,
    onChange,
    slots = {},
    slotProps = {},
    component,
    sx,
    style,
    classes,
    className,
    ...other
  } = props;
  const [expanded, setExpanded] = useControlled(expandedProp, defaultExpanded);
  const toggle = useCallback(
    (event: ButtonBaseActivationEvent) => {
      setExpanded(!expanded);
      onChange?.(event, !expanded);
    },
    [expanded, onChange, setExpanded],
  );
  const context = useMemo(
    () => ({ expanded, disabled, disableGutters, toggle }),
    [expanded, disabled, disableGutters, toggle],
  );
  const owner: AccordionOwnerState = { ...props, expanded, disabled, disableGutters };
  const composed = slotClasses(
    {
      root: [
        'root',
        !props.square && 'rounded',
        expanded && 'expanded',
        disabled && 'disabled',
        !disableGutters && 'gutters',
      ],
      heading: ['heading'],
      region: ['region'],
    },
    getAccordionUtilityClass,
    classes,
  );
  const mergedRoot = mergeLayoutSlot(resolveSlotProps(slotProps.root, owner) ?? {}, style);
  const root = mergedRoot.props;
  const rootStyle = mergedRoot.inline;
  const rootSlotClass = mergedRoot.className;
  const slotRef = mergedRoot.ref;
  const heading = frameSlot(resolveSlotProps(slotProps.heading, owner) ?? {});
  const transition = frameSlot(resolveSlotProps(slotProps.transition, owner) ?? {}, false);
  const region = frameSlot(resolveSlotProps(slotProps.region, owner) ?? {});
  const {
    sx: rootSx,
    style: _mergedRootStyle,
    className: _copiedRootClass,
    component: rootComponent,
    as: rootAs,
    ref: _copiedSlotRef,
    ownerState: suppliedOwner,
    children: _rootChildren,
    ...rootNative
  } = root;
  const ref = useForkRef(slotRef, forwarded);
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
  const nativeRef = useNativeStyleRef(scopeRoot, scopeRef);
  const ancestry = useContext(NativeButtonGroupRules);
  const styleCache = useNativeStyleCache();
  const rootNativeProps: Record<string, unknown> = { ...other, ...rootNative };
  const selectedAs = Object.hasOwn(root, 'as') ? rootAs : rootNativeProps.as;
  // An as override replaces the named styled Paper base. A custom root slot
  // owns its own constructor and receives as unchanged, just like useSlot.
  const styledRoot = !slots.root;
  const Root = (slots.root ??
    (selectedAs
      ? typeof selectedAs === 'string'
        ? View
        : selectedAs
      : Paper)) as React.ComponentType<AccordionRootSlotProps>;
  const cooperatingRoot = Root === Paper || nativeCooperatingRootTarget(Root) !== undefined;
  const theme = useNativeStyledTheme(rootNativeProps.theme as Theme | undefined),
    parent = useNativeTextContext(),
    { width } = useWindowDimensions();
  if (styledRoot) {
    for (const reserved of ['as', 'theme', 'ownerState']) delete rootNativeProps[reserved];
  } else {
    if (Object.hasOwn(root, 'as')) rootNativeProps.as = rootAs;
    if (Object.hasOwn(root, 'sx') || Object.hasOwn(props, 'sx'))
      rootNativeProps.sx = Object.hasOwn(root, 'sx') ? rootSx : sx;
  }
  const [summary, ...body] = React.Children.toArray(children);
  if (
    !React.isValidElement<{ id?: string; 'aria-controls'?: string }>(summary) ||
    summary.type === React.Fragment
  )
    throw new Error(
      'MUI Native: Accordion requires a summary element as its first child; use AccordionSummary directly rather than a Fragment.',
    );
  const Transition = slots.transition ?? Collapse;
  const leaf = rootComponent || component;
  const rootChildren = [
    <Frame
      key="heading"
      name="MuiAccordion"
      slot="heading"
      className={composed.heading}
      ownerState={owner}
      resolved={{ accessibilityRole: 'header', ...heading }}
      component={slots.heading}
    >
      <AccordionContext.Provider value={context}>{summary}</AccordionContext.Provider>
    </Frame>,
    <Transition
      key="transition"
      in={expanded}
      timeout="auto"
      {...transition}
      ownerState={{ ...transition.ownerState, ...owner }}
    >
      <Frame
        name="MuiAccordion"
        slot="region"
        className={composed.region}
        ownerState={owner}
        component={slots.region}
        resolved={{
          role: 'region',
          'aria-labelledby': summary.props.id,
          id: summary.props['aria-controls'],
          ...region,
        }}
      >
        {body}
      </Frame>
    </Transition>,
  ];
  // useSlot forwards unconsumed authored props, then root slot props. Controls
  // stay in ownerState and generated heading/transition children replace input.
  // Preserve explicit undefined and merge native style arrays like source style
  // objects, without exposing the prepared programme to contributor callbacks.
  const rootOwner = { ...suppliedOwner, ...owner };
  const rootArguments: Record<string, unknown> = {
    ...other,
    ...(Object.hasOwn(props, 'classes') ? { classes } : {}),
    ...(Object.hasOwn(props, 'style') ? { style } : {}),
    ...(Object.hasOwn(props, 'sx') ? { sx } : {}),
    ...root,
    className: joinClassNames(composed.root, className, rootSlotClass),
    ref: nativeRef,
    ownerState: rootOwner,
    children: rootChildren,
  };
  delete rootArguments.component;
  if (leaf) rootArguments.component = leaf;
  // The default named styled root consumes classes before Paper. An authored
  // root slot receives them directly and owns its own forwarding policy.
  if (!styledRoot && (Object.hasOwn(root, 'classes') || Object.hasOwn(props, 'classes')))
    rootNativeProps.classes = Object.hasOwn(root, 'classes') ? root.classes : classes;
  if (styledRoot || Root === View) delete rootNativeProps.classes;
  const structuralMarker = useAccordionStructuralRootMarker();
  const states = [...(expanded ? ['expanded'] : []), ...(disabled ? ['disabled'] : [])];
  const rootClass = joinClassNames(composed.root, className, rootSlotClass, structuralMarker);
  const source = componentRootStyle(
    theme,
    styledRoot ? 'MuiAccordion' : '',
    rootOwner,
    styledRoot ? (Object.hasOwn(root, 'sx') ? rootSx : sx) : undefined,
    preparedStyle,
    {
      styleCache,
      classes: rootClass.split(/\s+/).filter(Boolean),
      ...(!cooperatingRoot
        ? {
            ancestors: nativeStyleAncestors(ancestry, {
              classes: rootClass.split(/\s+/).filter(Boolean),
            }),
          }
        : {}),
      protectPhysicalGeometry: true,
      ...(styledRoot ? { overrideSelectors: { region: `& .${accordionClasses.region}` } } : {}),
      styledProps: { ...rootArguments, theme },
      width,
      ...nativeTextStyleContext(parent, [style, rootStyle], theme),
      states,
      overrideKeys: styledRoot
        ? [...(!props.square ? ['rounded'] : []), ...(!disableGutters ? ['gutters'] : [])]
        : [],
      // Bind identity to the accepted source programme, not a newer render's CSS.
      selectorOwner: styledRoot ? structuralMarker : undefined,
      baseProgramme: styledRoot ? accordionConstructorCss(theme, rootOwner) : undefined,
      overrideProgramme: styledRoot ? accordionOverrideCss : undefined,
      baseStyle: styledRoot
        ? {
            position: 'relative',
            direction: parent?.direction ?? theme.direction,
            '&::before': {
              position: 'absolute',
              left: 0,
              right: 0,
              top: -1,
              height: 1,
              opacity: 1,
              backgroundColor: theme.palette.divider,
            },
            '&:first-of-type': { '&::before': { display: 'none' } },
            '&.Mui-expanded': {
              '&::before': { opacity: 0 },
              '&:first-of-type': { marginTop: 0 },
              '&:last-of-type': { marginBottom: 0 },
              ...(!disableGutters ? { margin: '16px 0' } : {}),
            },
            '&.Mui-disabled': { backgroundColor: theme.palette.action.disabledBackground },
            // The original nested & + & rule requires both panels expanded.
            // Its two source classes plus two expanded states have specificity
            // four; the private peer fact supplies the missing adjacent target.
            '&.Mui-expanded.Mui-nativePreviousExpanded.Mui-nativePreviousExpanded::before': {
              display: 'none',
            },
            ...(!props.square
              ? {
                  borderRadius: 0,
                  '&:first-of-type': {
                    '&::before': { display: 'none' },
                    borderTopLeftRadius: theme.shape.borderRadius,
                    borderTopRightRadius: theme.shape.borderRadius,
                  },
                  '&:last-of-type': {
                    borderBottomLeftRadius: theme.shape.borderRadius,
                    borderBottomRightRadius: theme.shape.borderRadius,
                  },
                }
              : {}),
          }
        : undefined,
    },
    true,
  );
  const rootTiming = styledRoot ? accordionMotionTiming(theme, 'root') : undefined;
  const nativeChildren = [
    ...rootChildren,
    <AccordionBefore
      key="native-before"
      sourceTheme={theme}
      timing={styledRoot ? accordionMotionTiming(theme, 'before') : undefined}
    />,
  ];
  // Paper binds retained selectors to the final shared host, including its own classes.
  const rootInline = [source.authored, rootStyle];
  return (
    <AccordionStructureBoundary
      observeCache={!(cooperatingRoot || hasPaperCacheBoundary(Root))}
      root={scopeRoot}
      expanded={expanded}
      sourceCss={
        styledRoot
          ? source.prepared.sheets.find((sheet) => !sheet.ancestor && !sheet.emissionForeign)
              ?.emissionOwner?.css
          : undefined
      }
    >
      {(structure) => {
        const { computed, programme, prepared } = componentRootStyle(
          theme,
          styledRoot ? 'MuiAccordion' : '',
          rootOwner,
          undefined,
          rootInline,
          {
            preparedRoot: source.prepared,
            styleCache,
            classes: rootClass.split(/\s+/).filter(Boolean),
            ...structure.facts,
            ...(!cooperatingRoot
              ? {
                  ancestors: nativeStyleAncestors(ancestry, {
                    classes: rootClass.split(/\s+/).filter(Boolean),
                    ...structure.facts,
                  }),
                }
              : {}),
            ...nativeTextStyleContext(parent, rootInline, theme),
            width,
            states: [...states, ...(structure.facts.states ?? [])],
            protectPhysicalGeometry: true,
          },
          true,
        );
        const rootMerged = mergeNativeRootStyle(
          parent?.direction ?? theme.direction,
          computed,
          rootInline,
        );
        const rootStyleResult =
          applyNativeTextMetrics(
            rootMerged,
            computed,
            nativeStyleTextMetrics([computed, rootInline]),
          ) ?? rootMerged;
        const structuralCases =
          structuralMarker && Root === View
            ? prepareAccordionStructuralCases({
                theme,
                programme,
                direction: parent?.direction ?? theme.direction,
                context: {
                  styleCache,
                  width,
                  classes: rootClass.split(/\s+/).filter(Boolean),
                  ...nativeTextStyleContext(parent, rootInline, theme),
                  ...structure.facts,
                  states: [...states, ...(structure.facts.states ?? [])],
                  protectPhysicalGeometry: true,
                },
              })
            : undefined;
        const renderRoot = (
          viewStyle: StyleProp<NativeStyle>,
          fallback?: NativeTextScopeValue,
          presentation?: NativeStyle,
        ) => (
          <AccordionStructuralRootContext.Provider value={structuralMarker ?? null}>
            {structuralCases ? (
              <AccordionStructuralView
                {...rootNativeProps}
                cases={structuralCases}
                prepared={prepared}
                classNames={rootClass.split(/\s+/).filter(Boolean)}
                nativeRef={nativeRef}
                presentation={presentation}
                style={viewStyle}
              >
                {fallback ? (
                  <NativeRootTextBoundary
                    parent={parent}
                    fallback={fallback}
                    rootRef={scopeRoot}
                    theme={theme}
                  >
                    {nativeChildren}
                  </NativeRootTextBoundary>
                ) : (
                  nativeChildren
                )}
              </AccordionStructuralView>
            ) : (
              <Root
                {...rootNativeProps}
                ref={cooperatingRoot ? scopeRef : nativeRef}
                {...(leaf ? { component: leaf } : {})}
                {...(Root === View ? {} : { className: rootClass })}
                {...(styledRoot || Root === Paper || Root === View
                  ? {}
                  : { ownerState: rootOwner })}
                style={viewStyle}
              >
                {fallback ? (
                  <NativeRootTextBoundary
                    parent={parent}
                    fallback={fallback}
                    rootRef={scopeRoot}
                    theme={theme}
                  >
                    {nativeChildren}
                  </NativeRootTextBoundary>
                ) : (
                  nativeChildren
                )}
              </Root>
            )}
          </AccordionStructuralRootContext.Provider>
        );
        // First-party roots bind the retained programme to their own physical host.
        // A second text scope here would resolve the same em/% declaration twice.
        return (
          <AccordionRootMotionScope
            root={scopeRoot}
            theme={theme}
            timing={rootTiming}
            ready={
              styledRoot && structure.element !== null && structure.element === scopeRoot.current
            }
          >
            {(motion) => (
              <AccordionRootMotionBoundary scope={motion} root={scopeRoot} style={rootStyleResult}>
                {(presented, presentation) =>
                  cooperatingRoot ? (
                    renderRoot([programme, rootStyle])
                  ) : (
                    <NativeStyleScope
                      root={scopeRoot}
                      theme={theme}
                      classes={rootClass.split(/\s+/).filter(Boolean)}
                      prepared={prepared}
                    >
                      <NativeTextScope theme={theme} style={presented}>
                        {(viewStyle, _content, fallback) => (
                          <NativeTextStyleContext.Provider value={parent}>
                            {renderRoot(
                              retainNativeRootCss(
                                rootInline,
                                programme,
                                Object.hasOwn(props, 'style') || Object.hasOwn(root, 'style'),
                                viewStyle,
                              ),
                              fallback,
                              presentation,
                            )}
                          </NativeTextStyleContext.Provider>
                        )}
                      </NativeTextScope>
                    </NativeStyleScope>
                  )
                }
              </AccordionRootMotionBoundary>
            )}
          </AccordionRootMotionScope>
        );
      }}
    </AccordionStructureBoundary>
  );
});

export const Accordion: NativeAccordionComponent = AccordionImpl as NativeAccordionComponent;

export const AccordionSummary: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<AccordionSummaryProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, AccordionSummaryProps>(function AccordionSummary(inProps, forwarded) {
  const { props, style: preparedStyle } = useNativeRootProps({
    props: inProps,
    name: 'MuiAccordionSummary',
  });
  const {
    children,
    expandIcon,
    slots = {},
    slotProps = {},
    sx,
    style,
    classes,
    className,
    focusVisibleClassName,
    onClick,
    onPress,
    ...other
  } = props;
  const context = useContext(AccordionContext);
  const ancestry = useContext(NativeButtonGroupRules);
  const owner: AccordionSummaryOwnerState = {
    ...props,
    expanded: context?.expanded,
    disabled: context?.disabled ?? false,
    disableGutters: context?.disableGutters,
  };
  const composed = slotClasses(
    {
      root: [
        'root',
        owner.expanded && 'expanded',
        owner.disabled && 'disabled',
        !owner.disableGutters && 'gutters',
      ],
      focusVisible: ['focusVisible'],
      content: ['content', owner.expanded && 'expanded'],
      expandIconWrapper: ['expandIconWrapper', owner.expanded && 'expanded'],
    },
    getAccordionSummaryUtilityClass,
    classes,
  );
  const root = resolveSlotProps(slotProps.root, owner) ?? {};
  const content = frameSlot(resolveSlotProps(slotProps.content, owner) ?? {});
  const icon = frameSlot(resolveSlotProps(slotProps.expandIconWrapper, owner) ?? {});
  const {
    sx: rootSx,
    style: rootStyle,
    className: rootSlotClass,
    focusVisibleClassName: rootFocusClass,
    ownerState: _ownerState,
    ref: slotRef,
    onClick: rootClick,
    onPress: rootPress,
    children: _rootChildren,
    as: rootAs,
    component: rootComponent,
    ...rootNative
  } = root;
  const mergedRef = useForkRef(slotRef, forwarded);
  const { root: summaryRoot, ref } = useNativeTextRootRef(mergedRef);
  const theme = useTheme(),
    parent = useNativeTextContext(),
    { width } = useWindowDimensions();
  // Presence matters: an explicit undefined replaces generated additional props upstream.
  const merged = {
    disabled: owner.disabled,
    'aria-expanded': owner.expanded,
    ...other,
    ...rootNative,
  };
  const disabled = merged.disabled;
  const ariaExpanded = merged['aria-expanded'];
  const expanded = owner.expanded,
    gutters = !owner.disableGutters;
  const structuralMarker = useAccordionStructuralRootMarker();
  const states = [...(expanded ? ['expanded'] : []), ...(owner.disabled ? ['disabled'] : [])];
  const rootClass = joinClassNames(composed.root, className, rootSlotClass, structuralMarker);
  const focusClass = Object.hasOwn(root, 'focusVisibleClassName')
    ? rootFocusClass
    : joinClassNames(composed.focusVisible, focusVisibleClassName);
  const Root = slots.root ?? (ButtonBase as React.ComponentType<AccordionSummaryRootSlotProps>);
  const styledRoot = !slots.root;
  // Replacing the slot transfers sx/style ownership to the new constructor.
  // Keep native callback styles composable without resolving its sx here.
  const replacementStyle =
    typeof preparedStyle === 'function' || typeof rootStyle === 'function'
      ? (state: ButtonBaseState) => [
          typeof preparedStyle === 'function' ? preparedStyle(state) : preparedStyle,
          typeof rootStyle === 'function' ? rootStyle(state) : rootStyle,
        ]
      : rootStyle === undefined
        ? preparedStyle
        : preparedStyle === undefined
          ? rootStyle
          : [preparedStyle, rootStyle];
  const summaryTiming = useMemo(
    () =>
      slots.root
        ? undefined
        : {
            declaration: theme.transitions.create(['min-height', 'background-color'], {
              duration: theme.transitions.duration.shortest,
            }),
          },
    [theme, slots.root],
  );
  const styleCache = useNativeStyleCache();
  const defaultsSource = useNativeDefaultPropsSource();
  const source = useMemo(
    () =>
      componentRootStyle(
        theme,
        styledRoot ? 'MuiAccordionSummary' : '',
        { ...owner },
        styledRoot ? (Object.hasOwn(root, 'sx') ? rootSx : sx) : undefined,
        [
          typeof preparedStyle === 'function' ? undefined : preparedStyle,
          typeof rootStyle === 'function' ? undefined : rootStyle,
        ],
        {
          sourceClass: true,
          styleCache,
          classes: joinClassNames(rootClass, Root === ButtonBase && 'MuiButtonBase-root')
            .split(/\s+/)
            .filter(Boolean),
          rootProps: {
            ...props,
            ...root,
            className: rootClass,
            focusVisibleClassName: focusClass,
            disabled,
            'aria-expanded': ariaExpanded,
            ownerState: owner,
          },
          ...nativeTextStyleContext(parent, typeof style === 'function' ? undefined : style, theme),
          width,
          states,
          overrideKeys: styledRoot && gutters ? ['gutters'] : [],
          baseStyle: styledRoot
            ? {
                width: '100%',
                minHeight: expanded && gutters ? 64 : 48,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: theme.spacing(0, 2),
                direction: parent?.direction ?? theme.direction,
                ...(owner.disabled || disabled
                  ? { opacity: theme.palette.action.disabledOpacity }
                  : {}),
                ...(!theme.focusVisible
                  ? { '&.Mui-focusVisible': { backgroundColor: theme.palette.action.focus } }
                  : {}),
              }
            : undefined,
        },
      ),
    [inProps, context, theme, parent, width, styleCache, defaultsSource],
  );
  const frame = (
    state: ButtonBaseState,
    sheet: NativeButtonBaseStyleSheet | undefined,
    inline: StyleProp<NativeStyle>,
    hovered = false,
  ) =>
    componentRootStyle(
      theme,
      styledRoot ? 'MuiAccordionSummary' : '',
      { ...owner },
      undefined,
      inline,
      {
        preparedRoot: sheet?.sourcePrepared ?? source.prepared,
        styleCache,
        classes: joinClassNames(
          rootClass,
          Root === ButtonBase && 'MuiButtonBase-root',
          state.focusVisible && focusClass,
          state.pressed && 'Mui-active',
          hovered && !state.disabled && 'Mui-hover',
        )
          .split(/\s+/)
          .filter(Boolean),
        ancestors: [
          ...(sheet && !sheet.sourcePrepared ? [sheet] : []),
          ...nativeStyleAncestors(ancestry, {
            classes: joinClassNames(
              rootClass,
              Root === ButtonBase && 'MuiButtonBase-root',
              state.focusVisible && focusClass,
              state.pressed && 'Mui-active',
              hovered && !state.disabled && 'Mui-hover',
            )
              .split(/\s+/)
              .filter(Boolean),
          }),
        ],
        ...nativeTextStyleContext(parent, inline, theme),
        width,
        states: [
          ...states,
          ...(state.disabled ? ['disabled'] : []),
          ...(state.focusVisible ? ['focusVisible'] : []),
          ...(state.pressed ? ['active'] : []),
          ...(hovered && !state.disabled ? ['hover'] : []),
        ],
      },
    );
  const sourceFor = useMemo(
    () => (sheet: NativeButtonBaseStyleSheet) =>
      prepareNativeCompositeSource(sheet.prepared!, source.prepared, styleCache),
    [source],
  );
  let nativeHovered = false;
  let baseSheet: NativeButtonBaseStyleSheet | undefined;
  const nativeStyle = (computed: NativeStyle, inline: StyleProp<NativeStyle>) => {
    const merged = mergeNativeRootStyle(parent?.direction ?? theme.direction, computed, inline);
    return (
      applyNativeTextMetrics(merged, computed, nativeStyleTextMetrics([computed, inline])) ?? merged
    );
  };
  let cache:
    | {
        pressed: boolean;
        focused: boolean;
        disabled: boolean;
        hovered: boolean;
        sheet?: NativeButtonBaseStyleSheet;
        style: StyleProp<NativeStyle>;
        computed: NativeStyle;
        authored: StyleProp<NativeStyle>;
      }
    | undefined;
  const styled = (
    state: ButtonBaseState,
    sheet = baseSheet,
    hovered = nativeHovered,
  ): StyleProp<NativeStyle> => {
    baseSheet = sheet;
    nativeHovered = hovered;
    if (
      cache &&
      cache.pressed === state.pressed &&
      cache.focused === state.focusVisible &&
      cache.disabled === state.disabled &&
      cache.hovered === hovered &&
      cache.sheet === sheet
    ) {
      const computed = refreshNativeStyle(cache.computed);
      if (computed !== cache.computed) {
        cache.computed = computed;
        cache.style = nativeStyle(computed, cache.authored);
      }
      return cache.style;
    }
    const authored =
      typeof preparedStyle === 'function' ? preparedStyle(state) : nativeInlineStyle(preparedStyle);
    const slotInline =
      typeof rootStyle === 'function' ? rootStyle(state) : nativeInlineStyle(rootStyle);
    const inline = [authored, slotInline];
    const result = frame(state, sheet, inline, hovered);
    const output = nativeStyle(result.computed, inline);
    cache = {
      pressed: state.pressed,
      focused: state.focusVisible,
      disabled: state.disabled,
      hovered,
      sheet,
      style: output,
      computed: result.computed,
      authored: inline,
    };
    return output;
  };
  return (
    <NativeCssInsertionScope style={source.computed}>
      <AccordionRootMotionScope
        root={summaryRoot}
        theme={theme}
        ready
        timing={summaryTiming}
        property="summary"
      >
        {() => (
          <Root
            focusRipple={false}
            disableRipple
            {...other}
            {...rootNative}
            ref={ref}
            component={rootComponent ?? other.component ?? rootAs}
            className={rootClass}
            {...(styledRoot && Root === ButtonBase
              ? {
                  _muiNativeSourceStyle: sourceFor,
                  _muiNativeStyle: (
                    state: ButtonBaseState,
                    sheet: NativeButtonBaseStyleSheet,
                    hovered?: boolean,
                  ) => {
                    styled(state, sheet, hovered);
                    return { computed: cache!.computed, authored: cache!.authored };
                  },
                  _muiNativeClassName: rootClass,
                  _muiNativeClassMetadata: { root: rootClass, focusVisible: focusClass },
                }
              : { focusVisibleClassName: focusClass })}
            {...(styledRoot && Root === ButtonBase ? {} : { ownerState: owner })}
            {...(!styledRoot && (Object.hasOwn(root, 'sx') || Object.hasOwn(props, 'sx'))
              ? { sx: Object.hasOwn(root, 'sx') ? rootSx : sx }
              : {})}
            disabled={disabled}
            aria-expanded={ariaExpanded}
            accessibilityState={{
              ...other.accessibilityState,
              ...rootNative.accessibilityState,
              ...(ariaExpanded !== undefined ? { expanded: ariaExpanded } : {}),
              ...(disabled !== undefined ? { disabled } : {}),
            }}
            {...(styledRoot
              ? { style: styled }
              : Object.hasOwn(root, 'style') ||
                  Object.hasOwn(props, 'style') ||
                  replacementStyle !== undefined
                ? { style: replacementStyle }
                : {})}
            onClick={(event) => {
              if (disabled) return;
              // Slot callbacks precede expansion and authored callbacks, including when prevented.
              (rootPress ?? rootClick)?.(event);
              context?.toggle(event);
              (onPress ?? onClick)?.(event);
            }}
          >
            <Frame
              name="MuiAccordionSummary"
              slot="content"
              className={composed.content}
              ownerState={owner}
              resolved={content}
              component={slots.content}
              states={states}
              base={{
                textAlign: 'start',
                flexDirection: 'row',
                flexGrow: 1,
                flexShrink: 1,
                minWidth: 0,
                marginTop: expanded && gutters ? 20 : 12,
                marginBottom: expanded && gutters ? 20 : 12,
              }}
            >
              {children}
            </Frame>
            {expandIcon && (
              <Frame
                name="MuiAccordionSummary"
                slot="expandIconWrapper"
                className={composed.expandIconWrapper}
                ownerState={owner}
                resolved={icon}
                component={slots.expandIconWrapper}
                states={states}
                base={{
                  flexShrink: 0,
                  color: theme.palette.action.active,
                  transform: [{ rotate: expanded ? '180deg' : '0deg' }],
                }}
              >
                {expandIcon}
              </Frame>
            )}
          </Root>
        )}
      </AccordionRootMotionScope>
    </NativeCssInsertionScope>
  );
});

interface NativeAccordionDetailsComponent
  extends Omit<
    React.ForwardRefExoticComponent<
      React.PropsWithoutRef<AccordionDetailsProps> & React.RefAttributes<ViewInstance>
    >,
    never
  > {
  (props: AccordionDetailsProps & React.RefAttributes<ViewInstance>): React.JSX.Element;
}
export const AccordionDetails: NativeAccordionDetailsComponent = forwardRef<
  ViewInstance,
  AccordionDetailsProps
>(function AccordionDetails(inProps, ref) {
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
  const { props, style: preparedStyle } = useNativeRootProps({
    props: inProps,
    name: 'MuiAccordionDetails',
  });
  const { classes, className, component: Root = View, children, sx, style, ...native } = props;
  const theme = useTheme(),
    parent = useNativeTextContext();
  const utility = getAccordionDetailsUtilityClass('root');
  // composeClasses intentionally reads an active custom class accessor twice.
  const rootClass = joinClassNames(
    classes?.root ? `${utility} ${classes.root}` : utility,
    className,
  );
  const { computed: resolved, authored } = useComponentRootStyle(
    'MuiAccordionDetails',
    props,
    sx,
    preparedStyle,
    {
      ...nativeTextStyleContext(parent, style, theme),
      classes: rootClass.split(/\s+/).filter(Boolean),
      rootProps: {
        ...props,
        ...(props.component ? { as: props.component } : {}),
        className: rootClass,
      },
      baseStyle: { padding: theme.spacing(1, 2, 2) },
    },
  );
  const merged = mergeNativeRootStyle(parent?.direction ?? theme.direction, resolved, authored);
  const computed =
    applyNativeTextMetrics(merged, resolved, nativeStyleTextMetrics([resolved, authored])) ??
    merged;
  return (
    <NativeTextScope rootRef={scopeRoot} theme={theme} style={computed} content={children}>
      {(style, content) => (
        <Root
          {...native}
          {...(Root === View ? {} : { className: rootClass })}
          ref={scopeRef}
          style={style}
        >
          {content}
        </Root>
      )}
    </NativeTextScope>
  );
}) as NativeAccordionDetailsComponent;
interface NativeAccordionActionsComponent
  extends React.ForwardRefExoticComponent<
    React.PropsWithoutRef<AccordionActionsProps> & React.RefAttributes<ViewInstance>
  > {
  (props: AccordionActionsProps & React.RefAttributes<ViewInstance>): React.JSX.Element;
}
export const AccordionActions: NativeAccordionActionsComponent = forwardRef<
  ViewInstance,
  AccordionActionsProps
>(function AccordionActions(inProps, ref) {
  const { props, style: preparedStyle } = useNativeRootProps({
    props: inProps,
    name: 'MuiAccordionActions',
  });
  const {
    classes,
    className,
    component: Component = View,
    as,
    ref: slotRef,
    ownerState: _ownerState,
    children,
    disableSpacing = false,
    id,
    sx,
    style,
    ...native
  } = props as AccordionActionsProps & NativeAccordionSlotProps;
  const Root = Component === View ? (as ?? View) : Component;
  const mergedRef = useForkRef(ref, slotRef);
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(mergedRef);
  const theme = useTheme(),
    parent = useNativeTextContext();
  const token = (slot: 'root' | 'spacing') => {
    let value = getAccordionActionsUtilityClass(slot);
    // Match composeClasses: a truthy active entry is read once again when appended.
    if (classes && classes[slot]) value += ' ' + classes[slot];
    return value;
  };
  const rootClass = joinClassNames(token('root'), !disableSpacing && token('spacing'), className);
  const owner = { ...props, disableSpacing };
  const { disableSpacing: _disableSpacing, ...styledProps } = props;
  const { computed: resolved, authored } = useComponentRootStyle(
    'MuiAccordionActions',
    owner,
    sx,
    preparedStyle,
    {
      ...nativeTextStyleContext(parent, style, theme),
      slot: 'root',
      overrideKeys: disableSpacing ? [] : ['spacing'],
      classes: rootClass.split(/\s+/).filter(Boolean),
      rootProps: {
        ...styledProps,
        ...(as || Component !== View ? { as: as ?? Component } : {}),
        className: rootClass,
      },
      baseStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: 8,
        // Yoga gap preserves caller-owned children and mirrors with the native row direction.
        columnGap: disableSpacing ? 0 : 8,
      },
    },
  );
  // Keep native array precedence: an inline gap does not erase a named columnGap.
  return (
    <NativeTextScope
      rootRef={scopeRoot}
      theme={theme}
      style={[resolved, authored]}
      content={children}
    >
      {(rootStyle, content) => (
        <Root
          {...native}
          nativeID={id ?? native.nativeID}
          {...(Root === View ? {} : { className: rootClass, ownerState: owner })}
          {...(Component !== View && as ? { as } : {})}
          ref={scopeRef}
          style={rootStyle}
        >
          {content}
        </Root>
      )}
    </NativeTextScope>
  );
}) as NativeAccordionActionsComponent;
