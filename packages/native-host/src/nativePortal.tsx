import React, { forwardRef } from 'react';
import type { ViewInstance, NativeSyntheticEvent } from 'react-native';
import type { NativeProps } from './AltrooMUIPortalHostNativeComponent';
import { portalCalibration } from './portalCoordinates';
export interface NativePortalLayout {
  revision: string;
  presented: boolean;
  reason: string;
  x: number;
  y: number;
  width: number;
  height: number;
  a: number;
  b: number;
  c: number;
  d: number;
  rootX: number;
  rootY: number;
  rootA: number;
  rootB: number;
  rootC: number;
  rootD: number;
}
export interface NativePortalRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
export interface NativePortalPosition {
  readonly popperTag: number;
  readonly leftRightSwapped: boolean;
  readonly arrow: NativePortalRect & {
    readonly tag: number;
    readonly available: boolean;
    readonly leftRightSwapped: boolean;
    readonly parentWidth: number;
    readonly parentHeight: number;
    readonly clientLeft: number;
    readonly clientTop: number;
  };
  readonly available: boolean;
  readonly anchorAvailable: boolean;
  readonly reference: NativePortalRect;
  readonly popper: NativePortalRect;
  readonly referenceClip: NativePortalRect & { readonly present: boolean };
  readonly popperClip: NativePortalRect & { readonly present: boolean };
  readonly viewport: NativePortalRect;
  readonly window: NativePortalRect;
  readonly containing: NativePortalRect & {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
  };
  readonly boundaries: readonly (NativePortalRect & {
    readonly tag: number;
    readonly available: boolean;
  })[];
}
/** Window-space native geometry. Signed clipping sizes retain disjoint intersections. */
export interface NativePortalObservation {
  readonly revision: string;
  readonly observationRevision: string;
  readonly observedTag: number;
  readonly presented: boolean;
  readonly anchorAvailable: boolean;
  readonly reason: string;
  readonly anchor: NativePortalRect;
  /** Host 0.0.5: measurements in the actual popup containing block. */
  readonly position?: NativePortalPosition;
  readonly referenceClip: NativePortalRect & { readonly present: boolean };
  readonly popperClip: NativePortalRect & { readonly present: boolean };
  readonly viewport: NativePortalRect;
  readonly window: NativePortalRect;
}
export interface NativePortalHostProps
  extends Omit<NativeProps, 'onPortalLayout' | 'onPortalObservation'> {
  onPortalObservation?: (event: NativeSyntheticEvent<NativePortalObservation>) => void;
  onPortalLayout?: (event: NativeSyntheticEvent<NativePortalLayout>) => void;
  geometry?: NativePortalLayout | null;
  surfaceRef?: React.Ref<ViewInstance>;
  presented?: boolean;
}
let implementation: typeof import('./AltrooMUIPortalHostNativeComponent') | undefined;
let canvasImplementation: typeof import('./AltrooMUIPortalCanvasNativeComponent') | undefined;
export const NativePortalHost: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<NativePortalHostProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, NativePortalHostProps>(function NativePortalHost(
  { children, geometry, surfaceRef, presented = false, ...props },
  ref,
) {
  implementation ??= require('./AltrooMUIPortalHostNativeComponent');
  canvasImplementation ??= require('./AltrooMUIPortalCanvasNativeComponent');
  const Host = implementation!.default,
    Canvas = canvasImplementation!.default;
  const viewport = geometry
    ? {
        viewportX: geometry.rootX,
        viewportY: geometry.rootY,
        viewportA: geometry.rootA,
        viewportB: geometry.rootB,
        viewportC: geometry.rootC,
        viewportD: geometry.rootD,
      }
    : {};
  const calibration = geometry ? portalCalibration(geometry) : {};
  return (
    <Host {...props} {...viewport} ref={ref as any}>
      <Canvas
        key={props.revision}
        {...calibration}
        ref={surfaceRef as any}
        collapsable={false}
        pointerEvents={presented ? 'box-none' : 'none'}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: geometry?.width ?? 0,
          height: geometry?.height ?? 0,
          opacity: presented ? 1 : 0,
        }}
      >
        {children}
      </Canvas>
    </Host>
  );
});
