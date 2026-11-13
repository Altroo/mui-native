// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Native motion binding is separate from source style preparation: OS preference
// updates must not execute caller overrides, variants or sx a second time.
import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  type StyleProp,
  View,
  type ViewInstance,
  type ViewProps,
} from 'react-native';
import { Circle, type CircleProps } from 'react-native-svg';
import {
  useNativeTextRootRef,
  type NativeStyle,
  type ReducedMotionMode,
} from '@altroo/mui-native-system';
import { useNativeReducedMotion } from './motionPreference';
import { nativeEasing, nativePropertyTiming } from './nativeTransitionTiming';
import { useCircularProgressRotation, useCircularProgressDash } from './circularProgressMotion';
import { useCircularProgressTransform } from './circularProgressTransform';

// Animated refreshes its own merged ref when the animated prop graph changes.
// Give it an imperative bridge while the actual View owns the public lifecycle.
// This retains one native host and never reports a graph update as a new root.
const ProgressHost = forwardRef<ViewInstance, ViewProps & { nodeRef: React.Ref<ViewInstance> }>(
  function ProgressHost({ nodeRef, ...props }, animatedRef) {
    const { root, ref } = useNativeTextRootRef(nodeRef);
    useImperativeHandle(animatedRef, () => root.current!, []);
    return <View {...props} ref={ref} />;
  },
);
const AnimatedProgressHost = Animated.createAnimatedComponent(ProgressHost);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
export interface CircularProgressMotionStyle {
  motion?: ReducedMotionMode | undefined;
  transitionMotion?: ReducedMotionMode | undefined;
  transition?: string | undefined;
}
export function ProgressRootFrame({
  native,
  nodeRef,
  style,
  sheet,
  variant,
  children,
}: {
  native: Record<string, unknown>;
  nodeRef: React.Ref<ViewInstance>;
  style: StyleProp<NativeStyle>;
  sheet: CircularProgressMotionStyle;
  variant: string;
  children: React.ReactNode;
}) {
  const reduced = useNativeReducedMotion(sheet.motion);
  const rotate = useCircularProgressRotation(variant === 'indeterminate' && !reduced);
  const transitionReduced = useNativeReducedMotion(sheet.transitionMotion);
  const active = variant === 'indeterminate' && !reduced;
  const previousActive = useRef(active);
  const fromAnimation = previousActive.current && !active;
  const timing =
    sheet.transition === undefined
      ? { duration: 0, delay: 0, easing: 'linear' }
      : nativePropertyTiming(
          sheet.transition,
          { duration: 0, delay: 0, easing: 'linear' },
          'transform',
        );
  const transform = useCircularProgressTransform(
    StyleSheet.flatten(style)?.transform,
    timing,
    transitionReduced,
    variant === 'determinate' && !fromAnimation,
  );
  useLayoutEffect(() => {
    previousActive.current = active;
  }, [active]);
  return (
    <AnimatedProgressHost
      {...native}
      nodeRef={nodeRef}
      // Clearing an animated transform must send the native identity list.
      // RN's development payload validator rejects null during property removal.
      style={[
        style,
        { transform: transform ?? [] },
        ...(active ? [{ transform: [{ rotate }] }] : []),
      ]}
    >
      {children}
    </AnimatedProgressHost>
  );
}

export function ProgressCircleFrame({
  native,
  sheet,
  variant,
  disableShrink,
}: {
  native: CircleProps;
  sheet: CircularProgressMotionStyle;
  variant: string;
  disableShrink: boolean;
}) {
  const reduced = useNativeReducedMotion(sheet.motion);
  const transitionReduced = useNativeReducedMotion(sheet.transitionMotion);
  const indeterminate = variant === 'indeterminate',
    determinate = variant === 'determinate';
  const dash = useCircularProgressDash(indeterminate && !reduced, disableShrink);
  const target = Number(native.strokeDashoffset ?? 0);
  const offset = useRef(new Animated.Value(Number.isFinite(target) ? target : 0)).current;
  const previous = useRef(target);
  const previousActive = useRef(indeterminate && !reduced);
  const fromAnimation = previousActive.current && !indeterminate;
  useLayoutEffect(() => {
    previousActive.current = indeterminate && !reduced;
  }, [indeterminate, reduced]);
  const transition = sheet.transition;
  const timing =
    transition === undefined
      ? { duration: 0, delay: 0, easing: 'linear' }
      : nativePropertyTiming(
          transition,
          { duration: 0, delay: 0, easing: 'linear' },
          'stroke-dashoffset',
        );
  const canTransition = timing.duration > 0;
  useEffect(() => {
    offset.stopAnimation();
    if (!determinate || !Number.isFinite(target)) return;
    if (fromAnimation || transitionReduced || target === previous.current || !canTransition) {
      offset.setValue(target);
      previous.current = target;
      return;
    }
    previous.current = target;
    const animation = Animated.timing(offset, {
      toValue: target,
      duration: timing.duration,
      delay: timing.delay,
      easing: nativeEasing(timing.easing),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [target, determinate, transitionReduced, fromAnimation, canTransition, offset]);
  const animated =
    indeterminate && !reduced && !disableShrink
      ? { strokeDasharray: [dash.dashLength, 200], strokeDashoffset: dash.dashOffset }
      : determinate
        ? { strokeDashoffset: offset }
        : {};
  return <AnimatedCircle {...native} {...animated} />;
}
