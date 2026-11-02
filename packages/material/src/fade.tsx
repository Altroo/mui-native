import React, { forwardRef, useInsertionEffect, useRef } from 'react';
import { StyleSheet, type ViewInstance, type ViewStyle } from 'react-native';
import { useTheme } from './themeProvider';
import { useForkRef } from './utils';
import { useNativeReducedMotion } from './motionPreference';
import { nativeMilliseconds, nativeOpacityTiming } from './nativeTransitionTiming';
import NativeTransition from './NativeTransition';
import { NativeTransitionSurface } from './NativeTransitionSurface';
import type { NativeOpacityTiming } from './nativeTransitionTiming';
import type { TransitionProps } from './transitions/types';
export interface FadeProps extends Omit<TransitionProps, 'children'> {
  children: React.ReactElement<any>;
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
  const timing = useRef<NativeOpacityTiming>({
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
        <NativeTransitionSurface
          status={status}
          phase={phase}
          reduce={reduced}
          inProp={inProp}
          timing={{ opacity: timing.current }}
          child={children}
          style={style}
          native={forwardedNative}
          nodeRef={handleRef}
        />
      )}
    </NativeTransition>
  );
});
