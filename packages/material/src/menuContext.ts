import { createContext, useContext } from 'react';
import type { ViewInstance } from 'react-native';
import type { NativeMenuRegistry, MenuFocusSource } from './nativeMenuRegistry';
export interface NativeMenuContextValue {
  registry: NativeMenuRegistry;
  activeId: string | null;
  variant: 'menu' | 'selectedMenu';
  disabledItemsFocusable: boolean;
  suppressInitialFocusVisible: boolean;
  focusSource: MenuFocusSource;
  focusItem(id: string, source?: MenuFocusSource): ViewInstance | null;
  reportFocus(id: string, node: ViewInstance): void;
  reportBlur(id: string, node: ViewInstance): void;
}
export const NativeMenuContext = createContext<NativeMenuContextValue | null>(null);
export const NativeMenuFocusReadiness = createContext(true);
export const NativeMenuFocusSource = createContext<MenuFocusSource>(null);
export function useNativeMenuContext() {
  const value = useContext(NativeMenuContext);
  if (!value) throw new Error('MUI Native: MenuItems must be placed within Menu or MenuList.');
  return value;
}
