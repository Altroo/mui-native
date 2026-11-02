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

export interface FormControlState {
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  color?: string;
  size?: string;
  variant?: 'outlined' | 'filled' | 'standard';
  hiddenLabel?: boolean;
  fullWidth?: boolean;
  margin?: 'none' | 'normal' | 'dense';
  labelDisplay?: 'floating' | 'stacked';
  focused?: boolean;
  filled?: boolean;
  adornedStart?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onFilled?: () => void;
  onEmpty?: () => void;
  setAdornedStart?: (value: boolean) => void;
}
export interface NativeFieldDescription {
  id?: string;
  htmlFor?: string;
  text?: string;
  shrink?: boolean;
}
export interface NativeHelperRegistration {
  update(description: NativeFieldDescription): void;
  remove(): void;
}
export interface FormState extends FormControlState {
  width?: number;
  label?: NativeFieldDescription;
  helper?: NativeFieldDescription;
  helpers?: ReadonlyArray<NativeFieldDescription>;
  registerInput?: (id: string | undefined, focus: () => void) => () => void;
  focusInput?: (id?: string) => void;
  registerLabel?: (description: NativeFieldDescription) => () => void;
  registerHelper?: (description: NativeFieldDescription) => NativeHelperRegistration;
}
export function nativeLabelText(node: import('react').ReactNode): string | undefined {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    const parts = node.map(nativeLabelText);
    return parts.every((part) => part != null) ? parts.join('') : undefined;
  }
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'object' && 'props' in node)
    return nativeLabelText((node.props as { children?: import('react').ReactNode }).children);
  return undefined;
}
export const FormContext = createContext<FormState | undefined>(undefined);
export function useFormControl(): FormControlState | undefined {
  return useContext(FormContext);
}
