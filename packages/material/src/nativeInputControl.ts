import { createContext } from 'react';
/** Private value/event adapter for a non-text control composed through InputBase. */
export const NativeInputValueContext = createContext<'select' | undefined>(undefined);
export function inputControlFilled(value: unknown): boolean {
  return value != null && value !== '' && (!Array.isArray(value) || value.length > 0);
}
