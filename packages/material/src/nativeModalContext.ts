import { createContext } from 'react';
export interface NativeModalParent {
  id: symbol;
  host: symbol;
  nativeWindow: boolean;
  presented: boolean;
  open: boolean;
}
export const NativeModalParentContext = createContext<NativeModalParent | undefined>(undefined);
