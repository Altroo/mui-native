import type { ViewInstance } from 'react-native';
import type { NativePortalObservation, NativePortalRect } from '@altroo/mui-native-host';
export interface PortalObservationLease {
  readonly node: ViewInstance | null;
  readonly tag: number;
  readonly revision: string;
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
  constructor(private readonly changed: (lease: PortalObservationLease | null) => void) {}
  observe(node: ViewInstance | null, tag: number, listener: PortalObservationListener): () => void {
    if (
      !Number.isInteger(tag) ||
      tag < 0 ||
      (node != null && tag === 0) ||
      (node == null && tag !== 0)
    )
      throw new Error('MUI Native: the observed anchor must be a mounted native instance or null.');
    if (!this.accepting || this.clearing) return () => {};
    const previous = this.current;
    const owner = Symbol('observation');
    const lease = { node, tag, revision: `mui-observation-${++sequence}`, owner, listener };
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
      value.observedTag !== lease.tag
    )
      return 'stale';
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
      !validRect(value.popperClip, true)
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
      }),
    );
    return 'delivered';
  }
}
