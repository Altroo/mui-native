import type { ViewInstance } from 'react-native';
import type { NativePortalObservation, NativePortalRect } from '@altroo/mui-native-host';
export interface PortalObservationLease {
  readonly node: ViewInstance | null;
  readonly tag: number;
  readonly revision: string;
  readonly popperTag: number;
  readonly arrowTag: number;
  readonly boundaryTags: readonly number[];
}
export type PortalObservationListener = (observation: NativePortalObservation | null) => void;
let sequence = 0;
function validRect(rect: NativePortalRect, signed = false): boolean {
  return (
    !!rect &&
    ['x', 'y', 'width', 'height'].every((key) =>
      Number.isFinite(rect[key as keyof NativePortalRect]),
    ) &&
    (signed || (rect.width >= 0 && rect.height >= 0))
  );
}
/** Private single-owner transport. A late cleanup/event cannot invalidate a newer anchor lease. */
export class PortalObservationRegistry {
  private current:
    | (PortalObservationLease & { owner: symbol; listener: PortalObservationListener })
    | null = null;
  private accepting = true;
  private clearing = false;
  private readonly changed: (lease: PortalObservationLease | null) => void;
  constructor(changed: (lease: PortalObservationLease | null) => void) {
    this.changed = changed;
  }
  observe(
    node: ViewInstance | null,
    tag: number,
    listener: PortalObservationListener,
    details: { popperTag?: number; arrowTag?: number; boundaryTags?: readonly number[] } = {},
  ): () => void {
    if (
      !Number.isInteger(tag) ||
      tag < 0 ||
      (node != null && tag === 0) ||
      (node == null && tag !== 0)
    )
      throw new Error('MUI Native: the observed anchor must be a mounted native instance or null.');
    if (!this.accepting || this.clearing) return () => {};
    const previous = this.current;
    const popperTag = details.popperTag ?? 0,
      arrowTag = details.arrowTag ?? 0,
      boundaryTags = [...new Set(details.boundaryTags ?? [])].sort((a, b) => a - b);
    if (
      ![popperTag, arrowTag].every((tag) => Number.isInteger(tag) && tag >= 0) ||
      !boundaryTags.every((tag) => Number.isInteger(tag) && tag > 0)
    )
      throw new Error('MUI Native: positioning observers require mounted native tags.');
    const owner = Symbol('observation');
    const lease = {
      node,
      tag,
      popperTag,
      arrowTag,
      boundaryTags,
      revision: `mui-observation-${++sequence}`,
      owner,
      listener,
    };
    this.current = lease;
    this.changed(lease);
    previous?.listener(null);
    return () => {
      if (this.current?.owner !== owner) return;
      this.current = null;
      this.changed(null);
      listener(null);
    };
  }
  activate(): void {
    this.accepting = true;
  }
  deactivate(): void {
    this.accepting = false;
  }
  invalidate(): void {
    const previous = this.current;
    if (!previous || !this.accepting) return;
    const renewed = { ...previous, revision: `mui-observation-${++sequence}` };
    this.current = renewed;
    this.changed(renewed);
    previous.listener(null);
  }
  clear(): void {
    const previous = this.current;
    this.current = null;
    const wasClearing = this.clearing;
    this.clearing = true;
    try {
      previous?.listener(null);
    } finally {
      this.clearing = wasClearing;
    }
  }
  receive(
    value: NativePortalObservation,
    revision: string,
    eligible: boolean,
  ): 'stale' | 'invalid' | 'delivered' {
    const lease = this.current;
    if (
      !this.accepting ||
      !lease ||
      value.revision !== revision ||
      value.observationRevision !== lease.revision ||
      value.observedTag !== lease.tag ||
      (value.position != null && value.position.popperTag !== lease.popperTag)
    )
      return 'stale';
    if (lease.popperTag > 0 && !value.position) {
      lease.listener(null);
      return 'invalid';
    }
    if (typeof value.presented !== 'boolean') {
      lease.listener(null);
      return 'invalid';
    }
    if (!eligible || !value.presented) {
      lease.listener(null);
      return 'delivered';
    }
    if (
      typeof value.anchorAvailable !== 'boolean' ||
      typeof value.presented !== 'boolean' ||
      typeof value.reason !== 'string' ||
      !validRect(value.anchor) ||
      !validRect(value.viewport) ||
      !validRect(value.window) ||
      !value.referenceClip ||
      typeof value.referenceClip.present !== 'boolean' ||
      !validRect(value.referenceClip, true) ||
      !value.popperClip ||
      typeof value.popperClip.present !== 'boolean' ||
      !validRect(value.popperClip, true) ||
      (value.position != null && !validPortalPosition(value.position))
    ) {
      lease.listener(null);
      return 'invalid';
    }
    lease.listener(
      Object.freeze({
        ...value,
        anchor: Object.freeze({ ...value.anchor }),
        referenceClip: Object.freeze({ ...value.referenceClip }),
        popperClip: Object.freeze({ ...value.popperClip }),
        viewport: Object.freeze({ ...value.viewport }),
        window: Object.freeze({ ...value.window }),
        ...(value.position ? { position: freezePortalPosition(value.position) } : {}),
      }),
    );
    return 'delivered';
  }
}

function validPortalPosition(value: NonNullable<NativePortalObservation['position']>): boolean {
  return (
    Number.isInteger(value.popperTag) &&
    value.popperTag >= 0 &&
    typeof value.available === 'boolean' &&
    typeof value.anchorAvailable === 'boolean' &&
    typeof value.leftRightSwapped === 'boolean' &&
    [value.reference, value.popper, value.viewport, value.window, value.containing].every((rect) =>
      validRect(rect),
    ) &&
    [value.referenceClip, value.popperClip].every(
      (rect) => !!rect && typeof rect.present === 'boolean' && validRect(rect, true),
    ) &&
    ['a', 'b', 'c', 'd'].every((key) => Number.isFinite((value.containing as any)[key])) &&
    Math.abs(value.containing.a * value.containing.d - value.containing.b * value.containing.c) >
      1e-10 &&
    !!value.arrow &&
    Number.isInteger(value.arrow.tag) &&
    value.arrow.tag >= 0 &&
    typeof value.arrow.available === 'boolean' &&
    typeof value.arrow.leftRightSwapped === 'boolean' &&
    validRect(value.arrow) &&
    ['parentWidth', 'parentHeight', 'clientLeft', 'clientTop'].every(
      (key) => Number.isFinite((value.arrow as any)[key]) && (value.arrow as any)[key] >= 0,
    ) &&
    Array.isArray(value.boundaries) &&
    value.boundaries.every(
      (rect) =>
        Number.isInteger(rect.tag) &&
        rect.tag > 0 &&
        typeof rect.available === 'boolean' &&
        validRect(rect),
    )
  );
}
function freezePortalPosition(value: NonNullable<NativePortalObservation['position']>) {
  return Object.freeze({
    ...value,
    reference: Object.freeze({ ...value.reference }),
    popper: Object.freeze({ ...value.popper }),
    viewport: Object.freeze({ ...value.viewport }),
    window: Object.freeze({ ...value.window }),
    containing: Object.freeze({ ...value.containing }),
    referenceClip: Object.freeze({ ...value.referenceClip }),
    popperClip: Object.freeze({ ...value.popperClip }),
    arrow: Object.freeze({ ...value.arrow }),
    boundaries: Object.freeze(value.boundaries.map((rect) => Object.freeze({ ...rect }))),
  });
}
