import { createContext, useContext, useLayoutEffect, type RefObject } from 'react';
import type { ButtonBaseActivationEvent } from './buttonBase';
export type LabelActivation = (event: ButtonBaseActivationEvent) => void;
export const LabelActivationContext = createContext<RefObject<LabelActivation | null> | null>(null);
export function useLabelActivation(activate: LabelActivation) {
  const target = useContext(LabelActivationContext);
  useLayoutEffect(() => {
    if (!target) return;
    target.current = activate;
    return () => {
      if (target.current === activate) target.current = null;
    };
  }, [target, activate]);
}
