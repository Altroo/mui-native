/* LinearProgress defaults, slot styles and ranges adapt MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/linear-progress.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import React, { forwardRef, useContext } from 'react';
import { useWindowDimensions, type ViewInstance } from 'react-native';
import {
  NativeTextScope,
  componentRootStyle,
  useNativeRootProps,
  useNativeTextContext,
  useNativeTextRootRef,
  nativeTextStyleContext,
  joinClassNames,
  useRtl,
  lighten,
  darken,
  type Theme,
  type SxProps,
  type NativeStyle,
  type ReducedMotionMode,
} from '@altroo/mui-native-system';
import { useNativeStyledTheme } from './themeProvider';
import { NativeStyleScope, nativeStyleAncestors, useNativeStyleRef } from './nativeStyleScope';
import { NativeButtonGroupRules } from './buttonGroupContext';
import { nativeProgressAccessibilityValue } from './nativeProgressAccessibility';
import { getLinearProgressUtilityClass } from './linearProgressClasses';
import {
  LinearProgressRootFrame,
  LinearProgressBarFrame,
  LinearProgressDashedFrame,
} from './linearProgressFrames';
import type { LinearProgressProps } from './linearProgressTypes';

type Owner = LinearProgressProps & { color: string; variant: string };
const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const warned = new Set<string>();
/** @internal Isolate the original once-per-module diagnostics in contract tests. */
export function resetLinearProgressWarnings() {
  warned.clear();
}
function warning(key: string, message: string, level: 'warn' | 'error' = 'error') {
  if (process.env.NODE_ENV === 'production' || warned.has(key)) return;
  warned.add(key);
  console[level]('MUI Native: ' + message);
}
type Palette = Theme['palette'] & Record<string, { main: string }>;
function paintPalette(theme: Theme): Palette {
  return ((theme as Theme & { vars?: { palette: Palette } | null }).vars || theme)
    .palette as Palette;
}
function shade(theme: Theme, color: string): string {
  const vars = (theme as Theme & { vars?: { palette: { LinearProgress: Record<string, string> } } })
    .vars;
  if (vars) return vars.palette.LinearProgress[color + 'Bg'];
  const nativeTheme = theme as Theme & { lighten?: typeof lighten; darken?: typeof darken };
  return theme.palette.mode === 'light'
    ? Reflect.apply(nativeTheme.lighten ?? lighten, nativeTheme, [
        (theme.palette as Palette)[color].main,
        0.62,
      ])
    : Reflect.apply(nativeTheme.darken ?? darken, nativeTheme, [
        (theme.palette as Palette)[color].main,
        0.5,
      ]);
}
export interface LinearProgressSheet {
  base: SxProps;
  motion?: ReducedMotionMode | undefined;
  transitionMotion?: ReducedMotionMode | undefined;
  transition?: string | undefined;
  determinateTransition?: string | undefined;
  bufferTransitions?: Record<string, string | undefined> | undefined;
  dotColors?: Record<string, string> | undefined;
}
function memoConstructor(build: (theme: Theme) => LinearProgressSheet) {
  let lastTheme: Theme | undefined, lastValue: LinearProgressSheet | undefined;
  return (theme: Theme) => {
    if (lastValue === undefined || lastTheme !== theme) {
      lastValue = build(theme);
      lastTheme = theme;
    }
    return lastValue;
  };
}
const paletteEntries = (theme: Theme) =>
  Object.entries(theme.palette).filter((entry): entry is [string, { main: string }] =>
    Boolean(entry[1] && typeof (entry[1] as { main?: unknown }).main === 'string'),
  );
const rootConstructor = memoConstructor((theme) => ({
  base: {
    position: 'relative',
    overflow: 'hidden',
    height: 4,
    zIndex: 0,
    variants: [
      ...paletteEntries(theme).map(([color]) => ({
        props: { color },
        style: { backgroundColor: shade(theme, color) },
      })),
      { props: { variant: 'buffer' }, style: { backgroundColor: 'transparent' } },
      { props: { variant: 'query' }, style: { transform: 'rotate(180deg)' } },
    ],
  },
}));
const dashedConstructor = memoConstructor((theme) => {
  const colors = Object.fromEntries(
    paletteEntries(theme).map(([color]) => [color, shade(theme, color)]),
  );
  return {
    motion: theme.motion?.reducedMotion,
    dotColors: colors,
    base: {
      position: 'absolute',
      marginTop: 0,
      height: '100%',
      width: '100%',
      variants: [{ props: { color: 'inherit' }, style: { opacity: 0.3 } }],
    },
  };
});
const bar1Constructor = memoConstructor((theme) => {
  const motion = theme.motion?.reducedMotion;
  const transition = theme.transitions?.create?.('transform', {
    duration: '0.2s',
    easing: 'linear',
  });
  const transitionMotion = theme.motion?.reducedMotion;
  const colors = paletteEntries(theme).map(([color]) => ({
    props: { color },
    style: { backgroundColor: paintPalette(theme)[color].main },
  }));
  const determinateTransition = theme.transitions?.create?.('transform', {
    duration: '.4s',
    easing: 'linear',
  });
  theme.motion?.reducedMotion;
  const bufferTransition = theme.transitions?.create?.('transform', {
    duration: '.4s',
    easing: 'linear',
  });
  theme.motion?.reducedMotion;
  return {
    motion,
    transitionMotion,
    transition,
    determinateTransition,
    bufferTransitions: { '*': bufferTransition },
    base: {
      width: '100%',
      position: 'absolute',
      left: 0,
      bottom: 0,
      top: 0,
      variants: [
        { props: { color: 'inherit' }, style: { backgroundColor: 'currentColor' } },
        ...colors,
        { props: { variant: 'buffer' }, style: { zIndex: 1 } },
      ],
    },
  };
});
const bar2Constructor = memoConstructor((theme) => {
  const motion = theme.motion?.reducedMotion;
  const transition = theme.transitions?.create?.('transform', {
    duration: '0.2s',
    easing: 'linear',
  });
  const transitionMotion = theme.motion?.reducedMotion;
  const palette = paletteEntries(theme);
  const colors = Object.fromEntries(
    palette.map(([color]) => [color, paintPalette(theme)[color].main]),
  );
  const bufferTransitions: Record<string, string | undefined> = {};
  const buffer = palette.map(([color]) => {
    const backgroundColor = shade(theme, color);
    bufferTransitions[color] = theme.transitions?.create?.('transform', {
      duration: '.4s',
      easing: 'linear',
    });
    theme.motion?.reducedMotion;
    return { props: { color, variant: 'buffer' }, style: { backgroundColor } };
  });
  return {
    motion,
    transitionMotion,
    transition,
    bufferTransitions,
    base: {
      width: '100%',
      position: 'absolute',
      left: 0,
      bottom: 0,
      top: 0,
      variants: [
        {
          props: ({ ownerState }: { ownerState: Record<string, unknown> }) =>
            ownerState.variant !== 'buffer',
          style: { backgroundColor: 'currentColor' },
        },
        ...palette.map(([color]) => ({
          props: ({ ownerState }: { ownerState: Record<string, unknown> }) =>
            ownerState.color === color && ownerState.variant !== 'buffer',
          style: { backgroundColor: colors[color] },
        })),
        {
          props: ({ ownerState }: { ownerState: Record<string, unknown> }) =>
            ownerState.variant !== 'buffer' && ownerState.color === 'inherit',
          style: { backgroundColor: 'currentColor' },
        },
        { props: { color: 'inherit' }, style: { opacity: 0.3 } },
        ...buffer,
      ],
    },
  };
});
interface SlotProps {
  className: string;
  ownerState: Owner;
  style?: Record<string, unknown> | undefined;
}
function ProgressSlot(props: SlotProps & { slot: 'dashed' | 'bar1' | 'bar2' }) {
  const { slot, ...styledProps } = props;
  const theme = useNativeStyledTheme(),
    parent = useNativeTextContext(),
    rules = useContext(NativeButtonGroupRules),
    { width } = useWindowDimensions();
  const sheet = (
    slot === 'dashed' ? dashedConstructor : slot === 'bar1' ? bar1Constructor : bar2Constructor
  )(theme);
  const classes = props.className.split(/\s+/).filter(Boolean);
  const { computed, authored } = componentRootStyle(
    theme,
    'MuiLinearProgress',
    props.ownerState as unknown as Record<string, unknown>,
    undefined,
    undefined,
    {
      ...nativeTextStyleContext(parent, undefined, theme),
      width,
      rootSlot: slot === 'dashed' ? 'dashed' : 'bar',
      slot,
      skipVariants: true,
      classes,
      rootProps: styledProps as unknown as Record<string, unknown>,
      ancestors: nativeStyleAncestors(rules, { classes }),
      overrideKeys: slot === 'dashed' ? [] : [slot],
      baseStyle: sheet.base,
    },
  );
  const style = [computed, authored] as NativeStyle[];
  if (slot === 'dashed')
    return (
      <LinearProgressDashedFrame
        style={style}
        sheet={sheet}
        color={
          props.ownerState.color === 'inherit'
            ? (parent?.style.color ?? theme.palette.text.primary)
            : sheet.dotColors?.[props.ownerState.color]
        }
      />
    );
  return (
    <LinearProgressBarFrame
      style={style}
      inline={props.style}
      sheet={sheet}
      slot={slot}
      owner={props.ownerState}
    />
  );
}
function ProgressDashed(props: SlotProps) {
  return <ProgressSlot {...props} slot="dashed" />;
}
function ProgressBar1(props: SlotProps) {
  return <ProgressSlot {...props} slot="bar1" />;
}
function ProgressBar2(props: SlotProps) {
  return <ProgressSlot {...props} slot="bar2" />;
}

export const LinearProgress: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<LinearProgressProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, LinearProgressProps>(function LinearProgress(inProps, forwarded) {
  const { props, style: retainedStyle } = useNativeRootProps({
    props: inProps,
    name: 'MuiLinearProgress',
  });
  const {
    className,
    color = 'primary',
    max: maxProp,
    min: minProp,
    value,
    valueBuffer,
    variant = 'indeterminate',
    ...other
  } = props;
  const owner: Owner = { ...props, color, variant };
  if (
    (variant === 'indeterminate' || variant === 'query') &&
    (minProp !== undefined || maxProp !== undefined)
  )
    warning(
      'indeterminate-range',
      "You have provided the `min` or `max` props with an 'indeterminate' or 'query' variant. These props will have no effect.",
      'warn',
    );
  const min = minProp ?? 0,
    max = maxProp ?? 100;
  const token = (...slots: string[]) =>
    joinClassNames(
      ...slots.filter(Boolean).map((slot) => {
        let name = getLinearProgressUtilityClass(slot);
        if (props.classes && (props.classes as Record<string, string>)[slot])
          name += ' ' + (props.classes as Record<string, string>)[slot];
        return name;
      }),
    );
  const names = {
    root: joinClassNames(token('root', 'color' + cap(color), variant), className),
    dashed: token('dashed'),
    bar1: token('bar', 'bar1'),
    bar2: token('bar', 'bar2', variant === 'buffer' ? 'color' + cap(color) : ''),
  };
  const theme = useNativeStyledTheme((props as { theme?: Theme | null }).theme);
  const isRtl = useRtl();
  const rootAria: Record<string, unknown> = {},
    inline: { bar1: Record<string, unknown>; bar2: Record<string, unknown> } = {
      bar1: {},
      bar2: {},
    };
  const range = max - min;
  if (variant === 'determinate' || variant === 'buffer') {
    if (value !== undefined) {
      if (value < min || value > max || min >= max)
        warning(
          'value-range',
          `The min, max, and value props in LinearProgress should be numbers where min < max and min <= value <= max. Received min=${min}, max=${max}, value=${value}.`,
        );
      let percent = ((value - min) / range) * 100 - 100;
      if (isRtl) percent = -percent;
      inline.bar1.transform = range > 0 ? `translateX(${percent}%)` : 'translateX(-100%)';
      Object.assign(rootAria, {
        'aria-valuenow': value,
        'aria-valuemin': min,
        'aria-valuemax': max,
      });
    } else
      warning(
        'missing-value',
        'You need to provide a value prop when using the determinate or buffer variant of LinearProgress.',
      );
  }
  if (variant === 'buffer') {
    if (valueBuffer !== undefined) {
      if (valueBuffer < min || valueBuffer > max || valueBuffer < (value as number) || min >= max)
        warning(
          'buffer-range',
          `The min, max, value, and valueBuffer props in LinearProgress should be numbers where min < max and min <= value <= valueBuffer <= max. Received min=${min}, max=${max}, value=${value}, valueBuffer=${valueBuffer}.`,
        );
      let percent = ((valueBuffer - min) / range) * 100 - 100;
      if (isRtl) percent = -percent;
      inline.bar2.transform = range > 0 ? `translateX(${percent}%)` : 'translateX(-100%)';
    } else
      warning(
        'missing-buffer',
        'You need to provide a valueBuffer prop when using the buffer variant of LinearProgress.',
      );
  }
  // Construct the same three-entry JSX children array before root callbacks.
  // Authored children stay in ownerState, but never replace the generated bars.
  const graphic = [
    variant === 'buffer' ? (
      <ProgressDashed key="dashed" className={names.dashed} ownerState={owner} />
    ) : null,
    <ProgressBar1 key="bar1" className={names.bar1} ownerState={owner} style={inline.bar1} />,
    variant === 'determinate' ? null : (
      <ProgressBar2 key="bar2" className={names.bar2} ownerState={owner} style={inline.bar2} />
    ),
  ];
  const rootProps = {
    className: names.root,
    ownerState: owner,
    role: 'progressbar',
    ...rootAria,
    ref: forwarded,
    ...other,
    children: graphic,
  };
  const { root, ref } = useNativeTextRootRef(forwarded),
    nativeRef = useNativeStyleRef(root, ref);
  const parent = useNativeTextContext(),
    rules = useContext(NativeButtonGroupRules),
    { width } = useWindowDimensions();
  const sheet = rootConstructor(theme),
    classes = names.root.split(/\s+/).filter(Boolean);
  const actualOwner = rootProps.ownerState as unknown as Record<string, unknown>;
  const result = componentRootStyle(
    theme,
    'MuiLinearProgress',
    actualOwner,
    props.sx,
    retainedStyle,
    {
      ...nativeTextStyleContext(parent, props.style, theme),
      width,
      classes,
      rootProps: rootProps as unknown as Record<string, unknown>,
      ancestors: nativeStyleAncestors(rules, { classes }),
      overrideKeys: () => ['color' + cap(actualOwner.color as string), String(actualOwner.variant)],
      baseStyle: sheet.base,
    },
  );
  const {
    'aria-valuenow': _now,
    'aria-valuemin': _min,
    'aria-valuemax': _max,
    'aria-valuetext': _text,
    'data-testid': dataTestId,
    classes: _classes,
    ownerState: _owner,
    children: _children,
    sx: _sx,
    style: _style,
    theme: _theme,
    ref: _ref,
    id: _id,
    ...native
  } = rootProps as Record<string, unknown>;
  return (
    <NativeStyleScope root={root} theme={theme} classes={classes} prepared={result.prepared}>
      <NativeTextScope
        rootRef={root}
        theme={theme}
        style={[result.computed, result.authored]}
        content={null}
      >
        {(layout) => (
          <LinearProgressRootFrame
            nodeRef={nativeRef}
            native={{
              ...native,
              nativeID: props.id ?? props.nativeID,
              testID: Object.hasOwn(props, 'testID') ? props.testID : dataTestId,
              accessible: props.accessible ?? true,
              accessibilityValue: nativeProgressAccessibilityValue(
                rootProps as Record<string, unknown>,
              ),
            }}
            style={layout}
            inheritTrack={color === 'inherit' && variant !== 'buffer'}
          >
            {graphic}
          </LinearProgressRootFrame>
        )}
      </NativeTextScope>
    </NativeStyleScope>
  );
});
