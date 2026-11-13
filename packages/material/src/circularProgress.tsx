/* CircularProgress defaults, slots and geometry adapt MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/circular-progress.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { nativeProgressAccessibilityValue } from './nativeProgressAccessibility';
import React, { forwardRef, useCallback, useContext, useRef } from 'react';
import { StyleSheet, useWindowDimensions, type ViewInstance } from 'react-native';
import Svg, { Circle, type CircleProps, type SvgProps } from 'react-native-svg';
import {
  useNativeRootProps,
  useNativeTextContext,
  useNativeTextRootRef,
  NativeTextScope,
  componentRootStyle,
  nativeTextStyleContext,
  resolveSx,
  joinClassNames,
  type NativeStyle,
  type SxProps,
  type Theme,
} from '@altroo/mui-native-system';
import { useNativeStyledTheme } from './themeProvider';
import {
  ProgressRootFrame,
  ProgressCircleFrame,
  type CircularProgressMotionStyle,
} from './circularProgressFrames';
import { NativeStyleScope, nativeStyleAncestors, useNativeStyleRef } from './nativeStyleScope';
import { NativeButtonGroupRules } from './buttonGroupContext';
import { getCircularProgressUtilityClass } from './circularProgressClasses';
import type { CircularProgressProps } from './circularProgressTypes';

const SIZE = 44;
const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
type Owner = CircularProgressProps & {
  color: string;
  variant: string;
  size: number | string;
  thickness: number;
  value: number;
  disableShrink: boolean;
  enableTrackSlot: boolean;
};
let warnedRange = false,
  warnedIndeterminateRange = false;
/** @internal Match source diagnostic lifetimes in isolated contract tests. */
export function resetCircularProgressWarnings() {
  warnedRange = false;
  warnedIndeterminateRange = false;
}

// vars remains an untyped upstream input until the native CSS-variable provider exists.
function paintPalette(theme: Theme): Theme['palette'] & Record<string, { main: string }> {
  return ((theme as Theme & { vars?: Pick<Theme, 'palette'> | null }).vars || theme)
    .palette as Theme['palette'] & Record<string, { main: string }>;
}
type ConstructorStyle = CircularProgressMotionStyle & { base: SxProps };
const transitionOptions = {};
/** The original memoTheme retains only its last theme, shared by each constructor. */
function memoConstructor(build: (theme: Theme) => ConstructorStyle) {
  let lastTheme: Theme | undefined, lastValue: ConstructorStyle | undefined;
  return (theme: Theme) => {
    if (lastValue === undefined || lastTheme !== theme) {
      lastValue = build(theme);
      lastTheme = theme;
    }
    return lastValue;
  };
}
const rootConstructor = memoConstructor((theme) => {
  const motion = theme.motion?.reducedMotion;
  const transition = theme.transitions?.create?.('transform', transitionOptions);
  const transitionMotion = theme.motion?.reducedMotion;
  const colors = Object.entries(theme.palette)
    .filter(([, entry]) => entry && typeof (entry as { main?: unknown }).main === 'string')
    .map(([name]) => ({
      props: { color: name },
      style: { color: paintPalette(theme)[name].main },
    }));
  return { motion, transitionMotion, transition, base: { variants: colors } };
});
const circleConstructor = memoConstructor((theme) => {
  const motion = theme.motion?.reducedMotion;
  const transition = theme.transitions?.create?.('stroke-dashoffset', transitionOptions);
  const transitionMotion = theme.motion?.reducedMotion;
  return {
    motion,
    transitionMotion,
    transition,
    base: {
      stroke: 'currentColor',
      variants: [
        {
          props: { variant: 'indeterminate' },
          style: { strokeDasharray: '80px, 200px', strokeDashoffset: 0 },
        },
      ],
    },
  };
});
const trackConstructor = memoConstructor((theme) => ({
  motion: undefined,
  base: { stroke: 'currentColor', opacity: paintPalette(theme).action.activatedOpacity },
}));
const svgConstructor = () => ({ base: {}, motion: undefined });

type SlotProps = {
  ownerState: Owner;
  className: string;
  style?: Record<string, unknown>;
  children?: React.ReactNode;
  viewBox?: string;
  'aria-hidden'?: string;
} & Pick<CircleProps, 'cx' | 'cy' | 'r' | 'fill' | 'strokeWidth'>;
function useSlotStyle(
  slot: 'svg' | 'track' | 'circle',
  props: SlotProps,
  constructor: (theme: Theme) => ConstructorStyle,
) {
  const theme = useNativeStyledTheme(),
    parent = useNativeTextContext();
  const rules = useContext(NativeButtonGroupRules),
    { width } = useWindowDimensions();
  const sheet = constructor(theme);
  const classes = props.className.split(/\s+/).filter(Boolean);
  const result = componentRootStyle(
    theme,
    'MuiCircularProgress',
    props.ownerState as unknown as Record<string, unknown>,
    undefined,
    undefined,
    {
      ...nativeTextStyleContext(parent, undefined, theme),
      width,
      svg: true,
      rootSlot: slot,
      slot,
      skipVariants: true,
      classes,
      rootProps: props as unknown as Record<string, unknown>,
      ancestors: nativeStyleAncestors(rules, { classes, tag: slot === 'svg' ? 'svg' : 'circle' }),
      overrideKeys: () =>
        slot === 'circle' && props.ownerState.disableShrink ? ['circleDisableShrink'] : [],
      baseStyle: sheet.base,
    },
  );
  const inline = props.style ? resolveSx(props.style as SxProps, theme, { svg: true }) : {};
  return {
    theme,
    sheet,
    style: { ...result.computed, ...inline } as NativeStyle & CircleProps,
    prepared: result.prepared,
  };
}

function ProgressSvg(props: SlotProps) {
  const { style, theme, prepared } = useSlotStyle('svg', props, svgConstructor);
  const root = useRef<ViewInstance | null>(null);
  const setRoot = useCallback((instance: Svg | null) => {
    // The pinned SVG peer exposes its Fabric host through this same public
    // method used by Animated; scope the actual host rather than the SVG class.
    root.current = (instance?.getNativeScrollRef() as unknown as ViewInstance | null) ?? null;
  }, []);
  const inherited = useNativeTextContext();
  const inheritedColor = inherited?.style.color ?? theme.palette.text.primary;
  const candidate = style.color ?? inheritedColor;
  const color = ['inherit', 'unset', 'currentColor'].includes(String(candidate))
    ? inheritedColor
    : candidate;
  // Svg copies its style into a native Group. Keep symbolic CSS paint out
  // of that second boundary as well as the Svg host's concrete color prop.
  const { color: _color, ...nativeStyle } = style;
  return (
    <NativeStyleScope
      root={root}
      theme={theme}
      classes={props.className.split(/\s+/).filter(Boolean)}
      prepared={prepared}
    >
      <Svg
        ref={setRoot}
        viewBox={props.viewBox}
        width={style.width ?? '100%'}
        height={style.height ?? '100%'}
        color={color}
        accessible={false}
        style={nativeStyle as SvgProps['style']}
      >
        {props.children}
      </Svg>
    </NativeStyleScope>
  );
}
function ProgressTrack(props: SlotProps) {
  const { style } = useSlotStyle('track', props, trackConstructor);
  return (
    <Circle
      cx={props.cx}
      cy={props.cy}
      r={props.r}
      fill={props.fill}
      strokeWidth={props.strokeWidth}
      {...style}
      accessible={false}
    />
  );
}
function ProgressCircle(props: SlotProps) {
  const { style, sheet } = useSlotStyle('circle', props, circleConstructor);
  return (
    <ProgressCircleFrame
      sheet={sheet}
      variant={props.ownerState.variant}
      disableShrink={props.ownerState.disableShrink}
      native={{
        cx: props.cx,
        cy: props.cy,
        r: props.r,
        fill: props.fill,
        strokeWidth: props.strokeWidth,
        ...style,
      }}
    />
  );
}

export const CircularProgress: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<CircularProgressProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, CircularProgressProps>(function CircularProgress(inProps, forwarded) {
  const { props, style: retainedStyle } = useNativeRootProps({
    props: inProps,
    name: 'MuiCircularProgress',
  });
  const {
    className,
    classes,
    color = 'primary',
    disableShrink = false,
    enableTrackSlot = false,
    min: minProp,
    max: maxProp,
    size = 40,
    style,
    thickness = 3.6,
    value = props.min ?? 0,
    variant = 'indeterminate',
    sx,
    id,
    ...other
  } = props;
  const owner: Owner = {
    ...props,
    color,
    disableShrink,
    size,
    thickness,
    value,
    variant,
    enableTrackSlot,
  };
  const theme = useNativeStyledTheme((props as { theme?: Theme | null }).theme);
  const rootSheet = rootConstructor(theme);
  const { root, ref } = useNativeTextRootRef(forwarded),
    nativeRef = useNativeStyleRef(root, ref);
  const parent = useNativeTextContext(),
    rules = useContext(NativeButtonGroupRules),
    { width } = useWindowDimensions();
  const token = (...slots: string[]) =>
    joinClassNames(
      ...slots.filter(Boolean).map((slot) => {
        let name = getCircularProgressUtilityClass(slot);
        if (classes && (classes as Record<string, string>)[slot])
          name += ' ' + (classes as Record<string, string>)[slot];
        return name;
      }),
    );
  const names = {
    root: joinClassNames(token('root', variant, 'color' + cap(color)), className),
    svg: token('svg'),
    track: token('track'),
    circle: token('circle', disableShrink ? 'circleDisableShrink' : ''),
  };
  const min = minProp ?? 0,
    max = maxProp ?? 100;
  if (
    process.env.NODE_ENV !== 'production' &&
    variant === 'indeterminate' &&
    !warnedIndeterminateRange &&
    (minProp !== undefined || maxProp !== undefined)
  ) {
    console.warn(
      "MUI Native: You have provided the `min` or `max` props with an 'indeterminate' variant. These props will have no effect.",
    );
    warnedIndeterminateRange = true;
  }
  const circleStyle: Record<string, unknown> = {},
    rootTransform: Record<string, unknown> = {},
    rootAria: Record<string, unknown> = {};
  if (variant === 'determinate') {
    const circumference = 2 * Math.PI * ((SIZE - thickness) / 2);
    if (
      process.env.NODE_ENV !== 'production' &&
      !warnedRange &&
      (value < min || value > max || min >= max)
    ) {
      console.error(
        `MUI Native: The min, max, and value props in CircularProgress should be numbers where min < max and min <= value <= max. Received min=${min}, max=${max}, value=${value}.`,
      );
      warnedRange = true;
    }
    circleStyle.strokeDasharray = circumference.toFixed(3);
    circleStyle.strokeDashoffset =
      (max - min > 0 ? ((max - value) / (max - min)) * circumference : circumference).toFixed(3) +
      'px';
    rootTransform.transform = 'rotate(-90deg)';
    rootAria['aria-valuenow'] = value;
    rootAria['aria-valuemin'] = min;
    rootAria['aria-valuemax'] = max;
  }
  const inline = { width: size, height: size, ...rootTransform, ...StyleSheet.flatten(style) };
  // Styled callbacks observe the generated child, while ownerState retains
  // authored props. Build presentation attributes before those callbacks run.
  const graphic = (
    <ProgressSvg className={names.svg} ownerState={owner} viewBox="22 22 44 44">
      {enableTrackSlot ? (
        <ProgressTrack
          className={names.track}
          ownerState={owner}
          cx={SIZE}
          cy={SIZE}
          r={(SIZE - thickness) / 2}
          fill="none"
          strokeWidth={thickness}
          aria-hidden="true"
        />
      ) : null}
      <ProgressCircle
        className={names.circle}
        ownerState={owner}
        style={circleStyle}
        cx={SIZE}
        cy={SIZE}
        r={(SIZE - thickness) / 2}
        fill="none"
        strokeWidth={thickness}
      />
    </ProgressSvg>
  );
  const rootProps = {
    ...(Object.hasOwn(props, 'classes') ? { classes } : {}),
    ...(Object.hasOwn(props, 'sx') ? { sx } : {}),
    ...(Object.hasOwn(props, 'id') ? { id } : {}),
    ref: forwarded,
    className: names.root,
    style: inline,
    ownerState: owner,
    role: 'progressbar',
    ...rootAria,
    ...other,
    children: graphic,
  };
  const actualOwner = rootProps.ownerState as unknown as Record<string, unknown>;
  const tokens = names.root.split(/\s+/).filter(Boolean);
  const prepared = componentRootStyle(
    theme,
    'MuiCircularProgress',
    actualOwner,
    sx,
    retainedStyle,
    {
      ...nativeTextStyleContext(parent, style, theme),
      // This View owns SVG descendant sheets; retain their paint declarations.
      svg: true,
      width,
      rootProps,
      classes: tokens,
      ancestors: nativeStyleAncestors(rules, { classes: tokens }),
      overrideKeys: () => [String(actualOwner.variant), 'color' + cap(actualOwner.color as string)],
      baseStyle: rootSheet.base,
    },
  );
  const nativeSize = typeof size === 'number' ? `${size}px` : size;
  const dimensions = resolveSx({ width: nativeSize, height: nativeSize, ...rootTransform }, theme, {
    ...nativeTextStyleContext(
      parent,
      StyleSheet.flatten([prepared.computed, prepared.authored]),
      theme,
    ),
    width,
  });
  // Component defaults are inline in the original, ahead of authored native style.
  const rootStyle = [prepared.computed, dimensions, prepared.authored];
  const {
    'aria-valuenow': _now,
    'aria-valuemin': _min,
    'aria-valuemax': _max,
    'aria-valuetext': _text,
    'data-testid': dataTestId,
    classes: _classes,
    sx: _sx,
    id: _id,
    ref: _ref,
    ownerState: _owner,
    theme: _theme,
    children: _children,
    ...native
  } = rootProps as Record<string, unknown>;
  return (
    <NativeStyleScope root={root} theme={theme} classes={tokens} prepared={prepared.prepared}>
      <NativeTextScope rootRef={root} theme={theme} style={rootStyle} content={null}>
        {(layout) => (
          <ProgressRootFrame
            nodeRef={nativeRef}
            style={layout}
            sheet={rootSheet}
            variant={variant}
            native={{
              ...native,
              nativeID: id ?? props.nativeID,
              testID: Object.hasOwn(props, 'testID') ? props.testID : dataTestId,
              accessible: props.accessible ?? true,
              accessibilityValue: nativeProgressAccessibilityValue(rootProps),
            }}
          >
            {graphic}
          </ProgressRootFrame>
        )}
      </NativeTextScope>
    </NativeStyleScope>
  );
});
