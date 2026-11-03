/* Modifier algorithms adapt MIT-licensed @popperjs/core 2.11.8.
 * Copyright (c) 2019 Federico Zivolo. See NOTICE and upstream/native-positioning.json. */
import type {
  NativePopperModifier,
  NativePopperInstance,
  NativePopperState,
  NativePopperPlatform,
  NativePopperSide,
  NativePopperRect,
  PopperPlacementType,
} from './types';
import {
  base,
  variation,
  mainAxis,
  opposite,
  oppositeVariation,
  basePlacements,
  variationPlacements,
  placements,
  padding,
  offsets,
  within,
  withinMaxClamp,
} from './geometry';
import { detectNativePopperOverflow as detectOverflow } from './overflow';
const arrowOwners = new WeakMap<NativePopperInstance, symbol>();
function autoPlacements(
  state: NativePopperState,
  options: Record<string, any>,
): PopperPlacementType[] {
  const v = variation(options.placement),
    candidates = v
      ? options.flipVariations
        ? variationPlacements
        : variationPlacements.filter((p) => variation(p) === v)
      : basePlacements;
  const allowed = candidates.filter((p) =>
    (options.allowedAutoPlacements ?? placements).includes(p),
  );
  const values = (allowed.length ? allowed : candidates).map((placement) => ({
    placement,
    overflow: detectOverflow(state, {
      placement,
      boundary: options.boundary,
      rootBoundary: options.rootBoundary,
      padding: options.padding,
    })[base(placement) as NativePopperSide],
  }));
  return values.sort((a, b) => a.overflow - b.overflow).map((value) => value.placement);
}
const popperOffsets: NativePopperModifier = {
  name: 'popperOffsets',
  enabled: true,
  phase: 'read',
  data: {},
  fn: ({ state, name }) => {
    state.modifiersData[name] = offsets(state.rects.reference, state.rects.popper, state.placement);
  },
};
const offset: NativePopperModifier = {
  name: 'offset',
  enabled: true,
  phase: 'main',
  requires: ['popperOffsets'],
  fn: ({ state, name, options }) => {
    const value = options.offset ?? [0, 0],
      data: Record<string, { x: number; y: number }> = {};
    for (const placement of placements) {
      const [skid = 0, distance = 0] =
          typeof value === 'function' ? value({ ...state.rects, placement }) : value,
        side = base(placement),
        amount = (distance || 0) * (['left', 'top'].includes(side) ? -1 : 1);
      data[placement] = ['left', 'right'].includes(side)
        ? { x: amount, y: skid || 0 }
        : { x: skid || 0, y: amount };
    }
    const current = state.modifiersData.popperOffsets;
    if (current) {
      current.x += data[state.placement].x;
      current.y += data[state.placement].y;
    }
    state.modifiersData[name] = data;
  },
};
const flip: NativePopperModifier = {
  name: 'flip',
  enabled: true,
  phase: 'main',
  requiresIfExists: ['offset'],
  data: { _skip: false },
  fn: ({ state, options, name }) => {
    if (state.modifiersData[name]._skip) return;
    const {
      mainAxis: checkMainAxis = true,
      altAxis: checkAltAxis = true,
      flipVariations = true,
    } = options;
    const preferred = state.options.placement,
      side = base(preferred),
      isBase = side === preferred;
    const expanded =
      side === 'auto'
        ? []
        : [
            oppositeVariation(preferred),
            opposite(preferred),
            oppositeVariation(opposite(preferred)),
          ];
    const fallback: PopperPlacementType[] =
      options.fallbackPlacements ?? (isBase || !flipVariations ? [opposite(preferred)] : expanded);
    const candidates = [preferred, ...fallback].flatMap((placement) =>
      base(placement) === 'auto'
        ? autoPlacements(state, { ...options, placement, flipVariations })
        : [placement],
    );
    if (!candidates.length) return;
    const checksMap = new Map<PopperPlacementType, boolean[]>();
    let fitting = candidates[0],
      needFallback = true;
    for (const placement of candidates) {
      const currentSide = base(placement) as NativePopperSide,
        isStart = variation(placement) === 'start',
        vertical = ['top', 'bottom'].includes(currentSide),
        length = vertical ? 'width' : 'height';
      const overflow = detectOverflow(state, { ...options, placement });
      let variationSide: NativePopperSide = vertical
        ? isStart
          ? 'right'
          : 'left'
        : isStart
          ? 'bottom'
          : 'top';
      if (state.rects.reference[length] > state.rects.popper[length])
        variationSide = opposite(variationSide) as NativePopperSide;
      const checks: boolean[] = [];
      if (checkMainAxis) checks.push(overflow[currentSide] <= 0);
      if (checkAltAxis)
        checks.push(
          overflow[variationSide] <= 0,
          overflow[opposite(variationSide) as NativePopperSide] <= 0,
        );
      if (checks.every(Boolean)) {
        fitting = placement;
        needFallback = false;
        break;
      }
      checksMap.set(placement, checks);
    }
    if (needFallback)
      for (let count = flipVariations ? 3 : 1; count > 0; count--) {
        const found = candidates.find((p) => checksMap.get(p)?.slice(0, count).every(Boolean));
        if (found) {
          fitting = found;
          break;
        }
      }
    if (state.placement !== fitting) {
      state.modifiersData[name]._skip = true;
      state.placement = fitting;
      state.reset = true;
    }
  },
};
function preventOverflow(platform: NativePopperPlatform): NativePopperModifier {
  return {
    name: 'preventOverflow',
    enabled: true,
    phase: 'main',
    requiresIfExists: ['offset'],
    fn: ({ state, options, name }) => {
      const {
        mainAxis: checkMainAxis = true,
        altAxis: checkAltAxis = false,
        tether = true,
        tetherOffset = 0,
      } = options;
      const overflow = detectOverflow(state, options),
        side = base(state.placement),
        v = variation(state.placement),
        isBase = !v,
        axis = mainAxis(state.placement),
        alt = axis === 'x' ? 'y' : 'x',
        position = state.modifiersData.popperOffsets,
        reference = state.rects.reference,
        popper = state.rects.popper;
      const raw =
        typeof tetherOffset === 'function'
          ? tetherOffset({ ...state.rects, placement: state.placement })
          : tetherOffset;
      const tetherValue =
        typeof raw === 'number'
          ? { mainAxis: raw, altAxis: raw }
          : { mainAxis: 0, altAxis: 0, ...raw };
      const offsetState = state.modifiersData.offset?.[state.placement],
        data = { x: 0, y: 0 };
      if (!position) return;
      if (checkMainAxis) {
        const minSide = axis === 'y' ? 'top' : 'left',
          maxSide = axis === 'y' ? 'bottom' : 'right',
          length = axis === 'y' ? 'height' : 'width',
          value = position[axis],
          min = value + overflow[minSide],
          max = value - overflow[maxSide],
          additive = tether ? -popper[length] / 2 : 0;
        const minLength = v === 'start' ? reference[length] : popper[length],
          maxLength = v === 'start' ? -popper[length] : -reference[length];
        const arrow = state.elements.arrow,
          arrowRect =
            tether && arrow
              ? (platform.layout(arrow, state) ?? { width: 0, height: 0 })
              : { width: 0, height: 0 },
          arrowPadding = state.modifiersData['arrow#persistent']?.padding ?? padding(),
          arrowLength = within(0, reference[length], arrowRect[length]);
        const minOffset = isBase
          ? reference[length] / 2 -
            additive -
            arrowLength -
            arrowPadding[minSide] -
            tetherValue.mainAxis
          : minLength - arrowLength - arrowPadding[minSide] - tetherValue.mainAxis;
        const maxOffset = isBase
          ? -reference[length] / 2 +
            additive +
            arrowLength +
            arrowPadding[maxSide] +
            tetherValue.mainAxis
          : maxLength + arrowLength + arrowPadding[maxSide] + tetherValue.mainAxis;
        const parent = arrow ? platform.parent(arrow, state) : undefined,
          client = parent ? (axis === 'y' ? (parent.clientTop ?? 0) : (parent.clientLeft ?? 0)) : 0;
        const tetherMin = value + minOffset - (offsetState?.[axis] ?? 0) - client,
          tetherMax = value + maxOffset - (offsetState?.[axis] ?? 0),
          next = within(
            tether ? Math.min(min, tetherMin) : min,
            value,
            tether ? Math.max(max, tetherMax) : max,
          );
        position[axis] = next;
        data[axis] = next - value;
      }
      if (checkAltAxis) {
        const minSide = axis === 'x' ? 'top' : 'left',
          maxSide = axis === 'x' ? 'bottom' : 'right',
          length = alt === 'y' ? 'height' : 'width',
          value = position[alt],
          min = value + overflow[minSide],
          max = value - overflow[maxSide],
          origin = ['top', 'left'].includes(side),
          offsetValue = offsetState?.[alt] ?? 0;
        const tetherMin = origin
            ? min
            : value - reference[length] - popper[length] - offsetValue + tetherValue.altAxis,
          tetherMax = origin
            ? value + reference[length] + popper[length] - offsetValue - tetherValue.altAxis
            : max;
        const next =
          tether && origin
            ? withinMaxClamp(tetherMin, value, tetherMax)
            : within(tether ? tetherMin : min, value, tether ? tetherMax : max);
        position[alt] = next;
        data[alt] = next - value;
      }
      state.modifiersData[name] = data;
    },
  };
}
function arrow(platform: NativePopperPlatform): NativePopperModifier {
  return {
    name: 'arrow',
    enabled: true,
    phase: 'main',
    requires: ['popperOffsets'],
    requiresIfExists: ['preventOverflow'],
    effect: ({ state, options, instance }) => {
      const element = options.element;
      if (element == null) return;
      if (typeof element === 'string')
        throw new Error(
          'MUI Native: Popper arrow requires a native ViewInstance instead of a DOM selector.',
        );
      if (!platform.contains(state.elements.popper, element)) return;
      const owner = Symbol('popper-arrow');
      arrowOwners.set(instance, owner);
      state.elements.arrow = element;
      return () => {
        if (arrowOwners.get(instance) !== owner) return;
        arrowOwners.delete(instance);
        const live = instance.state;
        if (live.elements.arrow === element) delete live.elements.arrow;
      };
    },
    fn: ({ state, options, name }) => {
      const element = state.elements.arrow,
        position = state.modifiersData.popperOffsets;
      if (!element || !position) return;
      const side = base(state.placement),
        axis = mainAxis(state.placement),
        length = ['left', 'right'].includes(side) ? 'height' : 'width',
        raw =
          typeof options.padding === 'function'
            ? options.padding({ ...state.rects, placement: state.placement })
            : options.padding,
        p = padding(raw),
        rect = platform.layout(element, state);
      if (!rect) return;
      const minSide = axis === 'y' ? 'top' : 'left',
        maxSide = axis === 'y' ? 'bottom' : 'right',
        endDiff =
          state.rects.reference[length] +
          state.rects.reference[axis] -
          position[axis] -
          state.rects.popper[length],
        startDiff = position[axis] - state.rects.reference[axis];
      const parent = platform.parent(element, state),
        size = axis === 'y' ? parent.height : parent.width,
        center = size / 2 - rect[length] / 2 + endDiff / 2 - startDiff / 2,
        value = within(p[minSide], center, size - rect[length] - p[maxSide]);
      state.modifiersData[name] = { [axis]: value, centerOffset: value - center };
    },
  };
}
const sideOffsets = (
  overflow: Record<NativePopperSide, number>,
  rect: NativePopperRect,
  prevented = { x: 0, y: 0 },
) => ({
  top: overflow.top - rect.height - prevented.y,
  right: overflow.right - rect.width + prevented.x,
  bottom: overflow.bottom - rect.height + prevented.y,
  left: overflow.left - rect.width - prevented.x,
});
const hide: NativePopperModifier = {
  name: 'hide',
  enabled: true,
  phase: 'main',
  requiresIfExists: ['preventOverflow'],
  fn: ({ state, name }) => {
    const referenceClippingOffsets = sideOffsets(
        detectOverflow(state, { elementContext: 'reference' }),
        state.rects.reference,
      ),
      popperEscapeOffsets = sideOffsets(
        detectOverflow(state, { altBoundary: true }),
        state.rects.popper,
        state.modifiersData.preventOverflow,
      );
    const isReferenceHidden = Object.values(referenceClippingOffsets).some((v) => v >= 0),
      hasPopperEscaped = Object.values(popperEscapeOffsets).some((v) => v >= 0);
    state.modifiersData[name] = {
      referenceClippingOffsets,
      popperEscapeOffsets,
      isReferenceHidden,
      hasPopperEscaped,
    };
    state.attributes.popper = {
      ...state.attributes.popper,
      'data-popper-reference-hidden': isReferenceHidden,
      'data-popper-escaped': hasPopperEscaped,
    };
  },
};
function mapStyles(
  state: NativePopperState,
  position: Record<string, number>,
  adaptive: boolean,
  options: Record<string, any>,
) {
  let { x = 0, y = 0 } = position;
  const gpu = options.gpuAcceleration ?? true,
    round = options.roundOffsets ?? true;
  if (typeof round === 'function') ({ x, y } = round({ x, y }));
  if (!Number.isFinite(x) || !Number.isFinite(y))
    throw new Error('MUI Native: Popper offsets must be finite.');
  let sideX: 'left' | 'right' = 'left',
    sideY: 'top' | 'bottom' = 'top';
  const side = base(state.placement),
    v = variation(state.placement);
  if (adaptive) {
    if (side === 'top' || (['left', 'right'].includes(side) && v === 'end')) {
      sideY = 'bottom';
      y -= state.native.offsetParent.height - state.rects.popper.height;
      y *= gpu ? 1 : -1;
    }
    if (side === 'left' || (['top', 'bottom'].includes(side) && v === 'end')) {
      sideX = 'right';
      x -= state.native.offsetParent.width - state.rects.popper.width;
      x *= gpu ? 1 : -1;
    }
  }
  if (round === true) {
    const dpr = state.native.pixelRatio || 1;
    x = Math.round(x * dpr) / dpr || 0;
    y = Math.round(y * dpr) / dpr || 0;
  }
  return {
    position: 'absolute' as const,
    ...(adaptive ? { top: undefined, right: undefined, bottom: undefined, left: undefined } : {}),
    [sideX]: Object.hasOwn(position, 'x') ? (gpu ? 0 : x) : undefined,
    [sideY]: Object.hasOwn(position, 'y') ? (gpu ? 0 : y) : undefined,
    transform: gpu ? [{ translateX: x }, { translateY: y }] : [],
  };
}
const computeStyles: NativePopperModifier = {
  name: 'computeStyles',
  enabled: true,
  phase: 'beforeWrite',
  data: {},
  fn: ({ state, options }) => {
    if (state.modifiersData.popperOffsets)
      state.styles.popper = {
        ...state.styles.popper,
        ...mapStyles(state, state.modifiersData.popperOffsets, options.adaptive ?? true, options),
      };
    if (state.modifiersData.arrow)
      state.styles.arrow = {
        ...state.styles.arrow,
        ...mapStyles(state, state.modifiersData.arrow, false, options),
      };
    state.attributes.popper = {
      ...state.attributes.popper,
      'data-popper-placement': state.placement,
    };
  },
};
export function defaultModifiers(platform: NativePopperPlatform): NativePopperModifier[] {
  return [
    {
      name: 'eventListeners',
      enabled: true,
      phase: 'write',
      effect: ({ instance, options }) =>
        platform.subscribe?.(instance, {
          scroll: options.scroll ?? true,
          resize: options.resize ?? true,
        }),
    },
    popperOffsets,
    computeStyles,
    {
      name: 'applyStyles',
      enabled: true,
      phase: 'write',
      requires: ['computeStyles'],
      effect: ({ state }) => {
        state.styles = {
          popper: { position: 'absolute', left: 0, top: 0, margin: 0 },
          arrow: { position: 'absolute' },
          reference: {},
        };
        return platform.beginStyles?.(state);
      },
      fn: ({ state }) => {
        for (const style of Object.values(state.styles)) {
          for (const name of ['top', 'left', 'bottom', 'right'] as const)
            if (typeof style[name] === 'number' && !Number.isFinite(style[name]))
              throw new Error('MUI Native: Popper produced non-finite positioning styles.');
          if (Array.isArray(style.transform))
            for (const transform of style.transform)
              for (const value of Object.values(transform))
                if (typeof value === 'number' && !Number.isFinite(value))
                  throw new Error('MUI Native: Popper produced a non-finite transform.');
        }
        platform.apply?.(state);
      },
    },
    offset,
    flip,
    preventOverflow(platform),
    arrow(platform),
    hide,
  ];
}
