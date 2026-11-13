// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Native animation bindings adapt the MIT keyframes in upstream/linear-progress.json.
// Keep motion subscriptions below styled preparation so OS changes never replay callers.
import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type ViewInstance,
  type ViewProps,
  type StyleProp,
} from 'react-native';
import Svg, { Circle, Defs, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useNativeTextContext, type NativeStyle } from '@altroo/mui-native-system';
import { useNativeReducedMotion } from './motionPreference';
import { nativeEasing, nativePropertyTiming } from './nativeTransitionTiming';
import { nativeProgressTransformList } from './circularProgressTransform';
import type { LinearProgressSheet } from './linearProgress';

const Viewport = createContext(0);
export function LinearProgressRootFrame({
  native,
  nodeRef,
  style,
  inheritTrack,
  children,
}: {
  native: Record<string, unknown>;
  nodeRef: React.Ref<ViewInstance>;
  style: StyleProp<NativeStyle>;
  inheritTrack: boolean;
  children: React.ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const inherited = useNativeTextContext();
  return (
    <View
      {...native}
      ref={nodeRef}
      style={style}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (Number.isFinite(next) && next >= 0)
          setWidth((previous) => (previous === next ? previous : next));
        (native.onLayout as ViewProps['onLayout'])?.(event);
      }}
    >
      {inheritTrack ? (
        <View
          accessible={false}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: inherited?.style.color ?? '#000000', opacity: 0.3 },
          ]}
        />
      ) : null}
      <Viewport.Provider value={width}>{children}</Viewport.Provider>
    </View>
  );
}

/** Bake CSS's eased 0..60% segment into a single native-driver timing graph. */
export function linearProgressKeyframeEasing(slot: 'bar1' | 'bar2') {
  const ease =
    slot === 'bar1'
      ? Easing.bezier(0.65, 0.815, 0.735, 0.395)
      : Easing.bezier(0.165, 0.84, 0.44, 1);
  return (time: number) => (time <= 0.6 ? ease(time / 0.6) * 0.6 : time);
}
export function useLinearProgressPhase(active: boolean, slot: 'bar1' | 'bar2' | 'dashed') {
  const phase = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    phase.setValue(0);
    if (!active) return;
    const loop = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: slot === 'dashed' ? 3000 : 2100,
        easing: slot === 'dashed' ? Easing.linear : linearProgressKeyframeEasing(slot),
        isInteraction: false,
        useNativeDriver: true,
      }),
    );
    // CSS applies the second bar's delay once, rather than once on every loop.
    const animation =
      slot === 'bar2'
        ? Animated.sequence([
            Animated.timing(new Animated.Value(0), {
              toValue: 0,
              duration: 1150,
              easing: Easing.linear,
              useNativeDriver: true,
              isInteraction: false,
            }),
            loop,
          ])
        : loop;
    animation.start();
    return () => animation.stop();
  }, [active, slot, phase]);
  return phase;
}
function usePercentTranslation(
  target: number,
  sheet: LinearProgressSheet,
  variant: string,
  color: string,
  reduced: boolean,
) {
  const percent = useRef(new Animated.Value(target)).current;
  const previous = useRef(target);
  const declaration =
    variant === 'determinate'
      ? sheet.determinateTransition
      : variant === 'buffer'
        ? (sheet.bufferTransitions?.[color] ?? sheet.bufferTransitions?.['*'] ?? sheet.transition)
        : sheet.transition;
  const timing =
    declaration === undefined
      ? { duration: 0, delay: 0, easing: 'linear' }
      : nativePropertyTiming(
          declaration,
          { duration: 200, delay: 0, easing: 'linear' },
          'transform',
        );
  useLayoutEffect(() => {
    // Timing-only updates keep the running native animation. Disabling it snaps.
    if (Object.is(previous.current, target)) {
      if (reduced || timing.duration === 0) {
        percent.stopAnimation();
        percent.setValue(target);
      }
      return;
    }
    previous.current = target;
    if (reduced || timing.duration === 0) {
      percent.stopAnimation();
      percent.setValue(target);
      return;
    }
    const animation = Animated.timing(percent, {
      toValue: target,
      duration: timing.duration,
      delay: timing.delay,
      easing: nativeEasing(timing.easing),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    // A new target replaces the previous driver without jumping to its old target.
  }, [target, reduced, timing.duration, timing.delay, timing.easing, percent]);
  useEffect(() => () => percent.stopAnimation(), [percent]);
  return percent;
}
/** Keep native channels attached: RN restores removed Animated props asynchronously.
 * Persistent selectors mask late phase updates instead of swapping a graph for constants. */
export function useLinearProgressBarGeometry(
  phase: Animated.Value,
  translation: Animated.Value,
  width: number,
  loading: boolean,
  reduced: boolean,
  slot: 'bar1' | 'bar2',
) {
  const nativeWidth = useRef(new Animated.Value(width)).current;
  const reducedMode = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const loadingMode = useRef(new Animated.Value(loading ? 1 : 0)).current;
  useLayoutEffect(() => nativeWidth.setValue(width), [nativeWidth, width]);
  useLayoutEffect(() => reducedMode.setValue(reduced ? 1 : 0), [reducedMode, reduced]);
  useLayoutEffect(() => loadingMode.setValue(loading ? 1 : 0), [loadingMode, loading]);
  return useMemo(() => {
    const moving = Animated.subtract(1, reducedMode),
      known = Animated.subtract(1, loadingMode);
    const left = phase.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: slot === 'bar1' ? [-0.35, 1, 1] : [-2, 1.07, 1.07],
    });
    const scale = phase.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: slot === 'bar1' ? [0.35, 0.9, 0.9] : [2, 0.01, 0.01],
    });
    const loadingLeft = Animated.add(
      Animated.multiply(left, moving),
      Animated.multiply(reducedMode, 0.3),
    );
    const loadingScale = Animated.add(
      Animated.multiply(scale, moving),
      Animated.multiply(reducedMode, 0.4),
    );
    return {
      translateX: Animated.multiply(
        Animated.add(
          Animated.multiply(loadingLeft, loadingMode),
          Animated.multiply(translation, known),
        ),
        nativeWidth,
      ),
      scaleX: Animated.add(Animated.multiply(loadingScale, loadingMode), known),
    };
  }, [phase, translation, slot, nativeWidth, reducedMode, loadingMode]);
}

export function useLinearProgressBufferGeometry(
  phase: Animated.Value,
  reduced: boolean,
  authoredOpacity: number,
) {
  const reducedMode = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useLayoutEffect(() => reducedMode.setValue(reduced ? 1 : 0), [reducedMode, reduced]);
  return useMemo(() => {
    const moving = Animated.subtract(1, reducedMode);
    const opacity = phase.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0, 1] });
    const offset = phase.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, -200] });
    return {
      opacity: Animated.multiply(
        Animated.add(Animated.multiply(opacity, moving), reducedMode),
        authoredOpacity,
      ),
      translateX: Animated.multiply(offset, moving),
    };
  }, [phase, reducedMode, authoredOpacity]);
}

export function LinearProgressBarFrame({
  style,
  inline,
  sheet,
  slot,
  owner,
}: {
  style: StyleProp<NativeStyle>;
  inline?: Record<string, unknown> | undefined;
  sheet: LinearProgressSheet;
  slot: 'bar1' | 'bar2';
  owner: { variant: string; color: string };
}) {
  const width = useContext(Viewport),
    inherited = useNativeTextContext();
  const reduced = useNativeReducedMotion(sheet.motion),
    transitionReduced = useNativeReducedMotion(sheet.transitionMotion);
  const loading = owner.variant === 'indeterminate' || owner.variant === 'query';
  const phase = useLinearProgressPhase(loading && !reduced, slot);
  const { backgroundColor, transform, ...native } = StyleSheet.flatten(style) ?? {};
  const match =
    typeof inline?.transform === 'string'
      ? inline.transform.match(/^translateX\(([-+.\deE]+)%\)$/)
      : undefined;
  // Preserve unclamped source paint geometry; exclude nonfinite values at the native boundary.
  const parsed = match ? Number(match[1]) / 100 : 0;
  const target = Number.isFinite(parsed) ? parsed : -1;
  const translation = usePercentTranslation(
    target,
    sheet,
    owner.variant,
    owner.color,
    transitionReduced,
  );
  const binding = useLinearProgressBarGeometry(phase, translation, width, loading, reduced, slot);
  const inheritedColor = inherited?.style.color ?? '#000000';
  const color =
    backgroundColor === 'currentColor' || backgroundColor === 'inherit'
      ? inheritedColor
      : backgroundColor;
  const geometry = [{ translateX: binding.translateX }, { scaleX: binding.scaleX }];
  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no"
      pointerEvents="none"
      style={[
        native,
        {
          backgroundColor: color,
          transformOrigin: native.transformOrigin ?? 'left center',
          transform: [
            geometry[0],
            ...(!match ? (nativeProgressTransformList(transform) ?? []) : []),
            ...geometry.slice(1),
          ],
        },
        loading && reduced && slot === 'bar2' ? { display: 'none' } : null,
      ]}
    />
  );
}
export function LinearProgressDashedFrame({
  style,
  sheet,
  color,
}: {
  style: StyleProp<NativeStyle>;
  sheet: LinearProgressSheet;
  color: unknown;
}) {
  const reduced = useNativeReducedMotion(sheet.motion),
    phase = useLinearProgressPhase(!reduced, 'dashed');
  const width = useContext(Viewport);
  const [paintSize, setPaintSize] = useState({ width: 0, height: 0 });
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { opacity: authoredOpacity = 1, ...native } = StyleSheet.flatten(style) ?? {};
  const binding = useLinearProgressBufferGeometry(phase, reduced, authoredOpacity);
  return (
    <Animated.View
      accessible={false}
      pointerEvents="none"
      onLayout={(event) => {
        const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
        if (
          !Number.isFinite(nextWidth) ||
          !Number.isFinite(nextHeight) ||
          nextWidth < 0 ||
          nextHeight < 0
        )
          return;
        setPaintSize((previous) =>
          previous.width === nextWidth && previous.height === nextHeight
            ? previous
            : { width: nextWidth, height: nextHeight },
        );
      }}
      style={[
        native,
        {
          width: width + 200,
          opacity: binding.opacity,
          transform: [{ translateX: binding.translateX }],
        },
      ]}
    >
      {color !== undefined ? (
        <Svg width="100%" height="100%" accessible={false}>
          <Defs>
            <RadialGradient id={'gradient' + id} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={color as string} stopOpacity={1} />
              <Stop offset="16%" stopColor={color as string} stopOpacity={1} />
              <Stop offset="42%" stopColor={color as string} stopOpacity={0} />
            </RadialGradient>
            <Pattern
              id={'dots' + id}
              patternUnits="userSpaceOnUse"
              x={0}
              y={-23}
              width={10}
              height={10}
            >
              <Circle cx={5} cy={5} r={Math.SQRT2 * 5} fill={'url(#gradient' + id + ')'} />
            </Pattern>
          </Defs>
          {/* The pinned SVG peer caches percentage paths across viewport resizes.
           * Concrete host dimensions invalidate that path on both native platforms. */}
          <Rect width={paintSize.width} height={paintSize.height} fill={'url(#dots' + id + ')'} />
        </Svg>
      ) : null}
    </Animated.View>
  );
}
