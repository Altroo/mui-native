import React, { forwardRef, useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, useWindowDimensions, type ViewInstance } from 'react-native';
import {
  useDefaultProps,
  resolveSlotProps,
  NativeTextScope,
  lighten,
  darken,
  alpha,
} from '@altroo/mui-native-system';
import { useTheme } from './themeProvider';
import { NativeCheckedControl, type NativeCheckedVisualState } from './checkControls';
import { useNativeReducedMotion } from './motionPreference';
import { namedStyle, authoredStyle, directionOf, mergeNativeStyles } from './switchStyles';
import { nativeEasing } from './nativeTransitionTiming';
import type { CheckboxProps } from './checkedTypes';
import type { SwitchProps, SwitchOwnerState } from './switchTypes';
export type * from './switchTypes';
export { switchClasses, getSwitchUtilityClass } from './switchClasses';
export type { SwitchClasses, SwitchClassKey } from './switchClasses';
const cap = (value: string) => value[0].toUpperCase() + value.slice(1);
function ThumbMotion({
  checked,
  travel,
  duration,
  reduced,
  easing,
  children,
}: {
  checked: boolean;
  travel: number;
  duration: number;
  reduced: boolean;
  easing: string;
  children: React.ReactNode;
}) {
  const target = checked ? travel : 0,
    offset = useRef(new Animated.Value(target)).current;
  const goal = useRef(target),
    running = useRef(false),
    generation = useRef(0);
  useEffect(() => {
    const next = checked ? travel : 0;
    if (!running.current && goal.current === next) return;
    goal.current = next;
    const version = ++generation.current;
    offset.stopAnimation();
    if (reduced || duration === 0) {
      running.current = false;
      offset.setValue(next);
      return;
    }
    running.current = true;
    const animation = Animated.timing(offset, {
      toValue: next,
      duration,
      easing: nativeEasing(easing),
      useNativeDriver: true,
    });
    animation.start(() => {
      if (generation.current === version) running.current = false;
    });
    return () => {
      generation.current++;
      animation.stop();
    };
  }, [checked, travel, duration, reduced, easing, offset]);
  return <Animated.View style={{ transform: [{ translateX: offset }] }}>{children}</Animated.View>;
}
export const Switch: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<SwitchProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, SwitchProps>(function Switch(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiSwitch' }),
    theme = useTheme(),
    { width } = useWindowDimensions();
  const {
    color = 'primary',
    size = 'medium',
    edge = false,
    sx,
    slots = {},
    slotProps = {},
    icon,
    checkedIcon,
    ...control
  } = props;
  const owner: SwitchOwnerState = { ...props, color, size, edge };
  const root = resolveSlotProps(slotProps.root, owner) ?? {},
    thumb = resolveSlotProps(slotProps.thumb, owner) ?? {},
    track = resolveSlotProps(slotProps.track, owner) ?? {};
  const base = resolveSlotProps(slotProps.switchBase, owner) ?? {},
    input = resolveSlotProps(slotProps.input, owner) ?? {};
  const Root = slots.root ?? View,
    Thumb = slots.thumb ?? View,
    Track = slots.track ?? View;
  const small = size === 'small',
    diameter = small ? 16 : 20,
    travel = small ? 16 : 20,
    boxWidth = small ? 44 : 58;
  const reduced = useNativeReducedMotion(theme.motion.reducedMotion),
    duration = theme.transitions.duration.shortest;
  const tones = (state: NativeCheckedVisualState) => {
    const palette = (theme.palette as any)[color],
      main = palette?.main ?? theme.palette.primary.main;
    const thumbColor = state.disabled
      ? state.checked && color !== 'default'
        ? theme.palette.mode === 'light'
          ? lighten(main, 0.62)
          : darken(main, 0.55)
        : theme.palette.mode === 'light'
          ? theme.palette.grey[100]
          : theme.palette.grey[600]
      : state.checked && color !== 'default'
        ? main
        : theme.palette.mode === 'light'
          ? theme.palette.common.white
          : theme.palette.grey[300];
    const trackColor =
      state.checked && color !== 'default'
        ? main
        : theme.palette.mode === 'light'
          ? theme.palette.common.black
          : theme.palette.common.white;
    return {
      thumbColor,
      trackColor,
      opacity: state.disabled
        ? theme.palette.mode === 'light'
          ? 0.12
          : 0.2
        : state.checked
          ? 0.5
          : theme.palette.mode === 'light'
            ? 0.38
            : 0.3,
    };
  };
  const {
    checked: _bc,
    defaultChecked: _bd,
    name: _bn,
    value: _bv,
    id: _bi,
    readOnly: _br,
    required: _bq,
    disabled: _bx,
    autoFocus: _ba,
    ...baseController
  } = base;
  const rootStyle = namedStyle(
    theme,
    'root',
    owner,
    width,
    undefined,
    {
      width: boxWidth,
      height: 44,
      paddingLeft: small ? 9 : 12,
      paddingRight: small ? 9 : 12,
      paddingTop: small ? 17 : 15,
      paddingBottom: small ? 17 : 15,
      minHeight: 44,
      position: 'relative',
      flexShrink: 0,
      alignSelf: 'flex-start',
      alignItems: 'center',
      justifyContent: 'center',
      direction: theme.direction,
      ...(edge ? { [edge === 'start' ? 'marginStart' : 'marginEnd']: -8 } : {}),
    },
    Object.hasOwn(root, 'sx') ? root.sx : sx,
    [`size${cap(size)}`, ...(edge ? [`edge${cap(edge)}`] : [])],
    {
      parentDirection: theme.direction,
      nativeDirection: StyleSheet.flatten(root.style)?.direction,
    },
  );

  const frameStyle = StyleSheet.flatten(authoredStyle(rootStyle, root, theme.direction)) ?? {};
  const direction = directionOf(frameStyle.direction, theme.direction);
  const model = {
    ...control,
    color,
    size,
    edge: false,
    slots: { root: slots.switchBase ?? props.component, input: slots.input },
    slotProps: { root: baseController, input },
    sx: undefined,
    icon: undefined,
    checkedIcon: undefined,
  } as CheckboxProps;
  return (
    <NativeCheckedControl
      kind="checkbox"
      props={model}
      forwarded={ref}
      presentation={{
        owner: owner as Record<string, unknown>,
        role: 'switch',
        bubbleChange: true,
        mergeStyle: (base, ...layers) => mergeNativeStyles(direction, base, ...layers),
        style: (state, native) =>
          namedStyle(
            theme,
            'switchBase',
            owner,
            width,
            state,
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              minWidth: 0,
              minHeight: 44,
              padding: 0,
              alignItems: 'flex-start',
              justifyContent: 'center',
              borderRadius: 9999,
              color: tones(state).thumbColor,
              direction,
              backgroundColor:
                state.hovered && !state.disabled && !props.disableRipple
                  ? alpha(
                      state.checked && color !== 'default'
                        ? ((theme.palette as any)[color]?.main ?? theme.palette.primary.main)
                        : theme.palette.action.active,
                      theme.palette.action.hoverOpacity,
                    )
                  : 'transparent',
            },
            base.sx,
            color !== 'default' ? [`color${cap(color)}`] : [],
            { parentDirection: direction, nativeDirection: native?.direction },
          ),
        content: (state, style) => {
          const thumbStyle = namedStyle(
            theme,
            'thumb',
            owner,
            width,
            state,
            {
              width: diameter,
              height: diameter,
              borderRadius: 9999,
              backgroundColor: style.color,
              borderWidth: 1,
              borderColor: 'transparent',
              boxShadow: 1,
            },
            thumb.sx,
            [],
            {
              parentDirection: directionOf(style.direction, direction),
              nativeDirection: StyleSheet.flatten(thumb.style)?.direction,
            },
          );
          const { style: _style, sx: _sx, ownerState: _owner, ...native } = thumb;
          const chosen = state.checked ? checkedIcon : icon;
          const content =
            chosen === undefined ? (
              <Thumb
                {...native}
                {...(Thumb !== View ? { ownerState: owner } : {})}
                style={authoredStyle(thumbStyle, thumb, directionOf(style.direction, direction))}
              />
            ) : (
              chosen
            );
          return (
            <View style={{ marginStart: small ? 6 : 9 }}>
              <ThumbMotion
                checked={state.checked}
                travel={directionOf(style.direction, direction) === 'rtl' ? -travel : travel}
                duration={duration}
                reduced={reduced}
                easing={theme.transitions.easing.easeInOut}
              >
                <NativeTextScope
                  theme={theme}
                  style={{ color: style.color, fontSize: diameter }}
                  content={content}
                >
                  {(_native, children) => <View>{children}</View>}
                </NativeTextScope>
              </ThumbMotion>
            </View>
          );
        },
        wrap: (children, state) => {
          const colors = tones(state),
            trackStyle = namedStyle(
              theme,
              'track',
              owner,
              width,
              state,
              {
                width: '100%',
                height: '100%',
                borderRadius: 7,
                backgroundColor: colors.trackColor,
                opacity: colors.opacity,
              },
              track.sx,
              [],
              {
                parentDirection: direction,
                nativeDirection: StyleSheet.flatten(track.style)?.direction,
              },
            );
          const { style: _rs, sx: _rx, ownerState: _ro, ...rootNative } = root,
            { style: _ts, sx: _tx, ownerState: _to, ...trackNative } = track;
          return (
            <Root
              {...rootNative}
              {...(Root !== View ? { ownerState: owner } : {})}
              accessible={false}
              focusable={false}
              tabIndex={-1}
              style={frameStyle}
            >
              <NativeTextScope
                theme={theme}
                content={
                  <Track
                    {...trackNative}
                    {...(Track !== View ? { ownerState: owner } : {})}
                    pointerEvents="none"
                    accessible={false}
                    focusable={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={authoredStyle(trackStyle, track, direction)}
                  />
                }
              >
                {(_native, content) => content}
              </NativeTextScope>
              {children}
            </Root>
          );
        },
      }}
    />
  );
});
