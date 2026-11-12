// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import type { ViewStyle } from 'react-native';

/** Native border radii describe the outside edge; SVG strokes use a centerline. */
export function notchedOutlineGeometry(
  width: number,
  height: number,
  style: ViewStyle,
  rtl = false,
) {
  const finite = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  };
  const thickness = finite(style.borderWidth);
  const half = Math.min(thickness / 2, width / 2, height / 2);
  const radius = (value: ViewStyle['borderRadius'], extent: number) =>
    typeof value === 'string' && value.endsWith('%')
      ? finite((parseFloat(value) / 100) * extent)
      : finite(value);
  // Match Fabric: physical corners win; legacy logical aliases precede CSS aliases.
  const topStart = style.borderTopStartRadius ?? style.borderStartStartRadius;
  const topEnd = style.borderTopEndRadius ?? style.borderStartEndRadius;
  const bottomStart = style.borderBottomStartRadius ?? style.borderEndStartRadius;
  const bottomEnd = style.borderBottomEndRadius ?? style.borderEndEndRadius;
  const corners = [
    style.borderTopLeftRadius ?? (rtl ? topEnd : topStart) ?? style.borderRadius,
    style.borderTopRightRadius ?? (rtl ? topStart : topEnd) ?? style.borderRadius,
    style.borderBottomRightRadius ?? (rtl ? bottomStart : bottomEnd) ?? style.borderRadius,
    style.borderBottomLeftRadius ?? (rtl ? bottomEnd : bottomStart) ?? style.borderRadius,
  ].map((value) => ({ x: radius(value, width), y: radius(value, height) }));
  // CSS/native corner normalization scales all radii together when they overlap.
  const scale = Math.min(
    1,
    width / (corners[0].x + corners[1].x || 1),
    width / (corners[2].x + corners[3].x || 1),
    height / (corners[0].y + corners[3].y || 1),
    height / (corners[1].y + corners[2].y || 1),
  );
  const [tl, tr, br, bl] = corners.map(({ x, y }) => ({
    x: Math.max(0, x * scale - half),
    y: Math.max(0, y * scale - half),
  }));
  const left = half,
    top = half,
    right = width - half,
    bottom = height - half;
  const arc = (r: { x: number; y: number }, x: number, y: number) =>
    r.x && r.y ? `A ${r.x} ${r.y} 0 0 1 ${x} ${y}` : `L ${x} ${y}`;
  return {
    thickness,
    path: `M ${left + tl.x} ${top} H ${right - tr.x} ${arc(tr, right, top + tr.y)} V ${bottom - br.y} ${arc(br, right - br.x, bottom)} H ${left + bl.x} ${arc(bl, left, bottom - bl.y)} V ${top + tl.y} ${arc(tl, left + tl.x, top)} Z`,
  };
}
