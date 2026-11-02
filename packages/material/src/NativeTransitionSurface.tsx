import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, type ViewInstance, type GestureResponderEvent } from 'react-native';
import { nativeEasing, stripTiming, type NativeOpacityTiming } from './nativeTransitionTiming';
import type { TransitionProps, TransitionStatus } from './transitions/types';
export interface NativeTransitionTiming {
  opacity: NativeOpacityTiming;
  transform?: NativeOpacityTiming;
}
const animatedTypes = new WeakMap<object, React.ComponentType<any>>();
function animatedType(component: any): React.ComponentType<any> {
  if ((typeof component !== 'function' && typeof component !== 'object') || component === null)
    throw new Error(
      '[mui-native:transition-child] A transition needs a native ref-forwarding component.',
    );
  let result = animatedTypes.get(component);
  if (!result) {
    result = Animated.createAnimatedComponent(component) as React.ComponentType<any>;
    animatedTypes.set(component, result);
  }
  return result;
}
interface SurfaceProps {
  status: Exclude<TransitionStatus, 'unmounted'>;
  phase: number;
  reduce: boolean;
  inProp: boolean;
  timing: NativeTransitionTiming;
  child: React.ReactElement<any>;
  style: TransitionProps['style'];
  native: Record<string, unknown>;
  nodeRef: React.Ref<ViewInstance>;
}
export function NativeTransitionSurface({
  status,
  phase,
  reduce,
  inProp,
  timing,
  child,
  style,
  native,
  nodeRef,
}: SurfaceProps) {
  const [value] = useState(() => new Animated.Value(status === 'entered' ? 1 : 0));
  const [growth] = useState(() =>
    timing.transform ? new Animated.Value(status === 'entered' ? 1 : 0) : undefined,
  );
  const scaleTransform = useMemo(
    () =>
      growth
        ? [
            { scaleX: growth.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) },
            { scaleY: growth.interpolate({ inputRange: [0, 1], outputRange: [0.5625, 1] }) },
          ]
        : undefined,
    [growth],
  );
  const [running, setRunning] = useState(false);
  const [pressed, setPressed] = useState(false);
  const generation = useRef(0),
    lastPhase = useRef(-1),
    phaseReduced = useRef(reduce),
    alive = useRef(false);
  const driver = useRef<{ animation: Animated.CompositeAnimation; target: number } | undefined>(
    undefined,
  );
  const stop = () => {
    generation.current++;
    driver.current?.animation.stop();
    driver.current = undefined;
    value.stopAnimation();
    growth?.stopAnimation();
  };
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stop();
    };
  }, [value]);
  useLayoutEffect(() => {
    const target = status === 'entering' || status === 'entered' ? 1 : 0;
    if (status === 'exited') {
      stop();
      value.setValue(0);
      growth?.setValue(0);
      setRunning(false);
      return;
    }
    if (status === 'entered') {
      if (driver.current?.target !== 1 || reduce) {
        stop();
        value.setValue(1);
        growth?.setValue(1);
        setRunning(false);
      }
      return;
    }
    if (lastPhase.current !== phase) {
      lastPhase.current = phase;
      phaseReduced.current = reduce;
    } else if (reduce) phaseReduced.current = true;
    stop();
    if (phaseReduced.current) {
      value.setValue(target);
      growth?.setValue(target);
      setRunning(false);
      return;
    }
    const token = generation.current;
    setRunning(true);
    const animate = (progress: Animated.Value, time: NativeOpacityTiming) =>
      Animated.timing(progress, {
        toValue: target,
        duration: time.duration,
        delay: time.delay,
        easing: nativeEasing(time.easing),
        useNativeDriver: true,
        isInteraction: false,
      });
    const opacity = animate(value, timing.opacity);
    const animation =
      growth && timing.transform
        ? Animated.parallel([opacity, animate(growth, timing.transform)])
        : opacity;
    driver.current = { animation, target };
    animation.start(() => {
      if (!alive.current || token !== generation.current) return;
      // A current native cancellation (for example detaching an overridden
      // animated style) still needs a terminal value. Retargeted generations
      // are rejected above and retain their own progress.
      driver.current = undefined;
      value.setValue(target);
      growth?.setValue(target);
      setRunning(false);
    });
  }, [status, phase, reduce, value]);
  const Component = useMemo(() => animatedType(child.type), [child.type]);
  const props = { ...child.props, ...native } as Record<string, any>;
  const customStyle = typeof style === 'function' ? style({ pressed }) : style;
  const childStyle =
    typeof child.props.style === 'function' ? child.props.style({ pressed }) : child.props.style;
  const hidden = status === 'exited' && !inProp;
  const computed = [
    {
      opacity:
        running || status === 'entering' || status === 'exiting'
          ? value
          : status === 'entered'
            ? 1
            : 0,
      ...(growth
        ? {
            transform:
              running || status === 'entering' || status === 'exiting'
                ? scaleTransform
                : status === 'entered'
                  ? []
                  : [{ scaleX: 0.75 }, { scaleY: 0.5625 }],
          }
        : {}),
    },
    stripTiming(customStyle),
    childStyle,
    hidden && { opacity: 0 },
  ];
  if (typeof style === 'function' || typeof child.props.style === 'function') {
    const pressIn = props.onPressIn,
      pressOut = props.onPressOut;
    props.onPressIn = (event: GestureResponderEvent) => {
      setPressed(true);
      pressIn?.(event);
    };
    props.onPressOut = (event: GestureResponderEvent) => {
      setPressed(false);
      pressOut?.(event);
    };
  }
  return (
    <Component
      key={child.key}
      {...props}
      ref={nodeRef}
      style={computed}
      pointerEvents={hidden ? 'none' : props.pointerEvents}
      accessibilityElementsHidden={hidden || props.accessibilityElementsHidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : props.importantForAccessibility}
    />
  );
}
