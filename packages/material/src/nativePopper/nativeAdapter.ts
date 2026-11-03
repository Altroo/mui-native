/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import type { ViewInstance } from 'react-native';
import type { NativeStyle } from '@altroo/mui-native-system';
import type { NativePortalObservation, NativePortalPosition } from '@altroo/mui-native-host';
import type {
  NativePopperAnchor,
  NativePopperBoundary,
  NativePopperInstance,
  NativePopperMeasurements,
  NativePopperPlatform,
  NativePopperRect,
  NativePopperState,
  PopperVirtualElement,
} from './types';
import { intersect, validRect } from './geometry';
import { windowPointToPortal } from '../portalGeometry';
export interface NativePositionRequest {
  readonly reference: ViewInstance | null;
  readonly popper: ViewInstance;
  readonly arrow: ViewInstance | null;
  readonly boundaries: readonly ViewInstance[];
}
interface Bindings {
  tag(node: ViewInstance): number;
  pixelRatio(): number;
  configure(request: NativePositionRequest): void;
  publish(style: NativeStyle): void;
  ready(value: boolean): void;
  report(error: unknown): void;
}
const isNative = (value: NativePopperAnchor): value is ViewInstance =>
  typeof (value as ViewInstance).measureInWindow === 'function';
export function nativeAnchorContext(value: NativePopperAnchor): ViewInstance | null {
  return isNative(value) ? value : (value.contextElement ?? null);
}
function virtualRect(value: PopperVirtualElement): NativePopperRect {
  if ('nodeType' in value)
    throw new Error(
      'MUI Native: a Popper virtual element must not be a DOM node; use a native view or an untagged virtual rectangle.',
    );
  const rect = value.getBoundingClientRect();
  const result = {
    x: 'x' in rect ? rect.x : rect.left,
    y: 'y' in rect ? rect.y : rect.top,
    width: rect.width,
    height: rect.height,
  };
  if (!validRect(result))
    throw new Error(
      'MUI Native: a Popper virtual element must return finite, nonnegative window bounds.',
    );
  return result;
}
export function windowRectToContaining(
  rect: NativePopperRect,
  frame: NativePortalPosition['containing'],
  clipping = false,
): NativePopperRect {
  if (clipping && (rect.width <= 0 || rect.height <= 0))
    return { ...windowPointToPortal(rect.x, rect.y, frame), width: 0, height: 0 };
  const points = [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x, rect.y + rect.height],
    [rect.x + rect.width, rect.y + rect.height],
  ].map(([x, y]) => windowPointToPortal(x, y, frame));
  const x = Math.min(...points.map((p) => p.x)),
    y = Math.min(...points.map((p) => p.y));
  return {
    x,
    y,
    width: Math.max(...points.map((p) => p.x)) - x,
    height: Math.max(...points.map((p) => p.y)) - y,
  };
}
export function physicalPopperStyle(style: NativeStyle, swapped: boolean): NativeStyle {
  if (!swapped || (!Object.hasOwn(style, 'left') && !Object.hasOwn(style, 'right'))) return style;
  const { left, right, ...other } = style;
  return { ...other, left: right, right: left };
}
export function sameNativeValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    !a ||
    !b ||
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    Array.isArray(a) !== Array.isArray(b)
  )
    return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.hasOwn(b, key) && sameNativeValue((a as any)[key], (b as any)[key]))
  );
}
function sameRequest(a: NativePositionRequest | null, b: NativePositionRequest) {
  return (
    !!a &&
    a.reference === b.reference &&
    a.popper === b.popper &&
    a.arrow === b.arrow &&
    a.boundaries.length === b.boundaries.length &&
    a.boundaries.every((node, i) => node === b.boundaries[i])
  );
}
// React Native validates imperative transforms before applying them. Reset to an
// identity array; null reaches processTransform's array validator and crashes in dev.
const arrowResetValue = (key: string) => (key === 'transform' ? [] : null);
// A retired instance may clean up after a new one has adopted the same native arrow.
// Track owned keys so late teardown cannot erase the replacement's imperative styles.
const arrowStyleOwners = new WeakMap<ViewInstance, { token: symbol; keys: Set<string> }>();
/** Actual geometry arrives on the UI thread. Promise reads wait for their matching native lease. */
export class NativePopperAdapter implements NativePopperPlatform {
  private request: NativePositionRequest | null = null;
  private snapshot: NativePortalObservation | null = null;
  private waiters: Array<{
    state: NativePopperState;
    resolve: (value: NativePopperMeasurements | null) => void;
    reject: (error: unknown) => void;
  }> = [];
  private subscribers = new Map<NativePopperInstance, { scroll: boolean; resize: boolean }>();
  private active = true;
  private measurementSnapshots = new WeakMap<NativePopperMeasurements, NativePortalObservation>();
  // Custom modifiers may return replacement state objects. Bind each one to its cycle's
  // captured frame so boundary/arrow reads cannot mix geometry from different UI updates.
  private stateSnapshots = new WeakMap<NativePopperState, NativePortalObservation>();
  private readonly bindings: Bindings;
  constructor(bindings: Bindings) {
    this.bindings = bindings;
  }
  report = (error: unknown) => {
    this.bindings.ready(false);
    this.bindings.report(error);
  };
  contains(parent: ViewInstance, child: ViewInstance): boolean {
    return parent === child || (typeof parent.contains === 'function' && parent.contains(child));
  }
  private requested(state: NativePopperState): NativePositionRequest {
    const boundaries: ViewInstance[] = [];
    for (const modifier of state.orderedModifiers) {
      const boundary = modifier.options?.boundary;
      for (const value of boundary && boundary !== 'clippingParents'
        ? Array.isArray(boundary)
          ? boundary
          : [boundary]
        : [])
        if (isNative(value) && !boundaries.includes(value)) boundaries.push(value);
    }
    const arrow = state.elements.arrow ?? null;
    return {
      reference: nativeAnchorContext(state.elements.reference),
      popper: state.elements.popper,
      arrow,
      boundaries,
    };
  }
  private configure(state: NativePopperState): boolean {
    const next = this.requested(state);
    if (sameRequest(this.request, next)) return false;
    this.snapshot = null;
    this.release(null);
    this.request = next;
    this.bindings.ready(false);
    this.bindings.configure(next);
    return true;
  }
  // Readiness and measurement share this gate. A lost anchor/boundary must hide an
  // already visible popup even when automatic scroll/resize recomputation is disabled.
  private hasUsablePosition(
    value: NativePortalObservation | null,
  ): value is NativePortalObservation & { position: NativePortalPosition } {
    const position = value?.position,
      request = this.request;
    if (
      !this.active ||
      !value?.presented ||
      !position?.available ||
      !request ||
      (request.reference && !position.anchorAvailable) ||
      position.popperTag !== this.bindings.tag(request.popper) ||
      value.observedTag !== (request.reference ? this.bindings.tag(request.reference) : 0)
    )
      return false;
    // Missing explicit boundaries cannot fall back to another clipping boundary.
    return request.boundaries.every((node) =>
      position.boundaries.some((rect) => rect.tag === this.bindings.tag(node) && rect.available),
    );
  }
  private measurements(state: NativePopperState): NativePopperMeasurements | null {
    const value = this.snapshot;
    if (
      !this.hasUsablePosition(value) ||
      value.position.popperTag !== this.bindings.tag(state.elements.popper)
    )
      return null;
    const position = value.position,
      reference = isNative(state.elements.reference)
        ? position.reference
        : windowRectToContaining(virtualRect(state.elements.reference), position.containing);
    const measurement: NativePopperMeasurements = {
      reference: { ...reference },
      popper: { ...position.popper },
      viewport: { ...position.viewport },
      document: { ...position.window },
      clipping: {
        reference: position.referenceClip.present ? { ...position.referenceClip } : null,
        popper: position.popperClip.present ? { ...position.popperClip } : null,
      },
      offsetParent: { width: position.containing.width, height: position.containing.height },
      pixelRatio: this.bindings.pixelRatio(),
    };
    this.measurementSnapshots.set(measurement, value);
    return measurement;
  }
  measure(
    state: NativePopperState,
  ): NativePopperMeasurements | null | Promise<NativePopperMeasurements | null> {
    if (!this.active) return null;
    const changed = this.configure(state);
    if (!changed && this.snapshot) return this.measurements(state);
    return new Promise((resolve, reject) => this.waiters.push({ state, resolve, reject }));
  }
  private release(value: NativePortalObservation | null) {
    const waiting = this.waiters;
    this.waiters = [];
    for (const waiter of waiting) {
      try {
        waiter.resolve(value ? this.measurements(waiter.state) : null);
      } catch (error) {
        waiter.reject(error);
      }
    }
  }
  receive = (value: NativePortalObservation | null) => {
    if (!this.active) return;
    const previous = this.snapshot;
    this.snapshot = value;
    if (!this.hasUsablePosition(value)) this.bindings.ready(false);
    const waited = this.waiters.length > 0;
    this.release(value);
    if (waited || !value) return;
    const size = (v: NativePortalObservation | null) =>
      v?.position
        ? {
            viewport: v.position.viewport,
            window: v.position.window,
            popper: v.position.popper,
            containing: {
              width: v.position.containing.width,
              height: v.position.containing.height,
              a: v.position.containing.a,
              b: v.position.containing.b,
              c: v.position.containing.c,
              d: v.position.containing.d,
            },
            reference: { width: v.position.reference.width, height: v.position.reference.height },
            arrow: {
              tag: v.position.arrow.tag,
              available: v.position.arrow.available,
              width: v.position.arrow.width,
              height: v.position.arrow.height,
              parentWidth: v.position.arrow.parentWidth,
              parentHeight: v.position.arrow.parentHeight,
              clientLeft: v.position.arrow.clientLeft,
              clientTop: v.position.arrow.clientTop,
              leftRightSwapped: v.position.arrow.leftRightSwapped,
            },
            boundaries: v.position.boundaries.map((rect) => ({
              tag: rect.tag,
              available: rect.available,
              width: rect.width,
              height: rect.height,
            })),
          }
        : null;
    const resized = !sameNativeValue(size(previous), size(value));
    for (const [instance, options] of this.subscribers)
      if (resized ? options.resize : options.scroll) void instance.update().catch(this.report);
  };
  invalidate() {
    this.snapshot = null;
    this.release(null);
    this.bindings.ready(false);
  }
  setActive(active: boolean) {
    this.active = active;
    if (!active) {
      this.request = null;
      this.invalidate();
    }
  }
  subscribe(instance: NativePopperInstance, options: { scroll: boolean; resize: boolean }) {
    const registration = { ...options };
    this.subscribers.set(instance, registration);
    return () => {
      if (this.subscribers.get(instance) === registration) this.subscribers.delete(instance);
    };
  }
  boundary(
    boundary: Exclude<NativePopperBoundary, 'clippingParents'>,
    _state: NativePopperState,
  ): NativePopperRect | null {
    const position = this.stateSnapshots.get(_state)?.position;
    if (!position?.available) return null;
    const values = Array.isArray(boundary) ? boundary : [boundary];
    let result: NativePopperRect | null = null;
    for (const value of values) {
      const measured = isNative(value)
        ? position.boundaries.find(
            (rect) => rect.tag === this.bindings.tag(value) && rect.available,
          )
        : windowRectToContaining(virtualRect(value), position.containing, true);
      if (!measured) return null;
      result = result ? intersect(result, measured) : measured;
    }
    return result;
  }
  layout(element: ViewInstance, state?: NativePopperState): NativePopperRect | null {
    const position = (state ? this.stateSnapshots.get(state) : this.snapshot)?.position,
      tag = this.bindings.tag(element);
    if (position?.arrow.tag === tag && position.arrow.available) return position.arrow;
    if (position?.popperTag === tag && position.available) return position.popper;
    return null;
  }
  parent(
    element: ViewInstance,
    state: NativePopperState,
  ): NativePopperMeasurements['offsetParent'] {
    const arrow = this.stateSnapshots.get(state)?.position?.arrow;
    if (arrow?.tag === this.bindings.tag(element) && arrow.available)
      return {
        width: arrow.parentWidth,
        height: arrow.parentHeight,
        clientLeft: arrow.clientLeft,
        clientTop: arrow.clientTop,
      };
    return state.native.offsetParent;
  }
  beginStyles = (state: NativePopperState) => {
    const modifier = state.orderedModifiers.find((modifier) => modifier.name === 'arrow'),
      arrow = modifier?.options?.element;
    if (!arrow || typeof arrow === 'string' || !this.contains(state.elements.popper, arrow)) return;
    const token = Symbol('arrow-styles');
    const ownership = { token, keys: new Set<string>(['position']) };
    const previous = arrowStyleOwners.get(arrow);
    arrowStyleOwners.set(arrow, ownership);
    arrow.setNativeProps({
      style: {
        ...Object.fromEntries(
          [...(previous?.keys ?? [])].map((key) => [key, arrowResetValue(key)]),
        ),
        position: 'absolute',
      },
    });
    return () => {
      if (arrowStyleOwners.get(arrow) !== ownership) return;
      arrowStyleOwners.delete(arrow);
      arrow.setNativeProps({
        style: Object.fromEntries([...ownership.keys].map((key) => [key, arrowResetValue(key)])),
      });
    };
  };
  apply = (state: NativePopperState) => {
    const source = this.stateSnapshots.get(state),
      position = source?.position;
    if (!this.active || source !== this.snapshot || !position?.available) return;
    const style = physicalPopperStyle(state.styles.popper ?? {}, position.leftRightSwapped);
    this.bindings.publish(cloneNativeStyle(style));
    const arrow = state.elements.arrow;
    if (
      arrow &&
      position.arrow.available &&
      position.arrow.tag === this.bindings.tag(arrow) &&
      state.styles.arrow
    ) {
      const style = physicalPopperStyle(state.styles.arrow, position.arrow.leftRightSwapped);
      const ownership = arrowStyleOwners.get(arrow);
      if (ownership) Object.keys(style).forEach((key) => ownership.keys.add(key));
      arrow.setNativeProps({
        style: Object.fromEntries(
          Object.entries(style).map(([key, value]) => [key, value ?? arrowResetValue(key)]),
        ),
      });
    }
  };
  bindMeasurement = (state: NativePopperState, measurement: NativePopperMeasurements) => {
    const source = this.measurementSnapshots.get(measurement);
    if (source) this.stateSnapshots.set(state, source);
  };
  isMeasurementCurrent = (measurement: NativePopperMeasurements) =>
    this.active && this.measurementSnapshots.get(measurement) === this.snapshot;
  didUpdate = (state: NativePopperState) => {
    if (this.active && this.stateSnapshots.get(state) === this.snapshot) this.positioned();
  };
  positioned = () => {
    if (this.hasUsablePosition(this.snapshot)) this.bindings.ready(true);
  };
  dispose() {
    this.active = false;
    this.snapshot = null;
    this.request = null;
    this.release(null);
    this.subscribers.clear();
  }
}

function cloneNativeStyle<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneNativeStyle) as T;
  if (
    value &&
    typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  )
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneNativeStyle(item)]),
    ) as T;
  return value;
}
