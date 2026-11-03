import { createContext } from 'react';
export interface NativeListContext {
  dense?: boolean;
  direction?: 'ltr' | 'rtl';
  alignItems?: 'center' | 'flex-start';
  disableGutters?: boolean;
  secondaryAction?: number;
  reportActionSize?: (width: number, height: number) => void;
}
export const ListContext = createContext<NativeListContext>({});
