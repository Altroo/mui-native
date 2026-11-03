import { createContext, useContext, useMemo } from 'react';
import type { NativeCheckedChangeEvent } from './checkedTypes';
import type { NativeRadioRegistry } from './nativeRadioRegistry';
export interface RadioGroupState {
  name: string | undefined;
  value: unknown;
  onChange: (event: NativeCheckedChangeEvent, value: string) => void;
}
export interface NativeRadioGroupState extends RadioGroupState {
  registry: NativeRadioRegistry;
  direction: 'ltr' | 'rtl';
}
export const RadioContext = createContext<NativeRadioGroupState | undefined>(undefined);
export function useRadioGroup(): RadioGroupState | undefined {
  const context = useContext(RadioContext);
  return useMemo(
    () =>
      context
        ? { name: context.name, value: context.value, onChange: context.onChange }
        : undefined,
    [context],
  );
}
export function equalRadioValue(a: unknown, b: unknown) {
  return typeof b === 'object' && b !== null ? a === b : String(a) === String(b);
}
