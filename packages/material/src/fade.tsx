import React, {
  forwardRef,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  StyleSheet,
  type ViewInstance,
  type ViewStyle,
  type GestureResponderEvent,
} from 'react-native';
import { useTheme } from './themeProvider';
import { useForkRef } from './utils';
import { useNativeReducedMotion } from './motionPreference';
import {
  nativeEasing,
  nativeMilliseconds,
  nativeOpacityTiming,
  stripTiming,
} from './nativeTransitionTiming';
import NativeTransition from './NativeTransition';
import type { TransitionProps, TransitionStatus } from './transitions/types';
export interface FadeProps extends Omit<TransitionProps, 'children'> {
  children: React.ReactElement<any>;
}
interface Timing {
  duration: number;
  delay: number;
  easing: string;
}
const animatedTypes = new WeakMap<object, React.ComponentType<any>>();
function animatedType(component: any): React.ComponentType<any> {
  if ((typeof component !== 'function' && typeof component !== 'object') || component === null)
    throw new Error('[mui-native:transition-child] Fade needs a native ref-forwarding component.');
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
  timing: Timing;
  child: React.ReactElement<any>;
  style: TransitionProps['style'];
  native: Record<string, unknown>;
  nodeRef: React.Ref<ViewInstance>;
}
function FadeSurface({
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
      setRunning(false);
      return;
    }
    if (status === 'entered') {
      if (driver.current?.target !== 1 || reduce) {
        stop();
        value.setValue(1);
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
      setRunning(false);
      return;
    }
    const token = generation.current;
    setRunning(true);
    const animation = Animated.timing(value, {
      toValue: target,
      duration: timing.duration,
      delay: timing.delay,
      easing: nativeEasing(timing.easing),
      useNativeDriver: true,
      isInteraction: false,
    });
    driver.current = { animation, target };
    animation.start(({ finished }) => {
      if (!finished || !alive.current || token !== generation.current) return;
      driver.current = undefined;
      value.setValue(target);
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
      {...props}
      ref={nodeRef}
      style={computed}
      pointerEvents={hidden ? 'none' : props.pointerEvents}
      accessibilityElementsHidden={hidden || props.accessibilityElementsHidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : props.importantForAccessibility}
    />
  );
}
export const Fade: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<FadeProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, FadeProps>(function Fade(props, ref) {
  const theme = useTheme();
  const {
    in: inProp = false,
    appear = true,
    enter = true,
    exit = true,
    mountOnEnter = false,
    unmountOnExit = false,
    children,
    timeout = {
      enter: theme.transitions.duration.enteringScreen,
      exit: theme.transitions.duration.leavingScreen,
    },
    easing,
    addEndListener,
    disablePrefersReducedMotion = false,
    onEnter,
    onEntering,
    onEntered,
    onExit,
    onExiting,
    onExited,
    style,
    ...native
  } = props;
  const { ownerState: _ownerState, ...forwardedNative } = native as Record<string, unknown>;
  const reduced = useNativeReducedMotion(theme.motion?.reducedMotion, disablePrefersReducedMotion);
  const node = useRef<ViewInstance | null>(null);
  const handleRef = useForkRef(node, children.props.ref, ref);
  const timing = useRef<Timing>({
    duration: 0,
    delay: 0,
    easing: theme.transitions.easing.easeInOut,
  });
  const current = useRef({ props, timeout, easing, theme, reduced });
  useInsertionEffect(() => {
    current.current = { props, timeout, easing, theme, reduced };
  });
  const prepare = (entering: boolean) => {
    const p = current.current;
    const authored = p.props.style;
    const resolved = StyleSheet.flatten(
      (typeof authored === 'function' ? authored({ pressed: false }) : authored) as ViewStyle,
    ) as Record<string, any> | undefined;
    const duration =
      resolved?.transitionDuration ??
      (typeof p.timeout === 'number'
        ? p.timeout
        : ((entering ? p.timeout?.enter : p.timeout?.exit) ?? 0));
    const curve =
      resolved?.transitionTimingFunction ??
      (typeof p.easing === 'string' ? p.easing : entering ? p.easing?.enter : p.easing?.exit);
    const delay = resolved?.transitionDelay;
    const options = {
      duration: p.reduced ? 0 : duration,
      easing: curve,
      delay: p.reduced ? '0ms' : delay,
    };
    timing.current = nativeOpacityTiming(p.theme.transitions.create('opacity', options), {
      duration: nativeMilliseconds(options.duration),
      delay: nativeMilliseconds(options.delay),
      easing: curve ?? p.theme.transitions.easing.easeInOut,
    });
  };
  const callEnter = (handler: FadeProps['onEnter'], appearing: boolean) => {
    if (node.current) handler?.(node.current, appearing);
  };
  const callExit = (handler: FadeProps['onExit']) => {
    if (node.current) handler?.(node.current);
  };
  return (
    <NativeTransition
      in={inProp}
      appear={appear}
      enter={enter}
      exit={exit}
      mountOnEnter={mountOnEnter}
      unmountOnExit={unmountOnExit}
      timeout={timeout}
      reduceMotion={reduced}
      nodeRef={node}
      addEndListener={addEndListener}
      onEnter={(appearing) => {
        prepare(true);
        callEnter(current.current.props.onEnter, appearing);
      }}
      onEntering={(appearing) => callEnter(current.current.props.onEntering, appearing)}
      onEntered={(appearing) => callEnter(current.current.props.onEntered, appearing)}
      onExit={() => {
        prepare(false);
        callExit(current.current.props.onExit);
      }}
      onExiting={() => callExit(current.current.props.onExiting)}
      onExited={() => callExit(current.current.props.onExited)}
    >
      {(status, phase) => (
        <FadeSurface
          status={status}
          phase={phase}
          reduce={reduced}
          inProp={inProp}
          timing={timing.current}
          child={children}
          style={style}
          native={forwardedNative}
          nodeRef={handleRef}
        />
      )}
    </NativeTransition>
  );
});
