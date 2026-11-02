import { createContext, useContext, useRef, useState, useEffect } from 'react';
import type { TextInputChangeEvent } from 'react-native';
export function useControlled<T>(
  controlled: T | undefined,
  defaultValue: T,
): [T, (value: T) => void] {
  const isControlled = useRef(controlled !== undefined).current;
  const [local, setLocal] = useState(defaultValue);
  useEffect(() => {
    if (isControlled !== (controlled !== undefined))
      console.warn(
        '[mui-native:controlled] Do not switch between controlled and uncontrolled state.',
      );
  }, [controlled, isControlled]);
  return [
    isControlled ? (controlled as T) : local,
    (value) => {
      if (!isControlled) setLocal(value);
    },
  ];
}
export type InputChangeEvent = {
  target: { value: string; name?: string; id?: string };
  currentTarget: { value: string; name?: string; id?: string };
  nativeEvent: TextInputChangeEvent['nativeEvent'];
};

export interface FormState {
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  color?: string;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled' | 'standard';
  hiddenLabel?: boolean;
  focused?: boolean;
  filled?: boolean;
  adornedStart?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onFilled?: () => void;
  onEmpty?: () => void;
  setAdornedStart?: (value: boolean) => void;
}
export const FormContext = createContext<FormState | undefined>(undefined);
export function useFormControl() {
  return useContext(FormContext);
}
