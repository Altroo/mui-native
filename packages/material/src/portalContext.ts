import { createContext } from 'react';
import type { ViewInstance } from 'react-native';
import type { NativePortalBounds } from './portalGeometry';
import type { PortalObservationListener } from './portalObservation';
export interface NativePortalPositionOptions {
  popper: ViewInstance;
  arrow?: ViewInstance | null;
  boundaries?: readonly ViewInstance[];
}
export interface NativePortalSurface {
  readonly node: ViewInstance | null;
  readonly bounds: NativePortalBounds | null;
  readonly presented: boolean;
  /** Private positioning registration; null observes only viewport/container geometry. */
  observeAnchor(
    node: ViewInstance | null,
    listener: PortalObservationListener,
    options?: NativePortalPositionOptions,
  ): () => void;
}
export const NativePortalContext = createContext<NativePortalSurface | undefined>(undefined);
