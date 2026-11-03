import { createContext } from 'react';
// Composite owners handle these keys; disabled items must still let navigation bubble.
export const NativeCompositeKeys = createContext<readonly string[] | null>(null);
