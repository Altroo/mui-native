// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useLayoutEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import type { NativeStyle } from '@altroo/mui-native-system';
import { nativeEasing, type NativeOpacityTiming } from './nativeTransitionTiming';

type Axis = { key: string; value: number; angle: boolean };
type Graph = { from: Axis[]; to: Axis[]; raw: NativeStyle['transform']; key: string };
const angles = new Set(['rotate', 'rotateX', 'rotateY', 'rotateZ', 'skewX', 'skewY']);
const numeric = new Set(['scale', 'scaleX', 'scaleY', 'translateX', 'translateY']);
function axes(raw: NativeStyle['transform']): Axis[] | undefined {
  if (raw == null || raw === 'none') return [];
  if (typeof raw === 'string') {
    const parsed: Array<Record<string, number | string>> = [];
    let valid = true;
    const remainder = raw.replace(
      /([a-zA-Z]+)\(\s*([^()]*)\s*\)/g,
      (_match, key: string, input: string) => {
        const value = input.trim();
        if (angles.has(key)) parsed.push({ [key]: value });
        else if (numeric.has(key)) {
          const number = value.match(/^([-+]?(?:\d+\.?\d*|\.\d+))(px)?$/);
          if (!number || (number[2] && !['translateX', 'translateY'].includes(key))) valid = false;
          else parsed.push({ [key]: Number(number[1]) });
        } else valid = false;
        return '';
      },
    );
    if (!valid || remainder.trim() || !parsed.length) return undefined;
    return axes(parsed as NativeStyle['transform']);
  }
  if (!Array.isArray(raw)) return undefined;
  const output: Axis[] = [];
  for (const item of raw) {
    const entries = Object.entries(item);
    if (entries.length !== 1) return undefined;
    const [key, value] = entries[0];
    if (numeric.has(key) && typeof value === 'number' && Number.isFinite(value))
      output.push({ key, value, angle: false });
    else if (angles.has(key) && typeof value === 'string') {
      const match = value.match(/^([-+]?(?:\d+\.?\d*|\.\d+))(deg|rad)$/);
      if (!match) return undefined;
      output.push({
        key,
        value: Number(match[1]) * (match[2] === 'rad' ? 180 / Math.PI : 1),
        angle: true,
      });
    } else return undefined;
  }
  return output;
}
const identity = (axis: Axis): Axis => ({ ...axis, value: axis.key.startsWith('scale') ? 1 : 0 });
function pair(from: Axis[], to: Axis[]): [Axis[], Axis[]] | undefined {
  const left: Axis[] = [],
    right: Axis[] = [];
  for (let i = 0; i < Math.max(from.length, to.length); i++) {
    const a = from[i],
      b = to[i];
    if (a && b && (a.key !== b.key || a.angle !== b.angle)) return undefined;
    left.push(a ?? identity(b));
    right.push(b ?? identity(a));
  }
  return [left, right];
}
function current(graph: Graph, progress: number): Axis[] {
  return graph.to.map((axis, index) => ({
    ...axis,
    value: graph.from[index].value + (axis.value - graph.from[index].value) * progress,
  }));
}
/** Retain matching native numeric/angle lists. Caller-managed Animated nodes,
 * perspective, matrix decomposition and percentage translations retain native values;
 * their general CSS interpolation remains in the shared styling contract. */
export function useCircularProgressTransform(
  raw: NativeStyle['transform'],
  timing: NativeOpacityTiming,
  reduced: boolean,
  enabled: boolean,
): NativeStyle['transform'] {
  const target = axes(raw),
    key = target ? JSON.stringify(target) : raw;
  const value = useRef(new Animated.Value(1)).current;
  const initial: Graph = {
    from: target ?? [],
    to: target ?? [],
    raw,
    key: typeof key === 'string' ? key : '',
  };
  const [graph, setGraph] = useState(initial);
  const retained = useRef(graph),
    generation = useRef(0),
    driver = useRef<Animated.CompositeAnimation | undefined>(undefined);
  const previousRaw = useRef(raw);
  const canTransition = enabled && !reduced && timing.duration > 0;
  useLayoutEffect(() => {
    const version = ++generation.current;
    const old = retained.current;
    const unchanged = target ? old.key === key : previousRaw.current === raw;
    if (unchanged && canTransition) return;
    previousRaw.current = raw;
    driver.current?.stop();
    driver.current = undefined;
    const reset = () => {
      value.setValue(1);
      const next = {
        from: target ?? [],
        to: target ?? [],
        raw,
        key: typeof key === 'string' ? key : '',
      };
      retained.current = next;
      setGraph(next);
    };
    if (!target || !canTransition) {
      value.stopAnimation();
      reset();
      return;
    }
    value.stopAnimation((progress) => {
      if (version !== generation.current) return;
      const matched = pair(current(old, progress), target);
      if (!matched) {
        reset();
        return;
      }
      const next = {
        from: matched[0],
        to: matched[1],
        raw,
        key: typeof key === 'string' ? key : '',
      };
      value.setValue(0);
      retained.current = next;
      setGraph(next);
      const animation = Animated.timing(value, {
        toValue: 1,
        duration: timing.duration,
        delay: timing.delay,
        easing: nativeEasing(timing.easing),
        useNativeDriver: true,
        isInteraction: false,
      });
      driver.current = animation;
      animation.start();
    });
    // A new timing declaration does not retime an already-running CSS transition.
    // The next target change captures the current declaration from this render.
  }, [key, canTransition, value]);
  useLayoutEffect(
    () => () => {
      generation.current++;
      driver.current?.stop();
      value.stopAnimation();
    },
    [value],
  );
  if (!graph.to.length) return graph.raw;
  return graph.to.map((axis, index) => {
    const start = graph.from[index].value;
    const end = axis.value;
    return {
      [axis.key]:
        start === end
          ? axis.angle
            ? `${end}deg`
            : end
          : value.interpolate<number | string>({
              inputRange: [0, 1],
              outputRange: axis.angle ? [`${start}deg`, `${end}deg`] : [start, end],
            }),
    };
  }) as unknown as NativeStyle['transform'];
}
