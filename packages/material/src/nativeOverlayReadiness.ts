import { createContext } from 'react';
// Native windows must be presented and own the top layer before child focus.
export const NativeOverlayReadiness = createContext(true);
