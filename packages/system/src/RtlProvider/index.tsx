import React, { createContext, useContext } from 'react';
const Context = createContext<boolean | undefined>(undefined);
export interface RtlProviderProps {
  children?: React.ReactNode;
  value?: boolean;
}
export default function RtlProvider({ value, children }: RtlProviderProps) {
  return <Context.Provider value={value ?? true}>{children}</Context.Provider>;
}
export function useRtl(): boolean {
  return useContext(Context) ?? false;
}
