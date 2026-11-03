import type { NativePortalLayout } from '@altroo/mui-native-host';
export interface NativePortalBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}
export function portalBounds(data: NativePortalLayout): NativePortalBounds | null {
  const keys = ['x', 'y', 'width', 'height', 'a', 'b', 'c', 'd'] as const;
  const rootKeys = ['rootX', 'rootY', 'rootA', 'rootB', 'rootC', 'rootD'] as const;
  if (
    rootKeys.some((key) => !Number.isFinite(data[key])) ||
    Math.abs(data.rootA * data.rootD - data.rootB * data.rootC) < 1e-10
  )
    return null;
  if (
    !data.presented ||
    keys.some((key) => typeof data[key] !== 'number' || !Number.isFinite(data[key])) ||
    data.width <= 0 ||
    data.height <= 0 ||
    Math.abs(data.a * data.d - data.b * data.c) < 1e-10
  )
    return null;
  return Object.freeze(
    Object.fromEntries(keys.map((key) => [key, data[key]])),
  ) as unknown as NativePortalBounds;
}
/** Actual native container coordinates, independent of the logical shadow-tree origin. */
export function portalWindowRect(bounds: NativePortalBounds) {
  const points = [
    [0, 0],
    [bounds.width, 0],
    [0, bounds.height],
    [bounds.width, bounds.height],
  ].map(([x, y]) => ({
    x: bounds.x + bounds.a * x + bounds.c * y,
    y: bounds.y + bounds.b * x + bounds.d * y,
  }));
  const left = Math.min(...points.map((point) => point.x)),
    top = Math.min(...points.map((point) => point.y));
  return {
    x: left,
    y: top,
    width: Math.max(...points.map((point) => point.x)) - left,
    height: Math.max(...points.map((point) => point.y)) - top,
  };
}
export function windowPointToPortal(x: number, y: number, bounds: NativePortalBounds) {
  const determinant = bounds.a * bounds.d - bounds.b * bounds.c,
    dx = x - bounds.x,
    dy = y - bounds.y;
  return {
    x: (bounds.d * dx - bounds.c * dy) / determinant,
    y: (bounds.a * dy - bounds.b * dx) / determinant,
  };
}
