// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Motion timing adapts MIT Material UI 9.5.0. See NOTICE and upstream/circular-progress.json.
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/** Shared native nodes drive rotation and SVG dash props without frame listeners. */
export function useCircularProgressRotation(active: boolean) {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    rotation.setValue(0);
    if (!active) return;
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, rotation]);
  return active
    ? rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    : '0deg';
}

export function useCircularProgressDash(active: boolean, disableShrink: boolean) {
  const dash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    dash.setValue(0);
    if (!active || disableShrink) return;
    const ease = Easing.bezier(0.42, 0, 0.58, 1);
    // CSS eases each half independently. Bake both halves into one native
    // timing curve so an infinite loop needs no JavaScript sequence callbacks.
    const loop = Animated.loop(
      Animated.timing(dash, {
        toValue: 1,
        duration: 1400,
        easing: (time) => (time <= 0.5 ? ease(time * 2) / 2 : 0.5 + ease(time * 2 - 1) / 2),
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, disableShrink, dash]);
  return {
    dashLength:
      active && !disableShrink
        ? dash.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 100, 1] })
        : 80,
    dashOffset:
      active && !disableShrink
        ? dash.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -15, -126] })
        : 0,
  };
}
