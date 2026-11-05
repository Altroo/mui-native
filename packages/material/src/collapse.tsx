/* Collapse contracts and slot structure adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/collapse.json.
 * Native measurement and animation: Copyright (c) 2026 Altroo and contributors. */
import React, {
  forwardRef,
  useCallback,
  useContext,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type ViewInstance,
  type ViewProps,
  type LayoutChangeEvent,
  type StyleProp,
} from 'react-native';
import {
  diagnostic,
  NativeTextScope,
  useNativeTextRootRef,
  nativeTextStyleContext,
  resolveSlotProps,
  useDefaultProps,
  useNativeTextContext,
  type NativeStyle,
  type SlotProps,
  type SxProps,
} from '@altroo/mui-native-system';
import { useTheme, useSx, useComponentStyle } from './themeProvider';
import { useForkRef } from './utils';
import NativeTransition from './NativeTransition';
import { NativeTransitionReadiness } from './transitionReadiness';
import { useNativeReducedMotion } from './motionPreference';
import {
  nativeEasing,
  nativeMilliseconds,
  nativePropertyTiming,
  stripTiming,
  type NativeOpacityTiming,
} from './nativeTransitionTiming';
import type { TransitionProps, TransitionStatus } from './transitions/types';
import type { CollapseClasses } from './collapseClasses';
export * from './collapseClasses';

export interface CollapseRootSlotPropsOverrides {}
export interface CollapseWrapperSlotPropsOverrides {}
export interface CollapseWrapperInnerSlotPropsOverrides {}
export interface NativeCollapseSlotProps
  extends Omit<ViewProps, 'style'>,
    React.RefAttributes<ViewInstance> {
  style?: StyleProp<NativeStyle>;
  sx?: SxProps;
  ownerState?: CollapseOwnerState;
  component?: React.ComponentType<any>;
  as?: React.ComponentType<any>;
  id?: string;
}
export interface CollapseSlots {
  root?: React.ComponentType<NativeCollapseSlotProps>;
  wrapper?: React.ComponentType<NativeCollapseSlotProps>;
  wrapperInner?: React.ComponentType<NativeCollapseSlotProps>;
}
export interface CollapseSlotsAndSlotProps {
  slots?: CollapseSlots;
  slotProps?: {
    root?: SlotProps<NativeCollapseSlotProps & CollapseRootSlotPropsOverrides, CollapseOwnerState>;
    wrapper?: SlotProps<
      NativeCollapseSlotProps & CollapseWrapperSlotPropsOverrides,
      CollapseOwnerState
    >;
    wrapperInner?: SlotProps<
      NativeCollapseSlotProps & CollapseWrapperInnerSlotPropsOverrides,
      CollapseOwnerState
    >;
  };
}
export interface CollapseProps
  extends Omit<TransitionProps, 'children' | 'timeout' | 'style'>,
    CollapseSlotsAndSlotProps {
  children?: React.ReactNode;
  collapsedSize?: string | number;
  component?: React.ComponentType<any>;
  classes?: Partial<CollapseClasses>;
  className?: string;
  id?: string;
  orientation?: 'horizontal' | 'vertical';
  style?: StyleProp<NativeStyle>;
  sx?: SxProps;
  timeout?: TransitionProps['timeout'] | 'auto';
}
export interface CollapseOwnerState extends CollapseProps {
  state: TransitionStatus;
}
type Geometry = { width: number; height: number };
const validSize = (value: number) => Number.isFinite(value) && value >= 0;
const empty: Geometry = { width: 0, height: 0 };
// Public geometry is newer than a queued layout receipt when native events lag.
function liveGeometry(
  node: ViewInstance | null,
  fallback: Geometry,
  required?: 'width' | 'height',
): Geometry | null {
  const result = { ...fallback };
  let measured = false;
  for (const axis of ['width', 'height'] as const) {
    try {
      const value = axis === 'width' ? node?.clientWidth : node?.clientHeight;
      if (typeof value === 'number' && validSize(value)) {
        result[axis] = value;
        if (!required || required === axis) measured = true;
      }
    } catch {
      /* Forwarded layout remains the fallback for custom handles. */
    }
  }
  return measured ? result : null;
}

/** Named slot styles and text inheritance stay inside the actual native subtree. */
const Frame = forwardRef<
  ViewInstance,
  {
    slot: 'wrapper' | 'wrapperInner';
    Component: React.ComponentType<any>;
    owner: CollapseOwnerState;
    resolved: NativeCollapseSlotProps;
    base: SxProps;
    identity: symbol;
    children?: React.ReactNode;
  }
>(function Frame({ slot, Component, owner, resolved, base, identity, children }, ref) {
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
  const theme = useTheme(),
    parent = useNativeTextContext();
  const { sx, style, ownerState: _ownerState, ref: _ref, component, as, id, ...native } = resolved;
  const Leaf = component ?? as;
  const Element = Component === View ? (Leaf ?? View) : Component;
  const committed = useRef(identity);
  useInsertionEffect(() => {
    committed.current = identity;
  });
  const alive = useRef(true);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const computed = useComponentStyle('MuiCollapse', { ...owner }, sx, {
    ...nativeTextStyleContext(parent, style, theme),
    slot,
    rootSlot: slot,
    skipVariants: true,
    baseStyle: base,
    nativeStyle: StyleSheet.flatten(style) ?? undefined,
  });
  return (
    <NativeTextScope rootRef={scopeRoot} theme={theme} style={[computed, style]} content={children}>
      {(viewStyle, content) => (
        <Element
          {...native}
          {...(Component !== View && Leaf ? { as: Leaf } : {})}
          nativeID={native.nativeID ?? id}
          onLayout={(event: LayoutChangeEvent) => {
            if (alive.current && committed.current === identity) native.onLayout?.(event);
          }}
          ref={scopeRef}
          {...(Element === View ? {} : { ownerState: owner })}
          style={viewStyle}
        >
          {content}
        </Element>
      )}
    </NativeTextScope>
  );
});

interface SurfaceProps {
  props: CollapseProps;
  status: Exclude<TransitionStatus, 'unmounted'>;
  phase: number;
  identity: symbol;
  ready: boolean;
  paused: boolean;
  geometry: Geometry;
  timing: NativeOpacityTiming;
  resolved: {
    root: NativeCollapseSlotProps;
    wrapper: NativeCollapseSlotProps;
    inner: NativeCollapseSlotProps;
  };
  reduce: boolean;
  rootRef: React.Ref<ViewInstance>;
  wrapperRef: React.RefObject<ViewInstance | null>;
  captureWrapper: React.Ref<ViewInstance>;
  terminalCurrent?: () => boolean;
  measure: (value: Geometry, identity: symbol) => void;
  resolveCollapsed: (value: string | number, axis: 'width' | 'height') => number;
}
function Surface({
  props,
  status,
  phase,
  identity,
  ready,
  paused,
  geometry,
  timing,
  resolved,
  reduce,
  rootRef,
  wrapperRef,
  captureWrapper,
  terminalCurrent,
  measure,
  resolveCollapsed,
}: SurfaceProps) {
  const theme = useTheme(),
    parent = useNativeTextContext();
  const {
    orientation = 'vertical',
    collapsedSize = '0px',
    in: open = false,
    children,
    component,
    slots = {},
    slotProps: _slotProps,
    sx,
    style,
    classes,
    className,
    id,
    appear: _appear,
    enter: _enter,
    exit: _exit,
    mountOnEnter: _mountOnEnter,
    unmountOnExit: _unmountOnExit,
    timeout: _timeout,
    easing: _easing,
    addEndListener: _listener,
    disablePrefersReducedMotion: _disableMotion,
    onEnter: _onEnter,
    onEntering: _onEntering,
    onEntered: _onEntered,
    onExit: _onExit,
    onExiting: _onExiting,
    onExited: _onExited,
    ownerState: _incomingOwnerState,
    ...native
  } = props as CollapseProps & { ownerState?: unknown };
  if (classes || className)
    diagnostic(
      'collapse-classes',
      'Collapse utility names identify slots; use native styles, sx or theme overrides.',
    );
  const horizontal = orientation === 'horizontal',
    axis = horizontal ? 'width' : 'height';
  const owner: CollapseOwnerState = { ...props, orientation, collapsedSize, state: status };
  const { root, wrapper, inner } = resolved;
  const RootSlot = slots.root ?? View;
  const RootLeaf = root.component ?? component ?? root.as;
  const Root = RootSlot === View ? (RootLeaf ?? View) : RootSlot,
    Wrapper = slots.wrapper ?? View,
    Inner = slots.wrapperInner ?? View;
  const AnimatedRoot = useMemo(
    () => (Root === View ? Animated.View : Animated.createAnimatedComponent(Root)),
    [Root],
  );
  const {
    ref: slotRef,
    sx: rootSx,
    style: rootStyle,
    ownerState: _ownerState,
    children: _rootChildren,
    key: rootKey,
    component: _rootComponent,
    as: _rootAs,
    id: slotId,
    ...rootNative
  } = root as NativeCollapseSlotProps & { key?: React.Key };
  const rootHandle = useForkRef(rootRef, slotRef),
    wrapperHandle = useForkRef(captureWrapper, wrapper.ref);
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(rootHandle);
  const zero = (typeof collapsedSize === 'number' ? `${collapsedSize}px` : collapsedSize) === '0px';
  const hidden = status === 'exited' && !open && zero;
  const computed = useComponentStyle(
    'MuiCollapse',
    { ...owner },
    Object.hasOwn(root, 'sx') ? rootSx : sx,
    {
      ...nativeTextStyleContext(parent, [style, rootStyle], theme),
      states: [...(status === 'entered' ? ['entered'] : []), ...(hidden ? ['hidden'] : [])],
      overrideKeys: [
        orientation,
        ...(status === 'entered' ? ['entered'] : []),
        ...(hidden ? ['hidden'] : []),
      ],
      baseStyle: {
        overflow: status === 'entered' ? 'visible' : 'hidden',
        flexDirection: horizontal ? 'row' : 'column',
        direction: theme.direction,
        [horizontal ? 'minWidth' : 'minHeight']:
          typeof collapsedSize === 'number' ? `${collapsedSize}px` : collapsedSize,
      },
    },
  );
  const staticStyle = StyleSheet.flatten([computed, stripTiming(style), stripTiming(rootStyle)]);
  const [value] = useState(() => new Animated.Value(status === 'entered' ? 1 : 0));
  const collapsedNative = useSx({
    [axis]: typeof collapsedSize === 'number' ? `${collapsedSize}px` : collapsedSize,
  });
  const collapsedValue = (collapsedNative?.[axis] ?? 0) as string | number;
  const collapsedPixels =
    collapsedValue === 'auto'
      ? phase === 0 && status === 'exited'
        ? 0
        : geometry[axis]
      : resolveCollapsed(collapsedValue, axis);
  const dimension = useMemo(
    () => value.interpolate({ inputRange: [0, 1], outputRange: [collapsedPixels, geometry[axis]] }),
    [value, collapsedPixels, geometry, axis],
  );
  const committedScope = useRef(identity),
    alive = useRef(true);
  useInsertionEffect(() => {
    committedScope.current = identity;
  });
  const animation = useRef<Animated.CompositeAnimation | undefined>(undefined);
  const previouslyMeasured = useRef(ready);
  useLayoutEffect(() => {
    if (ready) previouslyMeasured.current = true;
  }, [ready]);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      animation.current?.stop();
      value.stopAnimation();
    };
  }, [value]);
  useLayoutEffect(() => {
    animation.current?.stop();
    animation.current = undefined;
    const target = status === 'entering' || status === 'entered' ? 1 : 0;
    // Ref attachment precedes layout effects. A terminal completion must still
    // belong to that committed node, including private leaf changes in a slot.
    if (terminalCurrent?.() === false) return;
    // Disabled phases must reach their endpoint even before new layout arrives.
    if (status === 'entered' || status === 'exited') {
      value.setValue(target);
      return;
    }
    if (!ready || paused) return;
    if (reduce) {
      value.setValue(target);
      return;
    }
    // Layout dimensions cannot use Animated's opacity/transform native driver.
    // The existing value survives interrupted phases; React does not rerender per frame.
    const run = Animated.timing(value, {
      toValue: target,
      duration: timing.duration,
      delay: timing.delay,
      easing: nativeEasing(timing.easing),
      useNativeDriver: false,
      isInteraction: false,
    });
    animation.current = run;
    run.start();
    return () => {
      run.stop();
      value.stopAnimation();
    };
  }, [status, phase, ready, paused, reduce, identity, value]);
  const mergedNative = { ...rootNative, ...native };
  const rootLayout = mergedNative.onLayout;
  const rootId = Object.hasOwn(native, 'nativeID')
    ? native.nativeID
    : Object.hasOwn(props, 'id')
      ? id
      : (root.nativeID ?? slotId);
  const floating = status !== 'entered';
  const rootOnLayout = (event: LayoutChangeEvent) => {
    if (!alive.current || committedScope.current !== identity) return;
    // A ref-forwarding wrapper can omit onLayout. The committed native root
    // still lets us read that wrapper's public geometry without a second tree.
    const live = liveGeometry(wrapperRef.current, geometry, axis);
    if (live) measure(live, identity);
    rootLayout?.(event);
  };
  const wrapperOnLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (validSize(width) && validSize(height))
      measure(liveGeometry(wrapperRef.current, { width, height }) ?? { width, height }, identity);
    wrapper.onLayout?.(event);
  };
  const {
    ref: _wrapperRef,
    key: wrapperKey,
    ...wrapperProps
  } = wrapper as NativeCollapseSlotProps & { key?: React.Key };
  const { key: innerKey, ...innerProps } = inner as NativeCollapseSlotProps & { key?: React.Key };
  const crossSize =
    horizontal && floating && (staticStyle?.height == null || staticStyle.height === 'auto')
      ? { height: geometry.height }
      : undefined;
  return (
    <NativeTextScope
      rootRef={scopeRoot}
      theme={theme}
      style={[computed, stripTiming(style), stripTiming(rootStyle)]}
    >
      {(viewStyle) => (
        <AnimatedRoot
          {...mergedNative}
          {...(RootSlot !== View && RootLeaf ? { as: RootLeaf } : {})}
          key={rootKey}
          ref={scopeRef}
          {...(Root === View ? {} : { ownerState: owner })}
          nativeID={rootId}
          onLayout={rootOnLayout}
          pointerEvents={hidden ? 'none' : mergedNative.pointerEvents}
          aria-hidden={hidden ? true : mergedNative['aria-hidden']}
          accessibilityElementsHidden={hidden || mergedNative.accessibilityElementsHidden}
          importantForAccessibility={
            hidden ? 'no-hide-descendants' : mergedNative.importantForAccessibility
          }
          style={[
            viewStyle,
            crossSize,
            {
              [axis]:
                status === 'entered'
                  ? 'auto'
                  : ready || previouslyMeasured.current
                    ? dimension
                    : collapsedValue,
            },
            hidden && { opacity: 0 },
          ]}
        >
          <Frame
            key={wrapperKey}
            slot="wrapper"
            identity={identity}
            Component={Wrapper}
            owner={owner}
            resolved={{ ...wrapperProps, onLayout: wrapperOnLayout }}
            ref={wrapperHandle}
            base={{
              flexShrink: 0,
              flexDirection: 'row',
              ...(horizontal ? {} : { width: '100%' }),
              ...(floating ? { position: 'absolute' } : {}),
            }}
          >
            <Frame
              key={innerKey}
              slot="wrapperInner"
              identity={identity}
              Component={Inner}
              owner={owner}
              resolved={innerProps}
              ref={inner.ref}
              base={{ flexShrink: 0, ...(horizontal ? {} : { width: '100%' }) }}
            >
              {children}
            </Frame>
          </Frame>
        </AnimatedRoot>
      )}
    </NativeTextScope>
  );
}

export const Collapse: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<CollapseProps> & React.RefAttributes<ViewInstance>
> & { muiSupportAuto: true } = Object.assign(
  forwardRef<ViewInstance, CollapseProps>(function Collapse(inProps, forwardedRef) {
    const props = useDefaultProps({ props: inProps, name: 'MuiCollapse' });
    const theme = useTheme(),
      parentReady = useContext(NativeTransitionReadiness);
    const {
      in: open = false,
      orientation = 'vertical',
      collapsedSize = '0px',
      slots = {},
      timeout = theme.transitions.duration.standard,
      appear = false,
      enter = true,
      exit = true,
      mountOnEnter = false,
      unmountOnExit = false,
      addEndListener,
      disablePrefersReducedMotion = false,
    } = props;
    const reduce = useNativeReducedMotion(theme.motion?.reducedMotion, disablePrefersReducedMotion);
    const root = useRef<ViewInstance | null>(null),
      wrapper = useRef<ViewInstance | null>(null);
    const rootHandle = useForkRef(root, forwardedRef);
    const [wrapperNode, setWrapperNode] = useState<ViewInstance | null>(null);
    const captureWrapper = useCallback((node: ViewInstance | null) => {
      wrapper.current = node;
      setWrapperNode(node);
    }, []);
    const slotOwner = { ...props, orientation, collapsedSize } as CollapseOwnerState;
    const resolved = {
      root: resolveSlotProps(props.slotProps?.root, slotOwner) ?? {},
      wrapper: resolveSlotProps(props.slotProps?.wrapper, slotOwner) ?? {},
      inner: resolveSlotProps(props.slotProps?.wrapperInner, slotOwner) ?? {},
    };
    const identity = useMemo(
      () => Symbol('collapse-layout'),
      [
        orientation,
        props.component,
        slots.root,
        slots.wrapper,
        slots.wrapperInner,
        resolved.root.component,
        resolved.root.as,
        resolved.wrapper.component,
        resolved.wrapper.as,
        resolved.inner.component,
        resolved.inner.as,
        resolved.root.key,
        resolved.wrapper.key,
        resolved.inner.key,
      ],
    );
    const committedIdentity = useRef(identity);
    const [measurement, setMeasurement] = useState<{
      identity: symbol;
      value: Geometry;
      node: ViewInstance | null;
    } | null>(null);
    const geometry = measurement?.value ?? empty;
    const measured = measurement?.identity === identity && measurement.node === wrapperNode;
    const layoutIdentity = useMemo(
      () => ({ identity, node: wrapperNode }),
      [identity, wrapperNode],
    );
    const layoutCurrent = () =>
      committedIdentity.current === measurement?.identity && measurement?.node === wrapper.current;
    const timing = useRef<NativeOpacityTiming>({
      duration: 0,
      delay: 0,
      easing: theme.transitions.easing.easeInOut,
    });
    const autoTimeout = useRef<number | null>(null);
    const current = useRef({ props, theme, timeout, geometry, reduce, measured });
    useInsertionEffect(() => {
      current.current = { props, theme, timeout, geometry, reduce, measured };
      committedIdentity.current = identity;
    });
    const measure = (value: Geometry, source: symbol) => {
      if (committedIdentity.current !== source) return;
      setMeasurement((old) =>
        old?.identity === source &&
        old.value.width === value.width &&
        old.value.height === value.height &&
        old.node === wrapper.current
          ? old
          : { identity: source, value, node: wrapper.current },
      );
    };
    const resolveCollapsed = (value: string | number, axis: 'width' | 'height') => {
      if (value === 'auto')
        return current.current.geometry[
          current.current.props.orientation === 'horizontal' ? 'width' : 'height'
        ];
      if (typeof value === 'number') return validSize(value) ? value : 0;
      const pixels = value.trim().match(/^(\d*\.?\d+)(?:px)?$/);
      if (pixels) return Number(pixels[1]);
      const percentage = value.trim().match(/^(\d*\.?\d+)%$/);
      if (percentage) {
        if (!root.current) return 0;
        try {
          const parent = root.current?.parentElement;
          const extent = axis === 'width' ? parent?.clientWidth : parent?.clientHeight;
          if (typeof extent === 'number' && validSize(extent))
            return (extent * Number(percentage[1])) / 100;
        } catch {
          /* Detached/custom refs have no containing native geometry. */
        }
      }
      diagnostic(
        'collapse-size',
        `Collapse requires a nonnegative native size in points, px or a measurable parent percentage: ${value}`,
      );
      return 0;
    };
    const prepare = (entering: boolean) => {
      const p = current.current,
        axis = p.props.orientation === 'horizontal' ? 'width' : 'height';
      const live = liveGeometry(wrapper.current, p.geometry) ?? p.geometry;
      // Publish both dimensions before rendering the new animated range.
      if (p.measured) measure(live, committedIdentity.current);
      const size = live[axis];
      const authored = StyleSheet.flatten(p.props.style) as Record<string, any> | undefined;
      const factory = nativePropertyTiming(
        p.theme.transitions.create(axis),
        {
          duration: p.theme.transitions.duration.standard,
          delay: 0,
          easing: p.theme.transitions.easing.easeInOut,
        },
        axis,
      );
      const duration =
        authored?.transitionDuration ??
        (typeof p.timeout === 'number'
          ? p.timeout
          : p.timeout === 'auto'
            ? 0
            : ((entering ? p.timeout?.enter : p.timeout?.exit) ?? 0));
      autoTimeout.current =
        p.timeout === 'auto' && !p.reduce ? p.theme.transitions.getAutoHeightDuration(size) : null;
      const easing =
        authored?.transitionTimingFunction ??
        (typeof p.props.easing === 'string'
          ? p.props.easing
          : entering
            ? p.props.easing?.enter
            : p.props.easing?.exit) ??
        factory.easing;
      timing.current = {
        duration: p.reduce ? 0 : (autoTimeout.current ?? nativeMilliseconds(duration)),
        delay: p.reduce ? 0 : nativeMilliseconds(authored?.transitionDelay, factory.delay),
        easing,
      };
    };
    const callEnter = (handler: CollapseProps['onEnter'], appearing: boolean) => {
      if (root.current) handler?.(root.current, appearing);
    };
    const callExit = (handler: CollapseProps['onExit']) => {
      if (root.current) handler?.(root.current);
    };
    return (
      <NativeTransitionReadiness.Provider value={parentReady && measured}>
        <NativeTransition
          in={open}
          layoutIdentity={layoutIdentity}
          layoutCurrent={layoutCurrent}
          onResume={prepare}
          appear={appear}
          enter={enter}
          exit={exit}
          mountOnEnter={mountOnEnter}
          unmountOnExit={unmountOnExit}
          timeout={timeout === 'auto' ? undefined : timeout}
          getAutoTimeout={timeout === 'auto' ? () => autoTimeout.current : undefined}
          reduceMotion={reduce}
          nodeRef={root}
          addEndListener={addEndListener}
          onEnter={(appearing) => {
            callEnter(current.current.props.onEnter, appearing);
            prepare(true);
          }}
          onEntering={(appearing) => callEnter(current.current.props.onEntering, appearing)}
          onEntered={(appearing) => callEnter(current.current.props.onEntered, appearing)}
          onExit={() => {
            callExit(current.current.props.onExit);
            prepare(false);
          }}
          onExiting={() => callExit(current.current.props.onExiting)}
          onExited={() => callExit(current.current.props.onExited)}
        >
          {(status, phase, paused = false, terminalCurrent) => (
            <Surface
              props={props}
              status={status}
              phase={phase}
              identity={identity}
              ready={parentReady && measured}
              paused={paused}
              geometry={geometry}
              timing={timing.current}
              resolved={resolved}
              reduce={reduce}
              rootRef={rootHandle}
              wrapperRef={wrapper}
              captureWrapper={captureWrapper}
              terminalCurrent={terminalCurrent}
              measure={measure}
              resolveCollapsed={resolveCollapsed}
            />
          )}
        </NativeTransition>
      </NativeTransitionReadiness.Provider>
    );
  }),
  { muiSupportAuto: true as const },
);
