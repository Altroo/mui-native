// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Finite Accordion presentation clock. Keep caller callbacks and prepared CSS
// outside frame updates; this hook changes only finite native presentation.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { processColor } from 'react-native';
import type { NativeStyle, Theme } from '@altroo/mui-native-system';
import { useNativeReducedMotion } from './motionPreference';
import {
  nativeEasing,
  nativePropertyTiming,
  type NativeOpacityTiming,
} from './nativeTransitionTiming';

export type AccordionMotionProperty = 'margin' | 'root' | 'transform' | 'before' | 'summary';
type Property = AccordionMotionProperty;
type Coordinate =
  | 'minHeight'
  | 'marginTop'
  | 'marginBottom'
  | 'rotate'
  | 'opacity'
  | 'red'
  | 'green'
  | 'blue'
  | 'alpha';
type Vector = Partial<Record<Coordinate, number>>;
const colorCoordinates = ['red', 'green', 'blue', 'alpha'] as const;
function colorVector(color: NativeStyle['backgroundColor']): Vector {
  const packed = processColor(color ?? 'transparent');
  if (typeof packed !== 'number') return {};
  const value = packed >>> 0;
  const alpha = (value >>> 24) / 255;
  // CSS color transitions interpolate premultiplied sRGB, including transparent
  // endpoints. Native dynamic/platform colors remain discrete native values.
  return {
    red: ((value >>> 16) & 255) * alpha,
    green: ((value >>> 8) & 255) * alpha,
    blue: (value & 255) * alpha,
    alpha,
  };
}
function rotation(style: NativeStyle) {
  if (!Array.isArray(style.transform)) return;
  for (const [index, transform] of style.transform.entries()) {
    if (!('rotate' in transform)) continue;
    if (typeof transform.rotate !== 'string') return;
    const match = transform.rotate.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(deg|rad)$/);
    if (!match) return;
    return { index, degrees: Number(match[1]) * (match[2] === 'rad' ? 180 / Math.PI : 1) };
  }
}
function vector(style: NativeStyle, property: Property | undefined): Vector {
  if (property === 'transform') {
    const value = rotation(style);
    return value ? { rotate: value.degrees } : {};
  }
  if (property === 'summary')
    return {
      ...(typeof style.minHeight === 'number' && Number.isFinite(style.minHeight)
        ? { minHeight: style.minHeight }
        : {}),
      ...colorVector(style.backgroundColor),
    };
  if (property === 'before')
    return {
      ...(typeof style.opacity === 'number' && Number.isFinite(style.opacity)
        ? { opacity: style.opacity }
        : {}),
      ...colorVector(style.backgroundColor),
    };
  if (property !== 'margin' && property !== 'root') return {};
  const top =
    style.marginTop ??
    style.marginVertical ??
    style.margin ??
    (property === 'root' ? 0 : undefined);
  const bottom =
    style.marginBottom ??
    style.marginVertical ??
    style.margin ??
    (property === 'root' ? 0 : undefined);
  return {
    ...(typeof top === 'number' && Number.isFinite(top) ? { marginTop: top } : {}),
    ...(typeof bottom === 'number' && Number.isFinite(bottom) ? { marginBottom: bottom } : {}),
  };
}
// Each source property group owns its clock. Changing opacity must not delay
// a color transition already in flight, and a discrete color change must not
// finish an unrelated opacity fade.
function useMotionTrack(
  target: Vector,
  timing: NativeOpacityTiming | undefined,
  reduced: boolean,
  resetKey: object | null | undefined,
): Vector {
  const key = JSON.stringify(target);
  const timingKey = JSON.stringify(timing);
  const current = useRef(target);
  const mounted = useRef(false);
  const identity = useRef(resetKey);
  const [presentation, setPresentation] = useState(target);
  useLayoutEffect(() => {
    const endpoint = JSON.parse(key) as Vector;
    const from = current.current;
    const same = JSON.stringify(from) === key;
    if (
      !mounted.current ||
      identity.current !== resetKey ||
      !timingKey ||
      reduced ||
      same ||
      !Object.keys(endpoint).length
    ) {
      identity.current = resetKey;
      mounted.current = true;
      current.current = endpoint;
      if (!same) setPresentation(endpoint);
      return;
    }
    const keys = Object.keys(endpoint) as Coordinate[];
    // A declaration entering/leaving the finite numeric domain has no prior
    // interpolable sample. Apply that change directly, including native resets.
    if (keys.some((name) => from[name] === undefined)) {
      current.current = endpoint;
      setPresentation(endpoint);
      return;
    }
    let active = true;
    let frame: number | undefined;
    const track = JSON.parse(timingKey!) as NativeOpacityTiming;
    const start = performance.now() + track.delay;
    const easing = nativeEasing(track.easing);
    const tick = (now: number) => {
      if (!active) return;
      const elapsed = now - start;
      const progress =
        elapsed < 0 ? 0 : track.duration > 0 ? Math.min(1, elapsed / track.duration) : 1;
      const value = easing(progress);
      const next = Object.fromEntries(
        keys.map((name) => [
          name,
          progress === 1 ? endpoint[name] : from[name]! + (endpoint[name]! - from[name]!) * value,
        ]),
      ) as Vector;
      current.current = next;
      setPresentation(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    if (track.duration === 0 && track.delay === 0) {
      current.current = endpoint;
      setPresentation(endpoint);
    } else frame = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [key, timingKey, reduced, resetKey]);
  // A new physical element starts at its own endpoint. Keep body components
  // mounted; only this presentation cell changes ownership.
  return identity.current === resetKey ? presentation : target;
}
/** Cancel/reverse from the latest presented sample, never from an old endpoint.
 * Layout needs JS frames. Using ordinary style props also preserves a custom
 * terminal's own later native inline declarations instead of patching its host.
 */
export function useAccordionMotion(
  style: NativeStyle,
  theme: Theme,
  property: Property | undefined,
  resetKey?: object | null,
  sourceTiming?: Readonly<{ declaration: unknown }>,
): NativeStyle | undefined {
  const reduced = useNativeReducedMotion(theme.motion?.reducedMotion, property === undefined);
  const target = vector(style, property);
  const timing = useMemo(() => {
    if (!property) return;
    let duration: number | undefined;
    const properties =
      property === 'before'
        ? (['opacity', 'background-color'] as const)
        : property === 'summary'
          ? (['min-height', 'background-color'] as const)
          : undefined;
    const declaration = sourceTiming
      ? sourceTiming.declaration
      : theme.transitions.create(
          properties
            ? [...properties]
            : property === 'margin' || property === 'root'
              ? ['margin']
              : property,
          { duration: (duration = theme.transitions.duration.shortest) },
        );
    // Complete captured declarations need no more observable theme reads.
    const fallback = () => ({
      duration: duration ?? theme.transitions.duration.shortest,
      delay: 0,
      easing: theme.transitions.easing.easeInOut,
    });
    const timing = (
      name: 'margin' | 'transform' | 'opacity' | 'background-color' | 'min-height',
    ) =>
      typeof declaration === 'string'
        ? nativePropertyTiming(declaration, fallback, name)
        : { duration: 0, delay: 0, easing: 'linear' };
    const scalar = timing(
      property === 'before'
        ? 'opacity'
        : property === 'summary'
          ? 'min-height'
          : property === 'root'
            ? 'margin'
            : property,
    );
    const color =
      property === 'before' || property === 'summary' ? timing('background-color') : scalar;
    return { scalar, color };
  }, [theme, property, sourceTiming]);
  const scalarTarget = Object.fromEntries(
    Object.entries(target).filter(
      ([name]) => !colorCoordinates.includes(name as (typeof colorCoordinates)[number]),
    ),
  ) as Vector;
  const colorTarget = Object.fromEntries(
    Object.entries(target).filter(([name]) =>
      colorCoordinates.includes(name as (typeof colorCoordinates)[number]),
    ),
  ) as Vector;
  const scalar = useMotionTrack(scalarTarget, timing?.scalar, reduced, resetKey);
  const color = useMotionTrack(
    colorTarget,
    property === 'before' || property === 'summary' ? timing?.color : undefined,
    reduced,
    resetKey,
  );
  const presentation = { ...scalar, ...color };
  if (
    !property ||
    reduced ||
    !timing ||
    [timing.scalar, timing.color].every((track) => track.duration === 0 && track.delay === 0)
  )
    return;
  // Return presentation changes only. The caller keeps the original prepared text/border
  // layers intact, including relative metrics and CSS start/end provenance.
  const selected = presentation;
  if (property === 'before' || property === 'summary') {
    const color = colorCoordinates.every(
      (name) => target[name] !== undefined && selected[name] !== undefined,
    );
    const colorMoving = color && colorCoordinates.some((name) => target[name] !== selected[name]);
    const alpha = selected.alpha ?? 0;
    const channel = (name: 'red' | 'green' | 'blue') =>
      alpha > 0 ? Math.max(0, Math.min(255, selected[name]! / alpha)) : 0;
    return {
      ...(target.minHeight !== undefined && selected.minHeight !== undefined
        ? { minHeight: selected.minHeight }
        : {}),
      ...(target.opacity !== undefined && selected.opacity !== undefined
        ? { opacity: selected.opacity }
        : {}),
      ...(colorMoving
        ? {
            backgroundColor: `rgba(${channel('red')}, ${channel('green')}, ${channel('blue')}, ${alpha})`,
          }
        : {}),
    };
  }
  if (property === 'margin' || property === 'root')
    return {
      ...(target.marginTop !== undefined && selected.marginTop !== undefined
        ? { marginTop: selected.marginTop }
        : {}),
      ...(target.marginBottom !== undefined && selected.marginBottom !== undefined
        ? { marginBottom: selected.marginBottom }
        : {}),
    };
  const turn = rotation(style);
  if (turn && selected.rotate !== undefined && Array.isArray(style.transform))
    return {
      transform: style.transform.map((transform, index) =>
        index === turn.index ? { rotate: `${selected.rotate}deg` as `${number}deg` } : transform,
      ),
    };
}
