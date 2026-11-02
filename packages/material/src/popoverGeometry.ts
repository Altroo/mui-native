export interface PopoverOrigin {
  vertical: 'top' | 'center' | 'bottom' | number;
  horizontal: 'left' | 'center' | 'right' | number;
}
export interface PopoverPosition {
  top: number;
  left: number;
}
export type PopoverReference = 'anchorEl' | 'anchorPosition' | 'none';
export interface NativePopoverRect {
  top: number;
  left: number;
  width: number;
  height: number;
}
export function getOffsetTop<T extends Pick<NativePopoverRect, 'height'>>(
  rect: T,
  vertical: PopoverOrigin['vertical'],
): number {
  return typeof vertical === 'number'
    ? vertical
    : vertical === 'center'
      ? rect.height / 2
      : vertical === 'bottom'
        ? rect.height
        : 0;
}
export function getOffsetLeft<T extends Pick<NativePopoverRect, 'width'>>(
  rect: T,
  horizontal: PopoverOrigin['horizontal'],
): number {
  return typeof horizontal === 'number'
    ? horizontal
    : horizontal === 'center'
      ? rect.width / 2
      : horizontal === 'right'
        ? rect.width
        : 0;
}
export function positionPopover({
  size,
  anchor,
  anchorPosition,
  anchorReference,
  anchorOrigin,
  transformOrigin,
  viewport,
  marginThreshold,
}: {
  size: { width: number; height: number };
  anchor: NativePopoverRect;
  anchorPosition?: PopoverPosition;
  anchorReference: PopoverReference;
  anchorOrigin: PopoverOrigin;
  transformOrigin: PopoverOrigin;
  viewport: { width: number; height: number };
  marginThreshold: number | null;
}) {
  const origin = {
    vertical: getOffsetTop(size, transformOrigin.vertical),
    horizontal: getOffsetLeft(size, transformOrigin.horizontal),
  };
  if (anchorReference === 'none') return { top: null, left: null, origin };
  const offset =
    anchorReference === 'anchorPosition'
      ? anchorPosition!
      : {
          top: anchor.top + getOffsetTop(anchor, anchorOrigin.vertical),
          left: anchor.left + getOffsetLeft(anchor, anchorOrigin.horizontal),
        };
  let top = offset.top - origin.vertical,
    left = offset.left - origin.horizontal;
  const bottom = top + size.height,
    right = left + size.width;
  const heightThreshold = viewport.height - (marginThreshold ?? 0),
    widthThreshold = viewport.width - (marginThreshold ?? 0);
  if (marginThreshold != null && top < marginThreshold) {
    const diff = top - marginThreshold;
    top -= diff;
    origin.vertical += diff;
  } else if (marginThreshold != null && bottom > heightThreshold) {
    const diff = bottom - heightThreshold;
    top -= diff;
    origin.vertical += diff;
  }
  if (marginThreshold != null && left < marginThreshold) {
    const diff = left - marginThreshold;
    left -= diff;
    origin.horizontal += diff;
  }
  // This unguarded right branch is present in the pinned implementation even
  // with a null threshold. Preserve its observable placement behavior.
  else if (right > widthThreshold) {
    const diff = right - widthThreshold;
    left -= diff;
    origin.horizontal += diff;
  }
  return { top: Math.round(top), left: Math.round(left), origin };
}
export function validRect(value: unknown): value is NativePopoverRect {
  if (!value || typeof value !== 'object') return false;
  const rect = value as NativePopoverRect;
  return (
    [rect.top, rect.left, rect.width, rect.height].every(Number.isFinite) &&
    rect.width >= 0 &&
    rect.height >= 0
  );
}
