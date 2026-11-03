import { createContext } from 'react';
import type { ViewInstance } from 'react-native';
import type { NativePortalBounds } from './portalGeometry';
export interface NativePortalSurface {
  readonly node: ViewInstance | null;
  readonly bounds: NativePortalBounds | null;
  readonly presented: boolean;
}
export const NativePortalContext = createContext<NativePortalSurface | undefined>(undefined);
