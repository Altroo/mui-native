/* Positioning arithmetic adapts MIT-licensed @popperjs/core 2.11.8.
 * Copyright (c) 2019 Federico Zivolo. See NOTICE and upstream/native-positioning.json. */
import type {
  NativePopperRect,
  NativePopperSide,
  NativePopperPadding,
  PopperPlacementType,
  NativePopperModifier,
} from './types';
export const basePlacements: NativePopperSide[] = ['top', 'bottom', 'right', 'left'];
export const variationPlacements = basePlacements.flatMap(
  (side) => [`${side}-start`, `${side}-end`] as PopperPlacementType[],
);
export const placements: PopperPlacementType[] = [...basePlacements, 'auto' as const].flatMap(
  (side) => [side, `${side}-start`, `${side}-end`] as PopperPlacementType[],
);
export const modifierPhases = [
  'beforeRead',
  'read',
  'afterRead',
  'beforeMain',
  'main',
  'afterMain',
  'beforeWrite',
  'write',
  'afterWrite',
] as const;
export const base = (placement: PopperPlacementType) =>
  placement.split('-')[0] as NativePopperSide | 'auto';
export const variation = (placement: PopperPlacementType) =>
  placement.split('-')[1] as 'start' | 'end' | undefined;
export const mainAxis = (placement: PopperPlacementType) =>
  ['top', 'bottom'].includes(base(placement)) ? 'x' : 'y';
export const opposite = (placement: PopperPlacementType) =>
  placement.replace(
    /top|bottom|left|right/g,
    (side) => ({ top: 'bottom', bottom: 'top', left: 'right', right: 'left' })[side]!,
  ) as PopperPlacementType;
export const oppositeVariation = (placement: PopperPlacementType) =>
  placement.replace(/start|end/g, (side) =>
    side === 'start' ? 'end' : 'start',
  ) as PopperPlacementType;
export const within = (min: number, value: number, max: number) =>
  Math.max(min, Math.min(value, max));
export const withinMaxClamp = (min: number, value: number, max: number) =>
  Math.min(max, within(min, value, max));
export function padding(value: NativePopperPadding = 0): Record<NativePopperSide, number> {
  return typeof value === 'number'
    ? { top: value, right: value, bottom: value, left: value }
    : { top: 0, right: 0, bottom: 0, left: 0, ...value };
}
export function offsets(
  reference: NativePopperRect,
  element: NativePopperRect,
  placement: PopperPlacementType,
) {
  const side = base(placement),
    v = variation(placement),
    x = reference.x + reference.width / 2 - element.width / 2,
    y = reference.y + reference.height / 2 - element.height / 2;
  let result =
    side === 'top'
      ? { x, y: reference.y - element.height }
      : side === 'bottom'
        ? { x, y: reference.y + reference.height }
        : side === 'left'
          ? { x: reference.x - element.width, y }
          : side === 'right'
            ? { x: reference.x + reference.width, y }
            : { x: reference.x, y: reference.y };
  const axis = mainAxis(placement),
    length = axis === 'y' ? 'height' : 'width';
  if (v) result[axis] += (v === 'start' ? -1 : 1) * (reference[length] / 2 - element[length] / 2);
  return result;
}
export function intersect(a: NativePopperRect, b: NativePopperRect): NativePopperRect {
  const x = Math.max(a.x, b.x),
    y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.min(a.x + a.width, b.x + b.width) - x,
    height: Math.min(a.y + a.height, b.y + b.height) - y,
  };
}
export function validRect(value: NativePopperRect): boolean {
  return (
    [value.x, value.y, value.width, value.height].every(Number.isFinite) &&
    value.width >= 0 &&
    value.height >= 0
  );
}
export function orderModifiers(input: NativePopperModifier[]) {
  const merged = new Map<string, NativePopperModifier>();
  for (const modifier of input) {
    const previous = merged.get(modifier.name);
    merged.set(modifier.name, {
      ...previous,
      ...modifier,
      options: { ...previous?.options, ...modifier.options },
      data: { ...previous?.data, ...modifier.data },
    });
  }
  const visited = new Set<string>(),
    ordered: NativePopperModifier[] = [];
  const visit = (modifier: NativePopperModifier) => {
    visited.add(modifier.name);
    for (const name of [...(modifier.requires ?? []), ...(modifier.requiresIfExists ?? [])]) {
      const required = merged.get(name);
      if (required && !visited.has(name)) visit(required);
    }
    ordered.push(modifier);
  };
  for (const modifier of merged.values()) if (!visited.has(modifier.name)) visit(modifier);
  return modifierPhases.flatMap((phase) =>
    ordered.filter((modifier) => modifier.phase === phase && modifier.enabled),
  );
}
