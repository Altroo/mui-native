import { Easing as NativeEasing, StyleSheet, type ViewStyle } from 'react-native';
import {
  diagnostic,
  nativeStyleTextMetrics,
  applyNativeTextMetrics,
} from '@altroo/mui-native-system';
import type { TransitionProps } from './transitions/types';
export function nativeMilliseconds(value: number | string | undefined, fallback = 0): number {
  if (value === undefined) return fallback;
  const match =
    typeof value === 'string' ? value.trim().match(/^(-?(?:\d+\.?\d*|\.\d+))(ms|s)?$/) : undefined;
  const result =
    typeof value === 'number'
      ? value
      : match
        ? Number(match[1]) * (match[2] === 's' ? 1000 : 1)
        : NaN;
  if (!Number.isFinite(result) || result < 0) {
    diagnostic('transition-timing', `Unsupported native transition time: ${String(value)}`);
    return 0;
  }
  return result;
}
export function nativeEasing(value: string | undefined): (input: number) => number {
  const curves: Record<string, number[]> = {
    ease: [0.25, 0.1, 0.25, 1],
    'ease-in': [0.42, 0, 1, 1],
    'ease-out': [0, 0, 0.58, 1],
    'ease-in-out': [0.42, 0, 0.58, 1],
  };
  if (value === 'linear') return NativeEasing.linear;
  const match = value?.match(
    /^cubic-bezier\(\s*([-+.\d]+)\s*,\s*([-+.\d]+)\s*,\s*([-+.\d]+)\s*,\s*([-+.\d]+)\s*\)$/,
  );
  const curve = match ? match.slice(1).map(Number) : curves[value ?? 'ease-in-out'];
  if (
    curve?.length === 4 &&
    curve.every(Number.isFinite) &&
    curve[0] >= 0 &&
    curve[0] <= 1 &&
    curve[2] >= 0 &&
    curve[2] <= 1
  )
    return NativeEasing.bezier(curve[0], curve[1], curve[2], curve[3]);
  diagnostic('transition-easing', `Unsupported native transition easing: ${value}`);
  return NativeEasing.inOut(NativeEasing.ease);
}
export function completionTimeout(
  timeout: TransitionProps['timeout'],
  entering: boolean,
  appearing: boolean,
): number | undefined {
  if (typeof timeout === 'number') return timeout;
  return entering
    ? appearing
      ? (timeout?.appear ?? timeout?.enter)
      : timeout?.enter
    : timeout?.exit;
}
export function stripTiming(style: unknown): any {
  if (Array.isArray(style)) return style.map(stripTiming);
  if (!style || typeof style !== 'object') return style;
  if (
    !['transitionDuration', 'transitionDelay', 'transitionTimingFunction'].some((key) =>
      Object.hasOwn(style, key),
    )
  )
    return style;
  const {
    transitionDuration: _duration,
    transitionTimingFunction: _easing,
    transitionDelay: _delay,
    ...native
  } = style as Record<string, unknown>;
  return applyNativeTextMetrics(
    native as ViewStyle,
    style as ViewStyle,
    nativeStyleTextMetrics(style as ViewStyle),
  );
}

export interface NativeOpacityTiming {
  duration: number;
  delay: number;
  easing: string;
}
// Only the opacity/all clause is meaningful to a native Fade. Preserve the
// theme factory's timing overrides without claiming a general CSS engine.
export function nativeOpacityTiming(
  declaration: string,
  fallback: NativeOpacityTiming,
): NativeOpacityTiming {
  if (declaration.trim() === 'none') return { duration: 0, delay: 0, easing: 'linear' };
  const clauses = declaration.split(/,(?![^()]*\))/);
  const clause =
    clauses.find((value) => /^\s*opacity(?:\s|$)/.test(value)) ??
    clauses.find((value) => /^\s*all(?:\s|$)/.test(value));
  const match = clause
    ?.trim()
    .match(
      /^(?:opacity|all)\s+(-?(?:\d+\.?\d*|\.\d+)(?:ms|s))\s+(cubic-bezier\([^)]*\)|linear|ease(?:-in-out|-in|-out)?)(?:\s+(-?(?:\d+\.?\d*|\.\d+)(?:ms|s)))?$/,
    );
  if (!match) {
    diagnostic('transition-create', `Unsupported native opacity transition: ${declaration}`);
    return fallback;
  }
  return {
    duration: nativeMilliseconds(match[1]),
    easing: match[2],
    delay: nativeMilliseconds(match[3]),
  };
}
