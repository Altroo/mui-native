import type { NativePortalObservation } from '../../packages/native-host/src';
type Mutable<T> = T extends readonly (infer U)[]
  ? Mutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;
export function nativePopperSnapshot(popperTag = 2): Mutable<NativePortalObservation> {
  const rect = { x: 0, y: 0, width: 390, height: 844 },
    clip = { ...rect, present: false };
  return {
    revision: 'surface',
    observationRevision: 'lease',
    observedTag: 0,
    presented: true,
    anchorAvailable: false,
    reason: 'observed',
    anchor: { x: 0, y: 0, width: 0, height: 0 },
    referenceClip: clip,
    popperClip: clip,
    viewport: rect,
    window: rect,
    position: {
      popperTag,
      available: true,
      anchorAvailable: false,
      leftRightSwapped: false,
      reference: { x: 120, y: 200, width: 100, height: 40 },
      popper: { x: 0, y: 0, width: 80, height: 30 },
      referenceClip: clip,
      popperClip: clip,
      viewport: rect,
      window: rect,
      containing: { ...rect, a: 1, b: 0, c: 0, d: 1 },
      boundaries: [],
      arrow: {
        tag: 0,
        available: false,
        leftRightSwapped: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        parentWidth: 0,
        parentHeight: 0,
        clientLeft: 0,
        clientTop: 0,
      },
    },
  };
}
