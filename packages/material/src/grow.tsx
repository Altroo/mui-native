import React, { forwardRef, useCallback, useInsertionEffect, useRef } from 'react';
import {
  StyleSheet,
  type ViewInstance,
  type ViewStyle,
  type LayoutChangeEvent,
} from 'react-native';
import { diagnostic } from '@altroo/mui-native-system';
import { useTheme } from './themeProvider';
import { useForkRef } from './utils';
import { useNativeReducedMotion } from './motionPreference';
import NativeTransition from './NativeTransition';
import { NativeTransitionSurface, type NativeTransitionTiming } from './NativeTransitionSurface';
import { nativeMilliseconds, nativePropertyTiming } from './nativeTransitionTiming';
import type { TransitionProps } from './transitions/types';
export interface GrowProps extends Omit<TransitionProps, 'children' | 'timeout'> {
  children: React.ReactElement<any>;
  ref?: React.Ref<ViewInstance>;
  timeout?: TransitionProps['timeout'] | 'auto';
}
export const Grow: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<GrowProps> & React.RefAttributes<ViewInstance>
> & { muiSupportAuto: true } = Object.assign(
  forwardRef<ViewInstance, GrowProps>(function Grow(props, ref) {
    const theme = useTheme();
    const {
      in: inProp = false,
      appear = true,
      enter = true,
      exit = true,
      mountOnEnter = false,
      unmountOnExit = false,
      timeout = 'auto',
      children,
      style,
      easing,
      addEndListener,
      disablePrefersReducedMotion = false,
      onEnter,
      onEntering,
      onEntered,
      onExit,
      onExiting,
      onExited,
      ...native
    } = props;
    const reduced = useNativeReducedMotion(
      theme.motion?.reducedMotion,
      disablePrefersReducedMotion,
    );
    const node = useRef<ViewInstance | null>(null);
    // Weak keys preserve layout across a transient callback-ref detach without
    // retaining native nodes after actual child unmounts.
    const measured = useRef(new WeakMap<ViewInstance, number>());
    const handleRef = useForkRef(node, children.props.ref, ref);
    const autoTimeout = useRef<number | null>(null);
    const timing = useRef<NativeTransitionTiming>({
      opacity: { duration: 0, delay: 0, easing: theme.transitions.easing.easeInOut },
      transform: { duration: 0, delay: 0, easing: theme.transitions.easing.easeInOut },
    });
    const current = useRef({ props, timeout, theme, reduced });
    useInsertionEffect(() => {
      current.current = { props, timeout, theme, reduced };
    });
    const height = () => {
      const target = node.current;
      try {
        const value = target?.clientHeight;
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
      } catch {
        /* Custom native handles can expose unavailable geometry getters. */
      }
      const cached = target ? measured.current.get(target) : undefined;
      if (cached !== undefined) return cached;
      diagnostic(
        'transition-height',
        'Grow auto timing requires a native clientHeight or an onLayout measurement; using zero until measured.',
      );
      return 0;
    };
    const prepare = (entering: boolean) => {
      const p = current.current;
      const authored = p.props.style;
      const resolved = StyleSheet.flatten(
        (typeof authored === 'function' ? authored({ pressed: false }) : authored) as ViewStyle,
      ) as Record<string, any> | undefined;
      let duration: number | string =
        resolved?.transitionDuration ??
        (typeof p.timeout === 'number'
          ? p.timeout
          : p.timeout === 'auto'
            ? 0
            : ((entering ? p.timeout?.enter : p.timeout?.exit) ?? 0));
      if (p.timeout === 'auto' && !p.reduced) {
        duration = p.theme.transitions.getAutoHeightDuration(height());
        autoTimeout.current = duration;
      } else autoTimeout.current = null;
      const delay = resolved?.transitionDelay;
      const curve =
        resolved?.transitionTimingFunction ??
        (typeof p.props.easing === 'string'
          ? p.props.easing
          : entering
            ? p.props.easing?.enter
            : p.props.easing?.exit);
      const opacityOptions = {
        duration: p.reduced ? 0 : duration,
        delay: p.reduced ? '0ms' : delay,
      };
      const transformOptions = {
        duration: p.reduced ? 0 : typeof duration === 'string' ? duration : duration * 0.666,
        delay: p.reduced
          ? '0ms'
          : entering
            ? delay
            : delay || (typeof duration === 'string' ? duration : duration * 0.333),
        easing: curve,
      };
      const fallback = (options: typeof opacityOptions & { easing?: string }) => ({
        duration: nativeMilliseconds(options.duration),
        delay: nativeMilliseconds(options.delay),
        easing: options.easing ?? p.theme.transitions.easing.easeInOut,
      });
      timing.current = {
        opacity: nativePropertyTiming(
          p.theme.transitions.create('opacity', opacityOptions),
          fallback(opacityOptions),
          'opacity',
        ),
        transform: nativePropertyTiming(
          p.theme.transitions.create('transform', transformOptions),
          fallback(transformOptions),
          'transform',
        ),
      };
    };
    const callEnter = (handler: GrowProps['onEnter'], appearing: boolean) => {
      if (node.current) handler?.(node.current, appearing);
    };
    const callExit = (handler: GrowProps['onExit']) => {
      if (node.current) handler?.(node.current);
    };
    const { ownerState: _ownerState, ...forwardedNative } = native as Record<string, unknown>;
    const onLayout = (event: LayoutChangeEvent) => {
      const value = event.nativeEvent.layout.height;
      if (node.current && Number.isFinite(value) && value >= 0)
        measured.current.set(node.current, value);
      const p = current.current.props;
      const handler = Object.hasOwn(p, 'onLayout') ? p.onLayout : p.children.props.onLayout;
      handler?.(event);
    };
    return (
      <NativeTransition
        in={inProp}
        appear={appear}
        enter={enter}
        exit={exit}
        mountOnEnter={mountOnEnter}
        unmountOnExit={unmountOnExit}
        timeout={timeout === 'auto' ? undefined : timeout}
        getAutoTimeout={timeout === 'auto' ? () => autoTimeout.current : undefined}
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
            timing={timing.current}
            child={children}
            style={style}
            native={{ ...forwardedNative, onLayout }}
            nodeRef={handleRef}
          />
        )}
      </NativeTransition>
    );
  }),
  { muiSupportAuto: true as const },
);
