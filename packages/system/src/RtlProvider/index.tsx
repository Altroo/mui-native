// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { createContext, useContext } from 'react';
const Context = createContext<boolean | undefined>(undefined);
export interface RtlProviderProps {
  children?: React.ReactNode;
  value?: boolean | undefined;
}
const RtlProvider: React.FC<RtlProviderProps> = function RtlProvider({ value, children }) {
  // An absent provider defaults false; an omitted provider value defaults true.
  return <Context.Provider value={value ?? true}>{children}</Context.Provider>;
};
export default RtlProvider;
export function useRtl(): boolean {
  return useContext(Context) ?? false;
}
