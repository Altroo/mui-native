import React, { forwardRef, useRef, useState, useCallback, useMemo } from 'react';
import { usePressability, type PressableProps, type ViewInstance } from 'react-native';
import { InteractiveView, setInteractiveHotspot, setInteractivePressed } from './interactiveView';
export const NativePressable: React.ForwardRefExoticComponent<
  PressableProps & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, PressableProps>(function NativePressable(
  {
    children,
    style,
    android_ripple,
    android_disableSound,
    testOnly_pressed,
    onPressIn,
    onPressOut,
    onPressMove,
    onPress,
    onLongPress,
    onHoverIn,
    onHoverOut,
    onFocus,
    onBlur,
    disabled,
    hitSlop,
    pressRetentionOffset,
    delayLongPress,
    delayHoverIn,
    delayHoverOut,
    unstable_pressDelay,
    cancelable,
    blockNativeResponder,
    ...props
  },
  forwarded,
) {
  const local = useRef<ViewInstance | null>(null);
  const [pressed, setPressed] = useState(false);
  const state = { pressed: testOnly_pressed === true || pressed };
  const ref = useCallback(
    (node: ViewInstance | null) => {
      local.current = node;
      let release: (() => void) | void;
      if (typeof forwarded === 'function') release = forwarded(node);
      else if (forwarded) forwarded.current = node;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        if (local.current === node) local.current = null;
        if (typeof release === 'function') release();
        else if (typeof forwarded === 'function') forwarded(null);
        else if (forwarded?.current === node) forwarded.current = null;
      };
    },
    [forwarded],
  );
  const config = useMemo(
    () => ({
      cancelable,
      disabled,
      hitSlop,
      pressRectOffset: pressRetentionOffset,
      android_disableSound,
      delayLongPress,
      delayHoverIn,
      delayHoverOut,
      delayPressIn: unstable_pressDelay,
      blockNativeResponder,
      onBlur,
      onFocus,
      onHoverIn,
      onHoverOut,
      onLongPress,
      onPress,
      onPressIn(event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) {
        setPressed(true);
        if (android_ripple) {
          setInteractiveHotspot(
            local.current,
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
          );
          setInteractivePressed(local.current, true);
        }
        onPressIn?.(event);
      },
      onPressMove(event: Parameters<NonNullable<PressableProps['onPressMove']>>[0]) {
        if (android_ripple)
          setInteractiveHotspot(
            local.current,
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
          );
        onPressMove?.(event);
      },
      onPressOut(event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) {
        setPressed(false);
        setInteractivePressed(local.current, false);
        onPressOut?.(event);
      },
    }),
    [
      cancelable,
      disabled,
      hitSlop,
      pressRetentionOffset,
      android_disableSound,
      delayLongPress,
      delayHoverIn,
      delayHoverOut,
      unstable_pressDelay,
      blockNativeResponder,
      onBlur,
      onFocus,
      onHoverIn,
      onHoverOut,
      onLongPress,
      onPress,
      onPressIn,
      onPressOut,
      onPressMove,
      android_ripple,
    ],
  );
  const handlers = usePressability(config);
  return (
    <InteractiveView
      {...props}
      {...handlers}
      ref={ref}
      accessible={props.accessible !== false}
      aria-disabled={disabled ?? props['aria-disabled']}
      accessibilityState={
        disabled == null ? props.accessibilityState : { ...props.accessibilityState, disabled }
      }
      focusable={props.focusable !== false}
      hitSlop={hitSlop}
      rippleEnabled={android_ripple != null}
      rippleColor={android_ripple?.color}
      rippleRadius={android_ripple?.radius}
      rippleBorderless={android_ripple?.borderless}
      rippleForeground={android_ripple?.foreground}
      style={typeof style === 'function' ? style(state) : style}
    >
      {typeof children === 'function' ? children(state) : children}
    </InteractiveView>
  );
});
