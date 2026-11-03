/* Overflow arithmetic adapts MIT-licensed @popperjs/core 2.11.8.
 * Copyright (c) 2019 Federico Zivolo. See NOTICE and upstream/native-positioning.json. */
import type {
  NativePopperState,
  NativePopperOverflowOptions,
  NativePopperPlatform,
  NativePopperRect,
} from './types';
import { padding, offsets, intersect } from './geometry';
const platforms = new WeakMap<NativePopperState, NativePopperPlatform>();
export function registerPlatform(state: NativePopperState, platform: NativePopperPlatform) {
  platforms.set(state, platform);
}
export function detectNativePopperOverflow(
  state: NativePopperState,
  options: NativePopperOverflowOptions = {},
) {
  const {
    placement = state.placement,
    boundary = 'clippingParents',
    rootBoundary = 'viewport',
    elementContext = 'popper',
    altBoundary = false,
  } = options;
  const context = altBoundary
    ? elementContext === 'popper'
      ? 'reference'
      : 'popper'
    : elementContext;
  let clipping: NativePopperRect = state.native[rootBoundary];
  if (boundary === 'clippingParents') {
    const parents = state.native.clipping[context];
    if (parents) clipping = intersect(clipping, parents);
  } else if (!Array.isArray(boundary) || boundary.length > 0) {
    const measured = platforms.get(state)?.boundary?.(boundary, state);
    if (!measured)
      throw new Error('MUI Native: Popper boundary must provide a current native rectangle.');
    clipping = intersect(clipping, measured);
  }
  const offset = offsets(state.rects.reference, state.rects.popper, placement),
    rect =
      elementContext === 'reference' ? state.rects.reference : { ...state.rects.popper, ...offset },
    p = padding(options.padding);
  const result = {
    top: clipping.y - rect.y + p.top,
    bottom: rect.y + rect.height - clipping.y - clipping.height + p.bottom,
    left: clipping.x - rect.x + p.left,
    right: rect.x + rect.width - clipping.x - clipping.width + p.right,
  };
  const offsetData = state.modifiersData.offset?.[placement];
  if (elementContext === 'popper' && offsetData) {
    result.top -= offsetData.y;
    result.bottom += offsetData.y;
    result.left -= offsetData.x;
    result.right += offsetData.x;
  }
  return result;
}
