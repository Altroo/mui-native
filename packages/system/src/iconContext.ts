import { createContext } from 'react';
export interface NativeIconStyle {
  fontSize?: number;
}
// A composed control may impose icon dimensions independently of text typography.
export const NativeIconStyleContext = createContext<NativeIconStyle | undefined>(undefined);
